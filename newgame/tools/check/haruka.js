"use strict";
// 遙の文の検査：ルミナ（ひかり）の文が遙の番に出ていないか。
// 1) 表の鍵：ひかりの表（G.TextL）にある鍵が、遙の表（G.TextH）にもあるか
// 2) 遙で何日も回し、出た文すべてに、ひかりの言葉（ルミナ・あたし・変身…）や、表の取り違え（Hero.leaks）が無いか
// 3) 遙の文の一文一文が、ひかりの文と一字一句同じになっていないか（流用・写し）
// 使い方: node newgame/tools/check/haruka.js [日数] [種]   --dup で重なった文を全部出す
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const DIR = path.join(__dirname, "..", "..", "js");
const days = Number(process.argv[2] || 12), seed = Number(process.argv[3] || 3);
const ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of require("../files")) vm.runInContext(fs.readFileSync(path.join(DIR, f + ".js"), "utf8"), ctx, { filename: f + ".js" });
// 画面の文（ui.js は DOM を使うので、表だけ取り出して読む）
const uiSrc = fs.readFileSync(path.join(DIR, "ui.js"), "utf8");
const UI = vm.runInContext("(" + uiSrc.slice(uiSrc.indexOf("const UI = {") + 11, uiSrc.indexOf("};", uiSrc.indexOf("const UI = {")) + 1) + ")", ctx);
// 再尋問の声（reint.js の中の表）
const reSrc = fs.readFileSync(path.join(DIR, "reint.js"), "utf8");
const RE = JSON.parse(reSrc.match(/const R = (\{.*?\});\n/s)[1]), REH = JSON.parse(reSrc.match(/const RH = (\{.*?\});\n/s)[1]);
const EXC = vm.runInContext("(" + reSrc.slice(reSrc.indexOf("const EXCUSE = [") + 15, reSrc.indexOf("];", reSrc.indexOf("const EXCUSE = [")) + 1) + ")", ctx);
const EXCH = vm.runInContext("(" + reSrc.slice(reSrc.indexOf("const EXCUSE_H = [") + 17, reSrc.indexOf("];", reSrc.indexOf("const EXCUSE_H = [")) + 1) + ")", ctx);
const problems = [];

/* ---------------------------------------------------------------- 1) 鍵 */
// ひかりにしか無い場面（戦闘員にされた遙を見る、など）。遙の表に無くてよい（逆に、戦闘員にされたひかりを見る台詞は遙の表にだけある）
const ONLY_HIKARI = new Set(["BUBBLE.spotHaruka", "BUBBLE.harukaFlee", "SCENE.rescueHaruka"]);
// 遙の表が、ひかりの表に重ねて足す形のもの（問う側＝監査官の言葉は共通）
const PARTIAL = new Set(["R_WHAT_A", "R_PROBE", "R_REREPORT", "R_RECALL"]);
const TL = Object.assign({}, ctx.G.TextL, { UI }), TH = ctx.G.TextH;
const isObj = v => v && typeof v === "object" && !Array.isArray(v) && !(Object.prototype.toString.call(v) === "[object RegExp]");
let keyMiss = 0;
for (const [name, base] of Object.entries(TL)) {
  const h = TH[name];
  if (h == null) { problems.push(`表が無い：${name}`); keyMiss++; continue; }
  if (PARTIAL.has(name) || !isObj(base)) continue;
  for (const k of Object.keys(base)) if (h[k] == null && !ONLY_HIKARI.has(name + "." + k)) { problems.push(`鍵が無い：${name}.${k}`); keyMiss++; }
}

