// 挙動の指紋：種を固定して潜行と報告を何度も回し、出来事・結果・報告の全文をまとめてハッシュにする。
// 作り直し（ファイル分割など）の前後でこの値が同じなら、ゲームの振る舞いは一字一句変わっていない。
// 使い方: node newgame/tools/fingerprint.js [潜行数=40] [種=1]   → 1行目に sha256、--dump で中身も出す
const vm = require("vm"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of ["util", "data", "map", "text", "field", "report", "diary", "game"])
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", f + ".js"), "utf8"), ctx, { filename: f + ".js" });
const N = +process.argv[2] || 40, SEED = +process.argv[3] || 1, DUMP = process.argv.includes("--dump");
const out = vm.runInContext(`(function(){
  G.U.setSeed(${SEED});
  const s = G.Game.newSave(); G.Game.morning(s); const all = [];
  for (let i = 0; i < ${N}; i++) {
    s.autoDirector = i % 2 === 0;
    G.Game.assign(s, i % s.requests.length, null, null); G.Game.prep(s);
    const run = G.Game.startDive(s);
    for (;;) {
      const w = G.Game.makeFloor(run); let t = 0;
      while (!w.outcome && t < 300) { if (w.scene) w.scene = null; G.Field.step(w, 1 / 30); t += 1 / 30; }
      if (!w.outcome) w.outcome = "retreat";
      if (w.outcome === "defeat") { G.Field.startNight(w); for (let b = 0; b < G.BAL.nightBeats; b++) G.Field.nightBeat(w); }
      if (G.Game.afterFloor(run, w) === "end") break;
    }
    const rec = G.Game.finishDive(s, run);
    all.push({ o: rec.outcome, f: rec.floorReached, ev: rec.events.map(e => [e.kind, e.mon || e.trap || "", e.floor, e.t]), rep: rec.report.map(l => l.who + l.text), doc: rec.doc.map(d => d.kind + d.text), mon: rec.monitor });
    G.Game.audit(s, []); if (s.phase === "rereport") G.Game.rereportChoice(s, false);
    G.Game.treat(s, []); G.Game.endDay(s);
  }
  all.push({ end: [s.body, s.mind, s.trust, s.funds, s.dark, s.taint, s.day] });
  return JSON.stringify(all);
})()`, ctx);
console.log(crypto.createHash("sha256").update(out).digest("hex"));
if (DUMP) console.log(out);
