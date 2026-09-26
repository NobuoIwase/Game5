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

/* ---- key poses. Angles in degrees. pelvis/torso yaw: + turns the RIGHT (sword) side back.
   pitch: + leans forward. Feet: world [lateral, forward, lift]. Hands: in the chest frame,
   [lateral, height above the hip joint, forward]. Sword: direction in the chest frame
   [lateral, up, forward]. ---- */
const GUARD={hipY:183,pelvis:25,torso:5,pitch:4,footR:[-9,-10,0],footL:[9,10,0],handR:[-10,50,10],sword:[.12,.55,.83],handL:[6,52,16]};
export const MOTIONS={
 slash:{label:'通常斬り（振り下ろし）',loop:false,hitFrame:6,keys:[
  {...GUARD,ms:100,phase:'構え guard'},
  {hipY:185,pelvis:35,torso:10,pitch:-2,footR:[-9,-10,0],footL:[9,10,0],handR:[-12,62,2],sword:[.05,.92,.3],handL:[7,53,18],ms:70,phase:'予備動作 anticipation: sink, turn the sword side back'},
  {hipY:183,pelvis:42,torso:16,pitch:-6,footR:[-9,-9,1],footL:[9,10,0],handR:[-8,76,-6],sword:[.05,.7,-.7],handL:[8,54,20],ms:70,phase:'振りかぶり raise: blade over the head, shield arm reaches forward'},
  {hipY:182,pelvis:44,torso:20,pitch:-8,footR:[-9,-2,9],footL:[9,10,0],handR:[-6,80,-10],sword:[0,.45,-.9],handL:[9,54,22],ms:80,phase:'溜め top of the raise: back arched, sword foot leaves the ground'},
  {hipY:186,pelvis:12,torso:10,pitch:5,footR:[-9,15,1],footL:[9,4,0],handR:[-6,78,2],sword:[0,.97,.2],handL:[10,47,6],ms:50,phase:'踏み込み step lands: hips whip round first, blade still up'},
  {hipY:188,pelvis:-14,torso:-8,pitch:10,footR:[-9,16,0],footL:[9,0,0],handR:[-2,64,22],sword:[0,.28,.96],handL:[12,44,-2],ms:40,phase:'振り下ろし the cut: shoulders follow the hips, arm snaps down'},
  {hipY:190,pelvis:-24,torso:-14,pitch:15,footR:[-9,16,0],footL:[9,-6,3],handR:[0,44,26],sword:[.05,-.35,.94],handL:[12,40,-9],ms:90,phase:'命中 impact (hit-stop): knees give, weight on the front foot'},
  {hipY:191,pelvis:-32,torso:-22,pitch:19,footR:[-9,16,0],footL:[9,-12,5],handR:[8,30,18],sword:[.5,-.85,.15],handL:[13,40,-12],ms:80,phase:'振り抜き follow-through: blade carried low across the body'},
  {hipY:190,pelvis:-30,torso:-18,pitch:16,footR:[-9,16,0],footL:[9,-12,4],handR:[6,32,20],sword:[.35,-.7,.62],handL:[12,42,-8],ms:110,phase:'残心 hold: stays down for a breath'},
  {hipY:187,pelvis:-6,torso:0,pitch:8,footR:[-9,14,0],footL:[9,-4,4],handR:[-6,44,16],sword:[.1,.2,.97],handL:[9,48,8],ms:70,phase:'戻り recover: rise, blade back up'},
  {hipY:185,pelvis:14,torso:4,pitch:5,footR:[-9,-2,6],footL:[9,8,0],handR:[-9,48,12],sword:[.12,.45,.88],handL:[7,51,14],ms:70,phase:'引き step back: the front foot comes back'},
  {...GUARD,ms:80,phase:'構え guard again'}]},
 advance:{label:'構えたまま前進',loop:true,keys:[]},
 retreat:{label:'構えたまま後退',loop:true,keys:[]},
 heavy:{label:'破城斬り（大振り）',loop:false,hitFrame:0,keys:[]}
};
/* the heavy cut: the same line, deeper and longer - a longer wind-up held at the top, a bigger
   turn, a deeper sink */
{
 const s=MOTIONS.slash.keys,amp=(k,f)=>({...k,pelvis:k.pelvis*f,torso:k.torso*f,pitch:k.pitch*f,hipY:183+(k.hipY-183)*1.5});
 const h=[amp(s[0],1),amp(s[1],1.2),amp(s[2],1.25),amp(s[3],1.3),{...amp(s[3],1.35),ms:140,phase:'溜め（長い） held at the top'},amp(s[4],1.3),amp(s[5],1.3),amp(s[6],1.35),amp(s[7],1.35),{...amp(s[8],1.3),ms:160},amp(s[9],1.2),amp(s[10],1.1),amp(s[11],1)];
 h[4].handR=[-4,84,-14];h[4].sword=[0,.3,-.95];h[7].sword=[.35,-.9,.25];
 MOTIONS.heavy.keys=h.map((k,i)=>({...k,ms:Math.round(k.ms*(i<5?1.4:1.15))}));MOTIONS.heavy.hitFrame=7;
}
/* guarded steps, drawn in place (the game moves her): a "step-drag" - the lead (shield-side) foot
   steps out while the rear foot, planted, slides back under her as she travels (frames 0-3); then
   the rear foot is picked up and brought back to its place while the lead foot, planted, slides
   back (frames 4-7). Backing off is the same with the rear foot first. */
