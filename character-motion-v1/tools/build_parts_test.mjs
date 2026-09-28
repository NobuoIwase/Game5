// A trial set for ChatGPT: put five motions together from its own drawings (cut out the parts, fit them to the joints).
//   node tools/build_parts_test.mjs          (then python3 tools/build_parts_test.py for the drawings and the page)
// Output: chatgpt/parts_test/<name>/pose/<frame>.png (512, the mannequin of every frame), <name>/motion.json
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {library as A} from '../motion/attack.mjs';import {library as H} from '../motion/heroines.mjs';
import {library as R} from '../motion/restraint.mjs';import {library as S} from '../motion/scenes.mjs';
import {run} from './mannequin_svg.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'chatgpt','parts_test');
export const PICK=[['aria','kesa','right','draw'],['mage','mage_bolt','front','draw'],['scout','scout_throw','right','draw'],
 ['scout','ankle_grabbed','right','scenes'],['aria','held_from_behind','front','scenes']];
const CROP={draw:{aria:[6,27,276],scout:[44,58,201],mage:[29,27,230],healer:[16,13,255]},scenes:{aria:[26,41,234],healer:[26,41,234],mage:[0,9,275],scout:[13,35,255]}};
const LOOK={aria:null,scout:'scout',mage:'mage',healer:'healer'};
const lib={};for(const L of [A(),H(),R(),S()])for(const [m,bd] of Object.entries(L.poses))lib[m]={bd,meta:L.motions[m]};
const KEYS=['head','neck','root','shoulder_right','elbow_right','wrist_right','hand_right','shoulder_left','elbow_left','wrist_left','hand_left',
 'hip_right','knee_right','ankle_right','toe_right','hip_left','knee_left','ankle_left','toe_left','sword_tip','prop_a','prop_b'];
const req=createRequire(import.meta.url),pw=req(execSync('npm root -g').toString().trim()+'/playwright');
const b=await pw.chromium.launch(),pg=await b.newPage({viewport:{width:512,height:512}});
for(const [c,m,v,set] of PICK){
 const name=`${c}__${m}__${v}`,dir=path.join(OUT,name,'pose');fs.mkdirSync(dir,{recursive:true});
 const F=lib[m].bd[v],figs=run(F.map(x=>({...x,look:LOOK[c]||x.look||null}))),[x0,y0,w]=CROP[set][c],k=512/w;
 const frames=F.map((fr,i)=>({frame:i,ms:fr.frame_ms||100,phase:fr.phase||'',
  joints:Object.fromEntries(KEYS.filter(j=>fr.joints[j]).map(j=>[j,[+((fr.joints[j].position[0]-x0)*k).toFixed(1),+((fr.joints[j].position[1]-y0)*k).toFixed(1),+(fr.joints[j].depth??0).toFixed(1)]]))}));
 for(let i=0;i<F.length;i++){const g=figs[i].replace(/<ellipse [^>]*fill="#0a0f15"\/>/,'');
  await pg.setContent(`<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${w}" width="512" height="512"><rect x="${x0}" y="${y0}" width="${w}" height="${w}" fill="#fff"/>${g}</svg></body></html>`);
  await pg.screenshot({path:path.join(dir,String(i).padStart(2,'0')+'.png')})}
 fs.writeFileSync(path.join(OUT,name,'motion.json'),JSON.stringify({char:c,motion:m,view:v,label:lib[m].meta.label,loop:!!lib[m].meta.loop,frames},null,1));
 console.log(name,F.length);
}
await b.close();
