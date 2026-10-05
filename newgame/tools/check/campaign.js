"use strict";
// 続けて遊んだ時の手ごたえ：一人のヒロインを何十日も（書き換えなし・オート指揮なし）潜らせ、堕ちが進むにつれて踏破がどう落ちるかを見る
// 使い方: node newgame/tools/check/campaign.js [日数=30] [種=1,2] [hikari|haruka]
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of require("../files")) vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "..", "js", f + ".js"), "utf8"), ctx, { filename: f + ".js" });
const DAYS = +process.argv[2] || 30, SEEDS = (process.argv[3] || "1,2").split(",").map(Number), WHO = process.argv[4] || "hikari";
const R = JSON.parse(vm.runInContext(`(function(){
  const rows = [];
  for (const seed of ${JSON.stringify(SEEDS)}) { const U = G.U; U.setSeed(seed);
    const s = G.Game.newSave(); s.autoDirector = false; if ("${WHO}" === "haruka") G.Game.swapHero(s, "haruka"); G.Game.morning(s);
    for (let d = 0; d < ${DAYS}; d++) {
      if (s.pendingEvent === "confront") G.Game.resolveConfront(s); else s.pendingEvent = null;
      if (s.captured && s.captured[s.heroine || "${WHO}"]) break;
      const ri = s.requests.findIndex(q => !q.rescue && !q.hard); G.Game.assign(s, ri < 0 ? 0 : ri, null, null); G.Game.prep(s);
      const tier = G.tier(s.body, s.mind), run = G.Game.startDive(s);
      for (;;) { const w = G.Game.makeFloor(run); let t = 0; while (!w.outcome && t < 300) { w.scene = null; G.Field.step(w, 1 / 30); t += 1 / 30; }
        if (!w.outcome) w.outcome = "retreat";
        if (w.outcome === "defeat") { G.Field.startNight(w); for (let b = 0; b < G.BAL.nightBeats; b++) G.Field.nightBeat(w); }
        if (G.Game.afterFloor(run, w) === "end") break; }
      const rec = G.Game.finishDive(s, run);
      rows.push({ d, tier, oc: rec.outcome, cx: rec.events.filter(e => e.kind === "climax").length, hold: rec.events.filter(e => e.kind === "hold").length });
      const flags = []; rec.doc.forEach((x, i) => { if (x.kind === "false") flags.push(i); });
      G.Game.audit(s, flags); if (s.phase === "rereport") G.Game.rereportChoice(s, true);
      G.Game.treat(s, s.ailments.map(a => a.id)); G.Game.endDay(s);
      if (s.phase === "lost") break;
    } }
  return JSON.stringify(rows); })()`, ctx));
const win = 5, tab = {};
for (const r of R) { const k = "日" + (Math.floor(r.d / win) * win + 1) + "〜" + (Math.floor(r.d / win) * win + win); const t = tab[k] || (tab[k] = { n: 0, 踏破: 0, 撤退: 0, 敗北: 0, 絶頂: 0, 捕まり: 0, 段階: [] }); t.n++; if (r.oc === "cleared") t.踏破++; else if (r.oc === "defeat") t.敗北++; else t.撤退++; t.絶頂 += r.cx; t.捕まり += r.hold; t.段階.push(r.tier); }
for (const t of Object.values(tab)) { t.絶頂 = +(t.絶頂 / t.n).toFixed(1); t.捕まり = +(t.捕まり / t.n).toFixed(1); t.段階 = [...new Set(t.段階)].join(","); }
console.table(tab);
