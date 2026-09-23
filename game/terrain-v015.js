(()=>{
'use strict';
/* v0.15.0 terrain.
   Every run generates a new dungeon. Each floor has its own layout generator so the floors
   read differently, not just recoloured:
     1 石の前室     chambers joined by corridors, pillars in the large halls
     2 湿った回廊   a corridor maze with water channels running along it
     3 絹輪の間     concentric ring corridors around a central chamber, silk across the gaps
     4 胞子庭       organic cave with spore vents
     5 粘花苑       cave with a large central garden reached through tunnels
     6 夢鱗回廊     a true labyrinth (few loops); explored parts fade back into the dark
     7 灰冠の深室   an oval arena ringed with pillars, entered through a single tunnel
   The map is a 30px grid (32x18 on the 960x540 screen). Solid cells become the room's walls
   (merged rectangles) so every existing consumer keeps working; collision, sight lines and
   the A* grid use the cells directly for speed. Passages are at least 3 cells (90px) wide so
   the largest monsters fit. */
const CS=30,GW=Math.ceil(W/CS),GH=Math.ceil(H/CS),TOP=2;
const idx=(x,y)=>y*GW+x,inb=(x,y)=>x>=0&&y>=0&&x<GW&&y<GH;
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
const ri=(R,a,b)=>a+Math.floor(R()*(b-a+1));
const cell=v=>clamp(Math.floor(v/CS),0,1e9);

/* ---------------- grid helpers ---------------- */
function solidGrid(){const g=new Uint8Array(GW*GH).fill(1);return g}
function carveRect(g,x0,y0,w,h,v=0){for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)if(x>0&&y>=TOP&&x<GW-1&&y<GH-1)g[idx(x,y)]=v}
function carveDisc(g,cx,cy,rx,ry,v=0){for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)if(((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1)carveRect(g,x,y,1,1,v)}
function carveLine(g,x0,y0,x1,y1,w=3){
 // L-shaped corridor, w cells wide
 const o=Math.floor(w/2);
 for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)carveRect(g,x-o,y0-o,w,w);
 for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)carveRect(g,x1-o,y-o,w,w);
}
function border(g){for(let x=0;x<GW;x++){for(let y=0;y<TOP;y++)g[idx(x,y)]=1;g[idx(x,GH-1)]=1}for(let y=0;y<GH;y++){g[idx(0,y)]=1;g[idx(GW-1,y)]=1}}
function flood(g,sx,sy){
 const seen=new Int16Array(GW*GH).fill(-1),q=[idx(sx,sy)];seen[q[0]]=0;
 for(let h=0;h<q.length;h++){const c=q[h],x=c%GW,y=(c/GW)|0;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;const n=idx(nx,ny);if(seen[n]<0&&g[n]!==1){seen[n]=seen[c]+1;q.push(n)}}}
 return seen;
}
/* distance (in cells) from each floor cell to the nearest solid cell */
function clearance(g){
 const d=new Float32Array(GW*GH).fill(99);
 for(let i=0;i<GW*GH;i++)if(g[i]===1)d[i]=0;
 for(let pass=0;pass<2;pass++)for(let k=0;k<GW*GH;k++){
  const i=pass?GW*GH-1-k:k,x=i%GW,y=(i/GW)|0;if(d[i]===0)continue;
  for(const [dx,dy,c] of [[-1,0,1],[0,-1,1],[-1,-1,1.41],[1,-1,1.41],[1,0,1],[0,1,1],[1,1,1.41],[-1,1,1.41]]){const nx=x+dx,ny=y+dy;if(inb(nx,ny))d[i]=Math.min(d[i],d[idx(nx,ny)]+c)}
 }
 return d;
}
/* widen: any floor passage narrower than 3 cells is opened up */
function widen(g){const o=g.slice();for(let y=TOP;y<GH-1;y++)for(let x=1;x<GW-1;x++)if(o[idx(x,y)]!==1)for(const [dx,dy] of [[1,0],[0,1],[1,1]])carveRect(g,x+dx,y+dy,1,1,g[idx(x+dx,y+dy)]===1?0:g[idx(x+dx,y+dy)]);}
function keepLargest(g){
 let best=null,bestN=0;const seenAll=new Uint8Array(GW*GH);
 for(let i=0;i<GW*GH;i++){if(g[i]===1||seenAll[i])continue;const s=flood(g,i%GW,(i/GW)|0);let n=0;for(let k=0;k<s.length;k++)if(s[k]>=0){n++;seenAll[k]=1}if(n>bestN){bestN=n;best=s}}
 if(best)for(let i=0;i<GW*GH;i++)if(best[i]<0)g[i]=1;
}

