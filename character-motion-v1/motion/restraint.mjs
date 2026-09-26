/** Restrained-pose motions for any character, on the same skeleton and projection as
 * poses.json / attack.mjs (the forward kinematics are attack.mjs's pose()).
 *
 * The character faces the viewer while held (direction "front"); the bent-over pose is shown
 * from behind (up_right / back). Restraints are anchors: each bind ties a joint to a point in
 * the world, or two joints together (a band). The restraints themselves are drawn by the game.
 *
 * No equipment: noSword / noShield (a generic body). World units and the 288x288 canvas are
 * those of attack.mjs.
 */
import {pose,project,DIRECTIONS,YAW} from './attack.mjs';
const TAU=Math.PI*2,S=t=>Math.sin(TAU*t),C=t=>Math.cos(TAU*t),lerp=(a,b,u)=>a+(b-a)*u;
/* foot: [lateral, forward, heel lift, toe-out yaw (- = toes in), (in the air), pointed toes deg, knee (- together / + splayed)] */
const foot=(l,z,{lift=0,yaw=0,air=0,point=0,knee=-.08}={})=>[l,z,lift,yaw,air?1:0,point,knee];
const BEHIND={armR:{t:[-4,8,-9],p:[-1,.2,-.8]},armL:{t:[4,8,-9],p:[1,.2,-.8]}};   // wrists crossed at the small of her back
const WRIST_BAND={j:'wrist_right',j2:'wrist_left'};
const BASE={raw:1,noSword:1,noShield:1,rootZ:0,hipY:181,pelvis:0,torso:0,pitch:0,sway:0,
 footL:foot(9,0,{yaw:-12,knee:-.35}),footR:foot(-9,0,{yaw:-12,knee:-.35}),...BEHIND,head:[-6,0,0]};
/* the wide stance with the knees turned out (gani-mata) that the restraints pull her into */
const SPREAD={hipY:196,footL:foot(22,2,{yaw:45,knee:1.1}),footR:foot(-22,2,{yaw:45,knee:1.1})};
const KNEE_BINDS=[{j:'knee_left',to:[50,212,8]},{j:'knee_right',to:[-50,212,8]}];
const loop=(n,ms,f)=>Array.from({length:n},(_,i)=>({...f(i/n,i),ms}));

