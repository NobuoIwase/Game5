'use strict';
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const W=960,H=540,TAU=Math.PI*2;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rnd=(a,b)=>a+Math.random()*(b-a);
const logs=[];
function log(s){
  logs.unshift(s);logs.splice(6);
  const el=$('log');
  if(el)el.innerHTML=logs.map(x=>`<div>${x}</div>`).join('');
}
function pointSegDist(px,py,x1,y1,x2,y2){
  const vx=x2-x1,vy=y2-y1,wx=px-x1,wy=py-y1,c1=vx*wx+vy*wy,c2=vx*vx+vy*vy,t=c2?clamp(c1/c2,0,1):0;
  return Math.hypot(px-(x1+vx*t),py-(y1+vy*t));
}
function angDiff(a,b){let d=(a-b+Math.PI)%TAU-Math.PI;return Math.abs(d);}
function inCone(px,py,ox,oy,ang,range,half){
  const dx=px-ox,dy=py-oy;
  return Math.hypot(dx,dy)<=range&&angDiff(Math.atan2(dy,dx),ang)<=half;
}
function dirFrom(dx,dy){
  const sx=Math.sign(dx),sy=Math.sign(dy);
  if(sy>0)return sx>0?'down_right':sx<0?'down_left':'front';
  if(sy<0)return sx>0?'up_right':sx<0?'up_left':'back';
  return sx>0?'right':sx<0?'left':'front';
}
const DIR_ROWS={front:0,down_right:1,right:2,up_right:3,back:4,up_left:5,left:6,down_left:7};
const ENEMY_LABELS={cleave:'大薙ぎ',charge:'灰槍突進',bind:'影縛り',fog:'蝕毒の霧',bolt:'黒雷'};

const HERO_CFG={
  id:'warrior',
  name:'戦士アリア',
  role:'自律前衛 / パイロット',
  personality:'引っ込み思案・愛想笑いで緊張を隠す・戦闘の天賦が高い',
  hint:'プレイヤーは操作しません。視界・聴覚・記憶と性格に基づき、本人が移動と技を選びます。',
  hp:180,mp:34,sp:100,speed:158,color:'#d9b67a',
  atk:31,def:24,agi:18,focus:15,
  visionRange:335,visionHalf:.92,hearingRange:430,
  skills:[
    {name:'斬撃',cost:0,cd:.72,cast:.24,range:78,step:46,stepSpeed:230,kind:'melee',damage:22,unlock:1,desc:'射程78 + 踏込46 / 扇'},
    {name:'盾撃',cost:4,cd:4.2,cast:.32,range:68,step:42,stepSpeed:220,kind:'bash',damage:16,unlock:2,desc:'Lv2 / 中断・気絶'},
    {name:'堅守',cost:3,cd:7.5,cast:.12,range:0,step:0,kind:'guard',unlock:1,desc:'3秒 被害55%減'},
    {name:'破城斬り',cost:9,cd:8.8,cast:.78,range:102,step:58,stepSpeed:245,kind:'heavy',damage:54,unlock:3,desc:'Lv3 / 大踏込・中断'}
  ]
};

const DIRECTOR_TOOLS={
  snare:{name:'影杭',cost:22,cd:3.8,r:42,desc:'踏むと拘束 + SP大幅減'},
  fog:{name:'瘴気壺',cost:30,cd:5.8,r:76,desc:'毒・鈍足 + SP持続減'},
  lure:{name:'囮鐘',cost:16,cd:3.2,r:34,desc:'視界外の音で注意を逸らす'}
};

