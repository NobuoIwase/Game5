"use strict";
const { options, run, cli } = require("./common");

function measure({ seeds, runs }) {
  const floors = [];
  for (const seed of seeds) {
    G.U.setSeed(seed);
    for (let i = 0; i < runs; i++) {
      const s = G.Game.newSave();
      s.autoDirector = false;
      G.Game.morning(s);
      G.Game.assign(s, i % s.requests.length, null, null);
      G.Game.prep(s);
      const dive = G.Game.startDive(s);
      for (;;) {
        const w = G.Game.makeFloor(dive), labels = {};
        let t = 0;
        while (!w.outcome && t < 300) {
          if (w.scene) w.scene = null;
          G.Field.step(w, 1 / 30);
          t += 1 / 30;
          if (t > 150) {
            const label = dive.h.label + (dive.h.bound ? "(bound)" : "");
            labels[label] = (labels[label] || 0) + 1;
          }
        }
        if (!w.outcome) {
          floors.push({ seed, run: i, dungeon: dive.dungeon, floor: w.floorNo,
            alive: w.monsters.filter(m => m.hp > 0).length,
            seen: w.map.seen.reduce((a, b) => a + b, 0),
            downSeen: !!w.map.seen[Math.floor(w.map.down.y) * w.map.W + Math.floor(w.map.down.x)],
            // 全内訳を保持。端末表示は下書きと同じ上位5つ。
            labels: Object.entries(labels).sort((a, b) => b[1] - a[1]) });
          w.outcome = "retreat";
        }
        if (G.Game.afterFloor(dive, w) === "end") break;
      }
    }
  }
  return floors;
}
if (require.main === module) cli(() => {
  const config = options("1-4", 20, "1階300秒で打ち切った階の後半150秒の行動（回数は30Hzのフレーム数）");
  if (!config) return;
  const result = run(measure, config);
  if (config.json) console.log(JSON.stringify(result));
  else {
    for (const f of result) console.log(f.seed, f.run, f.dungeon, "floor", f.floor, "alive", f.alive, "seen", f.seen, "downSeen", f.downSeen, JSON.stringify(f.labels.slice(0, 5)));
    console.log("timeouts", result.length);
  }
});
module.exports = { measure };