export const MOTIONS={
 /* ---- arms tied behind her back ---- */
 arms_behind_squirm:{label:'後ろ手に縛られて身をよじる',loop:true,view:'front',keys:loop(8,120,t=>({...BASE,
  sway:2.5*S(t),pelvis:8*S(t),torso:-6*S(t),pitch:-3+1.5*C(t),shrug:1.5*Math.abs(S(t)),
  footL:foot(10,0,{yaw:-10,knee:-.32+.08*S(t),lift:Math.max(0,-S(t))*3}),footR:foot(-10,0,{yaw:-10,knee:-.32-.08*S(t),lift:Math.max(0,S(t))*3}),
  armR:{t:[-4,8+S(t),-9],p:[-1,.2,-.8]},armL:{t:[4,8-S(t),-9],p:[1,.2,-.8]},
  head:[-8+3*C(t),-6*S(t),8*S(t)],binds:[WRIST_BAND,{j:'wrist_right',to:[0,150,-70]}],
  phase:'hips sway and twist, knees pressed together and shifting, one heel then the other comes up; looks down and away'}))},
 arms_behind_wrench:{label:'後ろ手に縛られて振りほどこうとする',loop:true,view:'front',keys:[0,1,2,3,4,5,6,7].map(i=>{
  const tw=[22,26,6,-4,-22,-26,-6,4][i],pv=[-8,-10,-2,2,8,10,2,-2][i],pull=[1,1,.3,0,1,1,.3,0][i],side=i<4?1:-1;
  return{...BASE,hipY:[181,182,183,184,181,182,183,185][i],torso:tw,pelvis:pv,pitch:-9*pull+3*(1-pull),shrug:3*pull,sway:-2*side*pull,
   footL:foot(10,0,{yaw:-10,knee:-.3,point:side<0?22*pull:0}),footR:foot(-10,0,{yaw:-10,knee:-.3,point:side>0?22*pull:0}),
   armR:{t:[-6-3*pull,9,-10],p:[-1,.1,-.9]},armL:{t:[6+3*pull,9,-10],p:[1,.1,-.9]},
   head:[-4+6*pull,-10*side*pull,-12*side],binds:[WRIST_BAND,{j:'wrist_right',to:[0,150,-70]}],ms:i%4<2?80:120,
   phase:pull?`wrench ${side>0?'to her left':'to her right'}: shoulders twist, chest thrown out, up on the pushing toes`:'give: slumps back, breathing'}})},
 /* ---- elbows bent, forearms upright, wrists held from above ---- */
 elbows_up_strain:{label:'両手首を上から吊られ、腕を引き下ろそうと力む',loop:true,view:'front',keys:loop(8,110,(t)=>{
  const pr=Math.max(0,S(t)),pl=Math.max(0,S(t+.5)),p=Math.max(pr,pl),up=1-p;
  return{...BASE,hipY:181+4*p,pitch:6*p-4*up,shrug:-2*p+2*up,sway:2*(pl-pr),torso:6*(pr-pl),
   footL:foot(10,0,{yaw:-10,knee:-.16,point:12*up}),footR:foot(-10,0,{yaw:-10,knee:-.16,point:12*up}),
   armR:{t:[-33+3*pr,58-8*pr,1],p:[-1,.7,0]},armL:{t:[33-3*pl,58-8*pl,1],p:[1,.7,0]},
   head:[-10*p+8*up,6*(pr-pl),0],binds:[{j:'wrist_right',to:[-37,64,4]},{j:'wrist_left',to:[37,64,4]}],
   phase:'pulls one arm down against the restraint, then the other; hunches and bends the knees while straining, is drawn up onto the toes when the restraint wins'}})},
 /* ---- knees pressed together, pulled apart ---- */
 legs_pulled_open:{label:'閉じた膝を左右へ引き開かれる',loop:false,view:'front',keys:[
  [10,-.3,-14,181,0,[-10,0,0],0,130,'閉じる knees pressed together, toes turned in'],
  [10,-.3,-16,182,4,[-16,0,0],1,110,'締める restraints close round the knees; she presses them tighter, hunching'],
  [10,-.28,-16,182,4,[-14,4,0],1,90,'耐える holds against it, trembling'],
  [11,-.22,-8,184,3,[-10,-4,0],1,90,'引かれる the knees are pulled apart, the feet slide out'],
  [13,.1,4,187,1,[-8,0,0],1,90,''],
  [17,.5,20,190,-1,[-6,0,0],1,90,''],
  [21,.9,38,194,-2,[-4,0,0],1,100,''],
  [23,1.12,48,197,-2,[-2,0,0],1,140,'開かれた pulled wide: knees turned out, hips low (gani-mata)'],
  [23,1.02,48,196,-1,[-6,6,0],1,80,'震える trembling'],
  [23,.82,46,195,1,[-8,-6,0],1,90,'閉じようとする tries to close them'],
  [23,1.16,48,198,-3,[0,0,0],1,90,'引き戻される yanked wide again'],
  [23,1.1,48,197,-2,[-4,0,0],1,160,'']].map(([w,kn,yw,hy,pt,hd,bd,ms,ph])=>({...BASE,hipY:hy,pitch:pt,
   footL:foot(w,2,{yaw:yw,knee:kn}),footR:foot(-w,2,{yaw:yw,knee:kn}),head:hd,binds:[WRIST_BAND,...(bd?KNEE_BINDS:[])],ms,phase:ph||'…'}))},
 legs_held_open:{label:'脚を開かれたまま耐える',loop:true,view:'front',keys:loop(8,90,t=>({...BASE,...SPREAD,
  hipY:197+1.2*S(2*t),sway:1.5*S(t),pitch:-2+2*C(t),
  footL:foot(22,2,{yaw:45,knee:1.1+.08*S(t)}),footR:foot(-22,2,{yaw:45,knee:1.1-.08*S(t)}),
  head:[-6+4*C(t),5*S(t),0],binds:[WRIST_BAND,...KNEE_BINDS],phase:'held open: the knees quiver, the hips tremble'}))},
 /* ---- the hips rocked forward and back ---- */
 hip_rock_spread:{label:'脚を開いた姿勢で腰を前後に揺らす',loop:true,view:'front',keys:loop(8,85,t=>{const k={...BASE,...SPREAD,
  rootZ:6*S(t),hipY:195-1.5*C(t),pitch:-7*S(t),footL:foot(22,2,{yaw:45,knee:1.05}),footR:foot(-22,2,{yaw:45,knee:1.05}),
  head:[-3-5*S(t-.1),0,0],phase:S(t)>.3?'hips pushed forward, shoulders back':S(t)<-.3?'hips drawn back, chest forward':'…'};
  k.binds=[WRIST_BAND,...KNEE_BINDS];return k})},
 hip_rock_closed:{label:'膝を閉じた姿勢で腰を小さく前後に揺らす',loop:true,view:'front',keys:loop(8,95,t=>{const k={...BASE,
  rootZ:3.5*S(t),hipY:182-C(t),pitch:-4*S(t),footL:foot(10,0,{yaw:-12,knee:-.2,point:Math.max(0,S(t))*14}),footR:foot(-10,0,{yaw:-12,knee:-.2,point:Math.max(0,S(t))*14}),
  head:[-8-4*S(t-.1),3*S(t),0],phase:'knees kept together; small rocks of the hips, rising onto the toes each time'};
  k.binds=[WRIST_BAND];return k})},
 /* ---- bounced up and down ---- */
 bounce_spread:{label:'脚を開いた姿勢で上下に揺れる',loop:true,view:'front',keys:loop(8,80,t=>{const d=.5-.5*C(t),k={...BASE,...SPREAD,
  hipY:190+9*d,pitch:4*d-2*(1-d),footL:foot(22,2,{yaw:45,knee:1.05,point:8*(1-d)}),footR:foot(-22,2,{yaw:45,knee:1.05,point:8*(1-d)}),
  shrug:2*(1-d),head:[-6*Math.sin(TAU*t-1),3*S(t),0],phase:d>.7?'down: knees bend, weight drops':d<.3?'up: lifted onto her toes':'…'};
  k.binds=[WRIST_BAND,...KNEE_BINDS];return k})},
 bounce_hung:{label:'手首を吊られたまま上下に揺れる',loop:true,view:'front',keys:loop(8,75,t=>{const d=.5-.5*C(t),k={...BASE,...SPREAD,
  hipY:189+10*d,pitch:3*d-4*(1-d),footL:foot(22,2,{yaw:45,knee:1.05,point:10*(1-d)}),footR:foot(-22,2,{yaw:45,knee:1.05,point:10*(1-d)}),
  armR:{t:[-33,60-3*d,1],p:[-1,.7,0]},armL:{t:[33,60-3*d,1],p:[1,.7,0]},shrug:-3*d,
  head:[8*(1-d)-8*d,4*S(t),0],phase:'hung by the wrists and bounced; the arms stretch as she drops'};
  k.binds=[{j:'wrist_right',to:[-37,64,4]},{j:'wrist_left',to:[37,64,4]},...KNEE_BINDS];return k})},
 /* ---- the whole body goes rigid, then limp ---- */
 tension_tiptoe:{label:'全身がこわばって爪先立ち、そのあと脱力',loop:false,view:'front',keys:[
  [194,1.0,0,0,[-4,0,0],110,'こわばり tension rising, knees locked'],
  [191,.9,20,-3,[4,0,0],90,'踵が上がる heels come up'],
  [187,.7,40,-5,[10,0,0],90,'伸びる legs straighten, up on her toes'],
  [183,.55,66,-8,[18,0,0],150,'頂点 peak: toes pointed hard, legs rigid, head back'],
  [184,.62,60,-6,[14,4,0],60,'震え jerk'],[182,.5,68,-10,[20,-4,0],60,'jerk'],[184,.64,60,-6,[14,4,0],60,'jerk'],[182,.52,66,-9,[18,-3,0],70,'jerk'],[185,.66,56,-5,[12,2,0],80,'…'],
  [192,1.0,20,6,[-10,0,0],120,'抜ける release: heels drop, knees give'],
  [197,1.12,0,10,[-18,0,0],150,'崩れる sags, held up by the restraints'],
  [198,1.15,0,12,[-22,4,0],240,'脱力 limp']].map(([hy,kn,pt,pi,hd,ms,ph])=>({...BASE,...SPREAD,hipY:hy,pitch:pi,
   footL:foot(22,2,{yaw:45,knee:kn,point:pt}),footR:foot(-22,2,{yaw:45,knee:kn,point:pt}),head:hd,binds:[WRIST_BAND,...KNEE_BINDS],ms,phase:ph}))},
 tension_arch:{label:'背中を大きく反らせてこわばり、そのあと脱力',loop:false,view:'front',keys:[
  [0,181,0,-.45,0,[-6,0,0],0,100,'立つ standing, bound'],
  [2,182,-8,-.4,8,[10,0,0],1,90,'反り始め the back starts to arch'],
  [5,184,-18,-.3,20,[25,0,0],2,90,'反る hips pushed forward, head going back'],
  [8,186,-32,-.2,35,[45,0,0],4,160,'頂点 peak: arched right back, head thrown back, on the toes'],
  [7,185,-28,-.25,30,[40,5,0],3,60,'震え jerk'],[9,187,-34,-.18,36,[48,-5,0],4,60,'jerk'],[7,185,-29,-.25,30,[41,4,0],3,60,'jerk'],[9,186,-33,-.2,35,[46,-4,0],4,70,'jerk'],
  [5,184,-18,-.3,18,[24,2,0],2,90,'…'],
  [2,184,-8,-.4,6,[5,0,0],0,100,'抜ける release'],
  [1,191,16,-.62,0,[-25,0,0],0,160,'崩れる folds forward, knees buckling in'],
  [0,193,18,-.66,0,[-30,6,0],0,240,'脱力 limp']].map(([rz,hy,pi,kn,pt,hd,sh,ms,ph])=>({...BASE,rootZ:rz,hipY:hy,pitch:pi,shrug:sh,
   footL:foot(10,0,{yaw:-10,knee:Math.max(kn*.45,-.2),point:pt}),footR:foot(-10,0,{yaw:-10,knee:Math.max(kn*.45,-.2),point:pt}),head:hd,binds:[WRIST_BAND,{j:'wrist_right',to:[0,150,-70]}],ms,phase:ph}))},
 /* ---- bent over, shown from behind ---- */
 bent_over:{label:'前屈みで手首を床の前に縛られ、腰を左右に揺らす（後ろ・斜め後ろから）',loop:true,view:'up_right',keys:loop(8,110,t=>({...BASE,
  rootZ:-2*C(t)-4,hipY:180,pitch:72,sway:4*S(t),pelvis:10*S(t),torso:-4*S(t),
  footL:foot(12,0,{yaw:8,knee:.15}),footR:foot(-12,0,{yaw:8,knee:.15}),
  armR:{d:[-.12,.9,.42],e:.96,p:[-1,0,0]},armL:{d:[.12,.9,.42],e:.96,p:[1,0,0]},
  head:[30+6*S(t),0,-8*S(t)],binds:[{j:'wrist_right',to:[-6,242,52]},{j:'wrist_left',to:[6,242,52]},{j:'wrist_right',j2:'wrist_left'}],
  phase:'bent right over, hips up and back; the hips sway side to side; looks back over the shoulder'}))}
};

