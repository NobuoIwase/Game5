'use strict';

const NUTERA_CFG = {
  max: 100,
  naturalDelay: 1.25,
  naturalDecay: 5.2,
  estellaDuration: 2.65,
  estellaNuteraMin: 22,
  estellaNuteraMax: 30,
  estellaMpLoss: 10,
  estellaSpLoss: 34,
  sailAmpAt100: 1.0,
  lumaneDecay: 1.15,
  hypnosisDecay: 0.72,
  charmDecay: 0.48,
  sailDecay: 1.3
};

const ENEMY_FAMILY_LABELS = {
  gray_crown: '灰冠種',
  slug: 'ナメクジ種',
  worm: 'ワーム種',
  leech: '吸液羽虫種',
  gazer: '眼魔種',
  demon: '淫魔種'
};

function makeTierTrack() {
  return { value: 0, lastGain: -99 };
}
function tierInfo(track) {
  const value = clamp(track?.value || 0, 0, 300);
  if (value >= 300) return { stage: 3, progress: 100, value: 300 };
  const stage = Math.floor(value / 100);
  return { stage, progress: value - stage * 100, value };
}
function ensureNuteraState(h) {
  if (!h) return h;
  if (h.nutera == null) h.nutera = 0;
  if (h.nuteraLastGain == null) h.nuteraLastGain = -99;
  if (!h.estella) h.estella = { active: false, t: 0, total: 0, target: 26, count: 0 };
  if (!h.lumane) h.lumane = makeTierTrack();
  if (!h.hypnosis) h.hypnosis = makeTierTrack();
  if (!h.charms) h.charms = {};
  if (!h.sailState) h.sailState = { value: 0, lastGain: -99 };
  if (!h.ringmarks) h.ringmarks = [];
  if (h.lumaneWave == null) h.lumaneWave = 0;
  return h;
}
function ringFloor(h, key, family = '') {
  ensureNuteraState(h);
  let floor = 0;
  for (const r of h.ringmarks) {
    if (key === 'charm') floor = Math.max(floor, r.charmFloors?.[family] || 0);
    else floor = Math.max(floor, r[`${key}Floor`] || 0);
  }
  return floor;
}
function applyTiered(h, key, amount, meta = {}) {
  ensureNuteraState(h);
  const track = key === 'charm'
    ? (h.charms[meta.family] ||= makeTierTrack())
    : h[key];
  if (!track || amount <= 0) return;
  const before = tierInfo(track);
  track.value = clamp(track.value + amount, 0, 300);
  track.lastGain = state.time;
  const after = tierInfo(track);
  if (after.stage > before.stage) {
    const label = key === 'lumane' ? 'ルマネ' : key === 'hypnosis' ? '催眠' :
      `${ENEMY_FAMILY_LABELS[meta.family] || meta.family || '対象'}への魅了`;
    log(`${label}が段階${after.stage}へ進行。`);
    addFx('text', h.x, h.y - 70, `${label} ${after.stage}`, '#f0c9ff', 1.1);
  }
}
function applySail(h, amount) {
  ensureNuteraState(h);
  if (amount <= 0) return;
  h.sailState.value = clamp(h.sailState.value + amount, 0, 100);
  h.sailState.lastGain = state.time;
}
function addRingmark(h, mark) {
  ensureNuteraState(h);
  const id = mark.id || mark.name || `ring-${h.ringmarks.length}`;
  const old = h.ringmarks.find(r => r.id === id);
  if (old) {
    old.lumaneFloor = Math.max(old.lumaneFloor || 0, mark.lumaneFloor || 0);
    old.sailFloor = Math.max(old.sailFloor || 0, mark.sailFloor || 0);
    old.hypnosisFloor = Math.max(old.hypnosisFloor || 0, mark.hypnosisFloor || 0);
    old.charmFloors = { ...(old.charmFloors || {}), ...(mark.charmFloors || {}) };
  } else {
    h.ringmarks.push({
      id,
      name: mark.name || '輪紋',
      source: mark.source || '不明',
      lumaneFloor: mark.lumaneFloor || 0,
      sailFloor: mark.sailFloor || 0,
      hypnosisFloor: mark.hypnosisFloor || 0,
      charmFloors: mark.charmFloors || {}
    });
  }
  h.lumane.value = Math.max(h.lumane.value, ringFloor(h, 'lumane'));
  h.hypnosis.value = Math.max(h.hypnosis.value, ringFloor(h, 'hypnosis'));
  h.sailState.value = Math.max(h.sailState.value, ringFloor(h, 'sail'));
  log(`${mark.name || '輪紋'}が刻まれた。状態回復の下限が固定される。`);
  addFx('ring', h.x, h.y, '', '#d995ff', 1.1);
}
function triggerEstella(h, source = 'ヌテラ') {
  ensureNuteraState(h);
  if (h.estella.active || h.dead) return;
  const total = NUTERA_CFG.estellaDuration;
  h.estella.active = true;
  h.estella.t = total;
  h.estella.total = total;
  h.estella.target = rnd(NUTERA_CFG.estellaNuteraMin, NUTERA_CFG.estellaNuteraMax);
  h.estella.count++;
  h.cast = null;
  h.intent = { kind: 'hold', x: 0, y: 0 };
  h.status.stun = Math.max(h.status.stun, total);
  h.thought = 'エステラ……身体が動かない。MPとSPが抜けていく……。';
  log(`ESTELLA — ${source}でヌテラが飽和。`);
  addFx('ring', h.x, h.y, '', '#f2d6ff', 1.5);
}
function applyNutera(h, base, meta = {}) {
  ensureNuteraState(h);
  if (h.dead || base <= 0) return 0;
  const sail = h.sailState.value;
  const mult = (1 + (sail / 100) * NUTERA_CFG.sailAmpAt100) * (meta.mult || 1);
  const gain = base * mult * (h.estella.active ? 0.18 : 1);
  h.nutera = clamp(h.nutera + gain, 0, NUTERA_CFG.max);
  h.nuteraLastGain = state.time;
  h.nuteraSource = meta.source || '不明';
  if (gain >= 2.5) addFx('text', h.x + 18, h.y - 42, `ヌテラ +${gain.toFixed(1)}`, '#efb7ff', .8);
  if (h.nutera >= NUTERA_CFG.max - 1e-6) triggerEstella(h, meta.source || 'ヌテラ付与');
  return gain;
}
function charmStage(h, family) {
  ensureNuteraState(h);
  return tierInfo(h.charms[family] || makeTierTrack()).stage;
}
function lumaneDesire(h, family = '') {
  ensureNuteraState(h);
  const lum = tierInfo(h.lumane).stage;
  const charm = charmStage(h, family);
  return clamp(lum * 0.18 + lum * h.lumaneWave * 0.17 + charm * 0.17, 0, 1.5);
}
function decayTrack(track, floor, rate, dt) {
  if (!track) return;
  if (state.time - track.lastGain <= 1.5) return;
  track.value = Math.max(floor, track.value - rate * dt);
}
function updateNuteraSystem(h, dt) {
  ensureNuteraState(h);
  const lum = tierInfo(h.lumane);
  h.lumaneWave = lum.stage === 0 ? 0 :
    0.18 + 0.82 * (0.5 + 0.5 * Math.sin(state.time * (0.86 + lum.stage * 0.24) + lum.stage * 1.7));

  decayTrack(h.lumane, ringFloor(h, 'lumane'), NUTERA_CFG.lumaneDecay, dt);
  decayTrack(h.hypnosis, ringFloor(h, 'hypnosis'), NUTERA_CFG.hypnosisDecay, dt);
  for (const [family, track] of Object.entries(h.charms)) {
    decayTrack(track, ringFloor(h, 'charm', family), NUTERA_CFG.charmDecay, dt);
  }
  if (state.time - h.sailState.lastGain > 1.5) {
    h.sailState.value = Math.max(ringFloor(h, 'sail'), h.sailState.value - NUTERA_CFG.sailDecay * dt);
  }

  if (h.estella.active) {
    const before = h.estella.t;
    h.estella.t = Math.max(0, h.estella.t - dt);
    const slice = before > 0 ? Math.min(dt, before) : 0;
    h.mp = Math.max(0, h.mp - NUTERA_CFG.estellaMpLoss * slice / h.estella.total);
    drainSp(h, NUTERA_CFG.estellaSpLoss * slice / h.estella.total, '');
    const p = 1 - h.estella.t / h.estella.total;
    h.nutera = Math.max(h.estella.target, 100 - (100 - h.estella.target) * p);
    h.status.stun = Math.max(h.status.stun, h.estella.t + .05);
    if (h.estella.t <= 0) {
      h.estella.active = false;
      h.nutera = h.estella.target;
      h.status.stun = Math.max(h.status.stun, .42);
      h.thought = '……動ける。けれど、ヌテラがまだ残っている。';
      log(`エステラ終了。ヌテラは${Math.round(h.nutera)}%で残留。`);
    }
    return;
  }

  if (state.time - h.nuteraLastGain > NUTERA_CFG.naturalDelay) {
    h.nutera = Math.max(0, h.nutera - NUTERA_CFG.naturalDecay * dt);
  }
}
function nuteraCastHitsHero(cast, h) {
  if (!cast || !h) return false;
  const s = cast.sk;
  if (s.kind === 'circle') return Math.hypot(h.x - cast.target.x, h.y - cast.target.y) <= s.r + h.r;
  if (s.kind === 'line') {
    const x2 = cast.start.x + Math.cos(cast.ang) * s.range;
    const y2 = cast.start.y + Math.sin(cast.ang) * s.range;
    return pointSegDist(h.x, h.y, cast.start.x, cast.start.y, x2, y2) <= s.width / 2 + h.r;
  }
  if (s.kind === 'cone') return inCone(h.x, h.y, cast.start.x, cast.start.y, cast.ang, s.range + h.r, .66);
  return false;
}

