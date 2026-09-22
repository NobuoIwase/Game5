const ENEMY_SKILLS={
 cleave:{name:'大薙ぎ',cast:.78,kind:'cone',range:160,damage:26},
 charge:{name:'灰槍突進',cast:1.0,kind:'line',range:390,width:58,damage:32},
 bind:{name:'影縛り',cast:1.08,kind:'circle',range:430,r:92,damage:12,status:{bind:2.2}},
 fog:{name:'蝕毒の霧',cast:1.25,kind:'circle',range:450,r:108,damage:7,hazard:true},
 bolt:{name:'黒雷',cast:1.35,kind:'line',range:460,width:72,damage:28,status:{silence:2.4},lock:true}
};
function startEnemySkill(key,target){
 const e=state.enemy,sk=ENEMY_SKILLS[key],ang=Math.atan2(target.y-e.y,target.x-e.x);
 e.cast={key,sk,t:sk.cast,total:sk.cast,target:{x:target.x,y:target.y},ang,start:{x:e.x,y:e.y},lock:!!sk.lock};
 e.decision=`${sk.name} を詠唱`;log(`敵：${sk.name}`);
}
function chooseEnemyAction(){
 const e=state.enemy,t=chooseTarget();if(!t)return;const d=dist(e,t);let key;
 if(d<150)key=Math.random()<.58?'cleave':'bind';
 else if(d<300){const r=Math.random();key=r<.28?'charge':r<.55?'bind':r<.78?'fog':'bolt';}
 else {const r=Math.random();key=r<.32?'charge':r<.58?'fog':r<.82?'bind':'bolt';}
 startEnemySkill(key,t);
}
function resolveEnemy(cast){
 const e=state.enemy;if(e.cast!==cast)return;e.cast=null;const sk=cast.sk;
 for(const h of aliveHeroes()){
  let hit=false;
  if(sk.kind==='circle')hit=Math.hypot(h.x-cast.target.x,h.y-cast.target.y)<=sk.r+h.r;
  else if(sk.kind==='line'){const x2=cast.start.x+Math.cos(cast.ang)*sk.range,y2=cast.start.y+Math.sin(cast.ang)*sk.range;hit=pointSegDist(h.x,h.y,cast.start.x,cast.start.y,x2,y2)<=sk.width/2+h.r;}
  else if(sk.kind==='cone')hit=inCone(h.x,h.y,cast.start.x,cast.start.y,cast.ang,sk.range+h.r,.66);
  if(hit)hurtHero(h,sk.damage,sk.status);
 }
 if(cast.key==='charge'){e.x=clamp(cast.start.x+Math.cos(cast.ang)*235,70,W-70);e.y=clamp(cast.start.y+Math.sin(cast.ang)*235,70,H-70);}
 if(sk.hazard)state.hazards.push({kind:'enemyFog',x:cast.target.x,y:cast.target.y,r:sk.r,t:5.5,tick:0});
 e.actCd=e.phase===2?rnd(.65,1.05):rnd(.95,1.45);e.decision='次の一手を測る';
}
function selectHero(i){if(i<0||i>=state.heroes.length||state.heroes[i].dead)return;state.active=i;renderUI();}
function dirFrom(dx,dy){const sx=Math.sign(dx),sy=Math.sign(dy);if(sy>0)return sx>0?'down_right':sx<0?'down_left':'front';if(sy<0)return sx>0?'up_right':sx<0?'up_left':'back';return sx>0?'right':sx<0?'left':'front';}
function moveVector(){let x=0,y=0;const a=k=>keys.has(k)||touchKeys.has(k);if(a('ArrowLeft')||a('KeyA'))x--;if(a('ArrowRight')||a('KeyD'))x++;if(a('ArrowUp')||a('KeyW'))y--;if(a('ArrowDown')||a('KeyS'))y++;if(x&&y){x*=Math.SQRT1_2;y*=Math.SQRT1_2;}return{x,y};}
function updateStatuses(h,dt){
 for(const k of Object.keys(h.status))h.status[k]=Math.max(0,h.status[k]-dt);
 if(h.status.poison>0){h.poisonTick-=dt;if(h.poisonTick<=0){h.poisonTick=1;hurtHero(h,5);}}
 h.mp=Math.min(h.maxMp,h.mp+dt*1.7);h.flash=Math.max(0,h.flash-dt);
 for(let i=0;i<4;i++)h.cd[i]=Math.max(0,h.cd[i]-dt);
}
function updateHero(h,dt,index){
 updateStatuses(h,dt);if(h.dead)return;
 if(h.cast){h.cast.t-=dt;if(h.cast.t<=0)resolveHero(h,h.cast);}
 h.autoT-=dt;
 if(index!==state.active){
  const lead=activeHero();const offsets=[[-78,-56],[78,-54],[-78,58],[78,58]],of=offsets[index]||[0,70];
  const tx=lead.x+of[0],ty=lead.y+of[1],dx=tx-h.x,dy=ty-h.y,l=Math.hypot(dx,dy);
  if(l>10&&h.status.bind<=0&&h.status.stun<=0){const sp=Math.min(h.speed*.72,l*4);h.x+=dx/l*sp*dt;h.y+=dy/l*sp*dt;h.dir=dirFrom(dx,dy);h.moving=true;}else h.moving=false;
  if(h.autoT<=0&&dist(h,state.enemy)<260){h.autoT=rnd(1.4,2.0);hurtEnemy(index===0?8:index===1?9:index===2?10:7,{source:'援護'});}
 }else{
  const v=moveVector(),blocked=h.status.bind>0||h.status.stun>0;h.moving=!!(v.x||v.y)&&!blocked;
  if(h.moving){const slow=h.status.slow>0?.55:1,castSlow=h.cast?.sk?.kind==='meteor'?.3:.78,sp=h.speed*slow*(h.cast?castSlow:1);h.x=clamp(h.x+v.x*sp*dt,42,W-42);h.y=clamp(h.y+v.y*sp*dt,48,H-48);h.dir=dirFrom(v.x,v.y);}
 }
 if(h.moving){h.anim+=dt*(h===activeHero()?8:6);h.frame=Math.floor(h.anim)%8;}else h.frame=0;
}
function updateEnemy(dt){
 const e=state.enemy;e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);e.root=Math.max(0,e.root-dt);e.slow=Math.max(0,e.slow-dt);e.guard=Math.max(0,e.guard-dt);
 if(e.poison>0){e.poison=Math.max(0,e.poison-dt);e.poisonTick-=dt;if(e.poisonTick<=0){e.poisonTick=1;hurtEnemy(6);}}
 if(e.hp<=e.maxHp*.48)e.phase=2;
 if(e.cast){e.cast.t-=dt;if(e.cast.t<=0)resolveEnemy(e.cast);return;}
 if(e.stun>0){e.decision='気絶';return;}
 if(e.reactT>0&&e.root<=0){e.reactT-=dt;const sp=115*(e.slow>0?.55:1);e.x=clamp(e.x+e.reactX*sp*dt,60,W-60);e.y=clamp(e.y+e.reactY*sp*dt,60,H-60);return;}
 e.actCd-=dt;if(e.actCd<=0){chooseEnemyAction();return;}
 const t=activeHero().dead?aliveHeroes()[0]:activeHero();if(!t)return;const d=dist(e,t);
 if(d>210&&e.root<=0){const dx=t.x-e.x,dy=t.y-e.y,l=Math.hypot(dx,dy)||1,sp=(e.phase===2?83:68)*(e.slow>0?.55:1);e.x+=dx/l*sp*dt;e.y+=dy/l*sp*dt;e.decision='間合いを詰める';}
}
function updateHazards(dt){
 for(const z of state.hazards){z.t-=dt;z.tick-=dt;if(z.tick<=0){z.tick=.65;if(z.kind==='enemyFog'){for(const h of aliveHeroes())if(Math.hypot(h.x-z.x,h.y-z.y)<z.r+h.r){hurtHero(h,3,{poison:3.2,slow:1.2});}}else if(z.kind==='playerPoison'&&Math.hypot(state.enemy.x-z.x,state.enemy.y-z.y)<z.r+state.enemy.r){hurtEnemy(7,{poison:2.4});}}}
 state.hazards=state.hazards.filter(z=>z.t>0);
 if(state.sanctuary){state.sanctuary.t-=dt;state.sanctuary.tick-=dt;if(state.sanctuary.tick<=0){state.sanctuary.tick=.7;for(const h of aliveHeroes())if(Math.hypot(h.x-state.sanctuary.x,h.y-state.sanctuary.y)<state.sanctuary.r)healHero(h,4);}if(state.sanctuary.t<=0)state.sanctuary=null;}
}
function update(dt){
 if(!state.started||state.over)return;state.time+=dt;state.heroes.forEach((h,i)=>updateHero(h,dt,i));updateEnemy(dt);updateHazards(dt);
 for(const f of state.effects)f.t-=dt;state.effects=state.effects.filter(f=>f.t>0);
 if(!aliveHeroes().length)finish(false);renderUI();
}
function finish(win){if(state.over)return;state.over=true;$('endKicker').textContent=win?'VICTORY':'DEFEAT';$('endTitle').textContent=win?'灰冠を打ち破った':'パーティは力尽きた';$('endText').textContent=win?'敵の攻撃範囲を見て避け、拘束・魔法・割り込みを使い分ける戦闘の縦切りが完成しました。':'敵の予兆から離れ、拘束中は別の仲間へ切り替え、浄化や防御を使って立て直してください。';$('endOverlay').classList.remove('hidden');}

