(()=>{
'use strict';
/* v0.35.0 monsters with their own size and their own way of moving.
   - size: each species has its own scale (the boss and the stone sentinel are large, the leech
     small), and each one differs a little from the next; the body radius follows
   - leeches come as a swarm: every leech placed on a floor brings one or two smaller ones
   - from the third floor, one leech may be a queen: large, slow, rarely attacking herself; her
     wingbeat calls more small leeches out of the dark (never more than four of hers at once).
     They are called, not born (profile NG: no egg-laying / birth).
   - movement: leeches dart in zigzags, moths flutter, spiders run and stop, the worm inches
     along, hands scuttle in bursts, the sentinel stomps, wisps drift - applied on top of each
     monster's own path, and never through walls */
const SIZE={leech:.72,moth:1,orb:.85,slug:1.1,gel:1.55,worm:1.3,flower:1.2,lure_cap:.9,silk_spider:1.12,creeping_hand:.82,wisp:1,gazer:1.25,water_wraith:1.2,stone_sentinel:1.5,bubble_shell:.9,mirror_slime:1.05,crown_attendant:1.15};
const C={swarm:[0,1],small:.5,smallHp:.35,smallAttack:.45,queen:{fromRoom:2,chance:.6,size:1.75,hp:2.2,every:[13,17],max:3,speed:.7}};
const alive=()=>window.Game5MultiEnemy?.alive?.()||[];
function sizeUp(e){
 if(e._sized)return;e._sized=true;
 const base=e._small?C.small:e._queen?C.queen.size:(SIZE[e.type]||1);
 e._sz=base*(e._small||e._queen?1:(.92+Math.random()*.16));
 e.r=Math.round((e.r||24)*Math.pow(e._sz,.25));   // the body grows much less than the picture
}
/* a monster like an existing one (same code path as the director's summon) */
function spawnLike(src,type,x,y){
 const p=state.enemy,e={...src};
 Object.assign(e,{cast:null,stun:0,root:0,slow:0,guard:0,reactT:0,flash:0,poison:0,bindVisualUntil:0,homeX:undefined,homeY:undefined,_path:null,waitT:0,_lookType:null,elite:false,_hpTuned:false,_sized:false,_queen:false,_small:false,grappling:false,dash:null,summoned:true});
 state.enemy=e;Game5Monsters.apply(type,1+Math.floor((state.dungeon?.room||0)/2));e.x=x;e.y=y;e.actCd=1.2;state.enemy=p;
 state.enemies.push(e);return e;
}
function freeSpot(x,y,r){
 const B=window.Game5Dungeon?.blockedAt;
 for(let k=0;k<12;k++){const a=Math.random()*Math.PI*2,d=r*(.6+Math.random()*.8),nx=x+Math.cos(a)*d,ny=y+Math.sin(a)*d;if(!B?.({r:14},nx,ny))return[nx,ny]}
 return[x,y];
}
/* once per floor: swarms and the queen */
let floorDone=null;
function setupFloor(){
 const room=state.dungeon?.room;if(room==null||floorDone===room||!state.enemies?.length)return;
 floorDone=room;
 const leeches=alive().filter(e=>e.type==='leech'&&!e.summoned);
 let queen=null;
 if(room>=C.queen.fromRoom&&leeches.length&&Math.random()<C.queen.chance){queen=leeches[0];queen._queen=true;queen.name='吸着羽虫の女王';queen.maxHp=Math.round(queen.maxHp*C.queen.hp);queen.hp=queen.maxHp;queen._callT=3+Math.random()*3;queen._calls=[]}
 for(const l of leeches){if(l===queen)continue;const n=C.swarm[0]+((Math.random()*(C.swarm[1]-C.swarm[0]+1))|0);
  for(let i=0;i<n;i++){const [x,y]=freeSpot(l.x,l.y,50);const s=spawnLike(l,'leech',x,y);s._small=true;s.maxHp=Math.round(s.maxHp*C.smallHp);s.hp=s.maxHp;s.name='小さな吸着羽虫';s.summoned=false;s.homeX=l.homeX;s.homeY=l.homeY}}
}
function queenTick(q,dt){
 q._callT-=dt;q._calls=(q._calls||[]).filter(e=>e.hp>0);
 if(q._callT>0||q._calls.length>=C.queen.max||!q.aware)return;
 q._callT=C.queen.every[0]+Math.random()*(C.queen.every[1]-C.queen.every[0]);
 const [x,y]=freeSpot(q.x,q.y,90),s=spawnLike(q,'leech',x,y);
 s._small=true;s._queen=false;s.maxHp=Math.round(s.maxHp/C.queen.hp*C.smallHp);s.hp=s.maxHp;s.name='小さな吸着羽虫';s.aware=true;s.awareAt=state.time;q._calls.push(s);
 addFx('text',q.x,q.y-60,'羽音が、群れを呼んだ','#f0b8ff',1.2);
 window.Game5Message?.say?.('吸着羽虫の女王の 羽音に、小さな羽虫が あつまってきた！','queen',3);
 window.Game5NuteraFX?.ring?.(q.x,q.y,10,110,.7,'rgba(240,180,255,.8)',2);
}
const baseEnemy=updateEnemy;
updateEnemy=function(dt){
 const r=baseEnemy(dt);   // called once a frame for the whole floor
 setupFloor();
 for(const e of alive()){sizeUp(e);if(e._queen)queenTick(e,dt)}
 return r;
};
/* the queen rarely attacks herself */
const baseChoose=chooseEnemyAction;
chooseEnemyAction=function(){const e=state.enemy;if(e?._queen&&Math.random()<.65){e.actCd=1+Math.random();e.decision='羽音で群れを呼ぶ';return}
 if(e?._small&&Math.random()>C.smallAttack){e.actCd=.8+Math.random()*.8;e.decision='まとわりつく';return}return baseChoose()};
/* movement personalities, layered on each monster's own path */
const EAI=window.Game5EnemyAI,B=()=>window.Game5Dungeon?.blockedAt;
if(EAI?.move){const m=EAI.move;EAI.move=function(e,h,dt){
 const x0=e.x,y0=e.y,r=m(e,h,dt);
 const dx=e.x-x0,dy=e.y-y0,l=Math.hypot(dx,dy);if(l<.01||e.grappling||e.dash)return r;
 const t=state.time,ph=e._ph??(e._ph=Math.random()*6.28),ux=dx/l,uy=dy/l,px=-uy,py=ux;
 let f=1,side=0;
 switch(e.type){
  case'leech':f=e._queen?C.queen.speed:1;side=e._queen?Math.sin(t*1.5+ph)*.3:Math.sin(t*9+ph)*1.1;break;           // darting zigzag
  case'moth':f=.9;side=Math.sin(t*3.3+ph)*.9+Math.sin(t*7.1+ph)*.35;break;                                         // fluttering
  case'silk_spider':{const c=(t*1.25+ph)%1;f=c<.55?1.7:.08;break}                                                  // run, stop
  case'creeping_hand':{const c=(t*1.8+ph)%1;f=c<.4?1.8:.25;break}                                                  // scuttling bursts
  case'worm':f=.25+1.6*Math.max(0,Math.sin(t*3+ph));break;                                                          // inching
  case'stone_sentinel':f=.3+1.3*Math.pow(Math.abs(Math.sin(t*2.6+ph)),3);break;                                     // stomping steps
  case'wisp':side=Math.sin(t*1.6+ph)*.7;break;                                                                      // drifting
  case'slug':case'gel':f=.85+.3*Math.max(0,Math.sin(t*2+ph));break;                                                 // creeping surges
 }
 if(f===1&&!side)return r;
 const nx=x0+dx*f+px*side*l,ny=y0+dy*f+py*side*l;
 if(!B()?.(e,nx,ny)){e.x=nx;e.y=ny}
 return r;
}}
const baseReset=reset;reset=function(){const r=baseReset();floorDone=null;return r};
window.Game5Swarm={version:'0.35.0',size:SIZE,cfg:C};
})();
