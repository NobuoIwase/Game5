(function(global){
'use strict';

const BASE='../character-motion-v1/';
const DIRS=['front','down_right','right','up_right','back','up_left','left','down_left'];
const ACTION_KINDS=new Set(['melee','heavy']);
const stateLocal={rig:null,gear:null,loadError:'',dirs:new Map(),segments:new Map()};

function clamp01(v){return Math.max(0,Math.min(1,v));}
function rad(d){return d*Math.PI/180;}
function smooth(t){t=clamp01(t);return t*t*(3-2*t);}
function lerp(a,b,t){return a+(b-a)*t;}
function rotateAt(ctx,p,a){
  ctx.translate(p[0],p[1]); ctx.rotate(rad(a)); ctx.translate(-p[0],-p[1]);
}
function pathPoly(ctx,poly){
  if(!poly||!poly.length)return false;
  ctx.beginPath(); ctx.moveTo(poly[0][0],poly[0][1]);
  for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i][0],poly[i][1]);
  ctx.closePath(); return true;
}
function clipHalf(poly,origin,normal,limit,keepLess){
  if(!poly||!poly.length)return [];
  const dot=p=>(p[0]-origin[0])*normal[0]+(p[1]-origin[1])*normal[1];
  const inside=p=>keepLess?dot(p)<=limit:dot(p)>=limit;
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],ia=inside(a),ib=inside(b);
    if(ia)out.push(a);
    if(ia!==ib){
      const da=dot(a)-limit,db=dot(b)-limit,den=da-db;
      const t=Math.abs(den)<1e-6?0:da/den;
      out.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t)]);
    }
  }
  return out;
}
function armSegments(view,side){
  const key=view.__dir+':'+side;
  if(stateLocal.segments.has(key))return stateLocal.segments.get(key);
  const arm=(view.arms||[]).find(a=>a.side===side);
  if(!arm||!arm.polygon?.length)return null;
  const [S,E,W]=[arm.shoulder,arm.elbow,arm.wrist];
  const n1=[E[0]-S[0],E[1]-S[1]],n2=[W[0]-E[0],W[1]-E[1]];
  const l1=Math.hypot(...n1)||1,l2=Math.hypot(...n2)||1;
  n1[0]/=l1;n1[1]/=l1;n2[0]/=l2;n2[1]/=l2;
  const bleed=9;
  let upper=clipHalf(arm.polygon,E,n1,bleed,true);
  let fore=clipHalf(arm.polygon,E,n1,-bleed,false);
  fore=clipHalf(fore,W,n2,bleed,true);
  let hand=clipHalf(arm.polygon,W,n2,-bleed,false);
  const result={arm,upper,fore,hand};
  stateLocal.segments.set(key,result);
  return result;
}

const SLASH=[
  {t:0,body:0,shoulder:0,elbow:0,wrist:0,x:0,y:0},
  {t:.12,body:-1,shoulder:-12,elbow:-6,wrist:-2,x:-1,y:0},
  {t:.28,body:-3,shoulder:-38,elbow:-22,wrist:-10,x:-3,y:1},
  {t:.42,body:-4,shoulder:-31,elbow:-34,wrist:-18,x:-3,y:1},
  {t:.55,body:2,shoulder:10,elbow:-15,wrist:7,x:2,y:0},
  {t:.66,body:7,shoulder:67,elbow:15,wrist:25,x:6,y:-1},
  {t:.77,body:9,shoulder:84,elbow:28,wrist:36,x:7,y:0},
  {t:.90,body:4,shoulder:38,elbow:10,wrist:15,x:3,y:1},
  {t:1,body:0,shoulder:0,elbow:0,wrist:0,x:0,y:0}
];

