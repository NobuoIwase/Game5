/* field/talk.js — field 内部。tools/files.js と index.html の順で読み込む。 */
(function () {
  "use strict";
  let U, learn, crave, possess, grab, defeat;
  const heroName = w => w.run.h.form === "magica" ? "ルミナ" : "ひかり";
  function say(w, key, ctx) {
    const h = w.run.h;
    const text = G.Text.bubble(key, Object.assign({ h, run: w.run }, ctx || {}));
    if (!text) return;
    h.bubble = { text, t: 2.6 };
    if (live(w)) feed(w, "line", "「" + text + "」");
  }
  /* 実況：捕まっている間・達した直後は、立ち絵の横に一行ずつ流れる（画面側が間を取って出す） */
  function live(w) { const h = w.run.h; return !!h.bound || h.pleasure >= 85 || w.t - (h.lastClimaxT ?? -99) < 4 || w.t - (h.unboundT ?? -99) < 1.2 || w.t - (h.liveT ?? -99) < 2.5; }
  function feed(w, cls, text) {
    if (!text || w.feedMute) return;
    const f = w.feed, l = f[f.length - 1];
    if (l && l.text === text) return;
    f.push({ cls, text, t: w.t, id: ++w.feedN });
    if (f.length > 60) f.shift();
  }
  const FEED_SKIP = new Set(["hear", "spot", "miss", "whiff", "tranceOut", "wake", "hypOut", "item", "shot", "hit", "kill"]);
  const plain = t => String(t).replace(/(\S) (?=\S)/g, "$1");    // 窓用の分かち書きを、流す文では詰める
  // 画面下のメッセージ窓（ドラクエ風）。gap 秒のあいだ、同じ種類は出さない
  function msg(w, key, ctx, gap) {
    if (gap && w.t - (w.msgGap[key] ?? -99) < gap) return;
    w.msgGap[key] = w.t;
    const text = G.Text.msg(key, Object.assign({ n: heroName(w) }, ctx || {}));
    if (!text) return;
    const last = w.msgs[w.msgs.length - 1];
    if (last && last.text === text && w.t - last.t < 1.2) return;
    w.msgs.push({ text, t: w.t, key });
    if (w.msgs.length > 40) w.msgs.shift();
    if (live(w) && !FEED_SKIP.has(key)) feed(w, key === "grab" ? "act grab" : "act", plain(text));
  }
  function fx(w, o) { w.fx.push(Object.assign({ t: 0, life: 0.6 }, o)); }
  // 出来上がった文をそのまま窓に出す（捕まっている間の「何をされたか」）
  function pushMsg(w, text, key) {
    if (!text) return;
    const last = w.msgs[w.msgs.length - 1];
    if (last && last.text === text && w.t - last.t < 1.2) return;
    w.msgs.push({ text, t: w.t, key: key || "act" });
    if (w.msgs.length > 40) w.msgs.shift();
    if (live(w)) feed(w, key === "after" ? "after" : "act", plain(text));
  }
  // 魔物の声（しゃべる種だけ）。同じ魔物は数秒あけ、画面に出る声は二つまで
  function monSay(w, m, key, p) {
    if (!m || !m.d || w.outcome && w.outcome !== "defeat") return;
    if (p !== undefined && !U.chance(p)) return;
    if (w.t - (m.sayT ?? -99) < 3.5 && key !== "climax") return;
    if (w.monsters.filter(o => o.bubble && o.bubble.t > 0.5 && o !== m).length >= 2) return;
    const t = G.Text.voice(m.kind, key); if (!t) return;
    m.sayT = w.t; m.bubble = { text: t, t: 2.4 };
    if (live(w)) feed(w, "mon", m.d.name + (/^[「『]/.test(t) ? t : "「" + t + "」"));
  }
  // 魔物の攻撃が当たった：身体のどこに何が起きたか
  function hitDesc(w, m, gap) {
    if (!m || !m.kind || w.t - (m.hitT ?? -99) < (gap || 4)) return;
    const r = G.Text.monHit(m.kind, { n: heroName(w) }); if (!r) return;
    m.hitT = w.t; if (w.run.h.arousal >= 50) w.run.h.liveT = w.t; pushMsg(w, r.text, "hit");
    const h = w.run.h; fx(w, { kind: "sfx", text: r.fx, x: h.x + U.rf(-0.4, 0.4), y: h.y - 1.1, life: 1.0, color: "#e8c8ff" });
  }
  function actMsg(w, key, ctx) { pushMsg(w, G.Text.actMsg(key, Object.assign({ n: heroName(w) }, ctx || {})), key); }
  function actBub(w, key) { const h = w.run.h, t = G.Text.actBubble(key); if (!t) return; h.bubble = { text: t, t: 2.2 }; if (live(w)) { const lewd = /^(moan|p:|touch)/.test(key); feed(w, "line", "「" + (lewd && h.pleasure >= 55 && U.chance(0.4) ? G.Text.live.breath(h.pleasure) + "、" : "") + (lewd ? G.Text.live.mark(t, h.pleasure) : t) + "」"); } }
  // 媚薬の靄（床に溜まって、しばらく残る）
  function addCloud(w, m, C) { w.clouds.push({ x: m.x, y: m.y, r: C.r, life: C.life, t: 0, power: C.power * (m.pow || 1), name: m.d.name, kind: m.kind }); }
  function logLine(w, text, cls) { w.log.push({ t: w.t, text, cls: cls || "" }); if (w.log.length > 60) w.log.shift(); }
  function record(w, ev) {
    const e = Object.assign({ t: +w.t.toFixed(1), floor: w.floorNo }, ev), h = w.run.h;
    // 本人の記憶に残らない：深い催眠の最中の出来事／忘却の法則（されたという事実ごと奪う）
    if (["hold", "trap", "arouse", "climax", "possess", "attach", "sniff", "salute"].includes(e.kind) && !e.hidden) {
      if ((h.hyp || 0) >= 60 || h.sleep > 0) e.hidden = true;
      else if (w.run.law === "boukyaku" && U.chance(0.35)) e.hidden = true;
    }
    w.run.events.push(e);
    // 学習と期待（相手ごとに、日をまたいで残る）
    if (e.mon) {
      if (e.kind === "kill") learn(w, e.mon, 1);
      else if (e.kind === "hold") learn(w, e.mon, 2);
      else if (e.kind === "climax") crave(w, e.mon, 3);
    }
    if (e.kind === "trap" && e.trap) learn(w, "trap:" + e.trap, 2);
    return e;
  }
  /* ---- 状態の小道具 ---- */

  Object.assign(G.F, { heroName, say, live, feed, FEED_SKIP, plain, msg, fx, pushMsg, monSay, hitDesc, actMsg, actBub, addCloud, logLine, record });
  G.F.bind.push(() => { ({ U, learn, crave, possess, grab, defeat } = G.F); });
})();