/* passable = a monster up to ~30px radius can stand here (clearance >= 1.5 cells).
   Floor that only touches through a one-cell diagonal gap is not really connected: join every
   sizable passable region to the largest one with a 3-wide corridor. */
const PASS=1.5;
function components(g,cl){
 const comp=new Int16Array(GW*GH).fill(-1),list=[];
 for(let i=0;i<GW*GH;i++){
  if(comp[i]>=0||g[i]===1||cl[i]<PASS)continue;
  const id=list.length,q=[i];comp[i]=id;
  for(let h=0;h<q.length;h++){const c=q[h],x=c%GW,y=(c/GW)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;const n=idx(nx,ny);if(comp[n]<0&&g[n]!==1&&cl[n]>=PASS){comp[n]=id;q.push(n)}}}
  list.push(q);
 }
 return{comp,list};
}
function connect(g){
 for(let k=0;k<8;k++){
  const cl=clearance(g),{list}=components(g,cl);
  if(list.length<=1)return;
  list.sort((a,b)=>b.length-a.length);
  const main=list[0];
  for(const other of list.slice(1)){
   if(other.length<4)continue;
   let best=null;
   for(let a=0;a<main.length;a+=2)for(let b=0;b<other.length;b+=2){const ax=main[a]%GW,ay=(main[a]/GW)|0,bx=other[b]%GW,by=(other[b]/GW)|0,d=Math.abs(ax-bx)+Math.abs(ay-by);if(!best||d<best.d)best={ax,ay,bx,by,d}}
   if(best)carveLine(g,best.ax,best.ay,best.bx,best.by,3);
  }
 }
}

