(()=>{
'use strict';
const VERSION='0.16.1';
const D=window.Game5RequestedArtData;if(!D)return;const {floors,monsters,props,icons,allies,vfx,nutera}=D;
const reg={floors,monsters,props,icons,allies,vfx,nutera,dialogues:null,rooms:null,version:VERSION,ready:true};
window.Game5RequestedPack=reg;

const A=window.Game5Assets;
if(A?.requested){
  for(let i=0;i<7;i++){A.requested.floor[i]=true;A.requested.floorImg[i]=floors[i]}
  Object.assign(A.requested.monsters,monsters);
}
const toolBtns=[...document.querySelectorAll('[data-tool]')];
for(const b of toolBtns){
  const im=icons[b.dataset.tool]; if(!im)continue;
  const set=()=>{b.style.backgroundImage=`linear-gradient(rgba(8,10,14,.76),rgba(8,10,14,.76)),url("${im.src}")`;b.style.backgroundRepeat='no-repeat';b.style.backgroundPosition='center';b.style.backgroundSize='100%,34px 34px';b.style.paddingLeft='38px'};
  if(im.complete)set(); else im.onload=set;
}

function drawIm(im,x,y,w,h,alpha=1,frame=0,frames=1){
 if(!im?.complete||!im.naturalWidth)return;
 ctx.save();ctx.globalAlpha=alpha;
 if(frames>1){const sw=im.naturalWidth/frames;ctx.drawImage(im,sw*frame,0,sw,im.naturalHeight,x-w/2,y-h/2,w,h)}
 else ctx.drawImage(im,x-w/2,y-h/2,w,h);
 ctx.restore();
}
const G=window.Game5Graphics;
if(G?.drawHazardsUnder){
 const base=G.drawHazardsUnder;
 G.drawHazardsUnder=function(){
   base?.();
   for(const z of state.hazards||[])if(z.kind==='directorPool')drawIm(props.pool,z.x,z.y,z.r*2.3,z.r*2.3,.74);
   for(const c of state.chests||[]){
     if(c.taken)continue;
     const im=c.fake?props.mimic:props.chest, f=(c.seen&&c.fake)?1:0;
     drawIm(im,c.x,c.y-12,70,44,1,f,2);
   }
   for(const t of state.towers||[]){
     const f=Math.floor(state.time*2)%3;
     drawIm(props.tower,t.x,t.y-24,66,98,1,f,3);
   }
   const r=window.Game5Dungeon?.room?.();
   if(r?.exit){
     const open=state.dungeon?.pending?1:0;
     drawIm(props.stairs,r.exit[0],r.exit[1]-10,70,48,.88,open,2);
   }
 }
}
let estellaBurst=0,lastEstella=false,lastRoom=-1,lastNuteraHigh=false;
function thought(scene){
 const arr=reg.dialogues?.scenes?.[scene]; const h=state.hero;
 if(!h||!arr?.length)return;
 h.thought=arr[(Math.random()*arr.length)|0];
}
function overlay(dt=.016){
 const h=state.hero;if(!h||h.dead)return;
 const est=!!h.estella?.active;
 if(est&&!lastEstella){estellaBurst=.9;thought('estella_start')}
 if(!est&&lastEstella)thought('estella_recover');
 lastEstella=est;
 if(h.nutera>=70&&!lastNuteraHigh)thought('nutera_high');
 lastNuteraHigh=h.nutera>=70;
 const ri=state.dungeon?.room??-1;
 if(ri!==lastRoom&&ri>=0){
   lastRoom=ri; const flavor=reg.rooms?.[ri]?.thought;
   if(flavor)h.thought=flavor; else thought('room_enter');
 }
 if(h.status?.bind>0)drawIm(vfx.silk_wrap,h.x,h.y-18,118,118,.34+.1*Math.sin(state.time*6));
 const hyp=h.hypnosis?.value??0;if(hyp>8)drawIm(vfx.hypno_ring,h.x,h.y-14,130,130,Math.min(.45,.12+hyp/300));
 if(h.nutera>72)drawIm(nutera.gauge_heart,h.x+42,h.y-67,42,21,.72);
 if(est){
   drawIm(nutera.sigil,h.x,h.y-5,160,160,.32+.12*Math.sin(state.time*8));
   drawIm(nutera.estella_logo,W/2,62,260,65,.48);
 }
 if(estellaBurst>0){estellaBurst-=dt;drawIm(nutera.heart_burst,h.x,h.y-18,190,190,Math.max(0,estellaBurst/.9)*.55)}
}
const baseDraw=window.draw;
if(typeof baseDraw==='function'){
 window.draw=function(...a){const r=baseDraw.apply(this,a);overlay(.016);return r}
}
Promise.all([
 fetch('./assets/requested/dialogues.json').then(r=>r.ok?r.json():null).catch(()=>null),
 fetch('./assets/requested/room_ideas.json').then(r=>r.ok?r.json():null).catch(()=>null)
]).then(([d,r])=>{reg.dialogues=d;reg.rooms=r});

if(window.state)state.version=VERSION;
})();
