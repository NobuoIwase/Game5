(()=>{
'use strict';
/* v0.12.0 presentation layer.
   - room-aware dungeon: floor variation, textured interior walls with drop shadows,
     per-room torches/crystal/rubble, stairs that stay sealed until the floor is cleared,
     zone art that matches the room's field type, lighting that follows those light sources
   - telegraphs colour coded by effect with a fill that shows the time left
   - readable floating numbers, hit particles, slash trails, screen shake, hit-stop
   - actor shadows, enemy name/skill labels, hero SP gauge, floor transition title card */
const G=window.Game5Graphics;if(!G)return;
const img=src=>{const i=new Image();i.src=src;return i};
const TILES=img('./assets/dungeon.png'),FXI=img('./assets/fx.png');
const S=64,ok=i=>i.complete&&i.naturalWidth;
function cell(im,cols,n,x,y,w,h=w,a=1){if(!ok(im))return;ctx.save();ctx.globalAlpha*=a;ctx.drawImage(im,n%cols*S,Math.floor(n/cols)*S,S,S,x,y,w,h);ctx.restore()}
const T=(n,x,y,w,h,a)=>cell(TILES,4,n,x,y,w,h,a),F=(n,x,y,s,a)=>cell(FXI,3,n,x-s/2,y-s/2,s,s,a);
const room=()=>window.Game5Dungeon?.room?.(),roomIdx=()=>state.dungeon?.room??0;
const alive=()=>window.Game5MultiEnemy?.alive?.()||(state.enemy?.hp>0?[state.enemy]:[]);
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function hash(a,b,c){let h=(a*374761393+b*668265263+c*2147483647)>>>0;h=(h^(h>>>13))*1274126177>>>0;return(h>>>0)/4294967296}

/* ---------- per-room layout (deterministic) ---------- */
const WET={swamp:1,mist:1,nectar:1};
const layouts=new Map();
function layout(){
 const i=roomIdx(),r=room();if(!r)return null;
 if(layouts.has(i))return layouts.get(i);
 const tf=window.Game5Terrain?.current?.();
 if(tf){const L={torches:tf.torches.map(([x,y])=>({x,y:y-4})),crystal:tf.crystal?{x:tf.crystal[0],y:tf.crystal[1]}:null,rubble:tf.rubble.map(([x,y])=>({x,y,s:40})),entry:{x:tf.entry[0],y:tf.entry[1]+20},wet:(r.zones||[]).some(z=>WET[z.kind]),terrain:true};layouts.set(i,L);return L}
 const R=rng(i*7919+13),blocked=(x,y,pad)=>(r.walls||[]).some(w=>x>w.x-pad&&x<w.x+w.w+pad&&y>w.y-pad&&y<w.y+w.h+pad);
 const torches=[];for(let k=0;k<3;k++){const x=150+k*300+R()*120;torches.push({x,y:44})}
 let crystal=null;for(let k=0;k<30&&!crystal;k++){const side=R()<.5,x=side?(R()<.5?70+R()*60:W-130+R()*60):110+R()*740,y=side?120+R()*320:100+R()*20;if(!blocked(x,y,50)&&Math.hypot(x-r.exit[0],y-r.exit[1])>140&&!(r.zones||[]).some(z=>Math.hypot(x-z.x,y-z.y)<z.r+30))crystal={x,y}}
 const rubble=[];for(let k=0;k<2;k++){const x=80+R()*800,y=110+R()*380;if(!blocked(x,y,30))rubble.push({x,y,s:34+R()*22,a:R()*TAU})}
 const entry=r.exit[0]>W/2?{x:18,y:state.hero?.y??270}:{x:W-18,y:state.hero?.y??270};
 const L={torches,crystal,rubble,entry,wet:(r.zones||[]).some(z=>WET[z.kind])};
 layouts.set(i,L);return L;
}

/* ---------- dungeon base ---------- */
function floor(){
 ctx.fillStyle='#060a08';ctx.fillRect(0,0,W,H);
 if(!ok(TILES))return false;
 const i=roomIdx(),L=layout(),baked=window.Game5Floor?.get?.(i);
 if(baked)ctx.drawImage(baked,0,0);
 else for(let y=56,ty=0;y<H;y+=64,ty++)for(let x=-16,tx=0;x<W;x+=64,tx++){
  const v=hash(tx,ty,i+1),n=v<(L?.wet?.2:.08)?2:v<.3?1:0;
  if(window.Game5Assets?.floorTile?.(i,v,x,y))continue;
  T(n,x,y,64,64,.92);
 }
 if(!baked)for(let x=-16;x<W;x+=64)T(3,x,0,64,72);
 // side walls and bottom lip so the playfield reads as a room
 const g=ctx.createLinearGradient(0,0,26,0);g.addColorStop(0,'#030504');g.addColorStop(1,'#03050400');ctx.fillStyle=g;ctx.fillRect(0,0,26,H);
 const g2=ctx.createLinearGradient(W,0,W-26,0);g2.addColorStop(0,'#030504');g2.addColorStop(1,'#03050400');ctx.fillStyle=g2;ctx.fillRect(W-26,0,26,H);
 const g3=ctx.createLinearGradient(0,H,0,H-24);g3.addColorStop(0,'#030504');g3.addColorStop(1,'#03050400');ctx.fillStyle=g3;ctx.fillRect(0,H-24,W,24);
 return true;
}
const ZONE={swamp:{c:'#6f9873',tile:8},mist:{c:'#86bcb6',fx:3},ring:{c:'#b992ff',fx:7},spore:{c:'#9bd46a',fx:2,vent:9},nectar:{c:'#e08bc4',fx:2},dream:{c:'#9a7bff',fx:7}};
function zones(){
 const r=room();if(!r)return;
 for(const z of r.zones||[]){
  const d=ZONE[z.kind]||{c:'#86bcb6'},t=state.time;
  ctx.save();ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.clip();
  const mire=window.Game5Assets?.tile?.mire;if(d.tile!=null&&mire?.complete&&mire.naturalWidth){ctx.globalAlpha=.5;ctx.drawImage(mire,z.x-z.r,z.y-z.r,z.r*2,z.r*2);ctx.globalAlpha=1}
  const g=ctx.createRadialGradient(z.x,z.y,4,z.x,z.y,z.r);g.addColorStop(0,d.c+'88');g.addColorStop(.75,d.c+'44');g.addColorStop(1,d.c+'00');
  ctx.fillStyle=g;ctx.fillRect(z.x-z.r,z.y-z.r,z.r*2,z.r*2);
  if(d.fx!=null){F(d.fx,z.x+Math.sin(t*.5)*10,z.y+Math.cos(t*.4)*8,z.r*1.9,.28);if(z.kind==='ring'||z.kind==='dream')F(d.fx,z.x,z.y,z.r*1.2*(1+.05*Math.sin(t*2)),.18)}
  ctx.restore();
  ctx.save();ctx.strokeStyle=d.c;ctx.globalAlpha=.35+.1*Math.sin(t*2);ctx.setLineDash([5,7]);ctx.lineDashOffset=-t*12;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.stroke();ctx.restore();
  if(d.vent!=null)T(d.vent,z.x-26,z.y-26,52,52,.9);
 }
}
function walls(){
 const r=room();if(!r||window.Game5Terrain?.active?.())return;
 for(const w of r.walls||[]){
  ctx.save();ctx.fillStyle='#0008';ctx.fillRect(w.x+6,w.y+w.h,w.w,14);ctx.fillRect(w.x+w.w,w.y+10,8,w.h);ctx.restore();
  ctx.save();ctx.beginPath();ctx.rect(w.x,w.y,w.w,w.h);ctx.clip();
  // raised stone block: masonry texture, darker body, lit top face and rim
  if(window.Game5Floor?.wall?.(roomIdx(),w)){}
  else if(ok(TILES)){for(let y=w.y;y<w.y+w.h;y+=32)for(let x=w.x;x<w.x+w.w;x+=32)if(!window.Game5Assets?.floorTile?.(roomIdx(),hash(x,y,7)*.9+.08,x,y,32))T(hash(x,y,7)<.25?1:0,x,y,32,32)}
  const g=ctx.createLinearGradient(0,w.y,0,w.y+w.h);g.addColorStop(0,'rgba(255,255,255,.1)');g.addColorStop(.25,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.4)');ctx.fillStyle=g;ctx.fillRect(w.x,w.y,w.w,w.h);
  ctx.restore();
  ctx.save();ctx.fillStyle='rgba(220,226,240,.2)';ctx.fillRect(w.x,w.y,w.w,2);ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=1;ctx.strokeRect(w.x+.5,w.y+.5,w.w-1,w.h-1);ctx.restore();
 }
}
function decor(){
 const L=layout(),r=room();if(!L||!r)return;
 for(const b of L.rubble)T(12,b.x-b.s/2,b.y-b.s/2,b.s*.8,b.s*.8,.45);
 for(const t of L.torches)T(6,t.x-22,t.y-30,44,52);
 if(L.crystal)T(7,L.crystal.x-30,L.crystal.y-40,60,64);
 if(!L.terrain)T(5,L.entry.x-(L.entry.x<W/2?8:52),L.entry.y-48,60,78,.55);
 else{ctx.save();ctx.globalAlpha=.5;ctx.strokeStyle='#d9c87c';ctx.setLineDash([4,5]);ctx.beginPath();ctx.ellipse(L.entry.x,L.entry.y,22,10,0,0,TAU);ctx.stroke();ctx.restore()}
 // stairs: sealed until the encounter is cleared
 const [ex,ey]=r.exit,open=!!state.dungeon?.pending,t=state.time;
 ctx.save();
 if(open){ctx.shadowBlur=28+8*Math.sin(t*4);ctx.shadowColor='#ffe28a'}
 T(4,ex-34,ey-34,68,68,open?1:.5);ctx.restore();
 if(!open){
  ctx.save();ctx.strokeStyle='#8a7e6a';ctx.globalAlpha=.7;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ex-26,ey-26);ctx.lineTo(ex+26,ey+26);ctx.moveTo(ex+26,ey-26);ctx.lineTo(ex-26,ey+26);ctx.stroke();ctx.restore();
 }else{
  const h=state.hero,a=Math.atan2(ey-h.y,ex-h.x),d=Math.hypot(ex-h.x,ey-h.y);
  if(d>90){ctx.save();ctx.translate(h.x+Math.cos(a)*46,h.y+Math.sin(a)*46);ctx.rotate(a);ctx.fillStyle='#ffe28acc';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore()}
 }
}
function roomLabel(){
 const r=room();if(!r)return;
 const n=window.Game5Dungeon.rooms.length,i=roomIdx();
 ctx.save();ctx.font='600 13px system-ui,sans-serif';ctx.textBaseline='middle';
 const txt=`第${i+1}区画  ${r.name}`,w=ctx.measureText(txt).width;
 ctx.fillStyle='#000a';roundRect(12,8,w+22+n*12,24,8);ctx.fill();
 ctx.fillStyle='#efe6c8';ctx.fillText(txt,22,20);
 for(let k=0;k<n;k++){ctx.beginPath();ctx.arc(w+30+k*12,20,3.5,0,TAU);ctx.fillStyle=k<i?'#d9c87c':k===i?'#fff4c4':'#ffffff30';ctx.fill()}
 ctx.restore();
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
G.drawDungeonBase=function(){floor();zones();walls();decor();roomLabel();return true};

/* ---------- lighting ---------- */
const lc=document.createElement('canvas');lc.width=W;lc.height=H;const l=lc.getContext('2d');
function hole(x,y,r,s=1){const g=l.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(0,0,0,${s})`);g.addColorStop(1,'rgba(0,0,0,0)');l.fillStyle=g;l.fillRect(x-r,y-r,r*2,r*2)}
G.drawLighting=function(){
 const L=layout(),h=state.hero,t=state.time,r=room();
 l.globalCompositeOperation='source-over';l.clearRect(0,0,W,H);l.fillStyle='rgba(2,5,9,.5)';l.fillRect(0,0,W,H);
 window.Game5Terrain?.fog?.(l);
 l.globalCompositeOperation='destination-out';
 hole(h.x,h.y-20,200);
 for(const e of alive())hole(e.x,e.y,70,.5);
 for(const tc of L?.torches||[])hole(tc.x,tc.y+30,150+6*Math.sin(t*9+tc.x),.85);
 if(L?.crystal)hole(L.crystal.x,L.crystal.y,140,.8);
 if(r&&state.dungeon?.pending)hole(r.exit[0],r.exit[1],150);
 ctx.save();ctx.globalCompositeOperation='multiply';ctx.drawImage(lc,0,0);ctx.restore();
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const tc of L?.torches||[])F(0,tc.x,tc.y+6,120+8*Math.sin(t*11+tc.x),.16);
 if(L?.crystal)F(1,L.crystal.x,L.crystal.y-10,130,.14);
 ctx.restore();
};

/* ---------- hazards: each kind gets its own look ---------- */
function ring(x,y,r,col,a,dash){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=col;ctx.lineWidth=2;if(dash){ctx.setLineDash(dash);ctx.lineDashOffset=-state.time*14}ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();ctx.restore()}
function cloud(z,col,fxn){
 const life=clamp(z.t/1.2,0,1),g=ctx.createRadialGradient(z.x,z.y,4,z.x,z.y,z.r);
 g.addColorStop(0,col+'55');g.addColorStop(1,col+'00');ctx.save();ctx.globalAlpha=life;ctx.fillStyle=g;ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.fill();ctx.restore();
 F(fxn,z.x+Math.sin(state.time+z.x)*6,z.y,z.r*2.1,.3*life);
 ring(z.x,z.y,z.r,col,.5*life,[6,6]);
}
G.drawHazardsUnder=function(){
 const t=state.time;
 for(const z of state.hazards||[]){
  if(z.kind==='enemyFog')cloud(z,'#7fd48a',2);
  else if(z.kind==='directorFog')cloud(z,'#b36bd6',7);
  else if(z.kind==='directorSnare'){
   const armed=(z.arm??0)<=0;
   ctx.save();ctx.globalAlpha=z.triggered?clamp(z.t/.55,0,1):armed?.8:.35;
   ring(z.x,z.y,z.r,'#e5a2d0',armed?.55:.25,[3,5]);
   ctx.fillStyle='#e5a2d0';ctx.beginPath();ctx.moveTo(z.x,z.y-12);ctx.lineTo(z.x+5,z.y+4);ctx.lineTo(z.x-5,z.y+4);ctx.closePath();ctx.fill();
   if(z.noticed&&!z.triggered){ctx.font='800 13px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffd8a0';ctx.fillText('!',z.x,z.y-18)}
   ctx.restore();
  }else if(z.kind==='directorLure'){
   for(let k=0;k<3;k++){const p=((t*1.2+k/3)%1);ring(z.x,z.y,10+p*70,'#f2d38a',.6*(1-p))}
   ctx.save();ctx.fillStyle='#f2d38a';ctx.beginPath();ctx.arc(z.x,z.y,6,0,TAU);ctx.fill();ctx.restore();
  }
 }
};
G.drawHazardsOver=function(){};

/* ---------- perception (vision cone / hearing) ---------- */
function perception(h){
 if(h.dead)return;
 ctx.save();
 const g=ctx.createRadialGradient(h.x,h.y,20,h.x,h.y,h.visionRange);g.addColorStop(0,'rgba(240,244,200,.13)');g.addColorStop(1,'rgba(240,244,200,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.arc(h.x,h.y,h.visionRange,h.facing-h.visionHalf,h.facing+h.visionHalf);ctx.closePath();ctx.fill();
 ctx.globalAlpha=.06;ctx.strokeStyle='#b9d8e8';ctx.setLineDash([3,9]);ctx.beginPath();ctx.arc(h.x,h.y,h.hearingRange,0,TAU);ctx.stroke();
 ctx.restore();
}

/* ---------- telegraphs ---------- */
const TCOL={cleave:'#ff6b6b',charge:'#ffa45c',bind:'#c78bff',fog:'#7fd48a',bolt:'#6fd3ff'};
function shape(c,scale=1){
 const s=c.sk;ctx.beginPath();
 if(s.kind==='circle')ctx.arc(c.target.x,c.target.y,Math.max(1,s.r*scale),0,TAU);
 else if(s.kind==='cone'){ctx.moveTo(c.start.x,c.start.y);ctx.arc(c.start.x,c.start.y,Math.max(1,s.range*scale),c.ang-.66,c.ang+.66);ctx.closePath()}
 else{const cs=Math.cos(c.ang),sn=Math.sin(c.ang),hw=s.width/2,L=s.range*scale;
  ctx.moveTo(c.start.x-sn*hw,c.start.y+cs*hw);ctx.lineTo(c.start.x+cs*L-sn*hw,c.start.y+sn*L+cs*hw);ctx.lineTo(c.start.x+cs*L+sn*hw,c.start.y+sn*L-cs*hw);ctx.lineTo(c.start.x+sn*hw,c.start.y-cs*hw);ctx.closePath()}
}
function telegraph(e){
 const c=e.cast;if(!c)return;
 const p=clamp(1-Math.max(0,c.t)/Math.max(.01,c.total),0,1),col=TCOL[c.key]||'#ff6b6b',main=e===state.enemy,late=c.t<.22;
 ctx.save();
 ctx.globalAlpha=.12+.08*p;ctx.fillStyle=col;shape(c);ctx.fill();
 ctx.globalAlpha=.22+.12*p;shape(c,p);ctx.fill();
 ctx.globalAlpha=late?.65+.35*Math.abs(Math.sin(state.time*28)):.55;ctx.strokeStyle=late?'#fff':col;ctx.lineWidth=main?2.6:1.6;if(!main)ctx.setLineDash([7,5]);
 shape(c);ctx.stroke();
 ctx.restore();
}
function shadows(){
 const h=state.hero;
 ctx.save();ctx.fillStyle='#000';
 ctx.globalAlpha=.34;ctx.beginPath();ctx.ellipse(h.x,h.y+22,19,7,0,0,TAU);ctx.fill();
 for(const e of alive()){
  const fly=e.type==='leech'||e.type==='moth'||e.type==='orb';
  ctx.globalAlpha=fly?.2:.32;ctx.beginPath();ctx.ellipse(e.x,e.y+(fly?34:24),(e.r||26)*(fly?.8:1.1),(e.r||26)*.36,0,0,TAU);ctx.fill();
 }
 ctx.restore();
}
function heroCastArc(h){
 if(!h.cast||!['melee','bash','heavy'].includes(h.cast.sk.kind))return;
 const q=h.cast,p=1-q.t/q.total,r=q.sk.range+(q.sk.kind==='heavy'?10:0);
 ctx.save();ctx.globalAlpha=.1+.18*p;ctx.fillStyle='#f4d77c';
 ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.arc(h.x,h.y,r,h.facing-.62,h.facing+.62);ctx.closePath();ctx.fill();
 ctx.globalAlpha=.5;ctx.strokeStyle='#ffe9a8';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(h.x,h.y,r*p,h.facing-.62,h.facing+.62);ctx.stroke();ctx.restore();
}
const LOOK={gel:'saturate(.2) brightness(1.2) contrast(1.1)',worm:'hue-rotate(45deg) saturate(.55) brightness(1.3)',flower:'hue-rotate(160deg) saturate(1.3)',slug:'hue-rotate(85deg) saturate(1.25)'};
function crown(e){
 const s=(e.r||30)*.9,x=e.x,y=e.y-(e.r||30)*1.55+Math.sin(state.time*4)*4;
 ctx.save();ctx.fillStyle='#b9b4a6';ctx.strokeStyle='#3a362e';ctx.lineWidth=2;ctx.beginPath();
 ctx.moveTo(x-s*.5,y+s*.18);ctx.lineTo(x-s*.55,y-s*.2);ctx.lineTo(x-s*.25,y);ctx.lineTo(x,y-s*.32);ctx.lineTo(x+s*.25,y);ctx.lineTo(x+s*.55,y-s*.2);ctx.lineTo(x+s*.5,y+s*.18);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#d77ad8';ctx.beginPath();ctx.arc(x,y-s*.02,s*.07,0,TAU);ctx.fill();ctx.restore();
}
function underActors(){
 // enemy objects are reused between floors and copied for supports: key the tint to the species
 for(const e of alive())if(e._lookType!==e.type){e._lookType=e.type;e.visualFilter=LOOK[e.type]||window.Game5SpeciesLook?.[e.type]||''}
 shadows();
 for(const e of alive())if(e!==state.enemy)telegraph(e);
 if(state.enemy?.hp>0)telegraph(state.enemy);
 heroCastArc(state.hero);
}

/* ---------- particles, trails, floating text ---------- */
const parts=[],trails=[];
const SPEC_COL={gel:'#9fe0ff',slug:'#bde68a',leech:'#ffb0a0',worm:'#e0d0ff',orb:'#d4ff9e',flower:'#ffb4dc',moth:'#e8ccff'};
function burst(x,y,col,n=10,spd=140,life=.55,size=3.2){
 for(let i=0;i<n&&parts.length<260;i++){const a=Math.random()*TAU,v=spd*(.35+Math.random()*.8);parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,t:life*(.6+Math.random()*.6),max:life,col,s:size*(.6+Math.random()*.8)})}
}
function stepParts(dt){
 for(const p of parts){p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.vx*=1-2.5*dt}
 for(let i=parts.length-1;i>=0;i--)if(parts[i].t<=0)parts.splice(i,1);
 for(const t of trails)t.t-=dt;for(let i=trails.length-1;i>=0;i--)if(trails[i].t<=0)trails.splice(i,1);
}
function effects(){
 ctx.save();
 for(const t of trails){
  const a=clamp(t.t/t.max,0,1),sweep=1-a;
  ctx.globalAlpha=a*.9;ctx.strokeStyle=t.heavy?'#ffd36b':'#fff4d0';ctx.lineCap='round';
  for(let k=0;k<3;k++){ctx.lineWidth=(t.heavy?10:6)*(1-k*.3)*a+1;ctx.beginPath();ctx.arc(t.x,t.y,t.r-k*9,t.ang-.95+sweep*.2,t.ang+.95*(.4+.6*Math.min(1,sweep*3)));ctx.stroke()}
 }
 for(const p of parts){ctx.globalAlpha=clamp(p.t/p.max,0,1);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,TAU);ctx.fill()}
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 for(const f of state.effects){
  const a=clamp(f.t/f.max,0,1),age=1-a;
  if(f.kind==='text'){
   const big=/^-?\d|Lv|ESTELLA|階段|小休止/.test(f.text),pop=age<.12?1.25-age*2:1,size=(big?17:13)*pop;
   const y=f.y-8-30*(1-Math.pow(1-age,3));
   ctx.globalAlpha=Math.min(1,a*1.6);ctx.font=`800 ${size}px system-ui,sans-serif`;
   ctx.lineWidth=3.5;ctx.strokeStyle='#0a0710e6';ctx.strokeText(f.text,f.x,y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,y);
  }else{
   ctx.globalAlpha=a*.8;ctx.strokeStyle=f.color;ctx.lineWidth=f.kind==='ring'?3:2;
   ctx.beginPath();ctx.arc(f.x,f.y,4+(f.kind==='ring'?46:30)*age,0,TAU);ctx.stroke();
   if(f.kind==='ring'){ctx.globalAlpha=a*.4;ctx.beginPath();ctx.arc(f.x,f.y,2+24*age,0,TAU);ctx.stroke()}
  }
 }
 ctx.restore();
 labels();
}
function labels(){
 for(const e of alive())if(e.type==='gel')crown(e);
 ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.lineJoin='round';
 for(const e of alive()){
  const y=e.y-(e.r||26)-38;
  ctx.font='700 11px system-ui,sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#000c';
  ctx.globalAlpha=e===state.enemy?1:.75;
  const txt=e.cast?e.cast.sk.name:e.name;
  ctx.strokeText(txt,e.x,y);ctx.fillStyle=e.cast?(TCOL[e.cast.key]||'#fff'):'#e8e0d0';ctx.fillText(txt,e.x,y);
  if(e.stun>0){ctx.fillStyle='#ffe98a';ctx.fillText('★ 気絶',e.x,y-13)}
 }
 const h=state.hero;
 if(!h.dead){
  // stamina is her real life bar: show it next to the Nutera gauge
  const w=84,x=h.x-w/2,y=h.y+57,sp=clamp(h.sp/h.maxSp,0,1);
  ctx.globalAlpha=1;ctx.fillStyle='#1b140acc';ctx.fillRect(x,y,w,5);
  ctx.fillStyle=sp<.25?(Math.sin(state.time*12)>0?'#ff7a4d':'#d89d52'):'#e0a85a';ctx.fillRect(x,y,w*sp,5);
  if(h.status.bind>0){ctx.font='700 11px system-ui,sans-serif';ctx.textBaseline='top';ctx.lineWidth=3;ctx.strokeStyle='#000c';ctx.strokeText('もがいている…',h.x,y+8);ctx.fillStyle='#e3c6ff';ctx.fillText('もがいている…',h.x,y+8)}
  if(h.resting){ctx.font='700 11px system-ui,sans-serif';ctx.textBaseline='top';ctx.fillStyle='#bff0c8';ctx.fillText('小休止中',h.x,y+8)}
 }
 ctx.restore();
}

/* ---------- events -> juice ---------- */
let shake=0,hitStop=0;
const bH=hurtEnemy;
hurtEnemy=function(dmg,opts={}){
 const e=state.enemy,before=e?.hp;
 const r=bH(dmg,opts);
 if(e&&before>e.hp){
  const heavy=dmg>=40;burst(e.x,e.y-10,SPEC_COL[e.type]||'#dfe',heavy?18:9,heavy?210:150);
  if(heavy){shake=Math.max(shake,7);hitStop=Math.max(hitStop,.07)}else shake=Math.max(shake,2.5);
  if(e.hp<=0){burst(e.x,e.y,SPEC_COL[e.type]||'#dfe',34,240,.9,4.5);shake=Math.max(shake,9);hitStop=Math.max(hitStop,.12);addFx('text',e.x,e.y-30,'撃破','#fff1a8',1.2)}
 }
 return r;
};
const bHurt=hurtHero;
hurtHero=function(h,dmg,status=null,meta={}){
 const sp=h?.sp,hp=h?.hp,r=bHurt(h,dmg,status,meta);
 if(h&&meta?.sourceKey&&(sp-h.sp>6||hp-h.hp>6)){shake=Math.max(shake,4);burst(h.x,h.y-20,'#f3b6ff',7,120,.45,2.6)}
 return r;
};
const bResolve=resolveHero;
resolveHero=function(h,cast){
 const sk=cast?.sk,live=h.cast===cast;bResolve(h,cast);
 if(live&&sk&&['melee','heavy'].includes(sk.kind))trails.push({x:h.x,y:h.y-14,ang:h.facing,r:sk.range*.85,t:.22,max:.22,heavy:sk.kind==='heavy'});
 if(live&&sk?.kind==='bash')burst(h.x+Math.cos(h.facing)*40,h.y+Math.sin(h.facing)*40-10,'#dfe9ff',8,130,.35,2.5);
};

/* ---------- update / draw wrappers: hit-stop, shake, floor transition ---------- */
const bUpdate=update;
update=function(dt){
 if(hitStop>0){hitStop-=dt;dt*=.12}
 stepParts(dt);
 const h=state.hero;
 if(h?.dashT>0&&Math.random()<.5)parts.push({x:h.x+(Math.random()-.5)*14,y:h.y+20,vx:(Math.random()-.5)*30,vy:-20,t:.35,max:.35,col:'#b8b2a4',s:3});
 bUpdate(dt);
};
let lastRoom=-1,trans=0,clearT=0,wasPending=false,wasStarted=false,lastNow=performance.now();
const bDraw=draw;
draw=function(){
 const now=performance.now(),dt=Math.min(.1,(now-lastNow)/1000);lastNow=now;
 const i=roomIdx();
 if(i!==lastRoom||(state.started&&!wasStarted)){lastRoom=i;trans=1.8;parts.length=0;trails.length=0}
 wasStarted=state.started;
 const pend=!!state.dungeon?.pending;if(pend&&!wasPending)clearT=1.6;wasPending=pend;
 const s=shake;
 ctx.save();if(s>.2)ctx.translate((Math.random()-.5)*s*2,(Math.random()-.5)*s*2);
 bDraw();
 ctx.restore();
 shake*=.86;
 overlays();
 if(!state.over&&state.started){trans=Math.max(0,trans-dt);clearT=Math.max(0,clearT-dt)}
};
function overlays(){
 const h=state.hero,t=state.time;
 // Estella / low stamina: pulse the screen edge so the state is readable at a glance
 const edge=(col,a)=>{const g=ctx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,W*.62);g.addColorStop(0,col+'00');g.addColorStop(1,col);ctx.save();ctx.globalAlpha=a;ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore()};
 if(h.estella?.active){if(!window.Game5NuteraFX)edge('#e7a6ff',.35+.2*Math.sin(t*10))}
 else if(!h.dead&&h.sp<h.maxSp*.25)edge('#ff7a3d',.18+.12*Math.sin(t*8));
 if(clearT>0){
  const a=Math.min(1,clearT*2)*Math.min(1,(1.6-clearT)*6);
  ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 30px system-ui,sans-serif';
  ctx.lineWidth=5;ctx.strokeStyle='#000b';ctx.strokeText('区画制圧',W/2,H*.3);ctx.fillStyle='#ffe9a0';ctx.fillText('区画制圧',W/2,H*.3);
  ctx.font='600 14px system-ui,sans-serif';ctx.lineWidth=3;ctx.strokeText('階段の封印が解けた',W/2,H*.3+30);ctx.fillStyle='#f3ecd6';ctx.fillText('階段の封印が解けた',W/2,H*.3+30);ctx.restore();
 }
 if(trans>0&&state.started){
  const r=room(),a=trans>1.3?1:trans/1.3;
  ctx.save();ctx.globalAlpha=a*.92;ctx.fillStyle='#030504';ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=Math.min(1,trans*1.4);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#d9c87c';ctx.font='600 14px system-ui,sans-serif';ctx.fillText(`第${roomIdx()+1}区画 / ${window.Game5Dungeon.rooms.length}`,W/2,H/2-34);
  ctx.fillStyle='#f5eedb';ctx.font='800 34px system-ui,sans-serif';ctx.fillText(r?.name||'',W/2,H/2+2);
  const names=[...new Set(alive().map(e=>e.name))].join('・');
  ctx.fillStyle='#b9c4bb';ctx.font='500 13px system-ui,sans-serif';ctx.fillText(names?`気配：${names}`:'',W/2,H/2+36);
  if(r?.layout){ctx.fillStyle='#8fa396';ctx.fillText(`地形：${r.layout}`,W/2,H/2+56)}
  ctx.restore();
 }
}

window.Game5FX={version:'0.12.0',clearLayouts:()=>layouts.clear(),perception,underActors,effects,telegraph,burst,shake:v=>shake=Math.max(shake,v)};
})();
