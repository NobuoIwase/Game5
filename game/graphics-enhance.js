(() => {
'use strict';
const dungeon=new Image(), enemies=new Image(), fxAtlas=new Image();
dungeon.src='./assets/dungeon.png';
enemies.src='./assets/enemies.png';
fxAtlas.src='./assets/fx.png';
const CELL=64;
const lightCanvas=document.createElement('canvas');
lightCanvas.width=W; lightCanvas.height=H;
const lightCtx=lightCanvas.getContext('2d');

function cell(img,idx,x,y,w,h=w){
  if(!img.complete||!img.naturalWidth)return;
  const cx=idx%4,cy=Math.floor(idx/4);
  ctx.drawImage(img,cx*CELL,cy*CELL,CELL,CELL,x,y,w,h);
}
function fx(idx,x,y,size,alpha=1){
  if(!fxAtlas.complete||!fxAtlas.naturalWidth)return;
  const cx=idx%3,cy=Math.floor(idx/3);
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.drawImage(fxAtlas,cx*CELL,cy*CELL,CELL,CELL,x-size/2,y-size/2,size,size);
  ctx.restore();
}
function drawBackground(){
  ctx.save(); ctx.globalAlpha=.95;
  for(let y=0;y<H;y+=64)for(let x=0;x<W;x+=64){
    const n=((x/64+y/64)%7===0)?1:(((x/64+2*y/64)%11===0)?2:0);
    cell(dungeon,n,x,y,64,64);
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
function drawHazards(){
  for(const z of state.hazards||[]){
    if(z.kind==='enemyFog'||z.kind==='directorFog'){
      fx(2,z.x,z.y,(z.r||70)*2.25,.36);
      fx(3,z.x,z.y,(z.r||70)*2.0,.20);
    } else if(z.kind==='directorSnare'){
      fx(6,z.x,z.y,(z.r||38)*2.35,z.triggered?.62:.34);
    } else if(z.kind==='directorLure'){
      fx(6,z.x,z.y,(z.r||34)*2.5,.42);
    } else if(z.kind==='directorRingBeam'){
      fx(7,z.x,z.y,92,z.fired?.22:.48);
    }
  }
}
function drawEnemySprite(){
  const en=state.enemy;if(!en||en.hp<=0)return;
  const idx=en.phase===2?1:0;
  fx(4,en.x,en.y+18,100,.34);
  cell(enemies,idx,en.x-52,en.y-52,104,104);
}
function punch(o,x,y,r,inner=.85){
  const g=o.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,`rgba(0,0,0,${inner})`);
  g.addColorStop(1,'rgba(0,0,0,0)');
  o.globalCompositeOperation='destination-out';
  o.fillStyle=g;o.fillRect(x-r,y-r,r*2,r*2);
}
function drawLighting(){
  const o=lightCtx;
  o.globalCompositeOperation='source-over';
  o.clearRect(0,0,W,H);
  o.fillStyle='rgba(2,5,9,.50)';o.fillRect(0,0,W,H);
  punch(o,state.hero.x,state.hero.y,178,.96);
  punch(o,105,410,135,.84);
  punch(o,850,90,124,.75);
  if(state.enemy.phase===2)punch(o,state.enemy.x,state.enemy.y,110,.58);
  ctx.save();ctx.globalCompositeOperation='multiply';ctx.drawImage(lightCanvas,0,0);ctx.restore();
  ctx.save();ctx.globalCompositeOperation='lighter';
  fx(0,105,408,210,.38); fx(0,850,88,185,.30); fx(1,120,402,150,.28);
  ctx.restore();
}
function drawAtmosphere(){
  const t=state.time;
  fx(3,150+Math.sin(t*.4)*20,110,320,.10);
  fx(3,780+Math.cos(t*.3)*20,440,280,.07);
  if(state.hero.estella?.active)fx(7,state.hero.x,state.hero.y,175,.55);
}
const oldFill=CanvasRenderingContext2D.prototype.fillRect;
CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){
  const bg=this===ctx&&x===0&&y===0&&w===W&&h===H&&this.fillStyle==='#142019';
  const r=oldFill.call(this,x,y,w,h);
  if(bg)drawBackground();
  return r;
};
const oldDraw=draw;
draw=function(){
  oldDraw();
  drawHazards();
  drawEnemySprite();
  drawAtmosphere();
  drawLighting();
};
if(state)state.version='0.8.0';
})();