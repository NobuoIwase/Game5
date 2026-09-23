function setHeroFacing(h,x,y){
  const dx=x-h.x,dy=y-h.y;
  if(Math.hypot(dx,dy)<1)return;
  h.facing=Math.atan2(dy,dx);h.dir=dirFrom(dx,dy);
}
function enemyVisibleToHero(h){
  const e=state.enemy,d=dist(h,e);
  return d<=h.visionRange&&angDiff(Math.atan2(e.y-h.y,e.x-h.x),h.facing)<=h.visionHalf;
}
function senseEnemy(h){
  const e=state.enemy,d=dist(h,e),visible=enemyVisibleToHero(h);
  if(visible){
    h.memory.lastSeen={x:e.x,y:e.y,t:state.time};
    h.memory.lastSenseAt=state.time;h.perception=`視認：${Math.round(d)}px / 正確`;
    return {kind:'vision',x:e.x,y:e.y,d};
  }
  if(state.sound&&state.sound.t>0){
    const sd=Math.hypot(h.x-state.sound.x,h.y-state.sound.y);
    if(sd<=h.hearingRange){
      const error=32+Math.min(74,sd*.12);
      const p={x:state.sound.x+rnd(-error,error),y:state.sound.y+rnd(-error,error),t:state.time};
      h.memory.lastHeard=p;
      h.perception=`聴覚：不明な音 / ${Math.round(sd)}px・ぼんやり`;
      return {kind:'hearing',x:p.x,y:p.y,d:sd,source:'sound'};
    }
  }
  const noisy=e.noise>.24||!!e.cast||e.moving;
  if(d<=h.hearingRange&&noisy){
    const age=h.memory.lastHeard?state.time-h.memory.lastHeard.t:99;
    if(age>.34){
      const error=26+Math.min(70,d*.11);
      h.memory.lastHeard={x:e.x+rnd(-error,error),y:e.y+rnd(-error,error),t:state.time};
    }
    const p=h.memory.lastHeard;
    h.perception=`聴覚：${Math.round(d)}px / ぼんやり`;
    return {kind:'hearing',x:p.x,y:p.y,d};
  }
  if(h.memory.lastSeen&&state.time-h.memory.lastSeen.t<4.5){
    const p=h.memory.lastSeen;h.perception=`記憶：${(state.time-p.t).toFixed(1)}秒前`;
    return {kind:'memory',x:p.x,y:p.y,d};
  }
  h.perception='認識なし / 周囲を確認';
  return null;
}
function heroThreatenedByCast(h,cast){
  if(!cast)return false;
  const sk=cast.sk;
  if(sk.kind==='circle')return Math.hypot(h.x-cast.target.x,h.y-cast.target.y)<=sk.r+h.r+8;
  if(sk.kind==='line'){
    const x2=cast.start.x+Math.cos(cast.ang)*sk.range,y2=cast.start.y+Math.sin(cast.ang)*sk.range;
    return pointSegDist(h.x,h.y,cast.start.x,cast.start.y,x2,y2)<=sk.width/2+h.r+8;
  }
  if(sk.kind==='cone')return inCone(h.x,h.y,cast.start.x,cast.start.y,cast.ang,sk.range+h.r+8,.68);
  return false;
}
function dodgeVectorForCast(h,cast){
  const sk=cast.sk;
  if(sk.kind==='circle'){
    let dx=h.x-cast.target.x,dy=h.y-cast.target.y,l=Math.hypot(dx,dy);
    if(l<2){dx=Math.cos(h.facing+Math.PI/2);dy=Math.sin(h.facing+Math.PI/2);l=1;}
    return{x:dx/l,y:dy/l};
  }
  if(sk.kind==='line'||sk.kind==='cone'){
    const side=Math.sin(Math.atan2(h.y-cast.start.y,h.x-cast.start.x)-cast.ang)>=0?1:-1;
    return{x:Math.cos(cast.ang+side*Math.PI/2),y:Math.sin(cast.ang+side*Math.PI/2)};
  }
  return{x:-Math.cos(h.facing),y:-Math.sin(h.facing)};
}
function hazardEscape(h){
  for(const z of state.hazards){
    if(!['enemyFog','directorFog','directorPool'].includes(z.kind))continue;
    const d=Math.hypot(h.x-z.x,h.y-z.y);
    if(d<z.r+h.r+12){
      const l=d||1;return{x:(h.x-z.x)/l,y:(h.y-z.y)/l,label:'瘴気から離れる'};
    }
  }
  return null;
}
function canUse(h,sk,i){
  if(!state.started||state.over||h.dead||h.cast||h.status.stun>0||h.cd[i]>0)return false;
  if(!skillUnlocked(h,sk)||h.mp<sk.cost)return false;
  if(sk.range>0&&['melee','bash','heavy'].includes(sk.kind)){
    if(dist(h,state.enemy)>sk.range+sk.step+state.enemy.r+4)return false;
  }
  return true;
}
function startHeroSkill(slot,reason=''){
  const h=activeHero(),sk=h.skills[slot];
  if(!sk||!canUse(h,sk,slot))return false;
  h.mp-=sk.cost;h.cd[slot]=sk.cd;
  const e=state.enemy;
  setHeroFacing(h,e.x,e.y);
  h.cast={
    slot,sk,t:sk.cast,total:sk.cast,target:{x:e.x,y:e.y},ang:h.facing,
    stepLeft:sk.step||0,startedAt:state.time
  };
  h.intent={kind:'cast',x:0,y:0};h.thought=reason||`${sk.name}で仕掛ける。`;
  log(`${h.name}：${sk.name}`);
  enemyReact(h,h.cast);
  if(sk.cast<=.1)resolveHero(h,h.cast);
  return true;
}
function enemyReact(h,cast){
  const e=state.enemy,sk=cast.sk;if(e.stun>0||e.root>0||e.cast?.lock)return;
  const d=dist(h,e);
  if(['melee','bash','heavy'].includes(sk.kind)&&d<150&&Math.random()<.42){
    e.guard=Math.max(e.guard,sk.cast+.4);e.decision='踏み込みを見て防御';
    addFx('text',e.x,e.y-72,'防御','#dbe7ff');return;
  }
  if(sk.kind==='heavy'&&Math.random()<.46){
    const ang=cast.ang+(Math.random()<.5?Math.PI/2:-Math.PI/2);
    e.reactX=Math.cos(ang);e.reactY=Math.sin(ang);e.reactT=.46;
    e.decision='大振りから軸を外す';addFx('text',e.x,e.y-72,'回避','#c8d8ff');
  }
}
function updateHeroCast(h,dt){
  const cast=h.cast;if(!cast)return;
  const sk=cast.sk,e=state.enemy;
  if(['melee','bash','heavy'].includes(sk.kind)&&cast.stepLeft>0&&h.status.bind<=0&&h.status.stun<=0){
    const dx=e.x-h.x,dy=e.y-h.y,l=Math.hypot(dx,dy)||1;
    const need=Math.max(0,l-(sk.range+e.r-5));
    const step=Math.min(cast.stepLeft,sk.stepSpeed*dt,need);
    if(step>0){
      h.x=clamp(h.x+dx/l*step,40,W-40);h.y=clamp(h.y+dy/l*step,44,H-44);
      cast.stepLeft-=step;h.moving=true;setHeroFacing(h,e.x,e.y);
    }
  }
  cast.t-=dt;
  if(cast.t<=0)resolveHero(h,cast);
}
function resolveHero(h,cast){
  if(h.cast!==cast)return;h.cast=null;
  const base=cast.sk,e=state.enemy,d=dist(h,e),ang=Math.atan2(e.y-h.y,e.x-h.x);
  const sk=base.damage?{...base,damage:Math.round(base.damage*(1+(h.atk-HERO_CFG.atk)/HERO_CFG.atk*(h.atkScale??0)))}:base;
  h.facing=ang;h.dir=dirFrom(e.x-h.x,e.y-h.y);
  switch(sk.kind){
    case'melee':
      if(d<=sk.range+e.r&&inCone(e.x,e.y,h.x,h.y,ang,sk.range+e.r,.64))hurtEnemy(sk.damage,{source:sk.name});
      else log('斬撃は間合いの外へ抜けられた。');
      break;
    case'bash':
      if(d<=sk.range+e.r)hurtEnemy(sk.damage,{stun:.78,interrupt:true,source:sk.name});
      else log('盾撃は届かなかった。');
      break;
    case'guard':
      h.status.guard=Math.max(h.status.guard,3);addFx('ring',h.x,h.y,'','#bfe2d1',.7);break;
    case'heavy':
      if(d<=sk.range+e.r&&inCone(e.x,e.y,h.x,h.y,ang,sk.range+e.r,.8))hurtEnemy(sk.damage,{stun:.22,interrupt:true,source:sk.name});
      else log('破城斬りは空を切った。');
      break;
  }
  addFx('pulse',h.x,h.y,'',h.color,.38);
}
function decideHero(h){
  if(h.dead||h.cast||h.status.stun>0)return;
  const e=state.enemy,sense=senseEnemy(h),d=dist(h,e),cast=e.cast;
  const escape=hazardEscape(h);
  if(escape){
    h.intent={kind:'move',x:escape.x,y:escape.y,speed:1.08};h.thought='足元がまずい。ここから出ないと。';return;
  }
  if(cast&&sense&&sense.kind==='vision'&&heroThreatenedByCast(h,cast)){
    const k=h.knowledge[cast.key]||0;
    const confidence=.38+Math.min(.56,k*.24)+h.focus*.004;
    if(Math.random()<confidence){
      if(cast.key==='cleave'&&canUse(h,h.skills[2],2)&&Math.random()<.36){
        startHeroSkill(2,'避け切れない。盾で受ける。');return;
      }
      if(e.cast&&['bind','bolt'].includes(cast.key)&&canUse(h,h.skills[1],1)&&d<h.skills[1].range+h.skills[1].step+e.r){
        startHeroSkill(1,'詠唱を止めるなら、今。');return;
      }
      const v=dodgeVectorForCast(h,cast);
      h.intent={kind:'move',x:v.x,y:v.y,speed:1.22};
      h.thought=k<.8?'何が来る……？ とにかく予兆から外れる。':`${ENEMY_LABELS[cast.key]}。前と同じなら、ここを外す。`;
      h.dodgeCastId=cast.id;return;
    }
    h.thought='怖い。動くべきなのに、一瞬遅れた。';
  }
  if(h.status.bind>0){
    h.intent={kind:'hold',x:0,y:0};h.thought='動けない……ほどかないと。';return;
  }
  if(h.sp<h.maxSp*.28){
    if(d<175&&sense){
      const dx=h.x-e.x,dy=h.y-e.y,l=Math.hypot(dx,dy)||1;
      h.intent={kind:'move',x:dx/l,y:dy/l,speed:1.08};h.thought='息が上がってる。いったん離れよう。';return;
    }
    h.intent={kind:'hold',x:0,y:0};h.thought='少しだけ、呼吸を整える。';return;
  }
  if(sense){
    setHeroFacing(h,sense.x,sense.y);
    if(sense.kind==='hearing'){
      const dx=sense.x-h.x,dy=sense.y-h.y,l=Math.hypot(dx,dy)||1;
      h.intent={kind:'move',x:dx/l,y:dy/l,speed:.62};h.thought='後ろ……？ 音がした。まず確認する。';return;
    }
    if(sense.kind==='memory'&&state.time-(h.memory.lastSeen?.t||0)>1.1){
      const dx=sense.x-h.x,dy=sense.y-h.y,l=Math.hypot(dx,dy)||1;
      h.intent={kind:'move',x:dx/l,y:dy/l,speed:.64};h.thought='さっき見えた位置を確かめる。';return;
    }
    if(canUse(h,h.skills[3],3)&&d<145&&e.guard<=0&&Math.random()<.22){
      startHeroSkill(3,'……今なら、踏み込める。');return;
    }
    if(canUse(h,h.skills[1],1)&&e.cast&&Math.random()<.76){
      startHeroSkill(1,'詠唱を止める。届く距離まで入る。');return;
    }
    if(canUse(h,h.skills[0],0)&&d<128){
      startHeroSkill(0,h.level===1?'こ、これなら当てられる。':'間合いに入った。斬る。');return;
    }
    const desired=105;
    if(d>desired+18){
      const dx=e.x-h.x,dy=e.y-h.y,l=Math.hypot(dx,dy)||1;
      h.intent={kind:'move',x:dx/l,y:dy/l,speed:.9};
      h.thought=h.knowledge.cleave<.7?'近づくの、怖いけど……届かない。':'大薙ぎの外から、一気に間合いへ。';
    }else if(d<72){
      const dx=h.x-e.x,dy=h.y-e.y,l=Math.hypot(dx,dy)||1;
      h.intent={kind:'move',x:dx/l,y:dy/l,speed:.82};h.thought='近すぎる。半歩、外へ。';
    }else{
      const side=Math.sin(state.time*.8)>0?1:-1,ang=Math.atan2(h.y-e.y,h.x-e.x)+side*Math.PI/2;
      h.intent={kind:'move',x:Math.cos(ang),y:Math.sin(ang),speed:.42};
      h.thought='相手の顔を見ながら、横へ回る。';
    }
  }else{
    const a=h.facing+.8;
    h.intent={kind:'move',x:Math.cos(a),y:Math.sin(a),speed:.26};
    h.thought='見えない。音を待ちながら振り向く。';
    h.facing+=.34;h.dir=dirFrom(Math.cos(h.facing),Math.sin(h.facing));
  }
}
function updateStatuses(h,dt){
  for(const k of Object.keys(h.status))h.status[k]=Math.max(0,h.status[k]-dt);
  if(h.status.poison>0){
    h.poisonTick-=dt;if(h.poisonTick<=0){h.poisonTick=1;hurtHero(h,h.poisonDmg??4,null,{spDamage:1});}
  }
  if(h.status.bind>0)drainSp(h,(h.bindDrain??9.2)*dt);
  else if(h.status.stun<=0)h.sp=Math.min(h.maxSp,h.sp+dt*(h.cast?2.0:(h.spRegen??5.8)));
  h.mp=Math.min(h.maxMp,h.mp+dt*1.55);h.flash=Math.max(0,h.flash-dt);
  for(let i=0;i<h.cd.length;i++)h.cd[i]=Math.max(0,h.cd[i]-dt);
}
function updateHero(h,dt){
  updateStatuses(h,dt);if(h.dead)return;
  h.moving=false;
  if(h.cast){
    updateHeroCast(h,dt);
  }else{
    h.aiWait-=dt;
    if(h.aiWait<=0){
      const known=Object.values(h.knowledge).reduce((a,b)=>a+b,0);
      const hesitation=known<1.2?rnd(.18,.31):rnd(.12,.22);
      h.aiWait=hesitation;decideHero(h);
    }
    const it=h.intent,blocked=h.status.bind>0||h.status.stun>0;
    if(it&&it.kind==='move'&&!blocked){
      const l=Math.hypot(it.x,it.y)||1,slow=h.status.slow>0?.58:1;
      const sp=h.speed*slow*(it.speed||1);
      const dx=it.x/l*sp*dt,dy=it.y/l*sp*dt;
      h.x=clamp(h.x+dx,38,W-38);h.y=clamp(h.y+dy,44,H-44);
      h.moving=Math.hypot(dx,dy)>.2;
      if(h.moving&&it.speed>.45){h.dir=dirFrom(dx,dy);h.facing=Math.atan2(dy,dx);}
    }
  }
  if(h.moving){h.anim+=dt*(h.intent?.speed>1?9:7);h.frame=Math.floor(h.anim)%8;}else h.frame=0;
}