/* ---- hook existing v0.3 battle without replacing its combat core ---- */
const _makeHeroNuteraBase = makeHero;
makeHero = function () {
  const h = _makeHeroNuteraBase();
  ensureNuteraState(h);
  return h;
};

const _resetNuteraBase = reset;
reset = function () {
  _resetNuteraBase();
  state.version = '0.4.0';
  ensureNuteraState(state.hero);
  state.enemy.family = 'gray_crown';
  state.enemy.familyName = ENEMY_FAMILY_LABELS.gray_crown;
  state.director.cd.ringbeam = 0;
  state.director.ringAutoT = 5.6;
};

const _statusTextNuteraBase = statusText;
statusText = function (h) {
  const base = _statusTextNuteraBase(h);
  ensureNuteraState(h);
  const extra = [];
  if (h.estella.active) extra.push('エステラ');
  const l = tierInfo(h.lumane), hy = tierInfo(h.hypnosis);
  if (l.stage) extra.push(`ルマネ${l.stage}`);
  if (hy.stage) extra.push(`催眠${hy.stage}`);
  if (h.ringmarks.length) extra.push(`輪紋${h.ringmarks.length}`);
  return [base === '正常' ? '' : base, ...extra].filter(Boolean).join('・') || '正常';
};

const _decideHeroNuteraBase = decideHero;
decideHero = function (h) {
  ensureNuteraState(h);
  if (h.estella.active) {
    h.intent = { kind: 'hold', x: 0, y: 0 };
    h.thought = 'エステラ中。痙攣で動けず、MPとSPが漏れていく。';
    return;
  }
  const family = state.enemy?.family || '';
  const desire = lumaneDesire(h, family);
  const hyp = tierInfo(h.hypnosis).stage;
  if (state.enemy?.cast && hyp > 0 && Math.random() < 0.055 * hyp) {
    h.intent = { kind: 'hold', x: 0, y: 0 };
    h.thought = '催眠の残響で危険への反応が一瞬遅れる……。';
    return;
  }
  if (h.nutera >= 78 && desire < .58 && state.enemy) {
    const dx = h.x - state.enemy.x, dy = h.y - state.enemy.y, len = Math.hypot(dx, dy) || 1;
    h.intent = { kind: 'move', x: dx / len, y: dy / len, speed: 1.18 };
    h.thought = 'ヌテラが危険域。これ以上受ける前に距離を取る。';
    return;
  }
  const lum = tierInfo(h.lumane);
  if (desire > .62 && h.lumaneWave > .76 && state.enemy && Math.random() < .10 + lum.stage * .06) {
    const dx = state.enemy.x - h.x, dy = state.enemy.y - h.y, len = Math.hypot(dx, dy) || 1;
    h.intent = { kind: 'move', x: dx / len, y: dy / len, speed: lum.stage >= 3 ? .36 : .18 };
    h.thought = lum.stage >= 3
      ? '危険だと分かっているのに、ヌテラを求める衝動で敵へ手を伸ばしてしまう……。'
      : 'ルマネの波が強い。敵から離れる判断が鈍る……。';
    return;
  }
  _decideHeroNuteraBase(h);
};

