import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {DIRECTIONS,makePose,makeLibrary,SOURCE,RUN_LEAN_DEGREES} from './rig.mjs';
const lib=makeLibrary();
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<.0001,`${message}: ${a} vs ${b}`);
for(const m of ['walk','run'])for(const d of DIRECTIONS){
 for(let f=0;f<8;f++){
  const p=makePose(d,m,f);
  assert.equal(p.frame_ms,m==='walk'?120:80);
  assert.deepEqual(makePose(d,m,f+8),p,'loop wraps exactly');
  assert.equal(p.flight,m==='run'&&(f===3||f===7),'real run flight; walk continuous support');
  for(const j of Object.values(p.joints))assert.ok([...j.position,j.depth,...j.world].every(Number.isFinite));
  for(const side of ['right','left']){
   const sign=side==='right'?-1:1;
   for(const id of ['hip','knee','ankle','shoulder','elbow','wrist'])assert.ok(p.joints[`${id}_${side}`].world[0]*sign>0,'anatomical identity survives yaw');
   const chain=['hip','knee','ankle'].map(id=>p.joints[`${id}_${side}`].world);
   close(Math.hypot(...chain[1].map((v,i)=>v-chain[0][i])),26,'thigh IK length');
   close(Math.hypot(...chain[2].map((v,i)=>v-chain[1][i])),28,'shin IK length');
  }
 }
}
// Concrete regression against all eight supplied v13 right-facing poses.
for(let f=0;f<8;f++)for(const [side,originalSide] of [['right','near'],['left','far']]){
 const p=makePose('right','walk',f);
 for(const joint of ['hip','knee','ankle']){
  const expected=SOURCE.sideReference[f].joints[`${joint}_${originalSide}`].position;
  const actual=p.joints[`${joint}_${side}`].world;
  close(actual[1],expected[1],`v13 ${f} ${joint} y`);
  close(actual[2],expected[0]-104,`v13 ${f} ${joint} z`);
 }
}
for(let f=0;f<8;f++){
 const a=makePose('right','walk',f),b=makePose('left','walk',f);
 assert.ok(a.joints.wrist_right.depth>b.joints.wrist_right.depth,'same right wrist changes occlusion on the opposite side');
 const w=makePose('right','walk',f),r=makePose('right','run',f);
 assert.ok(r.lean_degrees>w.lean_degrees);
 assert.ok(r.joints.elbow_right.flex>w.joints.elbow_right.flex);
}
// The chest inclines gently, while the head is independently held upright.
// These checks reject the previous bowed pose without changing the walk.
for(let f=0;f<8;f++)for(const direction of DIRECTIONS){
 const p=makePose(direction,'run',f),sidePose=makePose('right','run',f),root=p.joints.root.world;
 assert.equal(p.lean_degrees,RUN_LEAN_DEGREES);
 for(const [id,rise] of [['waist',19.5],['thorax',36.5],['neck',55.5],['shoulder_right',41],['shoulder_left',41]]){
  const q=p.joints[id].world,dy=q[1]-root[1],dz=q[2]-root[2];
  close(Math.hypot(dy,dz),rise,`run ${direction} ${id} upper-body length`);
  close(Math.atan2(dz,-dy)*180/Math.PI,RUN_LEAN_DEGREES,`run ${direction} ${id} body pitch`);
 }
 for(const [id,j] of Object.entries(p.joints))assert.deepEqual(j.world,sidePose.joints[id].world,'yaw changes projection, never the sagittal running posture');
 const head=p.joints.head;
 const neck=p.joints.neck;
 assert.equal(p.head_pitch_degrees,0,'run gaze remains horizontal');
 close(head.world[2],neck.world[2],'head is vertically above neck');
 close(neck.world[1]-head.world[1],20.5,'independent neck-to-head length');
 for(const side of ['right','left']){
  const chain=['shoulder','elbow','wrist'].map(id=>p.joints[id+'_'+side].world);
  close(Math.hypot(chain[1][1]-chain[0][1],chain[1][2]-chain[0][2]),22,'inclined arm keeps upper-arm length');
  close(Math.hypot(chain[2][1]-chain[1][1],chain[2][2]-chain[1][2]),17,'inclined arm keeps forearm length');
  const upperWorldAngle=Math.atan2(-(chain[1][2]-chain[0][2]),chain[1][1]-chain[0][1])*180/Math.PI;
  close(upperWorldAngle,p.joints['shoulder_'+side].upper_angle+RUN_LEAN_DEGREES,'arm swing follows the tilted chest frame exactly once');
 }
 const yaw=p.yaw*Math.PI/180,dz=head.world[2]-root[2],dy=head.world[1]-root[1];
 close(head.position[0]-p.joints.root.position[0],Math.sin(yaw)*dz,'run head moves toward the screen direction');
 close(head.position[1]-p.joints.root.position[1],dy+.18*Math.cos(yaw)*dz,'front/back tilt uses the same depth projection');
}
for(const side of ['right','left']){
 const shift=side==='right'?0:4;
 const poseAt=phase=>makePose('right','run',(phase+shift)%8);
 const jointAt=(phase,id)=>poseAt(phase).joints[id+'_'+side];
 const ankle0=jointAt(0,'ankle'),ankle1=jointAt(1,'ankle'),ankle2=jointAt(2,'ankle');
 assert.ok(ankle0.world[2]>ankle1.world[2]&&ankle1.world[2]>ankle2.world[2],'stance rolls backward beneath the advancing body');
 assert.ok(poseAt(1).joints.root.world[1]>poseAt(0).joints.root.world[1],'landing absorbs weight through lowered pelvis');
 assert.ok(jointAt(1,'knee').flex>jointAt(0,'knee').flex+20,'compression is visible in knee flex');
 assert.ok(jointAt(4,'knee').flex>110,'recovery heel folds behind, unlike a straight trailing walk leg');
 assert.ok(jointAt(7,'knee').flex<45,'swing leg extends before touchdown');
 const contactPose=poseAt(0),recoveryPose=poseAt(4);
 assert.ok(contactPose.joints['elbow_'+side].world[2]<contactPose.joints['shoulder_'+side].world[2],'arm travels back when its own leg reaches forward');
 assert.ok(recoveryPose.joints['elbow_'+side].world[2]>recoveryPose.joints['shoulder_'+side].world[2],'arm travels forward as its own leg recovers behind');
}
const preserved=crypto.createHash('sha256').update(JSON.stringify({rest:lib.rest,walk:lib.motions.walk})).digest('hex');
assert.equal(preserved,'5747225e70b9c89c793f21eeb202844bffec389d32f0319f91ccd19ab55d69e0','all walk and rest poses remain byte-identical to v2');
const saved=JSON.parse(fs.readFileSync(new URL('./poses.json',import.meta.url),'utf8'));
assert.deepEqual(saved,lib,'exported poses are current');
console.log('PASS: 128 poses; walk/rest SHA-256 unchanged; exact v13 regression; fixed limb lengths; two run flight phases; landing compression, heel recovery and counter-swing; 13-degree trunk lean with independently upright head at all eight yaws; reproducible JSON.');