/* ---------------- generators ---------------- */
function genChambers(R){
 const g=solidGrid(),rooms=[];
 for(let t=0;t<60&&rooms.length<5;t++){
  const w=ri(R,6,10),h=ri(R,4,6),x=ri(R,1,GW-1-w),y=ri(R,TOP,GH-1-h);
  if(rooms.some(r=>x<r.x+r.w+1&&x+w+1>r.x&&y<r.y+r.h+1&&y+h+1>r.y))continue;
  rooms.push({x,y,w,h});
 }
 rooms.sort((a,b)=>a.x-b.x);
 for(const r of rooms)carveRect(g,r.x,r.y,r.w,r.h);
 for(let i=1;i<rooms.length;i++){const a=rooms[i-1],b=rooms[i];carveLine(g,a.x+(a.w>>1),a.y+(a.h>>1),b.x+(b.w>>1),b.y+(b.h>>1),3)}
 if(rooms.length>3){const a=rooms[0],b=rooms[rooms.length-1];carveLine(g,a.x+(a.w>>1),a.y+(a.h>>1),b.x+(b.w>>1),b.y+(b.h>>1),3)}
 for(const r of rooms)if(r.w>=9&&r.h>=6){g[idx(r.x+2,r.y+1)]=1;g[idx(r.x+r.w-3,r.y+1)]=1;g[idx(r.x+2,r.y+r.h-2)]=1;g[idx(r.x+r.w-3,r.y+r.h-2)]=1}
 return{g};
}
/* maze on a coarse grid of 5x5 cells: 3-wide corridors, 2-thick walls */
function genMaze(R,loops){
 const g=solidGrid(),P=5,CW=6,CH=3,ox=1,oy=TOP;
 const vis=new Uint8Array(CW*CH),st=[[0,ri(R,0,CH-1)]];vis[st[0][1]*CW]=1;
 const open=(cx,cy)=>carveRect(g,ox+cx*P,oy+cy*P,3,3);
 open(...st[0]);
 while(st.length){
  const [cx,cy]=st[st.length-1],nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[cx+dx,cy+dy,dx,dy]).filter(([x,y])=>x>=0&&y>=0&&x<CW&&y<CH&&!vis[y*CW+x]);
  if(!nb.length){st.pop();continue}
  const [nx,ny,dx,dy]=nb[(R()*nb.length)|0];vis[ny*CW+nx]=1;open(nx,ny);
  carveRect(g,ox+Math.min(cx,nx)*P+(dx?3:0),oy+Math.min(cy,ny)*P+(dy?3:0),dx?2:3,dy?2:3);
  st.push([nx,ny]);
 }
 // extra openings turn the tree into loops so fights are not always cornered
 for(let k=0;k<loops;k++){const cx=ri(R,0,CW-2),cy=ri(R,0,CH-1);if(R()<.5)carveRect(g,ox+cx*P+3,oy+cy*P,2,3);else if(cy<CH-1)carveRect(g,ox+cx*P,oy+cy*P+3,3,2)}
 // a couple of wider halls to fight in
 for(let k=0;k<2;k++){const cx=ri(R,0,CW-2),cy=ri(R,0,CH-2);carveRect(g,ox+cx*P,oy+cy*P,8,8)}
 return{g};
}
function genRings(R){
 const g=solidGrid(),cx=GW/2,cy=(GH-1+TOP)/2,e=(x,y)=>Math.hypot((x+.5-cx)/2.2,y+.5-cy);
 for(let y=TOP;y<GH-1;y++)for(let x=1;x<GW-1;x++){const d=e(x,y);if(d<1.8||(d>=3&&d<4.8)||d>=6)g[idx(x,y)]=0}
 const spokes=[];
 for(const [r0,r1] of [[1.5,3.6],[4.4,6.6]]){
  const a=R()*TAU;spokes.push(a);
  for(let t=r0;t<=r1;t+=.3){const x=Math.round(cx-.5+Math.cos(a)*t*2.2),y=Math.round(cy-.5+Math.sin(a)*t);carveRect(g,x-1,y-1,3,3)}
  const b=a+Math.PI+(R()-.5);for(let t=r0;t<=r1;t+=.3){const x=Math.round(cx-.5+Math.cos(b)*t*2.2),y=Math.round(cy-.5+Math.sin(b)*t);carveRect(g,x-1,y-1,3,3)}
 }
 return{g,rings:{cx:cx*CS,cy:cy*CS}};
}
function genCave(R,fill,clearing){
 let g=solidGrid();
 for(let y=TOP;y<GH-1;y++)for(let x=1;x<GW-1;x++)g[idx(x,y)]=R()<fill?1:0;
 if(clearing)carveDisc(g,GW/2,(GH+TOP)/2,clearing[0],clearing[1]);
 for(let s=0;s<4;s++){const o=g.slice();for(let y=TOP;y<GH-1;y++)for(let x=1;x<GW-1;x++){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(o[idx(x+dx,y+dy)]===1)n++;g[idx(x,y)]=n>=5?1:0}}
 if(clearing)carveDisc(g,GW/2,(GH+TOP)/2,clearing[0]*.8,clearing[1]*.8);
 border(g);widen(g);border(g);keepLargest(g);
 return{g};
}
function genArena(R){
 const g=solidGrid(),cx=GW/2+3,cy=(GH+TOP)/2;
 carveDisc(g,cx,cy,11.5,6.8);
 carveRect(g,1,Math.floor(cy)-1,Math.floor(cx-10),3);
 const pillars=[];for(let k=0;k<6;k++){const a=k/6*TAU+R()*.3,x=Math.round(cx-1+Math.cos(a)*7.2),y=Math.round(cy-1+Math.sin(a)*3.8);carveRect(g,x,y,2,2,1);pillars.push([x,y])}
 return{g};
}
const GEN=[
 {gen:R=>genChambers(R),style:'block',label:'広間と通路'},
 {gen:R=>genMaze(R,6),style:'block',label:'水路の走る回廊',water:true},
 {gen:R=>genRings(R),style:'block',label:'同心円の回廊',silk:true},
 {gen:R=>genCave(R,.44),style:'cave',label:'胞子の洞窟',vents:true},
 {gen:R=>genCave(R,.48,[7,4]),style:'cave',label:'花苑の洞窟'},
 {gen:R=>genMaze(R,1),style:'block',label:'迷宮',dream:true},
 {gen:R=>genArena(R),style:'cave',label:'柱の円形闘技場'}
];

