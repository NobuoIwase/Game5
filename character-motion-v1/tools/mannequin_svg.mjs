// Shared SVG mannequin drawing for the motion references (attack / restraint).
// Colours follow generic/ : blue = her anatomical RIGHT, orange = her LEFT.
// Drawn when present: sword (blade + cross-guard), shield (a thick disc on the outer left
// forearm: face / edge / back), restraints (purple tentacles and bands), and which way the head
// faces (eyes when the face is toward the viewer, hair when it is turned away).
export const LABEL={front:'正面',down_right:'右斜め前',right:'右',up_right:'右斜め後ろ',back:'後ろ',up_left:'左斜め後ろ',left:'左',down_left:'左斜め前'};
const COL={right:'#2f6fd6',left:'#e8912d',trunk:'#8e93a3',head:'#cfd5df',line:'#1b1d24',tent:'#9b4fc0',tentDark:'#4a1f63'};
const f=n=>(+n).toFixed(1);
function hull(pts){pts=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}for(const p of pts.reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}return lo.slice(0,-1).concat(up.slice(0,-1))}
export function figure(J,binds=[]){
 const P=id=>J[id].position,D=id=>J[id].depth,items=[];
 const seg=(a,b,w,col)=>items.push({d:(D(a)+D(b))/2,svg:`<line x1="${f(P(a)[0])}" y1="${f(P(a)[1])}" x2="${f(P(b)[0])}" y2="${f(P(b)[1])}" stroke="${COL.line}" stroke-width="${w+2}" stroke-linecap="round"/><line x1="${f(P(a)[0])}" y1="${f(P(a)[1])}" x2="${f(P(b)[0])}" y2="${f(P(b)[1])}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`});
 for(const s of ['right','left']){const c=COL[s];
  seg('hip_'+s,'knee_'+s,9,c);seg('knee_'+s,'ankle_'+s,7,c);seg('ankle_'+s,'toe_'+s,5,c);
  seg('shoulder_'+s,'elbow_'+s,6.5,c);seg('elbow_'+s,'wrist_'+s,5.5,c);seg('wrist_'+s,'hand_'+s,5,c);}
 const tp=['shoulder_right','shoulder_left','hip_left','hip_right'].map(id=>P(id).map(f).join(',')).join(' ');
 items.push({d:D('thorax')-.01,svg:`<polygon points="${tp}" fill="${COL.trunk}" stroke="${COL.line}" stroke-width="2" stroke-linejoin="round"/>`});
 seg('thorax','neck',5,COL.trunk);
 // the head, and which way it faces
 {const h=P('head');let g=`<circle cx="${f(h[0])}" cy="${f(h[1])}" r="13" fill="${COL.head}" stroke="${COL.line}" stroke-width="2"/>`;
  if(J.face){const fc=P('face'),dx=fc[0]-h[0],dy=fc[1]-h[1],dd=D('face')-D('head'),toward=dd>0,r=Math.hypot(dx,dy);
   if(Math.abs(dd)<4.5&&r>4){g+=`<circle cx="${f(h[0]+dx*.85)}" cy="${f(h[1]+dy*.85-1)}" r="1.9" fill="${COL.line}"/>`}   // profile: one eye on the side she looks to
   else if(toward){const ex=h[0]+dx*.75,ey=h[1]+dy*.75,px=-dy/(r||1)*4,py=dx/(r||1)*4;   // two eyes across the look direction
    g+=`<circle cx="${f(ex+px)}" cy="${f(ey+py-1)}" r="1.9" fill="${COL.line}"/><circle cx="${f(ex-px)}" cy="${f(ey-py-1)}" r="1.9" fill="${COL.line}"/>`}
   else g+=`<path d="M${f(h[0]-11)},${f(h[1]-2)} Q${f(h[0])},${f(h[1]-17)} ${f(h[0]+11)},${f(h[1]-2)} Q${f(h[0])},${f(h[1]+6)} ${f(h[0]-11)},${f(h[1]-2)}Z" fill="#7a6a5a" opacity=".55"/>`}   // hair: the back of her head
  items.push({d:D('head'),svg:g})}
 if(J.sword_tip){
  items.push({d:(D('hand_right')+D('sword_tip'))/2+.5,svg:`<line x1="${f(P('hand_right')[0])}" y1="${f(P('hand_right')[1])}" x2="${f(P('sword_tip')[0])}" y2="${f(P('sword_tip')[1])}" stroke="#333" stroke-width="4.5" stroke-linecap="round"/><line x1="${f(P('hand_right')[0])}" y1="${f(P('hand_right')[1])}" x2="${f(P('sword_tip')[0])}" y2="${f(P('sword_tip')[1])}" stroke="#e8eef5" stroke-width="2.5" stroke-linecap="round"/>`});
  if(J.guard_a)items.push({d:D('hand_right')+.55,svg:`<line x1="${f(P('guard_a')[0])}" y1="${f(P('guard_a')[1])}" x2="${f(P('guard_b')[0])}" y2="${f(P('guard_b')[1])}" stroke="#333" stroke-width="3" stroke-linecap="round"/>`});
 }
 // the shield: an ellipse through its rim as seen from this side - its face (bronze, boss, blue
 // cross) when it looks toward the viewer, else its back (dark, arm strap); a thick edge edge-on
 if(J.shield_r0){const rim=[0,1,2,3,4,5,6,7].map(q=>P('shield_r'+q)),face=D('shield_face')>D('shield'),c=P('shield'),pts=rim.map(p=>p.map(f).join(',')).join(' ');
  const mid=(a,b,k)=>[c[0]+(P(a)[0]-c[0])*k,c[1]+(P(a)[1]-c[1])*k,c[0]+(P(b)[0]-c[0])*k,c[1]+(P(b)[1]-c[1])*k];
  const all=[...rim,...[0,1,2,3,4,5,6,7].map(q=>P('shield_b'+q))],fr=Math.min(1,Math.abs(D('shield_face')-D('shield'))/6);
  let g=`<polygon points="${hull(all).map(p=>p.map(f).join(',')).join(' ')}" fill="#6b5234" stroke="${COL.line}" stroke-width="2" stroke-linejoin="round"/>`+
   `<polygon points="${pts}" fill="${face?'#b98a4a':'#4a3a28'}" stroke="${COL.line}" stroke-width="1.5" stroke-linejoin="round"/>`;
  if(face&&fr>.35){const x=mid('shield_r0','shield_r4',.72),y=mid('shield_r2','shield_r6',.72),bf=P('shield_face');
   g+=`<line x1="${f(x[0])}" y1="${f(x[1])}" x2="${f(x[2])}" y2="${f(x[3])}" stroke="#2f5fae" stroke-width="3" stroke-linecap="round"/><line x1="${f(y[0])}" y1="${f(y[1])}" x2="${f(y[2])}" y2="${f(y[3])}" stroke="#2f5fae" stroke-width="3" stroke-linecap="round"/><circle cx="${f((c[0]+bf[0])/2)}" cy="${f((c[1]+bf[1])/2)}" r="2.6" fill="#e8d7a8" stroke="${COL.line}" stroke-width="1"/>`}
  else if(!face&&fr>.35)g+=`<line x1="${f(P('strap_a')[0])}" y1="${f(P('strap_a')[1])}" x2="${f(P('strap_b')[0])}" y2="${f(P('strap_b')[1])}" stroke="#8a6a44" stroke-width="3.5" stroke-linecap="round"/>`;
  items.push({d:D('shield')+(face?.6:-.6),svg:g})}
 // restraints: tentacles from an anchor to a joint (with a coil round it), bands between two
 // joints, and a tentacle running from one anchor through a point to another
 const tube=(pts,d)=>{const p=pts.map(x=>x.map(f).join(','));let path=`M${p[0]}`;
  if(pts.length===2){const [a,b]=pts,mx=(a[0]+b[0])/2+(b[1]-a[1])*.12,my=(a[1]+b[1])/2-(b[0]-a[0])*.12;path+=` Q${f(mx)},${f(my)} ${p[1]}`}
  else path+=` Q${p[1]} ${p[2]}`;
  items.push({d,svg:`<path d="${path}" fill="none" stroke="${COL.tentDark}" stroke-width="6.5" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${COL.tent}" stroke-width="4" stroke-linecap="round"/>`})};
 const coil=(id)=>{const p=P(id);items.push({d:D(id)+.4,svg:`<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="5.5" ry="3.2" fill="none" stroke="${COL.tentDark}" stroke-width="3.5"/><ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="5.5" ry="3.2" fill="none" stroke="${COL.tent}" stroke-width="2"/>`})};
 for(const b of binds){
  if(b.joint2){tube([P(b.joint),P(b.joint2)],(D(b.joint)+D(b.joint2))/2+.3);coil(b.joint);coil(b.joint2);continue}
  if(b.via&&b.anchor2){const a=P(b.anchor),v=P(b.via),c=P(b.anchor2);   // through: two curves meeting under the joint
   tube([a,[(a[0]+v[0])/2,v[1]+2],v],D(b.via)+.2);tube([v,[(v[0]+c[0])/2,v[1]+2],c],D(b.via)-.2);continue}
  if(b.via){tube([P(b.anchor),[(P(b.anchor)[0]+P(b.via)[0])/2,P(b.via)[1]+10],P(b.via)],D(b.via)+.1);continue}
  if(b.anchor){tube([P(b.anchor),P(b.joint)],D(b.joint)-.2);coil(b.joint)}
 }
 items.sort((a,b)=>a.d-b.d);
 return `<ellipse cx="${f(P('root')[0])}" cy="242" rx="26" ry="6" fill="#000" opacity=".18"/>`+items.map(i=>i.svg).join('');
}
/* sheet: rows = directions, columns = frames */
export function sheet(lib,m,dirs,{mark}={}){
 const P=lib.poses[m],N=P[dirs[0]].length,cw=288,ch=288,pad=26,lw=90,W=lw+N*cw,H=pad+dirs.length*ch,meta=lib.motions[m],hit=mark??meta.hit_frame;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W/2}" height="${H/2}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#f4f1ea"/>`;
 for(let i=0;i<N;i++)s+=`<text x="${lw+i*cw+cw/2}" y="18" font-size="15" text-anchor="middle" fill="${i===hit?'#c0392b':'#333'}">${i}${i===hit?' 命中':''} · ${meta.frame_ms[i]}ms</text>`;
 dirs.forEach((d,r)=>{s+=`<text x="8" y="${pad+r*ch+ch/2}" font-size="16" fill="#333">${LABEL[d]}</text><text x="8" y="${pad+r*ch+ch/2+18}" font-size="12" fill="#777">${d}</text>`;
  for(let i=0;i<N;i++){const fr=P[d][i];s+=`<g transform="translate(${lw+i*cw},${pad+r*ch})"><rect width="${cw}" height="${ch}" fill="${i===hit?'#fbe9e7':'none'}" stroke="#d8d2c4"/><line x1="0" x2="${cw}" y1="242" y2="242" stroke="#bbb"/>${figure(fr.joints,fr.binds)}</g>`}});
 return s+'</svg>';
}
/* keys: one direction, big, with each frame's intent written under it and the path of one joint
   (the blade tip, or the hips) drawn over every cell */
