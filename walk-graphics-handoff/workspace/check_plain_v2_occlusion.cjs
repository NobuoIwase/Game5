const fs=require('fs'),path=require('path');
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const R=require('./plain-walk-v2/rig.js'),C=require('./plain-walk-v2/config.json'),A=require('./plain-walk-v2/assets.json');
(async()=>{
 const src={};for(const [n,a] of Object.entries(A.front))src[n]=await loadImage(path.join('plain-walk-v2',a.file));
 const report=[];
 for(let f=0;f<8;f++){
  const p=R.makePose('front',f,C,A),dst=createCanvas(192,256),dc=dst.getContext('2d');dc.imageSmoothingEnabled=false;
  const ids={};
  p.ops.forEach((t,i)=>{
   ids[t.id]=i+1;const a=A.front[t.asset],im=createCanvas(...a.size),ic=im.getContext('2d');
   ic.drawImage(src[t.asset],0,0);ic.globalCompositeOperation='source-in';ic.fillStyle=`rgb(${i+1},80,160)`;ic.fillRect(0,0,...a.size);
   dc.save();dc.translate(...t.position);dc.rotate(t.angle*Math.PI/180);dc.scale(...t.scale);dc.drawImage(im,-t.pivot[0],-t.pivot[1]);dc.restore();
  });
  const data=dc.getImageData(0,0,192,256).data,count={};for(let j=0;j<data.length;j+=4)if(data[j+3]>200&&data[j+1]===80&&data[j+2]===160)count[data[j]]=(count[data[j]]||0)+1;
  const row={frame:f};for(const name of ['hip_joint_far','knee_joint_far','thigh_far'])row[name]=count[ids[name]]||0;report.push(row);
 }
 console.log(JSON.stringify(report));
 if(new Set(report.map(x=>x.hip_joint_far)).size<2)throw Error('Hip coverage did not change');
 if(new Set(report.map(x=>x.knee_joint_far)).size<2)throw Error('Knee coverage did not change');
 fs.writeFileSync('plain-v2-occlusion-check.json',JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
