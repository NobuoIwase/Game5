/* Check the assembled neck, including the neck already painted in the torso. */
const path=require('path'),assert=require('assert');
let canvas;try{canvas=require('@napi-rs/canvas');}catch(e){canvas=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas,loadImage}=canvas,R=require('./rig.js'),C=require('./config.json'),A=require('./assets.json');
(async()=>{
 const images={};
 for(const v of ['down_right','up_right']){
  images[v]={};for(const[n,a]of Object.entries(A[v]))images[v][n]=await loadImage(path.join(__dirname,a.file));
  const visible=[],overlaps=[];
  for(let f=0;f<8;f++){
   const p=R.makePose(v,f,C,A),headOp=p.ops.find(o=>o.id==='head'),bodyOp=p.ops.find(o=>o.id==='upper_body');
   const head=createCanvas(192,256),body=createCanvas(192,256),region=createCanvas(192,256);
   R.draw(head.getContext('2d'),{...p,ops:[headOp]},images,A);
   R.draw(body.getContext('2d'),{...p,ops:p.ops.filter(o=>o.id!=='head')},images,A);
   // The visible nape can belong to the torso or the connector. Requiring
   // the isolated connector to show was incorrectly forcing the skull up.
   R.draw(region.getContext('2d'),{...p,ops:p.ops.filter(o=>o.id==='neck')},images,A);
   const ctx=region.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.save();
   ctx.translate(...bodyOp.position);ctx.rotate(bodyOp.angle*Math.PI/180);ctx.scale(...bodyOp.scale);
   ctx.drawImage(images[v].upper_body,0,0,32,9,-bodyOp.pivot[0],-bodyOp.pivot[1],32,9);ctx.restore();
   const h=head.getContext('2d').getImageData(0,0,192,256).data;
   const b=body.getContext('2d').getImageData(0,0,192,256).data;
   const n=region.getContext('2d').getImageData(0,0,192,256).data;
   let overlap=0,count=0;
   for(let i=3;i<h.length;i+=4){
    if(h[i]>200&&b[i]>200)overlap++;
    const y=Math.floor((i-3)/4/192);
    if(y<p.joints.cervical.position[1]-2&&n[i]>200&&b[i]>200&&h[i]===0)count++;
   }
   assert(overlap>=4,`${v} frame ${f}: skull does not overlap neck/body`);
   assert(count>=5,`${v} frame ${f}: visible nape is completely covered`);
   visible.push(count);overlaps.push(overlap);
  }
  console.log(`${v}: visible nape ${visible.join(', ')}; skull/body overlap ${overlaps.join(', ')} pixels.`);
 }
 console.log('PASS: connected skulls and visible assembled napes in both diagonals.');
})().catch(e=>{console.error(e);process.exitCode=1;});
