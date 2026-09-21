const fs=require('fs'),path=require('path');
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const root=path.join(process.cwd(),'plain-walk-v5'),R=require(path.join(root,'rig.js')),C=require(path.join(root,'config.json')),A=require(path.join(root,'assets.json'));
(async()=>{
 const images={};for(const v of C.views){images[v]={};for(const[n,a]of Object.entries(A[v]))images[v][n]=await loadImage(path.join(root,a.file));}
 const variants=[['CURRENT',0,0],['LOWER 3',3,0],['LOWER 6',6,0],['LOWER 9',9,0],['LOWER 6 / BACK 2',6,-2],['LOWER 6 / FORWARD 2',6,2]];
 const out=createCanvas(1440,900),ctx=out.getContext('2d');ctx.fillStyle='#20232d';ctx.fillRect(0,0,1440,900);ctx.imageSmoothingEnabled=false;
 for(const [row,v]of ['down_right','up_right'].entries())for(const [col,[label,y,x]]of variants.entries()){
  const conf=JSON.parse(JSON.stringify(C));conf[v].neck_tip_offset[1]+=y;conf[v].head_offset[0]+=x;
  const p=R.makePose(v,0,conf,A),cell=createCanvas(192,256);R.draw(cell.getContext('2d'),p,images,A);
  const dx=col*240,dy=row*450;ctx.fillStyle='#d6dfeb';ctx.font='13px sans-serif';ctx.fillText(v+' '+label,dx+8,dy+20);
  ctx.drawImage(cell,58,54,80,136,dx+15,dy+35,210,357);
  ctx.fillStyle='#62727f';ctx.fillRect(dx+10,dy+224,220,1);
 }
 fs.writeFileSync('plain-v6-neck-candidates.png',out.toBuffer('image/png'));
})().catch(e=>{console.error(e);process.exitCode=1;});
