(()=>{
'use strict';
const atlas=new Image();atlas.src='./assets/enemies.png';
const fx=new Image();fx.src='./assets/fx.png';
function ready(i){return i.complete&&i.naturalWidth}
function drawEnemy(e=state.enemy){
 if(!e||e.hp<=0||!ready(atlas))return false;
 const idx=e.visualIndex??0,s=64,scale=e.type==='orb'?.78:e.type==='leech'?.82:e.type==='moth'?.9:e.type==='worm'?1.08:e.type==='flower'?1.12:1.02;
 const size=112*scale,bob=Math.sin(state.time*(e.type==='leech'||e.type==='moth'?7:4))*4;
 ctx.save();
 ctx.translate(e.x,e.y+bob);
 ctx.filter=e.visualFilter||`hue-rotate(${e.visualHue||0}deg) saturate(${e.type==='gel'?1.1:1.25})`;
 ctx.globalAlpha=e.stun>0?.72:1;
 const art=window.Game5Assets?.monster?.(e);
 ctx.shadowBlur=art?(e.phase===2?14:8):(e.phase===2?24:15);
 ctx.shadowColor=art?(e.phase===2?'rgba(255,120,200,.7)':'rgba(0,0,0,.55)'):(e.type==='orb'||e.type==='moth'?'#c995ff':'#74d6bb');
 const custom=window.Game5Assets?.monster?.(e);
 if(custom){ctx.filter='none';if(window.Game5PixelArt?.has(custom))ctx.imageSmoothingEnabled=false;let cw=size*.86,ch=cw*custom.naturalHeight/custom.naturalWidth;if(ch>size*1.05){cw*=size*1.05/ch;ch=size*1.05}ctx.drawImage(custom,-cw/2,size*.3-ch,cw,ch)}
 else ctx.drawImage(atlas,(idx%4)*s,Math.floor(idx/4)*s,s,s,-size/2,-size*.6,size,size);
 ctx.restore();
 if(e.cast?.key==='bind'||(state.hero.status?.bind||0)>0){
  ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle=e.type==='worm'?'#d6c5ff':'#c8a7f0';ctx.lineWidth=8;ctx.lineCap='round';
  for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(e.x+i*8,e.y);ctx.quadraticCurveTo((e.x+state.hero.x)/2+Math.sin(state.time*4+i)*22,(e.y+state.hero.y)/2+i*13,state.hero.x-i*8,state.hero.y);ctx.stroke()}
  ctx.restore();
 }
 return true;
}
function drawRoomOverlay(){
 const r=window.Game5Dungeon?.room?.();if(!r)return;
 for(const w of r.walls||[]){
  const g=ctx.createLinearGradient(w.x,w.y,w.x+w.w,w.y+w.h);g.addColorStop(0,'#2a342d');g.addColorStop(1,'#111713');
  ctx.fillStyle=g;ctx.fillRect(w.x,w.y,w.w,w.h);ctx.strokeStyle='#5e665f';ctx.lineWidth=2;ctx.strokeRect(w.x+.5,w.y+.5,w.w-1,w.h-1);
 }
 for(const z of r.zones||[]){
  const c=z.kind==='spore'?'#b46bff':z.kind==='dream'?'#8f66ff':z.kind==='nectar'?'#ce79b6':z.kind==='ring'?'#b992ff':z.kind==='swamp'?'#6f9873':'#86bcb6';
  const g=ctx.createRadialGradient(z.x,z.y,8,z.x,z.y,z.r);g.addColorStop(0,c+'55');g.addColorStop(1,c+'00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.fill();
 }
 const ex=r.exit?.[0],ey=r.exit?.[1];
 if(Number.isFinite(ex)){
  ctx.save();ctx.translate(ex,ey);ctx.strokeStyle='#d9c87c';ctx.lineWidth=3;ctx.globalAlpha=.72;ctx.strokeRect(-20,-20,40,40);
  ctx.beginPath();ctx.moveTo(-14,10);ctx.lineTo(14,-10);ctx.stroke();ctx.restore();
 }
 ctx.save();ctx.fillStyle='#efe6c8';ctx.globalAlpha=.75;ctx.font='12px system-ui';ctx.fillText(`区画 ${state.dungeon.room+1}/${window.Game5Dungeon.rooms.length}  ${r.name}`,18,22);ctx.restore();
}
const oldBase=window.Game5Graphics?.drawDungeonBase;
const oldEnemy=window.Game5Graphics?.drawEnemy;
if(window.Game5Graphics){
 window.Game5Graphics.drawDungeonBase=function(){const ok=oldBase?.();drawRoomOverlay();return ok!==false};
 window.Game5Graphics.drawEnemy=drawEnemy;
 window.Game5Graphics.version='0.11.0';
}
window.Game5DungeonGraphics={drawEnemy,drawRoomOverlay};
})();