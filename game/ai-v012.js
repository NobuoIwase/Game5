(()=>{
'use strict';
/* v0.12.0 AI layer.
   Hero: perceives every enemy telegraph (not only the primary target), reacts after a
   personality/knowledge based delay, picks the safest dodge by sampling directions,
   paths around walls with A*, cannot see through walls, avoids lingering fields,
   struggles out of binds and catches her breath after a room is cleared.
   Enemies: role based spacing (melee / skirmisher / ranged / ambush), spread around the
   hero instead of stacking, range-aware skill choice, a shared cast budget so telegraphs
   do not all land at once, and movement prediction that grows with dungeon depth. */
const D=()=>window.Game5Dungeon,M=()=>window.Game5MultiEnemy;
const alive=()=>M()?.alive?.()||(state.enemy&&state.enemy.hp>0?[state.enemy]:[]);
const walls=()=>D()?.room?.()?.walls||[];
const zones=()=>D()?.room?.()?.zones||[];

/* ---------- geometry ---------- */
function inRect(x,y,w,pad=0){return x>w.x-pad&&x<w.x+w.w+pad&&y>w.y-pad&&y<w.y+w.h+pad}
function wallBetween(a,b){
 const tb=window.Game5Terrain?.between?.(a,b);if(tb!=null)return tb;
 const l=Math.hypot(b.x-a.x,b.y-a.y),n=Math.ceil(l/10);
 for(const w of walls())for(let i=1;i<n;i++){const t=i/n;if(inRect(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,w))return true}
 return false;
}
function clearPath(a,x,y,r){
 const l=Math.hypot(x-a.x,y-a.y),n=Math.max(1,Math.ceil(l/8)),blocked=D()?.blockedAt;
 if(!blocked)return true;
 for(let i=1;i<=n;i++){const t=i/n;if(blocked({r},a.x+(x-a.x)*t,a.y+(y-a.y)*t))return false}
 return true;
}
function castHits(c,p,margin){
 const s=c.sk;if(!s)return false;
 if(s.kind==='circle')return Math.hypot(p.x-c.target.x,p.y-c.target.y)<=s.r+margin;
 if(s.kind==='line'){
  const x2=c.start.x+Math.cos(c.ang)*s.range,y2=c.start.y+Math.sin(c.ang)*s.range;
  return pointSegDist(p.x,p.y,c.start.x,c.start.y,x2,y2)<=s.width/2+margin;
 }
 if(s.kind==='cone')return inCone(p.x,p.y,c.start.x,c.start.y,c.ang,s.range+margin,.66);
 return false;
}

/* ---------- A* on a 20px grid, cached per room ---------- */
const CELL=20,GW=Math.ceil(W/CELL),GH=Math.ceil(H/CELL);
let grid=null,gridKey='';
function blockedGrid(r){
 const key=`${state.dungeon?.room}:${r}`;if(grid&&gridKey===key)return grid;
 grid=new Uint8Array(GW*GH);gridKey=key;
 for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)grid[y*GW+x]=D()?.blockedAt?.({r},x*CELL+CELL/2,y*CELL+CELL/2)?1:0;
 return grid;
}
function astar(a,goal,r){
 const g=blockedGrid(r),cx=v=>clamp(Math.floor(v/CELL),0,GW-1),cy=v=>clamp(Math.floor(v/CELL),0,GH-1);
 const s=cy(a.y)*GW+cx(a.x),t=cy(goal.y)*GW+cx(goal.x);if(s===t)return[goal];
 const open=[s],from=new Int32Array(GW*GH).fill(-1),cost=new Float32Array(GW*GH).fill(Infinity),done=new Uint8Array(GW*GH);
 const hx=i=>Math.hypot(i%GW-t%GW,((i/GW)|0)-((t/GW)|0));
 cost[s]=0;const f=new Float32Array(GW*GH).fill(Infinity);f[s]=hx(s);
 let guard=0;
 while(open.length&&guard++<4000){
  let bi=0;for(let i=1;i<open.length;i++)if(f[open[i]]<f[open[bi]])bi=i;
  const c=open.splice(bi,1)[0];if(c===t)break;done[c]=1;
  const x=c%GW,y=(c/GW)|0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=GW||ny>=GH)continue;
   const n=ny*GW+nx;if(done[n]||(g[n]&&n!==t))continue;
   if(dx&&dy&&(g[y*GW+nx]||g[ny*GW+x]))continue;
   const nc=cost[c]+(dx&&dy?1.414:1);
   if(nc<cost[n]){cost[n]=nc;from[n]=c;f[n]=nc+hx(n);if(!open.includes(n))open.push(n)}
  }
 }
 if(from[t]<0)return null;
 const pts=[goal];for(let c=from[t];c>=0&&c!==s;c=from[c])pts.unshift({x:(c%GW)*CELL+CELL/2,y:((c/GW)|0)*CELL+CELL/2});
 return pts;
}
/* direction to the farthest waypoint that is directly reachable */
function pathDir(a,goal){
 const r=a.r||17;
 if(clearPath(a,goal.x,goal.y,r-2))return norm(goal.x-a.x,goal.y-a.y);
 const pts=astar(a,goal,r);if(!pts||!pts.length)return null;
 let best=pts[0];for(const p of pts){if(clearPath(a,p.x,p.y,r-2))best=p;else break}
 return norm(best.x-a.x,best.y-a.y);
}
function norm(x,y){const l=Math.hypot(x,y)||1;return{x:x/l,y:y/l}}

