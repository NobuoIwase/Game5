(()=>{'use strict';
const MISSING={right:['arm_left','leg_left'],left:['arm_right','leg_right']},B='../character-motion-v1/',D=['front','down_right','right','up_right','back','up_left','left','down_left'],S={r:null,i:new Map},sg=d=>D.indexOf(d)<4?-1:1,C=v=>Math.max(0,Math.min(1,v)),R=d=>d*Math.PI/180,Q=t=>{t=C(t);return t*t*(3-2*t)},P=t=>Math.sin(C(t)*Math.PI);
const I=u=>{let x=new Image;x.ok=0;x.onload=()=>x.ok=1;x.src=u;return x},imgs=d=>{if(S.i.has(d))return S.i.get(d);let o={};for(const p of ['body','arm_right','arm_left','leg_right','leg_left','sword','shield','scabbard'])o[p]=MISSING[d]?.includes(p)?{ok:0}:I(`${B}parts/warrior/${d}/${p}.png`);S.i.set(d,o);return o};fetch(B+'rigs/warrior.json').then(r=>r.json()).then(r=>S.r=r);
function rot(c,p,a){c.translate(p[0],p[1]);c.rotate(R(a));c.translate(-p[0],-p[1])}
function limb(c,i,p,a){if(!i?.ok||!p)return;c.save();rot(c,p,a||0);c.drawImage(i,0,0);c.restore()}
function pose(h,a){let s=sg(h.dir||'front'),t=window.state?.time||performance.now()/1000,p=a.p||0,e=P(p),q=Q(p),n=a.n;
if(n==='bash'){let z=Q(C(p<=a.hit?p/a.hit:1-(p-a.hit)/(1-a.hit)));return[-s*5*z,s*58*z,-s*14*z,-s*5*z,s*4*z,7*z,-2*z]}
if(n==='guard')return[s*2,s*66,-s*18,-s*2,s*2,0,1];
if(n==='dodge')return[-s*11*e,s*22*e,-s*30*e,s*11*Math.sin(p*Math.PI*2),-s*8*Math.sin(p*Math.PI*2),(s<0?1:-1)*8*e,-5*e];
if(n==='hit')return[s*11*e,-s*28*e,s*30*e,-s*5*e,s*5*e,-5*e,2*e];
if(n==='stun')return[s*(10+Math.sin(t*5)*1.2),-s*24,s*19,-s*4,s*4,Math.sin(t*5)*.6,4];
if(n==='recover'){let z=1-Q(p);return[s*13*z,-s*32*z,s*26*z,-s*4*z,s*4*z,0,5*z]}
if(n==='defeat')return[s*8*q,-s*48*q,s*36*q,-s*12*q,s*10*q,(s<0?1:-1)*12*q,52*q,s*82*q];
if(n==='turn')return[-s*6*e,s*8*e,-s*8*e,-s*3*e,s*3*e,0,e,s*3*e];
let br=Math.sin(t*2.25),sw=Math.sin(t*1.15);return[sw*.45,s*br*.55,-s*br*.45,0,0,sw*.15,br*.55]}
function draw(c,h,a){let d=h.dir||'front',v=S.r?.views?.[d],o=imgs(d);if(!v||!o.body.ok)return 0;let p=pose(h,a),z=112/543,x=h.x-v.root[0]*z+p[5]*z,y=h.y-26-v.root[1]*z+p[6]*z;c.save();c.translate(x,y);c.scale(z,z);if(p[7])rot(c,v.root,p[7]);if(o.scabbard.ok)c.drawImage(o.scabbard,0,0);for(let l of v.legs||[])limb(c,o['leg_'+l.side],l.hip,l.side==='right'?p[3]:p[4]);let al=v.arms?.find(x=>x.side==='left'),ar=v.arms?.find(x=>x.side==='right');if(al)limb(c,o.arm_left,al.shoulder,p[1]);c.save();rot(c,v.root,p[0]);c.drawImage(o.body,0,0);c.restore();if(ar){c.save();rot(c,ar.shoulder,p[2]);if(o.sword.ok)c.drawImage(o.sword,0,0);if(o.arm_right.ok)c.drawImage(o.arm_right,0,0);c.restore()}if(o.shield.ok)c.drawImage(o.shield,0,0);c.restore();return 1}
window.WarriorMotionExtra={draw,ready:()=>!!S.r};
})();