/* ---------------- placement ---------------- */
function toRects(g){
 const rects=[],used=new Uint8Array(GW*GH);
 for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
  if(g[idx(x,y)]!==1||used[idx(x,y)])continue;
  let w=0;while(x+w<GW&&g[idx(x+w,y)]===1&&!used[idx(x+w,y)])w++;
  let h=1;outer:for(;y+h<GH;h++){for(let k=0;k<w;k++)if(g[idx(x+k,y+h)]!==1||used[idx(x+k,y+h)])break outer}
  for(let yy=y;yy<y+h;yy++)for(let k=0;k<w;k++)used[idx(x+k,yy)]=1;
  rects.push({x:x*CS,y:y*CS,w:w*CS,h:h*CS});
 }
 return rects;
}
const center=i=>[(i%GW)*CS+CS/2,((i/GW)|0)*CS+CS/2];
function place(room,T,R,def){
 const g=T.g,cl=clearance(g);
 // entry: open floor on the left third with room to stand
 let entry=-1;for(let x=1;x<GW&&entry<0;x++){const c=[];for(let y=TOP;y<GH-1;y++){const i=idx(x,y);if(g[i]!==1&&cl[i]>=1.9)c.push(i)}if(c.length)entry=c[(R()*c.length)|0]}
 const pass=g.map((v,i)=>v===1||cl[i]<PASS?1:0),dist=flood(pass,entry%GW,(entry/GW)|0);let far=0;for(let i=0;i<GW*GH;i++)far=Math.max(far,dist[i]);
 const pick=(minD,maxD,minCl,avoid=[],sep=0)=>{const c=[];for(let i=0;i<GW*GH;i++){if(g[i]===1||dist[i]<minD*far||dist[i]>maxD*far||cl[i]<minCl)continue;const [x,y]=center(i);if(avoid.some(p=>Math.hypot(p[0]-x,p[1]-y)<sep))continue;c.push(i)}return c.length?center(c[(R()*c.length)|0]):null};
 const e=center(entry),exit=pick(.8,1,1.9)||pick(.5,1,1.4);
 const spawn=pick(.45,.85,2.4,[exit],150)||pick(.35,1,1.9,[exit],90)||exit;
 const spawnPts=[];for(let k=0;k<3;k++){const p=pick(.3,1,1.9,[e,exit,spawn,...spawnPts],110);if(p)spawnPts.push([p[0]-spawn[0],p[1]-spawn[1]])}
 room.entry=e;room.exit=exit;room.spawn=spawn;room.spawnPts=spawnPts.map(([dx,dy])=>[spawn[0]+dx,spawn[1]+dy]);
 // environmental fields keep their kind and strength, but sit in the open middle of the map
 const zones=[];
 for(const z of room._zones0||room.zones||[]){
  const p=pick(.25,.9,2.2,[e,exit,...zones.map(q=>[q.x,q.y])],180)||pick(.1,1,1.5,[e],120);
  if(!p)continue;const c=cl[idx(cell(p[0]),cell(p[1]))];zones.push({...z,x:p[0],y:p[1],r:Math.min(z.r,Math.max(55,c*CS*1.15))});
 }
 room._zones0||=room.zones;room.zones=zones;
 // water channels / vents / decor anchors
 const water=new Uint8Array(GW*GH);
 if(def.water)for(let i=0;i<GW*GH;i++){const [x,y]=center(i);if(g[i]!==1&&cl[i]>=1.4&&cl[i]<2.2&&((i%GW)+((i/GW)|0))%5<2&&Math.hypot(x-e[0],y-e[1])>90&&Math.hypot(x-exit[0],y-exit[1])>70)water[i]=1}
 const torches=[];for(let i=GW;i<GW*GH-GW;i++)if(g[i]===1&&g[i+GW]!==1&&R()<.09&&torches.length<6)torches.push(center(i));
 const rubble=[];for(let k=0;k<3;k++){const p=pick(0,1,1.2,[e,exit,spawn],60);if(p)rubble.push(p)}
 const crystal=pick(.2,.8,1.4,[e,exit,spawn],120);
 const vents=[];if(def.vents)for(let k=0;k<3;k++){const p=pick(.15,.95,1.4,[e,exit,...vents.map(v=>[v.x,v.y])],150);if(p)vents.push({x:p[0],y:p[1],t:1+k*1.3})}
 return{grid:g,cl,water,torches,rubble,crystal,entry:e,exit,dist,vents};
}