/* ---------- hero perception ---------- */
function sees(h,e){return inCone(e.x,e.y,h.x,h.y,h.facing,h.visionRange+(e.r||0),h.visionHalf)&&!wallBetween(h,e)}
const baseVisible=enemyVisibleToHero;
enemyVisibleToHero=function(h){return baseVisible(h)&&!wallBetween(h,state.enemy)};

function speciesKnowledge(h,e,key){return h.knowledgeBySpecies?.[e.type]?.[key]??h.knowledge?.[key]??0}
const firstSeen=new WeakMap(),reactDelay=new WeakMap(),dashed=new WeakSet();
const DASH={t:.28,speed:1.95,sp:3};
function threats(h){
 const out=[];
 for(const e of alive()){
  const c=e.cast;if(!c||!castHits(c,h,h.r+8))continue;
  const perceived=sees(h,e)||dist(h,e)<200||castHits(c,h,h.r+8)&&c.sk.kind==='circle'&&!wallBetween(h,c.target);
  if(!perceived)continue;
  out.push({e,c,t:c.t,key:c.key});
 }
 for(const z of state.hazards||[]){
  if(z.kind!=='directorRingBeam'||z.fired)continue;
  const c={sk:{kind:'line',range:z.range,width:z.width},start:z.start,ang:z.ang,t:z.beamT,total:.82,key:'ringbeam'};
  if(castHits(c,h,h.r+8))out.push({e:null,c,t:z.beamT,key:'ringbeam',src:z});
 }
 return out.sort((a,b)=>a.t-b.t);
}
function delayFor(h,th){
 const token=th.src||th.c;
 if(reactDelay.has(token))return reactDelay.get(token);
 const k=th.e?speciesKnowledge(h,th.e,th.key):0,hyp=tierInfo(h.hypnosis||{value:0}).stage;
 const charm=th.e?charmStage(h,th.e.family):0;
 let d=.34-k*.07-h.focus*.004+hyp*.11+charm*.05+rnd(-.05,.09);
 if(th.key==='ringbeam')d+=.22;           // a director trap should stay a real threat
 d=clamp(d,.05,.8);reactDelay.set(token,d);
 // the telegraph has been on screen since the cast began, not since her last thought tick
 firstSeen.set(token,state.time-clamp((th.c.total??th.t)-th.t,0,.3));return d;
}
function ready(h,th){
 const token=th.src||th.c;delayFor(h,th);
 return state.time-firstSeen.get(token)>=reactDelay.get(token);
}
function danger(p,list,h){
 let s=0;
 for(const th of list)if(castHits(th.c,p,h.r+6))s+=90/(Math.max(0,th.t)+.25);
 for(const z of state.hazards||[])if(/Fog|Pool/.test(z.kind)&&Math.hypot(p.x-z.x,p.y-z.y)<z.r+h.r)s+=28;
 for(const z of zones())if(Math.hypot(p.x-z.x,p.y-z.y)<z.r)s+=6;
 return s;
}
function allCasts(){
 const list=[];for(const e of alive())if(e.cast)list.push({e,c:e.cast,t:e.cast.t,key:e.cast.key});
 for(const z of state.hazards||[])if(z.kind==='directorRingBeam'&&!z.fired)list.push({c:{sk:{kind:'line',range:z.range,width:z.width},start:z.start,ang:z.ang},t:z.beamT});
 return list;
}
function bestDodge(h,urgent){
 const list=allCasts(),slow=h.status.slow>0?.58:1,sp=h.speed*1.22*slow,e=state.enemy;
 const time=clamp(urgent.t+.08,.18,.7),burst=dashed.has(urgent.src||urgent.c)?0:DASH.t*(DASH.speed-1.22)*h.speed*slow;
 let best=null;
 for(let i=0;i<16;i++){
  const a=i/16*TAU,dx=Math.cos(a),dy=Math.sin(a);
  let travel=sp*time+burst;
  while(travel>8&&!clearPath(h,h.x+dx*travel,h.y+dy*travel,h.r))travel*=.6;
  const p={x:h.x+dx*travel,y:h.y+dy*travel};
  let score=-danger(p,list,h)*1.0+travel*.04;
  if(e&&e.hp>0)score-=Math.abs(dist(p,e)-125)*.035;
  if(!best||score>best.score)best={x:dx,y:dy,score,safe:!list.some(th=>castHits(th.c,p,h.r+4)),travel};
 }
 return best;
}

