/** Full-body attack motions on the same skeleton and projection as rig.mjs / poses.json.
 *
 * The in-game cut-out rig can only turn whole parts about fixed pivots, so its swings read as
 * "standing still and moving an arm". These are reference poses for drawing new sprite frames
 * (or for a future rig with knees and a twisting trunk): the hips turn first, the shoulders
 * follow, the weight moves onto the stepping foot, the knees give at the cut, and the blade is
 * carried through and held before she recovers.
 *
 * World: [lateral, y (screen, down is +), forward]. Anatomical RIGHT is lateral < 0 (sword hand).
 * Projection is exactly the one in rig.mjs:
 *   x = 96 + cos(yaw)*lateral + sin(yaw)*forward,  depth = cos(yaw)*forward - sin(yaw)*lateral,
 *   y = worldY + 0.18*depth   (192x256 canvas, ground_y 242; the game sheets are 2x = 384x512)
 * Frames are IN PLACE: the game itself moves her during the step-in (see ATTACK_MOTION_REQUEST.md).
 */
export const DIRECTIONS=['front','down_right','right','up_right','back','up_left','left','down_left'];
export const YAW=Object.fromEntries(DIRECTIONS.map((d,i)=>[d,i*45]));
const rad=d=>d*Math.PI/180,r5=x=>+x.toFixed(3)||0;
const L={thigh:26,shin:28,upper:22.4,fore:17.2,hand:5,sword:54,neckToHead:20.5};
const lerp=(a,b,t)=>a+(b-a)*t;

/* ---- key poses (v3: bolder, aimed in the world, arms that extend and a wrist that snaps).
   Trunk: pelvis/torso yaw in degrees, + turns the RIGHT (sword) side back; pitch + leans forward;
   hipY is the height of the hip joints (screen y, larger = lower).
   The rest is in WORLD coordinates [lateral, y, forward] (she faces +forward; her right is
   lateral < 0; y down is +):
   foot [lateral, forward, lift, toe-out yaw]
   armR / armL {d:[direction from the shoulder], e: extension 0..1 (1 = elbow straight)}
   wrist  the blade's angle to the sword forearm, about the lateral axis of the cut, in degrees:
          + the blade is held back (cocked: up when the arm points forward, behind her when the
          arm points up), 0 in one line with the forearm, - snapped on past it
   shieldN  the way the face of the shield looks
   smear: the blade moves fast enough for a smear on this frame */
const GUARD={rootZ:-12,hipY:188,pelvis:30,torso:5,pitch:6,footL:[9,6,0,0],footR:[-10,-26,0,50],armR:{d:[-.3,.55,.78],e:.8},tip:-26,armL:{d:[.1,.3,.95],e:.55},shieldN:[0,0,1]};
/* v4: the feet stay where they stand. rootZ is how far the hips have travelled forward (the
   step is IN the frames). The rear (right) foot never leaves its spot during the cut; the lead
   (left) foot flies forward and, from the moment it lands, is nailed to that spot while the body
   rides forward over it. Feet are in world coordinates, not relative to the hips. */
