/* map.js — 1階ぶんの地図：部屋と通路と柱。見通し（視線）と道探し。DOM に触れない
 * tiles: 0=床 1=壁 2=柱（歩けない・見通せない）
 */
var G = (typeof G !== "undefined") ? G : {};
(function () {
  "use strict";
  const U = G.U;
  const W = 26, H = 20;

  function makeFloor(floorNo, totalFloors) {
    const t = new Array(W * H).fill(1);
    const rooms = [];
    for (let tries = 0; tries < 200 && rooms.length < 7; tries++) {
      const w = U.ri(5, 9), h = U.ri(4, 7);
      const x = U.ri(1, W - w - 1), y = U.ri(1, H - h - 1);
      if (rooms.some(r => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y)) continue;
      rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
    }
    for (const r of rooms) for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) t[yy * W + xx] = 0;
    // 部屋を順につなぐ（L字の通路）。ときどき余分な通路で輪を作る
    const order = rooms.slice().sort((a, b) => a.cx - b.cx);
    const carve = (a, b) => {
      let x = a.cx, y = a.cy;
      const horizFirst = U.chance(0.5);
      const stepX = () => { while (x !== b.cx) { t[y * W + x] = t[y * W + x] === 1 ? 0 : t[y * W + x]; x += Math.sign(b.cx - x); } };
      const stepY = () => { while (y !== b.cy) { t[y * W + x] = t[y * W + x] === 1 ? 0 : t[y * W + x]; y += Math.sign(b.cy - y); } };
      if (horizFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
      t[y * W + x] = 0;
    };
    for (let i = 1; i < order.length; i++) carve(order[i - 1], order[i]);
    if (order.length > 3) carve(order[0], order[U.ri(2, order.length - 1)]);
    // 柱：大きめの部屋に1〜2本（隠れ場所になる）
    for (const r of rooms) {
      if (r.w < 6 || r.h < 5) continue;
      const n = U.ri(1, 2);
      for (let k = 0; k < n; k++) {
        const px = U.ri(r.x + 1, r.x + r.w - 2), py = U.ri(r.y + 1, r.y + r.h - 2);
        if (px === r.cx && py === r.cy) continue;
        t[py * W + px] = 2;
      }
    }
    const m = { W, H, t, rooms, floor: floorNo, seen: new Uint8Array(W * H) };
    // 上り階段は最初の部屋、下り階段はいちばん遠い部屋
    const start = order[0];
    m.up = { x: start.cx + 0.5, y: start.cy + 0.5 };
    fixConnectivity(m);
    const dist = bfs(m, Math.floor(m.up.x), Math.floor(m.up.y));
    let best = null, bd = -1;
    for (const r of rooms) {
      const d = dist[r.cy * W + r.cx];
      if (d > bd && m.t[r.cy * W + r.cx] === 0) { bd = d; best = r; }
    }
    m.down = { x: best.cx + 0.5, y: best.cy + 0.5 };
    m.last = floorNo >= totalFloors;              // 最下層：下り階段の代わりに転移陣
    m.portal = (floorNo === 5 || m.last);         // 5階と最下層には転移陣（帰還できる）
    // 階段のまわりは柱を置かない
    for (const p of [m.up, m.down]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const i = (Math.floor(p.y) + dy) * W + Math.floor(p.x) + dx;
      if (m.t[i] === 2) m.t[i] = 0;
    }
    return m;
  }

  // 柱で道が塞がった所を開ける（全部の床が上り階段とつながるように）
  function fixConnectivity(m) {
    for (let pass = 0; pass < 4; pass++) {
      const d = bfs(m, Math.floor(m.up.x), Math.floor(m.up.y));
      let fixed = false;
      for (let i = 0; i < m.t.length; i++) if (m.t[i] === 0 && d[i] < 0) {
        for (let j = 0; j < m.t.length; j++) if (m.t[j] === 2) { m.t[j] = 0; fixed = true; }
        break;
      }
      if (!fixed) return;
    }
  }

  function bfs(m, sx, sy) {
    const d = new Int32Array(m.W * m.H).fill(-1);
    const q = [sy * m.W + sx]; d[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % m.W, y = (i / m.W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H) continue;
        const j = ny * m.W + nx;
        if (d[j] >= 0 || m.t[j] !== 0) continue;
        d[j] = d[i] + 1; q.push(j);
      }
    }
    return d;
  }

  function tile(m, x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= m.W || ty >= m.H) return 1;
    return m.t[ty * m.W + tx];
  }
  function walkable(m, x, y) { return tile(m, x, y) === 0; }

  // 見通し：2点の間に壁や柱が無いか（細かい刻みで調べる）
  function los(m, ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay);
    const n = Math.ceil(d * 3);
    for (let i = 1; i < n; i++) {
      const k = i / n;
      if (tile(m, ax + (bx - ax) * k, ay + (by - ay) * k) !== 0) return false;
    }
    return true;
  }

  // A*（8方向、角のすり抜け無し）。マスの中心を結んだ道を返す
  function path(m, sx, sy, gx, gy, avoid) {
    sx = Math.floor(sx); sy = Math.floor(sy); gx = Math.floor(gx); gy = Math.floor(gy);
    if (!walkable(m, gx + 0.5, gy + 0.5)) return null;
    const N = m.W * m.H, start = sy * m.W + sx, goal = gy * m.W + gx;
    const g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const open = [start]; g[start] = 0;
    const hf = i => { const x = i % m.W, y = (i / m.W) | 0; return Math.hypot(x - gx, y - gy); };
    const f = new Float32Array(N).fill(Infinity); f[start] = hf(start);
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
      const cur = open.splice(bi, 1)[0];
      if (cur === goal) break;
      closed[cur] = 1;
      const cx = cur % m.W, cy = (cur / m.W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H) continue;
        const j = ny * m.W + nx;
        if (closed[j] || m.t[j] !== 0) continue;
        if (dx && dy && (m.t[cy * m.W + nx] !== 0 || m.t[ny * m.W + cx] !== 0)) continue;
        let step = (dx && dy) ? 1.414 : 1;
        if (avoid) step += avoid(nx, ny) || 0;
        const ng = g[cur] + step;
        if (ng < g[j]) { g[j] = ng; came[j] = cur; f[j] = ng + hf(j); if (!open.includes(j)) open.push(j); }
      }
    }
    if (came[goal] < 0 && goal !== start) return null;
    const out = [];
    for (let c = goal; c !== start && c >= 0; c = came[c]) out.push({ x: (c % m.W) + 0.5, y: ((c / m.W) | 0) + 0.5 });
    return out.reverse();
  }

  // 床のマスを1つ選ぶ（条件つき）
  function randomFloor(m, ok, tries) {
    for (let k = 0; k < (tries || 300); k++) {
      const x = U.ri(0, m.W - 1), y = U.ri(0, m.H - 1);
      if (m.t[y * m.W + x] !== 0) continue;
      if (ok && !ok(x + 0.5, y + 0.5)) continue;
      return { x: x + 0.5, y: y + 0.5 };
    }
    return null;
  }

  // 柱や壁の角のそば（身を隠して覗ける場所）
  function coverSpots(m) {
    const out = [];
    for (let y = 1; y < m.H - 1; y++) for (let x = 1; x < m.W - 1; x++) {
      if (m.t[y * m.W + x] !== 0) continue;
      let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (m.t[(y + dy) * m.W + x + dx] === 2) n += 2; else if (m.t[(y + dy) * m.W + x + dx] === 1) n += 1;
      if (n >= 2) out.push({ x: x + 0.5, y: y + 0.5, pillar: n >= 2 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => m.t[(y + dy) * m.W + x + dx] === 2) });
    }
    return out;
  }

  G.Map = { W, H, makeFloor, tile, walkable, los, path, bfs, randomFloor, coverSpots };
})();
if (typeof module !== "undefined") module.exports = G;
