(()=>{
'use strict';
/* v0.26.0 AI for the larger floors.
   Monsters
   - awareness: a monster does not know where she is until it sees her (in sight, no wall,
     ~340px), hears her (~170px), or is hit. Until then it idles and wanders near its post;
     ambush types stay still. Losing her for a while makes it forget and return.
   - ambush: a monster the director hid in the dark waits; when she walks close it strikes
     at once and she freezes for a moment.
   - punishing: when she commits to a swing (her attacks step her in), monsters nearby may
     time a quick attack, a grab first, to land while she recovers.
   Director (AUTO)
   - besides traps, it now moves monsters that have not found her into unexplored parts of
     the floor ahead of her, to wait there.
   Heroine
   - explores toward the nearest unexplored area instead of knowing where monsters are.
   - dodging costs SP by the distance covered, and builds fatigue. Tired, she dodges slower
     and can trip; very tired or out of breath, she backs off to a safe corner to rest.
   - weak spots that fit her: she freezes when a monster first shows up, her legs go weak
     as Nutera climbs, and a grab she cannot shake saps her stamina further. */
const C={
 sight:340,hear:170,forget:6,
 wander:{r:120,every:[3,5.5],speed:.36},
 ambush:{r:165,freeze:[.45,.7]},
 punish:{r:270,base:.2,perLevel:.04,max:.5},
 relocate:{cost:30,every:[13,19],min:320,max:680},
 dodgeSp:.004,fatiguePerPx:.0022,fatigueDecay:.07,restDecay:.22,
 retreatAt:.85,retreatSp:.22,restUntil:.35,
 trip:{from:.6,chance:.5,stun:.55},
 spotFreeze:[.3,.55],
 nuteraLegs:{from:.6,slow:.45},
 calmRegen:1,calmHp:1.2   // extra SP regen (x base) and HP/s once she has been out of a fight for 4s
};
const ST=['bubble_shell','flower','lure_cap'];     // stay put when idle
const AI=()=>window.Game5AI,DG=()=>window.Game5Dungeon,T=()=>window.Game5Terrain;
const alive=()=>window.Game5MultiEnemy?.alive?.()||[];
const wall=(a,b)=>AI()?.wallBetween?.(a,b)??false;

/* =================== monsters =================== */
function notice(e,how){
 if(e.aware)return;e.aware=true;e.awareAt=state.time;e.lostT=0;
 addFx('text',e.x,e.y-(e.r||24)-34,'!','#ffd27a',.8);
 if(e.ambush&&how!=='hit'){
  e.ambush=false;e.actCd=Math.min(e.actCd||1,.12);
  const h=state.hero;if(h&&!h.dead){h.freezeT=rnd(...C.ambush.freeze);h._voiceEvent='ambush'}
 }
}
function senseTick(e,h){
 const room=state.dungeon?.room;
 if(e._floorTag!==room){e._floorTag=room;e.aware=false;e.ambush=false;e._seenByHero=false;e.homeX=e.x;e.homeY=e.y;e.idleGoal=null;e.lostT=0}
 if(e.grappling){e.aware=true;return}
 const d=dist(e,h);
 if(h.estella?.active&&d<520)return notice(e,'estella');
 if(!e.aware){
  const r=e.ambush?C.ambush.r:C.sight;
  if(d<C.hear&&!e.ambush||d<r&&!wall(e,h))notice(e,'see');
  return;
 }
 // aware: forget her after a while out of sight and far away
 if(d>C.sight*1.8&&wall(e,h)){e.lostT=(e.lostT||0)+.2;if(e.lostT>C.forget){e.aware=false;e.lastSeen={x:h.x,y:h.y};e.homeX=e.x;e.homeY=e.y}}
 else e.lostT=0;
}
let senseAcc=0;
function sense(dt){
 senseAcc-=dt;if(senseAcc>0)return;senseAcc=.2;
 const h=state.hero;if(!h||!state.started||state.over)return;
 const list=alive();
 for(const e of list)senseTick(e,h);
 // a monster that has found her calls the others nearby
 for(const e of list)if(e.aware&&state.time-(e.awareAt||0)>2)for(const o of list)if(!o.aware&&!o.ambush&&dist(e,o)<200)notice(o,'call');
}
/* hit by her: always aware */
const baseHurtE=hurtEnemy;
hurtEnemy=function(dmg,opts={}){const e=state.enemy;if(e&&!e.aware)notice(e,'hit');return baseHurtE(dmg,opts)};

/* after a while on a floor the unaware ones start drifting toward her scent: slow, noisy,
   so she hears them coming and the floor cannot stall with a monster wandering where she
   has already been */
function hunting(){
 const h=state.hero,f=T()?.current?.();if(!h||!f)return false;
 if((h._floorT||0)>45)return true;
 let ex=0,fl=0;for(let k=0;k<f.explored.length;k+=3)if(f.grid[k]!==1){fl++;if(f.explored[k])ex++}
 return fl&&ex/fl>.75;
}
function hunt(e,h,dt){
 if(!e._huntPath||state.time>e._huntT){e._huntPath=AI()?.pathDir?.(e,h);e._huntT=state.time+.5}
 const p=e._huntPath;if(!p)return false;
 const it=DG()?.steer?.(e,{kind:'move',x:p.x,y:p.y})||p,il=Math.hypot(it.x,it.y)||1,sp=(e.moveSpeed||69)*.5;
 e.x+=it.x/il*sp*dt;e.y+=it.y/il*sp*dt;e.moving=true;e._aiMoved=true;e.noise=Math.max(e.noise||0,.35);e.decision='気配を辿る';
 return true;
}
function idle(e,h,dt){
 e.homeX??=e.x;e.homeY??=e.y;
 if(!e.ambush&&!ST.includes(e.type)&&e._hunting&&hunt(e,h,dt))return true;
 if(ST.includes(e.type)||e.ambush){e.moving=false;e._aiMoved=true;e.decision=e.ambush?'暗がりで待つ':'じっとしている';return true}
 if(!e.idleGoal||state.time>e.idleUntil||Math.hypot(e.idleGoal.x-e.x,e.idleGoal.y-e.y)<14){
  const a=Math.random()*TAU,r=Math.random()*C.wander.r,goal={x:e.homeX+Math.cos(a)*r,y:e.homeY+Math.sin(a)*r};
  if(e.lastSeen){Object.assign(goal,e.lastSeen);e.lastSeen=null}
  e.idleGoal=goal;e.idleUntil=state.time+rnd(...C.wander.every);
 }
 // short walks and pauses: an idle monster is only heard now and then
 if(state.time<(e.idlePause||0)){e.moving=false;e._aiMoved=true;e.decision='うろついている';return true}
 if(state.time>(e.idleWalkEnd||0)){e.idleWalkEnd=state.time+rnd(.9,1.6);e.idlePause=e.idleWalkEnd+rnd(1.4,3)}
 const gx=e.idleGoal.x-e.x,gy=e.idleGoal.y-e.y,l=Math.hypot(gx,gy)||1;
 const it=DG()?.steer?.(e,{kind:'move',x:gx/l,y:gy/l})||{x:gx/l,y:gy/l},il=Math.hypot(it.x,it.y)||1;
 const sp=(e.moveSpeed||69)*C.wander.speed;
 e.x+=it.x/il*sp*dt;e.y+=it.y/il*sp*dt;e.moving=true;e._aiMoved=true;e.decision='うろついている';
 return true;
}
const EAI=window.Game5EnemyAI;
if(EAI?.move){const m=EAI.move;EAI.move=function(e,h,dt){if(!e.aware&&!e.grappling)return idle(e,h,dt);return m(e,h,dt)}}
/* casting: nothing while unaware; a punishing monster picks a quick attack */
const baseChoose=chooseEnemyAction;
chooseEnemyAction=function(){
 const e=state.enemy,h=state.hero;
 if(e&&!e.aware&&!e.grappling){e.actCd=.35;return}
 // while one of them holds her, the others mostly watch (they close in, but rarely strike)
 if(e&&!e.grappling&&h?.grapple&&Math.random()<.75){e.actCd=rnd(.6,1.1);e.decision='捕まった獲物を眺める';return}
 if(e&&e._punish&&h&&!h.dead){
  e._punish=null;const d=dist(e,h),p=e._punishAt||h;
  for(const k of ['bind','cleave','charge']){const s=ENEMY_SKILLS[k];if(!s)continue;
   if(d<=s.range+(s.step||0)+h.r+10&&!wall(e,h)){e.decision='隙を狙う';startEnemySkill(k,{x:p.x,y:p.y,r:h.r});return}}
 }
 return baseChoose();
};
/* her committed swing: monsters close by answer it */
function punish(h){
 const c=h.cast;if(!c||!['melee','bash','heavy'].includes(c.sk?.kind))return;
 if(h._punishedCast===c)return;h._punishedCast=c;
 const a=h.facing||0,step=c.stepLeft||0,at={x:h.x+Math.cos(a)*step,y:h.y+Math.sin(a)*step};
 for(const e of alive()){
  if(!e.aware||e.cast||e.grappling||e.dash||dist(e,h)>C.punish.r)continue;
  const p=Math.min(C.punish.max,C.punish.base+C.punish.perLevel*((e.level||1)-1));
  if(Math.random()>p)continue;
  e._punish=true;e._punishAt=at;e.actCd=Math.min(e.actCd||1,Math.max(.04,(c.t||.3)-.3));
 }
}

/* =================== director: hide monsters in the unexplored dark =================== */
function hideSpot(h,e){
 const f=T()?.current?.();if(!f)return null;const CS=T().CS,GW=T().GW,GH=T().GH;
 const r=DG()?.room?.(),exit=r?.exit;const out=[];
 for(let i=0;i<GW*GH;i++){
  if(f.grid[i]===1||f.cl[i]<Math.max(1.6,(e.r||24)/CS+.4)||f.explored[i])continue;
  const x=(i%GW)*CS+CS/2,y=((i/GW)|0)*CS+CS/2,d=Math.hypot(x-h.x,y-h.y);
  if(d<C.relocate.min||d>C.relocate.max)continue;
  if(!wall(h,{x,y}))continue;
  // prefer spots on her way: toward the exit and toward where she is heading
  let s=Math.random()*40;
  if(exit){const de=Math.hypot(x-exit[0],y-exit[1]),dh=Math.hypot(h.x-exit[0],h.y-exit[1]);s+=(dh-de)*.15}
  s+=((x-h.x)*Math.cos(h.facing||0)+(y-h.y)*Math.sin(h.facing||0))*.08;
  out.push({x,y,s});
 }
 out.sort((a,b)=>b.s-a.s);return out[0]||null;
}
let relT=rnd(...C.relocate.every);
function relocate(dt){
 const d=state.director,h=state.hero;
 if(!d?.auto||!state.started||state.over||!h||h.dead||state.dungeon?.pending)return;
 relT-=dt;if(relT>0)return;relT=rnd(...C.relocate.every);
 if(d.en<C.relocate.cost)return;
 const cand=alive().filter(e=>!e.aware&&!e.grappling&&!e.cast&&dist(e,h)>260).sort((a,b)=>dist(b,h)-dist(a,h));
 const e=cand[0];if(!e)return;
 const p=hideSpot(h,e);if(!p)return;
 d.en-=C.relocate.cost;
 addFx('text',e.x,e.y-40,'……','#b9a8ff',.8);
 window.Game5FX?.burst?.(e.x,e.y,'#8a6ab8',12,90,.7);
 e.x=p.x;e.y=p.y;e.homeX=p.x;e.homeY=p.y;e.ambush=true;e.idleGoal=null;
 log(`AUTO指揮：${e.name}を、まだ見ていない暗がりへ潜ませた。`);
}
/* the player can do it too: tool 9 「潜伏」 moves the nearest unaware monster to the tapped spot,
   which must be out of her sight (behind a wall or not yet explored) */
DIRECTOR_TOOLS.hide={name:'潜伏',cost:30,cd:9,r:30,desc:'気づいていない魔物を、アリアから見えない暗がりへ潜ませる'};
const basePlace=placeDirectorTool;
placeDirectorTool=function(kind,x,y,auto=false){
 if(kind!=='hide')return basePlace(kind,x,y,auto);
 const d=state.director,t=DIRECTOR_TOOLS.hide,h=state.hero;
 if(!state.started||state.over||!h||(d.cd.hide||0)>0||d.en<t.cost)return false;
 const f=T()?.current?.(),CS=T()?.CS||30,i=f?Math.floor(y/CS)*T().GW+Math.floor(x/CS):-1;
 const seen=f&&f.explored[i]&&!wall(h,{x,y})&&dist(h,{x,y})<(h.visionRange||300)+40;
 if(!f||f.grid[i]===1||DG()?.blockedAt?.({r:24},x,y)||seen){addFx('text',x,y-20,'見えている場所には潜めない','#cfb8ff',.9);return false}
 const e=alive().filter(o=>!o.aware&&!o.grappling&&!o.cast).sort((a,b)=>dist(a,{x,y})-dist(b,{x,y}))[0];
 if(!e){addFx('text',x,y-20,'潜ませられる魔物がいない','#cfb8ff',.9);return false}
 d.en-=t.cost;d.cd.hide=t.cd;
 window.Game5FX?.burst?.(e.x,e.y,'#8a6ab8',12,90,.7);
 e.x=x;e.y=y;e.homeX=x;e.homeY=y;e.ambush=true;e.idleGoal=null;DG()?.resolveEntity?.(e);
 log(`${auto?'AUTO指揮':'プレイヤー'}：${e.name}を暗がりへ潜ませた。`);
 return true;
};
addEventListener('keydown',ev=>{if(ev.code==='Digit9'){state.director.selected='hide';renderUI()}});
const baseDirector=updateDirector;
updateDirector=function(dt){baseDirector(dt);relocate(dt)};

/* =================== heroine =================== */
/* explore toward the nearest unexplored floor instead of toward monsters she cannot know about */
function frontier(h,far){
 const f=T()?.current?.();if(!f)return null;const {CS,GW,GH}=T();
 const start=(Math.floor(h.y/CS))*GW+Math.floor(h.x/CS),seen=new Uint8Array(GW*GH),q=[start],found=[];seen[start]=1;
 const want=far?400:24;
 for(let k=0;k<q.length&&found.length<want;k++){
  const c=q[k],x=c%GW,y=(c/GW)|0;
  if(!f.explored[c]&&k>0&&!(h._badCells?.has(c)))found.push(c);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*GW+nx;if(nx<0||ny<0||nx>=GW||ny>=GH||seen[n]||f.grid[n]===1||f.cl[n]<1.4)continue;seen[n]=1;q.push(n)}
 }
 if(!found.length)return null;
 // nearest pocket, but among the close ones prefer the one ahead of her; when stuck, a far one
 let best=null,bs=-1e9;const fa=h.facing||0;
 for(let i=0;i<found.length;i++){const c=found[i],x=(c%GW)*CS+CS/2,y=((c/GW)|0)*CS+CS/2,d=Math.hypot(x-h.x,y-h.y);
  const ahead=((x-h.x)*Math.cos(fa)+(y-h.y)*Math.sin(fa))/(d||1);
  const s=far?d*.02+ahead:-i*.08+ahead*1.2;if(s>bs){bs=s;best={x,y,c}}}
 return best;
}
function explore(h){
 const f=T()?.current?.();
 // a goal is done once its cell has been seen, not only when she stands on it
 if(h.exploreGoal&&f&&f.explored[h.exploreGoal.c])h.exploreGoal=null;
 if(!h.exploreGoal||dist(h,h.exploreGoal)<36||state.time>h.exploreUntil){
  if(h.exploreGoal&&state.time>h.exploreUntil)(h._badCells||=new Set()).add(h.exploreGoal.c);
  h.exploreGoal=frontier(h,h._stuck);h.exploreUntil=state.time+14;h._stuck=false;
  if(!h.exploreGoal)return false;
 }
 const p=AI()?.pathDir?.(h,h.exploreGoal);if(!p)return false;
 h.intent={kind:'move',x:p.x,y:p.y,speed:.78,label:'探索'};setHeroFacing(h,h.x+p.x*40,h.y+p.y*40);
 h._voiceEvent||='explore';
 return true;
}
/* somewhere out of sight of every monster that knows about her */
function safeSpot(h){
 const foes=alive().filter(e=>e.aware);let best=null;
 for(let i=0;i<20;i++){
  const a=i/20*TAU,r=rnd(180,380),p={x:clamp(h.x+Math.cos(a)*r,60,W-60),y:clamp(h.y+Math.sin(a)*r,60,H-60)};
  if(DG()?.blockedAt?.(h,p.x,p.y))continue;
  let s=0;for(const e of foes){s+=Math.min(420,dist(p,e))*.01;if(wall(e,p))s+=3}
  s-=r*.004;
  if(!best||s>best.s)best={...p,s};
 }
 return best;
}
const baseDecide=decideHero;
decideHero=function(h,dt){
 if(h.freezeT>0&&!h.dead&&!h.estella?.active){h.intent={kind:'hold',x:0,y:0,label:'硬直'};return h.intent}
 const it=baseDecide(h,dt);
 if(h.dead||h.cast||h.status.bind>0||h.status.stun>0||h.estella?.active)return it;
 const threat=it?.label==='回避';
 // resting / backing off when worn out
 if(!threat&&!state.dungeon?.pending){
  if(!h.retreat&&((h.fatigue||0)>=C.retreatAt||h.sp<h.maxSp*C.retreatSp)&&alive().some(e=>e.aware)){h.retreat={goal:safeSpot(h),until:state.time+9};h._voiceEvent='retreat'}
  if(h.retreat){
   const r=h.retreat,near=alive().filter(e=>e.aware&&dist(e,h)<190);
   if(state.time>r.until||(h.fatigue||0)<C.restUntil&&h.sp>h.maxSp*.5){h.retreat=null}
   else if(r.goal&&dist(h,r.goal)>30&&!near.length){const p=AI()?.pathDir?.(h,r.goal);if(p){h.intent={kind:'move',x:p.x,y:p.y,speed:1.05,label:'退避'};return h.intent}}
   else if(!near.length){h.intent={kind:'hold',x:0,y:0,label:'息を整える'};h.resting=true;return h.intent}
   else h.retreat=null;
  }
 }
 // something that knows about her is right behind her: turn round and face it instead of
 // wandering on (she hears it coming)
 const chaser=alive().filter(o=>o.aware&&dist(o,h)<280).sort((a,b)=>dist(a,h)-dist(b,h))[0];
 if(chaser&&(it?.label==='探索'||/迂回/.test(it?.label||'')||!it)&&!AI()?.sees?.(h,chaser)&&!AI()?.wallBetween?.(h,chaser)){
  setHeroFacing(h,chaser.x,chaser.y);h.memory.lastSenseAt=state.time;h.memory.lastSeen={x:chaser.x,y:chaser.y,t:state.time};
  h.intent={kind:'hold',x:0,y:0,label:'振り向く'};h._voiceEvent||='spot';return h.intent;
 }
 const e=state.enemy,sensed=h.memory?.lastSenseAt!=null&&state.time-h.memory.lastSenseAt<2.5;
 const blind=!alive().some(o=>o.aware&&AI()?.sees?.(h,o));
 if(it?.label==='探索'||!it&&!threat||(/迂回/.test(it?.label||'')&&!sensed&&blind)){if(explore(h))return h.intent}
 return it;
};
const baseHero=updateHero;
updateHero=function(h,dt){
 const px=h.x,py=h.y,wasDodge=h.intent?.label==='回避',id0=h.dodgeCastId;
 // weak legs as Nutera climbs; a tired body dodges slower
 const n=(h.nutera||0)/100,f=h.fatigue||0;
 if(h.intent?.kind==='move'){
  let m=1;if(n>C.nuteraLegs.from)m*=1-(n-C.nuteraLegs.from)/(1-C.nuteraLegs.from)*C.nuteraLegs.slow;
  if(wasDodge&&f>.5)m*=1-.3*(f-.5)/.5;
  h.intent._m=m;if(m<1&&!h.intent._scaled){h.intent.speed*=m;h.intent._scaled=true}
 }
 baseHero(h,dt);
 h.freezeT=Math.max(0,(h.freezeT||0)-dt);
 const moved=Math.hypot(h.x-px,h.y-py);
 if(wasDodge&&moved>0){drainSp(h,moved*C.dodgeSp,'回避の消耗');h.fatigue=Math.min(1.2,f+moved*C.fatiguePerPx)}
 else h.fatigue=Math.max(0,f-dt*(h.resting||h.intent?.label==='息を整える'?C.restDecay:C.fatigueDecay));
 if(h.grapple)h.fatigue=Math.min(1.2,(h.fatigue||0)+dt*.05);
 // tripping at the start of a dodge when worn out
 if(h.dodgeCastId&&h.dodgeCastId!==id0&&(h.fatigue||0)>C.trip.from&&Math.random()<((h.fatigue||0)-C.trip.from)*C.trip.chance){
  h.status.stun=Math.max(h.status.stun||0,C.trip.stun);addFx('text',h.x,h.y-70,'つまずいた','#ffd0a0',.9);h._voiceEvent='trip';
 }
 // first sight of a monster: a short freeze
 for(const e of alive()){if(e._seenByHero||!AI()?.sees?.(h,e))continue;e._seenByHero=true;if(!h.dead&&!h.cast&&!h.estella?.active){h.freezeT=Math.max(h.freezeT,rnd(...C.spotFreeze));h._voiceEvent||='spot'}}
 // a new floor: every monster starts unaware at its post
 const room=state.dungeon?.room;
 if(room!==h._floorSeen){h._floorSeen=room;h.exploreGoal=null;h.retreat=null;for(const e of alive()){e.aware=false;e.ambush=false;e._seenByHero=false;e.homeX=e.x;e.homeY=e.y;e.idleGoal=null}}
 // stuck: hardly any progress for a while with nobody after her -> go somewhere far
 h._track||=[];if(!h._trackT||state.time-h._trackT>2){h._trackT=state.time;h._track.push({x:h.x,y:h.y});if(h._track.length>7)h._track.shift()}
 if(h._track.length>=7&&!state.dungeon?.pending&&!alive().some(o=>o.aware&&dist(o,h)<320)){
  const a=h._track[0];let far=0;for(const p of h._track)far=Math.max(far,Math.hypot(p.x-a.x,p.y-a.y));
  if(far<150){h._stuck=true;h.exploreGoal=null;h._track=[];h.searchGoal=null}
 }
 // between fights (nobody aware of her close by, not held) she gets her breath back faster
 const calm=!h.grapple&&!h.dead&&!h.estella?.active&&!alive().some(o=>o.aware&&dist(o,h)<420);
 h._calmT=calm?(h._calmT||0)+dt:0;
 if(h._calmT>4){h.sp=Math.min(h.maxSp,h.sp+dt*(h.spRegen??6)*C.calmRegen);h.hp=Math.min(h.maxHp,h.hp+dt*C.calmHp)}
 h._floorT=(h._floorRoomT===state.dungeon?.room)?(h._floorT||0)+dt:0;h._floorRoomT=state.dungeon?.room;
 if(Math.random()<dt*2){const on=hunting();for(const e of alive())e._hunting=on}
 punish(h);
 sense(dt);
};
/* a fresh floor: monsters start unaware, the heroine rested */
const baseReset=reset;reset=function(){const r=baseReset();relT=rnd(...C.relocate.every);return r};
window.Game5AI26={version:'0.26.0',cfg:C,notice,frontier,safeSpot};
})();