export const MOTIONS={
 slash:{label:'通常斬り（踏み込み振り下ろし）',loop:false,hitFrame:6,keys:[
  {...GUARD,ms:100,phase:'構え guard: lead (shield) foot forward, wide stance, knees soft, blade up'},
  {rootZ:-14,hipY:191,pelvis:40,torso:10,pitch:0,footL:[9,6,0,0],footR:[-10,-26,0,50],armR:{d:[-.25,-.6,.76],e:.75},tip:-88,armL:{d:[.1,.25,.96],e:.7},shieldN:[0,0,1],ms:70,phase:'振り上げ raise: sink onto the rear foot, the blade goes up in front of the face'},
  {rootZ:-12,hipY:188,pelvis:55,torso:20,pitch:-8,footL:[9,8,5,0,1],footR:[-10,-26,0,50],armR:{d:[-.15,-.95,-.1],e:.7},tip:-150,armL:{d:[.05,.1,.99],e:.92},shieldN:[0,0,1],ms:70,phase:'振りかぶり wind-up: over the head and back, the lead foot lifts, shield thrust out'},
  {rootZ:-6,hipY:186,pelvis:58,torso:22,pitch:-10,footL:[9,16,12,0,1],footR:[-10,-26,3,50],armR:{d:[-.12,-.9,-.42],e:.72},tip:165,armL:{d:[.05,.15,.99],e:.9},shieldN:[0,0,1],ms:80,phase:'溜め cocked: wrist bent back, the blade hangs down her back; the rear foot drives her on'},
  {rootZ:2,hipY:192,pelvis:25,torso:10,pitch:8,footL:[9,24,0,0],footR:[-10,-26,5,50],armR:{d:[-.1,-.95,.2],e:.9},tip:-145,armL:{d:[.25,.35,.9],e:.75},shieldN:[.2,0,.98],ms:50,phase:'着地 lead foot lands - nailed there from now on; the arm comes over, the blade lags behind it'},
  {rootZ:7,hipY:195,pelvis:-10,torso:-12,pitch:20,footL:[9,24,0,0],footR:[-10,-26,6,50],armR:{d:[-.05,-.3,.95],e:1},tip:-58,armL:{d:[.5,.6,.6],e:.7},shieldN:[.5,0,.85],smear:true,ms:40,phase:'振り下ろし the cut (smear): hips ride forward over the planted foot, arm straight, blade catching up'},
  {rootZ:13,hipY:196,pelvis:-25,torso:-15,pitch:26,footL:[9,24,0,0],footR:[-10,-26,7,50],armR:{d:[0,.38,.93],e:1},tip:21,armL:{d:[.55,.75,.35],e:.7},shieldN:[.7,0,.7],ms:90,phase:'命中 impact (hit-stop): the wrist snaps - arm and blade one straight line; front knee deep, rear leg long'},
  {rootZ:14,hipY:197,pelvis:-32,torso:-20,pitch:30,footL:[9,24,0,0],footR:[-10,-26,7,50],armR:{d:[.12,.62,.78],e:1},tip:48,armL:{d:[.6,.75,.25],e:.7},shieldN:[.8,0,.6],smear:true,ms:80,phase:'振り抜き follow-through: elbow fully straight, the blade runs on down and through'},
  {rootZ:14,hipY:196,pelvis:-30,torso:-18,pitch:28,footL:[9,24,0,0],footR:[-10,-26,6,50],armR:{d:[.1,.58,.81],e:1},tip:44,armL:{d:[.6,.75,.25],e:.7},shieldN:[.8,0,.6],ms:130,phase:'残心 hold: arm still straight, stays low for a breath'},
  {rootZ:2,hipY:193,pelvis:0,torso:0,pitch:12,footL:[9,24,0,0],footR:[-10,-26,2,50],armR:{d:[-.3,.45,.84],e:.85},tip:-15,armL:{d:[.15,.3,.94],e:.6},shieldN:[0,0,1],ms:80,phase:'戻り push back off the front foot (still planted); the blade comes up'},
  {rootZ:-8,hipY:190,pelvis:20,torso:4,pitch:8,footL:[9,12,6,0,1],footR:[-10,-26,0,50],armR:{d:[-.3,.5,.81],e:.82},tip:-24,armL:{d:[.1,.3,.95],e:.58},shieldN:[0,0,1],ms:70,phase:'引き the lead foot comes back'},
  {...GUARD,ms:90,phase:'構え guard again'}]},
 heavy:{label:'破城斬り（跳び上がって叩きつけ）',loop:false,hitFrame:6,keys:[
  {...GUARD,ms:140,phase:'構え guard'},
  {rootZ:-16,hipY:204,pelvis:40,torso:10,pitch:18,footL:[11,6,0,0],footR:[-12,-26,0,50],armR:{d:[-.3,-.3,-.9],e:.85},tip:-125,armL:{d:[.1,.45,.89],e:.7},shieldN:[0,0,1],ms:130,phase:'溜め deep crouch over the rear foot, blade drawn up and back'},
  {rootZ:-8,hipY:172,pelvis:45,torso:20,pitch:-14,footL:[9,8,16,0,1],footR:[-10,-24,18,30],armR:{d:[-.15,-.9,-.4],e:.8},tip:-150,armL:{d:[.05,0,1],e:.9},shieldN:[0,-.3,.95],ms:80,phase:'跳躍 launch: off both feet, blade swept up and cocked'},
  {rootZ:2,hipY:160,pelvis:40,torso:18,pitch:-18,footL:[9,10,28,0],footR:[-10,-8,32,20],armR:{d:[-.1,-.97,-.2],e:.85},tip:170,armL:{d:[.05,-.05,1],e:.9},shieldN:[0,-.3,.95],ms:140,phase:'頂点 apex: hangs in the air, bowed back, blade hanging down the back'},
  {rootZ:8,hipY:174,pelvis:10,torso:4,pitch:12,footL:[9,26,16,0,1],footR:[-10,-8,20,40],armR:{d:[-.05,-.6,.8],e:1},tip:-100,armL:{d:[.3,.3,.9],e:.8},shieldN:[.4,0,.9],smear:true,ms:60,phase:'降下 dive: the arm comes over straight, the blade whipping after it'},
  {rootZ:8,hipY:198,pelvis:-15,torso:-6,pitch:28,footL:[9,28,0,0],footR:[-10,-22,6,50],armR:{d:[0,.1,1],e:1},tip:-20,armL:{d:[.5,.6,.6],e:.7},shieldN:[.7,0,.7],smear:true,ms:40,phase:'着地 lead foot lands and stays; the blade still coming'},
  {rootZ:9,hipY:200,pelvis:-25,torso:-12,pitch:36,footL:[9,28,0,0],footR:[-10,-22,5,50],armR:{d:[0,.74,.67],e:1},tip:62,armL:{d:[.6,.75,.25],e:.7},shieldN:[.8,0,.6],ms:130,phase:'叩きつけ SLAM (hit): wrist snapped, blade driven into the floor'},
  {rootZ:9,hipY:199,pelvis:-25,torso:-12,pitch:34,footL:[9,28,0,0],footR:[-10,-22,5,50],armR:{d:[0,.74,.67],e:1},tip:62,armL:{d:[.6,.75,.25],e:.7},shieldN:[.8,0,.6],ms:170,phase:'衝撃 shock: holds while the floor cracks'},
  {rootZ:0,hipY:195,pelvis:0,torso:0,pitch:16,footL:[9,28,0,0],footR:[-10,-26,2,50],armR:{d:[-.3,.45,.84],e:.85},tip:-15,armL:{d:[.15,.3,.94],e:.6},shieldN:[0,0,1],ms:90,phase:'戻り wrench the blade free, push back'},
  {rootZ:-8,hipY:190,pelvis:20,torso:4,pitch:8,footL:[9,14,6,0,1],footR:[-10,-26,0,50],armR:{d:[-.3,.5,.81],e:.82},tip:-24,armL:{d:[.1,.3,.95],e:.58},shieldN:[0,0,1],ms:80,phase:'引き the lead foot comes back'},
  {...GUARD,ms:110,phase:'構え guard'}]},
 advance:{label:'構えたまま前進',loop:true,keys:[]},
 retreat:{label:'構えたまま後退',loop:true,keys:[]}
};
/* guarded steps, drawn in place (the game moves her): a "step-drag" - the lead foot steps out
   while the planted rear foot slides back under her (0-3), then the rear foot is picked up and
   brought back to its place while the lead foot slides back (4-7). Backing off: rear foot first.
   A light bounce on each step. */
