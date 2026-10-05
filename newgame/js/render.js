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
  // Generated light-magic silhouettes, rasterized once per orientation/size.
  // All combat effects share 24 source pixels per map tile, even when zoomed.
  const COMBAT_FX = ["staff-sweep", "staff-thrust", "star-bolt", "light-burst", "repel-ring", "hit-spark", "blade-slash", "blade-thrust", "blade-flight", "blade-spin", "blade-parry", "blade-iai"];
  const combatCache = new Map(), FX_DENSITY = 24, FX_CACHE_LIMIT = 256;
  function combatSprite(ctx, name, x, y, size, angle, frame, S, alpha, progress = 1) {
    const source = img("assets/fx/" + name + ".png");
    if (!ok(source)) return false; // Existing drawing remains usable while loading/on failure.
    const side = Math.max(8, Math.round(size * FX_DENSITY));
    const turn = ((Math.round((angle || 0) / (Math.PI * 2) * 32) % 32) + 32) % 32;
    const fill = Math.max(1, Math.min(8, Math.ceil(progress * 8)));
    const key = name + ":" + side + ":" + turn + ":" + frame + ":" + fill;
    let tile = combatCache.get(key);
    if (!tile) {
      tile = document.createElement("canvas");
      tile.width = tile.height = Math.ceil(side * 1.42) + 2;
      const c = tile.getContext("2d"); c.imageSmoothingEnabled = false;
      c.translate(tile.width / 2, tile.height / 2);
      if (fill < 8) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, tile.width, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill / 8); c.closePath(); c.clip(); }
      c.rotate(turn * Math.PI * 2 / 32);
      c.drawImage(source, frame * 64, 0, 64, 64, -side / 2, -side / 2, side, side);
      if (combatCache.size >= FX_CACHE_LIMIT) combatCache.delete(combatCache.keys().next().value);
      combatCache.set(key, tile);
    }
    const zoom = S / FX_DENSITY;
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha;
    ctx.drawImage(tile, Math.round(x - tile.width * zoom / 2), Math.round(y - tile.height * zoom / 2), tile.width * zoom, tile.height * zoom);
    ctx.restore(); return true;
  }
  function combatEffect(ctx, f, x, y, S) {
    if (!f.combatFx) return false;
    const k = Math.max(0, Math.min(1, f.t / f.life)), frame = Math.min(3, Math.floor(k * 4));
    let size, a = f.a || 0;
    if (f.combatFx === "staff-sweep") { size = 2.7; x -= Math.cos(a) * S * 0.7; y -= Math.sin(a) * S * 0.7; }
    else if (f.combatFx === "staff-thrust") { size = 2.05; x += Math.cos(a) * S * 0.18; y += Math.sin(a) * S * 0.18; }
    else if (f.combatFx === "blade-slash") { size = (f.reach || 1.55) * 2; x -= Math.cos(a) * S * 0.7; y -= Math.sin(a) * S * 0.7; }
    else if (f.combatFx === "blade-thrust") { size = (f.reach || 1.9) * 1.2; x += Math.cos(a) * S * 0.16; y += Math.sin(a) * S * 0.16; }
    else if (f.combatFx === "blade-iai") size = f.reach ? f.reach * 1.7 : 1.4;
    else if (f.combatFx === "blade-parry" || f.combatFx === "hit-spark") size = 0.85;
    else size = (f.r || 1.2) * 2; // Radius never exceeds the actual affected area.
    return combatSprite(ctx, f.combatFx, x, y, size, a, frame, S, (1 - k) * (f.combatFx === "light-burst" ? 0.8 : 1));
  }
  function preload() {
    for (const name of COMBAT_FX) img("assets/fx/" + name + ".png");
    for (const k in G.MONSTERS) img("assets/monsters/" + G.MONSTERS[k].art);
    for (const k in G.TRAPS) img(trapArt(k));
    for (const d of ["front", "back", "left", "right"]) {
      for (const f of ["civilian", "magica"]) for (const v of ["", "vessel_", "pray_", "tongue_"]) img(`assets/hikari/hikari_${v}${f}_${d}_1.png`);
      img(`assets/haruka/haruka_${d}_1.png`);
    }
    for (const k in G.DUNGEONS) img(`assets/env/floor_${k}.png`);
    for (const skin of Object.values(G.ROOM_SKINS || {})) { img(skin.floor); img(skin.deco); }
    for (const n of ["dungeon.png", "chest_closed.webp", "chest_open.webp", "stairs_open.webp", "pool.webp"]) img("assets/env/" + n);
  }
  // 罠の絵：淫糸の巣と囁きの塔は Game4 の絵（PNG）、ほかは tools/make_art.py の SVG
  // 罠の絵：data.js の art（例 "bell.png"）があればそれ、無ければ <id>.svg
  function trapArt(k) { const d = G.TRAPS[k]; return "assets/traps/" + (d && d.art || k + ".svg"); }
  const TRAP_ICON = { bell: "鈴", mirror: "鏡", decoy: "燭", glue: "粘", vent: "香", urn: "甕", vine: "蔦", rope: "縄", shrine: "祠", basin: "水", pillory: "晒", tease: "焦", belt: "帯",
                      gate: "門", cuffs: "環", bed: "褥", spring: "湯", slime_drop: "落", bud: "蕾", root: "根", cocoon: "繭", ratchet: "枠", altar: "紋", shadow: "影", tower: "塔" };
  const TYPE_COLOR = { "惑": "#b48cff", "蕩": "#ff7fb0", "絡": "#6fc2ff", "削": "#63e0d6" };
  const hash = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + (k || 0) * 2246822519) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return (h ^ (h >>> 16)) >>> 0; };

  const roomSkin = r => r && G.ROOM_SKINS && G.ROOM_SKINS[r.T.skin];
  const insideRoom = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  function roomTile(ctx, skin, tx, ty, x, y, S, seed, prefix = "") {
    const im = img(prefix + skin.floor); if (!ok(im)) return false;
    const hv = hash(tx, ty, seed), col = hv % 100 < 5 ? 3 : hv % 3, row = (hv >>> 4) % 2;
    ctx.drawImage(im, col * 64, row * 64, 64, 64, x, y, S + 1, S + 1);
    ctx.fillStyle = "rgba(10,8,16,0.28)"; ctx.fillRect(x, y, S + 1, S + 1);
    return true;
  }
  // floor/wall判定と可視範囲を受け取る。同じ描画を素材一覧でも使う。
  // activeとfillは読むだけ。配置には座標ハッシュだけを使いG.Uに触れない。
  /* 触手を一本、手続きで描く。根元(bx,by)から角度 a の向きへ len（マス）。
   * 体は先へ細る帯。うねりは時間と位相で、curl で先が巻き、lean で先が寄る（獲物の方へ）。
   * 縁は暗く、背に艶、腹に吸盤。 */
  const TCS = [
    { rim: "#3a1424", body: "#9c4466", body2: "#c8648a", hi: "rgba(255,214,232,0.75)", sucker: "#f2b6cf", suckerIn: "#7a2c4a", wet: "rgba(255,240,248,0.55)" },
    { rim: "#2e0f1e", body: "#86385a", body2: "#b0507a", hi: "rgba(255,200,222,0.6)", sucker: "#e4a0bc", suckerIn: "#6a2440", wet: "rgba(255,240,248,0.5)" },
    { rim: "#40182c", body: "#a8506e", body2: "#d87a98", hi: "rgba(255,226,238,0.8)", sucker: "#f6c4d6", suckerIn: "#86344f", wet: "rgba(255,240,248,0.6)" },
  ];
  let TC = TCS[0];
  const stats = { tentacles: 0 };              // 検査用：描いた触手の本数（tools/rooms.js が数える）
  function tentacle(ctx, bx, by, a, len, wd, t, ph, curl, sp, lean) {
    TC = TCS[Math.floor(ph * 10) % 3]; stats.tentacles++;
    const N = 11, L = [], R = [], C = [];
    let x = bx, y = by, ang = a;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const wig = Math.sin(t * sp * 2.1 + ph + s * 4.2) * 0.55 * s + Math.sin(t * sp * 1.3 + ph * 1.7 + s * 2.3) * 0.25 * s;
      const dir = ang + wig + curl * s * s * 2.2 + (lean || 0) * s;
      const w = wd * (1 - s * 0.86) * (1 + 0.08 * Math.sin(t * sp * 3 + ph + s * 9));
      C.push([x, y, dir, w]);
      const nx = Math.cos(dir + Math.PI / 2), ny = Math.sin(dir + Math.PI / 2);
      L.push([x + nx * w, y + ny * w]); R.push([x - nx * w, y - ny * w]);
      x += Math.cos(dir) * len / N; y += Math.sin(dir) * len / N;
    }
    const path = (o) => { ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (const p of L) ctx.lineTo(p[0] + o, p[1] + o); const tip = C[N]; ctx.lineTo(tip[0], tip[1]); for (let i = N; i >= 0; i--) ctx.lineTo(R[i][0] + o, R[i][1] + o); ctx.closePath(); };
    ctx.fillStyle = "rgba(0,0,0,0.28)"; path(wd * 0.35); ctx.fill();           // 影
    ctx.fillStyle = TC.rim; path(0); ctx.fill();
    ctx.save(); ctx.translate(0, 0);
    const g = ctx.createLinearGradient(bx, by, C[N][0], C[N][1]); g.addColorStop(0, TC.body); g.addColorStop(1, TC.body2);
    ctx.fillStyle = g; ctx.beginPath();                                          // 体（縁より一回り内側）
    ctx.moveTo(C[0][0], C[0][1]);
    for (let i = 0; i <= N; i++) { const [cx, cy, d, w] = C[i]; ctx.lineTo(cx + Math.cos(d + Math.PI / 2) * w * 0.78, cy + Math.sin(d + Math.PI / 2) * w * 0.78); }
    for (let i = N; i >= 0; i--) { const [cx, cy, d, w] = C[i]; ctx.lineTo(cx - Math.cos(d + Math.PI / 2) * w * 0.78, cy - Math.sin(d + Math.PI / 2) * w * 0.78); }
    ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.strokeStyle = TC.hi; ctx.lineWidth = Math.max(1, wd * 0.22); ctx.lineCap = "round"; ctx.beginPath();   // 背の艶
    for (let i = 1; i < N - 1; i++) { const [cx, cy, d, w] = C[i]; const px = cx + Math.cos(d + Math.PI / 2) * w * 0.42, py = cy + Math.sin(d + Math.PI / 2) * w * 0.42; i === 1 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
    ctx.stroke();
    for (let i = 2; i < N - 2; i += 2) {                                          // 腹の吸盤
      const [cx, cy, d, w] = C[i], px = cx - Math.cos(d + Math.PI / 2) * w * 0.5, py = cy - Math.sin(d + Math.PI / 2) * w * 0.5, r = Math.max(0.8, w * 0.3);
      ctx.fillStyle = TC.sucker; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
      ctx.fillStyle = TC.suckerIn; ctx.beginPath(); ctx.arc(px, py, r * 0.5, 0, 7); ctx.fill();
    }
    const [tx, ty] = C[N - 2];                                                    // 先の滴
    const drip = (t * sp * 0.7 + ph) % 3;
    if (drip < 1) { ctx.fillStyle = TC.wet; ctx.beginPath(); ctx.arc(tx, ty + drip * wd * 2.2, Math.max(1, wd * 0.18), 0, 7); ctx.fill(); }
  }
  // 触手の部屋：壁から生え、床の穴から束で伸びる。満ちるほど（fill）数も長さも増え、踏み込むと（active）速く、獲物の方へ寄る
  // 本番の画面では、部屋ごとの別キャンバスに秒15回だけ描き直して貼る（毎フレーム全部を描くと、スマホで重い）
  function tentacleRoomCached(ctx, r, t, S, X, Y, bounds, tile, target) {
    const pad = 1.6, cw = Math.ceil((r.w + pad * 2) * S), ch = Math.ceil((r.h + pad * 2) * S);
    const c = r._tc || (r._tc = { cv: typeof document !== "undefined" ? document.createElement("canvas") : null, t: -9, S: 0, key: "" });
    if (!c.cv) return tentacleRoom(ctx, r, t, S, X, Y, bounds, tile, target);
    const key = (r.active ? 1 : 0) + ":" + Math.round((r.fill || 0) * 40);   // 満ちていく間も、描き直しは刻みごと
    if (c.S !== S || c.key !== key || t - c.t > 1 / 15 || t < c.t) {
      if (c.cv.width !== cw || c.cv.height !== ch) { c.cv.width = cw; c.cv.height = ch; }
      const cx = c.cv.getContext("2d"); cx.clearRect(0, 0, cw, ch); cx.imageSmoothingEnabled = false;
      const Xl = x => (x - r.x + pad) * S, Yl = y => (y - r.y + pad) * S;
      tentacleRoom(cx, r, t, S, Xl, Yl, [r.x - 1, r.y - 1, r.x + r.w + 1, r.y + r.h + 1], tile, target);
      c.S = S; c.t = t; c.key = key;
    }
    if (c.cv.width > 0 && c.cv.height > 0) ctx.drawImage(c.cv, X(r.x - pad), Y(r.y - pad));   // 画面が畳まれた瞬間（幅0）は描かない
  }
  function tentacleRoom(ctx, r, t, S, X, Y, bounds, tile, target0) {
    const target = target0 && { x: X(target0.x) / S, y: Y(target0.y) / S };
    const fill = Number.isFinite(r.fill) ? Math.max(0, Math.min(1, r.fill)) : 0;
    const sp = r.active ? 1.9 : 0.8, reach = (r.active ? 1.25 : 1) * (1 + fill * 0.9);
    const [x0, y0, x1, y1] = bounds;
    const leanTo = (bx, by, a) => { if (!r.active || !target) return 0; const want = Math.atan2(target.y - by, target.x - bx); let d = want - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return Math.max(-0.9, Math.min(0.9, d)) * 0.7; };
    ctx.save(); ctx.beginPath(); ctx.rect(X(r.x) - S * 0.3, Y(r.y) - S * 0.3, r.w * S + S * 0.6, r.h * S + S * 0.6); ctx.clip();
    // 床の穴と、そこから伸びる束
    for (let y = Math.max(y0, r.y); y < Math.min(y1, r.y + r.h); y++) for (let x = Math.max(x0, r.x); x < Math.min(x1, r.x + r.w); x++) {
      if (tile(x, y) !== 0) continue;
      const hv = hash(x, y, 91);
      if (hv % 1000 / 1000 >= 0.3 + fill * 0.55 + (r.active ? 0.08 : 0)) continue;
      const hx = X(x + 0.3 + ((hv >>> 6) % 40) / 100), hy = Y(y + 0.45 + ((hv >>> 11) % 40) / 100);
      ctx.fillStyle = "rgba(20,4,12,0.85)"; ctx.beginPath(); ctx.ellipse(hx, hy, S * 0.3, S * 0.13, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(200,90,130,0.6)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(hx, hy, S * 0.31, S * 0.14, 0, Math.PI, 0); ctx.stroke();
      const n = 3 + (hv >>> 15) % 3 + Math.round(fill * 3);
      for (let k = 0; k < n; k++) {
        const ph = (hv >>> (k * 3)) % 628 / 100, a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.42 + Math.sin(ph) * 0.2;
        const bx = hx + (k - (n - 1) / 2) * S * 0.09, by = hy;
        tentacle(ctx, bx, by, a, S * (0.7 + ((hv >>> (k + 4)) % 60) / 100) * reach, S * 0.13, t, ph, (k % 2 ? 1 : -1) * 0.5, sp, leanTo(bx / S, by / S, a));
      }
    }
    // 壁から生える触手
    for (let y = Math.max(y0, r.y - 1); y < Math.min(y1, r.y + r.h + 1); y++) for (let x = Math.max(x0, r.x - 1); x < Math.min(x1, r.x + r.w + 1); x++) {
      if (tile(x, y) !== 1) continue;
      const side = [[0, 1], [0, -1], [1, 0], [-1, 0]].find(([dx, dy]) => insideRoom(r, x + dx, y + dy) && tile(x + dx, y + dy) !== 1);
      if (!side) continue;
      const hv = hash(x, y, 73);
      if (hv % 100 >= 75 + fill * 25) continue;
      const [dx, dy] = side, a = Math.atan2(dy, dx), n = 2 + (hv >>> 9) % 2 + Math.round(fill * 2);
      for (let k = 0; k < n; k++) {
        const off = ((hv >>> (k * 4)) % 80) / 100 - 0.4, ph = (hv >>> (k * 5 + 2)) % 628 / 100;
        const bx = X(x + 0.5 + dx * 0.5 + (dy ? off : 0)), by = Y(y + 0.5 + dy * 0.5 + (dx ? off : 0));
        if (k === 0) { const mx = X(x + 0.5 + dx * 0.5), my = Y(y + 0.5 + dy * 0.5); ctx.fillStyle = "#4a1a2e"; ctx.beginPath(); ctx.ellipse(mx, my, S * (dy ? 0.55 : 0.22), S * (dx ? 0.55 : 0.22), 0, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(200,96,140,0.5)"; ctx.beginPath(); ctx.ellipse(mx, my, S * (dy ? 0.42 : 0.14), S * (dx ? 0.42 : 0.14), 0, 0, 7); ctx.fill(); }   // 壁の付け根の肉
        tentacle(ctx, bx, by, a + Math.sin(ph) * 0.35, S * (0.9 + ((hv >>> (k + 7)) % 70) / 100) * reach, S * 0.17, t, ph, (k % 2 ? 1 : -1) * 0.7, sp, leanTo(bx / S, by / S, a));
      }
    }
    ctx.globalAlpha = 0.05 + fill * 0.05 + (r.active ? 0.03 : 0);
    ctx.fillStyle = "#c86a92"; ctx.fillRect(X(r.x), Y(r.y), r.w * S, r.h * S);
    ctx.restore();
  }
  function roomDecor(ctx, r, skin, t, S, X, Y, bounds, tile, prefix = "", target, cache) {
    if (skin.proc === "tentacle") return (cache ? tentacleRoomCached : tentacleRoom)(ctx, r, t, S, X, Y, bounds, tile, target);
    const im = img(prefix + skin.deco); if (!ok(im)) return;
    const fill = Number.isFinite(r.fill) ? Math.max(0, Math.min(1, r.fill)) : 0;
    const speed = skin.speed * (r.active ? 1.9 : 1), size = 1 + fill * 0.35 + (r.active ? 0.12 : 0);
    const [x0, y0, x1, y1] = bounds, density = Math.min(1, skin.density + fill * 0.55);
    function sprite(index, x, y, phase, scale, angle = 0) {
      const sway = Math.sin(t * speed + phase) * 0.055;
      ctx.save(); ctx.translate(X(x), Y(y)); ctx.rotate(angle + sway);
      ctx.drawImage(im, index * 64, 0, 64, 64, -S * scale / 2, -S * scale, S * scale, S * scale);
      ctx.restore();
    }
    // 部屋内だけに描く。fill=1でも隣の通路へはみ出さない。
    ctx.save(); ctx.beginPath(); ctx.rect(X(r.x), Y(r.y), r.w * S, r.h * S); ctx.clip();
    for (let y = Math.max(y0, r.y); y < Math.min(y1, r.y + r.h); y++) for (let x = Math.max(x0, r.x); x < Math.min(x1, r.x + r.w); x++) {
      if (tile(x, y) !== 0) continue;
      const hv = hash(x, y, 53);
      if (hv % 1000 / 1000 >= density) continue;
      const type = skin.scatter[(hv >>> 12) % skin.scatter.length];
      sprite(type, x + 0.35 + ((hv >>> 8) % 30) / 100, y + 0.9, hv % 37, size * 0.78);
    }
    // 薄い部屋色の霧。部屋内の範囲に限定する。
    ctx.globalAlpha = 0.035 + fill * 0.025 + (r.active ? 0.015 : 0);
    ctx.fillStyle = skin.fog; ctx.fillRect(X(r.x), Y(r.y), r.w * S, r.h * S);
    ctx.restore();
    for (let y = Math.max(y0, r.y - 1); y < Math.min(y1, r.y + r.h + 1); y++) for (let x = Math.max(x0, r.x - 1); x < Math.min(x1, r.x + r.w + 1); x++) {
      if (tile(x, y) !== 1) continue;
      const side = [[0, 1, Math.PI], [0, -1, 0], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]].find(([dx, dy]) => insideRoom(r, x + dx, y + dy) && tile(x + dx, y + dy) !== 1);
      if (!side) continue;
      const [dx, dy, angle] = side;
      sprite(skin.wall, x + 0.5 + dx * 0.1, y + 0.5 + dy * 0.1, hash(x, y, 71) % 37, size * 0.72, angle);
    }
  }
  function roomPreview(ctx, key, active, fill, t, prefix = "") {
    const skin = G.ROOM_SKINS[key], S = ctx.canvas.width / 9;
    const r = {x:1, y:1, w:7, h:5, T:{skin:key}, active, fill};
    const X = x => x * S, Y = y => y * S, tile = (x, y) => insideRoom(r, x, y) ? 0 : 1;
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = skin.wallTop; ctx.fillRect(0, 0, S * 9, S * 7);
    for (let y = 1; y < 6; y++) for (let x = 1; x < 8; x++) {
      roomTile(ctx, skin, x, y, X(x), Y(y), S, 1, prefix);
      ctx.fillStyle = skin.overlay; ctx.fillRect(X(x), Y(y), S + 1, S + 1);
    }
    roomDecor(ctx, r, skin, t, S, X, Y, [0, 0, 9, 7], tile, prefix);
  }

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
  // 漂う粒の色：霧の色を白に寄せたもの（ダンジョンごと）
  const MOTE = { "#8a7cc0": "200,180,255", "#c07a98": "255,180,210", "#7a90c0": "170,200,255", "#7ab08a": "190,255,200" };
  function moteRGB(fog) {
    if (MOTE[fog]) return MOTE[fog];
    const n = parseInt(fog.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * 0.5));
    return (MOTE[fog] = c.join(","));
  }
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
    const rooms = (w.trapRooms || []).filter(r => r.x - 1 < x1 && r.x + r.w + 1 > x0 && r.y - 1 < y1 && r.y + r.h + 1 > y0);
    const trapRoom = (tx, ty) => rooms.find(r => insideRoom(r, tx, ty));
    const wallRoom = (tx, ty) => rooms.find(r => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => insideRoom(r, tx + dx, ty + dy) && map.t[(ty + dy) * map.W + tx + dx] !== 1));
    // 床
    for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
      const t = map.t[ty * map.W + tx];
      if (t === 1) continue;
      const room = trapRoom(tx, ty), skin = roomSkin(room);
      if (skin && roomTile(ctx, skin, tx, ty, X(tx), Y(ty), S, w.floorNo)) {
        // スキンの読み込み中だけ既存床へフォールバックする。
      } else if (ok(floorIm)) {
        const hv = hash(tx, ty, w.floorNo), col = hv % 100 < 5 ? 3 : hv % 3, row = (hv >> 4) % 2;
        ctx.drawImage(floorIm, col * 64, row * 64, 64, 64, X(tx), Y(ty), S + 1, S + 1);
        ctx.fillStyle = "rgba(10,8,16,0.28)"; ctx.fillRect(X(tx), Y(ty), S + 1, S + 1);
      } else { ctx.fillStyle = (tx + ty) % 2 ? pal.floor : pal.floor2; ctx.fillRect(X(tx), Y(ty), S + 1, S + 1); }
      if (room) { ctx.fillStyle = skin ? skin.overlay : "rgba(160,40,80,0.10)"; ctx.fillRect(X(tx), Y(ty), S + 1, S + 1); }
    }
    // 壁：上面は石積み（床より明るい灰）で塗り、床との境に縁を引く。床に面した壁は、正面（壁の顔）も描く
    for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
      if (map.t[ty * map.W + tx] !== 1) continue;
      const nearFloor = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => { const nx = tx + dx, ny = ty + dy; return nx >= 0 && ny >= 0 && nx < map.W && ny < map.H && map.t[ny * map.W + nx] !== 1; });
      if (!nearFloor) continue;
      const skin = roomSkin(wallRoom(tx, ty));
      ctx.fillStyle = skin ? skin.wallTop : pal.wallTop || "#5a5264"; ctx.fillRect(X(tx), Y(ty), S + 1, S + 1);
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      const off = (ty % 2) * 0.5;
      for (let k = 0; k < 2; k++) { ctx.fillRect(X(tx), Y(ty + k * 0.5), S + 1, 1.5); ctx.fillRect(X(tx + ((k * 0.5 + off) % 1)), Y(ty + k * 0.5), 1.5, S * 0.5); }
      ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(X(tx), Y(ty), S + 1, 2);
      for (const [dx, dy, x, y, w_, h_] of [[1, 0, 1, 0, 0, 1], [-1, 0, 0, 0, 0, 1], [0, 1, 0, 1, 1, 0], [0, -1, 0, 0, 1, 0]]) {
        const nx = tx + dx, ny = ty + dy;
        if (nx < 0 || ny < 0 || nx >= map.W || ny >= map.H || map.t[ny * map.W + nx] === 1) continue;
        ctx.fillStyle = "rgba(230,220,255,0.35)"; ctx.fillRect(X(tx + x) - (dx === 1 ? 2 : 0), Y(ty + y) - (dy === 1 ? 2 : 0), w_ ? S + 1 : 2, h_ ? S + 1 : 2);
      }
    }
    for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
      if (map.t[ty * map.W + tx] !== 1) continue;
      if (ty + 1 < map.H && map.t[(ty + 1) * map.W + tx] !== 1) {
        const g = ctx.createLinearGradient(0, Y(ty), 0, Y(ty + 1));
        g.addColorStop(0, pal.wall); g.addColorStop(0.35, pal.edge); g.addColorStop(1, "#0c0a12");
        ctx.fillStyle = g; ctx.fillRect(X(tx), Y(ty + 0.25), S + 1, S * 0.75 + 1);
        ctx.fillStyle = "rgba(255,255,255,0.05)"; for (let k = 0; k < 3; k++) ctx.fillRect(X(tx + (hash(tx, ty, k) % 8) / 8), Y(ty + 0.4 + k * 0.18), S * 0.12, 1);
      }
    }
    for (const room of rooms) {
      const skin = roomSkin(room); if (!skin) continue;
      roomDecor(ctx, room, skin, w.t, S, X, Y, [x0, y0, x1, y1], (x, y) => x < 0 || y < 0 || x >= map.W || y >= map.H ? 1 : map.t[y * map.W + x], "", { x: w.run.h.x, y: w.run.h.y }, true);
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
      ctx.fillStyle = "rgba(8,6,14,0.2)";
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
    // 媚薬の靄（床に溜まって揺れる）
    for (const c of w.clouds || []) {
      const k = c.t / c.life, a = Math.min(1, c.t / 0.5) * (1 - Math.max(0, k - 0.7) / 0.3);
      const R = c.r * S * (0.85 + 0.15 * Math.sin(w.t * 2 + c.x));
      const g = ctx.createRadialGradient(X(c.x), Y(c.y), 0, X(c.x), Y(c.y), R);
      g.addColorStop(0, `rgba(255,140,200,${0.32 * a})`); g.addColorStop(1, "rgba(255,140,200,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(c.x), Y(c.y), R, 0, 7); ctx.fill();
    }
    // 罠（指揮者には全部見えている。ひかりが見つけた罠は縁取り）
    for (const tr of w.traps) {
      const cx = X(tr.x), cy = Y(tr.y), big = tr.d.big;
      ctx.globalAlpha = tr.armed ? 0.92 : 0.35;
      if (tr.active > 0) { ctx.fillStyle = "rgba(255,150,200,0.18)"; ctx.beginPath(); ctx.arc(cx, cy, tr.d.radius * S, 0, 7); ctx.fill(); }
      if (big) { ctx.strokeStyle = "rgba(255,120,160,0.35)"; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(cx, cy, tr.d.radius * S, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      if (tr.d.emit) { ctx.strokeStyle = "rgba(200,160,255,0.28)"; ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.arc(cx, cy, tr.d.radius * S, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      if (tr.d.effect === "floodOrb" && G.F && G.F.orbOpen(w, tr)) {   // 満ち引きの玉：殻が開いている（撃ちどき）
        const pr = S * (0.75 + 0.12 * Math.sin(w.t * 9)), g = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr);
        g.addColorStop(0, "rgba(255,190,225,0.75)"); g.addColorStop(1, "rgba(255,120,180,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, pr, 0, 7); ctx.fill();
      }
      const ti = img(trapArt(tr.kind));
      // 床の輪：系統の色。ひかりが見つけた罠は黄色
      ctx.strokeStyle = tr.found ? "#fff3a0" : TYPE_COLOR[tr.d.type]; ctx.lineWidth = tr.found ? 2.5 : 1.5;
      ctx.beginPath(); ctx.ellipse(cx, cy + S * 0.28, S * (big ? 0.6 : 0.42), S * (big ? 0.2 : 0.14), 0, 0, 7); ctx.stroke();
      if (ok(ti)) {
        const sz = S * (big ? 1.45 : 1.05);
        ctx.drawImage(ti, cx - sz / 2, cy + S * 0.36 - sz, sz, sz);
      } else {
        ctx.fillStyle = "rgba(20,14,24,0.75)"; ctx.beginPath(); ctx.arc(cx, cy, S * (big ? 0.42 : 0.3), 0, 7); ctx.fill();
        ctx.fillStyle = TYPE_COLOR[tr.d.type]; ctx.font = `bold ${Math.round(S * (big ? 0.4 : 0.32))}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(TRAP_ICON[tr.kind] || "罠", cx, cy + 1);
      }
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
    const heroes = w.duo ? [0, 1] : [-1];                // 二人の潜行：二人とも描く（手番を差し替えて）
    const ents = w.monsters.filter(m => m.hp > 0).map(m => ({ y: m.y, m })).concat(heroes.map(i => ({ y: i < 0 ? h.y : w.duo.hs[i].y, hi: i, h: true })));
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) {
      if (!e.h) { drawMonster(ctx, w, e.m, X(e.m.x), Y(e.m.y), S); continue; }
      if (e.hi < 0) { drawHikari(ctx, w, X(h.x), Y(h.y), S, ui); continue; }
      G.F.duoCtx(w, e.hi); const hh = w.run.h;
      if (hh.out) { ctx.save(); ctx.translate(X(hh.x), Y(hh.y)); ctx.rotate(-1.2); drawHikari(ctx, w, 0, 0, S, ui); ctx.restore(); drawDownMark(ctx, hh, X(hh.x), Y(hh.y), S); }   // 倒れている：横たわる
      else drawHikari(ctx, w, X(hh.x), Y(hh.y), S, ui);
      G.F.duoCtx(w, 0);
    }
    // 弾
    for (const p of w.projs) {
      if (p.owner === "h" && (p.kind === "star" || p.kind === "blade")) {
        const a = Math.atan2(p.vy, p.vx), blade = p.kind === "blade";
        if (combatSprite(ctx, blade ? "blade-flight" : "star-bolt", X(p.x) - Math.cos(a) * S * (blade ? 0.13 : 0.22), Y(p.y) - Math.sin(a) * S * (blade ? 0.13 : 0.22), blade ? 1.2 : 1.1, a, Math.floor(w.t * 12) % 4, S, 1)) continue;
      }
      if (p.kind === "blade") {                     // 飛刃：三日月の斬撃
        const a = Math.atan2(p.vy, p.vx); ctx.strokeStyle = "#e8f4ff"; ctx.shadowColor = "#bfe0ff"; ctx.shadowBlur = 12; ctx.lineWidth = Math.max(2, S * 0.09);
        ctx.beginPath(); ctx.arc(X(p.x) - Math.cos(a) * S * 0.25, Y(p.y) - Math.sin(a) * S * 0.25, S * 0.42, a - 1.1, a + 1.1); ctx.stroke(); ctx.shadowBlur = 0;
        continue;
      }
      const c = p.owner === "h" ? "#fff3b0" : ({ mucus: "#ff9ad0", psy: "#c8a0ff", beam: "#f4c8ff", cold: "#9ff4ff", sigil: "#ff5fa8" }[p.kind] || "#fff");
      ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Math.max(3, p.r * S), 0, 7); ctx.fill();
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(X(p.x - p.vx * 0.03), Y(p.y - p.vy * 0.03), Math.max(2, p.r * S * 0.8), 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    if (h.decoy) { ctx.fillStyle = "rgba(40,20,60,0.55)"; ctx.beginPath(); ctx.ellipse(X(h.decoy.x), Y(h.decoy.y), S * 0.4, S * 0.6, 0, 0, 7); ctx.fill(); }
    // 効果
    for (const f of w.fx) {
      const k = f.t / f.life, cx = X(f.x), cy = Y(f.y);
      if (combatEffect(ctx, f, cx, cy, S)) continue;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = ctx.fillStyle = f.color || "#fff";
      if (f.kind === "ring") { ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, S * (f.r || 0.9) * (0.4 + k), 0, 7); ctx.stroke(); }
      else if (f.kind === "burst") { ctx.beginPath(); ctx.arc(cx, cy, S * (f.r || 1.2) * (0.3 + k), 0, 7); ctx.fill(); }
      else if (f.kind === "hit" || f.kind === "pop") { ctx.beginPath(); ctx.arc(cx, cy, S * 0.3 * (1 + k), 0, 7); ctx.fill(); }
      else if (f.kind === "fan") { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * f.r); g.addColorStop(0, "rgba(235,215,255,0.85)"); g.addColorStop(1, "rgba(180,140,255,0)"); ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, S * f.r * (0.6 + 0.4 * Math.min(1, k * 4)), f.a - f.arc, f.a + f.arc); ctx.closePath(); ctx.fill(); ctx.restore(); }
      else if (f.kind === "slash") { ctx.lineWidth = S * 0.12 * (1 - k) + 1; ctx.beginPath(); ctx.arc(cx - Math.cos(f.a) * S * 0.7, cy - Math.sin(f.a) * S * 0.7, S * 1.1, f.a - 0.7 + k * 0.4, f.a + 0.7 + k * 0.4); ctx.stroke(); }
      else if (f.kind === "flashCam") { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, S * 0.6 * (1 - k * 0.5), 0, 7); ctx.fill(); }
      else if (f.kind === "sfx") {                 // 擬音（捕まっている間の「くちゅ」「むにゅっ」）
        ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
        ctx.font = `bold ${Math.round(S * 0.4)}px "Noto Sans JP",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const yy = cy - k * S * 0.5; ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(60,10,40,0.85)"; ctx.strokeText(f.text, cx, yy); ctx.fillStyle = f.color || "#ffb3d6"; ctx.fillText(f.text, cx, yy);
      }
      else if (f.kind === "summon") { ctx.lineWidth = 2; for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.arc(cx, cy, S * (0.2 + r * 0.25) * (1 - k * 0.5), 0, 7); ctx.stroke(); } }
      ctx.globalAlpha = 1;
    }
    // 絶頂の瞬間：画面が桃色に弾ける
    if (h.lastClimaxT !== undefined && w.t - h.lastClimaxT < 0.6 && w.t >= h.lastClimaxT) { ctx.fillStyle = `rgba(255,120,180,${0.35 * (1 - (w.t - h.lastClimaxT) / 0.6)})`; ctx.fillRect(0, 0, cv.width, cv.height); }
    // 明かり：全体を暗くして、ひかり・たいまつ・水晶の周りだけ明るく
    if (!lightCv) lightCv = document.createElement("canvas");
    if (lightCv.width !== cv.width || lightCv.height !== cv.height) { lightCv.width = cv.width; lightCv.height = cv.height; }
    const lc = lightCv.getContext("2d");
    lc.globalCompositeOperation = "source-over"; lc.clearRect(0, 0, cv.width, cv.height);
    lc.fillStyle = ui.night ? "rgba(6,3,12,0.58)" : "rgba(6,3,12,0.4)"; lc.fillRect(0, 0, cv.width, cv.height);
    lc.globalCompositeOperation = "destination-out";
    const hole = (x, y, r, a) => { const g = lc.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)"); lc.fillStyle = g; lc.beginPath(); lc.arc(x, y, r, 0, 7); lc.fill(); };
    hole(X(h.x), Y(h.y) - S * 0.5, S * (h.form === "magica" ? 5.5 : 4.2), 1);
    for (const d of dec) if (d.light) hole(X(d.x), Y(d.y) - S * 0.4, S * d.light * (1 + Math.sin(now * 7 + d.x) * 0.05), 0.85);
    hole(X(map.down.x), Y(map.down.y), S * 1.6, 0.7);
    for (const p of w.projs) hole(X(p.x), Y(p.y), S * 1.2, 0.6);
    if (lightCv.width > 0 && lightCv.height > 0) ctx.drawImage(lightCv, 0, 0);
    // たいまつの暖かい色
    ctx.globalCompositeOperation = "lighter";
    for (const d of dec) if (d.kind === "torch") { const g = ctx.createRadialGradient(X(d.x), Y(d.y) - S * 0.5, 0, X(d.x), Y(d.y) - S * 0.5, S * 2.2); g.addColorStop(0, "rgba(255,160,70,0.22)"); g.addColorStop(1, "rgba(255,160,70,0)"); ctx.fillStyle = g; ctx.fillRect(X(d.x) - S * 2.2, Y(d.y) - S * 2.7, S * 4.4, S * 4.4); }
    // 漂う光の粒
    for (const m of motes) { ctx.fillStyle = `rgba(${moteRGB(pal.fog)},${m.a * (0.6 + 0.4 * Math.sin(m.t * 2))})`; ctx.fillRect(X(m.x), Y(m.y), 2, 2); }
    ctx.globalCompositeOperation = "source-over";
    // 催眠中は画面の縁が紫に染まる
    if ((h.trance > 0 || h.hyp > 20) && !ui.night) {
      const g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * 0.3, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * 0.7);
      g.addColorStop(0, "rgba(120,60,200,0)"); g.addColorStop(1, `rgba(120,60,200,${Math.min(0.5, 0.12 + (h.hyp || 0) / 300 + (h.trance > 0 ? 0.12 : 0))})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
    }
    // 吹き出しは明かりの上に
    if (w.duo) {
      for (let i = 0; i < 2; i++) { const hh = w.duo.hs[i]; if (hh.bubble && !ui.night) drawBubble(ctx, hh, X(hh.x), Y(hh.y), S); }
      const bi = w.duo.hs.findIndex(x => x.bound);      // 捕まっている方の札
      if (bi >= 0 && !ui.night) { G.F.duoCtx(w, bi); drawCapture(ctx, w, cv); G.F.duoCtx(w, 0); }
    } else {
      if (h.bubble && !ui.night && !ui.liveSay) drawBubble(ctx, h, X(h.x), Y(h.y), S);   // 実況中は、立ち絵の吹き出しで
      if (h.bound && !ui.night) drawCapture(ctx, w, cv);
    }
    // カードを選んでいる間は、置けるマスを薄く緑で示す（タッチでは見当がつかないので）。0.4秒ごとに数え直す
    if (ui.card) {
      const key = ui.card + ":" + (ui.night ? 1 : 0), c = w._placeOk;
      if (!c || c.key !== key || w.t - c.t > 0.4 || w.t < c.t) {
        const ok = [];
        for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) if (map.t[ty * map.W + tx] !== 1 && G.Field.canPlace(w, ui.card, tx + 0.5, ty + 0.5, ui.night) === "ok") ok.push(tx, ty);
        w._placeOk = { key, t: w.t, ok };
      }
      const ok = w._placeOk.ok;
      ctx.fillStyle = "rgba(120,255,160,0.16)"; ctx.strokeStyle = "rgba(120,255,160,0.35)"; ctx.lineWidth = 1;
      for (let i = 0; i < ok.length; i += 2) { const px = X(ok[i]), py = Y(ok[i + 1]); ctx.fillRect(px + 2, py + 2, S - 4, S - 4); }
    }
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

  // 人の大きさで描く魔物：[画面での身長（ルミナ＝約1.85）, 絵の中の頭の上端, 足元]（256px の絵での位置）
  // 人間（ワルドー・教団）はルミナと同じか少し大きく、小淫魔はルミナより少し小さく
  const FIG = {
    waldo_grunt: [1.95, 8, 248], waldo_officer: [2.05, 8, 248], shinja: [1.9, 8, 248], sekkyoushi: [1.95, 8, 248], chuushutsu: [1.9, 8, 248], kyouso: [2.1, 8, 248],
    inma: [1.85, 8, 248], muma_queen: [1.95, 67, 248], kuchizuke: [1.8, 8, 248], hitomi: [1.8, 8, 248],
    lumina_grunt: [1.9, 4, 252], haruka_grunt: [1.95, 4, 252],
    imp: [1.45, 8, 247], futago: [1.35, 8, 248], sakiimp: [1.45, 8, 248], jikkyou: [1.45, 8, 248], kusuguri: [1.45, 8, 248], kazoe: [1.45, 8, 248], azakeri: [1.45, 8, 248], utaimp: [1.45, 8, 248], tenazuke: [1.45, 8, 248],
  };
  function drawMonster(ctx, w, m, x, y, S) {
    const d = m.d, h = w.run.h, F = FIG[m.kind], sz = F ? F[0] * S * 256 / (F[2] - F[1]) : Math.max(0.9, d.r * 2.4) * S;
    const sh = Math.min(sz, 1.3 * S);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x, y + S * 0.28, sh * 0.36, sh * 0.12, 0, 0, 7); ctx.fill();
    if (d.chest && m.hidden) { drawChest(ctx, x, y, S, false); return; }
    // 構え（攻撃の予兆）
    if (m.cast) {
      const k = 1 - m.cast.t / Math.max(0.2, m.cast.total);
      ctx.strokeStyle = "rgba(255,80,110,0.85)"; ctx.lineWidth = 3;
      if (m.cast.kind === "shot" && d.atk.fan) {   // 光の扇の予兆：扇形がじわじわ満ちる
        const a = U.angle(m.x, m.y, m.cast.tx, m.cast.ty), R = d.atk.range * S;
        ctx.save(); ctx.globalAlpha = 0.12 + k * 0.3; ctx.fillStyle = "#c8a0ff"; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R * k, a - d.atk.fan, a + d.atk.fan); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.strokeStyle = "#e8d0ff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R, a - d.atk.fan, a + d.atk.fan); ctx.closePath(); ctx.stroke(); ctx.restore();
      } else if (m.cast.kind === "shot" || m.cast.kind === "pounce") {
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
    const im = img("assets/monsters/" + (m.salute > 0 && d.saluteArt ? d.saluteArt : d.art));
    ctx.save();
    ctx.globalAlpha = m.hidden ? 0.4 : (m.holding || m.molest) && h.bound ? 0.7 : 1;     // 群がっている魔物は、少し透かしてルミナを見せる
    ctx.translate(x + dx, y + S * 0.3 + dy + bob); ctx.transform(1, 0, -sk, 1, 0, 0); ctx.scale(sx, sy);
    if (ok(im)) {
      const k = sz / Math.max(im.naturalWidth, im.naturalHeight), iw = im.naturalWidth * k, ih = im.naturalHeight * k;
      if (d.tint) ctx.filter = `hue-rotate(${d.tint}deg) saturate(1.2)`;   // 同じ絵の色違い（口づけの淫魔など）
      const foot = F ? (256 - F[2]) / 256 * ih : 0;               // 絵の下の余白ぶん下げて、足を床につける
      ctx.drawImage(im, -iw / 2, -ih + foot, iw, ih);
      if (d.tint) ctx.filter = "none";
      if (m.flash > 0) { ctx.globalAlpha = 0.55; ctx.globalCompositeOperation = "lighter"; ctx.drawImage(im, -iw / 2, -ih + foot, iw, ih); ctx.globalCompositeOperation = "source-over"; }
    } else { ctx.fillStyle = TYPE_COLOR[d.type]; ctx.beginPath(); ctx.arc(0, -sz * 0.4, sz * 0.4, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.fillStyle = TYPE_COLOR[d.type]; ctx.beginPath(); ctx.arc(x - Math.min(sz, S * 1.2) * 0.42, y - (F ? F[0] * S * 0.62 : sz * 0.62), S * 0.1, 0, 7); ctx.fill();
    if (m.bubble) {                                  // 魔物の声
      const t = m.bubble.text, top = y - (F ? F[0] * S : sz * 0.9) - S * ((m.holding || m.molest) && h.bound ? 1.15 + (m.id % 3) * 0.5 : 0.35);   // 群がっている時は、ルミナの吹き出しより上へ
      ctx.font = `${Math.max(10, Math.round(S * 0.3))}px "Noto Sans JP",sans-serif`;
      const tw = Math.min(ctx.measureText(t).width, S * 6.5);
      ctx.globalAlpha = Math.min(1, m.bubble.t * 2);
      ctx.fillStyle = m.d.type === "惑" ? "rgba(58,34,84,0.92)" : "rgba(84,26,56,0.92)"; roundRect(ctx, x - tw / 2 - 7, top - S * 0.27, tw + 14, S * 0.54, 7); ctx.fill();
      ctx.strokeStyle = "rgba(255,170,210,0.8)"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "#ffe6f2"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, top + 1, S * 6.5);
      ctx.globalAlpha = 1;
    }
    if (m.boss) { ctx.fillStyle = "#f2d27a"; ctx.font = `bold ${Math.round(S * 0.34)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("長", x, y - (F ? F[0] * S * 0.95 : sz * 0.95)); }
    if (m.hp < m.maxHp) { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - S * 0.4, y + S * 0.38, S * 0.8, 4); ctx.fillStyle = "#ff9ab8"; ctx.fillRect(x - S * 0.4, y + S * 0.38, S * 0.8 * m.hp / m.maxHp, 4); }
    if (m.summoned) { ctx.strokeStyle = "rgba(255,120,190,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y + S * 0.28, sh * 0.38, 0, 7); ctx.stroke(); }
  }

  // 倒れて救出を待つ相棒：起こされるまでの輪
  function drawDownMark(ctx, h, x, y, S) {
    const p = Math.min(1, (h.out.rescueT || 0) / 2.6);
    ctx.save(); ctx.strokeStyle = "rgba(255,90,120,0.8)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - S * 0.2, S * 0.7, 0, 7); ctx.stroke();
    if (p > 0) { ctx.strokeStyle = "#fff2c0"; ctx.beginPath(); ctx.arc(x, y - S * 0.2, S * 0.7, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = "#ffd0dc"; ctx.font = `bold ${Math.round(S * 0.3)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText(p > 0 ? "救出中" : "救出を待つ", x, y - S * 1.1);
    ctx.restore();
  }
  function drawHikari(ctx, w, x, y, S) {
    const h = w.run.h;
    const im = img(G.Hero.sprite(h, U.dirName(h.a), 1));
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x, y + S * 0.3, S * 0.4, S * 0.14, 0, 0, 7); ctx.fill();
    if (h.bound) { ctx.strokeStyle = "rgba(255,110,170,0.85)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - S * 0.4, S * 0.55, 0, 7); ctx.stroke(); }
    if (h.cast && h.cast.kind !== "transform" && combatSprite(ctx, h.cast.blade ? "blade-parry" : "hit-spark", x + Math.cos(h.a) * S * 0.35, y - S * 0.55, h.cast.blade ? 0.45 : 0.8, 0, Math.floor(w.t * 12) % 4, S, 0.65)) {
      // The blade glints at readiness; magic gathers at the staff.
    } else if (h.cast) {                            // 詠唱の光
      const g = ctx.createRadialGradient(x, y - S * 0.6, 0, x, y - S * 0.6, S * (h.cast.kind === "transform" ? 1.4 : 0.9));
      g.addColorStop(0, "rgba(255,240,200,0.55)"); g.addColorStop(1, "rgba(255,200,240,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - S * 0.6, S * 1.4, 0, 7); ctx.fill();
    }
    const H = S * 1.9;
    // 傾き：進む方へ少し、急に止まった時は少しのけぞる。打たれた時は押される
    const sp = G.heroStats().spd[h.form], lx = U.clamp((h.vx || 0) / sp, -1, 1);
    h._lean = (h._lean || 0) + (lx * 0.035 - (h.brakeT > 0 ? Math.sign(h._leanDir || 0) * 0.06 * h.brakeT / 0.18 : 0) - (h._lean || 0)) * 0.25;
    if (Math.abs(lx) > 0.2) h._leanDir = Math.sign(lx);
    const shake = h.bound ? Math.sin(w.t * 30) * S * 0.04 : 0;
    // 歩み：進んだ距離に合わせて、一歩ごとに小さく上下する（足が地面を踏む）
    h._stepPh = (h._stepPh || 0) + (h.moved || 0) / 0.42;
    const step = Math.hypot(h.vx || 0, h.vy || 0) > 0.3 ? Math.abs(Math.sin(h._stepPh * Math.PI)) : 0;
    ctx.save();
    ctx.translate(x + shake, y + S * 0.35 - step * S * 0.06);
    ctx.scale(1 + step * 0.015, 1 - step * 0.015);
    ctx.rotate(h._lean || 0);
    if (ok(im)) { const k = H / im.naturalHeight, iw = im.naturalWidth * k; ctx.drawImage(im, -iw / 2, -H, iw, H); }   // 縦横比はそのまま
    else { ctx.fillStyle = "#ffd0e8"; ctx.fillRect(-S * 0.3, -S * 1.3, S * 0.6, S * 1.3); }
    ctx.restore();
    if (h.bound) drawBindFx(ctx, w, x, y, S, H);
    if (!h.bound && h.pleasure > 25) {               // 快感の小さなゲージ（頭の上）
      const gw = S * 0.8, gy = y - H - S * 0.12, p = Math.min(1, h.pleasure / 100);
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x - gw / 2, gy, gw, 4);
      ctx.fillStyle = p > 0.88 ? "#ff3f8a" : p > 0.7 ? "#ff6fa6" : "#ff9ac4"; ctx.fillRect(x - gw / 2, gy, gw * p, 4);
    }
    if (h.trance > 0 || h.hyp > 0) {                // 催眠・惑い：頭のまわりの渦と、名前（催眠度）
      const hy = y - H + S * 0.15;
      ctx.strokeStyle = "rgba(200,160,255,0.9)"; ctx.lineWidth = 2.5;
      for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(x, hy, S * (0.28 + k * 0.16), w.t * (5 - k * 2) + k, w.t * (5 - k * 2) + k + 4.2); ctx.stroke(); }
      ctx.fillStyle = "rgba(60,30,100,0.85)"; roundRect(ctx, x - S * 0.55, hy - S * 0.95, S * 1.1, S * 0.42, 6); ctx.fill();
      ctx.fillStyle = "#e8d8ff"; ctx.font = `bold ${Math.round(S * 0.28)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText((h.sleep > 0 ? "眠り" : h.hypno || "惑い") + " " + Math.ceil(h.hyp || 0) + "%", x, hy - S * 0.74);
    }
    if (h.arousal > 40) { ctx.fillStyle = `rgba(255,120,170,${Math.min(0.9, h.arousal / 110)})`; ctx.font = `${Math.round(S * 0.35)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("♡", x + S * 0.45, y - H + S * 0.3 + Math.sin(w.t * 4) * 3); }
    if (h.sigil) {                                   // 淫紋：下腹の小さな紋（深さで濃く）
      ctx.strokeStyle = `rgba(255,95,168,${0.35 + h.sigil * 0.2})`; ctx.lineWidth = 1.5;
      const cy = y - H * 0.42; ctx.beginPath(); ctx.moveTo(x, cy - S * 0.1); ctx.bezierCurveTo(x - S * 0.16, cy - S * 0.2, x - S * 0.2, cy + S * 0.02, x, cy + S * 0.1); ctx.bezierCurveTo(x + S * 0.2, cy + S * 0.02, x + S * 0.16, cy - S * 0.2, x, cy - S * 0.1); ctx.stroke();
    }
    if (h.deny || h.omazuke || w.run.law === "kinzetsu") {   // 栓をされている：頭上に小さな錠
      const bx = x + S * 0.42, by = y - H + S * 0.05;
      ctx.fillStyle = "rgba(90,20,60,0.85)"; roundRect(ctx, bx - S * 0.2, by - S * 0.16, S * 0.4, S * 0.32, 5); ctx.fill();
      ctx.fillStyle = "#ffb3d6"; ctx.font = `bold ${Math.round(S * 0.24)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("禁", bx, by + 1);
    }
    for (let i = 0; i < (h.attach || []).length; i++) { ctx.fillStyle = "rgba(255,110,170,0.85)"; ctx.beginPath(); ctx.arc(x - S * 0.12 + i * S * 0.09, y - H * 0.58, S * 0.05 + Math.sin(w.t * 9 + i) * S * 0.01, 0, 7); ctx.fill(); }
    if (h.possess) { ctx.fillStyle = `rgba(230,236,255,${0.45 + 0.25 * Math.sin(w.t * 6)})`; ctx.beginPath(); ctx.arc(x - S * 0.22, y - H * 0.55, S * 0.12, 0, 7); ctx.fill(); }
    if (h.bound) { const b = h.bound; ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - S * 0.5, y + S * 0.45, S, 5); ctx.fillStyle = "#fff0a0"; ctx.fillRect(x - S * 0.5, y + S * 0.45, S * Math.min(1, b.struggle), 5); }
    if (G.Hero.cur === "haruka" && h.dashT > 0 && Math.hypot(h.vx || 0, h.vy || 0) > 0.1) {
      const a = Math.atan2(h.vy, h.vx);
      combatSprite(ctx, "blade-thrust", x - Math.cos(a) * S * 0.45, y + S * 0.3 - Math.sin(a) * S * 0.45, 0.85, a, 1, S, Math.min(0.45, h.dashT * 2));
    }
    if (h.zan > 0.05 && !h.bound && !combatSprite(ctx, "blade-spin", x, y + S * 0.38, 1.0, 0, 1, S, h.zan >= 1 ? 1 : 0.6, h.zan)) { // 遙：居合の溜め
      ctx.save(); ctx.lineWidth = 2.5; ctx.strokeStyle = h.zan >= 1 ? "#ffffff" : "rgba(200,225,255,0.7)"; if (h.zan >= 1) { ctx.shadowColor = "#cfe6ff"; ctx.shadowBlur = 10; }
      ctx.beginPath(); ctx.arc(x, y + S * 0.38, S * 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, h.zan)); ctx.stroke(); ctx.restore();
    }
    if (h.cast && h.cast.kind === "transform") { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - S * 0.5, y + S * 0.45, S, 5); ctx.fillStyle = "#ffd6f0"; ctx.fillRect(x - S * 0.5, y + S * 0.45, S * (1 - h.cast.t / G.HIKARI.transformCast), 5); }
  }
  // 捕まっている間の札（左上）：誰に・何体に・どこまで、快感はどれだけ溜まったか
  function drawCapture(ctx, w, cv) {
    const h = w.run.h, b = h.bound, rw = cv.getBoundingClientRect().width, dpr = rw ? cv.width / rw : 1, u = 12 * dpr;
    const mol = w.monsters.filter(m => m.molest && m.hp > 0);
    const names = {}; for (const id of b.by) { const m = w.monsters.find(x => x.id === id); const t = m || w.traps.find(x => x.id === id); if (t) names[t.d.name] = (names[t.d.name] || 0) + 1; }
    for (const m of mol) names[m.d.name] = (names[m.d.name] || 0) + 1;
    const who = Object.entries(names).map(([k, v]) => v > 1 ? `${k}×${v}` : k).join("・");
    const stage = b.nAct ? ["服の上から", "服の中まで", "直接"][b.stage || 0] : "縛られているだけ";
    const lines = [`捕まっている：${who}`, `${stage}${b.last && b.nAct ? "　— " + b.last.p.replace(/ /g, "") : ""}`];
    ctx.save();
    ctx.font = `${Math.round(u)}px "Noto Sans JP",sans-serif`;
    const wBox = Math.min(cv.width * 0.6, Math.max(...lines.map(l => ctx.measureText(l).width)) + u * 1.6), hBox = u * 4.4;
    const x0 = u * 0.8, y0 = u * 0.8;
    ctx.fillStyle = "rgba(40,10,30,0.82)"; ctx.strokeStyle = "rgba(255,140,190,0.8)"; ctx.lineWidth = 1.5 * dpr;
    roundRect(ctx, x0, y0, wBox, hBox, 8 * dpr); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffd6ea"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(lines[0], x0 + u * 0.8, y0 + u * 0.5, wBox - u * 1.6);
    ctx.fillStyle = "#e8c0d8"; ctx.fillText(lines[1], x0 + u * 0.8, y0 + u * 1.8, wBox - u * 1.6);
    // 快感のゲージ（絶頂まで）。栓をされている時は 95 で止まる印
    const gx = x0 + u * 0.8, gy = y0 + u * 3.3, gw = wBox - u * 1.6, gh = u * 0.5, p = Math.min(1, h.pleasure / 100);
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(gx, gy, gw, gh);
    ctx.fillStyle = p > 0.88 ? "#ff3f8a" : p > 0.7 ? "#ff6fa6" : "#ff9ac4"; ctx.fillRect(gx, gy, gw * p, gh);
    if (h.deny || h.omazuke || h.permit || w.run.law === "kinzetsu") { ctx.fillStyle = "#fff"; ctx.fillRect(gx + gw * 0.95, gy - 2, 2, gh + 4); }
    ctx.restore();
  }
  // 捕まっている時、何に・どう捕まっているかを絵で：触手・蔦は身体に絡む線、手は胸と腰に、粘体は下半身を包む膜、機械はアーム、縄や網は身体に掛かる
  const BIND_COL = { tentacle: "#ff8fbf", plant: "#8fd07a", worm: "#f0a8c8", hands: "#e8c0a8", imp: "#c890ff", slime: "#ffb0d8", mouth: "#d06a90", machine: "#b8c4dc", tickle: "#fff0f8", watch: null, itch: "#ffe27a" };
  function drawBindFx(ctx, w, x, y, S, H) {
    const h = w.run.h, b = h.bound, t = w.t;
    const pts = [{ x: x - S * 0.12, y: y - H * 0.6 }, { x: x + S * 0.12, y: y - H * 0.58 }, { x: x, y: y - H * 0.42 }, { x: x - S * 0.14, y: y - H * 0.24 }, { x: x + S * 0.14, y: y - H * 0.22 }];
    const srcs = [];
    for (const id of b.by) { const m = w.monsters.find(o => o.id === id && o.hp > 0); if (m) srcs.push(m); else { const tr = w.traps.find(o => o.id === id); if (tr) srcs.push(tr); } }
    for (const m of w.monsters) if (m.molest && m.hp > 0 && !b.by.includes(m.id)) srcs.push(m);
    ctx.save();
    srcs.forEach((src, i) => {
      const cat = G.Text.actorOf(src.kind) || "restraint", col = BIND_COL[cat];
      const sx = x + (src.x - h.x) * S, sy = y + (src.y - h.y) * S - S * 0.4;
      if (cat === "restraint") {                              // 縄・網・枷：身体に掛かる
        ctx.strokeStyle = "rgba(210,190,150,0.85)"; ctx.lineWidth = 2;
        if (b.net || src.kind === "net" || src.kind === "web") { for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x - S * 0.35, y - H * 0.5 + k * S * 0.12); ctx.lineTo(x + S * 0.35, y - H * 0.35 + k * S * 0.12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + S * 0.35, y - H * 0.5 + k * S * 0.12); ctx.lineTo(x - S * 0.35, y - H * 0.35 + k * S * 0.12); ctx.stroke(); } }
        else { ctx.lineWidth = 3; for (const yy of [0.62, 0.52, 0.3]) { ctx.beginPath(); ctx.ellipse(x, y - H * yy, S * 0.24, S * 0.06, 0, 0, 7); ctx.stroke(); } }
        return;
      }
      if (!col) return;
      if (cat === "slime" || cat === "mouth") {                // 下半身を包む膜
        ctx.fillStyle = cat === "slime" ? "rgba(255,170,215,0.38)" : "rgba(200,90,130,0.45)";
        ctx.beginPath(); ctx.ellipse(x, y - H * 0.22, S * 0.36, H * (0.22 + 0.02 * Math.sin(t * 3 + i)), 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(255,210,235,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
        return;
      }
      if (cat === "hands" || cat === "imp") {                  // 手：胸と腰に
        const p = pts[(i * 2 + (b.stage || 0)) % pts.length], jit = Math.sin(t * 6 + i) * S * 0.03;
        ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(p.x + jit, p.y, S * 0.08, S * 0.06, 0.4, 0, 7); ctx.fill();
        for (let f = 0; f < 4; f++) { ctx.beginPath(); ctx.ellipse(p.x + jit + (f - 1.5) * S * 0.035, p.y - S * 0.07, S * 0.018, S * 0.04, 0, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + p.x) / 2, (sy + p.y) / 2 + S * 0.2, p.x + jit, p.y + S * 0.04); ctx.stroke();
        return;
      }
      // 触手・蔦・蟲・機械・羽根：身体へ伸びる線（揺れる）
      const n = cat === "worm" ? 4 : cat === "machine" || cat === "tickle" ? 2 : 3;
      ctx.strokeStyle = col; ctx.lineWidth = cat === "machine" ? 2.5 : cat === "worm" ? 2 : 4; ctx.lineCap = "round";
      for (let k = 0; k < n; k++) {
        const p = pts[(i + k * 2 + (b.stage || 0)) % pts.length], wob = Math.sin(t * (cat === "machine" ? 9 : 3) + k + i) * S * 0.18;
        ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx + (p.x - sx) * 0.3 + wob, sy + (p.y - sy) * 0.3 - wob, sx + (p.x - sx) * 0.7 - wob, sy + (p.y - sy) * 0.7 + wob, p.x, p.y); ctx.stroke();
        if (cat === "tentacle" || cat === "plant") { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, S * 0.04, 0, 7); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    });
    ctx.restore();
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

  G.Render = { draw, preload, img, TYPE_COLOR, roomPreview, stats, trapArt };
})();