for(const [name,dir] of [['advance',1],['retreat',-1]]){
 const keys=[],S=12,Lz=10,Rz=-10;
 for(let f=0;f<8;f++){const a=f<4,u=(f%4)/4,sw=Math.sin(u*Math.PI),e=.5-.5*Math.cos(u*Math.PI);   // e: 0->1 over half a cycle
  let zl,zr,ll=0,lr=0;
  if(dir>0){ if(a){zl=Lz+S*e;ll=6*sw;zr=Rz-S*e}else{zl=Lz+S-S*e;zr=Rz-S+S*e;lr=5*sw} }
  else     { if(a){zr=Rz-S*e;lr=6*sw;zl=Lz+S*e}else{zr=Rz-S+S*e;zl=Lz+S-S*e;ll=5*sw} }
  keys.push({...GUARD,hipY:184+sw*1.2,pitch:dir>0?7:1,footL:[9,zl,ll],footR:[-9,zr,lr],
   handR:dir>0?[-10,50,12]:[-9,54,8],sword:dir>0?[.12,.5,.86]:[.1,.65,.75],ms:90,phase:(dir>0?'前進 ':'後退 ')+(a?(dir>0?'lead foot steps out':'rear foot steps back'):(dir>0?'rear foot drawn up':'lead foot drawn back'))});
 }
 MOTIONS[name].keys=keys;
}