for(const [name,dir] of [['advance',1],['retreat',-1]]){
 const keys=[],S=16,Lz=18,Rz=-18;
 for(let f=0;f<8;f++){const a=f<4,u=(f%4)/4,sw=Math.sin(u*Math.PI),e=.5-.5*Math.cos(u*Math.PI);
  let zl,zr,ll=0,lr=0;
  if(dir>0){ if(a){zl=Lz+S*e;ll=9*sw;zr=Rz-S*e}else{zl=Lz+S-S*e;zr=Rz-S+S*e;lr=8*sw} }
  else     { if(a){zr=Rz-S*e;lr=9*sw;zl=Lz+S*e}else{zr=Rz-S+S*e;zl=Lz+S-S*e;ll=8*sw} }
  keys.push({...GUARD,rootZ:0,hipY:189-sw*3,pitch:dir>0?10:0,torso:dir>0?5:0,footL:[9,zl,ll,0],footR:[-10,zr,lr,50],
   armR:dir>0?{d:[-.3,.5,.81],e:.82}:{d:[-.3,.6,.74],e:.72},tip:dir>0?-30:-55,armL:dir>0?{d:[.1,.25,.96],e:.6}:{d:[.1,.3,.95],e:.5},ms:90,
   phase:(dir>0?'前進 ':'後退 ')+(a?(dir>0?'lead foot steps out':'rear foot steps back'):(dir>0?'rear foot drawn up':'lead foot drawn back'))});
 }
 MOTIONS[name].keys=keys;
}

