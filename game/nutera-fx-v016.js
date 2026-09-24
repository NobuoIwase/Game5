(()=>{
'use strict';
/* v0.16.0 Nutera / Estella presentation. The Nutera-Estella system is the heart of the game,
   so its states get their own visual language: pink hearts.
   - every Nutera gain releases hearts (more for bigger gains), numbers read "♡+5.2"
   - a heart gauge under Aria that fills from the bottom and beats faster as Nutera rises;
     from 75% the screen edge pulses pink as a warning
   - Estella: a radial heart burst, a large heart flash, an "ESTELLA" title, hearts orbiting
     her and MP (blue) / SP (amber) motes leaking out while it lasts
   - Lumane wave peaks ripple outward, charmed species get a heart tether, hypnosis draws a
     spiral over her head, ring-marks show as a sigil under her feet */
const PINK='#ff7fc8',DEEP='#e0479e';
/* ---------- heart sprites (built once) ---------- */
function heartPath(g,x,y,s){
 g.beginPath();g.moveTo(x,y+s*.36);
 g.bezierCurveTo(x-s*.12,y+s*.22,x-s*.52,y+s*.04,x-s*.52,y-s*.2);
 g.bezierCurveTo(x-s*.52,y-s*.48,x-s*.14,y-s*.56,x,y-s*.28);
 g.bezierCurveTo(x+s*.14,y-s*.56,x+s*.52,y-s*.48,x+s*.52,y-s*.2);
 g.bezierCurveTo(x+s*.52,y+s*.04,x+s*.12,y+s*.22,x,y+s*.36);g.closePath();
}
function sprite(top,bottom,glow){
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
 g.shadowColor=glow;g.shadowBlur=12;
 const gr=g.createLinearGradient(0,14,0,50);gr.addColorStop(0,top);gr.addColorStop(1,bottom);g.fillStyle=gr;heartPath(g,32,34,40);g.fill();
 g.shadowBlur=0;g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.ellipse(22,24,5,3.2,-.6,0,Math.PI*2);g.fill();
 g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1.5;heartPath(g,32,34,40);g.stroke();
 return c;
}
const SPR={pink:sprite('#ffc2e6','#ff4fae','#ff7fc8'),deep:sprite('#ff9ad3','#d62c8c','#ff5fb5'),soft:sprite('#fff0f8','#ffa8d8','#ffd0ea'),violet:sprite('#e9c8ff','#a45cff','#c08cff')};
function drawHeart(x,y,s,a=1,rot=0,kind='pink'){
 if(a<=0||s<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);ctx.rotate(rot);ctx.drawImage(SPR[kind]||SPR.pink,-s/2,-s/2,s,s);ctx.restore();
}

/* ---------- particles ---------- */
const P=[];
function emit(x,y,o={}){
 if(P.length>220)return;
 const a=o.ang??(-Math.PI/2+(Math.random()-.5)*1.4),v=o.speed??(40+Math.random()*50);
 P.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,s:o.size??(10+Math.random()*8),t:o.life??(1+Math.random()*.6),max:o.life??1.3,rot:(Math.random()-.5)*.6,spin:(Math.random()-.5)*2,kind:o.kind||'pink',sway:Math.random()*TAU,grav:o.grav??-18,dot:o.dot});
}
function stepParticles(dt){
 for(const p of P){p.t-=dt;p.sway+=dt*4;p.x+=(p.vx+Math.sin(p.sway)*14)*dt;p.y+=p.vy*dt;p.vy+=p.grav*dt;p.vx*=1-1.2*dt;p.rot+=p.spin*dt}
 for(let i=P.length-1;i>=0;i--)if(P[i].t<=0)P.splice(i,1);
}
function drawParticles(){
 for(const p of P){
  const a=Math.min(1,p.t/p.max*2.2),grow=Math.min(1,(p.max-p.t)*6);
  if(p.dot){ctx.save();ctx.globalAlpha=a*.9;ctx.fillStyle=p.dot;ctx.shadowColor=p.dot;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p.x,p.y,p.s*.22,0,TAU);ctx.fill();ctx.restore()}
  else drawHeart(p.x,p.y,p.s*(.6+.4*grow),a,p.rot,p.kind);
 }
}
const rings=[];
function ring(x,y,r0,r1,life,col,w=3){rings.push({x,y,r0,r1,t:life,max:life,col,w})}
function drawRings(dt){
 for(const r of rings){r.t-=dt;const p=1-Math.max(0,r.t)/r.max;ctx.save();ctx.globalAlpha=(1-p)*.8;ctx.strokeStyle=r.col;ctx.lineWidth=r.w*(1-p*.6);ctx.shadowColor=r.col;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(r.x,r.y,r.r0+(r.r1-r.r0)*(1-Math.pow(1-p,3)),0,TAU);ctx.stroke();ctx.restore()}
 for(let i=rings.length-1;i>=0;i--)if(rings[i].t<=0)rings.splice(i,1);
}

