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
  // 同じ画面を描き直す時は、スクロール位置を保つ（選んだ瞬間に上まで飛ばない）
  function keep(fn) { let first = true; return (...a) => { const y = window.scrollY; fn(...a); if (first) { first = false; window.scrollTo(0, 0); } else window.scrollTo(0, y); }; }
  function on(sel, ev, fn, root) { (root || app).querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn)); }
  function cardName(c) { const ci = G.Field.cardInfo(c); return ci.d ? ci.d.name : c; }
  function cardArt(c) {
    const ci = G.Field.cardInfo(c);
    if (ci.trap) return `<img src="assets/traps/${ci.id}.${ci.id === "web" || ci.id === "tower" ? "png" : "svg"}" alt="" style="border-bottom:2px solid ${G.Render.TYPE_COLOR[ci.d.type]}">`;
    return `<img src="assets/monsters/${ci.d.art}" alt=""${ci.d.tint ? ` style="filter:hue-rotate(${ci.d.tint}deg) saturate(1.2)"` : ""}>`;
  }
  const TIER_NAME = ["抵抗", "綻び", "心は拒み、体は応える", "待ってしまう"];
  const TAINT_NAME = ["澄んでいる", "ざわついている", "澱みはじめた", "倒錯が日常になった", "すっかり澱んだ"];

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
    on("#cont", "click", () => { S = GM.upgradeSave(load()); route(); });
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

  /* ================================================================ 監査官室 */
  const LV_NAME = { 1: "低い", 2: "並", 3: "高い" }, SC_NAME = { 1: "小規模", 2: "中規模", 3: "大規模" };
  // 部屋の絵（背景は CSS で描く）。ひかりは扉（右）から入って、机の前に立つ
  function officeHTML(extra) {
    return `<div class="office" id="office">
      <div class="o-window"><i></i><i></i></div><div class="o-shelf"></div><div class="o-door"></div>
      <img class="o-hikari out" id="oh" src="assets/hikari/hikari_civilian_front_1.png" alt="">
      <div class="o-desk"><span class="o-paper"></span><span class="o-paper p2"></span><span class="o-lamp"></span></div>
      <div class="o-dialog hidden" id="dlg"><span class="o-name" id="dn"></span><p id="dt"></p><div class="o-choices hidden" id="dlgc"></div><span class="o-next" id="dnx">▼</span></div>
      ${extra || ""}</div>`;
  }
  function hikariIn(src) { const el = document.getElementById("oh"); if (!el) return; if (src) el.src = src; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("out"))); }
  function hikariOut(done) { const el = document.getElementById("oh"); if (!el) return done && done(); el.src = "assets/hikari/hikari_civilian_right_1.png"; el.classList.add("leave"); setTimeout(() => done && done(), 900); }
  // 会話を一行ずつ（押すと次へ）
  // 選択肢つき：l.choices = [{ label, fn }]。fn が返した行を、その場に差し込んで続ける
  // l.onShow：その行が出た時に呼ぶ（書き起こしなど）
  function vn(lines, done) {
    const dlg = document.getElementById("dlg"), dn = document.getElementById("dn"), dt = document.getElementById("dt"), dc = document.getElementById("dlgc"), nx = document.getElementById("dnx");
    lines = lines.slice();
    let i = 0, waiting = false;
    const show = () => {
      if (waiting) return;
      if (i >= lines.length) { dlg.classList.add("hidden"); dlg.onclick = null; return done && done(); }
      const l = lines[i++];
      dlg.classList.remove("hidden");
      dn.textContent = l.who === "h" ? "ひかり" : l.who === "a" ? "監査官" : "";
      dn.style.display = l.who === "n" ? "none" : "";
      dt.textContent = l.text; dt.className = l.who === "n" ? "narr" : "";
      if (l.onShow) l.onShow(l);
      if (dc) { dc.innerHTML = ""; dc.classList.add("hidden"); }
      if (l.choices && dc) {
        waiting = true; if (nx) nx.style.visibility = "hidden";
        dc.classList.remove("hidden");
        l.choices.forEach(c => {
          const b = document.createElement("button"); b.textContent = c.label; if (c.cls) b.className = c.cls;
          b.onclick = ev => { ev.stopPropagation(); waiting = false; if (nx) nx.style.visibility = ""; dc.classList.add("hidden"); const add = c.fn ? c.fn() : null; if (add && add.length) lines.splice(i, 0, ...add); show(); };
          dc.appendChild(b);
        });
      } else if (nx) nx.style.visibility = "";
    };
    dlg.onclick = show; show();
  }
  function officeTalk() {
    const T = G.Text, out = [];
    const last = S.history[S.history.length - 1];
    if (last && last.outcome === "defeat") out.push(T.office("talk.afterDefeat"));
    if (S.ailments.some(a => a.id === "heat")) out.push(T.office("talk.heat"));
    // 残っている状態異常が、朝の会話に出る（どれか一つ）
    const ailTalk = ["rewired", "attached", "omazuke", "charm", "throb", "sensitive", "addict", "hairTrigger", "exposure"].filter(id => S.ailments.some(a => a.id === id));
    if (ailTalk.length) out.unshift(T.office("talk.ail_" + U.pick(ailTalk)));
    if (S.suspicion >= 45) out.push(T.office("talk.suspicious"));
    if (GM.taintStage(S) >= 2 && U.chance(0.6)) out.push(T.office("talk.taint"));
    if (G.tier(S.body, S.mind) >= 2 && U.chance(0.6)) out.push(T.office("talk.fallen"));
    out.push(T.office(S.trust >= 70 ? "talk.trustHigh" : S.trust < 35 ? "talk.trustLow" : "talk.base"));
    return out.slice(0, 2);
  }

  function kitText(kit) { return Object.keys(GM.ITEMS).filter(k => kit[k] > 0).map(k => `${GM.ITEMS[k].name}×${kit[k]}`).join("、") || "なし"; }
  function equipHTML(form, prepName) {
    const eq = G.HIKARI.equip[form] || [];
    return `<div class="sub" style="margin-top:4px">装備：${eq.map(esc).join("／")}${prepName ? `／<b>${esc(prepName)}</b>` : ""}</div>`;
  }
  function guild() { return office(); }
  function office() {
    if (S.pendingEvent === "confront") return confrontScreen();
    const tier = G.tier(S.body, S.mind);
    const ail = S.ailments.map(a => `<span class="tag">${esc(GM.ailmentName(a))}</span>`).join("") || `<span class="dim">なし</span>`;
    const tr = Object.keys(S.traits || {}).filter(k => S.traits[k] && G.TRAITS[k]).map(k => `<span class="tag" title="${esc(G.TRAITS[k].desc)}">${G.TRAITS[k].name}・${G.TRAIT_STAGE[S.traits[k]]}</span>`).join("") || `<span class="dim">まだ無い</span>`;
    app.innerHTML = topbar() + officeHTML() + `
      <div class="panel" id="status">
        <b>星野 ひかり</b> <span class="sub">大学生。本業は魔法少女ルミナ（正体を知るのは監査官だけ）</span>
        ${meter("肉体", S.body, 100, "#ff7fb0")}${meter("精神", S.mind, 100, "#b48cff")}${meter("信頼", S.trust, 100, "#8fe0a0")}${meter("疲労", S.fatigue, 100, "#f2d27a")}
        <div class="sub">堕ち：${TIER_NAME[tier]} ／ 状態異常：${ail}</div>
        <div class="sub">身についた性癖（通常の処置では抜けない）：${tr}</div>
        ${equipHTML("civilian")}
      </div>
      <div class="grid2 hidden" id="menu">
        <button class="primary" id="req">依頼を選ぶ</button>
        <button id="deck">デッキを組む</button>
        <button id="shop">裏の取引（澱晶 ${S.dark}）</button>
        <button id="hist">これまでの記録</button>
      </div>
      <div class="panel sub hidden" id="menu2">オート指揮：<button id="auto">${S.autoDirector ? "入" : "切"}</button>　潜行中に魔物や罠を自動で差し向ける（自分で置くこともできる）
        <br><span class="dim">ひかりの弱点：素で惑に強い。変身中は絡にも強い。変身が解けると一気に崩れる。</span></div>`;
    const showMenu = () => { document.getElementById("menu").classList.remove("hidden"); document.getElementById("menu2").classList.remove("hidden"); };
    on("#req", "click", requestScreen);
    on("#deck", "click", () => deckScreen(null, office));
    on("#shop", "click", shopScreen);
    on("#hist", "click", historyScreen);
    on("#auto", "click", e => { S.autoDirector = !S.autoDirector; save(); e.currentTarget.textContent = S.autoDirector ? "入" : "切"; });
    if (S.greeted === S.day) { hikariIn(); document.getElementById("dlg").classList.add("hidden"); return showMenu(); }
    const T = G.Text;
    const lines = [{ who: "n", text: T.office("knock") }];
    vn(lines, () => {
      hikariIn();
      setTimeout(() => {
        const talk = [{ who: "h", text: T.office("enter") }].concat(officeTalk().map(t => ({ who: "h", text: t })));
        if (S.pendingEvent === "silent") { S.pendingEvent = null; talk.push({ who: "h", text: "……監査官さん。ううん、なんでもないです" }, { who: "n", text: "（疑いはある。けれど、もう口に出す気はないらしい）" }); }
        vn(talk, () => { S.greeted = S.day; save(); showMenu(); });
      }, 650);
    });
  }

  function confrontScreen() {
    app.innerHTML = topbar() + officeHTML();
    hikariIn();
    vn([
      { who: "n", text: "扉を閉めるなり、ひかりは真っすぐにこちらを見た。" },
      { who: "h", text: "……監査官さん。最近の依頼書、おかしくないですか。書いてあることと、中身が、ずっと違う" },
      { who: "h", text: "偶然、じゃないですよね。……あたし、そこまで鈍くないです" },
      { who: "n", text: "確信されている。裏の力で「矯正」するしかない。澱晶はすべて失うが、信頼は最大に戻り、違和感は消える。" },
    ], () => {
      app.insertAdjacentHTML("beforeend", `<div class="row"><button class="danger" id="fix">矯正する（澱晶 ${S.dark} をすべて使う）</button></div>`);
      on("#fix", "click", () => {
        GM.resolveConfront(S); save();
        document.getElementById("fix").remove();
        vn([{ who: "n", text: "淡い光が部屋を満たし、やがて消えた。" }, { who: "h", text: "……あれ？ あたし、何の話、してましたっけ" }, { who: "h", text: "ごめんなさい、疲れてるのかな。……今日の依頼、よろしくお願いしますね" }], () => { S.greeted = S.day; save(); office(); });
      });
    });
  }

  /* ================================================================ 依頼を選び、書き換える */
  function requestScreen() {
    let sel = 0, paper = null, dest = null;
    const draw = keep(() => {
      const r = S.requests[sel];
      paper = paper || Object.assign({}, r.real);
      const de = dest || r.dungeon;
      const size = GM.forgeSize(r.real, paper, de !== r.dungeon);
      const title = GM.requestTitle(paper), stType = G.MONSTERS[paper.main].type, P = G.PREP[stType];
      const lv = paper.level + (paper.boss ? 1 : 0);
      const kitTxt = lv <= 1 ? "少なめ（楽な相手だと思っている）" : lv === 2 ? "いつもどおり" : "多め（手強い相手だと思っている）";
      const mains = GM.MAINS.map(k => `<option value="${k}" ${k === paper.main ? "selected" : ""}>${G.MONSTERS[k].name}（${G.MONSTERS[k].type}）</option>`).join("");
      const btn = (cls, val, cur, label) => `<button class="${cls}" data-v="${val}" style="${val === cur ? "border-color:var(--pink);background:#4a2640" : ""}">${label}</button>`;
      app.innerHTML = topbar() + `<h1>依頼書</h1>
        <p class="sub">ひかりの希望する依頼。机の上の一枚を選び、中身を書き換えてから渡す。</p>
        <div class="grid2">${S.requests.map((q, i) => `<div class="card paper ${i === sel ? "sel" : ""}" data-i="${i}">
          <b>${esc(q.title)}</b><div class="sub">${esc(q.place || G.DUNGEONS[q.dungeon].name)}・報酬 ◈${q.reward}</div>
          <div class="sub">脅威度 ${LV_NAME[q.real.level]}・${SC_NAME[q.real.scale]}${q.real.boss ? "・長あり" : ""}</div></div>`).join("")}</div>
        <div class="panel">
          <h2 style="margin-top:0">書き換える</h2>
          <div class="col">
            <label>主な魔物　<select id="main">${mains}</select></label>
            <div>規模　${[1, 2, 3].map(v => btn("sc", v, paper.scale, SC_NAME[v])).join(" ")}</div>
            <div>脅威度　${[1, 2, 3].map(v => btn("lv", v, paper.level, LV_NAME[v])).join(" ")}</div>
            <div>長　${btn("bs", 1, paper.boss ? 1 : 0, "書く")} ${btn("bs", 0, paper.boss ? 1 : 0, "書かない")}</div>
            ${S.upgrades.swapDest ? `<div>実際の行き先　${Object.keys(G.DUNGEONS).map(k => btn("de", k, de, G.DUNGEONS[k].name)).join(" ")}</div>` : ""}
          </div>
          <div class="paper-preview"><div class="sub">ひかりに渡す依頼書</div><b>${esc(title)}</b>
            <div class="sub">${G.DUNGEONS[de].name}（実際）・書いた系統 ${tag(stType)}</div></div>
          <p class="sub">ひかりは<b>${P.name}</b>を用意してくる（${esc(P.note)}）。持ち物は${kitTxt}。${stType === "惑" ? "気付け薬を多めに。" : stType === "蕩" ? "熱冷ましを買い込む。" : "縄抜けの小刀を忍ばせる。"}</p>
          ${size ? `<p class="sub">偽装の大きさ <b style="color:var(--red)">${size}</b>。食い違いを見るほど違和感が積もる（今 ${Math.round(S.suspicion)}/100）。</p>` : `<p class="sub">書き換えていない（正直な依頼書）。</p>`}
          <div class="row"><button class="primary" id="go">この依頼書を渡す</button><button id="reset">元に戻す</button><button id="back">戻る</button></div>
        </div>`;
      on(".paper", "click", e => { sel = +e.currentTarget.dataset.i; paper = null; dest = null; draw(); });
      on("#main", "change", e => { paper.main = e.target.value; draw(); });
      on(".sc", "click", e => { paper.scale = +e.currentTarget.dataset.v; draw(); });
      on(".lv", "click", e => { paper.level = +e.currentTarget.dataset.v; draw(); });
      on(".bs", "click", e => { paper.boss = e.currentTarget.dataset.v === "1"; draw(); });
      on(".de", "click", e => { dest = e.currentTarget.dataset.v; draw(); });
      on("#reset", "click", () => { paper = null; dest = null; draw(); });
      on("#back", "click", office);
      on("#go", "click", () => { GM.assign(S, sel, paper, de); GM.prep(S); save(); handover(); });
    });
    draw();
  }

  // 手渡し → 読む → 準備の話 → 見送り
  function handover() {
    const p = S.pick;
    if (!p || !p.kit) { S.phase = "guild"; return office(); }
    const P = G.PREP[p.stated], T = G.Text;
    app.innerHTML = topbar() + officeHTML() + `<div class="row hidden" id="hv"><button class="primary" id="go">見送る（潜行へ）</button><button id="deck">デッキを組む</button></div>
      <p class="sub hidden" id="hvn">行き先：${G.DUNGEONS[p.dungeon].name}（実際）　持ち物：${P.name}、${kitText(p.kit)}（◈${p.kitCost || 0}）</p>`;
    hikariIn();
    const lv = p.paper.level, readKey = p.paper.boss ? "read.boss" : lv === 1 ? "read.easy" : lv === 3 ? "read.hard" : "read.normal";
    const ctx = { title: p.title, mon: G.MONSTERS[p.paper.main].name, prep: P.name, type: p.stated };
    vn([
      { who: "a", text: U.pick(["今日はこれを頼む。", "この依頼を。", "今日の分だ。"]) },
      { who: "n", text: `監査官は依頼書を差し出した。「${p.title}」` },
      { who: "h", text: T.office(readKey, ctx) },
      { who: "h", text: T.office("prep", ctx) },
    ], () => {
      document.getElementById("hv").classList.remove("hidden");
      document.getElementById("hvn").classList.remove("hidden");
      on("#deck", "click", () => deckScreen(p.dungeon, handover));
      on("#go", "click", () => {
        document.getElementById("hv").classList.add("hidden");
        vn([{ who: "h", text: T.office(S.trust < 35 ? "byeLow" : "bye") }], () => hikariOut(() => {
          vn([{ who: "n", text: "扉が閉まる。……水晶に、迷宮の入口が映った。" }], startDive);
        }));
      });
    });
  }
  function prepScreen() { return handover(); }

  /* ================================================================ 潜行 */
  function startDive() {
    const run = GM.startDive(S);
    save();
    dive = { run, w: null, cam: { x: 0, y: 0, scale: 40 }, card: null, hover: null, speed: S.speed || 1, whole: false, last: 0, acc: 0, trans: 0, raf: 0 };
    newFloor();
    app.innerHTML = `<div class="dive">
      <div class="topbar" id="dtop"></div>
      <div class="stage" id="stage"><canvas id="cv"></canvas><div class="overlay hidden" id="ov"></div>
        <div class="msgwin" id="msgwin"><p></p><p></p><p></p></div></div>
      <div class="chips" id="chips"></div>
      <div class="hud" id="hud"></div>
      <div class="row">
        <button id="spd">×${dive.speed}</button><button id="pause">一時停止</button><button id="auto">オート ${S.autoDirector ? "入" : "切"}</button>
        <button id="whole">全体</button><button id="recall" class="danger">帰還を勧告</button>
      </div>
      <div class="cards" id="cards"></div>
      <div class="log hidden" id="log"></div></div>`;
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
    dive.msgN = 0; dive.msgLines = dive.msgLines || [];
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
    if (dive.trans > 0) { ov.classList.remove("hidden"); ov.textContent = `${dive.run.dungeonName || G.DUNGEONS[dive.run.dungeon].name}　${w.floorNo}階`; }
    else ov.classList.add("hidden");
    drawHud();
    if (w.outcome && !w.scene && !dive.sceneOpen && !dive.night && !dive.ending) endFloor();
    if (!dive || dive.ending) return;          // 潜行が終わった
    dive.raf = requestAnimationFrame(loop);
  }

  function drawHud() {
    const w = dive.w, h = w.run.h;
    const top = document.getElementById("dtop");
    if (top) top.innerHTML = `<span><b>${w.floorNo}</b>/${w.dg.floors}階</span><span>${esc(dive.run.dungeonName || w.dg.name)} ${tag(w.dg.type)}</span><span>依頼書 ${tag(dive.run.stated)}</span>
      <span>${h.form === "magica" ? "<b style='color:var(--pink)'>ルミナ</b>" : "<b>素の姿</b>"}</span><span>コスト <b>${w.dir.spent}/${w.dir.cap}</b></span><span>呼んだ数 <b>${w.dir.live}/${dive.run.maxLive}</b></span>`;
    const hud = document.getElementById("hud");
    if (hud && (!dive.hudT || performance.now() - dive.hudT > 120)) {
      dive.hudT = performance.now();
      hud.innerHTML = meter("体力", h.hp, 100, "#8fe0a0") + meter("MP", h.mp, 60, "#6fc2ff") + meter("魔力", h.magic, 100, "#ffd6f0") +
        meter("気力", h.will, 100, "#f2d27a") + meter("発情", h.arousal, 100, "#ff7fb0") + meter("快感", Math.min(100, h.pleasure), 100, "#ff4f9a") +
        `<div class="sub">絶頂 ${h.climax}　持ち物：${kitText(h.kit)}</div>` + equipHTML(h.form, G.PREP[dive.run.stated] && G.PREP[dive.run.stated].name);
      const chips = document.getElementById("chips");
      if (chips) {
        const st = G.Field.statusList(w);
        chips.innerHTML = st.length ? st.map(c => `<span class="chip ${c.cls}">${esc(c.name)}${c.t != null ? `<i>${c.t.toFixed(1)}</i>` : ""}</span>`).join("") : `<span class="chip dim">異常なし</span>`;
      }
      drawCards(true);
    }
    // メッセージ窓（ドラクエ風）：新しい行を1文字ずつ。古い2行は薄く
    const mw = document.getElementById("msgwin");
    if (mw) {
      while (dive.msgN < w.msgs.length) { dive.msgLines.push({ text: w.msgs[dive.msgN++].text, shown: 0 }); if (dive.msgLines.length > 3) dive.msgLines.shift(); }
      const L = dive.msgLines, now = performance.now(), dtm = Math.min(0.1, (now - (dive.msgT || now)) / 1000); dive.msgT = now;
      for (let i = 0; i < L.length; i++) if (L[i].shown < L[i].text.length) { L[i].shown = Math.min(L[i].text.length, L[i].shown + (i < L.length - 1 ? 160 : 40) * dtm); break; }
      const html = L.map((l, i) => `<span class="${i < L.length - 1 ? "old" : ""}">${esc(l.text.slice(0, Math.ceil(l.shown)))}</span>`);
      const ps = mw.children;
      for (let i = 0; i < 3; i++) { const v = html[i] || ""; if (ps[i].innerHTML !== v) ps[i].innerHTML = v; }
    }
    const log = document.getElementById("log");
    if (log && !log.classList.contains("hidden") && w.log.length !== dive.logN) {
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
    log.classList.remove("hidden");
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
    const outcome = dive.run.outcome;
    GM.finishDive(S, dive.run);
    dive = null;
    save();
    returnScene(outcome);
  }
  // 帰還：監査官室に戻ってくる
  function returnScene(outcome) {
    app.innerHTML = topbar() + officeHTML();
    const T = G.Text;
    const back = T.office("back." + (outcome || "retreat"));
    const first = outcome === "defeat" ? [{ who: "n", text: back }] : [{ who: "n", text: T.office("knock") }];
    vn(first, () => {
      hikariIn(S.rec && S.rec.h.form === "civilian" ? "assets/hikari/hikari_civilian_front_1.png" : "assets/hikari/hikari_civilian_front_1.png");
      setTimeout(() => vn(outcome === "defeat" ? [] : [{ who: "h", text: back }], () => reportScreen()), 650);
    });
  }

  /* ================================================================ 報告（監査官室で、ひかりと向き合って聞く） */
  const OUTC = { cleared: "踏破", retreat: "撤退", ordered: "勧告で帰還", defeat: "敗北→翌日救出" };
  function transcriptAdd(l) {
    const box = document.getElementById("tr"); if (!box) return;
    const who = { h: "ひかり", a: "監査官", n: "" }[l.who];
    box.insertAdjacentHTML("beforeend", `<div class="speech ${l.who}${l.lie ? " lie" : ""}">${who ? `<span class="who">${who}</span>` : ""}${esc(l.text)}</div>`);
  }
  function reportScreen() {
    const rec = S.rec;
    if (!rec) { S.phase = "guild"; return guild(); }
    app.innerHTML = topbar() + officeHTML() + `
      <div class="panel sub" id="rinfo"><b>口頭報告</b>　${esc(rec.dungeonName)}・${rec.floorReached}階まで・${OUTC[rec.outcome]}　今日の話し方：${esc(rec.postureName)}
        <br><span class="dim">話の途中で「追及する」を選べるのは、その件を言い終えた、その時だけ。嘘なら崩れることがある。本当のことなら、中身を言わされる。</span></div>
      <div class="row hidden" id="rdone"><button class="primary" id="todoc">報告書を受け取る</button></div>
      <details class="panel" id="trp"><summary>ここまでの話（書き起こし）</summary><div id="tr"></div></details>`;
    hikariIn();
    const seq = rec.report.map(l => {
      const o = Object.assign({}, l, { onShow: transcriptAdd });
      if (l.probe && l.who === "h") o.choices = [
        { label: "追及する", cls: "danger", fn: () => { const r = G.Report.probe(rec, l, S); save(); return r.lines.map(x => Object.assign(x, { onShow: transcriptAdd })); } },
        { label: "流す", fn: () => [] },
      ];
      return o;
    });
    vn(seq, () => {
      document.getElementById("rdone").classList.remove("hidden");
      on("#todoc", "click", () => { if (!rec.docWritten) GM.writeDoc(S); S.phase = "audit"; save(); auditScreen(); });
    });
  }

  /* ================================================================ 報告書（書面。記録に残るので、ここでまた嘘を書く） */
  function docSheet(rec, flags, stamp) {
    const req = (S.pick && S.pick.title) || "";
    return `<div class="docsheet">
      <div class="ds-head"><span class="ds-guild">冒険者ギルド　迷宮監査課</span><span class="ds-no">第 ${rec.day} 号</span></div>
      <div class="ds-title">迷 宮 探 索 報 告 書</div>
      <table class="ds-meta"><tr><th>提出日</th><td>${rec.day}日目</td><th>提出者</th><td>星野 ひかり（ルミナ）</td></tr>
        <tr><th>依頼</th><td colspan="3">${esc(req)}</td></tr>
        <tr><th>行き先</th><td>${esc(rec.dungeonName)}</td><th>結果</th><td>${rec.floorReached}階・${OUTC[rec.outcome]}</td></tr></table>
      <div class="ds-sec">経過</div>
      ${rec.doc.map((d, i) => `<div class="doc-line ds-line ${flags.has(i) ? "flag" : ""} ${d.fixed ? "fixed" : ""}" data-i="${i}"><span class="ds-n">${i + 1}.</span><span class="ds-t">${esc(d.text)}</span><span class="mark">${flags.has(i) ? "虚" : ""}</span></div>`).join("")}
      <div class="ds-foot"><span>上記のとおり、相違ないことを報告します。</span><span class="ds-sign">星野 ひかり<i class="hanko">星野</i></span></div>
      ${stamp ? `<div class="ds-stamp">受理</div>` : ""}
    </div>`;
  }
  function auditScreen() {
    const rec = S.rec, flags = new Set();
    if (!rec.docWritten) GM.writeDoc(S);
    const draw = keep(() => {
      app.innerHTML = topbar() + `<h1>報告書の監査</h1>
        <p class="sub">ひかりが書いて提出した報告書。書面は記録に残るので、口では言えたことでも書かないことがある。<br>水晶の監視記録と見比べ、嘘だと思う行に印を付けて確定する（一日一度きり）。本人が覚えていないだけの行（「特に何もなし」）は嘘ではない。</p>
        ${docSheet(rec, flags, false)}
        <details class="panel" open><summary>水晶の監視記録</summary><div class="monitor">${rec.monitor.map(esc).join("<br>") || "（記録なし）"}</div></details>
        <details class="panel"><summary>口頭報告の書き起こし</summary>${rec.report.map(l => `<div class="speech ${l.who}">${l.who !== "n" ? `<span class="who">${{ h: "ひかり", a: "監査官" }[l.who]}</span>` : ""}${esc(l.text)}</div>`).join("")}</details>
        <div class="row"><button class="primary" id="ok">この印で確定</button></div>`;
      on(".ds-line", "click", e => { const i = +e.currentTarget.dataset.i; if (rec.doc[i].fixed) return; flags.has(i) ? flags.delete(i) : flags.add(i); draw(); });
      on("#ok", "click", () => {
        const res = GM.audit(S, [...flags]); save();
        const msg = `<p>摘発 <b>${res.caught.length}</b> 件 ／ 誤った指摘 <b>${res.wrong.length}</b> 件 ／ 見逃し <b>${res.missed.length}</b> 件</p>
          ${res.wrong.some(d => d.kind === "missing") ? `<p class="sub">「特に何もなし」の行は、本人が覚えていないだけだった。</p>` : ""}
          ${res.missed.length ? `<p class="sub">見逃した嘘は、隠し通せた経験として、ひかりの心に積もる。</p>` : ""}
          <div class="row"><button class="primary" id="ok2">${res.caught.length ? "呼び戻して、問いただす" : "一日を終える"}</button></div>`;
        modal(msg, b => b.querySelector("#ok2").onclick = () => { closeModal(); route(); });
      });
    });
    draw();
  }

  // 再尋問：暴いた行を突きつける（監査官室で）
  function rereportScreen() {
    const rec = S.rec, res = rec.audit;
    const lines = G.Report.rereport(rec, res.caught, S);
    save();
    app.innerHTML = topbar() + officeHTML() + `<div class="panel sub"><b>再尋問</b>　報告書の嘘 ${res.caught.length} 件を、本人に突きつける。</div>
      <div class="panel hidden" id="rechoice"><p class="sub">訂正の報告書を書かせた。このあと——</p>
        <div class="row"><button class="primary" id="rec">記録だけ取って帰す</button><button class="danger" id="lewd">踏み込んで確認する</button></div>
        <p class="sub">踏み込んだ確認は、信頼を下げる代わりに、澱晶とギルドの澱みを得る。</p></div>`;
    hikariIn();
    vn([{ who: "n", text: "報告書を手に、監査官はひかりを呼び戻した。" }].concat(lines), () => {
      document.getElementById("rechoice").classList.remove("hidden");
      on("#rec", "click", () => { GM.rereportChoice(S, false); save(); clinicScreen(); });
      on("#lewd", "click", () => {
        const R = G.Report.REREPORT;
        modal(`<p>${esc(U.pick(R.lewdAsk))}</p><p>${esc(U.pick(R.lewdLine))}</p><p class="sub">確認は、長く続いた。</p><div class="row"><button class="primary" id="ok">終える</button></div>`,
          b => b.querySelector("#ok").onclick = () => { closeModal(); GM.rereportChoice(S, true); save(); clinicScreen(); });
      });
    });
  }

  /* ================================================================ 処置 */
  function clinicScreen() {
    S.phase = "clinic"; save();
    const sel = new Set(S.ailments.map(a => a.id));
    const draw = keep(() => {
      const fee = [...sel].reduce((a, id) => a + GM.AILMENTS[id].fee, 0);
      const g = S.rec ? S.rec.gain : null;
      app.innerHTML = topbar() + `<h1>一日の終わり（処置）</h1>
        ${g ? `<div class="panel sub">今日の変化：肉体 +${g.body}　精神 +${g.mind}　ギルド資金 ${g.funds >= 0 ? "+" : ""}${g.funds}　澱晶 +${g.dark}${S.rec.forged ? `　違和感 +${g.sus}` : ""}</div>` : ""}
        <div class="panel">${S.ailments.length ? S.ailments.map(a => { const A = GM.AILMENTS[a.id]; return `<label class="doc-line"><input type="checkbox" data-id="${a.id}" ${sel.has(a.id) ? "checked" : ""}> <span><b>${esc(GM.ailmentName(a))}</b>${A.kink ? "（深層処置）" : ""}　◈${A.fee}<br><span class="sub">${A.note}</span></span></label>`; }).join("") : `<p class="sub">状態異常はない。</p>`}
          <p class="sub">処置しないで残すと、次の潜行に響き、ギルドの空気も少し澱む。</p></div>
        <div class="row"><button class="primary" id="ok">${sel.size ? `処置して（◈${fee}）` : "このまま"}翌日へ</button></div>`;
      on("input[type=checkbox]", "change", e => { e.target.checked ? sel.add(e.target.dataset.id) : sel.delete(e.target.dataset.id); draw(); });
      on("#ok", "click", () => {
        if (fee > S.funds) return toast("ギルド資金が足りない");
        GM.treat(S, [...sel]); GM.endDay(S); save(); guild();
      });
    });
    draw();
  }

  /* ================================================================ デッキ・裏の取引・記録 */
  function deckScreen(dk, back) {
    let cur = typeof dk === "string" ? dk : Object.keys(G.DUNGEONS)[0];
    const done = typeof back === "function" ? back : guild;
    const draw = keep(() => {
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
    });
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
  if (S && S.v !== 2) S = null;          // 古いセーブ（依頼書の形が違う）は使わない
  if (S) GM.upgradeSave(S);             // 後から足した項目を補う
  title();
})();
