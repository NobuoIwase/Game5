// Renders the attack reference poses (motion/attack.mjs) as SVG mannequins and writes the joint
// data next to poses.json.
//   node tools/render_attack_svg.mjs
// Output: motion/attack-poses.json and references/attack-v1/*.svg
// Colours follow generic/ : blue = her anatomical RIGHT (sword arm), orange = her LEFT (shield).
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {library,DIRECTIONS} from '../motion/attack.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'references','attack-v1');
fs.mkdirSync(OUT,{recursive:true});
const lib=library();
fs.writeFileSync(path.join(ROOT,'motion','attack-poses.json'),JSON.stringify(lib));
const LABEL={front:'正面',down_right:'右斜め前',right:'右',up_right:'右斜め後ろ',back:'後ろ',up_left:'左斜め後ろ',left:'左',down_left:'左斜め前'};
const COL={right:'#2f6fd6',left:'#e8912d',trunk:'#8e93a3',head:'#cfd5df',line:'#1b1d24'};
const f=n=>(+n).toFixed(1);
function figure(J,opt={}){  // J: projected joints of one frame
 const P=id=>J[id].position,D=id=>J[id].depth,items=[];
 const seg=(a,b,w,col)=>items.push({d:(D(a)+D(b))/2,svg:`<line x1="${f(P(a)[0])}" y1="${f(P(a)[1])}" x2="${f(P(b)[0])}" y2="${f(P(b)[1])}" stroke="${COL.line}" stroke-width="${w+2}" stroke-linecap="round"/><line x1="${f(P(a)[0])}" y1="${f(P(a)[1])}" x2="${f(P(b)[0])}" y2="${f(P(b)[1])}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`});
 for(const s of ['right','left']){const c=COL[s];
  seg('hip_'+s,'knee_'+s,9,c);seg('knee_'+s,'ankle_'+s,7,c);seg('ankle_'+s,'toe_'+s,5,c);
  seg('shoulder_'+s,'elbow_'+s,6.5,c);seg('elbow_'+s,'wrist_'+s,5.5,c);seg('wrist_'+s,'hand_'+s,5,c);}
 const tp=['shoulder_right','shoulder_left','hip_left','hip_right'].map(id=>P(id).map(f).join(',')).join(' ');
 items.push({d:D('thorax')-.01,svg:`<polygon points="${tp}" fill="${COL.trunk}" stroke="${COL.line}" stroke-width="2" stroke-linejoin="round"/>`});
 seg('thorax','neck',5,COL.trunk);
 items.push({d:D('head'),svg:`<circle cx="${f(P('head')[0])}" cy="${f(P('head')[1])}" r="13" fill="${COL.head}" stroke="${COL.line}" stroke-width="2"/>`});
 // sword: blade from the hand to the tip; shield: a disc on the left forearm
 items.push({d:(D('hand_right')+D('sword_tip'))/2+.5,svg:`<line x1="${f(P('hand_right')[0])}" y1="${f(P('hand_right')[1])}" x2="${f(P('sword_tip')[0])}" y2="${f(P('sword_tip')[1])}" stroke="#333" stroke-width="4.5" stroke-linecap="round"/><line x1="${f(P('hand_right')[0])}" y1="${f(P('hand_right')[1])}" x2="${f(P('sword_tip')[0])}" y2="${f(P('sword_tip')[1])}" stroke="#e8eef5" stroke-width="2.5" stroke-linecap="round"/>`});
 // the shield: an ellipse through its rim as seen from this side. Its face (bronze, boss and blue
 // cross, as on her shield in the game) when it looks toward the viewer, else its back (dark,
 // with the arm strap along her forearm). It rides on the OUTSIDE of the left forearm, so the face
 // side is drawn over the forearm and the back side under it.
 if(J.shield_r0){const rim=[0,1,2,3,4,5,6,7].map(q=>P('shield_r'+q)),face=D('shield_face')>D('shield'),c=P('shield'),pts=rim.map(p=>p.map(f).join(',')).join(' ');
  const mid=(a,b,k)=>[c[0]+(P(a)[0]-c[0])*k,c[1]+(P(a)[1]-c[1])*k,c[0]+(P(b)[0]-c[0])*k,c[1]+(P(b)[1]-c[1])*k];
  // body of the shield: hull of the face rim and the back rim (so it has a thickness edge-on)
  const all=[...rim,...[0,1,2,3,4,5,6,7].map(q=>P('shield_b'+q))],hull=((pts)=>{pts=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}for(const p of pts.reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}return lo.slice(0,-1).concat(up.slice(0,-1))})(all);
  // how squarely the face looks at the viewer: 0 edge-on .. 1 full face
  const fr=Math.min(1,Math.abs(D('shield_face')-D('shield'))/6);
  let g=`<polygon points="${hull.map(p=>p.map(f).join(',')).join(' ')}" fill="#6b5234" stroke="${COL.line}" stroke-width="2" stroke-linejoin="round"/>`+
   `<polygon points="${pts}" fill="${face?'#b98a4a':'#4a3a28'}" stroke="${COL.line}" stroke-width="1.5" stroke-linejoin="round"/>`;
  if(face&&fr>.35){const x=mid('shield_r0','shield_r4',.72),y=mid('shield_r2','shield_r6',.72),bf=P('shield_face');
   g+=`<line x1="${f(x[0])}" y1="${f(x[1])}" x2="${f(x[2])}" y2="${f(x[3])}" stroke="#2f5fae" stroke-width="3" stroke-linecap="round"/><line x1="${f(y[0])}" y1="${f(y[1])}" x2="${f(y[2])}" y2="${f(y[3])}" stroke="#2f5fae" stroke-width="3" stroke-linecap="round"/><circle cx="${f((c[0]+bf[0])/2)}" cy="${f((c[1]+bf[1])/2)}" r="2.6" fill="#e8d7a8" stroke="${COL.line}" stroke-width="1"/>`}
  else if(!face&&fr>.35)g+=`<line x1="${f(P('strap_a')[0])}" y1="${f(P('strap_a')[1])}" x2="${f(P('strap_b')[0])}" y2="${f(P('strap_b')[1])}" stroke="#8a6a44" stroke-width="3.5" stroke-linecap="round"/>`;
  items.push({d:D('shield')+(face?.6:-.6),svg:g})}
 else items.push({d:D('shield')+.3,svg:`<circle cx="${f(P('shield')[0])}" cy="${f(P('shield')[1])}" r="10" fill="#9a7440" stroke="${COL.line}" stroke-width="2" opacity=".92"/>`});
 // the cross-guard, across the blade at the hand
 if(J.guard_a)items.push({d:D('hand_right')+.55,svg:`<line x1="${f(P('guard_a')[0])}" y1="${f(P('guard_a')[1])}" x2="${f(P('guard_b')[0])}" y2="${f(P('guard_b')[1])}" stroke="#333" stroke-width="3" stroke-linecap="round"/>`});
 items.sort((a,b)=>a.d-b.d);
 const shadow=`<ellipse cx="${f(P('root')[0])}" cy="242" rx="26" ry="6" fill="#000" opacity=".18"/>`;
 return shadow+items.map(i=>i.svg).join('');
}
const frameOf=(m,d,i)=>lib.poses[m][d][i];
function sheet(m){
 const N=lib.poses[m].front.length,cw=288,ch=288,pad=26,lw=90,W=lw+N*cw,H=pad+DIRECTIONS.length*ch;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W/2}" height="${H/2}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#f4f1ea"/>`;
 const meta=lib.motions[m];
 for(let i=0;i<N;i++)s+=`<text x="${lw+i*cw+cw/2}" y="18" font-size="15" text-anchor="middle" fill="${i===meta.hit_frame?'#c0392b':'#333'}">${i}${i===meta.hit_frame?' 命中':''} · ${meta.frame_ms[i]}ms</text>`;
 DIRECTIONS.forEach((d,r)=>{s+=`<text x="8" y="${pad+r*ch+ch/2}" font-size="16" fill="#333">${LABEL[d]}</text><text x="8" y="${pad+r*ch+ch/2+18}" font-size="12" fill="#777">${d}</text>`;
  for(let i=0;i<N;i++)s+=`<g transform="translate(${lw+i*cw},${pad+r*ch})"><rect width="${cw}" height="${ch}" fill="${i===meta.hit_frame?'#fbe9e7':'none'}" stroke="#d8d2c4"/><line x1="0" x2="${cw}" y1="242" y2="242" stroke="#bbb"/>${figure(frameOf(m,d,i).joints)}</g>`});
 return s+'</svg>';
}
function keys(m,d='right'){
 const N=lib.poses[m][d].length,cw=288,ch=288,W=N*cw,H=ch+150;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W*.75}" height="${H*.75}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#f4f1ea"/>`;
 // the path of the blade tip across the whole motion, on every cell
 const tips=lib.poses[m][d].map(p=>p.joints.sword_tip.position);
 for(let i=0;i<N;i++){const fr=frameOf(m,d,i);
  s+=`<g transform="translate(${i*cw},0)"><rect width="${cw}" height="${ch}" fill="${i===lib.motions[m].hit_frame?'#fbe9e7':'none'}" stroke="#d8d2c4"/><line x1="0" x2="${cw}" y1="242" y2="242" stroke="#bbb"/>`+
   `<polyline points="${tips.map(t=>t.map(f).join(',')).join(' ')}" fill="none" stroke="#c0392b" stroke-width="1" stroke-dasharray="3 3" opacity=".5"/>`+
   `<circle cx="${f(tips[i][0])}" cy="${f(tips[i][1])}" r="3" fill="#c0392b"/>${figure(fr.joints)}</g>`;
  const ph=fr.phase.split(' '),j=ph.shift();
  s+=`<text x="${i*cw+8}" y="${ch+22}" font-size="16" font-weight="700" fill="#333">${i}. ${j}</text><foreignObject x="${i*cw+6}" y="${ch+30}" width="${cw-12}" height="110"><div xmlns="http://www.w3.org/1999/xhtml" style="font:12px sans-serif;color:#555;line-height:1.35">${ph.join(' ')}<br/>${fr.frame_ms}ms</div></foreignObject>`;
 }
 return s+'</svg>';
}
function preview(m){
 const N=lib.poses[m].front.length,ms=lib.motions[m].frame_ms,tot=ms.reduce((a,b)=>a+b,0),cw=288,ch=288,W=cw*4,H=ch*2+20;
 let t=0;const kt=ms.map(x=>{const a=t/tot;t+=x;return a});
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#f4f1ea"/>`;
 DIRECTIONS.forEach((d,r)=>{const x=(r%4)*cw,y=Math.floor(r/4)*(ch+10);s+=`<g transform="translate(${x},${y})"><line x1="0" x2="${cw}" y1="242" y2="242" stroke="#bbb"/><text x="6" y="16" font-size="13" fill="#555">${LABEL[d]}</text>`;
  for(let i=0;i<N;i++){const vals=ms.map((_,k)=>k===i?'inline':'none').join(';');
   s+=`<g display="${i===0?'inline':'none'}">${figure(frameOf(m,d,i).joints)}<animate attributeName="display" values="${vals}" keyTimes="${kt.map(v=>v.toFixed(4)).join(';')}" calcMode="discrete" dur="${tot}ms" repeatCount="indefinite"/></g>`}
  s+='</g>'});
 return s+'</svg>';
}
for(const m of Object.keys(lib.poses)){
 fs.writeFileSync(path.join(OUT,`${m}_sheet.svg`),sheet(m));
 fs.writeFileSync(path.join(OUT,`${m}_keys_right.svg`),keys(m,'right'));
 fs.writeFileSync(path.join(OUT,`${m}_keys_down_right.svg`),keys(m,'down_right'));
 fs.writeFileSync(path.join(OUT,`${m}_preview.svg`),preview(m));
}
console.log('wrote',fs.readdirSync(OUT).filter(x=>x.endsWith('.svg')).length,'svg files and motion/attack-poses.json');
