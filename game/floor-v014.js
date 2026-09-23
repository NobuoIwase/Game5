(()=>{
'use strict';
/* v0.14.0 floors.
   The source tiles (assets/dungeon.png and the Game4 slate atlases) carry thick black grout
   and, in the Game4 sheets, cells that do not sit on the 64px grid. Tiled directly they read
   as a noisy chequerboard. Instead each floor is baked once per room:
   - clean surface patches are picked automatically (no grout / dark bands inside the patch)
   - laid as an irregular running-bond flagstone floor with thin, low-contrast joints
   - every stone is pulled toward the room's base colour, then the whole floor is softened
     (lower contrast and saturation) so actors and telegraphs stay the brightest things on screen
   Commissioned floors in assets/requested/ are still tiled as delivered. */
const load=src=>{const i=new Image();i.src=src;return i},ok=i=>i&&i.complete&&i.naturalWidth;
const SRC={moss:load('./assets/dungeon.png'),wet:load('./assets/ext/floor_wet.webp'),slate:load('./assets/ext/floor_normal.webp'),moon:load('./assets/ext/floor_moon.webp')};
const THEME={
 moss:{base:'#4c4b42',grout:'#2f2e28',unify:.42,jit:.07,contrast:.78,sat:.8,bright:.95,patch:12,region:[0,0,192,64],decal:'moss'},
 wet:{base:'#32435a',grout:'#1f2838',unify:.4,jit:.06,contrast:.8,sat:1,bright:.95,patch:30,region:[0,0,192,128],decal:'puddle'},
 slate:{base:'#454c66',grout:'#2a2e40',unify:.38,jit:.06,contrast:.8,sat:.95,bright:.97,patch:30,region:[0,0,192,128],decal:'crack'},
 moon:{base:'#4c4874',grout:'#2c2944',unify:.42,jit:.06,contrast:.82,sat:1.05,bright:1,patch:30,region:[0,0,192,128],decal:'rune'}
};
const ROOM_THEME=['moss','wet','slate','moss','wet','moon','moon'];
const themeOf=i=>ROOM_THEME[i]||'moss';
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}

/* surface patches: windows whose pixels contain no grout-dark pixels */
const patchCache=new Map();
function patches(key){
 if(patchCache.has(key))return patchCache.get(key);
 const th=THEME[key],im=SRC[key],[rx,ry,rw,rh]=th.region,s=th.patch,out=[];
 try{
  const c=document.createElement('canvas');c.width=rw;c.height=rh;const g=c.getContext('2d');g.drawImage(im,rx,ry,rw,rh,0,0,rw,rh);
  const d=g.getImageData(0,0,rw,rh).data,lum=(x,y)=>{const k=(y*rw+x)*4;return d[k]*.3+d[k+1]*.59+d[k+2]*.11};
  let sum=0,n=0;for(let y=0;y<rh;y+=2)for(let x=0;x<rw;x+=2){sum+=lum(x,y);n++}
  const dark=sum/n*.55;
  for(let y=0;y+s<=rh;y+=2)for(let x=0;x+s<=rw;x+=2){
   let bad=0;for(let yy=y;yy<y+s;yy+=2)for(let xx=x;xx<x+s;xx+=2)if(lum(xx,yy)<dark)bad++;
   if(bad===0)out.push({x:rx+x,y:ry+y,s});
  }
 }catch(_){/* canvas tainted (file://): fall back to cell centres */}
 if(!out.length)for(let y=0;y+s<=rh;y+=32)for(let x=0;x+s<=rw;x+=32)out.push({x:rx+x+(32-s)/2,y:ry+y+(32-s)/2,s});
 patchCache.set(key,out);return out;
}

function stone(g,R,th,im,list,x,y,w,h){
 const r=4;g.save();
 g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();g.clip();
 const p=list[(R()*list.length)|0],cx=x+w/2,cy=y+h/2,big=Math.max(w,h)*1.05;
 g.translate(cx,cy);g.rotate(((R()*4)|0)*Math.PI/2);if(R()<.5)g.scale(-1,1);
 g.drawImage(im,p.x,p.y,p.s,p.s,-big/2,-big/2,big,big);
 g.setTransform(1,0,0,1,0,0);
 g.globalAlpha=th.unify;g.fillStyle=th.base;g.fillRect(x,y,w,h);
 g.globalAlpha=R()*th.jit;g.fillStyle=R()<.5?'#000':'#fff';g.fillRect(x,y,w,h);
 g.globalAlpha=1;
 const b=g.createLinearGradient(0,y,0,y+h);b.addColorStop(0,'rgba(255,255,255,.07)');b.addColorStop(.18,'rgba(255,255,255,0)');b.addColorStop(.8,'rgba(0,0,0,0)');b.addColorStop(1,'rgba(0,0,0,.2)');
 g.fillStyle=b;g.fillRect(x,y,w,h);
 g.restore();
}
function decals(g,R,th){
 const blob=(x,y,r,col,a)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col.replace('A',a));gr.addColorStop(1,col.replace('A',0));g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)};
 for(let k=0;k<14;k++)blob(R()*W,64+R()*(H-64),80+R()*140,R()<.5?'rgba(0,0,0,A)':'rgba(255,255,255,A)',.05+R()*.04);
 if(th.decal==='moss')for(let k=0;k<22;k++)blob(R()*W,64+R()*(H-64),10+R()*26,'rgba(92,110,60,A)',.18+R()*.12);
 if(th.decal==='puddle')for(let k=0;k<7;k++){
  const x=R()*W,y=80+R()*(H-100),rx=24+R()*40,ry=rx*(.4+R()*.2);
  g.save();g.globalAlpha=.22;g.fillStyle='#10151d';g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();
  g.globalAlpha=.12;g.strokeStyle='#9fb4d0';g.lineWidth=1.5;g.beginPath();g.ellipse(x-rx*.2,y-ry*.25,rx*.5,ry*.35,0,Math.PI*1.1,Math.PI*1.7);g.stroke();g.restore();
 }
 if(th.decal==='crack'||th.decal==='rune')for(let k=0;k<9;k++){
  let x=R()*W,y=70+R()*(H-80);g.save();g.globalAlpha=.22;g.strokeStyle='#15171f';g.lineWidth=1;g.beginPath();g.moveTo(x,y);
  for(let s=0;s<5;s++){x+=(R()-.5)*30;y+=(R()-.5)*30;g.lineTo(x,y)}g.stroke();g.restore();
 }
 const fx=th.fx||'#ffffff';
 if(th.decal==='silk')for(let k=0;k<16;k++){const x=R()*W,y=70+R()*(H-80),l=40+R()*90,a=R()*Math.PI;g.save();g.globalAlpha=.12+R()*.1;g.strokeStyle=fx;g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(a)*l*.5,y+Math.sin(a)*l*.5+10,x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();g.restore()}
 if(th.decal==='spore')for(let k=0;k<60;k++){g.save();g.globalAlpha=.1+R()*.14;g.fillStyle=fx;g.beginPath();g.arc(R()*W,70+R()*(H-80),1.5+R()*3.5,0,Math.PI*2);g.fill();g.restore()}
 if(th.decal==='spore')for(let k=0;k<8;k++)blob(R()*W,70+R()*(H-80),20+R()*30,'rgba(150,180,80,A)',.12);
 if(th.decal==='nectar')for(let k=0;k<26;k++){const x=R()*W,y=70+R()*(H-80),r=4+R()*5,a=R()*Math.PI;g.save();g.globalAlpha=.14+R()*.12;g.fillStyle=fx;g.translate(x,y);g.rotate(a);g.beginPath();g.ellipse(0,0,r,r*.45,0,0,Math.PI*2);g.fill();g.restore()}
 if(th.decal==='dream')for(let k=0;k<40;k++){const x=R()*W,y=70+R()*(H-80);g.save();g.globalAlpha=.1+R()*.15;g.strokeStyle=fx;g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x+6+R()*10,y-6-R()*10);g.stroke();g.restore()}
 if(th.decal==='rune')for(let k=0;k<2;k++){
  const x=160+R()*(W-320),y=140+R()*(H-240),r=34+R()*20;
  g.save();g.globalAlpha=.1;g.strokeStyle='#c8d0ff';g.lineWidth=1.5;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke();g.beginPath();g.arc(x,y,r*.62,0,Math.PI*2);g.stroke();
  for(let a=0;a<8;a++){const t=a*Math.PI/4;g.beginPath();g.moveTo(x+Math.cos(t)*r*.62,y+Math.sin(t)*r*.62);g.lineTo(x+Math.cos(t)*r,y+Math.sin(t)*r);g.stroke()}g.restore();
 }
}
const baked=new Map(),wallTop=load('./assets/dungeon.png');
function bake(i){
 const key=themeOf(i),th={...THEME[key],...(window.Game5RoomLook?.[i]||{})},im=SRC[key];
 if(!ok(im)||!ok(wallTop))return null;
 const R=rng(i*7907+131),raw=document.createElement('canvas');raw.width=W;raw.height=H;const g=raw.getContext('2d');
 g.fillStyle=th.grout;g.fillRect(0,0,W,H);
 const req=window.Game5Assets?.requested?.floorImg?.[i];
 if(req){
  // commissioned floor: tile it as delivered (random cells of the sheet), then walls go on top
  if(!ok(req))return null;
  const cols=Math.max(1,Math.round(req.naturalWidth/64)),rows=Math.max(1,Math.round(req.naturalHeight/64));
  for(let y=0;y<H;y+=64)for(let x=0;x<W;x+=64){const n=(R()*cols*rows)|0;g.drawImage(req,(n%cols)*64,((n/cols)|0)*64,64,64,x,y,64,64)}
  const out=document.createElement('canvas');out.width=W;out.height=H;const o=out.getContext('2d');o.drawImage(raw,0,0);
  window.Game5Terrain?.paintWalls?.(o,th,raw);return out;
 }
 const list=patches(key),gap=2.5;
 for(let y=60;y<H;){
  const h=40+R()*12;let x=-R()*70;
  while(x<W){const w=48+R()*44;stone(g,R,th,im,list,x+gap/2,y+gap/2,w-gap,h-gap);x+=w}
  y+=h;
 }
 decals(g,R,th);
 const out=document.createElement('canvas');out.width=W;out.height=H;const o=out.getContext('2d');
 o.filter=`contrast(${th.contrast}) saturate(${th.sat}) brightness(${th.bright})`;o.drawImage(raw,0,0);o.filter='none';
 if(window.Game5Terrain?.paintWalls?.(o,th,raw))return out;
 // back wall: the original wall-top row, tinted into the room's palette
 for(let x=-16;x<W;x+=64)o.drawImage(wallTop,3*64,0,64,64,x,0,64,72);
 o.globalAlpha=.35;o.fillStyle=th.base;o.fillRect(0,0,W,72);o.globalAlpha=1;
 const sh=o.createLinearGradient(0,66,0,96);sh.addColorStop(0,'rgba(0,0,0,.45)');sh.addColorStop(1,'rgba(0,0,0,0)');o.fillStyle=sh;o.fillRect(0,66,W,30);
 return out;
}
function get(i){
 if(!baked.has(i)){const c=bake(i);if(!c)return null;baked.set(i,c)}
 return baked.get(i);
}
/* interior walls reuse the room's own stone, darker, so they read as raised blocks of it */
function wall(i,w){
 const c=get(i);if(!c)return false;
 const sx=Math.round((w.x*1.7+240)%Math.max(1,W-w.w)),sy=Math.round(clamp(H-w.y-w.h,72,Math.max(72,H-w.h)));
 ctx.drawImage(c,sx,sy,w.w,w.h,w.x,w.y,w.w,w.h);
 // raised block: lit top face, darker front face along the bottom edge
 const face=Math.min(18,w.h*.3),cap=w.h-face;
 ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(w.x,w.y,w.w,cap);
 const g=ctx.createLinearGradient(0,w.y+cap,0,w.y+w.h);g.addColorStop(0,'rgba(0,0,0,.38)');g.addColorStop(1,'rgba(0,0,0,.58)');ctx.fillStyle=g;ctx.fillRect(w.x,w.y+cap,w.w,face);
 ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(w.x,w.y+cap-1,w.w,1.5);
 return true;
}
window.Game5Floor={version:'0.14.0',clear:()=>baked.clear(),get,wall,themeOf,themes:THEME,bake};
})();