/* ---------------- public state ---------------- */
let floors=[],seed=0;
const cur=()=>floors[state.dungeon?.room??-1];
function generate(rooms){
 seed=(Math.random()*1e9)>>>0;floors=[];
 rooms.forEach((room,i)=>{
  const def=GEN[i]||GEN[0];let T,info;
  for(let tries=0;tries<12;tries++){
   const R=rng(seed+i*7919+tries*104729);T=def.gen(R);border(T.g);connect(T.g);border(T.g);
   info=place(room,T,R,def);
   const d=info.dist[idx(cell(info.exit[0]),cell(info.exit[1]))];
   if(d>12)break;
  }
  room.walls=toRects(info.grid);room.layout=def.label;
  floors[i]={...info,def,rings:T.rings,explored:new Float32Array(GW*GH),seed};
 });
 window.Game5Floor?.clear?.();window.Game5FX?.clearLayouts?.();window.Game5AI?.clearGrid?.();
}
const solid=(x,y)=>{const f=cur();if(!f)return false;const cx=Math.floor(x/CS),cy=Math.floor(y/CS);return !inb(cx,cy)||f.grid[idx(cx,cy)]===1};
function blocked(x,y,r){
 const f=cur();if(!f)return null;
 if(x<r||y<r||x>W-r||y>H-r)return true;
 for(let cy=Math.floor((y-r)/CS);cy<=Math.floor((y+r)/CS);cy++)for(let cx=Math.floor((x-r)/CS);cx<=Math.floor((x+r)/CS);cx++){
  if(!inb(cx,cy)||f.grid[idx(cx,cy)]!==1)continue;
  const nx=clamp(x,cx*CS,cx*CS+CS),ny=clamp(y,cy*CS,cy*CS+CS);if(Math.hypot(x-nx,y-ny)<r)return true;
 }
 return false;
}
function resolve(a){
 const f=cur();if(!f)return false;const r=a.r||20;
 // buried inside rock (knock-backs, dashes): step out to the nearest open cell first
 const ci=cell(a.x),cj=cell(a.y);
 if(!inb(ci,cj)||f.grid[idx(ci,cj)]===1){
  let best=null;
  for(let rad=1;rad<8&&!best;rad++)for(let y=cj-rad;y<=cj+rad;y++)for(let x=ci-rad;x<=ci+rad;x++){
   if(!inb(x,y)||f.grid[idx(x,y)]===1)continue;const d=Math.hypot(x-ci,y-cj);if(!best||d<best.d)best={x,y,d};
  }
  if(best){a.x=best.x*CS+CS/2;a.y=best.y*CS+CS/2}
 }
 for(let pass=0;pass<2;pass++){
  const x0=Math.floor((a.x-r)/CS),x1=Math.floor((a.x+r)/CS),y0=Math.floor((a.y-r)/CS),y1=Math.floor((a.y+r)/CS);
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){
   if(inb(cx,cy)&&f.grid[idx(cx,cy)]!==1)continue;
   const nx=clamp(a.x,cx*CS,cx*CS+CS),ny=clamp(a.y,cy*CS,cy*CS+CS),dx=a.x-nx,dy=a.y-ny,d=Math.hypot(dx,dy);
   if(d>=r||d<1e-3)continue;
   a.x=nx+dx/d*r;a.y=ny+dy/d*r;
  }
 }
 return true;
}
function between(a,b){
 const f=cur();if(!f)return null;const l=Math.hypot(b.x-a.x,b.y-a.y),n=Math.ceil(l/8);
 for(let i=1;i<n;i++){const t=i/n;if(solid(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return true}
 return false;
}

/* ---------------- exploration memory (fog of war) ---------------- */
let exT=0;
function explore(dt){
 const f=cur(),h=state.hero;if(!f||!h)return;
 exT-=dt;if(exT>0)return;exT=.15;
 const hx=h.x,hy=h.y-10,ex=f.explored,now=state.time;
 for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
  const px=x*CS+CS/2,py=y*CS+CS/2,d=Math.hypot(px-hx,py-hy);
  if(d>h.visionRange+30)continue;
  const near=d<95,inView=inCone(px,py,hx,hy,h.facing,h.visionRange+30,h.visionHalf+.25);
  if(!near&&!inView)continue;
  if(!between({x:hx,y:hy},{x:px+Math.sign(hx-px)*CS*.45,y:py+Math.sign(hy-py)*CS*.45}))ex[idx(x,y)]=now+1;
 }
}
/* lighting hook: unexplored cells are near-black, and on the dream floor memory fades */
const fogC=document.createElement('canvas');fogC.width=GW;fogC.height=GH;const fogG=fogC.getContext('2d');
function fog(l){
 const f=cur();if(!f||!state.started)return;
 const ex=f.explored,now=state.time,fade=f.def.dream?9:1e9;
 fogG.clearRect(0,0,GW,GH);
 for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
  const t=ex[idx(x,y)],k=!t?.66:clamp((now-t)/fade,0,1)*.56;if(k<=.01)continue;
  fogG.fillStyle=`rgba(0,0,0,${k})`;fogG.fillRect(x,y,1,1);
 }
 l.save();l.imageSmoothingEnabled=true;l.imageSmoothingQuality='high';l.drawImage(fogC,0,0,GW*CS,GH*CS);l.restore();
}

