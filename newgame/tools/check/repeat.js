"use strict";
// sim.js の既存の数え方をそのまま共有する。文字の正規化も変更しない。
function analyzeRepeat(reports) {
  const R = { reports };
  // 繰り返しの検査
  const hl = R.reports.flatMap(r => r.lines.filter(l => l.startsWith("h:")).map(l => l.slice(2)));
  const openings = R.reports.map(r => (r.lines.find(l => l.startsWith("h:")) || "").slice(2, 14));
  const uniqOpen = new Set(openings).size;
  const ell = hl.join("").split("…").length - 1, chars = hl.join("").length;
  const pos = {}; R.reports.forEach(r => pos[r.posture] = (pos[r.posture] || 0) + 1);
  // 8文字の並びが、何割の報告に出てくるか
  const grams = new Map();
  for (const r of R.reports) { const set = new Set(); for (const l of r.lines) { const t = l.slice(2).replace(/\\s/g, ""); for (let i = 0; i + 8 <= t.length; i++) set.add(t.slice(i, i + 8)); } for (const g of set) grams.set(g, (grams.get(g) || 0) + 1); }
  const common = [...grams].filter(([g, c]) => c >= R.reports.length * 0.5).length;
  const same = {}; for (const l of hl) same[l] = (same[l] || 0) + 1;
  const dup = Object.values(same).filter(c => c > 1).reduce((a, c) => a + c, 0);
  return { reports: reports.length, hl, uniqOpen, ell, chars, pos, same, dup, common,
    commonGrams: [...grams].filter(([g, c]) => c >= reports.length * 0.5) };
}
function printRepeat(result, details = false) {
  const { reports, hl, uniqOpen, ell, chars, pos, same, dup, common, commonGrams } = result;
  console.log("報告", reports, "件 / ひかりの台詞", hl.length, "行");
  console.log("書き出しの種類", uniqOpen + "/" + reports, "／ 姿勢", pos);
  console.log("…の密度", (ell / chars * 100).toFixed(1) + "/100字", "／ 一字一句同じ台詞の割合", (dup / hl.length * 100).toFixed(0) + "%", "／ 半分以上の報告に出る8字の並び", common);
  if (details) {
    console.log(Object.entries(same).filter(([k, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, c]) => c + "× " + k).join("\n"));
    console.log("共通8字", JSON.stringify(commonGrams));
  }
}
if (require.main === module) require("./common").cli(() => {
  const config = require("./common").options("7", 30, "報告の重複。--runs は日数。");
  if (!config) return;
  const results = config.seeds.map(seed => ({ seed, ...analyzeRepeat(require("../sim").simulate(config.runs, seed).reports) }));
  if (config.json) console.log(JSON.stringify(results));
  else for (const result of results) { console.log("seed", result.seed); printRepeat(result, true); }
});
module.exports = { analyzeRepeat, printRepeat };
