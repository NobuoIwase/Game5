
(() => {
'use strict';
if (!window.Game5Graphics) return;

const single = window.Game5Graphics.drawEnemy;
window.Game5Graphics.drawOne = single;   // v0.37: one monster as the live ones are drawn (used by the death roll)

if (typeof resolveEnemy === 'function') {
  const baseResolve = resolveEnemy;
  resolveEnemy = function(cast) {
    const enemy = state.enemy;
    const hero = state.hero;
    const beforeBind = hero?.status?.bind || 0;
    const key = cast?.key;
    const result = baseResolve(cast);
    if (enemy && key === 'bind' && (hero?.status?.bind || 0) > beforeBind) {
      enemy.bindVisualUntil = state.time + Math.max(0.9, hero.status.bind);
    }
    return result;
  };
}

function telegraph(e) {
  const c = e?.cast;
  if (!c || e === state.enemy || window.Game5FX) return;
  const sk = c.sk;
  ctx.save();
  const p = 1 - Math.max(0, c.t) / Math.max(.01, c.total);
  ctx.globalAlpha = .12 + .22 * p;
  ctx.fillStyle = '#ff6b8a';
  ctx.strokeStyle = '#ffc1ce';
  ctx.lineWidth = 2;
  if (sk.kind === 'circle') {
    ctx.beginPath();
    ctx.arc(c.target.x, c.target.y, sk.r, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else if (sk.kind === 'cone') {
    ctx.beginPath();
    ctx.moveTo(c.start.x, c.start.y);
    ctx.arc(c.start.x, c.start.y, sk.range, c.ang - .66, c.ang + .66);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.translate(c.start.x, c.start.y);
    ctx.rotate(c.ang);
    ctx.fillRect(0, -sk.width / 2, sk.range, sk.width);
    ctx.strokeRect(0, -sk.width / 2, sk.range, sk.width);
  }
  ctx.restore();
}

function hpbar(e) {
  if (!e || e.hp <= 0) return;
  const w = Math.max(34, Math.min(76, e.r * 2.2));
  // v0.27: a monster holding her would put its bar over her face; move it out to its far side
  const side = e.grappling && state.hero ? (e.x >= state.hero.x ? 1 : -1) : 0;
  const x = side ? e.x + side * (e.r + 34) - w / 2 : e.x - w / 2;
  const y = side ? e.y + 4 : e.y - e.r - 34;
  ctx.save();
  ctx.globalAlpha = e === state.enemy ? 1 : .72;
  ctx.fillStyle = '#160d16';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = e === state.enemy ? '#d45a77' : '#8e7388';
  ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 5);
  ctx.restore();
}

function drawSpecies(e) {
  const hero = state.hero;
  const bind = hero?.status?.bind || 0;
  const ownsBind =
    e?.cast?.key === 'bind' ||
    (e?.bindVisualUntil || 0) > state.time;

  if (hero && !ownsBind) hero.status.bind = 0;
  // v0.27: per-monster transform hook (squash on hit, see impact-v027.js)
  const tf = window.Game5Graphics.enemyTransform;
  ctx.save();
  let result;
  try { tf?.(e); result = single?.(e); } finally { ctx.restore(); }
  if (hero) hero.status.bind = bind;
  return result;
}

window.Game5Graphics.drawEnemy = function() {
  const list =
    window.Game5MultiEnemy?.alive?.() ||
    (state.enemy ? [state.enemy] : []);

  if (!list.length) return false;

  for (const e of list) telegraph(e);
  for (const e of list) {
    drawSpecies(e);
    hpbar(e);
  }
  return true;
};

window.Game5Graphics.version = '0.11.0';
})();
