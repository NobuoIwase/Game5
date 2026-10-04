"use strict";
// 二人で潜る検査：二人の潜行が最後まで回るか、倒れた相棒を救えるか、二人とも倒れたら二人の場面と一夜になるか、夜明け前に二人とも（それぞれの相手に）持ち帰られるか、報告が二人ぶんできるか
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of require("../files")) vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "..", "js", f + ".js"), "utf8"), ctx, { filename: f + ".js" });
const r = JSON.parse(vm.runInContext(`(function(){
  const out = { dives: 0, recB: 0, rescued: 0, bothScene: 0, nightHeroes: 0, abduct: 0, abductRec: 0, nightMon: 0, errs: [] };
  for (let seed = 1; seed <= 3; seed++) {
    const U = G.U; U.setSeed(seed);
    const s = G.Game.newSave(); s.autoDirector = true; G.Game.morning(s);
    const ri = s.requests.findIndex(q => !q.rescue); G.Game.assign(s, ri, null, null); G.Game.prep(s);
    const run = G.Game.startDive(s, { pair: true });
    try {
      const w = G.Game.makeFloor(run); let t = 0, downed = false;
      while (!w.outcome && t < 120) { w.scene = null; G.Field.step(w, 1 / 30); t += 1 / 30;
        if (!downed && t > 8) { downed = true; G.F.duoCtx(w, 1); G.F.defeat(w, w.monsters.find(m => m.hp > 0) || null); G.F.duoCtx(w, 0); } }
      if (run.events.some(e => e.kind === "duoRescue")) out.rescued++;
      // 二人とも倒す
      const m = w.monsters.find(x => x.hp > 0); w.outcome = null; w.scene = null;
      for (const i of [0, 1]) { G.F.duoCtx(w, i); G.F.defeat(w, m); } G.F.duoCtx(w, 0);
      if (w.outcome === "defeat" && w.scene && w.scene.lines.some(l => /ひ.?かり/.test(l) && /遙/.test(l))) out.bothScene++;
      w.scene = null; G.Field.startNight(w); for (let b = 0; b < 6; b++) G.Field.nightBeat(w);
      out.nightHeroes += new Set(run.night.map(b => b.hero)).size === 2 ? 1 : 0;
      const withMon = ["hikari", "haruka"].every(id => run.night.some(b => b.hero === id && b.mon));   // 囲む魔物のいない夜は、持ち帰る者もいない
      if (withMon) out.nightMon++;
      if (withMon && new Set((run.abduct || []).map(a => a.hero)).size === 2) out.abduct++;
      G.Game.afterFloor(run, w); G.Game.finishDive(s, run); out.dives++;
      if (withMon && s.rec.abduct && s.duoRec && s.duoRec.abduct && s.rec.monitor.some(l => /^夜明け前/.test(l)) && s.duoRec.monitor.some(l => /^夜明け前/.test(l))) out.abductRec++;
      if (s.duoRec && s.duoRec.report.length && s.rec.report.length) out.recB++;
    } catch (e) { out.errs.push(String(e.stack).slice(0, 400)); }
  }
  return JSON.stringify(out); })()`, ctx));
console.log("二人の潜行", JSON.stringify(r));
const ok = r.errs.length === 0 && r.dives === 3 && r.recB === 3 && r.rescued >= 2 && r.bothScene === 3 && r.nightHeroes === 3 && r.nightMon >= 1 && r.abduct === r.nightMon && r.abductRec === r.nightMon;
if (!ok) { console.error("pair FAIL"); process.exitCode = 1; }
