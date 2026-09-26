// Renders the attack reference poses (motion/attack.mjs) as SVG mannequins and writes the joint
// data next to poses.json.
//   node tools/render_attack_svg.mjs
// Output: motion/attack-poses.json and references/attack-v1/*.svg (drawing: tools/mannequin_svg.mjs)
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {library,DIRECTIONS} from '../motion/attack.mjs';
import {sheet,keys,preview} from './mannequin_svg.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'references','attack-v1');
fs.mkdirSync(OUT,{recursive:true});
const lib=library();
fs.writeFileSync(path.join(ROOT,'motion','attack-poses.json'),JSON.stringify(lib));
for(const m of Object.keys(lib.poses)){
 fs.writeFileSync(path.join(OUT,`${m}_sheet.svg`),sheet(lib,m,DIRECTIONS));
 fs.writeFileSync(path.join(OUT,`${m}_keys_right.svg`),keys(lib,m,'right'));
 fs.writeFileSync(path.join(OUT,`${m}_keys_down_right.svg`),keys(lib,m,'down_right'));
 fs.writeFileSync(path.join(OUT,`${m}_preview.svg`),preview(lib,m,DIRECTIONS));
}
console.log('wrote',fs.readdirSync(OUT).filter(x=>x.endsWith('.svg')).length,'svg files and motion/attack-poses.json');
