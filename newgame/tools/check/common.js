"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { parseArgs } = require("node:util");

function options(defaultSeeds, defaultRuns, description) {
  const { values } = parseArgs({ options: {
    seeds: { type: "string", default: defaultSeeds },
    runs: { type: "string", default: String(defaultRuns) },
    json: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  } });
  if (values.help) {
    console.log(description + "\n--seeds 1-2,7  --runs 5  --json\n種は正の整数。runs は種ごとの回数（stuck では階数）。");
    return null;
  }
  const seeds = [];
  for (const part of values.seeds.split(",")) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!match) throw new Error("--seeds は 1-2,7 の形式で指定してください");
    const first = Number(match[1]), last = Number(match[2] || match[1]);
    if (!Number.isSafeInteger(last) || first < 1 || last < first || last - first > 10000)
      throw new Error("種の範囲が不正です");
    for (let seed = first; seed <= last; seed++) if (!seeds.includes(seed)) seeds.push(seed);
  }
  const runs = Number(values.runs);
  if (!Number.isSafeInteger(runs) || runs < 1) throw new Error("--runs は正の整数で指定してください");
  return { seeds, runs, json: values.json };
}

// 毎回独立した世界を読む。ゲームのソースや乱数には手を加えない。
function run(fn, input) {
  const context = { console, Math, Date, JSON, input };
  vm.createContext(context);
  const dir = process.env.DIR || path.join(__dirname, "..", "..", "js");
  for (const file of require("../files")) {
    vm.runInContext(fs.readFileSync(path.join(dir, file + ".js"), "utf8"), context, { filename: file + ".js" });
  }
  return JSON.parse(JSON.stringify(vm.runInContext("(" + fn.toString() + ")(input)", context)));
}

function cli(main) {
  try { main(); } catch (error) { console.error(error.stack || error); process.exitCode = 1; }
}

module.exports = { options, run, cli };
