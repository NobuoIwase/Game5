
(() => {
'use strict';
if(!window.Game5Graphics)return;
const single=window.Game5Graphics.drawEnemy;

function telegraph(e){
  const c=e?.cast;if(!c||e===state.enemy)return;
  const sk=c.sk;
  ctx.save();
  const p=1-Math.max(0,c.t)/Math.max(.01,c.total);
  ctx.globalAlpha=.12+.22*p;
  ctx.fillStyle='#ff6b8a';
  ctx.strokeStyle='#ffc1ce';
  ctx.lineWidth=2;
  if(sk.kind==='circle'){
    ctx.beginPath();ctx.arc(c.target.x,c.target.y,sk.r,0,TAU);ctx.fill();ctx.stroke();
  }else if(sk.kind==='cone'){
    ctx.beginPath();ctx.moveTo(c.start.x,c.start.y);
    ctx.arc(c.start.x,c.start.y,sk.range,c.ang-.66,c.ang+.66);
    ctx.closePath();ctx.fill();ctx.stroke();
  }else{
    ctx.translate(c.start.x,c.start.y);ctx.rotate(c.ang);
    ctx.fillRect(0,-sk.width/2,sk.range,sk.width);
    ctx.strokeRect(0,-sk.width/2,sk.range,sk.width);
  }
  ctx.restore();
}
function hpbar(e){
  if(!e||e.hp<=0)return;
  const w=Math.max(34,Math.min(76,e.r*2.2)),x=e.x-w/2,y=e.y-e.r-34;
  ctx.save();
  ctx.globalAlpha=e===state.enemy?1:.72;
  ctx.fillStyle='#160d16';ctx.fillRect(x,y,w,5);
  ctx.fillStyle=e===state.enemy?'#d45a77':'#8e7388';
  ctx.fillRect(x,y,w*Math.max(0,e.hp/e.maxHp),5);
  ctx.restore();
}
window.Game5Graphics.drawEnemy=function(){
  const list=window.Game5MultiEnemy?.alive?.() || (state.enemy?[state.enemy]:[]);
  if(!list.length)return false;
  for(const e of list)telegraph(e);
  for(const e of list){single?.(e);hpbar(e)}
  return true;
};
window.Game5Graphics.version='0.11.0';
})();
