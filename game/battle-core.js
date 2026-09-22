'use strict';
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const W=960,H=540,TAU=Math.PI*2;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rnd=(a,b)=>a+Math.random()*(b-a);
const keys=new Set(), touchKeys=new Set();
const logs=[];
function log(s){logs.unshift(s);logs.splice(4);$('log').innerHTML=logs.map(x=>`<div>${x}</div>`).join('');}
function pointSegDist(px,py,x1,y1,x2,y2){const vx=x2-x1,vy=y2-y1,wx=px-x1,wy=py-y1,c1=vx*wx+vy*wy,c2=vx*vx+vy*vy,t=c2?clamp(c1/c2,0,1):0;return Math.hypot(px-(x1+vx*t),py-(y1+vy*t));}
function angDiff(a,b){let d=(a-b+Math.PI)%(TAU)-Math.PI;return Math.abs(d);}
function inCone(px,py,ox,oy,ang,range,half){const dx=px-ox,dy=py-oy;return Math.hypot(dx,dy)<=range&&angDiff(Math.atan2(dy,dx),ang)<=half;}
function statusText(h){const a=[];if(h.status.bind>0)a.push('拘束');if(h.status.poison>0)a.push('毒');if(h.status.silence>0)a.push('沈黙');if(h.status.slow>0)a.push('鈍足');if(h.status.guard>0)a.push('防御');if(h.status.stun>0)a.push('気絶');return a.join('・')||'正常';}

