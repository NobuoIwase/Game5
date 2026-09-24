(()=>{
'use strict';
/* v0.29.0 things that cling to her (profile: 付着体 - it will not come off, she feels it with
   every step). The leech's charge / bind already left "attachments" on her (monster-pack-v011:
   a few seconds of Nutera and SP drain, faster while she moves) but nothing showed them.
   Now each one is a small wet thing stuck to her hip, thigh or chest that pulses as it drains
   her, she reacts when one takes hold, while she walks with it, and when it drops off, and the
   record counts how long she walked around with them on. */
const SPOTS=[[-7,-30],[8,-24],[-3,-50],[6,-40],[-9,-18],[2,-34]];
const V=()=>window.Game5Voice;
const L={
 attach:['ひっ……な、なにか、く、くっついて……っ','……と、取れ、ない……っ','……へ、変な、とこ、に……す、吸い付いて……っ'],
 attachMove:['う、動くと……っ、こ、擦れ……っ','……あ、歩き、にく……っ、ち、ちが……','……へ、平気……ぜ、ぜんぜん、平気……っ、ぁ……'],
 attachOff:['……と、取れ……た……？ ……あ、跡、残って、ない、よね……','……は、はぁ……い、今の、なし……なし……']
};
if(V()?.lines)Object.assign(V().lines,L);
if(V()?.strong)V().strong.add('attach');
let n0=0,moveT=0,worn=0;
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h||!state.started)return;
 const A=h.attachments||[];
 for(const a of A)if(!a._spot){a._spot=SPOTS[(h._attachN=(h._attachN||0)+1)%SPOTS.length];a._ph=Math.random()*6;a._t0=a.t}
 if(A.length>n0&&!h.dead){V()?.say?.(h,'attach',{force:true,hold:2});h.attachTotal=(h.attachTotal||0)+(A.length-n0);if(h.attachTotal>=3)window.Game5Heat?.title?.(h,'吸い付かれたまま歩き続けた戦士')}
 else if(A.length<n0&&!A.length&&!h.dead&&!h.grapple)V()?.say?.(h,'attachOff',{hold:2});
 n0=A.length;
 if(A.length){h.attachWorn=(h.attachWorn||0)+dt;
  if(h.moving&&!h.grapple){moveT+=dt;if(moveT>3.2&&state.time>(h._voiceHold||0)){moveT=0;V()?.say?.(h,'attachMove',{hold:2})}}}
 else moveT=0;
};
function draw(h){
 const A=h.attachments||[];if(!A.length||h.dead)return;
 const t=state.time,j=window.Game5Heat?.jitter?.(h);
 const flip=['left','up_left','down_left'].includes(h.dir)?-1:1;
 ctx.save();if(j)ctx.translate(j.x,j.y);
 for(const a of A){
  const [ox,oy]=a._spot||[0,-30],x=h.x+ox*flip,y=h.y+oy,p=.5+.5*Math.sin(t*9+a._ph),s=1+.12*p,life=Math.min(1,a.t/.4);
  ctx.save();ctx.globalAlpha=life;
  // glow as it drains
  ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,1,x,y,11);g.addColorStop(0,`rgba(255,130,200,${.25+.3*p})`);g.addColorStop(1,'rgba(255,130,200,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,11,0,TAU);ctx.fill();
  ctx.globalCompositeOperation='source-over';
  // the body: a wet, swollen little thing with a sucker pressed to her
  ctx.translate(x,y);ctx.rotate(Math.sin(t*3+a._ph)*.25);ctx.scale(1.5*s,1.5/s);
  ctx.fillStyle='#e98fb8';ctx.strokeStyle='#7a2c52';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,5.5,4,0,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffd8ea';ctx.beginPath();ctx.ellipse(-1.6,-1.4,1.6,1,-.4,0,TAU);ctx.fill();
  ctx.fillStyle='#b8487e';ctx.beginPath();ctx.arc(flip*3.4,.6,1.8+.6*p,0,TAU);ctx.fill();
  // a thin wet thread hanging from it
  ctx.strokeStyle=`rgba(255,190,225,${.55*life})`;ctx.beginPath();ctx.moveTo(0,3);ctx.quadraticCurveTo(1,7+3*p,-.5,10+4*p);ctx.stroke();
  ctx.restore();
 }
 ctx.restore();
}
const G=window.Game5Graphics;
if(G){const over=G.drawHazardsOver;G.drawHazardsOver=function(){over?.();const h=state.hero;if(h&&state.started)draw(h)}}
window.Game5Attach={version:'0.29.0'};
})();
