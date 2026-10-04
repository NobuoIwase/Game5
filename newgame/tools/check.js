"use strict";
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { analyzeRepeat, printRepeat } = require("./check/repeat");
const start = performance.now();
let failed = false;
function command(file, args, json = false) {
  const begin = performance.now();
  console.log("$ node newgame/tools/" + file + " " + args.join(" "));
  const result = spawnSync(process.execPath, [path.join(__dirname, file), ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (!json && result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) {
    console.error(result.error || "exit " + result.status);
    failed = true;
    return null;
  }
  console.log("elapsed", ((performance.now() - begin) / 1000).toFixed(2) + "s");
  return result.stdout;
}
// 日常の速い検査。40潜行×2種の不変性確認は別途 fingerprint.js で行う。
command("fingerprint.js", ["10", "1"]);
const simulation = command("sim.js", ["10", "7", "--json"], true);
if (simulation !== null) {
  try {
    const result = JSON.parse(simulation);
    if (result.reports.length !== 10) throw new Error("sim did not complete 10 days");
    console.log("sim 10 days", JSON.stringify(result.outcomes));
    printRepeat(analyzeRepeat(result.reports));
  } catch (error) { console.error(error); failed = true; }
}
command("check/stuck.js", ["--seeds", "1", "--runs", "1"]);
// 遙の文：ひかりの表の取り違え・ひかりの言葉・ひかりと同じ文が無いか（遙で何日か回す）
command("check/haruka.js", ["8", "3"]);
// 二人で潜る：救出・二人とも倒れた時の場面と一夜・二人ぶんの報告
command("check/pair.js", []);
console.log(failed ? "check FAIL" : "check PASS", "elapsed", ((performance.now() - start) / 1000).toFixed(2) + "s");
if (failed) process.exitCode = 1;
