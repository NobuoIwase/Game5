
(() => {
'use strict';
const enemies=new Image(), fx=new Image();
enemies.src='./assets/enemies.png'; fx.src='./assets/fx.png';
const CELL=64;
function enemyIndex(){
  const e=state.enemy;
  if(e?.cast?.key==='fog') return 2;
  if(e?.cast?.key==='bolt') return 3;
  if(e?.cast?.key==='bind') return 1;
  return e?.phase===2?1:0;
}
function drawCell(img,cols,idx,x,y,w,h,alpha=1){
  if(!img.complete||!img.naturalWidth)return;
  ctx.save();ctx.globalAlpha*=alpha;
  ctx.drawImage(img,(idx%cols)*CELL,Math.floor(idx/cols)*CELL,CELL,CELL,x,y,w,h);
  ctx.restore();
}
function polishEnemy(){
  const e=state.enemy;if(!e||e.hp<=0||!enemies.complete)return;
  const idx=enemyIndex(),bob=Math.sin(state.time*5.1)*3,size=e.phase===2?108:98;
  drawCell(enemies,4,idx,e.x-size/2,e.y-size*.6+bob,size,size,1);
  if(idx===2) drawCell(fx,3,2,e.x-72,e.y-72,144,144,.10);
  if(idx===3) drawCell(fx,3,7,e.x-74,e.y-74,148,148,.13);
}
function setVersion(){
  if(window.state) state.version='0.8.1';
  document.title='Game5 v0.8.1';
  const tag=document.querySelector('.top small');
  if(tag) tag.textContent='GAME5 v0.8.1';
}
window.addEventListener('load',()=>{
  const base=window.draw;
  if(typeof base==='function'){
    window.draw=draw=function(){
      base();
      polishEnemy();
    };
  }
  setVersion();
});
window.Game5GraphicsPolish={version:'0.8.1'};
})();
