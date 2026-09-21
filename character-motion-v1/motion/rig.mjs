/** Reusable articulated gait. Screen pixels: origin top left, x right, y down.
 * Anatomy never changes with direction: anatomical RIGHT is world lateral < 0.
 * Front = yaw 0, right = 90. World forward +z points toward camera in front.
 * Depth positive means closer to camera. No character or texture is mirrored.
 */
import SOURCE from './source-v13.mjs';
export {SOURCE};
export const DIRECTIONS=['front','down_right','right','up_right','back','up_left','left','down_left'];
export const YAW=Object.fromEntries(DIRECTIONS.map((d,i)=>[d,i*45]));
export const CANVAS=[192,256];
export const FRAME_MS={walk:120,run:80};
export const RUN_LEAN_DEGREES=24;
const C=SOURCE.config,rad=x=>x*Math.PI/180,round=x=>+x.toFixed(5)||0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mod=(x,n)=>(x%n+n)%n;
const RUN={forward:[28,9,-19,-30,-22,-12,12,30],lift:[0,0,0,8,22,30,22,10],pitch:[-16,0,12,26,34,10,-10,-18],bob:[1,3,-1,-7],upper:[38,16,-16,-38,-38,-16,16,38],flex:[78,68,68,80,96,110,106,88]};

function ik(hip,target,l1,l2){
 let [dx,dy]=[target[0]-hip[0],target[1]-hip[1]],d=Math.hypot(dx,dy);
 const bounded=clamp(d,Math.abs(l1-l2)+.001,l1+l2-.05);
 if(d!==bounded){dx*=bounded/d;dy*=bounded/d;d=bounded;}
 const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
 return {hip:[...hip],knee:[hip[0]+a*dx/d+h*dy/d,hip[1]+a*dy/d-h*dx/d],ankle:[hip[0]+dx,hip[1]+dy]};
}
function flexAngle(a,b,c){const u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]];return Math.acos(clamp((u[0]*v[0]+u[1]*v[1])/Math.hypot(...u)/Math.hypot(...v),-1,1))*180/Math.PI;}