function catmull(v0,v1,v2,v3,t){
  const t2=t*t,t3=t2*t;
  return .5*((2*v1)+(-v0+v2)*t+(2*v0-5*v1+4*v2-v3)*t2+(-v0+3*v1-3*v2+v3)*t3);
}
function sampleKeys(keys,t){
  t=clamp01(t);
  let i=0;
  while(i<keys.length-2 && t>keys[i+1].t)i++;
  const a=keys[i],b=keys[Math.min(i+1,keys.length-1)];
  const p0=keys[Math.max(0,i-1)],p3=keys[Math.min(keys.length-1,i+2)];
  const u=b.t>a.t?(t-a.t)/(b.t-a.t):0;
  const out={};
  for(const k of ['body','shoulder','elbow','wrist','x','y']){
    out[k]=catmull(p0[k],a[k],b[k],p3[k],u);
  }
  return out;
}
function forwardSign(dir){
  return ['front','down_right','right','up_right'].includes(dir)?-1:1;
}
function remapImpact(p,hitP){
  hitP=Math.max(.12,Math.min(.88,hitP||.55));
  return p<=hitP ? (p/hitP)*.66 : .66+((p-hitP)/(1-hitP))*.34;
}
function actionPose(name,p,dir,hitP=.55){
  if(name==='slash'||name==='heavy'){
    const q=remapImpact(clamp01(p),hitP);
    const v=sampleKeys(SLASH,q),s=forwardSign(dir),heavy=name==='heavy'?1.18:1;
    return {
      kind:name,phase:q,body:v.body*s*.42*heavy,
      shoulder:v.shoulder*s*heavy,elbow:v.elbow*s*heavy,wrist:v.wrist*s*heavy,
      x:v.x*(s<0?1:-1)*heavy,y:v.y*heavy
    };
  }
  return {kind:name,phase:clamp01(p),body:0,shoulder:0,elbow:0,wrist:0,x:0,y:0};
}
function estellaPose(h){
  const e=h?.estella;
  const p=e?.total?clamp01(1-e.t/e.total):.5;
  const env=p<.16?smooth(p/.16):p>.82?smooth((1-p)/.18):1;
  const t=(global.state?.time||performance.now()/1000);
  return {
    kind:'estella',phase:p,body:(Math.sin(t*17)*2.2+Math.sin(t*29)*1.0)*env,
    armR:(Math.sin(t*23+.3)*8+Math.sin(t*37)*3)*env,
    armL:(Math.sin(t*19+2.1)*7+Math.sin(t*31)*3)*env,
    legR:Math.sin(t*21+1.2)*3.8*env,
    legL:Math.sin(t*18+3.2)*3.2*env,
    x:Math.sin(t*26)*1.8*env,y:Math.sin(t*33+.8)*1.3*env
  };
}
function bindPose(){
  const t=(global.state?.time||performance.now()/1000);
  return {kind:'bind',phase:0,body:Math.sin(t*5)*1.3,armR:58+Math.sin(t*9)*5,armL:-58+Math.sin(t*8+1)*5,legR:8+Math.sin(t*7)*3,legL:-8+Math.sin(t*7+2)*3,x:0,y:1};
}

function img(src){
  const im=new Image();
  im.decoding='async';
  im._ready=false; im._failed=false;
  im.onload=()=>{im._ready=true;};
  im.onerror=()=>{im._failed=true;};
  im.src=src;
  return im;
}
function ensureDir(dir){
  if(stateLocal.dirs.has(dir))return stateLocal.dirs.get(dir);
  const o={};
  for(const part of ['body','arm_right','arm_left','leg_right','leg_left','sword','shield','scabbard']){
    o[part]=img(`${BASE}parts/warrior/${dir}/${part}.png`);
  }
  stateLocal.dirs.set(dir,o);
  return o;
}
async function loadData(){
  try{
    const [r,g]=await Promise.all([
      fetch(`${BASE}rigs/warrior.json`).then(x=>{if(!x.ok)throw new Error('warrior rig '+x.status);return x.json();}),
      fetch(`${BASE}rigs/warrior-gear.json`).then(x=>{if(!x.ok)throw new Error('warrior gear '+x.status);return x.json();})
    ]);
    stateLocal.rig=r; stateLocal.gear=g;
    for(const d of DIRS)if(r.views[d])r.views[d].__dir=d;
  }catch(err){stateLocal.loadError=String(err);}
}
loadData();

