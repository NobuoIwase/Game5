// Every frame ChatGPT drew or was asked for, with its joints (motion data, 288 canvas) and its mannequin silhouette
// (no restraints / holders drawn), for fitting the joints to the drawings (tools/assemble/).
//   node tools/export_frames.mjs <out dir> [--no-mask]
// Output: <out>/frames.json ({file: {char, motion, view, frame, set, crop, joints: {id: [x, y, depth]}}}),
//         <out>/mask/<file>.png (512 px, the same square as the pose picture, transparent background)
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {library as A} from '../motion/attack.mjs';import {library as H} from '../motion/heroines.mjs';
import {library as R} from '../motion/restraint.mjs';import {library as S} from '../motion/scenes.mjs';
import {run} from './mannequin_svg.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=process.argv[2];
const CROP={draw:{aria:[6,27,276],scout:[44,58,201],mage:[29,27,230],healer:[16,13,255]},
 scenes:{aria:[26,41,234],healer:[26,41,234],mage:[0,9,275],scout:[13,35,255]}};
const LOOK={aria:null,scout:'scout',mage:'mage',healer:'healer'};
const lib={};for(const L of [A(),H(),R(),S()])for(const [m,bd] of Object.entries(L.poses))lib[m]=bd;
const list=[...JSON.parse(fs.readFileSync(path.join(ROOT,'chatgpt','jobs.json'),'utf8')).frames.map(f=>({...f,set:'draw'})),
 ...JSON.parse(fs.readFileSync(path.join(ROOT,'chatgpt','scenes','jobs.json'),'utf8')).frames.map(f=>({...f,set:'scenes'}))];
fs.mkdirSync(path.join(OUT,'mask'),{recursive:true});
const out={},svgs=[],cache={};
for(const f of list){
 const F=lib[f.motion][f.view],fr=F[f.frame];
 const k=f.char+'|'+f.motion+'|'+f.view;
 if(!cache[k])cache[k]=run(F.map(x=>({...x,binds:[],look:LOOK[f.char]||x.look||null})));
 const J={},Wd={};for(const [id,j] of Object.entries(fr.joints)){J[id]=[+j.position[0].toFixed(2),+j.position[1].toFixed(2),+(j.depth??0).toFixed(2)];if(j.world)Wd[id]=j.world.map(v=>+v.toFixed(2))}
 const [x,y,w]=CROP[f.set][f.char];
 out[f.file]={char:f.char,motion:f.motion,view:f.view,frame:f.frame,set:f.set,crop:[x,y,w],yaw:fr.yaw,joints:J,world:Wd};
 const g=cache[k][f.frame].replace(/<ellipse [^>]*fill="#0a0f15"\/>/,'');
 svgs.push([f.file,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${w}" width="512" height="512">${g}</svg>`]);
}
fs.writeFileSync(path.join(OUT,'frames.json'),JSON.stringify(out));
if(process.argv.includes('--no-mask')){console.log('frames',Object.keys(out).length);process.exit(0)}
const req=createRequire(import.meta.url),pw=req(execSync('npm root -g').toString().trim()+'/playwright');
const b=await pw.chromium.launch(),pg=await b.newPage({viewport:{width:512,height:512}});
for(const [id,s] of svgs){await pg.setContent(`<html><body style="margin:0;background:transparent">${s}</body></html>`);
 await pg.screenshot({path:path.join(OUT,'mask',id),omitBackground:true})}
await b.close();
console.log('frames',Object.keys(out).length);
