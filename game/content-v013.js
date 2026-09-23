(()=>{
'use strict';
/* v0.13.0 content.
   Hero : Lv5 旋風斬 (360° sweep that hits every monster in reach and breaks casts)
          Lv6 清めの構え (sheds Nutera / Sail / Hypnosis and peels off clinging monsters)
          treasure chests on the floors, opened when it is safe; after a mimic she inspects
          chests first and can see through the next one; she walks up to hypnosis towers
          and cuts them down
   Director (ported from Game4's night-side items and summon cards, non-explicit subset):
          5 粘沼  6 催眠の塔  7 偽りの宝箱  8 増援召喚 — AUTO uses them too, and like Game4
          its aim drifts further the faster she is moving
   Enemies: from floor 4 the leader may be a 変異個体 (elite) */
const AI=()=>window.Game5AI,DG=()=>window.Game5Dungeon,VX=()=>window.Game5Assets;
const alive=()=>window.Game5MultiEnemy?.alive?.()||(state.enemy?.hp>0?[state.enemy]:[]);
const fx=(...a)=>VX()?.spawn?.(...a);
const C={
 spin:{name:'旋風斬',cost:8,cd:7,cast:.42,range:96,step:0,kind:'spin',damage:30,unlock:5,desc:'周囲の敵すべて・中断'},
 cleanse:{name:'清めの構え',cost:10,cd:14,cast:.5,range:0,step:0,kind:'cleanse',unlock:6,desc:'ヌテラ・催眠を払う'},
 chest:{chance:.8,wary:.4},
 tools:{
  pool:{name:'粘沼',cost:20,cd:6,r:72,life:10,desc:'粘液の沼を敷く。踏むと足が鈍り、SPとヌテラが削れていく'},
  tower:{name:'催眠の塔',cost:40,cd:22,r:22,life:22,hp:45,pulse:3.6,reach:260,desc:'3.6秒ごとに催眠の電波。アリアは塔を壊しに来る'},
  mimic:{name:'偽りの宝箱',cost:30,cd:24,r:18,life:45,desc:'宝箱の偽物。開けると拘束とヌテラ'},
  summon:{name:'増援召喚',cost:50,cd:18,r:30,max:4,desc:'この階層の魔物を1体呼ぶ'}
 },
 elite:{fromRoom:3,chance:.3,hp:1.45,r:1.1,pace:.85},
 auto:{min:14,max:20}
};
for(const [k,t] of Object.entries(C.tools))DIRECTOR_TOOLS[k]=t;
Object.assign(state.director.cd,{pool:0,tower:0,mimic:0,summon:0});
const atkMul=h=>1+(h.atk-HERO_CFG.atk)/HERO_CFG.atk*(h.atkScale??0);

/* ================= hero skills ================= */
const bMake=makeHero;
function addSkills(h){if(h.skills.includes(C.spin))return h;h.skills=[...h.skills,C.spin,C.cleanse];h.cd=h.skills.map((_,i)=>h.cd[i]||0);h.mimicWary=0;return h}
makeHero=function(){return addSkills(bMake())};
if(state.hero)addSkills(state.hero);   /* the first hero is built by battle-ui.js before this file loads */
const SPIN=4,CLEANSE=5;
const bResolve=resolveHero;
resolveHero=function(h,cast){
 const live=h.cast===cast,sk=cast?.sk;bResolve(h,cast);
 if(!live||!sk)return;
 if(sk.kind==='spin'){
  fx('holy_slash',h.x,h.y-10,190,.35,{spin:TAU,grow:.2});
  const keep=state.enemy;
  for(const e of alive()){
   if(dist(h,e)>sk.range+e.r||AI()?.wallBetween?.(h,e))continue;
   state.enemy=e;hurtEnemy(sk.damage*atkMul(h),{source:sk.name,interrupt:true,stun:.25});
  }
  state.enemy=keep.hp>0?keep:state.enemy;
  window.Game5FX?.shake?.(5);
 }
 if(sk.kind==='cleanse'){
  h.nutera=Math.max(0,h.nutera-30);
  if(h.sailState)h.sailState.value=Math.max(ringFloor(h,'sail'),h.sailState.value-30);
  if(h.hypnosis)h.hypnosis.value=Math.max(ringFloor(h,'hypnosis'),h.hypnosis.value-60);
  const n=(h.attachments||[]).length;h.attachments=[];
  fx('purification_pulse',h.x,h.y,150,.7,{grow:.8,rot:0});
  addFx('text',h.x,h.y-66,'清め','#d8f4ff',1);
  log(`アリア：清めの構え。ヌテラと催眠を払った${n?`（吸着${n}体を振り落とした）`:''}。`);
 }
};
/* the motion rig only knows slash/heavy: borrow heavy for the sweep */
const bStart=startHeroSkill;
startHeroSkill=function(slot,reason=''){
 const h=activeHero(),sk=h?.skills?.[slot],ok=bStart(slot,reason);
 if(ok&&sk?.kind==='spin')h._warriorMotion={name:'heavy',elapsed:0,total:sk.cast+.3,hitAt:sk.cast};
 return ok;
};

/* ================= chests ================= */
const ITEMS=[
 {id:'potion',name:'回復薬',w:4,apply:h=>{h.hp=Math.min(h.maxHp,h.hp+h.maxHp*.3);h.sp=Math.min(h.maxSp,h.sp+h.maxSp*.35)}},
 {id:'water',name:'清めの水',w:3,apply:h=>{h.nutera=Math.max(0,h.nutera-40);if(h.sailState)h.sailState.value=Math.max(ringFloor(h,'sail'),h.sailState.value-40);if(h.hypnosis)h.hypnosis.value=Math.max(ringFloor(h,'hypnosis'),h.hypnosis.value-50)}},
 {id:'whet',name:'砥石',w:2,apply:h=>{h.atk+=3}},
 {id:'charm',name:'集中の護符',w:2,apply:h=>{h.focus+=4;h.maxSp+=6;h.sp+=6}}
];
function roll(){let r=Math.random()*ITEMS.reduce((a,b)=>a+b.w,0);for(const it of ITEMS){if((r-=it.w)<0)return it}return ITEMS[0]}
function freeSpot(minHero=150){
 const r=DG()?.room?.(),h=state.hero;
 for(let k=0;k<40;k++){
  const x=90+Math.random()*(W-180),y=100+Math.random()*(H-180);
  if(DG()?.blockedAt?.({r:24},x,y))continue;
  if(h&&Math.hypot(x-h.x,y-h.y)<minHero)continue;
  if(r&&Math.hypot(x-r.exit[0],y-r.exit[1])<90)continue;
  if(r?.zones?.some(z=>Math.hypot(x-z.x,y-z.y)<z.r+20))continue;
  return{x,y};
 }
 return null;
}
function roomStart(){
 state.chests=[];state.towers=[];
 if(Math.random()<C.chest.chance){const p=freeSpot();if(p)state.chests.push({...p,fake:false,item:roll()})}
 const i=state.dungeon?.room??0;
 if(i>=C.elite.fromRoom&&Math.random()<C.elite.chance){
  const e=state.enemies?.[0];
  if(e&&!e.elite){
   e.elite=true;e.maxHp=e.hp=Math.round(e.maxHp*C.elite.hp);e.r=Math.round(e.r*C.elite.r);e.name=`変異${e.name}`;
   log(`${e.name}——普通の個体より大きく、脈打っている。`);
  }
 }
}
function openChest(h,c){
 c.taken=true;
 if(c.fake){
  hurtHero(h,2,{bind:1.6},{spDamage:12,label:'偽りの宝箱'});
  applyNutera(h,20,{source:'偽りの宝箱'});
  h.mimicWary=(h.mimicWary||0)+1;
  fx('slime_splash',c.x,c.y-10,130,.5);window.Game5FX?.shake?.(6);
  log('偽りの宝箱だった！ 粘液の腕に絡め取られる。');
  h.thought='……宝箱じゃない！ 次からは、開ける前に確かめる。';
 }else{
  c.item.apply(h);
  fx('moon_burst',c.x,c.y-10,120,.6);
  addFx('text',c.x,c.y-34,c.item.name,'#ffe9a0',1.2);
  log(`宝箱から${c.item.name}を手に入れた。`);
  h.thought=`${c.item.name}……助かる。`;
 }
}

/* ================= director tools ================= */
const bPlace=placeDirectorTool;
placeDirectorTool=function(kind,x,y,auto=false){
 const t=C.tools[kind];
 if(!t){
  const ok=bPlace(kind,x,y,auto),z=state.hazards[state.hazards.length-1];
  if(ok&&kind==='fog'&&z)fx('curse_cloud',z.x,z.y,z.r*2.4,1.2,{grow:.3,add:false,alpha:.75});
  return ok;
 }
 const d=state.director,h=state.hero;
 if(!state.started||state.over||(d.cd[kind]||0)>0||d.en<t.cost)return false;
 if(state.dungeon?.pending&&kind==='summon')return false;
 if(auto&&kind==='pool'){
  // Game4: the night side only guesses where she will be; a running target is missed by more
  const moving=Math.hypot(h._vx||0,h._vy||0)>40,lv=window.Game5Balance?.intensity?.[d.intensity||'normal'],err=(moving?130:84)*((lv?.err??70)/70),a=Math.random()*TAU,r=Math.random()*err;
  x+=Math.cos(a)*r;y+=Math.sin(a)*r;
 }
 x=clamp(x,60,W-60);y=clamp(y,70,H-60);
 const fix={x,y,r:t.r};DG()?.resolveEntity?.(fix);x=fix.x;y=fix.y;
 if(kind==='summon'){
  if(alive().length>=t.max)return false;
  if(Math.hypot(x-h.x,y-h.y)<120){const a=Math.atan2(y-h.y,x-h.x);x=clamp(h.x+Math.cos(a)*130,60,W-60);y=clamp(h.y+Math.sin(a)*130,70,H-60)}
  summon(x,y);
 }else if(kind==='pool')state.hazards.push({kind:'directorPool',x,y,r:t.r,t:t.life});
 else if(kind==='tower')(state.towers||=[]).push({x,y,r:t.r,t:t.life,hp:t.hp,maxHp:t.hp,pulse:t.pulse*.6});
 else if(kind==='mimic')(state.chests||=[]).push({x,y,fake:true,t:t.life});
 d.en-=t.cost;d.cd[kind]=t.cd;
 addFx('pulse',x,y,'','#d78db8',.6);
 log(`${auto?'AUTO指揮':'プレイヤー'}：${t.name}${kind==='summon'?'':'を配置'}`);
 return true;
};
const POOLS=[['slug'],['leech','slug'],['worm','leech'],['orb','moth'],['flower','leech'],['moth','orb'],['worm','slug','moth']];
function summon(x,y){
 const i=state.dungeon?.room??0,pool=POOLS[i]||['slug'],type=pool[(Math.random()*pool.length)|0];
 const p=state.enemy,e={...p};
 Object.assign(e,{cast:null,stun:0,root:0,slow:0,guard:0,reactT:0,flash:0,poison:0,bindVisualUntil:0,homeX:undefined,homeY:undefined,_path:null,waitT:0,_lookType:null,elite:false,_hpTuned:false});
 state.enemy=e;Game5Monsters.apply(type,1+Math.floor(i/2));e.x=x;e.y=y;e.actCd=1.2;state.enemy=p;
 e.summoned=true;state.enemies.push(e);
 fx('moon_burst',x,y-10,130,.6,{grow:.5});
 addFx('text',x,y-40,`${e.name} 出現`,'#f0b8ff',1.1);
}

/* ---------- hazards: pool and towers ---------- */
const bHaz=updateHazards;
updateHazards=function(dt){
 bHaz(dt);
 const h=state.hero;if(!h||h.dead)return;
 for(const z of state.hazards){
  if(z.kind!=='directorPool'||Math.hypot(h.x-z.x,h.y-z.y)>z.r+h.r*.5)continue;
  h.status.slow=Math.max(h.status.slow,.35);drainSp(h,2.2*dt,'');applyNutera(h,1.3*dt,{source:'粘沼'});
  z.splashT=(z.splashT||0)-dt;if(z.splashT<=0&&h.moving){z.splashT=.5;fx('mire_ripple',h.x,h.y+18,60,.5,{rot:0,alpha:.7})}
 }
 const tw=C.tools.tower;
 for(const t of state.towers||[]){
  t.t-=dt;t.pulse-=dt;
  if(t.pulse<=0){
   t.pulse=tw.pulse;
   fx('purification_pulse',t.x,t.y,tw.reach*2,.8,{grow:.1,rot:0,alpha:.35});
   if(Math.hypot(h.x-t.x,h.y-t.y)<tw.reach&&!AI()?.wallBetween?.(h,t)&&!h.estella?.active){
    applyTiered(h,'hypnosis',16,{source:'催眠の塔'});
    h.memory.lastHeard={x:t.x,y:t.y,t:state.time};
    addFx('text',h.x,h.y-60,'催眠の電波','#b9a8ff',.9);
   }
  }
 }
 state.towers=(state.towers||[]).filter(t=>t.t>0&&t.hp>0);
 for(const c of state.chests||[])if(c.fake&&c.t!=null)c.t-=dt;
 state.chests=(state.chests||[]).filter(c=>!c.taken&&(c.t==null||c.t>0));
};

/* ================= hero decisions ================= */
function towerTarget(h){
 let best=null;
 for(const t of state.towers||[]){const d=Math.hypot(h.x-t.x,h.y-t.y);if(d<340&&!AI()?.wallBetween?.(h,t)&&(!best||d<best.d))best={t,d}}
 return best;
}
function chestTarget(h){
 const cleared=!!state.dungeon?.pending;let best=null;
 for(const c of state.chests||[]){
  const d=Math.hypot(h.x-c.x,h.y-c.y);
  if(!c.seen&&(d<h.visionRange&&inCone(c.x,c.y,h.x,h.y,h.facing,h.visionRange,h.visionHalf)&&!AI()?.wallBetween?.(h,c)||cleared))c.seen=true;
  if(!c.seen)continue;
  if(!cleared&&(d>280||alive().some(e=>dist(e,h)<200)))continue;
  if(!best||d<best.d)best={c,d};
 }
 return best;
}
function goTo(h,p,speed,label){const v=AI()?.pathDir?.(h,p)||{x:p.x-h.x,y:p.y-h.y};h.intent={kind:'move',x:v.x,y:v.y,speed,label};setHeroFacing(h,p.x,p.y);return h.intent}
const bDecide=decideHero;
decideHero=function(h,dt){
 if(h.dead||h.cast||h.status.stun>0||h.estella?.active||h.status.bind>0)return bDecide(h,dt);
 if(h.openT>0)return h.intent;
 const threats=AI()?.threats?.(h)||[];
 if(threats.length)return bDecide(h,dt);
 const near=alive().filter(e=>dist(h,e)<C.spin.range+e.r+10);
 if(near.length&&(near.length>=2||near.some(e=>e.cast))&&canUse(h,h.skills[SPIN],SPIN))return startHeroSkill(SPIN,near.length>=2?'囲まれてる……まとめて払う！':'詠唱ごと、薙ぎ払う。');
 const hyp=tierInfo(h.hypnosis||{value:0}).stage;
 if((h.nutera>62||(h.attachments||[]).length>=2||hyp>=1)&&!alive().some(e=>dist(h,e)<110)&&canUse(h,h.skills[CLEANSE],CLEANSE))return startHeroSkill(CLEANSE,'……一度、息と一緒に払い落とす。');
 const tt=towerTarget(h);
 if(tt&&(hyp>=1||!alive().some(e=>dist(h,e)<170))){
  if(tt.d<44){h.intent={kind:'hold',x:0,y:0};h.chopT=(h.chopT||0);h.chopTower=tt.t;h.thought='この塔のせいで頭がぼやける。壊す！';return h.intent}
  h.thought='あの塔……頭の中に響いてくる。先に壊す。';return goTo(h,tt.t,1.0,'塔へ');
 }
 const ct=chestTarget(h);
 if(ct){
  if(ct.d<28){h.openT=.55+(h.mimicWary>0?.6:0);h.openChest=ct.c;h.intent={kind:'hold',x:0,y:0};h.thought=h.mimicWary>0?'……前みたいな偽物じゃないか、確かめてから。':'宝箱。開けてみる。';return h.intent}
  h.thought=state.dungeon?.pending?'階段の前に、あの宝箱を。':'今のうちに、宝箱を。';return goTo(h,ct.c,.9,'宝箱へ');
 }
 return bDecide(h,dt);
};
const bHero=updateHero;
updateHero=function(h,dt){
 bHero(h,dt);
 if(h.dead)return;
 if(h.openT>0){
  const c=h.openChest;h.openT-=dt;
  if(!c||c.taken||h.status.stun>0||h.status.bind>0||h.cast){h.openT=0;h.openChest=null}
  else if(h.openT<=0){
   h.openChest=null;
   if(c.fake&&h.mimicWary>0&&Math.random()<Math.min(.8,C.chest.wary*h.mimicWary)){
    c.taken=true;fx('impact_flash',c.x,c.y-8,110,.3);addFx('text',c.x,c.y-34,'見破った','#bfe8ff',1.1);
    log('アリアは偽りの宝箱を見破り、斬り捨てた。');h.thought='やっぱり……偽物。';
   }else openChest(h,c);
  }
 }
 const t=h.chopTower;
 if(t&&t.hp>0&&Math.hypot(h.x-t.x,h.y-t.y)<50&&!h.cast&&h.status.stun<=0){
  h.chopT=(h.chopT||0)-dt;
  if(h.chopT<=0){h.chopT=.7;t.hp-=26*atkMul(h);fx('impact_flash',t.x,t.y-20,70,.25);if(t.hp<=0){log('催眠の塔を叩き壊した。');fx('impact_flash',t.x,t.y-20,150,.35);addFx('text',t.x,t.y-50,'破壊','#fff1a8',1)}}
 }else h.chopTower=null;
};

/* ================= enemies: elite pace ================= */
const bRes=resolveEnemy;
resolveEnemy=function(cast){const e=state.enemy;bRes(cast);if(e?.elite&&!e.cast)e.actCd*=C.elite.pace};

/* ================= AUTO director for the new tools ================= */
const bDir=updateDirector;
updateDirector=function(dt){
 bDir(dt);
 const d=state.director;
 if(!d.auto||!state.started||state.over)return;
 d.extraT=(d.extraT??rnd(C.auto.min,C.auto.max))-dt;if(d.extraT>0)return;
 const lv=window.Game5Balance?.intensity?.[d.intensity||'normal'],room=state.dungeon?.room??0;
 d.extraT=rnd(C.auto.min,C.auto.max)*(lv?.interval??1);
 const h=state.hero;if(!h||h.dead||state.dungeon?.pending)return;
 const ready=k=>(d.cd[k]||0)<=0&&d.en>=C.tools[k].cost;
 const opts=[];
 if(ready('summon')&&room>=2&&alive().length<3)opts.push('summon');
 if(ready('tower')&&!(state.towers||[]).length&&room>=2)opts.push('tower');
 if(ready('pool')&&room>=1)opts.push('pool','pool');
 if(ready('mimic')&&!(state.chests||[]).some(c=>c.fake)&&room>=2)opts.push('mimic');
 if(!opts.length)return;
 const k=opts[(Math.random()*opts.length)|0],a=h.facing;
 const at=k==='pool'?{x:h.x+Math.cos(a)*70,y:h.y+Math.sin(a)*70}:k==='mimic'?(freeSpot(160)||h):k==='tower'?(freeSpot(200)||h):{x:h.x-Math.cos(a)*200,y:h.y-Math.sin(a)*200};
 placeDirectorTool(k,at.x,at.y,true);
};

/* ================= floor bookkeeping ================= */
const bUpdate=update;
update=function(dt){
 bUpdate(dt);
 const i=state.dungeon?.room;
 if(state.started&&(state._contentRoom!==i||state._contentHero!==state.hero)&&state.enemies?.length){state._contentRoom=i;state._contentHero=state.hero;roomStart()}
};

/* ================= drawing ================= */
function drawChest(c){
 const t=state.time,bob=c.fake?Math.sin(t*3+c.x)*1.2:0;
 ctx.save();ctx.translate(c.x,c.y+bob);
 ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(0,12,18,6,0,0,TAU);ctx.fill();
 ctx.fillStyle='#6b4424';ctx.fillRect(-16,-8,32,20);ctx.fillStyle='#8a5a30';ctx.fillRect(-16,-16,32,10);
 ctx.fillStyle='#d9b45a';ctx.fillRect(-16,-7,32,3);ctx.fillRect(-3,-10,6,9);ctx.fillRect(-16,-16,3,28);ctx.fillRect(13,-16,3,28);
 ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.25+.15*Math.sin(t*3);ctx.fillStyle='#ffe28a';ctx.beginPath();ctx.arc(0,-4,22,0,TAU);ctx.fill();
 ctx.restore();
}
function drawTower(tw){
 const t=state.time,p=1-tw.pulse/C.tools.tower.pulse;
 ctx.save();ctx.translate(tw.x,tw.y);
 ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(0,10,20,7,0,0,TAU);ctx.fill();
 ctx.fillStyle='#2b2238';ctx.beginPath();ctx.moveTo(-13,10);ctx.lineTo(-7,-46);ctx.lineTo(7,-46);ctx.lineTo(13,10);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#8f7ad8';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle=`rgba(190,160,255,${.5+.5*p})`;ctx.beginPath();ctx.arc(0,-34,6+3*p,0,TAU);ctx.fill();
 ctx.fillStyle='#000a';ctx.fillRect(-18,16,36,4);ctx.fillStyle='#b9a8ff';ctx.fillRect(-18,16,36*tw.hp/tw.maxHp,4);
 ctx.restore();
}
const G=window.Game5Graphics;
if(G){
 const under=G.drawHazardsUnder;
 G.drawHazardsUnder=function(){
  for(const z of state.hazards||[]){
   if(z.kind!=='directorPool')continue;
   const im=VX()?.tile?.mire,life=clamp(z.t/1.2,0,1);
   ctx.save();ctx.globalAlpha=.8*life;ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.clip();
   if(im?.complete&&im.naturalWidth)ctx.drawImage(im,z.x-z.r,z.y-z.r,z.r*2,z.r*2);else{ctx.fillStyle='#4a6a4a';ctx.fill()}
   ctx.fillStyle='rgba(90,140,90,.25)';ctx.fillRect(z.x-z.r,z.y-z.r,z.r*2,z.r*2);ctx.restore();
   ctx.save();ctx.globalAlpha=.5*life;ctx.strokeStyle='#8fd49a';ctx.setLineDash([4,6]);ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.stroke();ctx.restore();
  }
  under?.();
  for(const c of state.chests||[])drawChest(c);
  for(const t of state.towers||[])drawTower(t);
 };
}
const bDraw=draw;
draw=function(){
 bDraw();
 for(const e of alive())if(e.elite){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35+.15*Math.sin(state.time*5);ctx.strokeStyle='#ff9ad5';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(e.x,e.y-6,e.r+14+3*Math.sin(state.time*4),0,TAU);ctx.stroke();ctx.restore();
 }
};

addEventListener('keydown',e=>{const m={Digit5:'pool',Digit6:'tower',Digit7:'mimic',Digit8:'summon'}[e.code];if(m){state.director.selected=m;renderUI()}});
window.Game5Content={version:'0.13.0',cfg:C,items:ITEMS,summon,roomStart};
})();