function makeHero(){
  const h={...HERO_CFG};
  h.x=245;h.y=292;h.maxHp=h.hp;h.maxMp=h.mp;h.maxSp=h.sp;
  h.level=1;h.xp=0;h.r=17;h.cd=[0,0,0,0];
  h.status={bind:0,poison:0,silence:0,slow:0,guard:0,stun:0};
  h.poisonTick=0;h.cast=null;h.dir='right';h.facing=0;h.moving=false;h.anim=0;h.frame=0;h.dead=false;h.flash=0;
  h.aiWait=.18;h.intent={kind:'observe',x:0,y:0};h.thought='……まず、相手の出方を見よう。';
  h.perception='視認なし';h.expression='困ったような愛想笑い';
  h.memory={lastSeen:null,lastHeard:null,lastSenseAt:-99,enemyId:'gray_crown'};
  h.knowledge={cleave:0,charge:0,bind:0,fog:0,bolt:0};
  h.dodgeCastId=null;h.lastHitCastId=null;h.defeatReason='';
  return h;
}

const state={
  version:'0.3.0',started:false,over:false,time:0,hero:null,enemy:null,
  hazards:[],effects:[],images:new Map(),sound:null,castSeq:0,
  director:{en:100,maxEn:100,selected:'snare',auto:true,autoT:3.4,cd:{snare:0,fog:0,lure:0},cursor:{x:480,y:270,inside:false}}
};

function reset(){
  state.started=false;state.over=false;state.time=0;state.hero=makeHero();
  state.enemy={
    id:'gray_crown',name:'灰冠の呪術騎士',x:710,y:270,r:30,hp:660,maxHp:660,phase:1,
    cast:null,actCd:1.7,stun:0,root:0,slow:0,guard:0,reactT:0,reactX:0,reactY:0,flash:0,
    poison:0,poisonTick:0,decision:'距離を測っている',noise:.15,moving:false
  };
  state.hazards=[];state.effects=[];state.sound=null;state.castSeq=0;
  Object.assign(state.director,{en:100,selected:'snare',auto:true,autoT:3.4,cursor:{x:480,y:270,inside:false}});
  state.director.cd={snare:0,fog:0,lure:0};
  logs.length=0;$('log').innerHTML='';
  $('endOverlay').classList.add('hidden');$('startOverlay').classList.remove('hidden');
  preload();renderUI();
  log('戦士アリアは自律行動。プレイヤーは敵側の罠を配置します。');
}

