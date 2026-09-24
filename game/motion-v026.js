(()=>{
'use strict';
/* v0.26.0 warrior motion fixes and additions.
   1. Size match. Walking and running use the exported sheets (384x512 cells drawn in an 84x112
      box), while attacks, dodges, binds and Estella are drawn by the part rig (362x543 part
      canvases at 112/543). The two were calibrated by eye, so the heroine visibly grew and
      jumped whenever an action started. Here each direction is measured once: the height from
      the top of the head (first row wider than a thin sword) to the soles, and the torso's
      horizontal centre, in both sources. The rig drawing is then scaled and moved so its
      silhouette lands exactly where the walking frame's does. */
const B='../character-motion-v1/',DIRS=['front','down_right','right','up_right','back','up_left','left','down_left'];
const MISSING={right:['arm_left','leg_left'],left:['arm_right','leg_right']};
const KS=84/384,Z=112/543,cal={};
const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=s});
function measure(ims,w,h,band){
 const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
 for(const im of ims)if(im)g.drawImage(im,0,0);
 const d=g.getImageData(0,0,w,h).data,row=y=>{let n=0,sx=0;for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>40){n++;sx+=x}return[n,sx]};
 let top=-1,bot=-1;for(let y=0;y<h;y++){const [n]=row(y);if(n>=12){if(top<0)top=y;bot=y}}
 if(top<0)return null;
 // torso centre: middle band of the figure
 let n=0,sx=0;for(let y=Math.round(top+(bot-top)*band[0]);y<=top+(bot-top)*band[1];y++){const r=row(y);n+=r[0];sx+=r[1]}
 return{top,bot,cx:n?sx/n:w/2};
}
async function calibrate(rig){
 for(const dir of DIRS){
  const v=rig.views?.[dir];if(!v)continue;
  const frame=await load(`${B}exports/warrior/walk/${dir}/00.png`);
  const parts=await Promise.all(['scabbard','leg_right','leg_left','arm_left','body','arm_right','shield'].filter(p=>!MISSING[dir]?.includes(p)).map(p=>load(`${B}parts/warrior/${dir}/${p}.png`)));
  const body=await load(`${B}parts/warrior/${dir}/body.png`);
  if(!frame||!parts[0])continue;
  try{
   const s=measure([frame],384,512,[.3,.55]),r=measure(parts,362,543,[.3,.55]),rb=measure([body],362,543,[.25,.6]);
   if(!s||!r)continue;
   // walking frame on screen (box at h.x-42, h.y-90) vs rig on screen (root at h.x, h.y-26)
   const A={x:-42+s.cx*KS,y:-90+s.bot*KS},Bp={x:(-v.root[0]+(rb?.cx??r.cx))*Z,y:-26+(-v.root[1]+r.bot)*Z};
   cal[dir]={k:((s.bot-s.top)*KS)/((r.bot-r.top)*Z),ax:A.x,ay:A.y,bx:Bp.x,by:Bp.y};
  }catch(_){/* tainted canvas or missing art: keep the old placement */}
 }
}
fetch(`${B}rigs/warrior.json`).then(r=>r.json()).then(calibrate).catch(()=>{});

const W5=window.WarriorMotion,old=W5?.drawGame;
if(W5&&old){
 W5.drawGame=(c,h)=>{
  const T=cal[h.dir];if(!T)return old(c,h);
  c.save();c.translate(h.x+T.ax,h.y+T.ay);c.scale(T.k,T.k);c.translate(-(h.x+T.bx),-(h.y+T.by));
  try{return old(c,h)}finally{c.restore()}
 };
 W5.calibration=cal;
}

/* 2. Swings, dodges and dashes get motion.
   - slash / heavy: a crescent of light sweeps through the arc as the blade comes round, and a
     spark bursts where the cut lands; heavy cuts are wider, hotter and crack the floor
   - dodge: afterimages of her walking frame trail behind the burst
   - monster dash (the charge that used to teleport): streaks along the path */