/* ---------------- baked walls (called by floor-v014 when the floor is baked) ----------------
   The wall mass is built as a mask: square cells for built floors; for caves, jittered discs
   that are blurred and re-thresholded so the rock edge is smooth rather than scalloped.
   Walls get their own dark rock texture (not the floor stone), a lit rim on the upper edge,
   a tall front face and a soft contact shadow, so the maze reads at a glance. */
const ROCK={moss:'#3b3930',wet:'#243040',slate:'#2c3246',moon:'#2f2947'};
function canvas(){const c=document.createElement('canvas');c.width=W;c.height=H;return c}
function mask(f,R){
 const m=canvas(),g=m.getContext('2d'),cave=f.def.style==='cave';g.fillStyle='#fff';
 for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
  if(f.grid[idx(x,y)]!==1)continue;
  if(cave){g.beginPath();g.arc(x*CS+CS/2+(R()-.5)*8,y*CS+CS/2+(R()-.5)*8,CS*.82,0,TAU);g.fill()}
  else g.fillRect(x*CS,y*CS,CS,CS);
 }
 if(!cave)return m;
 const b=canvas(),bg=b.getContext('2d');bg.filter='blur(7px)';bg.drawImage(m,0,0);bg.filter='none';
 try{
  const img=bg.getImageData(0,0,W,H),d=img.data;
  for(let i=3;i<d.length;i+=4){const a=d[i];d[i]=a>118?255:a>96?(a-96)*11:0;d[i-3]=d[i-2]=d[i-1]=255}
  bg.putImageData(img,0,0);
 }catch(_){return m}
 return b;
}
function tinted(m,col){const c=canvas(),g=c.getContext('2d');g.drawImage(m,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,W,H);return c}
function rock(R,col,built){
 const c=canvas(),g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,W,H);
 for(const [n,a] of [[24,.28],[96,.16],[320,.1]]){
  const s=document.createElement('canvas');s.width=n;s.height=Math.ceil(n*H/W);const sg=s.getContext('2d');
  for(let y=0;y<s.height;y++)for(let x=0;x<n;x++){const v=R();sg.fillStyle=v<.5?`rgba(0,0,0,${(.5-v)*2})`:`rgba(255,255,255,${(v-.5)*1.4})`;sg.fillRect(x,y,1,1)}
  g.globalAlpha=a;g.imageSmoothingEnabled=true;g.drawImage(s,0,0,W,H);
 }
 g.globalAlpha=1;
 if(built){g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.5;for(let y=0,row=0;y<H;y+=CS,row++){g.beginPath();g.moveTo(0,y+.5);g.lineTo(W,y+.5);g.stroke();for(let x=(row%2)*CS;x<W;x+=CS*2){g.beginPath();g.moveTo(x+.5,y);g.lineTo(x+.5,y+CS);g.stroke()}}
  g.strokeStyle='rgba(255,255,255,.05)';for(let y=1,row=0;y<H;y+=CS,row++){g.beginPath();g.moveTo(0,y+.5);g.lineTo(W,y+.5);g.stroke()}}
 return c;
}
function paintWalls(o,th,raw){
 const f=cur();if(!f)return false;
 const R=rng(f.seed+(state.dungeon?.room||0)*31),cave=f.def.style==='cave',key=window.Game5Floor?.themeOf?.(state.dungeon?.room||0)||'moss';
 const m=mask(f,R),face=cave?18:22;
 // water channels on the floor first
 for(let i=0;i<GW*GH;i++)if(f.water[i]){const x=(i%GW)*CS,y=((i/GW)|0)*CS;o.fillStyle='rgba(40,80,120,.38)';o.fillRect(x,y,CS,CS);o.fillStyle='rgba(160,200,240,.08)';o.fillRect(x,y+4,CS,2)}
 // contact shadow on the floor, then the front face hanging below the top edge
 o.save();o.filter='blur(10px)';o.globalAlpha=.75;o.drawImage(tinted(m,'#000'),0,face*.9);o.restore();
 const fc=canvas(),fg=fc.getContext('2d');fg.drawImage(m,0,face);fg.globalCompositeOperation='source-in';
 const grad=fg.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#15161c');grad.addColorStop(1,'#0e0f14');fg.fillStyle=grad;fg.fillRect(0,0,W,H);
 fg.globalCompositeOperation='source-atop';fg.globalAlpha=.35;fg.drawImage(rock(R,'#20222b',false),0,0);
 o.drawImage(fc,0,0);
 // top face: dark rock (built floors show large masonry courses)
 const edge=tinted(m,'rgba(0,0,0,.7)');for(const [dx,dy] of [[-2,0],[2,0],[0,-2]])o.drawImage(edge,dx,dy);
 const top=rock(R,ROCK[key]||'#2c3040',!cave),tg=top.getContext('2d');tg.fillStyle='rgba(0,0,0,.22)';tg.fillRect(0,0,W,H);tg.globalCompositeOperation='destination-in';tg.drawImage(m,0,0);
 o.drawImage(top,0,0);
 // lit rim along the upper edges, a darker lip along the lower edges
 const rim=tinted(m,'rgba(220,228,245,.7)'),rg=rim.getContext('2d');rg.globalCompositeOperation='destination-out';rg.drawImage(m,0,3);
 o.drawImage(rim,0,0);
 const lip=tinted(m,'rgba(0,0,0,.6)'),lg=lip.getContext('2d');lg.globalCompositeOperation='destination-out';lg.drawImage(m,0,-3);
 o.drawImage(lip,0,0);
 // silk strands across the ring gaps
 if(f.def.silk&&f.rings){o.save();o.strokeStyle='rgba(240,236,255,.28)';o.lineWidth=1;for(let k=0;k<26;k++){const a=R()*TAU,r0=(2.8+R()*4.5)*CS,cx=f.rings.cx,cy=f.rings.cy;o.beginPath();o.moveTo(cx+Math.cos(a)*r0*1.9,cy+Math.sin(a)*r0);o.quadraticCurveTo(cx+Math.cos(a+.2)*(r0+20)*1.9,cy+Math.sin(a+.2)*(r0+20),cx+Math.cos(a+.35)*(r0+8)*1.9,cy+Math.sin(a+.35)*(r0+8));o.stroke()}o.restore()}
 return true;
}
function active(){return !!cur()}

