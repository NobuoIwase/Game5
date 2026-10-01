/* field/trap.js — field 内部。tools/files.js と index.html の順で読み込む。 */
(function () {
  "use strict";
  let U, M, HR, spawnMonster, heroName, say, msg, fx, pushMsg, hitDesc, logLine, record, IMPS, trait, heat, intake, addCharm, addAttach, addCum, addCrack, pray, addBrain, mult, tierFx, learn, applyEffect, drainMagic, engraveSigil, checkClimax, grab, openScene, hurtMon, alertMon;
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


  Object.assign(G.F, { updateTraps, EMIT, updateTower, triggerTrap, breakTrap, updateProjs });
  G.F.bind.push(() => { ({ U, M, HR, spawnMonster, heroName, say, msg, fx, pushMsg, hitDesc, logLine, record, IMPS, trait, heat, intake, addCharm, addAttach, addCum, addCrack, pray, addBrain, mult, tierFx, learn, applyEffect, drainMagic, engraveSigil, checkClimax, grab, openScene, hurtMon, alertMon } = G.F); });
})();
