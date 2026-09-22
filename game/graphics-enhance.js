(() => {
'use strict';
const dungeon=new Image(), enemies=new Image(), fxAtlas=new Image();
dungeon.src='./assets/dungeon.png';
enemies.src='./assets/enemies.png';
fxAtlas.src='./assets/fx.png';
const CELL=64;

function cell(img,idx,x,y,w,h=w){
  if(!img.complete||!img.naturalWidth)return;
  const cx=idx%4, cy=Math.floor(idx/4);
  ctx.drawImage(img,cx*CELL,cy*CELL,CELL,CELL,x,y,w,h);
}
function fx(idx,x,y,size,alpha=1){
  if(!fxAtlas.complete||!fxAtlas.naturalWidth)return;
  const cx=idx%3, cy=Math.floor(idx/3);
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.drawImage(fxAtlas,cx*CELL,cy*CELL,CELL,CELL,x-size/2,y-size/2,size,size);
  ctx.restore();
}
function drawBackground(){
  ctx.save();
  ctx.globalAlpha=.95;
  for(let y=0;y<H;y+=64){
    for(let x=0;x<W;x+=64){
      const n=((x/64+y/64)%7===0)?1:(((x/64+2*y/64)%11===0)?2:0);
      cell(dungeon,n,x,y,64,64);
    }
  }
  ctx.globalAlpha=.9;
  for(let x=0;x<W;x+=64)cell(dungeon,3,x,-8,64,64);
  cell(dungeon,4,W-120,42,96,96);
  cell(dungeon,5,18,42,84,84);
  cell(dungeon,7,120,368,92,92);
  cell(dungeon,8,630,340,120,120);
  cell(dungeon,9,790,336,88,88);
  cell(dungeon,10,470,280,88,88);
  cell(dungeon,12,720,80,88,88);
  ctx.restore();
}
function drawEnemySprite(){
  const en=state.enemy;
  if(!en||en.hp<=0)return;
  const idx=en.phase===2?1:0;
  ctx.save();
  fx(4,en.x,en.y+14,96,.35);
  cell(enemies,idx,en.x-52,en.y-52,104,104);
  ctx.restore();
}
function drawLighting(){
  const off=document.createElement('canvas');
  off.width=W;off.height=H;
  const o=off.getContext('2d');
  o.fillStyle='rgba(2,5,9,.54)';
  o.fillRect(0,0,W,H);
  function hole(x,y,r,inner=.85){
    const g=o.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(0,0,0,${inner})`);
    g.addColorStop(1,'rgba(0,0,0,0)');
    o.globalCompositeOperation='destination-out';
    o.fillStyle=g;
    o.fillRect(x-r,y-r,r*2,r*2);
  }
  hole(state.hero.x,state.hero.y,170,.95);
  hole(105,410,130,.8);
  hole(850,90,120,.72);
  if(state.enemy.phase===2)hole(state.enemy.x,state.enemy.y,110,.55);
  ctx.save();
  ctx.globalCompositeOperation='multiply';
  ctx.drawImage(off,0,0);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  fx(0,105,408,200,.45);
  fx(0,850,88,180,.35);
  fx(1,78,402,140,.32);
  ctx.restore();
}
function drawAtmosphere(){
  const t=state.time;
  fx(3,150+Math.sin(t*.4)*20,110,320,.11);
  fx(3,780+Math.cos(t*.3)*20,440,280,.08);
  if(state.hero.estella?.active)fx(7,state.hero.x,state.hero.y,170,.55);
}
const oldFill=CanvasRenderingContext2D.prototype.fillRect;
CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){
  const custom=this===ctx&&x===0&&y===0&&w===W&&h===H&&this.fillStyle==='#142019';
  const r=oldFill.call(this,x,y,w,h);
  if(custom)drawBackground();
  return r;
};
const oldDraw=draw;
draw=function(){
  oldDraw();
  drawEnemySprite();
  drawAtmosphere();
  drawLighting();
};
if(state)state.version='0.8.0';
})();