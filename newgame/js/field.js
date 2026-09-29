/* field.js — 潜行中の1階ぶんの世界：ひかりのAI・魔物のAI・弾・罠・効き目・配置のルール
 * DOM に触れない（Node の自動検査でもそのまま回す）。画面は render.js が world を読んで描く。
 */
var G = (typeof G !== "undefined") ? G : {};
(function () {
  "use strict";
  const U = G.U, M = G.Map;

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

  /* ================================================================ 世界を作る */
  function createWorld(run, floorNo) {
    const dg = G.DUNGEONS[run.dungeon];
    const map = M.makeFloor(floorNo, dg.floors);
    const w = {
      run, dg, map, floorNo, t: 0, outcome: null,
      monsters: [], traps: [], chests: [], projs: [], fx: [],
      covers: M.coverSpots(map),
      dir: { spent: 0, cap: G.BAL.floorCost(floorNo), ct: {}, live: 0, auto: !!run.autoDirector, next: 2 },
      scene: null, nextId: 1, log: [],
    };
    const h = run.h;
    Object.assign(h, {
      x: map.up.x, y: map.up.y, a: Math.PI / 2, state: "explore", stateT: 0, think: 0,
      path: null, goal: null, known: {}, seenTraps: {}, bound: null, trance: 0, lureTo: null,
      slow: 0, glue: 0, cdShot: 0, cdBurst: 0, cdShove: 0, idleMp: 0, bubble: null, decoy: null,
      mislead: null, rest: 0, floorT: 0, peekT: 0, wantDown: false, stuckT: 0, lastX: map.up.x, lastY: map.up.y,
    });
    map.seen = new Uint8Array(map.W * map.H);
    populate(w);
    say(w, run.floorIntroKey || "floorIn", { floor: floorNo });
    return w;
  }

  // 階の初期配置（ランダム生成）。ダンジョンの魔物と罠から選ぶ。コストはかからない
  function populate(w) {
    const dg = w.dg, f = w.floorNo, map = w.map;
    const far = (x, y) => U.dist(x, y, map.up.x, map.up.y) > 6 && U.dist(x, y, map.down.x, map.down.y) > 1.5;
    const pool = dg.fixed.concat(U.chance(0.35) ? [U.pick(dg.free)] : []);
    const nMon = 2 + Math.floor(f / 3) + (U.chance(0.4) ? 1 : 0);
    for (let i = 0; i < nMon; i++) {
      const id = U.pick(pool), p = M.randomFloor(map, far);
      if (p) spawnMonster(w, id, p.x, p.y, false);
    }
    const nTrap = 1 + Math.floor(f / 4) + (U.chance(0.5) ? 1 : 0);
    for (let i = 0; i < nTrap; i++) {
      const id = U.pick(dg.traps), p = M.randomFloor(map, far);
      if (p) spawnTrap(w, id, p.x, p.y);
    }
    // 宝箱（ひかりは見つけると開けに行く）
    const nChest = U.chance(0.6) ? 1 : 0;
    for (let i = 0; i < nChest; i++) {
      const p = M.randomFloor(map, far);
      if (p) w.chests.push({ id: w.nextId++, x: p.x, y: p.y, open: false });
    }
  }

  function spawnMonster(w, id, x, y, summoned) {
    const d = G.MONSTERS[id];
    const n = (d.pack && summoned) ? d.pack : 1;
    let last = null;
    for (let k = 0; k < n; k++) {
      const ox = k ? U.rf(-0.6, 0.6) : 0, oy = k ? U.rf(-0.6, 0.6) : 0;
      const px = M.walkable(w.map, x + ox, y + oy) ? x + ox : x, py = M.walkable(w.map, x + ox, y + oy) ? y + oy : y;
      const m = {
        id: w.nextId++, kind: id, d, x: px, y: py, a: U.rf(0, Math.PI * 2), hp: d.hp, maxHp: d.hp,
        state: "idle", alert: 0, windup: 0, cd: U.rf(0.5, 1.5), stun: 0, holding: false, home: { x: px, y: py },
        wanderT: 0, path: null, summoned, fleeing: false, hidden: !!d.hidden, lastSeenH: null, flash: 0, sceneShown: false,
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
  function say(w, key, ctx) {
    const h = w.run.h;
    const text = G.Text.bubble(key, Object.assign({ h, run: w.run }, ctx || {}));
    if (!text) return;
    h.bubble = { text, t: 2.6 };
  }
  function fx(w, o) { w.fx.push(Object.assign({ t: 0, life: 0.6 }, o)); }
  function logLine(w, text, cls) { w.log.push({ t: w.t, text, cls: cls || "" }); if (w.log.length > 60) w.log.shift(); }

  function record(w, ev) {
    const e = Object.assign({ t: +w.t.toFixed(1), floor: w.floorNo }, ev);
    w.run.events.push(e);
    return e;
  }

  function mult(w, type) {
    const h = w.run.h, prep = G.PREP[w.run.stated];
    let k = G.HIKARI.resist[h.form][type] || 1;
    if (prep) k *= (prep.guard[type] || 1) * (prep.side[type] || 1);
    return k;
  }
  function tierFx(w) { return TIER_FX[G.tier(w.run.save.body, w.run.save.mind)]; }

  /* ================================================================ 効き目 */
  // 系統ごとの効き目をひかりに与える。src は魔物か罠
  function applyEffect(w, type, power, src, how) {
    const h = w.run.h, k = mult(w, type), tf = tierFx(w);
    const name = src ? (src.d ? src.d.name : "") : "";
    const sev = k * power >= 1.6 ? 2 : 1;
    if (type === "惑") {
      h.trance = Math.max(h.trance, 1.3 * power * k);
      h.arousal = Math.min(100, h.arousal + 3 * power * k);
      if (how === "lure" && src) h.lureTo = { x: src.x, y: src.y };
      record(w, { kind: "trance", type, mon: src && src.kind, monName: name, sev, hidden: k * power > 1.2 && U.chance(0.45) });
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#b890ff", life: 0.8 });
      if (!h.bubble || h.bubble.t < 1) say(w, "trance", { mon: name });
    } else if (type === "蕩") {
      h.arousal = Math.min(100, h.arousal + 8 * power * k);
      h.pleasure += 4 * power * k * (1 + h.arousal / 100) * tf.pleasure;
      h.slow = Math.max(h.slow, 1.2 * power);
      record(w, { kind: "arouse", type, mon: src && src.kind, monName: name, sev });
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#ff8ab8", life: 0.8 });
      if (!h.bubble || h.bubble.t < 1) say(w, "arouse", { mon: name });
    } else if (type === "削") {
      drainMagic(w, 6 * power * k, src);
      h.mp = Math.max(0, h.mp - 3 * power * k);
      record(w, { kind: "drain", type, mon: src && src.kind, monName: name, sev: 1 });
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#7fe8ff", life: 0.8 });
    }
    checkClimax(w, src);
  }

  function drainMagic(w, amt, src) {
    const h = w.run.h;
    if (h.form !== "magica") return;
    h.magic = Math.max(0, h.magic - amt);
    if (h.magic <= 0) untransform(w, src);
  }

  function untransform(w, src) {
    const h = w.run.h;
    if (h.form !== "magica") return;
    h.form = "civilian";
    record(w, { kind: "untransform", type: "削", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3 });
    logLine(w, G.Text.log("untransform", {}), "heavy");
    fx(w, { kind: "burst", x: h.x, y: h.y, color: "#ffd0ec", life: 1.2 });
    openScene(w, "untransform", src);
  }

  function checkClimax(w, src) {
    const h = w.run.h;
    if (h.pleasure < 100) return;
    h.pleasure = 22;
    h.climax++;
    h.will = Math.max(0, h.will - 12);
    h.trance = Math.max(h.trance, 1.6);
    const e = record(w, { kind: "climax", type: src && src.d ? src.d.type : "蕩", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3, bound: !!h.bound });
    logLine(w, G.Text.log("climax", { mon: e.monName }), "heavy");
    fx(w, { kind: "burst", x: h.x, y: h.y, color: "#ff9ccc", life: 1.0 });
    say(w, "climax", {});
  }

  /* ---- 捕まる・振りほどく ---- */
  function grab(w, src, power, type) {
    const h = w.run.h;
    if (h.bound) {
      if (h.bound.by.length >= 3 || h.bound.by.includes(src.id)) return false;
      h.bound.by.push(src.id);
      h.bound.power += power;
      return true;
    }
    h.bound = { by: [src.id], power, type: type || "絡", t: 0, struggle: 0, src };
    if (src.d && src.holding !== undefined) src.holding = true;
    h.path = null;
    const e = record(w, { kind: "hold", type: type || "絡", mon: src.kind, monName: src.d.name, sev: 2 });
    h.bound.ev = e;
    logLine(w, G.Text.log("hold", { mon: src.d.name }), "mid");
    say(w, "held", { mon: src.d.name });
    return true;
  }

  function release(w, broke) {
    const h = w.run.h, b = h.bound;
    if (!b) return;
    for (const id of b.by) {
      const m = w.monsters.find(x => x.id === id);
      if (m) { m.holding = false; m.stun = broke ? 1.6 : 0.6; m.cd = 2.5; const a = U.angle(h.x, h.y, m.x, m.y); push(w, m, a, 1.0); }
      const tr = w.traps.find(x => x.id === id);
      if (tr) { tr.armed = false; tr.rearm = tr.d.rearm; }
    }
    if (b.ev) { b.ev.dur = +b.t.toFixed(1); if (b.t > 3.5) b.ev.sev = 3; }
    if (broke) { say(w, "breakFree", {}); fx(w, { kind: "burst", x: h.x, y: h.y, color: "#fff2a8", life: 0.6 }); }
    h.bound = null;
    h.trance = Math.max(h.trance, 0.3);
  }

  function push(w, m, a, dist) {
    const nx = m.x + Math.cos(a) * dist, ny = m.y + Math.sin(a) * dist;
    if (M.walkable(w.map, nx, ny)) { m.x = nx; m.y = ny; }
  }

  function updateBound(w, dt) {
    const h = w.run.h, b = h.bound, tf = tierFx(w);
    b.t += dt;
    // 捕まえている側が居なくなったら解ける
    b.by = b.by.filter(id => w.monsters.some(m => m.id === id && m.hp > 0) || w.traps.some(t => t.id === id));
    if (!b.by.length) { release(w, false); return; }
    const k = mult(w, b.type);
    const p = b.power;
    h.hp = Math.max(0, h.hp - 1.2 * p * dt);
    h.will = Math.max(0, h.will - 4.5 * p * k * tf.will * dt);
    h.arousal = Math.min(100, h.arousal + 3 * p * k * dt);
    h.pleasure += 8.5 * p * k * (1 + h.arousal / 90) * tf.pleasure * dt;
    // 削の吸い上げ
    for (const id of b.by) {
      const m = w.monsters.find(x => x.id === id);
      if (m && m.d.atk.drain) drainMagic(w, m.d.atk.drain * dt, m);
    }
    const prep = G.PREP[w.run.stated];
    let rate = (0.2 + h.will / 260) * (h.form === "magica" ? 1.25 : 0.7) * tf.struggle / Math.max(0.5, k * p);
    if (prep && prep.slow && b.type === "絡") rate *= 0.8;
    b.struggle += rate * dt;
    checkClimax(w, b.src);
    if (b.t > 3.2 && !b.sceneShown) { b.sceneShown = true; openScene(w, "hold", b.src); }
    if (b.struggle >= 1) release(w, true);
    else if (h.will <= 0 || h.hp <= 0) defeat(w, b.src);
  }

  function defeat(w, src) {
    if (w.outcome) return;
    const h = w.run.h;
    record(w, { kind: "defeat", type: src && src.d ? src.d.type : "絡", mon: src && src.kind, monName: src && src.d ? src.d.name : "", sev: 3 });
    logLine(w, G.Text.log("defeat", { mon: src && src.d ? src.d.name : "" }), "heavy");
    w.outcome = "defeat";
    w.defeatBy = src ? src.kind : null;
    openScene(w, "defeat", src);
  }

  // 重い場面：止めて読ませる（UI が w.scene を見て窓を出す。検査では自動で閉じる）
  function openScene(w, key, src) {
    const run = w.run;
    const sc = G.Text.scene(key, { run, h: run.h, mon: src && src.d ? src.d.name : "", type: src && src.d ? src.d.type : "", floor: w.floorNo, kind: src && src.kind });
    if (!sc) return;
    w.scene = { key, lines: sc, mon: src && src.kind };
  }

  /* ================================================================ ひかりのAI */
  function perceive(w) {
    const h = w.run.h, map = w.map;
    const fov = 140 * Math.PI / 180, range = 8;
    // 見えたマスを覚える（地図の記憶）
    for (let dy = -range; dy <= range; dy++) for (let dx = -range; dx <= range; dx++) {
      const tx = Math.floor(h.x) + dx, ty = Math.floor(h.y) + dy;
      if (tx < 0 || ty < 0 || tx >= map.W || ty >= map.H) continue;
      const cx = tx + 0.5, cy = ty + 0.5, d = Math.hypot(cx - h.x, cy - h.y);
      if (d > range) continue;
      if (d > 1.6 && Math.abs(U.angDiff(h.a, U.angle(h.x, h.y, cx, cy))) > fov / 2) continue;
      if (M.los(map, h.x, h.y, cx, cy) || map.t[ty * map.W + tx] !== 0 && d < range) map.seen[ty * map.W + tx] = 1;
    }
    for (const m of w.monsters) {
      if (m.hp <= 0) continue;
      const d = U.dist(h.x, h.y, m.x, m.y);
      if (m.hidden && d > 1.4) continue;
      const inCone = d < 1.8 || Math.abs(U.angDiff(h.a, U.angle(h.x, h.y, m.x, m.y))) <= fov / 2;
      let seen = d <= range && inCone && M.los(map, h.x, h.y, m.x, m.y);
      // 物音（動いている魔物が近い）
      const heard = !seen && d < 3.2 && m.d.spd > 0 && m.state !== "idle";
      if (seen || heard) {
        const first = !h.known[m.id];
        h.known[m.id] = { x: m.x, y: m.y, t: w.t, seen, kind: m.kind };
        if (first && seen) onSpot(w, m);
        else if (first && heard) { h.a = U.angle(h.x, h.y, m.x, m.y); say(w, "hear", {}); h.think = 0.4; }
      }
    }
    // 罠に気づく
    for (const tr of w.traps) {
      if (tr.found) continue;
      const d = U.dist(h.x, h.y, tr.x, tr.y);
      if (d < 2.3 && M.los(map, h.x, h.y, tr.x, tr.y) && U.chance(tr.d.detect * (1 - h.arousal / 220) * 0.35)) {
        tr.found = true;
        say(w, "trapFound", { trap: tr.d.name });
        record(w, { kind: "trapFound", type: tr.d.type, trap: tr.kind, trapName: tr.d.name, sev: 0 });
      }
    }
  }

  function onSpot(w, m) {
    const h = w.run.h, run = w.run;
    h.think = 0.45;                    // 気づいた瞬間、足を止める
    h.a = U.angle(h.x, h.y, m.x, m.y);
    record(w, { kind: "spot", type: m.d.type, mon: m.kind, monName: m.d.name, sev: 0 });
    if (m.d.type !== run.stated && m.d.type !== "削") {
      run.mismatch = (run.mismatch || 0) + 1;
      if (run.mismatch === 1 || U.chance(0.25)) { say(w, "mismatch", { mon: m.d.name, stated: run.stated }); return; }
    }
    say(w, "spot", { mon: m.d.name, n: Object.values(h.known).filter(k => w.t - k.t < 3).length });
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

  function moveTowards(w, ent, tx, ty, spd, dt) {
    const d = U.dist(ent.x, ent.y, tx, ty);
    if (d < 0.01) return true;
    const st = Math.min(d, spd * dt);
    const a = U.angle(ent.x, ent.y, tx, ty);
    const nx = ent.x + Math.cos(a) * st, ny = ent.y + Math.sin(a) * st;
    const r = ent.r || 0.3;
    if (M.walkable(w.map, nx + Math.sign(Math.cos(a)) * r * 0.6, ent.y) && M.walkable(w.map, nx, ent.y)) ent.x = nx;
    if (M.walkable(w.map, ent.x, ny + Math.sign(Math.sin(a)) * r * 0.6) && M.walkable(w.map, ent.x, ny)) ent.y = ny;
    if (ent.a !== undefined && st > 0.001) ent.a = a;
    return d <= st + 0.05;
  }

  function followPath(w, ent, spd, dt) {
    if (!ent.path || !ent.path.length) return true;
    const p = ent.path[0];
    if (moveTowards(w, ent, p.x, p.y, spd, dt)) ent.path.shift();
    return !ent.path.length;
  }

  function hikariSpeed(w) {
    const h = w.run.h, prep = G.PREP[w.run.stated];
    let s = G.HIKARI.spd[h.form];
    if (prep && prep.slow) s *= prep.slow;
    if (h.slow > 0) s *= 0.55;
    if (h.glue > 0) s *= 0.1;
    s *= 1 - h.arousal / 260;
    return s;
  }

  // 危険度で道のりを重くする（知っている魔物と見つけた罠のそばを避ける）
  function avoidFn(w) {
    const h = w.run.h;
    const dang = [];
    for (const id in h.known) { const k = h.known[id]; if (w.t - k.t < 8) { const m = w.monsters.find(x => x.id == id); if (m && m.hp > 0) dang.push({ x: k.x, y: k.y, r: (m.d.atk.range || 1) + 1.2 }); } }
    for (const tr of w.traps) if (tr.found && tr.armed && !tr.d.lure) dang.push({ x: tr.x, y: tr.y, r: tr.d.radius + 0.6 });
    return (x, y) => { let c = 0; for (const d of dang) { const dd = Math.hypot(x + 0.5 - d.x, y + 0.5 - d.y); if (dd < d.r) c += (d.r - dd) * 3; } return c; };
  }

  function goTo(w, x, y, why) {
    const h = w.run.h;
    const p = M.path(w.map, h.x, h.y, x, y, avoidFn(w));
    h.path = p; h.goal = { x, y, why };
    return !!p;
  }

  function perceivedArousal(w) {
    const h = w.run.h, prep = G.PREP[w.run.stated];
    return prep && prep.numb ? h.arousal * 0.35 : h.arousal;   // 鎮心の香：自分の熱に気づけない
  }

  function hikariThink(w) {
    const h = w.run.h, run = w.run, map = w.map;
    // 道具
    if (h.hp < 38 && h.kit.salve > 0) { h.kit.salve--; h.hp = Math.min(G.HIKARI.hpMax, h.hp + 35); say(w, "useSalve", {}); record(w, { kind: "item", item: "salve", sev: 0 }); }
    if (h.will < 32 && h.kit.smelling > 0) { h.kit.smelling--; h.will = Math.min(100, h.will + 30); record(w, { kind: "item", item: "smelling", sev: 0 }); }
    const ts = threats(w);
    const near = ts.filter(o => o.d < 4.2);
    if (h.form === "civilian" && h.kit.star > 0 && (near.length === 0 || h.hp < 50)) {
      h.kit.star--; h.magic = 55; h.form = "magica"; h.mp = Math.max(h.mp, 25);
      say(w, "retransform", {}); record(w, { kind: "retransform", sev: 0 });
      fx(w, { kind: "burst", x: h.x, y: h.y, color: "#ffe6f6", life: 1.0 });
    }
    // 撤退の判断（主役気質なので粘る。鎮心の香が効いていると熱に気づけない）
    const pa = perceivedArousal(w);
    const wantRetreat = run.recall || h.hp < 26 || pa > 88 || (h.form === "civilian" && h.kit.star === 0 && h.hp < 60) || h.will < 18;
    if (wantRetreat && h.state !== "retreat") {
      h.state = "retreat";
      say(w, run.recall ? "recall" : "retreat", {});
      record(w, { kind: "retreatDecide", sev: 0, recall: !!run.recall });
      const tgt = (map.portal && U.dist(h.x, h.y, map.down.x, map.down.y) < U.dist(h.x, h.y, map.up.x, map.up.y)) ? map.down : map.up;
      goTo(w, tgt.x, tgt.y, "retreat");
    }
    if (h.state === "retreat") {
      if (!h.path || !h.path.length) { const tgt = h.goal || map.up; goTo(w, tgt.x, tgt.y, "retreat"); }
      // 近すぎる相手には撃ちながら下がる
      if (near.length && h.form === "magica") tryShoot(w, near[0].m);
      return;
    }
    // 目眩ましの影を撃つ
    if (h.decoy && h.decoy.t > 0 && h.form === "magica") { shootAt(w, h.decoy.x, h.decoy.y, null); return; }

    const t0 = ts[0];
    if (t0) {
      const m = t0.m, range = (m.d.atk.range || 1) + 1.1;
      // 近すぎる → 下がる（撃てるなら撃ってから）
      if (t0.d < range && m.d.spd > 0) {
        h.state = "evade";
        if (h.form === "magica") tryShoot(w, m);
        else tryShove(w, m);
        evade(w, m);
        return;
      }
      if (h.form === "magica" && h.mp >= G.HIKARI.shot.cost) {
        const vis = M.los(map, h.x, h.y, m.x, m.y) && t0.k.seen && w.t - t0.k.t < 0.5;
        if (vis && t0.d <= G.HIKARI.shot.range) {
          // 気づかれていない相手には、もう一歩だけ忍び寄る
          if (!m.alert && t0.d > 4.6 && m.d.spd > 0) { h.state = "sneak"; goTo(w, m.x, m.y, "sneak"); if (h.path) h.path = h.path.slice(0, Math.max(1, h.path.length - 4)); return; }
          h.state = "attack"; h.path = null; h.a = U.angle(h.x, h.y, m.x, m.y);
          const cluster = ts.filter(o => U.dist(o.m.x, o.m.y, m.x, m.y) < G.HIKARI.burst.radius && o.d < 6);
          if (cluster.length >= 2 && h.mp >= G.HIKARI.burst.cost && h.cdBurst <= 0) burst(w, m.x, m.y);
          else tryShoot(w, m);
          return;
        }
        // 見えない → 物陰から覗く
        if (h.peekT <= 0) {
          const spot = coverWithView(w, t0.k.x, t0.k.y);
          if (spot) { h.state = "peek"; goTo(w, spot.x, spot.y, "peek"); h.peekT = 5; say(w, "peek", {}); return; }
        }
      } else if (h.form === "civilian") {
        // 素の姿：戦えない。避けて階段へ
        h.state = "sneakPast";
        const tgt = map.seen[Math.floor(map.down.y) * map.W + Math.floor(map.down.x)] ? map.down : null;
        if (tgt && (!h.path || !h.path.length)) goTo(w, tgt.x, tgt.y, "down");
      }
    }
    // 魔力（MP）が足りない：物陰で整える／偽りの祠で休む
    if (h.form === "magica" && h.mp < 18 && !near.length) {
      const shrine = w.traps.find(tr => tr.d.lure && tr.kind === "shrine" && tr.armed && !tr.found && U.dist(h.x, h.y, tr.x, tr.y) < 9);
      if (shrine) { h.state = "rest"; goTo(w, shrine.x, shrine.y, "shrine"); return; }
      h.state = "rest"; h.rest = 2.2; h.path = null; say(w, "rest", {}); return;
    }
    // 熱が溜まったら清めの水へ（清めの手水の罠）
    if (pa > 42) {
      const basin = w.traps.find(tr => tr.kind === "basin" && tr.armed && !tr.found && U.dist(h.x, h.y, tr.x, tr.y) < 9);
      if (basin) { h.state = "explore"; goTo(w, basin.x, basin.y, "basin"); return; }
    }
    explore(w);
  }

  function explore(w) {
    const h = w.run.h, map = w.map;
    h.state = "explore";
    if (h.path && h.path.length && h.goal && h.goal.why !== "peek") return;
    const downSeen = map.seen[Math.floor(map.down.y) * map.W + Math.floor(map.down.x)];
    // 宝箱が見えていれば開けに行く（ミミックかもしれない）
    const chest = w.chests.find(c => !c.open && map.seen[Math.floor(c.y) * map.W + Math.floor(c.x)]);
    const mimic = w.monsters.find(m => m.d.chest && m.hp > 0 && m.hidden && map.seen[Math.floor(m.y) * map.W + Math.floor(m.x)]);
    if (mimic && U.chance(0.8)) { goTo(w, mimic.x, mimic.y, "chest"); return; }
    if (chest) { goTo(w, chest.x, chest.y, "chest"); return; }
    let seenN = 0; for (let i = 0; i < map.seen.length; i++) if (map.seen[i] && map.t[i] === 0) seenN++;
    let floorN = 0; for (let i = 0; i < map.t.length; i++) if (map.t[i] === 0) floorN++;
    if (downSeen && (seenN / floorN > 0.55 || h.floorT > 45 || h.wantDown)) { goTo(w, map.down.x, map.down.y, "down"); return; }
    // まだ見ていない部屋へ
    const rooms = U.shuffle(map.rooms).filter(r => !map.seen[r.cy * map.W + r.cx] && map.t[r.cy * map.W + r.cx] === 0);
    rooms.sort((a, b) => U.dist(h.x, h.y, a.cx, a.cy) - U.dist(h.x, h.y, b.cx, b.cy));
    for (const r of rooms) if (goTo(w, r.cx + 0.5, r.cy + 0.5, "explore")) return;
    if (downSeen) { goTo(w, map.down.x, map.down.y, "down"); return; }
    const p = M.randomFloor(map, (x, y) => !map.seen[Math.floor(y) * map.W + Math.floor(x)]) || M.randomFloor(map);
    if (p) goTo(w, p.x, p.y, "explore");
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

  function evade(w, m) {
    const h = w.run.h;
    const away = U.angle(m.x, m.y, h.x, h.y);
    let best = null, bs = -1e9;
    for (let k = -3; k <= 3; k++) {
      const a = away + k * 0.45, d = 2.6;
      const x = h.x + Math.cos(a) * d, y = h.y + Math.sin(a) * d;
      if (!M.walkable(w.map, x, y) || !M.los(w.map, h.x, h.y, x, y)) continue;
      const s = U.dist(x, y, m.x, m.y) - Math.abs(k) * 0.2;
      if (s > bs) { bs = s; best = { x, y }; }
    }
    if (best) { h.path = [best]; h.goal = { x: best.x, y: best.y, why: "evade" }; }
  }

  function tryShoot(w, m) {
    const h = w.run.h;
    if (h.cdShot > 0 || h.mp < G.HIKARI.shot.cost || h.form !== "magica" || h.bound) return;
    if (!M.los(w.map, h.x, h.y, m.x, m.y)) return;
    // 相手の動きを少し読む
    const lead = U.dist(h.x, h.y, m.x, m.y) / G.HIKARI.shot.speed;
    const tx = m.x + (m.vx || 0) * lead, ty = m.y + (m.vy || 0) * lead;
    shootAt(w, tx, ty, m);
  }

  function shootAt(w, tx, ty) {
    const h = w.run.h, S = G.HIKARI.shot;
    if (h.cdShot > 0 || h.mp < S.cost) return;
    // 熱や惑いで狙いがぶれる
    const spread = (h.arousal / 100) * 0.45 + (h.trance > 0 ? 0.3 : 0) + 0.04;
    const a = U.angle(h.x, h.y, tx, ty) + U.rf(-spread, spread);
    h.a = U.angle(h.x, h.y, tx, ty);
    w.projs.push({ x: h.x + Math.cos(a) * 0.4, y: h.y + Math.sin(a) * 0.4, vx: Math.cos(a) * S.speed, vy: Math.sin(a) * S.speed, owner: "h", dmg: S.dmg, r: 0.18, life: S.range / S.speed, kind: "star" });
    h.mp -= S.cost; h.cdShot = S.cd; h.idleMp = 0;
    record(w, { kind: "shot", sev: 0 });
    if (U.chance(0.18)) say(w, "shoot", {});
    for (const m of w.monsters) if (U.dist(m.x, m.y, h.x, h.y) < 5 && m.hp > 0) alertMon(w, m, 0.8);
  }

  function burst(w, x, y) {
    const h = w.run.h, B = G.HIKARI.burst;
    h.mp -= B.cost; h.cdBurst = 4; h.cdShot = 0.8; h.idleMp = 0;
    drainMagic(w, B.magic, null);
    fx(w, { kind: "burst", x, y, color: "#fff4c0", r: B.radius, life: 0.7 });
    say(w, "burst", {});
    for (const m of w.monsters) if (m.hp > 0 && U.dist(m.x, m.y, x, y) < B.radius) hurtMon(w, m, B.dmg);
    record(w, { kind: "burst", sev: 0 });
  }

  function tryShove(w, m) {
    const h = w.run.h;
    if (h.cdShove > 0 || U.dist(h.x, h.y, m.x, m.y) > 1.2) return;
    h.cdShove = 1.1;
    hurtMon(w, m, 3);
    push(w, m, U.angle(h.x, h.y, m.x, m.y), 0.8);
    m.stun = Math.max(m.stun, 0.5);
  }

  function hurtMon(w, m, dmg) {
    m.hp -= dmg; m.flash = 0.2;
    alertMon(w, m, 1);
    fx(w, { kind: "hit", x: m.x, y: m.y, color: "#fff6c8", life: 0.3 });
    if (m.hp <= 0) killMon(w, m);
    else if (m.d.flee && m.hp < m.maxHp * 0.5) m.fleeing = true;
  }

  function killMon(w, m) {
    const h = w.run.h;
    m.hp = 0;
    if (m.summoned) w.dir.live = Math.max(0, w.dir.live - 1);
    if (h.bound && h.bound.by.includes(m.id)) { h.bound.by = h.bound.by.filter(i => i !== m.id); if (!h.bound.by.length) release(w, true); }
    record(w, { kind: "kill", type: m.d.type, mon: m.kind, monName: m.d.name, sev: 0 });
    fx(w, { kind: "pop", x: m.x, y: m.y, color: "#ffe0f0", life: 0.5 });
    if (m.d.atk.burst && U.dist(m.x, m.y, h.x, h.y) < 1.6) applyEffect(w, "蕩", m.d.atk.power, m);
    if (U.chance(0.25)) say(w, "kill", { mon: m.d.name });
  }

  /* ================================================================ 魔物のAI */
  function alertMon(w, m, amount) { m.alert = Math.max(m.alert, amount * 6); m.lastSeenH = { x: w.run.h.x, y: w.run.h.y }; if (m.hidden && !m.d.chest && !m.d.hidden) m.hidden = false; }

  function monSees(w, m) {
    const h = w.run.h, d = U.dist(m.x, m.y, h.x, h.y);
    if (d > m.d.sight) return false;
    if (m.d.fov < 360 && d > 1.5 && Math.abs(U.angDiff(m.a, U.angle(m.x, m.y, h.x, h.y))) > (m.d.fov * Math.PI / 180) / 2) return false;
    return M.los(w.map, m.x, m.y, h.x, h.y);
  }

  function updateMonster(w, m, dt) {
    const h = w.run.h, d = m.d, A = d.atk;
    if (m.hp <= 0) return;
    const px = m.x, py = m.y;
    m.flash = Math.max(0, m.flash - dt);
    m.cd = Math.max(0, m.cd - dt);
    if (m.stun > 0) { m.stun -= dt; m.vx = m.vy = 0; return; }
    if (monSees(w, m)) alertMon(w, m, 1);
    else m.alert = Math.max(0, m.alert - dt);
    const dist = U.dist(m.x, m.y, h.x, h.y);
    if (m.holding) { m.x += (h.x - m.x) * 0.1; m.y += (h.y - m.y) * 0.1; m.vx = m.vy = 0; return; }
    if (m.fleeing) {
      const a = U.angle(h.x, h.y, m.x, m.y);
      moveTowards(w, m, m.x + Math.cos(a) * 2, m.y + Math.sin(a) * 2, d.spd * 1.1, dt);
    } else if (m.windup > 0) {
      m.windup -= dt;
      m.a = U.angle(m.x, m.y, h.x, h.y);
      if (m.windup <= 0) fire(w, m, dist);
    } else if (m.alert > 0 && !w.outcome) {
      // 構え → 撃つ／掴む
      const inRange = dist <= A.range + (A.kind === "grab" ? 0.25 : 0);
      if ((A.kind === "grab" || A.kind === "shot" || A.kind === "lure") && inRange && m.cd <= 0 && !h.bound || (A.kind === "grab" && inRange && m.cd <= 0 && h.bound)) {
        if (A.kind !== "grab" && !M.los(w.map, m.x, m.y, h.x, h.y)) { chase(w, m, dt); }
        else { m.windup = A.windup; m.state = "windup"; }
      } else if (A.alsoGrab && dist <= A.alsoGrab && m.cd <= 0) {
        m.windup = 0.7; m.state = "windupGrab";
      } else {
        chase(w, m, dt);
      }
    } else {
      idle(w, m, dt);
    }
    // 近くにいるだけで効くもの
    if (A.kind === "aura" && dist <= A.range && !w.outcome) {
      m.auraT = (m.auraT || 0) + dt;
      if (A.gaze) { if (monSees(w, m)) { h.arousal = Math.min(100, h.arousal + 1.6 * A.power * mult(w, "惑") * dt); h.watched = 0.4; } }
      else if (A.burst) { if (dist < 0.9) { applyEffect(w, d.type, A.power, m); m.hp = 0; if (m.summoned) w.dir.live = Math.max(0, w.dir.live - 1); fx(w, { kind: "pop", x: m.x, y: m.y, color: "#f6ffd8", life: 0.6 }); } }
      else if (m.auraT > 1.1) { m.auraT = 0; applyEffect(w, d.type, A.power * 0.55, m); }
    }
    if (A.kind === "drain" && dist <= A.range && !w.outcome) {
      drainMagic(w, 3.2 * A.power * mult(w, "削") * dt, m);
      h.mp = Math.max(0, h.mp - 1.2 * A.power * dt);
      m.drainT = (m.drainT || 0) + dt;
      if (m.drainT > 2) { m.drainT = 0; record(w, { kind: "drain", type: "削", mon: m.kind, monName: d.name, sev: 1 }); }
      if (A.legGrab && dist < A.legGrab && m.cd <= 0 && !h.bound) { m.cd = 4; grab(w, m, 0.6, "絡"); }
    }
    m.vx = (m.x - px) / Math.max(dt, 1e-3); m.vy = (m.y - py) / Math.max(dt, 1e-3);
  }

  function chase(w, m, dt) {
    const h = w.run.h, d = m.d;
    if (!d.spd) return;
    const tgt = monSees(w, m) ? { x: h.x, y: h.y } : (m.lastSeenH || { x: h.x, y: h.y });
    // 撃つ魔物は間合いを保つ
    if (d.atk.kind === "shot" || d.atk.kind === "lure") {
      const dist = U.dist(m.x, m.y, h.x, h.y);
      if (dist < d.atk.range * 0.55) { const a = U.angle(h.x, h.y, m.x, m.y); moveTowards(w, m, m.x + Math.cos(a), m.y + Math.sin(a), d.spd, dt); return; }
    }
    if (!m.path || !m.path.length || (m.repath = (m.repath || 0) - dt) <= 0) {
      m.path = M.path(w.map, m.x, m.y, tgt.x, tgt.y) || [];
      m.repath = 0.8;
    }
    followPath(w, m, d.spd * (d.behavior === "float" ? 0.9 : 1), dt);
  }

  function idle(w, m, dt) {
    const d = m.d;
    m.state = "idle";
    if (!d.spd || d.behavior === "lurk" && U.chance(0.7)) return;
    m.wanderT -= dt;
    if (m.wanderT <= 0 || !m.path || !m.path.length) {
      m.wanderT = U.rf(2, 5);
      const p = M.randomFloor(w.map, (x, y) => U.dist(x, y, m.home.x, m.home.y) < 4);
      m.path = p ? (M.path(w.map, m.x, m.y, p.x, p.y) || []) : [];
    }
    followPath(w, m, d.spd * 0.45, dt);
  }

  function fire(w, m, dist) {
    const h = w.run.h, A = m.d.atk;
    m.cd = A.cd;
    if (m.state === "windupGrab") {
      m.state = "chase";
      if (dist <= (A.alsoGrab || A.range) + 0.3 && !w.outcome) { if (grab(w, m, A.power * 0.8, "絡")) m.holding = true; }
      return;
    }
    m.state = "chase";
    if (A.kind === "grab") {
      if (dist <= A.range + 0.35 && !w.outcome) {
        if (m.hidden) { m.hidden = false; say(w, m.d.chest ? "mimic" : "ambush", { mon: m.d.name }); }
        if (grab(w, m, A.power, m.d.type === "蕩" ? "蕩" : "絡")) m.holding = true;
        if (m.d.type === "蕩") applyEffect(w, "蕩", A.power * 0.6, m);
      } else fx(w, { kind: "miss", x: m.x, y: m.y, life: 0.3 });
    } else if (A.kind === "shot") {
      const a = U.angle(m.x, m.y, h.x, h.y) + U.rf(-0.08, 0.08);
      const sp = A.proj === "beam" ? 11 : A.proj === "psy" ? 6.5 : 7;
      w.projs.push({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, owner: "m", src: m, type: m.d.type, power: A.power, r: 0.22, life: (A.range + 1) / sp, kind: A.proj });
    } else if (A.kind === "lure") {
      if (dist <= A.range && M.los(w.map, m.x, m.y, h.x, h.y) && !w.outcome) applyEffect(w, "惑", A.power, m, "lure");
    }
  }

  /* ================================================================ 罠 */
  function updateTraps(w, dt) {
    const h = w.run.h;
    for (const tr of w.traps) {
      if (!tr.armed) { tr.rearm -= dt; if (tr.rearm <= 0) tr.armed = true; continue; }
      if (tr.active > 0) {                // 香りが漂っている間
        tr.active -= dt;
        if (U.dist(h.x, h.y, tr.x, tr.y) < tr.d.radius) { tr.tick = (tr.tick || 0) + dt; if (tr.tick > 1) { tr.tick = 0; applyEffect(w, "蕩", 0.55, tr); } }
        if (tr.active <= 0) { tr.armed = false; tr.rearm = tr.d.rearm; }
        continue;
      }
      const d = U.dist(h.x, h.y, tr.x, tr.y);
      if (d > tr.d.radius || w.outcome) continue;
      if (tr.found && !tr.d.lure && h.goal && h.goal.why !== "retreat" && U.chance(0.7)) continue;  // 見つけた罠は避けて通る
      triggerTrap(w, tr);
    }
  }

  function triggerTrap(w, tr) {
    const h = w.run.h, e = tr.d.effect;
    tr.found = true;
    const ev = record(w, { kind: "trap", type: tr.d.type, trap: tr.kind, trapName: tr.d.name, sev: 1 });
    logLine(w, G.Text.log("trap", { trap: tr.d.name }), "mid");
    fx(w, { kind: "ring", x: tr.x, y: tr.y, color: "#ffd27a", r: tr.d.radius, life: 0.9 });
    const src = { d: tr.d, kind: tr.kind, x: tr.x, y: tr.y, id: tr.id };
    let rearm = true;
    if (e === "bell") { applyEffect(w, "惑", 1.3, src); for (const m of w.monsters) if (m.hp > 0 && U.dist(m.x, m.y, tr.x, tr.y) < 7) alertMon(w, m, 1); }
    else if (e === "mirror") { applyEffect(w, "惑", 0.8, src); const p = M.randomFloor(w.map, (x, y) => U.dist(x, y, h.x, h.y) > 5); if (p) { goTo(w, p.x, p.y, "mislead"); h.mislead = 4; } }
    else if (e === "decoy") { const p = M.randomFloor(w.map, (x, y) => U.dist(x, y, h.x, h.y) > 3 && U.dist(x, y, h.x, h.y) < 6); if (p) { h.decoy = { x: p.x, y: p.y, t: 2.4 }; say(w, "decoy", {}); } }
    else if (e === "glue") { h.glue = 1.6; h.slow = Math.max(h.slow, 3); applyEffect(w, "蕩", 0.4, src); }
    else if (e === "vent") { tr.active = 4.5; rearm = false; say(w, "vent", {}); }
    else if (e === "urn") { applyEffect(w, "蕩", 1.8, src); h.slow = Math.max(h.slow, 2.5); }
    else if (e === "vine") { grab(w, src, 0.8, "絡"); }
    else if (e === "rope") { grab(w, src, 1.2, "絡"); h.cdShot = 3; }
    else if (e === "shrine") { h.rest = 2.5; h.shrineT = 2.5; h.state = "rest"; say(w, "shrine", {}); ev.sev = 2; }
    else if (e === "basin") { const k = mult(w, "削"); drainMagic(w, 38 * k, src); h.arousal = Math.max(0, h.arousal - 15); say(w, "basin", {}); ev.sev = 2; }
    if (rearm) { tr.armed = false; tr.rearm = tr.d.rearm; }
  }

  /* ================================================================ 弾 */
  function updateProjs(w, dt) {
    const h = w.run.h;
    for (const p of w.projs) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (M.tile(w.map, p.x, p.y) !== 0) { p.life = 0; fx(w, { kind: "hit", x: p.x, y: p.y, color: "#aaa", life: 0.2 }); continue; }
      if (p.owner === "h") {
        for (const m of w.monsters) {
          if (m.hp <= 0 || U.dist(p.x, p.y, m.x, m.y) > m.d.r + p.r) continue;
          if (m.d.reflect && U.chance(m.d.reflect)) {   // 鏡面スライム：跳ね返す
            p.owner = "m"; p.vx = -p.vx; p.vy = -p.vy; p.type = "惑"; p.power = 0.7; p.src = m; p.kind = "psy";
            say(w, "reflect", {}); break;
          }
          hurtMon(w, m, p.dmg); p.life = 0; break;
        }
      } else if (p.life > 0 && !w.outcome && U.dist(p.x, p.y, h.x, h.y) < 0.35 + p.r) {
        p.life = 0;
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
  // 置けるか：ひかりの視界の外で、近すぎない床。コストと同時出現数とクールタイム
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

  // オート指揮：ひかりの弱い系統を、進む先の見えない所へ。罠のそばに寄せる
  function autoDirect(w, dt) {
    w.dir.next -= dt;
    if (w.dir.next > 0 || w.outcome) return;
    w.dir.next = U.rf(2.2, 3.6);
    const h = w.run.h, deck = w.run.deck;
    const usable = deck.filter(c => { const ci = cardInfo(c); return ci.d && (w.dir.ct[c] || 0) <= 0 && w.dir.spent + ci.d.cost <= w.dir.cap && (ci.trap || w.dir.live < w.run.maxLive); });
    if (!usable.length) return;
    const score = c => {
      const ci = cardInfo(c); let s = mult(w, ci.d.type) * 2;
      if (ci.d.type === "削" && h.form === "magica") s += h.magic < 50 ? 2 : 0.8;
      if (h.form === "civilian" && ci.d.type === "絡") s += 2;
      return s + U.rf(0, 1);
    };
    usable.sort((a, b) => score(b) - score(a));
    const card = usable[0];
    // 置き場所：ひかりの行き先の途中、見えない所
    const goal = h.goal || w.map.down;
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
    if (w.scene) return;                 // 場面を読んでいる間は止まる
    if (w.outcome) return;
    const h = w.run.h;
    w.t += dt; h.floorT += dt;
    for (const k in w.dir.ct) w.dir.ct[k] = Math.max(0, w.dir.ct[k] - dt);
    // ひかりの状態
    h.cdShot = Math.max(0, h.cdShot - dt); h.cdBurst = Math.max(0, h.cdBurst - dt); h.cdShove = Math.max(0, h.cdShove - dt);
    h.slow = Math.max(0, h.slow - dt); h.glue = Math.max(0, h.glue - dt); h.trance = Math.max(0, h.trance - dt);
    h.watched = Math.max(0, (h.watched || 0) - dt);
    if (h.bubble) { h.bubble.t -= dt; if (h.bubble.t <= 0) h.bubble = null; }
    if (h.decoy) { h.decoy.t -= dt; if (h.decoy.t <= 0) h.decoy = null; }
    if (h.mislead) { h.mislead -= dt; if (h.mislead <= 0) { h.mislead = 0; say(w, "misleadRealize", {}); h.path = null; } }
    h.peekT = Math.max(0, h.peekT - dt);
    h.idleMp += dt;
    if (h.form === "magica") {
      h.magic = Math.max(0, h.magic - G.BAL.passiveMagicDrain * dt);
      if (h.magic <= 0) untransform(w, null);
      if (h.idleMp > 1.2) h.mp = Math.min(G.HIKARI.mpMax, h.mp + (h.rest > 0 ? 7 : 2.4) * dt);
    }
    h.arousal = Math.max(0, h.arousal - (h.bound ? 0 : 0.35) * dt);
    h.pleasure = Math.max(0, h.pleasure - (h.bound ? 0 : 1.2) * dt);
    if (!h.bound) h.will = Math.min(100, h.will + 0.6 * dt * (1 - h.arousal / 150));

    perceive(w);
    if (h.bound) updateBound(w, dt);
    else if (h.rest > 0) {
      h.rest -= dt;
      if (h.shrineT > 0) {           // 偽りの祠：休んでいるつもりで吸われる
        h.shrineT -= dt;
        drainMagic(w, 9 * mult(w, "削") * dt, null);
        if (h.shrineT <= 0) { say(w, "shrineRealize", {}); h.rest = 0; }
      }
      if (threats(w).some(o => o.d < 4)) h.rest = 0;
    } else if (h.glue > 0) {
      // 足を取られている
    } else if (h.trance > 0) {
      if (h.lureTo) moveTowards(w, h, h.lureTo.x, h.lureTo.y, hikariSpeed(w) * 0.55, dt);
    } else {
      h.lureTo = null;
      if (h.think > 0) h.think -= dt;
      else {
        h.thinkT = (h.thinkT || 0) - dt;
        if (h.thinkT <= 0 || !h.path || !h.path.length) { h.thinkT = 0.25; if (!h.mislead) hikariThink(w); }
        const spd = hikariSpeed(w) * (h.state === "sneak" ? 0.55 : 1);
        if (followPath(w, h, spd, dt) && h.goal) arrive(w);
      }
    }
    // 動けていない時の保険
    if (U.dist(h.x, h.y, h.lastX, h.lastY) > 0.5) { h.lastX = h.x; h.lastY = h.y; h.stuckT = 0; } else if (!h.bound && h.rest <= 0 && h.state !== "attack") { h.stuckT += dt; if (h.stuckT > 6) { h.stuckT = 0; h.path = null; h.wantDown = true; } }
    if (h.floorT > 110) h.wantDown = true;

    for (const m of w.monsters) updateMonster(w, m, dt);
    w.monsters = w.monsters.filter(m => m.hp > 0);
    updateTraps(w, dt);
    updateProjs(w, dt);
    if (w.dir.auto) autoDirect(w, dt);
    for (const f of w.fx) f.t += dt;
    w.fx = w.fx.filter(f => f.t < f.life);
    if (h.hp <= 0 && !w.outcome) defeat(w, h.bound ? h.bound.src : null);
  }

  function arrive(w) {
    const h = w.run.h, map = w.map, g = h.goal;
    h.goal = null;
    if (!g) return;
    if (g.why === "down" && U.dist(h.x, h.y, map.down.x, map.down.y) < 0.8) {
      w.outcome = map.last ? "cleared" : "down";
    } else if (g.why === "retreat") {
      if (U.dist(h.x, h.y, map.up.x, map.up.y) < 0.8) w.outcome = w.run.recall ? "ordered" : "retreat";
      else if (map.portal && U.dist(h.x, h.y, map.down.x, map.down.y) < 0.8) w.outcome = w.run.recall ? "ordered" : "retreat";
    } else if (g.why === "chest") {
      const c = w.chests.find(c => !c.open && U.dist(c.x, c.y, h.x, h.y) < 1);
      if (c) { c.open = true; const it = U.pick(["star", "salve", "smelling"]); h.kit[it]++; say(w, "chest", { item: it }); record(w, { kind: "chest", item: it, sev: 0 }); }
    } else if (g.why === "shrine") {
      // 罠の判定は updateTraps 側（近づけば発動する）
    } else if (g.why === "peek") {
      h.think = U.rf(0.7, 1.3);        // 覗いて、様子を見る
    }
  }

  /* ================================================================ 観測フェーズ（敗北後の一晩） */
  function startNight(w) {
    w.night = { beat: 0, spent: 0, beats: [] };
    const h = w.run.h;
    // 近くの魔物が集まってくる
    for (const m of w.monsters) if (m.hp > 0 && m.d.spd > 0 && U.dist(m.x, m.y, h.x, h.y) < 9) { m.alert = 99; m.path = M.path(w.map, m.x, m.y, h.x, h.y) || []; }
  }
  // 一場面ぶん進める。場にいる魔物から誰が何をするかを決め、記録に残す
  function nightBeat(w) {
    const h = w.run.h, n = w.night;
    const around = w.monsters.filter(m => m.hp > 0 && (U.dist(m.x, m.y, h.x, h.y) < 9 || m.summoned));
    let m = U.pick(around.filter(x => !n.beats.some(b => b.mon === x.kind && b.i === n.beat - 1))) || U.pick(around);
    const beat = { i: n.beat, mon: m ? m.kind : null, monName: m ? m.d.name : "", type: m ? m.d.type : "蕩" };
    // 夜の間も堕ちは進む（ただし一晩で伸びる量には上限）
    h.pleasure += 40; h.arousal = Math.min(100, h.arousal + 10);
    if (h.pleasure >= 100) { h.pleasure = 20; h.climax++; beat.climax = true; }
    if (m) { m.x = h.x + U.rf(-0.8, 0.8); m.y = h.y + U.rf(-0.8, 0.8); if (!M.walkable(w.map, m.x, m.y)) { m.x = h.x; m.y = h.y; } }
    beat.lines = G.Text.nightBeat(beat, { run: w.run, h, n: n.beat, total: G.BAL.nightBeats });
    n.beats.push(beat);
    w.run.night.push(beat);
    record(w, { kind: "night", type: beat.type, mon: beat.mon, monName: beat.monName, sev: 3, climax: !!beat.climax, hidden: false });
    n.beat++;
    return beat;
  }

  G.Field = { createWorld, step, place, canPlace, cardInfo, startNight, nightBeat, spawnMonster, mult };
})();
if (typeof module !== "undefined") module.exports = G;