/* ---------------------------------------------------------------- 2) 遙で回す */
const out = vm.runInContext(`(function(){
  const U = G.U; U.setSeed(${seed});
  const seen = [];
  const tx0 = G.Hero.tx; G.Hero.tx = t => { if (t != null) seen.push(["field", String(t)]); return tx0(t); };
  const put = (where, t) => { if (t == null) return; if (typeof t === "string") seen.push([where, t]); else if (Array.isArray(t)) t.forEach(x => put(where, x)); else if (typeof t === "object") { if (t.text != null) seen.push([where, String(t.text)]); else for (const k in t) put(where, t[k]); } };
  const s = G.Game.newSave(); s.autoDirector = true;
  G.Game.swapHero(s, "haruka"); G.Game.morning(s);
  const dgs = Object.keys(G.DUNGEONS);
  for (let d = 0; d < ${days}; d++) {
    if (s.pendingEvent === "confront") G.Game.resolveConfront(s); else s.pendingEvent = null;
    if (s.captured && s.captured.haruka) break;
    if (d % 6 === 5) { const r = G.Game.rest(s); G.Diary.writeRest(s, r); put("rest", s.diary[s.diary.length - 1].lines); G.Game.endDay && 0; s.day++; G.Game.morning(s); continue; }
    const ri = U.ri(0, s.requests.length - 1), r = s.requests[ri];
    const forge = U.chance(0.5);
    s.upgrades.swapDest = 1;
    G.Game.assign(s, ri, forge ? { level: 1, scale: 1, boss: false } : null, dgs[d % dgs.length]);
    G.Game.prep(s);
    const run = G.Game.startDive(s);
    for (;;) {
      const w = G.Game.makeFloor(run); let t = 0;
      while (!w.outcome && t < 300) { if (w.scene) { put("scene:" + w.scene.key, w.scene.lines); w.scene = null; } G.Field.step(w, 1 / 30); t += 1 / 30; }
      if (w.scene) put("scene:" + w.scene.key, w.scene.lines);
      if (!w.outcome) w.outcome = "retreat";
      if (w.outcome === "defeat") { G.Field.startNight(w); for (let b = 0; b < G.BAL.nightBeats; b++) { const beat = G.Field.nightBeat(w); put("night", beat && beat.lines); } }
      put("status", G.Field.statusList(w).map(x => x.name));
      if (G.Game.afterFloor(run, w) === "end") break;
    }
    const rec = G.Game.finishDive(s, run);
    put("report", rec.report); put("doc", rec.doc); put("monitor", rec.monitor);
    const flags = []; rec.doc.forEach((x, i) => { if (x.kind === "false" && U.chance(0.8)) flags.push(i); });
    const res = G.Game.audit(s, flags);
    if (s.phase === "rereport") {
      put("rereport", G.Report.rereport(rec, res.caught, s));
      const sess = G.Reint.begin(rec, s);
      put("reint", G.Reint.interrog(sess, rec, s));
      put("reint", G.Reint.transition());
      for (let k = 0; k < 14; k++) {
        const m = G.Reint.menu(sess, rec, s), ids = m.parts.flatMap(p => p.acts.map(a => a.id)).concat(m.specials.map(x => x.id).filter(x => x !== "done"));
        if (!ids.length) break;
        const r2 = G.Reint.act(sess, U.pick(ids), rec, s); put("reint", r2 && r2.lines);
      }
      put("reint", G.Reint.finish(sess, s, U.chance(0.5)));
      G.Game.rereportChoice(s, U.chance(0.4));
    }
    G.Game.treat(s, s.ailments.filter(() => U.chance(0.5)).map(a => a.id));
    G.Game.endDay(s);
    put("diary", (s.diary || []).slice(-1).map(p => p.lines));
  }
  put("notes", G.Diary.monsterNotes(s).map(n => n.lines.concat(n.dated)));
  return JSON.stringify({ seen, leaks: G.Hero.leaks, day: s.day });
})()`, ctx);
const R = JSON.parse(out);
for (const [k, n] of Object.entries(R.leaks)) problems.push(`遙の番に、ひかりの表を使った：${k}（${n}回）`);
// ひかりの言葉（守りの印 U+2060 の入った名前は、遙が相棒を呼んでいる所なので数えない）
const MARK = /ルミナ|ひかり|あたし|魔法少女|プラム|コンパクト|監査官さん|変身|魔力|星杖|光弾|スターライト|シャイン/;
const hits = {};
for (const [where, t] of R.seen) {
  const m = t.match(MARK); if (!m) continue;
  const key = where.replace(/:.*/, "") + "｜" + m[0] + "｜" + t.slice(0, 70);
  hits[key] = (hits[key] || 0) + 1;
}
for (const [k, n] of Object.entries(hits)) problems.push(`ひかりの言葉が出た：${k}${n > 1 ? `（${n}回）` : ""}`);