/* ---- forward kinematics ---- */
function yawPt(l,z,a){const c=Math.cos(rad(a)),s=Math.sin(rad(a));return[l*c-z*s,l*s+z*c]}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],len=a=>Math.hypot(...a),norm=a=>mul(a,1/(len(a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function ik3(a,target,l1,l2,pole){
 let d=sub(target,a);const dl=len(d),m=Math.max(Math.abs(l1-l2)+.01,Math.min(l1+l2-.05,dl));d=mul(norm(d),m);const u=norm(d);
 const x=(l1*l1-l2*l2+m*m)/(2*m),h=Math.sqrt(Math.max(0,l1*l1-x*x));let p=sub(pole,mul(u,dot(pole,u)));p=norm(p);
 return{mid:add(add(a,mul(u,x)),mul(p,h)),end:add(a,d)};
}
export function pose(k){
 const J={},root=[0,k.hipY,k.rootZ||0],P=rad(k.pitch),chest=k.pelvis+k.torso;
 // a point on the trunk: [lateral, rise above the hip joints, forward], turned by yaw then leaned
 const trunk=(l,rise,z,yaw)=>{const [l1,z1]=yawPt(l,z,yaw),z2=z1*Math.cos(P)+rise*Math.sin(P),r2=rise*Math.cos(P)-z1*Math.sin(P);return[root[0]+l1,root[1]-r2,root[2]+z2]};
 J.root=root;J.waist=trunk(0,19.5,0,k.pelvis);J.thorax=trunk(0,36.5,0,chest);J.neck=trunk(0,55.5,0,chest);
 J.head=[J.neck[0],J.neck[1]-L.neckToHead,J.neck[2]+2];            // the head stays level, eyes on the target
 for(const [side,sg] of [['right',-1],['left',1]]){
  const hip=trunk(8.5*sg,0,0,k.pelvis),f=k['foot'+(side==='right'?'R':'L')],fy=rad(f[3]||0);
  const toe=[-sg*Math.sin(fy)*(side==='right'?1:-1)*0+(side==='right'?-Math.sin(fy):Math.sin(fy)),0,Math.cos(fy)];   // toes turned out to her own side
  const onToe=f[2]>0&&f[2]<=8&&!f[4],ankle=[f[0],232-(onToe?Math.min(f[2],4.5):f[2]),f[1]];   // heel up: the ankle rises only as far as the foot allows
  // knees go the way the toes point (and a little outward), never inward across the body
  const leg=ik3(hip,ankle,L.thigh,L.shin,norm(add(toe,[sg*.2,0,0])));
  J['hip_'+side]=hip;J['knee_'+side]=leg.mid;J['ankle_'+side]=leg.end;
  const lift=f[2]>2?1:0;   // a lifted foot hangs toes-down a little
  // a planted foot whose heel comes up (lift <= 8 on the ground) keeps its toes on the floor
  const ty=onToe?240:leg.end[1]+8-lift*3,tz=onToe?Math.sqrt(Math.max(0,185-(240-leg.end[1])**2)):11;
  J['toe_'+side]=[leg.end[0]+toe[0]*tz,ty,leg.end[2]+toe[2]*tz];
  const sh=trunk(12.5*sg,41,0,chest),A=k['arm'+(side==='right'?'R':'L')],hv=add(sh,mul(norm(A.d),(L.upper+L.fore-.06)*A.e));
  // elbows point out and down; the sword elbow lifts out to the side when the hand is overhead
  const over=hv[1]<sh[1]-12;const pole=side==='right'?(over?[-1,-.2,-.6]:[-1,.6,-.3]):[1,.7,-.2];
  const arm=ik3(sh,hv,L.upper,L.fore,pole);
  J['shoulder_'+side]=sh;J['elbow_'+side]=arm.mid;J['wrist_'+side]=arm.end;
  const fa=norm(sub(arm.end,arm.mid));J['hand_'+side]=add(arm.end,mul(fa,L.hand));
 }
 // the blade: the sword forearm turned about the cut's lateral axis by the wrist angle. When a
 // key gives tip (the angle of the tip seen from her right shoulder, side view: 0 = ahead,
 // -90 = straight up, 90 = straight down), the wrist angle is solved to put it there.
 const f=norm(sub(J.wrist_right,J.elbow_right)),ax=[1,0,0],axf=cross(ax,f);
 const bladeAt=w=>{let v=norm(add(add(mul(f,Math.cos(w)),mul(axf,Math.sin(w))),mul(ax,dot(ax,f)*(1-Math.cos(w)))));return norm([v[0]*.4,v[1],v[2]])};
 let w=rad(k.wrist||0);
 if(k.tip!=null){const sh=J.shoulder_right,want=rad(k.tip);let best=1e9;for(let d=-180;d<=180;d+=.5){const v=bladeAt(rad(d)),t=add(J.hand_right,mul(v,L.sword)),a=Math.atan2(t[1]-sh[1],t[2]-sh[2]),e=Math.abs(Math.atan2(Math.sin(a-want),Math.cos(a-want)));if(e<best){best=e;w=rad(d)}}Object.defineProperty(J,'_wrist',{value:+(w*180/Math.PI).toFixed(1),enumerable:false})}
 const sd=bladeAt(w);   // (the blade is kept in the plane of the cut)
 J.sword_tip=add(J.hand_right,mul(sd,L.sword));
 // the cross-guard: across the blade, flat to the swing
 const side=norm(cross(sd,[0,-1,0]).map((v,i)=>v||(i===0?1:0)));J.guard_a=add(J.hand_right,mul(side,6));J.guard_b=add(J.hand_right,mul(side,-6));
 // the shield rides on the outside of the left forearm, its face turned by shieldN
 const fm=mul(add(J.elbow_left,J.wrist_left),.5),n=norm(k.shieldN||[0,0,1]);J.shield=add(fm,mul(n,3));
 // the rim (8 points) and a point just in front of the face: the renderer draws the ellipse
 // through the rim and shows the face (boss and cross) or the back (arm strap) by which way the
 // face points in that view. The strap runs along the forearm.
 let u=norm(cross(n,[0,1,0]));if(len(u)<.1)u=[1,0,0];const v=norm(cross(n,u));
 for(let q=0;q<8;q++){const a=q*Math.PI/4;J['shield_r'+q]=add(J.shield,add(mul(u,15*Math.cos(a)),mul(v,15*Math.sin(a))))}
 J.shield_face=add(J.shield,mul(n,6));
 for(let q=0;q<8;q++){const a=q*Math.PI/4;J['shield_b'+q]=add(J.shield,add(add(mul(u,14*Math.cos(a)),mul(v,14*Math.sin(a))),mul(n,-3.5)))}   // the back rim: the shield has a thickness
 const fa2=norm(sub(J.wrist_left,J.elbow_left));J.strap_a=add(J.shield,mul(fa2,-8));J.strap_b=add(J.shield,mul(fa2,8));
 return J;
}
const PARENT={root:null,waist:'root',thorax:'waist',neck:'thorax',head:'neck',hip_right:'root',knee_right:'hip_right',ankle_right:'knee_right',toe_right:'ankle_right',
 shoulder_right:'thorax',elbow_right:'shoulder_right',wrist_right:'elbow_right',hand_right:'wrist_right',hip_left:'root',knee_left:'hip_left',ankle_left:'knee_left',toe_left:'ankle_left',
 shoulder_left:'thorax',elbow_left:'shoulder_left',wrist_left:'elbow_left',hand_left:'wrist_left',sword_tip:'hand_right',guard_a:'hand_right',guard_b:'hand_right',shield:'wrist_left',shield_r0:'shield',shield_r1:'shield',shield_r2:'shield',shield_r3:'shield',shield_r4:'shield',shield_r5:'shield',shield_r6:'shield',shield_r7:'shield',shield_face:'shield',strap_a:'shield',strap_b:'shield',shield_b0:'shield',shield_b1:'shield',shield_b2:'shield',shield_b3:'shield',shield_b4:'shield',shield_b5:'shield',shield_b6:'shield',shield_b7:'shield'};
export function project(J,direction){
 const yaw=YAW[direction],s=Math.sin(rad(yaw)),c=Math.cos(rad(yaw)),out={};
 for(const [id,w] of Object.entries(J)){const [l,y,z]=w,depth=c*z-s*l;out[id]={parent:PARENT[id],position:[r5(144+c*l+s*z),r5(y+.18*depth)],depth:r5(depth),world:[r5(l),r5(y),r5(z)]}}
 return out;
}
export function library(){
 const motions={};
 for(const [name,m] of Object.entries(MOTIONS)){
  motions[name]={};
  for(const d of DIRECTIONS)motions[name][d]=m.keys.map((k,i)=>({direction:d,yaw:YAW[d],motion:name,frame:i,frame_ms:k.ms,root_forward:k.rootZ||0,phase:k.phase,hit:i===m.hitFrame||undefined,smear:k.smear||undefined,joints:project(pose(k),d)}));
 }
 return{schema:'anatomical-eight-direction-motion/1.0',extends:'poses.json (same skeleton, canvas and projection)',canvas:[288,288],origin:'top-left',ground_y:242,centre_x:144,root_forward:'rootZ per frame: forward travel of the hips baked into the frames',
  directions:DIRECTIONS,yaw:YAW,anatomical_sides:{right:'negative world lateral; sword hand',left:'positive world lateral; shield forearm'},
  projection:'x=144+cos(yaw)*lateral+sin(yaw)*forward; y=worldY+0.18*depth; depth=cos(yaw)*forward-sin(yaw)*lateral. Positive depth is nearer.',
  in_place:false,planted_feet:'right foot fixed through the cut; left foot fixed from landing (slash 4-9, heavy 5-9)',extra_joints:{sword_tip:'end of the blade (hand_right + 54px along the blade)',guard_a:'cross-guard end',guard_b:'cross-guard end',shield:'centre of the shield on the left forearm',shield_r0:'shield rim, 8 points 45deg apart (r0..r7); the face is the plane through them',shield_b0:'back rim of the shield, 8 points (thickness 3.5px)',shield_face:'a point 6px in front of the face of the shield: nearer than shield = the face is toward the viewer',strap_a:'arm strap end (along the left forearm)',strap_b:'arm strap end'},
  motions:Object.fromEntries(Object.entries(MOTIONS).map(([n,m])=>[n,{label:m.label,loop:m.loop,hit_frame:m.hitFrame??null,frame_ms:m.keys.map(k=>k.ms),phases:m.keys.map(k=>k.phase)}])),
  poses:motions};
}
