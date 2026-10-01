/* field/body.js — field 内部。tools/files.js と index.html の順で読み込む。 */
(function () {
  "use strict";
  let U, TIER_FX, say, live, msg, fx, logLine, record, checkClimax, release, defeat, openScene, flash;
  const MACHINE = ["ratchet", "karte", "exam", "capture", "pod", "drone_capture", "drone_tickle", "belt", "gate", "armor", "saddle"];
  const IMPS = ["imp", "futago", "inma", "muma_queen", "jikkyou", "kusuguri", "kazoe", "azakeri", "kuchizuke", "sakiimp", "utaimp", "hitomi"];
  function trait(w, id) { return ((w.run.save && w.run.save.traits) || {})[id] || 0; }
  // 快感の入り：堕ちの段階・敏感化・ハイ・その場面に噛み合った性癖
  // 熱：素の身体は、そう簡単には達しない。発情（媚薬・靄・匂い）と敏感化で、一気に達しやすくなる
  function heat(w) { const h = w.run.h; return (0.5 + 1.1 * (h.arousal / 100) + 0.06 * (h.sens || 0)) * (h.form === "magica" ? 0.8 : 1); }   // 変身中は、魔力の衣が熱を逃がす
  function intake(w, src) {
    const h = w.run.h, b = h.bound;
    let k = heat(w) * tierFx(w).pleasure * (1 + 0.07 * (h.sens || 0)) * (h.high > 0 ? 1.3 : 1) * (1 + 0.08 * (h.swell || 0));
    const amp = id => { k *= 1 + 0.12 * trait(w, id); };
    if (b) { amp("bindhabit"); if (b.by.length >= 2 || h.surrounded) amp("loser"); if (b.type === "蕩") amp("engulfCalm"); if (b.tickle) amp("ticklish"); if (b.src && MACHINE.includes(b.src.kind)) amp("rhythmSub"); }
    if (h.watched > 0) amp("publicHeat");
    if (h.deny || h.omazuke || w.run.law === "kinzetsu" || (b && b.edge)) amp("edgeweak");
    if (h.sigil) amp("sigilJoy");
    if (src && IMPS.includes(src.kind)) { amp("impLove"); if (h.impSweet) k *= 1.2; }
    if (h.attach && h.attach.some(a => a === "mushi" || a === "hibiki" || a === "hiru")) amp("wormCalm");
    if (h.futa) amp("shasei");
    if (h.pray > 0) amp("prayer");
    if (b && b.kiss) amp("kissHabit");
    return k;
  }
  // 抜け出す手際：同じ責めへの慣れ（性癖は戦力を減らさない）
  function resist(w) {
    const h = w.run.h, b = h.bound;
    let k = 1 + 0.05 * (trait(w, "bindhabit") + trait(w, "loser"));
    if (b && b.tickle) k += 0.06 * trait(w, "ticklish");
    if (b && b.src && MACHINE.includes(b.src.kind)) k += 0.06 * trait(w, "rhythmSub");
    if (b && b.type === "蕩") k += 0.06 * trait(w, "engulfCalm");
    if (w.run.law === "seishi") k *= 0.7;
    if (b && b.src && h.brand && b.src.kind === h.brand) k *= 0.8;     // 敗北洗脳：この相手には勝てない
    return k;
  }
  // 達するのを禁じられている（絶頂禁止・おあずけ・禁絶の法則）：溜まった分は取っておく
  function capped(w) { const h = w.run.h; return (h.deny && h.deny.t > 0) || !!h.omazuke || !!h.permit || w.run.law === "kinzetsu"; }
  // 溜まった分を一度に返す：まとめて何度も
  function releaseOverflow(w, amount, src, why) {
    const h = w.run.h;
    const n = Math.min(5, 1 + Math.floor(amount / 55));
    record(w, { kind: "release", type: "蕩", why, n, mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3 });
    for (let i = 0; i < n; i++) { h.pleasure = 100; checkClimax(w, src, true); }
    h.pleasure = Math.min(95, 40 + amount / 6);
    h.will = Math.max(0, h.will - Math.min(20, amount * 0.08));
    msg(w, "release", { c: n });
    return n;
  }
  // 魅了（好き）：種族ごとに Ⅰ〜Ⅲ。抗うほど、雑に扱われるほど募る
  function addCharm(w, m, gap) {
    const h = w.run.h, kind = m.kind;
    h.charm = h.charm || {}; h.charmT = h.charmT || {};
    if (w.t - (h.charmT[kind] ?? -99) < (gap || 12) || (h.charm[kind] || 0) >= 3) return;
    h.charmT[kind] = w.t; h.charm[kind] = (h.charm[kind] || 0) + 1;
    record(w, { kind: "charm", type: "惑", mon: kind, monName: m.d ? m.d.name : "", lv: h.charm[kind], sev: 1 + h.charm[kind] });
    msg(w, "charm", { mon: m.d ? m.d.name : "", lv: ["", "Ⅰ", "Ⅱ", "Ⅲ"][h.charm[kind]] });
    say(w, "charm" + h.charm[kind], { mon: m.d ? m.d.name : "" });
  }
  // 触れられるたびに、魅了が深まる（Game4 のナメクジ）。女王に触れられると、一族ごと
  const SLUGS = ["namekuji", "namequeen", "firstslug"];
  function charmTouch(w, src) {
    addCharm(w, src, 3);
    if (src.kind === "namequeen") addCharm(w, { kind: "namekuji", d: G.MONSTERS.namekuji }, 3);
    if (src.kind === "firstslug" && (src.grown || 0) > 50) { const h = w.run.h; if (h.charmT) h.charmT.firstslug = -99; addCharm(w, src, 0); }   // 濃くなった主は、一度に二段
  }
  // 付着体：身体に貼りついて、自分からは剥がれない
  const ATTACH = {
    orb:       { name: "震え珠", power: 1.0, flash: false },
    suit:      { name: "纏い衣", power: 0.8, flash: false, blind: true },   // 本人は「良い装備」だと思っている
    hoshibami: { name: "星喰み", power: 0.9, flash: true },
    sucker:    { name: "吸盤",   power: 0.6, flash: true },
    mushi:     { name: "潜り蟲", power: 0.8, flash: true },
    hibiki:    { name: "響き蟲", power: 1.3, flash: true },
    hiru:      { name: "肥大化ヒル", power: 0.9, flash: false, swell: true },
  };
  function addAttach(w, id, src) {
    const h = w.run.h, A = ATTACH[id];
    h.attach = h.attach || [];
    if (h.attach.length >= 4 || (id === "suit" && h.attach.includes("suit"))) return false;
    h.attach.push(id);
    if (A.swell) { h.swell = Math.min(3, (h.swell || 0) + 1); record(w, { kind: "swell", type: "蕩", lv: h.swell, sev: 2, monName: A.name }); msg(w, "swell", { c: h.swell }); }
    record(w, { kind: "attach", type: "蕩", att: id, attName: A.name, mon: src && src.kind, monName: src && src.d ? src.d.name : A.name, sev: A.blind ? 3 : 2, blind: !!A.blind, hidden: !!A.blind });
    msg(w, A.blind ? "suitOn" : "attach", { att: A.name });
    say(w, A.blind ? "suitOn" : "attach", { att: A.name });
    fx(w, { kind: "ring", x: h.x, y: h.y, color: "#ff9ad0", r: 0.5, life: 0.6 });
    return true;
  }
  // 変生（ふたなり）：生えた部位に溜まる射精感。100で射精。締環があれば溜まる一方
  function addCum(w, n, src) {
    const h = w.run.h;
    if (!h.futa || w.outcome) return;
    h.cum = (h.cum || 0) + n * intake(w, src);
    if (h.ring && h.cum >= 95) { h.ring.over += h.cum - 94; h.cum = 94; if (w.t - (h.ringT ?? -99) > 5) { h.ringT = w.t; msg(w, "ringFull", {}); say(w, "ringFull", {}); record(w, { kind: "edge", type: "蕩", sev: 2, monName: "締環" }); } return; }
    if (h.tipTease > 0 && h.cum >= 92) { h.cum = 92; return; }          // 先だけ撫でられている間は、行き着かない
    while (h.cum >= 100) {
      h.cum -= 88; h.shasei = (h.shasei || 0) + 1; h.will = Math.max(0, h.will - 5); h.arousal = Math.min(100, h.arousal + 8);
      record(w, { kind: "shasei", type: "蕩", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3, n: h.shasei });
      msg(w, "shasei", { c: h.shasei }); say(w, "shasei", {}); fx(w, { kind: "burst", x: h.x, y: h.y, color: "#fff4fa", life: 0.8 });
      if (h.shasei === 1 && !w.run.seenShasei) { w.run.seenShasei = true; openScene(w, "firstShasei", src); }
      if (h.countAltar && (w.run.save.futaMarks || 0) < 12) {   // 数取りの升が、一つ埋まる。升は減らない（十二で満ちる）
        const sv = w.run.save; sv.futaMarks = (sv.futaMarks || 0) + 1;
        msg(w, "countMark", { c: sv.futaMarks }); record(w, { kind: "countMark", sev: 2, n: sv.futaMarks });
        if (sv.futaMarks >= 12 && !sv.futaFixed) { sv.futaFixed = true; record(w, { kind: "futaFixed", sev: 3 }); openScene(w, "futaFixed", null); }
      }
    }
  }
  // 心のヒビ（教団）：防護壁に入ったヒビは、日をまたいで残り、少しずつ広がる
  function addCrack(w, n, src) {
    const h = w.run.h;
    const before = h.crack || 0; h.crack = Math.min(10, before + n);
    if (h.crack === before) return;
    record(w, { kind: "crack", type: "惑", lv: h.crack, mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: h.crack >= 5 ? 3 : 2 });
    msg(w, "crack", { c: h.crack }); if (h.crack === 1 || h.crack % 3 === 0) say(w, "crack", {});
  }
  // 祈り（教団）：教祖に惹かれた身体が、腰を揺らして祈ってしまう。祈りは魔力を吸い、甘い
  function pray(w, src, t) {
    const h = w.run.h;
    if (w.t < (h.prayNext ?? -99)) return;          // 祈り終えてしばらくは、また祈らされない
    h.prayNext = w.t + t + 10;
    h.pray = t; h.intent = null;
    h.pleasure += 8 * intake(w, src); drainMagic(w, 3, src);
    record(w, { kind: "pray", type: "惑", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 2 });
    msg(w, "pray", {}); say(w, "pray", {});
    checkClimax(w, src);
  }
  // 口づけ：口づけの印が残ると、次からは口づけだけで好きになる
  function kiss(w, m) {
    const h = w.run.h;
    h.kissN = (h.kissN || 0) + 1;
    record(w, { kind: "kiss", type: "惑", mon: m.kind, monName: m.d.name, sev: 2 });
    msg(w, "kiss", { mon: m.d.name }); say(w, "kiss", {});
    h.pleasure += 10 * intake(w, m); h.will = Math.max(0, h.will - 4);
    if (h.kissMark) addCharm(w, m, 3);
    else if (h.kissN >= 2) { h.kissMark = true; record(w, { kind: "kissMark", type: "惑", sev: 3, monName: m.d.name }); msg(w, "kissMark", {}); openScene(w, "kissMark", m); }
  }
  // 洗脳（ワルドー）：100で戦闘員化。最初の二度はプラムの光が引き戻す
  function addBrain(w, n, src) {
    const h = w.run.h, sv = w.run.save;
    if (w.outcome) return;
    h.brain = Math.min(100, (h.brain || 0) + n * mult(w, "惑") * (h.rewired ? 1.3 : 1));
    if (h.brain < 100) return;
    sv.waldo = sv.waldo || { rescues: 0, converted: 0 };
    if (sv.waldo.rescues < 2) {
      sv.waldo.rescues++; h.brain = 45;
      if (h.bound) release(w, true);
      record(w, { kind: "rescue", type: "惑", sev: 2, n: sv.waldo.rescues });
      msg(w, "rescue", {}); openScene(w, "rescue", src);
    } else {
      sv.waldo.rescues = 0; sv.waldo.converted++;
      h.rewired = true;
      record(w, { kind: "convert", type: "惑", sev: 3, mon: src && src.kind, monName: src && src.d ? src.d.name : "" });
      msg(w, "convert", {});
      w.outcome = "defeat"; w.defeatBy = "waldo"; w.run.converted = true;
      openScene(w, "convert", src);
    }
  }

  function mult(w, type) {
    const h = w.run.h, prep = G.PREP[w.run.stated];
    let k = G.HIKARI.resist[h.form][type] || 1;
    if (prep) k *= (prep.guard[type] || 1) * (prep.side[type] || 1);
    if (type === "蕩" && h.sigil) k *= 1 + 0.15 * h.sigil;       // 淫紋：刻まれた分だけ、熱が入りやすい
    if (type === "惑" && h.crack) k *= 1 + 0.05 * h.crack;      // 心のヒビ：防護壁の割れた分だけ、惑が通る
    return k;
  }
  function tierFx(w) { return TIER_FX[G.tier(w.run.save.body, w.run.save.mind)]; }
  // ひかりの学習：知っている相手ほど上手くあしらえる（見た1・倒した1・捕まった2・抜けた2・罠は掛かった2）
  function knowledge(w, kind) { const k = (w.run.save.know || {})[kind] || 0; return Math.min(1, k / 14); }
  function learn(w, kind, n) { const sv = w.run.save; if (!sv || !kind) return; sv.know = sv.know || {}; sv.know[kind] = (sv.know[kind] || 0) + n; }
  // 期待：その相手に気持ちよくされた分だけ、次に会った時、身体が先に思い出す
  function expectation(w, kind) { const e = ((w.run.save && w.run.save.lewd) || {})[kind] || 0; return Math.min(1, e / 30); }
  // 技（装備しているものだけが効く）と、閃き
  function sk(w, id) { const k = w.run.h.skills; return !!(k && k.includes(id)); }
  function inspire(w, how) {
    const h = w.run.h, sv = w.run.save;
    if (!sv || w.outcome || w.t - (h.inspT ?? -99) < 15) return;
    const pool = Object.keys(G.SKILLS).filter(id => G.SKILLS[id].how === how && !(sv.skills || {})[id]);
    if (!pool.length) return;
    h.inspT = w.t;
    const near = w.monsters.filter(m => m.hp > 0 && m.alert > 0 && U.dist(m.x, m.y, h.x, h.y) < 5).length;
    sv.insp = (sv.insp || 0) + 1;                                       // 閃かないほど、次は閃きやすい
    const p = 0.02 * (1 + 0.4 * near) * (how === "pinch" ? 2 : 1) * (1 + sv.insp * 0.04);
    if (!U.chance(p)) return;
    const id = U.pick(pool); sv.insp = 0;
    sv.skills = sv.skills || {}; sv.skills[id] = true;
    const slots = G.GROWTH.slots(sv.lv || 1); sv.equip = sv.equip || [];
    if (sv.equip.length < slots && !sv.equip.includes(id)) { sv.equip.push(id); h.skills = (h.skills || []).concat(id); }   // 空きがあれば、その場から使える
    record(w, { kind: "inspire", skill: id, skillName: G.SKILLS[id].name, sev: 0 });
    msg(w, "inspire", { skill: G.SKILLS[id].name }); say(w, "inspire", { skill: G.SKILLS[id].name });
    fx(w, { kind: "burst", x: h.x, y: h.y - 0.8, color: "#fff6a0", r: 0.6, life: 0.8 });
    fx(w, { kind: "sfx", text: "閃いた！", x: h.x, y: h.y - 1.4, life: 1.6, color: "#fff2a0" });
  }
  function crave(w, kind, n) { const sv = w.run.save; if (!sv || !kind) return; sv.lewd = sv.lewd || {}; sv.lewd[kind] = (sv.lewd[kind] || 0) + n; }

  /* ================================================================ 位置と移動 */
  function applyEffect(w, type, power, src, how) {
    const h = w.run.h, k = mult(w, type), tf = tierFx(w);
    if (type === "惑" || type === "蕩") { if (sk(w, "prism")) power *= 0.82; if (power >= 0.5) inspire(w, "hit"); }
    const name = src ? (src.d ? src.d.name : "") : "";
    const sev = k * power >= 1.6 ? 2 : 1;
    if (type === "惑") {
      const was = h.trance > 0;
      if (trait(w, "hypnoObey")) power *= 1 + 0.1 * trait(w, "hypnoObey");
      h.hyp = Math.min(100, (h.hyp || 0) + 26 * power * k);          // 催眠度：一気に上がり、なかなか抜けない
      if (!(h.clearT > w.t)) h.trance = Math.max(h.trance, (1.0 + h.hyp / 70) * power * k);   // ルミナは、すぐ我に返る
      h.tranceSrc = name; h.tranceMax = Math.max(h.trance, h.tranceMax && was ? h.tranceMax : 0);
      h.hypno = how === "lure" ? "魅了" : (src && ["mind_roper", "gazer", "bell"].includes(src.kind)) || power * k >= 0.9 || h.hyp >= 50 ? "催眠" : "惑い";
      h.arousal = Math.min(100, h.arousal + 6 * power * k);
      if (how === "lure" && src) h.lureTo = { x: src.x, y: src.y };
      record(w, { kind: "trance", type, mon: src && src.kind, monName: name, sev, hidden: k * power > 1.2 && U.chance(0.45) });
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#b890ff", life: 0.8 });
      if (!was) { msg(w, how === "lure" ? "lured" : h.hypno === "催眠" ? "hypno" : "trance", { mon: name }, 2); if (!h.bubble || h.bubble.t < 1) say(w, "trance", { mon: name }); }
    } else if (type === "蕩") {
      h.arousal = Math.min(100, h.arousal + 15 * power * k);
      h.pleasure += 5 * power * k * intake(w, src);
      if (h.futa) addCum(w, 3.5 * power * k, src);
      h.slow = Math.max(h.slow, 4 * power);
      record(w, { kind: "arouse", type, mon: src && src.kind, monName: name, sev });
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#ff8ab8", life: 0.8 });
      msg(w, "arouse", { mon: name }, 3);
      if (!h.bubble || h.bubble.t < 1) say(w, "arouse", { mon: name });
    } else if (type === "削") {
      drainMagic(w, 4 * power * k, src);
      h.mp = Math.max(0, h.mp - 3 * power * k);
      record(w, { kind: "drain", type, mon: src && src.kind, monName: name, sev: 1 });
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#7fe8ff", life: 0.8 });
      msg(w, "drain", { mon: name }, 3);
    }
    checkClimax(w, src);
  }

  function drainMagic(w, amt, src) {
    const h = w.run.h;
    if (h.form !== "magica") return;
    const key = src ? (src.kind || "?") : "none";
    amt *= 0.5;                                     // 魔力は、そう簡単には尽きない（変身を保つ力は強い）
    h.drainLog = h.drainLog || {}; h.drainLog[key] = (h.drainLog[key] || 0) + Math.min(amt, h.magic);
    h.magic = Math.max(0, h.magic - amt);
    if (h.magic <= 0) untransform(w, src);
  }
  function untransform(w, src) {
    const h = w.run.h;
    if (h.form !== "magica") return;
    h.form = "civilian"; h.cast = null; h.noTransform = G.HIKARI.noTransform;
    record(w, { kind: "untransform", type: "削", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3 });
    logLine(w, G.Text.log("untransform", {}), "heavy");
    msg(w, "untransform", {});
    fx(w, { kind: "burst", x: h.x, y: h.y, color: "#ffd0ec", life: 1.2 });
    openScene(w, "untransform", src);
  }
  function engraveSigil(w, n, src) {
    const h = w.run.h, before = h.sigil || 0;
    h.sigil = Math.min(3, before + n);
    if (h.sigil === before) return;
    record(w, { kind: "sigil", type: "蕩", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: h.sigil >= 2 ? 3 : 2, lv: h.sigil });
    msg(w, "sigil", { lv: h.sigil });
    say(w, "sigil", {});
    fx(w, { kind: "ring", x: h.x, y: h.y, color: "#ff5fa8", r: 0.8, life: 1.0 });
  }
  // 憑き手：腕に憑かれる／離れる
  function possess(w, m) {
    const h = w.run.h, A = m.d.atk;
    if (h.possess || h.bound) return false;
    const k = mult(w, "惑");
    h.possess = { t: A.dur * U.clamp(k * 1.4, 0.6, 1.6), mon: m.kind, monName: m.d.name, t0: w.t };
    h.cast = null; h.cdShot = Math.max(h.cdShot, 0.5);
    h.possess.ev = record(w, { kind: "possess", type: "惑", mon: m.kind, monName: m.d.name, sev: 2 });
    m.hp = 0; if (m.summoned) w.dir.live = Math.max(0, w.dir.live - 1);   // 手は腕の中へ入った
    logLine(w, G.Text.log("possess", { mon: m.d.name }), "mid");
    msg(w, "possess", { mon: m.d.name });
    say(w, "possess", { mon: m.d.name });
    fx(w, { kind: "ring", x: h.x, y: h.y, color: "#e8ecff", life: 0.8 });
    if (!w.run.seenPossess) { w.run.seenPossess = true; openScene(w, "possess", m); }
    return true;
  }
  // 状態異常の時間経過（毎コマ）
  function tickStatus(w, dt) {
    const h = w.run.h;
    if (w.outcome) return;
    for (const k of ["numb", "high", "ache", "freeze", "sniff", "salute", "pray", "tipTease"]) if (h[k] > 0) h[k] = Math.max(0, h[k] - dt);
    if (h.pray > 0) { h.pleasure += 3 * intake(w) * dt; h.vx = h.vy = 0; }
    // 数え歌：十数えるあいだに声が漏れたら負け。負けても勝っても、寸前で置き去り
    if (h.countGame) {
      const g = h.countGame; g.t -= dt;
      const n = Math.min(10, Math.floor(10 - g.t) + 1); if (n > g.n) { g.n = n; if (n > 1) msg(w, "countTick", { c: n }); }
      if (!g.lost && (h.pleasure - g.p0 > 16 || h.climax > g.c0)) { g.lost = true; msg(w, "countLose", { mon: g.monName }); say(w, "countLose", {}); }
      if (g.t <= 0) {
        h.countGame = null;
        record(w, { kind: "countGame", type: "惑", mon: g.mon, monName: g.monName, lost: g.lost, sev: g.lost ? 3 : 2 });
        h.pleasure = Math.max(h.pleasure, 93);
        h.deny = { t: g.lost ? 12 : 5, over: (h.deny && h.deny.over) || 0, mon: g.mon, monName: g.monName };
        openScene(w, g.lost ? "countLost" : "countWon", { kind: g.mon, d: G.MONSTERS[g.mon] });
      }
    }
    // 敏感化はゆっくり引く（翌日に残るのは過敏として）
    if (h.sens > (h.sensBase || 0)) { h.sensT = (h.sensT || 0) + dt; if (h.sensT > 35) { h.sensT = 0; h.sens--; } }
    // 疼き：熱が引かない
    if (h.ache > 0) { h.arousal = Math.max(h.arousal, 30); h.pleasure += 1.1 * intake(w) * dt; }
    // 時間停止：動けないのに、感覚だけ積もる
    if (h.freeze > 0) { h.pleasure += 2.2 * intake(w) * dt; h.vx = h.vy = 0; }
    // 付着体：自分からは剥がれない。ずっと
    if (h.attach && h.attach.length) {
      let p = 0; for (const id of h.attach) p += ATTACH[id].power;
      h.pleasure += 0.7 * p * mult(w, "蕩") * intake(w) * dt; h.arousal = Math.min(100, h.arousal + 0.3 * p * dt);
      if (U.chance(dt * 0.12)) msg(w, h.attach.includes("suit") && h.attach.length === 1 ? "suitMove" : "attachMove", { att: ATTACH[h.attach[0]].name }, 6);
      checkClimax(w, { d: { name: ATTACH[h.attach[0]].name, type: "蕩" }, kind: h.attach[0] });
    }
    // 絶頂禁止：時間が来たら、溜まった分が一度に来る
    if (h.deny) { h.deny.t -= dt; if (h.deny.t <= 0) { const o = h.deny; h.deny = null; if (o.over > 8 && !o.queen) { releaseOverflow(w, o.over, { kind: o.mon, d: { name: o.monName, type: "惑" } }, "deny"); } else if (!o.queen) msg(w, "denyEnd", {}); } }
    // 暗示の引き金：前触れなく、無様の発作
    if (h.trigger) { h.trigT = (h.trigT ?? U.rf(20, 40)) - dt; if (h.trigT <= 0 && !h.bound) { h.trigT = U.rf(22, 45); h.freeze = 1.2; h.pleasure += 12 * intake(w); record(w, { kind: "fit", type: "惑", sev: 2 }); msg(w, "fit", {}); say(w, "fit", {}); } }
    // 洗脳はゆっくり薄れる
    if (h.brain > 0) h.brain = Math.max(0, h.brain - 0.15 * dt);
    // 潤沢の法則：空気そのものが媚薬
    if (w.run.law === "juntaku") h.arousal = Math.min(100, h.arousal + 0.2 * dt);
    checkClimax(w, null);
  }
  function endPossess(w, climaxed) {
    const h = w.run.h, p = h.possess;
    if (!p) return;
    if (p.ev) p.ev.dur = +(w.t - p.t0).toFixed(1);
    h.possess = null;
    msg(w, climaxed ? "possessOffClimax" : "possessOff", { mon: p.monName });
    say(w, "possessOff", {});
  }

  /* ---- 捕まる・振りほどく ---- */

  Object.assign(G.F, { MACHINE, IMPS, trait, heat, intake, resist, capped, releaseOverflow, addCharm, SLUGS, charmTouch, ATTACH, addAttach, addCum, addCrack, pray, kiss, addBrain, mult, tierFx, knowledge, learn, expectation, sk, inspire, crave, applyEffect, drainMagic, untransform, engraveSigil, possess, tickStatus, endPossess });
  G.F.bind.push(() => { ({ U, TIER_FX, say, live, msg, fx, logLine, record, checkClimax, release, defeat, openScene, flash } = G.F); });
})();
