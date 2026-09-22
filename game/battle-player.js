function canUse(h,sk,i){
 if(!state.started||state.over||h.dead||h.cast||h.status.stun>0||h.cd[i]>0)return false;
 if(h.mp<sk.cost)return false;
 const magic=['fireball','frost','lightning','meteor','holy','heal','purify','sanctuary'];
 if(h.status.silence>0&&magic.includes(sk.kind))return false;
 if(sk.range>0&&['melee','bash','heavy','arrow','bindshot','fireball','lightning','holy'].includes(sk.kind)&&dist(h,state.enemy)>sk.range+state.enemy.r)return false;
 return true;
}
function useSkill(slot){
 const h=activeHero(),sk=h.skills[slot];if(!sk||!canUse(h,sk,slot)){if(state.started&&!state.over)log('その技は今は使えない。');return;}
 h.mp-=sk.cost;h.cd[slot]=sk.cd;const e=state.enemy;
 const cast={slot,sk,t:sk.cast,total:sk.cast,target:{x:e.x,y:e.y},ang:Math.atan2(e.y-h.y,e.x-h.x)};
 h.cast=cast;log(`${h.name}：${sk.name}`);
 enemyReact(h,cast);
 if(sk.cast<=.1)resolveHero(h,cast);
}
function enemyReact(h,cast){
 const e=state.enemy,sk=cast.sk;if(e.stun>0||e.root>0||e.cast?.lock)return;
 const d=dist(h,e);
 if(['melee','bash','heavy'].includes(sk.kind)&&d<145&&Math.random()<.48){e.guard=Math.max(e.guard,sk.cast+.45);e.decision='防御態勢';addFx('text',e.x,e.y-72,'防御','#dbe7ff');return;}
 if(['meteor','volley','trap'].includes(sk.kind)&&Math.random()<.78){
  let ax=e.x-cast.target.x,ay=e.y-cast.target.y,len=Math.hypot(ax,ay);
  if(len<1){const a=Math.random()*TAU;ax=Math.cos(a);ay=Math.sin(a);len=1;}
  e.reactX=ax/len;e.reactY=ay/len;e.reactT=Math.max(.7,sk.cast+.45);e.decision='予兆を見て回避';addFx('text',e.x,e.y-72,'回避','#c8d8ff');
 }else if(['arrow','fireball','lightning','holy'].includes(sk.kind)&&Math.random()<.35){
  const ang=cast.ang+(Math.random()<.5?Math.PI/2:-Math.PI/2);e.reactX=Math.cos(ang);e.reactY=Math.sin(ang);e.reactT=.55;e.decision='射線から外れる';
 }
}
function resolveHero(h,cast){
 if(h.cast!==cast)return;h.cast=null;const sk=cast.sk,e=state.enemy,d=dist(h,e);
 switch(sk.kind){
  case'melee': if(d<=sk.range+e.r&&inCone(e.x,e.y,h.x,h.y,cast.ang,sk.range+e.r,.62))hurtEnemy(22,{source:sk.name});break;
  case'bash': if(d<=sk.range+e.r)hurtEnemy(16,{stun:.8,interrupt:true,source:sk.name});break;
  case'guard': h.status.guard=Math.max(h.status.guard,3);addFx('ring',h.x,h.y,'','#bfe2d1');break;
  case'heavy': if(d<=sk.range+e.r&&inCone(e.x,e.y,h.x,h.y,cast.ang,sk.range+e.r,.78))hurtEnemy(52,{interrupt:true,source:sk.name});break;
  case'arrow': if(d<=sk.range+e.r)hurtEnemy(18,{source:sk.name});break;
  case'trap': state.hazards.push({kind:'playerPoison',x:cast.target.x,y:cast.target.y,r:72,t:5,tick:0});break;
  case'bindshot': if(d<=sk.range+e.r)hurtEnemy(12,{root:1.7,source:sk.name});break;
  case'volley': {const dd=Math.hypot(e.x-cast.target.x,e.y-cast.target.y);if(dd<95+e.r){hurtEnemy(12);hurtEnemy(12);hurtEnemy(12);}else log('五月雨は外れた。');break;}
  case'fireball': if(d<=sk.range+e.r)hurtEnemy(30,{source:sk.name});break;
  case'frost': if(d<=sk.range+e.r)hurtEnemy(14,{slow:3,source:sk.name});break;
  case'lightning': if(d<=sk.range+e.r&&pointSegDist(e.x,e.y,h.x,h.y,h.x+Math.cos(cast.ang)*sk.range,h.y+Math.sin(cast.ang)*sk.range)<38+e.r)hurtEnemy(36,{stun:.25,interrupt:true,source:sk.name});break;
  case'meteor': {const dd=Math.hypot(e.x-cast.target.x,e.y-cast.target.y);if(dd<120+e.r)hurtEnemy(72,{stun:.35,source:sk.name});else log('落星は回避された。');addFx('boom',cast.target.x,cast.target.y,'','#ffb56b');break;}
  case'holy': if(d<=sk.range+e.r)hurtEnemy(24,{source:sk.name});break;
  case'heal': {const t=aliveHeroes().sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(t){healHero(t,48);log(`${t.name}のHPが回復。`);}break;}
  case'purify': aliveHeroes().forEach(x=>{x.status.bind=x.status.poison=x.status.silence=x.status.slow=x.status.stun=0;});log('仲間の状態異常を浄化。');break;
  case'sanctuary': state.sanctuary={x:h.x,y:h.y,r:155,t:5,tick:0};log('聖域が展開された。');break;
 }
 addFx('pulse',h.x,h.y,'',h.color);
}