/* the face drawn in the references (expr): resisting = mouth pressed shut, rocking = mouth open,
   the peak of a tension = eyes shut and mouth open, then eyes shut, then limp with the mouth open */
const EXPR=(name,i)=>/^tension_/.test(name)?(i<3?'line':i<9?'shut-o':i<11?'shut':'o'):/^(hip_rock|bounce|bent_over)/.test(name)?'o':'line';
export function library(){
 const poses={},meta={};
 for(const [name,m] of Object.entries(MOTIONS)){
  poses[name]={};
  for(const d of DIRECTIONS)poses[name][d]=m.keys.map((k,i)=>{const J=pose(k);return{direction:d,yaw:YAW[d],motion:name,frame:i,frame_ms:k.ms,phase:k.phase,expr:k.expr||EXPR(name,i),
   binds:(k.binds||[]).map((b,bi)=>({joint:b.j,joint2:b.j2,anchor:b.to?'bind'+bi:null,via:b.via?'bindvia'+bi:null,anchor2:b.to2?'bindb'+bi:null})),
   joints:project(Object.assign(J,Object.fromEntries((k.binds||[]).flatMap((b,bi)=>b.to2?[['bindb'+bi,b.to2]]:[]))),d)}});
  meta[name]={label:m.label,loop:m.loop,view:m.view,frame_ms:m.keys.map(k=>k.ms),phases:m.keys.map(k=>k.phase)};
 }
 return{schema:'anatomical-eight-direction-motion/1.0',extends:'poses.json / attack-poses.json (same skeleton, 288x288 canvas, centre x 144, projection)',
  canvas:[288,288],centre_x:144,ground_y:242,directions:DIRECTIONS,yaw:YAW,
  anatomical_sides:{right:'negative world lateral',left:'positive world lateral'},
  notes:{expr:'the face drawn in the references: shut = eyes closed, o = mouth open, line = mouth pressed shut',view:'the direction the pose is shown in: front (facing the viewer) for all but bent_over, which is shown from behind (up_right = 3/4 from behind reads best; back also works)',
   binds:'each frame lists its restraints: joint + joint2 = a band between two joints; joint -> anchor = a restraint pulling that joint toward a point',
   extra_joints:{face:'9px ahead of the head centre: where she looks',eye_left:'eyes',eye_right:'eyes',crotch:'just under the hips (the hips\' path is drawn from it)'}},
  motions:meta,poses};
}