function trail(h){
 const a=h._warriorMotion;if(!a||h.dead)return;
 const p=a.elapsed/a.total,hit=(a.hitAt??a.total*.55)/a.total,u=(p-(hit-.2))/.46;if(u<0||u>1)return;
 const heavy=a.name==='heavy',f=h.facing||0,span=heavy?1.5:1.2,R=heavy?76:60,cx=h.x,cy=h.y-30;
 const a0=f-span,head=a0+span*2*Math.min(1,u*2.2),tail=Math.max(a0,head-span*1.5)+span*2*Math.max(0,u-.45)*.9,fade=1-Math.max(0,u-.5)/.5;
 // a crescent: thick at the blade, tapering to nothing at the tail
 const N=20,th=(heavy?36:26)*fade,pts=[];
 for(let i=0;i<=N;i++){const q=i/N,ang=tail+(head-tail)*q,w=th*q*q;pts.push([cx+Math.cos(ang)*R,cy+Math.sin(ang)*R*.8,cx+Math.cos(ang)*(R-w),cy+Math.sin(ang)*(R-w)*.8])}
 ctx.save();ctx.globalCompositeOperation='lighter';
 const g=ctx.createLinearGradient(pts[0][0],pts[0][1],pts[N][0],pts[N][1]);
 g.addColorStop(0,'rgba(255,240,200,0)');g.addColorStop(.6,heavy?`rgba(255,170,90,${.35*fade})`:`rgba(200,225,255,${.3*fade})`);g.addColorStop(1,heavy?`rgba(255,225,170,${.95*fade})`:`rgba(245,250,255,${.95*fade})`);
 ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(const p of pts)ctx.lineTo(p[0],p[1]);for(let i=N;i>=0;i--)ctx.lineTo(pts[i][2],pts[i][3]);ctx.closePath();ctx.fill();
 ctx.strokeStyle=heavy?`rgba(255,240,210,${.9*fade})`:`rgba(255,255,255,${.9*fade})`;ctx.lineWidth=1.6;ctx.beginPath();for(let i=N>>1;i<=N;i++){const p=pts[i];i===N>>1?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1])}ctx.stroke();
 ctx.restore();
 if(!a._spark&&p>=hit){a._spark=true;const x=h.x+Math.cos(f)*R*.9,y=cy+Math.sin(f)*R*.72;
  window.Game5FX?.burst?.(x,y,heavy?'#ffc070':'#e8f4ff',heavy?16:10,heavy?220:170,.4,heavy?3.6:2.8);
  if(heavy){window.Game5FX?.shake?.(4);(state.cracks||=[]).push({x:h.x+Math.cos(f)*40,y:h.y+Math.sin(f)*30,t:1.2,a:f})}}
}
function cracks(){
 for(const c of state.cracks||[]){c.t-=1/60;const k=Math.max(0,c.t/1.2);ctx.save();ctx.globalAlpha=k*.7;ctx.strokeStyle='#1a1410';ctx.lineWidth=2;ctx.translate(c.x,c.y);ctx.rotate(c.a);
  ctx.beginPath();for(let i=0;i<5;i++){const a=(i-2)*.45;ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*30,Math.sin(a)*14);ctx.lineTo(Math.cos(a+.2)*48,Math.sin(a+.2)*20)}ctx.stroke();ctx.restore()}
 state.cracks=(state.cracks||[]).filter(c=>c.t>0);
}
function ghosts(h){
 h._ghosts||=[];
 const dodging=h.moving&&(h.dashT>0||h.intent?.label==='回避');
 if(dodging&&(!h._ghostT||state.time-h._ghostT>.045)){h._ghostT=state.time;h._ghosts.push({x:h.x,y:h.y,dir:h.dir,t:.28})}
 for(const g of h._ghosts)g.t-=1/60;h._ghosts=h._ghosts.filter(g=>g.t>0);
 if(!h._ghosts.length||typeof heroSpriteSample!=='function')return;
 const q=heroSpriteSample(h),im=q.image;if(!im?.complete||!im.naturalWidth)return;
 ctx.save();
 for(const g of h._ghosts){ctx.globalAlpha=g.t/.28*.35;ctx.filter='brightness(1.6) saturate(.4)';ctx.drawImage(im,q.frame*384,(DIR_ROWS[g.dir]||0)*512,384,512,g.x-42,g.y-90,84,112)}
 ctx.restore();
}
function streaks(){
 for(const e of window.Game5MultiEnemy?.alive?.()||[]){
  const d=e.dash;if(!d)continue;const u=Math.min(1,d.t/d.T);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(let k=-1;k<=1;k++){const ox=-Math.sin(d.ang)*k*10,oy=Math.cos(d.ang)*k*8;
   const g=ctx.createLinearGradient(d.x0,d.y0,e.x,e.y);g.addColorStop(0,'rgba(255,220,200,0)');g.addColorStop(1,`rgba(255,220,200,${.5*(1-u*.6)})`);
   ctx.strokeStyle=g;ctx.lineWidth=k?3:6;ctx.beginPath();ctx.moveTo(d.x0+ox,d.y0-10+oy);ctx.lineTo(e.x+ox,e.y-10+oy);ctx.stroke()}
  ctx.restore();
 }
}
const Gr=window.Game5Graphics;
if(Gr){
 const under=Gr.drawHazardsUnder;Gr.drawHazardsUnder=function(){under?.();cracks();const h=state.hero;if(h)ghosts(h)};
 const over=Gr.drawHazardsOver;Gr.drawHazardsOver=function(){over?.();streaks();const h=state.hero;if(h)trail(h)};
}
window.Game5Motion={version:'0.26.0',calibration:cal};
})();
