"use strict";
// play.js と同じ PW / CHROMIUM、静的サーバー（8766）を使う。
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require(process.env.PW || "/opt/node22/lib/node_modules/playwright");
const KEY = "newgame.save.v1";

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM === "" ? {} : { executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  try {
    const page = await browser.newPage({ viewport: { width: +process.env.W || 390, height: +process.env.H || 844 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    const snapshot = () => page.evaluate(() => {
      const s = G.debug.save;
      return { day: s.day, funds: s.funds, ailments: s.ailments, diary: s.diary };
    });
    const menu = async () => {
      for (let i = 0; i < 50 && !await page.locator("#menu").isVisible(); i++) {
        if (await page.locator("#dlg").isVisible()) await page.click("#dlg");
        await page.waitForTimeout(150);
      }
      assert.ok(await page.locator("#menu").isVisible(), "office menu");
    };
    const accept = () => page.once("dialog", dialog => dialog.accept());
    const paste = async text => {
      await page.click("#save-import");
      await page.fill("#save-text", text);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "import fits viewport");
    };
    await page.goto("http://localhost:8766/newgame/index.html");
    assert.equal(await page.locator("#save-import").count(), 1, "title import without a save");
    await page.click("#new");
    await menu();
    await page.evaluate(() => {
      const s = G.debug.save;
      s.day = 12; s.greeted = 12; s.funds = 432;
      s.ailments = [{ id: "exhaustion" }];
      s.diary = [{ day: 11, weather: "fixture", lines: ["saveio fixture"] }];
    });
    const original = await snapshot();
    await page.click("#save-export");
    const text = await page.inputValue("#save-text");
    const downloadReady = page.waitForEvent("download");
    await page.click("#save-download");
    const download = await downloadReady;
    assert.equal(await fs.readFile(await download.path(), "utf8"), text, "download equals text");
    assert.equal(download.suggestedFilename(), "newgame-day-12.json");
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.copiedSave = text; } } }));
    await page.click("#save-copy");
    assert.equal(await page.evaluate(() => window.copiedSave), text, "clipboard receives full JSON");
    // コピーが許可されない端末でも、選択済みの欄からコピーできる。
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("fixture denied"); } } }));
    await page.click("#save-copy");
    await page.waitForFunction(() => document.querySelector("#save-message").textContent.includes("手動"));
    assert.equal(await page.$eval("#save-text", e => e.selectionEnd - e.selectionStart), text.length);
    await page.click("#save-close");
    // タイトルから本当に新しい記録を作り、その後ファイルで元へ戻す。
    await page.reload();
    assert.equal(await page.locator("#save-export").count(), 1, "title export with a save");
    accept(); await page.click("#new"); await menu();
    assert.equal((await snapshot()).day, 1);
    await page.click("#save-import");
    await page.setInputFiles("#save-file", { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(text) });
    await page.waitForFunction(expected => document.querySelector("#save-text").value === expected, text);
    accept(); await page.click("#save-apply");
    assert.deepEqual(await snapshot(), original, "file round trip");
    assert.equal(await page.locator("#modal.hidden").count(), 1);
    await page.reload(); await page.click("#cont"); await menu();
    assert.deepEqual(await snapshot(), original, "persisted after reload");

    const stored = await page.evaluate(key => localStorage.getItem(key), KEY);
    const different = JSON.parse(text); different.day = 20;
    await paste(JSON.stringify(different));
    page.once("dialog", dialog => dialog.dismiss());
    await page.click("#save-apply");
    assert.deepEqual(await snapshot(), original, "cancel preserves current save");
    assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), stored);
    await page.click("#save-close");

    const invalid = ["{", "null", '{"v":2}', JSON.stringify({ ...JSON.parse(text), v: 1 }),
      JSON.stringify({ ...JSON.parse(text), funds: "bad" }), JSON.stringify({ ...JSON.parse(text), diary: [null] }),
      JSON.stringify({ ...JSON.parse(text), phase: "dive" }), JSON.stringify({ ...JSON.parse(text), phase: "audit", rec: null }),
      JSON.stringify({ ...JSON.parse(text), requests: [] }), JSON.stringify({ ...JSON.parse(text), phase: "unknown" }),
      JSON.stringify({ ...JSON.parse(text), know: { fixture: "bad" } }), JSON.stringify({ ...JSON.parse(text), decks: { mist: ["toString"] } })];
    let invalidDialogs = 0;
    const dismissInvalid = dialog => { invalidDialogs++; return dialog.dismiss(); };
    page.on("dialog", dismissInvalid);
    for (const value of invalid) {
      await paste(value);
      await page.click("#save-apply");
      assert.ok((await page.textContent("#save-message")).length > 0, "invalid data explains error");
      assert.deepEqual(await snapshot(), original);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), stored);
      await page.click("#save-close");
    }
    page.off("dialog", dismissInvalid);
    assert.equal(invalidDialogs, 0, "invalid data rejected before overwrite confirmation");
    // 保存領域の障害でも既存のメモリと保存データを保持する。
    await paste(JSON.stringify(different));
    await page.evaluate(() => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error("fixture quota"); }; });
    accept(); await page.click("#save-apply");
    assert.ok((await page.textContent("#save-message")).includes("保存領域"));
    assert.deepEqual(await snapshot(), original);
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; delete window.originalSetItem; });
    await page.click("#save-close");
    // 後から追加された項目がない v2 も upgradeSave を通して受け取る。
    const legacy = JSON.parse(text);
    for (const key of ["traits", "counts", "waldo", "carry", "know", "lewd", "lv", "xp", "skills", "equip"]) delete legacy[key];
    await page.reload();
    await paste(JSON.stringify(legacy));
    accept(); await page.click("#save-apply");
    assert.deepEqual(await snapshot(), original, "text round trip");
    assert.equal(await page.evaluate(() => G.debug.save.lv), 1);
    assert.ok(await page.evaluate(() => Array.isArray(G.debug.save.equip) && !!G.debug.save.know));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
    // タイトルから書き出せる各段階の記録も、ゲーム自身が作った形で往復する。
    const phases = await page.evaluate(() => {
      const s = G.Game.newSave(); G.Game.morning(s); G.Game.assign(s, 0, null, null); G.Game.prep(s);
      const out = [{ phase: "prep", text: JSON.stringify(s) }];
      const run = G.Game.startDive(s), w = G.Game.makeFloor(run);
      w.outcome = "retreat"; G.Game.afterFloor(run, w); G.Game.finishDive(s, run);
      out.push({ phase: "report", text: JSON.stringify(s) });
      G.Game.writeDoc(s); s.phase = "audit";
      out.push({ phase: "audit", text: JSON.stringify(s) });
      G.Game.audit(s, []);
      out.push({ phase: "clinic", text: JSON.stringify(s) });
      // 夜の記録の再報告は unit を持たないため、別の有効な形として検査する。
      s.rec.audit.caught = [{ text: "saveio fixture", kind: "false", night: true }];
      s.phase = "rereport";
      out.push({ phase: "rereport", text: JSON.stringify(s) });
      return out;
    });
    for (const state of phases) {
      await page.evaluate(({ key, text }) => localStorage.setItem(key, text), { key: KEY, text: state.text });
      await page.reload();
      await page.click("#save-export");
      const exported = await page.inputValue("#save-text");
      await page.click("#save-close");
      await paste(exported); accept(); await page.click("#save-apply");
      assert.equal(await page.locator("#modal.hidden").count(), 1, state.phase + " import accepted");
      assert.equal(await page.evaluate(() => G.debug.save.phase), state.phase);
    }
    // 潜行中に保存された状態でタイトルを開いた場合も、転送操作を出さない。
    await page.evaluate(key => { const s = G.debug.save; s.phase = "dive"; localStorage.setItem(key, JSON.stringify(s)); }, KEY);
    await page.reload();
    assert.equal(await page.locator("#save-export, #save-import").count(), 0, "hidden during dive");
    assert.deepEqual(errors, []);
    console.log("saveio PASS", JSON.stringify({ restored: original, file: true, text: true, persisted: true, cancelled: true,
      invalidRejected: invalid.length, upgrade: true, clipboardFallback: true, storageFailure: true, diveHidden: true,
      phases: phases.map(s => s.phase) }));
    console.log("errors", errors);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
