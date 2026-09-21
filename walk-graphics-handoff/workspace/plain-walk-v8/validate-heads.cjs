/* Check the actual composited nape, including occlusion by the new skulls. */
const fs=require('fs'),path=require('path'),assert=require('assert');
let canvas;try{canvas=require('@napi-rs/canvas');}catch(e){canvas=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas,loadImage}=canvas,R=require('./rig.js'),C=require('./config.json'),A=require('./assets.json');
(async()=>{
 const images={};
 for(const v of ['down_right','up_right']){
  images[v]={};for(const[n,a]of Object.entries(A[v]))images[v][n]=await loadImage(path.join(__dirname,a.file));
  const visible=[];
  for(let f=0;f<8;f++){
   const p=R.makePose(v,f,C,A),index=p.ops.findIndex(o=>o.id==='neck');
   const isolated=createCanvas(192,256),cover=createCanvas(192,256);
   R.draw(isolated.getContext('2d'),{...p,ops:[p.ops[index]]},images,A);
   R.draw(cover.getContext('2d'),{...p,ops:p.ops.slice(index+1)},images,A);
   const neck=isolated.getContext('2d').getImageData(0,0,192,256).data;
   const over=cover.getContext('2d').getImageData(0,0,192,256).data;
   let count=0;for(let i=3;i<neck.length;i+=4)if(neck[i]>200&&over[i]===0)count++;
   assert(count>=4,`${v} frame ${f}: neck hidden (${count} visible pixels)`);
   visible.push(count);
  }
  console.log(`${v}: visible neck pixels in frames 1–8: ${visible.join(', ')}`);
 }
 console.log('PASS: both diagonal necks remain visible throughout the walk.');
})().catch(e=>{console.error(e);process.exitCode=1;});
