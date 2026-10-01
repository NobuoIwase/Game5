"use strict";
const { options, run, cli } = require("./common");

function measure({ seeds, runs }) {
  const by = {}, spot = {};
  let n = 0;
  for (const dungeon of ["imp", "mist", "mire", "vine", "cult"]) for (const seed of seeds) {
    G.U.setSeed(seed * 13);
    // 標準 runs=1 は下書きと同じ、各ダンジョン・種で1潜行。
    for (let i = 0; i < runs; i++) {
      const s = G.Game.newSave();
      G.Game.morning(s);
      const ri = s.requests.findIndex(r => r.dungeon === dungeon);
      if (ri < 0) continue;
      G.Game.assign(s, ri, null, null);
      G.Game.prep(s);
      const dive = G.Game.startDive(s);
      dive.autoDirector = true;
      for (;;) {
        const w = G.Game.makeFloor(dive);
        w.dir.auto = true;
        let t = 0;
        while (!w.outcome && t < 200) {
          if (w.scene) w.scene = null;
          G.Field.step(w, 1 / 30);
          t += 1 / 30;
        }
        if (!w.outcome) w.outcome = "retreat";
        if (G.Game.afterFloor(dive, w) === "end") break;
      }
      n++;
      for (const event of dive.events) {
        if (event.kind === "charm") by[event.mon] = (by[event.mon] || 0) + 1;
        if (event.kind === "spot" && ["utaimp", "hitomi", "miwakubana", "sasayaki"].includes(event.mon)) spot[event.mon] = (spot[event.mon] || 0) + 1;
      }
    }
  }
  return { dives: n, by, spot };
}
if (require.main === module) cli(() => {
  const config = options("1-5", 1, "魅了の発生元と回数。種は下書きと同じ13倍して使用。");
  if (!config) return;
  const result = run(measure, config);
  if (config.json) console.log(JSON.stringify(result));
  else console.log("dives", result.dives, "charm by", JSON.stringify(result.by), "spotted new", JSON.stringify(result.spot));
});
module.exports = { measure };
