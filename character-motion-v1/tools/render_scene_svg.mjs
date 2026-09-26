// Renders the scene references (floor, kiss, free-standing, clinging creatures) (motion/scenes.mjs) as SVG mannequins.
//   node tools/render_restraint_svg.mjs
// Output: motion/scene-poses.json and references/scene-v1/*.svg
// Each motion is shown from one direction (motions.<id>.view: the side or 3/4 for floor poses and
// kisses, else the front); a second key page gives the 3/4 view (side motions) or the side view (the rest).
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {library} from '../motion/scenes.mjs';
import {sheet,keys,preview} from './mannequin_svg.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'references','scene-v1');
fs.mkdirSync(OUT,{recursive:true});
const lib=library();
fs.writeFileSync(path.join(ROOT,'motion','scene-poses.json'),JSON.stringify(lib));
for(const m of Object.keys(lib.poses)){
 const v=lib.motions[m].view,second=v==='right'?'down_right':'right',dirs=v==='front'?['front','down_right','right','back']:[v,second,'front','up_right'];
 fs.writeFileSync(path.join(OUT,`${m}_sheet.svg`),sheet(lib,m,dirs,{mark:-1}));
 fs.writeFileSync(path.join(OUT,`${m}_keys_${v}.svg`),keys(lib,m,v,{trail:'crotch',mark:-1}));
 fs.writeFileSync(path.join(OUT,`${m}_keys_${second}.svg`),keys(lib,m,second,{trail:'crotch',mark:-1}));
 fs.writeFileSync(path.join(OUT,`${m}_preview.svg`),preview(lib,m,dirs));
}
console.log('wrote',fs.readdirSync(OUT).filter(x=>x.endsWith('.svg')).length,'svg files and motion/scene-poses.json');
