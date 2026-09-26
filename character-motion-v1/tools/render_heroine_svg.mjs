// Renders the other heroines' own motions (motion/heroines.mjs) as SVG mannequins with their marks
// (the scout's ears, tail and backpack; the witch's hat and mechanical forearms; the healer's long ears and
// chest panels) and the staff or knife in hand.
//   node tools/render_heroine_svg.mjs
// Output: motion/heroine-poses.json and references/heroine-v1/*.svg
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {library} from '../motion/heroines.mjs';
import {sheet,keys,preview} from './mannequin_svg.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'references','heroine-v1');
fs.mkdirSync(OUT,{recursive:true});for(const f of fs.readdirSync(OUT))if(f.endsWith('.svg'))fs.unlinkSync(path.join(OUT,f));
const lib=library();
fs.writeFileSync(path.join(ROOT,'motion','heroine-poses.json'),JSON.stringify(lib));
for(const m of Object.keys(lib.poses)){
 const v=lib.motions[m].view,second=v==='front'?'right':v==='right'?'down_right':'right',dirs=lib.motions[m].all8?['front','down_right','right','up_right','back','up_left','left','down_left']:v==='front'?['front','down_right','right','back']:[v,second,'front','up_right'];
 fs.writeFileSync(path.join(OUT,`${m}_sheet.svg`),sheet(lib,m,dirs,{mark:-1}));
 fs.writeFileSync(path.join(OUT,`${m}_keys_${v}.svg`),keys(lib,m,v,{trail:'crotch',mark:-1}));
 fs.writeFileSync(path.join(OUT,`${m}_keys_${second}.svg`),keys(lib,m,second,{trail:'crotch',mark:-1}));
 fs.writeFileSync(path.join(OUT,`${m}_preview.svg`),preview(lib,m,dirs.slice(0,4)));
}
console.log('wrote',fs.readdirSync(OUT).filter(x=>x.endsWith('.svg')).length,'svg files and motion/heroine-poses.json');
