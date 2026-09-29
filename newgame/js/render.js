/* render.js — 潜行の画面を canvas に描く（world を読むだけで、中身は変えない）
 * 床の絵・小物・たいまつは Game5 の素材（assets/env）を流用。
 * 動きの味付けは旧 Game5 の motion-v039 から：進む方へ傾く、急に止まるとのけぞる、打たれると押される。
 * 魔物は気づいた瞬間に跳ね、構えで身を引き、放つ瞬間に飛びかかる。ひかりの絵はコマ送りせず、1枚を動かすだけ。
 */
var G = (typeof G !== "undefined") ? G : {};
(function () {
  "use strict";
  const U = G.U;
  const IMG = {};
  function img(src) { if (!IMG[src]) { const i = new Image(); i.src = src; IMG[src] = i; } return IMG[src]; }
  const ok = i => i && i.complete && i.naturalWidth > 0;
  function preload() {
    for (const k in G.MONSTERS) img("assets/monsters/" + G.MONSTERS[k].art);
    for (const f of ["civilian", "magica"]) for (const d of ["front", "back", "left", "right"]) img(`assets/hikari/hikari_${f}_${d}_1.png`);
    for (const k in G.DUNGEONS) img(`assets/env/floor_${k}.png`);
    for (const n of ["dungeon.png", "chest_closed.webp", "chest_open.webp", "stairs_open.webp", "pool.webp"]) img("assets/env/" + n);
  }
  const TRAP_ICON = { bell: "鈴", mirror: "鏡", decoy: "燭", glue: "粘", vent: "香", urn: "甕", vine: "蔦", rope: "縄", shrine: "祠", basin: "水", pillory: "晒", tease: "焦", belt: "帯" };
  const TYPE_COLOR = { "惑": "#b48cff", "蕩": "#ff7fb0", "絡": "#6fc2ff", "削": "#63e0d6" };
  const hash = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + (k || 0) * 2246822519) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return (h ^ (h >>> 16)) >>> 0; };

  // dungeon.png（64px 四方×4×4）の中の小物
  const ATLAS = { torch: [2, 1], crystal: [3, 1], rubble: [0, 3], mire: [0, 2], fog: [3, 2], wall: [3, 0] };
  function atlas(ctx, key, x, y, w, h) {
    const im = img("assets/env/dungeon.png"); if (!ok(im)) return;
    const [cx, cy] = ATLAS[key]; ctx.drawImage(im, cx * 64, cy * 64, 64, 64, x, y, w, h);
  }

  // 階ごとの飾り（一度だけ決める）：壁のたいまつ、水晶、瓦礫、水たまり
  function decor(w) {
    if (w._decor) return w._decor;
    const map = w.map, out = [];
    for (const r of map.rooms) {
      // 部屋の上の壁に、たいまつを1〜2本
      const n = r.w >= 7 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const tx = r.x + Math.round((k + 1) * r.w / (n + 1)) - 1, ty = r.y - 1;
        if (ty >= 0 && map.t[ty * map.W + tx] === 1) out.push({ kind: "torch", x: tx + 0.5, y: ty + 0.85, light: 3.2 });
      }
      const extra = hash(r.x, r.y, w.floorNo) % 3;
      for (let k = 0; k < extra; k++) {
        const x = r.x + (hash(r.x, k, 7) % r.w), y = r.y + (hash(r.y, k, 9) % r.h);
        if (map.t[y * map.W + x] !== 0) continue;
        const kind = w.dg === G.DUNGEONS.mist ? (k % 2 ? "crystal" : "rubble") : w.dg === G.DUNGEONS.mire ? (k % 2 ? "mire" : "rubble") : "rubble";
        out.push({ kind, x: x + 0.5, y: y + 0.5, light: kind === "crystal" ? 1.8 : 0 });
      }
    }
    w._decor = out;
    return out;
  }

  // 漂う光の粒（画面ごと）
  const motes = [];
  function stepMotes(w, dt) {
    while (motes.length < 36) motes.push({ x: U.rf(0, w.map.W), y: U.rf(0, w.map.H), vx: U.rf(-0.15, 0.15), vy: U.rf(-0.25, -0.05), a: U.rf(0.2, 0.7), t: U.rf(0, 6) });
    for (const m of motes) { m.x += m.vx * dt; m.y += m.vy * dt; m.t += dt; if (m.y < 0 || m.x < 0 || m.x > w.map.W) { m.x = U.rf(0, w.map.W); m.y = w.map.H; } }
  }

  // cam: {x, y, scale}（scale＝1マスの画素数）
  let lightCv = null, lastT = 0;
  function draw(ctx, w, cam, ui) {
    const cv = ctx.canvas, S = cam.scale, pal = w.dg.pal, map = w.map, h = w.run.h;
    const X = x => (x - cam.x) * S + cv.width / 2, Y = y => (y - cam.y) * S + cv.height / 2;
    const now = performance.now() / 1000, dt = Math.min(0.1, now - lastT); lastT = now;
    stepMotes(w, dt);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = pal.wall; ctx.fillRect(0, 0, cv.width, cv.height);
    const x0 = Math.max(0, Math.floor(cam.x - cv.width / 2 / S) - 1), x1 = Math.min(map.W, Math.ceil(cam.x + cv.width / 2 / S) + 1);
    const y0 = Math.max(0, Math.floor(cam.y - cv.height / 2 / S) - 1), y1 = Math.min(map.H, Math.ceil(cam.y + cv.height / 2 / S) + 1);
    const floorIm = img(`assets/env/floor_${w.run.dungeon}.png`);
    const trapRoom = (tx, ty) => (w.trapRooms || []).some(r => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h);
    // 床
    for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
      const t = map.t[ty * map.W + tx];
      if (t === 1) continue;
      if (ok(floorIm)) {
        const hv = hash(tx, ty, w.floorNo), col = hv % 100 < 5 ? 3 : hv % 3, row = (hv >> 4) % 2;
        ctx.drawImage(floorIm, col * 64, row * 64, 64, 64, X(tx), Y(ty), S + 1, S + 1);
        ctx.fillStyle = "rgba(10,8,16,0.28)"; ctx.fillRect(X(tx), Y(ty), S + 1, S + 1);
      } else { ctx.fillStyle = (tx + ty) % 2 ? pal.floor : pal.floor2; ctx.fillRect(X(tx), Y(ty), S + 1, S + 1); }
      if (trapRoom(tx, ty)) { ctx.fillStyle = "rgba(160,40,80,0.10)"; ctx.fillRect(X(tx), Y(ty), S + 1, S + 1); }
    }
    // 壁：床に面した壁は、正面（壁の顔）を描く
    for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
      if (map.t[ty * map.W + tx] !== 1) continue;
      if (ty + 1 < map.H && map.t[(ty + 1) * map.W + tx] !== 1) {
        const g = ctx.createLinearGradient(0, Y(ty), 0, Y(ty + 1));
        g.addColorStop(0, pal.wall); g.addColorStop(0.35, pal.edge); g.addColorStop(1, "#0c0a12");
        ctx.fillStyle = g; ctx.fillRect(X(tx), Y(ty + 0.25), S + 1, S * 0.75 + 1);
        ctx.fillStyle = "rgba(255,255,255,0.05)"; for (let k = 0; k < 3; k++) ctx.fillRect(X(tx + (hash(tx, ty, k) % 8) / 8), Y(ty + 0.4 + k * 0.18), S * 0.12, 1);
      }
    }
    // 柱
    for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
      if (map.t[ty * map.W + tx] !== 2) continue;
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(X(tx + 0.55), Y(ty + 0.9), S * 0.45, S * 0.16, 0, 0, 7); ctx.fill();
      const g = ctx.createLinearGradient(X(tx + 0.12), 0, X(tx + 0.88), 0);
      g.addColorStop(0, "rgba(255,255,255,0.18)"); g.addColorStop(0.35, pal.edge); g.addColorStop(1, pal.wall);
      ctx.fillStyle = g; ctx.fillRect(X(tx + 0.14), Y(ty - 0.5), S * 0.72, S * 1.3);
      ctx.fillStyle = pal.wall; ctx.fillRect(X(tx + 0.06), Y(ty - 0.62), S * 0.88, S * 0.2); ctx.fillRect(X(tx + 0.06), Y(ty + 0.7), S * 0.88, S * 0.14);
    }
    // ひかりが見ていない所を少し暗く
    if (!ui.night) {
      ctx.fillStyle = "rgba(8,6,14,0.3)";
      for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) if (map.t[ty * map.W + tx] !== 1 && !map.seen[ty * map.W + tx]) ctx.fillRect(X(tx), Y(ty), S + 1, S + 1);
    }
    // 小物
    const dec = decor(w);
    for (const d of dec) {
      if (d.kind === "torch") continue;
      if (d.kind === "mire") { ctx.globalAlpha = 0.8; atlas(ctx, "mire", X(d.x) - S * 0.5, Y(d.y) - S * 0.5, S, S); ctx.globalAlpha = 1; }
      else atlas(ctx, d.kind, X(d.x) - S * 0.45, Y(d.y) - S * 0.7, S * 0.9, S * 0.9);
    }
    for (const d of dec) if (d.kind === "torch") atlas(ctx, "torch", X(d.x) - S * 0.4, Y(d.y) - S * 0.95, S * 0.8, S * 0.8);
    // 階段・転移陣
    drawStairsUp(ctx, X(map.up.x), Y(map.up.y), S);
    if (map.last) drawPortal(ctx, X(map.down.x), Y(map.down.y), S, w.t);
    else { const si = img("assets/env/stairs_open.webp"); if (ok(si)) { const k = S * 1.2 / si.naturalWidth; ctx.drawImage(si, X(map.down.x) - S * 0.6, Y(map.down.y) - si.naturalHeight * k + S * 0.45, S * 1.2, si.naturalHeight * k); } else drawStairsUp(ctx, X(map.down.x), Y(map.down.y), S); }
    if (map.portal && !map.last) drawPortal(ctx, X(map.down.x + 0.9), Y(map.down.y), S * 0.6, w.t);
    // 宝箱
    for (const c of w.chests) drawChest(ctx, X(c.x), Y(c.y), S, c.open);
    // 罠（指揮者には全部見えている。ひかりが見つけた罠は縁取り）
    for (const tr of w.traps) {
      const cx = X(tr.x), cy = Y(tr.y), big = tr.d.big;
      ctx.globalAlpha = tr.armed ? 0.92 : 0.35;
      if (tr.active > 0) { ctx.fillStyle = "rgba(255,150,200,0.18)"; ctx.beginPath(); ctx.arc(cx, cy, tr.d.radius * S, 0, 7); ctx.fill(); }
      if (big) { ctx.strokeStyle = "rgba(255,120,160,0.35)"; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(cx, cy, tr.d.radius * S, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = "rgba(20,14,24,0.75)"; ctx.beginPath(); ctx.arc(cx, cy, S * (big ? 0.42 : 0.3), 0, 7); ctx.fill();
      ctx.strokeStyle = tr.found ? "#fff3a0" : TYPE_COLOR[tr.d.type]; ctx.lineWidth = tr.found ? 2.5 : 1.5; ctx.stroke();
      ctx.fillStyle = TYPE_COLOR[tr.d.type]; ctx.font = `bold ${Math.round(S * (big ? 0.4 : 0.32))}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(TRAP_ICON[tr.kind] || "罠", cx, cy + 1);
      ctx.globalAlpha = 1;
    }
    // ひかりの視界
    if (!ui.night && !w.outcome) {
      const g = ctx.createRadialGradient(X(h.x), Y(h.y), 0, X(h.x), Y(h.y), 8 * S);
      g.addColorStop(0, "rgba(255,240,200,0.10)"); g.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X(h.x), Y(h.y)); ctx.arc(X(h.x), Y(h.y), 8 * S, h.a - 1.22, h.a + 1.22); ctx.closePath(); ctx.fill();
    }
    // 魔物とひかりを、奥（上）から順に
    ctx.imageSmoothingEnabled = true;
    const ents = w.monsters.filter(m => m.hp > 0).map(m => ({ y: m.y, m })).concat([{ y: h.y, h: true }]);
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.h ? drawHikari(ctx, w, X(h.x), Y(h.y), S, ui) : drawMonster(ctx, w, e.m, X(e.m.x), Y(e.m.y), S);
    // 弾
    for (const p of w.projs) {
      const c = p.owner === "h" ? "#fff3b0" : ({ mucus: "#ff9ad0", psy: "#c8a0ff", beam: "#e0b0ff", cold: "#9ff4ff" }[p.kind] || "#fff");
      ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Math.max(3, p.r * S), 0, 7); ctx.fill();
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(X(p.x - p.vx * 0.03), Y(p.y - p.vy * 0.03), Math.max(2, p.r * S * 0.8), 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    if (h.decoy) { ctx.fillStyle = "rgba(40,20,60,0.55)"; ctx.beginPath(); ctx.ellipse(X(h.decoy.x), Y(h.decoy.y), S * 0.4, S * 0.6, 0, 0, 7); ctx.fill(); }
    // 効果
    for (const f of w.fx) {
      const k = f.t / f.life, cx = X(f.x), cy = Y(f.y);
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = ctx.fillStyle = f.color || "#fff";
      if (f.kind === "ring") { ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, S * (f.r || 0.9) * (0.4 + k), 0, 7); ctx.stroke(); }
      else if (f.kind === "burst") { ctx.beginPath(); ctx.arc(cx, cy, S * (f.r || 1.2) * (0.3 + k), 0, 7); ctx.fill(); }
      else if (f.kind === "hit" || f.kind === "pop") { ctx.beginPath(); ctx.arc(cx, cy, S * 0.3 * (1 + k), 0, 7); ctx.fill(); }
      else if (f.kind === "slash") { ctx.lineWidth = S * 0.12 * (1 - k) + 1; ctx.beginPath(); ctx.arc(cx - Math.cos(f.a) * S * 0.7, cy - Math.sin(f.a) * S * 0.7, S * 1.1, f.a - 0.7 + k * 0.4, f.a + 0.7 + k * 0.4); ctx.stroke(); }
      else if (f.kind === "summon") { ctx.lineWidth = 2; for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.arc(cx, cy, S * (0.2 + r * 0.25) * (1 - k * 0.5), 0, 7); ctx.stroke(); } }
      ctx.globalAlpha = 1;
    }
    // 明かり：全体を暗くして、ひかり・たいまつ・水晶の周りだけ明るく
    if (!lightCv) lightCv = document.createElement("canvas");
    if (lightCv.width !== cv.width || lightCv.height !== cv.height) { lightCv.width = cv.width; lightCv.height = cv.height; }
    const lc = lightCv.getContext("2d");
    lc.globalCompositeOperation = "source-over"; lc.clearRect(0, 0, cv.width, cv.height);
    lc.fillStyle = ui.night ? "rgba(6,3,12,0.62)" : "rgba(6,3,12,0.48)"; lc.fillRect(0, 0, cv.width, cv.height);
    lc.globalCompositeOperation = "destination-out";
    const hole = (x, y, r, a) => { const g = lc.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)"); lc.fillStyle = g; lc.beginPath(); lc.arc(x, y, r, 0, 7); lc.fill(); };
    hole(X(h.x), Y(h.y) - S * 0.5, S * (h.form === "magica" ? 5.5 : 4.2), 1);
    for (const d of dec) if (d.light) hole(X(d.x), Y(d.y) - S * 0.4, S * d.light * (1 + Math.sin(now * 7 + d.x) * 0.05), 0.85);
    hole(X(map.down.x), Y(map.down.y), S * 1.6, 0.7);
    for (const p of w.projs) hole(X(p.x), Y(p.y), S * 1.2, 0.6);
    ctx.drawImage(lightCv, 0, 0);
    // たいまつの暖かい色
    ctx.globalCompositeOperation = "lighter";
    for (const d of dec) if (d.kind === "torch") { const g = ctx.createRadialGradient(X(d.x), Y(d.y) - S * 0.5, 0, X(d.x), Y(d.y) - S * 0.5, S * 2.2); g.addColorStop(0, "rgba(255,160,70,0.22)"); g.addColorStop(1, "rgba(255,160,70,0)"); ctx.fillStyle = g; ctx.fillRect(X(d.x) - S * 2.2, Y(d.y) - S * 2.7, S * 4.4, S * 4.4); }
    // 漂う光の粒
    for (const m of motes) { ctx.fillStyle = `rgba(${pal.fog === "#8a7cc0" ? "200,180,255" : pal.fog === "#c07a98" ? "255,180,210" : "190,255,200"},${m.a * (0.6 + 0.4 * Math.sin(m.t * 2))})`; ctx.fillRect(X(m.x), Y(m.y), 2, 2); }
    ctx.globalCompositeOperation = "source-over";
    // 吹き出しは明かりの上に
    if (h.bubble && !ui.night) drawBubble(ctx, h, X(h.x), Y(h.y), S);
    // 置き場所の見本
    if (ui.hover && ui.card) {
      const cx = X(Math.floor(ui.hover.x) + 0.5), cy = Y(Math.floor(ui.hover.y) + 0.5);
      const okp = G.Field.canPlace(w, ui.card, ui.hover.x, ui.hover.y, ui.night) === "ok";
      ctx.strokeStyle = okp ? "#8fffb0" : "#ff6a6a"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.strokeRect(cx - S / 2, cy - S / 2, S, S); ctx.setLineDash([]);
    }
  }

  function drawStairsUp(ctx, x, y, S) {
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x - S * 0.45, y - S * 0.45, S * 0.9, S * 0.9);
    ctx.strokeStyle = "#8fc0ff"; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - S * 0.35, y - S * 0.25 + i * S * 0.22); ctx.lineTo(x + S * 0.35, y - S * 0.25 + i * S * 0.22); ctx.stroke(); }
  }
  function drawPortal(ctx, x, y, S, t) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, S * 0.7);
    g.addColorStop(0, "rgba(255,240,255,0.95)"); g.addColorStop(0.6, "rgba(200,140,255,0.55)"); g.addColorStop(1, "rgba(200,140,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, S * (0.62 + Math.sin(t * 3) * 0.05), 0, 7); ctx.fill();
  }
  function drawChest(ctx, x, y, S, open) {
    const im = img("assets/env/" + (open ? "chest_open.webp" : "chest_closed.webp"));
    if (ok(im)) { const k = S * 0.95 / im.naturalWidth; ctx.drawImage(im, x - S * 0.475, y + S * 0.35 - im.naturalHeight * k, S * 0.95, im.naturalHeight * k); return; }
    ctx.fillStyle = open ? "#5a3a22" : "#8a5a2e"; ctx.fillRect(x - S * 0.32, y - S * 0.18, S * 0.64, S * 0.4);
  }

  function drawMonster(ctx, w, m, x, y, S) {
    const d = m.d, h = w.run.h, sz = Math.max(0.9, d.r * 2.4) * S;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x, y + S * 0.28, sz * 0.36, sz * 0.12, 0, 0, 7); ctx.fill();
    if (d.chest && m.hidden) { drawChest(ctx, x, y, S, false); return; }
    // 構え（攻撃の予兆）
    if (m.cast) {
      const k = 1 - m.cast.t / Math.max(0.2, m.cast.total);
      ctx.strokeStyle = "rgba(255,80,110,0.85)"; ctx.lineWidth = 3;
      if (m.cast.kind === "shot" || m.cast.kind === "pounce") {
        const a = U.angle(m.x, m.y, m.cast.tx, m.cast.ty), len = (m.cast.kind === "pounce" ? 2.6 : d.atk.range) * S;
        ctx.globalAlpha = 0.25 + k * 0.5; ctx.lineWidth = S * (m.cast.kind === "pounce" ? 0.7 : 0.35);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke(); ctx.globalAlpha = 1;
      } else { ctx.beginPath(); ctx.arc(x, y, ((m.cast.kind === "grab2" ? d.atk.alsoGrab : d.atk.range) || 1) * S * k, 0, 7); ctx.stroke(); }
    }
    if (d.atk.kind === "aura" || d.atk.kind === "drain") {
      ctx.fillStyle = d.atk.kind === "drain" ? "rgba(90,220,210,0.08)" : "rgba(255,130,190,0.08)";
      ctx.beginPath(); ctx.arc(x, y, d.atk.range * S, 0, 7); ctx.fill();
    }
    // 動きの味付け
    let dx = 0, dy = 0, sx = 1, sy = 1, sk = 0;
    if (m.hop > 0) { const u = 1 - m.hop / 0.32; dy -= Math.sin(u * Math.PI) * S * 0.28; sy *= 1 + 0.12 * Math.sin(u * Math.PI); sx *= 1 - 0.08 * Math.sin(u * Math.PI); }
    if (m.rcl > 0) { const u = 1 - m.rcl / 0.26, k = Math.sin(Math.min(1, u * 1.6) * Math.PI); dx += m.rclX * S * 0.3 * k; sx *= 1 + 0.12 * k; sy *= 1 - 0.14 * k; }
    if (m.cast) { const u = 1 - Math.max(0, m.cast.t) / m.cast.total, a = U.angle(m.x, m.y, h.x, h.y); dx -= Math.cos(a) * S * 0.15 * u; dy -= Math.sin(a) * S * 0.08 * u; }
    if (m.lunge > 0) { const u = 1 - m.lunge / 0.22, k = Math.sin(u * Math.PI); dx += Math.cos(m.lungeA) * S * 0.45 * k; dy += Math.sin(m.lungeA) * S * 0.25 * k; }
    if (Math.hypot(m.vx || 0, m.vy || 0) > 0.2) sk = U.clamp((m.vx || 0) / 6, -0.12, 0.12);
    const bob = d.behavior === "float" ? Math.sin(w.t * 3 + m.id) * S * 0.08 : 0;
    const im = img("assets/monsters/" + d.art);
    ctx.save();
    ctx.globalAlpha = m.hidden ? 0.4 : 1;
    ctx.translate(x + dx, y + S * 0.3 + dy + bob); ctx.transform(1, 0, -sk, 1, 0, 0); ctx.scale(sx, sy);
    if (ok(im)) {
      const k = sz / Math.max(im.naturalWidth, im.naturalHeight), iw = im.naturalWidth * k, ih = im.naturalHeight * k;
      ctx.drawImage(im, -iw / 2, -ih, iw, ih);
      if (m.flash > 0) { ctx.globalAlpha = 0.55; ctx.globalCompositeOperation = "lighter"; ctx.drawImage(im, -iw / 2, -ih, iw, ih); ctx.globalCompositeOperation = "source-over"; }
    } else { ctx.fillStyle = TYPE_COLOR[d.type]; ctx.beginPath(); ctx.arc(0, -sz * 0.4, sz * 0.4, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.fillStyle = TYPE_COLOR[d.type]; ctx.beginPath(); ctx.arc(x - sz * 0.42, y - sz * 0.62, S * 0.1, 0, 7); ctx.fill();
    if (m.boss) { ctx.fillStyle = "#f2d27a"; ctx.font = `bold ${Math.round(S * 0.34)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("長", x, y - sz * 0.95); }
    if (m.hp < m.maxHp) { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - S * 0.4, y + S * 0.38, S * 0.8, 4); ctx.fillStyle = "#ff9ab8"; ctx.fillRect(x - S * 0.4, y + S * 0.38, S * 0.8 * m.hp / m.maxHp, 4); }
    if (m.summoned) { ctx.strokeStyle = "rgba(255,120,190,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y + S * 0.28, sz * 0.38, 0, 7); ctx.stroke(); }
  }

  function drawHikari(ctx, w, x, y, S) {
    const h = w.run.h;
    const im = img(`assets/hikari/hikari_${h.form}_${U.dirName(h.a)}_1.png`);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x, y + S * 0.3, S * 0.4, S * 0.14, 0, 0, 7); ctx.fill();
    if (h.bound) { ctx.strokeStyle = "rgba(255,110,170,0.85)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - S * 0.4, S * 0.55, 0, 7); ctx.stroke(); }
    if (h.cast) {                                   // 詠唱の光
      const g = ctx.createRadialGradient(x, y - S * 0.6, 0, x, y - S * 0.6, S * (h.cast.kind === "transform" ? 1.4 : 0.9));
      g.addColorStop(0, "rgba(255,240,200,0.55)"); g.addColorStop(1, "rgba(255,200,240,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - S * 0.6, S * 1.4, 0, 7); ctx.fill();
    }
    const H = S * 1.9;
    // 傾き：進む方へ少し、急に止まった時は少しのけぞる。打たれた時は押される
    const sp = G.HIKARI.spd[h.form], lx = U.clamp((h.vx || 0) / sp, -1, 1);
    h._lean = (h._lean || 0) + (lx * 0.07 - (h.brakeT > 0 ? Math.sign(h._leanDir || 0) * 0.09 * h.brakeT / 0.18 : 0) - (h._lean || 0)) * 0.2;
    if (Math.abs(lx) > 0.2) h._leanDir = Math.sign(lx);
    const shake = h.bound ? Math.sin(w.t * 30) * S * 0.04 : 0;
    ctx.save();
    ctx.translate(x + shake, y + S * 0.35);
    ctx.rotate(h._lean || 0);
    if (ok(im)) { const k = H / im.naturalHeight, iw = im.naturalWidth * k; ctx.drawImage(im, -iw / 2, -H, iw, H); }   // 縦横比はそのまま
    else { ctx.fillStyle = "#ffd0e8"; ctx.fillRect(-S * 0.3, -S * 1.3, S * 0.6, S * 1.3); }
    ctx.restore();
    if (h.trance > 0) { ctx.strokeStyle = "rgba(190,150,255,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - H + S * 0.2, S * 0.25, w.t * 5, w.t * 5 + 4.5); ctx.stroke(); }
    if (h.arousal > 40) { ctx.fillStyle = `rgba(255,120,170,${Math.min(0.9, h.arousal / 110)})`; ctx.font = `${Math.round(S * 0.35)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("♡", x + S * 0.45, y - H + S * 0.3 + Math.sin(w.t * 4) * 3); }
    if (h.bound) { const b = h.bound; ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - S * 0.5, y + S * 0.45, S, 5); ctx.fillStyle = "#fff0a0"; ctx.fillRect(x - S * 0.5, y + S * 0.45, S * Math.min(1, b.struggle), 5); }
    if (h.cast && h.cast.kind === "transform") { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - S * 0.5, y + S * 0.45, S, 5); ctx.fillStyle = "#ffd6f0"; ctx.fillRect(x - S * 0.5, y + S * 0.45, S * (1 - h.cast.t / G.HIKARI.transformCast), 5); }
  }
  function drawBubble(ctx, h, x, y, S) {
    const H = S * 1.9, t = h.bubble.text;
    ctx.font = `${Math.max(11, Math.round(S * 0.34))}px "Noto Sans JP",sans-serif`;
    const tw = Math.min(ctx.measureText(t).width, S * 7);
    const bx = x - tw / 2 - 8, by = y - H - S * 0.55;
    ctx.globalAlpha = Math.min(1, h.bubble.t * 2);
    ctx.fillStyle = "rgba(255,255,255,0.93)"; roundRect(ctx, bx, by - S * 0.3, tw + 16, S * 0.62, 8); ctx.fill();
    ctx.fillStyle = "#402038"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, by + 1, S * 7);
    ctx.globalAlpha = 1;
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  G.Render = { draw, preload, img, TYPE_COLOR };
})();
