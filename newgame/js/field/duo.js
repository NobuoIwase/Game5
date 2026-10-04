/* field/duo.js — 二人同時の潜行（Game4 の二人の動きを参照）。
 * 場の処理はもともと一人用（w.run.h）。二人の時は、手番ごとに w.run.h／w.run.save／いまのヒロイン（G.Hero）を差し替えて、
 * 同じ処理を一人ずつ回す（ctx）。魔物は、抱えている方か、近い方（倒れていない方）を相手にする。
 *  - 二人は寄り添って歩く（二人目は、離れたら一人目を追う）
 *  - 一人が倒れたら、もう一人が救出を最優先する（そばに立って数秒で起こす。捕まえている魔物は弾かれる）
 *  - 倒れている間も、捕まえた魔物の責めは続く（もがけない）
 *  - 出口へは、二人そろってから。二人とも倒れたら、敗北（一夜は二人いっしょ）
 *  - 洗脳が限界に達しても、相棒がいる限り引き戻される（二人の潜行では、戦闘員にされて連れ去られることはない） */
(function () {
  "use strict";
  let U, heroPre, worldPart, heroPost, updateHikari, updateMonster, updateTraps, updateProjs, autoDirect, release, record, msg, say, fx, feed, heroName, goToward, openScene;
  const RESCUE_T = 2.6;          // そばに立って、起こすまで（秒）
  const NEAR = 2.6;              // これより離れたら、二人目は一人目を追う

  // 手番の差し替え
  function ctx(w, i) {
    const D = w.duo; D.i = i;
    w.run.h = D.hs[i]; w.run.save = D.saves[i];
    G.Hero.set(D.ids[i]);
  }
  const partnerOf = w => w.duo.hs[1 - w.duo.i];
  const partnerName = w => G.Hero.keep(G.Hero.DATA[w.duo.ids[1 - w.duo.i]].short);
  // 二人の階の支度（一人目の位置の隣に、二人目を置く）
  function setup(w) {
    const run = w.run, p = run.pair;
    if (!p) return;
    w.duo = { hs: [run.h, p.h], ids: [run.hero, p.id], saves: [run.save, p.save], i: 0 };
    const h2 = p.h, h1 = run.h;
    const spots = [[0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9], [0.7, 0.7]];
    for (const [dx, dy] of spots) if (G.Map.walkable(w.map, h1.x + dx, h1.y + dy)) { h2.x = h1.x + dx; h2.y = h1.y + dy; break; }
    h2.lastX = h2.x; h2.lastY = h2.y;
    h2.out = null; h1.out = null;
  }
  // 魔物の相手：抱えている方 → 近い方（倒れていない方）
  function targetOf(w, m) {
    const D = w.duo;
    for (let i = 0; i < 2; i++) { const b = D.hs[i].bound; if (b && b.by.includes(m.id)) return i; }
    const a = D.hs[0], b = D.hs[1];
    if (a.out && !b.out) return 1;
    if (b.out && !a.out) return 0;
    return U.dist(m.x, m.y, a.x, a.y) <= U.dist(m.x, m.y, b.x, b.y) ? 0 : 1;
  }
  // 倒れた：相棒がまだ立っていれば、その場に伏す（救出を待つ）。二人目も倒れたら敗北
  function down(w, src) {
    const h = w.run.h, o = partnerOf(w);
    if (h.out) return true;
    if (o.out) return false;                       // 二人とも：いつもの敗北へ
    h.out = { t: 0, rescueT: 0, by: src && src.kind, name: src && src.d ? src.d.name : "", floor: w.floorNo };
    h.cast = null; h.intent = null; h.vx = h.vy = 0;
    record(w, { kind: "duoDown", type: src && src.d ? src.d.type : "絡", mon: src && src.kind, monName: h.out.name, sev: 3 });
    msg(w, "duoDown", { p: partnerName(w), mon: h.out.name });
    say(w, "duoDownSelf", { p: partnerName(w) });
    const i = w.duo.i; ctx(w, 1 - i);
    say(w, "duoDownCall", { p: partnerName(w), mon: h.out.name });
    w.run.h.duoAlarm = w.t;
    ctx(w, i);
    return true;
  }
  // 伏している間：捕まえている魔物の責めは続く（もがけない）。相棒がそばに立てば、起こされる
  function outTick(w, dt) {
    const h = w.run.h, o = partnerOf(w);
    h.out.t += dt;
    if (h.bubble) { h.bubble.t -= dt; if (h.bubble.t <= 0) h.bubble = null; }
    if (h.bound) { h.bound.struggle = 0; h.will = 0; updateHikari(w, dt); }
    const near = !o.out && !o.bound && U.dist(o.x, o.y, h.x, h.y) < 1.3;
    h.out.rescueT = near ? h.out.rescueT + dt : Math.max(0, h.out.rescueT - dt * 0.5);
    if (h.out.rescueT >= RESCUE_T) raise(w);
  }
  function raise(w) {
    const h = w.run.h;
    if (h.bound) release(w, true);
    const by = h.out.name; h.out = null;
    h.will = Math.max(h.will, 38); h.hp = Math.max(h.hp, Math.round((h.hpMax || 100) * 0.3)); h.ifr = 2.5; h.trance = 0; h.sleep = 0;
    record(w, { kind: "duoRescue", sev: 1, monName: by });
    msg(w, "duoRescued", { p: partnerName(w) });
    say(w, "duoThanks", { p: partnerName(w) });
    fx(w, { kind: "ring", x: h.x, y: h.y, color: "#fff2c0", r: 1.4, life: 0.7 });
    const i = w.duo.i; ctx(w, 1 - i); say(w, "duoRaise", { p: partnerName(w) }); ctx(w, i);
  }
  // 歩き方：探索の代わりに、救出・相棒を追う・出口の相棒のもとへ（hikariThink の最後で呼ばれる。true なら探索しない）
  function move(w) {
    if (!w.duo) return false;
    const h = w.run.h, o = partnerOf(w), lead = w.duo.i === 0;
    if (o.out) {                                     // 救出が先
      if (U.dist(h.x, h.y, o.x, o.y) > 0.9) goToward(w, o.x, o.y, 1.0, "救出へ", null, true);
      else { h.intent = null; h.label = "救出"; h.face = { x: o.x, y: o.y, t: 0.3 }; }
      return true;
    }
    if (o.exitAt && U.dist(h.x, h.y, o.exitAt.x, o.exitAt.y) > 0.4) { goToward(w, o.exitAt.x, o.exitAt.y, 1.0, "出口へ", null, true); return true; }
    if (!lead && U.dist(h.x, h.y, o.x, o.y) > NEAR) { goToward(w, o.x, o.y, 0.95, "後を追う", null, true); return true; }
    return false;
  }
  // 出口・階段：二人そろうまで待つ。倒れている相棒は置いていかない
  function gate(w, i) {
    const oc = w.outcome;
    if (!oc || oc === "defeat") return;
    const h = w.duo.hs[i], o = w.duo.hs[1 - i];
    if (!o.out && U.dist(h.x, h.y, o.x, o.y) < 1.6) { h.exitAt = null; return; }
    w.outcome = null;
    h.exitAt = { x: h.x, y: h.y, oc };
    if (!h.waitSaid) { h.waitSaid = true; msg(w, "duoWait", { p: G.Hero.keep(G.Hero.DATA[w.duo.ids[1 - i]].short) }, 8); }
  }
  // 一コマ
  function duoStep(w, dt) {
    const D = w.duo;
    w.t += dt;
    const glob = D.hs[0].out ? 1 : 0;              // 階の時計などは、立っている方の手番で一度だけ進める
    for (let i = 0; i < 2; i++) { ctx(w, i); if (!w.run.h.out) heroPre(w, dt, i === glob); }
    for (let i = 0; i < 2; i++) {
      ctx(w, i);
      if (w.run.h.out) outTick(w, dt);
      else { updateHikari(w, dt); gate(w, i); }
      if (w.outcome) break;
    }
    if (!w.outcome) {
      for (const m of w.monsters) { ctx(w, targetOf(w, m)); updateMonster(w, m, dt); }
      w.monsters = w.monsters.filter(m => m.hp > 0);
      let first = true;
      for (let i = 0; i < 2; i++) { ctx(w, i); if (w.run.h.out) continue; updateTraps(w, first ? dt : 0); updateProjs(w, first ? dt : 0); first = false; }
      ctx(w, glob);
      if (w.dir.auto) autoDirect(w, dt);
      for (const f of w.fx) f.t += dt;
      w.fx = w.fx.filter(f => f.t < f.life);
    }
    for (let i = 0; i < 2; i++) { ctx(w, i); if (!w.run.h.out || w.outcome) heroPost(w, dt); }
    ctx(w, 0);
  }

  Object.assign(G.F, { duoCtx: ctx, duoSetup: setup, duoStep, duoDown: down, duoMove: move, duoPartnerName: partnerName });
  G.F.bind.push(() => { ({ U, heroPre, worldPart, heroPost, updateHikari, updateMonster, updateTraps, updateProjs, autoDirect, release, record, msg, say, fx, feed, heroName, goToward, openScene } = G.F); });
})();
