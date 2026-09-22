
(() => {
'use strict';
const old=renderUI;
renderUI=function(){
  old();
  const list=window.Game5MultiEnemy?.alive?.()||[];
  if(list.length>1){
    const title=document.querySelector('.top .enemy b');
    if(title)title.textContent=`${state.enemy.name} ＋${list.length-1}`;
    const st=document.querySelector('#enemyState');
    if(st)st.textContent=`${st.textContent} / 残り${list.length}体`;
  }
  const perc=document.querySelector('#perception');
  if(perc&&state.dungeon?.active){
    const r=window.Game5Dungeon?.room?.();
    perc.textContent=`区画 ${state.dungeon.room+1}/${window.Game5Dungeon.rooms.length} ${r?.name||''}　${perc.textContent}`;
  }
};
})();
