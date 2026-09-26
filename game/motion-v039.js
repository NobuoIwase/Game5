(()=>{
'use strict';
/* v0.39.0 motion that reads as natural.
   - steps follow the ground covered: the walk and run cycles advance with the distance she
     actually moves (a slow drift is slow steps, a dash is quick ones), so her feet no longer
     slide, and a stop lands on the nearest planted foot instead of freezing mid-stride
   - she leans into her movement: a little forward when running sideways, and she tips back a
     touch when she pulls up hard
   - a flinch pushes her away from whatever hit her (the rig pose eases in and out: see
     warrior-motion-extra.js, blend)
   - the rig poses themselves no longer snap from one to the next (same file) */
const C={walkCycle:150,runCycle:128,lean:.07,brake:.09,kb:7};
const alive=()=>window.Game5MultiEnemy?.alive?.()||[];
/* ---- distance-driven step phase ---- */
let px=null,py=null;
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h)return;
 if(px==null){px=h.x;py=h.y}
 const vx=(h.x-px)/Math.max(dt,1e-4),vy=(h.y-py)/Math.max(dt,1e-4),d=Math.hypot(h.x-px,h.y-py);px=h.x;py=h.y;
 if(d>40){h._stepPh=0;return}                              // teleported (stairs, reset): no spin of the legs
 // v0.39: stepping back out of reach she keeps her eyes on the monster and walks backward
 if(h.moving&&/間合い/.test(h.intent?.label||'')){const e=alive().filter(e=>e.aware).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];
  if(e&&typeof dirFrom==='function'){h.dir=dirFrom(e.x-h.x,e.y-h.y);h._backstep=true}}else h._backstep=false;
 const run=h.motion==='run',cyc=run?C.runCycle:C.walkCycle,back=h._backstep?-1:1;
 if(h.moving)h._stepPh=(((h._stepPh||0)+back*d/cyc*8)%8+8)%8;
 else if(h._stepPh%4>.01){const t=Math.round(h._stepPh/4)*4;h._stepPh+=(t-h._stepPh)*Math.min(1,dt*14);if(Math.abs(t-h._stepPh)<.05)h._stepPh=t%8}   // settle onto a planted foot
 // lean: toward the way she moves, and back for a moment when she stops short
 const sp=Math.hypot(vx,vy),lx=sp>1?vx/(h.speed||158):0;h._mv={x:vx,y:vy,s:sp};
 if(h._spPrev>120&&sp<20)h._brakeT=.18;
 h._spPrev=h.moving?sp:0;h._brakeT=Math.max(0,(h._brakeT||0)-dt);
 const want=Math.max(-1,Math.min(1,lx))*C.lean*(run?1:.45)-(h._brakeT>0?Math.sign(h._leanDir||0)*C.brake*h._brakeT/.18:0);
 if(Math.abs(lx)>.2)h._leanDir=Math.sign(lx);
 h._lean=(h._lean||0)+(want-(h._lean||0))*Math.min(1,dt*10);
};
const baseSample=heroSpriteSample;
heroSpriteSample=function(h){
 const q=baseSample(h);
 if(!(h._lungeT>0)&&h._stepPh!=null&&!h.cast)q.frame=Math.floor(h._stepPh)%8;
 if(h._backstep){const a=state.images.get(h.id);if(a?.walk?.complete){q.image=a.walk;h.motion='walk'}}   // backing off is a walk, never a run
 return q;
};
/* ---- lean the whole walking sprite about her feet ---- */
const baseWalk=drawWalkFrame;
drawWalkFrame=function(im,frame,row,x,y,dir){
 const h=state.hero,l=h?._lean||0;
 if(Math.abs(l)<.004)return baseWalk(im,frame,row,x,y,dir);
 const fx=x+42,fy=y+108;ctx.save();ctx.translate(fx,fy);ctx.rotate(l);ctx.translate(-fx,-fy);baseWalk(im,frame,row,x,y,dir);ctx.restore();
};
/* ---- standing about: now and then she glances to one side and back ---- */
const DIRS=['front','down_right','right','up_right','back','up_left','left','down_left'];
const baseHero2=updateHero;
updateHero=function(h,dt){
 baseHero2(h,dt);
 if(!h||!state.started)return;
 const calm=!h.moving&&!h.cast&&!h.grapple&&!h.dead&&!h.estella?.active&&!h._tempt&&(h.status?.bind||0)<=0&&(h.status?.stun||0)<=0&&!alive().some(e=>e.aware&&Math.hypot(e.x-h.x,e.y-h.y)<300);
 const g=h._glance;
 if(!calm){h._idleT=0;if(g){h._glance=null}return}
 h._idleT=(h._idleT||0)+dt;
 if(g){g.t-=dt;if(g.t<=0){if(h.dir===g.to)h.dir=g.from;h._glance=null;h._nextGlance=h._idleT+3+Math.random()*4}return}
 if(h._idleT>(h._nextGlance??2.5)){const i=DIRS.indexOf(h.dir);if(i<0)return;const st=Math.random()<.5?1:-1,to=DIRS[(i+st*(Math.random()<.35?2:1)+8)%8];
  h._glance={from:h.dir,to,t:.8+Math.random()*.7};h.dir=to}
};
/* ---- flinch away from the blow ---- */
const baseHurt=hurtHero;
hurtHero=function(h,d,s,m){
 const r=baseHurt(h,d,s,m);
 if(h&&!h.dead&&d>0){const src=m?.source&&typeof m.source==='object'?m.source:state.enemy;
  const e=src&&src.x!=null?src:alive().sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];
  h._kbX=e?Math.sign(h.x-e.x||1)*C.kb*Math.min(1.6,.6+d/20):0}
 return r;
};
/* ---- monsters: recoil from a blow, a start when they notice her, a lean toward her as they come ---- */
const baseHurtE=hurtEnemy;
hurtEnemy=function(dmg,opts={}){
 const tgt=state.enemy,r=baseHurtE(dmg,opts),h=state.hero,d=+dmg||0;
 if(tgt&&h&&d>0){tgt._rcl={x:Math.sign(tgt.x-h.x||1),t:.26,T:.26,k:Math.min(1.5,.5+d/30)}}
 return r;
};
function monsterMotion(e){
 const h=state.hero,r=e.r||24,ax=e.x,ay=e.y+r*.85;let dx=0,dy=0,sx=1,sy=1,sk=0;
 if(e.aware&&!e._aw0){e._hop={t:.32,T:.32}}e._aw0=!!e.aware;
 if(e._hop){const u=1-e._hop.t/e._hop.T;dy-=Math.sin(u*Math.PI)*9;sy*=1+.12*Math.sin(u*Math.PI);sx*=1-.08*Math.sin(u*Math.PI);e._hop.t-=1/60;if(e._hop.t<=0)e._hop=null}
 if(e._rcl){const R=e._rcl,u=1-R.t/R.T,k=Math.sin(Math.min(1,u*1.6)*Math.PI)*R.k;dx+=R.x*10*k;sx*=1+.12*k;sy*=1-.14*k;sk-=R.x*.12*k;R.t-=1/60;if(R.t<=0)e._rcl=null}
 if(e.moving&&h&&!e.grappling){const lx=Math.max(-1,Math.min(1,(h.x-e.x)/200));e._lean=(e._lean||0)+(lx*.1-(e._lean||0))*.12}else e._lean=(e._lean||0)*.9;
 sk+=e._lean||0;
 // v0.41: it draws back while winding up and lunges at her as the attack goes off
 if(h){const hx=Math.sign(h.x-e.x||1),hy=Math.max(-1,Math.min(1,(h.y-e.y)/80));
  if(e.cast&&e.cast.total>0){const u=Math.max(0,Math.min(1,1-Math.max(0,e.cast.t)/e.cast.total));dx-=hx*5*u;e._lg0=true}
  else if(e._lg0){e._lg0=false;if(!e.grappling&&e.type!=='lure_cap')e._lg={t:.22,T:.22,x:hx,y:hy}}
  if(e._lg){const u=1-e._lg.t/e._lg.T,k=Math.sin(u*Math.PI);dx+=e._lg.x*16*k;dy+=e._lg.y*8*k;e._lg.t-=1/60;if(e._lg.t<=0)e._lg=null}}
 if(!dx&&!dy&&sx===1&&sy===1&&Math.abs(sk)<.002)return;
 ctx.translate(ax+dx,ay+dy);if(sk)ctx.transform(1,0,-sk,1,0,0);ctx.scale(sx,sy);ctx.translate(-ax,-ay);
}
const G=window.Game5Graphics;
if(G){const prev=G.enemyTransform;G.enemyTransform=function(e){if(e&&e.hp>0&&!e._ghost&&state.started)monsterMotion(e);prev?.(e)}}
const baseReset=reset;reset=function(){const r=baseReset();px=py=null;const h=state.hero;if(h){h._stepPh=0;h._lean=0;h._pb=null}return r};
window.Game5Motion39={version:'0.39.0',cfg:C};
})();
