(()=>{
'use strict';
/* v0.29.0 things that cling to her (profile: 付着体 - it will not come off, she feels it with
   every step). The leech's charge / bind already left "attachments" on her (monster-pack-v011:
   a few seconds of Nutera and SP drain, faster while she moves) but nothing showed them.
   Now each one is a small wet thing stuck to her hip, thigh or chest that pulses as it drains
   her, she reacts when one takes hold, while she walks with it, and when it drops off, and the
   record counts how long she walked around with them on. */
const SPOTS=[[-7,-30],[8,-24],[-3,-50],[6,-40],[-9,-18],[2,-34]];
/* v0.37: the leeches go for her nipples and her clitoris, one each */
const PARTS=[{spot:[-5,-33],name:'左の乳首',v:'attachNipple'},{spot:[5,-33],name:'右の乳首',v:'attachNipple'},{spot:[0,-17],name:'陰核',v:'attachClit'}];   // v0.38: measured on the sprite (feet at 0)
const V=()=>window.Game5Voice;
const L={
 attach:['ひっ……な、なにか、く、くっついて……っ','……と、取れ、ない……っ','……へ、変な、とこ、に……す、吸い付いて……っ'],
 attachMove:['う、動くと……っ、こ、擦れ……っ','……あ、歩き、にく……っ、ち、ちが……','……へ、平気……ぜ、ぜんぜん、平気……っ、ぁ……'],
 attachNipple:['ひ、ぁっ……む、胸……の、さき……す、吸わ、ないで……っ','……っ、む、胸……じんじん、する……っ、は、はなれ、て……'],
 attachClit:['〜〜っ！？ そ、そこ、は……っ、だ、だめ、だめ……っ','ひ、ぁ……っ、い、いちばん、……だめな、とこ……っ'],
 attachAll:['……ぜ、ぜんぶ……っ、い、いっぺんに……す、すわ、れ……っ♡','……っ、み、みっつ、とも……っ、あ、あし、……ちから、はいら、な……っ'],
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
 for(const a of A)if(!a._spot){
  if(/吸着羽虫/.test(a.label||'')){
   const used=new Set(A.filter(o=>o!==a&&o._part!=null).map(o=>o._part)),free=[0,1,2].filter(i=>!used.has(i));
   if(!free.length){const o=A.find(o=>o._part!=null);if(o)o.t=Math.max(o.t,a.t);a.t=0;a._spot=[0,0];continue}   // all three taken: the old one sucks longer
   const i=free[(Math.random()*free.length)|0];a._part=i;a._spot=PARTS[i].spot;
   window.Game5Message?.say?.(`吸着羽虫が ${PARTS[i].name}に 吸いついた！`,null);
   if(!h.grapple&&!h.estella?.active)V()?.say?.(h,used.size>=2?'attachAll':PARTS[i].v,{force:true,hold:2});
   if(used.size>=2){window.Game5Message?.say?.('三匹が、それぞれの場所で 吸いはじめた……',null);window.Game5Heat?.title?.(h,'三点を吸われて立ち尽くした戦士')}
  }else a._spot=SPOTS[(h._attachN=(h._attachN||0)+1)%SPOTS.length];
  a._ph=Math.random()*6;a._t0=a.t}
 h.attachments=A.filter(a=>a.t>0);
 if(A.length>n0&&!h.dead){if(!A.some(a=>a._part!=null))V()?.say?.(h,'attach',{force:true,hold:2});h.attachTotal=(h.attachTotal||0)+(A.length-n0);if(h.attachTotal>=3)window.Game5Heat?.title?.(h,'吸い付かれたまま歩き続けた戦士')}
 else if(A.length<n0&&!A.length&&!h.dead&&!h.grapple)V()?.say?.(h,'attachOff',{hold:2});
 n0=A.length;
 if(A.length){h.attachWorn=(h.attachWorn||0)+dt;
  if(h.moving&&!h.grapple){moveT+=dt;if(moveT>3.2&&state.time>(h._voiceHold||0)){moveT=0;V()?.say?.(h,'attachMove',{hold:2})}}}
 else moveT=0;
};
function draw(h){
 let A=h.attachments||[];
 if(h.grapple?.e?.type==='leech'){const t0=state.time;A=A.concat(PARTS.filter((_,i)=>!A.some(a=>a._part===i)).map((p,i)=>({_spot:p.spot,_ph:i*2.1,t:1,_virtual:1})))}
 if(!A.length||h.dead)return;
 const t=state.time,j=window.Game5Heat?.jitter?.(h);
 const flip=['left','up_left','down_left'].includes(h.dir)?-1:1;
 ctx.save();if(j)ctx.translate(j.x,j.y);
 for(const a of A){
  a._ph??=Math.random()*6;   // it can be drawn in the frame it was added, before updateHero sets it up
  const [ox,oy]=a._spot||[0,-30],x=h.x+ox*flip,y=h.y+oy,p=.5+.5*Math.sin(t*9+a._ph),s=1+.12*p,life=Math.min(1,a.t/.4);
  ctx.save();ctx.globalAlpha=life;
  // glow as it drains
  ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,1,x,y,11);g.addColorStop(0,`rgba(255,130,200,${.25+.3*p})`);g.addColorStop(1,'rgba(255,130,200,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,11,0,TAU);ctx.fill();
  ctx.globalCompositeOperation='source-over';
  // the body: a wet, swollen little thing with a sucker pressed to her
  const sc=a._part!=null||a._virtual?.8:1.5;ctx.translate(x,y);ctx.rotate(Math.sin(t*3+a._ph)*.25);ctx.scale(sc*s,sc/s);   // v0.37: the ones on her body are small
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
