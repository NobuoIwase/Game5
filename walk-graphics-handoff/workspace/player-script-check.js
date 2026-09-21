
const data=JSON.parse(document.getElementById('walk-data').textContent),rig=data.rig;
const views=['front','side'],images={front:{},side:{}},contexts={};
let frame=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,split=false,fps=1000/120,last=0;
const labels=['接地','沈み込み','通過','持ち上がり','接地','沈み込み','通過','持ち上がり'];
const partLabels={head:'頭・輪',hair:'後ろ髪',torso:'胴',skirt:'スカート',arm_far:'腕①',arm_near:'腕②',leg_far:'脚①',leg_near:'脚②',wing_far:'翼①',wing_near:'翼②',tail_far:'裾①',tail_near:'裾②'};
const partOrder=['head','hair','torso','skirt','arm_far','arm_near','leg_far','leg_near','wing_far','wing_near','tail_far','tail_near'];
const playButton=document.getElementById('play'),partsButton=document.getElementById('parts'),phase=document.getElementById('phase');
function controls(){playButton.textContent=playing?'一時停止':'再生';phase.textContent=`${String(frame+1).padStart(2,'0')} / 08 · ${labels[frame]}`;document.querySelectorAll('#frames button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===frame)));}
function draw(view){
 const ctx=contexts[view];ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,384,512);ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#20212b';ctx.fillRect(0,0,384,512);
 if(split){
  const cw=96,ch=158;
  partOrder.forEach((name,i)=>{
   const x=(i%4)*cw,y=Math.floor(i/4)*ch+15,img=images[view][name];
   const scale=Math.min(78/img.width,119/img.height,2);
   const motion=rig.frames[view][frame].find(p=>p.part===name);
   const rotation=motion?motion.angle*Math.PI/180:0;
   ctx.save();ctx.translate(x+cw/2,y+65);ctx.rotate(rotation);ctx.drawImage(img,Math.round(-img.width*scale/2),Math.round(-img.height*scale/2),Math.round(img.width*scale),Math.round(img.height*scale));ctx.restore();
   ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#c3b7c8';ctx.fillText(partLabels[name],x+cw/2,y+139);
  });return;
 }
 ctx.scale(2,2);ctx.strokeStyle='#292a36';ctx.lineWidth=.5;
 for(let x=0;x<=192;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}
 for(let y=0;y<=256;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(192,y);ctx.stroke();}
 ctx.fillStyle='#171820';ctx.beginPath();ctx.ellipse(97,242,28,4,0,0,Math.PI*2);ctx.fill();
 for(const p of rig.frames[view][frame]){
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle*Math.PI/180);ctx.scale(p.scale[0],p.scale[1]);ctx.drawImage(images[view][p.part],-p.pivot[0],-p.pivot[1]);ctx.restore();
 }
}
function render(){views.forEach(draw);controls();}
function setPlaying(value){playing=value;last=performance.now();controls();}
playButton.onclick=()=>setPlaying(!playing);
document.getElementById('step').onclick=()=>{setPlaying(false);frame=(frame+1)%8;render();};
partsButton.onclick=()=>{split=!split;partsButton.setAttribute('aria-pressed',String(split));partsButton.textContent=split?'組み立てを見る':'部位を見る';render();};
document.getElementById('speed').oninput=e=>{fps=+e.target.value;document.getElementById('speedValue').textContent=fps.toFixed(1)+' fps';last=performance.now();};
for(let i=0;i<8;i++){const b=document.createElement('button');b.type='button';b.textContent=String(i+1).padStart(2,'0');b.setAttribute('aria-label',`${i+1}コマ目 ${labels[i]}`);b.onclick=()=>{setPlaying(false);frame=i;render();};document.getElementById('frames').append(b);}
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}else if(e.code==='ArrowRight'){e.preventDefault();document.getElementById('step').click();}});
function tick(now){if(playing&&now-last>=1000/fps){frame=(frame+1)%8;last=now;render();}requestAnimationFrame(tick);}
Promise.all(views.flatMap(view=>{contexts[view]=document.getElementById(view).getContext('2d');return Object.entries(data.images[view]).map(([name,src])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;images[view][name]=img;img.src=src;}));})).then(()=>{render();requestAnimationFrame(tick);}).catch(()=>{document.getElementById('status').textContent='画像の読み込みに失敗しました。';});
