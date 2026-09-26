/** More generic motions on the same skeleton (the forward kinematics are attack.mjs's pose()):
 * pushed down and held on the floor, kisses, poses without restraints, small creatures clinging
 * to the body, sitting, getting up, held from behind.
 *
 * Each motion has a view: the direction it is shown in. Floor poses are shown from the side
 * ("right": head to the left, feet to the right); kisses from the side too, so both faces show.
 * Restraints are binds (a joint tied toward an anchor point, or two joints banded together);
 * a clinging creature is a bind with creature:1 on a body point (chest_left / chest_right / groin); coil:1 is a ring round
 * the body at a joint, engulf:1 a soft mass up to a height (level), bubble:1 a bubble round her.
 * expr sets the face drawn in the references: 'shut' eyes, 'o' open mouth, 'line' pressed mouth.
 */
import {pose,project,DIRECTIONS,YAW} from './attack.mjs';
import {between,keyGap} from './blend.mjs';
const TAU=Math.PI*2,S=t=>Math.sin(TAU*t),C=t=>Math.cos(TAU*t);
/* foot: [lateral, forward, heel lift (- = lower, lying), toe yaw, in the air, pointed toes, knee out, knee up, knee direction, foot direction ('shin' = along the shin)] */
const foot=(l,z,{lift=0,yaw=0,air=0,point=0,knee=-.08,up=0,dir,toes}={})=>[l,z,lift,yaw,air?1:0,point,knee,up,dir,toes];
const BASE={raw:1,noSword:1,noShield:1,rootZ:0,hipY:181,pelvis:0,torso:0,pitch:0,sway:0,head:[0,0,0],
 footL:foot(10,0,{yaw:-8,knee:-.25}),footR:foot(-10,0,{yaw:-8,knee:-.25}),armR:{d:[-.2,.95,.1],e:.95},armL:{d:[.2,.95,.1],e:.95}};
const loop=(n,ms,f)=>Array.from({length:n},(_,i)=>({...f(i/n,i),ms}));
/* tween: a smooth run of frames between key poses ([key, frames to the next key]); the frames between are
   blended by where the body is (blend.mjs), so nothing jumps where two keys describe a limb differently */
/* a snap: a key reached in one go on purpose (the peak of a climax, bursting free, being flung off) */
const SNAP=/^(頂点|振りほどく|はじかれる|びくっ)/;
/* each step is cut into at least as many frames as it asks for, and more if a joint would move over ~24 px (the eased middle of a step is 1.5x its average, so 16 px on average)
   in one frame (not into a snap); the step keeps its length in time (msScale shortens the frames) */
function tween(steps){const out=[];steps.forEach(([k,n0],i)=>{const nx=steps[i+1]?.[0];const n=nx&&n0>0&&!SNAP.test(nx.phase||'')?Math.max(n0,Math.ceil(keyGap(k,nx)/16)):n0;
 for(let j=0;j<(nx?n:1);j++){const u=nx?j/n:0,e=u*u*(3-2*u);const q=nx&&j>0?{...between(k,nx,e)}:{...k};if(j>0){q.phase='…';q.binds=u<.5?k.binds:nx.binds;q.expr=u<.5?k.expr:nx.expr}q.msScale=nx&&n0>0?n0/n:1;out.push(q)}});return out}
/* a loop through key poses with in-betweens: each key's ms is shared out over its frames */
const loopTween=(keys,n=2)=>tween([...keys.map(k=>[k,n]),[keys[0],0]]).slice(0,-1).map(q=>({...q,ms:Math.round(q.ms*q.msScale/n),msScale:1}));
/* getting up from sitting with the legs folded out: onto the knees, one foot forward, up */
const fromSit=(binds,last)=>tween([
 [{...SIT,head:[-12,6,0],binds,expr:'o',phase:'座る sitting'},2],
 [{...SIT,pitch:22,head:[-10,0,0],armR:{d:[-.25,.8,.55],e:.95},armL:{d:[.25,.8,.55],e:.95},binds,expr:'o',phase:'手をつく hands to the floor in front'},2],
 [{...BASE,hipY:205,pitch:8,head:[-8,0,0],footL:foot(10,-34,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,-34,{lift:-6,point:40,dir:[0,1,.2]}),armR:{d:[-.2,.95,.2],e:.95},armL:{d:[.2,.95,.2],e:.95},binds,phase:'膝立ち up on her knees'},2],
 [{...BASE,hipY:210,pitch:14,head:[-6,0,0],footL:foot(10,-34,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,12,{knee:.1,up:.8}),armR:{d:[-.2,.9,.4],e:.9},armL:{d:[.2,.9,.4],e:.9},binds,phase:'片膝 one foot forward'},2],
 [{...BASE,hipY:194,pitch:12,head:[-6,0,0],footL:foot(10,-8,{lift:3}),footR:foot(-10,8,{knee:.1}),armR:{d:[-.2,.95,.3],e:.9},armL:{d:[.2,.95,.3],e:.9},binds,phase:'立ち上がる rising'},2],
 [{...BASE,...last,binds,phase:last.phase||'立つ standing'},0]]).map(k=>({...k,ms:k.ms||95}));
const CREATURES=[{creature:1,j:'chest_left'},{creature:1,j:'chest_right'},{creature:1,j:'groin'}];   // the chest, left and right, and the front of the crotch

/* ---- lying on the back (seen from the side) ---- */
const ONBACK={...BASE,hipY:233,pitch:-86,head:[88,0,0],
 footL:foot(10,26,{knee:.2,up:1.3}),footR:foot(-10,26,{knee:.2,up:1.3}),
 armR:{d:[-.3,-.35,-.88],e:.98},armL:{d:[.3,-.35,-.88],e:.98}};   // arms raised past the head
const WRISTS_OVERHEAD=[{j:'wrist_right',to:[-14,226,-104]},{j:'wrist_left',to:[14,226,-104]}];
/* ---- face down ---- */
const PRONE={...BASE,hipY:233,pitch:86,head:[-80,0,0],
 footL:foot(9,-54,{lift:-3,knee:0,up:-1,toes:'shin'}),footR:foot(-9,-54,{lift:-3,knee:0,up:-1,toes:'shin'}),
 armR:{d:[-.3,-.3,.9],e:.98},armL:{d:[.3,-.3,.9],e:.98}};
const WRISTS_AHEAD=[{j:'wrist_right',to:[-14,226,104]},{j:'wrist_left',to:[14,226,104]}];
/* ---- kneeling, chest down, hips up ---- */
const HIPSUP={...BASE,hipY:205,pitch:112,head:[-40,0,0],
 footL:foot(10,-34,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,-34,{lift:-6,point:40,dir:[0,1,.2]}),
 armR:{d:[-.2,.45,.87],e:.92},armL:{d:[.2,.45,.87],e:.92}};
/* ---- sitting on the floor, legs folded out to the sides (onna-zuwari) ---- */
const SIT={...BASE,hipY:228,pitch:4,head:[-8,0,0],
 footL:foot(18,-4,{lift:-6,yaw:170,dir:[.25,.6,1]}),footR:foot(-18,-4,{lift:-6,yaw:170,dir:[.25,.6,1]}),
 armR:{d:[-.05,.8,.6],e:.8},armL:{d:[.05,.8,.6],e:.8}};
/* standing, free */
const STAND={...BASE};
export const NEUTRAL=STAND;   // standing at rest: where most motions start and end (the transition check compares against it)

