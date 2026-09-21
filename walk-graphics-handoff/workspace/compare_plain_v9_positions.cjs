const fs=require('fs'),path=require('path');
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const root=path.join(process.cwd(),'plain-walk-v8'),R=require(path.join(root,'rig.js')),C=require(path.join(root,'config.json')),A=require(path.join(root,'assets.json'));
(async()=>{
 const images={};for(const v of C.views){images[v]={};for(const[n,a]of Object.entries(A[v]))images[v][n]=await loadImage(path.join(root,a.file));}
 const variants={down_right:[['v8',0,0],['R4 D6',4,6],['R6 D8',6,8],['R8 D6',8,6],['L4 D6',-4,6],['D6',0,6]],up_right:[['v8',0,0],['R6 D4',6,4],['R8 D6',8,6],['R10 D4',10,4],['L8 D4',-8,4],['D4',0,4]]};
 const out=createCanvas(1536,820),ctx=out.getContext('2d');ctx.fillStyle='#20232d';ctx.fillRect(0,0,1536,820);ctx.imageSmoothingEnabled=false;
 for(const [row,v]of ['down_right','up_right'].entries())for(const [col,[label,x,y]]of variants[v].entries()){
  const a=JSON.parse(JSON.stringify(A));a[v].head.pivot[0]-=x;a[v].head.pivot[1]-=y;
  const p=R.makePose(v,0,C,a),cell=createCanvas(192,256);R.draw(cell.getContext('2d'),p,images,a);
  const dx=col*256,dy=row*410;ctx.fillStyle='#d6dfeb';ctx.font='14px sans-serif';ctx.fillText(v+' '+label,dx+8,dy+20);
  ctx.drawImage(cell,53,54,86,124,dx+1,dy+35,254,366);
 }
 fs.writeFileSync('plain-v9-position-candidates.png',out.toBuffer('image/png'));
})().catch(e=>{console.error(e);process.exitCode=1;});