/* water: footsteps ripple and slow her a little */
let rippleT=0;
function stepWater(dt){
 const f=cur(),h=state.hero;if(!f||!h||!f.def.water)return;
 const i=idx(cell(h.x),cell(h.y+14));if(!f.water[i])return;
 if(h.moving){h.x-=(h._vx||0)*dt*.25;h.y-=(h._vy||0)*dt*.25;rippleT-=dt;if(rippleT<=0){rippleT=.35;window.Game5Assets?.spawn?.('mire_ripple',h.x,h.y+18,54,.5,{rot:0,alpha:.6})}}
}
/* spore vents (胞子庭): a puff every few seconds; standing close raises Lumane and Sail */
function stepVents(dt){
 const f=cur(),h=state.hero;if(!f?.vents?.length||!h)return;
 for(const v of f.vents){
  v.t-=dt;if(v.t>0)continue;v.t=3.8+Math.random()*1.5;v.puff=1;
  window.Game5Assets?.spawn?.('curse_cloud',v.x,v.y-12,110,1.1,{grow:.6,add:false,alpha:.55});
  if(!h.dead&&Math.hypot(h.x-v.x,h.y-v.y)<80){applyTiered(h,'lumane',6,{source:'胞子の噴出'});applySail(h,3);addFx('text',h.x,h.y-60,'胞子','#c8f09a',.8)}
 }
}
let hooked=false;
function hookDraw(){
 const G=window.Game5Graphics;if(hooked||!G?.drawHazardsUnder)return;hooked=true;
 const under=G.drawHazardsUnder;
 G.drawHazardsUnder=function(){
  const f=cur();
  for(const v of f?.vents||[]){
   ctx.save();ctx.fillStyle='#1c2216';ctx.beginPath();ctx.ellipse(v.x,v.y,17,9,0,0,TAU);ctx.fill();
   ctx.strokeStyle='#7fa05a';ctx.lineWidth=2;ctx.stroke();
   const p=v.t<.8?1-v.t/.8:0;ctx.fillStyle=`rgba(190,240,140,${.25+.5*p})`;ctx.beginPath();ctx.ellipse(v.x,v.y,10,5,0,0,TAU);ctx.fill();
   ctx.globalAlpha=.25;ctx.strokeStyle='#b8e890';ctx.setLineDash([3,6]);ctx.beginPath();ctx.arc(v.x,v.y,80,0,TAU);ctx.stroke();ctx.restore();
  }
  under();
 };
}
const bUpdate=update;
update=function(dt){bUpdate(dt);hookDraw();if(state.started&&!state.over){explore(dt);stepWater(dt);stepVents(dt)}};

window.Game5Terrain={version:'0.15.0',CS,GW,GH,generate,active,blocked,resolve,between,solid,fog,paintWalls,current:cur,defs:GEN};
})();