function gearEntry(dir,id){
  return (stateLocal.gear?.views?.[dir]||[]).find(x=>x.id===id)||null;
}
function drawImageIf(ctx,im){
  if(im?._ready){ctx.drawImage(im,0,0);return true;}
  return false;
}
function clipDraw(ctx,im,poly){
  if(!im?._ready||!poly?.length)return;
  ctx.save(); pathPoly(ctx,poly);ctx.clip();ctx.drawImage(im,0,0);ctx.restore();
}
function drawWholeLimb(ctx,im,pivot,angle){
  if(!im?._ready)return;
  ctx.save();rotateAt(ctx,pivot,angle);ctx.drawImage(im,0,0);ctx.restore();
}
function drawWeaponArm(ctx,dir,view,images,pose){
  const seg=armSegments(view,'right');
  if(!seg||!images.arm_right?._ready)return false;
  const {arm,upper,fore,hand}=seg;
  const sword=images.sword;
  ctx.save();
  rotateAt(ctx,arm.shoulder,pose.shoulder||0);
  clipDraw(ctx,images.arm_right,upper);
  ctx.save();
  rotateAt(ctx,arm.elbow,pose.elbow||0);
  clipDraw(ctx,images.arm_right,fore);
  ctx.save();
  rotateAt(ctx,arm.wrist,pose.wrist||0);
  if(sword?._ready)ctx.drawImage(sword,0,0);
  clipDraw(ctx,images.arm_right,hand);
  ctx.restore();ctx.restore();ctx.ctx.restore();
  return true;
}
function sideIsNear(dir,side){
  const near=['front','down_right','right','up_right'].includes(dir)?'right':'left';
  return side===near;
}
function drawShieldArm(ctx,dir,view,images,angle=0){
  const a=(view.arms||[]).find(x=>x.side==='left');
  if(!a)return;
  const shield=gearEntry(dir,'shield');
  const slot=shield?.slot||'cover_arm';
  if(slot==='back')drawImageIf(ctx,images.shield);
  drawWholeLimb(ctx,images.arm_left,a.shoulder,angle);
  if(slot==='cover_arm')drawImageIf(ctx,images.shield);
}
function drawLegs(ctx,view,images,pose){
  const legs=view.legs||[];
  for(const leg of legs){
    const im=images['leg_'+leg.side];
    if(!im||im._failed)continue;
    const a=pose?.kind==='estella'?(leg.side==='right'?pose.legR:pose.legL):pose?.kind==='bind'?(leg.side==='right'?pose.legR:pose.legL):0;
    drawWholeLimb(ctx,im,leg.hip,a||0);
  }
}
function drawComposite(ctx,dir,pose,screen){
  const view=stateLocal.rig?.views?.[dir];
  if(!view)return false;
  const images=ensureDir(dir);
  if(!images.body?._ready)return false;
  const scale=screen?.scale||112/543;
  const rootScreenY=screen?.rootY ?? ((screen?.y||0)-26);
  const rootScreenX=screen?.rootX ?? (screen?.x||0);
  const left=rootScreenX-view.root[0]*scale+pose.x||0)*scale;
  const top=rootScreenY-view.root[1]*scale+(pose.y||0)*scale;

  ctx.save();
  ctx.translate(left,top);ctx.scale(scale,scale);

  drawImageIf(ctx,images.scabbard);
  drawLegs(ctx,view,images,pose);

  const weaponNear=sideIsNear(dir,'right');
  const shieldNear=sideIsNear(dir,'left');

  if(pose.kind==='slash'||pose.kind==='heavy'){
    if(!weaponNear)drawWeaponArm(ctx,dir,view,images,pose);
    if(!shieldNear)drawShieldArm(ctx,dir,view,images,-(pose.shoulder||0)*.10);
    ctx.save();rotateAt(ctx,view.root,pose.body||0);drawImageIf(ctx,images.body);ctx.restore();
    if(shieldNear)drawShieldArm(ctx,dir,view,images,-(pose.shoulder||0)*.10);
    if(weaponNear)drawWeaponArm(ctx,dir,view,images,pose);
  }else{
    const bodyRot=pose.body||0;
    const arms=view.arms||[];
    const r=arms.find(a=>a.side==='right'),l=arms.find(a=>a.side==='left');
    const ar=pose.kind==='estella'?pose.armR:pose.kind==='bind'?pose.armR:0;
    const al=pose.kind==='estella'?pose.armL:pose.kind==='bind'?pose.armL:0;
    if(r&&!weaponNear)drawWholeLimb(ctx,images.arm_right,r.shoulder,ar);
    if(l&&!shieldNear)drawShieldArm(ctx,dir,view,images,al);
    ctx.save();rotateAt(ctx,view.root,bodyRot);drawImageIf(ctx,images.body);ctx.restore();
    if(l&&shieldNear)drawShieldArm(ctx,dir,view,images,al);
    if(r&&weaponNear){
      ctx.save();rotateAt(ctx,r.shoulder,ar);drawImageIf(ctx,images.sword);drawImageIf(ctx,images.arm_right);ctx.restore();
    }
  }
  ctx.restore();
  return true;
}

