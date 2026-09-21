const assert=require('assert'),fs=require('fs'),path=require('path'),rig=require('./rig.js');
const C=JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'))),A=JSON.parse(fs.readFileSync(path.join(__dirname,'assets.json')));
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const eps=1e-6;let maxContactError=0;
for(const view of ['front','side'])for(let f=0;f<8;f++){
 const p=rig.makePose(view,f,C,A);assert.equal(p.ops.length,29);assert.equal(new Set(p.ops.map(o=>o.id)).size,29);
 for(const [id,j] of Object.entries(p.joints)){assert(j.position.every(Number.isFinite),id);if(j.parent)assert(p.joints[j.parent],id);}
 for(const side of ['far','near']){
  for(const [part,start,end] of [['upper_arm','shoulder','elbow'],['forearm','elbow','wrist'],['thigh','hip','knee'],['shin','knee','ankle']]){
   const o=p.ops.find(o=>o.id===part+'_'+side),a=p.joints[start+'_'+side].position,b=p.joints[end+'_'+side].position;
   assert(dist(o.position,a)<eps,'Start anchor: '+o.id);
   const t=o.angle*Math.PI/180,L=A[view][part].length*o.scale[1];
   assert(dist([a[0]-Math.sin(t)*L,a[1]+Math.cos(t)*L],b)<eps,'End anchor: '+o.id);
  }
  if(view==='side'){
   const a=p.joints['ankle_'+side],h=p.joints['hip_'+side],k=p.joints['knee_'+side];
   assert(Math.abs(dist(h.position,k.position)-C.lengths.thigh)<eps);
   assert(Math.abs(dist(k.position,a.position)-C.lengths.shin)<eps);
   if(a.contact){const e=Math.abs(a.position[1]+rig.soleOffset(A.side.foot,a.foot_angle)-C.ground_y);maxContactError=Math.max(maxContactError,e);assert(e<.1,'Planted foot moved off ground: '+e);}
   if(h.phase===0||h.phase===7){
    assert(a.position[0]>k.position[0],'Shin must extend ahead before heel strike');
    assert(k.flex>=3&&k.flex<10,'Leading knee must extend naturally before contact');
   }
  }else{
   const phase=p.joints['hip_'+side].phase,foot=p.ops.find(o=>o.id==='foot_'+side);
   assert.equal(foot.asset,C.front.foot_assets[phase],'Foot view must follow heel/plant/toe-off phase');
   const shoulder=p.joints['shoulder_'+side].position,elbow=p.joints['elbow_'+side].position,wrist=p.joints['wrist_'+side].position;
   const sign=side==='near'?1:-1;
   assert((elbow[0]-shoulder[0])*sign>=3.5,'Elbow must not press inward into torso');
   assert((wrist[0]-shoulder[0])*sign>=6,'Wrist must clear waist and pelvis');
  }
 }
 if(view==='side'){
  const torso=p.ops.find(o=>o.id==='upper_body'),s=A.side.upper_body.neck_socket,sp=torso.pivot,t=torso.angle*Math.PI/180;
  const x=s[0]-sp[0],y=s[1]-sp[1];
  assert(dist([torso.position[0]+x*Math.cos(t)-y*Math.sin(t),torso.position[1]+x*Math.sin(t)+y*Math.cos(t)],p.joints.cervical.position)<eps,'Neck must attach to the actual torso opening');
  assert(p.ops.findIndex(o=>o.id==='neck')<p.ops.findIndex(o=>o.id==='upper_body'),'Torso must cover neck lower edge');
 }
 const q=rig.makePose(view,f,C,A,{elbow_variation:0});assert.equal(q.arms.near.elbow_flex,26);
}
const flex=Array.from({length:8},(_,f)=>rig.makePose('side',f,C,A).arms.near.elbow_flex);
assert(Math.max(...flex)-Math.min(...flex)>=25,'Elbow motion must not be rigid');
assert(Math.max(...flex)===flex[5],'Elbow flexion must peak after the forward upper-arm swing');
const covers=new Set(),layers=new Set();
for(let f=0;f<8;f++){
 const front=rig.makePose('front',f,C,A),side=rig.makePose('side',f,C,A);
 covers.add(front.joints.knee_far.occluded_by);
 const order=front.ops.map(x=>x.id);layers.add(order.indexOf('thigh_far')>order.indexOf('lower_body'));
 const spine=['sacrum','lumbar','thorax','cervical','neck'];
 for(let i=1;i<spine.length;i++)assert(side.joints[spine[i]].position[1]<side.joints[spine[i-1]].position[1]);
 for(const n of ['hip_far','hip_near'])assert(front.joints[n].inside_pelvis);
}
assert.equal(covers.size,2,'Front knee overlap must change with depth');assert.equal(layers.size,2,'Thigh must pass in front of and behind the pelvis');
for(const view of ['down_right','up_right','back'])for(let f=0;f<8;f++){
 const p=rig.makePose(view,f,C,A),sidePose=rig.makePose('side',f,C,A);
 assert.equal(p.ops.length,29);assert.equal(new Set(p.ops.map(o=>o.id)).size,29);
 for(const [id,j] of Object.entries(p.joints)){assert(j.position.every(Number.isFinite),id);if(j.parent)assert(p.joints[j.parent],id);}
 for(const side of ['far','near']){
  for(const [name,start,end] of [['upper_arm','shoulder','elbow'],['forearm','elbow','wrist'],['thigh','hip','knee'],['shin','knee','ankle']]){
   const o=p.ops.find(o=>o.id===name+'_'+side),a=p.joints[start+'_'+side].position,b=p.joints[end+'_'+side].position,t=o.angle*Math.PI/180,L=A[view][name].length*o.scale[1];
   assert(dist(o.position,a)<eps);assert(dist([a[0]-Math.sin(t)*L,a[1]+Math.cos(t)*L],b)<eps,'Broken projected joint: '+view+o.id);
  }
  const a=p.joints['ankle_'+side],foot=p.ops.find(o=>o.id==='foot_'+side);
  const ft=foot.angle*Math.PI/180,fc=Math.cos(ft),fs=Math.sin(ft),[px,py]=foot.pivot;
  const support=Math.max(...A[view][foot.asset].opaque_corners.map(([x,y])=>{
   const dx=(fc*(x-px)-fs*(y-py))*foot.scale[0],dy=(fs*(x-px)+fc*(y-py))*foot.scale[1];
   return foot.position[1]+dy-a.ground_y-(a.ground_slope||0)*dx;
  }));
  const e=Math.abs(support+a.lift);assert(e<eps,'Projected contact/lift mismatch');assert(support<eps,'Foot penetrates its ground plane');
  if(a.contact)maxContactError=Math.max(maxContactError,e);
  assert.equal(p.joints['knee_'+side].flex,sidePose.joints['knee_'+side].flex,'Yaw must preserve sagittal knee extension');
  assert.equal(p.arms[side].elbow_flex,sidePose.arms[side].elbow_flex,'Yaw must preserve elbow timing');
  if(['up_right','back'].includes(view)){
   const forearm=p.ops.find(o=>o.id==='forearm_'+side),hand=p.ops.find(o=>o.id==='hand_'+side);
   assert(Math.abs(hand.angle-forearm.angle)<18,'Rear wrist must follow forearm without an abrupt kink');
  }
 }
 const body=p.ops.find(o=>o.id==='upper_body'),socket=A[view].upper_body.cervical_socket||A[view].upper_body.neck_socket,x=socket[0]-body.pivot[0],y=socket[1]-body.pivot[1],t=body.angle*Math.PI/180;
 assert(dist([body.position[0]+x*Math.cos(t)-y*Math.sin(t),body.position[1]+x*Math.sin(t)+y*Math.cos(t)],p.joints.cervical.position)<eps);
 assert(p.ops.findIndex(o=>o.id==='neck')<p.ops.findIndex(o=>o.id==='upper_body'));
 if(A[view].upper_body.shoulder_sockets)for(const side of ['far','near']){
  const q=A[view].upper_body.shoulder_sockets[side],dx=q[0]-body.pivot[0],dy=q[1]-body.pivot[1];
  assert(dist([body.position[0]+dx*Math.cos(t)-dy*Math.sin(t),body.position[1]+dx*Math.sin(t)+dy*Math.cos(t)],p.joints['shoulder_'+side].position)<eps,'Shoulder must attach at the torso shoulder socket');
 }
}
console.log('PASS: 40 poses × 29 parts, shared knee/elbow timing, projected contact and lift, linked joints and neck attachment.');
console.log('Maximum planted-foot geometric error: '+maxContactError.toFixed(6)+' px.');