export const MOTIONS={
 /* ======== pushed down, held on the floor ======== */
 down_fall_back:{label:'押されて尻もちをつき、仰向けに倒れる',loop:false,view:'right',keys:tween([
  [{...STAND,armR:{d:[-.3,.3,.9],e:.7},armL:{d:[.3,.3,.9],e:.7},phase:'立つ standing, hands up'},2],
  [{...STAND,pitch:-12,rootZ:-3,hipY:184,armR:{d:[-.35,.1,.93],e:.9},armL:{d:[.35,.1,.93],e:.9},head:[-5,0,0],expr:'o',phase:'押される pushed: leans back, arms out'},2],
  [{...STAND,pitch:-22,rootZ:-9,hipY:198,footL:foot(10,2,{knee:.1,up:.6}),footR:foot(-10,2,{knee:.1,up:.6}),armR:{d:[-.4,.5,-.75],e:.9},armL:{d:[.4,.5,-.75],e:.9},expr:'o',phase:'よろける knees give, hands reach back'},2],
  [{...ONBACK,hipY:230,pitch:-40,rootZ:-14,head:[20,0,0],footL:foot(10,14,{knee:.2,up:1.2}),footR:foot(-10,14,{knee:.2,up:1.2}),armR:{d:[-.45,.7,-.55],e:.95},armL:{d:[.45,.7,-.55],e:.95},expr:'o',phase:'尻もち sits down hard, catches herself'},2],
  [{...ONBACK,rootZ:-14,footL:foot(10,14,{knee:.2,up:1.2,lift:4,air:1}),footR:foot(-10,14,{knee:.2,up:1.2,lift:4,air:1}),armR:{d:[-.6,-.2,-.8],e:.9},armL:{d:[.6,-.2,-.8],e:.9},head:[70,0,0],expr:'shut-o',phase:'倒れる falls onto her back, head bumps, feet come up'},1],
  [{...ONBACK,rootZ:-14,footL:foot(10,14,{knee:.2,up:1.2}),footR:foot(-10,14,{knee:.2,up:1.2}),armR:{d:[-.7,.1,-.7],e:.9},armL:{d:[.7,.1,-.7],e:.9},expr:'shut',phase:'仰向け on her back'},0]]).map(k=>({...k,ms:k.ms||80}))},
 down_pinned_kick:{label:'仰向けで両手首を頭の上に押さえられ、脚をばたつかせる',loop:true,view:'right',keys:loop(8,100,t=>({...ONBACK,
  pelvis:10*S(t),torso:-6*S(t),sway:2*S(t),head:[85,0,30*S(t)],
  footL:foot(10,28+14*Math.max(0,S(t)),{lift:Math.max(0,S(t))*12,air:S(t)>.2,knee:.2,up:1.3}),footR:foot(-10,28+14*Math.max(0,-S(t)),{lift:Math.max(0,-S(t))*12,air:S(t)<-.2,knee:.2,up:1.3}),
  binds:WRISTS_OVERHEAD,expr:'line',phase:'kicks with one leg then the other, twists at the hips, turns her face away'}))},
 down_pinned_spread:{label:'仰向けで立てた膝を左右へ開かれ、腰をよじる',loop:true,view:'down_right',keys:loop(8,110,t=>({...ONBACK,
  pelvis:9*S(t),sway:2*S(t),head:[85,0,20*S(t)],
  footL:foot(18,22,{knee:1.15-.3*Math.max(0,S(t+.25)),up:.9}),footR:foot(-18,22,{knee:1.15-.3*Math.max(0,S(t+.25)),up:.9}),
  binds:[...WRISTS_OVERHEAD,{j:'knee_left',to:[56,236,26]},{j:'knee_right',to:[-56,236,26]}],expr:'line',phase:'knees held apart; tries to close them, twists the hips'}))},
 down_pinned_rock:{label:'仰向けで膝を開かれ、体が頭の方へ前後に揺れる',loop:true,view:'down_right',keys:loop(8,85,t=>({...ONBACK,
  rootZ:4*S(t),head:[85-8*S(t-.1),0,0],shrug:1.5*S(t),
  footL:foot(18,22+2*S(t),{knee:1.15,up:.9,point:10}),footR:foot(-18,22+2*S(t),{knee:1.15,up:.9,point:10}),
  binds:[...WRISTS_OVERHEAD,{j:'knee_left',to:[56,236,26]},{j:'knee_right',to:[-56,236,26]}],expr:S(t)>0?'o':'shut',phase:S(t)>.3?'pushed toward her head':S(t)<-.3?'slides back':'…'}))},
 down_face_down:{label:'うつ伏せで押さえられ、脚をばたつかせてもがく',loop:true,view:'right',keys:loop(12,67,t=>({...PRONE,
  pelvis:8*S(t),sway:2*S(t),head:[-80,0,25*S(t)],
  footL:foot(9,-54+20*Math.max(0,S(t)),{lift:-3+28*Math.max(0,S(t)),air:S(t)>.2,knee:0,up:-1,toes:'shin'}),footR:foot(-9,-54+20*Math.max(0,-S(t)),{lift:-3+28*Math.max(0,-S(t)),air:S(t)<-.2,knee:0,up:-1,toes:'shin'}),
  binds:WRISTS_AHEAD,expr:'line',phase:'kicks from the knees one leg after the other, hips twisting'}))},
 down_hips_up:{label:'膝をついて胸を床につけ、腰を上げたまま前後に揺れる',loop:true,view:'right',keys:loop(8,90,t=>({...HIPSUP,
  rootZ:4*S(t),hipY:205-1.5*C(t),head:[-40+8*S(t-.1),0,0],
  binds:[{j:'wrist_right',to:[-12,240,80]},{j:'wrist_left',to:[12,240,80]}],expr:S(t)>0?'o':'shut',phase:S(t)>.3?'hips pushed forward':S(t)<-.3?'hips drawn back':'…'}))},
 get_up:{label:'仰向けから起き上がる',loop:false,view:'right',keys:tween([   // the legs stay side by side and only fold and unfold (no sitting with them folded out)
  [{...ONBACK,rootZ:-14,footL:foot(10,12,{knee:.2,up:1.2}),footR:foot(-10,12,{knee:.2,up:1.2}),armR:{d:[-.7,.1,-.7],e:.9},armL:{d:[.7,.1,-.7],e:.9},expr:'shut',phase:'仰向け on her back, knees up'},2],
  [{...ONBACK,rootZ:-14,hipY:232,pitch:-55,head:[25,0,0],footL:foot(10,12,{knee:.2,up:1.2}),footR:foot(-10,12,{knee:.2,up:1.2}),armR:{d:[-.45,.75,-.5],e:.9},armL:{d:[.45,.75,-.5],e:.9},phase:'肘をつく up on her elbows'},2],
  [{...STAND,rootZ:-14,hipY:230,pitch:-15,head:[0,0,0],footL:foot(10,14,{knee:.2,up:1.2}),footR:foot(-10,14,{knee:.2,up:1.2}),armR:{d:[-.35,.85,-.45],e:.95},armL:{d:[.35,.85,-.45],e:.95},phase:'座る sitting, knees up, hands on the floor behind'},2],
  [{...STAND,rootZ:2,hipY:214,pitch:38,head:[-10,0,0],footL:foot(10,12,{knee:.15,up:.6,lift:3}),footR:foot(-10,12,{knee:.15,up:.6,lift:3}),armR:{d:[-.2,.9,.45],e:.9},armL:{d:[.2,.9,.45],e:.9},phase:'しゃがむ rocks forward onto her feet, hands to the floor in front'},2],
  [{...STAND,rootZ:8,hipY:198,pitch:18,head:[-4,0,0],footL:foot(10,11,{knee:.05}),footR:foot(-10,11,{knee:.05}),armR:{d:[-.2,.95,.25],e:.95},armL:{d:[.2,.95,.25],e:.95},phase:'立ち上がる rising, hands on her knees'},2],
  [{...STAND,rootZ:10,footL:foot(10,10,{yaw:-8,knee:-.25}),footR:foot(-10,10,{yaw:-8,knee:-.25}),phase:'立つ standing'},0]]).map(k=>({...k,ms:90}))},

 /* ======== kisses (seen from the side; the other's face is the violet line's end) ======== */
 kiss_forced:{label:'口づけされて押し返そうとする',loop:true,view:'right',keys:loop(8,110,t=>({...STAND,
  pitch:-7,rootZ:-2,head:[12,6*S(t),10*S(t)],pelvis:8*S(t),sway:1.5*S(t),
  footL:foot(10,0,{yaw:-8,knee:-.25,point:Math.max(0,S(t))*18}),footR:foot(-10,0,{yaw:-8,knee:-.25,point:Math.max(0,-S(t))*18}),
  armR:{t:[-5,52+2*S(t),24],p:[-1,.6,0]},armL:{t:[5,52-2*S(t),24],p:[1,.6,0]},
  binds:[{j:'face',to:[0,97,17],partner:1}],expr:'shut-line',phase:'held at the mouth; both hands push at the other, the body twists'}))},
 kiss_tension:{label:'口づけされたまま全身がこわばり、膝が崩れる',loop:false,view:'right',keys:tween([
  [{...STAND,pitch:-7,head:[12,0,0],armR:{t:[-5,52,24],p:[-1,.6,0]},armL:{t:[5,52,24],p:[1,.6,0]},binds:[{j:'face',to:[0,97,17],partner:1}],expr:'shut-line',phase:'押し返す still pushing'},2],
  [{...STAND,pitch:-10,head:[16,0,0],footL:foot(10,0,{point:40,knee:-.2}),footR:foot(-10,0,{point:40,knee:-.2}),armR:{t:[-6,50,20],p:[-1,.6,0]},armL:{t:[6,50,20],p:[1,.6,0]},binds:[{j:'face',to:[0,97,17],partner:1}],expr:'shut',phase:'こわばる goes rigid, up on her toes'},1],
  [{...STAND,pitch:-12,head:[18,0,0],footL:foot(10,0,{point:48,knee:-.2}),footR:foot(-10,0,{point:48,knee:-.2}),armR:{d:[-.4,.6,.6],e:.9},armL:{d:[.4,.6,.6],e:.9},shrug:3,binds:[{j:'face',to:[0,97,17],partner:1}],expr:'shut',phase:'頂点 peak: hands fly open, toes pointed'},1],
  [{...STAND,pitch:-10,head:[16,4,0],footL:foot(10,0,{point:42,knee:-.2}),footR:foot(-10,0,{point:42,knee:-.2}),armR:{d:[-.45,.7,.5],e:.9},armL:{d:[.45,.7,.5],e:.9},binds:[{j:'face',to:[0,97,17],partner:1}],expr:'shut',phase:'震え shudder'},1],
  [{...STAND,pitch:-12,head:[18,-4,0],footL:foot(10,0,{point:48,knee:-.2}),footR:foot(-10,0,{point:48,knee:-.2}),armR:{d:[-.4,.6,.6],e:.9},armL:{d:[.4,.6,.6],e:.9},shrug:3,binds:[{j:'face',to:[0,97,17],partner:1}],expr:'shut',phase:'震え shudder'},2],
  [{...STAND,hipY:194,pitch:-4,head:[14,0,0],footL:foot(10,0,{knee:-.45}),footR:foot(-10,0,{knee:-.45}),armR:{d:[-.2,.95,.2],e:.95},armL:{d:[.2,.95,.2],e:.95},binds:[{j:'face',to:[0,106,22],partner:1}],expr:'shut-o',phase:'崩れる knees give inward, arms hang, held up at the mouth'},2],
  [{...STAND,hipY:200,pitch:0,head:[12,6,0],footL:foot(10,0,{knee:-.5}),footR:foot(-10,0,{knee:-.5}),armR:{d:[-.15,1,.1],e:.95},armL:{d:[.15,1,.1],e:.95},binds:[{j:'face',to:[0,114,27],partner:1}],expr:'shut-o',phase:'脱力 limp'},0]]).map(k=>({...k,ms:90}))},
 kiss_respond:{label:'口づけに応える（爪先立ちで身を寄せる）',loop:true,view:'right',keys:loop(8,130,t=>({...STAND,
  pitch:6,rootZ:2,head:[10,14+3*S(t),6*S(t)],sway:2*S(t),pelvis:6*S(t),
  footL:foot(10,0,{yaw:-8,knee:-.25,point:26+6*S(t)}),footR:foot(-10,0,{yaw:-8,knee:-.25,point:26-6*S(t)}),
  armR:{d:[-.28,-.68,.68],e:.98},armL:{d:[.28,-.68,.68],e:.98},
  binds:[{j:'face',to:[0,93,38],partner:1}],expr:'shut',phase:'rises onto her toes, leans in, head tilted; arms reach up and round the other'}))},

 /* ======== standing, no restraints ======== */
 tempt_pose:{label:'脚を開いて腰を前に出し、ゆっくり揺らす（誘う姿勢）',loop:true,view:'front',keys:loop(8,160,t=>({...STAND,
  rootZ:3,pitch:-5,sway:3*S(t),pelvis:10*S(t),torso:-5*S(t),hipY:184,head:[-6,10*S(t)+4,0],
  footL:foot(15,1,{yaw:10,knee:.35}),footR:foot(-15,1,{yaw:10,knee:.35}),
  armR:{t:[4,34,11],p:[-1,.6,.2]},armL:{t:[11,-6,7],p:[1,.4,0]},phase:'legs apart, hips pushed forward and swaying slowly; one hand on her chest, the other on her thigh; head tilted, looking down'}))},
 chain_splay:{label:'脚ががに股に開き、膝と腰が小刻みに震える',loop:true,view:'front',keys:loop(8,55,t=>({...STAND,
  hipY:193+1.2*S(2*t),sway:1.5*S(t),pitch:-6,head:[16,4*S(t),0],shrug:1.5*Math.abs(S(t)),
  footL:foot(20,2,{yaw:40,knee:1.0+.12*S(2*t),point:6}),footR:foot(-20,2,{yaw:40,knee:1.0-.12*S(2*t),point:6}),
  armR:{d:[-.35,.9,.2],e:.9},armL:{d:[.35,.9,.2],e:.9},expr:'shut-o',phase:'knees splayed and shaking, hips trembling, arms hanging loose, head back'}))},
 tension_free:{label:'立ったまま全身がこわばり、膝から崩れて座り込む',loop:false,view:'front',keys:tween([
  [{...STAND,armR:{t:[4,34,11],p:[-1,.6,.2]},armL:{t:[0,6,10],p:[1,.4,0]},head:[-8,0,0],phase:'押さえる hands pressed to her chest and belly'},2],
  [{...STAND,hipY:186,pitch:14,footL:foot(10,0,{knee:-.45,point:10}),footR:foot(-10,0,{knee:-.45,point:10}),armR:{t:[4,34,11],p:[-1,.6,.2]},armL:{t:[0,6,10],p:[1,.4,0]},head:[-18,0,0],expr:'line',phase:'こらえる hunches, knees knock'},2],
  [{...STAND,hipY:183,pitch:-12,footL:foot(10,0,{knee:-.3,point:40}),footR:foot(-10,0,{knee:-.3,point:40}),armR:{t:[4,34,11],p:[-1,.6,.2]},armL:{t:[0,6,10],p:[1,.4,0]},head:[22,0,0],shrug:3,expr:'shut-o',phase:'頂点 peak: arches, up on her toes, head back'},1],
  [{...STAND,hipY:184,pitch:-8,footL:foot(10,0,{knee:-.35,point:30}),footR:foot(-10,0,{knee:-.35,point:30}),armR:{t:[4,34,11],p:[-1,.6,.2]},armL:{t:[0,6,10],p:[1,.4,0]},head:[16,5,0],expr:'shut-o',phase:'震え shudder'},1],
  [{...STAND,hipY:183,pitch:-12,footL:foot(10,0,{knee:-.3,point:40}),footR:foot(-10,0,{knee:-.3,point:40}),armR:{t:[4,34,11],p:[-1,.6,.2]},armL:{t:[0,6,10],p:[1,.4,0]},head:[22,-5,0],shrug:3,expr:'shut-o',phase:'震え shudder'},2],
  [{...STAND,hipY:204,pitch:18,footL:foot(12,0,{knee:-.5}),footR:foot(-12,0,{knee:-.5}),armR:{d:[-.2,.9,.4],e:.9},armL:{d:[.2,.9,.4],e:.9},head:[-15,0,0],expr:'shut-o',phase:'崩れる knees give'},2],
  [{...SIT,head:[-12,6,0],expr:'o',phase:'座り込む sinks to the floor, legs folded out to the sides'},0]]).map(k=>({...k,ms:90}))},
 sit_afterglow:{label:'女の子座りで肩で息をする',loop:true,view:'front',keys:loop(8,150,t=>({...SIT,
  pitch:4+3*S(t),shrug:2*Math.max(0,S(t)),head:[-10+3*S(t),6,0],expr:'o',phase:'sitting with legs folded out to the sides, shoulders heaving'}))},
 held_from_behind:{label:'後ろから腕ごと胴を抱きすくめられ、もがく',loop:true,view:'front',keys:loop(8,110,t=>({...STAND,
  pelvis:12*S(t),torso:-6*S(t),sway:2*S(t),head:[-4,0,25*S(t)],shrug:2,
  footL:foot(10,0,{yaw:-8,knee:-.2,lift:Math.max(0,S(t))*14,air:S(t)>.3}),footR:foot(-10,0,{yaw:-8,knee:-.2,lift:Math.max(0,-S(t))*14,air:S(t)<-.3}),
  armR:{d:[-.12,.97,.15],e:.92},armL:{d:[.12,.97,.15],e:.92},
  binds:[{j:'elbow_right',j2:'elbow_left'},{j:'shoulder_right',to:[-10,120,-40],noLoop:1},{j:'shoulder_left',to:[10,120,-40],noLoop:1}],expr:'line',phase:'arms pinned to her sides by a hold from behind; twists, kicks one foot then the other, looks back'}))},

 /* ======== after a climax: afterglow (loop) and coming round (once); each starts where its climax motion ends ======== */
 down_afterglow:{label:'仰向けで膝が倒れたまま、肩で息をする',loop:true,view:'down_right',keys:loop(8,170,(t,i)=>({...ONBACK,
  shrug:1.8*Math.max(0,S(t)),head:[85,0,22],pelvis:i===5?6:0,
  footL:foot(12,18,{knee:1.5,up:.4,point:i===5?20:0}),footR:foot(-12,18,{knee:1.5,up:.4,point:i===5?20:0}),
  armR:{d:[-.7,.1,-.7],e:.9},armL:{d:[.7,.1,-.7],e:.9},expr:i===5?'shut-o':'o',phase:i===5?'余震 an aftershock: the hips jerk, toes point':'on her back, knees fallen open, arms loose, face turned aside, chest heaving'}))},
 down_recover:{label:'仰向けの余韻から膝を閉じて体を起こしかける（そのあと get_up）',loop:false,view:'down_right',keys:tween([
  [{...ONBACK,head:[85,0,22],footL:foot(12,18,{knee:1.5,up:.4}),footR:foot(-12,18,{knee:1.5,up:.4}),armR:{d:[-.7,.1,-.7],e:.9},armL:{d:[.7,.1,-.7],e:.9},expr:'o',phase:'余韻 limp'},2],
  [{...ONBACK,head:[80,0,0],footL:foot(10,16,{knee:.6,up:1}),footR:foot(-10,16,{knee:.6,up:1}),armR:{d:[-.7,.1,-.7],e:.9},armL:{d:[.7,.1,-.7],e:.9},expr:'line',phase:'膝を閉じる draws her knees together'},2],
  [{...ONBACK,rootZ:-14,footL:foot(10,12,{knee:.2,up:1.2}),footR:foot(-10,12,{knee:.2,up:1.2}),armR:{d:[-.7,.1,-.7],e:.9},armL:{d:[.7,.1,-.7],e:.9},expr:'line',phase:'get_up の最初へ ready to get up (get_up frame 0)'},0]]).map(k=>({...k,ms:110}))},
 kiss_afterglow:{label:'口づけのあと、膝が抜けたままふらつき、肩で息をする（kiss_tension のあと）',loop:true,view:'right',keys:loop(8,170,(t,i)=>({...STAND,
  hipY:200+1*S(t),pitch:2+2*S(t),sway:2*S(t/1),head:[-6+4*S(t-.1),6,0],shrug:1.6*Math.max(0,S(t)),
  footL:foot(10,0,{knee:-.5}),footR:foot(-10,0,{knee:-.5}),armR:{d:[-.15,1,.1],e:.95},armL:{d:[.15,1,.1],e:.95},
  binds:[{j:'face',to:[0,108,44],partner:1}],expr:'o',phase:'the other has drawn back; knees still weak, swaying, head down, shoulders heaving'}))},
 kiss_recover:{label:'我に返って口元をぬぐい、一歩下がる',loop:false,view:'right',keys:tween([
  [{...STAND,hipY:200,pitch:2,head:[-6,6,0],footL:foot(10,0,{knee:-.5}),footR:foot(-10,0,{knee:-.5}),armR:{d:[-.15,1,.1],e:.95},armL:{d:[.15,1,.1],e:.95},binds:[{j:'face',to:[0,108,44],partner:1}],expr:'o',phase:'ふらつく swaying'},2],
  [{...STAND,hipY:190,pitch:-4,head:[-2,0,0],footL:foot(10,0,{knee:-.3}),footR:foot(-10,0,{knee:-.3}),armR:{d:[-.1,-.55,.82],e:.5},armL:{d:[.15,1,.1],e:.95},binds:[{j:'face',to:[0,108,44],partner:1}],expr:'line',phase:'ぬぐう comes to herself, back of the hand to her mouth'},2],
  [{...STAND,rootZ:-6,hipY:186,pitch:-8,head:[-4,0,0],footL:foot(10,-2,{knee:-.25}),footR:foot(-10,-14,{knee:-.2}),armR:{d:[-.1,-.55,.82],e:.5},armL:{d:[.3,.5,.8],e:.9},binds:[{j:'face',to:[0,108,44],partner:1}],expr:'line',phase:'下がる steps back, other hand up to keep it off'},2],
  [{...STAND,rootZ:-10,footL:foot(10,-8,{yaw:-8,knee:-.25}),footR:foot(-10,-12,{yaw:-8,knee:-.25}),armR:{d:[-.3,.3,.9],e:.7},armL:{d:[.3,.3,.9],e:.7},expr:'line',phase:'構え standing, guarded'},0]]).map(k=>({...k,ms:100}))},
 sit_recover:{label:'女の子座りから立ち上がる（tension_free・sit_afterglow のあと）',loop:false,view:'front',keys:fromSit(undefined,{})},
 clinger_afterglow:{label:'張り付かれたまま座り込み、肩で息をする（clinger_tension のあと）',loop:true,view:'front',keys:loop(8,170,(t,i)=>({...SIT,
  pitch:4+3*S(t),shrug:2*Math.max(0,S(t)),head:[-12+3*S(t),6,0],sway:i===5?2:0,
  armR:i===5?{d:[-.35,.8,.45],e:.9}:{d:[-.05,.8,.6],e:.8},armL:i===5?{d:[.35,.8,.45],e:.9}:{d:[.05,.8,.6],e:.8},
  binds:CREATURES,expr:i===5?'shut-o':'o',phase:i===5?'余震 an aftershock: jerks, hands fly off her lap':'sitting with legs folded out to the sides, shoulders heaving; they are still on her'}))},
 clinger_recover:{label:'張り付かれたまま立ち上がり、胸を押さえる',loop:false,view:'front',keys:fromSit(CREATURES,{armR:{t:[5.5,33,12],p:[-1,.6,.2]},armL:{t:[-5.5,33,12],p:[1,.6,.2]},head:[-14,0,0],expr:'line',phase:'立つ standing, hands over them'})},
 /* ======== small creatures clinging to the body (the chest, and the front of the crotch) ======== */
 clinger_peel:{label:'胸と脚の付け根の前に張り付いた小さな生き物を引き剥がそうとする',loop:true,view:'front',keys:loopTween([
  [{...STAND,head:[-24,0,0],footL:foot(10,0,{knee:-.3}),footR:foot(-10,0,{knee:-.3}),binds:CREATURES,phase:'気づく looks down at them'},100],
  [{...STAND,head:[-24,0,0],armR:{t:[5.5,33,12],p:[-1,.6,.2]},binds:CREATURES,phase:'つかむ right hand takes the one on the left'},90],
  [{...STAND,head:[-20,0,-10],torso:10,pitch:6,footL:foot(10,0,{knee:-.35,point:12}),footR:foot(-10,0,{knee:-.35}),armR:{t:[16,36,30],p:[-1,.6,0]},binds:[{creature:1,j:'hand_right'},CREATURES[1],CREATURES[2]],expr:'line',phase:'引く pulls it away from her'},110],
  [{...STAND,head:[-10,0,-20],torso:-8,armR:{d:[-.95,.1,.3],e:.95},binds:CREATURES,expr:'o',phase:'はじかれる it snaps back; her hand flies out'},90],
  [{...STAND,head:[-24,0,0],armL:{t:[-5.5,33,12],p:[1,.6,.2]},binds:CREATURES,phase:'つかむ left hand takes the other one'},90],
  [{...STAND,head:[-20,0,10],torso:-10,pitch:6,footL:foot(10,0,{knee:-.35}),footR:foot(-10,0,{knee:-.35,point:12}),armL:{t:[-16,36,30],p:[1,.6,0]},binds:[CREATURES[0],{creature:1,j:'hand_left'},CREATURES[2]],expr:'line',phase:'引く pulls'},110],
  [{...STAND,head:[-10,0,20],torso:8,armL:{d:[.95,.1,.3],e:.95},binds:CREATURES,expr:'o',phase:'はじかれる snaps back'},90],
  [{...STAND,hipY:186,pitch:10,head:[-18,0,0],footL:foot(10,0,{knee:-.45}),footR:foot(-10,0,{knee:-.45}),armR:{t:[0,6,11],p:[-1,.4,0]},armL:{t:[0,8,11],p:[1,.4,0]},binds:CREATURES,expr:'shut-line',phase:'すくむ shudders, knees together, hands to her belly'},120]].map(([k,ms])=>({...k,ms})))},
 clinger_tension:{label:'張り付かれたまま全身がこわばり、座り込む',loop:false,view:'front',keys:tween([
  [{...STAND,armR:{t:[5.5,33,12],p:[-1,.6,.2]},armL:{t:[-5.5,33,12],p:[1,.6,.2]},head:[-14,0,0],binds:CREATURES,expr:'line',phase:'押さえる hands over the ones on her chest'},2],
  [{...STAND,hipY:185,pitch:12,footL:foot(10,0,{knee:-.45,point:14}),footR:foot(-10,0,{knee:-.45,point:14}),armR:{t:[5.5,33,12],p:[-1,.6,.2]},armL:{t:[-5.5,33,12],p:[1,.6,.2]},head:[-20,0,0],binds:CREATURES,expr:'shut-line',phase:'こらえる hunches, knees knock'},2],
  [{...STAND,hipY:183,pitch:-14,footL:foot(10,0,{knee:-.3,point:42}),footR:foot(-10,0,{knee:-.3,point:42}),armR:{d:[-.6,.5,-.3],e:.9},armL:{d:[.6,.5,-.3],e:.9},head:[24,0,0],shrug:3,binds:CREATURES,expr:'shut-o',phase:'頂点 peak: arches, arms thrown back, on her toes'},1],
  [{...STAND,hipY:184,pitch:-9,footL:foot(10,0,{knee:-.35,point:32}),footR:foot(-10,0,{knee:-.35,point:32}),armR:{d:[-.55,.6,-.3],e:.9},armL:{d:[.55,.6,-.3],e:.9},head:[18,5,0],binds:CREATURES,expr:'shut-o',phase:'震え shudder'},1],
  [{...STAND,hipY:183,pitch:-14,footL:foot(10,0,{knee:-.3,point:42}),footR:foot(-10,0,{knee:-.3,point:42}),armR:{d:[-.6,.5,-.3],e:.9},armL:{d:[.6,.5,-.3],e:.9},head:[24,-5,0],shrug:3,binds:CREATURES,expr:'shut-o',phase:'震え shudder'},2],
  [{...STAND,hipY:204,pitch:18,footL:foot(12,0,{knee:-.5}),footR:foot(-12,0,{knee:-.5}),armR:{d:[-.2,.9,.4],e:.9},armL:{d:[.2,.9,.4],e:.9},head:[-15,0,0],binds:CREATURES,expr:'shut-o',phase:'崩れる knees give'},2],
  [{...SIT,head:[-12,6,0],binds:CREATURES,expr:'o',phase:'座り込む sinks to the floor'},0]]).map(k=>({...k,ms:90}))},
 clinger_accept:{label:'張り付かれたまま振り払うのをやめ、身を任せる',loop:true,view:'front',keys:loop(8,170,t=>({...STAND,
  pitch:-8,shrug:-2,sway:2.5*S(t),pelvis:8*S(t),torso:-4*S(t),head:[18,8*S(t),0],hipY:183,
  footL:foot(12,0,{yaw:0,knee:.05}),footR:foot(-12,0,{yaw:0,knee:.05}),
  armR:{d:[-.5,.82,.25],e:.95},armL:{d:[.5,.82,.25],e:.95},binds:CREATURES,expr:'shut-o',phase:'stops fighting: arms hang open, chest forward, head tipped back, hips swaying slowly'}))},
 /* ======== held on the floor: the climax ======== */
 down_tension:{label:'仰向けで押さえられたまま全身がこわばり、腰が浮く',loop:false,view:'down_right',keys:tween([
  [{...ONBACK,footL:foot(18,22,{knee:1.15,up:.9}),footR:foot(-18,22,{knee:1.15,up:.9}),binds:[...WRISTS_OVERHEAD,{j:'knee_left',to:[56,236,26]},{j:'knee_right',to:[-56,236,26]}],expr:'o',phase:'揺れ held down, knees apart'},2],
  [{...ONBACK,hipY:229,pitch:-80,head:[95,0,0],footL:foot(18,22,{knee:1.1,up:.9,point:30}),footR:foot(-18,22,{knee:1.1,up:.9,point:30}),binds:[...WRISTS_OVERHEAD,{j:'knee_left',to:[56,236,26]},{j:'knee_right',to:[-56,236,26]}],expr:'shut-line',phase:'こわばる goes rigid, hips start to lift'},1],
  [{...ONBACK,hipY:225,pitch:-75,head:[100,0,0],shrug:3,footL:foot(18,22,{knee:1.05,up:.9,point:60}),footR:foot(-18,22,{knee:1.05,up:.9,point:60}),binds:[...WRISTS_OVERHEAD,{j:'knee_left',to:[56,236,26]},{j:'knee_right',to:[-56,236,26]}],expr:'shut-o',phase:'頂点 peak: hips off the floor, back arched, head pressed back, toes pointed'},1],
  [{...ONBACK,hipY:228,pitch:-78,head:[96,0,12],footL:foot(18,22,{knee:1.08,up:.9,point:50}),footR:foot(-18,22,{knee:1.08,up:.9,point:50}),binds:[...WRISTS_OVERHEAD,{j:'knee_left',to:[56,236,26]},{j:'knee_right',to:[-56,236,26]}],expr:'shut-o',phase:'震え jerk'},1],
  [{...ONBACK,hipY:225,pitch:-75,head:[100,0,-12],shrug:3,footL:foot(18,22,{knee:1.05,up:.9,point:60}),footR:foot(-18,22,{knee:1.05,up:.9,point:60}),binds:[...WRISTS_OVERHEAD,{j:'knee_left',to:[56,236,26]},{j:'knee_right',to:[-56,236,26]}],expr:'shut-o',phase:'震え jerk'},1],
  [{...ONBACK,hipY:229,pitch:-79,head:[96,0,8],footL:foot(18,22,{knee:1.08,up:.9,point:45}),footR:foot(-18,22,{knee:1.08,up:.9,point:45}),binds:[...WRISTS_OVERHEAD,{j:'knee_left',to:[56,236,26]},{j:'knee_right',to:[-56,236,26]}],expr:'shut-o',phase:'震え jerk'},1],
  [{...ONBACK,footL:foot(16,20,{knee:1.3,up:.6,point:10}),footR:foot(-16,20,{knee:1.3,up:.6,point:10}),binds:[...WRISTS_OVERHEAD,{j:'knee_left',to:[56,236,26]},{j:'knee_right',to:[-56,236,26]}],head:[85,0,20],expr:'shut',phase:'抜ける release: hips drop, knees fall open'},2],
  [{...ONBACK,footL:foot(12,18,{knee:1.5,up:.4}),footR:foot(-12,18,{knee:1.5,up:.4}),binds:WRISTS_OVERHEAD,head:[85,0,22],expr:'o',phase:'脱力 limp (on to down_afterglow)'},0]]).map(k=>({...k,ms:k.phase?.startsWith('頂点')?160:90}))},

 /* ======== swallowed to the waist by a soft mass (the translucent pink shape; drawn by the game) ======== */
 engulf_sink:{label:'柔らかい塊に足元から腰まで呑まれていく',loop:false,view:'front',keys:tween([
  [{...STAND,binds:[{engulf:1,level:238}],expr:'o',phase:'足元 it closes over her feet'},2],
  [{...STAND,pitch:10,head:[-24,0,0],armR:{d:[-.4,.5,.75],e:.9},armL:{d:[.4,.5,.75],e:.9},binds:[{engulf:1,level:214}],expr:'o',phase:'膝まで up to her knees; she looks down, arms out for balance'},2],
  [{...STAND,pitch:-4,torso:14,head:[-10,0,-15],armR:{d:[-.6,-.3,.5],e:.9},armL:{d:[.5,.2,.8],e:.9},binds:[{engulf:1,level:198}],expr:'line',phase:'もがく up to her thighs; twists, pulls one leg in vain'},2],
  [{...STAND,pitch:6,torso:-10,head:[-14,0,12],armR:{d:[-.35,.75,.55],e:.8},armL:{d:[.35,.75,.55],e:.8},binds:[{engulf:1,level:186}],expr:'line',phase:'腰まで up to her waist; both hands push down on it'},0]]).map(k=>({...k,ms:110}))},
 engulf_struggle:{label:'腰まで呑まれたまま、上体をひねって抜け出そうとする',loop:true,view:'front',keys:loop(8,110,t=>({...STAND,
  torso:14*S(t),pitch:4+4*C(t),sway:1.5*S(t),head:[-8,0,-18*S(t)],
  armR:{d:[-.35,.72-.2*Math.max(0,S(t)),.6],e:.82},armL:{d:[.35,.72-.2*Math.max(0,-S(t)),.6],e:.82},
  binds:[{engulf:1,level:186}],expr:'line',phase:'twists at the chest (the legs cannot move), pushing down on the mass with one hand then the other'}))},
 engulf_rock:{label:'腰まで呑まれたまま、腰がびくびくと跳ねる',loop:true,view:'front',keys:loop(8,90,(t,i)=>{const pulse=i===1||i===5,after=i===2||i===6;return{...STAND,
  rootZ:pulse?3:after?1.5:0,pitch:pulse?-9:after?-5:2,head:[pulse?16:after?8:-6,0,0],shrug:pulse?2:0,
  armR:{d:[-.3,.7,.62],e:.85},armL:{d:[.3,.7,.62],e:.85},
  binds:[{engulf:1,level:186}],expr:pulse?'shut-o':'o',phase:pulse?'跳ねる the hips jerk forward inside it, the back arches, head goes back':'hands pressed on the mass, panting'}})},
 engulf_tension:{label:'腰まで呑まれたまま全身がこわばり、前へ崩れる',loop:false,view:'front',keys:tween([
  [{...STAND,pitch:2,armR:{d:[-.3,.7,.62],e:.85},armL:{d:[.3,.7,.62],e:.85},binds:[{engulf:1,level:186}],expr:'o',phase:'揺れ'},2],
  [{...STAND,pitch:-12,shrug:3,head:[26,0,0],armR:{d:[-.65,-.45,.3],e:.95},armL:{d:[.65,-.45,.3],e:.95},binds:[{engulf:1,level:186}],expr:'shut-o',phase:'頂点 peak: arches back, arms flung up and out, head back'},1],
  [{...STAND,pitch:-8,head:[20,0,8],armR:{d:[-.6,-.3,.4],e:.9},armL:{d:[.6,-.3,.4],e:.9},binds:[{engulf:1,level:186}],expr:'shut-o',phase:'震え jerk'},1],
  [{...STAND,pitch:-12,shrug:3,head:[26,0,-8],armR:{d:[-.65,-.45,.3],e:.95},armL:{d:[.65,-.45,.3],e:.95},binds:[{engulf:1,level:186}],expr:'shut-o',phase:'震え jerk'},1],
  [{...STAND,pitch:-6,head:[18,0,4],armR:{d:[-.6,-.2,.5],e:.9},armL:{d:[.6,-.2,.5],e:.9},binds:[{engulf:1,level:186}],expr:'shut-o',phase:'震え jerk'},2],
  [{...STAND,pitch:24,head:[-26,0,0],armR:{d:[-.2,.6,.78],e:.9},armL:{d:[.2,.6,.78],e:.9},binds:[{engulf:1,level:186}],expr:'o',phase:'崩れる folds forward over it, forearms resting on the mass'},0]]).map(k=>({...k,ms:k.phase?.startsWith('頂点')?160:90}))},

 /* ======== coiled round, arms pinned to her sides (the violet rings) ======== */
 wrap_squeeze:{label:'腕ごと胴に巻きつかれ、締め付けられるたびに背中が反る',loop:true,view:'front',keys:loop(8,100,(t,i)=>{const sq=[0,.4,.8,1,.6,.3,.1,0][i];return{...STAND,
  pitch:-12*sq,shrug:2*sq,head:[-4+18*sq,0,0],hipY:181+1.5*sq,
  footL:foot(9,0,{yaw:-10,knee:-.3,point:24*sq}),footR:foot(-9,0,{yaw:-10,knee:-.3,point:24*sq}),
  armR:{d:[-.07,.97,.12],e:.95},armL:{d:[.07,.97,.12],e:.95},
  binds:[{coil:1,j:'thorax',r:18},{coil:1,j:'waist',r:17},{coil:1,j:'root',r:16}],expr:sq>.7?'shut-line':sq>.2?'line':'o',phase:sq>.7?'締まる squeezed: back arches, up on her toes':sq>.2?'tightening':'eases off; she gasps'}})},
 wrap_tension:{label:'巻きつかれたまま全身がこわばり、脱力する',loop:false,view:'front',keys:tween([
  [{...STAND,armR:{d:[-.07,.97,.12],e:.95},armL:{d:[.07,.97,.12],e:.95},binds:[{coil:1,j:'thorax',r:18},{coil:1,j:'waist',r:17},{coil:1,j:'root',r:16}],expr:'line',phase:'締め付け held'},2],
  [{...STAND,pitch:-18,shrug:3,head:[28,0,0],hipY:183,footL:foot(9,0,{knee:-.25,point:50}),footR:foot(-9,0,{knee:-.25,point:50}),armR:{d:[-.07,.97,.12],e:.95},armL:{d:[.07,.97,.12],e:.95},binds:[{coil:1,j:'thorax',r:18},{coil:1,j:'waist',r:17},{coil:1,j:'root',r:16}],expr:'shut-o',phase:'頂点 peak: arched hard inside the coils, toes pointed'},1],
  [{...STAND,pitch:-14,head:[22,0,8],hipY:183,footL:foot(9,0,{knee:-.25,point:40}),footR:foot(-9,0,{knee:-.25,point:40}),armR:{d:[-.07,.97,.12],e:.95},armL:{d:[.07,.97,.12],e:.95},binds:[{coil:1,j:'thorax',r:18},{coil:1,j:'waist',r:17},{coil:1,j:'root',r:16}],expr:'shut-o',phase:'震え jerk'},1],
  [{...STAND,pitch:-18,shrug:3,head:[28,0,-8],hipY:183,footL:foot(9,0,{knee:-.25,point:50}),footR:foot(-9,0,{knee:-.25,point:50}),armR:{d:[-.07,.97,.12],e:.95},armL:{d:[.07,.97,.12],e:.95},binds:[{coil:1,j:'thorax',r:18},{coil:1,j:'waist',r:17},{coil:1,j:'root',r:16}],expr:'shut-o',phase:'震え jerk'},2],
  [{...STAND,pitch:14,hipY:194,head:[-28,6,0],footL:foot(10,0,{knee:-.5}),footR:foot(-10,0,{knee:-.5}),armR:{d:[-.07,.97,.12],e:.95},armL:{d:[.07,.97,.12],e:.95},binds:[{coil:1,j:'thorax',r:18},{coil:1,j:'waist',r:17},{coil:1,j:'root',r:16}],expr:'o',phase:'脱力 limp, held up by the coils, knees in'},0]]).map(k=>({...k,ms:k.phase?.startsWith('頂点')?160:90}))},

 /* ======== an ankle caught from behind ======== */
 ankle_grabbed:{label:'足首をつかまれて後ろへ引かれ、よろけて四つん這いになる',loop:false,view:'right',keys:tween([
  [{...STAND,binds:[{j:'ankle_left',to:[10,238,-8]}],expr:'o',phase:'つかまれる the left ankle is caught'},1],
  [{...STAND,pitch:16,rootZ:3,footL:foot(10,-24,{lift:6,air:1,knee:0}),footR:foot(-10,0,{knee:-.2}),armR:{d:[-.3,.3,.9],e:.9},armL:{d:[.3,.3,.9],e:.9},binds:[{j:'ankle_left',to:[10,230,-38]}],expr:'o',phase:'引かれる the foot is pulled back, she pitches forward'},2],
  [{...STAND,hipY:176,pitch:24,rootZ:4,footL:foot(10,-34,{lift:10,air:1,knee:0}),footR:foot(-10,2,{lift:8,air:1,knee:.1,up:.5}),armR:{d:[-.6,-.2,.75],e:.95},armL:{d:[.6,.1,.8],e:.95},binds:[{j:'ankle_left',to:[10,226,-48]}],expr:'o',phase:'片足跳び hops on the other foot, arms flailing'},2],
  [{...STAND,hipY:208,pitch:80,rootZ:0,head:[-50,0,0],footL:foot(10,-54,{lift:4,air:1,knee:0,toes:'shin'}),footR:foot(-10,-30,{lift:-6,point:40,dir:[0,1,.2]}),armR:{d:[-.15,1,.05],e:1},armL:{d:[.15,1,.05],e:1},binds:[{j:'ankle_left',to:[10,232,-64]}],expr:'line',phase:'倒れる down on her hands and one knee, the caught leg stretched back'},2],
  [{...STAND,hipY:208,pitch:80,rootZ:-4,head:[-30,0,55],footL:foot(10,-58,{lift:2,air:1,knee:0,toes:'shin'}),footR:foot(-10,-32,{lift:-6,point:40,dir:[0,1,.2]}),armR:{d:[-.15,1,.15],e:1},armL:{d:[.15,1,.15],e:1},binds:[{j:'ankle_left',to:[10,234,-70]}],expr:'line',phase:'振り返る dragged back a little, looks back over her shoulder'},0]]).map(k=>({...k,ms:90}))},

 /* ======== breaking free of a hold (any hold: whatever held her is the game's to draw, up to the burst) ======== */
 break_free:{label:'拘束を振りほどき、よろけてから構え直す',loop:false,view:'front',keys:tween([
  [{...STAND,armR:{d:[-.07,.97,.12],e:.95},armL:{d:[.07,.97,.12],e:.95},expr:'line',phase:'捕まっている held (by whatever held her)'},2],
  [{...STAND,hipY:190,pitch:12,shrug:3,torso:-10,footL:foot(12,0,{knee:.1}),footR:foot(-12,0,{knee:.1}),armR:{d:[-.2,.95,.2],e:.9},armL:{d:[.2,.95,.2],e:.9},expr:'shut-line',phase:'力む crouches and gathers herself'},1],
  [{...STAND,hipY:180,pitch:-6,torso:22,footL:foot(12,0,{knee:0}),footR:foot(-12,0,{knee:0}),armR:{d:[-.9,-.1,.3],e:1},armL:{d:[.9,.1,.2],e:1},expr:'o',phase:'振りほどく bursts out: twists and flings both arms wide'},1],
  [{...STAND,rootZ:-6,hipY:186,pitch:-10,torso:6,footL:foot(10,-2,{knee:-.1}),footR:foot(-10,-18,{knee:.1}),armR:{d:[-.6,.3,.6],e:.9},armL:{d:[.6,.4,.5],e:.9},expr:'o',phase:'よろける staggers a step back'},2],
  [{...STAND,rootZ:-8,hipY:188,pitch:6,footL:foot(11,-2,{knee:.1}),footR:foot(-11,-16,{knee:.1}),armR:{d:[-.3,.3,.9],e:.7},armL:{d:[.3,.3,.9],e:.7},expr:'line',phase:'構え直す hands up, knees soft, ready again'},0]]).map(k=>({...k,ms:k.phase?.startsWith('振りほどく')?70:95}))},

 /* ======== pulled toward it on her own (left at the brink) ======== */
 edge_pull:{label:'腰から先に一歩寄ってしまい、はっと引き戻す',loop:false,view:'right',keys:tween([
  [{...STAND,pitch:4,head:[-6,0,0],armR:{d:[-.15,.95,.2],e:.95},armL:{d:[.15,.95,.2],e:.95},expr:'o',phase:'立つ breathing hard'},2],
  [{...STAND,rootZ:6,pitch:-12,head:[10,0,0],footR:foot(-10,14,{lift:4,air:1,knee:-.1}),armR:{d:[-.2,.9,-.3],e:.95},armL:{d:[.2,.9,-.3],e:.95},expr:'shut-o',phase:'腰が出る the hips go first, a foot follows'},1],
  [{...STAND,rootZ:9,pitch:-8,head:[6,0,0],footR:foot(-10,16,{knee:-.15}),armR:{d:[-.2,.9,-.2],e:.95},armL:{d:[.2,.9,-.2],e:.95},expr:'o',phase:'一歩 a step taken'},2],
  [{...STAND,rootZ:4,pitch:14,head:[-16,0,0],footR:foot(-10,14,{knee:-.2}),armR:{t:[2,4,10],p:[-1,.4,0]},armL:{t:[-2,6,10],p:[1,.4,0]},expr:'line',phase:'はっとする catches herself: bends, hands pressed to her lower belly'},2],
  [{...STAND,rootZ:0,pitch:6,head:[-10,0,0],footR:foot(-10,2,{knee:-.2}),armR:{t:[2,4,10],p:[-1,.4,0]},armL:{t:[-2,6,10],p:[1,.4,0]},expr:'line',phase:'戻る steps back'},0]]).map(k=>({...k,ms:100}))},

 /* ======== walking on weak legs (after a hold or a climax, or with things still clinging) ======== */
 walk_unsteady:{label:'膝が震えて内股で歩く（下腹に手を当てて）',loop:true,view:'right',keys:loop(8,120,(t,i)=>{const c=C(t),sn=S(t),buck=i===5;return{...STAND,
  hipY:186+1.5*Math.abs(sn)+(buck?5:0),pitch:8+(buck?8:0),sway:2*sn,pelvis:6*sn,head:[-10+(buck?-6:0),0,0],
  footL:foot(6,8*c,{yaw:-10,knee:-.4,lift:sn>0?5*sn:0,air:sn>.4}),footR:foot(-6,-8*c,{yaw:-10,knee:-.4,lift:sn<0?-5*sn:0,air:sn<-.4}),
  armL:{t:[0,6,10],p:[1,.4,0]},armR:{d:[-.35,.9,.15-.15*c],e:.95},
  expr:buck?'shut-o':'o',phase:buck?'かくん the knees give for a moment':'small knock-kneed steps, one hand on her lower belly'}})},

 /* ======== a gaze she cannot look away from ======== */
 gaze_trance:{label:'見つめられて動けず、棒立ちのまま小さく頷く',loop:true,view:'front',keys:loop(8,180,(t,i)=>({...STAND,
  head:[-7*Math.max(0,S(2*t)),0,0],sway:.6*S(t),
  footL:foot(8,0,{yaw:-8,knee:-.3}),footR:foot(-8,0,{yaw:-8,knee:-.3}),armR:{d:[-.08,.99,.06],e:.98},armL:{d:[.08,.99,.06],e:.98},
  expr:i%4===1?'o':'',phase:'stands stock-still, arms hanging, eyes on the one before her; nods slowly, lips moving'}))},

 /* ======== breathing in spores ======== */
 spore_inhale:{label:'胞子を吸い込み、口を覆って顔をそむけ、膝が内に折れる',loop:true,view:'front',keys:loop(8,110,(t,i)=>{const inh=i===2||i===6;return{...STAND,
  hipY:184+(inh?4:1),pitch:inh?12:5,head:[inh?-14:-8,0,32],
  footL:foot(9,0,{yaw:-12,knee:inh?-.5:-.4}),footR:foot(-9,0,{yaw:-12,knee:inh?-.5:-.4}),
  armR:{t:[-2,70,16],p:[-1,.5,.3]},armL:{t:[3,12,10],p:[1,.4,0]},
  expr:inh?'shut':'line',phase:inh?'吸う breathes some in: coughs, doubles over a little, knees fold in':'hand over her mouth, face turned away'}})},

 /* ======== shivering, hugging herself (brushed by scales, or cold mist) ======== */
 shiver_hug:{label:'自分の体を抱いて小刻みに震え、ときどき跳ねる',loop:true,view:'front',keys:loop(8,60,(t,i)=>{const jump=i===4;return{...STAND,
  hipY:jump?178:184,pitch:jump?-4:10,shrug:3,sway:(i%2?1:-1)*.8,head:[jump?4:-12,0,0],
  footL:foot(8,0,{yaw:-12,knee:-.45,point:jump?22:0}),footR:foot(-8,0,{yaw:-12,knee:-.45,point:jump?22:0}),
  armR:{t:[9,31,11],p:[-1,.3,.4]},armL:{t:[-9,29,12],p:[1,.3,.4]},
  expr:jump?'o':'shut-line',phase:jump?'跳ねる jumps at a touch':'hugging herself, shoulders up, shivering'}})},

 /* ======== inside a bubble (the translucent blue circle) ======== */
 bubble_float:{label:'泡に包まれて床から浮き、体を丸めて口をぱくぱくさせる',loop:true,view:'front',keys:loop(8,140,(t,i)=>({...STAND,
  hipY:168-3*S(t),pitch:12,shrug:2,head:[-6,0,6*S(t)],
  footL:foot(8,4,{lift:16,air:1,point:30,knee:.1,up:.6}),footR:foot(-8,4,{lift:16,air:1,point:30,knee:.1,up:.6}),
  armR:{d:[-.65,.25,.6],e:.95},armL:{d:[.65,.25,.6],e:.95},binds:[{bubble:1}],
  expr:i%2?'o':'shut-o',phase:'lifted off the floor inside it, curled up a little, palms on its wall, mouth opening and closing'}))},

 /* ======== her mind drifting (a high wave of desire) ======== */
 daze_sway:{label:'ぼーっと立ち尽くし、首をかしげてゆらゆら揺れる',loop:true,view:'front',keys:loop(8,200,t=>({...STAND,
  sway:2.5*S(t),pelvis:5*S(t),head:[-4,12*S(t),0],hipY:183,
  footL:foot(9,0,{yaw:-8,knee:-.3}),footR:foot(-9,0,{yaw:-8,knee:-.3}),armR:{d:[-.1,.99,.08],e:.97},armL:{d:[.1,.99,.08],e:.97},
  expr:'o',phase:'standing there dazed, arms loose, head tilting from side to side'}))},
 reach_toward:{label:'思わず片手を伸ばして一歩寄り、手を胸に引っ込める',loop:false,view:'right',keys:tween([
  [{...STAND,head:[-4,0,0],expr:'o',phase:'見る looking at it'},2],
  [{...STAND,rootZ:4,pitch:-4,footR:foot(-10,10,{lift:3,air:1}),armR:{d:[-.05,.15,1],e:.9},head:[2,0,0],expr:'o',phase:'伸ばす reaches toward it, a small step'},2],
  [{...STAND,rootZ:6,pitch:-4,footR:foot(-10,12),armR:{d:[-.05,.1,1],e:.95},head:[2,0,0],expr:'o',phase:'…'},1],
  [{...STAND,rootZ:3,pitch:8,footR:foot(-10,6),armR:{t:[4,34,11],p:[-1,.6,.2]},head:[-18,0,-10],expr:'line',phase:'引っ込める snatches the hand back to her chest, looks away'},2],
  [{...STAND,rootZ:0,pitch:4,armR:{t:[4,34,11],p:[-1,.6,.2]},head:[-12,0,-10],expr:'line',phase:'戻る'},0]]).map(k=>({...k,ms:110}))},

 /* ======== tripping, and going down ======== */
 trip_fall:{label:'つまずいて手と膝をつき、起き上がる',loop:false,view:'right',keys:tween([
  [{...STAND,footL:foot(10,8,{knee:-.2}),footR:foot(-10,-8,{knee:-.2}),phase:'歩く stepping'},1],
  [{...STAND,rootZ:6,pitch:24,footL:foot(10,14,{lift:6,air:1,knee:.1,up:.4}),footR:foot(-10,-12,{lift:4,point:20}),armR:{d:[-.3,.3,.9],e:.9},armL:{d:[.3,.3,.9],e:.9},expr:'o',phase:'つまずく the back foot catches; she pitches forward, arms out'},2],
  [{...STAND,hipY:208,pitch:82,rootZ:4,head:[-45,0,0],footL:foot(10,-28,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,-28,{lift:-6,point:40,dir:[0,1,.2]}),armR:{d:[-.15,1,.08],e:1},armL:{d:[.15,1,.08],e:1},expr:'shut',phase:'手をつく down on her hands and knees'},2],
  [{...STAND,hipY:206,pitch:78,rootZ:4,head:[-15,0,0],footL:foot(10,-28,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,-28,{lift:-6,point:40,dir:[0,1,.2]}),armR:{d:[-.15,1,.08],e:1},armL:{d:[.15,1,.08],e:1},expr:'line',phase:'顔を上げる looks up'},2],
  [{...STAND,hipY:210,pitch:14,rootZ:0,footL:foot(10,-34,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,12,{knee:.1,up:.8}),armR:{d:[-.2,.9,.4],e:.9},armL:{d:[.2,.9,.4],e:.9},expr:'line',phase:'片膝 one foot forward'},2],
  [{...STAND,hipY:196,pitch:12,footL:foot(10,-6,{lift:3}),footR:foot(-10,8,{knee:.1}),phase:'立ち上がる rising'},2],
  [{...STAND,footL:foot(10,0,{yaw:-8,knee:-.25}),footR:foot(-10,4,{yaw:-8,knee:-.25}),phase:'立つ standing'},0]]).map(k=>({...k,ms:90}))},
 defeat_collapse:{label:'力尽きて膝から崩れ、うつ伏せに倒れる',loop:false,view:'right',keys:tween([
  [{...STAND,pitch:6,head:[-10,0,0],expr:'shut-o',phase:'ふらつく swaying'},2],
  [{...STAND,hipY:200,pitch:14,head:[-16,0,0],footL:foot(10,0,{knee:-.5}),footR:foot(-10,0,{knee:-.5}),armR:{d:[-.15,1,.15],e:.95},armL:{d:[.15,1,.15],e:.95},expr:'shut',phase:'崩れる the knees go'},2],
  [{...STAND,hipY:212,pitch:30,head:[-20,0,0],footL:foot(10,-30,{lift:-6,point:40,dir:[0,1,.3]}),footR:foot(-10,-30,{lift:-6,point:40,dir:[0,1,.3]}),armR:{d:[-.15,1,.1],e:.95},armL:{d:[.15,1,.1],e:.95},expr:'shut',phase:'膝をつく on her knees'},2],
  [{...PRONE,hipY:226,pitch:62,head:[-50,0,0],footL:foot(9,-40,{lift:-4,knee:0,up:-1,toes:'shin'}),footR:foot(-9,-40,{lift:-4,knee:0,up:-1,toes:'shin'}),armR:{d:[-.3,.6,.7],e:.95},armL:{d:[.3,.6,.7],e:.95},expr:'shut',phase:'倒れる falling forward'},1],
  [{...PRONE,head:[-80,0,25],armR:{d:[-.6,.1,.6],e:.9},armL:{d:[.5,.2,-.6],e:.9},expr:'shut',phase:'うつ伏せ face down, still'},0]]).map(k=>({...k,ms:110}))},
 grabbed_flinch:{label:'捕まった瞬間にびくっと跳ね、捕まった所を見下ろす',loop:false,view:'front',keys:tween([
  [{...STAND,armR:{d:[-.3,.3,.9],e:.7},armL:{d:[.3,.3,.9],e:.7},expr:'line',phase:'構え guarded'},1],
  [{...STAND,hipY:178,shrug:4,pitch:-4,head:[6,0,0],footL:foot(9,0,{point:20,knee:-.3}),footR:foot(-9,0,{point:20,knee:-.3}),armR:{d:[-.2,.5,.8],e:.55},armL:{d:[.2,.5,.8],e:.55},expr:'o',phase:'びくっ jumps: shoulders up, up on her toes, arms drawn in'},1],
  [{...STAND,hipY:184,pitch:10,head:[-26,0,0],footL:foot(9,0,{knee:-.4}),footR:foot(-9,0,{knee:-.4}),armR:{d:[-.35,.7,.6],e:.8},armL:{d:[.35,.7,.6],e:.8},expr:'o',phase:'見下ろす looks down at where she is caught'},2],
  [{...STAND,hipY:184,pitch:6,torso:10,head:[-16,0,-10],footL:foot(9,0,{knee:-.4}),footR:foot(-9,0,{knee:-.4}),armR:{d:[-.4,.8,.3],e:.9},armL:{d:[.4,.6,.6],e:.9},expr:'line',phase:'もがき始め starts to struggle'},0]]).map(k=>({...k,ms:k.phase?.startsWith('びくっ')?60:100}))}
};

