/** Blending between two key poses by where the body actually is.
 * Keys describe the arms and legs in different ways (a direction, a hand on the body, a knee direction...),
 * so blending their numbers jumps where the description changes. Instead each key is read back from its
 * solved skeleton - where the wrists and ankles are and which way the elbows, knees and toes point - and
 * those are blended; a wrist that would pass through the body on the way is moved out round it.
 * Used for the in-betweens inside motions (scenes.mjs) and for the joins between motions (transitions.mjs).
 */
import {pose} from './attack.mjs';
const sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,k)=>a.map(v=>v*k),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
 len=a=>Math.hypot(...a),norm=a=>{const l=len(a)||1;return a.map(v=>v/l)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function lerpV(a,b,u){if(typeof a==='number'&&typeof b==='number')return a+(b-a)*u;if(Array.isArray(a)&&Array.isArray(b))return a.map((v,i)=>lerpV(v,b[i]??v,u));
 if(a&&b&&typeof a==='object'&&typeof b==='object'){const o={};for(const k of new Set([...Object.keys(a),...Object.keys(b)]))o[k]=k in a&&k in b?lerpV(a[k],b[k],u):(u<.5?a[k]??b[k]:b[k]??a[k]);return o}return u<.5?a:b}
/* a key that reproduces a solved pose, with the arms and legs given by where they are */
export function fromJoints(k,J=pose(k)){const r=J.root,q={...k};
 for(const [S,side] of [['R','right'],['L','left']]){
  const sh=J['shoulder_'+side],el=J['elbow_'+side],wr=J['wrist_'+side];q['arm'+S]={w:sub(wr,r),p:norm(sub(el,mul(add(sh,wr),.5))),at:sub(el,r)};   // at: where the elbow is (for blending)
  const hp=J['hip_'+side],kn=J['knee_'+side],an=J['ankle_'+side],to=J['toe_'+side],mir=v=>[v[0]*(side==='right'?-1:1),v[1],v[2]];
  q['foot'+S]=[an[0],an[2],232-an[1],0,1,0,0,0,mir(norm(sub(kn,mul(add(hp,an),.5)))),mir(norm(sub(to,an))),sub(kn,r)]}   // [10]: where the knee is (for blending)
 return q}
/* keep the wrists outside the body: an elliptic cylinder 14 wide and 11 deep each side round the spine */
export function outside(q){const J=pose(q),r=J.root,up=norm(sub(J.neck,r)),sl=norm(sub(J.shoulder_left,J.shoulder_right)),fz=norm(cross(sl,up)),lx=cross(up,fz);
 for(const S of ['R','L']){const A=q['arm'+S];if(!A?.w)continue;const w=add(r,A.w),ab=sub(J.neck,r),t=Math.max(0,Math.min(1,dot(sub(w,r),ab)/dot(ab,ab))),c=add(r,mul(ab,t)),v=sub(w,c),x=dot(v,lx),z=dot(v,fz),e=Math.hypot(x/14,z/11);
  if(e<1){const k=1.04/(e||.01),v2=add(mul(lx,x*k),mul(fz,z*k)),along=mul(up,dot(v,up));A.w=sub(add(add(c,v2),along),r)}}
 return q}
/* a direction turned a fraction e of the way from a to b at a steady rate (a plain blend of two nearly
   opposite directions passes through nothing and flips) */
function turn(a,b,e){a=norm(a);b=norm(b);const c=Math.max(-1,Math.min(1,dot(a,b))),th=Math.acos(c);if(th<1e-3)return b;
 let ax=cross(a,b);if(len(ax)<1e-3)ax=Math.abs(a[1])<.9?cross(a,[0,1,0]):cross(a,[1,0,0]);ax=norm(ax);const t=th*e;
 return add(add(mul(a,Math.cos(t)),mul(cross(ax,a),Math.sin(t))),mul(ax,dot(ax,a)*(1-Math.cos(t))))}
/* restraints and the like, a fraction e of the way from list A to list B, on body J:
   - on the same spot in both: a line's far end moves across; a swallowing mass rises or sinks
   - only in B: a line grows out from the joint to its point (from a third of the way); a band between two
     joints appears once they have come together (the last fifth); anything else from half way
   - only in A: the same, backwards */
const bkey=b=>[b.j,b.j2||'',b.creature?'c':b.coil?'k':b.engulf?'e':b.bubble?'b':b.partner?'p':b.to?'t':'n'].join('/');
const cl=v=>Math.max(0,Math.min(1,v));
// e: the (linear) fraction of the way, frame by frame
export function blendBinds(A=[],B=[],e,J){const out=[],ka=new Map(A.map(b=>[bkey(b),b])),kb=new Map(B.map(b=>[bkey(b),b]));
 for(const [k,b] of kb){const a=ka.get(k);
  if(a){if(a.to&&b.to){const far=len(sub(a.to,b.to))>50;   // a far move: it lets go at once and takes hold again at the end, rather than sweeping through her
    if(!far)out.push({...b,to:lerpV(a.to,b.to,e)});else{const t=e<.5?1-e/.3:(e-.7)/.3;if(t>0)out.push({...(e<.5?a:b),to:lerpV(J[b.j],e<.5?a.to:b.to,cl(t))})}}else if(a.engulf)out.push({...b,level:lerpV(a.level,b.level,e)});
   else if(b.j2){if(len(sub(J[b.j],J[b.j2]))<12)out.push(b)}   // a band ties two joints together: while they are apart it is being tied again
   else out.push(e<.5?a:b);continue}
  if(b.to&&!b.partner){const t=cl((e-.33)/.67);if(t>0)out.push({...b,to:lerpV(J[b.j],b.to,t)})}
  else if(b.engulf)out.push({...b,level:lerpV(244,b.level,e)});
  else if(b.j2){if(e>=.8)out.push(b)}else if(e>=.5)out.push(b)}
 for(const [k,a] of ka){if(kb.has(k))continue;
  if(a.to&&!a.partner){const t=cl(1-e/.67);if(t>0)out.push({...a,to:lerpV(J[a.j],a.to,t)})}
  else if(a.engulf)out.push({...a,level:lerpV(a.level,244,e)});
  else if(a.j2){if(e<.2)out.push(a)}else if(e<.5)out.push(a)}
 return out}
/* the pose a fraction e of the way from key a to key b: the body by where it is, directions turned at a
   steady rate, restraints carried across (keepA: the first one's stay on as they are) */
/* a hold she is about to break: lines loosen and draw back from a fifth of the way on; a band stays while the
   joints are together; the rest stays on */
function loosen(A=[],u,J){return A.flatMap(b=>b.to&&!b.partner?(u<.2?[b]:(u-.2)/.75>=.9?[]:[{...b,to:lerpV(b.to,J[b.j],cl((u-.2)/.75))}]):b.j2?(len(sub(J[b.j],J[b.j2]))<12?[b]:[]):[b])}
/* how far the lines of a hold travel as it loosens (over three quarters of the way) */
export function holdTravel(a){const J=pose(a);let m=0;for(const b of a.binds||[])if(b.to&&!b.partner)m=Math.max(m,len(sub(J[b.j],b.to))/.75);return m}
/* how far the far end of a restraint line travels from key a to key b (a line that grows or goes back
   travels its whole length in two thirds of the way) */
export function bindTravel(a,b){const Ja=pose(a),Jb=pose(b),ka=new Map((a.binds||[]).map(x=>[bkey(x),x])),kb=new Map((b.binds||[]).map(x=>[bkey(x),x]));let m=0;
 for(const [k,y] of kb){const x=ka.get(k);if(!y.to||y.partner&&!x)continue;const d=x?.to?len(sub(x.to,y.to)):0;m=Math.max(m,x?.to?(d>50?Math.max(len(sub(Ja[x.j],x.to)),len(sub(Jb[y.j],y.to)))/.3:d):Math.max(len(sub(Ja[y.j],y.to)),len(sub(Jb[y.j],y.to)))/.67)}
 for(const [k,x] of ka)if(!kb.has(k)&&x.to&&!x.partner)m=Math.max(m,Math.max(len(sub(Ja[x.j],x.to)),len(sub(Jb[x.j],x.to)))/.67);
 return m}
// u: the linear fraction (restraints move evenly frame by frame; the body eases)
export function between(a,b,e,{keepA=false,u=e}={}){const Ja=pose(a),Jb=pose(b),fa=fromJoints(a,Ja),fb=fromJoints(b,Jb),q=lerpV(fa,fb,e);
 for(const S of ['R','L']){q['arm'+S].p=turn(fa['arm'+S].p,fb['arm'+S].p,e);for(const i of [8,9])q['foot'+S][i]=turn(fa['foot'+S][i],fb['foot'+S][i],e)}
 outside(q);
 // the arms turn at the shoulder and the elbow (the upper arm and the forearm each swing round at a steady rate),
 // so an arm coming down past the shoulder does not fold up and flip its elbow; the knees go to their own blended places
 {const J=pose(q),r=J.root;for(const [S,side] of [['R','right'],['L','left']]){const mir=v=>[v[0]*(side==='right'?-1:1),v[1],v[2]];
  const sh=J['shoulder_'+side],up=k=>norm(sub(k['elbow_'+side],k['shoulder_'+side])),fo=k=>norm(sub(k['wrist_'+side],k['elbow_'+side])),
   lu=len(sub(Ja['elbow_'+side],Ja['shoulder_'+side])),lf=len(sub(Ja['wrist_'+side],Ja['elbow_'+side])),
   el=add(sh,mul(turn(up(Ja),up(Jb),e),lu)),wr=add(el,mul(turn(fo(Ja),fo(Jb),e),lf));
  q['arm'+S]={w:sub(wr,r),p:norm(sub(el,mul(add(sh,wr),.5)))};
  q['foot'+S][8]=mir(norm(sub(add(r,q['foot'+S][10]),mul(add(J['hip_'+side],J['ankle_'+side]),.5))))}}
 outside(q);   // and still round the body, not through it
 const Jq=pose(q);q.binds=keepA?loosen(a.binds,u,Jq):blendBinds(a.binds,b.binds,u,Jq);q.expr=e<.5?a.expr:b.expr;return q}
/* the largest move of a joint between two keys (px; where she stands on the floor does not count) */
const GAPJ=['head','thorax','root','knee_left','knee_right','ankle_left','ankle_right','toe_left','toe_right','elbow_left','elbow_right','wrist_left','wrist_right'];
export function keyGap(a,b){const A=pose(a),B=pose(b);let m=0;for(const k of GAPJ)m=Math.max(m,Math.hypot(A[k][0]-A.root[0]-(B[k][0]-B.root[0]),A[k][1]-B[k][1],A[k][2]-A.root[2]-(B[k][2]-B.root[2])));return m}
