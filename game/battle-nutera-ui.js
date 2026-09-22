'use strict';

function setMeter(id, value, max = 100) {
  const el = $(id);
  if (el) el.style.width = `${clamp(value / max * 100, 0, 100)}%`;
}
function tierLabel(name, track) {
  const t = tierInfo(track);
  return `${name} ${t.stage ? `段階${t.stage}` : '段階0'} / ${Math.round(t.progress)}%`;
}
function bestCharmText(h) {
  let best = null;
  for (const [family, track] of Object.entries(h.charms || {})) {
    const t = tierInfo(track);
    if (!best || t.value > best.t.value) best = { family, t };
  }
  if (!best || best.t.value <= 0) return '魅了：なし';
  return `魅了：${ENEMY_FAMILY_LABELS[best.family] || best.family} 段階${best.t.stage} / ${Math.round(best.t.progress)}%`;
}

const _renderUINuteraBase = renderUI;
renderUI = function () {
  _renderUINuteraBase();
  const h = state.hero;
  if (!h) return;
  ensureNuteraState(h);
  setMeter('nuteraFill', h.nutera);
  setMeter('lumaneFill', tierInfo(h.lumane).progress);
  setMeter('hypnosisFill', tierInfo(h.hypnosis).progress);
  setMeter('sailFill', h.sailState.value);
  $('nuteraText').textContent = `${h.nutera.toFixed(1)} / 100`;
  $('lumaneText').textContent = tierLabel('ルマネ', h.lumane);
  $('hypnosisText').textContent = tierLabel('催眠', h.hypnosis);
  $('sailText').textContent = `セイル ${h.sailState.value.toFixed(1)}%`;
  $('charmText').textContent = bestCharmText(h);
  const floors = `下限 L:${Math.round(ringFloor(h,'lumane'))} / S:${Math.round(ringFloor(h,'sail'))}%`;
  $('ringText').textContent = h.ringmarks.length
    ? `輪紋：${h.ringmarks.map(r => r.name).join('・')}（${floors}）`
    : '輪紋：なし';
  $('estellaText').textContent = h.estella.active
    ? `ESTELLA ${h.estella.t.toFixed(1)}s / MP漏出・SP大消耗`
    : `エステラ回数 ${h.estella.count}`;
  $('desireText').textContent = `欲求波 ${Math.round(h.lumaneWave * 100)}% / 対${state.enemy.familyName || '敵'}欲求 ${Math.round(lumaneDesire(h,state.enemy.family) * 100)}%`;
  document.querySelectorAll('[data-tool]').forEach(b => {
    const k = b.dataset.tool, tool = DIRECTOR_TOOLS[k];
    if (!tool) return;
    const cd = state.director.cd[k] || 0;
    b.title = `${tool.desc} / EN ${tool.cost}${cd > 0 ? ` / CD ${cd.toFixed(1)}s` : ''}`;
  });
};

function drawNuteraOverlay() {
  const h = state.hero;
  if (!h) return;
  const w = 84, x = h.x - w / 2, y = h.y + 48;
  ctx.fillStyle = '#241329cc';
  ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = '#d991ed';
  ctx.fillRect(x, y, w * clamp(h.nutera / 100, 0, 1), 7);
  ctx.strokeStyle = '#f1c8ff';
  ctx.strokeRect(x, y, w, 7);

  if (h.estella.active) {
    const pulse = 34 + Math.sin(state.time * 13) * 7;
    ctx.beginPath();
    ctx.arc(h.x, h.y, pulse, 0, TAU);
    ctx.strokeStyle = '#f1d7ffcc';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (h.ringmarks.length) {
    ctx.beginPath();
    ctx.arc(h.x, h.y, 24, 0, TAU);
    ctx.strokeStyle = '#cf8cffbb';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (const z of state.hazards) {
    if (z.kind !== 'directorRingBeam' || z.fired) continue;
    const x2 = z.start.x + Math.cos(z.ang) * z.range;
    const y2 = z.start.y + Math.sin(z.ang) * z.range;
    ctx.save();
    ctx.globalAlpha = .34 + .28 * Math.max(0, 1 - z.beamT / .82);
    ctx.strokeStyle = '#df9dff';
    ctx.lineWidth = z.width;
    ctx.beginPath();
    ctx.moveTo(z.start.x, z.start.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = .95;
    ctx.strokeStyle = '#f8e4ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}
const _drawNuteraBase = draw;
draw = function () {
  _drawNuteraBase();
  drawNuteraOverlay();
};

addEventListener('keydown', e => {
  if (e.code === 'Digit4') {
    state.director.selected = 'ringbeam';
    renderUI();
  }
});

renderUI();
