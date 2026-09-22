(()=>{
'use strict';
const ROOMS=[
 {name:'石の前室',type:'slug',spawn:[720,260],exit:[880,90],zones:[{kind:'swamp',x:520,y:320,r:105,sail:3,lumane:3}],walls:[{x:330,y:130,w:70,h:185}]},
 {name:'湿った回廊',type:'leech',spawn:[735,180],exit:[875,445],zones:[{kind:'mist',x:610,y:245,r:95,sail:4,hypnosis:4}],walls:[{x:300,y:295,w:245,h:58}]},
 {name:'絹輪の間',type:'worm',spawn:[690,300],exit:[95,445],zones:[{kind:'ring',x:470,y:245,r:78,lumane:5}],walls:[{x:455,y:85,w:62,h:150},{x:455,y:330,w:62,h:125}]},
 {name:'胞子庭',type:'orb',spawn:[720,245],exit:[90,92],zones:[{kind:'spore',x:500,y:270,r:125,sail:6,lumane:8,hypnosis:3}],walls:[{x:235,y:155,w:74,h:220}]},
 {name:'粘花苑',type:'flower',spawn:[710,260],exit:[875,90],zones:[{kind:'nectar',x:560,y:190,r:92,sail:4,lumane:6,charm:3}],walls:[{x:360,y:360,w:250,h:56}]},
 {name:'夢鱗回廊',type:'moth',spawn:[720,220],exit:[875,445],zones:[{kind:'dream',x:515,y:265,r:118,sail:3,lumane:4,hypnosis:8}],walls:[{x:280,y:90,w:60,h:160},{x:620,y:330,w:60,h:140}]},
 {name:'灰冠の深室',type:'gel',spawn:[720,270],exit:[875,270],zones:[{kind:'ring',x:500,y:270,r:95,sail:5,lumane:6}],walls:[{x:285,y:230,w:65,h:190},{x:590,y:120,w:65,h:155}]}
];
function room(){return ROOMS[state.dungeon?.room||0]}
function insideCircle(a,z){return Math.hypot(a.x-z.x,a.y-z.y)<=z.r+(a.r||0)}
function resolveEntity(a){
 if(!a)return;
 a.x=clamp(a.x,48,W-48);a.y=clamp(a.y,48,H-48);
 for(const w of room()?.walls||[]){
   const r=a.r||20,hit=a.x>w.x-r&&a.x<w.x+w.w+r&&a.y>w.y-r&&a.y<w.y+w.h+r;
   if(!hit)continue;
   const dl=Math.abs(a.x-(w.x-r)),dr=Math.abs(a.x-(w.x+w.w+r)),dt=Math.abs(a.y-(w.y-r)),db=Math.abs(a.y-(w.y+w.h+r));
   const m=Math.min(dl,dr,dt,db);
   if(m===dl)a.x=w.x-r;else if(m===dr)a.x=w.x+w.w+r;else if(m===dt)a.y=w.y-r;else a.y=w.y+w.h+r;
 }
}
function spawnRoom(i){
 state.dungeon.room=i;state.dungeon.pending=false;state.dungeon.clearT=0;state.dungeon.zoneTick=.2;
 const r=ROOMS[i],e=state.enemy;
 e.x=r.spawn[0];e.y=r.spawn[1];
 Game5Monsters.apply(r.type,1+Math.floor(i/2));
 state.hazards=[];
 state.hero.memory.visited ||= new Set();state.hero.memory.visited.add(`room-${i}`);
 log(`第${i+1}区画「${r.name}」。${state.enemy.name}の気配。`);
 addFx('text',W/2,70,r.name,'#efe6c8',1.2);
}
function begin(){
 state.dungeon={active:true,room:0,pending:false,clearT:0,zoneTick:.2,complete:false};
 state.hero.x=130;state.hero.y=270;
 spawnRoom(0);
}
function advance(){
 const i=state.dungeon.room;
 if(i>=ROOMS.length-1){
   state.dungeon.complete=true;state.dungeoon.active=false;
   log('最深部を渏破した。');
   const f=window.Game5MonstersFinalFinish||window.__game5FinishBase;
   if(f)f(true);else oldFinish(true);
   return;
 }
 state.hero.x=ROOMS[i].exit[0]>W/2?105:W-105;
 state.hero.y=ROOMS[i].exit[1];
 spawnRoom(i+1);
}
const oldFinish=finish;
window.__game5FinishBase=oldFinish;
finish=function(win){
 if(win&&state.dungeon?.active&&!state.dungeon.complete){
   state.dungeon.pending=true;state.dungeon.clearT=0;state.enemy.cast=null;state.enemy.decision='区画制圧';
   addFx('text',state.hero.x,state.hero.y-72,'階段を払っ,'#f0df9c',1);
   return;
 }
 return oldFinish(win);
};
const oldDecide=decideHero;
decideHero=function(h,dt){
 if(state.dungeon?.active&&state.dungeon?.pending){
   const ex=room().exit[0],ey=room().exit[1],dx=ex-h.x,dy=ey-h.y,l=Math.hypot(dx,dy)||1;
   h.thought='区画を制圧。次の階段へ進む。';
   return {kind:'move',x:dx/l,y:dy/l,speed:1.05,label:'階段へ移動'};
 }
 return oldDecide(h,dt);
};
const oldHero=updateHero;
updateHero=function(h,dt){
 const px=h.x,py=h.y;oldHero(h,dt);resolveEntity(h);
 if(!state.dungeon?.active)return;
 const d=state.dungeon,r=room();
 if(d.pending){
   d.clearT+=dt;
   if(d.clearT>.55&&Math.hypot(h.x-r.exit[0],h.y-r.exit[1])<46)advance();
   return;
 }
 d.zoneTick-=dt;
 if(d.zoneTick<=0){
   d.zoneTick=.65;
   for(const z of r.zones||[]){
     if(!insideCircle(h,z))continue;
     if(z.sail)applySail(h,z.sail);
    if(z.lumane)applyTiered(h,'lumane',z.lumane,{source:`${r.name}の猰境`});
    if(z.hypnosis)applyTiered(h,'hypnosis',z.hypnosis,{source:`${r.name}の環境`});
    if(z.charm)applyTiered(h,'charm',z.charm,{family:state.enemy.family,source:`${r.name}の香気`});
    applyNutera(h,1.2,{source:`${r.name}のぬめる猰境`});
   }
 }
};
const oldEnemy=updateEnemy;
updateEnemy=function(dt){
 const e=state.enemy,bx=e?.x,by=e?.y,hadCast=!!e?.cast,hadReact=(e?.reactT||0)>0;
 oldEnemy(dt);
 if(e&&e.moving&&!hadCast&&!hadReact&&e.moveSpeed){
   const base=e.phase===2?86:69,ratio=e.moveSpeed/base;
   e.x=bx+(e.x-bx)*ratio;e.y=by+(e.y-by)*ratio;
 }
 resolveEntity(e);
};
const oldReset=reset;
reset=function(){oldReset();begin()};
window.Game5Dungeon={version:'0.11.0',rooms:ROOMS,room,resolveEntity,begin,advance};
})();