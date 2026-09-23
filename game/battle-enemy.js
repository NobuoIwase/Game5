const ENEMY_SKILLS={
  cleave:{name:'大薙ぎ',cast:.82,kind:'cone',range:155,step:44,stepSpeed:175,damage:25,spDamage:10},
  charge:{name:'灰槍突進',cast:1.0,kind:'line',range:385,width:58,damage:31,spDamage:18,travel:235},
  bind:{name:'影縛り',cast:1.08,kind:'circle',range:420,r:88,damage:10,spDamage:15,status:{bind:2.15}},
  fog:{name:'蝕毒の霧',cast:1.22,kind:'circle',range:440,r:104,damage:6,spDamage:5,hazard:true},
  bolt:{name:'黒雷',cast:1.32,kind:'line',range:455,width:70,damage:27,spDamage:8,status:{silence:2.3},lock:true}
};
function startEnemySkill(key,target){
  const e=state.enemy,sk=ENEMY_SKILLS[key],d=dist(e,target);
  if(d>sk.range+(sk.step||0)+target.r+10){e.actCd=.36;e.decision='射程へ入る';return false;}
  const ang=Math.atan2(target.y-e.y,target.x-e.x),id=++state.castSeq;
  e.cast={
    id,key,sk,t:sk.cast,total:sk.cast,target:{x:target.x,y:target.y},ang,
    start:{x:e.x,y:e.y},lock:!!sk.lock,stepLeft:sk.step||0,threatenedAtStart:heroThreatenedByCast(target,{sk,target:{x:target.x,y:target.y},ang,start:{x:e.x,y:e.y}})
  };
  e.decision=`${sk.name} を構える`;e.noise=1;
  log(`敵：${sk.name}`);
  return true;
}
function chooseEnemyAction(){
  const e=state.enemy,t=chooseTarget();if(!t)return;
  const d=dist(e,t);let key;
  if(d<145)key=Math.random()<.62?'cleave':'bind';
  else if(d<285){const r=Math.random();key=r<.28?'charge':r<.53?'bind':r<.76?'fog':'bolt';}
  else {const r=Math.random();key=r<.34?'charge':r<.58?'fog':r<.80?'bind':'bolt';}
  startEnemySkill(key,t);
}
function updateEnemyCast(e,dt){
  const cast=e.cast;if(!cast)return;
  const sk=cast.sk,h=state.hero;
  if(cast.key==='cleave'&&cast.stepLeft>0&&e.root<=0){
    const dx=h.x-e.x,dy=h.y-e.y,l=Math.hypot(dx,dy)||1;
    const need=Math.max(0,l-(sk.range+h.r-8));
    const step=Math.min(cast.stepLeft,sk.stepSpeed*dt,need);
    if(step>0){
      e.x=clamp(e.x+dx/l*step,58,W-58);e.y=clamp(e.y+dy/l*step,58,H-58);
      cast.stepLeft-=step;cast.start.x=e.x;cast.start.y=e.y;cast.ang=Math.atan2(h.y-e.y,h.x-e.x);
      e.moving=true;
    }
  }
  cast.t-=dt;
  if(cast.t<=0)resolveEnemy(cast);
}
function resolveEnemy(cast){
  const e=state.enemy;if(e.cast!==cast)return;e.cast=null;const sk=cast.sk,h=state.hero;
  let hit=false;
  if(!h.dead){
    if(sk.kind==='circle')hit=Math.hypot(h.x-cast.target.x,h.y-cast.target.y)<=sk.r+h.r;
    else if(sk.kind==='line'){
      const x2=cast.start.x+Math.cos(cast.ang)*sk.range,y2=cast.start.y+Math.sin(cast.ang)*sk.range;
      hit=pointSegDist(h.x,h.y,cast.start.x,cast.start.y,x2,y2)<=sk.width/2+h.r;
    }else if(sk.kind==='cone'){
      hit=inCone(h.x,h.y,cast.start.x,cast.start.y,cast.ang,sk.range+h.r,.66);
    }
    if(hit){
      hurtHero(h,sk.damage,sk.status,{spDamage:sk.spDamage,label:sk.name,sourceKey:cast.key,castId:cast.id});
    }else if(h.dodgeCastId===cast.id){
      learnEnemy(cast.key,.24);
      addFx('text',h.x,h.y-60,'回避','#bfe8ff');
    }else if(enemyVisibleToHero(h)){
      learnEnemy(cast.key,.10);
    }
  }
  if(cast.key==='charge'){
    // slide along the charge line and stop in front of the first wall
    const blocked=window.Game5Dungeon?.blockedAt;let tx=cast.start.x,ty=cast.start.y;
    for(let d=8;d<=sk.travel;d+=8){const nx=clamp(cast.start.x+Math.cos(cast.ang)*d,65,W-65),ny=clamp(cast.start.y+Math.sin(cast.ang)*d,65,H-65);if(blocked?.(e,nx,ny))break;tx=nx;ty=ny}
    e.x=tx;e.y=ty;
  }
  if(sk.hazard)state.hazards.push({kind:'enemyFog',x:cast.target.x,y:cast.target.y,r:sk.r,t:5.2,tick:.2});
  e.actCd=e.phase===2?rnd(.72,1.08):rnd(1.02,1.48);e.decision='次の一手を測る';e.noise=.24;
}
function updateEnemy(dt){
  const e=state.enemy,h=state.hero;
  e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);e.root=Math.max(0,e.root-dt);e.slow=Math.max(0,e.slow-dt);e.guard=Math.max(0,e.guard-dt);
  e.noise=Math.max(.12,e.noise-dt*1.4);e.moving=false;
  if(e.poison>0){
    e.poison=Math.max(0,e.poison-dt);e.poisonTick-=dt;
    if(e.poisonTick<=0){e.poisonTick=1;hurtEnemy(6,{xp:false});}
  }
  if(e.hp<=e.maxHp*.48)e.phase=2;
  if(e.cast){updateEnemyCast(e,dt);return;}
  if(e.stun>0){e.decision='気絶';return;}
  if(e.reactT>0&&e.root<=0){
    e.reactT-=dt;const sp=116*(e.slow>0?.55:1);
    e.x=clamp(e.x+e.reactX*sp*dt,58,W-58);e.y=clamp(e.y+e.reactY*sp*dt,58,H-58);
    e.moving=true;e.noise=.4;return;
  }
  e.actCd-=dt;
  if(e.actCd<=0){chooseEnemyAction();return;}
  if(!h||h.dead)return;
  if(e.root<=0&&window.Game5EnemyAI?.move?.(e,h,dt))return;
  const d=dist(e,h);
  if(d>205&&e.root<=0){
    const dx=h.x-e.x,dy=h.y-e.y,l=Math.hypot(dx,dy)||1;
    const sp=(e.phase===2?86:69)*(e.slow>0?.55:1);
    e.x+=dx/l*sp*dt;e.y+=dy/l*sp*dt;e.decision='間合いを詰める';e.moving=true;e.noise=.33;
  }else if(d<92&&e.root<=0&&e.actCd>.45){
    const dx=e.x-h.x,dy=e.y-h.y,l=Math.hypot(dx,dy)||1;
    e.x+=dx/l*42*dt;e.y+=dy/l*42*dt;e.decision='近すぎる間合いを外す';e.moving=true;e.noise=.27;
  }
}
function placeDirectorTool(kind,x,y,auto=false){
  const d=state.director,t=DIRECTOR_TOOLS[kind];
  if(!t||!state.started||state.over)return false;
  if(d.cd[kind]>0||d.en<t.cost)return false;
  x=clamp(x,48,W-48);y=clamp(y,48,H-48);
  d.en-=t.cost;d.cd[kind]=t.cd;
  if(kind==='snare')state.hazards.push({kind:'directorSnare',x,y,r:t.r,t:12,arm:.55,triggered:false});
  if(kind==='fog')state.hazards.push({kind:'directorFog',x,y,r:t.r,t:5.4,tick:.2});
  if(kind==='lure'){
    state.hazards.push({kind:'directorLure',x,y,r:t.r,t:3.2,pulse:0});
    state.sound={x,y,t:3.2,strength:1};
  }
  addFx('pulse',x,y,'','#d78db8',.6);
  log(`${auto?'AUTO指揮':'プレイヤー'}：${t.name}を配置`);
  return true;
}
function updateDirector(dt){
  const d=state.director;
  d.en=Math.min(d.maxEn,d.en+dt*8.0);
  for(const k of Object.keys(d.cd))d.cd[k]=Math.max(0,d.cd[k]-dt);
  if(state.sound){state.sound.t-=dt;if(state.sound.t<=0)state.sound=null;}
  if(!d.auto||!state.started||state.over)return;
  d.autoT-=dt;if(d.autoT>0)return;
  d.autoT=rnd(3.7,5.4);
  const h=state.hero;if(!h||h.dead)return;
  const choices=['snare','fog','lure'].filter(k=>d.cd[k]<=0&&d.en>=DIRECTOR_TOOLS[k].cost);
  if(!choices.length)return;
  const kind=choices[(Math.random()*choices.length)|0];
  const lead=kind==='snare'?58:kind==='fog'?28:120;
  const x=h.x+Math.cos(h.facing)*lead+rnd(-35,35),y=h.y+Math.sin(h.facing)*lead+rnd(-35,35);
  placeDirectorTool(kind,x,y,true);
}
const FOG_TICK={enemy:{hp:3,poison:3.0,slow:1.1,sp:2},director:{hp:2,poison:2.4,slow:.8,sp:2.5}};
function updateHazards(dt){
  const h=state.hero,fe=FOG_TICK.enemy,fd=FOG_TICK.director;
  for(const z of state.hazards){
    z.t-=dt;
    if(z.arm!=null)z.arm-=dt;
    if(z.tick!=null)z.tick-=dt;
    if(z.kind==='enemyFog'&&z.tick<=0){
      z.tick=.64;
      if(!h.dead&&Math.hypot(h.x-z.x,h.y-z.y)<z.r+h.r)hurtHero(h,fe.hp,{poison:fe.poison,slow:fe.slow},{spDamage:fe.sp,label:'蝕毒の霧'});
    }else if(z.kind==='directorFog'&&z.tick<=0){
      z.tick=.58;
      if(!h.dead&&Math.hypot(h.x-z.x,h.y-z.y)<z.r+h.r)hurtHero(h,fd.hp,{poison:fd.poison,slow:fd.slow},{spDamage:fd.sp,label:'瘴気壺'});
    }else if(z.kind==='directorSnare'&&!z.triggered&&z.arm<=0&&!h.dead&&Math.hypot(h.x-z.x,h.y-z.y)<z.r+h.r){
      z.triggered=true;z.t=.55;
      const st=DIRECTOR_TOOLS.snare;h.status.bind=Math.max(h.status.bind,st.bind??1.65);drainSp(h,st.sp??21,'影杭');
      addFx('ring',h.x,h.y,'','#e5a2d0',.8);log('影杭が足を取った。');
    }else if(z.kind==='directorLure'&&!h.dead){
      z.pulse-=dt;
      if(z.pulse<=0){z.pulse=.45;state.sound={x:z.x,y:z.y,t:.6,strength:1};}
      if(!enemyVisibleToHero(h)&&Math.hypot(h.x-z.x,h.y-z.y)<h.hearingRange){
        h.memory.lastHeard={x:z.x+rnd(-18,18),y:z.y+rnd(-18,18),t:state.time};
      }
    }
  }
  state.hazards=state.hazards.filter(z=>z.t>0);
}
function update(dt){
  if(!state.started||state.over)return;
  state.time+=dt;
  updateDirector(dt);updateHero(state.hero,dt);updateEnemy(dt);updateHazards(dt);
  for(const f of state.effects)f.t-=dt;
  state.effects=state.effects.filter(f=>f.t>0);
  if(state.hero.dead)finish(false);
  state.uiT=(state.uiT||0)-dt;
  if(state.uiT<=0){state.uiT=.1;renderUI();}
}
function finish(win){
  if(state.over)return;state.over=true;
  const h=state.hero;
  $('endKicker').textContent=win?'VICTORY':'DEFEAT';
  $('endTitle').textContent=win?'灰冠を打ち破った':h.defeatReason==='SP'?'抵抗する力を失った':'戦士は力尽きた';
  $('endText').textContent=win
    ?`Lv${h.level}。間合い・踏み込み・予兆回避・学習を自律AIだけで処理しました。`
    :h.defeatReason==='SP'
      ?'HPが残っていてもSPが0になると敗北します。拘束や一部の攻撃はスタミナを直接削ります。'
      :'攻撃範囲と状態異常に押し切られました。敵側のAUTO指揮を切ると罠配置だけ手動で試せます。';
  $('endOverlay').classList.remove('hidden');
}
