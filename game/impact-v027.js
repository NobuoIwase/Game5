(()=>{
'use strict';
/* v0.27.0 weight for her attacks.
   - the lunge: while a melee cast steps her in, she is drawn with the RUN sheet (fast
     frames, forward lean from the art itself) instead of the rig pose, with dust at her feet;
     the rig takes over for the cut once she has closed in. The step is also quicker.
   - the hit: a short hit-stop (the whole game slows for a few frames), the camera kicks along
     the cut, the monster squashes and is shoved back, and the screen shakes; a heavy cut does
     all of it harder. Being hit gives her a smaller version of the same.
   Numbers are in C. */
const C={
 stepSpeed:1.35,
 stop:{melee:.1,bash:.12,heavy:.2,hurt:.08},   // v0.35: longer, so the hit is felt
 push:{melee:16,bash:26,heavy:42},
 kick:{melee:7,bash:9,heavy:15,hurt:6},
 shake:{melee:3,bash:4,heavy:8}
};
/* ---- hit-stop: the world runs at a crawl for a moment ---- */
let stopT=0;
const baseUpdate=update;
update=function(dt){if(stopT>0){stopT-=dt;dt*=.07}return baseUpdate(dt)};
const stop=t=>{stopT=Math.max(stopT,t)};

/* ---- lunge ---- */
const baseHero=updateHero;
updateHero=function(h,dt){
 const c=h?.cast,px=h?.x,py=h?.y;
 if(c&&['melee','bash','heavy'].includes(c.sk?.kind)&&!c._fast){c._fast=true;c.sk={...c.sk,stepSpeed:(c.sk.stepSpeed||300)*C.stepSpeed}}
 baseHero(h,dt);
 if(!h)return;
 const moved=Math.hypot(h.x-px,h.y-py);
 if(c&&h.cast===c&&moved>dt*60){h._lungeT=.1;if(Math.random()<dt*25)window.Game5FX?.burst?.(h.x-Math.cos(h.facing)*10,h.y+4,'#8a7a64',3,60,.35,2.2)}
 h._lungeT=Math.max(0,(h._lungeT||0)-dt);
};
const WM=window.WarriorMotion;
// v0.44: the step-in is drawn by the rig's overhead cut now (warrior-motion.js), not as running frames
if(typeof heroSpriteSample==='function'){
 const b=heroSpriteSample;
 heroSpriteSample=function(h){
  if(!(h._lungeT>0))return b(h);
  const a=state.images.get(h.id),im=a?.run?.complete&&a.run.naturalWidth?a.run:a?.walk;
  return{image:im,frame:Math.floor(state.time/.05)%8};
 };
}

/* ---- the hit ---- */
let hitting=null;
const baseResolve=resolveHero;
resolveHero=function(h,cast){hitting=cast?.sk?.kind||null;try{return baseResolve(h,cast)}finally{hitting=null}};
const baseHurtE=hurtEnemy;
hurtEnemy=function(dmg,opts={}){
 const e=state.enemy,h=state.hero,k=hitting,hp0=e?.hp;
 const r=baseHurtE(dmg,opts);
 if(!k||!e||!h||!C.push[k]||e.hp>=hp0)return r;
 stop(C.stop[k]);
 const a=Math.atan2(e.y-h.y,e.x-h.x);
 window.Game5Camera?.kick?.(Math.cos(a)*C.kick[k],Math.sin(a)*C.kick[k]);
 window.Game5FX?.shake?.(C.shake[k]);
 e.squash=1;e.squashA=a;e._hitT=C.stop[k]+.03;
 window.Game5Impact?.flash?.(k==='heavy'?.22:.12);
 if(!e.grappling&&!e.dash&&e.hp>0){
  const d=C.push[k],blocked=window.Game5Dungeon?.blockedAt;let tx=e.x,ty=e.y;
  for(let s=4;s<=d;s+=4){const nx=e.x+Math.cos(a)*s,ny=e.y+Math.sin(a)*s;if(blocked?.(e,nx,ny))break;tx=nx;ty=ny}
  if(Math.hypot(tx-e.x,ty-e.y)>3)e.dash={x0:e.x,y0:e.y,x1:tx,y1:ty,t:0,T:.22,ang:a,knock:true};   // v0.45: .13s read as a jump
 }
 return r;
};
const baseHurtH=hurtHero;
hurtHero=function(h,dmg,status=null,meta={}){
 const hp0=h?.hp,r=baseHurtH(h,dmg,status,meta);
 if(h&&h.hp<hp0&&meta?.sourceKey){stop(C.stop.hurt);flash(.18,'255,60,90');const e=state.enemy;if(e){const a=Math.atan2(h.y-e.y,h.x-e.x);window.Game5Camera?.kick?.(Math.cos(a)*C.kick.hurt,Math.sin(a)*C.kick.hurt)}}
 return r;
};
/* squash-and-stretch on the monster that was hit */
const G=window.Game5Graphics;
if(G){
 const prev=G.enemyTransform;
 G.enemyTransform=function(e){
  prev?.(e);const s=e?.squash||0;if(!(s>0))return;
  e.squash=Math.max(0,s-1/60/.18);
  const k=Math.sin(s*Math.PI)*.22,a=e.squashA||0;
  ctx.translate(e.x,e.y);ctx.rotate(a);ctx.scale(1-k,1+k*.8);ctx.rotate(-a);ctx.translate(-e.x,-e.y);
 };
}
/* v0.35: a white flash over the whole screen on a hit, a red one when she is hit */
let flashA=0,flashC='255,255,255';
function flash(a,c='255,255,255'){flashA=Math.max(flashA,a);flashC=c}
const bDraw=draw;draw=function(){bDraw();if(flashA>0){screenSpace(()=>{ctx.save();ctx.globalAlpha=flashA;ctx.fillStyle=`rgb(${flashC})`;ctx.globalCompositeOperation='lighter';ctx.fillRect(0,0,SW,SH);ctx.restore()});flashA=Math.max(0,flashA-.04)}};
window.Game5Impact={version:'0.35.0',cfg:C,stop,flash};
})();