const _updateHeroNuteraBase = updateHero;
updateHero = function (h, dt) {
  ensureNuteraState(h);
  if (h.estella.active) {
    h.cast = null;
    h.intent = { kind: 'hold', x: 0, y: 0 };
    h.status.stun = Math.max(h.status.stun, .2);
  }
  _updateHeroNuteraBase(h, dt);
  updateNuteraSystem(h, dt);
};

const _resolveEnemyNuteraBase = resolveEnemy;
resolveEnemy = function (cast) {
  const h = state.hero;
  const hit = h && !h.dead && nuteraCastHitsHero(cast, h);
  _resolveEnemyNuteraBase(cast);
  if (!hit || !h || h.dead) return;
  switch (cast.key) {
    case 'cleave':
      applyNutera(h, h.status.bind > 0 ? 12 : 5, { source: '大薙ぎの呪圧' });
      break;
    case 'charge':
      applyNutera(h, 8, { source: '灰槍の呪圧' });
      break;
    case 'bind':
      applyNutera(h, 18, { source: '影縛り' });
      applyTiered(h, 'lumane', 20, { source: '影縛り' });
      break;
    case 'fog':
      applySail(h, 7);
      applyTiered(h, 'lumane', 10, { source: '蝕毒の霧' });
      break;
    case 'bolt':
      applyNutera(h, 11, { source: '黒雷' });
      applyTiered(h, 'hypnosis', 28, { source: '黒雷' });
      applyTiered(h, 'charm', 18, { family: state.enemy.family, source: '黒雷' });
      break;
  }
};