function currentAction(h){
  if(h?.estella?.active)return {name:'estella',p:0,hitP:.55};
  if((h?.status?.bind||0)>0)return {name:'bind',p:0,hitP:.55};
  const a=h?._warriorMotion;
  if(a&&a.elapsed<a.total)return {name:a.name,p:clamp01(a.elapsed/a.total),hitP:a.hitAt/a.total};
  return null;
}
function drawGame(ctx,h,opts={}){
  if(!h||h.id!=='warrior')return false;
  const act=currentAction(h);if(!act)return false;
  let pose;
  if(act.name==='estella')pose=estellaPose(h);
  else if(act.name==='bind')pose=bindPose();
  else pose=actionPose(act.name,act.p,h.dir,act.hitP);
  return drawComposite(ctx,h.dir,pose,{x:h.x,y:h.y,scale:opts.scale||112/543});
}
function drawLab(ctx,dir,name,p,opts={}){
  let pose;
  const fake={estella:{active:true,t:(1-p)*2.6,total:2.6}};
  if(name==='estella')pose=estellaPose(fake);
  else if(name==='bind')pose=bindPose();
  else pose=actionPose(name,p,dir,opts.hitP||.55);
  return drawComposite(ctx,dir,pose,{rootX:opts.rootX??181,rootY:opts.rootY??314,scale:opts.scale||1});
}

function qaSlash(dir='right'){
  const steps=240,pts=[],angles=[];
  const s=forwardSign(dir);
  for(let i=0;i<=steps;i++){
    const p=i/steps,v=actionPose('slash',p,dir,.55);
    angles.push([v.shoulder,v.elbow,v.wrist]);
  }
  let maxJointDelta=0,peakIndex=0,peak=0;
  for(let i=1;i<angles.length;i++){
    const d=Math.max(...angles[i].map((x,j)=>Math.abs(x-angles[i-1][j])));
    maxJointDelta=Math.max(maxJointDelta,d);
    const speed=Math.abs(angles[i][0]-angles[i-1][0])+Math.abs(angles[i][1]-angles[i-1][1])*.55+Math.abs(angles[i][2]-angles[i-1][2])*.3;
    if(speed>peak){peak=speed;peakIndex=i;}
  }
  return {
    direction:dir,
    samples:steps+1,
    maxJointDeltaDegPerSample:+maxJointDelta.toFixed(3),
    peakMotionProgress:+(peakIndex/steps).toFixed(3),
    targetImpactProgress:.55,
    smooth:maxJointDelta<2.8,
    impactConcentrated:Math.abs(peakIndex/steps-.55)<.14
  };
}
function debugState(){
  return {dataReady:!!stateLocal.rig,loadError:stateLocal.loadError,qa:qaSlash('right')};
}

/* Integrate action timing with the existing autonomous battle without replacing its AI. */
if(typeof global.startHeroSkill==='function'){
  const baseStart=global.startHeroSkill;
  global.startHeroSkill=function(slot,reason=''){
    const h=global.activeHero?.(),sk=h?.skills?.[slot];
    const ok=baseStart(slot,reason);
    if(ok&&h?.id==='warrior'&&sk&&ACTION_KINDS.has(sk.kind)){
      const recovery=sk.kind==='heavy'?.34:.20;
      h._warriorMotion={name:sk.kind==='heavy'?'heavy':'slash',elapsed:0,total:sk.cast+recovery,hitAt:sk.cast};
    }
    return ok;
  };
}
if(typeof global.updateHero==='function'){
  const baseUpdate=global.updateHero;
  global.updateHero=function(h,dt){
    baseUpdate(h,dt);
    if(h?._warriorMotion){
      h._warriorMotion.elapsed+=dt;
      if(h._warriorMotion.elapsed>=h._warriorMotion.total)h._warriorMotion=null;
    }
  };
}

global.WarriorMotion={DIRS,actionPose,drawGame,drawLab,qaSlash,debugState,ready:()=>!!stateLocal.rig,error:()=>stateLocal.loadError};
})(window);
