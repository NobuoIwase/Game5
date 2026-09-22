(function(g){
'use strict';
const BASE='../character-motion-v1/',DIRS=['front','down_right','right','up_right','back','up_left','left','down_left'];
const S={rig:null,gear:null,err:'',imgs:new Map(),seg:new Map()};
const A=new Set(['melee','heavy']);
const rad=d=>d*Math.PI/180,cl=v=>Math.max(0,Math.min(1,v)),lerp=(a,b,t)=>a+(b-a)*t;
function rot(c,p,a){c.translate(p[0],p[1]);c.rotate(rad(a));c.translate(-p[0],-p[1]);}
function path(c,p){if(!p?.length)return false;c.beginPath();c.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)c.lineTo(p[i][0],p[i][1]);c.closePath();return true}
function half(poly,o,n,k,less){
 const dot=p=>(p[0]-o[0])*n[0]+(p[1]-o[1])*n[1],inside=p=>less?dot(p)<=k:dot(p)>=k,out=[];
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=inside(a),ib=inside(b);if(ia)out.push(a);if(ia!==ib){const da=dot(a)-k,db=dot(b)-k,t=Math.abs(da-db)<1e-6?0:da/(da-db);out.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t)])}}
 return out;
}
function segments(v){
 const key=v.__dir;if(S.seg.has(key))return S.seg.get(key);
 const a=v.arms.find(x=>x.side==='right');if(!a)return null;
 const [P,E,W]=[a.shoulder,a.elbow,a.wrist],n1=[E[0]-P[0],E[1]-P[1]],n2=[W[0]-E[0],W[1]-E[1]];
 let l=Math.hypot(...n1)||1;n1[0]/=l;n1[1]/=l;l=Math.hypot(...n2)||1;n2[0]/=l;n2[1]/=l;
 let fore=half(a.polygon,E,n1,-9,false);fore=half(fore,W,n2,9,true);
 const r={a,upper:half(a.polygon,E,n1,9,true),fore,hand:half(a.polygon,W,n2,-9,false)};S.seg.set(key,r);return r;
}
function im(src){const x=new Image();x.ok=false;x.onload=()=>x.ok=true;x.src=src;return x}
function imgs(d){if(S.imgs.has(d))return S.imgs.get(d);const o={};for(const p of ['body','arm_right','arm_left','leg_right','leg_left','sword','shield','scabbard'])o[p]=im(`${BASE}parts/warrior/${d}/${p}.png`);S.imgs.set(d,o);return o}
Promise.all([fetch(`${BASE}rigs/warrior.json`).then(r=>r.json()),fetch(`${BASE}rigs/warrior-gear.json`).then(r=>r.json())]).then(([r,x])=>{S.rig=r;S.gear=x;for(const d of DIRS)if(r.views[d])r.views[d].__dir=d}).catch(e=>S.err=String(e));
const K=[
[0,0,0,0,0,0,0],[.12,-1,-12,-6,-2,-1,0],[.28,-3,-38,-22,-10,-3,1],[.42,-4,-31,-34,-18,-3,1],
[.55,2,10,-15,7,2,0],[.66,7,67,15,25,6,-1],[.77,9,84,28,36,7,0],[.9,4,38,10,15,3,1],[1,0,0,0,0,0,0]];
function pose(p,dir,heavy=false,hit=.55){
 hit=Math.max(.15,Math.min(.85,hit));const q=p<=hit?p/hit*.66:.66+(p-hit)/(1-hit)*.34;let i=0;while(i<K.length-2&&q>K[i+1][0])i++;
 const a=K[i],b=K[i+1],u=(q-a[0])/(b[0]-a[0]||1),s=['front','down_right','right','up_right'].includes(dir)?-1:1,m=heavy?1.18:1;
 const V=j=>lerp(a[j],b[j],u)*m;return{kind:heavy?'heavy':'slash',body:V(1)*s*.42,sh:V(2)*s,el:V(3)*s,wr:V(4)*s,x:V(5)*(s<0?1:-1),y:V(6)};
}
function est(h){const e=h.estella,p=e?.total?cl(1-e.t/e.total):.5,en=p<.16?p/.16:p>.82?(1-p)/.18:1,t=g.state?.time||0;return{kind:'estella',body:(Math.sin(t*17)*2.2+Math.sin(t*29))*en,ar:(Math.sin(t*23)*8+Math.sin(t*37)*3)*en,al:(Math.sin(t*19+2)*7+Math.sin(t*31)*3)*en,lr:Math.sin(t*21+1)*3.5*en,ll:Math.sin(t*18+3)*3*en,x:Math.sin(t*26)*1.6*en,y:Math.sin(t*33)*1.2*en}}
function bind(){const t=g.state?.time||0;return{kind:'bind',body:Math.sin(t*5)*1.2,ar:58+Math.sin(t*9)*5,al:-58+Math.sin(t*8+1)*5,lr:8+Math.sin(t*7)*3,ll:-8+Math.sin(t*7+2)*3,x:0,y:1}}
function clipdraw(c,i,p){if(!i?.ok||!p?.length)return;c.save();path(c,p);c.clip();c.drawImage(i,0,0);c.restore()}
function limb(c,i,p,a){if(!i?.ok)return;c.save();rot(c,p,a);c.drawImage(i,0,0);c.restore()}
function drawArm(c,v,o,p){
 const z=segments(v);if(!z||!o.arm_right.ok)return;c.save();rot(c,z.a.shoulder,p.sh);clipdraw(c,o.arm_right,z.upper);c.save();rot(c,z.a.elbow,p.el);clipdraw(c,o.arm_right,z.fore);c.save();rot(c,z.a.wrist,p.wr);if(o.sword.ok)c.drawImage(o.sword,0,0);clipdraw(c,o.arm_right,z.hand);c.restore();c.restore();c.restore();
}
function gear(d,id){return(S.gear?.views?.[d]||[]).find(x=>x.id===id)}
function shield(c,d,v,o,a){const x=v.arms.find(z=>z.side==='left');if(!x)return;const slot=gear(d,'shield')?.slot||'cover_arm';if(slot==='back'&&o.shield.ok)c.drawImage(o.shield,0,0);limb(c,o.arm_left,x.shoulder,a);if(slot==='cover_arm'&&o.shield.ok)c.drawImage(o.shield,0,0)}
function near(d,side){return side===(['front','down_right','right','up_right'].includes(d)?'right':'left')}
function draw(c,d,p,sc){
 const v=S.rig?.views?.[d];if(!v)return false;const o=imgs(d);if(!o.body.ok)return false,scale=sc.scale||112/543;
 const rx=sc.rootX??sc.x,ry=sc.rootY??((sc.y||0)-26),left=rx-v.root[0]*scale+p.x*scale,top=ry-v.root[1]*scale+p.y*scale;
 c.save();c.translate(left,top);c.scale(scale,scale);if(o.scabbard.ok)c.drawImage(o.scabbard,0,0);
 for(const L of v.legs){const a=p.kind==='estella'?(L.side==='right'?p.lr:p.ll):p.kind==='bind'?(L.side==='right'?p.lr:p.ll):0;limb(c,o['leg_'+L.side],L.hip,a||0)}
 const wn=near(d,'right'),sn=near(d,'left');
 if(p.kind==='slash'||p.kind==='heavy'){
  if(!wn)drawArm(c,v,o,p);if(!sn)shield(c,d,v,o,-p.sh*.1);c.save();rot(c,v.root,p.body);c.drawImage(o.body,0,0);c.restore();if(sn)shield(c,d,v,o,-p.sh*.1);if(wn)drawArm(c,v,o,p);
 }else{
  const r=v.arms.find(x=>x.side==='right'),l=v.arms.find(x=>x.side==='left'),ar=p.ar||0,al=p.al||0;
  if(r&&!wn)limb(c,o.arm_right,r.shoulder,ar);if(l&&!sn)shield(c,d,v,o,al);c.save();rot(c,v.root,p.body||0);c.drawImage(o.body,0,0);c.restore();if(l&&sn)shield(c,d,v,o,al);if(r&&wn){c.save();rot(c,r.shoulder,ar);if(o.sword.ok)c.drawImage(o.sword,0,0);c.drawImage(o.arm_right,0,0);c.restore()}
 }
 c.restore();return true;
}
function action(h){if(h.estella?.active)return['estella',0,.55];if((h.status?.bind||0)>0)return['bind',0,.55];const a=h._warriorMotion;return a&&a.elapsed<a.total?[a.name,cl(a.elapsed/a.total),cl((a.hitAt??a.total*.55)/a.total)]:null}
function drawGame(c,h){const a=action(h);if(!a)return false;const p=a[0]==='estella'?est(h):a[0]==='bind'?bind():pose(a[1],h.dir,a[0]==='heavy',a[2]);return draw(c,h.dir,p,{x:h.x,y:h.y,scale:112/543})}
function qa(){let max=0,last=null,peak=0,pi=0;for(let i=0;i<=240;i++){const p=pose(i/240,'right'),v=[p.sh,p.el,p.wr];if(last){const d=Math.max(...v.map((x,j)=>Math.abs(x-last[j])));max=Math.max(max,d);const sp=v.reduce((s,x,j)=>s+Math.abs(x-last[j]),0);if(sp>peak){peak=sp;pi=i}}last=v}return{maxJointDelta:+max.toFixed(3),peakProgress:+(pi/240).toFixed(3),smooth:max<3,impactClose:Math.abs(pi/240-.55)<.18}}
if(typeof g.startHeroSkill==='function'){const b=g.startHeroSkill;g.startHeroSkill=function(slot,reason=''){const h=g.activeHero?.(),sk=h?.skills?.[slot],ok=b(slot,reason);if(ok&&h?.id==='warrior'&&sk&&A.has(sk.kind))h._warriorMotion={name:sk.kind==='heavy'?'heavy':'slash',elapsed:0,total:sk.cast+(sk.kind==='heavy'?.34:.2),hitAt:sk.cast};return ok}}
if(typeof g.updateHero==='function'){const b=g.updateHero;g.updateHero=function(a,dt){b(h,dt);if(h?._warriorMotion){h._warriorMotion.elapsed+=dt;if(h._warriorMotion.elapsed>=h._warriorMotion.total)h._warriorMotion=null}}}
if(g.state)g.state.version='0.6.0';
g.WarriorMotion={drawGame,drawLab:(c,d,n,p,o={})=>draw(c,d,n==='estella'?est({estella:{t:(1-p)*2.6,total:2.6}}):n==='bind'?bind():pose(p,d,n==='heavy',o.hitP??.55),{rootX:o.rootX??181,rootY:o.rootY??314,scale:o.scale||1}),qa,ready:()=>!!S.rig,error:()=>S.err};
})(window);