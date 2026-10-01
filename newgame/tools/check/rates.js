"use strict";
const { options, run, cli } = require("./common");

// wip/rates.js と同じ初期化・終了条件・集計。種ごとに乱数列を独立させる。
function measure({ seed, runs }) {
  G.U.setSeed(seed);
  const r = { cleared: 0, retreat: 0, defeat: 0, timeout: 0, ordered: 0, floors: 0, lv: {} };
  for (let i = 0; i < runs; i++) {
    const s = G.Game.newSave();
    s.autoDirector = false;
    G.Game.morning(s);
    const q = s.requests[i % s.requests.length];
    G.Game.assign(s, i % s.requests.length, null, null);
    G.Game.prep(s);
    const dive = G.Game.startDive(s);
    let timeout = false;
    for (;;) {
      const w = G.Game.makeFloor(dive);
      let t = 0;
      while (!w.outcome && t < 300) {
        if (w.scene) w.scene = null;
        G.Field.step(w, 1 / 30);
        t += 1 / 30;
      }
      if (!w.outcome) { w.outcome = "retreat"; timeout = true; }
      if (G.Game.afterFloor(dive, w) === "end") break;
    }
    const outcome = timeout ? "timeout" : dive.outcome;
    if (outcome === "retreat") {
      r.why = r.why || {};
      r.why[dive.retreatWhy] = (r.why[dive.retreatWhy] || 0) + 1;
    }
    r[outcome] = (r[outcome] || 0) + 1;
    r.floors += dive.floorReached;
    r.tb = (r.tb || 0) + dive.events.filter(e => e.kind === "trapBreak").length;
    r.tt = (r.tt || 0) + dive.events.filter(e => e.kind === "trap").length;
    const level = q.real.level;
    r.lv[level] = r.lv[level] || { n: 0, c: 0, d: 0 };
    r.lv[level].n++;
    if (outcome === "cleared") r.lv[level].c++;
    if (outcome === "defeat") {
      r.lv[level].d++;
      r.by = r.by || {};
      r.by[dive.defeatBy] = (r.by[dive.defeatBy] || 0) + 1;
    }
  }
  return r;
}

function sum(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number") target[key] = (target[key] || 0) + value;
    else sum(target[key] || (target[key] = {}), value);
  }
  return target;
}
function rates(config) {
  const bySeed = config.seeds.map(seed => ({ seed, counts: run(measure, { seed, runs: config.runs }) }));
  return { seeds: config.seeds, runs: config.runs, n: config.seeds.length * config.runs,
    bySeed, total: bySeed.reduce((total, item) => sum(total, item.counts), {}) };
}
function print(result) {
  const { total: r, n } = result;
  console.table(["cleared", "retreat", "defeat", "timeout", "ordered"].map(outcome => ({
    outcome, count: r[outcome] || 0, percent: ((r[outcome] || 0) / n * 100).toFixed(1),
  })));
  console.log("dives", n, "average floor", (r.floors / n).toFixed(2), "trapBreak", r.tb || 0, "trap", r.tt || 0);
  console.table(Object.entries(r.lv).map(([level, value]) => ({ level, ...value, clearedPercent: (value.c / value.n * 100).toFixed(1) })));
  console.log("retreat reasons", r.why || {});
  console.table(Object.entries(r.by || {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([monster, count]) => ({ monster, count })));
}
if (require.main === module) cli(() => {
  const config = options("1", 20, "踏破・帰還・敗北・打ち切りの集計（オート指揮なし）");
  if (!config) return;
  const result = rates(config);
  if (config.json) console.log(JSON.stringify(result)); else print(result);
});
module.exports = { measure, rates, print };