const HEROES=[
 {id:'warrior',name:'戦士アルド',role:'前衛',hint:'前衛。近距離で敵の詠唱を止め、防御で味方を守る。',hp:170,mp:28,speed:155,color:'#d9b67a',
  skills:[
   {name:'斬撃',cost:0,cd:.7,cast:.08,range:105,kind:'melee',desc:'扇状・22'},
   {name:'盾撃',cost:3,cd:4,cast:.22,range:85,kind:'bash',desc:'16＋詠唱中断'},
   {name:'堅守',cost:2,cd:8,cast:.1,range:0,kind:'guard',desc:'3秒 被害55%減'},
   {name:'破城斬り',cost:8,cd:9,cast:.65,range:125,kind:'heavy',desc:'大振り・52'}
  ]},
 {id:'scout',name:'斥候ミラ',role:'遊撃',hint:'間合いを保ち、拘束矢と連射で敵の行動を縛る。',hp:118,mp:42,speed:188,color:'#9ac7a1',
  skills:[
   {name:'速射',cost:0,cd:.8,cast:.12,range:380,kind:'arrow',desc:'直線・18'},
   {name:'毒罠',cost:5,cd:6,cast:.35,range:330,kind:'trap',desc:'設置・毒霧'},
   {name:'拘束矢',cost:7,cd:6.5,cast:.28,range:330,kind:'bindshot',desc:'12＋拘束1.7秒'},
   {name:'五月雨',cost:12,cd:9,cast:.65,range:360,kind:'volley',desc:'円範囲・3連撃'}
  ]},
 {id:'witch',name:'魔女セラ',role:'魔法',hint:'長い詠唱と高威力。雷槍は敵の魔法を中断できる。',hp:102,mp:82,speed:145,color:'#b7a0dc',
  skills:[
   {name:'火球',cost:6,cd:1.6,cast:.42,range:360,kind:'fireball',desc:'魔法・30'},
   {name:'氷環',cost:9,cd:5.5,cast:.32,range:150,kind:'frost',desc:'周囲・鈍足3秒'},
   {name:'雷槍',cost:12,cd:5.2,cast:.55,range:420,kind:'lightning',desc:'36＋詠唱中断'},
   {name:'落星',cost:24,cd:12,cast:1.05,range:400,kind:'meteor',desc:'予告円・72'}
  ]},
 {id:'sister',name:'シスター・ノア',role:'支援',hint:'回復・浄化・聖域で、敵の状態異常攻めを立て直す。',hp:125,mp:95,speed:150,color:'#e7e0bd',
  skills:[
   {name:'聖光',cost:5,cd:1.3,cast:.32,range:330,kind:'holy',desc:'直線・24'},
   {name:'癒し',cost:10,cd:4,cast:.55,range:0,kind:'heal',desc:'最少HPを48回復'},
   {name:'浄化',cost:12,cd:8,cast:.45,range:0,kind:'purify',desc:'全員の異常解除'},
   {name:'聖域',cost:20,cd:12,cast:.7,range:0,kind:'sanctuary',desc:'5秒 回復＋軽減'}
  ]}
];
const DIR_ROWS={front:0,down_right:1,right:2,up_right:3,back:4,up_left:5,left:6,down_left:7};
function makeHero(cfg,i){
 return {...cfg,x:270+(i%2)*64,y:245+Math.floor(i/2)*74,maxHp:cfg.hp,maxMp:cfg.mp,hp:cfg.hp,mp:cfg.mp,r:17,cd:[0,0,0,0],status:{bind:0,poison:0,silence:0,slow:0,guard:0,stun:0},poisonTick:0,cast:null,dir:'right',moving:false,anim:0,frame:0,dead:false,flash:0,autoT:rnd(.3,1.1)};
}
const state={started:false,over:false,time:0,active:0,heroes:[],enemy:null,hazards:[],effects:[],sanctuary:null,images:new Map()};
function reset(){
 state.started=false;state.over=false;state.time=0;state.active=0;state.heroes=HEROES.map(makeHero);
 state.enemy={name:'灰冠の呪術騎士',x:700,y:270,r:30,hp:720,maxHp:720,phase:1,cast:null,actCd:1.8,stun:0,root:0,slow:0,guard:0,reactT:0,reactX:0,reactY:0,flash:0,poison:0,poisonTick:0,decision:'様子をうかがっている'};
 state.hazards=[];state.effects=[];state.sanctuary=null;logs.length=0;$('log').innerHTML='';
 $('endOverlay').classList.add('hidden');$('startOverlay').classList.remove('hidden');
 preload();renderUI();log('敵は接触ではダメージを与えません。');
}
function preload(){
 for(const h of state.heroes){
  if(state.images.has(h.id))continue;
  const a={};
  for(const m of ['walk','run']){const im=new Image();im.src=`../character-motion-v1/exports/${h.id}/${m}.png`;a[m]=im;}
  state.images.set(h.id,a);
 }
}
function activeHero(){return state.heroes[state.active];}
function aliveHeroes(){return state.heroes.filter(h=>!h.dead);}
function chooseTarget(){const alive=aliveHeroes();if(!alive.length)return null;if(Math.random()<.58)return activeHero().dead?alive[0]:activeHero();return alive[(Math.random()*alive.length)|0];}
function addFx(kind,x,y,text='',color='#fff'){state.effects.push({kind,x,y,text,color,t:kind==='text'?1.05:.45,max:kind==='text'?1.05:.45});}
function hurtHero(h,dmg,status){
 if(h.dead)return;
 let mul=h.status.guard>0?.45:1;
 if(state.sanctuary&&state.sanctuary.t>0&&Math.hypot(h.x-state.sanctuary.x,h.y-state.sanctuary.y)<state.sanctuary.r)mul*=.7;
 dmg=Math.max(1,Math.round(dmg*mul));h.hp=Math.max(0,h.hp-dmg);h.flash=.18;addFx('text',h.x,h.y-44,`-${dmg}`,'#ff8d84');
 if(status){
  for(const [k,v] of Object.entries(status)){h.status[k]=Math.max(h.status[k]||0,v);}
 }
 if(h.hp<=0){h.dead=true;h.cast=null;log(`${h.name}は戦闘不能！`);if(state.active===state.heroes.indexOf(h)){const ni=state.heroes.findIndex(x=>!x.dead);if(ni>=0)selectHero(ni);}}
}
function healHero(h,n){if(h.dead)return;const got=Math.min(n,h.maxHp-h.hp);h.hp+=got;if(got>0)addFx('text',h.x,h.y-44,`+${Math.round(got)}`,'#9ff0a9');}
function hurtEnemy(dmg,opts={}){
 const e=state.enemy;if(e.hp<=0)return;
 let mul=e.guard>0?.42:1;dmg=Math.max(1,Math.round(dmg*mul));e.hp=Math.max(0,e.hp-dmg);e.flash=.18;addFx('text',e.x,e.y-54,`-${dmg}`,'#fff0a2');
 if(opts.stun)e.stun=Math.max(e.stun,opts.stun);
 if(opts.root)e.root=Math.max(e.root,opts.root);
 if(opts.slow)e.slow=Math.max(e.slow,opts.slow);
 if(opts.poison)e.poison=Math.max(e.poison,opts.poison);
 if(opts.interrupt&&e.cast){log(`${opts.source||'攻撃'}が敵の詠唱を中断！`);e.cast=null;e.stun=Math.max(e.stun,.35);e.decision='体勢を崩した';}
 if(e.hp<=0)finish(true);
}