/* ---------- hero decision ---------- */
const baseDecide=decideHero;
decideHero=function(h,dt){
 if(h.dead||h.cast||h.status.stun>0||h.estella?.active)return baseDecide(h,dt);
 const dg=state.dungeon;
 if(dg?.active&&dg.pending)return clearedRoom(h,dt);
 const list=threats(h),urgent=list.find(th=>ready(h,th));
 if(list.length&&!urgent){
  // wake up exactly when the earliest reaction is due instead of on the next idle tick
  const due=Math.min(...list.map(th=>reactDelay.get(th.src||th.c)-(state.time-firstSeen.get(th.src||th.c))));
  h.aiWait=Math.min(h.aiWait,Math.max(.02,due));
 }else if(list.length)h.aiWait=Math.min(h.aiWait,.1);
 if(urgent){
  const e=urgent.e,sk=h.skills;
  if(h.status.bind>0){
   if(canUse(h,sk[2],2)&&h.status.guard<=0)return startHeroSkill(2,'動けない……せめて受け止める。');
   h.intent={kind:'hold',x:0,y:0};h.thought='ほどけない……来る！';return h.intent;
  }
  if(e&&e===state.enemy&&['bind','bolt','fog'].includes(urgent.key)&&urgent.t>sk[1].cast+.06&&canUse(h,sk[1],1)&&dist(h,e)<sk[1].range+sk[1].step+e.r){
   return startHeroSkill(1,'詠唱を止めるなら、今。');
  }
  const v=bestDodge(h,urgent);
  if(!v.safe&&urgent.t<.3&&canUse(h,sk[2],2)&&h.status.guard<=0){
   return startHeroSkill(2,'避け切れない。盾で受ける。');
  }
  const token=urgent.src||urgent.c;
  if(!dashed.has(token)&&h.sp>DASH.sp+8){
   // first reaction to a telegraph is a short burst: the dodge-roll the motion set already animates
   dashed.add(token);h.dashT=DASH.t;h.sp=Math.max(1,h.sp-DASH.sp);
  }
  h.intent={kind:'move',x:v.x,y:v.y,speed:h.dashT>0?DASH.speed:1.22,label:'回避'};
  if(urgent.c.id!=null)h.dodgeCastId=urgent.c.id;
  const k=e?speciesKnowledge(h,e,urgent.key):0;
  h.thought=urgent.key==='ringbeam'?'光の線……！ 射線から外れる。':k<.8?'何が来る……？ とにかく予兆から外れる。':`${ENEMY_LABELS[urgent.key]||'予兆'}。前と同じなら、ここを外す。`;
  return h.intent;
 }
 // no threat she has reacted to: run the personality/combat brain with the primary cast hidden
 const e=state.enemy,c=e?.cast;
 if(e&&c&&!castHits(c,h,h.r+8)&&canUse(h,h.skills[1],1)&&dist(h,e)<h.skills[1].range+h.skills[1].step+e.r&&c.t>h.skills[1].cast&&Math.random()<.45){
  return startHeroSkill(1,'詠唱の隙。盾で割り込む。');
 }
 if(e&&e.stun>0&&canUse(h,h.skills[3],3)&&dist(h,e)<150){
  return startHeroSkill(3,'体勢が崩れた。今、全力で。');
 }
 if(e)e.cast=null;
 try{baseDecide(h,dt)}finally{if(e)e.cast=c}
 if(state.time-(h.memory.lastSenseAt??-99)>2.2&&!h.cast&&h.intent?.kind!=='cast')explore(h);
 if(list.length&&!h.cast){
  // the telegraph is up but she has not processed it yet
  h.thought=list[0].e&&speciesKnowledge(h,list[0].e,list[0].key)<.5?'……え、何か来る？':'見えてる。まだ、慌てない。';
 }
 return refine(h);
};
/* snares are hidden, but every one she has stepped on makes the next easier to spot */
function spotSnares(h){
 for(const z of state.hazards||[]){
  if(z.kind!=='directorSnare'||z.triggered||z.rolled||dist(h,z)>120||!inCone(z.x,z.y,h.x,h.y,h.facing,130,h.visionHalf))continue;
  z.rolled=true;z.noticed=Math.random()<.18+.16*(h.snaresTaken||0)+h.focus*.004;
  if(z.noticed){h.thought='足元に……何か仕掛けてある。踏まないように。';addFx('text',z.x,z.y-24,'!','#ffd8a0',.8)}
 }
}
function refine(h){
 spotSnares(h);
 const it=h.intent;if(!it||it.kind!=='move')return it;
 const e=state.enemy;
 // walls between her and the target: follow the path instead of pushing into stone
 if(e&&e.hp>0&&wallBetween(h,e)){
  const to=norm(e.x-h.x,e.y-h.y);
  if(it.x*to.x+it.y*to.y>.35){const p=pathDir(h,e);if(p){it.x=p.x;it.y=p.y;it.label='迂回'}}
 }
 // do not wander into lingering fields unless she is already standing in one
 const ahead=p=>({x:h.x+p.x*34,y:h.y+p.y*34});
 const casts=allCasts();
 const bad=p=>{const q=ahead(p);for(const th of casts)if(castHits(th.c,q,h.r+6))return true;for(const z of state.hazards||[])if(z.noticed&&!z.triggered&&Math.hypot(q.x-z.x,q.y-z.y)<z.r+h.r+4)return true;for(const z of state.hazards||[])if(/Fog|Pool/.test(z.kind)&&Math.hypot(q.x-z.x,q.y-z.y)<z.r+h.r)return true;for(const z of zones())if(Math.hypot(q.x-z.x,q.y-z.y)<z.r*.8)return true;return false};
 const inside=danger(h,[],h)>0,d=norm(it.x,it.y);
 if(!inside&&bad(d)){
  const base=Math.atan2(d.y,d.x);
  for(const da of [.45,-.45,.9,-.9,1.35,-1.35]){const v={x:Math.cos(base+da),y:Math.sin(base+da)};if(!bad(v)&&clearPath(h,h.x+v.x*30,h.y+v.y*30,h.r)){it.x=v.x;it.y=v.y;break}}
 }
 return it;
}
/* nothing seen or heard: sweep the room toward the area she has not checked yet */
function explore(h){
 const list=alive();if(!list.length)return;
 if(!h.searchGoal||dist(h,h.searchGoal)<40||state.time>h.searchUntil){
  // she knows something is still in the room: search around the farthest unseen enemy, with error
  const e=list.reduce((a,b)=>dist(h,a)>dist(h,b)?a:b),err=90;
  h.searchGoal={x:clamp(e.x+rnd(-err,err),60,W-60),y:clamp(e.y+rnd(-err,err),60,H-60)};h.searchUntil=state.time+4;
 }
 const p=pathDir(h,h.searchGoal);if(!p)return;
 h.intent={kind:'move',x:p.x,y:p.y,speed:.72,label:'探索'};setHeroFacing(h,h.x+p.x*40,h.y+p.y*40);
 h.thought='静かすぎる……まだ何かいる。奥を確かめる。';
}
function clearedRoom(h,dt){
 const r=D().room(),goal={x:r.exit[0],y:r.exit[1]};
 h.restT=(h.restT||0);
 if((h.sp<h.maxSp*.6||h.nutera>40)&&h.restT<2.4){
  h.intent={kind:'hold',x:0,y:0};h.resting=true;
  h.thought='……少しだけ、息を整えてから進もう。';return h.intent;
 }
 h.resting=false;
 const p=pathDir(h,goal)||norm(goal.x-h.x,goal.y-h.y);
 h.intent={kind:'move',x:p.x,y:p.y,speed:1.0,label:'階段へ移動'};
 h.thought='区画を制圧。次の階段へ進む。';
 return h.intent;
}