export function library(){
 const poses={},meta={};
 for(const [name,m] of Object.entries(MOTIONS)){
  poses[name]={};
  for(const d of DIRECTIONS)poses[name][d]=m.keys.map((k,i)=>{const J=pose(k);return{direction:d,yaw:YAW[d],motion:name,frame:i,frame_ms:Math.round(k.ms*(k.msScale||1)),phase:k.phase,expr:k.expr,
   binds:(k.binds||[]).map((b,bi)=>({joint:b.j,joint2:b.j2,anchor:b.to?'bind'+bi:null,creature:b.creature?1:undefined,partner:b.partner?1:undefined,noLoop:b.noLoop?1:undefined,
    coil:b.coil?1:undefined,r:b.r,engulf:b.engulf?1:undefined,level:b.level,bubble:b.bubble?1:undefined})),
   joints:project(J,d)}});
  meta[name]={label:m.label,loop:m.loop,view:m.view,frame_ms:m.keys.map(k=>Math.round(k.ms*(k.msScale||1))),phases:m.keys.map(k=>k.phase)};
 }
 return{schema:'anatomical-eight-direction-motion/1.0',extends:'poses.json / attack-poses.json / restraint-poses.json (same skeleton, 288x288 canvas, centre x 144, projection)',
  canvas:[288,288],centre_x:144,ground_y:242,directions:DIRECTIONS,yaw:YAW,
  notes:{view:'the direction each motion is shown in: floor poses and kisses from the side (right; down_right where the knees are held apart), the rest from the front',
   binds:'partner = the other character\'s head (drawn as a violet dashed circle; the kiss is where it meets her face); joint + joint2 = a band between two joints; joint -> anchor = pulled/held toward that point (for a kiss: where the other face is); creature = a small creature clinging at that body point; coil = a ring round the body at that joint (radius r); engulf = a soft mass from the floor up to level (world y); bubble = a bubble round her',
   expr:'the face drawn in the references: shut = eyes closed, o = mouth open, line = mouth pressed shut',
   extra_joints:{face:'where she looks',eye_left:'eyes',eye_right:'eyes',chest_left:'body points where creatures cling',chest_right:'',groin:'the front of the crotch (a creature clings here)',belly:'lower belly',crotch:'just under the hips'}},
  motions:meta,poses};
}
