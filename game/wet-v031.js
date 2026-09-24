(()=>{
'use strict';
/* v0.31.0 wet (profile, writing standard 1: heat and humidity - wetness is followed until it
   drips down her thighs and is left behind where she stood).
   A hold by something slimy leaves her wet, and it does not stop when the hold does: for about
   half a minute she drips as she walks, leaves wet footprints and little pools where she stands,
   her body glistens, her face in the portrait is glossy, and now and then she mutters about it.
   The colour is the slime's own. The record counts how long she walked around like that. */
const C={perSpecial:.26,dry:1/32,drip:2.4,step:.34,print:5,pool:3.2};
const SLIMY={slug:1,gel:1,crown_attendant:1,mirror_slime:.9,water_wraith:.8,bubble_shell:.7,lure_cap:.6,flower:.7,leech:.5,snare:.3};
const V=()=>window.Game5Voice;
const L={wet:{calm:['……ぬ、濡れて……き、気持ち、悪……','……あ、歩くと、ぬちゃって……い、言わない、で……'],
 strain:['……ぬ、ぬるぬる、まだ、取れない……っ','……あ、脚、つたって……ち、ちが、汗……汗、だから……'],
 yield:['……っ、あ、歩くたびに……こ、擦れ……っ','……ふ、ふひ……ぬ、濡れてるの、見られて、ない……よね……'],
 crave:['……ぁ……♡ ……ぬ、ぬるぬる……ま、まだ……っ']}};
if(V()?.lines)Object.assign(V().lines,L);
const drops=[],marks=[];let stepT=0,side=1,sayT=0,sp0=0;
function col(t){return window.Game5Grapple?.specials?.[t]?.col||'#e28ac0'}
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h||!state.started)return;
 const g=h.grapple,t=g?(g.e?.type||'snare'):null;
 // soaked a little more by every special from something slimy
 if(g&&SLIMY[t]&&g.specials>sp0){h.wet=Math.min(1,(h.wet||0)+C.perSpecial*SLIMY[t]);h.wetCol=col(t)}
 sp0=g?g.specials:0;
 if(!(h.wet>0))return;
 h.wet=Math.max(0,h.wet-C.dry*dt*(h.estella?.active?.4:1));
 if(h.dead)return;
 if(!g)h.wetWalk=(h.wetWalk||0)+(h.moving?dt:0);
 // drips
 if(Math.random()<dt*C.drip*h.wet)drops.push({x:h.x+(Math.random()-.5)*18,y:h.y-20-Math.random()*36,vy:10,floor:h.y+3,col:h.wetCol,s:2.2+Math.random()*2*h.wet});
 // footprints while walking
 if(h.moving&&h.wet>.25){stepT-=dt;if(stepT<=0){stepT=C.step;side=-side;marks.push({x:h.x+side*5,y:h.y+4,t:C.print,max:C.print,col:h.wetCol,rx:5.6,ry:2.9,a:.55*h.wet})}}
 // she mutters about it
 sayT-=dt;if(!g&&h.moving&&h.wet>.4&&sayT<=0&&state.time>(h._voiceHold||0)){sayT=9+Math.random()*6;V()?.say?.(h,'wet',{hold:2.2})}
 if(h.wet>.8)window.Game5Heat?.title?.(h,'粘液を滴らせて歩いた戦士');
};
const baseReset=reset;reset=function(){const r=baseReset();drops.length=0;marks.length=0;return r};
/* drawing */
let last=performance.now();
function under(){
 const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;
 for(const d of drops){d.vy+=520*dt;d.y+=d.vy*dt;if(d.y>=d.floor&&!d.done){d.done=true;marks.push({x:d.x,y:d.floor,t:C.pool,max:C.pool,col:d.col,rx:3+d.s*2,ry:1.5+d.s*.8,a:.6})}}
 for(let i=drops.length-1;i>=0;i--)if(drops[i].done)drops.splice(i,1);
 for(const m of marks)m.t-=dt;
 for(let i=marks.length-1;i>=0;i--)if(marks[i].t<=0)marks.splice(i,1);
 if(marks.length>160)marks.splice(0,marks.length-160);
 ctx.save();
 for(const m of marks){const k=m.t/m.max;ctx.globalAlpha=m.a*k;ctx.fillStyle=m.col;ctx.beginPath();ctx.ellipse(m.x,m.y,m.rx,m.ry,0,0,TAU);ctx.fill();
  ctx.globalAlpha=m.a*k*.8;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.ellipse(m.x-m.rx*.35,m.y-m.ry*.3,m.rx*.3,m.ry*.25,0,0,TAU);ctx.fill()}
 ctx.restore();
}
function over(){
 const h=state.hero;
 ctx.save();
 for(const d of drops){ctx.globalAlpha=.85;ctx.fillStyle=d.col;ctx.beginPath();ctx.ellipse(d.x,d.y,d.s*.8,d.s*1.3,0,0,TAU);ctx.fill()}
 if(h&&!h.dead&&h.wet>.05){
  // a sheen on her: glints that come and go, and a strand hanging off her
  const t=state.time,j=window.Game5Heat?.jitter?.(h);if(j)ctx.translate(j.x,j.y);
  ctx.globalCompositeOperation='lighter';
  for(let k=0;k<4;k++){const ph=(t*1.3+k*.37)%1,x=h.x-9+((k*13)%20),y=h.y-62+((k*17)%42);ctx.globalAlpha=h.wet*Math.sin(ph*Math.PI)*.9;ctx.fillStyle='#ffffff';
   ctx.beginPath();ctx.moveTo(x,y-3);ctx.lineTo(x+1,y);ctx.lineTo(x,y+3);ctx.lineTo(x-1,y);ctx.closePath();ctx.fill()}
  ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=.55*h.wet;ctx.strokeStyle=h.wetCol||'#e28ac0';ctx.lineWidth=1.3;
  const sway=Math.sin(t*2.2)*2;ctx.beginPath();ctx.moveTo(h.x+4,h.y-30);ctx.quadraticCurveTo(h.x+6+sway,h.y-18,h.x+5+sway,h.y-8-4*Math.sin(t*1.7));ctx.stroke();
 }
 ctx.restore();
}
const G=window.Game5Graphics;
if(G){const u=G.drawHazardsUnder;G.drawHazardsUnder=function(){u?.();if(state.started)under()};
 const o=G.drawHazardsOver;G.drawHazardsOver=function(){o?.();if(state.started)over()}}
window.Game5Wet={version:'0.31.0',cfg:C,slimy:SLIMY};
})();