/* ---------- hero update extras ---------- */
const baseHero=updateHero;
updateHero=function(h,dt){
 const px=h.x,py=h.y;
 baseHero(h,dt);
 if(h.dashT>0){h.dashT=Math.max(0,h.dashT-dt);if(!h.dashT&&h.intent?.label==='回避')h.intent.speed=1.22}
 if(dt>0){const k=Math.min(1,dt*8);h._vx=lerpN(h._vx||0,(h.x-px)/dt,k);h._vy=lerpN(h._vy||0,(h.y-py)/dt,k)}
 if(state.dungeon?.pending)h.restT=(h.restT||0)+(h.resting?dt:0);else{h.restT=0;h.resting=false}
 // struggling shortens binds; better knowledge of binding attacks makes it faster
 if(!h.dead&&h.status.bind>0&&!h.estella?.active){
  const k=h.knowledge?.bind||0;h.status.bind=Math.max(0,h.status.bind-dt*(.22+k*.12));
  h.struggle=(h.struggle||0)+dt;
 }else h.struggle=0;
 for(const z of state.hazards||[])if(z.kind==='directorSnare'&&z.triggered&&!z.counted){z.counted=true;h.snaresTaken=(h.snaresTaken||0)+1}
};
function lerpN(a,b,t){return a+(b-a)*t}

