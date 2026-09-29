/* render.js — 潜行の画面を canvas に描く（world を読むだけで、中身は変えない） */
var G = (typeof G !== "undefined") ? G : {};
(function () {
  "use strict";
  const U = G.U;
  const IMG = {};
  function img(src) {
    if (!IMG[src]) { const i = new Image(); i.src = src; IMG[src] = i; }
    return IMG[src];
  }
  function preload() {
    for (const k in G.MONSTERS) img("assets/monsters/" + G.MONSTERS[k].art);
    for (const f of ["civilian", "magica"]) for (const d of ["front", "back", "left", "right"]) img(`assets/hikari/hikari_${f}_${d}_1.png`);
  }
  const ok = i => i && i.complete && i.naturalWidth > 0;

  const TRAP_ICON = { bell: "鈴", mirror: "鏡", decoy: "燭", glue: "粘", vent: "香", urn: "甕", vine: "蔦", rope: "縄", shrine: "祠", basin: "水" };
  const TYPE_COLOR = { "惑": "#b48cff", "蕩": "#ff7fb0", "絡": "#6fc2ff", "削": "#63e0d6" };

  // cam: {x, y, scale}（scale＝1マスの画素数）
  function draw(ctx, w, cam, ui) {
    const cv = ctx.canvas, S = cam.scale, pal = w.dg.pal, map = w.map, h = w.run.h;
    const X = x => (x - cam.x) * S + cv.width / 2, Y = y => (y - cam.y) * S + cv.height / 2;
    ctx.fillStyle = pal.wall; ctx.fillRect(0, 0, cv.width, cv.height);
    // 床と壁
    const x0 = Math.max(0, Math.floor(cam.x - cv.width / 2 / S) - 1), x1 = Math.min(map.W, Math.ceil(cam.x + cv.width / 2 / S) + 1);
    const y0 = Math.max(0, Math.floor(cam.y - cv.height / 2 / S) - 1), y1 = Math.min(map.H, Math.ceil(cam.y + cv.height / 2 / S) + 1);
    for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
      const t = map.t[ty * map.W + tx];
      if (t === 1) {
        if (ty + 1 < map.H && map.t[(ty + 1) * map.W + tx] !== 1) { ctx.fillStyle = pal.edge; ctx.fillRect(X(tx), Y(ty + 0.72), S + 1, S * 0.28 + 1); }
        continue;
      }
      ctx.fillStyle = (tx + ty) % 2 ? pal.floor : pal.floor2;
      ctx.fillRect(X(tx), Y(ty), S + 1, S + 1);
      if (t === 2) {
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(X(tx + 0.55), Y(ty + 0.85), S * 0.45, S * 0.18, 0, 0, 7); ctx.fill();
        ctx.fillStyle = pal.edge; ctx.fillRect(X(tx + 0.15), Y(ty - 0.35), S * 0.7, S * 1.15);
        ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(X(tx + 0.15), Y(ty - 0.35), S * 0.18, S * 1.15);
        ctx.fillStyle = pal.wall; ctx.fillRect(X(tx + 0.1), Y(ty - 0.45), S * 0.8, S * 0.18);
      }
    }
    // ひかりが見ていない所を少し暗く（ひかりの知らない場所）
    if (!ui.night) {
      ctx.fillStyle = "rgba(8,6,14,0.28)";
      for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) if (map.t[ty * map.W + tx] !== 1 && !map.seen[ty * map.W + tx]) ctx.fillRect(X(tx), Y(ty), S + 1, S + 1);
    }
    // 階段・転移陣
    drawStairs(ctx, X(map.up.x), Y(map.up.y), S, "#8fc0ff", "上");
    if (map.last) drawPortal(ctx, X(map.down.x), Y(map.down.y), S, w.t);
    else drawStairs(ctx, X(map.down.x), Y(map.down.y), S, "#ff9ac8", "下");
    if (map.portal && !map.last) drawPortal(ctx, X(map.down.x + 0.9), Y(map.down.y), S * 0.6, w.t);
    // 宝箱
    for (const c of w.chests) drawChest(ctx, X(c.x), Y(c.y), S, c.open);
    // 罠（指揮者には全部見えている。ひかりが見つけた罠は縁取り）
    for (const tr of w.traps) {
      const cx = X(tr.x), cy = Y(tr.y);
      ctx.globalAlpha = tr.armed ? 0.9 : 0.35;
      if (tr.active > 0) { ctx.fillStyle = "rgba(255,150,200,0.18)"; ctx.beginPath(); ctx.arc(cx, cy, tr.d.radius * S, 0, 7); ctx.fill(); }
      ctx.fillStyle = "rgba(20,14,24,0.7)"; ctx.beginPath(); ctx.arc(cx, cy, S * 0.3, 0, 7); ctx.fill();
      ctx.strokeStyle = tr.found ? "#fff3a0" : TYPE_COLOR[tr.d.type]; ctx.lineWidth = tr.found ? 2.5 : 1.5; ctx.stroke();
      ctx.fillStyle = TYPE_COLOR[tr.d.type]; ctx.font = `bold ${Math.round(S * 0.32)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(TRAP_ICON[tr.kind] || "罠", cx, cy + 1);
      ctx.globalAlpha = 1;
    }
    // ひかりの視界
    if (!ui.night && !w.outcome) {
      const g = ctx.createRadialGradient(X(h.x), Y(h.y), 0, X(h.x), Y(h.y), 8 * S);
      g.addColorStop(0, "rgba(255,240,200,0.10)"); g.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X(h.x), Y(h.y)); ctx.arc(X(h.x), Y(h.y), 8 * S, h.a - 1.22, h.a + 1.22); ctx.closePath(); ctx.fill();
    }
    // 魔物とひかりを、奥（上）から順に描く
    const ents = w.monsters.filter(m => m.hp > 0).map(m => ({ y: m.y, m })).concat([{ y: h.y, h: true }]);
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.h ? drawHikari(ctx, w, X(h.x), Y(h.y), S, ui) : drawMonster(ctx, w, e.m, X(e.m.x), Y(e.m.y), S);
    // 弾
    for (const p of w.projs) {
      const c = p.owner === "h" ? "#fff3b0" : ({ mucus: "#ff9ad0", psy: "#c8a0ff", beam: "#e0b0ff", cold: "#9ff4ff" }[p.kind] || "#fff");
      ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Math.max(3, p.r * S), 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // 目眩ましの影
    if (h.decoy) { ctx.fillStyle = "rgba(40,20,60,0.55)"; ctx.beginPath(); ctx.ellipse(X(h.decoy.x), Y(h.decoy.y), S * 0.4, S * 0.6, 0, 0, 7); ctx.fill(); }
    // 効果
    for (const f of w.fx) {
      const k = f.t / f.life, cx = X(f.x), cy = Y(f.y);
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = ctx.fillStyle = f.color || "#fff";
      if (f.kind === "ring") { ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, S * (f.r || 0.9) * (0.4 + k), 0, 7); ctx.stroke(); }
      else if (f.kind === "burst") { ctx.beginPath(); ctx.arc(cx, cy, S * (f.r || 1.2) * (0.3 + k), 0, 7); ctx.fill(); }
      else if (f.kind === "hit" || f.kind === "pop") { ctx.beginPath(); ctx.arc(cx, cy, S * 0.3 * (1 + k), 0, 7); ctx.fill(); }
      else if (f.kind === "summon") { ctx.lineWidth = 2; for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.arc(cx, cy, S * (0.2 + r * 0.25) * (1 - k * 0.5), 0, 7); ctx.stroke(); } }
      ctx.globalAlpha = 1;
    }
    // 置き場所の見本
    if (ui.hover && ui.card) {
      const cx = X(Math.floor(ui.hover.x) + 0.5), cy = Y(Math.floor(ui.hover.y) + 0.5);
      const okp = G.Field.canPlace(w, ui.card, ui.hover.x, ui.hover.y, ui.night) === "ok";
      ctx.strokeStyle = okp ? "#8fffb0" : "#ff6a6a"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.strokeRect(cx - S / 2, cy - S / 2, S, S); ctx.setLineDash([]);
    }
  }

  function drawStairs(ctx, x, y, S, c, label) {
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x - S * 0.45, y - S * 0.45, S * 0.9, S * 0.9);
    ctx.strokeStyle = c; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - S * 0.35, y - S * 0.25 + i * S * 0.22); ctx.lineTo(x + S * 0.35, y - S * 0.25 + i * S * 0.22); ctx.stroke(); }
    ctx.fillStyle = c; ctx.font = `bold ${Math.round(S * 0.3)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText(label, x, y - S * 0.55);
  }
  function drawPortal(ctx, x, y, S, t) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, S * 0.6);
    g.addColorStop(0, "rgba(255,240,255,0.9)"); g.addColorStop(0.6, "rgba(200,140,255,0.5)"); g.addColorStop(1, "rgba(200,140,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, S * (0.55 + Math.sin(t * 3) * 0.05), 0, 7); ctx.fill();
  }
  function drawChest(ctx, x, y, S, open) {
    ctx.fillStyle = open ? "#5a3a22" : "#8a5a2e"; ctx.fillRect(x - S * 0.32, y - S * 0.18, S * 0.64, S * 0.4);
    ctx.fillStyle = open ? "#3a2616" : "#b07a3e"; ctx.fillRect(x - S * 0.34, y - S * 0.34, S * 0.68, S * 0.18);
    ctx.fillStyle = "#f0d070"; ctx.fillRect(x - S * 0.05, y - S * 0.12, S * 0.1, S * 0.12);
  }

  function drawMonster(ctx, w, m, x, y, S) {
    const d = m.d, sz = Math.max(0.9, d.r * 2.4) * S;
    ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(x, y + S * 0.28, sz * 0.36, sz * 0.12, 0, 0, 7); ctx.fill();
    if (d.chest && m.hidden) { drawChest(ctx, x, y, S, false); return; }
    // 構え（攻撃の予兆）
    if (m.windup > 0) {
      ctx.strokeStyle = "rgba(255,80,110,0.85)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, (d.atk.range || 1) * S * (1 - m.windup / Math.max(0.2, d.atk.windup || 1)), 0, 7); ctx.stroke();
    }
    if (d.atk.kind === "aura" || d.atk.kind === "drain") {
      ctx.fillStyle = d.atk.kind === "drain" ? "rgba(90,220,210,0.08)" : "rgba(255,130,190,0.08)";
      ctx.beginPath(); ctx.arc(x, y, d.atk.range * S, 0, 7); ctx.fill();
    }
    const im = img("assets/monsters/" + d.art);
    ctx.globalAlpha = m.hidden ? 0.4 : 1;
    const bob = d.behavior === "float" ? Math.sin(w.t * 3 + m.id) * S * 0.08 : 0;
    if (ok(im)) {
      const k = sz / Math.max(im.naturalWidth, im.naturalHeight);
      const iw = im.naturalWidth * k, ih = im.naturalHeight * k;
      ctx.drawImage(im, x - iw / 2, y + S * 0.3 - ih + bob, iw, ih);
    } else { ctx.fillStyle = TYPE_COLOR[d.type]; ctx.beginPath(); ctx.arc(x, y, sz * 0.4, 0, 7); ctx.fill(); }
    if (m.flash > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y - sz * 0.25, sz * 0.4, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    // 系統の印と体力
    ctx.fillStyle = TYPE_COLOR[d.type]; ctx.beginPath(); ctx.arc(x - sz * 0.42, y - sz * 0.62, S * 0.1, 0, 7); ctx.fill();
    if (m.hp < m.maxHp) { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - S * 0.4, y + S * 0.38, S * 0.8, 4); ctx.fillStyle = "#ff9ab8"; ctx.fillRect(x - S * 0.4, y + S * 0.38, S * 0.8 * m.hp / m.maxHp, 4); }
    if (m.summoned) { ctx.strokeStyle = "rgba(255,120,190,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y + S * 0.28, sz * 0.38, 0, 7); ctx.stroke(); }
  }

  function drawHikari(ctx, w, x, y, S, ui) {
    const h = w.run.h;
    const dir = U.dirName(h.a);
    const im = img(`assets/hikari/hikari_${h.form}_${dir}_1.png`);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x, y + S * 0.3, S * 0.4, S * 0.14, 0, 0, 7); ctx.fill();
    if (h.bound) { ctx.strokeStyle = "rgba(255,110,170,0.85)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - S * 0.4, S * 0.55, 0, 7); ctx.stroke(); }
    const H = S * 1.9;
    if (ok(im)) {
      const k = H / im.naturalHeight, iw = im.naturalWidth * k;    // 縦横比はそのまま
      const shake = h.bound ? Math.sin(w.t * 30) * S * 0.04 : 0;
      ctx.drawImage(im, x - iw / 2 + shake, y + S * 0.35 - H, iw, H);
    } else { ctx.fillStyle = "#ffd0e8"; ctx.fillRect(x - S * 0.3, y - S, S * 0.6, S * 1.3); }
    if (h.trance > 0) { ctx.strokeStyle = "rgba(190,150,255,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - H + S * 0.2, S * 0.25, w.t * 5, w.t * 5 + 4.5); ctx.stroke(); }
    if (h.arousal > 40) { ctx.fillStyle = `rgba(255,120,170,${Math.min(0.9, h.arousal / 110)})`; ctx.font = `${Math.round(S * 0.35)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("♡", x + S * 0.45, y - H + S * 0.3 + Math.sin(w.t * 4) * 3); }
    if (h.watched > 0) { ctx.fillStyle = "rgba(255,200,230,0.8)"; ctx.font = `${Math.round(S * 0.3)}px sans-serif`; ctx.fillText("👁", x - S * 0.5, y - H + S * 0.3); }
    if (h.bound) {
      const b = h.bound;
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - S * 0.5, y + S * 0.45, S, 5);
      ctx.fillStyle = "#fff0a0"; ctx.fillRect(x - S * 0.5, y + S * 0.45, S * Math.min(1, b.struggle), 5);
    }
    // 吹き出し
    if (h.bubble && !ui.night) {
      const t = h.bubble.text; ctx.font = `${Math.max(11, Math.round(S * 0.34))}px "Noto Sans JP",sans-serif`;
      const tw = Math.min(ctx.measureText(t).width, S * 7);
      const bx = x - tw / 2 - 8, by = y - H - S * 0.55;
      ctx.globalAlpha = Math.min(1, h.bubble.t * 2);
      ctx.fillStyle = "rgba(255,255,255,0.93)"; roundRect(ctx, bx, by - S * 0.3, tw + 16, S * 0.62, 8); ctx.fill();
      ctx.fillStyle = "#402038"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, by + 1, S * 7);
      ctx.globalAlpha = 1;
    }
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  G.Render = { draw, preload, img, TYPE_COLOR };
})();
