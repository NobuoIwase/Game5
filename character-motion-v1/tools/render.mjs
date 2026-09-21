/** Articulated cut-out renderer. No complete sprite or direction is reflected. */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
let cv;
try{cv=require('@napi-rs/canvas');}catch{
 const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'C:/Users/migig/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
 cv=require(path.join(runtime,'@napi-rs/canvas'));
}
const {createCanvas,loadImage}=cv;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const LIB=JSON.parse(fs.readFileSync(path.join(ROOT,'motion/poses.json'),'utf8'));
const W=384,H=512,DIRS=LIB.directions;
const LABELS=['正面','右斜め前','右','右斜め後ろ','後ろ','左斜め後ろ','左','左斜め前'];
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,k)=>a.map(x=>x*k);
const dist=(a,b)=>Math.hypot(...sub(a,b));
const rotate=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function canvas(w,h){return createCanvas(Math.ceil(w),Math.ceil(h));}
function write(p,b){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);}
function polygon(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}
function cut(source,poly){const out=canvas(source.width,source.height),c=out.getContext('2d');if(poly?.length){polygon(c,poly);c.clip();c.drawImage(source,0,0);}return out;}
function cutWithBleed(source,poly,bleed){
 const out=canvas(source.width,source.height),c=out.getContext('2d');
 if(poly?.length){polygon(c,poly);c.fill();c.lineWidth=bleed*2;c.lineJoin='round';c.stroke();c.globalCompositeOperation='source-in';c.drawImage(source,0,0);}
 return out;
}
function remove(c,poly){if(!poly?.length)return;c.save();c.globalCompositeOperation='destination-out';polygon(c,poly);c.fill();c.lineWidth=4;c.lineJoin='round';c.stroke();c.restore();}
function largestComponent(surface){
 const ctx=surface.getContext('2d'),p=ctx.getImageData(0,0,surface.width,surface.height),d=p.data,w=surface.width,h=surface.height,seen=new Uint8Array(w*h);let largest=[];
 for(let k=0;k<seen.length;k++)if(!seen[k]&&d[k*4+3]>8){const q=[k];seen[k]=1;for(let n=0;n<q.length;n++){const v=q[n],x=v%w,y=(v/w)|0;for(const u of [x>0?v-1:-1,x<w-1?v+1:-1,y>0?v-w:-1,y<h-1?v+w:-1])if(u>=0&&!seen[u]&&d[u*4+3]>8){seen[u]=1;q.push(u);}}if(q.length>largest.length)largest=q;}
 const keep=new Uint8Array(w*h);for(const k of largest)keep[k]=1;for(let k=0;k<keep.length;k++)if(!keep[k])d[k*4+3]=0;ctx.putImageData(p,0,0);
}
function sampleColor(img,point){
 const ctx=img.getContext('2d');
 for(const radius of [2,6,12,24,36]){
  const x=Math.max(0,Math.round(point[0])-radius),y=Math.max(0,Math.round(point[1])-radius);
  const d=ctx.getImageData(x,y,Math.min(radius*2+1,img.width-x),Math.min(radius*2+1,img.height-y)).data,sum=[0,0,0];let n=0;
  for(let k=0;k<d.length;k+=4)if(d[k+3]>220){for(let j=0;j<3;j++)sum[j]+=d[k+j];n++;}
  if(n>2)return 'rgb('+sum.map(v=>Math.round(v/n)).join(',')+')';
 }
 return '#6a5d5a';
}
function halfPlane(source,origin,normal,sign,overlap=3){
 const out=canvas(source.width,source.height),c=out.getContext('2d');
 const n=mul(normal,sign/Math.hypot(...normal)),t=[-n[1],n[0]],p=add(origin,mul(n,-overlap)),L=3000;
 polygon(c,[add(p,mul(t,L)),add(add(p,mul(t,L)),mul(n,L)),add(add(p,mul(t,-L)),mul(n,L)),add(p,mul(t,-L))]);
 c.clip();c.drawImage(source,0,0);return out;
}
function drawBone(c,img,a,b,u,v){
 const sv=sub(b,a),dv=sub(v,u),sl=Math.hypot(...sv),dl=Math.hypot(...dv);
 if(sl<.01||dl<.01)return;
 c.save();c.translate(...u);c.rotate(Math.atan2(dv[1],dv[0]));c.scale(dl/sl,1);
 c.rotate(-Math.atan2(sv[1],sv[0]));c.translate(-a[0],-a[1]);c.drawImage(img,0,0);c.restore();
}
function upperLegMesh(img){
 const [x0,y0,x1,y1]=localBounds(img),triangles=[],step=10;
 for(let y=y0;y<y1;y+=step)for(let x=x0;x<x1;x+=step){
  const a=[x,y],b=[Math.min(x+step,x1+1),y],d=[x,Math.min(y+step,y1+1)],e=[b[0],d[1]];
  triangles.push([a,b,e],[a,e,d]);
 }
 return triangles;
}
function drawPinnedUpperLeg(ctx,part,chain,bodyPoint){
 const src=part.texturePoints||part.points,[a,b]=src,[u,v]=chain.points,sv=sub(b,a),dv=sub(v,u),sl=dist(a,b),dl=dist(u,v);
 const sn=[-sv[1]/sl,sv[0]/sl],dn=[-dv[1]/Math.max(.001,dl),dv[0]/Math.max(.001,dl)];
 const fixedOffset=sub(part.points[0],a);
 const deform=p=>{
  const q=sub(p,a),t=(q[0]*sv[0]+q[1]*sv[1])/(sl*sl),lateral=q[0]*sn[0]+q[1]*sn[1];
  const rigid=add(add(u,mul(dv,t)),mul(dn,lateral)),fixed=bodyPoint(add(p,fixedOffset));
  const blend=clamp(t/.58,0,1),weight=blend*blend*(3-2*blend);
  return add(mul(fixed,1-weight),mul(rigid,weight));
 };
 const triangles=part.upperMesh.map(src=>({src,dst:src.map(deform)})),all=triangles.flatMap(t=>t.dst);
 const x0=Math.floor(Math.min(...all.map(p=>p[0])))-1,y0=Math.floor(Math.min(...all.map(p=>p[1])))-1;
 const width=Math.ceil(Math.max(...all.map(p=>p[0])))-x0+2,height=Math.ceil(Math.max(...all.map(p=>p[1])))-y0+2;
 const surface=canvas(width,height),sc=surface.getContext('2d'),output=sc.createImageData(width,height),data=output.data,input=part.upperPixels,iw=part.upper.width,ih=part.upper.height;
 // One write per destination pixel preserves semitransparent source stockings.
 // Canvas-clipped triangles would repeatedly composite their shared edges.
 for(const {src,dst} of triangles){
  const [s0,s1,s2]=src,[d0,d1,d2]=dst,ax=d1[0]-d0[0],ay=d1[1]-d0[1],bx=d2[0]-d0[0],by=d2[1]-d0[1],det=ax*by-ay*bx;
  if(Math.abs(det)<.00001)continue;
  const minX=Math.max(0,Math.floor(Math.min(...dst.map(p=>p[0])))-x0),maxX=Math.min(width-1,Math.ceil(Math.max(...dst.map(p=>p[0])))-x0);
  const minY=Math.max(0,Math.floor(Math.min(...dst.map(p=>p[1])))-y0),maxY=Math.min(height-1,Math.ceil(Math.max(...dst.map(p=>p[1])))-y0);
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const dx=x+x0+.5-d0[0],dy=y+y0+.5-d0[1],u=(dx*by-dy*bx)/det,v=(ax*dy-ay*dx)/det;
   if(u<-.000001||v<-.000001||u+v>1.000001)continue;
   const sx=s0[0]+u*(s1[0]-s0[0])+v*(s2[0]-s0[0])-.5,sy=s0[1]+u*(s1[1]-s0[1])+v*(s2[1]-s0[1])-.5;
   const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,rgba=[0,0,0,0];
   for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){
    const px=ix+xx,py=iy+yy;if(px<0||py<0||px>=iw||py>=ih)continue;
    const index=(py*iw+px)*4,weight=(xx?fx:1-fx)*(yy?fy:1-fy),alpha=input[index+3]*weight;
    rgba[3]+=alpha;for(let k=0;k<3;k++)rgba[k]+=input[index+k]*alpha;
   }
   const index=(y*width+x)*4;data[index+3]=rgba[3];for(let k=0;k<3;k++)data[index+k]=rgba[3]>0?rgba[k]/rgba[3]:0;
  }
 }
 sc.putImageData(output,0,0);ctx.drawImage(surface,x0,y0);
}
function rigLayer(source,part,kind){
 const pts=kind==='leg'?[part.hip,part.knee,part.ankle]:[part.shoulder,part.elbow,part.wrist];
 const raw=cut(source,part.polygon),axis=sub(pts[2],pts[0]);
 const upper=halfPlane(raw,pts[1],axis,-1,4),lower=halfPlane(raw,pts[1],axis,1,4);
 if(kind==='leg'){
  // Base-body removal erodes the polygon by two pixels. Restore a three-pixel
  // native overlap only at the pinned upper rim, not along hands or boots.
  const rimEnd=add(pts[0],mul(sub(pts[1],pts[0]),.10));
  const rim=halfPlane(cutWithBleed(source,part.polygon,3),rimEnd,sub(pts[1],pts[0]),-1,0);
  upper.getContext('2d').drawImage(rim,0,0);
 }
 return {...part,kind,raw,upper,lower,points:pts,fill:sampleColor(raw,add(pts[0],mul(sub(pts[1],pts[0]),.18))),kneeFill:sampleColor(raw,pts[1]),upperMesh:kind==='leg'?upperLegMesh(upper):null,upperPixels:kind==='leg'?upper.getContext('2d').getImageData(0,0,upper.width,upper.height).data:null};
}
function transformChain(part,pose,rest,def,bodyAngle,bodyMove,bodyScale){
 const names=part.kind==='leg'?['hip','knee','ankle']:['shoulder','elbow','wrist'];
 const ids=names.map(n=>n+'_'+part.side),rs=ids.map(id=>rest.joints[id].position),ps=ids.map(id=>pose.joints[id].position);
 const pts=part.points;
 const factor=(dist(pts[0],pts[1])+dist(pts[1],pts[2]))/(dist(rs[0],rs[1])+dist(rs[1],rs[2]));
 let a;
 if(part.kind==='leg')a=add(pts[0],mul(sub(ps[0],rs[0]),bodyScale));
 else a=add(add(def.root,rotate(sub(pts[0],def.root),bodyAngle)),bodyMove);
 const gain=part.kind==='leg'?(pose.motion==='run'?.78:.92):.70;
 const b=add(a,add(sub(pts[1],pts[0]),mul(sub(sub(ps[1],ps[0]),sub(rs[1],rs[0])),factor*gain)));
 const d=add(b,add(sub(pts[2],pts[1]),mul(sub(sub(ps[2],ps[1]),sub(rs[2],rs[1])),factor*gain)));
 return {points:[a,b,d],source:pts,depth:(pose.joints[ids[1]].depth+pose.joints[ids[2]].depth)/2,ids};
}
function localBounds(c){const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let minX=c.width,minY=c.height,maxX=-1,maxY=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>12){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return [minX,minY,maxX,maxY];}
async function loadCharacter(id){
 const reg=JSON.parse(fs.readFileSync(path.join(ROOT,'rigs',id+'.json'),'utf8'));
 const im=await loadImage(path.join(ROOT,reg.source));
 const gearReg=id==='warrior'?JSON.parse(fs.readFileSync(path.join(ROOT,'rigs/warrior-gear.json'),'utf8')):null;
 const gearIm=gearReg?await loadImage(path.join(ROOT,gearReg.source)):null;
 const [cw,ch]=reg.coordinates;
 const result={id,reg,views:{}};
 for(const [i,dir] of DIRS.entries()){
  const source=canvas(cw,ch),s=source.getContext('2d');
  s.drawImage(im,(i%4)*im.width/4,Math.floor(i/4)*im.height/2,im.width/4,im.height/2,0,0,cw,ch);
  // Generated transparency occasionally has alpha-1 specks in empty gutters.
  const pix=s.getImageData(0,0,source.width,source.height);
  for(let n=3;n<pix.data.length;n+=4)if(pix.data[n]<9)pix.data[n]=0;
  s.putImageData(pix,0,0);
  const def=reg.views[dir],body=canvas(cw,ch),bc=body.getContext('2d');bc.drawImage(source,0,0);
  const originals=(def.legs||[]).filter(p=>!p.copyFrom).map(p=>rigLayer(source,p,'leg'));
  const legs=(def.legs||[]).map(p=>{
   if(!p.copyFrom)return originals.find(o=>o.side===p.side);
   const orig=originals.find(o=>o.side===p.copyFrom);
   if(!orig)throw Error('Missing leg for copy '+id+'/'+dir+'/'+p.copyFrom);
   const a=add(p.hip,sub(orig.points[1],orig.points[0])),b=add(a,sub(orig.points[2],orig.points[1]));
   return {...orig,...p,points:[p.hip,p.knee||a,p.ankle||b],texturePoints:orig.points};
  });
  const arms=(def.arms||[]).filter(p=>!p.copyFrom).map(p=>rigLayer(source,p,'arm'));
  const extras=(def.extras||[]).map(p=>({...p,raw:cut(source,p.polygon)}));
  for(const p of [...(def.legs||[]),...(def.arms||[]),...(def.extras||[])])remove(bc,p.polygon);
  for(const poly of def.erasePolygons||[])remove(bc,poly);
  // Thigh tops are pinned to the pelvis by a continuous mesh. A second
  // fixed thigh would create two intersecting skin boundaries when knees lift.
  // Shoulder assembly retains the original short native overlap.
  for(const p of arms){
   const end=add(p.points[0],mul(sub(p.points[1],p.points[0]),.30));
   const stub=halfPlane(p.raw,end,sub(p.points[1],p.points[0]),-1,1);bc.drawImage(stub,0,0);
  }
  largestComponent(body);
  if(id==='warrior'){
   const skinSamples={front:{right:[154,352],left:[219,354]},down_right:{right:[166,350],left:[226,354]},right:{right:[238,350],left:[238,350]},up_right:{right:[228,354],left:[170,354]},back:{right:[231,338],left:[169,338]},up_left:{right:[190,338],left:[136,338]},left:{left:[145,340],right:[145,340]},down_left:{right:[149,340],left:[209,342]}};
   for(const p of legs)p.fill=sampleColor(source,skinSamples[dir][p.side]);
  }
  const gear=[];
  if(gearIm){
   const g=canvas(cw,ch),gc=g.getContext('2d');gc.drawImage(gearIm,(i%4)*gearIm.width/4,Math.floor(i/4)*gearIm.height/2,gearIm.width/4,gearIm.height/2,0,0,cw,ch);
   for(const e of gearReg.views[dir]||[])gear.push({...e,raw:cut(g,e.polygon)});
  }
  const bodyScale=legs.reduce((sum,p)=>sum+(dist(p.points[0],p.points[1])+dist(p.points[1],p.points[2]))/52.5,0)/Math.max(1,legs.length);
  result.views[dir]={source,body,def,legs,arms,extras,gear,bodyScale,bounds:localBounds(source)};
  write(path.join(ROOT,'parts',id,dir,'body.png'),body.toBuffer('image/png'));
  for(const p of [...originals,...arms])write(path.join(ROOT,'parts',id,dir,p.kind+'_'+p.side+'.png'),p.raw.toBuffer('image/png'));
  for(const p of [...extras,...gear])write(path.join(ROOT,'parts',id,dir,p.id+'.png'),p.raw.toBuffer('image/png'));
 }
 return result;
}
function render(character,dir,motion,frame,withRig=false){
 const v=character.views[dir],{def,bodyScale}=v,pose=LIB.motions[motion][dir][frame],rest=LIB.rest[dir];
 const out=canvas(W,H),c=out.getContext('2d'),scale=character.id==='warrior'?.70:.93;
 const floor=v.bounds[3],ox=W/2-def.root[0]*scale,oy=470-floor*scale;
 c.translate(ox,oy);c.scale(scale,scale);
 const yaw=pose.yaw*Math.PI/180,bodyAngle=-pose.lean_degrees*Math.PI/180*Math.sin(yaw)*.65;
 const bodyMove=mul(pose.deltas.root,bodyScale);
 const bodyPoint=p=>add(add(def.root,rotate(sub(p,def.root),bodyAngle)),bodyMove);
 const legChains=v.legs.map(p=>({p,t:transformChain(p,pose,rest,def,bodyAngle,bodyMove,bodyScale)}));
 const armChains=v.arms.map(p=>({p,t:transformChain(p,pose,rest,def,bodyAngle,bodyMove,bodyScale)}));
 const targets={};
 for(const {p,t} of [...legChains,...armChains])t.ids.forEach((id,i)=>targets[id]=t.points[i]);
 for(const side of ['left','right'])if(!targets['wrist_'+side]){
  const g=v.gear.find(g=>g.attach==='wrist_'+side);
  targets['wrist_'+side]=g?add(g.anchor,bodyMove):bodyPoint(def.root);
 }
 const gear=v.gear.map(g=>{
  const arm=armChains.find(a=>a.p.side===g.side),p=targets[g.attach]||bodyPoint(g.anchor);
  let angle=bodyAngle;
  if(arm&&g.attach.startsWith('wrist')){
   const a=sub(arm.t.points[2],arm.t.points[1]),b=sub(arm.p.points[2],arm.p.points[1]);
   angle=Math.atan2(a[1],a[0])-Math.atan2(b[1],b[0]);
   // A carried shield and down-pointing sword are stabilized by the wrist.
   angle*=g.id==='shield'?.45:.50;
  }
  return {g,p,angle,depth:pose.joints[g.attach]?.depth??-100};
 });
 function drawGear(o){c.save();c.translate(...o.p);c.rotate(o.angle);c.translate(-o.g.anchor[0],-o.g.anchor[1]);c.drawImage(o.g.raw,0,0);c.restore();}
 function drawExtra(e){const p=bodyPoint(e.pivot),a=bodyAngle+Math.sin(frame*Math.PI/4-.8)*(motion==='run'?.10:.055);c.save();c.translate(...p);c.rotate(a);c.translate(-e.pivot[0],-e.pivot[1]);c.drawImage(e.raw,0,0);c.restore();}
 function limb({p,t}){
  const source=p.texturePoints||p.points;
  // Small concealed joint patches cover disoccluded cuts during deep flexion.
  if(p.kind==='leg'){
   c.save();c.fillStyle=p.fill;c.strokeStyle=p.fill;c.lineCap='round';
   const radius=clamp(dist(source[0],source[1])*.28,10,23);
   // The small concealed skin bridge stays under the pinned hip boundary.
   const hip=bodyPoint(p.points[0]);
   c.lineWidth=radius*2;c.beginPath();c.moveTo(...hip);c.lineTo(...t.points[1]);c.stroke();
   c.fillStyle=p.kneeFill;c.beginPath();c.arc(...t.points[1],radius*.8,0,Math.PI*2);c.fill();c.restore();
  }
  if(p.kind==='leg')drawPinnedUpperLeg(c,p,t,bodyPoint);
  else drawBone(c,p.upper,source[0],source[1],t.points[0],t.points[1]);
  drawBone(c,p.lower,source[1],source[2],t.points[1],t.points[2]);
 }
 for(const e of v.extras.filter(e=>e.layer==='back'))drawExtra(e);
 for(const g of gear.filter(g=>g.g.layer==='back'||g.depth<-.3).sort((a,b)=>a.depth-b.depth))drawGear(g);
 for(const l of legChains.filter(l=>l.t.depth<=0).sort((a,b)=>a.t.depth-b.t.depth))limb(l);
 for(const a of armChains.filter(a=>a.t.depth<0))limb(a);
 c.save();c.translate(...add(def.root,bodyMove));c.rotate(bodyAngle);c.translate(-def.root[0],-def.root[1]);c.drawImage(v.body,0,0);c.restore();
 for(const l of legChains.filter(l=>l.t.depth>0).sort((a,b)=>a.t.depth-b.t.depth))limb(l);
 for(const a of armChains.filter(a=>a.t.depth>=0))limb(a);
 for(const g of gear.filter(g=>g.g.layer!=='back'&&g.depth>=-.3).sort((a,b)=>a.depth-b.depth))drawGear(g);
 for(const e of v.extras.filter(e=>e.layer!=='back'))drawExtra(e);
 if(withRig){c.lineWidth=2;c.strokeStyle='#31d7d5';for(const {t} of [...legChains,...armChains]){c.beginPath();t.points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();for(const p of t.points){c.beginPath();c.arc(...p,3,0,Math.PI*2);c.fillStyle='#ffe494';c.fill();}}}
 return out;
}
const requested=process.argv.slice(2).filter(x=>!x.startsWith('--'));const ids=requested.length?requested:['warrior','scout'];
const report=[];
for(const id of ids){
 const char=await loadCharacter(id);
 for(const motion of ['walk','run']){
  const sheet=canvas(W*8,H*8),sc=sheet.getContext('2d'),review=canvas(W*4,H*2),rc=review.getContext('2d');
  rc.fillStyle='#252d39';rc.fillRect(0,0,review.width,review.height);
  for(const [row,dir] of DIRS.entries())for(let f=0;f<8;f++){
   const im=render(char,dir,motion,f);sc.drawImage(im,f*W,row*H);
   const bounds=localBounds(im);if(bounds[0]<=0||bounds[1]<=0||bounds[2]>=W-1||bounds[3]>=H-1)report.push({id,motion,dir,frame:f,issue:'edge-clipping',bounds});
   write(path.join(ROOT,'exports',id,motion,dir,String(f).padStart(2,'0')+'.png'),im.toBuffer('image/png'));
   if(f===2){rc.drawImage(im,(row%4)*W,Math.floor(row/4)*H);rc.font='17px sans-serif';rc.fillStyle='#b8c8d8';rc.fillText(dir.toUpperCase().replaceAll('_',' '),(row%4)*W+15,Math.floor(row/4)*H+27);}
  }
  write(path.join(ROOT,'exports',id,motion+'.png'),sheet.toBuffer('image/png'));
  write(path.join(ROOT,'exports',id,motion+'-overview.png'),review.toBuffer('image/png'));
  console.log('Rendered',id,motion,DIRS.length*8,'frames');
 }
 const debug=canvas(W*4,H*2),dc=debug.getContext('2d');dc.fillStyle='#252d39';dc.fillRect(0,0,debug.width,debug.height);
 DIRS.forEach((dir,i)=>dc.drawImage(render(char,dir,'walk',2,true),(i%4)*W,Math.floor(i/4)*H));
 write(path.join(ROOT,'exports',id,'joints-review.png'),debug.toBuffer('image/png'));
}
const manifest={schema:'game5-character-motion/1.0',frame_width:W,frame_height:H,frames_per_cycle:8,directions:DIRS,direction_labels:Object.fromEntries(DIRS.map((d,i)=>[d,LABELS[i]])),characters:[{id:'warrior',label:'戦士（仮）'},{id:'scout',label:'獣人スカウト（仮）'}],motions:[{id:'walk',label:'歩行',frame_ms:120},{id:'run',label:'走行',frame_ms:80}],alpha:true,origin:'top-left',feet_anchor:[192,470],sheet_layout:'8 columns of frames × 8 rows of directions',anatomical_equipment:{warrior:{sword:'right hand',shield:'left forearm',pauldron:'right shoulder (equipment-detail annotation)',scabbard:'left hip'}},art_method:'Eight independently generated views; no whole-character horizontal reflection. Symmetric hidden limb textures may be shared between anatomical legs.',rig:'motion/rig.mjs',status:'first playable prototype; visual review pending'};
write(path.join(ROOT,'exports/manifest.json'),JSON.stringify(manifest,null,2));
write(path.join(ROOT,'exports/render-report.json'),JSON.stringify({frames:ids.length*128,issues:report},null,2));
console.log('Visual-boundary warnings:',report.length);