/* ---- forward kinematics ---- */
function yawPt(l,z,a){const c=Math.cos(rad(a)),s=Math.sin(rad(a));return[l*c-z*s,l*s+z*c]}
function body(k){
 const root=[0,k.hipY,0];
 // a point on the trunk: local [lateral, rise above the hip joint, forward], turned by yaw, then
 // leaned by pitch about the hips
 const trunk=(l,rise,z,yaw)=>{const [l1,z1]=yawPt(l,z,yaw),p=rad(k.pitch),z2=z1*Math.cos(p)+rise*Math.sin(p),r2=rise*Math.cos(p)-z1*Math.sin(p);return[root[0]+l1,root[1]-r2,root[2]+z2]};
 const dirv=(v,yaw)=>{const [l1,z1]=yawPt(v[0],v[2],yaw),p=rad(k.pitch),up=v[1],z2=z1*Math.cos(p)+up*Math.sin(p),u2=up*Math.cos(p)-z1*Math.sin(p);const n=Math.hypot(l1,u2,z2)||1;return[l1/n,-u2/n,z2/n]};
 return{root,trunk,dirv};
}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],len=a=>Math.hypot(...a),norm=a=>mul(a,1/(len(a)||1));
function ik3(a,target,l1,l2,pole){
 let d=sub(target,a),dl=len(d);const m=Math.max(Math.abs(l1-l2)+.01,Math.min(l1+l2-.05,dl));d=mul(norm(d),m);const u=norm(d);
 const x=(l1*l1-l2*l2+m*m)/(2*m),h=Math.sqrt(Math.max(0,l1*l1-x*x));let p=sub(pole,mul(u,dot(pole,u)));p=norm(p);
 return{mid:add(add(a,mul(u,x)),mul(p,h)),end:add(a,d)};
}
export function pose(k){
 const B=body(k),J={};
 const chest=k.pelvis+k.torso;
 J.root=B.root;J.waist=B.trunk(0,19.5,0,k.pelvis);J.thorax=B.trunk(0,36.5,0,chest);J.neck=B.trunk(0,55.5,0,chest);
 J.head=[J.neck[0],J.neck[1]-L.neckToHead,J.neck[2]];            // the head stays level (as in the run)
 const fwd=B.dirv([0,0,1],k.pelvis);
 for(const [side,sg] of [['right',-1],['left',1]]){
  const hip=B.trunk(8.5*sg,0,0,k.pelvis),f=k['foot'+(side==='right'?'R':'L')];
  const ankle=[f[0],232-f[2],f[1]];
  const leg=ik3(hip,ankle,L.thigh,L.shin,add(fwd,[sg*.25,0,0]));
  J['hip_'+side]=hip;J['knee_'+side]=leg.mid;J['ankle_'+side]=leg.end;
  const toeDir=norm([fwd[0]*.9+sg*.15,0,fwd[2]*.9+.1]);J['toe_'+side]=[leg.end[0]+toeDir[0]*11,leg.end[1]+8-Math.min(6,f[2]*.4),leg.end[2]+toeDir[2]*11];
  const sh=B.trunk(12.5*sg,41,0,chest),hv=k['hand'+(side==='right'?'R':'L')];
  const target=B.trunk(hv[0],hv[1],hv[2],chest),pole=B.dirv([sg*1,-.5,-.35],chest);
  const arm=ik3(sh,target,L.upper,L.fore,pole);
  J['shoulder_'+side]=sh;J['elbow_'+side]=arm.mid;J['wrist_'+side]=arm.end;
  const fa=norm(sub(arm.end,arm.mid));J['hand_'+side]=add(arm.end,mul(fa,L.hand));
 }
 const sd=B.dirv(k.sword,chest);J.sword_tip=add(J.hand_right,mul(sd,L.sword));
 J.shield=add(J.wrist_left,mul(norm(sub(J.elbow_left,J.wrist_left)),6));   // centre of the shield on the forearm
 return J;
}
const PARENT={root:null,waist:'root',thorax:'waist',neck:'thorax',head:'neck',hip_right:'root',knee_right:'hip_right',ankle_right:'knee_right',toe_right:'ankle_right',
 shoulder_right:'thorax',elbow_right:'shoulder_right',wrist_right:'elbow_right',hand_right:'wrist_right',hip_left:'root',knee_left:'hip_left',ankle_left:'knee_left',toe_left:'ankle_left',
 shoulder_left:'thorax',elbow_left:'shoulder_left',wrist_left:'elbow_left',hand_left:'wrist_left',sword_tip:'hand_right',shield:'wrist_left'};
export function project(J,direction){
 const yaw=YAW[direction],s=Math.sin(rad(yaw)),c=Math.cos(rad(yaw)),out={};
 for(const [id,w] of Object.entries(J)){const [l,y,z]=w,depth=c*z-s*l;out[id]={parent:PARENT[id],position:[r5(96+c*l+s*z),r5(y+.18*depth)],depth:r5(depth),world:[r5(l),r5(y),r5(z)]}}
 return out;
}
export function library(){
 const motions={};
 for(const [name,m] of Object.entries(MOTIONS)){
  motions[name]={};
  for(const d of DIRECTIONS)motions[name][d]=m.keys.map((k,i)=>({direction:d,yaw:YAW[d],motion:name,frame:i,frame_ms:k.ms,phase:k.phase,hit:i===m.hitFrame||undefined,joints:project(pose(k),d)}));
 }
 return{schema:'anatomical-eight-direction-motion/1.0',extends:'poses.json (same skeleton, canvas and projection)',canvas:[192,256],origin:'top-left',ground_y:242,
  directions:DIRECTIONS,yaw:YAW,anatomical_sides:{right:'negative world lateral; sword hand',left:'positive world lateral; shield forearm'},
  projection:'x=96+cos(yaw)*lateral+sin(yaw)*forward; y=worldY+0.18*depth; depth=cos(yaw)*forward-sin(yaw)*lateral. Positive depth is nearer.',
  in_place:true,extra_joints:{sword_tip:'end of the blade (hand_right + 54px along the blade)',shield:'centre of the shield on the left forearm'},
  motions:Object.fromEntries(Object.entries(MOTIONS).map(([n,m])=>[n,{label:m.label,loop:m.loop,hit_frame:m.hitFrame??null,frame_ms:m.keys.map(k=>k.ms),phases:m.keys.map(k=>k.phase)}])),
  poses:motions};
}
