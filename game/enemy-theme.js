(() => {
'use strict';
Object.assign(ENEMY_LABELS,{
  cleave:'粘膜包み',
  charge:'滑走抱擁',
  bind:'粘糸拘束',
  fog:'濃密な粘霧',
  bolt:'共鳴波'
});
Object.assign(ENEMY_SKILLS.cleave,{name:'粘膜包み',damage:4,spDamage:8});
Object.assign(ENEMY_SKILLS.charge,{name:'滑走抱擁',damage:5,spDamage:12});
Object.assign(ENEMY_SKILLS.bind,{name:'粘糸拘束',damage:2,spDamage:12});
Object.assign(ENEMY_SKILLS.fog,{name:'濃密な粘霧',damage:1,spDamage:4});
Object.assign(ENEMY_SKILLS.bolt,{name:'共鳴波',damage:3,spDamage:6});
const baseReset=reset;
reset=function(){
  baseReset();
  state.enemy.id='gray_crown_gel';
  state.enemy.name='灰冠の粘魔';
  state.enemy.family='slime';
  state.enemy.familyName='粘魔種';
  state.enemy.decision='ぬめりを広げながら様子を見ている';
  state.hero.memory.enemyId='gray_crown_gel';
  log('灰冠の粘魔は、粘液と吸着でヌテラを高めようとしている。');
};
window.addEventListener('load',()=>{
  const s=document.createElement('script');
  s.src='./graphics-polish-v081.js';
  document.body.appendChild(s);
});
})();