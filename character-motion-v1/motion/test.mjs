import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DIRECTIONS,makePose,makeLibrary,SOURCE} from './rig.mjs';
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
const saved=JSON.parse(fs.readFileSync(new URL('./poses.json',import.meta.url),'utf8'));
assert.deepEqual(saved,lib,'exported poses are current');
console.log('PASS: 128 poses, exact v13 sagittal regression, anatomical side preservation, fixed leg lengths, periodic cycles, two running flight phases, flex and lean, reproducible JSON.');
