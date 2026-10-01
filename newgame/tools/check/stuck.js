"use strict";
const { options, run, cli } = require("./common");

function measure({ seeds, runs }) {
  let found = 0;
  const labels = {}, scenes = [];
  for (const dungeon of Object.keys(G.DUNGEONS)) for (const seed of seeds) {
    G.U.setSeed(seed * 7);
    const s = G.Game.newSave();
    G.Game.morning(s);
    const ri = s.requests.findIndex(r => r.dungeon === dungeon);
    G.Game.assign(s, ri, null, null);
    G.Game.prep(s);
    const dive = G.Game.startDive(s);
    for (let floor = 0; floor < runs; floor++) {
      const w = G.Game.makeFloor(dive), h = dive.h;
      let t = 0, idle = 0, labs = {};
      while (t < 150 && !w.outcome) {
        if (w.scene) w.scene = null;
        const x0 = h.x, y0 = h.y;
        G.Field.step(w, 1 / 30);
        t += 1 / 30;
        const busy = h.cast || h.bound || h.trance > 0 || h.glue > 0 || h.freeze > 0 || h.pray > 0 || h.sniff > 0 || h.salute > 0 || h.rest > 0 || h.convey || h.drawn || h.think > 0.2;
        const near = w.monsters.some(m => m.hp > 0 && m.alert > 0 && h.known[m.id] && w.t - h.known[m.id].t < 0.5 && G.U.dist(m.x, m.y, h.x, h.y) < 5);
        if (near && !busy && G.U.dist(x0, y0, h.x, h.y) < 0.01) {
          idle += 1 / 30;
          labs[h.label] = (labs[h.label] || 0) + 1;
        } else { idle = 0; labs = {}; }
        if (idle > 8) {
          found++;
          const nearby = w.monsters.filter(m => m.hp > 0 && G.U.dist(m.x, m.y, h.x, h.y) < 6)
            .map(m => [m.kind, +G.U.dist(m.x, m.y, h.x, h.y).toFixed(1), m.alert > 0, m.stun > 0, +m.hp.toFixed(1), G.Map.los(w.map, h.x, h.y, m.x, m.y)]);
          scenes.push(JSON.parse(JSON.stringify({ dungeon, seed, floorIndex: floor, floor: w.floorNo, seconds: +t.toFixed(1), label: h.label,
            x: +h.x.toFixed(1), y: +h.y.toFixed(1), mp: h.mp | 0, cdShot: +h.cdShot.toFixed(1), form: h.form,
            cast: !!h.cast, state: h.state, goal: h.goal, intent: h.intent, think: h.think, nearby })));
          const key = dungeon + ":" + Object.keys(labs).join("/");
          labels[key] = (labels[key] || 0) + 1;
          idle = -999;
        }
      }
      if (G.Game.afterFloor(dive, w) === "end") break;
    }
  }
  return { found, labels, scenes };
}
function stuck(config) { return run(measure, config); }
function print(result) {
  for (const scene of result.scenes) console.log(JSON.stringify(scene));
  console.log("found", result.found, JSON.stringify(result.labels));
}
if (require.main === module) cli(() => {
  const config = options("7-14", 5, "固まり検出。--runs は種ごとの検査階数。種は従来どおり7倍して使用。");
  if (!config) return;
  const result = stuck(config);
  if (config.json) console.log(JSON.stringify(result)); else print(result);
  if (result.found) process.exitCode = 1;
});
module.exports = { measure, stuck, print };
