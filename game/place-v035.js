(()=>{
'use strict';
/* v0.35.0 placing monsters made easy, by hand and by AUTO.
   - the summon (8) is cheaper and quicker: EN 50 -> 30, cooldown 18s -> 8s, up to 6 monsters
   - which monster: a row of chips under the tool buttons - "おまかせ" or any kind that lives on
     this floor; pick one, then tap where it should wait. A placed monster lies in wait until it
     notices her.
   - AUTO places monsters too, from the first floor: ahead of her, on the way she is heading */
const T=window.Game5Content?.cfg?.tools?.summon;
if(T)Object.assign(T,{cost:30,cd:8,max:6,desc:'選んだ魔物を置く。気づくまで待ち伏せる'});
const d=()=>state.director;
/* the kinds on this floor */
let floorTypes=[],floorKey=null;
function kinds(){
 const room=state.dungeon?.room??0;
 if(floorKey!==room){floorKey=room;const s=new Set();for(const e of window.Game5MultiEnemy?.alive?.()||[])if(!e.summoned)s.add(e.type);for(const t of window.Game5MultiEnemy?.pools?.[room]||[])s.add(t);floorTypes=[...s];if(d().summonType&&!s.has(d().summonType))d().summonType=null}
 return floorTypes;
}
const nameOf=t=>window.Game5Monsters?.profiles?.[t]?.name||t;
/* the chips */
const row=document.createElement('div');row.className='summonRow';
document.querySelector('.tools')?.after(row);
let rowKey='';
function renderRow(){
 const ks=kinds(),sel=d().summonType||'',key=ks.join(',')+'|'+sel+'|'+(d().selected==='summon');
 if(key===rowKey)return;rowKey=key;
 row.innerHTML=`<small>8 増援召喚で置く魔物</small>`+[['','おまかせ'],...ks.map(t=>[t,nameOf(t)])].map(([t,n])=>`<button type="button" data-st="${t}" class="${t===sel?'on':''}">${n}</button>`).join('');
 row.classList.toggle('active',d().selected==='summon');
}
row.addEventListener('click',e=>{const b=e.target.closest('[data-st]');if(!b)return;d().summonType=b.dataset.st||null;d().selected='summon';rowKey='';try{renderUI()}catch(_){}});
/* the summon uses the chosen kind */
const basePlace=placeDirectorTool;
placeDirectorTool=function(kind,x,y,auto=false){
 if(kind!=='summon')return basePlace(kind,x,y,auto);
 const want=auto?pickAuto():d().summonType,M=window.Game5Monsters,orig=M?.apply;
 if(want&&orig)M.apply=function(type,level){return orig.call(this,want,level)};
 const n0=(state.enemies||[]).length;let ok;
 try{ok=basePlace(kind,x,y,auto)}finally{if(orig)M.apply=orig}
 if(ok){const e=state.enemies[state.enemies.length-1];if(e&&state.enemies.length>n0){e.aware=false;e.ambush=true;e._ambushUntil=state.time+25;e.homeX=e.x;e.homeY=e.y;e.decision='待ち伏せている'}}
 return ok;
};
function pickAuto(){const ks=kinds();return ks.length?ks[(Math.random()*ks.length)|0]:null}
/* AUTO: place a monster ahead of her now and then, from the first floor */
let autoT=6,placed=0,placedRoom=null;const AUTO_MAX=2;
const baseDir=updateDirector;
updateDirector=function(dt){
 baseDir(dt);
 renderRow();
 // a placed monster waits 25s at most, then goes looking for her like the others (a hidden one must not stall the floor)
 for(const e of window.Game5MultiEnemy?.alive?.()||[])if(e._ambushUntil&&state.time>e._ambushUntil){e.ambush=false;e._ambushUntil=0}
 const D=d(),h=state.hero;
 if(!D.auto||!state.started||state.over||!h||h.dead||state.dungeon?.pending)return;
 autoT-=dt;if(autoT>0)return;
 const lv=window.Game5Balance?.intensity?.[D.intensity||'normal'];autoT=(14+Math.random()*8)*(lv?.interval??2.2)/2.2;
 const alive=window.Game5MultiEnemy?.alive?.()||[],room=state.dungeon?.room??0;
 if(placedRoom!==room){placedRoom=room;placed=0}
 if(placed>=AUTO_MAX||alive.length>=5||(D.cd.summon||0)>0||D.en<(T?.cost??30))return;   // a few per floor, or the floor never ends
 // ahead on her way: along her motion if she is moving, else where she faces
 const vx=h._vx||0,vy=h._vy||0,a=Math.hypot(vx,vy)>20?Math.atan2(vy,vx):h.facing||0;
 if(placeDirectorTool('summon',h.x+Math.cos(a)*300,h.y+Math.sin(a)*300,true))placed++;
};
const baseReset=reset;reset=function(){const r=baseReset();floorKey=null;autoT=6;return r};
window.Game5Place={version:'0.35.0',kinds};
})();
