const fs=require('fs'),path=require('path');
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
let canvas;try{canvas=require('@napi-rs/canvas');}catch(e){if(!runtime)throw e;canvas=require(runtime+'/@napi-rs/canvas');}
const {createCanvas,loadImage}=canvas,rig=require('./rig.js'),root=__dirname;
const config=JSON.parse(fs.readFileSync(path.join(root,'config.json'))),assets=JSON.parse(fs.readFileSync(path.join(root,'assets.json')));
(async()=>{
 const views=config.views,images=Object.fromEntries(views.map(v=>[v,{}]));
 for(const v of views)for(const [n,a] of Object.entries(assets[v]))images[v][n]=await loadImage(path.join(root,a.file));
 const poses=Object.fromEntries(views.map(v=>[v,[]]));
 for(const v of views){
  fs.mkdirSync(path.join(root,'frames',v),{recursive:true});fs.mkdirSync(path.join(root,'checks',v),{recursive:true});
  for(let f=0;f<8;f++){
   const p=rig.makePose(v,f,config,assets);poses[v].push(p);
   const c=createCanvas(192,256);rig.draw(c.getContext('2d'),p,images,assets);
   fs.writeFileSync(path.join(root,'frames',v,String(f).padStart(2,'0')+'.png'),c.toBuffer('image/png'));
   const stage=createCanvas(384,512);rig.drawStage(stage.getContext('2d'),p,images,assets);
   fs.writeFileSync(path.join(root,'checks',v,f+'.png'),stage.toBuffer('image/png'));
   rig.drawStage(stage.getContext('2d'),p,images,assets,{joints:true});
   fs.writeFileSync(path.join(root,'checks',v,f+'-joints.png'),stage.toBuffer('image/png'));
  }
 }
 fs.writeFileSync(path.join(root,'rig.json'),JSON.stringify({schema:'plain-walk-11',config,assets,frames:poses},null,2));
 const data={config,assets,images:Object.fromEntries(views.map(v=>[v,{}]))};
 for(const v of views)for(const [n,a] of Object.entries(assets[v]))data.images[v][n]='data:image/png;base64,'+fs.readFileSync(path.join(root,a.file)).toString('base64');
 const html=fs.readFileSync(path.join(root,'player-template.html'),'utf8').replace('__RIG_CODE__',fs.readFileSync(path.join(root,'rig.js'),'utf8')).replace('__DATA__',JSON.stringify(data));
 fs.writeFileSync(path.join(root,'plain-walk-player.html'),html);
 console.log('Rendered 40 frames from the shared joint rig.');
})().catch(e=>{console.error(e);process.exitCode=1;});
