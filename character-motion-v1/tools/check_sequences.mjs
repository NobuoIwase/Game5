// Plays every join as the game would - the end of the one motion, the join (if any), the start of the next -
// in all eight directions, and lists:
//   JUMP  a joint (face and eyes too, and where she stands) or the end of a restraint line moving more than
//         LIMIT px from one frame to the next
//   FLIP  a restraint line (longer than 12 px), loop or clinging creature, or a limb grazing the trunk's edge, that changes from
//         over the trunk to under it (or back) from one frame to the next while it overlaps the trunk
//   node tools/check_sequences.mjs [--all]
import {figure} from './mannequin_svg.mjs';
import {EDGES,LIMIT,joinFrames,frameOf} from '../motion/transitions.mjs';
import {library as R} from '../motion/restraint.mjs';import {library as S,NEUTRAL} from '../motion/scenes.mjs';import {library as H,NEUTRALS} from '../motion/heroines.mjs';
import {DIRECTIONS} from '../motion/attack.mjs';
const src={...R().poses,...S().poses,...H().poses},meta={...R().motions,...S().motions,...H().motions};
const JS=['head','face','eye_left','eye_right','thorax','root','knee_left','knee_right','ankle_left','ankle_right','toe_left','toe_right','elbow_left','elbow_right','wrist_left','wrist_right'];
const inPoly=(p,q)=>{let c=false;for(let i=0,j=q.length-1;i<q.length;j=i++){if((q[i][1]>p[1])!==(q[j][1]>p[1])&&p[0]<(q[j][0]-q[i][0])*(p[1]-q[i][1])/(q[j][1]-q[i][1])+q[i][0])c=!c}return c};
const overlap=(it,q)=>{const [a,b=a]=it.p;for(let t=.1;t<=.9;t+=.1){const x=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];if(inPoly(x,q))return true}return false};
export function sequence(a,b,d){const j=joinFrames(a,b);
 const st=m=>m==='stand'?[frameOf(NEUTRAL,d)]:[frameOf({...NEUTRALS[m.slice(6)],look:m.slice(6)},d)];
 const A=a.startsWith('stand')?st(a):(()=>{const F=src[a][d];return meta[a].loop?[F[F.length-1],F[0]]:[F[F.length-2],F[F.length-1]].filter(Boolean)})();
 const B=b.startsWith('stand')?st(b):src[b][d].slice(0,2);const seq=[...A,...j.frames.map(k=>frameOf(k,d)),...B];seq.span=[A.length-1,A.length+j.frames.length];return seq}   // span: the steps that belong to the join
const all=process.argv.includes('--all');let jumps=0,flips=0;
for(const [a,b] of EDGES){const out=new Set();
 for(const d of DIRECTIONS){const seq=sequence(a,b,d);const memo={};seq.forEach(f=>figure(f.joints,f.binds,f.yaw,f.expr,memo,f));
  const st=seq.map(f=>{figure(f.joints,f.binds,f.yaw,f.expr,memo,f);const it=figure.items,ti=it.findIndex(x=>x.id==='trunk'),q=figure.trunk,o={};
   it.forEach((x,i)=>{if(!x.id||x.id==='trunk'||!x.w)return;const bind=/:/.test(x.id)&&!/^(loop|band):/.test(x.id);   // a loop or a band follows its joint, so it is judged like a limbif(!bind&&!/elbow|wrist|knee|hip|ankle|foot|loop|band/.test(x.id))return;
    const mid=x.w.length>1?(/^shoulder/.test(x.id)?x.w[1]:x.w[0].map((v,k)=>(v+x.w[1][k])/2)):x.w[0];o[x.id]={over:i>ti,ov:overlap(x,q),dd:figure.dd(mid),bind,short:/^tube/.test(x.id)&&Math.hypot(x.p[0][0]-x.p[1][0],x.p[0][1]-x.p[1][1])<12,need:/hip|knee|ankle|foot/.test(x.id)?4:-1.5}});
   return{o,J:f.joints,binds:f.binds}});
  for(let i=0;i+1<st.length;i++){const u=st[i],v=st[i+1];
   if(d==='front'&&i>=seq.span[0]&&i<seq.span[1]){for(const k of JS){const g=Math.hypot(...u.J[k].world.map((x,n)=>x-v.J[k].world[n]));if(g>LIMIT)out.add(`JUMP  ${a} > ${b}  frame ${i}->${i+1}  ${k} ${g.toFixed(0)}px`)}
    for(const bu of u.binds)if(bu.anchor){const bv=v.binds.find(x=>x.joint===bu.joint&&x.anchor);if(bv){const g=Math.hypot(...u.J[bu.anchor].world.map((x,n)=>x-v.J[bv.anchor].world[n]));if(g>LIMIT)out.add(`JUMP  ${a} > ${b}  frame ${i}->${i+1}  line to ${bu.joint} moves ${g.toFixed(0)}px`)}}}
   for(const [id,x] of Object.entries(u.o)){const y=v.o[id];if(!y||x.over===y.over||!(x.ov||y.ov))continue;
    const hover=Math.abs(x.dd-x.need)<2.5&&Math.abs(y.dd-y.need)<2.5,short=x.short||y.short;if(x.bind&&!short||hover)out.add(`FLIP  ${a} > ${b}  frame ${i}->${i+1}  ${id} (${d}) dd ${x.dd.toFixed(1)}->${y.dd.toFixed(1)}`)}}}
 for(const l of out){console.log(l);l.startsWith('JUMP')?jumps++:flips++}}
// a restraint line that appears or goes at full length from one frame to the next (it should grow or go back)
const pops=(F,name,from=0,to=F.length-1)=>{for(let i=from;i<to;i++)for(const [x,y,w] of [[F[i],F[i+1],'appears'],[F[i+1],F[i],'goes']])for(const b of y.binds)if(b.anchor&&!b.partner&&!x.binds.some(c=>c.joint===b.joint&&c.anchor)){
 const q=w==='appears'?F[i+1]:F[i],g=Math.hypot(...q.joints[b.anchor].world.map((v,n)=>v-q.joints[b.joint].world[n]));if(g>LIMIT){console.log(`JUMP  ${name}  frame ${i}->${i+1}  line to ${b.joint} ${w} at ${g.toFixed(0)}px long`);jumps++}}};
for(const [a,b] of EDGES){const s=sequence(a,b,'front');pops(s,`${a} > ${b}`,s.span[0],s.span[1])}
for(const [m,byDir] of Object.entries(src)){const F=byDir.front;pops(F,m);if(meta[m].loop)pops([F[F.length-1],F[0]],m+' (loop)')}
// inside the motions: the far end of a restraint line jumping from one frame to the next
for(const [m,byDir] of Object.entries(src)){const F=byDir.front;for(let i=0;i+1<F.length;i++)for(const bu of F[i].binds)if(bu.anchor){const bv=F[i+1].binds.find(x=>x.joint===bu.joint&&x.anchor);
 if(bv){const g=Math.hypot(...F[i].joints[bu.anchor].world.map((x,n)=>x-F[i+1].joints[bv.anchor].world[n]));if(g>LIMIT){console.log(`JUMP  ${m}  frame ${i}->${i+1}  line to ${bu.joint} moves ${g.toFixed(0)}px`);jumps++}}}}
console.log(`${EDGES.length} joins played in ${DIRECTIONS.length} directions: ${jumps} jumps, ${flips} flips`);
