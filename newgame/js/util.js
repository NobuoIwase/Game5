/* util.js — 乱数・数学・小道具。DOM に触れない（Node の検査からも読む） */
var G = (typeof G !== "undefined") ? G : {};
(function () {
  "use strict";
  // 乱数は種つき（検査で同じ流れを再現するため）
  let seed = (Date.now() ^ 0x5bd1e995) >>> 0;
  function rand() {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  G.U = {
    setSeed(s) { seed = s >>> 0; },
    rand,
    ri(a, b) { return a + Math.floor(rand() * (b - a + 1)); },
    rf(a, b) { return a + rand() * (b - a); },
    chance(p) { return rand() < p; },
    pick(arr) { return arr && arr.length ? arr[Math.floor(rand() * arr.length)] : null; },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    },
    // 重み付き抽選：items=[{w, ...}] か、[item, weight] の配列
    weighted(items, wf) {
      const ws = items.map(wf || (x => x.w));
      const tot = ws.reduce((s, w) => s + Math.max(0, w), 0);
      if (tot <= 0) return items[0] || null;
      let r = rand() * tot;
      for (let i = 0; i < items.length; i++) { r -= Math.max(0, ws[i]); if (r <= 0) return items[i]; }
      return items[items.length - 1];
    },
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); },
    angle(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },
    angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; },
    // 文面の {key} を埋める
    fill(s, o) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null) ? o[k] : m); },
    clone(o) { return JSON.parse(JSON.stringify(o)); },
    // 4方向の向き名（ひかりの絵の選択）
    dirName(a) {
      const c = Math.cos(a), s = Math.sin(a);
      if (Math.abs(c) > Math.abs(s)) return c > 0 ? "right" : "left";
      return s > 0 ? "front" : "back";
    },
  };
})();
if (typeof module !== "undefined") module.exports = G;
