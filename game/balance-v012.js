(()=>{
'use strict';
/* v0.12.0 balance table. Every tuned number lives here so it can be adjusted in one place.
   Verified with `node tools/sim.js 60` (AUTO director ON) and `--no-auto`. */
const B={
 hero:{spRegen:8,bindDrain:7.2,atkScale:.3},   // atkScale: share of ATK growth that reaches skill damage
 estella:{estellaDuration:2.3,estellaSpLoss:10,estellaMpLoss:8,naturalDecay:4.5,naturalDelay:2,sailAmpAt100:.6,estellaNuteraMin:32,estellaNuteraMax:40},   // v0.38: slower to the top, slower to cool, a softer landing
 // arriving on a new floor = a short rest on the stairs
 stairs:{hp:.22,sp:.45,nutera:30,sail:20},
 enemyHpGrowth:.12,            // per dungeon level (was .15)
 supportHp:.7,                // support enemies in mixed encounters
 director:{autoMin:8.5,autoMax:12,ringMin:9,ringMax:13,calmRooms:2,calmMul:1.35,enRegen:6},
 // AUTO director intensity (selectable in the UI): interval multiplier and extra aim error in px
 intensity:{easy:{label:'やさしい',interval:9,err:100},normal:{label:'ふつう',interval:7.5,err:70},hard:{label:'きびしい',interval:4,err:40}},
 snare:{sp:15,bind:1.35},
 xp:[0,0,70,190,360,590,880,1240,1680],   // Lv8 cap, reached around the 6th floor
 sailDecay:3.2,                          // was 1.3: Sail no longer pins at 100%
 zoneMul:.6,                             // environmental field strength
 // after an Estella the body is briefly desensitised so one event cannot chain into another
 afterEstella:{t:4.5,nuteraMul:.45,sailKeep:.5},
 estellaBindDrainMul:.5,        // binds landing while she is already convulsing drain less
 bindImmune:1.6,                // seconds after breaking free in which a new bind cannot take hold
 // support monsters per floor: difficulty now rises 1,2,2,2,2,3,3 instead of spiking on floor 5
 // v0.26: holds and punishing make crowds much harsher; the last floors keep one support each
 // v0.27: the floors are 4 screens wide, so more monsters spread over them (3-4 per floor);
 // they only fight together when one calls the others
 supports:[['leech'],['leech','slug','leech'],['moth','worm','leech'],['leech','slug','orb'],['orb','slug'],['orb','leech','moth'],['moth']],
 poolChance:.5,                  // chance that a support slot is taken by a pool species (species.json "mode":"pool")
 enemySpMul:.6,                 // SP damage of monster attacks
 // mucus/spore clouds are about Nutera, not pain: most of the old v0.3 poison is gone
 fog:{enemy:{hp:1,poison:1.2,slow:1.0,sp:.9},director:{hp:1,poison:1.6,slow:.8,sp:1.8}},
 poisonDmg:2
};
// tools/sim.js can inject overrides to sweep values: {"hero":{"spRegen":7}}
(function merge(t,o){for(const k in o||{})if(o[k]&&typeof o[k]==='object'&&!Array.isArray(o[k]))merge(t[k]||={},o[k]);else t[k]=o[k]})(B,window.__balanceOverride);
Game5MultiEnemy.supports.splice(0,Game5MultiEnemy.supports.length,...B.supports);
const baseHurt=hurtHero;
hurtHero=function(h,dmg,status=null,meta={}){
 if(meta?.sourceKey&&meta.spDamage)meta={...meta,spDamage:meta.spDamage*B.enemySpMul};
 if(status?.bind&&h&&((h.bindImmuneT||0)>0||h.estella?.active)){
  status={...status};delete status.bind;
  addFx('text',h.x,h.y-78,'振りほどいた直後','#cfe8ff',.7);
 }
 return baseHurt(h,dmg,status,meta);
};
XP_TABLE.splice(0,XP_TABLE.length,...B.xp);
NUTERA_CFG.sailDecay=B.sailDecay;
for(const r of Game5Dungeon.rooms)for(const z of r.zones||[])for(const k of ['sail','lumane','hypnosis','charm'])if(z[k])z[k]=+(z[k]*B.zoneMul).toFixed(2);
const baseNutera=applyNutera;
applyNutera=function(h,base,meta={}){
 if(h&&(h.afterEstellaT||0)>0)meta={...meta,mult:(meta.mult||1)*B.afterEstella.nuteraMul};
 return baseNutera(h,base,meta);
};

const baseMake=makeHero;
makeHero=function(){const h=baseMake();Object.assign(h,B.hero,{poisonDmg:B.poisonDmg});return h};
Object.assign(NUTERA_CFG,B.estella);
Object.assign(DIRECTOR_TOOLS.snare,B.snare);
Object.assign(FOG_TICK.enemy,B.fog.enemy);Object.assign(FOG_TICK.director,B.fog.director);

const baseApply=Game5Monsters.apply;
Game5Monsters.apply=function(type,level=1){
 const p=baseApply(type,level),e=state.enemy;
 if(p&&e){e.maxHp=e.hp=Math.round(p.hp*(1+(level-1)*B.enemyHpGrowth))}
 return p;
};
function supportHp(){
 const list=state.enemies||[];
 for(const e of list.slice(1))if(!e._hpTuned){e._hpTuned=true;e.maxHp=e.hp=Math.round(e.maxHp*B.supportHp)}
}

const baseHero=updateHero;
updateHero=function(h,dt){
 const room=state.dungeon?.room;
 baseHero(h,dt);
 supportHp();
 if(state.dungeon&&h._room!=null&&room!==state.dungeon.room&&!h.dead){
  const s=B.stairs;
  h.hp=Math.min(h.maxHp,h.hp+h.maxHp*s.hp);h.sp=Math.min(h.maxSp,h.sp+h.maxSp*s.sp);
  h.nutera=Math.max(0,h.nutera-s.nutera);if(h.sailState)h.sailState.value=Math.max(ringFloor(h,'sail'),h.sailState.value-s.sail);
  h.attachments=[];h.status.poison=0;h.status.slow=0;
  log('階段で呼吸を整えた。HP・SPが少し戻る。');
  addFx('text',h.x,h.y-64,'小休止','#bff0c8',1.2);
 }
 h._room=state.dungeon?.room;
 const est=!!h.estella?.active;
 if(h._est&&!est){
  h.afterEstellaT=B.afterEstella.t;
  if(h.sailState)h.sailState.value=Math.max(ringFloor(h,'sail'),h.sailState.value*B.afterEstella.sailKeep);
 }
 if((h._bind||0)>0&&h.status.bind<=0)h.bindImmuneT=B.bindImmune;
 h._bind=h.status.bind;h.bindImmuneT=Math.max(0,(h.bindImmuneT||0)-dt);
 h._est=est;h.bindDrain=B.hero.bindDrain*(est?B.estellaBindDrainMul:1);h.afterEstellaT=Math.max(0,(h.afterEstellaT||0)-dt);
};

const baseDirector=updateDirector;
updateDirector=function(dt){
 const d=state.director,a=d.autoT,r=d.ringAutoT;
 d.en=Math.max(0,d.en-dt*(8-B.director.enRegen));  // base regenerates 8/s
 baseDirector(dt);
 const lv=B.intensity[d.intensity||'normal']||B.intensity.normal;
 const calm=((state.dungeon?.room??9)<B.director.calmRooms?B.director.calmMul:1)*lv.interval;
 if(d.autoT>a)d.autoT=rnd(B.director.autoMin,B.director.autoMax)*calm;
 if(r!=null&&d.ringAutoT>r)d.ringAutoT=rnd(B.director.ringMin,B.director.ringMax)*calm;
};
const basePlace=placeDirectorTool;
placeDirectorTool=function(kind,x,y,auto=false){
 if(auto&&kind!=='ringbeam'){
  const lv=B.intensity[state.director.intensity||'normal']||B.intensity.normal,a=Math.random()*TAU,r=Math.random()*lv.err;
  x+=Math.cos(a)*r;y+=Math.sin(a)*r;
 }
 return basePlace(kind,x,y,auto);
};
window.Game5Balance=B;
})();
