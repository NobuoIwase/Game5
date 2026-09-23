
(() => {
  'use strict';

  if (typeof resolveEnemy === 'function') {
    const baseResolveEnemy = resolveEnemy;
    resolveEnemy = function(cast) {
      const enemy = state.enemy;
      const hero = state.hero;
      const key = cast?.key;
      const beforeBind = hero?.status?.bind || 0;
      const result = baseResolveEnemy(cast);
      if (
        enemy &&
        key === 'bind' &&
        (hero?.status?.bind || 0) > beforeBind
      ) {
        enemy.bindVisualUntil =
          state.time + Math.max(0.9, hero.status.bind);
      }
      return result;
    };
  }

  if (window.Game5Graphics?.drawEnemy) {
    const baseDrawEnemy = window.Game5Graphics.drawEnemy;
    window.Game5Graphics.drawEnemy = function(enemy) {
      const hero = state.hero;
      const bind = hero?.status?.bind || 0;
      const ownsBind =
        enemy?.cast?.key === 'bind' ||
        (enemy?.bindVisualUntil || 0) > state.time;

      if (hero && !ownsBind) hero.status.bind = 0;
      const result = baseDrawEnemy(enemy);
      if (hero) hero.status.bind = bind;
      return result;
    };
  }

  window.Game5BindVisual = { version: '0.11.0' };
})();