/* ---------- melee arcs also catch other enemies in the swing ---------- */
const baseResolveHero=resolveHero;
resolveHero=function(h,cast){
 const primary=state.enemy,sk=cast?.sk,hitBefore=primary?.hp;
 baseResolveHero(h,cast);
 if(!sk||!['melee','heavy'].includes(sk.kind))return;
 const ang=h.facing;
 for(const o of alive()){
  if(o===primary||o.hp<=0)continue;
  if(!inCone(o.x,o.y,h.x,h.y,ang,sk.range+o.r,sk.kind==='heavy'?.8:.64)||wallBetween(h,o))continue;
  const keep=state.enemy;state.enemy=o;
  const atk=1+(h.atk-HERO_CFG.atk)/HERO_CFG.atk*(h.atkScale??0);
  hurtEnemy(sk.damage*atk*(sk.kind==='heavy'?.7:.55),{source:sk.name,stun:sk.kind==='heavy'?.18:0,interrupt:sk.kind==='heavy'});
  state.enemy=keep;
 }
 if(primary&&hitBefore>primary.hp)primary.hitReact=.14;
};

/* =================== enemies =================== */
const ROLE={
 gel:{pref:118,label:'間合いを詰める'},
 slug:{pref:100,label:'這い寄る'},
 worm:{pref:112,label:'巻きつく間合いへ'},
 leech:{pref:160,dart:92,label:'周囲を飛び回る'},
 orb:{pref:255,ranged:true,label:'距離を保つ'},
 flower:{pref:135,ambush:230,label:'待ち伏せ'},
 moth:{pref:240,ranged:true,label:'鱗粉の間合いを保つ'}
};
function spreadAngle(e,h,list){
 let a=Math.atan2(e.y-h.y,e.x-h.x);
 for(const o of list){
  if(o===e)continue;const ao=Math.atan2(o.y-h.y,o.x-h.x);let d=a-ao;d=Math.atan2(Math.sin(d),Math.cos(d));
  if(Math.abs(d)<.85)a+=(d>=0?1:-1)*(.85-Math.abs(d))*.6;
 }
 return a;
}
function move(e,h,dt){
 const role=ROLE[e.type];if(!role||!D())return false;
 e.homeX??=e.x;e.homeY??=e.y;
 const list=alive(),d=dist(e,h);
 let pref=role.pref,goal,label=role.label,speedMul=1;
 if(h.estella?.active){pref=46;label='漏出MPへ寄る'}
 else if(role.dart&&e.actCd<.55)pref=role.dart;
 e.waitT=(d>role.ambush?(e.waitT||0)+dt:0);
 if(role.ambush&&!h.estella?.active&&d>role.ambush&&e.hp>=e.maxHp*.9&&e.waitT<8){
  goal={x:e.homeX,y:e.homeY};label='待ち伏せ';speedMul=.6;
 }else{
  const a=spreadAngle(e,h,list);
  goal={x:h.x+Math.cos(a)*pref,y:h.y+Math.sin(a)*pref};
  if(list.length>1&&Math.abs(d-pref)<30)label='回り込む';
 }
 if(role.ranged&&d<pref*.55){speedMul=.8;label='距離を取る'}
 if(wallBetween(e,h)&&!(role.ambush&&label==='待ち伏せ')){
  // path queries are cheap but not free: refresh a few times per second
  if(!e._path||state.time>e._pathT){e._path=pathDir(e,h);e._pathT=state.time+.25}
  const p=e._path;if(p)goal={x:e.x+p.x*60,y:e.y+p.y*60};label='回り込む';
 }
 const gx=goal.x-e.x,gy=goal.y-e.y,gl=Math.hypot(gx,gy);
 let vx,vy,sp=(e.moveSpeed||69)*(e.phase===2?1.18:1)*(e.slow>0?.55:1)*speedMul;
 if(gl<10){
  // on station: drift sideways so they never look frozen
  const t=Math.atan2(e.y-h.y,e.x-h.x)+Math.PI/2*((e.x*7+e.y)%2<1?1:-1);
  vx=Math.cos(t);vy=Math.sin(t);sp*=.25;
 }else{vx=gx/gl;vy=gy/gl;if(gl<40)sp*=gl/40}
 const it=D().steer(e,{kind:'move',x:vx,y:vy});
 const l=Math.hypot(it.x,it.y)||1;
 e.x+=it.x/l*sp*dt;e.y+=it.y/l*sp*dt;
 e.moving=sp*dt>.05;e._aiMoved=true;e.noise=Math.max(e.noise,.3);e.decision=label;
 return true;
}

