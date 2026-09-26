// Shared SVG mannequin drawing for the motion references, in the look of the plain generic body
// (generic/render.py): big oval head with a face / profile / hair line, grey trunk along the
// spine with a pelvis, sky-blue RIGHT limbs and amber LEFT limbs with white knee dots, a
// dark-blue pauldron mark on the right shoulder, on a dark grid.
// Also drawn when present: sword and shield (attack references), restraints (violet lines and
// bands), small creatures clinging to the body (pink); what is behind the trunk stays hidden.
export const LABEL={front:'正面',down_right:'右斜め前',right:'右',up_right:'右斜め後ろ',back:'後ろ',up_left:'左斜め後ろ',left:'左',down_left:'左斜め前'};
const C={out:'#182230',right:'#5ab6f0',left:'#ee9d5a',body:'#b6c2cc',pelvis:'#637487',head:'#d2dbe1',knee:'#e1e8ec',pauldron:'#246a9e',hair:'#9fb0bd',
 bind:'#b36be0',bindOut:'#3a1650',creature:'#e07aa8',wing:'rgba(230,240,255,.65)',bg:'#19202a',grid:'#222b37',text:'#c4d2df',sub:'#8797a6',hit:'#3a2430'};
const f=n=>(+n).toFixed(1);
function hull(pts){pts=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}for(const p of pts.reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}return lo.slice(0,-1).concat(up.slice(0,-1))}
export function figure(J,binds=[],yaw=0,expr='',memo=null){   // expr: 'shut' closes the eyes; 'o' opens the mouth, 'line' presses it shut
 // memo: carried from frame to frame of one view, so a part at the trunk's edge keeps the side it was on (see place)
 const P=id=>J[id].position,D=id=>J[id].depth,W=id=>J[id].world,items=[];
 const yr=yaw*Math.PI/180,cy=Math.cos(yr),sy=Math.sin(yr),proj=w=>[144+cy*w[0]+sy*w[2],w[1]+.18*(cy*w[2]-sy*w[0])],dep=w=>cy*w[2]-sy*w[0];
 const sb=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],ad=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],ml=(a,k)=>a.map(v=>v*k),nm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
 const cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dt=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 // the trunk's facing (forward = up x right), and whether it faces the viewer
 const fwd=nm(cr(sb(W('neck'),W('root')),sb(W('shoulder_left'),W('shoulder_right')))),faces=dep(fwd)>0,TD=D('thorax');
 const side=w=>dt(sb(w,W('thorax')),fwd);   // + in front of the trunk, - behind it
 // over or under the trunk: the trunk is taken as an elliptic cylinder round the spine (root to neck), 11 wide
 // and 7 deep each side. A point goes over it when it lies on the viewer's side of that cylinder (scaled to a
 // circle), so an arm behind the back, or on the far side of a turned body, goes under it. Arms need a small
 // margin to go under (they hang at the sides), legs a clear one to come over (they start inside the pelvis).
 const TA=11,TB=7,V=[-sy,0,cy],up=nm(sb(W('neck'),W('root'))),fz=nm(sb(fwd,ml(up,dt(fwd,up)))),lx=cr(up,fz),vx=dt(V,lx),vz=dt(V,fz);
 const spineDD=w=>{const a=W('root'),ab=sb(W('neck'),a),t=Math.max(0,Math.min(1,dt(sb(w,a),ab)/(dt(ab,ab)||1))),q=sb(w,ad(a,ml(ab,t)));
  return (dt(q,lx)*vx/(TA*TA)+dt(q,fz)*vz/(TB*TB))*TB*TB};
 // memo gives it hysteresis: a part that was over the trunk in the last frame stays over it until it is 2.5 px
 // clearly past the edge, and the same the other way, so it does not flicker while it grazes the edge
 const place=(d,w,need=-1.5,id)=>{if(!w)return d;const dd=spineDD(w),th=memo&&id&&id in memo?need+(memo[id]?-2.5:2.5):need,over=dd>th;if(memo&&id)memo[id]=over;
  return over?TD+1+.01*Math.min(40,Math.max(0,dd)):TD-1-.01*Math.min(40,Math.max(0,-dd))};
 const mid=(a,b)=>ml(ad(W(a),W(b)),.5),isArm=/shoulder|elbow|wrist|hand/;
 const line=(a,b,w,col)=>`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${C.out}" stroke-width="${w+3}" stroke-linecap="round"/><line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
 const ell=(p,rx,ry,fill,sw=2)=>`<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${C.out}" stroke-width="${sw}"/>`;
 const seg=(a,b,w,col)=>items.push({id:a+'>'+b,w:[W(a),W(b)],p:[P(a),P(b)],d:place((D(a)+D(b))/2,/^shoulder/.test(a)?W(b):mid(a,b),isArm.test(a)?-1.5:4,a+'>'+b),svg:line(P(a),P(b),w,col)});
 for(const s of ['right','left']){const c=C[s];
  seg('hip_'+s,'knee_'+s,9,c);seg('knee_'+s,'ankle_'+s,7,c);
  {const a=P('ankle_'+s);items.push({id:'foot_'+s,w:[W('ankle_'+s),W('toe_'+s)],p:[P('ankle_'+s),P('toe_'+s)],d:place((D('ankle_'+s)+D('toe_'+s))/2,mid('ankle_'+s,'toe_'+s),4,'foot_'+s),svg:line([a[0],a[1]+2],P('toe_'+s),7,c)})}
  items.push({id:'kneedot_'+s,w:[W('knee_'+s)],p:[P('knee_'+s)],d:place(D('knee_'+s),W('knee_'+s),4,'kneedot_'+s)+.02,svg:ell(P('knee_'+s),4,4,C.knee,1.5)});
  seg('shoulder_'+s,'elbow_'+s,7,c);seg('elbow_'+s,'wrist_'+s,6,c);
  items.push({id:'wrist_'+s,w:[W('wrist_'+s)],p:[P('wrist_'+s)],d:place(D('wrist_'+s)+.02,W('wrist_'+s),-1.5,'wrist_'+s),svg:ell(P('wrist_'+s),4,5,c,1.5)});
 }
 // the trunk, along the spine (so it can also lie down), and the pelvis
 {const t=P('thorax'),r=P('root'),v=[t[0]-r[0],t[1]-r[1]],l=Math.hypot(...v)||1,u=[v[0]/l,v[1]/l],n=[-u[1],u[0]];
  const shs=Math.hypot(P('shoulder_left')[0]-P('shoulder_right')[0],P('shoulder_left')[1]-P('shoulder_right')[1]),top=[t[0]+u[0]*10,t[1]+u[1]*10];
  const ht=Math.max(8,shs/2+1.5),hb=Math.max(6,ht-4),q=[[top[0]+n[0]*ht,top[1]+n[1]*ht],[top[0]-n[0]*ht,top[1]-n[1]*ht],[r[0]-n[0]*hb,r[1]-n[1]*hb],[r[0]+n[0]*hb,r[1]+n[1]*hb]];
  figure.trunk=q.concat();items.push({id:'trunk',d:TD-.01,svg:`<polygon points="${q.map(p=>p.map(f).join(',')).join(' ')}" fill="${C.body}" stroke="${C.out}" stroke-width="2" stroke-linejoin="round"/>`+ell(r,10,7,C.pelvis)});
  items.push({d:TD-.02,svg:line(P('neck'),t,7,C.body)});
  const sp=P('shoulder_right');items.push({d:place(D('shoulder_right')+.03,W('shoulder_right')),svg:`<polygon points="${[[0,-6],[5,-1.5],[3,4.5],[-4,3],[-5,-1.5]].map(([x,y])=>f(sp[0]+x)+','+f(sp[1]+y)).join(' ')}" fill="${C.pauldron}" stroke="${C.out}" stroke-width="1.2"/>`});
 }
 // the head: a face (eyes, mouth) toward the viewer, a profile (eye, nose) side on, hair from behind.
 // The features sit on the head's own axes, so a tipped-back head keeps them in place.
 {const h=P('head'),hw=W('head');let g=ell(h,21,24,C.head);
  if(J.face&&J.eye_left){const fw=nm(sb(W('face'),hw)),lat=nm(sb(W('eye_left'),W('eye_right'))),fd=dep(fw),up=nm(cr(lat,fw));
   const at=(a,b=0,c=0)=>proj(ad(ad(ad(hw,ml(fw,a)),ml(lat,b)),ml(up,c)));
   if(fd>.3){const shut=/shut/.test(expr);
    for(const k of [-1,1]){const e=at(14,7*k,1);if(shut){const a=at(14,7*k-2.5,1),b=at(14,7*k+2.5,1),c=at(14,7*k,-.6);g+=`<path d="M${f(a[0])},${f(a[1])} Q${f(c[0])},${f(c[1])} ${f(b[0])},${f(b[1])}" fill="none" stroke="${C.out}" stroke-width="1.4"/>`}else g+=`<ellipse cx="${f(e[0])}" cy="${f(e[1])}" rx="1.8" ry="2.2" fill="${C.out}"/>`}
    if(/(^|-)o($|-)/.test(expr)){const mc=at(15,0,-7);g+=`<ellipse cx="${f(mc[0])}" cy="${f(mc[1])}" rx="2.6" ry="3.2" fill="#7a3b4a" stroke="${C.out}" stroke-width="1"/>`}
    else if(/line/.test(expr)){const m0=at(15,-3.5,-6.5),m1=at(15,3.5,-6.5);g+=`<line x1="${f(m0[0])}" y1="${f(m0[1])}" x2="${f(m1[0])}" y2="${f(m1[1])}" stroke="${C.out}" stroke-width="1.4"/>`}
    else{const m0=at(15,-3.5,-6),m1=at(15,3.5,-6),mc=at(15,0,-8);g+=`<path d="M${f(m0[0])},${f(m0[1])} Q${f(mc[0])},${f(mc[1])} ${f(m1[0])},${f(m1[1])}" fill="none" stroke="${C.out}" stroke-width="1.2"/>`}}
   else if(fd>-.3){const e=at(15,0,2),n0=at(19,0,1),n1=at(25,0,-3),n2=at(19,0,-6);
    g+=`<ellipse cx="${f(e[0])}" cy="${f(e[1])}" rx="1.7" ry="2" fill="${C.out}"/><polygon points="${[n0,n1,n2].map(p=>p.map(f).join(',')).join(' ')}" fill="${C.head}" stroke="${C.out}" stroke-width="1"/>`}
   else{const a=at(-6,-11,6),b=at(-6,11,6),c=at(-8,0,20);g+=`<path d="M${f(a[0])},${f(a[1])} Q${f(c[0])},${f(c[1])} ${f(b[0])},${f(b[1])}" fill="none" stroke="${C.hair}" stroke-width="2"/>`}}
  items.push({d:faces?Math.max(D('head')+1.5,TD+.1):D('head')+1.5,svg:g})}   // over the neck and trunk when she faces the viewer, even with the head thrown back
 if(J.sword_tip){
  items.push({d:place((D('hand_right')+D('sword_tip'))/2+.5,mid('hand_right','sword_tip')),svg:line(P('hand_right'),P('sword_tip'),2.5,'#e8eef5')});
  if(J.guard_a)items.push({d:D('hand_right')+.55,svg:line(P('guard_a'),P('guard_b'),2,'#8a8f99')});
 }
 if(J.shield_r0){const rim=[0,1,2,3,4,5,6,7].map(q=>P('shield_r'+q)),face=D('shield_face')>D('shield'),c=P('shield'),pts=rim.map(p=>p.map(f).join(',')).join(' ');
  const md=(a,b,k)=>[c[0]+(P(a)[0]-c[0])*k,c[1]+(P(a)[1]-c[1])*k,c[0]+(P(b)[0]-c[0])*k,c[1]+(P(b)[1]-c[1])*k];
  const all=[...rim,...[0,1,2,3,4,5,6,7].map(q=>P('shield_b'+q))],fr=Math.min(1,Math.abs(D('shield_face')-D('shield'))/6);
  let g=`<polygon points="${hull(all).map(p=>p.map(f).join(',')).join(' ')}" fill="#6b5234" stroke="${C.out}" stroke-width="2" stroke-linejoin="round"/><polygon points="${pts}" fill="${face?'#b98a4a':'#4a3a28'}" stroke="${C.out}" stroke-width="1.5" stroke-linejoin="round"/>`;
  if(face&&fr>.35){const x=md('shield_r0','shield_r4',.72),y=md('shield_r2','shield_r6',.72),bf=P('shield_face');
   g+=`<line x1="${f(x[0])}" y1="${f(x[1])}" x2="${f(x[2])}" y2="${f(x[3])}" stroke="#2f5fae" stroke-width="3" stroke-linecap="round"/><line x1="${f(y[0])}" y1="${f(y[1])}" x2="${f(y[2])}" y2="${f(y[3])}" stroke="#2f5fae" stroke-width="3" stroke-linecap="round"/><circle cx="${f((c[0]+bf[0])/2)}" cy="${f((c[1]+bf[1])/2)}" r="2.6" fill="#e8d7a8" stroke="${C.out}" stroke-width="1"/>`}
  else if(!face&&fr>.35)g+=`<line x1="${f(P('strap_a')[0])}" y1="${f(P('strap_a')[1])}" x2="${f(P('strap_b')[0])}" y2="${f(P('strap_b')[1])}" stroke="#8a6a44" stroke-width="3.5" stroke-linecap="round"/>`;
  items.push({d:D('shield')+(face?.6:-.6),svg:g})}
 // restraints and clinging creatures
 const tube=(pts,d,w)=>{d=place(d,w);const p=pts.map(x=>x.map(f).join(','));const [a,b]=pts,mx=(a[0]+b[0])/2+(b[1]-a[1])*.12,my=(a[1]+b[1])/2-(b[0]-a[0])*.12,path=`M${p[0]} Q${f(mx)},${f(my)} ${p[1]}`;
  items.push({d,svg:`<path d="${path}" fill="none" stroke="${C.bindOut}" stroke-width="6.5" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${C.bind}" stroke-width="4" stroke-linecap="round"/>`})};
 const loop=id=>{const p=P(id);items.push({d:place(D(id)+.4,W(id)),svg:`<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="5.5" ry="3.2" fill="none" stroke="${C.bindOut}" stroke-width="3.5"/><ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="5.5" ry="3.2" fill="none" stroke="${C.bind}" stroke-width="2"/>`})};
 const creature=id=>{const p=P(id),vis=place(D(id)+.6,ad(W(id),ml(fwd,4)));
  items.push({d:vis,svg:`<ellipse cx="${f(p[0]-5.5)}" cy="${f(p[1]-4)}" rx="5.5" ry="3" fill="${C.wing}" stroke="${C.out}" stroke-width=".8"/><ellipse cx="${f(p[0]+5.5)}" cy="${f(p[1]-4)}" rx="5.5" ry="3" fill="${C.wing}" stroke="${C.out}" stroke-width=".8"/>`+ell(p,5,4,C.creature,1.3)})};
 for(const b of binds){
  if(b.creature){creature(b.joint);continue}
  if(b.partner){const p=P(b.anchor);items.push({d:D(b.anchor),svg:`<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="17" ry="20" fill="rgba(179,107,224,.28)" stroke="${C.bind}" stroke-width="2" stroke-dasharray="4 3"/>`});continue}
  if(b.joint2){tube([P(b.joint),P(b.joint2)],(D(b.joint)+D(b.joint2))/2+.3,mid(b.joint,b.joint2));loop(b.joint);loop(b.joint2);continue}
  if(b.anchor){tube([P(b.anchor),P(b.joint)],D(b.joint)-.2,W(b.joint));if(!b.noLoop)loop(b.joint)}
 }
 items.sort((a,b)=>a.d-b.d);
 figure.items=items;figure.dd=spineDD;
 return `<ellipse cx="${f(P('root')[0])}" cy="242" rx="30" ry="6" fill="#0a0f15"/>`+items.map(i=>i.svg).join('');
}
/* the figures of one view in order, each drawn with the memo left by the frame before (primed with one pass) */
const run=frames=>{const memo={};for(const fr of frames)figure(fr.joints,fr.binds,fr.yaw,fr.expr,memo);return frames.map(fr=>figure(fr.joints,fr.binds,fr.yaw,fr.expr,memo))};
const cell=(cw,ch,hl)=>{let g=`<rect width="${cw}" height="${ch}" fill="${hl?C.hit:C.bg}" stroke="#2c3542"/>`;for(let x=24;x<cw;x+=24)g+=`<line x1="${x}" y1="40" x2="${x}" y2="${ch}" stroke="${C.grid}"/>`;for(let y=48;y<ch;y+=24)g+=`<line x1="0" y1="${y}" x2="${cw}" y2="${y}" stroke="${C.grid}"/>`;return g};
/* sheet: rows = directions, columns = frames */
export function sheet(lib,m,dirs,{mark}={}){
 const P=lib.poses[m],N=P[dirs[0]].length,cw=288,ch=288,pad=26,lw=90,W=lw+N*cw,H=pad+dirs.length*ch,meta=lib.motions[m],hit=mark??meta.hit_frame;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W/2}" height="${H/2}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#121821"/>`;
 for(let i=0;i<N;i++)s+=`<text x="${lw+i*cw+cw/2}" y="18" font-size="15" text-anchor="middle" fill="${i===hit?'#ff8a8a':C.text}">${i}${i===hit?' 命中':''} · ${meta.frame_ms[i]}ms</text>`;
 dirs.forEach((d,r)=>{s+=`<text x="8" y="${pad+r*ch+ch/2}" font-size="16" fill="${C.text}">${LABEL[d]}</text><text x="8" y="${pad+r*ch+ch/2+18}" font-size="12" fill="${C.sub}">${d}</text>`;
  const fig=run(P[d]);for(let i=0;i<N;i++){s+=`<g transform="translate(${lw+i*cw},${pad+r*ch})">${cell(cw,ch,i===hit)}${fig[i]}</g>`}});
 return s+'</svg>';
}
/* keys: one direction, big, each frame's intent under it, and the path of one joint over every cell */
export function keys(lib,m,d,{trail='sword_tip',mark}={}){
 const F=lib.poses[m][d],N=F.length,cw=288,ch=288,W=N*cw,H=ch+150,hit=mark??lib.motions[m].hit_frame;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W*.75}" height="${H*.75}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#121821"/>`;
 const tr=F[0].joints[trail]?F.map(p=>p.joints[trail].position):null,fig=run(F);
 for(let i=0;i<N;i++){const fr=F[i];
  s+=`<g transform="translate(${i*cw},0)">${cell(cw,ch,i===hit)}`+
   (tr?`<polyline points="${tr.map(t=>t.map(f).join(',')).join(' ')}" fill="none" stroke="#ff7a7a" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/><circle cx="${f(tr[i][0])}" cy="${f(tr[i][1])}" r="3" fill="#ff7a7a"/>`:'')+
   `${fig[i]}</g>`;
  const ph=(fr.phase||'').split(' '),j=ph.shift();
  s+=`<text x="${i*cw+8}" y="${ch+22}" font-size="16" font-weight="700" fill="${C.text}">${i}. ${j}</text><foreignObject x="${i*cw+6}" y="${ch+30}" width="${cw-12}" height="110"><div xmlns="http://www.w3.org/1999/xhtml" style="font:12px sans-serif;color:${C.sub};line-height:1.35">${ph.join(' ')}<br/>${fr.frame_ms}ms</div></foreignObject>`;
 }
 return s+'</svg>';
}
/* preview: the given directions side by side, animated (SMIL) with the frame timings */
export function preview(lib,m,dirs,cols=4){
 const P=lib.poses[m],N=P[dirs[0]].length,ms=lib.motions[m].frame_ms,tot=ms.reduce((a,b)=>a+b,0),cw=288,ch=288,rows=Math.ceil(dirs.length/cols),W=cw*Math.min(cols,dirs.length),H=(ch+10)*rows;
 let t=0;const kt=ms.map(x=>{const a=t/tot;t+=x;return a});
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#121821"/>`;
 dirs.forEach((d,r)=>{const x=(r%cols)*cw,y=Math.floor(r/cols)*(ch+10);s+=`<g transform="translate(${x},${y})">${cell(cw,ch,false)}<text x="8" y="18" font-size="13" fill="${C.text}">${LABEL[d]}</text>`;
  const fig=run(P[d]);for(let i=0;i<N;i++){const vals=ms.map((_,k)=>k===i?'inline':'none').join(';');
   s+=`<g display="${i===0?'inline':'none'}">${fig[i]}<animate attributeName="display" values="${vals}" keyTimes="${kt.map(v=>v.toFixed(4)).join(';')}" calcMode="discrete" dur="${tot}ms" repeatCount="indefinite"/></g>`}
  s+='</g>'});
 return s+'</svg>';
}
