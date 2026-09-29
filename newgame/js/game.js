/* game.js — 1日の流れと、日をまたいで残るもの（セーブ）。DOM に触れない
 *
 * 朝（ギルド）→ 依頼を割り当てる（すり替え・書き換え）→ ひかりの準備 → 潜行10階
 *   → 敗北なら観測フェーズ（一晩）→ 救出 → 口頭報告 → 書類監査（→ 再報告）→ 処置 → 翌日
 */
var G = (typeof G !== "undefined") ? G : {};
(function () {
  "use strict";
  const U = G.U;

  const AILMENTS = {
    heat:    { name: "発情",     note: "熱が引かない。次の潜行は熱を抱えたまま始まる", fee: 10 },
    haze:    { name: "催眠残滓", note: "思い出せない時間がある。惑に掛かりやすい",     fee: 12 },
    soiled:  { name: "汚濁",     note: "粘液の匂いが抜けない",                         fee: 6 },
    hollow:  { name: "魔力枯渇", note: "変身の光が弱い。次の潜行は魔力が少ない",       fee: 10 },
  };

  const SHOP = {
    freeSlot: { name: "デッキの自由枠 +1",   costs: [6, 12, 18], note: "ダンジョンごとのデッキに、好きな魔物・罠を1つ多く入れられる" },
    live:     { name: "同時に出せる数 +1",   costs: [8, 16],     note: "呼び出した魔物を、同時にもう1体多く出していられる" },
    budget:   { name: "階ごとのコスト +2",   costs: [5, 10, 15], note: "1つの階で使えるコストの上限が上がる" },
    swapDest: { name: "行き先のすり替え",     costs: [4],         note: "依頼書はそのままに、実際の行き先だけを別のダンジョンへ差し替えられる" },
  };

  const REQUEST_TITLE = {
    mist: ["霧鏡の回廊の調査", "回廊の鏡の破壊", "行方不明者の捜索（霧鏡の回廊）"],
    mire: ["湿窟の水源の浄化", "蜜溜まりの湿窟の地図作り", "薬草の採取（蜜溜まりの湿窟）"],
    vine: ["蔦森の砦の探索", "絡繰りの蔦森の魔物討伐", "古い砦の遺物回収（絡繰りの蔦森）"],
  };

  /* ================================================================ 新しいゲーム */
  function newSave() {
    const decks = {};
    for (const k in G.DUNGEONS) { const dg = G.DUNGEONS[k]; decks[k] = [dg.free.find(x => G.MONSTERS[x].type === "削"), "trap:" + dg.traps[0]]; }
    return {
      v: 1, day: 1, phase: "guild",
      funds: 60, dark: 0, taint: 0, trust: 50, suspicion: 0, body: 0, mind: 0, fatigue: 0,
      ailments: [], upgrades: { freeSlot: 0, live: 0, budget: 0, swapDest: 0 },
      decks, autoDirector: false, speed: 1,
      history: [], reportMem: {}, lastPosture: null, caughtDay: -9, silentAccepted: false,
      requests: null, pick: null, rec: null, log: [],
    };
  }

  /* ================================================================ 朝：依頼 */
  function makeRequests(s) {
    const keys = Object.keys(G.DUNGEONS);
    const out = [];
    for (const k of U.shuffle(keys)) {
      const dg = G.DUNGEONS[k];
      out.push({ id: s.day + ":" + k, title: U.pick(REQUEST_TITLE[k]), dungeon: k, stated: dg.type, reward: U.ri(34, 48) });
    }
    return out;
  }
  function morning(s) {
    s.phase = "guild";
    s.requests = makeRequests(s);
    s.pick = null;
    // 違和感が確信に変わった
    if (s.suspicion >= 100) {
      const tier = G.tier(s.body, s.mind);
      if (tier >= 3) { s.suspicion = 70; s.pendingEvent = "silent"; }
      else s.pendingEvent = "confront";
    }
  }
  // 確信された：裏のリソースを全部使って矯正（信頼は最大、リソースは0）
  function resolveConfront(s) {
    s.log.push({ day: s.day, text: `違和感を抱いたひかりを矯正した（澱晶 ${s.dark} をすべて使った）` });
    s.dark = 0; s.trust = 100; s.suspicion = 0; s.pendingEvent = null;
  }

  // 依頼を割り当てる。stated＝依頼書に書く系統、dest＝実際の行き先
  function assign(s, reqIdx, stated, dest) {
    const r = s.requests[reqIdx];
    const real = dest || r.dungeon;
    s.pick = { req: r, stated: stated || r.stated, dungeon: real, forged: (stated && stated !== G.DUNGEONS[real].type) || real !== r.dungeon };
    s.phase = "prep";
    return s.pick;
  }

  /* ================================================================ 準備（ひかりが依頼書を見て整える） */
  function prep(s) {
    const p = s.pick;
    const kit = Object.assign({}, G.HIKARI.kit);
    const cost = kit.star * 5 + kit.salve * 3 + kit.smelling * 3;
    if (s.funds < cost) { kit.star = 1; kit.salve = 1; kit.smelling = 0; }
    s.funds = Math.max(0, s.funds - Math.min(s.funds, kit.star * 5 + kit.salve * 3 + kit.smelling * 3));
    p.kit = kit;
    p.prepItem = G.PREP[p.stated];
    return p;
  }

  function deckFor(s, dungeon) {
    const dg = G.DUNGEONS[dungeon];
    const n = G.BAL.freeSlots + s.upgrades.freeSlot;
    return dg.fixed.slice().concat((s.decks[dungeon] || []).slice(0, n));
  }
  function freeCandidates(dungeon) {
    const dg = G.DUNGEONS[dungeon];
    return dg.free.concat(dg.traps.map(t => "trap:" + t));
  }

  /* ================================================================ 潜行 */
  function startDive(s) {
    const p = s.pick;
    const has = id => s.ailments.some(a => a.id === id);
    const run = {
      day: s.day, dungeon: p.dungeon, stated: p.stated, realType: G.DUNGEONS[p.dungeon].type, forged: p.forged,
      events: [], night: [], deck: deckFor(s, p.dungeon), maxLive: G.BAL.maxLive + s.upgrades.live,
      autoDirector: s.autoDirector, save: s, recall: false, floor: 1, mismatch: 0,
      h: {
        hp: Math.round(G.HIKARI.hpMax * (1 - s.fatigue / 250)), mp: G.HIKARI.mpMax, magic: has("hollow") ? 60 : G.HIKARI.magicMax,
        will: Math.round(100 - s.fatigue / 5), arousal: has("heat") ? 30 : 0, pleasure: 0, climax: 0, form: "magica", kit: Object.assign({}, p.kit),
      },
      budgetBonus: s.upgrades.budget * 2,
    };
    s.phase = "dive";
    return run;
  }
  function makeFloor(run) {
    const w = G.Field.createWorld(run, run.floor);
    w.dir.cap += run.budgetBonus || 0;
    return w;
  }
  // 階の結果を受けて、次へ進むか終わるか
  function afterFloor(run, w) {
    if (w.outcome === "down") { run.floor++; return "next"; }
    run.outcome = w.outcome === "cleared" ? "cleared" : w.outcome;
    run.floorReached = run.floor;
    return "end";
  }

  /* ================================================================ 帰還後：堕ち・状態異常・リソース */
  function finishDive(s, run) {
    const ev = run.events;
    const holdSec = ev.filter(e => e.kind === "hold").reduce((a, e) => a + (e.dur || 3), 0);
    const nightBeats = run.night.length;
    const climaxes = run.h.climax;
    // 肉体は一晩で一段（25）まで。精神は、その日の肉体の伸びの1/3まで
    const bodyGain = Math.min(25, climaxes * 1.6 + holdSec * 0.12 + nightBeats * 1.8 + run.h.arousal * 0.03);
    let mindGain = (run.outcome === "defeat" ? 2.5 : 0) + nightBeats * 0.5;
    mindGain = Math.min(bodyGain / 3, mindGain);
    s.body = U.clamp(s.body + bodyGain, 0, 100);
    s.mind = U.clamp(s.mind + mindGain, 0, 100);
    // 状態異常
    const add = id => { if (!s.ailments.some(a => a.id === id)) s.ailments.push({ id, day: s.day }); };
    if (run.h.arousal > 55 || nightBeats > 0) add("heat");
    if (ev.some(e => e.kind === "trance" && e.hidden)) add("haze");
    if (ev.filter(e => e.type === "蕩" && (e.kind === "arouse" || e.kind === "hold")).length >= 4) add("soiled");
    if (run.h.form === "civilian") add("hollow");
    // 報酬
    const req = s.pick.req;
    let funds = run.outcome === "cleared" ? req.reward : run.outcome === "defeat" ? 0 : Math.round(req.reward * run.floorReached / 12);
    if (run.outcome === "defeat") funds -= 15;       // 救出の費用
    s.funds = Math.max(0, s.funds + funds);
    const sevSum = ev.reduce((a, e) => a + (["hold", "climax", "trap", "trance", "arouse", "untransform"].includes(e.kind) ? (e.sev || 0) : 0), 0);
    const dark = Math.round(Math.min(10, sevSum / 10) + climaxes * 0.8 + nightBeats * 0.6 + (run.outcome === "defeat" ? 3 : 0));
    s.dark += dark;
    s.taint = U.clamp(s.taint + dark * 0.18, 0, 100);
    // 違和感（依頼書と中身の食い違い）
    // 見かけた「話と違う魔物」の種類の数で決める（同じ種を何度見ても1）
    const odd = new Set(ev.filter(e => e.kind === "spot" && e.type !== run.stated && e.type !== "削").map(e => e.mon)).size;
    let sus = run.forged ? 3 + Math.min(odd, 6) * 2.2 : -4;
    sus *= [1, 0.85, 0.6, 0.3][G.tier(s.body, s.mind)];
    s.suspicion = U.clamp(s.suspicion + sus, 0, 100);
    s.fatigue = U.clamp(s.fatigue + (run.outcome === "defeat" ? 40 : 25), 0, 100);
    const rec = {
      day: s.day, dungeon: run.dungeon, dungeonName: G.DUNGEONS[run.dungeon].name, stated: run.stated, realType: run.realType, forged: run.forged,
      outcome: run.outcome, floorReached: run.floorReached, events: ev, night: run.night, mismatch: run.mismatch || 0,
      h: { hp: run.h.hp, arousal: run.h.arousal, form: run.h.form, climax: climaxes }, ailments: s.ailments.map(a => a.id),
      gain: { body: +bodyGain.toFixed(1), mind: +mindGain.toFixed(1), funds, dark, sus: +sus.toFixed(1) },
    };
    rec.report = G.Report.build(rec, s);
    rec.doc = G.Report.documentLines(rec, s);
    rec.monitor = G.Report.monitorLog(rec);
    s.rec = rec;
    s.phase = "report";
    s.history.push({ day: s.day, dungeon: run.dungeon, stated: run.stated, outcome: run.outcome, floor: run.floorReached, climax: climaxes, posture: rec.postureName, forged: run.forged });
    if (s.history.length > 60) s.history.shift();
    return rec;
  }

  /* ================================================================ 書類監査 */
  function audit(s, flagged) {
    const rec = s.rec, doc = rec.doc;
    const res = { caught: [], wrong: [], missed: [] };
    doc.forEach((d, i) => {
      const f = flagged.includes(i);
      if (f && d.kind === "false") res.caught.push(d);
      else if (f) res.wrong.push(d);
      else if (d.kind === "false") res.missed.push(d);
    });
    s.trust = U.clamp(s.trust + res.caught.length * 8 - res.wrong.length * 6, 0, 100);
    // 暴かれると心は少し戻る。隠し通せた嘘は、自分を誤魔化した分だけ心を進める
    s.mind = U.clamp(s.mind - res.caught.length * 1.5 + res.missed.length * 2.5, 0, 100);
    s.dark += res.caught.length;
    if (res.caught.length) s.caughtDay = s.day;
    rec.audit = res;
    s.phase = res.caught.length ? "rereport" : "clinic";
    return res;
  }
  // 再報告のあとの選択：記録だけ取る／踏み込んで確認する
  function rereportChoice(s, lewd) {
    if (lewd) { s.trust = U.clamp(s.trust - 6, 0, 100); s.dark += 3; s.taint = U.clamp(s.taint + 2, 0, 100); s.body = U.clamp(s.body + 2, 0, 100); }
    s.phase = "clinic";
  }

  /* ================================================================ 処置と翌日 */
  function treat(s, ids) {
    for (const id of ids) {
      const a = AILMENTS[id];
      if (!a || s.funds < a.fee) continue;
      s.funds -= a.fee;
      s.ailments = s.ailments.filter(x => x.id !== id);
    }
  }
  function endDay(s) {
    // 残した状態異常は、ギルドの空気を少しずつ澱ませる
    s.taint = U.clamp(s.taint + s.ailments.length * 1.5, 0, 100);
    s.fatigue = U.clamp(s.fatigue - 22, 0, 100);
    s.day++;
    s.rec = null;
    morning(s);
  }

  function buy(s, key) {
    const it = SHOP[key], lv = s.upgrades[key] || 0;
    if (!it || lv >= it.costs.length) return "max";
    if (s.dark < it.costs[lv]) return "cost";
    s.dark -= it.costs[lv];
    s.upgrades[key] = lv + 1;
    return "ok";
  }

  function taintStage(s) { return s.taint >= 100 ? 4 : s.taint >= 70 ? 3 : s.taint >= 42 ? 2 : s.taint >= 18 ? 1 : 0; }

  G.Game = { AILMENTS, SHOP, newSave, morning, resolveConfront, assign, prep, deckFor, freeCandidates, startDive, makeFloor, afterFloor, finishDive, audit, rereportChoice, treat, endDay, buy, taintStage };
})();
if (typeof module !== "undefined") module.exports = G;
