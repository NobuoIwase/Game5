// Checks that motions join up. For every join the game can make (EDGES in motion/transitions.mjs:
// caught -> struggling -> climax -> afterglow -> coming round ...), plays the last frame of the one
// motion (frame 0 if it loops), the join made for it (if any), and the first frame of the next, and
// lists every step where a joint moves further than LIMIT px - no more than one ordinary frame step.
// Also checks that a join starts and ends exactly on the poses it joins.
//   node tools/check_transitions.mjs [--all]
import {pose} from '../motion/attack.mjs';
import {EDGES,LIMIT,joinFrames} from '../motion/transitions.mjs';
import {library as R,MOTIONS as RM} from '../motion/restraint.mjs';import {library as S,MOTIONS as SM,NEUTRAL} from '../motion/scenes.mjs';import {library as H,MOTIONS as HM,NEUTRALS} from '../motion/heroines.mjs';
const JS=['head','thorax','root','knee_left','knee_right','ankle_left','ankle_right','toe_left','toe_right','elbow_left','elbow_right','wrist_left','wrist_right'];
const rel=J=>{const r=J.root;return Object.fromEntries(JS.map(k=>[k,[J[k][0]-r[0],J[k][1],J[k][2]-r[2]]]))};
const gap=(a,b)=>{let m=0,w='';for(const k of JS){const d=Math.hypot(...a[k].map((v,i)=>v-b[k][i]));if(d>m){m=d;w=k}}return[m,w]};
const L={...R().motions,...S().motions,...H().motions},K=m=>m==='stand'?[NEUTRAL]:m.startsWith('stand@')?[NEUTRALS[m.slice(6)]]:(RM[m]||SM[m]||HM[m]).keys;
const last=m=>{const k=K(m);return pose(m.startsWith('stand')||L[m].loop?k[0]:k[k.length-1])},first=m=>pose(K(m)[0]);
const all=process.argv.includes('--all');let bad=0,joins=0,frames=0;
for(const [a,b] of EDGES){const j=joinFrames(a,b),seq=[last(a),...j.frames.map(pose),first(b)].map(rel);joins+=j.frames.length?1:0;frames+=j.frames.length;
 let worst=[0,''],at=0;for(let i=0;i+1<seq.length;i++){const g=gap(seq[i],seq[i+1]);if(g[0]>worst[0]){worst=g;at=i}}
 const over=worst[0]>LIMIT;if(over)bad++;
 if(all||over)console.log(`${over?'JUMP':'ok  '} ${a} > ${b}: ends ${j.gap.toFixed(1)}px apart, ${j.frames.length} join frames, largest step ${worst[0].toFixed(1)}px (${worst[1]}, step ${at})`);}
console.log(`${EDGES.length} ways to join, ${joins} need a join (${frames} frames); ${bad} still jump more than ${LIMIT}px in one step`);
