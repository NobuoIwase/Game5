// 新作をブラウザなしで何十日分も回す検査。止まらないか・報告が似ていないかを数える
// 使い方: node newgame/tools/sim.js [日数] [種]
const vm = require("vm"), fs = require("fs"), path = require("path");
function simulate(DAYS = 30, SEED = 7) {
const ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of require("./files"))
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", f + ".js"), "utf8"), ctx, { filename: f + ".js" });
const out = vm.runInContext(`(function(){
  const U = G.U; U.setSeed(${SEED});
  const s = G.Game.newSave(); s.autoDirector = true; G.Game.morning(s);
  const reports = [], outcomes = {}, stats = { forged: 0, confront: 0, caught: 0, missed: 0, wrong: 0, t: 0 };
  for (let d = 0; d < ${DAYS}; d++) {
    if (s.pendingEvent === "confront") { G.Game.resolveConfront(s); stats.confront++; } else s.pendingEvent = null;
    const ri = U.ri(0, s.requests.length - 1), r = s.requests[ri];
    // 半分くらいは書き換える（ひかりの弱い蕩へ送る、など）
    const forge = U.chance(0.5);
    // 半分くらいは書き換える（規模と脅威度を低く、長を消す、ときどき魔物ごと別物に）
    G.Game.assign(s, ri, forge ? { level: 1, scale: 1, boss: false, main: U.chance(0.4) ? U.pick(G.Game.MAINS) : r.real.main } : null, null);
    if (forge) stats.forged++;
    G.Game.prep(s);
    const run = G.Game.startDive(s);
    for (;;) {
      const w = G.Game.makeFloor(run); let t = 0;
      while (!w.outcome && t < 300) { if (w.scene) w.scene = null; G.Field.step(w, 1 / 30); t += 1 / 30; }
      stats.t += t;
      if (!w.outcome) w.outcome = "retreat";
      if (w.outcome === "defeat") { G.Field.startNight(w); for (let b = 0; b < G.BAL.nightBeats; b++) { if (b === 2 && U.chance(0.5)) { const c = U.pick(run.deck); G.Field.place(w, c, w.run.h.x + 1, w.run.h.y, true); } G.Field.nightBeat(w); } }
      if (G.Game.afterFloor(run, w) === "end") break;
    }
    const rec = G.Game.finishDive(s, run);
    outcomes[rec.outcome] = (outcomes[rec.outcome] || 0) + 1;
    reports.push({ day: rec.day, posture: rec.postureName, lines: rec.report.map(l => l.who + ":" + l.text), doc: rec.doc.map(x => x.kind) });
    // 監査：嘘の行を7割の確率で当てる、たまに外す
    const flags = []; rec.doc.forEach((x, i) => { if ((x.kind === "false" && U.chance(0.7)) || (x.kind !== "false" && U.chance(0.05))) flags.push(i); });
    const res = G.Game.audit(s, flags); stats.caught += res.caught.length; stats.missed += res.missed.length; stats.wrong += res.wrong.length;
    if (s.phase === "rereport") { G.Report.rereport(rec, res.caught, s); G.Game.rereportChoice(s, U.chance(0.3)); }
    G.Game.treat(s, s.ailments.filter(() => U.chance(0.6)).map(a => a.id));
    if (U.chance(0.3)) { for (const k of Object.keys(G.Game.SHOP)) if (G.Game.buy(s, k) === "ok") break; }
    G.Game.endDay(s);
  }
  return JSON.stringify({ outcomes, stats, end: { body: s.body, mind: s.mind, trust: s.trust, taint: s.taint, dark: s.dark, funds: s.funds, sus: s.suspicion, upgrades: s.upgrades }, reports });
})()`, ctx);
return JSON.parse(out);
}
function printSimulation(R, dup = false, show = false) {
const DAYS = R.reports.length;
console.log("結果", R.outcomes, "監査", { caught: R.stats.caught, missed: R.stats.missed, wrong: R.stats.wrong }, "書換", R.stats.forged, "矯正", R.stats.confront, "平均潜行", (R.stats.t / DAYS).toFixed(0) + "秒");
console.log("最終", R.end);
const { analyzeRepeat, printRepeat } = require("./check/repeat");
const repeat = analyzeRepeat(R.reports);
printRepeat(repeat);
if (dup) console.log(Object.entries(repeat.same).filter(([k, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, c]) => c + "× " + k).join("\n"));
if (show) for (const r of R.reports.slice(-3)) { console.log("\\n--- " + r.day + "日目（" + r.posture + "）"); console.log(r.lines.join("\\n")); }
}
if (require.main === module) {
  const days = Number(process.argv[2] || 30), seed = Number(process.argv[3] || 7);
  if (!Number.isSafeInteger(days) || days < 1 || !Number.isSafeInteger(seed) || seed < 1) throw new Error("日数と種は正の整数で指定してください");
  const result = simulate(days, seed);
  if (process.argv.includes("--json")) console.log(JSON.stringify(result));
  else printSimulation(result, process.argv.includes("--dup"), process.argv.includes("--show"));
}
module.exports = { simulate, printSimulation };