const _updateHazardsNuteraBase = updateHazards;
updateHazards = function (dt) {
  _updateHazardsNuteraBase(dt);
  const h = state.hero;
  if (!h || h.dead) return;
  for (const z of state.hazards) {
    if ((z.kind === 'enemyFog' || z.kind === 'directorFog') &&
        Math.hypot(h.x - z.x, h.y - z.y) < z.r + h.r) {
      z.nuteraTick = (z.nuteraTick ?? .1) - dt;
      if (z.nuteraTick <= 0) {
        z.nuteraTick = .72;
        applyNutera(h, z.kind === 'enemyFog' ? 5.2 : 4.0, { source: z.kind === 'enemyFog' ? '蝕毒の霧' : '瘴気壺' });
        applySail(h, z.kind === 'enemyFog' ? 2.4 : 1.8);
        applyTiered(h, 'lumane', z.kind === 'enemyFog' ? 3.0 : 2.1, { source: '霧' });
      }
    }
    if (z.kind === 'directorSnare' && z.triggered && !z.nuteraApplied) {
      z.nuteraApplied = true;
      applyNutera(h, 16, { source: '影杭拘束' });
      applyTiered(h, 'lumane', 9, { source: '影杭拘束' });
    }
    if (z.kind === 'directorRingBeam' && !z.fired) {
      z.beamT -= dt;
      if (z.beamT <= 0) {
        z.fired = true;
        z.t = Math.min(z.t, .35);
        const x2 = z.start.x + Math.cos(z.ang) * z.range;
        const y2 = z.start.y + Math.sin(z.ang) * z.range;
        if (pointSegDist(h.x, h.y, z.start.x, z.start.y, x2, y2) <= z.width / 2 + h.r) {
          applyNutera(h, 22, { source: '輪紋ビーム' });
          applySail(h, 12);
          applyTiered(h, 'lumane', 24, { source: '輪紋ビーム' });
          addRingmark(h, { id: 'ringbeam-I', name: '輪紋Ⅰ', source: '輪紋ビーム', lumaneFloor: 100, sailFloor: 24 });
        }
      }
    }
  }
};

DIRECTOR_TOOLS.ringbeam = {
  name: '輪紋ビーム',
  cost: 38,
  cd: 7.2,
  r: 24,
  desc: '予兆直線。命中で輪紋Ⅰを刻み、ルマネⅠ・セイル24%を回復下限として固定'
};
const _placeDirectorNuteraBase = placeDirectorTool;
placeDirectorTool = function (kind, x, y, auto = false) {
  if (kind !== 'ringbeam') return _placeDirectorNuteraBase(kind, x, y, auto);
  const d = state.director, t = DIRECTOR_TOOLS.ringbeam;
  if (!state.started || state.over || d.cd.ringbeam > 0 || d.en < t.cost) return false;
  const start = { x: W - 52, y: clamp(y, 65, H - 65) };
  const ang = Math.atan2(y - start.y, x - start.x);
  d.en -= t.cost;
  d.cd.ringbeam = t.cd;
  state.hazards.push({
    kind: 'directorRingBeam',
    x, y, r: 18, start, ang, range: 920, width: 46,
    t: 1.25, beamT: .82, fired: false
  });
  log(`${auto ? 'AUTO指揮' : 'プレイヤー'}：輪紋ビームを照準。`);
  return true;
};

const _updateDirectorNuteraBase = updateDirector;
updateDirector = function (dt) {
  _updateDirectorNuteraBase(dt);
  const d = state.director;
  if (!d || !d.auto || !state.started || state.over) return;
  d.ringAutoT = (d.ringAutoT ?? 5.6) - dt;
  if (d.ringAutoT <= 0) {
    d.ringAutoT = rnd(7.5, 11.0);
    const h = state.hero;
    if (h && !h.dead && d.cd.ringbeam <= 0 && d.en >= DIRECTOR_TOOLS.ringbeam.cost && Math.random() < .62) {
      placeDirectorTool('ringbeam', h.x + Math.cos(h.facing) * 38, h.y + Math.sin(h.facing) * 38, true);
    }
  }
};
