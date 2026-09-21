import assert from 'node:assert/strict';
import fs from 'node:fs';
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
// Forward running posture is a pelvis-based rotation of the complete upper
// body. These geometric checks catch isolated head tilt and yaw/sign mistakes.
for(let f=0;f<8;f++)for(const direction of DIRECTIONS){
 const p=makePose(direction,'run',f),sidePose=makePose('right','run',f),root=p.joints.root.world;
 assert.equal(p.lean_degrees,RUN_LEAN_DEGREES);
 for(const [id,rise] of [['waist',19.5],['thorax',36.5],['neck',55.5],['head',76],['shoulder_right',41],['shoulder_left',41]]){
  const q=p.joints[id].world,dy=q[1]-root[1],dz=q[2]-root[2];
  close(Math.hypot(dy,dz),rise,`run ${direction} ${id} upper-body length`);
  close(Math.atan2(dz,-dy)*180/Math.PI,RUN_LEAN_DEGREES,`run ${direction} ${id} body pitch`);
 }
 for(const [id,j] of Object.entries(p.joints))assert.deepEqual(j.world,sidePose.joints[id].world,'yaw changes projection, never the sagittal running posture');
 const head=p.joints.head;
 for(const side of ['right','left']){
  assert.ok(head.world[2]>p.joints['ankle_'+side].world[2],'run head center leads the ankle of either foot');
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
const saved=JSON.parse(fs.readFileSync(new URL('./poses.json',import.meta.url),'utf8'));
assert.deepEqual(saved,lib,'exported poses are current');
console.log('PASS: 128 poses, exact v13 sagittal regression, anatomical side preservation, fixed leg lengths, periodic cycles, two running flight phases, 24-degree pelvis-based torso/shoulder/arm lean at all eight yaws, head leads ankles, reproducible JSON.');
