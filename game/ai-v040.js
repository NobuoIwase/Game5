(()=>{
'use strict';
/* v0.40.0 monsters that want to live.
   - badly hurt (a quarter of its life or less), a monster may break off and flee from her for a
     few seconds, crying out: any monster within earshot that has not noticed her yet does now
     (the cry is heard farther than the ordinary call). Once it has caught its breath it comes
     back. Rooted and mindless ones (the mushroom, the stone sentinel, the queen) never flee. */
const C={at:.25,chance:.55,t:[2.2,3.2],speed:1.25,cry:520};
const NEVER={lure_cap:1,stone_sentinel:1};
const alive=()=>window.Game5MultiEnemy?.alive?.()||[];
const baseHurtE=hurtEnemy;
hurtEnemy=function(dmg,opts={}){
 const e=state.enemy,r=baseHurtE(dmg,opts);
 if(e&&e.hp>0&&!e._fled&&!NEVER[e.type]&&!e._queen&&!e.grappling&&e.hp/e.maxHp<=C.at){
  e._fled=true;
  if(Math.random()<C.chance){
   e._fleeT=C.t[0]+Math.random()*(C.t[1]-C.t[0]);e.cast=null;e.actCd=Math.max(e.actCd||0,e._fleeT);
   addFx('text',e.x,e.y-(e.r||24)-30,'キィッ！','#ffb0b0',.9);
   window.Game5Message?.say?.(`${e.name}は 悲鳴をあげて 逃げだした！`,'flee',2);
   const N=window.Game5AI26?.notice;
   for(const o of alive())if(o!==e&&!o.aware&&!o.ambush&&Math.hypot(o.x-e.x,o.y-e.y)<C.cry){N?N(o,'call'):(o.aware=true,o.awareAt=state.time)}
  }
 }
 return r;
};
const EAI=window.Game5EnemyAI;
if(EAI?.move){const m=EAI.move;EAI.move=function(e,h,dt){
 if(!(e._fleeT>0))return m(e,h,dt);
 e._fleeT-=dt;
 const dx=e.x-h.x,dy=e.y-h.y,d=Math.hypot(dx,dy)||1,sp=(e.moveSpeed||69)*C.speed*(e.slow>0?.55:1);
 let vx=dx/d,vy=dy/d;const it=window.Game5Dungeon?.steer?.(e,{kind:'move',x:vx,y:vy});if(it){const l=Math.hypot(it.x,it.y)||1;vx=it.x/l;vy=it.y/l}
 const nx=e.x+vx*sp*dt,ny=e.y+vy*sp*dt;if(!window.Game5Dungeon?.blockedAt?.(e,nx,ny)){e.x=nx;e.y=ny}
 e.moving=true;e._aiMoved=true;e.decision='逃げている';
 if(e._fleeT<=0){e.actCd=.6;e.decision='戻ってくる'}
 return true;
}}
const baseChoose=chooseEnemyAction;
chooseEnemyAction=function(){const e=state.enemy;if(e?._fleeT>0){e.actCd=.3;e.decision='逃げている';return}return baseChoose()};
window.Game5AI40={version:'0.40.0',cfg:C};
})();
