/* field/blade.js — 遙の剣（刀ひとつ・近接が本分）。
 * ルミナが「素の身体と心の固さ」で耐えるのに対し、遙は技で凌ぐ。
 *  - 斬：霊力を使わない。寄って斬るのが基本
 *  - 飛刃：遠くへ飛ぶ斬撃。技なので霊力を食い、間も空く。動かぬ相手・遠くから撃つ相手・届かぬ相手にだけ
 *  - 静（居合）：向かってくる相手を、納刀したまま待つ。構えを保つほど溜まり、間合いに入った瞬間に抜き打つ
 *  - 動（踏み込み）：離れた相手へ、一息に間を詰めて斬る
 *  - 受け流し：掴みかかる手・飛びかかりを、正面で受けて流す。流された相手は崩れ、返しの一太刀が重い
 *  - その場の捌き：弾・光の扇・術は、半身に小さく捌いてかわし、間合いに残る（ルミナのように大きく飛びのかない）
 * 場の考えは hikari.js の hikariThink が先に回し、戦いの手の所だけ、ここへ回す。 */
(function () {
  "use strict";
  let U, HR, msg, say, fx, record, sk, inspire, knowledge, hurtMon, knock, alertMon, hitTrap, shotClear, goToward, setIntent, clearPath, danger, threats;
  const B = () => G.HARUKA;
  const isBlade = () => G.Hero.cur === "haruka";

  // 構えの溜め（静）：足を止めて相手を見据えている間だけ溜まる。動けば抜ける
  function stance(w, m, label) {
    const h = w.run.h;
    h.intent = null; h.label = label || "居合の構え"; h.face = { x: m.x, y: m.y, t: 0.4 };
    const was = h.zan || 0;
    h.zan = Math.min(1, was + 0.12 / B().iai.ready);
    if (was < 1 && h.zan >= 1) msg(w, "iaiReady", { mon: m.d.name }, 6);
  }
  const zanDecay = h => { h.zan = Math.max(0, (h.zan || 0) - 0.35); };

  // 剣の手：tryCast の代わり（"shot"→飛刃、"melee"→斬、"burst"→風車、"iai"→居合）
  function bladeCast(w, target, kind) {
    const h = w.run.h, S = B();
    if (h.cast || h.bound || h.form !== "magica") return;
    if (kind === "shot" && (h.cdShot > 0 || h.mp < S.shot.cost)) return;
    if (kind === "burst" && (h.cdBurst > 0 || h.mp < S.burst.cost)) return;
    if (kind === "melee" && h.cdMelee > 0) return;
    if (kind === "iai" && ((h.zan || 0) < 1 || h.cdMelee > 0)) return;
    if (kind !== "burst" && !shotClear(w.map, h.x, h.y, target.x, target.y)) return;
    const lv = target.kind && h.charm ? h.charm[target.kind] || 0 : 0;
    if (lv && U.chance(0.2 * lv)) { h.think = 0.5; msg(w, "charmHesitate", { mon: target.d ? target.d.name : "" }, 4); say(w, "charmHesitate", { mon: target.d ? target.d.name : "" }); return; }   // 魅了：好いた相手に、刀が鈍る
    const t = kind === "iai" ? 0.04 : kind === "burst" ? S.burst.cast : kind === "melee" ? S.melee.cast : S.shot.cast;
    h.cast = { kind, blade: true, t: t * (h.numb > 0 ? 1.6 : 1), target, tx: target.x, ty: target.y };
    h.intent = null; h.label = kind === "iai" ? "抜き打ち" : kind === "burst" ? "薙ぎ" : kind === "shot" ? "飛刃" : "斬";
    h.face = { x: target.x, y: target.y, t: 0.5 };
    const name = kind === "iai" ? G.Text.spell("iai") : G.Text.spell(kind === "burst" ? (sk(w, "nova") ? "nova" : "burst") : kind === "melee" ? (sk(w, "spear") ? "spear" : "melee") : (sk(w, "twin") && h.mp >= S.shot.cost + 3 ? "twin" : "shot"));
    if (kind !== "melee" || U.chance(0.2)) h.bubble = { text: name + "！", t: 1.1 };
    if (kind !== "melee") msg(w, "cast", { spell: name }, kind === "burst" || kind === "iai" ? 0 : 1.2);
  }
  // 刃の当たり（扇の内）
  function cut(w, a, range, arc, dmg, onHit) {
    const h = w.run.h;
    let hit = 0;
    for (const m of w.monsters) {
      if (m.hp <= 0 || U.dist(h.x, h.y, m.x, m.y) > range + m.d.r * 0.6) continue;
      if (Math.abs(U.angDiff(a, U.angle(h.x, h.y, m.x, m.y))) > arc / 2 + 0.2) continue;
      let dm = dmg;
      if (h.riposte && h.riposte.id === m.id && w.t < h.riposte.until) { dm *= B().parry.riposte; h.riposte = null; msg(w, "riposte", { mon: m.d.name }, 0); fx(w, { kind: "ring", x: m.x, y: m.y, color: "#ffd0d0", r: 0.7, life: 0.35 }); }
      hurtMon(w, m, dm); onHit(m); if (m.cast) { m.cast = null; msg(w, "interrupt", { mon: m.d.name }, 1); } hit++;
    }
    for (const tr of w.traps.slice()) {                 // 壊せる仕掛け（満ち引きの玉）も、斬れる
      if (!tr.d.breakable || !tr.found || U.dist(h.x, h.y, tr.x, tr.y) > range + 0.3) continue;
      if (Math.abs(U.angDiff(a, U.angle(h.x, h.y, tr.x, tr.y))) > arc / 2 + 0.3) continue;
      hitTrap(w, tr); hit++;
    }
    return hit;
  }
  function bladeRelease(w, c) {
    const h = w.run.h, S = B(), mul = h.dmgMul || 1;
    const tgt = c.target && c.target.hp > 0 ? c.target : { x: c.tx, y: c.ty };
    const a = U.angle(h.x, h.y, c.tx, c.ty);
    if (c.kind === "melee") {
      h.cdMelee = S.melee.cd; zanDecay(h);
      const spear = sk(w, "spear"), r = S.melee.range + (spear ? 0.35 : 0);
      fx(w, { kind: "slash", x: h.x + Math.cos(a) * 0.7, y: h.y + Math.sin(a) * 0.7, a, color: "#e8f4ff", life: 0.22 });
      const hit = cut(w, a, r, S.melee.arc, (S.melee.dmg + (spear ? 3 : 0)) * mul, m => { knock(w, m, U.angle(h.x, h.y, m.x, m.y), 0.35); m.stun = Math.max(m.stun, 0.22); });
      if (!hit) msg(w, "whiff", {}, 2); else inspire(w, "melee");
      record(w, { kind: "melee", sev: 0 });
    } else if (c.kind === "iai") {                       // 居合：溜めた構えから、一閃
      h.cdMelee = S.melee.cd + 0.3; h.zan = 0;
      fx(w, { kind: "slash", x: h.x + Math.cos(a) * 0.9, y: h.y + Math.sin(a) * 0.9, a, color: "#ffffff", life: 0.35 });
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#cfe6ff", r: S.iai.range * 0.6, life: 0.3 });
      const hit = cut(w, a, S.iai.range, S.iai.arc, S.iai.dmg * mul, m => { knock(w, m, U.angle(h.x, h.y, m.x, m.y), 0.7); m.stun = Math.max(m.stun, S.iai.stun); });
      msg(w, hit ? "iai" : "whiff", {}, 0); if (hit) inspire(w, "melee");
      record(w, { kind: "iai", sev: 0 });
    } else if (c.kind === "burst") {                     // 風車：自分のまわりを薙ぐ
      h.mp -= S.burst.cost; h.cdBurst = S.burst.cd; h.idleMp = 0; zanDecay(h);
      const nova = sk(w, "nova"), r = S.burst.radius + (nova ? 0.5 : 0);
      fx(w, { kind: "ring", x: h.x, y: h.y, color: "#e8f4ff", r, life: 0.45 });
      for (const m of w.monsters) if (m.hp > 0 && U.dist(m.x, m.y, h.x, h.y) < r + m.d.r * 0.5) { hurtMon(w, m, (S.burst.dmg + (nova ? 4 : 0)) * mul); knock(w, m, U.angle(h.x, h.y, m.x, m.y), 0.6); m.stun = Math.max(m.stun, 0.4); if (m.cast) m.cast = null; }
      record(w, { kind: "burst", sev: 0 }); inspire(w, "burst");
    } else {                                             // 飛刃：三日月の斬撃が飛ぶ
      const lead = U.dist(h.x, h.y, tgt.x, tgt.y) / S.shot.speed;
      const tx = tgt.x + (tgt.vx || 0) * lead, ty = tgt.y + (tgt.vy || 0) * lead;
      const spread = (h.arousal / 100) * 0.35 + (h.hyp || 0) / 100 * 0.3 + (h.trance > 0 ? 0.3 : 0) + 0.03;
      const a2 = U.angle(h.x, h.y, tx, ty) + U.rf(-spread, spread);
      const twin = sk(w, "twin") && h.mp >= S.shot.cost + 3, dm = S.shot.dmg * mul * (twin ? 0.65 : 1);
      for (const off of twin ? [-0.08, 0.08] : [0]) w.projs.push({ id: w.nextId++, x: h.x + Math.cos(a2 + off) * 0.45, y: h.y + Math.sin(a2 + off) * 0.45, vx: Math.cos(a2 + off) * S.shot.speed, vy: Math.sin(a2 + off) * S.shot.speed, owner: "h", dmg: dm, r: 0.26, life: S.shot.range / S.shot.speed, kind: "blade" });
      h.mp -= S.shot.cost + (twin ? 3 : 0); h.cdShot = S.shot.cd; h.idleMp = 0; zanDecay(h);
      record(w, { kind: "shot", sev: 0 }); inspire(w, "shot");
    }
    for (const m of w.monsters) if (U.dist(m.x, m.y, h.x, h.y) < 4.5 && m.hp > 0) alertMon(w, m, 0.7);
  }

  // 受け流し：掴む手・飛びかかりを、正面で受けて流す（bound.js の grab から）。流せたら true
  function parry(w, src) {
    const h = w.run.h, P = B().parry;
    if (!isBlade() || h.form !== "magica" || h.bound || (h.parryCd || 0) > 0 || !src.d || src.d.spd === undefined) return false;
    if (h.cast && h.cast.kind !== "melee" && h.cast.kind !== "iai") return false;          // 大技の最中は、受けられない
    if (h.sleep > 0 || h.trance > 0 || h.freeze > 0 || h.glue > 0) return false;
    const facing = Math.abs(U.angDiff(h.a, U.angle(h.x, h.y, src.x, src.y))) < P.arc;
    if (!facing) return false;                                                           // 背後・横からの手は、受けられない
    let p = P.base + P.stance * (h.zan || 0) + knowledge(w, src.kind) * 0.15 + (sk(w, "mikiri") ? 0.08 : 0) + (h.guard > w.t ? 0.12 : 0)
      - h.arousal / 220 - (h.hyp || 0) / 250 - (h.numb > 0 ? 0.15 : 0) - Math.max(0, 40 - h.will) / 200;
    h.parryCd = P.cd;
    if (!U.chance(U.clamp(p, 0.05, 0.85))) return false;
    h.ifr = Math.max(h.ifr, 0.3); h.cast = null; h.guard = 0;
    src.stun = Math.max(src.stun || 0, P.stun); src.cast = null; src.dash = null; src.cd = Math.max(src.cd || 0, 1.2);
    knock(w, src, U.angle(h.x, h.y, src.x, src.y), 0.55);
    h.riposte = { id: src.id, until: w.t + P.win };
    h.cdMelee = Math.min(h.cdMelee, 0.05);                                               // 返しの一太刀は、すぐ
    fx(w, { kind: "ring", x: (h.x + src.x) / 2, y: (h.y + src.y) / 2, color: "#ffffff", r: 0.5, life: 0.25 });
    msg(w, "parry", { mon: src.d.name }, 0); if (U.chance(0.35)) say(w, "parry", { mon: src.d.name });
    record(w, { kind: "parry", mon: src.kind, monName: src.d.name, sev: 0 }); inspire(w, "dodge");
    return true;
  }

  // 危険への応じ方：掴みに来る相手が目の前なら、受けの構えで待つ。弾・術・遠い相手は、その場で小さく捌く
  function evade(w, u, ts) {
    const h = w.run.h, S = B(), m = u.m;
    const grabby = m && m.cast && ["grab", "grab2", "pounce"].includes(m.cast.kind);
    const close = m && U.dist(h.x, h.y, m.x, m.y) <= (S.melee.range + 0.9);
    if (grabby && close && (h.parryCd || 0) <= 0 && h.will > 25 && U.chance(0.75)) {
      h.guard = w.t + 0.6; h.cast = null; h.intent = null; h.label = "受けの構え"; h.face = { x: m.x, y: m.y, t: 0.6 };
      if (!h.dashed[u.key]) { h.dashed[u.key] = 1; msg(w, "guard", { mon: m.d.name }, 3); }
      return;
    }
    // その場の捌き：短く、横へ。そのぶん一瞬だけ、何にも掛からない
    const sp = S.step.dist + (sk(w, "stardust") ? 0.3 : 0);
    let best = null;
    const base = m ? U.angle(m.x, m.y, h.x, h.y) : h.a;
    for (const off of [Math.PI / 2, -Math.PI / 2, Math.PI / 3, -Math.PI / 3, Math.PI * 2 / 3, -Math.PI * 2 / 3, 0, Math.PI]) {
      const a = base + off, dx = Math.cos(a), dy = Math.sin(a);
      if (!clearPath(w.map, h, h.x + dx * sp, h.y + dy * sp, HR)) continue;
      const p = { x: h.x + dx * sp, y: h.y + dy * sp };
      const s = -danger(w, p) - Math.abs(off) * 0.4;     // 横へ捌くほど良い（下がらない）
      if (!best || s > best.s) best = { x: dx, y: dy, s };
    }
    if (!best) best = { x: Math.cos(base), y: Math.sin(base) };
    if (!h.dashed[u.key]) {
      h.dashed[u.key] = 1; h.dashT = 0.16; h.ifr = Math.max(h.ifr, S.step.ifr + (sk(w, "stardust") ? 0.12 : 0)); inspire(w, "dodge");
      msg(w, "dodge", {}, 2.5); zanDecay(h);
    }
    h.cast = null;
    setIntent(h, best.x, best.y, h.dashT > 0 ? 2.0 : 1.1, "捌き", ts[0] ? ts[0].m : null);
  }

  // 戦いの手（hikariThink から。手を打ったら true）
  function combat(w, t0, ts, vis, seenNow) {
    const h = w.run.h, S = B(), m = t0.m, d = t0.d;
    const A = m.d.atk, reach = S.melee.range + m.d.r * 0.5;
    const reachy = (A.kind === "grab" && (A.range || 1) > 1.6) || A.kind === "drain" || (A.kind === "aura" && !A.burst);
    const ranged = A.kind === "shot" || A.kind === "lure" || A.kind === "deny" || A.kind === "omazuke";
    const near = ts.filter(o => o.d < S.burst.radius + 0.4);
    // 二体以上が刃の届く所に：風車で薙ぐ
    if (near.length >= 2 && h.cdBurst <= 0 && h.mp >= S.burst.cost) { bladeCast(w, m, "burst"); if (h.cast) return true; }
    // 間合いの内：溜まっていれば抜き打ち、でなければ斬る。返しの一太刀を逃さない
    if (d <= reach && seenNow) {
      if ((h.zan || 0) >= 1 && h.cdMelee <= 0) { bladeCast(w, m, "iai"); if (h.cast) return true; }
      if (h.cdMelee <= 0) { bladeCast(w, m, "melee"); if (h.cast) return true; }
      stance(w, m, "見据える");
      return true;
    }
    // 居合の間合いに入ってくる：抜き打つ
    if (d <= S.iai.range + m.d.r * 0.5 && (h.zan || 0) >= 1 && h.cdMelee <= 0 && seenNow) { bladeCast(w, m, "iai"); if (h.cast) return true; }
    // 飛刃（技）：動かぬ相手・遠くから撃ってくる相手・触手の長い相手。当てられる時だけ
    if (vis && d <= S.shot.range && h.cdShot <= 0 && h.mp >= S.shot.cost && (m.d.spd === 0 || ranged || reachy) && h.mp >= S.shot.cost + 8) { bladeCast(w, m, "shot"); if (h.cast) return true; }
    // 静：向かってくる相手（掴みに来る手合い）は、構えて待つ
    const coming = m.d.spd > 0 && m.alert > 0 && !ranged && !reachy && d < 4.2 && seenNow;
    if (coming) {
      if (h.zanSince == null || h.zanFor !== m.id) { h.zanSince = w.t; h.zanFor = m.id; }
      if (w.t - h.zanSince < 4) { stance(w, m); return true; }   // 来ないなら、四秒で見切りをつけて、こちらから
    } else if (!coming) { h.zanSince = null; }
    // 動：踏み込む（離れた相手へ、一息に）
    if (d < S.lunge.dist + reach && d > reach && (h.lungeCd || 0) <= 0 && seenNow && m.d.spd >= 0) {
      h.lungeCd = S.lunge.cd; h.dashT = 0.24; zanDecay(h);
      if (goToward(w, m.x, m.y, 2.0, "踏み込み", m)) { msg(w, "lunge", { mon: m.d.name }, 4); return true; }
    }
    zanDecay(h);
    if (goToward(w, m.x, m.y, m.alert ? 1.0 : 0.55, m.alert ? "間合いを詰める" : "忍び寄る", m)) return true;
    h.walled = h.walled || {}; h.walled[m.id] = w.t + 6;     // 行けない相手は、しばらく置いておく
    return false;
  }
  // 時間で減るもの（step.js の heroPre から）
  function tick(w, dt) {
    const h = w.run.h;
    if (h.parryCd > 0) h.parryCd -= dt;
    if (h.lungeCd > 0) h.lungeCd -= dt;
    if (Math.hypot(h.vx || 0, h.vy || 0) > 0.6 && h.label !== "受けの構え") h.zan = Math.max(0, (h.zan || 0) - dt * 1.2);   // 動けば、溜めは抜ける
  }

  Object.assign(G.F, { isBlade, bladeCast, bladeRelease, bladeParry: parry, bladeEvade: evade, bladeCombat: combat, bladeTick: tick });
  G.F.bind.push(() => { ({ U, HR, msg, say, fx, record, sk, inspire, knowledge, hurtMon, knock, alertMon, hitTrap, shotClear, goToward, setIntent, clearPath, danger, threats } = G.F); });
})();
