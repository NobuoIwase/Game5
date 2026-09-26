// Lists the frames where a limb that overlaps the trunk on screen switches between being drawn over and
// under it (a part "popping" through the body), with how far it is from the trunk surface each time
// (dd, + toward the viewer); review the listed frames by eye.
//   node tools/check_occlusion.mjs [motion-id ...]
import {figure} from './mannequin_svg.mjs';
import {library as A} from '../motion/attack.mjs';import {library as R} from '../motion/restraint.mjs';import {library as S} from '../motion/scenes.mjs';import {library as T} from '../motion/transitions.mjs';import {library as H} from '../motion/heroines.mjs';
const hover=process.argv.includes('--hover'),only=process.argv.slice(2).filter(a=>a!=='--hover');   // --hover: only the flips of a part that sits right at the trunk's edge in both frames
const inPoly=(p,q)=>{let c=false;for(let i=0,j=q.length-1;i<q.length;j=i++){if((q[i][1]>p[1])!==(q[j][1]>p[1])&&p[0]<(q[j][0]-q[i][0])*(p[1]-q[i][1])/(q[j][1]-q[i][1])+q[i][0])c=!c}return c};
const overlap=(it,q)=>{const [a,b=a]=it.p;for(let t=.15;t<=.85;t+=.1){const x=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];if(inPoly(x,q))return true}return false};
let bad=0;
for(const lib of [A(),R(),S(),T(),H()])for(const [m,byDir] of Object.entries(lib.poses)){if(only.length&&!only.includes(m))continue;
 for(const [d,frames] of Object.entries(byDir)){const memo={};frames.forEach(fr=>figure(fr.joints,fr.binds,fr.yaw,fr.expr,memo));const st=frames.map(fr=>{figure(fr.joints,fr.binds,fr.yaw,fr.expr,memo);const it=figure.items,ti=it.findIndex(x=>x.id==='trunk'),q=figure.trunk,o={};
   it.forEach((x,i)=>{if(!x.w||!/elbow|wrist|knee|hip|ankle|foot/.test(x.id))return;const mid=x.w.length>1?(/^shoulder/.test(x.id)?x.w[1]:x.w[0].map((v,k)=>(v+x.w[1][k])/2)):x.w[0];
    o[x.id]={over:i>ti,ov:overlap(x,q),s:figure.dd(mid),need:/hip|knee|ankle|foot/.test(x.id)?4:-1.5}});return o});
  st.forEach((o,i)=>{for(const [id,v] of Object.entries(o)){
   const n=st[(i+1)%st.length][id];if(i+1<st.length&&n&&n.over!==v.over&&(n.ov||v.ov)&&(!hover||(Math.abs(v.s-v.need)<2.5&&Math.abs(n.s-n.need)<2.5))){bad++;console.log(`FLIP  ${m} ${d} #${i}->#${i+1} ${id} side ${v.s.toFixed(1)}->${n.s.toFixed(1)}`)}}})}}
console.log(bad?`${bad} problems`:'no problems');
