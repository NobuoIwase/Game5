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
    const dg = G.DUNGEONS[run.dungeon];
    const map = M.makeFloor(floorNo, dg.floors);
    const w = {
      run, dg, map, floorNo, t: 0, outcome: null,
      monsters: [], traps: [], chests: [], projs: [], fx: [],
      covers: M.coverSpots(map),
      dir: { spent: 0, cap: G.BAL.floorCost(floorNo), ct: {}, live: 0, auto: !!run.autoDirector, next: 2 },
      scene: null, nextId: 1, log: [], msgs: [], msgGap: {},
    };
    const h = run.h;
    Object.assign(h, {
      x: map.up.x, y: map.up.y, a: Math.PI / 2, vx: 0, vy: 0, face: null, intent: null, label: "探索", think: 0.3,
      known: {}, bound: null, trance: 0, hyp: 0, dazeT: 0, lureTo: null, slow: 0, glue: 0, cdShot: 0, cdBurst: 0, cdShove: 0,
      idleMp: 0, bubble: null, decoy: null, mislead: 0, rest: 0, shrineT: 0, floorT: 0, peekT: 0, peekHold: 0,
      wantDown: false, stuckT: 0, lastX: map.up.x, lastY: map.up.y, cast: null, dashT: 0, react: {}, dashed: {},
      strafe: 1, strafeT: 0, search: null, glance: null, idleT: 0, kb: 0, kbA: 0, brakeT: 0, spPrev: 0, goal: null, state: "explore",
    });
    map.seen = new Uint8Array(map.W * map.H);
    populate(w);
    msg(w, "floor", { floor: floorNo, dg: run.dungeonName || dg.name });
    if (w.trapFloor) msg(w, "trapFloor", {});
    say(w, "floorIn", { floor: floorNo });
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
      const id = real.main && U.chance(real.species ? 0.7 : 0.45) ? real.main : U.pick(pool), p = M.randomFloor(map, far);
      if (p) spawnMonster(w, id, p.x, p.y, false);
    }
    // 長（ボス）：最下層の転移陣の手前に
    if (real.boss && map.last && real.main) {
      const p = M.randomFloor(map, (x, y) => U.dist(x, y, map.down.x, map.down.y) < 4 && U.dist(x, y, map.down.x, map.down.y) > 1.5) || M.randomFloor(map, far);
      if (p) { const b = spawnMonster(w, real.main, p.x, p.y, false); makeBoss(b); }
    }
    // 罠部屋（Game2 の区画）：部屋まるごとが一つの仕掛け。合う魔物が眠って潜む。ときどき階まるごと罠部屋の「罠の階」
    const small = dg.traps.filter(t => !G.TRAPS[t].big && !G.TRAPS[t].lure);
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
    const n = (d.pack && summoned) ? d.pack : 1;
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
  }
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
  }
  function fx(w, o) { w.fx.push(Object.assign({ t: 0, life: 0.6 }, o)); }
  function logLine(w, text, cls) { w.log.push({ t: w.t, text, cls: cls || "" }); if (w.log.length > 60) w.log.shift(); }
  function record(w, ev) { const e = Object.assign({ t: +w.t.toFixed(1), floor: w.floorNo }, ev); w.run.events.push(e); return e; }

  function mult(w, type) {
    const h = w.run.h, prep = G.PREP[w.run.stated];
    let k = G.HIKARI.resist[h.form][type] || 1;
    if (prep) k *= (prep.guard[type] || 1) * (prep.side[type] || 1);
    return k;
  }
  function tierFx(w) { return TIER_FX[G.tier(w.run.save.body, w.run.save.mind)]; }
  function knowledge(w, kind) { const k = (w.run.save.know || {})[kind] || 0; return Math.min(1, k / 6); }

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
    const name = src ? (src.d ? src.d.name : "") : "";
    const sev = k * power >= 1.6 ? 2 : 1;
    if (type === "惑") {
      const was = h.trance > 0;
      h.hyp = Math.min(100, (h.hyp || 0) + 26 * power * k);          // 催眠度：一気に上がり、なかなか抜けない
      h.trance = Math.max(h.trance, (1.6 + h.hyp / 40) * power * k);
      h.tranceSrc = name; h.tranceMax = Math.max(h.trance, h.tranceMax && was ? h.tranceMax : 0);
      h.hypno = how === "lure" ? "魅了" : (src && ["mind_roper", "gazer", "bell"].includes(src.kind)) || power * k >= 0.9 || h.hyp >= 50 ? "催眠" : "惑い";
      h.arousal = Math.min(100, h.arousal + 6 * power * k);
      if (how === "lure" && src) h.lureTo = { x: src.x, y: src.y };
      record(w, { kind: "trance", type, mon: src && src.kind, monName: name, sev, hidden: k * power > 1.2 && U.chance(0.45) });
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#b890ff", life: 0.8 });
      if (!was) { msg(w, how === "lure" ? "lured" : h.hypno === "催眠" ? "hypno" : "trance", { mon: name }, 2); if (!h.bubble || h.bubble.t < 1) say(w, "trance", { mon: name }); }
    } else if (type === "蕩") {
      h.arousal = Math.min(100, h.arousal + 15 * power * k);
      h.pleasure += 5 * power * k * (1 + h.arousal / 100) * tf.pleasure;
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
  function checkClimax(w, src) {
    const h = w.run.h;
    if (h.pleasure < 100) return;
    h.pleasure = 22; h.climax++;
    h.will = Math.max(0, h.will - 12);
    h.trance = Math.max(h.trance, 1.6);
    const e = record(w, { kind: "climax", type: src && src.d ? src.d.type : "蕩", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3, bound: !!h.bound });
    logLine(w, G.Text.log("climax", { mon: e.monName }), "heavy");
    msg(w, "climax", {});
    fx(w, { kind: "burst", x: h.x, y: h.y, color: "#ff9ccc", life: 1.0 });
    say(w, "climax", {});
  }

  /* ---- 捕まる・振りほどく ---- */
  function grab(w, src, power, type) {
    const h = w.run.h;
    if (h.ifr > 0 && src.d && src.d.spd !== undefined) return false;
    if (h.bound) {
      if (h.bound.by.length >= 3 || h.bound.by.includes(src.id)) return false;
      h.bound.by.push(src.id); h.bound.power += power;
      msg(w, "grabMore", { mon: src.d.name });
      return true;
    }
    h.bound = { by: [src.id], power, type: type || "絡", t: 0, struggle: 0, src };
    h.cast = null; h.vx = h.vy = 0;
    const e = record(w, { kind: "hold", type: type || "絡", mon: src.kind, monName: src.d.name, sev: 2 });
    h.bound.ev = e;
    logLine(w, G.Text.log("hold", { mon: src.d.name }), "mid");
    msg(w, "grab", { mon: src.d.name });
    say(w, "held", { mon: src.d.name });
    return true;
  }
  function release(w, broke) {
    const h = w.run.h, b = h.bound;
    if (!b) return;
    for (const id of b.by) {
      const m = w.monsters.find(x => x.id === id);
      if (m) { m.holding = false; m.stun = broke ? 1.6 : 0.6; m.cd = 2.5; m.rcl = 0.3; m.rclX = Math.sign(m.x - h.x) || 1; knock(w, m, U.angle(h.x, h.y, m.x, m.y), 1.0); }
      const tr = w.traps.find(x => x.id === id);
      if (tr) { tr.armed = false; tr.rearm = tr.d.rearm; }
    }
    if (b.ev) { b.ev.dur = +b.t.toFixed(1); if (b.t > 3.5) b.ev.sev = 3; }
    if (broke) { say(w, "breakFree", {}); msg(w, "free", {}); fx(w, { kind: "burst", x: h.x, y: h.y, color: "#fff2a8", life: 0.6 }); }
    h.bound = null;
    h.trance = Math.max(h.trance, 0.3);
    h.think = Math.max(h.think || 0, broke ? 0.9 : 0.6); h.label = "息を整える";   // 抜けた直後は、よろめいて立て直す
  }
  function knock(w, m, a, dist) {
    const nx = m.x + Math.cos(a) * dist, ny = m.y + Math.sin(a) * dist;
    if (free(w.map, nx, ny, m.d.r * 0.6)) { m.x = nx; m.y = ny; }
  }
  function updateBound(w, dt) {
    const h = w.run.h, b = h.bound, tf = tierFx(w);
    b.t += dt;
    b.by = b.by.filter(id => w.monsters.some(m => m.id === id && m.hp > 0) || w.traps.some(t => t.id === id));
    if (!b.by.length) { release(w, false); return; }
    const k = mult(w, b.type), p = b.power;
    h.hp = Math.max(0, h.hp - 1.2 * p * dt);
    h.will = Math.max(0, h.will - 3.0 * p * k * tf.will * dt);      // 拘束は長く見せる分、一秒あたりは緩め
    h.arousal = Math.min(100, h.arousal + 3 * p * k * dt);
    h.pleasure += 6.5 * p * k * (1 + h.arousal / 90) * tf.pleasure * dt;
    for (const id of b.by) { const m = w.monsters.find(x => x.id === id); if (m && m.d.atk.drain) drainMagic(w, m.d.atk.drain * dt, m); }
    if (h.kit.knife > 0 && b.t > 0.8 && !b.knifed && b.type === "絡") { b.knifed = true; h.kit.knife--; b.struggle += 0.6; msg(w, "item", { item: "縄抜けの小刀" }); record(w, { kind: "item", item: "knife", sev: 0 }); }
    if (h.form === "magica" && h.cdFlash <= 0 && h.mp >= G.HIKARI.flash.cost && h.trance <= 0 && !b.wait && b.t > 1.8 && (b.by.length >= 2 || (b.t > 2.6 && pressure(w, h.x, h.y, 2.4).n >= 3))) { flash(w); return; }
    const prep = G.PREP[w.run.stated];
    let rate = (0.2 + h.will / 260) * (h.form === "magica" ? 1.25 : 0.7) * tf.struggle / Math.max(0.5, k * p) * (b.slowStruggle || 1);
    if (prep && prep.slow && b.type === "絡") rate *= 0.8;
    rate *= 1 + knowledge(w, b.src.kind) * 0.35;        // 知っている相手ほど、抜け方が分かる
    if (b.t < 2.4) rate *= 0.25;                           // 捕まった直後は、まず何もできない
    b.struggle += rate * 0.5 * dt;
    if (U.chance(dt * 0.8)) msg(w, "struggle", {}, 2.5);
    if (b.struggle > 0.7 && !b.almost) { b.almost = true; msg(w, "almostFree", {}); }
    if (b.edge) { h.pleasure = Math.min(h.pleasure, 96); h.will = Math.max(0, h.will - 2.2 * dt); if (b.t > 2 && U.chance(dt * 0.6)) msg(w, "edge", {}, 3); }
    if (b.pillory) { h.watched = 0.4; h.arousal = Math.min(100, h.arousal + 1.2 * dt); }
    checkClimax(w, b.src);
    if (b.t > 4 && !b.sceneShown && !b.pillory && !b.edge && !b.slowStruggle) { b.sceneShown = true; openScene(w, "hold", b.src); }
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
    const sc = G.Text.scene(key, { run, h: run.h, mon: src && src.d ? src.d.name : "", type: src && src.d ? src.d.type : "", floor: w.floorNo, kind: src && src.kind });
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
      if (d < 2.3 && M.los(map, h.x, h.y, tr.x, tr.y) && U.chance(tr.d.detect * (1 - h.arousal / 220) * 0.35)) {
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
    const sv = run.save; sv.know = sv.know || {}; sv.know[m.kind] = (sv.know[m.kind] || 0) + 1;
    msg(w, m.boss ? "spotBoss" : "spot", { mon: m.d.name }, 1.5);
    if (m.boss) { run.bossSeen = true; say(w, "spotBoss", { mon: m.d.name }); return; }
    const paper = run.paper || {};
    if (m.d.type !== run.stated && m.d.type !== "削") {
      run.mismatch = (run.mismatch || 0) + 1;
      if (run.mismatch === 1 || U.chance(0.25)) { say(w, "mismatch", { mon: m.d.name, stated: run.stated }); return; }
    }
    if (paper.level && run.real && run.real.level > paper.level && !run.strongNoticed && U.chance(0.35)) { run.strongNoticed = true; say(w, "stronger", { mon: m.d.name }); return; }
    say(w, "spot", { mon: m.d.name });
  }
  function threats(w) {
    const h = w.run.h, out = [];
    for (const m of w.monsters) {
      if (m.hp <= 0) continue;
      const k = h.known[m.id];
      if (!k || w.t - k.t > 6) continue;
      out.push({ m, k, d: U.dist(h.x, h.y, m.x, m.y), kd: U.dist(h.x, h.y, k.x, k.y) });
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
    if (m.cast.kind === "shot") { // 狙いの線の近く
      const ax = m.cast.tx - m.x, ay = m.cast.ty - m.y, l = Math.hypot(ax, ay) || 1;
      const t = ((p.x - m.x) * ax + (p.y - m.y) * ay) / l;
      if (t < 0 || t > A.range + 1) return false;
      return Math.abs(((p.x - m.x) * ay - (p.y - m.y) * ax) / l) < 0.45 + margin;
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
        let d = 0.36 - knowledge(w, m.kind) * 0.12 + (h.trance > 0 ? 0.25 : 0) + (h.hyp || 0) / 300 + h.arousal / 320 + U.rf(-0.05, 0.09);
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
    const h = w.run.h, F = G.HIKARI.flash;
    h.mp -= F.cost; h.cdFlash = F.cd; h.ifr = 0.8;
    if (h.bound) release(w, true);
    for (const m of w.monsters) {
      if (m.hp <= 0 || U.dist(m.x, m.y, h.x, h.y) > F.radius) continue;
      if (m.d.spd > 0) knock(w, m, U.angle(h.x, h.y, m.x, m.y), F.push);
      m.stun = Math.max(m.stun, F.stun); m.cast = null; m.dash = null; m.holding = false;
    }
    h.bubble = { text: "ルミナ・フラッシュ！", t: 1.4 };
    msg(w, "flash", {});
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
    return s * (1 - h.arousal / 260);
  }
  function avoidFn(w) {
    const h = w.run.h, dang = [];
    for (const id in h.known) { const k = h.known[id]; if (w.t - k.t < 8) { const m = w.monsters.find(x => x.id == id); if (m && m.hp > 0) dang.push({ x: k.x, y: k.y, r: (m.d.atk.range || 1) + 1.2 }); } }
    for (const tr of w.traps) if (tr.found && tr.armed && !tr.d.lure) dang.push({ x: tr.x, y: tr.y, r: tr.d.radius + 0.6 });
    return (x, y) => { let c = 0; for (const d of dang) { const dd = Math.hypot(x + 0.5 - d.x, y + 0.5 - d.y); if (dd < d.r) c += (d.r - dd) * 3; } return c; };
  }
  function perceivedArousal(w) { const h = w.run.h, prep = G.PREP[w.run.stated]; return prep && prep.numb ? h.arousal * 0.35 : h.arousal; }
  function setIntent(h, x, y, spd, label, face) { h.intent = { x, y, spd }; h.label = label; if (face) h.face = { x: face.x, y: face.y, t: 0.4 }; }
  function goToward(w, gx, gy, spd, label, face) {
    const h = w.run.h, p = pathDir(w, h, gx, gy, HR, avoidFn(w));
    if (!p) { h.intent = null; return false; }
    setIntent(h, p.x, p.y, spd * (p.d < 0.6 ? p.d / 0.6 : 1), label, face);
    h.goal = { x: gx, y: gy, why: label };
    return true;
  }

  function hikariThink(w) {
    const h = w.run.h, run = w.run, map = w.map, S = G.HIKARI;
    const caution = run.caution || 1;         // 依頼書の脅威度で変わる用心深さ
    // 道具
    if (h.hp < 38 && h.kit.salve > 0) { h.kit.salve--; h.hp = Math.min(S.hpMax, h.hp + 35); say(w, "useSalve", {}); msg(w, "item", { item: "治癒の軟膏" }); record(w, { kind: "item", item: "salve", sev: 0 }); }
    const use = (k, fn) => { h.kit[k]--; fn(); msg(w, "item", { item: G.Game.ITEMS[k].name }); record(w, { kind: "item", item: k, sev: 0 }); };
    if ((h.will < 32 || h.trance > 1.2 || h.hyp > 55) && h.kit.smelling > 0) use("smelling", () => { h.will = Math.min(100, h.will + 30); h.trance = Math.min(h.trance, 0.2); h.hyp = Math.max(0, h.hyp - 50); if (h.hyp <= 0 && h.sleep <= 0) h.hypno = null; });
    // MP：戦いの最中に切れそうなら水薬。静かなら、使わずに息を整える
    if (h.form === "magica" && h.kit.ether > 0 && h.mp < 14 && threats(w).some(o => o.d < 6)) use("ether", () => { h.mp = Math.min(G.HIKARI.mpMax, h.mp + 30); });
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
      if (!h.dashed[u.key]) { h.dashed[u.key] = 1; h.dashT = 0.28; }
      h.cast = null;
      setIntent(h, v.x, v.y, h.dashT > 0 ? 1.9 : 1.25, "回避", ts[0] ? ts[0].m : null);
      msg(w, "dodge", {}, 2.5);
      return;
    }
    // 撤退
    const pa = perceivedArousal(w);
    const wantRetreat = run.recall || h.hp < 26 * caution || (h.form === "civilian" && h.kit.star === 0 && h.hp < 60 * caution) || h.will < 18;
    if (wantRetreat && h.state !== "retreat") {
      h.state = "retreat";
      say(w, run.recall ? "recall" : "retreat", {}); msg(w, "retreat", {});
      record(w, { kind: "retreatDecide", sev: 0, recall: !!run.recall });
      h.goal = (map.portal && U.dist(h.x, h.y, map.down.x, map.down.y) < U.dist(h.x, h.y, map.up.x, map.up.y)) ? { x: map.down.x, y: map.down.y, why: "retreat" } : { x: map.up.x, y: map.up.y, why: "retreat" };
    }
    if (h.state === "retreat") {
      if (near.length && h.form === "magica" && h.cdShot <= 0) tryCast(w, near[0].m, "shot");
      goToward(w, h.goal.x, h.goal.y, 1.05, "撤退");
      if (U.dist(h.x, h.y, h.goal.x, h.goal.y) < 0.6) w.outcome = run.recall ? "ordered" : "retreat";
      return;
    }
    if (h.decoy && h.decoy.t > 0 && h.form === "magica") { tryCast(w, h.decoy, "shot"); return; }

    const t0 = ts[0];
    if (t0) {
      const m = t0.m, seenNow = t0.k.seen && w.t - t0.k.t < 0.5, vis = seenNow && shotClear(map, h.x, h.y, m.x, m.y);
      // 見えているのに射線が通らない（角・柱）／弾が壁に当たり続けた：撃てる位置へ動く
      if (h.form === "magica" && seenNow && (!vis || h.wallHits >= 2)) {
        h.wallHits = 0;
        const fs = firingSpot(w, m);
        if (fs) { h.fireSpot = { x: fs.x, y: fs.y, until: w.t + 3 }; msg(w, "reposition", {}, 6); }
      }
      if (h.fireSpot && w.t < h.fireSpot.until && h.form === "magica") {
        if (U.dist(h.x, h.y, h.fireSpot.x, h.fireSpot.y) > 0.35) { goToward(w, h.fireSpot.x, h.fireSpot.y, 0.95, "射線を探す", m); return; }
        h.fireSpot = null;
      }
      h.state = "combat";
      if (h.form === "magica") {
        const d = t0.d, far = S.shot.range - 0.6;
        const cluster = ts.filter(o => U.dist(o.m.x, o.m.y, m.x, m.y) < S.burst.radius && o.d < 6);
        if (vis && cluster.length >= 2 && h.mp >= S.burst.cost && h.cdBurst <= 0 && d < 6) { tryCast(w, m, "burst"); return; }
        // 近接：MP が少ない時、相手が攻撃のあとの隙を見せている時、触手の短い相手には踏み込んで打つ
        const A2 = m.d.atk, reachy = (A2.kind === "grab" && (A2.range || 1) > 1.4) || A2.kind === "drain" || (A2.kind === "aura" && !A2.burst);
        const opening = !m.cast && (m.cd > 0.35 || m.stun > 0);
        const saving = h.mp < G.HIKARI.mpMax * 0.5;          // MP を切らさないように
        const wantMelee = seenNow && ((saving && !reachy) || h.mp < S.shot.cost * 2 || (opening && !reachy) || (m.d.spd === 0 && !reachy));
        if (wantMelee && h.mp >= S.melee.cost) {
          if (d <= S.melee.range + m.d.r * 0.5 && h.cdMelee <= 0) { tryCast(w, m, "melee"); return; }
          if (d < 4 && h.cdMelee <= 0.3) { goToward(w, m.x, m.y, 1.15, "踏み込む", m); return; }
        }
        if (d < 2.6 && m.d.spd > 0) {                 // 近い：相手を見たまま下がる
          const a = U.angle(m.x, m.y, h.x, h.y);
          const v = bestDodge(w, { t: 0.4, key: "space" }, m);
          setIntent(h, (Math.cos(a) + v.x) / 2, (Math.sin(a) + v.y) / 2, 1.0, "間合い", m);
          if (vis && h.cdShot <= 0 && h.mp >= S.shot.cost && U.chance(0.35)) tryCast(w, m, "shot");
          return;
        }
        if (!vis) {                                   // 見えない：物陰から覗く／回り込む
          if (h.peekT <= 0) { const spot = coverWithView(w, t0.k.x, t0.k.y); if (spot) { h.peekSpot = spot; h.peekT = 6; say(w, "peek", {}); msg(w, "peek", {}, 8); } }
          if (h.peekSpot && h.peekT > 0) {
            if (U.dist(h.x, h.y, h.peekSpot.x, h.peekSpot.y) < 0.35) { h.intent = null; h.label = "覗く"; h.face = { x: t0.k.x, y: t0.k.y, t: 0.5 }; return; }
            goToward(w, h.peekSpot.x, h.peekSpot.y, 0.7, "物陰へ"); return;
          }
          goToward(w, t0.k.x, t0.k.y, 0.75, "回り込む"); return;
        }
        if (d > far) {                                // 遠い：近づく。気づかれていなければ忍び寄る
          const sneak = !m.alert && m.d.spd > 0;
          goToward(w, m.x, m.y, sneak ? 0.5 : 0.9, sneak ? "忍び寄る" : "接近", m); return;
        }
        if (h.mp >= S.shot.cost && h.cdShot <= 0 && (!saving || reachy || m.d.atk.kind === "shot")) { tryCast(w, m, "shot"); return; }
        if (saving && !reachy && h.cdMelee <= 0.3 && d < 4.5) { goToward(w, m.x, m.y, 1.1, "踏み込む", m); return; }
        // 撃てない間は、足を止めて見据える。相手が寄ってくる時だけ、一歩ずつ下がる
        if (d < 3.4 && m.d.spd > 0) { const a = U.angle(m.x, m.y, h.x, h.y); setIntent(h, Math.cos(a), Math.sin(a), 0.5, "間合い", m); }
        else { h.intent = null; h.label = "構え"; h.face = { x: m.x, y: m.y, t: 0.4 }; }
        if (h.mp < S.shot.cost) msg(w, "lowMp", {}, 10);
        return;
      }
      // 素の姿：戦えない。見つからないように階段へ、近ければ逃げる
      if (t0.d < 2.6 && m.d.spd > 0) { const a = U.angle(m.x, m.y, h.x, h.y); setIntent(h, Math.cos(a), Math.sin(a), 1.15, "逃げる"); tryShove(w, m); return; }
      if (map.seen[Math.floor(map.down.y) * map.W + Math.floor(map.down.x)]) { goToward(w, map.down.x, map.down.y, 0.8, "階段へ"); return; }
    }
    h.state = "explore";
    // MP が足りない：物陰で整える／偽りの祠で休む
    if (h.form === "magica" && h.mp < 30 && !ts.some(o => o.d < 7)) {
      const shrine = w.traps.find(tr => tr.kind === "shrine" && tr.armed && !tr.found && U.dist(h.x, h.y, tr.x, tr.y) < 9);
      if (shrine) { goToward(w, shrine.x, shrine.y, 0.8, "祠へ"); return; }
      h.rest = 2.2; h.intent = null; h.label = "息を整える"; say(w, "rest", {}); msg(w, "rest", {}, 12); return;
    }
    if (pa > 42) {
      const basin = w.traps.find(tr => (tr.kind === "basin" || tr.kind === "spring") && tr.armed && !tr.found && U.dist(h.x, h.y, tr.x, tr.y) < 9 && M.los(map, h.x, h.y, tr.x, tr.y));
      if (basin) { goToward(w, basin.x, basin.y, 0.8, tr_label(basin)); return; }
    }
    explore(w);
  }

  function tr_label(tr) { return tr.kind === "spring" ? "湯へ" : "手水へ"; }
  function explore(w) {
    const h = w.run.h, map = w.map;
    const downSeen = map.seen[Math.floor(map.down.y) * map.W + Math.floor(map.down.x)];
    const mimic = w.monsters.find(m => m.d.chest && m.hp > 0 && m.hidden && map.seen[Math.floor(m.y) * map.W + Math.floor(m.x)]);
    const chest = w.chests.find(c => !c.open && map.seen[Math.floor(c.y) * map.W + Math.floor(c.x)]);
    const tgtChest = mimic || chest;
    if (tgtChest) { if (goToward(w, tgtChest.x, tgtChest.y, 0.85, "宝箱へ")) { msg(w, "chestSeen", {}, 20); if (U.dist(h.x, h.y, tgtChest.x, tgtChest.y) < 0.7 && chest === tgtChest) openChest(w, chest); return; } }
    let seenN = 0, floorN = 0;
    for (let i = 0; i < map.t.length; i++) if (map.t[i] === 0) { floorN++; if (map.seen[i]) seenN++; }
    if (downSeen && (seenN / floorN > 0.55 || h.floorT > 45 || h.wantDown)) {
      goToward(w, map.down.x, map.down.y, 0.9, "階段へ"); msg(w, "stairs", {}, 20);
      if (U.dist(h.x, h.y, map.down.x, map.down.y) < 0.5) w.outcome = map.last ? "cleared" : "down";
      return;
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
    goToward(w, h.search.x, h.search.y, unknown >= 2 ? 0.62 : 0.8, "探索");
    msg(w, "explore", {}, 14);
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
    h.cast = { kind, t: kind === "burst" ? S.burst.cast : kind === "melee" ? S.melee.cast : S.shot.cast, target, tx: target.x, ty: target.y };
    h.intent = null; h.label = kind === "burst" ? "詠唱" : "攻撃";
    h.face = { x: target.x, y: target.y, t: 0.5 };
    const name = kind === "burst" ? "シャイン・バスター" : kind === "melee" ? "ルミナ・ストライク" : "ルミナ・ショット";
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
      const a = U.angle(h.x, h.y, c.tx, c.ty);
      fx(w, { kind: "slash", x: h.x + Math.cos(a) * 0.7, y: h.y + Math.sin(a) * 0.7, a, color: "#fff4c0", life: 0.25 });
      let hit = 0;
      for (const m of w.monsters) {
        if (m.hp <= 0 || U.dist(h.x, h.y, m.x, m.y) > S.melee.range + m.d.r * 0.6) continue;
        if (Math.abs(U.angDiff(a, U.angle(h.x, h.y, m.x, m.y))) > S.melee.arc / 2 + 0.2) continue;
        hurtMon(w, m, S.melee.dmg); knock(w, m, U.angle(h.x, h.y, m.x, m.y), 0.45); m.stun = Math.max(m.stun, 0.25); if (m.cast) { m.cast = null; msg(w, "interrupt", { mon: m.d.name }, 1); } hit++;
      }
      if (!hit) msg(w, "whiff", {}, 2);
      record(w, { kind: "melee", sev: 0 });
      return;
    }
    if (c.kind === "burst") {
      h.mp -= S.burst.cost; h.cdBurst = S.burst.cd; h.cdShot = 0.9; h.idleMp = 0;
      drainMagic(w, S.burst.magic, null);
      fx(w, { kind: "burst", x: tgt.x, y: tgt.y, color: "#fff4c0", r: S.burst.radius, life: 0.7 });
      for (const m of w.monsters) if (m.hp > 0 && U.dist(m.x, m.y, tgt.x, tgt.y) < S.burst.radius) hurtMon(w, m, S.burst.dmg);
      record(w, { kind: "burst", sev: 0 });
    } else {
      const lead = U.dist(h.x, h.y, tgt.x, tgt.y) / S.shot.speed;
      const tx = tgt.x + (tgt.vx || 0) * lead, ty = tgt.y + (tgt.vy || 0) * lead;
      const spread = (h.arousal / 100) * 0.45 + (h.hyp || 0) / 100 * 0.3 + (h.trance > 0 ? 0.3 : 0) + 0.04;
      const a = U.angle(h.x, h.y, tx, ty) + U.rf(-spread, spread);
      w.projs.push({ id: w.nextId++, x: h.x + Math.cos(a) * 0.4, y: h.y + Math.sin(a) * 0.4, vx: Math.cos(a) * S.shot.speed, vy: Math.sin(a) * S.shot.speed, owner: "h", dmg: S.shot.dmg, r: 0.18, life: S.shot.range / S.shot.speed, kind: "star" });
      h.mp -= S.shot.cost; h.cdShot = S.shot.cd; h.idleMp = 0;
      record(w, { kind: "shot", sev: 0 });
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
    m.hp -= dmg; m.flash = 0.2; m.rcl = 0.26; m.rclX = Math.sign(m.x - w.run.h.x) || 1;
    alertMon(w, m, 1);
    fx(w, { kind: "hit", x: m.x, y: m.y, color: "#fff6c8", life: 0.3 });
    if (m.hp <= 0) { killMon(w, m); return; }
    msg(w, "dmg", { mon: m.d.name, n: Math.round(before - m.hp) }, 0.4);
    if (m.d.flee && m.hp < m.maxHp * 0.5) m.flee = 3;
    // 手負いは、悲鳴をあげて逃げ、仲間を呼ぶ（動けない種と長は逃げない）
    if (!m.fled && !m.boss && m.d.spd > 0 && m.hp <= m.maxHp * 0.25) {
      m.fled = true;
      if (U.chance(0.55)) {
        m.flee = U.rf(2.2, 3.2); m.cast = null;
        msg(w, "flee", { mon: m.d.name });
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
      h.intent = { x: Math.cos(a), y: Math.sin(a), spd: 0.9 }; h.label = "運ばれる";
      h.arousal = Math.min(100, h.arousal + 1.5 * dt);
      if (h.convey.t <= 0 || U.dist(h.x, h.y, h.convey.x, h.convey.y) < 0.4) h.convey = null;
    } else if (h.glue > 0) {
      h.intent = null; h.label = "足を取られる";
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
    if (!m.alert && amount > 0) { m.hop = 0.32; }     // 気づいた瞬間、跳ねる
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
    m.hop = Math.max(0, m.hop - dt); m.rcl = Math.max(0, m.rcl - dt); m.lunge = Math.max(0, m.lunge - dt);
    m.pounceCd = Math.max(0, (m.pounceCd || 0) - dt);
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
    if (m.holding) { m.x += (h.x - m.x) * 0.1; m.y += (h.y - m.y) * 0.1; m.vx = m.vy = 0; return; }
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
      if (can && (A.kind === "grab" || A.kind === "shot" || A.kind === "lure") && inRange && M.los(w.map, m.x, m.y, h.x, h.y)) startCast(w, m, A.kind);
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
      if (A.gaze) { if (monSees(w, m)) { h.arousal = Math.min(100, h.arousal + 1.6 * A.power * mult(w, "惑") * dt); h.watched = 0.4; msg(w, "watched", { mon: d.name }, 8); } }
      else if (A.burst) { if (dist < 0.9) { applyEffect(w, d.type, A.power * m.pow, m); m.hp = 0; if (m.summoned) w.dir.live = Math.max(0, w.dir.live - 1); msg(w, "pop", { mon: d.name }); fx(w, { kind: "pop", x: m.x, y: m.y, color: "#f6ffd8", life: 0.6 }); } }
      else if (m.auraT > 1.1) { m.auraT = 0; applyEffect(w, d.type, A.power * m.pow * 0.55, m); }
    }
    if (A.kind === "drain" && dist <= A.range && !w.outcome) {
      drainMagic(w, 1.5 * A.power * m.pow * mult(w, "削") * dt, m);
      h.mp = Math.max(0, h.mp - 1.2 * A.power * dt);
      m.drainT = (m.drainT || 0) + dt;
      if (m.drainT > 2) { m.drainT = 0; record(w, { kind: "drain", type: "削", mon: m.kind, monName: d.name, sev: 1 }); msg(w, "drain", { mon: d.name }, 4); }
      if (A.legGrab && dist < A.legGrab && m.cd <= 0 && !h.bound) { m.cd = 4; if (grab(w, m, 0.6 * m.pow, "絡")) m.holding = true; }
    }
    m.mvx = (m.x - px) / Math.max(dt, 1e-3); m.mvy = (m.y - py) / Math.max(dt, 1e-3);
  }

  function startCast(w, m, kind) {
    const h = w.run.h, A = m.d.atk;
    const t = kind === "grab2" ? 0.7 : kind === "pounce" ? 0.5 : (A.windup || 0.6);
    const lead = U.clamp(0.12 * ((w.run.real && w.run.real.level) || 2), 0, 0.5) * t;   // 深い・強い相手ほど動きを読む
    m.cast = { id: w.nextId++, kind, t, total: t, tx: h.x + (h.vx || 0) * lead, ty: h.y + (h.vy || 0) * lead };
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
      if (!w.outcome && d <= A.range && Math.abs(U.angDiff(a, U.angle(m.x, m.y, h.x, h.y))) < A.fan && M.los(w.map, m.x, m.y, h.x, h.y) && h.ifr <= 0) applyEffect(w, m.d.type, A.power * m.pow, m);
      else msg(w, "miss", { mon: m.d.name }, 1);
    } else if (c.kind === "shot") {
      const a = U.angle(m.x, m.y, c.tx, c.ty) + U.rf(-0.06, 0.06);
      const sp = A.proj === "beam" ? 11 : A.proj === "psy" ? 6.5 : 7;
      w.projs.push({ id: w.nextId++, x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, owner: "m", src: m, type: m.d.type, power: A.power * m.pow, r: 0.22, life: (A.range + 1) / sp, kind: A.proj });
    } else if (c.kind === "lure") {
      if (dist <= A.range && M.los(w.map, m.x, m.y, h.x, h.y) && !w.outcome) applyEffect(w, "惑", A.power * m.pow, m, "lure");
    }
  }

  /* ================================================================ 罠 */
  function updateTraps(w, dt) {
    const h = w.run.h;
    for (const tr of w.traps) {
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
  function triggerTrap(w, tr) {
    const h = w.run.h, e = tr.d.effect;
    tr.found = true;
    const ev = record(w, { kind: "trap", type: tr.d.type, trap: tr.kind, trapName: tr.d.name, sev: 1 });
    logLine(w, G.Text.log("trap", { trap: tr.d.name }), "mid");
    msg(w, "trap", { trap: tr.d.name });
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
    else if (e === "basin") { drainMagic(w, 16 * mult(w, "削"), src); h.arousal = Math.max(0, h.arousal - 15); say(w, "basin", {}); ev.sev = 2; }
    if (rearm) { tr.armed = false; tr.rearm = tr.d.rearm; }
  }

  /* ================================================================ 弾 */
  function updateProjs(w, dt) {
    const h = w.run.h;
    for (const p of w.projs) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (M.tile(w.map, p.x, p.y) !== 0) { p.life = 0; if (p.owner === "h") h.wallHits = (h.wallHits || 0) + 1; fx(w, { kind: "hit", x: p.x, y: p.y, color: "#aaa", life: 0.2 }); continue; }
      if (p.owner === "h") {
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
        applyEffect(w, p.type, p.power, p.src);
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
    if (h.trance > 0) { h.trance -= dt; if (h.trance <= 0) { msg(w, h.sleep > 0 ? "wake" : "tranceOut", {}, 3); if (h.hyp <= 0) h.hypno = null; } }
    if (h.hyp > 0) {
      h.hyp = Math.max(0, h.hyp - 0.35 * dt);
      if (h.hyp <= 0 && h.trance <= 0) { h.hypno = null; msg(w, "hypOut", {}, 3); }
      h.dazeT -= dt;
      if (h.trance <= 0 && !h.bound && h.dazeT <= 0) { h.dazeT = 1; if (U.chance(h.hyp / 420)) { h.trance = 0.8 + h.hyp / 50; msg(w, "daze", {}, 6); } }
    }
    if (h.sleep > 0) h.sleep -= dt;
    h.watched = Math.max(0, (h.watched || 0) - dt);
    if (h.bubble) { h.bubble.t -= dt; if (h.bubble.t <= 0) h.bubble = null; }
    if (h.decoy) { h.decoy.t -= dt; if (h.decoy.t <= 0) h.decoy = null; }
    if (h.mislead > 0) { h.mislead -= dt; if (h.mislead <= 0) { say(w, "misleadRealize", {}); h._pp = null; } }
    h.peekT = Math.max(0, h.peekT - dt);
    h.idleMp += dt;
    if (h.noTransform > 0) h.noTransform -= dt;
    if (h.form === "magica") {
      h.magic = Math.max(0, h.magic - G.BAL.passiveMagicDrain * dt);
      if (h.magic <= 0) untransform(w, null);
      if (h.idleMp > 1.5) h.mp = Math.min(G.HIKARI.mpMax, h.mp + (h.rest > 0 ? G.HIKARI.mpRest : G.HIKARI.mpRegen) * dt);
    }
    h.arousal = Math.max(0, h.arousal - (h.bound ? 0 : 0.12) * dt);
    h.pleasure = Math.max(0, h.pleasure - (h.bound ? 0 : 0.6) * dt);
    if (!h.bound) h.will = Math.min(100, h.will + 0.6 * dt * (1 - h.arousal / 150) * (1 - (h.hyp || 0) / 110));
    perceive(w);
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
  }

  /* ================================================================ 観測フェーズ（敗北後の一晩） */
  function startNight(w) {
    w.night = { beat: 0, spent: 0, beats: [] };
    const h = w.run.h;
    for (const m of w.monsters) if (m.hp > 0 && m.d.spd > 0 && U.dist(m.x, m.y, h.x, h.y) < 9) { m.alert = 99; }
  }
  function nightBeat(w) {
    const h = w.run.h, n = w.night;
    const around = w.monsters.filter(m => m.hp > 0 && (U.dist(m.x, m.y, h.x, h.y) < 9 || m.summoned));
    const m = U.pick(around.filter(x => !n.beats.some(b => b.mon === x.kind && b.i === n.beat - 1))) || U.pick(around);
    const beat = { i: n.beat, mon: m ? m.kind : null, monName: m ? m.d.name : "", type: m ? m.d.type : "蕩" };
    h.pleasure += 40; h.arousal = Math.min(100, h.arousal + 10);
    if (h.pleasure >= 100) { h.pleasure = 20; h.climax++; beat.climax = true; }
    if (m) { const a = U.rf(0, Math.PI * 2); const nx = h.x + Math.cos(a) * 0.7, ny = h.y + Math.sin(a) * 0.7; if (M.walkable(w.map, nx, ny)) { m.x = nx; m.y = ny; } }
    beat.lines = G.Text.nightBeat(beat, { run: w.run, h, n: n.beat, total: G.BAL.nightBeats });
    n.beats.push(beat);
    w.run.night.push(beat);
    record(w, { kind: "night", type: beat.type, mon: beat.mon, monName: beat.monName, sev: 3, climax: !!beat.climax, hidden: false });
    n.beat++;
    return beat;
  }

  // ひかりの今の状態（ステータス欄のチップ）。{ name, t（残り秒）, cls }
  function statusList(w) {
    const h = w.run.h, out = [], prep = G.PREP[w.run.stated];
    const add = (name, t, cls) => out.push({ name, t: t > 0 ? t : null, cls });
    if (h.bound) add(h.bound.pillory ? "晒し台" : h.bound.edge ? "焦らし" : h.bound.wait ? "壁の環" : h.bound.slowStruggle ? "採寸中" : "拘束", null, "pink");
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
})();
if (typeof module !== "undefined") module.exports = G;
