// Lists frames where the legs cross: the left knee or ankle comes to the right of the right one
// (lateral world x: her right is negative), or they come closer than 8 px (the drawn thighs, 9 px wide, would overlap).
//   node tools/check_legs.mjs
import {library as A} from '../motion/attack.mjs';import {library as R} from '../motion/restraint.mjs';import {library as S} from '../motion/scenes.mjs';import {library as T} from '../motion/transitions.mjs';
let n=0;
for(const lib of [A(),R(),S(),T()])for(const [m,byDir] of Object.entries(lib.poses))byDir.front.forEach((fr,i)=>{const J=fr.joints,x=k=>J[k].world[0];
 const kn=x('knee_left')-x('knee_right'),an=x('ankle_left')-x('ankle_right');
 if(kn<8||an<8){n++;console.log(`${m} #${i} knees ${kn.toFixed(1)} ankles ${an.toFixed(1)}`)}});
console.log(n?`${n} frames`:'no crossing');