export function keys(lib,m,d,{trail='sword_tip',mark}={}){
 const F=lib.poses[m][d],N=F.length,cw=288,ch=288,W=N*cw,H=ch+150,hit=mark??lib.motions[m].hit_frame;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W*.75}" height="${H*.75}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#f4f1ea"/>`;
 const tr=F[0].joints[trail]?F.map(p=>p.joints[trail].position):null;
 for(let i=0;i<N;i++){const fr=F[i];
  s+=`<g transform="translate(${i*cw},0)"><rect width="${cw}" height="${ch}" fill="${i===hit?'#fbe9e7':'none'}" stroke="#d8d2c4"/><line x1="0" x2="${cw}" y1="242" y2="242" stroke="#bbb"/>`+
   (tr?`<polyline points="${tr.map(t=>t.map(f).join(',')).join(' ')}" fill="none" stroke="#c0392b" stroke-width="1" stroke-dasharray="3 3" opacity=".5"/><circle cx="${f(tr[i][0])}" cy="${f(tr[i][1])}" r="3" fill="#c0392b"/>`:'')+
   `${figure(fr.joints,fr.binds)}</g>`;
  const ph=(fr.phase||'').split(' '),j=ph.shift();
  s+=`<text x="${i*cw+8}" y="${ch+22}" font-size="16" font-weight="700" fill="#333">${i}. ${j}</text><foreignObject x="${i*cw+6}" y="${ch+30}" width="${cw-12}" height="110"><div xmlns="http://www.w3.org/1999/xhtml" style="font:12px sans-serif;color:#555;line-height:1.35">${ph.join(' ')}<br/>${fr.frame_ms}ms</div></foreignObject>`;
 }
 return s+'</svg>';
}
/* preview: the given directions side by side, animated (SMIL) with the frame timings */
export function preview(lib,m,dirs,cols=4){
 const P=lib.poses[m],N=P[dirs[0]].length,ms=lib.motions[m].frame_ms,tot=ms.reduce((a,b)=>a+b,0),cw=288,ch=288,rows=Math.ceil(dirs.length/cols),W=cw*Math.min(cols,dirs.length),H=(ch+10)*rows;
 let t=0;const kt=ms.map(x=>{const a=t/tot;t+=x;return a});
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#f4f1ea"/>`;
 dirs.forEach((d,r)=>{const x=(r%cols)*cw,y=Math.floor(r/cols)*(ch+10);s+=`<g transform="translate(${x},${y})"><line x1="0" x2="${cw}" y1="242" y2="242" stroke="#bbb"/><text x="6" y="16" font-size="13" fill="#555">${LABEL[d]}</text>`;
  for(let i=0;i<N;i++){const vals=ms.map((_,k)=>k===i?'inline':'none').join(';'),fr=P[d][i];
   s+=`<g display="${i===0?'inline':'none'}">${figure(fr.joints,fr.binds)}<animate attributeName="display" values="${vals}" keyTimes="${kt.map(v=>v.toFixed(4)).join(';')}" calcMode="discrete" dur="${tot}ms" repeatCount="indefinite"/></g>`}
  s+='</g>'});
 return s+'</svg>';
}
