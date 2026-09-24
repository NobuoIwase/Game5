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
 log(`${e?e.name:'影の手'}に捕まった——もがいても、離れない。`);
 window.Game5FX?.shake?.(5);
}
function release(h,why){
 const g=h.grapple;if(!g)return;
 const e=g.e;h.grapple=null;h.status.bind=0;h.bindImmuneT=C.immune;
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
 if(fx.hypnosis)applyTiered(h,'hypnosis',fx.hypnosis,m);
 if(fx.charm&&g.e)applyTiered(h,'charm',fx.charm,{...m,family:g.e.family});
 drainSp(h,.6,'拘束中の責め');
 addFx('text',h.x+(g.side*26),h.y-96,name,'#ffc2e6',.9);
 g.specials++;g.pulse=1;h._voiceEvent='special';h._lastSpecial=name;
 const NF=window.Game5NuteraFX;if(NF)for(let k=0;k<3;k++)NF.emit(h.x+(Math.random()-.5)*26,h.y-40,{kind:k?'soft':'pink'});
 if(g.e)g.e.flash=Math.max(g.e.flash||0,.08);
}
const baseHero=updateHero;
updateHero=function(h,dt){
 const g=h?.grapple;
 if(g&&h.bindDrain!==C.bindDrain){h._bindDrain0??=h.bindDrain;h.bindDrain=C.bindDrain}
 if(!g&&h?._bindDrain0!=null){h.bindDrain=h._bindDrain0;h._bindDrain0=null}
 baseHero(h,dt);
 if(!h)return;
 if(!g)return;
 if(h.dead||g.room!==state.dungeon?.room){release(h,'end');return}
 const e=g.e;
 if(e&&(e.hp<=0||e.stun>.2)){release(h,'hurt');return}
 g.t+=dt;g.pulse=Math.max(0,g.pulse-dt*3);
 h.status.bind=Math.max(h.status.bind||0,.25);
 // keep the monster pressed against her
 if(e&&!e.dash){const a=Math.atan2(e.y-h.y,e.x-h.x),r=(h.r||18)+(e.r||24)*.55;e.x=h.x+Math.cos(a)*r;e.y=h.y+Math.sin(a)*r*.7;e.cast=null;e.decision='捕らえている'}
 // specials
 g.next-=dt;if(g.next<=0){g.next=rnd(...C.every)*(h.estella?.active?1.25:1);special(h,g)}
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
const baseReset=reset;reset=function(){const h=state.hero;if(h?.grapple)h.grapple=null;return baseReset()};

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
function gauge(h,g){
 const w=64,x=h.x-w/2,y=h.y-126;
 ctx.save();ctx.fillStyle='#000b';ctx.fillRect(x-2,y-2,w+4,10);
 ctx.fillStyle='#3a2438';ctx.fillRect(x,y,w,6);
 ctx.fillStyle=h.estella?.active?'#8a6a86':'#f0e6ff';ctx.fillRect(x,y,w*clamp(g.prog,0,1),6);
 ctx.font='700 10px system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffd6f0';ctx.fillText(h.estella?.active?'もがけない':'もがく',h.x,y-4);
 ctx.restore();
}
const Gr=window.Game5Graphics;
if(Gr){const over=Gr.drawHazardsOver;Gr.drawHazardsOver=function(){over?.();const h=state.hero,g=h?.grapple;if(g&&!h.dead){strands(h,g,state.time);gauge(h,g)}}}
window.Game5Grapple={version:'0.26.0',cfg:C,specials:SP,start,release};
})();
