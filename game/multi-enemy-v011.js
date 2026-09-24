(()=>{
'use strict';
const SUPPORTS=[[],['slug'],['leech'],['moth'],['slug','leech'],['orb'],['worm','moth']];
function installSkills(type){
 const d=window.Game5MonsterSkills?.defs?.[type]||window.Game5MonsterSkills?.defs?.gel;if(!d)return;
 for(const k of Object.keys(d)){const [name,patch]=d[k];ENEMY_LABELS[k]=name;Object.assign(ENEMY_SKILLS[k],patch,{name})}
}
const oldStart=startEnemySkill;
startEnemySkill=function(key,target){
 const prev=ENEMY_SKILLS[key],copy={...prev,status:prev.status?{...prev.status}:undefined};ENEMY_SKILLS[key]=copy;
 const ok=oldStart(key,target);ENEMY_SKILLS[key]=prev;return ok
};
function make(type,x,y,level){
 const p=state.enemy,e={...p,cast:null};state.enemy=e;Game5Monsters.apply(type,level);e.x=x;e.y=y;state.enemy=p;return e
}
/* per-floor pools (species with "mode":"pool"): each support slot has a chance to be taken by a
   pool species, so runs vary without making a floor larger; one species appears once per floor */
const POOLS=[];
function roll(i){
 const base=SUPPORTS[i]||[],pool=(POOLS[i]||[]).slice(),out=[];
 for(const t of base){
  const k=pool.length&&Math.random()<(window.Game5Balance?.poolChance??.5)?(Math.random()*pool.length)|0:-1;
  out.push(k>=0?pool.splice(k,1)[0]:t);
 }
 return out;
}
function alive(){return(state.enemies||[]).filter(e=>e&&e.hp>0)}
function focusKnowledge(e,h=state.hero){
 if(!e||!h)return;h.memory.enemyId=e.type;h.knowledgeBySpecies||={};h.knowledgeBySpecies[e.type]||={cleave:0,charge:0,bind:0,fog:0,bolt:0};h.knowledge=h.knowledgeBySpecies[e.type]
}
function threatScore(e,h){
 const d=h?dist(h,e):0,cast=e.cast?-150:0,vis=h&&inCone(e.x,e.y,h.x,h.y,h.facing,h.visionRange+h.r,h.visionHalf)?-45:0,ph=e.phase===2?-20:0;return d+cast+vis+ph
}
function primary(h=state.hero){
 const a=alive();if(!a.length)return state.enemy;let b=a[0],bs=threatScore(b,h);
 for(const e of a.slice(1)){const s=threatScore(e,h);if(s<bs){b=e;bs=s}}
 state.enemy=b;installSkills(b.type);focusKnowledge(b,h);return b
}
function separate(list){
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
  const a=list[i],b=list[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.001,min=(a.r||24)+(b.r||24)+8;
  if(d>=min)continue;const p=(min-d)*.5,nx=dx/d,ny=dy/d;a.x-=nx*p;a.y-=ny*p;b.x+=nx*p;b.y+=ny*p;
  Game5Dungeon?.resolveEntity?.(a);Game5Dungeon?.resolveEntity?.(b)
 }
}
function setup(){
 if(!state.dungeon?.active)return;const i=state.dungeon.room;if(state._multiRoom===i)return;state._multiRoom=i;   /* once per floor: clearing it must not respawn the supports */
 const main=state.enemy,defs=roll(i),r=Game5Dungeon.room(),lv=1+Math.floor(i/2),pts=r.spawnPts?.length?[...r.spawnPts,r.spawnPts[0]]:[[r.spawn[0]-105,r.spawn[1]+95],[r.spawn[0]+75,r.spawn[1]-105],[r.spawn[0]-150,r.spawn[1]-95]];
 state.enemies=[main];defs.forEach((t,j)=>state.enemies.push(make(t,clamp(pts[j][0],70,W-70),clamp(pts[j][1],70,H-70),lv)));
 primary();log(`敵編成 ${state.enemies.map(e=>e.name).join(' / ')}`)
}
const dungeonFinish=finish;
finish=function(win){
 if(win&&state.dungeon?.active){const rest=alive();if(rest.length){primary();state.enemy.decision='仲間の気配を警戒';return}}
 return dungeonFinish(win)
};
const baseHero=updateHero;
updateHero=function(h,dt){setup();primary(h);baseHero(h,dt);primary(h)};
const baseEnemy=updateEnemy;
updateEnemy=function(dt){
 setup();const list=alive();
 if(!list.length){state.enemies=[];if(!state.dungeon?.pending)dungeonFinish(true);return}
 for(const e of list){state.enemy=e;installSkills(e.type);focusKnowledge(e);baseEnemy(dt)}
 separate(alive());primary()
};
const baseReset=reset;
reset=function(){baseReset();state._multiRoom=-1;setup()};
window.Game5MultiEnemy={version:'0.11.0',supports:SUPPORTS,pools:POOLS,roll,alive,primary,setup,separate,focusKnowledge};
})();