/* ---------- hooks into the Nutera system ---------- */
const bNutera=applyNutera;
applyNutera=function(h,base,meta={}){
 const gain=bNutera(h,base,meta)||0;
 if(h&&gain>0){
  h._heartAcc=(h._heartAcc||0)+gain;
  while(h._heartAcc>=4){h._heartAcc-=4;emit(h.x+(Math.random()-.5)*20,h.y-44)}   // v0.27: fewer, so she stays visible
  if(gain>=12){for(let k=0;k<3;k++)emit(h.x,h.y-40,{ang:-Math.PI/2+(k-1)*.55,speed:90+Math.random()*40,kind:'deep',size:13});ring(h.x,h.y-30,10,58,.5,PINK,2.5)}
 }
 return gain;
};
const bAddFx=addFx;
addFx=function(kind,x,y,text='',color='#fff',life){
 if(kind==='text'&&/^ヌテラ \+/.test(text))return bAddFx(kind,x,y,`♡+${text.slice(4)}`,'#ff9ad6',life);
 return bAddFx(kind,x,y,text,color,life);
};

/* ---------- Estella moments ---------- */
const est={flash:0,title:0,was:false};
function onEstellaStart(h){
 est.flash=1;est.title=1.6;
 for(let k=0;k<22;k++)emit(h.x,h.y-36,{ang:k/22*TAU,speed:150+Math.random()*80,size:13+Math.random()*9,kind:k%3?'pink':'deep',life:1.1,grav:30});
 ring(h.x,h.y-30,10,150,.8,PINK,5);ring(h.x,h.y-30,6,90,.6,'#fff0f8',3);
 window.Game5FX?.shake?.(7);
}
function onEstellaEnd(h){for(let k=0;k<10;k++)emit(h.x,h.y-36,{ang:k/10*TAU,speed:50,kind:'soft',size:10,life:.9,grav:-10})}

