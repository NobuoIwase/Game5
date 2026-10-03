/* field/bound.js — field 内部。tools/files.js と index.html の順で読み込む。 */
(function () {
  "use strict";
  let U, M, heroName, say, live, feed, msg, fx, pushMsg, monSay, actMsg, actBub, logLine, record, trait, heat, intake, resist, capped, releaseOverflow, addCharm, charmTouch, addCum, kiss, addBrain, mult, tierFx, knowledge, learn, expectation, sk, inspire, crave, drainMagic, possess, endPossess, free, pressure, flash, alertMon, shasei, cumBlocked, urgeUp, dirStat, byPlayer;
  function checkClimax(w, src, forced) {
    const h = w.run.h;
    if (!forced && h.pleasure >= 96 && capped(w)) {        // 栓をされている：あと少しで止まり、溢れた分が溜まる
      const over = h.pleasure - 95;
      h.pleasure = 95;
      const box = h.deny && h.deny.t > 0 ? h.deny : h.omazuke || h.permit || (h.kinOver = h.kinOver || { over: 0 });
      box.over = (box.over || 0) + over;
      urgeUp(w, 4 + over * 0.5, src);
      if (w.t - (h.edgeT ?? -99) > 4) {
        h.edgeT = w.t; record(w, { kind: "edge", type: "蕩", sev: 2, mon: src && src.kind, monName: src && src.d ? src.d.name : "" }); msg(w, "edgeCap", {}); say(w, "edgeCap", {});
        // 絶頂許可制：三度止められると、許しを乞うてしまう。乞えば、許しが出る
        if (box === h.permit && ++h.permit.edges >= 3) {
          const o = h.permit.over; h.permit = null;
          record(w, { kind: "beg", type: "惑", mon: "keiyaku", monName: "淫魔の契約", sev: 3 }); openScene(w, "permitBeg", null);
          releaseOverflow(w, o + 50, { kind: "keiyaku", d: { name: "淫魔の契約", type: "惑" } }, "permit");
        }
      }
      return;
    }
    if (h.pleasure < 100) return;
    src = presentSrc(w, src);
    // 抜け出した直後：触れられていない熱は、いったん引いていく（寸前で抜けて「空でいく」時だけは別）
    if (!forced && !h.bound && w.t - (h.unboundT ?? -99) < 5) { h.pleasure = 95; return; }
    // 寸止めの呪いが解けたあと燻っていた分：次に達する時に、まとめて来る
    if (!forced && h.pent) { const p = h.pent; h.pent = null; releaseOverflow(w, p.over, src || { kind: p.mon, d: { name: p.monName, type: "惑" } }, "deny"); return; }
    if (!forced && cumBlocked(w)) {                // 締環・先嬲り：出せないまま、絶頂の手前で止められる
      h.pleasure = 95; h.cum = Math.max(h.cum || 0, 94);
      if (h.ring) h.ring.over += 6;
      urgeUp(w, 9, src);
      if (w.t - (h.edgeT ?? -99) > 4) { h.edgeT = w.t; record(w, { kind: "edge", type: "蕩", sev: 2, mon: src && src.kind, monName: src && src.d ? src.d.name : "" }); msg(w, h.ring ? "ringFull" : "edgeCap", {}); say(w, h.ring ? "ringFull" : "edgeCap", {}); }
      return;
    }
    h.pleasure = 22 + 8 * trait(w, "squirthabit"); h.climax++; h.lastClimaxT = w.t;
    if (h.futa) shasei(w, src);                     // 変生した身体は、達するたびに出してしまう
    h.will = Math.max(0, h.will - 2.5);
    h.trance = Math.max(h.trance, 1.6);
    const e = record(w, { kind: "climax", type: src && src.d ? src.d.type : "蕩", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3, bound: !!h.bound });
    logLine(w, G.Text.log("climax", { mon: e.monName }), "heavy");
    const la = h.bound && h.bound.last && w.t - h.bound.last.t < 2.5 && (h.bound.last.id == null || w.monsters.some(m => m.id === h.bound.last.id && m.hp > 0) || w.traps.some(t => t.id === h.bound.last.id)) ? h.bound.last : null;   // 触れていた者が倒された・離れたなら、その名は出さない
    const mine = (la && la.mine) || byPlayer(w, src);
    if (mine) dirStat(w).climax++;
    // ドレインローパー：達した瞬間の魔力が、いちばん甘い
    if (h.bound) for (const id of h.bound.by) { const m = w.monsters.find(x => x.id === id && x.hp > 0 && x.d.atk && x.d.atk.drain); if (m) { drainMagic(w, 8 * m.d.atk.drain, m); h.mp = Math.max(0, h.mp - 2 * m.d.atk.drain); msg(w, "drainCx", { mon: m.d.name }, 1); break; } }
    if (h.bound) { h.bound.climaxN = (h.bound.climaxN || 0) + 1; h.bound.built = false; h.bound.overSaid = false; }
    w.feedMute = true;          // この一瞬は、下の「決壊」の流れでまとめて見せる
    if (la) { e.act = la.p; e.monName = e.monName || la.mon; actMsg(w, "climaxAct", { p: la.p, mon: la.mon }); if (h.bound.ev) h.bound.ev.climaxActs = (h.bound.ev.climaxActs || []).concat(la.p); }
    else msg(w, "climax", {});
    fx(w, { kind: "burst", x: h.x, y: h.y, color: "#ff9ccc", life: 1.0 });
    fx(w, { kind: "sfx", text: U.pick(["びくんっ♡", "——っ♡", "びくびくっ", "ぷしゃっ"]), x: h.x, y: h.y - 1.5, life: 1.4, color: "#ff5fa0" });
    say(w, "climax", {});
    w.feedMute = false;
    {
      const sv = w.run.save, part = la && la.part, cp = sv ? (sv.climaxParts = sv.climaxParts || []) : [];
      const first = part && G.Text.live.hasFirst(part) && !cp.includes(part) ? part : null;
      if (first) e.first = first;
      if (h.bound && h.bound.climaxN > 1) e.chain = h.bound.climaxN;
      if (first) { cp.push(first); (w.run.firstParts = w.run.firstParts || []).push({ part: first, mon: la ? la.mon : "" }); }
      const cat = la && la.kind ? G.Text.actorOf(la.kind) : src && src.kind ? G.Text.actorOf(src.kind) : null;
      for (const l of G.Text.live.climax({ chain: h.bound ? h.bound.climaxN : 1, tier: G.tier(w.run.save.body, w.run.save.mind), squirt: (e.squirt = U.chance(trait(w, "squirthabit") ? 0.5 : h.bound && h.bound.climaxN >= 3 ? 0.35 : 0)), part, cat, kind: la ? la.kind : src && src.kind, bound: !!h.bound, mon: la ? la.mon : (src && src.d ? (src.d.holdName || src.d.name) : null), n: heroName(w), firstPart: first })) feed(w, l.cls, l.text);
      feed(w, "pause", "……………………");
      if (mine) feed(w, "mine", "★ 呼んだ" + (la ? la.mon : src && src.d ? src.d.name : "もの") + "で、" + heroName(w) + "が達した（仕込みの戦果 絶頂" + dirStat(w).climax + "回）");
      feed(w, "after", G.Text.live.after({ n: heroName(w) }));
      h.recoverAt = w.t + 3.2;
    }
    for (const m of w.monsters) if (m.hp > 0 && !m.alert && U.dist(m.x, m.y, h.x, h.y) < 7 && G.Text.actorOf(m.kind)) { alertMon(w, m, 0.8); m.lastSeenH = { x: h.x, y: h.y }; }   // 声が、迷宮に響く
    { const vm = w.monsters.filter(m => m.hp > 0 && G.Text.hasVoice(m.kind) && U.dist(m.x, m.y, h.x, h.y) < 6).sort((a, b) => U.dist(a.x, a.y, h.x, h.y) - U.dist(b.x, b.y, h.x, h.y))[0]; if (vm) monSay(w, vm, "climax", 0.8); }
    // 覗き目玉：見られながら達した姿は、記録に残る
    const eye = w.monsters.find(m => m.hp > 0 && m.d.atk.film && U.dist(m.x, m.y, h.x, h.y) < 6.5 && M.los(w.map, m.x, m.y, h.x, h.y));
    if (eye) { record(w, { kind: "filmed", type: "惑", mon: eye.kind, monName: eye.d.name, sev: 3 }); msg(w, "filmed", { mon: eye.d.name }); fx(w, { kind: "flashCam", x: eye.x, y: eye.y, life: 0.4 }); }
    // 憑き手は、宿主が果てると離れる
    if (h.possess) endPossess(w, true);
    // 格下に達しさせられると、本人の意志と無関係に「好き」が芽生える
    if (!forced && h.bound && src && src.d && src.d.spd !== undefined && ["goblin", "waldo_grunt", "slime", "nikubana", "gulper_worm", "namekuji", "mitsusui", "firstslug"].includes(src.kind) && U.chance(0.45)) addCharm(w, src, 20);
  }
  // 達させた相手：その場にいない魔物（倒された・離れた・最初に掴んだだけの者）の名前は出さない。直前に触れていた者がいれば、その者
  function presentSrc(w, src) {
    const h = w.run.h, b = h.bound, la = b && b.last && w.t - b.last.t < 2.5 ? b.last : null;
    if (la && la.id != null) { const m = w.monsters.find(x => x.id === la.id && x.hp > 0) || w.traps.find(t => t.id === la.id); if (m) return m; }
    if (!src || src.id == null) return src;                   // 罠・呪い・法悦など、名前のついた効き目
    if (w.traps.includes(src)) return src;
    if (!w.monsters.includes(src)) return src.d && src.d.spd !== undefined ? null : src;   // 倒されて消えた魔物は、もういない
    const here = src.hp > 0 && ((b && b.by.includes(src.id)) || src.molest || U.dist(src.x, src.y, h.x, h.y) < 9);
    return here ? src : null;
  }
  // 淫紋を刻む（その潜行のあいだ蕩が効きやすくなる。帰還後は状態異常「淫紋」として残る）
  function grab(w, src, power, type) {
    const h = w.run.h;
    if (h.ifr > 0 && src.d && src.d.spd !== undefined) return false;
    if (!h.bound && sk(w, "veil") && !h.veilUsed && src.d && src.d.spd !== undefined) {   // ルミナ・ヴェール：階ごとに一度、掴む手を弾く
      h.veilUsed = true; h.ifr = 0.6; msg(w, "veil", { mon: src.d.name }); h.bubble = { text: G.Text.spell("veil") + "！", t: 1.2 };
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#fff2c0", r: 1.2, life: 0.6 }); return false;
    }
    if (h.bound) {
      if (h.bound.by.length >= 5 || h.bound.by.includes(src.id)) return false;
      h.bound.by.push(src.id); h.bound.power += power * 0.4;       // 数が増えるほど、振りほどけない
      if (src.d && src.d.spd !== undefined) monSay(w, src, "grab", 0.6);
      actMsg(w, "swarm", { mon: src.d.name, c: h.bound.by.length + w.monsters.filter(m => m.molest && m.hp > 0).length });
      if (h.bound.by.length >= 3) actBub(w, "swarm");
      if (src.d && src.d.pack) callPack(w, src);
      if (src.d && src.d.atk && src.d.atk.charmTouch) charmTouch(w, src);
      return true;
    }
    h.bound = { by: [src.id], power, type: type || "絡", t: 0, struggle: 0, src, acts: 0, stage: 0, actT: 0.5 };
    if (src.d && src.d.pack) callPack(w, src);
    const A = src.d && src.d.atk;
    if (A && src.d.spd !== undefined) {                 // 魔物ごとの捕まえ方
      if (A.wire) Object.assign(h.bound, { wire: true, slowStruggle: 0.8 });
      if (A.tickle) Object.assign(h.bound, { tickle: true });
      if (A.develop) Object.assign(h.bound, { develop: true, slowStruggle: 0.7 });
      if (A.brief) h.bound.brief = A.brief;
      if (A.sens) h.sens = Math.min(5, (h.sens || 0) + A.sens);
      if (A.futaSuck) h.bound.futaSuck = A.futaSuck;
      if (A.mud) { h.slow = Math.max(h.slow, 4); h.bound.slowStruggle = 0.75; }
      if (A.kiss) { h.bound.kiss = true; kiss(w, src); }
      if (A.charmTouch) charmTouch(w, src);
    }
    h.cast = null; h.vx = h.vy = 0;
    if (src.d && src.d.spd !== undefined) monSay(w, src, "grab", 0.8);
    const e = record(w, { kind: "hold", type: type || "絡", mon: src.kind, monName: src.d.holdName || src.d.name, sev: 2 });
    if (byPlayer(w, src)) { dirStat(w).holds++; h.bound.mine = true; feed(w, "mine", "★ 呼んだ" + (src.d.holdName || src.d.name) + "が、" + heroName(w) + "を捕らえた"); }
    h.bound.ev = e;
    logLine(w, G.Text.log("hold", { mon: src.d.name }), "mid");
    msg(w, "grab", { mon: src.d.name });
    if (src.kind && expectation(w, src.kind) > 0.35) say(w, "anticipateGrab", { mon: src.d.name }); else say(w, "held", { mon: src.d.name });
    return true;
  }
  // 群れで来る種：一体が捕まえると、仲間を呼ぶ
  function callPack(w, src) {
    for (const m of w.monsters) if (m.hp > 0 && m !== src && m.kind === src.kind && U.dist(m.x, m.y, src.x, src.y) < 9) alertMon(w, m, 1);
  }
  function release(w, broke) {
    const h = w.run.h, b = h.bound;
    if (!b) return;
    for (const m of w.monsters) if (m.molest) { m.molest = false; if (broke) { m.stun = 1.2; knock(w, m, U.angle(h.x, h.y, m.x, m.y), 0.8); } m.cd = Math.max(m.cd, 2); }
    for (const id of b.by) {
      const m = w.monsters.find(x => x.id === id);
      if (m) { m.holding = false; m.stun = broke ? 1.6 : 0.6; m.cd = 2.5; m.rcl = 0.3; m.rclX = Math.sign(m.x - h.x) || 1; knock(w, m, U.angle(h.x, h.y, m.x, m.y), 1.0); }
      const tr = w.traps.find(x => x.id === id);
      if (tr && !tr.d.inert) { tr.armed = false; tr.rearm = tr.d.rearm; }   // 満ち引きの玉は、ほどけても眠らない
    }
    if (b.ev) { b.ev.dur = +b.t.toFixed(1); if (b.t > 3.5) b.ev.sev = 3; }
    // 捕まっていた間のまとめ：何回・どこを・何回達したか、そして今どんな有様か
    if ((b.acts || 0) >= 2) {
      const top = b.ev && b.ev.acts ? Object.entries(b.ev.acts).sort((a, c) => c[1] - a[1]).slice(0, 2).map(([k]) => k).join("と") : "";
      const bare = h.exposure || h.torn;
      const L = G.Text.look();
      const look = U.pick(h.pleasure > 70 ? L.limp : b.climaxN >= 2 ? L.cxN : b.climaxN ? L.cx1 : b.stage >= 2 ? (bare ? L.bare2 : L.dress2) : (bare ? L.bare : L.dress));
      pushMsg(w, `——${b.t.toFixed(0)}秒、${b.acts}回 触れられた${top ? "（" + top + "）" : ""}${b.climaxN ? "。絶頂 " + b.climaxN + "回" : ""}。${heroName(w)}は ${look}……`, "after");
    }
    if (broke) {                                    // 群れは、逃げた獲物をすぐ追い直す
      for (const m of w.monsters) if (m.hp > 0 && m.d.pack && !b.by.includes(m.id) && !m.molest && U.dist(m.x, m.y, h.x, h.y) < 5) { alertMon(w, m, 1); m.cd = 0; m.pounceCd = 0; }
    }
    if (broke) { h.lastEscT = w.t; say(w, "breakFree", {}); msg(w, "free", {}); fx(w, { kind: "burst", x: h.x, y: h.y, color: "#fff2a8", life: 0.6 }); if (b.src) learn(w, b.src.kind, 2); record(w, { kind: "escape", mon: b.src && b.src.kind, monName: b.src && b.src.d ? b.src.d.name : "", sev: 0 }); }
    h.bound = null; h.unboundT = w.t;
    h.ifr = Math.max(h.ifr || 0, broke ? 1.3 : 0.7);          // 抜けた直後の一瞬は、掴み直されない（長い拘束の埋め合わせ）
    // 寸前で抜けた：たいていは堪えて引いていく。ときどき、もう触れられていないのに、そのまま達してしまう
    if (h.pleasure >= 90 && w.t - (h.lastClimaxT ?? -99) > 1.5 && !capped(w) && !cumBlocked(w)) {
      const tier = G.tier(w.run.save.body, w.run.save.mind);
      if (U.chance(0.28 + 0.08 * tier + 0.04 * (h.sens || 0))) { h.dryAt = w.t + U.rf(0.9, 1.8); h.dryMon = b.src && b.src.d ? { kind: b.src.kind, name: b.src.d.name } : null; msg(w, "dryEdge", {}); say(w, "dryEdge", {}); }
      else { msg(w, "edgeEscape", {}); say(w, "edgeEscape", {}); }
    }
    h.trance = Math.max(h.trance, 0.3);
    h.think = Math.max(h.think || 0, broke ? 0.9 : 0.6); h.label = "息を整える";   // 抜けた直後は、よろめいて立て直す
  }
  function knock(w, m, a, dist) {
    const nx = m.x + Math.cos(a) * dist, ny = m.y + Math.sin(a) * dist;
    if (free(w.map, nx, ny, m.d.r * 0.6)) { m.x = nx; m.y = ny; }
  }
  // 捕まえている相手・まとわりついている相手のうち、触れてくる者
  function actCat(w, src) {
    const h = w.run.h;
    let c = G.Text.actorOf(src.kind);
    if (!c) return null;                                            // 縛るだけの罠・機械
    if (h.futa && c !== "watch" && c !== "tickle" && U.chance(src.d && src.d.futa ? 0.75 : 0.3)) c = "futa";
    return c;
  }
  function lewdTick(w, dt) {
    const h = w.run.h, b = h.bound, tf = tierFx(w);
    const srcs = [];
    for (const id of b.by) { const s = w.monsters.find(x => x.id === id && x.hp > 0) || w.traps.find(t => t.id === id); if (s) srcs.push(s); }
    for (const m of w.monsters) if (m.molest && m.hp > 0 && !b.by.includes(m.id)) srcs.push(m);
    const acts = srcs.filter(s => G.Text.actorOf(s.kind));
    const touching = acts.filter(s => G.Text.actorOf(s.kind) !== "watch");
    b.nAct = touching.length;
    if (!acts.length) {                                              // 縛られているだけ
      b.idleT = (b.idleT || 0) + dt;
      if (b.idleT > 2 && U.chance(dt * 0.3)) { actMsg(w, "alone", { trap: b.src.d ? b.src.d.name : "" }); if (U.chance(0.5)) actBub(w, "alone"); }
      // 縛られて動けない獲物の気配（もがく音・甘い匂い）に、近くの魔物が寄ってくる
      if (b.idleT > 1.5 && (b.lureT = (b.lureT || 0) + dt) > 2) {
        b.lureT = 0; let n = 0;
        for (const m of w.monsters) if (m.hp > 0 && !m.dormant && !m.alert && G.Text.actorOf(m.kind) && U.dist(m.x, m.y, h.x, h.y) < 10) { alertMon(w, m, 1); m.lastSeenH = { x: h.x, y: h.y }; n++; }
        if (n && !b.lureSaid) { b.lureSaid = true; actMsg(w, "lureCome", { c: n }); actBub(w, "lureCome"); }
      }
      return;
    }
    b.actT -= dt;
    if (b.actT > 0) return;
    const n = Math.max(1, touching.length);
    b.actT = U.rf(0.65, 1.0) / (1 + 0.28 * (n - 1));
    b.acts++;
    // 段階：服の上から → 服の中 → 直接。時間・回数・装束の損壊・発情で進む
    const st = (b.acts >= 7 || b.t > 8 || (h.exposure && b.acts >= 4) || (h.arousal > 75 && b.acts >= 4)) ? 2 : (b.acts >= 3 || b.t > 3.5 || h.exposure || h.arousal > 60) ? 1 : 0;   // 捕まっている時間が長い分、段階はゆっくり進む
    const who = acts[b.acts % acts.length], name = who.d ? (who.d.holdName || who.d.name) : "";
    if (st > b.stage) { b.stage = st; actMsg(w, "stage" + st, { mon: name }); if (st === 2) actBub(w, "touch2"); }
    // 長く捕まっていると、装束が裂ける（見た目と文だけ。階を降りる時に応急で直す）
    if (b.stage >= 2 && b.acts >= 9 && !h.torn && !h.exposure && !w.outcome && U.chance(0.3)) {
      h.torn = true; actMsg(w, "tear", { mon: name }); actBub(w, "tear");
      record(w, { kind: "torn", sev: 1, mon: who.kind, monName: name });
    }
    const cat = actCat(w, who), act = G.Text.actFor(who.kind, cat, b.stage);
    if (!act) return;
    pushMsg(w, G.Text.fillAct(act, { mon: name, n: heroName(w) }) + "……", "act");
    if (who.d && who.d.spd !== undefined) monSay(w, who, "act", 0.45);
    fx(w, { kind: "sfx", text: act.fx, x: h.x + U.rf(-0.6, 0.6), y: h.y - U.rf(0.7, 1.3), life: 1.2, color: act.watch ? "#d8c8ff" : "#ffb3d6" });
    if (act.fx && U.chance(0.5)) feed(w, "sfx", act.fx);
    for (const m of w.monsters) if (m.hp > 0 && !m.alert && U.dist(m.x, m.y, h.x, h.y) < 4.5 && G.Text.actorOf(m.kind)) alertMon(w, m, 0.6);   // 声が、近くの魔物を呼ぶ
    if (act.watch) { h.watched = 1.5; h.arousal = Math.min(100, h.arousal + 2.5); if (U.chance(0.5)) actBub(w, "watched"); return; }
    const k = mult(w, "蕩"), swarm = (1 + 0.18 * (n - 1)) * (n >= 3 ? 1 + 0.1 * trait(w, "swarmHabit") : 1);
    const over = w.t - (h.lastClimaxT ?? -99) < 5 ? 1.2 : 1;          // 達したばかりの身体は、敏感すぎる
    if (over > 1 && !b.overSaid && !act.watch) { b.overSaid = true; feed(w, "after", G.Text.live.oversens()); }
    const gain = over * 1.6 * act.pw * (who.pow || 1) * k * intake(w, who) * swarm * tf.pleasure * (w.run.law === "seishi" ? 0.8 : 1) * (act.tickle ? 0.7 : 1) * (sk(w, "heartlock") ? 0.82 : 1);
    if (act.cum && h.futa) addCum(w, 8 * act.pw * swarm * intake(w, who), who); else h.pleasure += gain;
    h.arousal = Math.min(100, h.arousal + 1.1 * act.pw * k);
    if (act.tickle) h.will = Math.max(0, h.will - 3);
    if (act.edge) h.pleasure = Math.min(h.pleasure, 94);
    if (b.ev) { b.ev.acts = b.ev.acts || {}; b.ev.acts[act.part] = (b.ev.acts[act.part] || 0) + 1; b.ev.stage = b.stage; b.ev.n = Math.max(b.ev.n || 1, n); }
    b.last = { p: act.p, mon: name, kind: who.kind, id: who.id, part: act.part, t: w.t, mine: byPlayer(w, who) };
    if (b.last.mine) dirStat(w).acts++;
    crave(w, who.kind, 0.25 * act.pw);
    { const sv = w.run.save; if (sv) { sv.parts = sv.parts || {}; const pp = sv.parts[who.kind] || (sv.parts[who.kind] = {}); pp[act.part] = (pp[act.part] || 0) + 1; } }
    // 吹き出し：触れはじめ／くすぐり／段階ごとの喘ぎ。限界の手前では、言葉が崩れていく
    if (h.pleasure >= 84 && !b.built && !act.edge) { b.built = true; const t = G.Text.live.build(G.tier(w.run.save.body, w.run.save.mind), heroName(w)); h.bubble = { text: t.replace(/^……/, "").slice(0, 16) + "……", t: 2.4 }; feed(w, "line build", "「" + t + "」"); }
    else if (b.acts === 1) actBub(w, act.tickle ? "tickleLaugh" : "touch");
    else if (act.tickle && U.chance(0.6)) actBub(w, "tickleLaugh");
    else if (h.pleasure < 80 && U.chance(0.35) && G.Text.actBubble("p:" + act.part)) actBub(w, "p:" + act.part);   // 触られた所への反応
    else if (U.chance(0.6)) actBub(w, h.pleasure < 45 ? "moan1" : h.pleasure < 80 ? "moan2" : "moan3");
    // 心の声（数回に一度）
    if (b.acts % 5 === 3) feed(w, "mind", G.Text.live.mind({ name: heroName(w), n, watched: h.watched > 0, expect: expectation(w, who.kind), stage: b.stage, tier: G.tier(w.run.save.body, w.run.save.mind) }));
    // どこまで溜まったか
    const lv = h.pleasure >= 88 ? 3 : h.pleasure >= 70 ? 2 : h.pleasure >= 45 ? 1 : 0;
    if (lv > (b.heat || 0)) { b.heat = lv; actMsg(w, "heat" + lv, { c: Math.round(h.pleasure) }); }
    checkClimax(w, who);
    if (h.pleasure < 45) b.heat = 0;
  }
  function updateBound(w, dt) {
    const h = w.run.h, b = h.bound, tf = tierFx(w);
    b.t += dt;
    b.by = b.by.filter(id => w.monsters.some(m => m.id === id && m.hp > 0) || w.traps.some(t => t.id === id));
    if (!b.by.length) { release(w, false); return; }
    const k = mult(w, b.type), p = b.power;
    h.hp = Math.max(0, h.hp - 0.3 * p * dt);
    h.will = Math.max(0, h.will - 0.27 * p * k * tf.will * dt);   // ルミナは心が強い      // 拘束は長く見せる分、一秒あたりは緩め
    // 縛られているだけでは、熱は上がらない。触れられて、はじめて上がる
    lewdTick(w, dt);
    if (!h.bound) return;
    for (const id of b.by) { const m = w.monsters.find(x => x.id === id); if (m && m.d.atk.drain) drainMagic(w, m.d.atk.drain * dt, m); }
    if (h.kit.knife > 0 && b.t > 0.8 && !b.knifed && b.type === "絡" && !b.noKnife) { b.knifed = true; h.kit.knife--; b.struggle += 0.6; msg(w, "item", { item: G.Text.item("knife") }); record(w, { kind: "item", item: "knife", sev: 0 }); }
    const arms = b.by.length + (b.shadow && b.shadow.arms >= 4 ? 1 : 0);      // 影の腕が増えたら、二か所以上に掴まれたのと同じ
    if (h.form === "magica" && !b.noFlash && h.cdFlash <= 0 && h.mp >= G.HIKARI.flash.cost && h.trance <= 0 && !b.wait && b.t > 5.5 && (arms >= 2 || (b.t > 7 && pressure(w, h.x, h.y, 2.4).n >= 3))) { flash(w); return; }
    const prep = G.PREP[w.run.stated];
    let rate = (0.2 + h.will / 260) * (h.form === "magica" ? 1.25 : 0.7) * tf.struggle / Math.max(0.5, k * p) * (b.slowStruggle || 1) * resist(w);
    rate /= 1 + 0.25 * (b.nAct > 1 ? b.nAct - 1 : 0);                // 群がられるほど、もがく隙がない
    if (h.pleasure > 70) rate *= 0.75;                                 // 気持ちよさで、力が入らない
    if (prep && prep.slow && b.type === "絡") rate *= 0.8;
    rate *= 1 + knowledge(w, b.src.kind) * 0.35;        // 知っている相手ほど、抜け方が分かる
    rate *= 1 - 0.12 * ((h.charm && h.charm[b.src.kind]) || 0);   // 好きな相手の腕は、本気で振りほどけない（魅了拘束）
    rate *= 1 - expectation(w, b.src.kind) * 0.3;       // 気持ちよさを覚えている相手だと、本気で振りほどけない
    if (sk(w, "hodoki")) rate *= 1.3;
    if (b.t < 6) rate *= 0.2;                              // 捕まった直後は、まず何もできない
    rate *= 0.45;                                          // 捕まっている時間は長く、そのあいだに熱がゆっくり上がっていく
    if (h.trance > 0) rate *= 0.5;                         // 催眠・惑いが効いている間は、もがく手に力が入らない
    if (h.will < 25) rate *= 1.5;                          // 追い詰められて、最後の力を振り絞る
    if (!b.nAct) rate *= 1.8;                              // 縛られているだけ（誰も触れてこない）なら、落ち着いて解ける
    b.struggle += rate * 0.9 * dt;
    if (U.chance(dt * 0.8)) msg(w, "struggle", {}, 2.5);
    if (b.struggle > 0.7 && !b.almost) { b.almost = true; msg(w, "almostFree", {}); inspire(w, "struggle"); }
    if (b.edge) { h.pleasure = Math.min(h.pleasure, 96); h.will = Math.max(0, h.will - 2.2 * dt); if (b.t > 2 && U.chance(dt * 0.6)) msg(w, "edge", {}, 3); }
    if (b.pillory) { h.watched = 0.4; h.arousal = Math.min(100, h.arousal + 1.2 * dt); }
    // 吊花：逆さのまま、蜜が一定の間隔で垂れてくる
    if (b.hang) { b.dripT = (b.dripT || 0) + dt; if (b.dripT > 1.6) { b.dripT = 0; h.arousal = Math.min(100, h.arousal + 3 * k); h.pleasure += 3.5 * k * tf.pleasure * heat(w); msg(w, "budDrip", {}, 4); } }
    // 白繭：湿った熱が、中にこもっていく
    if (b.cocoon) { h.arousal = Math.min(100, h.arousal + 1.6 * dt); if (U.chance(dt * 0.3)) msg(w, "cocoonHeat", {}, 5); }
    // 蝕根：床下で何が起きているかは、上からは見えない
    if (b.root && U.chance(dt * 0.35)) msg(w, "rootUnder", {}, 5);
    // 爪車：もがくたびに一歯。戻る歯はない。決まった時間で開く
    if (b.ratchet) {
      b.ratchet.t += dt;
      if (b.ratchet.t > 2) { b.ratchet.t = 0; b.ratchet.n++; b.struggle = Math.max(0, b.struggle - 0.14); h.pleasure += 6 * k * tf.pleasure * heat(w); msg(w, "ratchet", { c: b.ratchet.n }, 1.5); }
      if (b.t >= b.ratchet.open) { msg(w, "ratchetOpen", {}); release(w, false); return; }
    }
    // 影腕：時とともに腕が増える
    if (b.shadow) { b.shadow.t += dt; if (b.shadow.t > 1.8 && b.shadow.arms < 8) { b.shadow.t = 0; b.shadow.arms += 2; b.power += 0.12; msg(w, "shadowArms", { c: b.shadow.arms }, 1); } }
    checkClimax(w, b.src);
    // 変生した部位を吸われる
    if (b.futaSuck) { if (h.futa) addCum(w, b.futaSuck * 0.55 * dt, b.src); else h.pleasure += b.futaSuck * 0.4 * intake(w, b.src) * dt; if (U.chance(dt * 0.3)) msg(w, h.futa ? "futaSuck" : "struggle", {}, 4); }
    // 浄化の台：放っておかれる。求めなければ、与えられない
    if (b.begAfter && b.t > b.begAfter) {
      const src = b.src; record(w, { kind: "beg", type: "惑", mon: src.kind, monName: src.d ? src.d.name : "", sev: 3 }); openScene(w, "joukaBeg", src);
      release(w, false); releaseOverflow(w, 60, src, "jouka"); return;
    }
    // くすぐり：笑いを堪えるうちに気力が削れる
    if (b.tickle) { h.will = Math.max(0, h.will - 1.2 * dt); if (U.chance(dt * 0.5)) msg(w, "tickle", {}, 3); }
    // 開発：捕まっている間、少しずつ敏感にされる。装束も剥がされる
    if (b.develop) { b.devT = (b.devT || 0) + dt; if (b.devT > 2.5) { b.devT = 0; h.sens = Math.min(5, (h.sens || 0) + 1); if (!h.exposure) { h.exposure = true; record(w, { kind: "exposure", sev: 2, mon: b.src.kind, monName: b.src.d ? b.src.d.name : "" }); } msg(w, "develop", { c: h.sens }, 2); } }
    // 抱きついて、数秒で離れる
    if (b.brief && b.t > b.brief) {
      // 短く抱きつく相手・網が離れても、ほかに掴んでいる者がいれば捕まったまま
      const rest = b.by.filter(id => id !== b.src.id && w.monsters.some(m => m.id === id && m.hp > 0));
      if (!rest.length) { release(w, false); return; }
      const m0 = w.monsters.find(m => m.id === b.src.id); if (m0) { m0.holding = false; m0.cd = Math.max(m0.cd, 2); }
      b.by = rest; b.src = w.monsters.find(m => m.id === rest[0]); b.brief = 0; b.power = Math.max(0.4, b.power * 0.7);
      for (const f of ["net", "tickle", "wire"]) b[f] = false;
    }
    // 戦闘員化ポッド：名前を塗り替えられていく
    if (b.pod) { addBrain(w, 7 * dt, b.src); if (!h.bound) return; if (U.chance(dt * 0.4)) msg(w, "podName", {}, 4); }
    // うつろの鎧：内側は柔らかく、光も杖も届かない
    if (b.armor && U.chance(dt * 0.35)) msg(w, "armorIn", {}, 5);
    if (b.itch) h.ache = Math.max(h.ache || 0, 20);
    if (b.t > 6 && !b.sceneShown && !b.pillory && !b.edge && !b.slowStruggle) {
      b.sceneShown = true; const rs = w.run.holdScenes || (w.run.holdScenes = {});
      if (!rs[b.src.kind]) { rs[b.src.kind] = 1; openScene(w, "hold", b.src); }   // 同じ相手の場面は一潜行に一度（あとは行為の文で描く）
    }
    // ルミナの底力：気力が尽きかけた時、階ごとに一度だけ、光で全部を弾き飛ばす（変身中・MP があれば）
    if (h.will < 10 && h.hp > 0 && !h.lastStand && h.form === "magica" && h.mp >= 6 && !b.noFlash) {
      h.lastStand = true; h.mp += G.HIKARI.flash.cost; flash(w); h.will = Math.max(h.will, 50); h.ifr = Math.max(h.ifr, 2);
      msg(w, "lastStand", {}); h.bubble = { text: G.Text.spell("lastStand"), t: 1.8 };
      return;
    }
    if (b.struggle >= 1) release(w, true);
    else if (h.will <= 0 || h.hp <= 0) defeat(w, b.src);
  }
  function defeat(w, src) {
    if (w.outcome) return;
    record(w, { kind: "defeat", type: src && src.d ? src.d.type : "絡", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3 });
    logLine(w, G.Text.log("defeat", { mon: src && src.d ? src.d.name : "" }), "heavy");
    msg(w, "defeat", {});
    w.outcome = "defeat"; w.defeatBy = src ? src.kind : null;
    openScene(w, "defeat", src);
  }
  function openScene(w, key, src) {
    const run = w.run;
    const sc = G.Text.scene(key, { run, h: run.h, n: heroName(w), mon: src && src.d ? src.d.name : "", type: src && src.d ? src.d.type : "", floor: w.floorNo, kind: src && src.kind });
    if (sc) w.scene = { key, lines: sc, mon: src && src.kind };
  }

  /* ================================================================ ひかり：知覚 */

  Object.assign(G.F, { presentSrc, checkClimax, grab, callPack, release, knock, actCat, lewdTick, updateBound, defeat, openScene });
  G.F.bind.push(() => { ({ U, M, heroName, say, live, feed, msg, fx, pushMsg, monSay, actMsg, actBub, logLine, record, trait, heat, intake, resist, capped, releaseOverflow, addCharm, charmTouch, addCum, kiss, addBrain, mult, tierFx, knowledge, learn, expectation, sk, inspire, crave, drainMagic, possess, endPossess, free, pressure, flash, alertMon, shasei, cumBlocked, urgeUp, dirStat, byPlayer } = G.F); });
})();