function create(direction,motion,frame,neutral=false){
 if(!DIRECTIONS.includes(direction))throw new Error('Unknown direction '+direction);
 if(!['walk','run'].includes(motion))throw new Error('Unknown motion '+motion);
 const f=mod(Math.floor(frame),8),run=motion==='run',yaw=YAW[direction],s=Math.sin(rad(yaw)),c=Math.cos(rad(yaw));
 const bob=neutral?0:(run?RUN.bob[f%4]:C.side.bob[f%4]);
 const hipY=neutral?C.body.hip_y:(run?184:C.body.hip_y)+bob;
 const sway=neutral?0:C.front.sway[f]*(run?1.25:1);
 const lean=neutral?0:(run?RUN_LEAN_DEGREES:C.side.lean_degrees);
 const joints={};
 const leanZ=y=>Math.tan(rad(lean))*Math.max(0,hipY-y);
 const sinLean=Math.sin(rad(lean)),cosLean=Math.cos(rad(lean));
 // Running inclines the whole upper body about the pelvis in sagittal space.
 // Preserve spine lengths, then project that one pose at every yaw. Walking
 // deliberately keeps the original v13 registration and arm coordinates.
 const torsoPoint=rise=>run&&!neutral?[hipY-rise*cosLean,rise*sinLean]:[hipY-rise,leanZ(hipY-rise)];
 const armVector=(y,z)=>run&&!neutral?[y*cosLean+z*sinLean,z*cosLean-y*sinLean]:[y,z];
 function joint(id,parent,l,y,z,meta={}){
  const depth=c*z-s*l;
  joints[id]={parent,position:[round(96+c*l+s*z+sway*c),round(y+.18*depth)],depth:round(depth),world:[round(l),round(y),round(z)],...meta};
 }
 joint('root',null,0,hipY,0);
 for(const [id,parent,rise] of [['waist','root',19.5],['thorax','waist',36.5],['neck','thorax',55.5],['head','neck',76]]){
  const [y,z]=torsoPoint(rise);joint(id,parent,0,y,z);
 }
 for(const [side,sign,offset] of [['right',-1,0],['left',1,4]]){
  const k=(f+offset)%8,l=sign*C.front.hip_half_width;
  let chain,pitch,contact,lift;
  if(neutral){
   chain=ik([0,hipY],[0,hipY+52.5],C.lengths.thigh,C.lengths.shin);pitch=0;contact=true;lift=0;
  }else if(run){
   pitch=RUN.pitch[k];contact=k<3;lift=RUN.lift[k];
   // Running contacts have a short stance. Frames 3 and 7 have no grounded foot.
   // The complete leg is solved from the ankle target, preserving limb lengths.
   chain=ik([0,hipY],[RUN.forward[k],230-lift],C.lengths.thigh,C.lengths.shin);
  }else{
   // This is the original v13 sagittal two-bone leg solution, including the
   // actual opaque pixel foot support rather than a guessed ankle baseline.
   pitch=C.gait.foot_angle[k];contact=k<=4;
   const targetY=contact?C.ground_y-SOURCE.foot.walkSupports[k]:C.gait.swing_ankle_y[k];
   chain=ik([0,hipY],[C.gait.foot_forward[k],targetY],C.lengths.thigh,C.lengths.shin);
   lift=contact?0:Math.max(0,C.ground_y-chain.ankle[1]-SOURCE.foot.walkSupports[k]);
  }
  const flex=flexAngle(chain.hip,chain.knee,chain.ankle);
  joint('hip_'+side,'root',l,chain.hip[1],chain.hip[0],{phase:k});
  joint('knee_'+side,'hip_'+side,l,chain.knee[1],chain.knee[0],{flex:round(flex)});
  joint('ankle_'+side,'knee_'+side,l,chain.ankle[1],chain.ankle[0],{contact,phase:k,foot_pitch:pitch,lift:round(lift)});
  joint('toe_'+side,'ankle_'+side,l,chain.ankle[1]+8,chain.ankle[0]+11,{contact,foot_pitch:pitch});
  const [sy,sz]=torsoPoint(41),upper=neutral?0:(run?RUN.upper[k]:C.arms.upper_angle[k]),flexArm=neutral?12:(run?RUN.flex[k]:C.arms.elbow_flex[k]);
  const lower=upper-flexArm,ez=-Math.sin(rad(upper))*C.lengths.upper_arm,ey=Math.cos(rad(upper))*C.lengths.upper_arm;
  const wz=ez-Math.sin(rad(lower))*C.lengths.forearm,wy=ey+Math.cos(rad(lower))*C.lengths.forearm;
  const [elbowY,elbowZ]=armVector(ey,ez),[wristY,wristZ]=armVector(wy,wz),[handY,handZ]=armVector(wy+5,wz);
  const sl=sign*C.front.shoulder_half_width,el=sign*(C.front.shoulder_half_width+C.front.arm_clearance.elbow),wl=sign*(C.front.shoulder_half_width+C.front.arm_clearance.wrist);
  joint('shoulder_'+side,'thorax',sl,sy,sz,{upper_angle:upper});
  joint('elbow_'+side,'shoulder_'+side,el,sy+elbowY,sz+elbowZ,{flex:flexArm});
  joint('wrist_'+side,'elbow_'+side,wl,sy+wristY,sz+wristZ);
  joint('hand_'+side,'wrist_'+side,wl,sy+handY,sz+handZ);
 }
 const contacts=['right','left'].filter(side=>joints['ankle_'+side].contact);
 return {direction,yaw,motion:neutral?'rest':motion,frame:neutral?null:f,frame_ms:FRAME_MS[motion],body_bob:bob,lean_degrees:lean,contact_sides:contacts,flight:contacts.length===0,joints};
}
export function restPose(direction){return create(direction,'walk',0,true);}
export function makePose(direction,motion='walk',frame=0){
 const p=create(direction,motion,frame),rest=restPose(direction);
 p.deltas=Object.fromEntries(Object.entries(p.joints).map(([id,j])=>[id,j.position.map((v,i)=>round(v-rest.joints[id].position[i]))]));
 return p;
}
export function makeLibrary(){
 return {schema:'anatomical-eight-direction-motion/1.0',canvas:CANVAS,origin:'top-left',ground_y:242,directions:DIRECTIONS,yaw:YAW,frames_per_cycle:8,frame_ms:FRAME_MS,anatomical_sides:{right:'negative world lateral; sword/shield sides must attach by this ID, never screen side',left:'positive world lateral'},projection:'x=96+cos(yaw)*lateral+sin(yaw)*forward+sway*cos(yaw); y=worldY+0.18*depth; depth=cos(yaw)*forward-sin(yaw)*lateral. Positive depth is nearer.',provenance:SOURCE.provenance,rest:Object.fromEntries(DIRECTIONS.map(d=>[d,restPose(d)])),motions:Object.fromEntries(['walk','run'].map(m=>[m,Object.fromEntries(DIRECTIONS.map(d=>[d,Array.from({length:8},(_,i)=>makePose(d,m,i))]))]))};
}
