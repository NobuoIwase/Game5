(()=>{
'use strict';
/* v0.38.0 distance matters.
   - the monsters: the closer she is when one starts a skill, the sooner it lands and the harder
     it hits (a hold or a blow at arm's length is their game); from far off it is slower
   - she knows it: she keeps a monster out of arm's reach when she can, steps in from the edge
     of her reach to strike, and steps back out right after (hit and away) */
const C={near:140,far:220,castNear:.15,castFar:.15,dmgNear:.2,tooClose:60,away:.35,back:.3};
const alive=()=>window.Game5MultiEnemy?.alive?.()||[];
const baseStart=startEnemySkill;
startEnemySkill=function(key,target){
 const e=state.enemy,h=state.hero,r=baseStart(key,target),c=e?.cast;
 if(!c||!h)return r;
 const d=Math.hypot(e.x-h.x,e.y-h.y),near=Math.max(0,Math.min(1,(C.near-d)/100)),far=Math.max(0,Math.min(1,(d-C.far)/200));
 const k=1-C.castNear*near+C.castFar*far;c.t*=k;c.total*=k;
 if(near>0&&c.sk){c.sk={...c.sk};if(c.sk.damage)c.sk.damage*=1+C.dmgNear*near;if(c.sk.spDamage)c.sk.spDamage*=1+C.dmgNear*near;c.closeIn=near}
 return r;
};
/* hit and away */
let hadCast=null;
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h)return;
 if(hadCast&&!h.cast&&['melee','bash','heavy'].includes(hadCast.sk?.kind))h._awayT=C.away;
 hadCast=h.cast||null;
 h._awayT=Math.max(0,(h._awayT||0)-dt);h._backT=Math.max(0,(h._backT||0)-dt);
};
const baseDecide=decideHero;
decideHero=function(h,dt){
 const r=baseDecide(h,dt);
 if(!h||h.dead||h.cast||h.grapple||h.estella?.active||(h.status?.bind||0)>0||state.dungeon?.pending)return r;
 const near=alive().filter(e=>e.aware).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];
 if(!near||r?.kind==='cast'||/回避|防御|構え/.test(r?.label||'')||h.intent?.label==='回避')return r;   // a dodge or a guard comes first
 if(near.cast&&!(h._awayT>0))return r;                                                         // it is already swinging: her own reading of it decides
 const dx=h.x-near.x,dy=h.y-near.y,d=Math.hypot(dx,dy)||1;
 // v0.40: with several around her, she backs away from all of them at once (the closer, the
 // more it counts), sliding along a wall rather than into it, so she is not caught between two
 const away=()=>{let ax=0,ay=0;for(const o of alive()){if(!o.aware)continue;const ox=h.x-o.x,oy=h.y-o.y,od=Math.hypot(ox,oy)||1;if(od>320)continue;ax+=ox/od/od;ay+=oy/od/od}
  let l=Math.hypot(ax,ay);if(l<1e-6){ax=dx/d;ay=dy/d;l=1}ax/=l;ay/=l;
  const B=window.Game5Dungeon?.blockedAt;if(B?.(h,h.x+ax*30,h.y+ay*30)){const sx=-ay,sy=ax,k=B(h,h.x+sx*30,h.y+sy*30)?-1:1;ax=sx*k;ay=sy*k}
  h.intent={kind:'move',x:ax,y:ay,speed:1.05,label:'間合いを取る'};h.facing=Math.atan2(-dy,-dx);return h.intent};
 if(h._awayT>0)return away();                                                                  // struck: step back out
 if(d<C.tooClose+(near.r||24)&&!(h._backT>0)&&Math.random()<.6){h._backT=C.back;return away()} // too close: out of arm's reach first
 if(h._backT>0)return away();
 return r;
};
window.Game5Range={version:'0.38.0',cfg:C};
})();
