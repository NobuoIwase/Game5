/* ui.js — 画面。セーブは localStorage（使えない環境でも遊べるように、失敗は無視する） */
(function () {
  "use strict";
  const U = G.U, GM = G.Game;
  const app = document.getElementById("app");
  const KEY = "newgame.save.v1";
  let S = null;              // セーブ
  let dive = null;           // 潜行中の状態 { run, w, cam, ... }

  /* ================================================================ 小道具 */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tag = t => `<span class="tag t-${t}">${t}</span>`;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 保存できない環境 */ } }
  function load() { try { const j = localStorage.getItem(KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } }
  function toast(t) { const el = document.getElementById("toast"); el.textContent = t; el.classList.remove("hidden"); clearTimeout(toast.tm); toast.tm = setTimeout(() => el.classList.add("hidden"), 1800); }
  function modal(html, bind) {
    const m = document.getElementById("modal"), box = m.querySelector(".modal-box");
    box.innerHTML = html; m.classList.remove("hidden");
    if (bind) bind(box);
  }
  function closeModal() { document.getElementById("modal").classList.add("hidden"); }
  function on(sel, ev, fn, root) { (root || app).querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn)); }
  function cardName(c) { const ci = G.Field.cardInfo(c); return ci.d ? ci.d.name : c; }
  function cardArt(c) {
    const ci = G.Field.cardInfo(c);
    if (ci.trap) return `<div class="ic" style="color:${G.Render.TYPE_COLOR[ci.d.type]}">${({ bell: "鈴", mirror: "鏡", decoy: "燭", glue: "粘", vent: "香", urn: "甕", vine: "蔦", rope: "縄", shrine: "祠", basin: "水" })[ci.id] || "罠"}</div>`;
    return `<img src="assets/monsters/${ci.d.art}" alt="">`;
  }
  const TIER_NAME = ["抵抗", "綻び", "心は拒み、体は応える", "待ってしまう"];
  const TAINT_NAME = ["澄んでいる", "ざわついている", "澱みはじめた", "倒錯が日常になった", "すっかり澱んだ"];
  const RECEPTION = [
    ["おはようございます、監査官。今日もひかりさんの依頼、お願いしますね", "ひかりさん、今朝も一番乗りでしたよ。元気ですよね、あの子"],
    ["……最近、酒場で妙な噂が回ってるんです。報告書の写しが、どこからか漏れてるとか", "監査記録の閲覧、なぜか希望者が増えてるんですよね"],
    ["監査記録の閲覧希望、今週もう五人目です。……みんな、何を読みに来てるんでしょうね", "掲示板の依頼、最近は妙に『湿った』ものが多くて"],
    ["新しい規則で、報告の場に立会人が付けられるようになりました。……希望者、多いですよ", "ひかりさんの記録、写しが三冊目になりました"],
    ["ここも、ずいぶん変わりましたね。……わたしも、慣れてしまいました", "今日も、みんな報告を楽しみにしてますよ。……監査官も、でしょう？"],
  ];

  function topbar() {
    const tier = G.tier(S.body, S.mind);
    return `<div class="topbar"><span><b>${S.day}</b>日目</span><span>ギルド資金 <b>◈${S.funds}</b></span><span>澱晶 <b>${S.dark}</b></span>
      <span>ギルドの空気 <b>${TAINT_NAME[GM.taintStage(S)]}</b></span><span>ひかり <b>${TIER_NAME[tier]}</b></span><span>信頼 <b>${Math.round(S.trust)}</b></span></div>`;
  }
  function meter(label, v, max, color) {
    const p = U.clamp(v / max * 100, 0, 100);
    return `<div class="meter"><span>${label}</span><div class="bar"><i style="width:${p}%;background:${color}"></i></div><span>${Math.round(v)}</span></div>`;
  }

  /* ================================================================ タイトル */
  function title() {
    const has = !!load();
    app.innerHTML = `<div class="panel" style="text-align:center;margin-top:10vh">
      <h1>監査官と魔法少女</h1>
      <p class="sub">成人向けの内容を含みます。登場人物はすべて18歳以上です。</p>
      <div class="row" style="justify-content:center;margin-top:14px">
        ${has ? `<button class="primary" id="cont">続きから</button>` : ""}<button id="new">${has ? "最初から" : "はじめる"}</button>
      </div>
      <p class="sub" style="margin-top:16px">あなたはギルドの監査官。そして裏では、ダンジョンを操る側の手先。<br>依頼を割り当て、依頼書を書き換え、魔物と罠を差し向ける。帰ってきた彼女の報告を聞き、書類の嘘を暴く。</p>
    </div>`;
    on("#cont", "click", () => { S = load(); route(); });
    on("#new", "click", () => { if (has && !confirm("今のセーブを消して最初から始めますか？")) return; S = GM.newSave(); GM.morning(S); save(); route(); });
  }

  function route() {
    if (!S) return title();
    const p = S.phase;
    if (p === "guild") return guild();
    if (p === "prep") return prepScreen();
    if (p === "dive") { S.phase = "prep"; return prepScreen(); }     // 潜行中に閉じた：準備からやり直す
    if (p === "report") return reportScreen();
    if (p === "audit") return auditScreen();
    if (p === "rereport") return rereportScreen();
    if (p === "clinic") return clinicScreen();
    guild();
  }

  /* ================================================================ ギルド（朝） */
  function guild() {
    if (S.pendingEvent === "confront") return confrontScreen();
    if (S.pendingEvent === "silent") { S.pendingEvent = null; save(); modal(`<p>ひかりは何か言いたげに、依頼書と監査官の顔を見比べた。</p><p>「……ううん。なんでもないです」</p><p class="sub">疑いはある。けれど、もう口に出す気はないらしい。</p><div class="row"><button class="primary" id="ok">そうか</button></div>`, b => b.querySelector("#ok").onclick = closeModal); }
    const tier = G.tier(S.body, S.mind);
    const st = GM.taintStage(S);
    const ail = S.ailments.map(a => `<span class="tag">${GM.AILMENTS[a.id].name}</span>`).join("") || `<span class="dim">なし</span>`;
    app.innerHTML = topbar() + `
      <div class="panel guild-face"><img src="assets/hikari/hikari_civilian_front_1.png" alt="">
        <div><div class="sub">受付嬢</div><div>「${esc(U.pick(RECEPTION[st]))}」</div></div></div>
      <div class="panel">
        <b>星野 ひかり</b> <span class="sub">大学生。本業は魔法少女ルミナ（正体を知るのは監査官だけ）</span>
        ${meter("肉体", S.body, 100, "#ff7fb0")}${meter("精神", S.mind, 100, "#b48cff")}${meter("信頼", S.trust, 100, "#8fe0a0")}${meter("疲労", S.fatigue, 100, "#f2d27a")}
        <div class="sub">堕ち：${TIER_NAME[tier]} ／ 状態異常：${ail}</div>
      </div>
      <div class="grid2">
        <button class="primary" id="req">依頼を割り当てる</button>
        <button id="deck">デッキを組む</button>
        <button id="shop">裏の取引（澱晶 ${S.dark}）</button>
        <button id="hist">これまでの記録</button>
      </div>
      <div class="panel sub">オート指揮：<button id="auto">${S.autoDirector ? "入" : "切"}</button>　潜行中に魔物や罠を自動で差し向けます（自分で置くこともできます）</div>
      <p class="dim" style="font-size:12px">ひかりの弱点：素で<b>惑</b>に強い。変身中は<b>絡</b>にも強い。変身が解けると一気に崩れる。</p>`;
    on("#req", "click", requestScreen);
    on("#deck", "click", deckScreen);
    on("#shop", "click", shopScreen);
    on("#hist", "click", historyScreen);
    on("#auto", "click", () => { S.autoDirector = !S.autoDirector; save(); guild(); });
  }

  function confrontScreen() {
    app.innerHTML = topbar() + `<div class="panel">
      <p>受付の奥、人のいない書庫で、ひかりが待っていた。</p>
      <p>「……監査官さん。最近の依頼書、おかしくないですか。書いてあることと、中身が、ずっと違う」</p>
      <p>「偶然、じゃないですよね。……あたし、そこまで鈍くないです」</p>
      <p class="sub">確信されている。裏の力を使って、彼女を「矯正」するしかない。<br>澱晶はすべて失うが、ひかりの信頼は最大に戻り、違和感は消える。</p>
      <button class="danger" id="fix">矯正する（澱晶 ${S.dark} をすべて使う）</button></div>`;
    on("#fix", "click", () => {
      GM.resolveConfront(S); save();
      modal(`<p>淡い光が書庫を満たし、やがて消えた。</p><p>「……あれ？ あたし、何の話、してましたっけ」</p><p>「ごめんなさい、疲れてるのかな。……明日の依頼、よろしくお願いしますね、監査官さん」</p><div class="row"><button class="primary" id="ok">ギルドへ</button></div>`, b => b.querySelector("#ok").onclick = () => { closeModal(); guild(); });
    });
  }

  /* ================================================================ 依頼 */
  function requestScreen() {
    let sel = 0, stated = null, dest = null;
    const draw = () => {
      const r = S.requests[sel];
      const dests = Object.keys(G.DUNGEONS);
      const st = stated || r.stated, de = dest || r.dungeon;
      const real = G.DUNGEONS[de].type, P = G.PREP[st];
      const forged = st !== real || de !== r.dungeon;
      app.innerHTML = topbar() + `<h1>依頼を割り当てる</h1>
        <p class="sub">ひかりの希望する依頼の中から選ぶ。依頼書の文面（系統）は書き換えられる。${S.upgrades.swapDest ? "行き先のすり替えもできる。" : ""}</p>
        <div class="grid2">${S.requests.map((q, i) => `<div class="card ${i === sel ? "sel" : ""}" data-i="${i}">
          <b>${esc(q.title)}</b><div class="sub">${G.DUNGEONS[q.dungeon].name} ${tag(q.stated)}　報酬 ◈${q.reward}</div></div>`).join("")}</div>
        <div class="panel">
          <div>依頼書に書く系統：${G.TYPES.map(t => `<button class="st" data-t="${t}" style="${t === st ? "border-color:var(--pink)" : ""}">${t}</button>`).join(" ")}</div>
          ${S.upgrades.swapDest ? `<div style="margin-top:8px">実際の行き先：${dests.map(k => `<button class="de" data-k="${k}" style="${k === de ? "border-color:var(--pink)" : ""}">${G.DUNGEONS[k].name}</button>`).join(" ")}</div>` : ""}
          <p style="margin-top:10px">依頼書：<b>${esc(r.title)}</b>（${tag(st)}）　実際：<b>${G.DUNGEONS[de].name}</b>（${tag(real)}）${forged ? ` <span class="tag" style="color:var(--red)">偽装</span>` : ""}</p>
          <p class="sub">ひかりは依頼書を見て<b>${P.name}</b>を用意してくる。${esc(P.note)}</p>
          ${forged ? `<p class="sub">偽装は、違和感として少しずつ積もる。確信されると矯正が必要になる（今の違和感 ${Math.round(S.suspicion)}/100）。</p>` : ""}
          <div class="row"><button class="primary" id="go">この内容で渡す</button><button id="back">戻る</button></div>
        </div>`;
      on(".card", "click", e => { sel = +e.currentTarget.dataset.i; stated = null; dest = null; draw(); });
      on(".st", "click", e => { stated = e.currentTarget.dataset.t; draw(); });
      on(".de", "click", e => { dest = e.currentTarget.dataset.k; draw(); });
      on("#back", "click", guild);
      on("#go", "click", () => { GM.assign(S, sel, st, de); GM.prep(S); save(); prepScreen(); });
    };
    draw();
  }

  function prepScreen() {
    const p = S.pick;
    if (!p || !p.kit) { S.phase = "guild"; return guild(); }
    const P = G.PREP[p.stated], deck = GM.deckFor(S, p.dungeon);
    app.innerHTML = topbar() + `<h1>出立前</h1>
      <div class="panel">
        <p>依頼書を読み込んだひかりは、市場に寄って支度を整えた。</p>
        <p>「${esc(p.stated)}の迷宮なら、これで大丈夫。……${esc(P.name)}、よし」</p>
        <p class="sub">持ち物：${P.name}、星の雫×${p.kit.star}、治癒の軟膏×${p.kit.salve}、気付け薬×${p.kit.smelling}</p>
        <p class="sub">行き先：${G.DUNGEONS[p.dungeon].name}（${tag(G.DUNGEONS[p.dungeon].type)}）　全${G.DUNGEONS[p.dungeon].floors}階</p>
      </div>
      <div class="panel"><b>このダンジョンのデッキ</b><div class="cards" style="margin-top:6px">${deck.map(c => `<div class="cbtn">${cardArt(c)}${esc(cardName(c))}<div class="cost">${G.Field.cardInfo(c).d.cost}</div></div>`).join("")}</div>
        <p class="sub">潜行中、ひかりに見られていない所へ置ける。階ごとにコストの上限、同時に出せる数、カードごとの待ち時間がある。</p></div>
      <div class="row"><button class="primary" id="go">潜行を始める</button><button id="deck">デッキを組む</button></div>`;
    on("#go", "click", startDive);
    on("#deck", "click", () => deckScreen(p.dungeon, prepScreen));
  }

  /* ================================================================ 潜行 */
  function startDive() {
    const run = GM.startDive(S);
    save();
    dive = { run, w: null, cam: { x: 0, y: 0, scale: 40 }, card: null, hover: null, speed: S.speed || 1, whole: false, last: 0, acc: 0, trans: 0, raf: 0 };
    newFloor();
    app.innerHTML = `<div class="dive">
      <div class="topbar" id="dtop"></div>
      <div class="stage" id="stage"><canvas id="cv"></canvas><div class="overlay hidden" id="ov"></div></div>
      <div class="hud" id="hud"></div>
      <div class="row">
        <button id="spd">×${dive.speed}</button><button id="pause">一時停止</button><button id="auto">オート ${S.autoDirector ? "入" : "切"}</button>
        <button id="whole">全体</button><button id="recall" class="danger">帰還を勧告</button>
      </div>
      <div class="cards" id="cards"></div>
      <div class="log" id="log"></div></div>`;
    const cv = document.getElementById("cv");
    const resize = () => { const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr; };
    resize(); window.onresize = resize;
    on("#spd", "click", () => { dive.speed = dive.speed >= 3 ? 1 : dive.speed + 1; S.speed = dive.speed; document.getElementById("spd").textContent = "×" + dive.speed; });
    on("#pause", "click", e => { dive.paused = !dive.paused; e.currentTarget.textContent = dive.paused ? "再開" : "一時停止"; });
    on("#auto", "click", e => { S.autoDirector = !S.autoDirector; dive.run.autoDirector = S.autoDirector; dive.w.dir.auto = S.autoDirector; e.currentTarget.textContent = "オート " + (S.autoDirector ? "入" : "切"); });
    on("#whole", "click", () => { dive.whole = !dive.whole; });
    on("#recall", "click", () => { if (dive.run.recall) return; dive.run.recall = true; toast("帰還を勧告した"); });
    const toWorld = ev => {
      const r = cv.getBoundingClientRect(), dpr = cv.width / r.width;
      const px = (ev.clientX - r.left) * dpr, py = (ev.clientY - r.top) * dpr;
      return { x: (px - cv.width / 2) / dive.cam.scale + dive.cam.x, y: (py - cv.height / 2) / dive.cam.scale + dive.cam.y };
    };
    cv.addEventListener("pointermove", ev => { dive.hover = toWorld(ev); });
    cv.addEventListener("pointerdown", ev => {
      dive.hover = toWorld(ev);
      if (!dive.card) return;
      const why = G.Field.place(dive.w, dive.card, dive.hover.x, dive.hover.y, !!dive.night);
      if (why === "ok") { if (!dive.night) dive.card = null; drawCards(); }
      else toast(({ wall: "床にしか置けない", cost: "コストが足りない", ct: "まだ待ち時間がある", live: "同時に出せる数を超える", near: "ひかりに近すぎる", seen: "ひかりに見られている", stairs: "階段の上には置けない" })[why] || "置けない");
    });
    drawCards();
    dive.last = performance.now();
    dive.raf = requestAnimationFrame(loop);
  }

  function newFloor() {
    dive.w = GM.makeFloor(dive.run);
    dive.w.dir.auto = S.autoDirector;
    dive.cam.x = dive.w.run.h.x; dive.cam.y = dive.w.run.h.y;
    dive.trans = 1.1;
    dive.logN = 0;
  }

  function loop(now) {
    if (!dive) return;
    const dt = Math.min(0.1, (now - dive.last) / 1000); dive.last = now;
    const w = dive.w;
    if (dive.trans > 0) dive.trans -= dt;
    else if (!dive.paused && !dive.night && !w.scene) {
      dive.acc += dt * dive.speed;
      while (dive.acc > 1 / 60) { G.Field.step(w, 1 / 60); dive.acc -= 1 / 60; if (w.scene || w.outcome) break; }
    }
    if (w.scene && !dive.sceneOpen) openScene(w);
    // カメラ
    const cv = document.getElementById("cv");
    if (!cv) return;
    if (dive.whole) { dive.cam.scale = Math.min(cv.width / w.map.W, cv.height / w.map.H); dive.cam.x = w.map.W / 2; dive.cam.y = w.map.H / 2; }
    else {
      dive.cam.scale = Math.max(26, Math.min(cv.width / 12, cv.height / 9));
      dive.cam.x += (w.run.h.x - dive.cam.x) * Math.min(1, dt * 4); dive.cam.y += (w.run.h.y - dive.cam.y) * Math.min(1, dt * 4);
    }
    G.Render.draw(cv.getContext("2d"), w, dive.cam, { hover: dive.hover, card: dive.card, night: !!dive.night });
    const ov = document.getElementById("ov");
    if (dive.trans > 0) { ov.classList.remove("hidden"); ov.textContent = `${G.DUNGEONS[dive.run.dungeon].name}　${w.floorNo}階`; }
    else ov.classList.add("hidden");
    drawHud();
    if (w.outcome && !w.scene && !dive.sceneOpen && !dive.night && !dive.ending) endFloor();
    if (!dive || dive.ending) return;          // 潜行が終わった
    dive.raf = requestAnimationFrame(loop);
  }

  function drawHud() {
    const w = dive.w, h = w.run.h;
    const top = document.getElementById("dtop");
    if (top) top.innerHTML = `<span><b>${w.floorNo}</b>/${w.dg.floors}階</span><span>${esc(w.dg.name)} ${tag(w.dg.type)}</span><span>依頼書 ${tag(dive.run.stated)}</span>
      <span>${h.form === "magica" ? "<b style='color:var(--pink)'>ルミナ</b>" : "<b>素の姿</b>"}</span><span>コスト <b>${w.dir.spent}/${w.dir.cap}</b></span><span>呼んだ数 <b>${w.dir.live}/${dive.run.maxLive}</b></span>`;
    const hud = document.getElementById("hud");
    if (hud && (!dive.hudT || performance.now() - dive.hudT > 120)) {
      dive.hudT = performance.now();
      hud.innerHTML = meter("体力", h.hp, 100, "#8fe0a0") + meter("MP", h.mp, 60, "#6fc2ff") + meter("魔力", h.magic, 100, "#ffd6f0") +
        meter("気力", h.will, 100, "#f2d27a") + meter("発情", h.arousal, 100, "#ff7fb0") + meter("快感", Math.min(100, h.pleasure), 100, "#ff4f9a") +
        `<div class="sub">絶頂 ${h.climax}　星の雫 ${h.kit.star}・軟膏 ${h.kit.salve}・気付け ${h.kit.smelling}${h.bound ? "　<b style='color:var(--pink)'>拘束中</b>" : ""}${h.trance > 0 ? "　<b style='color:var(--violet)'>惑い</b>" : ""}</div>`;
      drawCards(true);
    }
    const log = document.getElementById("log");
    if (log && w.log.length !== dive.logN) {
      dive.logN = w.log.length;
      log.innerHTML = w.log.slice(-12).map(l => `<div class="${l.cls}">${w.floorNo}階 ${esc(l.text)}</div>`).join("");
      log.scrollTop = log.scrollHeight;
    }
  }

  function drawCards(soft) {
    const box = document.getElementById("cards");
    if (!box || !dive) return;
    const w = dive.w, night = !!dive.night;
    const html = dive.run.deck.map(c => {
      const ci = G.Field.cardInfo(c), ct = w ? (w.dir.ct[c] || 0) : 0;
      const afford = night ? (w.night.spent + ci.d.cost <= G.BAL.nightBudget) : (w.dir.spent + ci.d.cost <= w.dir.cap);
      return `<button class="cbtn ${dive.card === c ? "sel" : ""}" data-c="${c}" ${afford ? "" : "disabled"}>${cardArt(c)}${esc(ci.d.name)}<div class="cost">コスト${ci.d.cost} ${tag(ci.d.type)}</div>${ct > 0 && !night ? `<div class="ct">${Math.ceil(ct)}</div>` : ""}</button>`;
    }).join("");
    if (soft && box.dataset.h === html) return;
    box.dataset.h = html; box.innerHTML = html;
    box.querySelectorAll(".cbtn").forEach(b => b.addEventListener("click", () => { dive.card = dive.card === b.dataset.c ? null : b.dataset.c; box.dataset.h = ""; drawCards(); }));
  }

  function openScene(w) {
    dive.sceneOpen = true;
    const sc = w.scene;
    modal(`${sc.lines.map(l => `<p>${esc(l)}</p>`).join("")}<div class="row"><button class="primary" id="ok">続ける</button></div>`, b => b.querySelector("#ok").onclick = () => { closeModal(); w.scene = null; dive.sceneOpen = false; });
  }

  function endFloor() {
    const w = dive.w, r = GM.afterFloor(dive.run, w);
    if (r === "next") { newFloor(); drawCards(); return; }
    if (w.outcome === "defeat") return startNight();
    finishDive();
  }

  // 観測フェーズ：救出までの一晩。見ながら、呼び足すこともできる
  function startNight() {
    dive.night = true; dive.card = null;
    G.Field.startNight(dive.w);
    dive.whole = false;
    const log = document.getElementById("log");
    const btns = document.querySelector(".dive .row");
    btns.innerHTML = `<button class="primary" id="nx">次の場面</button><button id="skip">朝まで飛ばす</button><span class="sub">夜のコスト ${G.BAL.nightBudget}。カードを選んで地図を押すと、呼び足せる</span>`;
    log.style.maxHeight = "220px";
    log.innerHTML = `<div class="heavy">ひかりは動けない。救出は朝になる。</div>`;
    drawCards();
    const next = () => {
      if (dive.w.night.beat >= G.BAL.nightBeats) return finishDive();
      const b = G.Field.nightBeat(dive.w);
      log.innerHTML += b.lines.map(l => `<div>${esc(l)}</div>`).join("") + "<hr style='border-color:#2a2433'>";
      log.scrollTop = log.scrollHeight;
      drawCards();
      if (dive.w.night.beat >= G.BAL.nightBeats) document.getElementById("nx").textContent = "朝になった";
    };
    on("#nx", "click", next);
    on("#skip", "click", () => { while (dive.w.night.beat < G.BAL.nightBeats) G.Field.nightBeat(dive.w); finishDive(); });
  }

  function finishDive() {
    if (!dive || dive.ending) return;
    dive.ending = true;
    cancelAnimationFrame(dive.raf);
    window.onresize = null;
    GM.finishDive(S, dive.run);
    dive = null;
    save();
    reportScreen();
  }

  /* ================================================================ 報告 */
  function reportScreen() {
    const rec = S.rec;
    if (!rec) { S.phase = "guild"; return guild(); }
    let shown = 0;
    const lines = rec.report;
    const who = { h: "ひかり", a: "監査官", n: "" };
    const draw = () => {
      app.innerHTML = topbar() + `<h1>口頭報告</h1>
        <p class="sub">${esc(rec.dungeonName)}・${rec.floorReached}階まで・${({ cleared: "踏破", retreat: "撤退", ordered: "勧告で帰還", defeat: "敗北→翌日救出" })[rec.outcome]}　今日の話し方：${esc(rec.postureName)}</p>
        <div id="talk">${lines.slice(0, shown).map((l, i) => `<div class="speech ${l.who}">${l.who !== "n" ? `<span class="who">${who[l.who]}</span>` : ""}${esc(l.text)}
          ${l.probe && !l.probed ? `<br><button class="probe" data-i="${i}">追及する</button>` : ""}${l.probed ? `<div class="speech a" style="margin-top:6px"><span class="who">監査官</span>${esc(l.probe.q)}</div><div class="speech h"><span class="who">ひかり</span>${esc(l.probe.a)}</div>` : ""}</div>`).join("")}</div>
        <div class="row" style="margin-top:10px">${shown < lines.length ? `<button class="primary" id="nx">次へ</button><button id="all">全部表示</button>` : `<button class="primary" id="audit">書類監査へ</button>`}</div>`;
      on("#nx", "click", () => { shown++; draw(); window.scrollTo(0, document.body.scrollHeight); });
      on("#all", "click", () => { shown = lines.length; draw(); });
      on(".probe", "click", e => { lines[+e.currentTarget.dataset.i].probed = true; draw(); });
      on("#audit", "click", () => { S.phase = "audit"; save(); auditScreen(); });
    };
    shown = 1; draw();
  }

  /* ================================================================ 書類監査 */
  function auditScreen() {
    const rec = S.rec, flags = new Set();
    const draw = () => {
      app.innerHTML = topbar() + `<h1>書類監査</h1>
        <p class="sub">ひかりが提出した報告書。嘘だと思う行に印を付けて確定する（一日一度きり）。<br>本人が覚えていないだけの行（「特に何もなし」）は嘘ではない。嘘と欠落を見分けること。</p>
        <div class="panel">${rec.doc.map((d, i) => `<div class="doc-line ${flags.has(i) ? "flag" : ""} ${d.fixed ? "fixed" : ""}" data-i="${i}"><span class="mark">${flags.has(i) ? "✕" : ""}</span><span>${esc(d.text)}</span></div>`).join("")}</div>
        <details class="panel"><summary>水晶の監視記録を見る</summary><div class="monitor">${rec.monitor.map(esc).join("<br>") || "（記録なし）"}</div></details>
        <div class="row"><button class="primary" id="ok">この印で確定</button><button id="back">報告を読み返す</button></div>`;
      on(".doc-line", "click", e => { const i = +e.currentTarget.dataset.i; if (rec.doc[i].fixed) return; flags.has(i) ? flags.delete(i) : flags.add(i); draw(); });
      on("#back", "click", () => { S.phase = "report"; reportScreen(); });
      on("#ok", "click", () => {
        const res = GM.audit(S, [...flags]); save();
        const msg = `<p>摘発 <b>${res.caught.length}</b> 件 ／ 誤った指摘 <b>${res.wrong.length}</b> 件 ／ 見逃し <b>${res.missed.length}</b> 件</p>
          ${res.wrong.some(d => d.kind === "missing") ? `<p class="sub">「特に何もなし」の行は、本人が覚えていないだけだった。</p>` : ""}
          ${res.missed.length ? `<p class="sub">見逃した嘘は、隠し通せた経験として、ひかりの心に積もる。</p>` : ""}
          <div class="row"><button class="primary" id="ok2">${res.caught.length ? "再報告を聞く" : "処置へ"}</button></div>`;
        modal(msg, b => b.querySelector("#ok2").onclick = () => { closeModal(); route(); });
      });
    };
    draw();
  }

  function rereportScreen() {
    const rec = S.rec, res = rec.audit;
    const lines = G.Report.rereport(rec, res.caught, S);
    app.innerHTML = topbar() + `<h1>非公開の再報告</h1>
      <div>${lines.map(l => `<div class="speech h"><span class="who">ひかり</span>${esc(l.text)}</div>`).join("")}</div>
      <div class="panel"><p class="sub">訂正報告書を受け取った。このあと——</p>
        <div class="row"><button class="primary" id="rec">記録だけ取って帰す</button><button class="danger" id="lewd">踏み込んで確認する</button></div>
        <p class="sub">踏み込んだ確認は、信頼を下げる代わりに、澱晶とギルドの澱みを得る。</p></div>`;
    on("#rec", "click", () => { GM.rereportChoice(S, false); save(); clinicScreen(); });
    on("#lewd", "click", () => {
      const R = G.Report.REREPORT;
      modal(`<p>${esc(U.pick(R.lewdAsk))}</p><p>${esc(U.pick(R.lewdLine))}</p><p class="sub">確認は、長く続いた。</p><div class="row"><button class="primary" id="ok">終える</button></div>`,
        b => b.querySelector("#ok").onclick = () => { closeModal(); GM.rereportChoice(S, true); save(); clinicScreen(); });
    });
  }

  /* ================================================================ 処置 */
  function clinicScreen() {
    S.phase = "clinic"; save();
    const sel = new Set(S.ailments.map(a => a.id));
    const draw = () => {
      const fee = [...sel].reduce((a, id) => a + GM.AILMENTS[id].fee, 0);
      const g = S.rec ? S.rec.gain : null;
      app.innerHTML = topbar() + `<h1>処置と一日の終わり</h1>
        ${g ? `<div class="panel sub">今日の変化：肉体 +${g.body}　精神 +${g.mind}　ギルド資金 ${g.funds >= 0 ? "+" : ""}${g.funds}　澱晶 +${g.dark}${S.rec.forged ? `　違和感 +${g.sus}` : ""}</div>` : ""}
        <div class="panel">${S.ailments.length ? S.ailments.map(a => { const A = GM.AILMENTS[a.id]; return `<label class="doc-line"><input type="checkbox" data-id="${a.id}" ${sel.has(a.id) ? "checked" : ""}> <span><b>${A.name}</b>　◈${A.fee}<br><span class="sub">${A.note}</span></span></label>`; }).join("") : `<p class="sub">状態異常はない。</p>`}
          <p class="sub">処置しないで残すと、次の潜行に響き、ギルドの空気も少し澱む。</p></div>
        <div class="row"><button class="primary" id="ok">${sel.size ? `処置して（◈${fee}）` : "このまま"}翌日へ</button></div>`;
      on("input[type=checkbox]", "change", e => { e.target.checked ? sel.add(e.target.dataset.id) : sel.delete(e.target.dataset.id); draw(); });
      on("#ok", "click", () => {
        if (fee > S.funds) return toast("ギルド資金が足りない");
        GM.treat(S, [...sel]); GM.endDay(S); save(); guild();
      });
    };
    draw();
  }

  /* ================================================================ デッキ・裏の取引・記録 */
  function deckScreen(dk, back) {
    let cur = typeof dk === "string" ? dk : Object.keys(G.DUNGEONS)[0];
    const done = typeof back === "function" ? back : guild;
    const draw = () => {
      const dg = G.DUNGEONS[cur], n = G.BAL.freeSlots + S.upgrades.freeSlot;
      const mine = (S.decks[cur] || []).slice(0, n);
      const cands = GM.freeCandidates(cur);
      app.innerHTML = topbar() + `<h1>デッキ</h1>
        <div class="row">${Object.keys(G.DUNGEONS).map(k => `<button class="dg" data-k="${k}" style="${k === cur ? "border-color:var(--pink)" : ""}">${G.DUNGEONS[k].name}</button>`).join("")}</div>
        <div class="panel"><b>${dg.name}</b> ${tag(dg.type)} <span class="sub">${esc(dg.desc)}</span>
          <h2>固定枠</h2><div class="cards">${dg.fixed.map(c => `<div class="cbtn">${cardArt(c)}${esc(cardName(c))}<div class="cost">${G.Field.cardInfo(c).d.cost}</div></div>`).join("")}</div>
          <h2>自由枠 ${mine.length}/${n}</h2><p class="sub">押して入れる／外す。削（魔力を削る）はどのダンジョンでも使える。</p>
          <div class="cards" style="flex-wrap:wrap">${cands.map(c => { const d = G.Field.cardInfo(c).d; return `<button class="cbtn fr ${mine.includes(c) ? "sel" : ""}" data-c="${c}">${cardArt(c)}${esc(d.name)}<div class="cost">${d.cost} ${tag(d.type)}</div></button>`; }).join("")}</div>
          <div class="sub" id="desc"></div></div>
        <button class="primary" id="done">決定</button>`;
      on(".dg", "click", e => { cur = e.currentTarget.dataset.k; draw(); });
      on(".fr", "click", e => {
        const c = e.currentTarget.dataset.c, arr = (S.decks[cur] || []).slice(0, n);
        const i = arr.indexOf(c);
        if (i >= 0) arr.splice(i, 1); else if (arr.length < n) arr.push(c); else { arr.shift(); arr.push(c); }
        S.decks[cur] = arr; save(); draw();
      });
      on(".fr", "mouseenter", e => { const d = G.Field.cardInfo(e.currentTarget.dataset.c).d; document.getElementById("desc").textContent = d.name + "：" + d.desc; });
      on("#done", "click", done);
    };
    draw();
  }

  function shopScreen() {
    app.innerHTML = topbar() + `<h1>裏の取引</h1><p class="sub">記録が増え、ギルドが澱むほど、裏から澱晶が届く。</p>
      <div class="grid2">${Object.entries(GM.SHOP).map(([k, it]) => { const lv = S.upgrades[k] || 0, max = lv >= it.costs.length; return `<div class="card"><b>${it.name}</b>　<span class="sub">${lv}/${it.costs.length}</span><div class="sub">${it.note}</div>
        <button data-k="${k}" class="buy" ${max || S.dark < it.costs[lv] ? "disabled" : ""}>${max ? "上限" : `澱晶 ${it.costs[lv]}`}</button></div>`; }).join("")}</div>
      <button id="back" style="margin-top:10px">戻る</button>`;
    on(".buy", "click", e => { const r = GM.buy(S, e.currentTarget.dataset.k); if (r === "ok") { save(); toast("取引した"); } shopScreen(); });
    on("#back", "click", guild);
  }

  function historyScreen() {
    const O = { cleared: "踏破", retreat: "撤退", ordered: "勧告", defeat: "敗北" };
    app.innerHTML = topbar() + `<h1>これまでの記録</h1><div class="panel">${S.history.slice().reverse().map(h => `<div class="doc-line fixed"><span>${h.day}日目</span><span>${G.DUNGEONS[h.dungeon].name}・${O[h.outcome]}（${h.floor}階）　依頼書 ${tag(h.stated)}${h.forged ? " 偽装" : ""}　絶頂 ${h.climax}　${esc(h.posture || "")}</span></div>`).join("") || "<p class='sub'>まだ無い</p>"}</div>
      ${S.log.length ? `<div class="panel sub">${S.log.slice(-10).map(l => `${l.day}日目：${esc(l.text)}`).join("<br>")}</div>` : ""}
      <div class="row"><button id="back">戻る</button><button id="reset" class="danger">セーブを消す</button></div>`;
    on("#back", "click", guild);
    on("#reset", "click", () => { if (!confirm("セーブを消して最初から始めますか？")) return; try { localStorage.removeItem(KEY); } catch (e) { } S = null; title(); });
  }

  // 検査用（自動テストから中身を覗くため）
  G.debug = { get dive() { return dive; }, get save() { return S; } };
  G.Render.preload();
  S = load();
  if (S && S.v !== 1) S = null;
  title();
})();
