/* field/step.js — field 内部。tools/files.js と index.html の順で読み込む。 */
(function () {
  "use strict";
  let U, M, createWorld, enterTrapRoom, spawnMonster, spawnTrap, heroName, say, live, feed, msg, fx, actMsg, record, heat, releaseOverflow, ATTACH, pray, mult, tierFx, sk, crave, applyEffect, untransform, engraveSigil, possess, tickStatus, endPossess, checkClimax, grab, release, actCat, defeat, perceive, roomAt, liveliness, updateHikari, updateMonster, updateTraps, triggerTrap, updateProjs, floodTick, gainShard;
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
    if (ci.trap) spawnTrap(w, ci.id, x, y).placed = true;
    else { const m = spawnMonster(w, ci.id, x, y, true); if (night) m.alert = 10; }
    fx(w, { kind: "summon", x, y, color: ci.trap ? "#ffd27a" : "#e070b0", life: 0.8 });
    record(w, { kind: "place", card, sev: 0, night: !!night });
    dirStat(w).placed++;
    return "ok";
  }
  // 仕込みの戦果（プレイヤーが呼んだ魔物・罠が、何をしたか）。潜行全体で数える
  function dirStat(w) { return w.run.dirStats || (w.run.dirStats = { placed: 0, holds: 0, acts: 0, climax: 0 }); }
  function byPlayer(w, src) {
    if (!src) return false;
    if (src.summoned) return true;
    return !!(src.d && src.d.effect && src.placed);   // 呼んだ罠
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
    if (h.charm && !h.bound && !h.drawn && h.form && !(h.floorT > 150)) {   // 長く同じ階にいると、正気を振り絞って出口を目指す
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
    const cool = !h.bound && h.dryAt == null && w.t - (h.unboundT ?? -99) < 5 ? 3 : 1;        // 抜け出した直後は、息を整えて熱を逃がす
    h.pleasure = Math.max(0, h.pleasure - (h.bound ? 0.7 : 2.2 * cool) * (1.3 - 0.9 * h.arousal / 100) * dt);
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
      if (tr.T.flood) floodTick(w, tr, dt);
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
    if (w.outcome === "cleared" && !w.shardDone) { w.shardDone = true; gainShard(w, "clear"); }   // 踏破の褒美
    // 締環：出口で外れる。溜まっていた分が、一度に
    if (h.ring && ["cleared", "retreat", "ordered", "down"].includes(w.outcome) && !w.ringDone) {   // 階段を降りる時に、輪は外れる
      w.ringDone = true; const over = h.ring.over; h.ring = null; const n = Math.min(6, 1 + Math.floor(over / 150) + Math.floor((h.urge || 0) / 35));
      h.urge = 0; h.cum = 0; h.shasei = (h.shasei || 0) + n; h.climax += n; record(w, { kind: "ringRelease", type: "蕩", n, sev: 3 });
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
    if (h.kinOver || h.omazuke || h.deny || h.pent) { const over = ((h.kinOver || {}).over || 0) + ((h.omazuke || {}).over || 0) + ((h.deny || {}).over || 0) + ((h.pent || {}).over || 0); h.kinOver = h.omazuke = h.deny = h.pent = null; if (over > 0) record(w, { kind: "release", type: "蕩", why: "night", n: 1 + Math.floor(over / 55), sev: 3 }); }
    for (const m of w.monsters) if (m.hp > 0 && m.d.spd > 0 && U.dist(m.x, m.y, h.x, h.y) < 9) { m.alert = 99; }
  }
  function nightBeat(w) {
    const h = w.run.h, n = w.night;
    for (const k in w.dir.ct) w.dir.ct[k] = 0;      // 夜は一場面ごとに、呼び直せる
    const around = w.monsters.filter(m => m.hp > 0 && (U.dist(m.x, m.y, h.x, h.y) < 9 || m.summoned));
    const lewd = around.filter(m => G.Text.actorOf(m.kind));
    const pool = lewd.length ? lewd : around;
    // 一場面に一〜三体。前の場面と同じ顔ぶれは避けぎみに
    const lead = U.pick(pool.filter(x => !n.beats.some(b => b.mon === x.kind && b.i === n.beat - 1))) || U.pick(pool);
    const group = lead ? [lead].concat(U.shuffle(pool.filter(x => x !== lead)).slice(0, U.pick([0, 1, 1, 2]))) : [];
    const beat = { i: n.beat, mon: lead ? lead.kind : null, monName: lead ? lead.d.name : "", type: lead ? lead.d.type : "蕩", group: [...new Set(group.map(m => m.d.name))], acts: 0, climaxN: 0, parts: {} };
    group.forEach((m, i) => { const a = i / Math.max(1, group.length) * Math.PI * 2 + U.rf(0, 1); const nx = h.x + Math.cos(a) * 0.7, ny = h.y + Math.sin(a) * 0.7; if (M.walkable(w.map, nx, ny)) { m.x = nx; m.y = ny; } });
    const scene = G.Text.nightParts(beat, { run: w.run, h, n: n.beat, total: G.BAL.nightBeats });
    const lines = scene.head.slice();
    for (const m of w.monsters) m.bubble = null;
    for (const m of group) { const v = G.Text.voice(m.kind, U.chance(0.5) ? "act" : "climax"); if (v && U.chance(0.7)) { lines.push(/^「/.test(v) ? `${m.d.name}${v}` : `${m.d.name}「${v}」`); m.bubble = { text: v, t: 99 }; } }
    // 何を、どのくらいされたか（夜はもう、直接）
    const swarm = 1 + 0.2 * (group.length - 1);
    for (const m of group) {
      const cat = actCat(w, m) || "hands";
      for (let k = 0, nk = 1 + (U.chance(0.55) ? 1 : 0); k < nk; k++) {
        const act = G.Text.actFor(m.kind, cat, 2); if (!act) continue;   // 夜はもう、直接
        lines.push(G.Text.fillAct(act, { mon: m.d.name, n: G.Hero.keep(G.Hero.d.short) }) + "。" + (act.fx ? "《" + act.fx + "》" : ""));
        beat.acts++; beat.parts[act.part] = (beat.parts[act.part] || 0) + 1;
        crave(w, m.kind, 0.3 * act.pw); { const sv = w.run.save; if (sv) { sv.parts = sv.parts || {}; const pp = sv.parts[m.kind] || (sv.parts[m.kind] = {}); pp[act.part] = (pp[act.part] || 0) + 1; } }
        if (act.watch) { h.arousal = Math.min(100, h.arousal + 5); continue; }
        // 射精は絶頂と同じ数え方（変生した身体は、達するたびに出す）
        if (act.cum && h.futa) { h.cum = (h.cum || 0) + 30 * act.pw * swarm; if (h.cum >= 100) h.pleasure = Math.max(h.pleasure, 100); }
        else { h.pleasure += 26 * act.pw * swarm * (1 + h.arousal / 150); h.arousal = Math.min(100, h.arousal + 6); }
        if (h.pleasure >= 100) {
          h.pleasure = 25 + U.rf(0, 20); h.climax++; beat.climaxN++;
          if (h.futa) { h.cum = 10; h.shasei = (h.shasei || 0) + 1; lines.push(G.Text.actMsg(act.cum ? "nightShasei" : "nightClimaxF", { p: act.p, mon: m.d.name, c: h.climax })); }
          else lines.push(G.Text.actMsg("nightClimax", { p: act.p, mon: m.d.name, c: h.climax }));
          (beat.cx = beat.cx || []).push({ at: lines.length - 1, kind: m.kind, part: act.part, mon: m.d.name });
        }
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
    if ((h.urge || 0) >= 10) add((h.futa ? "射精欲求 " : "絶頂欲求 ") + Math.round(h.urge), null, h.urge >= 60 ? "red" : "pink");
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
    if (h.exposure) add("装束損壊", null, "pink"); else if (h.torn) add("衣装が裂けた", null, "pink");
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
    if (h.form === "civilian") add(G.Text.spell((h.noTransform || 0) > 0 ? "noForm" : "civ"), h.noTransform > 0 ? h.noTransform : null, "red");
    if (h.cast && h.cast.kind === "transform") add(G.Text.spell("formCast"), h.cast.t, "violet");
    if (h.mislead > 0) add("幻に迷う", h.mislead, "violet");
    if (w.sealed) { const fr = w.sealed.room; if (fr.flood) add("閉じ込め・触手 " + Math.round(fr.fill * 100) + "%", null, "red"); else add("閉じ込め", w.sealed.t, "red"); }
    if (h.surrounded) add("包囲", null, "red");
    if (prep) add(prep.name + "（" + (prep.numb ? "熱に鈍い" : prep.slow ? "動きが重い" : "暗示に弱い") + "）", null, "dim");
    for (const a of w.run.save.ailments || []) { const A = G.Game && G.Game.AILMENTS[a.id] && G.Game.ail(a.id); if (A) add(A.name, null, "dim"); }
    return out;
  }

  Object.assign(G.F, { dirStat, byPlayer, cardInfo, canPlace, place, autoDirect, step, startNight, nightBeat, statusList });
  G.F.bind.push(() => { ({ U, M, createWorld, enterTrapRoom, spawnMonster, spawnTrap, heroName, say, live, feed, msg, fx, actMsg, record, heat, releaseOverflow, ATTACH, pray, mult, tierFx, sk, crave, applyEffect, untransform, engraveSigil, possess, tickStatus, endPossess, checkClimax, grab, release, actCat, defeat, perceive, roomAt, liveliness, updateHikari, updateMonster, updateTraps, triggerTrap, updateProjs, floodTick, gainShard } = G.F); });
  for (const bind of G.F.bind) bind();
  delete G.F.bind;
  G.Field = { statusList, createWorld, step, place, canPlace, cardInfo, startNight, nightBeat, spawnMonster, mult };
  G.Field._test = { grab, applyEffect, triggerTrap, checkClimax };   // 検査用（tools から直接呼ぶ）
})();
if (typeof module !== "undefined") module.exports = G;