/* ---------- world-space drawing ---------- */
function heartGauge(h,t){
 const n=clamp((h.nutera||0)/100,0,1),x=h.x-44,y=h.y+44,est_=h.estella?.active;
 const bpm=70+n*110,beat=Math.pow(Math.max(0,Math.sin(t*bpm/60*Math.PI)),8),s=15*(1+beat*(.12+.25*n));
 // bar
 ctx.save();ctx.fillStyle='rgba(40,12,32,.8)';ctx.fillRect(x+12,y-3,76,7);
 const g=ctx.createLinearGradient(x+12,0,x+88,0);g.addColorStop(0,'#ff9ad6');g.addColorStop(1,DEEP);ctx.fillStyle=g;ctx.fillRect(x+12,y-3,76*n,7);
 if(n>.75||est_){ctx.globalAlpha=.35+.35*beat;ctx.fillStyle='#fff';ctx.fillRect(x+12,y-3,76*n,2)}
 ctx.globalAlpha=1;ctx.strokeStyle='rgba(255,190,230,.6)';ctx.lineWidth=1;ctx.strokeRect(x+12.5,y-2.5,75,6);
 // sail: sparkles riding the bar
 const sail=(h.sailState?.value||0)/100;for(let k=0;k<Math.round(sail*5);k++){const px=x+12+((t*30+k*17)%76);ctx.fillStyle='rgba(255,236,180,.8)';ctx.fillRect(px,y-4,1.5,1.5)}
 ctx.restore();
 // heart icon filling from the bottom
 ctx.save();ctx.translate(x+4,y);
 ctx.globalAlpha=.9;ctx.drawImage(SPR.soft,-s/2,-s/2,s,s);ctx.globalAlpha=.35;ctx.fillStyle='#000';ctx.fillRect(-s/2,-s/2,s,s*(1-n));
 ctx.globalAlpha=1;ctx.beginPath();ctx.rect(-s/2,-s/2+s*(1-n),s,s*n);ctx.clip();ctx.drawImage(est_?SPR.deep:SPR.pink,-s/2,-s/2,s,s);
 ctx.restore();
}
function orbit(h,t){
 for(let k=0;k<6;k++){const a=t*2.4+k/6*TAU,r=34+Math.sin(t*6+k)*4;drawHeart(h.x+Math.cos(a)*r*1.2,h.y-30+Math.sin(a)*r*.55,12+3*Math.sin(t*8+k),.9,Math.sin(a)*.3,k%2?'pink':'deep')}
 const p=.5+.5*Math.sin(t*10);ctx.save();ctx.globalCompositeOperation='lighter';
 const g=ctx.createRadialGradient(h.x,h.y-30,4,h.x,h.y-30,70);g.addColorStop(0,`rgba(255,120,200,${.35+.2*p})`);g.addColorStop(1,'rgba(255,120,200,0)');ctx.fillStyle=g;ctx.fillRect(h.x-70,h.y-100,140,140);ctx.restore();
}
function tethers(h,t){
 for(const e of window.Game5MultiEnemy?.alive?.()||[]){
  const st=charmStage(h,e.family);if(st<1)continue;
  ctx.save();ctx.globalAlpha=.25+.12*st;ctx.strokeStyle=PINK;ctx.setLineDash([3,7]);ctx.lineDashOffset=-t*20;ctx.lineWidth=1+st*.6;
  ctx.beginPath();ctx.moveTo(h.x,h.y-30);ctx.quadraticCurveTo((h.x+e.x)/2,(h.y+e.y)/2-40,e.x,e.y-10);ctx.stroke();ctx.restore();
  const q=(t*.5)%1,mx=(1-q)*(1-q)*h.x+2*(1-q)*q*(h.x+e.x)/2+q*q*e.x,my=(1-q)*(1-q)*(h.y-30)+2*(1-q)*q*((h.y+e.y)/2-40)+q*q*(e.y-10);
  drawHeart(mx,my,9+st*2,.8);
 }
}
function spiral(h,t,st){
 ctx.save();ctx.translate(h.x,h.y-100);ctx.rotate(t*3);ctx.strokeStyle='rgba(190,150,255,.75)';ctx.lineWidth=2;ctx.beginPath();
 for(let a=0;a<TAU*2;a+=.2){const r=2+a*1.6*(.6+.2*st);a===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r*.6):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r*.6)}ctx.stroke();ctx.restore();
}
function sigil(h,t){
 const n=h.ringmarks?.length||0;if(!n)return;
 ctx.save();ctx.translate(h.x,h.y+18);ctx.scale(1,.45);ctx.rotate(t*.6);ctx.globalAlpha=.55+.15*Math.sin(t*3);
 ctx.strokeStyle='#e89bff';ctx.shadowColor='#e89bff';ctx.shadowBlur=10;ctx.lineWidth=2;
 const art=window.Game5NuteraArt?.sigil;
 if(art?.complete&&art.naturalWidth){const r=36+n*7;ctx.shadowBlur=6;ctx.drawImage(art,-r,-r,r*2,r*2)}
 else{
 for(let k=0;k<n+1;k++){ctx.beginPath();ctx.arc(0,0,26+k*7,0,TAU);ctx.stroke()}
 for(let k=0;k<8;k++){const a=k/8*TAU;ctx.beginPath();ctx.moveTo(Math.cos(a)*26,Math.sin(a)*26);ctx.lineTo(Math.cos(a)*33,Math.sin(a)*33);ctx.stroke()}
 }
 ctx.restore();drawHeart(h.x,h.y+18,12,.7,0,'violet');
}
const G=window.Game5Graphics;
if(G){const under=G.drawHazardsUnder;G.drawHazardsUnder=function(){under?.();const h=state.hero;if(h&&!h.dead)sigil(h,state.time)}}

