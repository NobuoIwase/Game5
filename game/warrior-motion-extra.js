(()=>{'use strict';
const MISSING={right:['arm_left','leg_left'],left:['arm_right','leg_right']},B='../character-motion-v1/',D=['front','down_right','right','up_right','back','up_left','left','down_left'],S={r:null,i:new Map},sg=d=>D.indexOf(d)<4?-1:1,C=v=>Math.max(0,Math.min(1,v)),R=d=>d*Math.PI/180,Q=t=>{t=C(t);return t*t*(3-2*t)},P=t=>Math.sin(C(t)*Math.PI);
const I=u=>{let x=new Image;x.ok=0;x.onload=()=>x.ok=1;x.src=u;return x},imgs=d=>{if(S.i.has(d))return S.i.get(d);let o={};for(const p of ['body','arm_right','arm_left','leg_right','leg_left','sword','shield','scabbard'])o[p]=MISSING[d]?.includes(p)?{ok:0}:I(`${B}parts/warrior/${d}/${p}.png`);S.i.set(d,o);return o};fetch(B+'rigs/warrior.json').then(r=>r.json()).then(r=>S.r=r);
function rot(c,p,a){c.translate(p[0],p[1]);c.rotate(R(a));c.translate(-p[0],-p[1])}
function limb(c,i,p,a){if(!i?.ok||!p)return;c.save();rot(c,p,a||0);c.drawImage(i,0,0);c.restore()}
const RDY={arm:48,sh:40,step:6.5,foot:2.5,sway:1.2,bob:1.4};
function pose(h,a){let s=sg(h.dir||'front'),t=window.state?.time||performance.now()/1000,p=a.p||0,e=P(p),q=Q(p),n=a.n;
if(n==='bash'){let z=Q(C(p<=a.hit?p/a.hit:1-(p-a.hit)/(1-a.hit)));return[-s*5*z,s*58*z,-s*14*z,-s*5*z,s*4*z,7*z,-2*z]}
if(n==='guard')return[s*2,s*66,-s*18,-s*2,s*2,0,1];
/* v0.37 tempting: legs opened wide, hips pushed forward and swaying slowly, sword hanging, the
   free hand drawn in to her chest */
if(n==='tempt'){let sw=Math.sin(t*1.8),H=window.state?.hero||h,nu=Math.min(1,(H.nutera||0)/100);return[s*(7+3*sw),s*(58+6*sw),-s*(6+4*sw),-s*(16+6*nu),s*(16+6*nu),sw*2.2,3+2*nu+Math.abs(sw)]}
/* v0.37 climax: arched back, arms thrown out, jolts on each convulsion; from the third in a chain
   the legs splay outward (gani-mata) and knees and hips shake */
if(n==='climax'||n==='pinnedClimax'||n==='pinned'){let H=window.state?.hero||h,j=H._spasm||0,ch=H.chainN||1,gm=ch>=3?1:0,tr=Math.sin(t*34)*.6+Math.sin(t*51)*.4,nu=Math.min(1,(H.nutera||0)/100);
 if(n==='climax'){let w=Math.sin(t*9)*3;return[-s*(9+12*j)+w*.3,s*(44+24*j+tr*5),-s*(44+24*j+tr*5),-s*(5+22*gm+tr*6*gm+4*j),s*(5+22*gm+tr*6*gm+4*j),tr*1.2*gm,4+7*gm-8*j+Math.abs(tr)*2*gm,s*4*j]}
 // pinned under a heavy monster: lying, wriggling - weaker as Nutera rises - jolting in a climax
 let wg=(n==='pinned'?(1-nu):.3)*Math.sin(t*8),jj=n==='pinnedClimax'?j:0;
 return[s*(8+10*jj)+wg*4,-s*48+wg*12+s*20*jj,s*36-wg*12-s*20*jj,s*(12+16*gm)+wg*8+tr*4*gm,-s*(10+16*gm)-wg*8-tr*4*gm,(s<0?1:-1)*12,52-6*jj,s*(82-8*jj)]}
/* v0.44 closing in / backing off with the guard up: short steps from the hips in time with the
   ground covered (motion-v039.js step phase); leaning in to close, upright with the blade raised
   higher to back off */
if(n==='advance'||n==='retreat'){let H=window.state?.hero||h,R=window.__RDY||RDY,ph=(H._stepPh||0)/8*Math.PI*2,st=Math.sin(ph),d=H.dir||'front',
 sd=d==='right'||d==='left'?1:d==='front'||d==='back'?.3:.65,A=15*sd,adv=n==='advance';
 return[s*(adv?8:1),s*(R.sh+(adv?6:12)),s*(R.arm+(adv?8:22)),st*A+s*2,-st*A-s*2,0,3+Math.abs(Math.cos(ph))*1.6]}
if(n==='ready'){let H=window.state?.hero||h,br=Math.sin(t*3.2),R=window.__RDY||RDY,st=Math.sin(t*R.step),f=R.foot*st;   // v0.39: sword held forward and down, not straight out; light footwork
 return[s*(4+br*.6),s*(R.sh+br*2),s*(R.arm+br*2+(H._awayT>0?8:0)),   // v0.44: the blade toward the monster (it pointed away)
 s*(3+f),-s*(3-f),st*R.sway,3+br*.6+Math.abs(st)*R.bob]}   // v0.34: on guard when a monster is close (sword up, shield forward, knees bent)
if(n==='dodge')return[-s*11*e,s*22*e,-s*30*e,s*11*Math.sin(p*Math.PI*2),-s*8*Math.sin(p*Math.PI*2),(s<0?1:-1)*8*e,-5*e];
if(n==='hit')return[s*11*e,-s*28*e,s*30*e,-s*5*e,s*5*e,-5*e,2*e];
if(n==='stun')return[s*(10+Math.sin(t*5)*1.2),-s*24,s*19,-s*4,s*4,Math.sin(t*5)*.6,4];
if(n==='recover'){let z=1-Q(p);return[s*13*z,-s*32*z,s*26*z,-s*4*z,s*4*z,0,5*z]}
if(n==='defeat')return[s*8*q,-s*48*q,s*36*q,-s*12*q,s*10*q,(s<0?1:-1)*12*q,52*q,s*82*q];
if(n==='turn')return[-s*6*e,s*8*e,-s*8*e,-s*3*e,s*3*e,0,e,s*3*e];
/* v0.39 idle with a state of mind: out of breath when her SP is low (quicker, deeper heaving),
   knees drawn together and hips shifting restlessly when her Nutera is up */
let H=window.state?.hero||h,ti=1-Math.min(1,(H.sp??100)/(H.maxSp||100)),nu=Math.min(1,Math.max(0,((H.nutera||0)-35)/55)),
 br=Math.sin(t*2.25)*(1-ti)+Math.sin(t*4.4)*ti,sw=Math.sin(t*1.15),fid=Math.sin(t*2.7)*nu,am=.55+1.9*ti;
return[sw*.45+s*ti*3+fid*1.5,s*br*am+s*nu*6,-s*br*am*.8-s*nu*4,s*(5*nu+fid*2.5),-s*(5*nu-fid*2.5),sw*.15+fid*1.6,br*am+ti*2+nu*1.5]}
/* v0.39 blending: a new pose is eased into from the last one drawn instead of snapping to it -
   quick for a flinch, a dodge or a convulsion, slower for settling into a stance. Coming out of the
   walk cycle (no rig pose drawn for a moment) she eases in from standing straight. */
const TAU={advance:.09,retreat:.09,hit:.035,dodge:.045,climax:.03,pinnedClimax:.03,bash:.05,guard:.07,defeat:.09,pinned:.1,turn:.06,recover:.12,stun:.12,ready:.13,tempt:.2,idle:.16};
function blend(h,d,a,p){
 const now=performance.now()/1000;let B=h._pb;while(p.length<8)p.push(0);
 if(!B)h._pb=B={v:[0,0,0,0,0,0,0,0],t:now,d};
 if(B.d!==d){B.v=p.slice();B.d=d}                       // a new facing is a new picture: no swing through
 if(now-B.t>.25)B.v=[0,0,0,0,0,0,0,0];                  // back from the walk cycle: from standing straight
 const dt=Math.min(.1,now-B.t);B.t=now;
 const k=1-Math.exp(-dt/(TAU[a.n]||.1));for(let i=0;i<8;i++)B.v[i]+=(p[i]-B.v[i])*k;return B.v.slice()}
function draw(c,h,a){let d=h.dir||'front',v=S.r?.views?.[d],o=imgs(d);if(!v||!o.body.ok)return 0;let p=blend(h,d,a,pose(h,a)),z=112/543,kb=a.n==='hit'?(h._kbX||0)*P(a.p||0):0,x=h.x-v.root[0]*z+p[5]*z+kb,y=h.y-26-v.root[1]*z+p[6]*z;c.save();c.translate(x,y);c.scale(z,z);if(p[7])rot(c,v.root,p[7]);if(o.scabbard.ok)c.drawImage(o.scabbard,0,0);for(let l of v.legs||[])limb(c,o['leg_'+l.side],l.hip,l.side==='right'?p[3]:p[4]);let al=v.arms?.find(x=>x.side==='left'),ar=v.arms?.find(x=>x.side==='right');if(al)limb(c,o.arm_left,al.shoulder,p[1]);c.save();rot(c,v.root,p[0]);c.drawImage(o.body,0,0);c.restore();if(ar){c.save();rot(c,ar.shoulder,p[2]);if(o.sword.ok)c.drawImage(o.sword,0,0);if(o.arm_right.ok)c.drawImage(o.arm_right,0,0);c.restore()}if(o.shield.ok)c.drawImage(o.shield,0,0);c.restore();return 1}
window.WarriorMotionExtra={draw,ready:()=>!!S.r};
})();