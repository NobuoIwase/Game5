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
const CHARACTERS=[{id:'warrior',label:'戦士（仮）'},{id:'scout',label:'獣人スカウト（仮）'},{id:'witch',label:'魔女（仮）'},{id:'sister',label:'シスター（仮）'}];
const NEW_CHARACTERS=new Set(['witch','sister']);
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
// Use the same map for a held object's contact point and the painted forearm.
// Translating to a wrist and then applying a different angle makes attachments
// slide, even when their nominal anchor has the right coordinates.
function bonePoint(p,a,b,u,v){
 const sv=sub(b,a),dv=sub(v,u),sl=Math.hypot(...sv),dl=Math.hypot(...dv);
 if(sl<.001||dl<.001)return [...u];
 const q=rotate(sub(p,a),-Math.atan2(sv[1],sv[0]));
 return add(u,rotate([q[0]*dl/sl,q[1]],Math.atan2(dv[1],dv[0])));
}
function bodyProjection(pose){
 const lean=pose.lean_degrees*Math.PI/180,yaw=pose.yaw*Math.PI/180;
 // Sagittal lean, projected by the gait's x/z camera. Positive yaw is right:
 // points above the pelvis move RIGHT, not backward. The front view also
 // shortens in height, rather than silently losing all of its forward lean.
 return [1,0,-Math.sin(lean)*Math.sin(yaw),Math.cos(lean)-.18*Math.sin(lean)*Math.cos(yaw)];
}
function matrixPoint(m,p){return [m[0]*p[0]+m[2]*p[1],m[1]*p[0]+m[3]*p[1]];}
function rotationMatrix(angle){return [Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle)];}
// V3 running uses complete joint poses, rather than adding scaled pose deltas
// onto a standing limb. In profile the painted bone lengths remain unchanged.
function runChain(part,pose,rest,def,bodyPoint,bodyMove,carryRole=null,pinHip=false){
 const names=part.kind==='leg'?['hip','knee','ankle']:['shoulder','elbow','wrist'];
 const ids=names.map(n=>n+'_'+part.side),source=part.texturePoints||part.points;
 const yaw=pose.yaw*Math.PI/180,s=Math.sin(yaw),co=Math.cos(yaw);
 const project=(y,z)=>[s*z,y+.18*co*z];
 let start=part.kind==='leg'&&!pinHip?add(part.points[0],bodyMove):bodyPoint(part.points[0]);
 const vectors=[];
 if(part.kind==='leg'){
  for(let i=0;i<2;i++){
   const world=sub(pose.joints[ids[i+1]].world,pose.joints[ids[i]].world);
   const native=dist(source[i],source[i+1]),length=Math.hypot(...world);
   vectors.push(mul([Math.cos(yaw)*world[0]+s*world[2],world[1]+.18*(co*world[2]-s*world[0])],native/length));
  }
 }else{
  const upper=pose.joints[ids[0]].upper_angle||0,flex=pose.joints[ids[1]].flex||90;
  // Carry the shield steadily. The sword hand remains above the belt, with
  // its elbow bent and a restrained counter-swing opposite the stepping leg.
  const swing=carryRole==='shield'?.25:.48;
  const upperAngle=(upper*swing-7-pose.lean_degrees*.45)*Math.PI/180;
  const elbowFlex=(carryRole==='shield'?94:Math.max(84,Math.min(101,flex)))*Math.PI/180;
  const angles=[upperAngle,upperAngle-elbowFlex];
  for(let i=0;i<2;i++){
   const length=dist(source[i],source[i+1]),a=angles[i];
   const v=project(Math.cos(a)*length,-Math.sin(a)*length);
   // Frontal foreshortening retains a small lateral opening at the elbow;
   // hands stay on their own anatomical side, never crossing the torso.
   const lateral=(part.side==='right'?-1:1)*Math.cos(yaw)*(i===0?9:5);
   v[0]+=lateral;vectors.push(v);
  }
 }
 const elbow=add(start,vectors[0]),end=add(elbow,vectors[1]);
 const depth=((part.kind==='leg'?pose:rest).joints[ids[1]].depth+(part.kind==='leg'?pose:rest).joints[ids[2]].depth)/2;
 return {points:[start,elbow,end],source:part.points,depth,ids};
}
function localArmVector(pose,from,to){
 const a=pose.joints[from],b=pose.joints[to];
 if(pose.motion!=='run'||!a.world||!b.world)return sub(b.position,a.position);
 const [l,y,z]=sub(b.world,a.world),lean=pose.lean_degrees*Math.PI/180,yaw=pose.yaw*Math.PI/180;
 // The running rig has already rotated the arms with the thorax. Undo that
 // once before applying the same source-art projection as the torso.
 const localY=y*Math.cos(lean)-z*Math.sin(lean),localZ=y*Math.sin(lean)+z*Math.cos(lean);
 return [Math.cos(yaw)*l+Math.sin(yaw)*localZ,localY+.18*(Math.cos(yaw)*localZ-Math.sin(yaw)*l)];
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
 const triangles=part.upperMesh.map(src=>({src,dst:src.map(deform)}));
 drawTexturedTriangles(ctx,part.upper,part.upperPixels,triangles);
}
function drawTexturedTriangles(ctx,img,input,triangles,depthSorted=false,overlay=null){
 const all=triangles.flatMap(t=>t.dst);
 const pad=overlay?40:1;
 const x0=Math.floor(Math.min(...all.map(p=>p[0])))-pad,y0=Math.floor(Math.min(...all.map(p=>p[1])))-pad;
 const width=Math.ceil(Math.max(...all.map(p=>p[0])))-x0+pad+1,height=Math.ceil(Math.max(...all.map(p=>p[1])))-y0+pad+1;
 const surface=canvas(width,height),sc=surface.getContext('2d'),output=sc.createImageData(width,height),data=output.data,iw=img.width,ih=img.height;
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
   if(depthSorted&&rgba[3]<8)continue;
   const index=(y*width+x)*4;data[index+3]=rgba[3];for(let k=0;k<3;k++)data[index+k]=rgba[3]>0?rgba[k]/rgba[3]:0;
  }
 }
 sc.putImageData(output,0,0);
 if(overlay){sc.save();sc.translate(-x0,-y0);overlay(sc);sc.restore();}
 ctx.drawImage(surface,x0,y0);
 return {surface,origin:[x0,y0]};
}
// A complete leg is one connected textured surface. Every transverse ring is
// shared by its two neighbours, including the knee and ankle. Independently
// rotating two rectangular cutouts creates a gap at their edges even when the
// nominal joint centres coincide.
function runLegMesh(part,chain,bodyPoint,pose,polishFold=false,roundDepthKnee=false){
 const original=part.texturePoints||part.points,[a,knee,d]=original,[u,v,w]=chain.points;
 // The rigid greave begins above the old knee annotation. Keep the flexion
 // zone in the dark fabric above its top edge, rather than bending metal.
 const hingeY=part.runLegDef.hingeY;
 const b=[a[0]+(knee[0]-a[0])*(hingeY-a[1])/(knee[1]-a[1]),hingeY],source=[a,b,d];
 const yaw=pose.yaw*Math.PI/180,front=Math.abs(Math.cos(yaw))>.8;
 const footAngle=(pose.joints['ankle_'+part.side].foot_pitch||0)*Math.PI/180*Math.sin(yaw);
 const delta=(i)=>Math.atan2(chain.points[i+1][1]-chain.points[i][1],chain.points[i+1][0]-chain.points[i][0])-Math.atan2(source[i+1][1]-source[i][1],source[i+1][0]-source[i][0]);
 const normals=[rotate([1,0],delta(0)),rotate([1,0],delta(1)),rotate([1,0],footAngle)];
 // A calf folded into depth must not turn its painted front/back inside out.
 if(front)for(let i=0;i<2;i++)if(normals[i][0]<0)normals[i]=mul(normals[i],-1);
 const mixNormal=(n,m,t)=>{const a=Math.atan2(n[1],n[0]),b=Math.atan2(m[1],m[0]),turn=Math.atan2(Math.sin(b-a),Math.cos(b-a));return [Math.cos(a+turn*t),Math.sin(a+turn*t)];};
 const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
 // A deeply bent stocking folds into the inside of the knee instead of
 // carrying its complete standing width around the bend as a round lobe.
 // Restrict this correction to warrior cloth; the skin attachment, metal
 // greave and boot retain their dimensions and the other characters' gait.
 const foldAmount=polishFold?clamp(((pose.joints['knee_'+part.side].flex||0)-45)/85,0,1)*Math.abs(Math.sin(yaw)):0;
 const clothStart=a[1]+(b[1]-a[1])*.27,clothEnd=part.runLegDef.bendBandBottomY;
 const calfProjection=(w[1]-v[1])/dist(b,d);
 const depthRound=roundDepthKnee&&front?clamp((.4-calfProjection)/.6,0,1):0;
 let kneeRadius=0;
 if(depthRound){
  const row=clamp(Math.round(b[1]),0,part.runLegRaw.height-1),xs=[];
  for(let x=0;x<part.runLegRaw.width;x++)if(part.rawPixels[(row*part.runLegRaw.width+x)*4+3]>32)xs.push(x);
  kneeRadius=xs.length?Math.min(28,(xs.at(-1)-xs[0]+1)/2):12;
 }
 const world=chain.ids.map(id=>pose.joints[id].world);
 const depthAt=(i,t)=>{const q=add(mul(world[i],1-t),mul(world[i+1],t));return Math.cos(yaw)*q[2]-Math.sin(yaw)*q[0];};
 const at=(x,y)=>{
  let centre,sourceX,normal,z;
  if(y<=b[1]){const t=(y-a[1])/(b[1]-a[1]);centre=add(u,mul(sub(v,u),t));sourceX=a[0]+(b[0]-a[0])*t;normal=normals[0];z=depthAt(0,t);}
  else if(y<=d[1]){const t=(y-b[1])/(d[1]-b[1]);centre=add(v,mul(sub(w,v),t));sourceX=b[0]+(d[0]-b[0])*t;normal=normals[1];z=depthAt(1,t);}
  else{sourceX=d[0]+(d[0]-b[0])*(y-d[1])/(d[1]-b[1]);centre=add(w,rotate([sourceX-d[0],y-d[1]],footAngle));normal=normals[2];z=depthAt(1,1)+(y-d[1])*.08;}
  const bandTop=part.runLegDef.hingeY-32,bandBottom=part.runLegDef.bendBandBottomY;
  if(y>bandTop&&y<bandBottom){
   const t=(y-bandTop)/(bandBottom-bandTop),p0=add(v,mul(sub(u,v),(b[1]-bandTop)/(b[1]-a[1]))),p2=add(v,mul(sub(w,v),(bandBottom-b[1])/(d[1]-b[1])));
   centre=add(add(mul(p0,(1-t)*(1-t)),mul(v,2*(1-t)*t)),mul(p2,t*t));
   normal=mixNormal(normals[0],normals[1],smooth(t));
  }
  if(Math.abs(y-d[1])<12)normal=mixNormal(normals[1],normals[2],smooth((y-d[1]+12)/24));
  // Deeply folded cloth compresses around the knee; retaining its complete
  // standing width makes an angular plate outside the bent leg silhouette.
  const clothT=clamp((y-clothStart)/(clothEnd-clothStart),0,1);
  const clothCompression=1-.38*foldAmount*Math.pow(Math.sin(Math.PI*clothT),2);
  const kneeCompression=(1-.24*Math.exp(-Math.pow((y-b[1])/20,2)))*clothCompression;
  let point=add(centre,mul(normal,(x-sourceX)*kneeCompression));
  if(depthRound){
   // In a front/back recovery pose the calf goes into depth. A completely
   // flat transverse ring reads as a sawn-off leg; the same skin/cloth
   // surface wraps around the knee, with its edges receding above the centre.
   const side=clamp(Math.abs(x-sourceX)/Math.max(1,kneeRadius),0,1);
   point[1]-=kneeRadius*(1-Math.sqrt(1-side*side))*depthRound*Math.exp(-Math.pow((y-b[1])/26,2));
  }
  const fixed=bodyPoint(add([x,y],sub(part.points[0],a)));
  // Hair, a glove or a garter can hide the top of the moving texture. Bind
  // that actual visible rim to the body, rather than treating the concealed
  // anatomical hip as the only pinned point and pulling the rim away.
  const pinStart=part.occludedAboveY??a[1];
  // The bend transition and body erasure are separate: a clothed thigh may
  // need a long attachment blend without leaving a fixed strip of old leg.
  const pinSpan=part.pinSpan??(part.occludedAboveY?Math.max(12,b[1]-pinStart+Math.min(12,(d[1]-b[1])*.2)):(b[1]-a[1])*.38);
  const pin=smooth((y-pinStart)/pinSpan);
  point=add(mul(fixed,1-pin),mul(point,pin));
  return {point,z};
 };
 const [x0,y0,x1,y1]=localBounds(part.runLegRaw),xs=[],ys=[];
 for(let x=x0;x<x1+1;x+=4)xs.push(x);xs.push(x1+1);
 for(let y=y0;y<y1+1;y+=(Math.abs(y-b[1])<36?2:5))ys.push(y);
 ys.push(y1+1,...[a[1],b[1]-32,b[1],part.runLegDef.bendBandBottomY,d[1]-12,d[1],d[1]+12].filter(y=>y>y0&&y<y1));ys.sort((a,b)=>a-b);
 const triangles=[];
 for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++){
  const ring=[[xs[i],ys[j]],[xs[i+1],ys[j]],[xs[i+1],ys[j+1]],[xs[i],ys[j+1]]];
  for(const ids of [[0,1,2],[0,2,3]]){const src=ids.map(k=>ring[k]),mapped=src.map(p=>at(...p));triangles.push({src,dst:mapped.map(p=>p.point),z:mapped.reduce((s,p)=>s+p.z,0)/3});}
 }
 triangles.sort((a,b)=>a.z-b.z);
 return triangles;
}
function rigLayer(source,part,kind){
 const pts=kind==='leg'?[part.hip,part.knee,part.ankle]:[part.shoulder,part.elbow,part.wrist];
 const texturePolygon=part.texturePolygon||part.polygon;
 const raw=cut(source,texturePolygon),axis=sub(pts[2],pts[0]);
 const runLegRaw=kind==='leg'?canvas(source.width,source.height):null;
 if(runLegRaw)runLegRaw.getContext('2d').drawImage(raw,0,0);
 // Painted armor may extend above the anatomical knee. Keep the entire plate
 // on one bone instead of tearing its rim off when the lower leg folds.
 const splitPoint=part.splitPoint||pts[1],splitOverlap=part.splitOverlap??4;
 const upper=halfPlane(raw,splitPoint,axis,-1,splitOverlap),lower=halfPlane(raw,splitPoint,axis,1,splitOverlap);
 if(kind==='leg'){
  // Base-body removal erodes the polygon by two pixels. Restore a three-pixel
  // native overlap only at the pinned upper rim, not along hands or boots.
  const rimEnd=add(pts[0],mul(sub(pts[1],pts[0]),.10));
  // Occluded legs can opt out of source bleeding: expanding their top edge
  // would pick up the stationary tunic or hair that is deliberately excluded.
  const rimTexture=(part.hipRimBleed??3)>0?cutWithBleed(source,texturePolygon,part.hipRimBleed??3):raw;
  const rim=halfPlane(rimTexture,rimEnd,sub(pts[1],pts[0]),-1,0);
  upper.getContext('2d').drawImage(rim,0,0);
  runLegRaw.getContext('2d').drawImage(rim,0,0);
 }
 const footCut=kind==='leg'?add(pts[2],mul(sub(pts[1],pts[2]),.13)):null;
 return {...part,kind,raw,runLegRaw,rawPixels:runLegRaw?runLegRaw.getContext('2d').getImageData(0,0,raw.width,raw.height).data:null,upper,lower,foot:footCut?halfPlane(lower,footCut,axis,1,3):null,shin:footCut?halfPlane(lower,footCut,axis,-1,3):null,points:pts,fill:sampleColor(raw,add(pts[0],mul(sub(pts[1],pts[0]),.18))),kneeFill:sampleColor(raw,part.jointFillSample||pts[1]),upperMesh:kind==='leg'?upperLegMesh(upper):null,upperPixels:kind==='leg'?upper.getContext('2d').getImageData(0,0,upper.width,upper.height).data:null};
}
function transformChain(part,pose,rest,def,bodyMatrix,bodyMove,bodyScale,carryRole=null){
 const names=part.kind==='leg'?['hip','knee','ankle']:['shoulder','elbow','wrist'];
 const ids=names.map(n=>n+'_'+part.side),rs=ids.map(id=>rest.joints[id].position),ps=ids.map(id=>pose.joints[id].position);
 const pts=part.points;
 const factor=(dist(pts[0],pts[1])+dist(pts[1],pts[2]))/(dist(rs[0],rs[1])+dist(rs[1],rs[2]));
 let a;
 if(part.kind==='leg')a=add(pts[0],mul(sub(ps[0],rs[0]),bodyScale));
 else a=add(add(def.root,matrixPoint(bodyMatrix,sub(pts[0],def.root))),bodyMove);
 const gain=part.kind==='leg'?(pose.motion==='run'?.78:.92):carryRole?(pose.motion==='run'?(carryRole==='shield'?.24:.28):.22):.70;
 const vector=i=>{
  const source=sub(pts[i+1],pts[i]),moving=part.kind==='leg'?sub(ps[i+1],ps[i]):localArmVector(pose,ids[i],ids[i+1]);
  let result=add(source,mul(sub(moving,sub(rs[i+1],rs[i])),factor*gain));
  if(part.kind==='arm'){
   const length=Math.hypot(...result),native=Math.hypot(...source);
   if(length>.001)result=mul(result,clamp(length/native,carryRole?.82:.60,carryRole?1.03:1.15)*native/length);
   result=matrixPoint(bodyMatrix,result);
  }
  return result;
 };
 const b=add(a,vector(0)),d=add(b,vector(1));
 const restingDepth=(rest.joints[ids[1]].depth+rest.joints[ids[2]].depth)/2;
 const movingDepth=(pose.joints[ids[1]].depth+pose.joints[ids[2]].depth)/2;
 return {points:[a,b,d],source:pts,depth:carryRole?restingDepth+(movingDepth-restingDepth)*gain:movingDepth,ids};
}
function localBounds(c){const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let minX=c.width,minY=c.height,maxX=-1,maxY=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>12){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return [minX,minY,maxX,maxY];}
async function loadCharacter(id,{writeParts=true}={}){
 const reg=JSON.parse(fs.readFileSync(path.join(ROOT,'rigs',id+'.json'),'utf8'));
 const im=await loadImage(path.join(ROOT,reg.source));
 const gearReg=id==='warrior'?JSON.parse(fs.readFileSync(path.join(ROOT,'rigs/warrior-gear.json'),'utf8')):null;
 const runReg=id==='warrior'&&fs.existsSync(path.join(ROOT,'rigs/warrior-run-v3.json'))?JSON.parse(fs.readFileSync(path.join(ROOT,'rigs/warrior-run-v3.json'),'utf8')):null;
 const runAttachments=id==='warrior'?JSON.parse(fs.readFileSync(path.join(ROOT,'rigs/warrior-run-v4-attachments.json'),'utf8')):null;
 const runLegs=id==='warrior'?JSON.parse(fs.readFileSync(path.join(ROOT,'rigs/warrior-run-v4-legs.json'),'utf8')):null;
 const legMasks=id==='warrior'?JSON.parse(fs.readFileSync(path.join(ROOT,'rigs/warrior-run-v5-legs.json'),'utf8')):null;
 const polishedLegFile=path.join(ROOT,'rigs/warrior-run-v6-legs.json');
 const polishedLegs=id==='warrior'&&fs.existsSync(polishedLegFile)?JSON.parse(fs.readFileSync(polishedLegFile,'utf8')):null;
 const gearIm=gearReg?await loadImage(path.join(ROOT,gearReg.source)):null;
 const rearFile=path.join(ROOT,'art/shield-rear-v3.png');
 const rearImage=gearReg&&fs.existsSync(rearFile)?await loadImage(rearFile):null;
 let rearBounds=null;
 if(rearImage){const surface=canvas(rearImage.width,rearImage.height);surface.getContext('2d').drawImage(rearImage,0,0);rearBounds=localBounds(surface);}
 const [cw,ch]=reg.coordinates;
 const result={id,reg,views:{},sourceMaskChecks:[],polishedLegChecks:[]};
 for(const [i,dir] of DIRS.entries()){
  const source=canvas(cw,ch),s=source.getContext('2d');
  s.drawImage(im,(i%4)*im.width/4,Math.floor(i/4)*im.height/2,im.width/4,im.height/2,0,0,cw,ch);
  // Generated transparency occasionally has alpha-1 specks in empty gutters.
  const pix=s.getImageData(0,0,source.width,source.height);
  for(let n=3;n<pix.data.length;n+=4)if(pix.data[n]<9)pix.data[n]=0;
  s.putImageData(pix,0,0);
  const def=reg.views[dir],body=canvas(cw,ch),bc=body.getContext('2d');bc.drawImage(source,0,0);
  // The body removal mask covers both standing legs. A narrower texture mask
  // isolates one complete foreground leg before sharing it with the far leg.
  // Otherwise the original far toe gets duplicated together with the near one.
  const originals=(def.legs||[]).filter(p=>!p.copyFrom).map(p=>rigLayer(source,{...p,texturePolygon:legMasks?.views[dir]?.[p.side]?.sourcePoly||p.texturePolygon},'leg'));
  const legs=(def.legs||[]).map(p=>{
   if(!p.copyFrom)return originals.find(o=>o.side===p.side);
   const orig=originals.find(o=>o.side===p.copyFrom);
   if(!orig)throw Error('Missing leg for copy '+id+'/'+dir+'/'+p.copyFrom);
   const a=add(p.hip,sub(orig.points[1],orig.points[0])),b=add(a,sub(orig.points[2],orig.points[1]));
   return {...orig,...p,points:[p.hip,p.knee||a,p.ankle||b],texturePoints:orig.points};
  });
  for(const leg of legs){
   const mask=legMasks?.views[dir]?.[leg.side];if(!mask)continue;
   for(const name of ['primaryToeSample','secondaryToeSample','secondaryShinSample']){
    const point=mask[name],alpha=img=>img.getContext('2d').getImageData(...point,1,1).data[3];
    const sourceAlpha=alpha(source),partAlpha=alpha(leg.raw),runPartAlpha=alpha(leg.runLegRaw),keep=name==='primaryToeSample';
    result.sourceMaskChecks.push({direction:dir,side:leg.side,name,point,sourceAlpha,partAlpha,runPartAlpha,pass:sourceAlpha>180&&(keep?partAlpha>180&&runPartAlpha>180:partAlpha===0&&runPartAlpha===0)});
   }
  }
  const polished=polishedLegs?.views[dir];
  if(polished?.textureSource){
   const image=await loadImage(path.join(ROOT,polished.textureSource));
   if(image.width!==source.width||image.height!==source.height)throw Error('Polished leg canvas must retain native coordinates: '+polished.textureSource);
   const texture=canvas(source.width,source.height);texture.getContext('2d').drawImage(image,0,0);
   // The reconstructed thigh continues above the waist without a painted
   // closed cap. Keep that extra painting as source bleed, and expose only
   // the lower portion that joins the character at the original hip rim.
   if(Number.isFinite(polished.openHipTop))texture.getContext('2d').clearRect(0,0,texture.width,polished.openHipTop);
   const components=alphaComponents(texture),checks={direction:dir,source:polished.textureSource,components,detachedPixels:components.slice(1).filter(n=>n>12).reduce((a,b)=>a+b,0),samples:[]};
   for(const [name,wanted] of [['opaquePoints',true],['transparentPoints',false]])for(const point of polished[name]||[]){
    const alpha=texture.getContext('2d').getImageData(...point,1,1).data[3];
    checks.samples.push({point,alpha,expected:name,pass:wanted?alpha>180:alpha===0});
   }
   checks.pass=components.length>0&&components[0]>500&&checks.detachedPixels===0&&checks.samples.every(s=>s.pass);
   result.polishedLegChecks.push(checks);
   if(!checks.pass)throw Error('Polished single-leg artwork validation failed: '+JSON.stringify(checks));
   const fullPolygon=[[0,0],[source.width,0],[source.width,source.height],[0,source.height]];
   for(const leg of legs){
    const points=leg.points,texturePoints=leg.texturePoints,src=texturePoints||points;
    const replacement=rigLayer(texture,{...leg,hip:src[0],knee:src[1],ankle:src[2],polygon:fullPolygon,texturePolygon:fullPolygon},'leg');
    Object.assign(leg,replacement,{points,texturePoints});
   }
  }
  const arms=(def.arms||[]).filter(p=>!p.copyFrom).map(p=>rigLayer(source,p,'arm'));
  if(runLegs)for(const leg of legs){leg.runLegDef=runLegs.views[dir][leg.side];if(leg.runLegDef.kneePlatePolygon)leg.runKneePlate=cut(source,leg.runLegDef.kneePlatePolygon);}
  if(NEW_CHARACTERS.has(id))for(const leg of legs){
   const texture=leg.texturePoints||leg.points;
   leg.runLegDef={hingeY:leg.hingeY??texture[1][1],bendBandBottomY:leg.bendBandBottomY??Math.min(texture[2][1]-8,texture[1][1]+12)};
  }
  const extras=(def.extras||[]).map(p=>({...p,raw:cut(source,p.polygon)}));
  // Painted coat panels and long hair overlap moving thighs. Their source
  // silhouette is kept as an explicit foreground layer, never in leg textures.
  const occlusion=canvas(cw,ch),occ=occlusion.getContext('2d');
  for(const poly of def.occlusionPolygons||[])occ.drawImage(cut(source,poly),0,0);
  for(const p of [...(def.legs||[]),...(def.arms||[]),...(def.extras||[])]){
   bc.save();
   // Keep a tiny native overlap under a cloth/skin occlusion rim. The normal
   // polygon eraser has a two-pixel bleed, which would otherwise reopen the
   // seam even when both surfaces share the exact same attachment boundary.
   if(Number.isFinite(p.occludedAboveY)){bc.beginPath();bc.rect(0,p.occludedAboveY+2,cw,ch-p.occludedAboveY-2);bc.clip();}
   remove(bc,p.polygon);bc.restore();
  }
  for(const poly of def.erasePolygons||[])remove(bc,poly);
  // Thigh tops are pinned to the pelvis by a continuous mesh. A second
  // fixed thigh would create two intersecting skin boundaries when knees lift.
  // Shoulder assembly retains the original short native overlap.
  for(const p of arms){
   const end=add(p.points[0],mul(sub(p.points[1],p.points[0]),.30));
   const stub=halfPlane(p.raw,end,sub(p.points[1],p.points[0]),-1,1);bc.drawImage(stub,0,0);
  }
  if(def.bodyUnderlaySource){
   // Neutral arms can hide part of the torso. Restore that commissioned
   // underpainting only after removing the standing arms/legs, so it fills
   // their old occlusion instead of bringing the original limb back.
   const underlay=await loadImage(path.join(ROOT,def.bodyUnderlaySource));
   if(underlay.width!==source.width||underlay.height!==source.height)throw Error('Body underlay must retain native coordinates: '+def.bodyUnderlaySource);
   bc.save();bc.globalCompositeOperation='destination-over';bc.drawImage(underlay,0,0);bc.restore();
  }
  // A staff or open coat can legitimately have several visible components.
  // Preserve those authored islands for the two new character assemblies.
  if(!NEW_CHARACTERS.has(id))largestComponent(body);
  let runBody=null,runHead=null,runDef=runReg?.views[dir];
  if(runDef?.headPolygon){
   runHead=cut(body,runDef.headPolygon);
   const headMask=canvas(cw,ch),hm=headMask.getContext('2d');polygon(hm,runDef.headPolygon);hm.fill();
   for(const hole of runDef.headExcludePolygons||[]){
    for(const hc of [runHead.getContext('2d'),hm]){hc.save();hc.globalCompositeOperation='destination-out';polygon(hc,hole);hc.fill();hc.restore();}
   }
   runBody=canvas(cw,ch);const rb=runBody.getContext('2d');rb.drawImage(body,0,0);
   rb.globalCompositeOperation='destination-out';rb.drawImage(headMask,0,0);rb.globalCompositeOperation='source-over';
   if(runDef.neckOverlapPolygon)rb.drawImage(cut(body,runDef.neckOverlapPolygon),0,0);
   largestComponent(runBody);
  }
  if(id==='warrior'){
   const skinSamples={front:{right:[138,335],left:[197,337]},down_right:{right:[166,350],left:[226,354]},right:{right:[238,350],left:[238,350]},up_right:{right:[228,354],left:[170,354]},back:{right:[231,338],left:[169,338]},up_left:{right:[190,338],left:[136,338]},left:{left:[145,340],right:[145,340]},down_left:{right:[119,336],left:[168,338]}};
   for(const p of legs)p.fill=sampleColor(source,skinSamples[dir][p.side]);
  }
  const gear=[];
  if(gearIm){
   const g=canvas(cw,ch),gc=g.getContext('2d');gc.drawImage(gearIm,(i%4)*gearIm.width/4,Math.floor(i/4)*gearIm.height/2,gearIm.width/4,gearIm.height/2,0,0,cw,ch);
   for(const e of gearReg.views[dir]||[])gear.push({...e,raw:cut(g,e.polygon)});
   const scabbard=gear.find(g=>g.id==='scabbard'),binding=runAttachments?.views[dir];
   if(scabbard&&binding){
    const j=DIRS.indexOf(binding.sourceDirection),original=gearReg.views[binding.sourceDirection].find(g=>g.id==='scabbard');
    const complete=canvas(cw,ch);complete.getContext('2d').drawImage(gearIm,(j%4)*gearIm.width/4,Math.floor(j/4)*gearIm.height/2,gearIm.width/4,gearIm.height/2,0,0,cw,ch);
    scabbard.runRaw=cut(complete,original.polygon);scabbard.runAnchor=binding.sourceAnchor;scabbard.runBindAnchor=binding.bindAnchor;
   }
   if(rearImage&&['back','up_left'].includes(dir)){
    const shield=gear.find(g=>g.id==='shield'),b=localBounds(shield.raw),[sx,sy,ex,ey]=rearBounds;
    shield.runRaw=canvas(cw,ch);
    shield.runRaw.getContext('2d').drawImage(rearImage,sx,sy,ex-sx+1,ey-sy+1,b[0],b[1],b[2]-b[0]+1,b[3]-b[1]+1);
   }
   if(dir==='left'){
    const sword=gear.find(g=>g.id==='sword'),full=gearReg.views.front.find(g=>g.id==='sword');
    const front=canvas(cw,ch);front.getContext('2d').drawImage(gearIm,0,0,gearIm.width/4,gearIm.height/2,0,0,cw,ch);
    sword.runRaw=cut(front,full.polygon);sword.runSourceGrip=full.source_grip;sword.runBladeTip=full.blade_tip;
   }
  }
  const bodyScale=legs.reduce((sum,p)=>sum+(dist(p.points[0],p.points[1])+dist(p.points[1],p.points[2]))/52.5,0)/Math.max(1,legs.length);
  result.views[dir]={source,body,def,legs,arms,extras,gear,occlusion,openHipTop:polished?.openHipTop,bodyScale,bounds:localBounds(source),runBody,runHead,runDef};
  if(writeParts){
   write(path.join(ROOT,'parts',id,dir,'body.png'),body.toBuffer('image/png'));
   for(const p of [...originals,...arms])write(path.join(ROOT,'parts',id,dir,p.kind+'_'+p.side+'.png'),p.raw.toBuffer('image/png'));
   for(const p of [...extras,...gear])write(path.join(ROOT,'parts',id,dir,p.id+'.png'),p.raw.toBuffer('image/png'));
  }
 }
 if(NEW_CHARACTERS.has(id)){
  const bounds=Object.values(result.views).map(v=>v.bounds);
  result.renderScale=reg.renderScale??Math.min(.93,350/Math.max(...bounds.map(b=>b[3]-b[1]+1)),300/Math.max(...bounds.map(b=>b[2]-b[0]+1)));
 }
 if(result.sourceMaskChecks.length){
  const report={pass:result.sourceMaskChecks.every(c=>c.pass),checks:result.sourceMaskChecks,limitations:'Annotated source samples guard known far-leg contamination. Counting limbs in final frames also requires visual review.'};
  if(writeParts)write(path.join(ROOT,'exports/leg-source-validation.json'),JSON.stringify(report,null,2));
  if(!report.pass)throw Error('Single-leg texture mask validation failed: '+JSON.stringify(report.checks.filter(c=>!c.pass)));
 }
 if(result.polishedLegChecks.length&&writeParts)write(path.join(ROOT,'exports/polished-leg-validation.json'),JSON.stringify({pass:true,checks:result.polishedLegChecks,limitations:'Checks native coordinates, single-component leg silhouettes and annotated source samples; visual review is still required.'},null,2));
 return result;
}
function render(character,dir,motion,frame,withRig=false,audit=null){
 const v=character.views[dir],{def,bodyScale}=v,pose=LIB.motions[motion][dir][frame],rest=LIB.rest[dir];
 const out=canvas(W,H),c=out.getContext('2d'),scale=character.renderScale??(character.id==='warrior'?.70:.93);
 const floor=v.bounds[3],ox=W/2-def.root[0]*scale,oy=470-floor*scale;
 c.translate(ox,oy);c.scale(scale,scale);
 const runV3=motion==='run'&&character.id==='warrior'&&v.runHead;
 const smoothCharacter=NEW_CHARACTERS.has(character.id);
 const smoothLegs=character.id==='warrior'||smoothCharacter;
 const bodyMatrix=runV3||smoothCharacter?rotationMatrix(pose.lean_degrees*Math.PI/180*Math.sin(pose.yaw*Math.PI/180)):bodyProjection(pose),bodyAngle=Math.atan2(-bodyMatrix[2],bodyMatrix[3]);
 const bodyMove=mul(pose.deltas.root,bodyScale);
 const bodyPoint=p=>add(add(def.root,matrixPoint(bodyMatrix,sub(p,def.root))),bodyMove);
 const carryRole=side=>v.gear.find(g=>g.side===side&&g.attach.startsWith('wrist'))?.id;
 const transform=p=>runV3||smoothCharacter?runChain(p,pose,rest,def,bodyPoint,bodyMove,carryRole(p.side),smoothCharacter):transformChain(p,pose,rest,def,bodyMatrix,bodyMove,bodyScale,carryRole(p.side));
 const legChains=v.legs.map(p=>({p,t:transform(p)}));
 const armChains=v.arms.map(p=>({p,t:transform(p)}));
 // Profile art can hide an entire far arm. Animate its equipment behind the
 // body with an explicitly annotated invisible chain, never the near arm.
 const attachmentArms=[...armChains];
 for(const g of v.gear)if(g.hidden_arm&&!attachmentArms.some(a=>a.p.side===g.side)){
  const p={kind:'arm',side:g.side,points:g.hidden_arm};
  attachmentArms.push({p,t:transform(p),hidden:true});
 }
 if((runV3||smoothCharacter)&&pose.contact_sides.length){
  const soleY=[];
  for(const {p,t} of legChains)if(pose.contact_sides.includes(p.side)){
   const src=p.texturePoints||p.points,[x0,y0,x1,y1]=localBounds(p.foot);
   const a=(pose.joints['ankle_'+p.side].foot_pitch||0)*Math.PI/180*Math.sin(pose.yaw*Math.PI/180);
   for(const corner of [[x0,y0],[x1,y0],[x1,y1],[x0,y1]])soleY.push(add(t.points[2],rotate(sub(corner,src[2]),a))[1]);
  }
  // Register the actual sole to the same ground plane on contact frames.
  // Flight frames retain the deliberate lift from the reference gait.
  c.translate(0,(470-oy)/scale-Math.max(...soleY));
 }
 const targets={};
 for(const {p,t} of [...legChains,...attachmentArms])t.ids.forEach((id,i)=>targets[id]=t.points[i]);
 const gear=v.gear.map(g=>{
  const arm=attachmentArms.find(a=>a.p.side===g.side);
  if(!g.attach.startsWith('wrist')||!arm)return {g,arm:null,p:bodyPoint((runV3&&g.runBindAnchor)||g.bind_anchor||g.anchor),angle:runV3?Math.atan2(bodyMatrix[1],bodyMatrix[0]):bodyAngle,slot:'back'};
  const [a,b]=arm.p.points.slice(1),[u,w]=arm.t.points.slice(1),sourceVector=sub(b,a),currentVector=sub(w,u);
  const sourceAngle=Math.atan2(sourceVector[1],sourceVector[0]),currentAngle=Math.atan2(currentVector[1],currentVector[0]);
  if(g.id==='shield'){
   const n=mul([-sourceVector[1],sourceVector[0]],1/Math.max(.001,Math.hypot(...sourceVector)));
   const bind=add(add(a,mul(sourceVector,g.forearm_fraction??.5)),mul(n,g.forearm_outset??0));
   const mountPoint=runV3?add(mul(add(u,w),.5),[Math.cos(pose.yaw*Math.PI/180)*14,0]):bonePoint(bind,a,b,u,w);
   return {g,arm,bind,p:mountPoint,angle:currentAngle-sourceAngle,slot:arm.hidden?'back':g.slot||'cover_arm'};
  }
  const bind=g.bind_grip||add(b,mul(sourceVector,g.grip_fraction??.12));
  const sourceGrip=(runV3&&g.runSourceGrip)||g.source_grip||g.anchor,axis=sub((runV3&&g.runBladeTip)||g.blade_tip||add(sourceGrip,[0,150]),sourceGrip);
  const runSwordAngles={front:-125,down_right:-25,right:-40,up_right:-40,back:-55,up_left:-140,left:-140,down_left:-120};
  const sourceBladeAngle=Math.atan2(axis[1],axis[0]),carryAngle=(runV3?runSwordAngles[dir]:(g.carry_angle_degrees??90))*Math.PI/180;
  // A relaxed wrist counters forearm rotation while carrying a drawn blade.
  // Its point of contact stays exact; only the wrist angle is stabilized.
  const wristAllowance=(motion==='run'?7:5)*Math.PI/180;
  const sway=runV3?Math.sin(frame*Math.PI/4)*.045:clamp(currentAngle-sourceAngle-bodyAngle,-wristAllowance,wristAllowance);
  return {g,arm,bind,p:bonePoint(bind,a,b,u,w),angle:carryAngle-sourceBladeAngle+sway,slot:arm.hidden?'back':g.slot||'under_arm'};
 });
 function drawGear(o){
  c.save();
  if(o.g.id==='shield'&&o.arm){
   if(runV3){
    // The circular shield keeps its projected oval silhouette when the arm
    // bends in depth. A forearm's 2D foreshortening must not squash the plate.
    c.translate(...o.p);c.rotate(bodyAngle*.15+Math.sin(frame*Math.PI/4)*.025);
    const [x0,y0,x1,y1]=localBounds(o.g.runRaw||o.g.raw);c.translate(-(x0+x1)/2,-(y0+y1)/2);
    c.drawImage(o.g.runRaw||o.g.raw,0,0);c.restore();return;
   }
   // Calibrate the old shield art around its mount, then apply the exact same
   // axial scale + rotation + translation used to paint this left forearm.
   const [a,b]=o.arm.p.points.slice(1),[u,w]=o.arm.t.points.slice(1),sv=sub(b,a),dv=sub(w,u);
   c.translate(...u);c.rotate(Math.atan2(dv[1],dv[0]));c.scale(Math.hypot(...dv)/Math.hypot(...sv),1);
   c.rotate(-Math.atan2(sv[1],sv[0]));c.translate(o.bind[0]-a[0],o.bind[1]-a[1]);
   c.rotate((o.g.bind_rotation_degrees||0)*Math.PI/180);
   const mount=o.g.source_mount||o.g.anchor;c.translate(-mount[0],-mount[1]);
  }else{
   c.translate(...o.p);c.rotate(o.angle);
   const anchor=o.g.id==='sword'?((runV3&&o.g.runSourceGrip)||o.g.source_grip||o.g.anchor):((runV3&&o.g.runAnchor)||o.g.anchor);c.translate(-anchor[0],-anchor[1]);
  }
  c.drawImage((runV3&&o.g.runRaw)||o.g.raw,0,0);c.restore();
 }
 function drawExtra(e){const p=bodyPoint(e.pivot),a=bodyAngle+Math.sin(frame*Math.PI/4-.8)*(motion==='run'?.10:.055);c.save();c.translate(...p);c.rotate(a);c.translate(-e.pivot[0],-e.pivot[1]);c.drawImage(e.raw,0,0);c.restore();}
 function limb({p,t}){
  const source=p.texturePoints||p.points;
  if(smoothLegs&&p.kind==='leg'){
   const calfProjection=(t.points[2][1]-t.points[1][1])/dist(source[1],source[2]);
   const plate=p.runKneePlate&&calfProjection<.45?(sc)=>{
    // The knee cap faces the camera even when the shin folds away behind it.
    // Preserve its rounded source shape at the shared knee; the calf and foot
    // retain their actual positions and are never removed or pasted elsewhere.
    sc.translate(...t.points[1]);sc.scale(.92,.62);sc.translate(-p.runLegDef.platePivot[0],-p.runLegDef.platePivot[1]);sc.drawImage(p.runKneePlate,0,0);
   }:null;
   const raster=drawTexturedTriangles(c,p.runLegRaw,p.rawPixels,runLegMesh(p,t,bodyPoint,pose,runV3,smoothCharacter&&motion==='run'),true,plate);
   if(audit){
    const components=alphaComponents(raster.surface);
    audit.legs.push({character:character.id,motion,direction:dir,frame,side:p.side,components,detachedPixels:components.slice(1).filter(n=>n>12).reduce((a,b)=>a+b,0)});
   }
   return;
  }
  // Small concealed joint patches cover disoccluded cuts during deep flexion.
  if(p.kind==='leg'&&!runV3){
   c.save();c.fillStyle=p.fill;c.strokeStyle=p.fill;c.lineCap='round';
   const radius=clamp(dist(source[0],source[1])*.28,10,23);
   // The small concealed skin bridge stays under the pinned hip boundary.
   const hip=bodyPoint(p.points[0]);
   c.lineWidth=radius*2;c.beginPath();c.moveTo(...hip);c.lineTo(...t.points[1]);c.stroke();
   c.fillStyle=p.kneeFill;c.beginPath();c.arc(...t.points[1],radius*(p.jointFillSample?1.02:.8),0,Math.PI*2);c.fill();c.restore();
  }
  if(runV3){
   // Small joint closures sit under both textures. Never paint a skin-colored
   // capsule along an entire stocking: that caused the exposed thigh bands.
   c.save();c.fillStyle=p.kind==='leg'?p.kneeFill:sampleColor(p.raw,source[1]);
   c.beginPath();c.arc(...t.points[1],p.kind==='leg'?11:10,0,Math.PI*2);c.fill();c.restore();
  }
  if(p.kind==='leg')drawPinnedUpperLeg(c,p,t,bodyPoint);
  else drawBone(c,p.upper,source[0],source[1],t.points[0],t.points[1]);
  drawBone(c,p.lower,source[1],source[2],t.points[1],t.points[2]);
 }
 for(const e of v.extras.filter(e=>e.layer==='back'))drawExtra(e);
 for(const g of gear.filter(g=>g.slot==='back'))drawGear(g);
 function armWithGear(a){
  for(const g of gear.filter(g=>g.arm===a&&g.slot==='under_arm'))drawGear(g);
  limb(a);
  for(const g of gear.filter(g=>g.arm===a&&g.slot==='cover_arm'))drawGear(g);
 }
 for(const l of legChains.filter(l=>l.t.depth<=0).sort((a,b)=>a.t.depth-b.t.depth))limb(l);
 const coverOpenHip=character.id==='warrior'&&Number.isFinite(v.openHipTop);
 if(coverOpenHip)for(const l of legChains.filter(l=>l.t.depth>0).sort((a,b)=>a.t.depth-b.t.depth))limb(l);
 for(const a of armChains.filter(a=>a.t.depth<0))armWithGear(a);
 c.save();c.translate(...add(def.root,bodyMove));c.transform(...bodyMatrix,0,0);c.translate(-def.root[0],-def.root[1]);c.drawImage(runV3?v.runBody:v.body,0,0);c.restore();
 if(runV3){
  const pivot=v.runDef.headPivot,target=bodyPoint(pivot);
  c.save();c.translate(...target);c.rotate(Math.sin(frame*Math.PI/4)*.012);c.translate(-pivot[0],-pivot[1]);c.drawImage(v.runHead,0,0);c.restore();
 }
 if(!coverOpenHip)for(const l of legChains.filter(l=>l.t.depth>0).sort((a,b)=>a.t.depth-b.t.depth))limb(l);
 if(smoothCharacter&&def.occlusionPolygons?.length){
  c.save();c.translate(...add(def.root,bodyMove));c.transform(...bodyMatrix,0,0);c.translate(-def.root[0],-def.root[1]);c.drawImage(v.occlusion,0,0);c.restore();
 }
 for(const a of armChains.filter(a=>a.t.depth>=0))armWithGear(a);
 for(const e of v.extras.filter(e=>e.layer!=='back'))drawExtra(e);
 if(audit&&runV3){
  const item=gear.find(o=>o.g.id==='scabbard'),g=item.g;
  const at=(image,p)=>image.getContext('2d').getImageData(Math.round(p[0]),Math.round(p[1]),1,1).data[3];
  audit.scabbards.push({direction:dir,frame,sourceAlpha:at(g.runRaw,g.runAnchor),beltAlpha:at(v.runBody,g.runBindAnchor),anchorError:dist(item.p,bodyPoint(g.runBindAnchor))});
 }
 if(withRig){c.lineWidth=2;c.strokeStyle='#31d7d5';for(const {t} of [...legChains,...armChains]){c.beginPath();t.points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();for(const p of t.points){c.beginPath();c.arc(...p,3,0,Math.PI*2);c.fillStyle='#ffe494';c.fill();}}}
 return out;
}
function alphaComponents(surface){
 const w=surface.width,h=surface.height,d=surface.getContext('2d').getImageData(0,0,w,h).data,seen=new Uint8Array(w*h),sizes=[];
 for(let k=0;k<seen.length;k++)if(!seen[k]&&d[k*4+3]>16){
  const queue=[k];seen[k]=1;
  for(let n=0;n<queue.length;n++){const j=queue[n],x=j%w,y=(j/w)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,i=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&!seen[i]&&d[i*4+3]>16){seen[i]=1;queue.push(i);}}}
  sizes.push(queue.length);
 }
 return sizes.sort((a,b)=>b-a);
}
const argv=process.argv.slice(2),requested=argv.filter(x=>!x.startsWith('--'));const ids=requested.length?requested:CHARACTERS.map(c=>c.id);
for(const id of ids)if(!CHARACTERS.some(c=>c.id===id))throw Error('Unknown character '+id);
const motionArg=argv.find(x=>x.startsWith('--motion='));
const selectedMotions=motionArg?[motionArg.slice('--motion='.length)]:['walk','run'];
if(selectedMotions.some(m=>!['walk','run'].includes(m)))throw Error('Unknown motion '+selectedMotions.join(','));
if(argv.includes('--check-run-connections')){
 const character=await loadCharacter('warrior',{writeParts:false}),audit={legs:[],scabbards:[],limitations:'Checks raster connectivity and belt contact; visual shape still requires review.'};
 for(const dir of DIRS)for(let f=0;f<8;f++)render(character,dir,'run',f,false,audit);
 const failures=[...audit.legs.filter(l=>l.detachedPixels>0),...audit.scabbards.filter(s=>s.sourceAlpha<200||s.beltAlpha<200||s.anchorError>1e-6)];
 audit.pass=failures.length===0;audit.failures=failures;
 write(path.join(ROOT,'exports/run-connections.json'),JSON.stringify(audit,null,2));
 console.log(JSON.stringify({pass:audit.pass,legs:audit.legs.length,scabbards:audit.scabbards.length,failures},null,2));process.exit(audit.pass?0:1);
}
const reviewArg=argv.find(x=>x.startsWith('--review=')),dirsArg=argv.find(x=>x.startsWith('--dirs='));
if(reviewArg){
 const reviewRoot=path.resolve(ROOT,reviewArg.slice('--review='.length));
 const directions=dirsArg?dirsArg.slice('--dirs='.length).split(','):DIRS;
 for(const dir of directions)if(!DIRS.includes(dir))throw Error('Unknown review direction '+dir);
 for(const id of ids){
  const char=await loadCharacter(id,{writeParts:false});
  for(const motion of selectedMotions){
   const overview=canvas(192*8,282*directions.length),oc=overview.getContext('2d');
   oc.fillStyle='#28343d';oc.fillRect(0,0,overview.width,overview.height);
   for(const [row,dir] of directions.entries()){
    const strip=canvas(256*8,365),sc=strip.getContext('2d');sc.fillStyle='#28343d';sc.fillRect(0,0,strip.width,strip.height);
    for(let f=0;f<8;f++){
     const im=render(char,dir,motion,f);sc.drawImage(im,f*256,20,256,341);
     write(path.join(reviewRoot,id,motion,dir,String(f).padStart(2,'0')+'.png'),im.toBuffer('image/png'));
     sc.font='13px sans-serif';sc.fillStyle='#d3e4e6';sc.fillText(dir+' / '+motion+' / '+String(f+1),f*256+9,16);
     oc.drawImage(im,f*192,row*282+23,192,256);oc.font='12px sans-serif';oc.fillStyle='#d3e4e6';oc.fillText(dir+' / '+String(f+1),f*192+8,row*282+16);
    }
    write(path.join(reviewRoot,id+'-'+dir+'-'+motion+'.png'),strip.toBuffer('image/png'));
   }
   write(path.join(reviewRoot,id+'-'+motion+'-all-frames.png'),overview.toBuffer('image/png'));
   console.log('Reviewed',id,motion,directions.length*8,'frames in',reviewRoot);
  }
 }
 process.exit(0);
}
const report=[],connectionAudit={legs:[],scabbards:[],limitations:'Checks raster connectivity and belt contact; visual shape still requires review.'};
const additionalAudit={legs:[],scabbards:[],limitations:'Checks each deformed leg texture separately. Intended occlusion by hair or garments is applied later; visual shape and limb ownership still require review.'};
for(const id of ids){
 const char=await loadCharacter(id);
 for(const motion of selectedMotions){
  const sheet=canvas(W*8,H*8),sc=sheet.getContext('2d'),review=canvas(W*4,H*2),rc=review.getContext('2d');
  rc.fillStyle='#252d39';rc.fillRect(0,0,review.width,review.height);
  for(const [row,dir] of DIRS.entries())for(let f=0;f<8;f++){
   const im=render(char,dir,motion,f,false,id==='warrior'&&motion==='run'?connectionAudit:NEW_CHARACTERS.has(id)?additionalAudit:null);sc.drawImage(im,f*W,row*H);
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
const manifest={schema:'game5-character-motion/1.0',frame_width:W,frame_height:H,frames_per_cycle:8,directions:DIRS,direction_labels:Object.fromEntries(DIRS.map((d,i)=>[d,LABELS[i]])),characters:CHARACTERS,motions:[{id:'walk',label:'歩行',frame_ms:120},{id:'run',label:'走行',frame_ms:80}],alpha:true,origin:'top-left',feet_anchor:[192,470],sheet_layout:'8 columns of frames × 8 rows of directions',anatomical_equipment:{warrior:{sword:'right hand',shield:'left forearm',pauldron:'right shoulder (equipment-detail annotation)',scabbard:'left hip'},witch:{staff:'right hand; retained with the original torso and grip'},sister:{staff:'right hand; retained with the original torso and grip'}},art_method:'Eight independently generated views; no whole-character horizontal reflection. Symmetric hidden limb textures may be shared between anatomical legs.',rig:'motion/rig.mjs',status:'first playable prototype; visual review pending'};
manifest.revision=7;
manifest.status='prototype v7; sister costume restored toward the original design with opaque cloth';
manifest.character_revisions={warrior:{walk:6,run:6},scout:{walk:2,run:2},witch:{walk:6,run:6},sister:{walk:7,run:7}};
manifest.run_reference={file:'references/run-pose-reference.jpg',received_format:'JPEG',received_frames:1,interpretation:'Pose reference only; timing was authored as an eight-frame run, not extracted from an animated GIF.'};
write(path.join(ROOT,'exports/manifest.json'),JSON.stringify(manifest,null,2));
write(path.join(ROOT,'exports/render-report.json'),JSON.stringify({frames:ids.length*selectedMotions.length*64,issues:report},null,2));
console.log('Visual-boundary warnings:',report.length);
if(connectionAudit.legs.length){
 connectionAudit.failures=[...connectionAudit.legs.filter(l=>l.detachedPixels>0),...connectionAudit.scabbards.filter(s=>s.sourceAlpha<200||s.beltAlpha<200||s.anchorError>1e-6)];
 connectionAudit.pass=connectionAudit.failures.length===0;
 write(path.join(ROOT,'exports/run-connections.json'),JSON.stringify(connectionAudit,null,2));
 console.log('Run connection checks:',connectionAudit.pass?'PASS':'FAIL',connectionAudit.legs.length,'legs,',connectionAudit.scabbards.length,'scabbards');
 if(!connectionAudit.pass)process.exitCode=1;
}
if(additionalAudit.legs.length){
 additionalAudit.failures=additionalAudit.legs.filter(l=>l.detachedPixels>0);additionalAudit.pass=additionalAudit.failures.length===0;
 write(path.join(ROOT,'exports/additional-character-connections.json'),JSON.stringify(additionalAudit,null,2));
 for(const id of new Set(additionalAudit.legs.map(l=>l.character))){
  const file=path.join(ROOT,'exports',id,'connections.json');
  const previous=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{legs:[]};
  const legs=[...(previous.legs||[]).filter(l=>l.character===id&&!selectedMotions.includes(l.motion)),...additionalAudit.legs.filter(l=>l.character===id)];
  const failures=legs.filter(l=>l.detachedPixels>0);
  write(file,JSON.stringify({character:id,legs,pass:failures.length===0,failures,limitations:additionalAudit.limitations},null,2));
 }
 console.log('New character leg connection checks:',additionalAudit.pass?'PASS':'FAIL',additionalAudit.legs.length,'legs');
 if(!additionalAudit.pass)process.exitCode=1;
}
