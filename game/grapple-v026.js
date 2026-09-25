(()=>{
'use strict';
/* v0.26.0 grapples.
   A binding attack that lands no longer just freezes the heroine: the monster closes in and
   holds her, and while it holds her it keeps using special attacks. That is where Nutera is
   meant to come from now; ordinary hits, clouds and fields still add some, but far less.
   - latch: the monster dashes to her side and stays attached; it does nothing else meanwhile
   - specials every ~0.8-1.2s: each species has its own, with its own Nutera / Lumane / Sail /
     hypnosis / charm mix, growing a little with every repeat inside the same hold
   - she struggles on her own: progress depends on SP, how well she knows binds, and how
     far gone she already is (Nutera and Estella slow it). Struggling costs SP.
   - the hold ends when she breaks free, when the monster is hit hard / stunned / killed,
     or when it has held her for its full time. After breaking free she is briefly immune.
   - the director's shadow stake becomes a hold by shadow hands (no monster attached).
   Drawn: strands from the monster wrapping her body, a pulse on every special, and a
   struggle gauge over her head. */
const C={
 outside:.4,          // Nutera from anything that is not a hold
 hold:{min:3.2,max:4.6},
 every:[.8,1.2],
 struggle:{base:.28,know:.1,sp:.12,nutera:.45,cost:.8},
 bindDrain:2,       // SP drain while held (the old flat bind drain was 7.2/s)
 immune:2.4
};
/* v0.27 寸止め (profile: 寸止め・焦らし・おあずけ, "耐えられず腰でねだるまでの過程").
   When a special brings her to the brink (Nutera >= at) without tipping her into Estella, the
   holder may let go on purpose and back off. She is left at the edge: Nutera only sinks slowly,
   and every couple of seconds her body takes a step toward it on its own before she catches
   herself. If the same monster takes her again while she is like this, it starts where it
   stopped. */
const EDGE={at:86,cap:95,t:7.5,sink:.9,wait:2.6,pullEvery:[1.5,2.4],pull:.75,pullSpeed:52,near:300,drain:3.2,
 chance:{lure_cap:.5,flower:.45,creeping_hand:.45,crown_attendant:.4,wisp:.4,moth:.4,gazer:.35,silk_spider:.35,mirror_slime:.3},base:.18};
const SP={
 gel:{col:'#e89ab8',moves:[['粘膜の包み込み',{nutera:10,lumane:6}],['冠の脈動',{nutera:8,hypnosis:8}]]},
 slug:{col:'#e28ac0',moves:[['這い上がる粘膜',{nutera:10,sail:4}],['ぬめりの舐め上げ',{nutera:11,lumane:5}]]},
 leech:{col:'#f0a0c0',moves:[['吸盤の吸い付き',{nutera:9,sail:5}],['羽音の震え',{nutera:8,lumane:6}]]},
 worm:{col:'#f2dcc8',moves:[['絹の締め付け',{nutera:9,lumane:8}],['節のうねり',{nutera:10,sail:3}]]},
 orb:{col:'#e0b84a',moves:[['胞子の吹きかけ',{nutera:7,lumane:9,sail:3}],['こぶの押し付け',{nutera:9}]]},
 flower:{col:'#c83a58',moves:[['蜜垂らし',{nutera:9,charm:10}],['花弁の抱擁',{nutera:10,sail:4}]]},
 moth:{col:'#d8a860',moves:[['鱗粉の撫で',{nutera:8,sail:4}],['眼状紋の凝視',{nutera:7,hypnosis:12}]]},
 mirror_slime:{col:'#aed4e0',moves:[['映し身の重なり',{nutera:9,charm:8}],['冷たい鏡面',{nutera:8,lumane:6}]]},
 silk_spider:{col:'#e8e4ee',moves:[['糸巻き',{nutera:8,lumane:9}],['脚の撫で',{nutera:9,sail:3}]]},
 bubble_shell:{col:'#f0a070',moves:[['泡の包み込み',{nutera:8,sail:6}],['殻の吸い付き',{nutera:9}]]},
 crown_attendant:{col:'#eaa6c0',moves:[['灰粘の抱え込み',{nutera:9,lumane:6}],['冠の共鳴',{nutera:7,hypnosis:9}]]},
 wisp:{col:'#bfeaf4',moves:[['冷気のすり抜け',{nutera:8,sail:5}],['すすり泣きの耳打ち',{nutera:7,hypnosis:9}]]},
 creeping_hand:{col:'#c3cadb',moves:[['足首のまさぐり',{nutera:11,sail:3}],['指の這い上がり',{nutera:10,lumane:6}]]},
 gazer:{col:'#8a4ad0',moves:[['至近の凝視',{nutera:7,hypnosis:14}],['触手の撫で',{nutera:9}]]},
 lure_cap:{col:'#7ee8e0',moves:[['襞の巻きつき',{nutera:10,lumane:6}],['甘い胞子',{nutera:8,lumane:9,sail:3}]]},
 water_wraith:{col:'#6ed0ea',moves:[['水の腕の引き込み',{nutera:9,sail:5}],['冷たい水流',{nutera:8,lumane:6}]]},
 stone_sentinel:{col:'#b8b2a4',moves:[['石腕の抱え込み',{nutera:9,sail:3}],['ひびの脈動',{nutera:8,lumane:7}]]},
 snare:{col:'#b98cff',moves:[['影の手',{nutera:8,lumane:5}],['影のまさぐり',{nutera:9,sail:3}]]}
};
const look=e=>SP[e?.type]||SP.snare;
/* how each kind of hold looks (v0.27): engulfing slimes swallow her from the feet up,
   winders wrap strands round her, the rest cling and add their own touch */
const STYLE={gel:'engulf',slug:'engulf',mirror_slime:'engulf',crown_attendant:'engulf',water_wraith:'engulf',
 worm:'wrap',silk_spider:'wrap',snare:'wrap',creeping_hand:'wrap',lure_cap:'wrap',flower:'wrap',stone_sentinel:'wrap',
 leech:'cling',orb:'spore',moth:'dust',gazer:'gaze',bubble_shell:'bubble',wisp:'mist'};

/* ---------- Nutera: holds are the main source ---------- */
const baseNut=applyNutera;
applyNutera=function(h,base,meta={}){
 const held=!!h?.grapple||meta.grapple;
 return baseNut(h,base*(held?1:C.outside),meta);
};

/* ---------- starting a hold ---------- */
function start(h,e,dur){
 if(!h||h.dead||h.estella?.active&&!h.grapple)return;
 if(h.grapple){h.grapple.dur=Math.max(h.grapple.dur,h.grapple.t+1.5);return}
 dur=dur||rnd(C.hold.min,C.hold.max);
 h.grapple={e,t:0,dur,next:.45,prog:0,specials:0,pulse:0,side:Math.random()<.5?-1:1,room:state.dungeon?.room};
 if(e){
  e.grappling=true;e.cast=null;e.dash=null;
  const a=Math.atan2(e.y-h.y,e.x-h.x),r=(h.r||18)+(e.r||24)*.55,tx=h.x+Math.cos(a)*r,ty=h.y+Math.sin(a)*r*.7;
  e.dash={x0:e.x,y0:e.y,x1:tx,y1:ty,t:0,T:.16,ang:a};
 }
 h.status.bind=Math.max(h.status.bind||0,.3);
 h.grappleCount=(h.grappleCount||0)+1;
 h._voiceEvent='grab';
 if(h._edge){if(e&&e===h._edge.e){h._edgeRegrab=true;h.grapple.next=.25}h._edge=null}
 log(`${e?e.name:'影の手'}に捕まった——もがいても、離れない。`);
 window.Game5FX?.shake?.(5);
}
function release(h,why){
 const g=h.grapple;if(!g)return;
 const e=g.e;h.grapple=null;h.status.bind=0;h.bindImmuneT=C.immune;h._lastRelease=why;
 if(e){e.grappling=false;e.actCd=Math.max(e.actCd||0,1.1);
  if(why==='free'){const a=Math.atan2(e.y-h.y,e.x-h.x);e.dash={x0:e.x,y0:e.y,x1:e.x+Math.cos(a)*70,y1:e.y+Math.sin(a)*70,t:0,T:.18,ang:a};e.stun=Math.max(e.stun||0,.35)}}
 h._voiceEvent=why==='free'?'free':'released';
 if(why==='free'){addFx('text',h.x,h.y-70,'振りほどいた','#cfe8ff',.9);log('もがき続けて、ようやく振りほどいた。')}
}
/* a binding cast that connects starts a hold with the caster (state.enemy while it resolves) */
const baseHurt=hurtHero;
hurtHero=function(h,dmg,status=null,meta={}){
 const wasBound=(h?.status?.bind||0)>0,e=state.enemy;
 const r=baseHurt(h,dmg,status,meta);
 if(h&&!h.dead&&status?.bind&&(h.status.bind||0)>0){
  if(meta?.sourceKey==='bind'&&e&&e.hp>0&&!e.grappling)start(h,e);
  else if(!h.grapple&&/影杭|snare/.test(meta?.label||''))start(h,null,2.4);
 }
 return r;
};
/* the director's shadow stake: its bind is applied directly, not through hurtHero */
const baseHaz=updateHazards;
updateHazards=function(dt){
 baseHaz(dt);const h=state.hero;if(!h||h.dead)return;
 for(const z of state.hazards||[])if(z.kind==='directorSnare'&&z.triggered&&!z.grappled){z.grappled=true;if(!h.grapple&&(h.bindImmuneT||0)<=0)start(h,null,2.4)}
};

/* ---------- the hold, every frame ---------- */
function special(h,g){
 const L=look(g.e),[name,fx]=L.moves[(g.specials+(g.e?0:1))%L.moves.length],grow=1+Math.min(.5,g.specials*.1),src=`${g.e?g.e.name+'・':''}${name}`;
 const m={source:src,grapple:true};
 if(fx.nutera)applyNutera(h,fx.nutera*grow,m);
 if(fx.sail)applySail(h,fx.sail);
 if(fx.lumane)applyTiered(h,'lumane',fx.lumane,m);
 if(fx.hypnosis){applyTiered(h,'hypnosis',fx.hypnosis,m);g.hypno=(g.hypno||0)+1}
 if(fx.charm&&g.e)applyTiered(h,'charm',fx.charm,{...m,family:g.e.family});
 drainSp(h,.6,'拘束中の責め');
 addFx('text',h.x+(g.side*26),h.y-96,name,'#ffc2e6',.9);
 g.specials++;g.pulse=1;h._voiceEvent='special';h._lastSpecial=name;
 const NF=window.Game5NuteraFX;if(NF)NF.emit(h.x+(Math.random()<.5?-1:1)*(18+Math.random()*8),h.y-60,{kind:'pink'});
 if(g.e)g.e.flash=Math.max(g.e.flash||0,.08);
 if(g.e&&!g.edgeRolled&&!h.estella?.active&&(h.nutera||0)>=EDGE.at){g.edgeRolled=true;g.edgeNow=Math.random()<(EDGE.chance[g.e.type]??EDGE.base)}
}
function edgeRelease(h,g){
 const e=g.e;h.nutera=Math.min(h.nutera,EDGE.cap);
 release(h,'edge');
 h._edge={e,t:EDGE.t,n:h.nutera,next:rnd(...EDGE.pullEvery)*.6,pull:0,pulling:false};
 h.edgeCount=(h.edgeCount||0)+1;
 if(e){
  const a=Math.atan2(e.y-h.y,e.x-h.x),blocked=window.Game5Dungeon?.blockedAt;let tx=e.x,ty=e.y;
  for(let d=6;d<=84;d+=6){const nx=e.x+Math.cos(a)*d,ny=e.y+Math.sin(a)*d;if(blocked?.(e,nx,ny))break;tx=nx;ty=ny}
  e.dash={x0:e.x,y0:e.y,x1:tx,y1:ty,t:0,T:.4,ang:a};e.actCd=Math.max(e.actCd||0,EDGE.wait);e.decision='焦らしている';
 }
 addFx('text',h.x,h.y-104,'……寸止め','#ffb0dc',1.4);
 log(`${e?.name||'それ'}は、あと少しのところで彼女を離した。`);
 h._voiceEvent='edge';
}
/* the edge, every frame she is not held: Nutera held up, her hips following it */
function edgeTick(h,dt,px,py){
 const E=h._edge;if(!E)return;
 if(h.dead||h.estella?.active){h._edge=null;return}
 E.t-=dt;if(E.e&&E.e.hp<=0)E.e=null;
 E.n=Math.max(0,E.n-dt*EDGE.sink);if(h.nutera<E.n)h.nutera=E.n;
 drainSp(h,EDGE.drain*dt,'焦らし');   // she cannot get her breath back while it lasts
 const e=E.e;
 if(E.pull>0){
  E.pull-=dt;
  if(e&&!h.cast){
   const a=Math.atan2(e.y-h.y,e.x-h.x),d=Math.hypot(e.x-px,e.y-py);
   if(d>(e.r||24)+20){const nx=px+Math.cos(a)*EDGE.pullSpeed*dt,ny=py+Math.sin(a)*EDGE.pullSpeed*dt;
    if(!window.Game5Dungeon?.blockedAt?.(h,nx,ny)){h.x=nx;h.y=ny;h.moving=true;h.facing=a;h.dir=dirFrom(Math.cos(a),Math.sin(a))}}
  }
 }else if(E.pulling){E.pulling=false;h._voiceEvent='edgeCatch'}
 E.next-=dt;
 if(E.next<=0&&E.pull<=0){E.next=rnd(...EDGE.pullEvery);
  if(e&&!h.cast&&Math.hypot(e.x-h.x,e.y-h.y)<EDGE.near&&Math.random()<.8){E.pull=EDGE.pull;E.pulling=true;h.edgePulls=(h.edgePulls||0)+1;h._voiceEvent='edgePull';addFx('text',h.x,h.y-100,'腰が……','#ffb0dc',.8)}}
 if(E.t<=0){h._edge=null;h._voiceEvent='edgeEnd'}
}
const baseHero=updateHero;
updateHero=function(h,dt){
 const g=h?.grapple;
 if(g&&h.bindDrain!==C.bindDrain){h._bindDrain0??=h.bindDrain;h.bindDrain=C.bindDrain}
 if(!g&&h?._bindDrain0!=null){h.bindDrain=h._bindDrain0;h._bindDrain0=null}
 const px=h?.x,py=h?.y;
 baseHero(h,dt);
 if(!h)return;
 if(!g){edgeTick(h,dt,px,py);return}
 if(h.dead||g.room!==state.dungeon?.room){release(h,'end');return}
 const e=g.e;
 if(e&&(e.hp<=0||e.stun>.2)){release(h,'hurt');return}
 g.t+=dt;g.pulse=Math.max(0,g.pulse-dt*3);
 h.status.bind=Math.max(h.status.bind||0,.25);
 // keep the monster pressed against her
 if(e&&!e.dash){const a=Math.atan2(e.y-h.y,e.x-h.x),r=(h.r||18)+(e.r||24)*.55;e.x=h.x+Math.cos(a)*r;e.y=h.y+Math.sin(a)*r*.7;e.cast=null;e.decision='捕らえている'}
 // v0.31: while held she is turned three-quarters toward the viewer, so her face shows
 h.dir=e?(e.x<h.x?'down_left':'down_right'):'front';
 // specials
 g.next-=dt;if(g.next<=0){g.next=rnd(...C.every)*(h.estella?.active?1.25:1);special(h,g);if(g.edgeNow&&h.grapple===g&&!h.estella?.active){edgeRelease(h,g);return}}
 // struggle
 if(!h.estella?.active&&h.status.stun<=0){
  const S=C.struggle,n=(h.nutera||0)/100,rate=(S.base+(h.knowledge?.bind||0)*S.know+(h.sp/h.maxSp)*S.sp)*(1-S.nutera*n)*(1-.4*clamp(h.fatigue||0,0,1));
  g.prog+=dt*Math.max(.03,rate);drainSp(h,S.cost*dt,'もがき');
  if(g.prog>=1){release(h,'free');return}
 }
 if(g.t>=g.dur)release(h,'end');
};
/* while holding her the monster does nothing else */
const EAI=window.Game5EnemyAI;
if(EAI?.move){const m=EAI.move;EAI.move=function(e,h,dt){if(e.grappling){e.moving=false;e._aiMoved=true;return true}return m(e,h,dt)}}
const baseChoose=chooseEnemyAction;
chooseEnemyAction=function(){const e=state.enemy;if(e?.grappling){e.actCd=.4;return}return baseChoose()};
/* reset between floors */
const baseReset=reset;reset=function(){const h=state.hero;if(h?.grapple)h.grapple=null;if(h)h._edge=null;return baseReset()};

/* ---------- drawing: strands, pulse, struggle gauge ---------- */
function strands(h,g,t){
 const e=g.e,L=look(e),col=L.col,n=e?5:6,p=g.pulse;
 ctx.save();ctx.lineCap='round';
 for(let k=0;k<n;k++){
  // anchor on the monster (or rising from the floor for shadow hands) -> wrap around her body
  const ax=e?e.x+Math.cos(k*1.9)*e.r*.35:h.x+Math.cos(k/n*TAU)*34,ay=e?e.y-e.r*.4+Math.sin(k*2.3)*e.r*.3:h.y+10+Math.sin(k/n*TAU)*10;
  const by=h.y-12-k*(58/n),bx=h.x+Math.sin(t*3+k)*4;
  const wob=Math.sin(t*6+k*1.7)*10,mx=(ax+bx)/2+wob,my=Math.min(ay,by)-18-k*3;
  ctx.globalAlpha=.55+.3*p;ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=4.5;ctx.beginPath();ctx.moveTo(ax,ay);ctx.quadraticCurveTo(mx,my,bx,by);ctx.stroke();
  ctx.strokeStyle=col;ctx.lineWidth=2.4+p*1.2;ctx.beginPath();ctx.moveTo(ax,ay);ctx.quadraticCurveTo(mx,my,bx,by);ctx.stroke();
  // the loop around her body: back half first, front half drawn over
  const ry=5,rx=17-k*.6;
  ctx.lineWidth=2+p;ctx.beginPath();ctx.ellipse(bx,by,rx,ry,0,.15,Math.PI-.15);ctx.stroke();
 }
 if(p>0){ctx.globalAlpha=p*.7;ctx.strokeStyle='#ff9ad3';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(h.x,h.y-40,34+26*(1-p),46+26*(1-p),0,0,TAU);ctx.stroke()}
 ctx.restore();
}
function engulf(h,g,t){
 // a wobbling translucent mass swallowing her up to the waist
 const e=g.e,col=look(e).col,p=g.pulse,rise=Math.min(1,g.t/1.1)*(30+8*p)+Math.min(10,g.specials*2.5);
 const base=h.y+14,top=base-rise-6,w=30+4*Math.sin(t*2.6);
 ctx.save();
 const gr=ctx.createLinearGradient(0,top,0,base);gr.addColorStop(0,col+'70');gr.addColorStop(.5,col+'99');gr.addColorStop(1,col+'c0');
 ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(h.x-w-6,base);
 ctx.bezierCurveTo(h.x-w-10,base-rise*.5,h.x-w+2,top+6,h.x-w*.45,top+Math.sin(t*4)*3);
 ctx.bezierCurveTo(h.x-w*.2,top-5+Math.sin(t*5)*3,h.x+w*.2,top+4+Math.sin(t*4.4+1)*3,h.x+w*.5,top+Math.sin(t*3.6+2)*3);
 ctx.bezierCurveTo(h.x+w+2,top+6,h.x+w+10,base-rise*.5,h.x+w+6,base);
 ctx.closePath();ctx.fill();
 ctx.globalAlpha=.5;ctx.strokeStyle='#ffffff';ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(h.x-w*.45,top+rise*.35,7,3,-.5,0,TAU);ctx.stroke();
 ctx.globalAlpha=.35;ctx.beginPath();ctx.ellipse(h.x+w*.3,top+rise*.55,4,2,.3,0,TAU);ctx.stroke();
 // strings of goo clinging higher up
 ctx.globalAlpha=.65;ctx.strokeStyle=col;ctx.lineWidth=1.8;
 for(let k=0;k<3;k++){const x=h.x-12+k*12,l=12+10*Math.abs(Math.sin(t*1.7+k));ctx.beginPath();ctx.moveTo(x,top+4);ctx.quadraticCurveTo(x+4,top-l*.5,x+1,top-l);ctx.stroke()}
 ctx.restore();
}
function extra(h,g,t,style){
 const p=g.pulse,col=look(g.e).col;ctx.save();
 if(style==='spore'||style==='dust'){for(let k=0;k<14;k++){const a=t*1.4+k*.9,r=22+((k*37)%30),x=h.x+Math.cos(a)*r,y=h.y-40+Math.sin(a*1.3)*r*.8;ctx.globalAlpha=.5+.3*Math.sin(t*4+k);ctx.fillStyle=style==='dust'?'#fff0d0':col;ctx.beginPath();ctx.arc(x,y,style==='dust'?1.6:2.4,0,TAU);ctx.fill()}}
 if(style==='bubble'){for(let k=0;k<8;k++){const ph=(t*.6+k/8)%1,x=h.x-20+((k*29)%40),y=h.y+4-ph*90;ctx.globalAlpha=(1-ph)*.7;ctx.strokeStyle='#e8fbff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,4+k%3*2,0,TAU);ctx.stroke()}}
 if(style==='mist'){const gr=ctx.createRadialGradient(h.x,h.y-30,4,h.x,h.y-30,60);gr.addColorStop(0,'rgba(210,245,255,.35)');gr.addColorStop(1,'rgba(210,245,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(h.x,h.y-30,60,0,TAU);ctx.fill()}
 if(style==='gaze'&&g.e){const e=g.e;ctx.globalCompositeOperation='lighter';for(let k=0;k<3;k++){const a=t*3+k*2.1;ctx.globalAlpha=.25+.25*p;ctx.strokeStyle='#b98cff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(e.x,e.y-e.r*.6);ctx.lineTo(h.x+Math.cos(a)*10,h.y-64+Math.sin(a)*6);ctx.stroke()}
  ctx.globalAlpha=.4+.3*Math.sin(t*6);ctx.strokeStyle='#d8b8ff';ctx.beginPath();for(let a=0;a<TAU*2;a+=.25){const r=2+a*1.8;a?ctx.lineTo(h.x+Math.cos(a+t*4)*r,h.y-78+Math.sin(a+t*4)*r*.6):ctx.moveTo(h.x,h.y-78)}ctx.stroke()}
 if(style==='cling'&&g.e){const e=g.e;ctx.globalAlpha=.6;ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(h.x,h.y-44);ctx.stroke();ctx.fillStyle=col;ctx.beginPath();ctx.arc(h.x,h.y-44,4+2*p,0,TAU);ctx.fill()}
 ctx.restore();
}
function gauge(h,g){
 const w=64,x=h.x-w/2,y=h.y-126;
 ctx.save();ctx.fillStyle='#000b';ctx.fillRect(x-2,y-2,w+4,10);
 ctx.fillStyle='#3a2438';ctx.fillRect(x,y,w,6);
 ctx.fillStyle=h.estella?.active?'#8a6a86':'#f0e6ff';ctx.fillRect(x,y,w*clamp(g.prog,0,1),6);
 ctx.font='700 10px system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffd6f0';ctx.fillText(h.estella?.active?'もがけない':'もがく',h.x,y-4);
 ctx.restore();
}
const Gr=window.Game5Graphics;
if(Gr){const over=Gr.drawHazardsOver;Gr.drawHazardsOver=function(){over?.();const h=state.hero,g=h?.grapple;if(g&&!h.dead){
 const st=STYLE[g.e?.type||'snare']||'wrap',t=state.time;
 if(st==='engulf')engulf(h,g,t);else if(st==='wrap')strands(h,g,t);else{extra(h,g,t,st);if(st!=='cling'&&st!=='gaze')strands(h,g,t)}
 if(st==='cling'||st==='gaze')extra(h,g,t,st);
 gauge(h,g)}}}
function edgeThread(h){
 const E=h._edge,e=E?.e;if(!e)return;
 const t=state.time,k=E.pull>0?1:.45,x0=h.x,y0=h.y-30,x1=e.x,y1=e.y-(e.r||24)*.4,mx=(x0+x1)/2,my=Math.min(y0,y1)-50;
 ctx.save();ctx.lineCap='round';
 ctx.globalAlpha=k*.35;ctx.strokeStyle='#5a0f3c';ctx.lineWidth=3+k*2;ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(mx,my,x1,y1);ctx.stroke();
 ctx.globalAlpha=.45+k*.45;ctx.strokeStyle='#ff9ad3';ctx.lineWidth=1.4+k*1.6;ctx.setLineDash([3,6]);ctx.lineDashOffset=-t*40;
 ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(mx,my,x1,y1);ctx.stroke();ctx.restore();
 // small hearts drifting from her toward it
 const NF=window.Game5NuteraFX;
 for(let i=0;i<(E.pull>0?3:2);i++){const q=(t*(E.pull>0?.9:.45)+i/3)%1,bx=(1-q)*(1-q)*x0+2*(1-q)*q*mx+q*q*x1,by=(1-q)*(1-q)*y0+2*(1-q)*q*my+q*q*y1;NF?.drawHeart?.(bx,by,7+4*k,(1-q)*.9)}
 NF?.drawHeart?.(h.x,h.y-30,9+5*k+2*Math.sin(t*9),.55+.4*k);
}
if(Gr){const over=Gr.drawHazardsOver;Gr.drawHazardsOver=function(){over?.();const h=state.hero;if(h&&!h.dead&&!h.grapple&&h._edge)edgeThread(h)}}
window.Game5Grapple={version:'0.27.0',cfg:C,specials:SP,edge:EDGE,start,release};
})();