/* ---------------------------------------------------------------- 3) 一字一句同じ文 */
const strings = (v, acc = []) => {
  if (v == null) return acc;
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) v.forEach(x => strings(x, acc));
  else if (Object.prototype.toString.call(v) === "[object RegExp]") return acc;
  else if (typeof v === "function") { try { strings(v(false), acc); strings(v(true), acc); } catch (e) { /* 引数の要る場面 */ } }
  else if (typeof v === "object") for (const k in v) strings(v[k], acc);
  return acc;
};
const norm = t => t.replace(/[\s　⁠「」『』（）()…・、。！？!?♡〜ー—―…]+/g, "");
const sentences = t => /^assets\//.test(t) ? [] : String(t).split(/[。！？!?\n」]/).map(norm).filter(x => x.length >= 10);
const SC = ctx.G.Hero.SCENES;
const lum = new Set(), lumSrc = strings(TL).concat(strings([SC.waldoLost, SC.vesselMorning, SC.vesselTalk]), strings([RE.voice, RE.react, RE.combo, RE.ailAsk, RE.edge.a, RE.climax.a, RE.climax.after, RE.entry, RE.close]), EXC);
for (const t of lumSrc) for (const x of sentences(t)) lum.add(x);
const harSrc = Object.entries(TH).map(([k, v]) => [k, strings(v)]).concat([["SCENES", strings([SC.waldoLostHaruka, SC.vesselMorningHaruka, SC.vesselTalkHaruka])], ["REINT", strings(REH).concat(EXCH)]]);
const dups = new Map(), dupBy = {};
for (const [name, list] of harSrc) for (const t of list) for (const x of sentences(t)) if (lum.has(x) && !dups.has(x)) { dups.set(x, [name, t]); dupBy[name] = (dupBy[name] || 0) + 1; }
for (const [x, [name, t]] of dups) problems.push(`ひかりと同じ文：${name}｜${x}　←「${t.slice(0, 60)}」`);
if (dups.size) console.log("同じ文の出どころ", JSON.stringify(dupBy));
// 書き直す文の一覧（--list ファイル名）
const li = process.argv.indexOf("--list");
if (li > 0) {
  const want = new Map();
  for (const [name, list] of harSrc) for (const t of list) { const xs = sentences(t).filter(x => lum.has(x)); if (xs.length) want.set(t, { name, dup: xs }); }
  const files = ["haruka/field", "haruka/scene", "haruka/act", "haruka/live", "haruka/report", "haruka/diary", "hero", "reint"].map(f => [f, fs.readFileSync(path.join(DIR, f + ".js"), "utf8")]);
  const rows = [...want].map(([t, v]) => { const q = JSON.stringify(t).slice(1, -1); const f = files.find(([, src]) => src.includes(q)); return { file: f ? f[0] : null, table: v.name, text: t, dup: v.dup }; });
  fs.writeFileSync(process.argv[li + 1], JSON.stringify(rows, null, 1));
  console.log("書き直す文", rows.length, "件", JSON.stringify(rows.reduce((a, r) => (a[r.file] = (a[r.file] || 0) + 1, a), {})));
}

const kinds = {};
for (const p of problems) { const k = p.split("：")[0]; kinds[k] = (kinds[k] || 0) + 1; }
console.log(`遙で ${R.day - 1} 日・出た文 ${R.seen.length} 行／鍵の不足 ${keyMiss}／`, JSON.stringify(kinds));
const show = process.argv.includes("--dup") ? problems : problems.slice(0, 60);
if (show.length) console.log(show.join("\n") + (show.length < problems.length ? `\n……ほか ${problems.length - show.length} 件` : ""));
if (problems.length) process.exitCode = 1;