/* ---------- screen-space ---------- */
function screen(h,t){
 const n=(h.nutera||0)/100,e=h.estella?.active;
 if(n>=.75||e){
  const bpm=70+n*110,beat=Math.pow(Math.max(0,Math.sin(t*bpm/60*Math.PI)),6),k=e?.55:.18+.22*beat;
  screenSpace(()=>{const g=ctx.createRadialGradient(SW/2,SH/2,SH*.32,SW/2,SH/2,SW*.62);g.addColorStop(0,'rgba(255,90,180,0)');g.addColorStop(1,`rgba(255,90,180,${k})`);
  ctx.fillStyle=g;ctx.fillRect(0,0,SW,SH)});
  if(e&&Math.random()<.5)emit(CAM.x+Math.random()*SW,CAM.y+SH+10,{ang:-Math.PI/2,speed:60+Math.random()*60,size:10+Math.random()*12,life:2.2,grav:-8,kind:Math.random()<.3?'soft':'pink'});
 }
 if(est.flash>0){const s=80+(1-est.flash)*420;drawHeart(h.x,h.y-40,s,est.flash*.7,0,'deep')}
 if(est.title>0)screenSpace(()=>{
  const a=Math.min(1,est.title*2)*Math.min(1,(1.6-est.title)*6),y=h.y-CAM.y<SH*.5?SH*.72:SH*.24;
  ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 44px system-ui,sans-serif';
  const logo=window.Game5NuteraArt?.logo;
  if(logo?.complete&&logo.naturalWidth){const lw=340,lh=lw*logo.naturalHeight/logo.naturalWidth;ctx.shadowColor='#ff4fae';ctx.shadowBlur=18;ctx.drawImage(logo,SW/2-lw/2,y-lh/2-4,lw,lh)}
  else{
  ctx.shadowColor='#ff4fae';ctx.shadowBlur=24;ctx.lineWidth=6;ctx.strokeStyle='#5a0f3c';ctx.strokeText('ESTELLA',SW/2,y);
  const g=ctx.createLinearGradient(0,y-22,0,y+22);g.addColorStop(0,'#fff0f8');g.addColorStop(1,'#ff6fc0');ctx.fillStyle=g;ctx.fillText('ESTELLA',SW/2,y);
  }
  ctx.shadowBlur=0;ctx.font='700 13px system-ui,sans-serif';ctx.fillStyle='#ffd6ec';ctx.fillText('ヌテラ飽和 — 行動不能・MP/SP流出',SW/2,y+34);
  ctx.restore();if(!window.Game5NuteraArt?.logo?.naturalWidth){drawHeart(SW/2-150,y,26,a,-.2,'deep');drawHeart(SW/2+150,y,26,a,.2,'deep')}
 });
}

/* ---------- frame ---------- */
let last=performance.now(),waveHigh=false,ambient=0;
const bDraw=draw;
draw=function(){
 const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;
 bDraw();
 const h=state.hero,t=state.time;if(!h)return;
 if(state.started&&!state.over){
  const on=!!h.estella?.active;
  if(on&&!est.was)onEstellaStart(h);if(!on&&est.was)onEstellaEnd(h);est.was=on;
  // ambient hearts from 50% upward; while in Estella, MP/SP leak as motes
  ambient+=dt*Math.max(0,(h.nutera-45)/55)*2.4;while(ambient>=1){ambient--;emit(h.x+(Math.random()-.5)*30,h.y-40,{size:8+Math.random()*6,speed:25,kind:'soft'})}
  if(on&&Math.random()<.6){emit(h.x+(Math.random()-.5)*20,h.y-30,{ang:Math.random()*TAU,speed:50,dot:Math.random()<.5?'#7fc4ff':'#ffc267',size:14,life:.9,grav:40})}
  // Lumane wave peak: a pink ripple
  if(h.lumaneWave>.9&&!waveHigh){waveHigh=true;ring(h.x,h.y-10,20,110,1,'rgba(255,150,210,.9)',2)}if(h.lumaneWave<.7)waveHigh=false;
 }
 stepParticles(dt);est.flash=Math.max(0,est.flash-dt*1.6);est.title=Math.max(0,est.title-dt);
 if(!h.dead){
  tethers(h,t);
  const hyp=tierInfo(h.hypnosis||{value:0}).stage;if(hyp>=1)spiral(h,t,hyp);
  if(h.estella?.active)orbit(h,t);
  heartGauge(h,t);
 }
 drawRings(dt);drawParticles();
 if(state.started)screen(h,t);
};

/* ---------- panel ---------- */
const bRender=renderUI;
renderUI=function(){
 bRender();
 const h=state.hero,blk=document.querySelector('.systemBlock');if(!h||!blk)return;
 blk.classList.toggle('hot',h.nutera>=75&&!h.estella?.active);
 blk.classList.toggle('estella',!!h.estella?.active);
 blk.style.setProperty?.('--beat',`${Math.max(.32,60/(70+h.nutera*1.1))}s`);
};
window.Game5NuteraFX={version:'0.16.0',emit,drawHeart,ring,sprites:SPR};
})();
