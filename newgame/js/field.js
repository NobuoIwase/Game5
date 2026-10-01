/* field.js — 潜行中の1階ぶんの世界：ひかりのAI・魔物のAI・弾・罠・効き目・配置のルール
 * DOM に触れない（Node の自動検査でもそのまま回す）。画面は render.js が world を読んで描く。
 *
 * 動きは旧 Game5（ai-v012 / motion-v039 / ai-v040）の考え方を移したもの：
 *  - 道のりは「直接見通せる一番先の地点」へまっすぐ向かう（マスの中心をなぞらない）
 *  - 速度は少しずつ上げ下げし、向きもなめらかに回す
 *  - 魔物の構え（予兆）を見て、知識と状態で決まる一瞬の遅れのあと、16方向から一番安全な方へ飛びのく
 *  - 魔物は好みの間合いを保ち、互いにばらけて回り込む。同時に構えるのは2体まで。手負いは逃げ、仲間を呼ぶ
 */
var G = (typeof G !== "undefined") ? G : {};
(function () {
  "use strict";
  const U = G.U, M = G.Map;
  const HR = 0.3;                       // ひかりの当たりの半径（マス）
  const SPREAD = 0.3;                   // 扇に撃つ弾の間の角度

  /* ================================================================ 堕ちの段階 */
  // 0 抵抗 / 1 綻び / 2 心は拒み、体は応える / 3 待ってしまう
  G.tier = function (body, mind) {
    if (mind >= 50) return 3;
    if (body >= 50 && mind < body * 0.6) return 2;
    if (body >= 22) return 1;
    return 0;
  };
  const TIER_FX = [
    { struggle: 1.12, pleasure: 0.8, will: 1.25 },
    { struggle: 1.0, pleasure: 1.0, will: 1.0 },
    { struggle: 0.82, pleasure: 1.3, will: 0.8 },
    { struggle: 0.62, pleasure: 1.55, will: 0.6 },
  ];
  // 依頼の本当の脅威度（1 低い／2 並／3 高い）で魔物が強くなる
  const LV = { 1: { hp: 0.8, pow: 0.85 }, 2: { hp: 1, pow: 1 }, 3: { hp: 1.35, pow: 1.2 } };

  /* ================================================================ 世界を作る */
  function createWorld(run, floorNo) {
    const dg0 = G.DUNGEONS[run.dungeon], dg = run.floors ? Object.assign({}, dg0, { floors: run.floors }) : dg0;   // 階数は依頼の規模で決まる
    const map = M.makeFloor(floorNo, dg.floors);
    const w = {
      run, dg, map, floorNo, t: 0, outcome: null,
      monsters: [], traps: [], chests: [], projs: [], fx: [], clouds: [],
      covers: M.coverSpots(map),
      dir: { spent: 0, cap: G.BAL.floorCost(floorNo), ct: {}, live: 0, auto: !!run.autoDirector, next: 2 },
      scene: null, nextId: 1, log: [], msgs: [], msgGap: {}, feed: [], feedN: 0,
    };
    const h = run.h;
    Object.assign(h, {
      x: map.up.x, y: map.up.y, a: Math.PI / 2, vx: 0, vy: 0, face: null, intent: null, label: "探索", think: 0.3,
      known: {}, bound: null, trance: 0, hyp: 0, dazeT: 0, lureTo: null, slow: 0, glue: 0, cdShot: 0, cdBurst: 0, cdShove: 0,
      idleMp: 0, bubble: null, decoy: null, possess: null, drawn: null, altar: null, mislead: 0, rest: 0, shrineT: 0, floorT: 0, peekT: 0, peekHold: 0,
      wantDown: false, stuckT: 0, lastX: map.up.x, lastY: map.up.y, cast: null, dashT: 0, react: {}, dashed: {},
      strafe: 1, strafeT: 0, search: null, glance: null, idleT: 0, kb: 0, kbA: 0, brakeT: 0, spPrev: 0, goal: null, state: "explore",
    });
    Object.assign(h, { freeze: 0, sniff: 0, salute: 0, pray: 0, countGame: null, drawn: null, deny: null, altar: null });
    // 階の時計（w.t）は階ごとに0から。前の階の時刻・座標を持ち越すと、届かない目的地に向かい続けて固まる
    Object.assign(h, { ignore: {}, peekHold: 0, failN: 0, veilUsed: false, inspT: undefined, fireSpot: null, peekSpot: null, wallHits: 0, _pp: null, convey: null, cdMelee: 0, cdFlash: 0, cdBreak: 0, ifr: 0, thinkT: 0,
      charmT: {}, anticT: undefined, monoT: undefined, lastEscT: undefined, saluteT: undefined, bcastT: undefined, edgeT: undefined, lastClimaxT: undefined, ringT: undefined, tipT: undefined, spaceAt: null, walled: {}, chestT: null, chestSkip: [], tgt: null, lastStand: false, prayNext: undefined, tranceRun: 0, basinT: null, basinSkip: [], fightT: null, lastDmgT: undefined, clearT: undefined, liveT: undefined, unboundT: undefined, recoverAt: null });
    map.seen = new Uint8Array(map.W * map.H);
    populate(w);
    msg(w, "floor", { floor: floorNo, dg: run.dungeonName || dg.name });
    if (w.trapFloor) msg(w, "trapFloor", {});
    say(w, "floorIn", { floor: floorNo });
    if (floorNo === 1 && run.save) {                      // 一階の入口：昨日を引きずった一言
      const sv = run.save, last = (sv.history || [])[sv.history.length - 1], tier = G.tier(sv.body, sv.mind);
      if (tier >= 2 && U.chance(0.4)) say(w, "startFallen", {});
      else if (last && last.outcome === "defeat" && U.chance(0.7)) say(w, "startDefeat", {});
      else if ((sv.ailments || []).some(a => ["attached", "throb", "sensitive", "omazuke", "swell", "futaAfter", "impCurse", "permit"].includes(a.id)) && U.chance(0.6)) say(w, "startAil", {});
      else if (last && last.outcome === "cleared" && U.chance(0.5)) say(w, "startCleared", {});
    }
    // 迷宮の法則（入口で決まる）
    const law = run.law;
    if (law && floorNo === 1) { msg(w, "law", { law: G.LAWS[law].name }); w.scene = { key: "law", lines: G.Text.lawLines(law, { n: heroName(w) }), mon: null }; }
    if (law === "eibin") h.sens = Math.min(5, (h.sens || 0) + 1);
    if (law === "hakudatsu" && floorNo >= 2 && !h.exposure) { h.exposure = true; record(w, { kind: "exposure", sev: 2, monName: G.LAWS.hakudatsu.name }); msg(w, "strip", {}); }
    if (law === "kokuin" && floorNo === 1) engraveSigil(w, 1, { kind: "kokuin", d: { name: G.LAWS.kokuin.name } });
    // 変生：神殿に入った時／雄化の法則／定着してしまった身体
    if (floorNo === 1 && !h.futa && (dg.futa || law === "yuuka" || (run.save && run.save.futaFixed))) {
      h.futa = true; h.cum = h.cum || 0; record(w, { kind: "futaOn", type: "蕩", sev: 2 });
      const L = G.Text.scene("futaOn", { run, h, n: heroName(w) }) || [];
      if (w.scene) w.scene.lines = w.scene.lines.concat(L); else w.scene = { key: "futaOn", lines: L, mon: null };   // 法則の場面があれば、続けて読ませる
    }
    // 誓い（おあずけ）は、階を出た瞬間に全部返ってくる
    if (h.omazuke && h.omazuke.floor && h.omazuke.floor < floorNo) {
      const o = h.omazuke; h.omazuke = null;
      releaseOverflow(w, (o.over || 0) + 40, { kind: "vow", d: { name: "誓いの祭壇" } }, "vow");
      w.scene = { key: "vowRelease", lines: G.Text.scene("vowRelease", { run, h, n: heroName(w), floor: floorNo }) || [], mon: null };
    }
    return w;
  }

  // 階の初期配置（ランダム生成）。依頼の本当の中身（主な魔物・規模・長）に沿う。コストはかからない
  function populate(w) {
    const dg = w.dg, f = w.floorNo, map = w.map, run = w.run, real = run.real || {};
    const far = (x, y) => U.dist(x, y, map.up.x, map.up.y) > 6 && U.dist(x, y, map.down.x, map.down.y) > 1.5;
    const pool = dg.fixed.concat(U.chance(0.35) ? [U.pick(dg.free)] : []);
    const scale = [0, 0.75, 1, 1.4][real.scale || 2];
    const nMon = Math.round((3 + Math.floor(f / 2.5) + (U.chance(0.5) ? 1 : 0)) * scale);
    for (let i = 0; i < nMon; i++) {
      let id = real.main && U.chance(real.species ? 0.7 : 0.45) ? real.main : U.pick(pool); const p = M.randomFloor(map, far);
      if (G.MONSTERS[id].deep && f < G.MONSTERS[id].deep) id = U.pick(dg.fixed.filter(k => !G.MONSTERS[k].deep) );   // 深い階にしか出ない魔物（教祖など）
      if (p) spawnMonster(w, id, p.x, p.y, false);
    }
    // 長（ボス）：最下層の転移陣の手前に
    if (real.boss && map.last && real.main) {
      const p = M.randomFloor(map, (x, y) => U.dist(x, y, map.down.x, map.down.y) < 4 && U.dist(x, y, map.down.x, map.down.y) > 1.5) || M.randomFloor(map, far);
      if (p) { const b = spawnMonster(w, real.main, p.x, p.y, false); makeBoss(b); }
    }
    // 罠部屋（Game2 の区画）：部屋まるごとが一つの仕掛け。合う魔物が眠って潜む。ときどき階まるごと罠部屋の「罠の階」
    const small = dg.traps.filter(t => !G.TRAPS[t].big && !G.TRAPS[t].lure && !G.TRAPS[t].emit);
    const lures = dg.traps.filter(t => G.TRAPS[t].lure);
    const startRoom = map.rooms.find(r => Math.abs(r.cx + 0.5 - map.up.x) < 1 && Math.abs(r.cy + 0.5 - map.up.y) < 1);
    const downRoom = map.rooms.find(r => map.down.x >= r.x && map.down.x < r.x + r.w && map.down.y >= r.y && map.down.y < r.y + r.h);
    const cand = U.shuffle(map.rooms.filter(r => r !== startRoom && r !== downRoom && r.w * r.h >= 16));
    w.trapFloor = f > 1 && U.chance(0.12 + f * 0.02);
    const nRooms = w.trapFloor ? cand.length : Math.min(cand.length, f >= 5 ? 2 : 1);
    const rpool = (dg.rooms || []).filter(k => G.TRAP_ROOMS[k].from <= f);
    // 種族特化の依頼なら、その種が潜む部屋を選びやすく
    const favored = real.species ? rpool.filter(k => G.TRAP_ROOMS[k].den.some(d => d[0] === real.species)) : [];
    w.trapRooms = [];
    for (const r of cand.slice(0, nRooms)) {
      const key = favored.length && U.chance(0.6) ? U.pick(favored) : U.pick(rpool);
      if (!key) break;
      makeTrapRoom(w, r, key);
    }
    const nTrap = 1 + Math.floor(f / 4) + (U.chance(0.5) ? 1 : 0);
    for (let i = 0; i < nTrap; i++) {
      const id = U.pick(small), p = M.randomFloor(map, (x, y) => far(x, y) && !roomAt(w, x, y));
      if (p) spawnTrap(w, id, p.x, p.y);
    }
    if (lures.length && U.chance(0.4)) { const p = M.randomFloor(map, far); if (p) spawnTrap(w, U.pick(lures), p.x, p.y); }
    if (w.trapFloor) w.monsters.splice(0, Math.floor(w.monsters.length * 0.5));   // 罠の階は、通路の魔物は少なめ（部屋に潜んでいる）
    if (U.chance(0.6)) { const p = M.randomFloor(map, far); if (p) w.chests.push({ id: w.nextId++, x: p.x, y: p.y, open: false }); }
    if (run.law === "shumoku") for (let i = 0; i < 2; i++) { const p = M.randomFloor(map, far); if (p) spawnMonster(w, "peeper", p.x, p.y, false); }   // 衆目の法則：見物が増える
  }

  // 罠部屋を一つ作る：真ん中の仕掛け、散らした罠、眠って潜む魔物
  function makeTrapRoom(w, r, key) {
    const T = G.TRAP_ROOMS[key], map = w.map;
    const room = { key, T, r, x: r.x, y: r.y, w: r.w, h: r.h, cx: r.cx, cy: r.cy, active: false, members: [] };
    w.trapRooms.push(room);
    const inRoom = () => { for (let k = 0; k < 30; k++) { const x = U.ri(r.x, r.x + r.w - 1) + 0.5, y = U.ri(r.y, r.y + r.h - 1) + 0.5; if (M.walkable(map, x, y) && !w.traps.some(t => U.dist(t.x, t.y, x, y) < 1.1)) return { x, y }; } return null; };
    if (T.center) { const tr = spawnTrap(w, T.center, r.cx + 0.5, r.cy + 0.5); tr.room = room; }
    for (const t of T.traps || []) { const p = inRoom(); if (p) spawnTrap(w, t, p.x, p.y).room = room; }
    for (const [id, n] of T.den) for (let i = 0; i < n; i++) {
      const p = inRoom(); if (!p) continue;
      const m = spawnMonster(w, id, p.x, p.y, false);
      m.dormant = true; m.room = room; room.members.push(m);
    }
    return room;
  }
  // 罠部屋に踏み込んだ：扉が閉まり、潜んでいた魔物が目を覚ます
  function enterTrapRoom(w, room) {
    const h = w.run.h, T = room.T;
    room.active = true; room.t = 0;
    record(w, { kind: "trapRoom", room: room.key, roomName: T.name, type: T.type, sev: 1 });
    msg(w, "trapRoomIn", { room: T.name });
    say(w, "trapRoom", {});
    if (T.seal) { w.sealed = { room, t: T.seal }; msg(w, "sealed", {}); }
    const wake = () => { for (const m of room.members) if (m.hp > 0) { m.dormant = false; alertMon(w, m, 1); } if (room.members.length) msg(w, "denWake", { room: T.name }); };
    if (T.wake) room.wakeT = T.wake; else wake();
    room.wake = wake;
  }

  function makeBoss(m) {
    const d = Object.assign({}, m.d);
    d.name = m.d.name + "の長"; d.r = m.d.r * 1.45; d.spd = m.d.spd * 0.9;
    d.atk = Object.assign({}, m.d.atk, { power: m.d.atk.power * 1.4, range: (m.d.atk.range || 1) * 1.15 });
    m.d = d; m.boss = true; m.hp = m.maxHp = Math.round(m.maxHp * 4);
  }

  function spawnMonster(w, id, x, y, summoned) {
    const d = G.MONSTERS[id];
    const lv = LV[(w.run.real && w.run.real.level) || 2];
    const n = d.trio ? 3 : d.pair ? 2 : (d.pack && summoned) ? d.pack : 1;
    let last = null;
    for (let k = 0; k < n; k++) {
      let px = x, py = y;
      if (k) { const ox = x + U.rf(-0.7, 0.7), oy = y + U.rf(-0.7, 0.7); if (M.walkable(w.map, ox, oy)) { px = ox; py = oy; } }
      const m = {
        id: w.nextId++, kind: id, d, x: px, y: py, vx: 0, vy: 0, a: U.rf(0, Math.PI * 2), hp: Math.round(d.hp * lv.hp), maxHp: Math.round(d.hp * lv.hp), pow: lv.pow,
        alert: 0, cast: null, cd: U.rf(0.6, 1.6), stun: 0, holding: false, home: { x: px, y: py }, wanderT: 0, goal: null,
        summoned, flee: 0, fled: false, hidden: !!d.hidden, lastSeenH: null, flash: 0, hop: 0, rcl: 0, rclX: 0, lunge: 0, lungeA: 0,
        side: U.chance(0.5) ? 1 : -1,
      };
      w.monsters.push(m);
      if (summoned) w.dir.live++;
      last = m;
    }
    return last;
  }

  function spawnTrap(w, id, x, y) {
    const d = G.TRAPS[id];
    const tr = { id: w.nextId++, kind: id, d, x, y, armed: true, rearm: 0, found: false, active: 0 };
    w.traps.push(tr);
    return tr;
  }

  /* ================================================================ 小道具 */
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
  const MACHINE = ["ratchet", "karte", "exam", "capture", "pod", "drone_capture", "drone_tickle", "belt", "gate", "armor", "saddle"];
  const IMPS = ["imp", "futago", "inma", "muma_queen", "jikkyou", "kusuguri", "kazoe", "azakeri", "kuchizuke", "sakiimp", "utaimp", "hitomi"];
  function trait(w, id) { return ((w.run.save && w.run.save.traits) || {})[id] || 0; }
  // 快感の入り：堕ちの段階・敏感化・ハイ・その場面に噛み合った性癖
  // 熱：素の身体は、そう簡単には達しない。発情（媚薬・靄・匂い）と敏感化で、一気に達しやすくなる
  function heat(w) { const h = w.run.h; return (0.5 + 1.1 * (h.arousal / 100) + 0.06 * (h.sens || 0)) * (h.form === "magica" ? 0.8 : 1); }   // 変身中は、魔力の衣が熱を逃がす
  function intake(w, src) {
    const h = w.run.h, b = h.bound;
    let k = heat(w) * tierFx(w).pleasure * (1 + 0.07 * (h.sens || 0)) * (h.high > 0 ? 1.3 : 1) * (1 + 0.08 * (h.swell || 0));
    const amp = id => { k *= 1 + 0.12 * trait(w, id); };
    if (b) { amp("bindhabit"); if (b.by.length >= 2 || h.surrounded) amp("loser"); if (b.type === "蕩") amp("engulfCalm"); if (b.tickle) amp("ticklish"); if (b.src && MACHINE.includes(b.src.kind)) amp("rhythmSub"); }
    if (h.watched > 0) amp("publicHeat");
    if (h.deny || h.omazuke || w.run.law === "kinzetsu" || (b && b.edge)) amp("edgeweak");
    if (h.sigil) amp("sigilJoy");
    if (src && IMPS.includes(src.kind)) { amp("impLove"); if (h.impSweet) k *= 1.2; }
    if (h.attach && h.attach.some(a => a === "mushi" || a === "hibiki" || a === "hiru")) amp("wormCalm");
    if (h.futa) amp("shasei");
    if (h.pray > 0) amp("prayer");
    if (b && b.kiss) amp("kissHabit");
    return k;
  }
  // 抜け出す手際：同じ責めへの慣れ（性癖は戦力を減らさない）
  function resist(w) {
    const h = w.run.h, b = h.bound;
    let k = 1 + 0.05 * (trait(w, "bindhabit") + trait(w, "loser"));
    if (b && b.tickle) k += 0.06 * trait(w, "ticklish");
    if (b && b.src && MACHINE.includes(b.src.kind)) k += 0.06 * trait(w, "rhythmSub");
    if (b && b.type === "蕩") k += 0.06 * trait(w, "engulfCalm");
    if (w.run.law === "seishi") k *= 0.7;
    if (b && b.src && h.brand && b.src.kind === h.brand) k *= 0.8;     // 敗北洗脳：この相手には勝てない
    return k;
  }
  // 達するのを禁じられている（絶頂禁止・おあずけ・禁絶の法則）：溜まった分は取っておく
  function capped(w) { const h = w.run.h; return (h.deny && h.deny.t > 0) || !!h.omazuke || !!h.permit || w.run.law === "kinzetsu"; }
  // 溜まった分を一度に返す：まとめて何度も
  function releaseOverflow(w, amount, src, why) {
    const h = w.run.h;
    const n = Math.min(5, 1 + Math.floor(amount / 55));
    record(w, { kind: "release", type: "蕩", why, n, mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3 });
    for (let i = 0; i < n; i++) { h.pleasure = 100; checkClimax(w, src, true); }
    h.pleasure = Math.min(95, 40 + amount / 6);
    h.will = Math.max(0, h.will - Math.min(20, amount * 0.08));
    msg(w, "release", { c: n });
    return n;
  }
  // 魅了（好き）：種族ごとに Ⅰ〜Ⅲ。抗うほど、雑に扱われるほど募る
  function addCharm(w, m, gap) {
    const h = w.run.h, kind = m.kind;
    h.charm = h.charm || {}; h.charmT = h.charmT || {};
    if (w.t - (h.charmT[kind] ?? -99) < (gap || 12) || (h.charm[kind] || 0) >= 3) return;
    h.charmT[kind] = w.t; h.charm[kind] = (h.charm[kind] || 0) + 1;
    record(w, { kind: "charm", type: "惑", mon: kind, monName: m.d ? m.d.name : "", lv: h.charm[kind], sev: 1 + h.charm[kind] });
    msg(w, "charm", { mon: m.d ? m.d.name : "", lv: ["", "Ⅰ", "Ⅱ", "Ⅲ"][h.charm[kind]] });
    say(w, "charm" + h.charm[kind], { mon: m.d ? m.d.name : "" });
  }
  // 触れられるたびに、魅了が深まる（Game4 のナメクジ）。女王に触れられると、一族ごと
  const SLUGS = ["namekuji", "namequeen", "firstslug"];
  function charmTouch(w, src) {
    addCharm(w, src, 3);
    if (src.kind === "namequeen") addCharm(w, { kind: "namekuji", d: G.MONSTERS.namekuji }, 3);
    if (src.kind === "firstslug" && (src.grown || 0) > 50) { const h = w.run.h; if (h.charmT) h.charmT.firstslug = -99; addCharm(w, src, 0); }   // 濃くなった主は、一度に二段
  }
  // 付着体：身体に貼りついて、自分からは剥がれない
  const ATTACH = {
    orb:       { name: "震え珠", power: 1.0, flash: false },
    suit:      { name: "纏い衣", power: 0.8, flash: false, blind: true },   // 本人は「良い装備」だと思っている
    hoshibami: { name: "星喰み", power: 0.9, flash: true },
    sucker:    { name: "吸盤",   power: 0.6, flash: true },
    mushi:     { name: "潜り蟲", power: 0.8, flash: true },
    hibiki:    { name: "響き蟲", power: 1.3, flash: true },
    hiru:      { name: "肥大化ヒル", power: 0.9, flash: false, swell: true },
  };
  function addAttach(w, id, src) {
    const h = w.run.h, A = ATTACH[id];
    h.attach = h.attach || [];
    if (h.attach.length >= 4 || (id === "suit" && h.attach.includes("suit"))) return false;
    h.attach.push(id);
    if (A.swell) { h.swell = Math.min(3, (h.swell || 0) + 1); record(w, { kind: "swell", type: "蕩", lv: h.swell, sev: 2, monName: A.name }); msg(w, "swell", { c: h.swell }); }
    record(w, { kind: "attach", type: "蕩", att: id, attName: A.name, mon: src && src.kind, monName: src && src.d ? src.d.name : A.name, sev: A.blind ? 3 : 2, blind: !!A.blind, hidden: !!A.blind });
    msg(w, A.blind ? "suitOn" : "attach", { att: A.name });
    say(w, A.blind ? "suitOn" : "attach", { att: A.name });
    fx(w, { kind: "ring", x: h.x, y: h.y, color: "#ff9ad0", r: 0.5, life: 0.6 });
    return true;
  }
  // 変生（ふたなり）：生えた部位に溜まる射精感。100で射精。締環があれば溜まる一方
  function addCum(w, n, src) {
    const h = w.run.h;
    if (!h.futa || w.outcome) return;
    h.cum = (h.cum || 0) + n * intake(w, src);
    if (h.ring && h.cum >= 95) { h.ring.over += h.cum - 94; h.cum = 94; if (w.t - (h.ringT ?? -99) > 5) { h.ringT = w.t; msg(w, "ringFull", {}); say(w, "ringFull", {}); record(w, { kind: "edge", type: "蕩", sev: 2, monName: "締環" }); } return; }
    if (h.tipTease > 0 && h.cum >= 92) { h.cum = 92; return; }          // 先だけ撫でられている間は、行き着かない
    while (h.cum >= 100) {
      h.cum -= 88; h.shasei = (h.shasei || 0) + 1; h.will = Math.max(0, h.will - 5); h.arousal = Math.min(100, h.arousal + 8);
      record(w, { kind: "shasei", type: "蕩", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3, n: h.shasei });
      msg(w, "shasei", { c: h.shasei }); say(w, "shasei", {}); fx(w, { kind: "burst", x: h.x, y: h.y, color: "#fff4fa", life: 0.8 });
      if (h.shasei === 1 && !w.run.seenShasei) { w.run.seenShasei = true; openScene(w, "firstShasei", src); }
      if (h.countAltar && (w.run.save.futaMarks || 0) < 12) {   // 数取りの升が、一つ埋まる。升は減らない（十二で満ちる）
        const sv = w.run.save; sv.futaMarks = (sv.futaMarks || 0) + 1;
        msg(w, "countMark", { c: sv.futaMarks }); record(w, { kind: "countMark", sev: 2, n: sv.futaMarks });
        if (sv.futaMarks >= 12 && !sv.futaFixed) { sv.futaFixed = true; record(w, { kind: "futaFixed", sev: 3 }); openScene(w, "futaFixed", null); }
      }
    }
  }
  // 心のヒビ（教団）：防護壁に入ったヒビは、日をまたいで残り、少しずつ広がる
  function addCrack(w, n, src) {
    const h = w.run.h;
    const before = h.crack || 0; h.crack = Math.min(10, before + n);
    if (h.crack === before) return;
    record(w, { kind: "crack", type: "惑", lv: h.crack, mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: h.crack >= 5 ? 3 : 2 });
    msg(w, "crack", { c: h.crack }); if (h.crack === 1 || h.crack % 3 === 0) say(w, "crack", {});
  }
  // 祈り（教団）：教祖に惹かれた身体が、腰を揺らして祈ってしまう。祈りは魔力を吸い、甘い
  function pray(w, src, t) {
    const h = w.run.h;
    if (w.t < (h.prayNext ?? -99)) return;          // 祈り終えてしばらくは、また祈らされない
    h.prayNext = w.t + t + 10;
    h.pray = t; h.intent = null;
    h.pleasure += 8 * intake(w, src); drainMagic(w, 3, src);
    record(w, { kind: "pray", type: "惑", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 2 });
    msg(w, "pray", {}); say(w, "pray", {});
    checkClimax(w, src);
  }
  // 口づけ：口づけの印が残ると、次からは口づけだけで好きになる
  function kiss(w, m) {
    const h = w.run.h;
    h.kissN = (h.kissN || 0) + 1;
    record(w, { kind: "kiss", type: "惑", mon: m.kind, monName: m.d.name, sev: 2 });
    msg(w, "kiss", { mon: m.d.name }); say(w, "kiss", {});
    h.pleasure += 10 * intake(w, m); h.will = Math.max(0, h.will - 4);
    if (h.kissMark) addCharm(w, m, 3);
    else if (h.kissN >= 2) { h.kissMark = true; record(w, { kind: "kissMark", type: "惑", sev: 3, monName: m.d.name }); msg(w, "kissMark", {}); openScene(w, "kissMark", m); }
  }
  // 洗脳（ワルドー）：100で戦闘員化。最初の二度はプラムの光が引き戻す
  function addBrain(w, n, src) {
    const h = w.run.h, sv = w.run.save;
    if (w.outcome) return;
    h.brain = Math.min(100, (h.brain || 0) + n * mult(w, "惑") * (h.rewired ? 1.3 : 1));
    if (h.brain < 100) return;
    sv.waldo = sv.waldo || { rescues: 0, converted: 0 };
    if (sv.waldo.rescues < 2) {
      sv.waldo.rescues++; h.brain = 45;
      if (h.bound) release(w, true);
      record(w, { kind: "rescue", type: "惑", sev: 2, n: sv.waldo.rescues });
      msg(w, "rescue", {}); openScene(w, "rescue", src);
    } else {
      sv.waldo.rescues = 0; sv.waldo.converted++;
      h.rewired = true;
      record(w, { kind: "convert", type: "惑", sev: 3, mon: src && src.kind, monName: src && src.d ? src.d.name : "" });
      msg(w, "convert", {});
      w.outcome = "defeat"; w.defeatBy = "waldo"; w.run.converted = true;
      openScene(w, "convert", src);
    }
  }

  function mult(w, type) {
    const h = w.run.h, prep = G.PREP[w.run.stated];
    let k = G.HIKARI.resist[h.form][type] || 1;
    if (prep) k *= (prep.guard[type] || 1) * (prep.side[type] || 1);
    if (type === "蕩" && h.sigil) k *= 1 + 0.15 * h.sigil;       // 淫紋：刻まれた分だけ、熱が入りやすい
    if (type === "惑" && h.crack) k *= 1 + 0.05 * h.crack;      // 心のヒビ：防護壁の割れた分だけ、惑が通る
    return k;
  }
  function tierFx(w) { return TIER_FX[G.tier(w.run.save.body, w.run.save.mind)]; }
  // ひかりの学習：知っている相手ほど上手くあしらえる（見た1・倒した1・捕まった2・抜けた2・罠は掛かった2）
  function knowledge(w, kind) { const k = (w.run.save.know || {})[kind] || 0; return Math.min(1, k / 14); }
  function learn(w, kind, n) { const sv = w.run.save; if (!sv || !kind) return; sv.know = sv.know || {}; sv.know[kind] = (sv.know[kind] || 0) + n; }
  // 期待：その相手に気持ちよくされた分だけ、次に会った時、身体が先に思い出す
  function expectation(w, kind) { const e = ((w.run.save && w.run.save.lewd) || {})[kind] || 0; return Math.min(1, e / 30); }
  // 技（装備しているものだけが効く）と、閃き
  function sk(w, id) { const k = w.run.h.skills; return !!(k && k.includes(id)); }
  function inspire(w, how) {
    const h = w.run.h, sv = w.run.save;
    if (!sv || w.outcome || w.t - (h.inspT ?? -99) < 15) return;
    const pool = Object.keys(G.SKILLS).filter(id => G.SKILLS[id].how === how && !(sv.skills || {})[id]);
    if (!pool.length) return;
    h.inspT = w.t;
    const near = w.monsters.filter(m => m.hp > 0 && m.alert > 0 && U.dist(m.x, m.y, h.x, h.y) < 5).length;
    sv.insp = (sv.insp || 0) + 1;                                       // 閃かないほど、次は閃きやすい
    const p = 0.02 * (1 + 0.4 * near) * (how === "pinch" ? 2 : 1) * (1 + sv.insp * 0.04);
    if (!U.chance(p)) return;
    const id = U.pick(pool); sv.insp = 0;
    sv.skills = sv.skills || {}; sv.skills[id] = true;
    const slots = G.GROWTH.slots(sv.lv || 1); sv.equip = sv.equip || [];
    if (sv.equip.length < slots && !sv.equip.includes(id)) { sv.equip.push(id); h.skills = (h.skills || []).concat(id); }   // 空きがあれば、その場から使える
    record(w, { kind: "inspire", skill: id, skillName: G.SKILLS[id].name, sev: 0 });
    msg(w, "inspire", { skill: G.SKILLS[id].name }); say(w, "inspire", { skill: G.SKILLS[id].name });
    fx(w, { kind: "burst", x: h.x, y: h.y - 0.8, color: "#fff6a0", r: 0.6, life: 0.8 });
    fx(w, { kind: "sfx", text: "閃いた！", x: h.x, y: h.y - 1.4, life: 1.6, color: "#fff2a0" });
  }
  function crave(w, kind, n) { const sv = w.run.save; if (!sv || !kind) return; sv.lewd = sv.lewd || {}; sv.lewd[kind] = (sv.lewd[kind] || 0) + n; }

  /* ================================================================ 位置と移動 */
  function free(map, x, y, r) {
    return M.walkable(map, x, y) && M.walkable(map, x - r, y - r) && M.walkable(map, x + r, y - r) && M.walkable(map, x - r, y + r) && M.walkable(map, x + r, y + r);
  }
  function clearPath(map, a, bx, by, r) {
    const l = Math.hypot(bx - a.x, by - a.y), n = Math.max(1, Math.ceil(l / 0.25));
    for (let i = 1; i <= n; i++) { const t = i / n; if (!free(map, a.x + (bx - a.x) * t, a.y + (by - a.y) * t, r)) return false; }
    return true;
  }
  function move(w, e, vx, vy, dt, r) {
    const map = w.map, nx = e.x + vx * dt, ny = e.y + vy * dt;
    let moved = false;
    if (free(map, nx, e.y, r)) { e.x = nx; moved = true; } else e.vx *= 0.3;
    if (free(map, e.x, ny, r)) { e.y = ny; moved = true; } else e.vy *= 0.3;
    return moved;
  }
  // 見通せる一番先の中継点へ向かう方向（旧 Game5 の pathDir）。道は少しの間だけ覚えておく
  function pathDir(w, e, gx, gy, r, avoid) {
    const map = w.map;
    if (clearPath(map, e, gx, gy, r * 0.9)) { const l = Math.hypot(gx - e.x, gy - e.y) || 1; return { x: (gx - e.x) / l, y: (gy - e.y) / l, d: l }; }
    const c = e._pp;
    if (!c || Math.hypot(c.gx - gx, c.gy - gy) > 0.8 || w.t - c.t > 0.5) {
      e._pp = { gx, gy, t: w.t, pts: M.path(map, e.x, e.y, gx, gy, avoid) || [] };
    }
    const pts = e._pp.pts;
    if (!pts.length) return null;
    let best = pts[0];
    for (const p of pts) { if (clearPath(map, e, p.x, p.y, r * 0.9)) best = p; else break; }
    // 通り過ぎた中継点は捨てる
    while (pts.length > 1 && Math.hypot(pts[0].x - e.x, pts[0].y - e.y) < 0.4) pts.shift();
    const l = Math.hypot(best.x - e.x, best.y - e.y) || 1;
    return { x: (best.x - e.x) / l, y: (best.y - e.y) / l, d: Math.hypot(gx - e.x, gy - e.y) };
  }
  // 弾の太さで射線が通るか（細い線で「見える」だけでは、角に当たって消える）
  function shotClear(map, ax, ay, bx, by) {
    const l = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(l / 0.2));
    for (let i = 1; i < n; i++) { const t = i / n; if (!free(map, ax + (bx - ax) * t, ay + (by - ay) * t, 0.2)) return false; }
    return true;
  }
  // 射線の通る立ち位置を探す（相手から程よい距離で、今いる所から近い）
  function firingSpot(w, m) {
    const h = w.run.h;
    let best = null, bs = 1e9;
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2, r = U.rf(3.2, 5.2);
      const x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r;
      if (!free(w.map, x, y, HR) || !shotClear(w.map, x, y, m.x, m.y)) continue;
      const s = U.dist(x, y, h.x, h.y) + danger(w, { x, y }) * 0.05;
      if (s < bs) { bs = s; best = { x, y }; }
    }
    return best;
  }
  function turnTo(e, a, rate, dt) { const d = U.angDiff(e.a, a); e.a += U.clamp(d, -rate * dt, rate * dt); }

  /* ================================================================ 効き目 */
  function applyEffect(w, type, power, src, how) {
    const h = w.run.h, k = mult(w, type), tf = tierFx(w);
    if (type === "惑" || type === "蕩") { if (sk(w, "prism")) power *= 0.82; if (power >= 0.5) inspire(w, "hit"); }
    const name = src ? (src.d ? src.d.name : "") : "";
    const sev = k * power >= 1.6 ? 2 : 1;
    if (type === "惑") {
      const was = h.trance > 0;
      if (trait(w, "hypnoObey")) power *= 1 + 0.1 * trait(w, "hypnoObey");
      h.hyp = Math.min(100, (h.hyp || 0) + 26 * power * k);          // 催眠度：一気に上がり、なかなか抜けない
      if (!(h.clearT > w.t)) h.trance = Math.max(h.trance, (1.0 + h.hyp / 70) * power * k);   // ルミナは、すぐ我に返る
      h.tranceSrc = name; h.tranceMax = Math.max(h.trance, h.tranceMax && was ? h.tranceMax : 0);
      h.hypno = how === "lure" ? "魅了" : (src && ["mind_roper", "gazer", "bell"].includes(src.kind)) || power * k >= 0.9 || h.hyp >= 50 ? "催眠" : "惑い";
      h.arousal = Math.min(100, h.arousal + 6 * power * k);
      if (how === "lure" && src) h.lureTo = { x: src.x, y: src.y };
      record(w, { kind: "trance", type, mon: src && src.kind, monName: name, sev, hidden: k * power > 1.2 && U.chance(0.45) });
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#b890ff", life: 0.8 });
      if (!was) { msg(w, how === "lure" ? "lured" : h.hypno === "催眠" ? "hypno" : "trance", { mon: name }, 2); if (!h.bubble || h.bubble.t < 1) say(w, "trance", { mon: name }); }
    } else if (type === "蕩") {
      h.arousal = Math.min(100, h.arousal + 15 * power * k);
      h.pleasure += 5 * power * k * intake(w, src);
      if (h.futa) addCum(w, 3.5 * power * k, src);
      h.slow = Math.max(h.slow, 4 * power);
      record(w, { kind: "arouse", type, mon: src && src.kind, monName: name, sev });
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#ff8ab8", life: 0.8 });
      msg(w, "arouse", { mon: name }, 3);
      if (!h.bubble || h.bubble.t < 1) say(w, "arouse", { mon: name });
    } else if (type === "削") {
      drainMagic(w, 4 * power * k, src);
      h.mp = Math.max(0, h.mp - 3 * power * k);
      record(w, { kind: "drain", type, mon: src && src.kind, monName: name, sev: 1 });
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#7fe8ff", life: 0.8 });
      msg(w, "drain", { mon: name }, 3);
    }
    checkClimax(w, src);
  }

  function drainMagic(w, amt, src) {
    const h = w.run.h;
    if (h.form !== "magica") return;
    const key = src ? (src.kind || "?") : "none";
    amt *= 0.5;                                     // 魔力は、そう簡単には尽きない（変身を保つ力は強い）
    h.drainLog = h.drainLog || {}; h.drainLog[key] = (h.drainLog[key] || 0) + Math.min(amt, h.magic);
    h.magic = Math.max(0, h.magic - amt);
    if (h.magic <= 0) untransform(w, src);
  }
  function untransform(w, src) {
    const h = w.run.h;
    if (h.form !== "magica") return;
    h.form = "civilian"; h.cast = null; h.noTransform = G.HIKARI.noTransform;
    record(w, { kind: "untransform", type: "削", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3 });
    logLine(w, G.Text.log("untransform", {}), "heavy");
    msg(w, "untransform", {});
    fx(w, { kind: "burst", x: h.x, y: h.y, color: "#ffd0ec", life: 1.2 });
    openScene(w, "untransform", src);
  }
  function checkClimax(w, src, forced) {
    const h = w.run.h;
    if (!forced && h.pleasure >= 96 && capped(w)) {        // 栓をされている：あと少しで止まり、溢れた分が溜まる
      const over = h.pleasure - 95;
      h.pleasure = 95;
      const box = h.deny && h.deny.t > 0 ? h.deny : h.omazuke || h.permit || (h.kinOver = h.kinOver || { over: 0 });
      box.over = (box.over || 0) + over;
      if (w.t - (h.edgeT ?? -99) > 4) {
        h.edgeT = w.t; record(w, { kind: "edge", type: "蕩", sev: 2, mon: src && src.kind, monName: src && src.d ? src.d.name : "" }); msg(w, "edgeCap", {}); say(w, "edgeCap", {});
        // 絶頂許可制：三度止められると、許しを乞うてしまう。乞えば、許しが出る
        if (box === h.permit && ++h.permit.edges >= 3) {
          const o = h.permit.over; h.permit = null;
          record(w, { kind: "beg", type: "惑", mon: "keiyaku", monName: "淫魔の契約", sev: 3 }); openScene(w, "permitBeg", null);
          releaseOverflow(w, o + 50, { kind: "keiyaku", d: { name: "淫魔の契約", type: "惑" } }, "permit");
        }
      }
      return;
    }
    if (h.pleasure < 100) return;
    h.pleasure = 22 + 8 * trait(w, "squirthabit"); h.climax++; h.lastClimaxT = w.t;
    if (h.futa) addCum(w, 30, src);
    h.will = Math.max(0, h.will - 5);
    h.trance = Math.max(h.trance, 1.6);
    const e = record(w, { kind: "climax", type: src && src.d ? src.d.type : "蕩", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3, bound: !!h.bound });
    logLine(w, G.Text.log("climax", { mon: e.monName }), "heavy");
    const la = h.bound && h.bound.last && w.t - h.bound.last.t < 2.5 ? h.bound.last : null;
    if (h.bound) { h.bound.climaxN = (h.bound.climaxN || 0) + 1; h.bound.built = false; h.bound.overSaid = false; }
    w.feedMute = true;          // この一瞬は、下の「決壊」の流れでまとめて見せる
    if (la) { e.act = la.p; e.monName = e.monName || la.mon; actMsg(w, "climaxAct", { p: la.p, mon: la.mon }); if (h.bound.ev) h.bound.ev.climaxActs = (h.bound.ev.climaxActs || []).concat(la.p); }
    else msg(w, "climax", {});
    fx(w, { kind: "burst", x: h.x, y: h.y, color: "#ff9ccc", life: 1.0 });
    fx(w, { kind: "sfx", text: U.pick(["びくんっ♡", "——っ♡", "びくびくっ", "ぷしゃっ"]), x: h.x, y: h.y - 1.5, life: 1.4, color: "#ff5fa0" });
    say(w, "climax", {});
    w.feedMute = false;
    {
      const sv = w.run.save, part = la && la.part, cp = sv ? (sv.climaxParts = sv.climaxParts || []) : [];
      const first = part && G.Text.live.hasFirst(part) && !cp.includes(part) ? part : null;
      if (first) e.first = first;
      if (h.bound && h.bound.climaxN > 1) e.chain = h.bound.climaxN;
      if (first) { cp.push(first); (w.run.firstParts = w.run.firstParts || []).push({ part: first, mon: la ? la.mon : "" }); }
      const cat = la && la.kind ? G.Text.actorOf(la.kind) : src && src.kind ? G.Text.actorOf(src.kind) : null;
      for (const l of G.Text.live.climax({ chain: h.bound ? h.bound.climaxN : 1, tier: G.tier(w.run.save.body, w.run.save.mind), squirt: (e.squirt = U.chance(trait(w, "squirthabit") ? 0.5 : h.bound && h.bound.climaxN >= 3 ? 0.35 : 0)), part, cat, mon: la ? la.mon : (src && src.d ? src.d.name : null), n: heroName(w), firstPart: first })) feed(w, l.cls, l.text);
      feed(w, "pause", "……………………");
      feed(w, "after", G.Text.live.after({ n: heroName(w) }));
      h.recoverAt = w.t + 3.2;
    }
    for (const m of w.monsters) if (m.hp > 0 && !m.alert && U.dist(m.x, m.y, h.x, h.y) < 7 && G.Text.actorOf(m.kind)) { alertMon(w, m, 0.8); m.lastSeenH = { x: h.x, y: h.y }; }   // 声が、迷宮に響く
    { const vm = w.monsters.filter(m => m.hp > 0 && G.Text.hasVoice(m.kind) && U.dist(m.x, m.y, h.x, h.y) < 6).sort((a, b) => U.dist(a.x, a.y, h.x, h.y) - U.dist(b.x, b.y, h.x, h.y))[0]; if (vm) monSay(w, vm, "climax", 0.8); }
    // 覗き目玉：見られながら達した姿は、記録に残る
    const eye = w.monsters.find(m => m.hp > 0 && m.d.atk.film && U.dist(m.x, m.y, h.x, h.y) < 6.5 && M.los(w.map, m.x, m.y, h.x, h.y));
    if (eye) { record(w, { kind: "filmed", type: "惑", mon: eye.kind, monName: eye.d.name, sev: 3 }); msg(w, "filmed", { mon: eye.d.name }); fx(w, { kind: "flashCam", x: eye.x, y: eye.y, life: 0.4 }); }
    // 憑き手は、宿主が果てると離れる
    if (h.possess) endPossess(w, true);
    // 格下に達しさせられると、本人の意志と無関係に「好き」が芽生える
    if (!forced && h.bound && src && src.d && src.d.spd !== undefined && ["goblin", "waldo_grunt", "slime", "nikubana", "gulper_worm", "namekuji", "mitsusui", "firstslug"].includes(src.kind) && U.chance(0.45)) addCharm(w, src, 20);
  }
  // 淫紋を刻む（その潜行のあいだ蕩が効きやすくなる。帰還後は状態異常「淫紋」として残る）
  function engraveSigil(w, n, src) {
    const h = w.run.h, before = h.sigil || 0;
    h.sigil = Math.min(3, before + n);
    if (h.sigil === before) return;
    record(w, { kind: "sigil", type: "蕩", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: h.sigil >= 2 ? 3 : 2, lv: h.sigil });
    msg(w, "sigil", { lv: h.sigil });
    say(w, "sigil", {});
    fx(w, { kind: "ring", x: h.x, y: h.y, color: "#ff5fa8", r: 0.8, life: 1.0 });
  }
  // 憑き手：腕に憑かれる／離れる
  function possess(w, m) {
    const h = w.run.h, A = m.d.atk;
    if (h.possess || h.bound) return false;
    const k = mult(w, "惑");
    h.possess = { t: A.dur * U.clamp(k * 1.4, 0.6, 1.6), mon: m.kind, monName: m.d.name, t0: w.t };
    h.cast = null; h.cdShot = Math.max(h.cdShot, 0.5);
    h.possess.ev = record(w, { kind: "possess", type: "惑", mon: m.kind, monName: m.d.name, sev: 2 });
    m.hp = 0; if (m.summoned) w.dir.live = Math.max(0, w.dir.live - 1);   // 手は腕の中へ入った
    logLine(w, G.Text.log("possess", { mon: m.d.name }), "mid");
    msg(w, "possess", { mon: m.d.name });
    say(w, "possess", { mon: m.d.name });
    fx(w, { kind: "ring", x: h.x, y: h.y, color: "#e8ecff", life: 0.8 });
    if (!w.run.seenPossess) { w.run.seenPossess = true; openScene(w, "possess", m); }
    return true;
  }
  // 状態異常の時間経過（毎コマ）
  function tickStatus(w, dt) {
    const h = w.run.h;
    if (w.outcome) return;
    for (const k of ["numb", "high", "ache", "freeze", "sniff", "salute", "pray", "tipTease"]) if (h[k] > 0) h[k] = Math.max(0, h[k] - dt);
    if (h.pray > 0) { h.pleasure += 3 * intake(w) * dt; h.vx = h.vy = 0; }
    // 数え歌：十数えるあいだに声が漏れたら負け。負けても勝っても、寸前で置き去り
    if (h.countGame) {
      const g = h.countGame; g.t -= dt;
      const n = Math.min(10, Math.floor(10 - g.t) + 1); if (n > g.n) { g.n = n; if (n > 1) msg(w, "countTick", { c: n }); }
      if (!g.lost && (h.pleasure - g.p0 > 16 || h.climax > g.c0)) { g.lost = true; msg(w, "countLose", { mon: g.monName }); say(w, "countLose", {}); }
      if (g.t <= 0) {
        h.countGame = null;
        record(w, { kind: "countGame", type: "惑", mon: g.mon, monName: g.monName, lost: g.lost, sev: g.lost ? 3 : 2 });
        h.pleasure = Math.max(h.pleasure, 93);
        h.deny = { t: g.lost ? 12 : 5, over: (h.deny && h.deny.over) || 0, mon: g.mon, monName: g.monName };
        openScene(w, g.lost ? "countLost" : "countWon", { kind: g.mon, d: G.MONSTERS[g.mon] });
      }
    }
    // 敏感化はゆっくり引く（翌日に残るのは過敏として）
    if (h.sens > (h.sensBase || 0)) { h.sensT = (h.sensT || 0) + dt; if (h.sensT > 35) { h.sensT = 0; h.sens--; } }
    // 疼き：熱が引かない
    if (h.ache > 0) { h.arousal = Math.max(h.arousal, 30); h.pleasure += 1.1 * intake(w) * dt; }
    // 時間停止：動けないのに、感覚だけ積もる
    if (h.freeze > 0) { h.pleasure += 2.2 * intake(w) * dt; h.vx = h.vy = 0; }
    // 付着体：自分からは剥がれない。ずっと
    if (h.attach && h.attach.length) {
      let p = 0; for (const id of h.attach) p += ATTACH[id].power;
      h.pleasure += 0.7 * p * mult(w, "蕩") * intake(w) * dt; h.arousal = Math.min(100, h.arousal + 0.3 * p * dt);
      if (U.chance(dt * 0.12)) msg(w, h.attach.includes("suit") && h.attach.length === 1 ? "suitMove" : "attachMove", { att: ATTACH[h.attach[0]].name }, 6);
      checkClimax(w, { d: { name: ATTACH[h.attach[0]].name, type: "蕩" }, kind: h.attach[0] });
    }
    // 絶頂禁止：時間が来たら、溜まった分が一度に来る
    if (h.deny) { h.deny.t -= dt; if (h.deny.t <= 0) { const o = h.deny; h.deny = null; if (o.over > 8 && !o.queen) { releaseOverflow(w, o.over, { kind: o.mon, d: { name: o.monName, type: "惑" } }, "deny"); } else if (!o.queen) msg(w, "denyEnd", {}); } }
    // 暗示の引き金：前触れなく、無様の発作
    if (h.trigger) { h.trigT = (h.trigT ?? U.rf(20, 40)) - dt; if (h.trigT <= 0 && !h.bound) { h.trigT = U.rf(22, 45); h.freeze = 1.2; h.pleasure += 12 * intake(w); record(w, { kind: "fit", type: "惑", sev: 2 }); msg(w, "fit", {}); say(w, "fit", {}); } }
    // 洗脳はゆっくり薄れる
    if (h.brain > 0) h.brain = Math.max(0, h.brain - 0.15 * dt);
    // 潤沢の法則：空気そのものが媚薬
    if (w.run.law === "juntaku") h.arousal = Math.min(100, h.arousal + 0.2 * dt);
    checkClimax(w, null);
  }
  function endPossess(w, climaxed) {
    const h = w.run.h, p = h.possess;
    if (!p) return;
    if (p.ev) p.ev.dur = +(w.t - p.t0).toFixed(1);
    h.possess = null;
    msg(w, climaxed ? "possessOffClimax" : "possessOff", { mon: p.monName });
    say(w, "possessOff", {});
  }

  /* ---- 捕まる・振りほどく ---- */
  function grab(w, src, power, type) {
    const h = w.run.h;
    if (h.ifr > 0 && src.d && src.d.spd !== undefined) return false;
    if (!h.bound && sk(w, "veil") && !h.veilUsed && src.d && src.d.spd !== undefined) {   // ルミナ・ヴェール：階ごとに一度、掴む手を弾く
      h.veilUsed = true; h.ifr = 0.6; msg(w, "veil", { mon: src.d.name }); h.bubble = { text: "ルミナ・ヴェール！", t: 1.2 };
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#fff2c0", r: 1.2, life: 0.6 }); return false;
    }
    if (h.bound) {
      if (h.bound.by.length >= 5 || h.bound.by.includes(src.id)) return false;
      h.bound.by.push(src.id); h.bound.power += power * 0.6;       // 数が増えるほど、振りほどけない
      if (src.d && src.d.spd !== undefined) monSay(w, src, "grab", 0.6);
      actMsg(w, "swarm", { mon: src.d.name, c: h.bound.by.length + w.monsters.filter(m => m.molest && m.hp > 0).length });
      if (h.bound.by.length >= 3) actBub(w, "swarm");
      if (src.d && src.d.pack) callPack(w, src);
      if (src.d && src.d.atk && src.d.atk.charmTouch) charmTouch(w, src);
      return true;
    }
    h.bound = { by: [src.id], power, type: type || "絡", t: 0, struggle: 0, src, acts: 0, stage: 0, actT: 0.5 };
    if (src.d && src.d.pack) callPack(w, src);
    const A = src.d && src.d.atk;
    if (A && src.d.spd !== undefined) {                 // 魔物ごとの捕まえ方
      if (A.wire) Object.assign(h.bound, { wire: true, slowStruggle: 0.8 });
      if (A.tickle) Object.assign(h.bound, { tickle: true });
      if (A.develop) Object.assign(h.bound, { develop: true, slowStruggle: 0.7 });
      if (A.brief) h.bound.brief = A.brief;
      if (A.sens) h.sens = Math.min(5, (h.sens || 0) + A.sens);
      if (A.futaSuck) h.bound.futaSuck = A.futaSuck;
      if (A.mud) { h.slow = Math.max(h.slow, 4); h.bound.slowStruggle = 0.75; }
      if (A.kiss) { h.bound.kiss = true; kiss(w, src); }
      if (A.charmTouch) charmTouch(w, src);
    }
    h.cast = null; h.vx = h.vy = 0;
    if (src.d && src.d.spd !== undefined) monSay(w, src, "grab", 0.8);
    const e = record(w, { kind: "hold", type: type || "絡", mon: src.kind, monName: src.d.name, sev: 2 });
    h.bound.ev = e;
    logLine(w, G.Text.log("hold", { mon: src.d.name }), "mid");
    msg(w, "grab", { mon: src.d.name });
    if (src.kind && expectation(w, src.kind) > 0.35) say(w, "anticipateGrab", { mon: src.d.name }); else say(w, "held", { mon: src.d.name });
    return true;
  }
  // 群れで来る種：一体が捕まえると、仲間を呼ぶ
  function callPack(w, src) {
    for (const m of w.monsters) if (m.hp > 0 && m !== src && m.kind === src.kind && U.dist(m.x, m.y, src.x, src.y) < 9) alertMon(w, m, 1);
  }
  function release(w, broke) {
    const h = w.run.h, b = h.bound;
    if (!b) return;
    for (const m of w.monsters) if (m.molest) { m.molest = false; if (broke) { m.stun = 1.2; knock(w, m, U.angle(h.x, h.y, m.x, m.y), 0.8); } m.cd = Math.max(m.cd, 2); }
    for (const id of b.by) {
      const m = w.monsters.find(x => x.id === id);
      if (m) { m.holding = false; m.stun = broke ? 1.6 : 0.6; m.cd = 2.5; m.rcl = 0.3; m.rclX = Math.sign(m.x - h.x) || 1; knock(w, m, U.angle(h.x, h.y, m.x, m.y), 1.0); }
      const tr = w.traps.find(x => x.id === id);
      if (tr) { tr.armed = false; tr.rearm = tr.d.rearm; }
    }
    if (b.ev) { b.ev.dur = +b.t.toFixed(1); if (b.t > 3.5) b.ev.sev = 3; }
    // 捕まっていた間のまとめ：何回・どこを・何回達したか、そして今どんな有様か
    if ((b.acts || 0) >= 2) {
      const top = b.ev && b.ev.acts ? Object.entries(b.ev.acts).sort((a, c) => c[1] - a[1]).slice(0, 2).map(([k]) => k).join("と") : "";
      const look = h.pleasure > 70 ? "脚が 震えて、まともに 立てない" : b.climaxN >= 2 ? "膝が 笑って、壁に 手を ついた" : b.climaxN ? "達した 余韻が 抜けず、内腿が まだ 震えている" : b.stage >= 2 ? "乱れた 服を 直す 指が 震えている" : "息を 整えながら、服の 裾を 直した";
      pushMsg(w, `——${b.t.toFixed(0)}秒、${b.acts}回 触れられた${top ? "（" + top + "）" : ""}${b.climaxN ? "。絶頂 " + b.climaxN + "回" : ""}。${heroName(w)}は ${look}……`, "after");
    }
    if (broke) {                                    // 群れは、逃げた獲物をすぐ追い直す
      for (const m of w.monsters) if (m.hp > 0 && m.d.pack && !b.by.includes(m.id) && !m.molest && U.dist(m.x, m.y, h.x, h.y) < 5) { alertMon(w, m, 1); m.cd = 0; m.pounceCd = 0; }
    }
    if (broke) { h.lastEscT = w.t; say(w, "breakFree", {}); msg(w, "free", {}); fx(w, { kind: "burst", x: h.x, y: h.y, color: "#fff2a8", life: 0.6 }); if (b.src) learn(w, b.src.kind, 2); record(w, { kind: "escape", mon: b.src && b.src.kind, monName: b.src && b.src.d ? b.src.d.name : "", sev: 0 }); }
    h.bound = null; h.unboundT = w.t;
    h.trance = Math.max(h.trance, 0.3);
    h.think = Math.max(h.think || 0, broke ? 0.9 : 0.6); h.label = "息を整える";   // 抜けた直後は、よろめいて立て直す
  }
  function knock(w, m, a, dist) {
    const nx = m.x + Math.cos(a) * dist, ny = m.y + Math.sin(a) * dist;
    if (free(w.map, nx, ny, m.d.r * 0.6)) { m.x = nx; m.y = ny; }
  }
  // 捕まえている相手・まとわりついている相手のうち、触れてくる者
  function actCat(w, src) {
    const h = w.run.h;
    let c = G.Text.actorOf(src.kind);
    if (!c) return null;                                            // 縛るだけの罠・機械
    if (h.futa && c !== "watch" && c !== "tickle" && U.chance(src.d && src.d.futa ? 0.75 : 0.3)) c = "futa";
    return c;
  }
  function lewdTick(w, dt) {
    const h = w.run.h, b = h.bound, tf = tierFx(w);
    const srcs = [];
    for (const id of b.by) { const s = w.monsters.find(x => x.id === id && x.hp > 0) || w.traps.find(t => t.id === id); if (s) srcs.push(s); }
    for (const m of w.monsters) if (m.molest && m.hp > 0 && !b.by.includes(m.id)) srcs.push(m);
    const acts = srcs.filter(s => G.Text.actorOf(s.kind));
    const touching = acts.filter(s => G.Text.actorOf(s.kind) !== "watch");
    b.nAct = touching.length;
    if (!acts.length) {                                              // 縛られているだけ
      b.idleT = (b.idleT || 0) + dt;
      if (b.idleT > 2 && U.chance(dt * 0.3)) { actMsg(w, "alone", { trap: b.src.d ? b.src.d.name : "" }); if (U.chance(0.5)) actBub(w, "alone"); }
      return;
    }
    b.actT -= dt;
    if (b.actT > 0) return;
    const n = Math.max(1, touching.length);
    b.actT = U.rf(0.9, 1.4) / (1 + 0.28 * (n - 1));
    b.acts++;
    // 段階：服の上から → 服の中 → 直接。時間・回数・装束の損壊・発情で進む
    const st = (b.acts >= 7 || b.t > 8 || (h.exposure && b.acts >= 3)) ? 2 : (b.acts >= 3 || b.t > 3.5 || h.exposure || h.arousal > 60) ? 1 : 0;
    const who = acts[b.acts % acts.length], name = who.d ? who.d.name : "";
    if (st > b.stage) { b.stage = st; actMsg(w, "stage" + st, { mon: name }); if (st === 2) actBub(w, "touch2"); }
    const cat = actCat(w, who), act = G.Text.actFor(who.kind, cat, b.stage);
    if (!act) return;
    pushMsg(w, G.Text.fillAct(act, { mon: name, n: heroName(w) }) + "……", "act");
    if (who.d && who.d.spd !== undefined) monSay(w, who, "act", 0.45);
    fx(w, { kind: "sfx", text: act.fx, x: h.x + U.rf(-0.6, 0.6), y: h.y - U.rf(0.7, 1.3), life: 1.2, color: act.watch ? "#d8c8ff" : "#ffb3d6" });
    if (act.fx && U.chance(0.5)) feed(w, "sfx", act.fx);
    for (const m of w.monsters) if (m.hp > 0 && !m.alert && U.dist(m.x, m.y, h.x, h.y) < 4.5 && G.Text.actorOf(m.kind)) alertMon(w, m, 0.6);   // 声が、近くの魔物を呼ぶ
    if (act.watch) { h.watched = 1.5; h.arousal = Math.min(100, h.arousal + 2.5); if (U.chance(0.5)) actBub(w, "watched"); return; }
    const k = mult(w, "蕩"), swarm = (1 + 0.18 * (n - 1)) * (n >= 3 ? 1 + 0.1 * trait(w, "swarmHabit") : 1);
    const over = w.t - (h.lastClimaxT ?? -99) < 5 ? 1.2 : 1;          // 達したばかりの身体は、敏感すぎる
    if (over > 1 && !b.overSaid && !act.watch) { b.overSaid = true; feed(w, "after", G.Text.live.oversens()); }
    const gain = over * 6.0 * act.pw * (who.pow || 1) * k * intake(w, who) * swarm * tf.pleasure * (w.run.law === "seishi" ? 0.8 : 1) * (act.tickle ? 0.7 : 1) * (sk(w, "heartlock") ? 0.82 : 1);
    if (act.cum && h.futa) addCum(w, 11 * act.pw * swarm * intake(w, who), who); else h.pleasure += gain;
    h.arousal = Math.min(100, h.arousal + 3.2 * act.pw * k);
    if (act.tickle) h.will = Math.max(0, h.will - 3);
    if (act.edge) h.pleasure = Math.min(h.pleasure, 94);
    if (b.ev) { b.ev.acts = b.ev.acts || {}; b.ev.acts[act.part] = (b.ev.acts[act.part] || 0) + 1; b.ev.stage = b.stage; b.ev.n = Math.max(b.ev.n || 1, n); }
    b.last = { p: act.p, mon: name, kind: who.kind, part: act.part, t: w.t };
    crave(w, who.kind, 0.25 * act.pw);
    { const sv = w.run.save; if (sv) { sv.parts = sv.parts || {}; const pp = sv.parts[who.kind] || (sv.parts[who.kind] = {}); pp[act.part] = (pp[act.part] || 0) + 1; } }
    // 吹き出し：触れはじめ／くすぐり／段階ごとの喘ぎ。限界の手前では、言葉が崩れていく
    if (h.pleasure >= 84 && !b.built && !act.edge) { b.built = true; const t = G.Text.live.build(G.tier(w.run.save.body, w.run.save.mind), heroName(w)); h.bubble = { text: t.replace(/^……/, "").slice(0, 16) + "……", t: 2.4 }; feed(w, "line build", "「" + t + "」"); }
    else if (b.acts === 1) actBub(w, act.tickle ? "tickleLaugh" : "touch");
    else if (act.tickle && U.chance(0.6)) actBub(w, "tickleLaugh");
    else if (h.pleasure < 80 && U.chance(0.35) && G.Text.actBubble("p:" + act.part)) actBub(w, "p:" + act.part);   // 触られた所への反応
    else if (U.chance(0.6)) actBub(w, h.pleasure < 45 ? "moan1" : h.pleasure < 80 ? "moan2" : "moan3");
    // 心の声（数回に一度）
    if (b.acts % 5 === 3) feed(w, "mind", G.Text.live.mind({ name: heroName(w), n, watched: h.watched > 0, expect: expectation(w, who.kind), stage: b.stage, tier: G.tier(w.run.save.body, w.run.save.mind) }));
    // どこまで溜まったか
    const lv = h.pleasure >= 88 ? 3 : h.pleasure >= 70 ? 2 : h.pleasure >= 45 ? 1 : 0;
    if (lv > (b.heat || 0)) { b.heat = lv; actMsg(w, "heat" + lv, { c: Math.round(h.pleasure) }); }
    checkClimax(w, who);
    if (h.pleasure < 45) b.heat = 0;
  }
  function updateBound(w, dt) {
    const h = w.run.h, b = h.bound, tf = tierFx(w);
    b.t += dt;
    b.by = b.by.filter(id => w.monsters.some(m => m.id === id && m.hp > 0) || w.traps.some(t => t.id === id));
    if (!b.by.length) { release(w, false); return; }
    const k = mult(w, b.type), p = b.power;
    h.hp = Math.max(0, h.hp - 0.6 * p * dt);
    h.will = Math.max(0, h.will - 1.25 * p * k * tf.will * dt);   // ルミナは心が強い      // 拘束は長く見せる分、一秒あたりは緩め
    // 縛られているだけでは、熱は上がらない。触れられて、はじめて上がる
    lewdTick(w, dt);
    if (!h.bound) return;
    for (const id of b.by) { const m = w.monsters.find(x => x.id === id); if (m && m.d.atk.drain) drainMagic(w, m.d.atk.drain * dt, m); }
    if (h.kit.knife > 0 && b.t > 0.8 && !b.knifed && b.type === "絡" && !b.noKnife) { b.knifed = true; h.kit.knife--; b.struggle += 0.6; msg(w, "item", { item: "縄抜けの小刀" }); record(w, { kind: "item", item: "knife", sev: 0 }); }
    const arms = b.by.length + (b.shadow && b.shadow.arms >= 4 ? 1 : 0);      // 影の腕が増えたら、二か所以上に掴まれたのと同じ
    if (h.form === "magica" && !b.noFlash && h.cdFlash <= 0 && h.mp >= G.HIKARI.flash.cost && h.trance <= 0 && !b.wait && b.t > 1.8 && (arms >= 2 || (b.t > 2.6 && pressure(w, h.x, h.y, 2.4).n >= 3))) { flash(w); return; }
    const prep = G.PREP[w.run.stated];
    let rate = (0.2 + h.will / 260) * (h.form === "magica" ? 1.25 : 0.7) * tf.struggle / Math.max(0.5, k * p) * (b.slowStruggle || 1) * resist(w);
    rate /= 1 + 0.25 * (b.nAct > 1 ? b.nAct - 1 : 0);                // 群がられるほど、もがく隙がない
    if (h.pleasure > 70) rate *= 0.75;                                 // 気持ちよさで、力が入らない
    if (prep && prep.slow && b.type === "絡") rate *= 0.8;
    rate *= 1 + knowledge(w, b.src.kind) * 0.35;        // 知っている相手ほど、抜け方が分かる
    rate *= 1 - 0.12 * ((h.charm && h.charm[b.src.kind]) || 0);   // 好きな相手の腕は、本気で振りほどけない（魅了拘束）
    rate *= 1 - expectation(w, b.src.kind) * 0.3;       // 気持ちよさを覚えている相手だと、本気で振りほどけない
    if (sk(w, "hodoki")) rate *= 1.3;
    if (b.t < 2.4) rate *= 0.25;                           // 捕まった直後は、まず何もできない
    if (h.will < 25) rate *= 1.5;                          // 追い詰められて、最後の力を振り絞る
    if (!b.nAct) rate *= 1.8;                              // 縛られているだけ（誰も触れてこない）なら、落ち着いて解ける
    b.struggle += rate * 0.9 * dt;
    if (U.chance(dt * 0.8)) msg(w, "struggle", {}, 2.5);
    if (b.struggle > 0.7 && !b.almost) { b.almost = true; msg(w, "almostFree", {}); inspire(w, "struggle"); }
    if (b.edge) { h.pleasure = Math.min(h.pleasure, 96); h.will = Math.max(0, h.will - 2.2 * dt); if (b.t > 2 && U.chance(dt * 0.6)) msg(w, "edge", {}, 3); }
    if (b.pillory) { h.watched = 0.4; h.arousal = Math.min(100, h.arousal + 1.2 * dt); }
    // 吊花：逆さのまま、蜜が一定の間隔で垂れてくる
    if (b.hang) { b.dripT = (b.dripT || 0) + dt; if (b.dripT > 1.6) { b.dripT = 0; h.arousal = Math.min(100, h.arousal + 3 * k); h.pleasure += 3.5 * k * tf.pleasure * heat(w); msg(w, "budDrip", {}, 4); } }
    // 白繭：湿った熱が、中にこもっていく
    if (b.cocoon) { h.arousal = Math.min(100, h.arousal + 1.6 * dt); if (U.chance(dt * 0.3)) msg(w, "cocoonHeat", {}, 5); }
    // 蝕根：床下で何が起きているかは、上からは見えない
    if (b.root && U.chance(dt * 0.35)) msg(w, "rootUnder", {}, 5);
    // 爪車：もがくたびに一歯。戻る歯はない。決まった時間で開く
    if (b.ratchet) {
      b.ratchet.t += dt;
      if (b.ratchet.t > 2) { b.ratchet.t = 0; b.ratchet.n++; b.struggle = Math.max(0, b.struggle - 0.14); h.pleasure += 6 * k * tf.pleasure * heat(w); msg(w, "ratchet", { c: b.ratchet.n }, 1.5); }
      if (b.t >= b.ratchet.open) { msg(w, "ratchetOpen", {}); release(w, false); return; }
    }
    // 影腕：時とともに腕が増える
    if (b.shadow) { b.shadow.t += dt; if (b.shadow.t > 1.8 && b.shadow.arms < 8) { b.shadow.t = 0; b.shadow.arms += 2; b.power += 0.12; msg(w, "shadowArms", { c: b.shadow.arms }, 1); } }
    checkClimax(w, b.src);
    // 変生した部位を吸われる
    if (b.futaSuck) { if (h.futa) addCum(w, b.futaSuck * dt, b.src); else h.pleasure += b.futaSuck * 0.4 * intake(w, b.src) * dt; if (U.chance(dt * 0.3)) msg(w, h.futa ? "futaSuck" : "struggle", {}, 4); }
    // 浄化の台：放っておかれる。求めなければ、与えられない
    if (b.begAfter && b.t > b.begAfter) {
      const src = b.src; record(w, { kind: "beg", type: "惑", mon: src.kind, monName: src.d ? src.d.name : "", sev: 3 }); openScene(w, "joukaBeg", src);
      release(w, false); releaseOverflow(w, 60, src, "jouka"); return;
    }
    // くすぐり：笑いを堪えるうちに気力が削れる
    if (b.tickle) { h.will = Math.max(0, h.will - 1.2 * dt); if (U.chance(dt * 0.5)) msg(w, "tickle", {}, 3); }
    // 開発：捕まっている間、少しずつ敏感にされる。装束も剥がされる
    if (b.develop) { b.devT = (b.devT || 0) + dt; if (b.devT > 2.5) { b.devT = 0; h.sens = Math.min(5, (h.sens || 0) + 1); if (!h.exposure) { h.exposure = true; record(w, { kind: "exposure", sev: 2, mon: b.src.kind, monName: b.src.d ? b.src.d.name : "" }); } msg(w, "develop", { c: h.sens }, 2); } }
    // 抱きついて、数秒で離れる
    if (b.brief && b.t > b.brief) {
      // 短く抱きつく相手・網が離れても、ほかに掴んでいる者がいれば捕まったまま
      const rest = b.by.filter(id => id !== b.src.id && w.monsters.some(m => m.id === id && m.hp > 0));
      if (!rest.length) { release(w, false); return; }
      const m0 = w.monsters.find(m => m.id === b.src.id); if (m0) { m0.holding = false; m0.cd = Math.max(m0.cd, 2); }
      b.by = rest; b.src = w.monsters.find(m => m.id === rest[0]); b.brief = 0; b.power = Math.max(0.4, b.power * 0.7);
      for (const f of ["net", "tickle", "wire"]) b[f] = false;
    }
    // 戦闘員化ポッド：名前を塗り替えられていく
    if (b.pod) { addBrain(w, 7 * dt, b.src); if (!h.bound) return; if (U.chance(dt * 0.4)) msg(w, "podName", {}, 4); }
    // うつろの鎧：内側は柔らかく、光も杖も届かない
    if (b.armor && U.chance(dt * 0.35)) msg(w, "armorIn", {}, 5);
    if (b.itch) h.ache = Math.max(h.ache || 0, 20);
    if (b.t > 4 && !b.sceneShown && !b.pillory && !b.edge && !b.slowStruggle) {
      b.sceneShown = true; const rs = w.run.holdScenes || (w.run.holdScenes = {});
      if (!rs[b.src.kind]) { rs[b.src.kind] = 1; openScene(w, "hold", b.src); }   // 同じ相手の場面は一潜行に一度（あとは行為の文で描く）
    }
    // ルミナの底力：気力が尽きかけた時、階ごとに一度だけ、光で全部を弾き飛ばす（変身中・MP があれば）
    if (h.will < 10 && h.hp > 0 && !h.lastStand && h.form === "magica" && h.mp >= 6 && !b.noFlash) {
      h.lastStand = true; h.mp += G.HIKARI.flash.cost; flash(w); h.will = Math.max(h.will, 50); h.ifr = Math.max(h.ifr, 2);
      msg(w, "lastStand", {}); h.bubble = { text: "まだ……っ、負けない……！", t: 1.8 };
      return;
    }
    if (b.struggle >= 1) release(w, true);
    else if (h.will <= 0 || h.hp <= 0) defeat(w, b.src);
  }
  function defeat(w, src) {
    if (w.outcome) return;
    record(w, { kind: "defeat", type: src && src.d ? src.d.type : "絡", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3 });
    logLine(w, G.Text.log("defeat", { mon: src && src.d ? src.d.name : "" }), "heavy");
    msg(w, "defeat", {});
    w.outcome = "defeat"; w.defeatBy = src ? src.kind : null;
    openScene(w, "defeat", src);
  }
  function openScene(w, key, src) {
    const run = w.run;
    const sc = G.Text.scene(key, { run, h: run.h, n: heroName(w), mon: src && src.d ? src.d.name : "", type: src && src.d ? src.d.type : "", floor: w.floorNo, kind: src && src.kind });
    if (sc) w.scene = { key, lines: sc, mon: src && src.kind };
  }

  /* ================================================================ ひかり：知覚 */
  function perceive(w) {
    const h = w.run.h, map = w.map, fov = 140 * Math.PI / 180, range = 8;
    const cx0 = Math.floor(h.x), cy0 = Math.floor(h.y);
    for (let dy = -range; dy <= range; dy++) for (let dx = -range; dx <= range; dx++) {
      const tx = cx0 + dx, ty = cy0 + dy;
      if (tx < 0 || ty < 0 || tx >= map.W || ty >= map.H) continue;
      const i = ty * map.W + tx;
      if (map.seen[i]) continue;
      const cx = tx + 0.5, cy = ty + 0.5, d = Math.hypot(cx - h.x, cy - h.y);
      if (d > range) continue;
      if (d > 1.6 && Math.abs(U.angDiff(h.a, U.angle(h.x, h.y, cx, cy))) > fov / 2) continue;
      if (M.los(map, h.x, h.y, cx, cy) || (map.t[i] !== 0 && d < 1.8)) map.seen[i] = 1;
    }
    for (const m of w.monsters) {
      if (m.hp <= 0) continue;
      const d = U.dist(h.x, h.y, m.x, m.y);
      if ((m.hidden || m.dormant) && d > 1.4) continue;
      const inCone = d < 1.8 || Math.abs(U.angDiff(h.a, U.angle(h.x, h.y, m.x, m.y))) <= fov / 2;
      const seen = d <= range && inCone && M.los(map, h.x, h.y, m.x, m.y);
      const heard = !seen && d < 3.4 && m.d.spd > 0 && Math.hypot(m.vx, m.vy) > 0.2;
      if (seen || heard) {
        const first = !h.known[m.id];
        h.known[m.id] = { x: m.x, y: m.y, t: w.t, seen, kind: m.kind };
        if (first && seen) onSpot(w, m);
        else if (first && heard) { h.face = { x: m.x, y: m.y, t: 0.8 }; say(w, "hear", {}); msg(w, "hear", {}, 6); h.think = 0.35; }
      }
    }
    for (const tr of w.traps) {
      if (tr.found) continue;
      const d = U.dist(h.x, h.y, tr.x, tr.y);
      if (d < 2.3 + knowledge(w, "trap:" + tr.kind) && M.los(map, h.x, h.y, tr.x, tr.y) && U.chance(tr.d.detect * (1 - h.arousal / 220) * 0.35 * (1 + 1.5 * knowledge(w, "trap:" + tr.kind)))) {
        tr.found = true;
        say(w, "trapFound", { trap: tr.d.name }); msg(w, "trapFound", { trap: tr.d.name });
        record(w, { kind: "trapFound", type: tr.d.type, trap: tr.kind, trapName: tr.d.name, sev: 0 });
      }
    }
  }
  function roomAt(w, x, y) { return w.map.rooms.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h); }
  function onSpot(w, m) {
    const h = w.run.h, run = w.run;
    h.think = 0.4; h.face = { x: m.x, y: m.y, t: 0.6 };
    record(w, { kind: "spot", type: m.d.type, mon: m.kind, monName: m.d.name, sev: 0, boss: !!m.boss });
    const kn = knowledge(w, m.kind), ex = expectation(w, m.kind);
    learn(w, m.kind, 1);
    msg(w, m.boss ? "spotBoss" : "spot", { mon: m.d.name }, 1.5);
    if (m.boss) { run.bossSeen = true; say(w, "spotBoss", { mon: m.d.name }); return; }
    const paper = run.paper || {};
    const odd = m.d.type !== run.stated && m.d.type !== "削";
    if (odd) run.mismatch = (run.mismatch || 0) + 1;
    // 身体が先に思い出す：以前に気持ちよくされた相手を見ると、熱が上がる
    if (ex > 0.15 && w.t - (h.anticT ?? -99) > 6) {
      h.anticT = w.t;
      h.arousal = Math.min(100, h.arousal + 30 * ex); h.pleasure += 8 * ex;
      record(w, { kind: "anticipate", type: "惑", mon: m.kind, monName: m.d.name, lv: Math.ceil(ex * 3), sev: ex > 0.6 ? 2 : 1 });
      msg(w, "anticipate", { mon: m.d.name }); say(w, ex > 0.6 ? "anticipate3" : ex > 0.35 ? "anticipate2" : "anticipate1", { mon: m.d.name });
      return;
    }
    if (kn > 0.45 && U.chance(0.5)) { msg(w, "knowIt", { mon: m.d.name }, 4); say(w, "knowIt", { mon: m.d.name, kind: m.kind }); return; }
    if (odd && (run.mismatch === 1 || U.chance(0.25))) { say(w, "mismatch", { mon: m.d.name, stated: run.stated }); return; }
    if (paper.level && run.real && run.real.level > paper.level && !run.strongNoticed && U.chance(0.35)) { run.strongNoticed = true; say(w, "stronger", { mon: m.d.name }); return; }
    say(w, "spot", { mon: m.d.name, kind: m.kind });
  }
  function threats(w) {
    const h = w.run.h, out = [];
    for (const m of w.monsters) {
      if (m.hp <= 0) continue;
      const k = h.known[m.id];
      if (!k || w.t - k.t > 6) continue;
      const dd = U.dist(h.x, h.y, m.x, m.y);
      if (h.ignore && h.ignore[m.id] > w.t && dd > 2.5) continue;
      if (h.walled && h.walled[m.id] > w.t) continue;                  // 壁の角越しで、撃てず・届かず・向こうも来ない相手      // 相手にしないと決めた（動かない・届かない）。近づかれたら別
      out.push({ m, k, d: dd, kd: U.dist(h.x, h.y, k.x, k.y) });
    }
    return out.sort((a, b) => a.kd - b.kd);
  }

  /* ================================================================ ひかり：危険を読んで避ける */
  // 構えている魔物の攻撃が、点 p に届くか
  function castHits(m, p, margin) {
    if (!m.cast) return false;
    const A = m.d.atk;
    if (m.cast.kind === "grab") return U.dist(m.x, m.y, p.x, p.y) <= (A.range || 1) + 0.25 + margin;
    if (m.cast.kind === "grab2") return U.dist(m.x, m.y, p.x, p.y) <= (A.alsoGrab || 1) + 0.25 + margin;
    if (m.cast.kind === "attach") return U.dist(m.x, m.y, p.x, p.y) <= (A.range || 1) + 0.25 + margin;
    if (m.cast.kind === "deny" || m.cast.kind === "omazuke" || m.cast.kind === "count") return U.dist(m.x, m.y, p.x, p.y) <= A.range + margin;
    if (m.cast.kind === "possess") return U.dist(m.x, m.y, p.x, p.y) <= (A.range || 1) + 0.25 + margin;
    if (m.cast.kind === "lure") return U.dist(m.x, m.y, p.x, p.y) <= A.range + margin;
    if (m.cast.kind === "pounce") {            // 飛びかかる線の上
      const ax = m.cast.tx - m.x, ay = m.cast.ty - m.y, l = Math.hypot(ax, ay) || 1, reach = (m.d.spd * 3.4 + 3) * 0.34 + (A.range || 1);
      const t = ((p.x - m.x) * ax + (p.y - m.y) * ay) / l;
      return t > -0.3 && t < reach && Math.abs(((p.x - m.x) * ay - (p.y - m.y) * ax) / l) < (A.range || 1) * 0.6 + 0.35 + margin;
    }
    if (m.cast.kind === "shot" && A.fan) {   // 光の扇：向いた方の扇形
      const d = U.dist(m.x, m.y, p.x, p.y);
      return d <= A.range + margin && Math.abs(U.angDiff(U.angle(m.x, m.y, m.cast.tx, m.cast.ty), U.angle(m.x, m.y, p.x, p.y))) < A.fan + margin / Math.max(1, d);
    }
    if (m.cast.kind === "shot") { // 狙いの線の近く（扇に何発も撃つ種は、その全部の線）
      const n = A.spread || 1, a0 = U.angle(m.x, m.y, m.cast.tx, m.cast.ty);
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * SPREAD, ax = Math.cos(a), ay = Math.sin(a);
        const t = (p.x - m.x) * ax + (p.y - m.y) * ay;
        if (t < 0 || t > A.range + 1) continue;
        if (Math.abs((p.x - m.x) * ay - (p.y - m.y) * ax) < 0.45 + margin) return true;
      }
      return false;
    }
    return false;
  }
  function danger(w, p) {
    const h = w.run.h;
    let s = 0;
    for (const m of w.monsters) {
      if (m.hp <= 0) continue;
      if (m.cast && castHits(m, p, HR)) s += 90 / (Math.max(0, m.cast.t) + 0.25);
      if (h.known[m.id] && m.d.atk.kind !== "shot") { const d = U.dist(p.x, p.y, m.x, m.y), r = (m.d.atk.range || 1) + 0.4; if (d < r) s += (r - d) * 14; }
    }
    for (const pr of w.projs) if (pr.owner === "m") {
      const l = Math.hypot(pr.vx, pr.vy) || 1, t = ((p.x - pr.x) * pr.vx + (p.y - pr.y) * pr.vy) / l;
      if (t > 0 && t < 4 && Math.abs(((p.x - pr.x) * pr.vy - (p.y - pr.y) * pr.vx) / l) < 0.5) s += 40;
    }
    for (const tr of w.traps) if (tr.found && tr.armed && !tr.d.lure && U.dist(p.x, p.y, tr.x, tr.y) < tr.d.radius + HR) s += 30;
    for (const c of w.clouds) if (U.dist(p.x, p.y, c.x, c.y) < c.r + HR) s += 22;
    return s;
  }
  // 反応すべき危険（見えている構え／向かってくる弾）。反応の遅れが過ぎたものだけ
  function urgent(w) {
    const h = w.run.h;
    let best = null;
    for (const m of w.monsters) {
      if (m.hp <= 0 || !m.cast || !castHits(m, h, HR + 0.1)) continue;
      const seeIt = (h.known[m.id] && w.t - h.known[m.id].t < 0.3) || U.dist(h.x, h.y, m.x, m.y) < 2.2;
      if (!seeIt) continue;
      const key = "c" + m.cast.id;
      if (!h.react[key]) {
        let d = 0.36 - knowledge(w, m.kind) * 0.12 - (sk(w, "mikiri") ? 0.08 : 0) + (h.trance > 0 ? 0.25 : 0) + (h.hyp || 0) / 300 + h.arousal / 320 + U.rf(-0.05, 0.09);
        d = U.clamp(d, 0.06, 0.8);
        h.react[key] = { at: w.t - U.clamp(m.cast.total - m.cast.t, 0, 0.3), d };
      }
      const r = h.react[key];
      if (w.t - r.at >= r.d && (!best || m.cast.t < best.t)) best = { t: m.cast.t, key, m };
    }
    for (const p of w.projs) {
      if (p.owner !== "m") continue;
      const dx = h.x - p.x, dy = h.y - p.y, l = Math.hypot(p.vx, p.vy) || 1;
      const along = (dx * p.vx + dy * p.vy) / l, off = Math.abs((dx * p.vy - dy * p.vx) / l);
      if (along <= 0 || off > 0.55 || along / l > 0.7) continue;
      const key = "p" + (p.id || 0);
      if (!h.react[key]) h.react[key] = { at: w.t, d: U.clamp(0.14 + h.arousal / 400 + (h.hyp || 0) / 400 + (h.trance > 0 ? 0.2 : 0), 0.08, 0.5) };
      const r = h.react[key];
      if (w.t - r.at >= r.d && (!best || along / l < best.t)) best = { t: along / l, key };
    }
    return best;
  }
  function bestDodge(w, u, tgt) {
    const h = w.run.h, sp = hikariSpeed(w) * 1.25;
    const time = U.clamp(u.t + 0.08, 0.18, 0.7), burst = h.dashed[u.key] ? 0 : 0.28 * 0.7 * sp;
    let best = null;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
      let travel = sp * time + burst;
      while (travel > 0.2 && !clearPath(w.map, h, h.x + dx * travel, h.y + dy * travel, HR)) travel *= 0.6;
      const p = { x: h.x + dx * travel, y: h.y + dy * travel };
      let s = -danger(w, p) + travel * 0.5;
      if (tgt) s -= Math.abs(U.dist(p.x, p.y, tgt.x, tgt.y) - 4) * 0.4;
      if (!best || s > best.s) best = { x: dx, y: dy, s };
    }
    return best;
  }

  /* ================================================================ 囲まれた時（Game4 の考え方） */
  // 近くの起きている魔物の数と圧力
  function pressure(w, x, y, r) {
    let n = 0, p = 0;
    for (const m of w.monsters) {
      if (m.hp <= 0 || m.dormant || m.holding || m.d.spd <= 0 && m.d.atk.kind !== "grab") continue;
      const d = U.dist(m.x, m.y, x, y);
      if (d < r) { n++; p += (r - d) / r; }
    }
    return { n, p };
  }
  // ルミナ・フラッシュ：拘束を弾き、まわりを押し返して怯ませる
  function flash(w) {
    const h = w.run.h, F0 = G.HIKARI.flash, v = sk(w, "flash2");
    const F = v ? Object.assign({}, F0, { cost: F0.cost - 4, cd: F0.cd - 3, radius: F0.radius + 0.8 }) : F0;
    h.mp -= F.cost; h.cdFlash = F.cd; h.ifr = 0.8; inspire(w, "flash");
    if (h.bound) release(w, true);
    for (const m of w.monsters) {
      if (m.hp <= 0 || U.dist(m.x, m.y, h.x, h.y) > F.radius) continue;
      if (m.d.spd > 0) knock(w, m, U.angle(h.x, h.y, m.x, m.y), F.push);
      m.stun = Math.max(m.stun, F.stun); m.cast = null; m.dash = null; m.holding = false;
    }
    h.bubble = { text: "ルミナ・フラッシュ！", t: 1.4 };
    msg(w, "flash", {});
    if (h.attach && h.attach.length) {               // 光で弾ける付着体だけ、剥がれる
      const before = h.attach.length;
      h.attach = h.attach.filter(id => !ATTACH[id].flash);
      if (h.attach.length < before) msg(w, "attachOff", {});
    }
    fx(w, { kind: "burst", x: h.x, y: h.y, color: "#fff8d0", r: F.radius, life: 0.7 });
    record(w, { kind: "flash", sev: 0 });
  }
  // 空いている方へ突き抜ける（12方向を調べ、行き先のまわりの魔物が一番少ない所）
  function breakout(w) {
    const h = w.run.h, B = G.HIKARI.breakout;
    const here = pressure(w, h.x, h.y, 3).n;
    let best = null, bs = 1e9;
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6, d = B.dist;
      const x = h.x + Math.cos(a) * d, y = h.y + Math.sin(a) * d;
      if (!free(w.map, x, y, HR) || !clearPath(w.map, h, x, y, HR)) continue;
      const pr = pressure(w, x, y, 3), sc = pr.n + pressure(w, x, y, 1.2).n * 2;
      if (sc < bs) { bs = sc; best = { x, y }; }
    }
    h.cdBreak = B.cd;
    if (!best || bs >= here) return false;
    h.dashT = 0.4; h.ifr = 0.5; h.cast = null;
    setIntent(h, best.x - h.x, best.y - h.y, 2.1, "突破");
    say(w, "breakout", {}); msg(w, "breakout", {});
    record(w, { kind: "breakout", sev: 0 });
    return true;
  }

  /* ================================================================ ひかり：考える */
  function hikariSpeed(w) {
    const h = w.run.h, prep = G.PREP[w.run.stated];
    let s = G.HIKARI.spd[h.form];
    if (prep && prep.slow) s *= prep.slow;
    if (h.slow > 0) s *= 0.55;
    if (h.glue > 0) s *= 0.1;
    if (h.numb > 0) s *= 0.75;
    if (sk(w, "wind")) s *= 1.07;
    return s * (1 - h.arousal / 260);
  }
  function avoidFn(w) {
    const h = w.run.h, dang = [];
    for (const id in h.known) { const k = h.known[id]; if (w.t - k.t < 8) { const m = w.monsters.find(x => x.id == id); if (m && m.hp > 0) dang.push({ x: k.x, y: k.y, r: (m.d.atk.range || 1) + 1.2 }); } }
    for (const tr of w.traps) if (tr.found && tr.armed && !tr.d.lure) dang.push({ x: tr.x, y: tr.y, r: tr.d.radius + 0.6 });
    for (const c of w.clouds) dang.push({ x: c.x, y: c.y, r: c.r + 0.3 });
    return (x, y) => { let c = 0; for (const d of dang) { const dd = Math.hypot(x + 0.5 - d.x, y + 0.5 - d.y); if (dd < d.r) c += (d.r - dd) * 3; } return c; };
  }
  function perceivedArousal(w) { const h = w.run.h, prep = G.PREP[w.run.stated]; return prep && prep.numb ? h.arousal * 0.35 : h.arousal; }
  function setIntent(h, x, y, spd, label, face) { h.intent = { x, y, spd }; h.label = label; if (face) h.face = { x: face.x, y: face.y, t: 0.4 }; }
  function goToward(w, gx, gy, spd, label, face, force) {
    const h = w.run.h, p = pathDir(w, h, gx, gy, HR, avoidFn(w)) || (force ? (h._pp = null, pathDir(w, h, gx, gy, HR, null)) : null);   // force：知っている罠を避ける道が無ければ、踏む覚悟で
    if (!p) { h.intent = null; return false; }
    setIntent(h, p.x, p.y, spd * (p.d < 0.6 ? p.d / 0.6 : 1), label, face);
    h.goal = { x: gx, y: gy, why: label };
    return true;
  }

  function hikariThink(w) {
    const h = w.run.h, run = w.run, map = w.map, S = G.HIKARI;
    const caution = run.caution || 1;         // 依頼書の脅威度で変わる用心深さ
    // 道具
    if (h.hp < 38 && h.kit.salve > 0) { h.kit.salve--; h.hp = Math.min(h.hpMax || S.hpMax, h.hp + 35); say(w, "useSalve", {}); msg(w, "item", { item: "治癒の軟膏" }); record(w, { kind: "item", item: "salve", sev: 0 }); }
    const use = (k, fn) => { h.kit[k]--; fn(); msg(w, "item", { item: G.Game.ITEMS[k].name }); record(w, { kind: "item", item: k, sev: 0 }); };
    if ((h.will < 32 || h.trance > 1.2 || h.hyp > 55) && h.kit.smelling > 0) use("smelling", () => { h.will = Math.min(100, h.will + 30); h.trance = Math.min(h.trance, 0.2); h.hyp = Math.max(0, h.hyp - 50); if (h.hyp <= 0 && h.sleep <= 0) h.hypno = null; });
    // MP：戦いの最中に切れそうなら水薬。静かなら、使わずに息を整える
    if (h.form === "magica" && h.kit.ether > 0 && h.mp < 14 && threats(w).some(o => o.d < 6)) use("ether", () => { h.mp = Math.min(h.mpMax || G.HIKARI.mpMax, h.mp + 30); });
    // 火照り：自分で気づけている分だけ（鎮心の香が効いていると気づけない）
    if (h.kit.cool > 0 && perceivedArousal(w) > 55) use("cool", () => { h.arousal = Math.max(0, h.arousal - 35); h.pleasure = Math.max(0, h.pleasure - 20); });
    const ts = threats(w), near = ts.filter(o => o.d < 4.2);
    // 変身し直し：解けてからしばらくは無理。安全な時に、時間をかけて
    if (h.form === "civilian" && h.kit.star > 0 && (h.noTransform || 0) <= 0 && !ts.some(o => o.d < 4.5) && !h.cast) {
      h.cast = { kind: "transform", t: G.HIKARI.transformCast, tx: h.x, ty: h.y };
      h.intent = null; h.label = "変身";
      say(w, "retransform", {}); msg(w, "transformStart", {});
      return;
    }
    // 囲まれた：空いている方へ突き抜ける。抜けられなければ光で弾く（素の姿なら、怯えて逃げ道を探す）
    const pr = pressure(w, h.x, h.y, 2.4);
    h.surrounded = pr.n >= 3 || pr.p >= 1.3;
    if (h.surrounded) {
      if (!h.wasSurrounded) { say(w, h.form === "magica" ? "surrounded" : "surroundedCiv", {}); msg(w, "surrounded", {}); }
      if (h.form === "magica" && h.cdFlash <= 0 && h.mp >= G.HIKARI.flash.cost && h.trance <= 0 && pr.n >= 4) { flash(w); h.wasSurrounded = true; return; }
      if (h.cdBreak <= 0 && breakout(w)) { h.wasSurrounded = true; return; }
      if (h.form === "magica" && h.cdFlash <= 0 && h.mp >= G.HIKARI.flash.cost && h.trance <= 0) { flash(w); h.wasSurrounded = true; return; }
      if (h.form === "civilian") h.will = Math.max(0, h.will - 0.6);
    }
    h.wasSurrounded = h.surrounded;
    // 危険を避ける（最優先）
    const u = urgent(w);
    if (u) {
      const v = bestDodge(w, u, ts[0] && ts[0].m);
      if (!h.dashed[u.key]) { h.dashed[u.key] = 1; h.dashT = 0.28; if (sk(w, "stardust")) { h.dashT = 0.36; h.ifr = Math.max(h.ifr, 0.3); } inspire(w, "dodge"); }
      h.cast = null;
      setIntent(h, v.x, v.y, h.dashT > 0 ? (sk(w, "stardust") ? 2.2 : 1.9) : 1.25, "回避", ts[0] ? ts[0].m : null);
      if (u.m && knowledge(w, u.m.kind) > 0.5 && U.chance(0.4)) msg(w, "knowDodge", { mon: u.m.d.name }, 5); else msg(w, "dodge", {}, 2.5);
      return;
    }
    if (h.hp < 35 || h.will < 25) inspire(w, "pinch");
    // 撤退
    const pa = perceivedArousal(w);
    // 自分の判断で帰る：まだ余力のあるうちに（体力・気力・この先の階数・発情と絶頂の重なり）
    const left = (w.dg.floors || 10) - w.floorNo;
    const spent = h.hp < 30 * caution || h.will < (left >= 3 ? 26 : 16) || (h.climax >= 10 && h.arousal > 90) || (h.form === "civilian" && (h.kit.star === 0 || h.will < 50));   // 変身が解けて、戻れない／心が折れかけている：素の姿で戦い続けない
    const wantRetreat = run.recall || spent;
    if (wantRetreat && h.state !== "retreat") run.retreatWhy = run.recall ? "recall" : h.hp < 30 * caution ? "hp" : h.will < 26 ? "will" : h.climax >= 10 ? "heat" : "civ";
    if (wantRetreat && h.state !== "retreat") {
      h.state = "retreat";
      say(w, run.recall ? "recall" : "retreat", {}); msg(w, "retreat", {});
      { const vm = w.monsters.find(m => m.hp > 0 && m.alert > 0 && G.Text.hasVoice(m.kind) && U.dist(m.x, m.y, h.x, h.y) < 7); if (vm) monSay(w, vm, "retreat"); }
      record(w, { kind: "retreatDecide", sev: 0, recall: !!run.recall });
      h.goal = (map.portal && U.dist(h.x, h.y, map.down.x, map.down.y) < U.dist(h.x, h.y, map.up.x, map.up.y)) ? { x: map.down.x, y: map.down.y, why: "retreat" } : { x: map.up.x, y: map.up.y, why: "retreat" };
    }
    if (h.state === "retreat") {
      if (near.length && h.form === "magica" && h.cdShot <= 0) tryCast(w, near[0].m, "shot");
      goToward(w, h.goal.x, h.goal.y, 1.05, "撤退");
      if (U.dist(h.x, h.y, h.goal.x, h.goal.y) < 0.6) w.outcome = run.recall ? "ordered" : "retreat";
      return;
    }
    // 道にある、見破った罠を撃って壊す（近くに魔物がいない時）
    if (h.form === "magica" && h.cdShot <= 0 && h.mp >= S.shot.cost * 2 && !ts.some(o => o.d < 6)) {
      const g = h.goal || h.search;
      const tr = w.traps.filter(t => t.found && t.armed && !t.room && !t.d.lure && U.dist(h.x, h.y, t.x, t.y) < 4.5 && U.dist(h.x, h.y, t.x, t.y) > 0.9 && shotClear(map, h.x, h.y, t.x, t.y)
        && (!g || U.dist(t.x, t.y, g.x, g.y) < U.dist(h.x, h.y, g.x, g.y) + 1)).sort((a, b) => U.dist(h.x, h.y, a.x, a.y) - U.dist(h.x, h.y, b.x, b.y))[0];
      if (tr) { tryCast(w, { x: tr.x, y: tr.y, kind: null, d: { name: tr.d.name } }, "shot"); if (h.cast) { h.label = "罠を壊す"; return; } }
    }
    if (h.decoy && h.decoy.t > 0 && h.form === "magica") { tryCast(w, h.decoy, "shot"); if (h.cast || h.think > 0) return; }   // 撃てない間は、ほかの事を

    // 狙う相手：近さが同じくらいなら、構えている者・弱っている者・指揮する者・知っている厄介な者を先に
    const score = o => o.kd - (o.m.cast && o.m.cast.kind !== "pounce" ? 0.8 : 0) - (o.m.hp <= o.m.maxHp * 0.3 ? 0.6 : 0) - (o.m.d.command ? 0.9 : 0) - knowledge(w, o.m.kind) * (o.m.d.atk.kind === "grab" ? 0.5 : 0.2);
    const visible = ts.filter(o => o.k.seen && w.t - o.k.t < 0.5 && shotClear(map, h.x, h.y, o.m.x, o.m.y));   // 今、撃てる相手
    const t0 = visible.length ? visible.filter(o => o.kd < visible[0].kd + 1.8).sort((a, b) => score(a) - score(b))[0] : ts[0];
    // 戦いの最中なのに30秒、誰にも当てられない：周りの相手は置いて、階段を目指す
    if (t0 && ts.some(o => o.d < 7)) { h.fightT = h.fightT ?? w.t; if (w.t - Math.max(h.fightT, h.lastDmgT ?? -99) > 30 && !h.bound) { h.walled = h.walled || {}; for (const o of ts) h.walled[o.m.id] = w.t + 15; h.wantDown = true; h.fightT = w.t; msg(w, "giveUp", { mon: t0.m.d.name }, 6); } }
    else h.fightT = null;
    // 同じ相手に20秒、一度も当てられないまま：その相手は置いて、先へ（回り込み・射線探しの堂々巡りを断つ）
    if (t0) {
      if (!h.tgt || h.tgt.id !== t0.m.id) h.tgt = { id: t0.m.id, t: w.t };
      else if (w.t - Math.max(h.tgt.t, t0.m.hitT2 ?? -99) > 20 && !h.bound) { h.walled = h.walled || {}; h.walled[t0.m.id] = w.t + 15; h.tgt = null; h.wantDown = true; msg(w, "giveUp", { mon: t0.m.d.name }, 6); }
    }
    if (t0) {
      const m = t0.m, seenNow = t0.k.seen && w.t - t0.k.t < 0.5, vis = seenNow && shotClear(map, h.x, h.y, m.x, m.y);
      // 見えているのに射線が通らない（角・柱）／弾が壁に当たり続けた：撃てる位置へ動く
      if (h.form === "magica" && seenNow && (!vis || h.wallHits >= 2)) {
        h.wallHits = 0;
        const fs = firingSpot(w, m);
        if (fs) { h.fireSpot = { x: fs.x, y: fs.y, until: w.t + 3 }; msg(w, "reposition", {}, 6); }
      }
      if (h.fireSpot && w.t < h.fireSpot.until && h.form === "magica") {
        // 行けない場所なら諦める（固まらない）。相手が目の前なら、探すより打つ
        if (U.dist(h.x, h.y, h.fireSpot.x, h.fireSpot.y) > 0.35 && t0.d > S.melee.range + 0.6 && goToward(w, h.fireSpot.x, h.fireSpot.y, 0.95, "射線を探す", m)) return;
        h.fireSpot = null;
      }
      h.state = "combat";
      if (h.form === "magica") {
        const d = t0.d, far = S.shot.range - 0.6;
        const cluster = ts.filter(o => U.dist(o.m.x, o.m.y, m.x, m.y) < S.burst.radius && o.d < 6);
        if (vis && cluster.length >= 2 && h.mp >= S.burst.cost && h.cdBurst <= 0 && d < 6) { tryCast(w, m, "burst"); if (h.cast || h.think > 0) return; }
        // 近接：MP が少ない時、相手が攻撃のあとの隙を見せている時、触手の短い相手には踏み込んで打つ
        const A2 = m.d.atk, reachy = (A2.kind === "grab" && (A2.range || 1) > 1.4) || A2.kind === "drain" || (A2.kind === "aura" && !A2.burst);
        const opening = !m.cast && (m.cd > 0.35 || m.stun > 0);
        const saving = h.mp < (h.mpMax || G.HIKARI.mpMax) * 0.5;          // MP を切らさないように
        const wantMelee = seenNow && (!!h.possess || (saving && !reachy) || h.mp < S.shot.cost * 2 || (opening && !reachy) || (m.d.spd === 0 && !reachy));
        if (wantMelee && h.mp >= S.melee.cost) {
          if (d <= S.melee.range + m.d.r * 0.5 && h.cdMelee <= 0) { tryCast(w, m, "melee"); if (h.cast || h.think > 0) return; }   // 角に阻まれて打てなければ、ほかの手へ
          if (d < 4 && h.cdMelee <= 0.3 && goToward(w, m.x, m.y, 1.15, "踏み込む", m)) return;   // 道が無ければ（壁の角越し）、ほかの手へ
        }
        const reach = m.d.atk.kind === "grab" ? (m.d.atk.range || 1) + 0.5 : 0, kn = knowledge(w, m.kind);
        if (d < Math.max(2.6, (reach + 0.6) * kn + 2.6 * (1 - kn)) && m.d.spd > 0) {    // 近い：相手を見たまま下がる（知っている相手は、届く距離を覚えている）
          // 下がれない（壁際・角）まま1.5秒：向き直って、その場で撃つ／踏み込んで打つ
          const sp = h.spaceAt;
          if (!sp || w.t - sp.last > 0.6 || U.dist(sp.x, sp.y, h.x, h.y) > 0.3) h.spaceAt = { x: h.x, y: h.y, t: w.t, last: w.t }; else sp.last = w.t;
          if (w.t - h.spaceAt.t > 1.5) {
            h.face = { x: m.x, y: m.y, t: 0.5 };
            if (h.cdShot <= 0 && h.mp >= S.shot.cost && shotClear(map, h.x, h.y, m.x, m.y)) { tryCast(w, m, "shot"); if (h.cast) { h.spaceAt = null; return; } }
            if (h.mp >= S.melee.cost && h.cdMelee <= 0.3) {
              if (d <= S.melee.range + m.d.r * 0.5) { if (h.cdMelee <= 0) tryCast(w, m, "melee"); if (h.cast) { h.spaceAt = null; return; } }
              else if (goToward(w, m.x, m.y, 1.15, "踏み込む", m)) return;
            }
            // それでも何もできないまま3秒：壁越しの相手。しばらく相手にしない（ほかの目当て・探索へ戻る）
            if (w.t - h.spaceAt.t > 3) { h.walled = h.walled || {}; h.walled[m.id] = w.t + 6; h.spaceAt = null; msg(w, "giveUp", { mon: m.d.name }, 6); return; }
          }
          const a = U.angle(m.x, m.y, h.x, h.y);
          const v = bestDodge(w, { t: 0.4, key: "space" }, m);
          setIntent(h, (Math.cos(a) + v.x) / 2, (Math.sin(a) + v.y) / 2, 1.0, "間合い", m);
          if (vis && h.cdShot <= 0 && h.mp >= S.shot.cost && U.chance(0.35)) tryCast(w, m, "shot");
          return;
        }
        if (!vis) {                                   // 見えない：物陰から覗く／回り込む
          if (h.peekT <= 0) { const spot = coverWithView(w, t0.k.x, t0.k.y); if (spot) { h.peekSpot = spot; h.peekT = 6; say(w, "peek", {}); msg(w, "peek", {}, 8); } }
          if (h.peekSpot && h.peekT > 0) {
            if (U.dist(h.x, h.y, h.peekSpot.x, h.peekSpot.y) < 0.35) {
              h.peekHold = (h.peekHold || 0) + 0.12;
              // 覗いても出てこない（動かない相手・届かない相手）：しばらく相手にしない
              if (h.peekHold > 3) { h.peekHold = 0; h.peekSpot = null; h.peekT = 0; h.ignore = h.ignore || {}; h.ignore[m.id] = w.t + 12; msg(w, "giveUp", { mon: m.d.name }, 6); }
              else { h.intent = null; h.label = "覗く"; h.face = { x: t0.k.x, y: t0.k.y, t: 0.5 }; return; }
            } else { h.peekHold = 0; if (!goToward(w, h.peekSpot.x, h.peekSpot.y, 0.7, "物陰へ")) { h.peekSpot = null; h.peekT = 0; } else return; }
          }
          if (!h.ignore || !(h.ignore[m.id] > w.t)) { if (goToward(w, t0.k.x, t0.k.y, 0.75, "回り込む")) return; h.ignore = h.ignore || {}; h.ignore[m.id] = w.t + 8; }
        }
        if (d > far) {                                // 遠い：近づく。気づかれていなければ忍び寄る
          const sneak = !m.alert && m.d.spd > 0;
          if (!goToward(w, m.x, m.y, sneak ? 0.5 : 0.9, sneak ? "忍び寄る" : "接近", m)) { h.walled = h.walled || {}; h.walled[m.id] = w.t + 6; }   // 行けない相手は、しばらく置いておく
          return;
        }
        if (h.mp >= S.shot.cost && h.cdShot <= 0 && (!saving || reachy || m.d.atk.kind === "shot")) { tryCast(w, m, "shot"); if (h.cast || h.think > 0) return; }
        // 動かない相手が、撃てない位置にいる：打ちに行く。行けなければ、しばらく置いておく（その前で立ち尽くさない）
        if (!vis && !m.d.spd) {
          if (h.mp >= S.melee.cost && h.cdMelee <= 0 && d <= S.melee.range + m.d.r * 0.5) { tryCast(w, m, "melee"); if (h.cast) return; }
          if (d > S.melee.range * 0.8 && goToward(w, m.x, m.y, 0.9, "踏み込む", m)) return;
          h.walled = h.walled || {}; h.walled[m.id] = w.t + 6; return;
        }
        if (saving && !reachy && h.cdMelee <= 0.3 && d < 4.5 && goToward(w, m.x, m.y, 1.1, "踏み込む", m)) return;
        // 撃てない間は、足を止めて見据える。相手が寄ってくる時だけ、一歩ずつ下がる
        if (d < 3.4 && m.d.spd > 0) { const a = U.angle(m.x, m.y, h.x, h.y); setIntent(h, Math.cos(a), Math.sin(a), 0.5, "間合い", m); }
        else { h.intent = null; h.label = "構え"; h.face = { x: m.x, y: m.y, t: 0.4 }; }
        if (h.mp < S.shot.cost) msg(w, "lowMp", {}, 10);
        return;
      }
      // 素の姿：戦えない。見つからないように階段へ、近ければ逃げる
      if (t0.d < 2.6 && m.d.spd > 0) { const a = U.angle(m.x, m.y, h.x, h.y); setIntent(h, Math.cos(a), Math.sin(a), 1.15, "逃げる"); tryShove(w, m); return; }
      if (map.seen[Math.floor(map.down.y) * map.W + Math.floor(map.down.x)] && goToward(w, map.down.x, map.down.y, 0.8, "階段へ", null, true)) return;
    }
    h.state = "explore";
    // MP が足りない：物陰で整える／偽りの祠で休む
    if (h.form === "magica" && h.mp < 30 && !ts.some(o => o.d < 7)) {
      const shrine = w.traps.find(tr => tr.kind === "shrine" && tr.armed && !tr.found && U.dist(h.x, h.y, tr.x, tr.y) < 9);
      if (shrine) { goToward(w, shrine.x, shrine.y, 0.8, "祠へ"); return; }
      h.rest = 2.2; h.intent = null; h.label = "息を整える"; say(w, "rest", {}); msg(w, "rest", {}, 12); inspire(w, "rest"); return;
    }
    if (pa > 42) {
      const basin = w.traps.find(tr => (tr.kind === "basin" || tr.kind === "spring") && tr.armed && !tr.found && U.dist(h.x, h.y, tr.x, tr.y) < 9 && M.los(map, h.x, h.y, tr.x, tr.y));
      if (basin && !(h.basinSkip && h.basinSkip.includes(basin))) {
        if (!h.basinT || h.basinT.id !== basin) h.basinT = { id: basin, t: w.t };
        if (w.t - h.basinT.t > 12) (h.basinSkip = h.basinSkip || []).push(basin);   // たどり着けない：あきらめる
        else if (goToward(w, basin.x, basin.y, 0.8, tr_label(basin))) return;
      }
    }
    explore(w);
  }

  function tr_label(tr) { return tr.kind === "spring" ? "湯へ" : "手水へ"; }
  function explore(w) {
    const h = w.run.h, map = w.map;
    const downSeen = map.seen[Math.floor(map.down.y) * map.W + Math.floor(map.down.x)];
    const mimic = w.monsters.find(m => m.d.chest && m.hp > 0 && m.hidden && map.seen[Math.floor(m.y) * map.W + Math.floor(m.x)]);
    const chest = w.chests.find(c => !c.open && map.seen[Math.floor(c.y) * map.W + Math.floor(c.x)]);
    const box = w.traps.find(tr => ["toybox", "suit", "maseki", "seisui", "keiyaku", "feather_bed"].includes(tr.kind) && tr.armed && map.seen[Math.floor(tr.y) * map.W + Math.floor(tr.x)]);
    const tgtChest = mimic || chest || box;
    // 中毒：茸を見ると寄っていってしまう／魅了Ⅱ以上：その種の方へ
    if (!h.drawn && U.chance(0.04)) {
      const pull = w.monsters.find(m => m.hp > 0 && h.known[m.id] && ((h.addict && ["sekitake", "lure_cap", "dakitake"].includes(m.kind)) || (h.charm && (h.charm[m.kind] || 0) >= 2)));
      if (pull) { h.drawn = { x: pull.x, y: pull.y, t: 2.2, mon: pull.d.name }; record(w, { kind: "drawn", type: "蕩", mon: pull.kind, monName: pull.d.name, sev: 1 }); msg(w, "drawn", { mon: pull.d.name }); say(w, h.addict ? "addictPull" : "charmPull", { mon: pull.d.name }); }
    }
    if (tgtChest && h.chestT && h.chestT.id !== tgtChest) h.chestT = null;
    if (tgtChest && !h.chestT) h.chestT = { id: tgtChest, t: w.t };
    const chestOk = tgtChest && !(h.chestSkip && h.chestSkip.includes(tgtChest)) && h.floorT < 150;
    if (tgtChest && chestOk && w.t - h.chestT.t > 15) { (h.chestSkip = h.chestSkip || []).push(tgtChest); h.chestT = null; }   // 届かない宝箱は、あきらめる
    else if (chestOk) { if (goToward(w, tgtChest.x, tgtChest.y, 0.85, "宝箱へ")) { msg(w, "chestSeen", {}, 20); if (U.dist(h.x, h.y, tgtChest.x, tgtChest.y) < 0.7 && chest === tgtChest) openChest(w, chest); return; } }
    let seenN = 0, floorN = 0;
    for (let i = 0; i < map.t.length; i++) if (map.t[i] === 0) { floorN++; if (map.seen[i]) seenN++; }
    if (downSeen && (seenN / floorN > 0.55 || h.floorT > 45 || h.wantDown)) {
      const ok = goToward(w, map.down.x, map.down.y, 0.9, "階段へ", null, true);
      if (U.dist(h.x, h.y, map.down.x, map.down.y) < 0.5) { w.outcome = map.last ? "cleared" : "down"; return; }
      if (ok) { msg(w, "stairs", {}, 20); return; }       // 道が無い（封じられた部屋の向こう等）：ほかを探す
    }
    // まだ見ていない所へ（探す先は少しの間だけ保つ）
    if (!h.search || map.seen[Math.floor(h.search.y) * map.W + Math.floor(h.search.x)] && U.dist(h.x, h.y, h.search.x, h.search.y) < 1.2 || w.t > h.search.until) {
      const rooms = map.rooms.filter(r => !map.seen[r.cy * map.W + r.cx] && map.t[r.cy * map.W + r.cx] === 0).sort((a, b) => U.dist(h.x, h.y, a.cx, a.cy) - U.dist(h.x, h.y, b.cx, b.cy));
      const r = rooms[0];
      const p = r ? { x: r.cx + 0.5, y: r.cy + 0.5 } : (downSeen ? map.down : M.randomFloor(map, (x, y) => !map.seen[Math.floor(y) * map.W + Math.floor(x)]) || M.randomFloor(map));
      h.search = { x: p.x, y: p.y, until: w.t + 12 };
    }
    // 見ていない場所が前にあると、慎重に歩く
    let unknown = 0;
    for (let k = 1; k <= 3; k++) { const x = h.x + Math.cos(h.a) * k, y = h.y + Math.sin(h.a) * k; if (M.walkable(map, x, y) && !map.seen[Math.floor(y) * map.W + Math.floor(x)]) unknown++; }
    if (!goToward(w, h.search.x, h.search.y, unknown >= 2 ? 0.62 : 0.8, "探索")) {   // 行けない場所だった：探す先を変える
      h.search = null; h.failN = (h.failN || 0) + 1; if (h.failN > 15) { h.failN = 0; h.wantDown = true; }
    } else h.failN = 0;
    monologue(w);
    if (U.chance(0.01)) inspire(w, "walk");
    msg(w, "explore", {}, 14);
  }
  // 歩きながらの独り言：その時いちばん気になっていることを、ぽつりと
  function monologue(w) {
    const h = w.run.h;
    if (h.bubble || w.t - (h.monoT ?? -99) < U.rf(9, 16)) return;
    h.monoT = w.t;
    const tier = G.tier(w.run.save.body, w.run.save.mind);
    let key = null;
    if (h.lastClimaxT !== undefined && w.t - h.lastClimaxT < 18) key = "monoAfter";
    else if (h.lastEscT !== undefined && w.t - h.lastEscT < 12) key = "monoEscaped";
    else if (h.watched > 0) key = "monoWatched";
    else if (h.attach && h.attach.length && U.chance(0.6)) key = "monoAttach";
    else if (h.futa && U.chance(0.5)) key = "monoFuta";
    else if (h.arousal > 50 && U.chance(0.7)) key = "monoAroused";
    else if (h.sigil && U.chance(0.5)) key = "monoSigil";
    else if (h.exposure && U.chance(0.5)) key = "monoExposed";
    else if (h.will < 45 || h.hp < 45) key = "monoTired";
    else if (tier >= 2 && U.chance(0.5)) key = "monoFallen";
    else if (w.floorNo >= 6 && U.chance(0.3)) key = "monoDeep";
    else if (U.chance(0.35)) key = "monoCalm";
    if (key) say(w, key, {});
  }
  // 迷宮が生きている：静かな時の気配、気づいていない魔物の独り言、火照った匂い
  function liveliness(w, dt) {
    const h = w.run.h;
    if (w.outcome) return;
    w.ambT = (w.ambT ?? U.rf(18, 30)) - dt;
    if (w.ambT <= 0) { w.ambT = U.rf(22, 40); if (!threats(w).some(o => o.d < 7)) pushMsg(w, G.Text.ambient(w.run.dungeon), "amb"); }
    w.idleT = (w.idleT ?? 3) - dt;
    if (w.idleT <= 0) {
      w.idleT = U.rf(5, 9);
      const m = U.pick(w.monsters.filter(o => o.hp > 0 && !o.alert && !o.dormant && !o.hidden && G.Text.hasVoice(o.kind) && U.dist(o.x, o.y, h.x, h.y) < 8 && M.los(w.map, o.x, o.y, h.x, h.y)));
      if (m) monSay(w, m, "idle");
    }
    // 火照った匂い：発情が高いと、気づいていない魔物まで寄ってくる
    if (h.arousal > 70 && !h.bound) {
      w.scentT = (w.scentT ?? 4) - dt;
      if (w.scentT <= 0) {
        w.scentT = U.rf(6, 10);
        const m = w.monsters.find(o => o.hp > 0 && !o.alert && !o.dormant && o.d.spd > 0 && G.Text.actorOf(o.kind) && U.dist(o.x, o.y, h.x, h.y) < 4 + h.arousal / 20);
        if (m) { alertMon(w, m, 1); m.lastSeenH = { x: h.x, y: h.y }; pushMsg(w, G.Text.scent({ mon: m.d.name, n: heroName(w) }), "scent"); }
      }
    }
  }
  function openChest(w, c) {
    const h = w.run.h;
    c.open = true;
    const it = U.pick(["star", "salve", "smelling", "ether", "ether", "cool"]); h.kit[it] = (h.kit[it] || 0) + 1;
    say(w, "chest", { item: it }); msg(w, "chest", { item: G.Game.ITEMS[it].name });
    record(w, { kind: "chest", item: it, sev: 0 });
  }
  function coverWithView(w, tx, ty) {
    const h = w.run.h;
    let best = null, bs = 1e9;
    for (const c of w.covers) {
      const d = U.dist(c.x, c.y, tx, ty), dh = U.dist(c.x, c.y, h.x, h.y);
      if (d < 3.2 || d > 6.5 || dh > 7) continue;
      if (!M.los(w.map, c.x, c.y, tx, ty)) continue;
      const s = dh + (c.pillar ? -1.5 : 0) + Math.abs(d - 5);
      if (s < bs) { bs = s; best = c; }
    }
    return best;
  }

  /* ---- 魔法：短く唱えてから放つ（名前を叫ぶ） ---- */
  function tryCast(w, target, kind) {
    const h = w.run.h, S = G.HIKARI;
    if (h.cast || h.bound || h.form !== "magica") return;
    if (kind === "shot" && (h.cdShot > 0 || h.mp < S.shot.cost)) return;
    if (kind === "burst" && (h.cdBurst > 0 || h.mp < S.burst.cost)) return;
    if (kind === "melee" && (h.cdMelee > 0 || h.mp < S.melee.cost)) return;
    if (!shotClear(w.map, h.x, h.y, target.x, target.y)) return;
    const lv = target.kind && h.charm ? h.charm[target.kind] || 0 : 0;
    if (!lv && target.kind && h.brand === target.kind && U.chance(0.15)) { h.think = 0.4; msg(w, "brandHesitate", { mon: target.d ? target.d.name : "" }, 5); return; }
    const ex = target.kind ? expectation(w, target.kind) : 0;
    if (!lv && ex > 0.35 && U.chance(0.12 * ex)) { h.think = 0.45; msg(w, "anticipateHesitate", { mon: target.d ? target.d.name : "" }, 5); say(w, "anticipateHesitate", {}); return; }   // 期待：撃つ手が、一瞬止まる
    if (lv && U.chance(0.2 * lv)) { h.think = 0.5; msg(w, "charmHesitate", { mon: target.d ? target.d.name : "" }, 4); say(w, "charmHesitate", { mon: target.d ? target.d.name : "" }); return; }   // 魅了：好きな相手に、撃てない
    h.cast = { kind, t: (kind === "burst" ? S.burst.cast : kind === "melee" ? S.melee.cast : S.shot.cast) * (h.numb > 0 ? 1.6 : 1), target, tx: target.x, ty: target.y };
    h.intent = null; h.label = kind === "burst" ? "詠唱" : "攻撃";
    h.face = { x: target.x, y: target.y, t: 0.5 };
    const name = kind === "burst" ? (sk(w, "nova") ? "シャイン・ノヴァ" : "シャイン・バスター") : kind === "melee" ? (sk(w, "spear") ? "スター・スピア" : "ルミナ・ストライク") : (sk(w, "twin") && h.mp >= S.shot.cost + 3 ? "ルミナ・ツインショット" : "ルミナ・ショット");
    if (kind === "burst" || U.chance(kind === "melee" ? 0.25 : 0.35)) h.bubble = { text: name + "！", t: 1.2 };
    msg(w, "cast", { spell: name }, kind === "burst" ? 0 : 1.2);
  }
  function releaseCast(w) {
    const h = w.run.h, S = G.HIKARI, c = h.cast;
    h.cast = null;
    if (c.kind === "transform") {
      h.kit.star--; h.magic = 45; h.form = "magica"; h.mp = Math.max(h.mp, 20);
      msg(w, "transform", {}); record(w, { kind: "retransform", sev: 0 });
      fx(w, { kind: "burst", x: h.x, y: h.y, color: "#ffe6f6", life: 1.0 });
      return;
    }
    const tgt = c.target && c.target.hp > 0 ? c.target : { x: c.tx, y: c.ty };
    if (c.kind === "melee") {
      h.mp -= S.melee.cost; h.cdMelee = S.melee.cd; h.idleMp = 0;
      const a = U.angle(h.x, h.y, c.tx, c.ty), spear = sk(w, "spear"), mRange = S.melee.range + (spear ? 0.35 : 0), mDmg = (S.melee.dmg + (spear ? 3 : 0)) * (h.dmgMul || 1);
      fx(w, { kind: "slash", x: h.x + Math.cos(a) * 0.7, y: h.y + Math.sin(a) * 0.7, a, color: "#fff4c0", life: 0.25 });
      let hit = 0;
      for (const m of w.monsters) {
        if (m.hp <= 0 || U.dist(h.x, h.y, m.x, m.y) > mRange + m.d.r * 0.6) continue;
        if (Math.abs(U.angDiff(a, U.angle(h.x, h.y, m.x, m.y))) > S.melee.arc / 2 + 0.2) continue;
        hurtMon(w, m, mDmg); knock(w, m, U.angle(h.x, h.y, m.x, m.y), 0.45); m.stun = Math.max(m.stun, 0.25); if (m.cast) { m.cast = null; msg(w, "interrupt", { mon: m.d.name }, 1); } hit++;
      }
      if (!hit) msg(w, "whiff", {}, 2); else inspire(w, "melee");
      record(w, { kind: "melee", sev: 0 });
      return;
    }
    if (c.kind === "burst") {
      h.mp -= S.burst.cost; h.cdBurst = S.burst.cd; h.cdShot = 0.9; h.idleMp = 0;
      drainMagic(w, S.burst.magic, null);
      const nova = sk(w, "nova"), bR = S.burst.radius + (nova ? 0.5 : 0);
      fx(w, { kind: "burst", x: tgt.x, y: tgt.y, color: "#fff4c0", r: bR, life: 0.7 });
      for (const m of w.monsters) if (m.hp > 0 && U.dist(m.x, m.y, tgt.x, tgt.y) < bR) hurtMon(w, m, (S.burst.dmg + (nova ? 4 : 0)) * (h.dmgMul || 1));
      record(w, { kind: "burst", sev: 0 }); inspire(w, "burst");
    } else {
      const lead = U.dist(h.x, h.y, tgt.x, tgt.y) / S.shot.speed;
      const tx = tgt.x + (tgt.vx || 0) * lead, ty = tgt.y + (tgt.vy || 0) * lead;
      const spread = (h.arousal / 100) * 0.45 + (h.hyp || 0) / 100 * 0.3 + (h.trance > 0 ? 0.3 : 0) + 0.04;
      const a = U.angle(h.x, h.y, tx, ty) + U.rf(-spread, spread);
      const twin = sk(w, "twin") && h.mp >= S.shot.cost + 3, dm = S.shot.dmg * (h.dmgMul || 1) * (twin ? 0.6 : 1);
      for (const off of twin ? [-0.09, 0.09] : [0]) w.projs.push({ id: w.nextId++, x: h.x + Math.cos(a + off) * 0.4, y: h.y + Math.sin(a + off) * 0.4, vx: Math.cos(a + off) * S.shot.speed, vy: Math.sin(a + off) * S.shot.speed, owner: "h", dmg: dm, r: 0.18, life: S.shot.range / S.shot.speed, kind: "star" });
      h.mp -= S.shot.cost + (twin ? 3 : 0); h.cdShot = S.shot.cd; h.idleMp = 0;
      record(w, { kind: "shot", sev: 0 }); inspire(w, "shot");
    }
    for (const m of w.monsters) if (U.dist(m.x, m.y, h.x, h.y) < 5 && m.hp > 0) alertMon(w, m, 0.8);
  }
  function tryShove(w, m) {
    const h = w.run.h;
    if (h.cdShove > 0 || U.dist(h.x, h.y, m.x, m.y) > 1.2) return;
    h.cdShove = 1.1;
    msg(w, "shove", { mon: m.d.name });
    hurtMon(w, m, 3);
    knock(w, m, U.angle(h.x, h.y, m.x, m.y), 0.8);
    m.stun = Math.max(m.stun, 0.5);
  }
  function hurtMon(w, m, dmg) {
    const before = m.hp;
    dmg *= 1 + 0.15 * knowledge(w, m.kind);           // 弱いところを知っている
    const cl = (w.run.h.charm && w.run.h.charm[m.kind]) || 0;
    if (cl) dmg *= 1 - 0.2 * cl;                       // 好きになった種族には、手が鈍る（Ⅲで6割減）
    if (m.d.grows && (m.grown || 0) < 110) {           // はじめの夜の主：抗うほど濃くなる
      m.grown = (m.grown || 0) + dmg;
      const add = dmg * 0.3; m.maxHp += add; m.hp += add; m.pow = Math.min(2.2, (m.pow || 1) + dmg / 140);
      if (U.chance(0.25)) msg(w, "grows", { mon: m.d.name }, 5);
    }
    m.hp -= dmg; m.hitT2 = w.t; w.run.h.lastDmgT = w.t; m.flash = 0.2; m.rcl = 0.26; m.rclX = Math.sign(m.x - w.run.h.x) || 1;
    alertMon(w, m, 1);
    fx(w, { kind: "hit", x: m.x, y: m.y, color: "#fff6c8", life: 0.3 });
    if (m.d.swarmOnHit && U.chance(m.d.swarmOnHit) && w.monsters.filter(o => o.hp > 0 && o.kind === m.kind).length < 8) {   // 撃つたび壁が鳴って、群れが増える
      const p = M.randomFloor(w.map, (x, y) => U.dist(x, y, m.x, m.y) < 3 && U.dist(x, y, m.x, m.y) > 1);
      if (p) { const o = spawnMonster(w, m.kind, p.x, p.y, false); o.alert = 6; msg(w, "swarm", { mon: m.d.name }, 3); }
    }
    if (m.hp <= 0) { killMon(w, m); return; }
    msg(w, "dmg", { mon: m.d.name, n: Math.round(before - m.hp) }, 0.4);
    monSay(w, m, "hurt", 0.3);
    if (m.d.flee && m.hp < m.maxHp * 0.5) m.flee = 3;
    // 手負いは、悲鳴をあげて逃げ、仲間を呼ぶ（動けない種と長は逃げない）
    if (!m.fled && !m.boss && m.d.spd > 0 && m.hp <= m.maxHp * 0.25) {
      m.fled = true;
      if (U.chance(0.55)) {
        m.flee = U.rf(2.2, 3.2); m.cast = null;
        msg(w, "flee", { mon: m.d.name }); monSay(w, m, "flee", 0.9);
        for (const o of w.monsters) if (o !== m && o.hp > 0 && !o.alert && U.dist(o.x, o.y, m.x, m.y) < 6.5) alertMon(w, o, 1);
      }
    }
  }
  function killMon(w, m) {
    const h = w.run.h;
    m.hp = 0;
    if (m.summoned) w.dir.live = Math.max(0, w.dir.live - 1);
    if (h.bound && h.bound.by.includes(m.id)) { h.bound.by = h.bound.by.filter(i => i !== m.id); if (!h.bound.by.length) release(w, true); }
    record(w, { kind: "kill", type: m.d.type, mon: m.kind, monName: m.d.name, sev: 0, boss: !!m.boss });
    msg(w, "kill", { mon: m.d.name });
    fx(w, { kind: "pop", x: m.x, y: m.y, color: "#ffe0f0", life: 0.5 });
    if (m.d.atk.burst && U.dist(m.x, m.y, h.x, h.y) < 1.6) applyEffect(w, "蕩", m.d.atk.power, m);
    if (m.d.atk.popCloud) { addCloud(w, m, m.d.atk.popCloud); msg(w, "popCloud", { mon: m.d.name }); }
    if (U.chance(0.25)) say(w, "kill", { mon: m.d.name });
  }

  /* ================================================================ ひかり：1コマ */
  function updateHikari(w, dt) {
    const h = w.run.h;
    const px = h.x, py = h.y;
    h.dashT = Math.max(0, h.dashT - dt);
    if (h.bound) { updateBound(w, dt); h.vx = h.vy = 0; return; }
    if (h.cast) {                                   // 唱えている間は足を止める
      h.cast.t -= dt;
      h.vx *= 0.8; h.vy *= 0.8;
      if (h.cast.target && h.cast.target.hp > 0) { h.cast.tx = h.cast.target.x; h.cast.ty = h.cast.target.y; }
      if (h.cast.kind !== "transform") turnTo(h, U.angle(h.x, h.y, h.cast.tx, h.cast.ty), 12, dt);
      else if (threats(w).some(o => o.d < 2.5)) { h.cast = null; msg(w, "transformBroken", {}); return; }
      if (h.cast.t <= 0) releaseCast(w);
      move(w, h, h.vx, h.vy, dt, HR);
      return;
    }
    if (h.rest > 0) {
      h.rest -= dt; h.intent = null;
      if (h.shrineT > 0) { h.shrineT -= dt; drainMagic(w, 4 * mult(w, "削") * dt, { kind: "shrine" }); if (h.shrineT <= 0) { say(w, "shrineRealize", {}); msg(w, "shrineRealize", {}); h.rest = 0; } }
      if (threats(w).some(o => o.d < 4)) h.rest = 0;
    } else if (h.convey) {
      h.convey.t -= dt;
      const a = U.angle(h.x, h.y, h.convey.x, h.convey.y);
      h.intent = { x: Math.cos(a), y: Math.sin(a), spd: h.convey.saddle ? 0.35 : 0.9 }; h.label = h.convey.saddle ? "梁を渡る" : "運ばれる";
      h.arousal = Math.min(100, h.arousal + 1.5 * dt);
      if (h.convey.saddle) { h.pleasure += 7 * intake(w) * dt; if (U.chance(dt * 0.6)) msg(w, "saddleRide", {}, 3); checkClimax(w, { d: { name: "鞍の渡り", type: "蕩" }, kind: "saddle" }); }
      if (h.convey.t <= 0 || U.dist(h.x, h.y, h.convey.x, h.convey.y) < 0.4) h.convey = null;
    } else if (h.freeze > 0 || h.sniff > 0 || h.salute > 0 || h.pray > 0) {   // 止まった時間／嗅いでしまう／敬礼してしまう／祈ってしまう
      h.intent = null; h.vx *= 0.5; h.vy *= 0.5;
      h.label = h.freeze > 0 ? "静止" : h.sniff > 0 ? "嗅いでしまう" : h.pray > 0 ? "祈り" : "敬礼";
    } else if (h.drawn) {                           // 肉花の息に、ふらりと寄ってしまう
      h.drawn.t -= dt;
      const a = U.angle(h.x, h.y, h.drawn.x, h.drawn.y);
      h.intent = { x: Math.cos(a), y: Math.sin(a), spd: 0.4 }; h.label = "引き寄せられる";
      if (h.drawn.t <= 0 || U.dist(h.x, h.y, h.drawn.x, h.drawn.y) < 0.9) h.drawn = null;
    } else if (h.glue > 0) {
      h.intent = null; h.label = h.altar ? "踏ん張る" : "足を取られる";
    } else if (h.trance > 0) {
      h.intent = h.lureTo ? (() => { const a = U.angle(h.x, h.y, h.lureTo.x, h.lureTo.y); return { x: Math.cos(a), y: Math.sin(a), spd: 0.45 }; })() : null;
      h.label = "惑い";
    } else {
      h.lureTo = null;
      if (h.think > 0) { h.think -= dt; h.intent = null; }
      else { h.thinkT = (h.thinkT || 0) - dt; if (h.thinkT <= 0) { h.thinkT = 0.12; if (h.mislead > 0) goToward(w, h.goal ? h.goal.x : h.x, h.goal ? h.goal.y : h.y, 0.8, "探索"); else hikariThink(w); } }
    }
    // 速度は少しずつ（急発進・急停止しない）
    const max = hikariSpeed(w);
    const it = h.intent;
    let tvx = 0, tvy = 0;
    if (it) { const l = Math.hypot(it.x, it.y) || 1; tvx = it.x / l * max * it.spd; tvy = it.y / l * max * it.spd; }
    // 地に足：踏み出しは速く、止まる時はもっと速く（ふわっと滑らない）
    const stopping = Math.hypot(tvx, tvy) < Math.hypot(h.vx, h.vy) * 0.7;
    const acc = h.dashT > 0 ? 20 : stopping ? 18 : 12;
    h.vx += (tvx - h.vx) * Math.min(1, dt * acc); h.vy += (tvy - h.vy) * Math.min(1, dt * acc);
    if (!it && Math.hypot(h.vx, h.vy) < 0.15) { h.vx = 0; h.vy = 0; }
    // 殴られた勢い
    if (h.kb > 0) { h.kb = Math.max(0, h.kb - dt); h.vx += Math.cos(h.kbA) * 6 * dt * 10 * h.kb; h.vy += Math.sin(h.kbA) * 6 * dt * 10 * h.kb; }
    move(w, h, h.vx, h.vy, dt, HR);
    // 向き：見るべき物があればそちらを、無ければ進む方を
    if (h.face && h.face.t > 0) { h.face.t -= dt; turnTo(h, U.angle(h.x, h.y, h.face.x, h.face.y), 9, dt); }
    else if (Math.hypot(h.vx, h.vy) > 0.25) turnTo(h, Math.atan2(h.vy, h.vx), 8, dt);
    else idleGlance(w, dt);
    // 急に止まると、少しのけぞる（描画で使う）
    const sp = Math.hypot(h.vx, h.vy);
    if (h.spPrev > 1.8 && sp < 0.3) h.brakeT = 0.18;
    h.spPrev = sp; h.brakeT = Math.max(0, h.brakeT - dt);
    // 動けていない時の保険
    if (U.dist(h.x, h.y, h.lastX, h.lastY) > 0.5) { h.lastX = h.x; h.lastY = h.y; h.stuckT = 0; }
    else if (h.intent && h.rest <= 0) { h.stuckT += dt; if (h.stuckT > 5) { h.stuckT = 0; h._pp = null; h.search = null; h.wantDown = true; } }
    if (h.floorT > 110) h.wantDown = true;
    h.moved = Math.hypot(h.x - px, h.y - py);
  }
  // 何も起きていない時、ときどき脇を見る
  function idleGlance(w, dt) {
    const h = w.run.h;
    const calm = !threats(w).some(o => o.d < 7);
    if (!calm) { h.idleT = 0; h.glance = null; return; }
    h.idleT += dt;
    if (h.glance) { h.glance.t -= dt; turnTo(h, h.glance.to, 5, dt); if (h.glance.t <= 0) { h.glance = null; h.nextGlance = h.idleT + U.rf(3, 7); } return; }
    if (h.idleT > (h.nextGlance ?? 2.5)) h.glance = { to: h.a + (U.chance(0.5) ? 1 : -1) * U.rf(0.7, 1.4), t: U.rf(0.8, 1.5) };
  }

  /* ================================================================ 魔物のAI */
  function alertMon(w, m, amount) {
    if (!m.alert && amount > 0) { m.hop = 0.32; monSay(w, m, "spot", 0.6); }     // 気づいた瞬間、跳ねる（しゃべる種は一言）
    m.alert = Math.max(m.alert, amount * 6); m.lastSeenH = { x: w.run.h.x, y: w.run.h.y };
    if (m.hidden && !m.d.chest && !m.d.hidden) m.hidden = false;
  }
  function monSees(w, m) {
    const h = w.run.h, d = U.dist(m.x, m.y, h.x, h.y);
    if (d > m.d.sight) return false;
    if (m.d.fov < 360 && d > 1.5 && Math.abs(U.angDiff(m.a, U.angle(m.x, m.y, h.x, h.y))) > (m.d.fov * Math.PI / 180) / 2) return false;
    return M.los(w.map, m.x, m.y, h.x, h.y);
  }
  // 好む間合い（掴む種は近く、撃つ種は離れて）
  function prefDist(m) {
    const A = m.d.atk;
    if (A.kind === "grab") return Math.max(0.5, (A.range || 1) * 0.7);
    if (A.kind === "shot" || A.kind === "lure") return A.range * 0.72;
    return (A.range || 1) * 0.55;
  }
  // 仲間と同じ方向から寄らない
  function spreadAngle(w, m, h) {
    let a = U.angle(h.x, h.y, m.x, m.y);
    for (const o of w.monsters) {
      if (o === m || o.hp <= 0 || !o.alert) continue;
      const d = U.angDiff(U.angle(h.x, h.y, o.x, o.y), a);
      if (Math.abs(d) < 0.85) a += (d >= 0 ? 1 : -1) * (0.85 - Math.abs(d)) * 0.6;
    }
    return a;
  }
  function castingCount(w, except) { return w.monsters.filter(o => o !== except && o.hp > 0 && o.cast).length; }

  function updateMonster(w, m, dt) {
    const h = w.run.h, d = m.d, A = d.atk;
    if (m.hp <= 0) return;
    if (m.dormant) { if (U.dist(m.x, m.y, h.x, h.y) < 1.4) { m.dormant = false; alertMon(w, m, 1); } else return; }
    const px = m.x, py = m.y;
    m.flash = Math.max(0, m.flash - dt); m.cd = Math.max(0, m.cd - dt);
    if (m.bubble) { m.bubble.t -= dt; if (m.bubble.t <= 0) m.bubble = null; }
    m.hop = Math.max(0, m.hop - dt); m.rcl = Math.max(0, m.rcl - dt); m.lunge = Math.max(0, m.lunge - dt);
    m.pounceCd = Math.max(0, (m.pounceCd || 0) - dt);
    // 魅了の脈動（ナメクジ女王）・甘い燐光／胞子（蜜吸い虫・媚芯茸）
    if (d.charmPulse && m.alert > 0 && !w.outcome) {
      const P = d.charmPulse; m.pulseT = (m.pulseT || 0) + dt;
      if (m.pulseT >= P.every) {
        m.pulseT = 0; fx(w, { kind: "ring", x: m.x, y: m.y, color: "#ffb3cf", r: P.r, life: 0.9 });
        if (U.dist(m.x, m.y, h.x, h.y) <= P.r) { applyEffect(w, "惑", 0.4 * m.pow, m); for (const k of P.kinds) addCharm(w, { kind: k, d: G.MONSTERS[k] }, 3); msg(w, "charmPulse", { mon: d.name }, 3); hitDesc(w, m, 6); }
      }
    }
    if (d.charmGlow && !w.outcome && U.dist(m.x, m.y, h.x, h.y) <= d.charmGlow.r && M.los(w.map, m.x, m.y, h.x, h.y)) {
      const P = d.charmGlow; m.glowT = (m.glowT || 0) + dt;
      if (m.glowT >= P.every) {
        m.glowT = 0; hitDesc(w, m, 7);
        applyEffect(w, "惑", 0.3 * m.pow, m); h.arousal = Math.min(100, h.arousal + 2);
        if (P.futa && h.futa) addCum(w, 6, m);
        m.glowN = (m.glowN || 0) + 1; if (m.glowN % 2 === 0) addCharm(w, m, 5);
      }
    }
    if (m.dash) {                                 // 飛びかかりの最中
      m.dash.t -= dt;
      const sp = m.d.spd * 3.4 + 3;
      move(w, m, Math.cos(m.dash.a) * sp, Math.sin(m.dash.a) * sp, dt, m.d.r * 0.6);
      if (U.dist(m.x, m.y, h.x, h.y) <= (A.range || 1) + 0.15 && !w.outcome && !h.bound) { m.dash = null; if (grab(w, m, A.power * m.pow, m.d.type === "蕩" ? "蕩" : "絡")) m.holding = true; return; }
      if (m.dash.t <= 0) { m.dash = null; m.cd = Math.max(m.cd, 0.8); msg(w, "miss", { mon: d.name }, 1); }
      return;
    }
    if (m.stun > 0) { m.stun -= dt; m.vx *= 0.8; m.vy *= 0.8; return; }
    if (monSees(w, m)) alertMon(w, m, 1); else m.alert = Math.max(0, m.alert - dt);
    const dist = U.dist(m.x, m.y, h.x, h.y);
    // 捕まえている／群がっている：ひかりのまわりに、輪になって取りつく
    if ((m.holding || m.molest) && h.bound) {
      const by = h.bound.by, mol = w.monsters.filter(o => o.molest && o.hp > 0 && !by.includes(o.id));
      const i = m.holding && by.includes(m.id) ? by.indexOf(m.id) : by.length + mol.indexOf(m), n = by.length + mol.length;
      const a = i / Math.max(1, n) * Math.PI * 2 + 0.5, r = n <= 1 ? 0.25 : 0.55;
      m.x += (h.x + Math.cos(a) * r - m.x) * 0.12; m.y += (h.y + Math.sin(a) * r * 0.8 - m.y) * 0.12; m.vx = m.vy = 0;
      m.a = U.angle(m.x, m.y, h.x, h.y);
      return;
    }
    if (m.holding) { m.holding = false; m.cd = Math.max(m.cd, 1); }
    if (m.molest && !h.bound) m.molest = false;
    // 捕まった獲物には、触れてくる種が群がる（掴める種は掴みに、そうでない種はまとわりつく）
    if (h.bound && !w.outcome && m.alert > 0 && d.spd > 0 && !m.cast && G.Text.actorOf(m.kind) && dist < 7 && m.stun <= 0) {
      if (dist <= 1.15) {
        if (A.kind === "grab" && (m.cd <= 0.6 || d.pack) && h.bound.by.length < 5) { if (grab(w, m, A.power * m.pow, m.d.type === "蕩" ? "蕩" : "絡")) { m.holding = true; return; } }
        const nMol = w.monsters.filter(o => o.molest && o.hp > 0).length;
        if (!m.molest && h.bound.by.length + nMol < 6) { m.molest = true; monSay(w, m, "grab", 0.7); actMsg(w, "swarm", { mon: d.name, c: h.bound.by.length + nMol + 1 }); if (h.bound.by.length + nMol + 1 >= 3) actBub(w, "swarm"); }
        return;
      }
      const p = pathDir(w, m, h.x, h.y, d.r * 0.6);
      if (p) { const sp = d.spd * 1.15; m.vx += (p.x * sp - m.vx) * Math.min(1, dt * 6); m.vy += (p.y * sp - m.vy) * Math.min(1, dt * 6); move(w, m, m.vx, m.vy, dt, d.r * 0.6); turnTo(m, Math.atan2(m.vy, m.vx), 6, dt); }
      return;
    }
    let tvx = 0, tvy = 0, spd = d.spd;
    if (m.flee > 0) {
      m.flee -= dt;
      const a = U.angle(h.x, h.y, m.x, m.y); tvx = Math.cos(a); tvy = Math.sin(a); spd *= 1.25;
      if (m.flee <= 0) m.cd = 0.6;
    } else if (m.cast) {
      m.cast.t -= dt;
      turnTo(m, U.angle(m.x, m.y, h.x, h.y), 6, dt);
      if (m.cast.t <= 0) fire(w, m, U.dist(m.x, m.y, h.x, h.y));
    } else if (m.alert > 0 && !w.outcome) {
      // 構える：射程・視線・仲間の詠唱の枠
      const cap = w.monsters.filter(o => o.alert && o.hp > 0).length >= 3 ? 2 : 1;
      const can = m.cd <= 0 && castingCount(w, m) < cap && (!h.bound || A.kind === "grab");
      const inRange = dist <= (A.range || 1) + (A.kind === "grab" ? 0.25 : 0);
      if (can && (A.kind === "grab" || A.kind === "shot" || A.kind === "lure" || (A.kind === "possess" && !h.possess) || A.kind === "deny" || A.kind === "omazuke" || A.kind === "attach" || (A.kind === "count" && !h.countGame)) && inRange && M.los(w.map, m.x, m.y, h.x, h.y) && !(A.kind === "lure" && A.alsoGrab && dist <= A.alsoGrab)) startCast(w, m, A.kind);
      else if (can && A.alsoGrab && dist <= A.alsoGrab) startCast(w, m, "grab2");
      else if (can && A.kind === "grab" && d.spd > 0 && !h.bound && dist > (A.range || 1) + 0.4 && dist < 3.6 && M.los(w.map, m.x, m.y, h.x, h.y) && m.pounceCd <= 0) { startCast(w, m, "pounce"); m.pounceCd = U.rf(5, 9); }
      else if (d.spd > 0) {
        const pref = prefDist(m);
        let gx, gy;
        if (!M.los(w.map, m.x, m.y, h.x, h.y)) { const tgt = monSees(w, m) ? h : (m.lastSeenH || h); gx = tgt.x; gy = tgt.y; }
        else { const a = spreadAngle(w, m, h); gx = h.x + Math.cos(a) * pref; gy = h.y + Math.sin(a) * pref; }
        const p = pathDir(w, m, gx, gy, d.r * 0.6);
        const gl = Math.hypot(gx - m.x, gy - m.y);
        if (gl < 0.3) {                         // 持ち場：止まらず、横へ少しずつ
          const t = U.angle(h.x, h.y, m.x, m.y) + Math.PI / 2 * m.side;
          tvx = Math.cos(t); tvy = Math.sin(t); spd *= 0.25;
        } else if (p) { tvx = p.x; tvy = p.y; if (gl < 1.2) spd *= gl / 1.2; }
        if (d.behavior === "float") spd *= 0.9;
      }
    } else if (d.spd > 0 && !(d.behavior === "lurk" && U.chance(0.7))) {
      m.wanderT -= dt;
      if (m.wanderT <= 0 || !m.goal || U.dist(m.x, m.y, m.goal.x, m.goal.y) < 0.4) {
        m.wanderT = U.rf(2, 5);
        m.goal = M.randomFloor(w.map, (x, y) => U.dist(x, y, m.home.x, m.home.y) < 4);
      }
      if (m.goal) { const p = pathDir(w, m, m.goal.x, m.goal.y, d.r * 0.6); if (p) { tvx = p.x; tvy = p.y; spd *= 0.4; } }
    }
    const acc = 6;
    m.vx += (tvx * spd - m.vx) * Math.min(1, dt * acc); m.vy += (tvy * spd - m.vy) * Math.min(1, dt * acc);
    if (d.spd > 0) move(w, m, m.vx, m.vy, dt, d.r * 0.6);
    if (Math.hypot(m.vx, m.vy) > 0.15 && !m.cast) turnTo(m, Math.atan2(m.vy, m.vx), 5, dt);
    // 近くにいるだけで効くもの
    if (A.kind === "aura" && dist <= A.range && !w.outcome) {
      m.auraT = (m.auraT || 0) + dt;
      if (A.gaze && !A.gazeCharm && !A.allure) { if (monSees(w, m)) { h.arousal = Math.min(100, h.arousal + 1.6 * A.power * mult(w, "惑") * dt); h.watched = 0.4; msg(w, "watched", { mon: d.name }, 8); hitDesc(w, m, 12); } }
      else if (A.burst) { if (dist < 0.9) { applyEffect(w, d.type, A.power * m.pow, m); hitDesc(w, m, 1); m.hp = 0; if (m.summoned) w.dir.live = Math.max(0, w.dir.live - 1); msg(w, "pop", { mon: d.name }); fx(w, { kind: "pop", x: m.x, y: m.y, color: "#f6ffd8", life: 0.6 }); } }
      else if (m.auraT > 1.1) {
        m.auraT = 0;
        if (A.allure) {                            // 見つめる瞳・甘い香り：惹かれていく。三度に一度、魅了が深まる
          if (A.scent || monSees(w, m)) {
            hitDesc(w, m, 9);
            applyEffect(w, "惑", A.power * m.pow * 0.35, m); if (A.gaze) h.watched = 1;
            h.arousal = Math.min(100, h.arousal + 2 * A.power * mult(w, "惑"));
            m.allN = (m.allN || 0) + 1; if (m.allN % 3 === 0) addCharm(w, m, 7);
          }
        } else if (A.whisper) {                           // 双子：左右から囁く。二体とも近いほど強い
          hitDesc(w, m, 8);
          const n = w.monsters.filter(o => o.hp > 0 && o.kind === m.kind && U.dist(o.x, o.y, h.x, h.y) <= A.range).length;
          applyEffect(w, "惑", A.power * m.pow * 0.4 * n, m);
          h.will = Math.max(0, h.will - 2.2 * n); h.pleasure += 2.2 * n * intake(w, m);
          msg(w, n >= 2 ? "whisper2" : "whisper", { mon: d.name }, 5);
          if (n >= 2 && U.chance(0.3)) addCharm(w, m, 15);
        } else if (A.numb) {                       // 痺れ：攻撃が遅く、足がもたつく
          hitDesc(w, m, 8);
          applyEffect(w, "蕩", A.power * m.pow * 0.5, m);
          if (!(h.numb > 0)) { msg(w, "numb", { mon: d.name }, 3); record(w, { kind: "numb", sev: 1, mon: m.kind, monName: d.name }); }
          h.numb = Math.max(h.numb || 0, A.numb);
        } else if (A.spore) {                      // 咳き茸：吸うとハイ。何度も吸うと、中毒になる
          hitDesc(w, m, 8);
          applyEffect(w, "蕩", A.power * m.pow * 0.55, m);
          h.high = 6; h.sporeN = (h.sporeN || 0) + 1;
          msg(w, "spore", { mon: d.name }, 4);
          if (h.sporeN >= 3 && !h.addict) { h.addict = true; record(w, { kind: "addict", sev: 2, mon: m.kind, monName: d.name }); msg(w, "addict", {}); say(w, "addict", {}); }
        } else if (A.tipTease) {                   // 先嬲り：先だけ。行き着かない
          if (h.futa) { h.tipTease = 1.3; addCum(w, 7, m); msg(w, "tipTease", { mon: d.name }, 5); if (w.t - (h.tipT ?? -99) > 8) { h.tipT = w.t; record(w, { kind: "tipTease", type: "蕩", mon: m.kind, monName: d.name, sev: 2 }); say(w, "tipTease", {}); } } else applyEffect(w, "蕩", A.power * 0.5, m);
        } else if (A.sermon) {                     // 説法：聞くほど、心の壁が薄くなる
          hitDesc(w, m, 10);
          applyEffect(w, "惑", A.power * m.pow * 0.45, m); msg(w, "sermon", { mon: d.name }, 6);
          m.sermonN = (m.sermonN || 0) + 1; if (m.sermonN % 7 === 0 && h.will < 70) addCrack(w, 1, m);
        } else if (A.broadcast) {                  // 実況：捕まった姿、達した瞬間を中継する
          if (h.bound || h.freeze > 0 || w.t - (h.lastClimaxT ?? -99) < 3) {
            h.watched = 1.2; h.will = Math.max(0, h.will - 3); h.pleasure += 3 * intake(w, m);
            if (w.t - (h.bcastT ?? -99) > 7) { h.bcastT = w.t; record(w, { kind: "broadcast", type: "惑", mon: m.kind, monName: d.name, sev: 3 }); msg(w, "broadcast", { mon: d.name }); say(w, "broadcast", {}); monSay(w, m, "broadcast"); }
          } else msg(w, "bcastIdle", { mon: d.name }, 10);
        } else if (A.mock) {                       // 嘲り：捕まっている姿を罵る。罵られるほど、なぜか好きになる
          if (h.bound) { h.will = Math.max(0, h.will - 3); msg(w, "mock", { mon: d.name }, 5); monSay(w, m, "mock", 0.6); record(w, { kind: "mock", type: "惑", mon: m.kind, monName: d.name, sev: 2 }); if (U.chance(A.charm ?? 0.3)) addCharm(w, m, A.charm ? 7 : 10); }
          else if (A.charm && monSees(w, m) && U.chance(0.35)) { hitDesc(w, m, 8); applyEffect(w, "惑", A.power * m.pow * 0.4, m); if (U.chance(0.3)) addCharm(w, m, 9); }   // 手懐ける小淫魔：捕まっていなくても、甘やかす声で
        } else if (A.gazeCharm) {                  // 教祖：見つめられるほど惹かれる。惹かれていると、祈ってしまう
          hitDesc(w, m, 10);
          if (monSees(w, m)) {
            applyEffect(w, "惑", A.power * m.pow * 0.4, m); h.watched = 1;
            m.gazeN = (m.gazeN || 0) + 1; if (m.gazeN % 3 === 0) addCharm(w, m, 6);
            if ((h.charm && h.charm[m.kind] || 0) >= 2 && h.arousal >= 35 && !(h.pray > 0) && !h.bound) pray(w, m, 2.6);
          }
        } else { applyEffect(w, d.type, A.power * m.pow * 0.55 * (A.gaze && w.run.law === "shumoku" ? 1.6 : 1), m); hitDesc(w, m, 7); }
      }
    }
    // 指揮：近くの魔物を急かす（淫魔・ワルドー幹部）
    if (d.command && m.alert > 0) for (const o of w.monsters) if (o !== m && o.hp > 0 && U.dist(o.x, o.y, m.x, m.y) < d.command) { o.cd = Math.max(0, o.cd - 0.6 * dt); o.cmd = 0.3; }
    // 召喚：夢魔の女王は小淫魔を呼ぶ
    if (d.summon && m.alert > 0 && !w.outcome) {
      m.sumT = (m.sumT || 0) + dt;
      if (m.sumT > d.summon.every && w.monsters.filter(o => o.hp > 0 && o.kind === d.summon.kind && U.dist(o.x, o.y, m.x, m.y) < 6).length < d.summon.max) {
        m.sumT = 0; const o = spawnMonster(w, d.summon.kind, m.x + U.rf(-0.8, 0.8), m.y + U.rf(-0.8, 0.8), false); o.alert = 6; msg(w, "summon", { mon: d.name, sub: G.MONSTERS[d.summon.kind].name });
      }
    }
    // 雄の臭い：発情していると、つい嗅いでしまう
    if (d.musk && dist < d.musk && !w.outcome && !h.bound && !(h.sniff > 0) && h.arousal >= 45 - 5 * trait(w, "musk")) {
      m.muskT = (m.muskT || 0) + dt;
      if (m.muskT > 1.5) { m.muskT = 0; if (U.chance(0.45)) { h.sniff = 1.4; h.arousal = Math.min(100, h.arousal + 6 * (1 + 0.2 * trait(w, "musk"))); record(w, { kind: "sniff", type: "蕩", mon: m.kind, monName: d.name, sev: 2 }); msg(w, "sniff", { mon: d.name }); say(w, "sniff", { mon: d.name }); } }
    }
    // 常識改変：ワルドーの者を見ると、教え込まれた「敬礼」をしてしまう
    if (d.waldo && h.rewired && !w.outcome && !h.bound && !(h.salute > 0) && dist < 5 && monSees(w, m) && w.t - (h.saluteT ?? -99) > 10) {
      h.saluteT = w.t; h.salute = 1.8; h.pleasure += 6 * intake(w, m); h.watched = 1;
      record(w, { kind: "salute", type: "惑", mon: m.kind, monName: d.name, sev: 2 }); msg(w, "salute", { mon: d.name }); say(w, "salute", {});
    }
    // 肉花の甘い息：発情が強いと、ふらりと花の方へ寄ってしまう
    if (A.breath && dist <= A.breath.range && !w.outcome && !h.bound) {
      hitDesc(w, m, 9);
      m.breathT = (m.breathT || 0) + dt;
      if (m.breathT > 1.4) {
        m.breathT = 0;
        applyEffect(w, "蕩", A.breath.power * m.pow, m);
        if (h.arousal >= 50 && !h.drawn && dist > (A.range || 1) && U.chance(0.35)) {
          h.drawn = { x: m.x, y: m.y, t: 1.8, mon: m.d.name };
          record(w, { kind: "drawn", type: "蕩", mon: m.kind, monName: d.name, sev: 1 });
          msg(w, "drawn", { mon: d.name }, 4); say(w, "drawn", { mon: d.name, kind: m.kind });
        }
      }
    }
    // 媚香玉：漂った跡に靄を残す
    if (A.cloud && !w.outcome) {
      m.cloudT = (m.cloudT || 0) + dt;
      if (m.cloudT > A.cloud.every && (m.alert > 0 || dist < 7) && w.clouds.length < 16) { m.cloudT = 0; addCloud(w, m, A.cloud); }
    }
    if (A.kind === "drain" && dist <= A.range && !w.outcome) {
      drainMagic(w, 1.5 * A.power * m.pow * mult(w, "削") * dt, m);
      h.mp = Math.max(0, h.mp - 1.2 * A.power * dt);
      m.drainT = (m.drainT || 0) + dt;
      if (m.drainT > 2) { m.drainT = 0; record(w, { kind: "drain", type: "削", mon: m.kind, monName: d.name, sev: 1 }); msg(w, "drain", { mon: d.name }, 4); hitDesc(w, m, 8); }
      if (A.legGrab && dist < A.legGrab && m.cd <= 0 && !h.bound) { m.cd = 4; if (grab(w, m, 0.6 * m.pow, "絡")) m.holding = true; }
    }
    m.mvx = (m.x - px) / Math.max(dt, 1e-3); m.mvy = (m.y - py) / Math.max(dt, 1e-3);
  }

  function startCast(w, m, kind) {
    const h = w.run.h, A = m.d.atk;
    const t = kind === "grab2" ? 0.7 : kind === "pounce" ? 0.5 : (A.windup || 0.6);
    const lead = U.clamp(0.12 * ((w.run.real && w.run.real.level) || 2), 0, 0.5) * t;   // 深い・強い相手ほど動きを読む
    m.cast = { id: w.nextId++, kind, t, total: t, tx: h.x + (h.vx || 0) * lead, ty: h.y + (h.vy || 0) * lead };
    monSay(w, m, ["deny", "omazuke", "count", "lure"].includes(kind) ? kind : "attack", kind === "grab" || kind === "shot" || kind === "pounce" ? 0.35 : 0.8);
    if (kind === "shot" || kind === "lure") msg(w, "monCast", { mon: m.d.name, skill: G.Text.skillName(m.kind, kind) }, 1.5);
  }

  function fire(w, m, dist) {
    const h = w.run.h, A = m.d.atk, c = m.cast;
    m.cast = null;
    const alertN = w.monsters.filter(o => o.alert && o.hp > 0).length;
    m.cd = A.cd * (1 + 0.4 * Math.max(0, alertN - 1));      // 群れほど一体ずつの間隔は長い
    m.lunge = 0.22; m.lungeA = U.angle(m.x, m.y, h.x, h.y);  // 放つ瞬間、飛びかかる
    if (c.kind === "pounce") { m.dash = { t: 0.34, a: U.angle(m.x, m.y, c.tx, c.ty) }; msg(w, "pounce", { mon: m.d.name }, 1); return; }
    if (c.kind === "grab2") {
      if (dist <= (A.alsoGrab || A.range) + 0.3 && !w.outcome) { if (grab(w, m, A.power * m.pow * 0.8, "絡")) m.holding = true; }
      else msg(w, "miss", { mon: m.d.name }, 1);
      return;
    }
    if (c.kind === "grab") {
      if (dist <= (A.range || 1) + 0.3 && !w.outcome) {
        if (m.hidden) { m.hidden = false; say(w, m.d.chest ? "mimic" : "ambush", { mon: m.d.name }); msg(w, "ambush", { mon: m.d.name }); }
        if (grab(w, m, A.power * m.pow, m.d.type === "蕩" ? "蕩" : "絡")) m.holding = true;
        if (m.d.type === "蕩") applyEffect(w, "蕩", A.power * m.pow * 0.6, m);
      } else { msg(w, "miss", { mon: m.d.name }, 1); fx(w, { kind: "miss", x: m.x, y: m.y, life: 0.3 }); }
    } else if (c.kind === "shot" && A.fan) {   // 光の扇：弾ではなく、一瞬で届く
      const a = U.angle(m.x, m.y, c.tx, c.ty);
      fx(w, { kind: "fan", x: m.x, y: m.y, a, arc: A.fan, r: A.range, color: "#d8b8ff", life: 0.55 });
      const d = U.dist(m.x, m.y, h.x, h.y);
      if (!w.outcome && d <= A.range && Math.abs(U.angDiff(a, U.angle(m.x, m.y, h.x, h.y))) < A.fan && M.los(w.map, m.x, m.y, h.x, h.y) && h.ifr <= 0) { applyEffect(w, m.d.type, A.power * m.pow, m); hitDesc(w, m, 3); if (A.brain) { addBrain(w, A.brain, m); msg(w, "brain", { c: Math.round(h.brain || 0) }, 2); } }
      else msg(w, "miss", { mon: m.d.name }, 1);
    } else if (c.kind === "shot") {
      const a0 = U.angle(m.x, m.y, c.tx, c.ty) + U.rf(-0.06, 0.06);
      const sp = A.proj === "beam" ? 11 : A.proj === "psy" ? 6.5 : 7, n = A.spread || 1;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * SPREAD;
        w.projs.push({ id: w.nextId++, x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, owner: "m", src: m, type: m.d.type, power: A.power * m.pow, r: A.proj === "beam" ? 0.16 : 0.22, life: (A.range + 1) / sp, kind: A.proj, surge: A.surge, sigil: A.sigil });
      }
    } else if (c.kind === "deny") {             // 寸止めの淫魔：快感に栓をする
      if (dist <= A.range && M.los(w.map, m.x, m.y, h.x, h.y) && !w.outcome) {
        h.deny = { t: A.dur, over: (h.deny && h.deny.over) || 0, mon: m.kind, monName: m.d.name };
        applyEffect(w, "惑", A.power * m.pow, m);
        record(w, { kind: "deny", type: "惑", mon: m.kind, monName: m.d.name, sev: 2 }); msg(w, "deny", { mon: m.d.name }); say(w, "deny", {});
        if (U.chance(0.3)) addCharm(w, m);
      }
    } else if (c.kind === "omazuke") {          // 夢魔の女王：寸前まで引き上げて、止める。三度目で、ねだらせる
      if (dist <= A.range && M.los(w.map, m.x, m.y, h.x, h.y) && !w.outcome) {
        h.qDeny = (h.qDeny || 0) + 1;
        h.pleasure = Math.max(h.pleasure, 94); h.arousal = Math.min(100, h.arousal + 12);
        h.deny = { t: 2.5, over: (h.deny && h.deny.over) || 0, mon: m.kind, monName: m.d.name, queen: true };
        record(w, { kind: "edge", type: "惑", mon: m.kind, monName: m.d.name, sev: 2 }); msg(w, "queenStop", { mon: m.d.name, c: h.qDeny });
        addCharm(w, m, 8);
        if (h.qDeny >= 3) {
          h.qDeny = 0; const over = h.deny.over; h.deny = null;
          record(w, { kind: "beg", type: "惑", mon: m.kind, monName: m.d.name, sev: 3 }); openScene(w, "beg", m);
          releaseOverflow(w, over + 60, m, "queen");
        }
      }
    } else if (c.kind === "count") {            // 数え歌：十数えるあいだ、声を出したら負け
      if (dist <= A.range && !w.outcome && !h.countGame) {
        h.countGame = { t: 10, p0: h.pleasure, c0: h.climax, mon: m.kind, monName: m.d.name, n: 0 };
        record(w, { kind: "countStart", type: "惑", mon: m.kind, monName: m.d.name, sev: 1 }); msg(w, "countStart", { mon: m.d.name }); openScene(w, "countStart", m);
      }
    } else if (c.kind === "attach") {           // 星喰み：服の中へ滑り込んで貼りつく
      if (dist <= (A.range || 1) + 0.3 && !w.outcome && addAttach(w, A.as, m)) { m.hp = 0; if (m.summoned) w.dir.live = Math.max(0, w.dir.live - 1); }
      else msg(w, "miss", { mon: m.d.name }, 1);
    } else if (c.kind === "possess") {
      if (!(dist <= (A.range || 1) + 0.3 && !w.outcome && possess(w, m))) { msg(w, "miss", { mon: m.d.name }, 1); fx(w, { kind: "miss", x: m.x, y: m.y, life: 0.3 }); }
    } else if (c.kind === "lure") {
      if (dist <= A.range && M.los(w.map, m.x, m.y, h.x, h.y) && !w.outcome) { applyEffect(w, "惑", A.power * m.pow, m, "lure"); hitDesc(w, m, 5); if (U.chance(A.charm ?? 0.35)) addCharm(w, m, A.charm ? 8 : 12); }
    }
  }

  /* ================================================================ 罠 */
  function updateTraps(w, dt) {
    const h = w.run.h;
    for (const tr of w.traps) {
      if (tr.d.emit) { updateTower(w, tr, dt); continue; }
      if (!tr.armed) { tr.rearm -= dt; if (tr.rearm <= 0) tr.armed = true; continue; }
      if (tr.active > 0) {
        tr.active -= dt;
        if (U.dist(h.x, h.y, tr.x, tr.y) < tr.d.radius) { tr.tick = (tr.tick || 0) + dt; if (tr.tick > 1) { tr.tick = 0; applyEffect(w, "蕩", 0.55, tr); } }
        if (tr.active <= 0) { tr.armed = false; tr.rearm = tr.d.rearm; }
        continue;
      }
      if (U.dist(h.x, h.y, tr.x, tr.y) > tr.d.radius || w.outcome) continue;
      if (tr.found && !tr.d.lure && h.state !== "retreat" && U.chance(0.7)) continue;
      triggerTrap(w, tr);
    }
  }
  // 波を放つ設置物：近くで見通せる間、間をおいて効く。決まった回数で、しばらく黙る
  const EMIT = {
    tower:   { every: 3.2, n: 4, color: "#c8a0ff", msg: "towerPulse", fn(w, tr, src) { const h = w.run.h; applyEffect(w, "惑", 0.45, src); if (h.trance > 0 && !h.bound) h.lureTo = { x: tr.x, y: tr.y }; } },
    lull:    { every: 2.6, n: 5, color: "#b8c8ff", msg: "lullPulse", fn(w, tr, src) { const h = w.run.h; applyEffect(w, "惑", 0.35, src); h.slow = Math.max(h.slow, 3); h.will = Math.max(0, h.will - 5); } },
    aphro:   { every: 2.0, n: 6, color: "#ff9ad0", msg: "aphroPulse", fn(w, tr, src) { const h = w.run.h; applyEffect(w, "蕩", 0.3, src); if (tr.pulses % 2 === 0) h.sens = Math.min(5, (h.sens || 0) + 1); } },
    hray:    { every: 2.8, n: 5, color: "#9fb8ff", msg: "hrayPulse", fn(w, tr, src) { const h = w.run.h; applyEffect(w, "惑", 0.6, src); addBrain(w, 10, src); if (h.trance > 0 && !h.bound) h.lureTo = { x: tr.x, y: tr.y }; } },
    furnace: { every: 1.5, n: 8, color: "#8ff0ff", msg: "furnacePulse", fn(w, tr, src) { const h = w.run.h; drainMagic(w, 6 * mult(w, "削"), src); h.mp = Math.max(0, h.mp - 3); h.pleasure += 4 * intake(w) * (1 + 0.15 * trait(w, "drainBliss")); record(w, { kind: "drain", type: "削", mon: "furnace", monName: tr.d.name, sev: 1 }); checkClimax(w, src); } },
    hive:    { every: 3.0, n: 5, color: "#b8ffd8", msg: "hivePulse", fn(w, tr, src) { if (w.monsters.filter(m => m.hp > 0 && m.kind === "hibiki").length < 7) { const p = M.randomFloor(w.map, (x, y) => U.dist(x, y, tr.x, tr.y) < 2.5); if (p) { const m = spawnMonster(w, "hibiki", p.x, p.y, false); m.alert = 6; } } } },
    lips:    { every: 2.0, n: 6, color: "#ff9ad0", msg: "lipsPulse", fn(w, tr, src) { const h = w.run.h; applyEffect(w, "蕩", 0.3, src); addCum(w, 6, src); h.kissN = (h.kissN || 0) + (U.chance(0.25) ? 1 : 0); } },
    yurugi:  { every: 2.6, n: 6, color: "#e8b0a0", msg: "yurugiPulse", fn(w, tr, src) { applyEffect(w, "惑", 0.35, src); if (tr.pulses % 3 === 0) addCrack(w, 1, src); } },
    kaikou:  { every: 3.4, n: 4, color: "#ffe27a", msg: "kaikouPulse", fn(w, tr, src) { const h = w.run.h;   // 防いでも、ヒビから入った分が「絶頂にも満たない絶頂」になる
      if ((h.crack || 0) >= 4 && U.chance(0.1 * h.crack)) { h.pleasure = 100; checkClimax(w, src); }
      else { h.pleasure = Math.max(h.pleasure, 90); h.ache = Math.max(h.ache || 0, 25); record(w, { kind: "miniClimax", type: "蕩", sev: 2, monName: tr.d.name }); msg(w, "miniClimax", {}); } } },
    kouro:   { every: 2.6, n: 5, color: "#e0a0ff", msg: "kouroPulse", fn(w, tr, src) { const h = w.run.h; applyEffect(w, "惑", 0.3, src); h.impSweet = true; const imp = w.monsters.find(m => m.hp > 0 && IMPS.includes(m.kind) && U.dist(m.x, m.y, h.x, h.y) < 8); if (imp && U.chance(0.35)) addCharm(w, imp, 10); } },
  };
  function updateTower(w, tr, dt) {
    const h = w.run.h;
    if (!tr.armed) { tr.rearm -= dt; if (tr.rearm <= 0) { tr.armed = true; tr.pulses = 0; } return; }
    if (w.outcome) return;
    if (U.dist(h.x, h.y, tr.x, tr.y) > tr.d.radius || !M.los(w.map, tr.x, tr.y, h.x, h.y)) { if (tr.pulseT != null) tr.pulseT = Math.max(2.2, tr.pulseT - dt); return; }
    const P = EMIT[tr.d.effect];
    tr.pulseT = (tr.pulseT ?? P.every - 1) + dt;             // 入ってすぐ、最初の波が来る
    if (tr.pulseT < P.every) return;
    tr.pulseT = 0; tr.pulses = (tr.pulses || 0) + 1;
    const src = { d: tr.d, kind: tr.kind, x: tr.x, y: tr.y, id: tr.id };
    if (!tr.found) { tr.found = true; say(w, tr.d.effect === "tower" ? "tower" : tr.d.effect, {}); }
    if (tr.pulses === 1) { record(w, { kind: "trap", type: tr.d.type, trap: tr.kind, trapName: tr.d.name, sev: 1 }); logLine(w, G.Text.log("trap", { trap: tr.d.name }), "mid"); }
    fx(w, { kind: "ring", x: tr.x, y: tr.y, color: P.color, r: tr.d.radius, life: 1.1 });
    msg(w, P.msg, { trap: tr.d.name }, 2);
    P.fn(w, tr, src);
    if (tr.pulses >= P.n) { tr.armed = false; tr.rearm = tr.d.rearm; }
  }
  function triggerTrap(w, tr) {
    const h = w.run.h, e = tr.d.effect;
    tr.found = true;
    const ev = record(w, { kind: "trap", type: tr.d.type, trap: tr.kind, trapName: tr.d.name, sev: 1 });
    logLine(w, G.Text.log("trap", { trap: tr.d.name }), "mid");
    h.liveT = w.t; h.liveTrap = tr.kind;
    msg(w, "trap", { trap: tr.d.name });
    pushMsg(w, G.Text.trapHit(tr.d.effect, { n: heroName(w), trap: tr.d.name }), "trapHit");     // 身体に何が起きたか
    fx(w, { kind: "ring", x: tr.x, y: tr.y, color: "#ffd27a", r: tr.d.radius, life: 0.9 });
    const src = { d: tr.d, kind: tr.kind, x: tr.x, y: tr.y, id: tr.id };
    let rearm = true;
    h.cast = null;
    if (e === "bell") { applyEffect(w, "惑", 1.3, src); for (const m of w.monsters) if (m.hp > 0 && U.dist(m.x, m.y, tr.x, tr.y) < 7) alertMon(w, m, 1); }
    else if (e === "mirror") { applyEffect(w, "惑", 0.8, src); const p = M.randomFloor(w.map, (x, y) => U.dist(x, y, h.x, h.y) > 5); if (p) { h.goal = { x: p.x, y: p.y }; h.mislead = 4; } }
    else if (e === "decoy") { const p = M.randomFloor(w.map, (x, y) => U.dist(x, y, h.x, h.y) > 3 && U.dist(x, y, h.x, h.y) < 6); if (p) { h.decoy = { x: p.x, y: p.y, t: 2.4 }; say(w, "decoy", {}); } }
    else if (e === "glue") { h.glue = 1.6; h.slow = Math.max(h.slow, 3); applyEffect(w, "蕩", 0.4, src); }
    else if (e === "vent") { tr.active = 4.5; rearm = false; say(w, "vent", {}); }
    else if (e === "urn") { applyEffect(w, "蕩", 1.8, src); h.slow = Math.max(h.slow, 2.5); }
    else if (e === "vine") { grab(w, src, 0.8, "絡"); }
    else if (e === "rope") { grab(w, src, 1.2, "絡"); h.cdShot = 3; }
    else if (e === "shrine") { h.rest = 2.5; h.shrineT = 2.5; say(w, "shrine", {}); ev.sev = 2; }
    else if (e === "pillory") {
      if (grab(w, src, 1.0, "絡")) { h.bound.pillory = true; openScene(w, "pillory", src); }
      for (const m of w.monsters) if (m.hp > 0 && U.dist(m.x, m.y, tr.x, tr.y) < 8) alertMon(w, m, 1);
      ev.sev = 2;
    }
    else if (e === "tease") { if (grab(w, src, 0.9, "蕩")) { h.bound.edge = true; openScene(w, "tease", src); } ev.sev = 2; }
    else if (e === "belt") {
      const p = M.randomFloor(w.map, (x, y) => U.dist(x, y, h.x, h.y) > 4 && U.dist(x, y, h.x, h.y) < 9 && w.traps.some(t => U.dist(t.x, t.y, x, y) < 2.5 && t !== tr)) || M.randomFloor(w.map, (x, y) => U.dist(x, y, h.x, h.y) > 4);
      if (p) { h.convey = { x: p.x, y: p.y, t: 3.5 }; h.cast = null; say(w, "belt", {}); }
    }
    else if (e === "gate") { if (grab(w, src, 0.8, "絡")) { h.bound.slowStruggle = 0.55; openScene(w, "gate", src); } ev.sev = 2; }
    else if (e === "cuffs") { if (grab(w, src, 0.5, "絡")) { h.bound.slowStruggle = 0.4; h.bound.wait = true; openScene(w, "cuffs", src); } ev.sev = 2; }
    else if (e === "bed") { h.rest = 0; applyEffect(w, "惑", 1.4, tr); h.hypno = "催眠"; h.trance = Math.max(h.trance, 7); h.sleep = 7; drainMagic(w, 8, src); record(w, { kind: "trance", type: "惑", mon: "bed", monName: tr.d.name, sev: 2, hidden: true }); msg(w, "sleep", {}); openScene(w, "bed", src); ev.sev = 2; if (tr.room && tr.room.wake) tr.room.wake(); }
    else if (e === "spring") { if (grab(w, src, 0.9, "蕩")) { h.bound.edge = false; openScene(w, "spring", src); } h.arousal = Math.min(100, h.arousal + 10); ev.sev = 2; if (tr.room && tr.room.wake) tr.room.wake(); }
    else if (e === "slimeDrop") {             // 天井から粘体：落ちてきたものが、そのまま包み込む
      const m = spawnMonster(w, "slime", h.x, h.y, false);
      m.alert = 6; m.hop = 0.32;
      if (grab(w, m, 1.0, "蕩")) { m.holding = true; h.bound.sceneShown = true; }
      applyEffect(w, "蕩", 0.8, m);
      openScene(w, "slimeDrop", src); ev.sev = 2;
    }
    else if (e === "bud") { if (grab(w, src, 0.9, "蕩")) { Object.assign(h.bound, { hang: true, slowStruggle: 0.7, sceneShown: true }); openScene(w, "bud", src); } ev.sev = 2; }
    else if (e === "root") { if (grab(w, src, 1.0, "絡")) { Object.assign(h.bound, { root: true, slowStruggle: 0.45, sceneShown: true }); openScene(w, "root", src); } ev.sev = 2; }
    else if (e === "cocoon") { if (grab(w, src, 0.8, "絡")) { Object.assign(h.bound, { cocoon: true, slowStruggle: 0.5, noKnife: true, sceneShown: true }); openScene(w, "cocoon", src); } ev.sev = 2; }
    else if (e === "ratchet") { if (grab(w, src, 1.1, "絡")) { Object.assign(h.bound, { ratchet: { t: 0, n: 0, open: 13 }, sceneShown: true }); openScene(w, "ratchet", src); } ev.sev = 2; }
    else if (e === "shadow") { if (grab(w, src, 0.7, "絡")) { Object.assign(h.bound, { shadow: { t: 0, arms: 2 }, sceneShown: true }); openScene(w, "shadow", src); } ev.sev = 2; }
    else if (e === "altar") {                 // 紋の転写：足が止まり、押し返そうと踏ん張るほど深く焼き付く
      h.altar = { t: 3.2, src }; h.glue = 3.4; h.cast = null;
      applyEffect(w, "蕩", 0.8, src);
      openScene(w, "altar", src); ev.sev = 2;
    }
    else if (e === "echo") {                  // 復唱の門：読み上げた文句が、頭の底に鉤を残す
      h.glue = 2.6; h.cast = null; applyEffect(w, "惑", 0.9, src);
      if (!h.trigger) { h.trigger = true; h.trigT = U.rf(15, 30); record(w, { kind: "trigger", type: "惑", sev: 2, monName: tr.d.name }); }
      openScene(w, "echo", src); ev.sev = 2;
    }
    else if (e === "armor") { if (grab(w, src, 1.0, "絡")) { Object.assign(h.bound, { armor: true, noFlash: true, slowStruggle: 0.6, sceneShown: true }); openScene(w, "armor", src); } ev.sev = 2; }
    else if (e === "stasis") { h.freeze = 3.6; h.cast = null; record(w, { kind: "freeze", type: "惑", sev: 2, monName: tr.d.name }); msg(w, "stasis", {}); openScene(w, "stasis", src); ev.sev = 2; }
    else if (e === "vow") {                   // 誓い：この階を出るまで、達してはならない
      if (!h.omazuke) { h.omazuke = { over: 0, floor: w.floorNo }; record(w, { kind: "vow", type: "惑", sev: 2, monName: tr.d.name }); msg(w, "vow", {}); openScene(w, "vow", src); }
      ev.sev = 2;
    }
    else if (e === "saddle") {
      const p = M.randomFloor(w.map, (x, y) => U.dist(x, y, h.x, h.y) > 3 && U.dist(x, y, h.x, h.y) < 7);
      if (p) { h.convey = { x: p.x, y: p.y, t: 4.5, saddle: true }; h.cast = null; openScene(w, "saddle", src); }
      ev.sev = 2;
    }
    else if (e === "itch") { if (grab(w, src, 0.8, "蕩")) { Object.assign(h.bound, { itch: true, slowStruggle: 0.7, sceneShown: true }); h.ache = 25; openScene(w, "itch", src); } ev.sev = 2; }
    else if (e === "tickle") { if (grab(w, src, 0.5, "蕩")) Object.assign(h.bound, { tickle: true, brief: 4.5 }); say(w, "tickle", {}); }
    else if (e === "exam") { if (grab(w, src, 1.0, "絡")) { Object.assign(h.bound, { develop: true, slowStruggle: 0.6, sceneShown: true }); openScene(w, "exam", src); } ev.sev = 2; }
    else if (e === "net") { if (grab(w, src, 0.5, "絡")) Object.assign(h.bound, { net: true, brief: 5 }); h.slow = Math.max(h.slow, 3); }
    else if (e === "pit") { h.glue = 3.6; h.cast = null; say(w, "pit", {}); for (const m of w.monsters) if (m.hp > 0 && U.dist(m.x, m.y, tr.x, tr.y) < 8) alertMon(w, m, 1); }
    else if (e === "toybox") { addAttach(w, "orb", src); ev.sev = 2; }
    else if (e === "suit") { addAttach(w, "suit", src); }
    else if (e === "curtain") { applyEffect(w, "蕩", 0.5, src); if (U.chance(0.25)) { if (grab(w, src, 0.5, "絡")) h.bound.brief = 3; } say(w, "curtain", {}); }
    else if (e === "sucker") { applyEffect(w, "蕩", 0.3, src); addAttach(w, "sucker", src); }
    else if (e === "honey") { h.glue = 2.2; h.slow = Math.max(h.slow, 4); applyEffect(w, "蕩", 0.8, src); say(w, "honey", {}); }
    else if (e === "wring") { applyEffect(w, "惑", 0.9, src); if (!h.taint) { h.taint = true; record(w, { kind: "taint", type: "惑", sev: 1, monName: tr.d.name }); } }
    else if (e === "pod") { if (grab(w, src, 0.9, "絡")) { Object.assign(h.bound, { pod: true, slowStruggle: 0.5, sceneShown: true }); openScene(w, "pod", src); addBrain(w, 20, src); } ev.sev = 2; }
    else if (e === "capture") {
      if (grab(w, src, 1.1, "絡")) { Object.assign(h.bound, { slowStruggle: 0.6, sceneShown: true }); openScene(w, "capture", src); }
      for (const m of w.monsters) if (m.hp > 0 && U.dist(m.x, m.y, tr.x, tr.y) < 9) alertMon(w, m, 1);
      ev.sev = 2;
    }
    else if (e === "web") { grab(w, src, 0.75, "絡"); }
    else if (e === "rune") { engraveSigil(w, 1, src); }
    // ---- 蟲 ----
    else if (e === "mushiPit") { h.glue = 2.2; h.cast = null; addAttach(w, "mushi", src); addAttach(w, "mushi", src); say(w, "mushiPit", {}); ev.sev = 2; }
    // ---- 変生の神殿 ----
    else if (e === "ring") { if (h.futa && !h.ring) { h.ring = { over: 0 }; record(w, { kind: "ring", type: "蕩", sev: 2, monName: tr.d.name }); msg(w, "ringOn", {}); openScene(w, "ring", src); } else applyEffect(w, "蕩", 0.4, src); ev.sev = 2; }
    else if (e === "gauze") { if (grab(w, src, 0.9, "蕩")) { Object.assign(h.bound, { futaSuck: 16, slowStruggle: 0.7, sceneShown: true }); openScene(w, "gauze", src); } ev.sev = 2; }
    else if (e === "temari") { applyEffect(w, "蕩", 0.4, src); addCum(w, 22, src); say(w, "temari", {}); }
    else if (e === "count") { if (!h.countAltar) { h.countAltar = true; record(w, { kind: "countAltar", sev: 2, monName: tr.d.name }); openScene(w, "countAltar", src); } ev.sev = 2; }
    else if (e === "feather") { if (grab(w, src, 0.6, "蕩")) Object.assign(h.bound, { tickle: true, futaSuck: 8, brief: 6 }); openScene(w, "feather", src); ev.sev = 2; }
    else if (e === "nama") { if (grab(w, src, 0.9, "蕩")) { Object.assign(h.bound, { edge: true, futaSuck: 10, sceneShown: true }); h.tipTease = 99; openScene(w, "nama", src); } ev.sev = 2; }
    else if (e === "suikan") { if (grab(w, src, 1.0, "蕩")) { Object.assign(h.bound, { futaSuck: 20, slowStruggle: 0.6, sceneShown: true }); openScene(w, "suikan", src); } ev.sev = 2; }
    // ---- 教団 ----
    else if (e === "shashin") { addCharm(w, { kind: "kyouso", d: G.MONSTERS.kyouso }, 2); pray(w, src, 3.2); if ((h.charm.kyouso || 0) >= 2) addCrack(w, 1, src); openScene(w, "shashin", src); ev.sev = 2; }
    else if (e === "maseki") { drainMagic(w, 14 * mult(w, "削"), src); h.pleasure += 18 * intake(w); record(w, { kind: "drain", type: "削", mon: "maseki", monName: tr.d.name, sev: 2 }); say(w, "maseki", {}); checkClimax(w, src); ev.sev = 2; }
    else if (e === "seisui") { h.arousal = Math.min(100, h.arousal + 30); h.sens = Math.min(5, (h.sens || 0) + 1); applyEffect(w, "蕩", 0.8, src); say(w, "seisui", {}); ev.sev = 2; }
    else if (e === "jouka") { if (grab(w, src, 0.7, "蕩")) { Object.assign(h.bound, { edge: true, begAfter: 7, slowStruggle: 0.4, sceneShown: true }); h.ache = Math.max(h.ache || 0, 20); openScene(w, "jouka", src); } ev.sev = 2; }
    // ---- 淫魔の館 ----
    else if (e === "keiyaku") { if (!h.permit) { h.permit = { over: 0, edges: 0 }; record(w, { kind: "permit", type: "惑", sev: 2, monName: tr.d.name }); msg(w, "permitOn", {}); openScene(w, "keiyaku", src); } ev.sev = 2; }
    else if (e === "basin") { drainMagic(w, 16 * mult(w, "削"), src); h.arousal = Math.max(0, h.arousal - 15); say(w, "basin", {}); ev.sev = 2; }
    if (rearm) { tr.armed = false; tr.rearm = tr.d.rearm; }
  }

  // 見破った罠は、撃って壊せる（部屋ごとの仕掛けは壊せない）
  function breakTrap(w, tr) {
    w.traps = w.traps.filter(t => t !== tr);
    fx(w, { kind: "burst", x: tr.x, y: tr.y, color: "#fff2a8", life: 0.6 });
    msg(w, "trapBreak", { trap: tr.d.name }, 1);
    record(w, { kind: "trapBreak", trap: tr.kind, trapName: tr.d.name, sev: 0 });
    learn(w, tr.kind, 1);
  }
  /* ================================================================ 弾 */
  function updateProjs(w, dt) {
    const h = w.run.h;
    for (const p of w.projs) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (M.tile(w.map, p.x, p.y) !== 0) { p.life = 0; if (p.owner === "h") h.wallHits = (h.wallHits || 0) + 1; fx(w, { kind: "hit", x: p.x, y: p.y, color: "#aaa", life: 0.2 }); continue; }
      if (p.owner === "h") {
        const tr = w.traps.find(t => t.found && t.armed && !t.room && U.dist(p.x, p.y, t.x, t.y) < Math.min(0.7, t.d.radius * 0.6) + p.r);
        if (tr) { breakTrap(w, tr); p.life = 0; continue; }
        for (const m of w.monsters) {
          if (m.hp <= 0 || U.dist(p.x, p.y, m.x, m.y) > m.d.r + p.r) continue;
          if (m.d.reflect && U.chance(m.d.reflect)) {
            p.owner = "m"; p.vx = -p.vx; p.vy = -p.vy; p.type = "惑"; p.power = 0.7; p.src = m; p.kind = "psy";
            say(w, "reflect", {}); msg(w, "reflect", { mon: m.d.name }); break;
          }
          hurtMon(w, m, p.dmg); p.life = 0; h.wallHits = 0; break;
        }
      } else if (p.life > 0 && !w.outcome && U.dist(p.x, p.y, h.x, h.y) < HR + p.r) {
        p.life = 0;
        h.kb = 0.25; h.kbA = Math.atan2(p.vy, p.vx);
        applyEffect(w, p.type, p.power, p.src); hitDesc(w, p.src, 3);
        if (p.surge && !w.outcome) {                // 照射：身体の準備を待たずに跳ね上がる
          h.pleasure += p.surge * mult(w, "蕩") * tierFx(w).pleasure * heat(w);
          record(w, { kind: "surge", type: "蕩", mon: p.src && p.src.kind, monName: p.src && p.src.d ? p.src.d.name : "", sev: 2 });
          msg(w, "surge", { mon: p.src && p.src.d ? p.src.d.name : "" }); say(w, "surge", {});
          checkClimax(w, p.src);
        }
        if (p.sigil) engraveSigil(w, p.sigil, p.src);
        fx(w, { kind: "hit", x: h.x, y: h.y, color: "#ff9ad0", life: 0.35 });
      }
    }
    w.projs = w.projs.filter(p => p.life > 0);
  }

  /* ================================================================ 配置（プレイヤー／オート指揮） */
  function cardInfo(card) {
    if (card.startsWith("trap:")) { const id = card.slice(5); return { id, trap: true, d: G.TRAPS[id] }; }
    return { id: card, trap: false, d: G.MONSTERS[card] };
  }
  function canPlace(w, card, x, y, night) {
    const h = w.run.h, ci = cardInfo(card);
    if (!ci.d) return "none";
    if (!M.walkable(w.map, x, y)) return "wall";
    const cost = ci.d.cost;
    if (night) { if (w.night.spent + cost > G.BAL.nightBudget) return "cost"; }
    else if (w.dir.spent + cost > w.dir.cap) return "cost";
    if ((w.dir.ct[card] || 0) > 0) return "ct";
    if (!ci.trap && w.dir.live >= w.run.maxLive) return "live";
    if (night) return "ok";
    const d = U.dist(x, y, h.x, h.y);
    if (d < 3.2) return "near";
    if (d < 8.5 && M.los(w.map, h.x, h.y, x, y) && Math.abs(U.angDiff(h.a, U.angle(h.x, h.y, x, y))) < 1.3) return "seen";
    if (U.dist(x, y, w.map.down.x, w.map.down.y) < 1 || U.dist(x, y, w.map.up.x, w.map.up.y) < 1) return "stairs";
    return "ok";
  }
  function place(w, card, x, y, night) {
    const why = canPlace(w, card, x, y, night);
    if (why !== "ok") return why;
    const ci = cardInfo(card);
    x = Math.floor(x) + 0.5; y = Math.floor(y) + 0.5;
    if (night) w.night.spent += ci.d.cost; else w.dir.spent += ci.d.cost;
    w.dir.ct[card] = ci.d.ct;
    if (ci.trap) spawnTrap(w, ci.id, x, y);
    else { const m = spawnMonster(w, ci.id, x, y, true); if (night) m.alert = 10; }
    fx(w, { kind: "summon", x, y, color: ci.trap ? "#ffd27a" : "#e070b0", life: 0.8 });
    record(w, { kind: "place", card, sev: 0, night: !!night });
    return "ok";
  }
  function autoDirect(w, dt) {
    w.dir.next -= dt;
    if (w.dir.next > 0 || w.outcome) return;
    w.dir.next = U.rf(3.2, 5.2);
    const h = w.run.h, deck = w.run.deck;
    // オート指揮は控えめ：弱っていない相手には、階のコストを2残す
    const reserve = (h.hp < 50 || h.form === "civilian" || h.arousal > 50) ? 0 : 2;
    const usable = deck.filter(c => { const ci = cardInfo(c); return ci.d && (w.dir.ct[c] || 0) <= 0 && w.dir.spent + ci.d.cost <= w.dir.cap - reserve && (ci.trap || w.dir.live < w.run.maxLive); });
    if (!usable.length) return;
    const score = c => {
      const ci = cardInfo(c); let s = mult(w, ci.d.type) * 2;
      if (ci.d.type === "削" && h.form === "magica") s += h.magic < 40 ? 1.6 : 0.2;
      if (h.form === "civilian" && ci.d.type === "絡") s += 2;
      return s + U.rf(0, 1);
    };
    usable.sort((a, b) => score(b) - score(a));
    const card = usable[0];
    const goal = h.goal || h.search || w.map.down;
    let spot = null;
    for (let k = 0; k < 40 && !spot; k++) {
      const t = U.rf(0.35, 0.9);
      const x = U.lerp(h.x, goal.x, t) + U.rf(-2.5, 2.5), y = U.lerp(h.y, goal.y, t) + U.rf(-2.5, 2.5);
      if (canPlace(w, card, x, y) === "ok") spot = { x, y };
    }
    if (!spot) spot = M.randomFloor(w.map, (x, y) => canPlace(w, card, x, y) === "ok" && U.dist(x, y, h.x, h.y) < 9);
    if (spot) place(w, card, spot.x, spot.y);
  }

  /* ================================================================ 1コマ進める */
  function step(w, dt) {
    if (w.scene || w.outcome) return;
    const h = w.run.h;
    w.t += dt; h.floorT += dt;
    for (const k in w.dir.ct) w.dir.ct[k] = Math.max(0, w.dir.ct[k] - dt);
    h.cdShot = Math.max(0, h.cdShot - dt); h.cdBurst = Math.max(0, h.cdBurst - dt); h.cdShove = Math.max(0, h.cdShove - dt); h.cdMelee = Math.max(0, (h.cdMelee || 0) - dt);
    h.cdFlash = Math.max(0, (h.cdFlash || 0) - dt); h.cdBreak = Math.max(0, (h.cdBreak || 0) - dt); h.ifr = Math.max(0, (h.ifr || 0) - dt);
    h.slow = Math.max(0, h.slow - dt); h.glue = Math.max(0, h.glue - dt);
    if (h.trance > 0) { h.tranceRun = (h.tranceRun || 0) + dt; if (h.tranceRun > 6 && !h.sleep) { h.trance = 0.001; } } else h.tranceRun = 0;   // 惑いが6秒続いたら、首を振って振り払う
    if (h.trance > 0) { h.trance -= dt; if (h.trance <= 0) { h.tranceRun = 0; h.clearT = w.t + 3.5; msg(w, h.sleep > 0 ? "wake" : "tranceOut", {}, 3); if (h.hyp <= 0) h.hypno = null; } }   // 我に返った直後は、しばらく惑わされない
    if (h.hyp > 0) {
      h.hyp = Math.max(0, h.hyp - 0.8 * dt);
      if (h.hyp <= 0 && h.trance <= 0) { h.hypno = null; msg(w, "hypOut", {}, 3); }
      h.dazeT -= dt;
      if (h.trance <= 0 && !h.bound && h.dazeT <= 0) { h.dazeT = 1; if (U.chance(h.hyp / 420)) { h.trance = 0.8 + h.hyp / 50; msg(w, "daze", {}, 6); } }
    }
    if (h.sleep > 0) h.sleep -= dt;
    h.watched = Math.max(0, (h.watched || 0) - dt);
    tickStatus(w, dt);
    // 憑き手：光弾は撃てず、その手に撫でられつづける
    if (h.possess) {
      h.possess.t -= dt; h.cdShot = Math.max(h.cdShot, 0.3);
      h.pleasure += 3.2 * mult(w, "惑") * tierFx(w).pleasure * heat(w) * dt;
      h.arousal = Math.min(100, h.arousal + 1.1 * dt);
      if (U.chance(dt * 0.25)) msg(w, "possessTouch", {}, 5);
      checkClimax(w, { d: { name: h.possess.monName, type: "惑" }, kind: h.possess.mon });
      if (h.possess && h.possess.t <= 0) endPossess(w, false);
    }
    // 淫紋の祭壇：転写を押し返そうと踏ん張る。気力が残っているほど、深く焼き付く
    if (h.altar) {
      h.altar.t -= dt; h.will = Math.max(0, h.will - 2.5 * dt); h.glue = Math.max(h.glue, 0.2);
      if (h.altar.t <= 0) { const src = h.altar.src; h.altar = null; engraveSigil(w, h.will > 55 ? 2 : 1, src); }
    }
    // 媚薬の靄
    for (const c of w.clouds) c.t += dt;
    w.clouds = w.clouds.filter(c => c.t < c.life);
    const cl = w.clouds.find(c => U.dist(c.x, c.y, h.x, h.y) < c.r);
    h.inCloud = !!cl;
    if (cl && !w.outcome) { h.cloudT = (h.cloudT || 0) + dt; if (h.cloudT > 1.2) { h.cloudT = 0; applyEffect(w, "蕩", cl.power, { d: { name: cl.name, type: "蕩" }, kind: cl.kind, x: cl.x, y: cl.y }); msg(w, "cloud", { mon: cl.name }, 5); } }
    if (h.bubble) { h.bubble.t -= dt; if (h.bubble.t <= 0) h.bubble = null; }
    // 魅了は、触れられ続けなければ少しずつ解ける（Game4：一段26秒）
    if (h.charm) for (const k in h.charm) if (h.charm[k] > 0 && w.t - (h.charmT[k] ?? -99) > 26) { h.charm[k]--; h.charmT[k] = w.t; if (!h.charm[k]) msg(w, "charmFade", { mon: G.MONSTERS[k] ? G.MONSTERS[k].name : "" }, 4); }
    // 魅了Ⅱ以上：ときどき、好きな種族の方へ、自分から寄っていってしまう（Game4 の発作）
    if (h.charm && !h.bound && !h.drawn && h.form) {
      h.driftT = (h.driftT ?? 6.5) - dt;
      if (h.driftT <= 0) {
        h.driftT = 6.5;
        const m = w.monsters.filter(o => o.hp > 0 && (h.charm[o.kind] || 0) >= 2 && U.dist(o.x, o.y, h.x, h.y) < 7 && h.known[o.id]).sort((a, b) => U.dist(a.x, a.y, h.x, h.y) - U.dist(b.x, b.y, h.x, h.y))[0];
        if (m) { const lv = h.charm[m.kind]; h.drawn = { x: m.x, y: m.y, t: 1.2 * lv, mon: m.d.name }; record(w, { kind: "drawn", type: "惑", mon: m.kind, monName: m.d.name, sev: 1 }); msg(w, "drawn", { mon: m.d.name }); say(w, "charmPull", { mon: m.d.name }); }
      }
    }
    // 達したあと、責めが止んでいれば、我に返る一言
    if (h.recoverAt && w.t > h.recoverAt) { if (!h.bound || !h.bound.nAct) feed(w, "recover", G.Text.live.recover(G.tier(w.run.save.body, w.run.save.mind), heroName(w))); h.recoverAt = null; }
    if (h.decoy) { h.decoy.t -= dt; if (h.decoy.t <= 0) h.decoy = null; }
    if (h.mislead > 0) { h.mislead -= dt; if (h.mislead <= 0) { say(w, "misleadRealize", {}); h._pp = null; } }
    h.peekT = Math.max(0, h.peekT - dt);
    h.idleMp += dt;
    if (h.noTransform > 0) h.noTransform -= dt;
    if (h.form === "magica") {
      h.magic = Math.max(0, h.magic - G.BAL.passiveMagicDrain * dt);
      if (h.magic <= 0) untransform(w, null);
      if (h.idleMp > 1.5) h.mp = Math.min(h.mpMax || G.HIKARI.mpMax, h.mp + (h.rest > 0 ? G.HIKARI.mpRest : G.HIKARI.mpRegen) * (sk(w, "breath") ? 1.4 : 1) * dt);
    }
    h.arousal = Math.max(0, h.arousal - (h.bound ? 0 : 0.3) * dt);
    // 快感は、責めが止めば引いていく。発情しているほど引きにくい
    h.pleasure = Math.max(0, h.pleasure - (h.bound ? 0.7 : 2.2) * (1.3 - 0.9 * h.arousal / 100) * dt);
    if (!h.bound) h.will = Math.min(100, h.will + 1.2 * dt * (1 - h.arousal / 150) * (1 - (h.hyp || 0) / 110) * (sk(w, "breath") ? 1.5 : 1));
    perceive(w);
    liveliness(w, dt);
    const rm = roomAt(w, h.x, h.y);
    if (rm !== h.room) {
      h.room = rm;
      const tr = rm && (w.trapRooms || []).find(t => t.r === rm);
      if (tr && !tr.active && Math.hypot(h.x - (rm.cx + 0.5), h.y - (rm.cy + 0.5)) < Math.max(rm.w, rm.h)) enterTrapRoom(w, tr);
    }
    for (const tr of w.trapRooms || []) {
      if (!tr.active) continue;
      tr.t += dt;
      if (tr.wakeT > 0) { tr.wakeT -= dt; if (tr.wakeT <= 0 && tr.wake) tr.wake(); }
      if (tr.T.aura && h.room === tr.r && !w.outcome) { tr.auraT = (tr.auraT || 0) + dt; if (tr.auraT > 1.3) { tr.auraT = 0; applyEffect(w, tr.T.aura[0], tr.T.aura[1], { d: { name: tr.T.name, type: tr.T.aura[0] }, kind: tr.key, x: h.x, y: h.y }); } }
    }
    if (w.sealed) {                               // 扉が閉まっている：部屋から出られない
      w.sealed.t -= dt;
      const r = w.sealed.room.r;
      h.x = U.clamp(h.x, r.x + 0.32, r.x + r.w - 0.32); h.y = U.clamp(h.y, r.y + 0.32, r.y + r.h - 0.32);
      if (w.sealed.t <= 0) { w.sealed = null; msg(w, "unsealed", {}); }
    }
    updateHikari(w, dt);
    for (const m of w.monsters) updateMonster(w, m, dt);
    w.monsters = w.monsters.filter(m => m.hp > 0);
    updateTraps(w, dt);
    updateProjs(w, dt);
    if (w.dir.auto) autoDirect(w, dt);
    for (const f of w.fx) f.t += dt;
    w.fx = w.fx.filter(f => f.t < f.life);
    // 古い反応の覚えを捨てる
    if (Math.floor(w.t) !== Math.floor(w.t - dt)) for (const k in h.react) if (w.t - h.react[k].at > 4) { delete h.react[k]; delete h.dashed[k]; }
    if (h.hp <= 0 && !w.outcome) defeat(w, h.bound ? h.bound.src : null);
    if (w.outcome === "down" || w.outcome === "cleared") msg(w, w.outcome === "cleared" ? "portal" : "down", {});
    // 締環：出口で外れる。溜まっていた分が、一度に
    if (h.ring && ["cleared", "retreat", "ordered"].includes(w.outcome) && !w.ringDone) {
      w.ringDone = true; const over = h.ring.over; h.ring = null; const n = Math.min(4, 1 + Math.floor(over / 40));
      h.cum = 0; h.shasei = (h.shasei || 0) + n; record(w, { kind: "ringRelease", type: "蕩", n, sev: 3 });
      if (!w.scene) w.scene = { key: "ringRelease", lines: G.Text.scene("ringRelease", { run: w.run, h, n: heroName(w) }) || [], mon: null };
    }
    // 禁絶の法則：門を出た瞬間に、溜めた分が全部返ってくる
    if (w.run.law === "kinzetsu" && ["cleared", "retreat", "ordered"].includes(w.outcome) && !w.kinDone) {
      w.kinDone = true; const over = (h.kinOver && h.kinOver.over) || 0; h.kinOver = null;
      releaseOverflow(w, over + 60, { kind: "kinzetsu", d: { name: G.LAWS.kinzetsu.name } }, "kinzetsu");
      w.scene = { key: "kinzetsuRelease", lines: G.Text.scene("kinzetsuRelease", { run: w.run, h, n: heroName(w) }) || [], mon: null };
    }
  }

  /* ================================================================ 観測フェーズ（敗北後の一晩） */
  function startNight(w) {
    w.night = { beat: 0, spent: 0, beats: [] };
    const h = w.run.h;
    if (h.kinOver || h.omazuke || h.deny) { const over = ((h.kinOver || {}).over || 0) + ((h.omazuke || {}).over || 0) + ((h.deny || {}).over || 0); h.kinOver = h.omazuke = h.deny = null; if (over > 0) record(w, { kind: "release", type: "蕩", why: "night", n: 1 + Math.floor(over / 55), sev: 3 }); }
    for (const m of w.monsters) if (m.hp > 0 && m.d.spd > 0 && U.dist(m.x, m.y, h.x, h.y) < 9) { m.alert = 99; }
  }
  function nightBeat(w) {
    const h = w.run.h, n = w.night;
    const around = w.monsters.filter(m => m.hp > 0 && (U.dist(m.x, m.y, h.x, h.y) < 9 || m.summoned));
    const lewd = around.filter(m => G.Text.actorOf(m.kind));
    const pool = lewd.length ? lewd : around;
    // 一場面に一〜三体。前の場面と同じ顔ぶれは避けぎみに
    const lead = U.pick(pool.filter(x => !n.beats.some(b => b.mon === x.kind && b.i === n.beat - 1))) || U.pick(pool);
    const group = lead ? [lead].concat(U.shuffle(pool.filter(x => x !== lead)).slice(0, U.pick([0, 1, 1, 2]))) : [];
    const beat = { i: n.beat, mon: lead ? lead.kind : null, monName: lead ? lead.d.name : "", type: lead ? lead.d.type : "蕩", group: group.map(m => m.d.name), acts: 0, climaxN: 0, parts: {} };
    group.forEach((m, i) => { const a = i / Math.max(1, group.length) * Math.PI * 2 + U.rf(0, 1); const nx = h.x + Math.cos(a) * 0.7, ny = h.y + Math.sin(a) * 0.7; if (M.walkable(w.map, nx, ny)) { m.x = nx; m.y = ny; } });
    const scene = G.Text.nightParts(beat, { run: w.run, h, n: n.beat, total: G.BAL.nightBeats });
    const lines = scene.head.slice();
    for (const m of w.monsters) m.bubble = null;
    for (const m of group) { const v = G.Text.voice(m.kind, U.chance(0.5) ? "act" : "climax"); if (v && U.chance(0.7)) { lines.push(`${m.d.name}「${v}」`); m.bubble = { text: v, t: 99 }; } }
    // 何を、どのくらいされたか（夜はもう、直接）
    const swarm = 1 + 0.2 * (group.length - 1);
    for (const m of group) {
      const cat = actCat(w, m) || "hands";
      for (let k = 0, nk = 1 + (U.chance(0.55) ? 1 : 0); k < nk; k++) {
        const act = G.Text.actFor(m.kind, cat, U.chance(0.8) ? 2 : 1); if (!act) continue;
        lines.push(G.Text.fillAct(act, { mon: m.d.name, n: "ひかり" }) + "。" + (act.fx ? "《" + act.fx + "》" : ""));
        beat.acts++; beat.parts[act.part] = (beat.parts[act.part] || 0) + 1;
        crave(w, m.kind, 0.3 * act.pw); { const sv = w.run.save; if (sv) { sv.parts = sv.parts || {}; const pp = sv.parts[m.kind] || (sv.parts[m.kind] = {}); pp[act.part] = (pp[act.part] || 0) + 1; } }
        if (act.watch) { h.arousal = Math.min(100, h.arousal + 5); continue; }
        if (act.cum && h.futa) { h.cum = (h.cum || 0) + 30 * act.pw * swarm; if (h.cum >= 100) { h.cum -= 85; h.shasei = (h.shasei || 0) + 1; lines.push(G.Text.actMsg("nightShasei", { mon: m.d.name, c: h.shasei })); } continue; }
        h.pleasure += 26 * act.pw * swarm * (1 + h.arousal / 150); h.arousal = Math.min(100, h.arousal + 6);
        if (h.pleasure >= 100) { h.pleasure = 25 + U.rf(0, 20); h.climax++; beat.climaxN++; lines.push(G.Text.actMsg("nightClimax", { p: act.p, mon: m.d.name, c: h.climax })); (beat.cx = beat.cx || []).push({ at: lines.length - 1, kind: m.kind, part: act.part, mon: m.d.name }); }
      }
    }
    beat.climax = beat.climaxN > 0;
    lines.push(G.Text.actMsg("nightGauge", { c: Math.round(Math.min(99, h.pleasure)) }));
    if (scene.climax && beat.climax) lines.push(scene.climax);
    if (n.beat === G.BAL.nightBeats - 1) {
      const all = n.beats.concat(beat), acts = all.reduce((a, b) => a + (b.acts || 0), 0), cl = all.reduce((a, b) => a + (b.climaxN || 0), 0);
      const mons = [...new Set(all.flatMap(b => b.group || [b.monName]).filter(Boolean))];
      const parts = {}; for (const b of all) for (const k in b.parts || {}) parts[k] = (parts[k] || 0) + b.parts[k];
      const top = Object.entries(parts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join("・");
      w.run.nightSum = { acts, climax: cl, mons, top };
      lines.push(G.Text.actMsg("nightSum", { mons: mons.join("・"), a: acts, c: cl, top }));
      if (scene.close) lines.push(scene.close);
    }
    beat.lines = lines;
    n.beats.push(beat);
    w.run.night.push(beat);
    record(w, { kind: "night", type: beat.type, mon: beat.mon, monName: beat.monName, sev: 3, climax: beat.climax, n: beat.climaxN, acts: beat.acts, hidden: false });
    n.beat++;
    return beat;
  }

  // ひかりの今の状態（ステータス欄のチップ）。{ name, t（残り秒）, cls }
  function statusList(w) {
    const h = w.run.h, out = [], prep = G.PREP[w.run.stated];
    const add = (name, t, cls) => out.push({ name, t: t > 0 ? t : null, cls });
    const B = h.bound;
    if (B) add(B.hang ? "逆さ吊り" : B.root ? "床下" : B.cocoon ? "繭の中" : B.ratchet ? "爪車（" + B.ratchet.n + "歯）" : B.shadow ? "影の腕×" + B.shadow.arms
               : B.pillory ? "晒し台" : B.edge ? "焦らし" : B.wait ? "壁の環" : B.slowStruggle ? "採寸中" : "拘束", null, "pink");
    if (B) {
      const mol = w.monsters.filter(m => m.molest && m.hp > 0).length, n = B.by.length + mol;
      add((B.src && B.src.d ? B.src.d.name : "") + (n > 1 ? `ほか ${n}体に群がられている` : "に捕まっている") + "・" + (B.nAct ? ["服の上から", "服の中まで", "直接"][B.stage || 0] : "縛られているだけ"), null, B.nAct ? "red" : "dim");
    }
    if (h.possess) add("憑き手（腕）", h.possess.t, "violet");
    if (h.freeze > 0) add("時間停止", h.freeze, "violet");
    if (h.futa) add("変生 射精感" + Math.round(h.cum || 0) + "%" + (h.shasei ? "（" + h.shasei + "回）" : ""), null, "pink");
    if (h.ring) add("締環（溜まっている " + Math.round(h.ring.over) + "）", null, "pink");
    if (h.countAltar) add("数取り " + ((w.run.save && w.run.save.futaMarks) || 0) + "/12", null, "pink");
    if (h.countGame) add("数え歌 " + Math.min(10, h.countGame.n) + (h.countGame.lost ? "（負け）" : ""), h.countGame.t, "violet");
    if (h.permit) add("絶頂許可制", null, "pink");
    if (h.kissMark) add("口づけの印", null, "pink");
    if (h.swell) add("肥大化 " + h.swell, null, "pink");
    if (h.crack) add("心のヒビ " + h.crack, null, "violet");
    if (h.pray > 0) add("祈り", h.pray, "violet");
    if (h.deny) add(h.deny.queen ? "おあずけ（女王）" : "絶頂禁止", h.deny.t, "pink");
    if (h.omazuke) add("誓い：この階では達せない", null, "pink");
    if (w.run.law === "kinzetsu") add("禁絶：溜まっている " + Math.round((h.kinOver || {}).over || 0), null, "pink");
    if (h.sens) add("敏感化 " + h.sens, null, "pink");
    if (h.ache > 0) add("疼き", h.ache, "pink");
    if (h.numb > 0) add("痺れ", h.numb, "gold");
    if (h.high > 0) add("ハイ", h.high, "gold");
    if (h.addict) add("中毒（茸）", null, "gold");
    if (h.sniff > 0) add("嗅いでしまう", h.sniff, "gold");
    if (h.salute > 0) add("敬礼", h.salute, "violet");
    if (h.exposure) add("装束損壊", null, "pink");
    for (const id of h.attach || []) add("付着：" + (ATTACH[id].blind ? "新しい装備？" : ATTACH[id].name), null, "pink");
    for (const k in h.charm || {}) if (h.charm[k]) add("魅了" + ["", "Ⅰ", "Ⅱ", "Ⅲ"][h.charm[k]] + "（" + G.MONSTERS[k].name + "へ）", null, "pink");
    if (h.trigger) add("暗示の引き金", null, "violet");
    if (h.rewired) add("常識改変（敬礼）", null, "violet");
    if (h.brain > 0) add("洗脳 " + Math.round(h.brain) + "%", null, "violet");
    if (h.taint) add("思考汚染", null, "violet");
    if (w.run.law) add(G.LAWS[w.run.law].name, null, "dim");
    if (h.altar) add("紋の転写", h.altar.t, "pink");
    if (h.sigil) add("淫紋 Lv" + h.sigil, null, "pink");
    if (h.drawn) add("引き寄せ", null, "pink");
    if (h.inCloud) add("媚香の靄", null, "pink");
    if (h.sleep > 0) add("眠り", h.sleep, "violet");
    else if (h.trance > 0) add((h.hypno || "惑い") + "・放心", h.trance, "violet");
    if (h.hyp > 0) out.push({ name: (h.hypno || "惑い") + " " + Math.ceil(h.hyp) + "%", t: null, cls: "violet" });
    if (h.glue > 0) add("足止め", h.glue, "gold");
    if (h.slow > 0) add("鈍足", h.slow, "gold");
    if (h.convey) add("運ばれ中", h.convey.t, "gold");
    if (h.watched > 0) add("視線", null, "pink");
    if (h.arousal >= 70) add("発情（強）", null, "pink"); else if (h.arousal >= 40) add("発情", null, "pink");
    if (h.form === "civilian") add((h.noTransform || 0) > 0 ? "変身不可" : "素の姿", h.noTransform > 0 ? h.noTransform : null, "red");
    if (h.cast && h.cast.kind === "transform") add("変身詠唱", h.cast.t, "violet");
    if (h.mislead > 0) add("幻に迷う", h.mislead, "violet");
    if (w.sealed) add("閉じ込め", w.sealed.t, "red");
    if (h.surrounded) add("包囲", null, "red");
    if (prep) add(prep.name + "（" + (prep.numb ? "熱に鈍い" : prep.slow ? "動きが重い" : "暗示に弱い") + "）", null, "dim");
    for (const a of w.run.save.ailments || []) { const A = G.Game && G.Game.AILMENTS[a.id]; if (A) add(A.name, null, "dim"); }
    return out;
  }
  G.Field = { statusList, createWorld, step, place, canPlace, cardInfo, startNight, nightBeat, spawnMonster, mult };
  G.Field._test = { grab, applyEffect, triggerTrap, checkClimax };   // 検査用（tools から直接呼ぶ）
})();
if (typeof module !== "undefined") module.exports = G;
