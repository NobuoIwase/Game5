(()=>{
'use strict';
const old=renderUI;
renderUI=function(){
 old();
 const e=state.enemy,h=state.hero,r=window.Game5Dungeon?.room?.();
 const name=document.querySelector('.top .enemy b');if(name&&e)name.textContent=e.name;
 const es=document.querySelector('#enemyState');
 if(es&&e){
   const roomTxt=r?`区画${state.dungeon.room+1}/${Game5Dungeon.rooms.length} ${r.name}`:'';
   es.textContent=`${roomTxt} / ${e.decision||''}`;
 }
 const hs=document.querySelector('#heroStatus');
 if(hs&&h?.attachments?.length)hs.textContent=`${hs.textContent} / 吸着×${h.attachments.length}`;
 const k=document.querySelector('#knowledge');
 if(k&&e&&h?.knowledge){
   const avg=Object.values(h.knowledge).reduce((a,b)=>a+b,0)/5/3;
   k.textContent=`${k.textContent}　種族学習: ${e.name} ${Math.round(avg*100)}%`;
 }
};
})();