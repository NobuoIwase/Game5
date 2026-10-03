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
/* field/world.js — field 内部。tools/files.js と index.html の順で読み込む。 */
(function () {
  "use strict";
  G.F = { bind: [] };
  let heroName, say, live, feed, msg, fx, record, releaseOverflow, pray, engraveSigil, possess, defeat, free, roomAt, flash, explore, alertMon, openScene;
  const U = G.U, M = G.Map;
  const HR = 0.3;                       // ひかりの当たりの半径（マス）
  const SPREAD = 0.3;                   // 扇に撃つ弾の間の角度

  /* ================================================================ 堕ちの段階 */
  // 0 抵抗 / 1 綻び / 2 心は拒み、体は応える / 3 待ってしまう
  G.tier = function (body, mind) {
    if (mind >= 50) return 3;
    if (body >= 50) return 2;                 // 体が先に堕ちる。心が追いついても、段階は戻らない
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
      x: map.up.x, y: map.up.y, torn: false, a: Math.PI / 2, vx: 0, vy: 0, face: null, intent: null, label: "探索", think: 0.3,
      known: {}, bound: null, trance: 0, hyp: 0, dazeT: 0, lureTo: null, slow: 0, glue: 0, cdShot: 0, cdBurst: 0, cdShove: 0,
      idleMp: 0, bubble: null, decoy: null, possess: null, drawn: null, altar: null, mislead: 0, rest: 0, shrineT: 0, floorT: 0, peekT: 0, peekHold: 0,
      wantDown: false, stuckT: 0, lastX: map.up.x, lastY: map.up.y, cast: null, dashT: 0, react: {}, dashed: {},
      strafe: 1, strafeT: 0, search: null, glance: null, idleT: 0, kb: 0, kbA: 0, brakeT: 0, spPrev: 0, goal: null, state: "explore",
    });
    Object.assign(h, { freeze: 0, sniff: 0, salute: 0, pray: 0, countGame: null, drawn: null, deny: null, altar: null, dryAt: null, dryMon: null });
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
      const yEp = (Array.isArray(sv.episodes) ? sv.episodes : []).filter(e => e && e.day === run.day - 1 && !e.defeat && Array.isArray(e.parts) && e.parts.length && G.MONSTERS[e.mon]).pop();
      if (tier >= 2 && U.chance(0.4)) say(w, "startFallen", {});
      else if (yEp && U.chance(0.55)) say(w, "startEpisode", G.Game.epCtx(yEp, run.day));
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
      let id = real.main && !G.MONSTERS[real.main].special && U.chance(real.species ? 0.7 : 0.45) ? real.main : U.pick(pool); const p = M.randomFloor(map, far);
      if (G.MONSTERS[id].deep && f < G.MONSTERS[id].deep) id = U.pick(dg.fixed.filter(k => !G.MONSTERS[k].deep) );   // 深い階にしか出ない魔物（教祖など）
      if (p) spawnMonster(w, id, p.x, p.y, false);
    }
    // 相棒がワルドーに捕らわれている：戦闘員にされた相棒が、ときどき紛れている（救出の依頼では、最下層で待つ）
    for (const id of run.captured || []) {
      if (id === run.hero || run.rescue === id) continue;
      if (f >= 2 && U.chance(run.dungeon === "waldo" ? 0.5 : run.dungeon === "strobe" ? 0.25 : 0.07)) { const p = M.randomFloor(map, far); if (p) spawnMonster(w, id === "hikari" ? "lumina_grunt" : "haruka_grunt", p.x, p.y, false); }
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
    if (T.center) { const tr = spawnTrap(w, T.center, r.cx + 0.5, r.cy + 0.5); tr.room = room; if (T.flood) { room.orb = tr; tr.found = true; tr.hp = tr.d.breakable; } }
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
    if (T.flood) {                                  // 満ちる触手の間：扉が落ち、穴から触手が満ちてくる
      room.fill = 0; room.flood = { stage: 0, peak: 0, grabT: w.t + 2.5, fullT: 0 };
      if (room.orb) room.orb.phase = w.t + 2.4;     // 最初に殻が開くのは、少し満ちてから
      record(w, { kind: "trap", type: T.type, trap: "flood_orb", trapName: T.name, sev: 2 });
      h.liveT = w.t; openScene(w, "floodIn", null);
    }
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
        id: w.nextId++, kind: id, d, x: px, y: py, vx: 0, vy: 0, a: U.rf(0, Math.PI * 2), hp: Math.round(d.hp * lv.hp * (d.imp && d.spd > 0 ? 1.3 : 1)), maxHp: Math.round(d.hp * lv.hp * (d.imp && d.spd > 0 ? 1.3 : 1)), pow: lv.pow,   // 小淫魔は、すぐには墜ちない
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

  Object.assign(G.F, { U, M, HR, SPREAD, TIER_FX, LV, createWorld, populate, makeTrapRoom, enterTrapRoom, makeBoss, spawnMonster, spawnTrap });
  G.F.bind.push(() => { ({ heroName, say, live, feed, msg, fx, record, releaseOverflow, pray, engraveSigil, possess, defeat, free, roomAt, flash, explore, alertMon, openScene } = G.F); });
})();
