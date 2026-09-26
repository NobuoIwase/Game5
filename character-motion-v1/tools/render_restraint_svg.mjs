// Renders the restrained-pose references (motion/restraint.mjs) as SVG mannequins.
//   node tools/render_restraint_svg.mjs
// Output: motion/restraint-poses.json and references/restraint-v1/*.svg
// Each motion is shown from one direction (motions.<id>.view: front, or from behind for bent_over); the
// sheets also give a 3/4 view and the side view, which shows the depth of a rock or an arch.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {library} from '../motion/restraint.mjs';
import {sheet,keys,preview} from './mannequin_svg.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'references','restraint-v1');
fs.mkdirSync(OUT,{recursive:true});
const lib=library();
fs.writeFileSync(path.join(ROOT,'motion','restraint-poses.json'),JSON.stringify(lib));
for(const m of Object.keys(lib.poses)){
 const v=lib.motions[m].view,rear=v!=='front',dirs=rear?['up_right','back','right','front']:['front','down_right','right','back'];
 fs.writeFileSync(path.join(OUT,`${m}_sheet.svg`),sheet(lib,m,dirs,{mark:-1}));
 fs.writeFileSync(path.join(OUT,`${m}_keys_${v}.svg`),keys(lib,m,v,{trail:'crotch',mark:-1}));
 fs.writeFileSync(path.join(OUT,`${m}_keys_right.svg`),keys(lib,m,'right',{trail:'crotch',mark:-1}));
 if(rear)fs.writeFileSync(path.join(OUT,`${m}_keys_back.svg`),keys(lib,m,'back',{trail:'crotch',mark:-1}));
 fs.writeFileSync(path.join(OUT,`${m}_preview.svg`),preview(lib,m,dirs));
}
console.log('wrote',fs.readdirSync(OUT).filter(x=>x.endsWith('.svg')).length,'svg files and motion/restraint-poses.json');
