// Renders the joins between motions (motion/transitions.mjs) for review.
//   node tools/render_transition_svg.mjs
// Output: motion/transition-poses.json (the join frames only) and references/transition-v1/:
//   <from>__<to>_keys_<view>.svg  the end of the one motion, the join, and the start of the next, frame by frame
//   <from>__<to>_preview.svg      the same played in two directions (the view, and the side or 3/4)
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {library,frameOf} from '../motion/transitions.mjs';
import {library as R} from '../motion/restraint.mjs';import {library as S,NEUTRAL} from '../motion/scenes.mjs';import {library as H,NEUTRALS} from '../motion/heroines.mjs';
import {keys,preview} from './mannequin_svg.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'references','transition-v1');
fs.mkdirSync(OUT,{recursive:true});for(const f of fs.readdirSync(OUT))if(f.endsWith('.svg'))fs.unlinkSync(path.join(OUT,f));
const lib=library(),src={...R().poses,...S().poses,...H().poses},meta={...R().motions,...S().motions,...H().motions};
const standF=(m,d)=>tag(frameOf(m==='stand'?{...NEUTRAL,ms:200}:{...NEUTRALS[m.slice(6)],look:m.slice(6),ms:200},d),'立ち姿勢 standing');
fs.writeFileSync(path.join(ROOT,'motion','transition-poses.json'),JSON.stringify(lib));
const tag=(f,p)=>({...f,phase:p});
for(const [id,m] of Object.entries(lib.motions)){
 const {from:a,to:b,view:v}=m,second=v==='right'?'down_right':v==='front'?'right':'right',seq={};
 for(const d of [v,second]){
  const A=a.startsWith('stand')?[{...standF(a,d),phase:'（前）立ち姿勢 standing'}]:(()=>{const F=src[a][d],lp=meta[a].loop,i=lp?0:F.length-1;return(lp?[F[F.length-1],F[0]]:[F[i-1],F[i]]).filter(Boolean).map(f=>tag(f,`（前）${a}`))})();
  const B=b.startsWith('stand')?[{...standF(b,d),phase:'（次）立ち姿勢 standing'}]:src[b][d].slice(0,2).map(f=>tag(f,`（次）${b}`));
  seq[d]=[...A,...lib.poses[id][d],...B];
 }
 const L={poses:{[id]:seq},motions:{[id]:{label:m.label,frame_ms:seq[v].map(f=>f.frame_ms||90)}}};
 fs.writeFileSync(path.join(OUT,`${id}_keys_${v}.svg`),keys(L,id,v,{trail:'crotch',mark:-1}));
 fs.writeFileSync(path.join(OUT,`${id}_preview.svg`),preview(L,id,[v,second]));
}
console.log('wrote',fs.readdirSync(OUT).filter(x=>x.endsWith('.svg')).length,'svg files and motion/transition-poses.json');
