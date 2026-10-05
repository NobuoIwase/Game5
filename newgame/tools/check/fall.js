"use strict";
// 堕ちの段階ごとの手ごたえ：段階（体・心の堕ち）を固定して潜らせ、踏破・捕まった数・絶頂数・絶頂までの触れられた回数を見る
// 使い方: node newgame/tools/check/fall.js [回数=12] [種=1,2] [hikari|haruka|both]
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of require("../files")) vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "..", "js", f + ".js"), "utf8"), ctx, { filename: f + ".js" });
const N = +process.argv[2] || 12, SEEDS = (process.argv[3] || "1,2").split(",").map(Number), WHO = process.argv[4] || "both";
const TIERS = [[0, 0], [30, 10], [60, 30], [70, 60]];   // 段階0〜3になる 体・心
const heroes = WHO === "both" ? ["hikari", "haruka"] : [WHO];
const out = JSON.parse(vm.runInContext(`(function(){
  const res = {};
  for (const hero of ${JSON.stringify(heroes)}) for (let ti = 0; ti < 4; ti++) {
    const [body, mind] = ${JSON.stringify(TIERS)}[ti];
    const r = { n: 0, cleared: 0, retreat: 0, defeat: 0, timeout: 0, holds: 0, shrug: 0, climax: 0, actsToCx: [], floors: 0 };
    for (const seed of ${JSON.stringify(SEEDS)}) { G.U.setSeed(seed * 100 + ti);
      for (let i = 0; i < ${N}; i++) {
        const s = G.Game.newSave(); s.autoDirector = false; if (hero === "haruka") G.Game.swapHero(s, "haruka");
        s.body = body; s.mind = mind; G.Game.morning(s);
        G.Game.assign(s, i % s.requests.length, null, null); G.Game.prep(s);
        const run = G.Game.startDive(s); let to = false, acts = 0;
        for (;;) { const w = G.Game.makeFloor(run); let t = 0;
          while (!w.outcome && t < 300) { w.scene = null; const b = w.run.h.bound, a0 = b ? b.acts : 0, c0 = w.run.h.climax; G.Field.step(w, 1 / 30); t += 1 / 30;
            const b2 = w.run.h.bound; if (b2) acts += b2.acts - (b === b2 ? a0 : 0); if (w.run.h.climax > c0) { r.actsToCx.push(acts); acts = 0; } }
          if (!w.outcome) { w.outcome = "retreat"; to = true; } if (G.Game.afterFloor(run, w) === "end") break; }
        const oc = to ? "timeout" : run.outcome; r[oc]++; r.n++; r.floors += run.floorReached;
        r.holds += run.events.filter(e => e.kind === "hold").length; r.shrug += run.events.filter(e => e.kind === "shrug").length;
        r.climax += run.events.filter(e => e.kind === "climax").length;
      } }
    const a = r.actsToCx.sort((x, y) => x - y);
    res[hero + " 段階" + ti] = { 踏破: r.cleared + "/" + r.n, 撤退: r.retreat, 敗北: r.defeat, 時間切れ: r.timeout, 平均階: +(r.floors / r.n).toFixed(1), 捕まり_潜行: +(r.holds / r.n).toFixed(1), 振り払い_潜行: +(r.shrug / r.n).toFixed(1), 絶頂_潜行: +(r.climax / r.n).toFixed(1), 絶頂までの行為_中央: a.length ? a[a.length >> 1] : null };
  }
  return JSON.stringify(res); })()`, ctx));
console.table(out);