const baseChoose=chooseEnemyAction;
chooseEnemyAction=function(){
 const e=state.enemy,h=chooseTarget(),prof=window.Game5Monsters?.profiles?.[e?.type];
 if(!e||!h||!prof)return baseChoose();
 const list=alive(),busy=list.filter(o=>o!==e&&o.cast).length,est=!!h.estella?.active,cap=est?1:list.length>=3?2:1;
 if(busy>=cap){e.actCd=rnd(.3,.6);e.decision=est?'漏出MPへ寄る':'仲間の詠唱を待つ';return}
 if(est)return baseChoose();
 if(wallBetween(e,h)){e.actCd=.35;e.decision='射線を探す';return}
 const d=dist(e,h),ok=prof.weights.filter(k=>{const s=ENEMY_SKILLS[k];return d<=s.range+(s.step||0)+h.r+10});
 if(!ok.length){e.actCd=.3;e.decision='射程へ入る';return}
 const key=ok[(Math.random()*ok.length)|0],sk=ENEMY_SKILLS[key];
 // deeper floors read her movement and aim ahead of it
 const lead=sk.kind==='cone'?0:clamp(.12*(e.level||1),0,.5)*sk.cast;
 const tx=clamp(h.x+(h._vx||0)*lead,50,W-50),ty=clamp(h.y+(h._vy||0)*lead,50,H-50);
 startEnemySkill(key,{x:tx,y:ty,r:h.r});
};

// groups share the pressure: each extra monster lengthens everyone's recovery between casts
const GROUP_PACE=.4;
const baseResolveEnemy=resolveEnemy;
resolveEnemy=function(cast){
 const e=state.enemy;baseResolveEnemy(cast);
 if(e&&!e.cast)e.actCd*=1+GROUP_PACE*Math.max(0,alive().length-1);
};

window.Game5EnemyAI={version:'0.12.0',roles:ROLE,move,groupPace:GROUP_PACE};
window.Game5AI={version:'0.12.0',clearGrid:()=>{grid=null;gridKey=''},dash:DASH,threats,bestDodge,pathDir,astar,wallBetween,castHits,sees};
})();
