/* field/monster.js — field 内部。tools/files.js と index.html の順で読み込む。 */
(function () {
  "use strict";
  let U, M, SPREAD, spawnMonster, say, live, msg, fx, monSay, hitDesc, actMsg, actBub, addCloud, record, trait, intake, releaseOverflow, addCharm, addAttach, addCum, addCrack, pray, addBrain, mult, knowledge, applyEffect, drainMagic, possess, grab, release, openScene, move, pathDir, turnTo, flash;
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
    if (m.d.flee && m.hp < m.maxHp * (m.d.imp ? 0.3 : 0.5)) m.flee = m.d.imp ? 1.6 : 3;   // 小淫魔は、少し逃げてはまた寄ってくる
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
  function prefDist(m, h) {
    const A = m.d.atk;
    // 小淫魔：獲物が火照っている・惹かれている・呆けている時は、触れる距離まで寄ってくる
    if (m.d.imp && m.d.spd > 0 && h && (h.arousal > 40 || (h.charm && h.charm[m.kind]) || h.trance > 0 || h.pleasure > 50)) return 0.7;
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
    m.pounceCd = Math.max(0, (m.pounceCd || 0) - dt); m.teaseCd = Math.max(0, (m.teaseCd || 0) - dt);
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
    // 小淫魔の悪戯：触れる距離まで来たら、抱きついて数秒いじる（捕まえる種でなくても）
    if (d.imp && d.spd > 0 && A.kind !== "grab" && !h.bound && !w.outcome && m.alert > 0 && !(m.flee > 0) && !(m.teaseCd > 0) && m.stun <= 0 && dist < 0.95 && !(h.ifr > 0)
      && (h.arousal > 45 || (h.charm && h.charm[m.kind]) || h.trance > 0) && w.t - (w.impTeaseT ?? -99) > 12) {   // 火照っている時だけ。悪戯は、階じゅうで12秒に一度まで
      m.teaseCd = U.rf(14, 20); w.impTeaseT = w.t;
      if (grab(w, m, 0.28 * m.pow, "蕩")) { m.holding = true; h.bound.brief = U.rf(3.0, 3.8); h.bound.imp = true; msg(w, "impTease", { mon: d.name }); monSay(w, m, "grab", 0.9); return; }
    }
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
        const pref = prefDist(m, h);
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

  Object.assign(G.F, { hurtMon, killMon, alertMon, monSees, prefDist, spreadAngle, castingCount, updateMonster, startCast, fire });
  G.F.bind.push(() => { ({ U, M, SPREAD, spawnMonster, say, live, msg, fx, monSay, hitDesc, actMsg, actBub, addCloud, record, trait, intake, releaseOverflow, addCharm, addAttach, addCum, addCrack, pray, addBrain, mult, knowledge, applyEffect, drainMagic, possess, grab, release, openScene, move, pathDir, turnTo, flash } = G.F); });
})();