function preload(){
  const h=state.hero;
  if(state.images.has(h.id))return;
  const a={};
  for(const m of ['walk','run']){
    const im=new Image();
    im.src=`../character-motion-v1/exports/${h.id}/${m}.png`;
    a[m]=im;
  }
  state.images.set(h.id,a);
}
function activeHero(){return state.hero;}
function aliveHeroes(){return state.hero&&!state.hero.dead?[state.hero]:[];}
function chooseTarget(){return state.hero&&!state.hero.dead?state.hero:null;}
function addFx(kind,x,y,text='',color='#fff',life){
  const t=life??(kind==='text'?1.05:.45);
  state.effects.push({kind,x,y,text,color,t,max:t});
}
function statusText(h){
  const a=[];
  if(h.status.bind>0)a.push('拘束');
  if(h.status.poison>0)a.push('毒');
  if(h.status.silence>0)a.push('沈黙');
  if(h.status.slow>0)a.push('鈍足');
  if(h.status.guard>0)a.push('堅守');
  if(h.status.stun>0)a.push('気絶');
  return a.join('・')||'正常';
}
function skillUnlocked(h,sk){return h.level>=sk.unlock;}
function xpForLevel(level){return [0,0,64,178,338][level]??Infinity;}
function gainHeroXp(n){
  const h=state.hero;if(!h||h.dead||h.level>=4)return;
  h.xp+=n;
  while(h.level<4&&h.xp>=xpForLevel(h.level+1)){
    h.level++;
    h.maxHp+=12;h.maxMp+=4;h.maxSp+=6;h.atk+=4;h.def+=3;h.agi+=2;h.focus+=2;
    h.hp=Math.min(h.maxHp,h.hp+28);h.mp=Math.min(h.maxMp,h.mp+10);h.sp=Math.min(h.maxSp,h.sp+22);
    log(`LEVEL UP — ${h.name} Lv${h.level}`);
    addFx('text',h.x,h.y-70,`Lv ${h.level}`,'#fff1a8',1.4);
    const unlocked=h.skills.filter(s=>s.unlock===h.level).map(s=>s.name);
    if(unlocked.length)log(`新しい技を習得：${unlocked.join(' / ')}`);
  }
}
function knowledgeLevel(h,key){return Math.min(3,Math.floor(clamp(h.knowledge[key]||0,0,3)));}
function learnEnemy(key,amount=.45){
  const h=state.hero;if(!h||!h.knowledge.hasOwnProperty(key))return;
  const before=knowledgeLevel(h,key);
  h.knowledge[key]=clamp(h.knowledge[key]+amount,0,3);
  const after=knowledgeLevel(h,key);
  if(after>before){
    const word=after===1?'攻撃の癖を覚えた':after===2?'対処法が見えてきた':'完全に読み切りつつある';
    log(`${ENEMY_LABELS[key]}：${word}`);
  }
}
function drainSp(h,n,label=''){
  if(h.dead)return;
  const mul=h.status.guard>0?.62:1;
  const loss=Math.max(0,n*mul);
  h.sp=Math.max(0,h.sp-loss);
  if(loss>=4)addFx('text',h.x+22,h.y-24,`SP -${Math.round(loss)}`,'#efc46d');
  if(label&&loss>=8)log(`${label}でスタミナを削られた。`);
  if(h.sp<=0)knockOutHero(h,'SP');
}
function knockOutHero(h,reason){
  if(h.dead)return;
  h.dead=true;h.cast=null;h.moving=false;h.defeatReason=reason;
  log(reason==='SP'?`${h.name}は抵抗する力を失った。`:`${h.name}は戦闘不能！`);
}
function hurtHero(h,dmg,status=null,meta={}){
  if(h.dead)return;
  let mul=h.status.guard>0?.45:1;
  dmg=Math.max(1,Math.round(dmg*mul));
  h.hp=Math.max(0,h.hp-dmg);h.flash=.18;
  addFx('text',h.x,h.y-50,`HP -${dmg}`,'#ff8d84');
  if(status){
    for(const [k,v] of Object.entries(status))h.status[k]=Math.max(h.status[k]||0,v);
  }
  if(meta.spDamage)drainSp(h,meta.spDamage,meta.label||'攻撃');
  if(meta.sourceKey){
    h.lastHitCastId=meta.castId||h.lastHitCastId;
    learnEnemy(meta.sourceKey,.72);
  }
  if(h.hp<=0)knockOutHero(h,'HP');
}
function healHero(h,n){
  if(h.dead)return;
  const got=Math.min(n,h.maxHp-h.hp);h.hp+=got;
  if(got>0)addFx('text',h.x,h.y-44,`+${Math.round(got)}`,'#9ff0a9');
}
function hurtEnemy(dmg,opts={}){
  const e=state.enemy;if(e.hp<=0)return;
  let mul=e.guard>0?.42:1;
  dmg=Math.max(1,Math.round(dmg*mul));
  const before=e.hp;e.hp=Math.max(0,e.hp-dmg);const actual=before-e.hp;
  e.flash=.18;addFx('text',e.x,e.y-54,`-${actual}`,'#fff0a2');
  if(opts.stun)e.stun=Math.max(e.stun,opts.stun);
  if(opts.root)e.root=Math.max(e.root,opts.root);
  if(opts.slow)e.slow=Math.max(e.slow,opts.slow);
  if(opts.poison)e.poison=Math.max(e.poison,opts.poison);
  if(opts.interrupt&&e.cast){
    log(`${opts.source||'攻撃'}が敵の詠唱を中断！`);
    learnEnemy(e.cast.key,.34);
    e.cast=null;e.stun=Math.max(e.stun,.38);e.decision='体勢を崩した';
  }
  if(opts.xp!==false)gainHeroXp(Math.max(2,Math.round(actual*.78)));
  if(e.hp<=0)finish(true);
}
