/* field/hikari.js — field 内部。tools/files.js と index.html の順で読み込む。 */
(function () {
  "use strict";
  let U, M, HR, SPREAD, heroName, say, msg, fx, pushMsg, monSay, record, heat, intake, ATTACH, pray, mult, knowledge, learn, expectation, sk, inspire, drainMagic, possess, checkClimax, grab, release, knock, updateBound, hurtMon, alertMon, hitTrap, orbPhase;
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
    if (m.kind === "lumina_grunt") { say(w, "spotLumina", {}); return; }
    if (m.kind === "haruka_grunt") { say(w, "spotHaruka", {}); return; }
    if (h.vessel && G.F.CULT.includes(m.kind)) { say(w, "vesselMeet", { mon: m.d.name }); G.F.pray(w, m, 2.6); return; }   // 器は、教えの者を見ると、跪いてしまう
    const paper = run.paper || {};
    const odd = m.d.type !== run.stated && m.d.type !== "削";
    if (odd) run.mismatch = (run.mismatch || 0) + 1;
    // 前にこの相手とあった件を、いつ・どこを、まで覚えている（一回の潜行で、相手ごとに一度・二体まで口にする）
    const said = run.epSaid || (run.epSaid = {}), ep = run.save && Object.keys(said).length < 2 && G.Game.pastEpisode(run.save, m.kind, run.day);
    const recall = () => {
      said[m.kind] = 1;
      const tier = G.tier(run.save.body, run.save.mind);
      const key = ep.defeat ? "recallDefeat" : ep.lied && ep.caught ? "recallCaught" : ep.climax >= 2 && U.chance(0.5) ? "recallClimax" : tier >= 3 ? "recallHold3" : tier === 2 ? "recallHold2" : "recallHold";
      say(w, key, G.Game.epCtx(ep, run.day));
    };
    // 身体が先に思い出す：以前に気持ちよくされた相手を見ると、熱が上がる
    if (ex > 0.15 && w.t - (h.anticT ?? -99) > 6) {
      h.anticT = w.t;
      h.arousal = Math.min(100, h.arousal + 30 * ex); h.pleasure += 8 * ex;
      record(w, { kind: "anticipate", type: "惑", mon: m.kind, monName: m.d.name, lv: Math.ceil(ex * 3), sev: ex > 0.6 ? 2 : 1 });
      msg(w, "anticipate", { mon: m.d.name });
      if (ep && !said[m.kind]) recall(); else say(w, ex > 0.6 ? "anticipate3" : ex > 0.35 ? "anticipate2" : "anticipate1", { mon: m.d.name });
      return;
    }
    if (ep && !said[m.kind] && U.chance(0.75)) { recall(); return; }
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
    h.bubble = { text: G.Text.spell("flash") + "！", t: 1.4 };
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
    if (h.hp < 38 && h.kit.salve > 0) { h.kit.salve--; h.hp = Math.min(h.hpMax || S.hpMax, h.hp + 35); say(w, "useSalve", {}); msg(w, "item", { item: G.Text.item("salve") }); record(w, { kind: "item", item: "salve", sev: 0 }); }
    const use = (k, fn) => { h.kit[k]--; fn(); msg(w, "item", { item: G.Text.item(k) }); record(w, { kind: "item", item: k, sev: 0 }); };
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
    const spent = h.hp < 30 * caution || h.will < (left >= 3 ? 26 : 16) || (h.climax >= 18 && h.arousal > 90) || (h.form === "civilian" && (h.kit.star === 0 || h.will < 50));   // 変身が解けて、戻れない／心が折れかけている：素の姿で戦い続けない
    const wantRetreat = run.recall || spent;
    if (wantRetreat && h.state !== "retreat") run.retreatWhy = run.recall ? "recall" : h.hp < 30 * caution ? "hp" : h.will < 26 ? "will" : h.climax >= 18 ? "heat" : "civ";
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
    // 満ちる触手の間：何より先に、穴のふちの玉を割る（撃つ／届けば杖で）
    {
      const fr = (w.trapRooms || []).find(r => r.flood && !r.flood.drain && !r.flood.done && h.room === r.r && r.orb && w.traps.includes(r.orb));
      if (fr && !h.bound) {
        const o = fr.orb, tgt = { x: o.x, y: o.y, kind: null, d: { name: o.d.name } }, d = U.dist(h.x, h.y, o.x, o.y);
        const ph = orbPhase(w, o), soon = ph < 0.9 || ph > 2.75;   // 殻が開いている／開く寸前だけ狙う
        if (!soon) { if (d > 2.6 && goToward(w, o.x, o.y, 1.0, "玉へ")) return; h.label = "玉の脈を待つ"; h.intent = null; return; }
        if (h.form === "magica" && h.cdShot <= 0 && h.mp >= S.shot.cost && shotClear(map, h.x, h.y, o.x, o.y)) { tryCast(w, tgt, "shot"); if (h.cast) { h.label = "玉を撃つ"; return; } }
        if (h.form === "magica" && d <= S.melee.range && h.cdMelee <= 0 && h.mp >= S.melee.cost) { tryCast(w, tgt, "melee"); if (h.cast) { h.label = "玉を打つ"; return; } }
        if (h.form !== "magica" && d <= 1.0) { if (!(h.orbHitT > w.t)) { h.orbHitT = w.t + 1.2; hitTrap(w, o); h.label = "玉を叩く"; } h.intent = null; return; }   // 素の姿でも、叩いて割る
        if (d > 0.9 && goToward(w, o.x, o.y, 1.0, "玉へ")) return;
      }
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
        // 動かない相手を、魔力を惜しんで遠くから見ているだけ——にはしない。撃てるなら撃ち、撃てないなら置いて先へ
        if (!m.d.spd) {
          if (h.mp >= S.shot.cost && h.cdShot <= 0) { tryCast(w, m, "shot"); if (h.cast || h.think > 0) return; }
          if (h.cdShot > 0.4 || h.mp < S.shot.cost) { h.walled = h.walled || {}; h.walled[m.id] = w.t + 8; return; }
        }
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
    if (!(w.duo && G.F.duoMove(w))) explore(w);        // 二人の潜行：救出・相棒を追う・出口の相棒のもとへ
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
    if (!h.drawn && !(h.floorT > 150) && U.chance(0.04)) {
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
  // 星の欠片：拾うたびに、ルミナの光が少しずつ強くなる（帰ってから身につく）
  function gainShard(w, why) {
    w.run.shards = (w.run.shards || 0) + 1; if (w.duo) { const k = "shards_" + G.Hero.cur; w.run[k] = (w.run[k] || 0) + 1; }
    record(w, { kind: "shard", why, sev: 0 });
    msg(w, "shard" + (why === "boss" ? "Boss" : why === "clear" ? "Clear" : ""), {}); say(w, "shard", {});
    fx(w, { kind: "burst", x: w.run.h.x, y: w.run.h.y, color: "#fff6b0", life: 0.8 });
  }
  function openChest(w, c) {
    const h = w.run.h;
    c.open = true;
    const it = U.pick(["star", "salve", "smelling", "ether", "ether", "cool"]); h.kit[it] = (h.kit[it] || 0) + 1;
    say(w, "chest", { item: it }); msg(w, "chest", { item: G.Text.item(it) });
    record(w, { kind: "chest", item: it, sev: 0 });
    if (U.chance(0.3)) gainShard(w, "chest");          // 宝箱の底に、星の欠片
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
    const name = G.Text.spell(kind === "burst" ? (sk(w, "nova") ? "nova" : "burst") : kind === "melee" ? (sk(w, "spear") ? "spear" : "melee") : (sk(w, "twin") && h.mp >= S.shot.cost + 3 ? "twin" : "shot"));
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
      for (const tr of w.traps.slice()) {                 // 壊せる仕掛け（満ち引きの玉）も、杖で打てる
        if (!tr.d.breakable || !tr.found || U.dist(h.x, h.y, tr.x, tr.y) > mRange + 0.3) continue;
        if (Math.abs(U.angDiff(a, U.angle(h.x, h.y, tr.x, tr.y))) > S.melee.arc / 2 + 0.3) continue;
        hitTrap(w, tr); hit++;
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

  Object.assign(G.F, { gainShard, free, clearPath, move, pathDir, shotClear, firingSpot, turnTo, perceive, roomAt, onSpot, threats, castHits, danger, urgent, bestDodge, pressure, flash, breakout, hikariSpeed, avoidFn, perceivedArousal, setIntent, goToward, hikariThink, tr_label, explore, monologue, liveliness, openChest, coverWithView, tryCast, releaseCast, tryShove, updateHikari, idleGlance });
  G.F.bind.push(() => { ({ U, M, HR, SPREAD, heroName, say, msg, fx, pushMsg, monSay, record, heat, intake, ATTACH, pray, mult, knowledge, learn, expectation, sk, inspire, drainMagic, possess, checkClimax, grab, release, knock, updateBound, hurtMon, alertMon, hitTrap, orbPhase } = G.F); });
})();
