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
  const sh=J['shoulder_'+side],el=J['elbow_'+side],wr=J['wrist_'+side];q['arm'+S]={w:sub(wr,r),p:norm(sub(el,mul(add(sh,wr),.5)))};
  const hp=J['hip_'+side],kn=J['knee_'+side],an=J['ankle_'+side],to=J['toe_'+side],mir=v=>[v[0]*(side==='right'?-1:1),v[1],v[2]];
  q['foot'+S]=[an[0],an[2],232-an[1],0,1,0,0,0,mir(norm(sub(kn,mul(add(hp,an),.5)))),mir(norm(sub(to,an)))]}
 return q}
/* keep the wrists outside the body: an elliptic cylinder 14 wide and 11 deep each side round the spine */
export function outside(q){const J=pose(q),r=J.root,up=norm(sub(J.neck,r)),sl=norm(sub(J.shoulder_left,J.shoulder_right)),fz=norm(cross(sl,up)),lx=cross(up,fz);
 for(const S of ['R','L']){const A=q['arm'+S];if(!A?.w)continue;const w=add(r,A.w),ab=sub(J.neck,r),t=Math.max(0,Math.min(1,dot(sub(w,r),ab)/dot(ab,ab))),c=add(r,mul(ab,t)),v=sub(w,c),x=dot(v,lx),z=dot(v,fz),e=Math.hypot(x/14,z/11);
  if(e<1){const k=1.04/(e||.01),v2=add(mul(lx,x*k),mul(fz,z*k)),along=mul(up,dot(v,up));A.w=sub(add(add(c,v2),along),r)}}
 return q}
/* the pose a fraction e of the way from key a to key b */
export const between=(a,b,e)=>outside(lerpV(fromJoints(a),fromJoints(b),e));
/* the largest move of a joint between two keys (px; where she stands on the floor does not count) */
const GAPJ=['head','thorax','root','knee_left','knee_right','ankle_left','ankle_right','toe_left','toe_right','elbow_left','elbow_right','wrist_left','wrist_right'];
export function keyGap(a,b){const A=pose(a),B=pose(b);let m=0;for(const k of GAPJ)m=Math.max(m,Math.hypot(A[k][0]-A.root[0]-(B[k][0]-B.root[0]),A[k][1]-B[k][1],A[k][2]-A.root[2]-(B[k][2]-B.root[2])));return m}
