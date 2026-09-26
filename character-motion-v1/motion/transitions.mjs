/** The joins between motions.
 * EDGES lists every way the game can go from one motion to the next (caught -> struggling -> climax ->
 * afterglow -> coming round, getting up, walking off ...). Loops are entered and left at their frame 0;
 * "stand" is standing at rest. Where the last frame of one and the first frame of the next are further
 * apart than one ordinary frame step, a short join is made between them.
 *
 * A join is blended by where the body is (blend.mjs), so it starts exactly where the one motion ends
 * and ends exactly where the next begins, and a wrist never passes through the body on the way.
 */
import {pose,project,DIRECTIONS,YAW} from './attack.mjs';
import {between,keyGap} from './blend.mjs';
import {MOTIONS as RM,library as RL} from './restraint.mjs';
import {MOTIONS as SM,library as SL,NEUTRAL} from './scenes.mjs';
export const LIMIT=20;    // px: a joint may move this far from one frame to the next (inside the motions the median step is ~5)
export const STEP=12;     // px: the average step a join is cut into (its middle, eased, is ~1.5x this)
export const EDGES=`
stand>grabbed_flinch stand>down_fall_back stand>engulf_sink stand>kiss_forced stand>clinger_peel stand>tempt_pose stand>daze_sway stand>edge_pull stand>reach_toward stand>walk_unsteady stand>trip_fall stand>defeat_collapse stand>ankle_grabbed stand>chain_splay
grabbed_flinch>arms_behind_squirm grabbed_flinch>elbows_up_strain grabbed_flinch>legs_pulled_open grabbed_flinch>wrap_squeeze grabbed_flinch>held_from_behind grabbed_flinch>spore_inhale grabbed_flinch>shiver_hug grabbed_flinch>gaze_trance grabbed_flinch>bubble_float grabbed_flinch>clinger_peel
arms_behind_squirm>arms_behind_wrench arms_behind_wrench>arms_behind_squirm arms_behind_squirm>hip_rock_closed hip_rock_closed>arms_behind_squirm hip_rock_closed>tension_arch arms_behind_squirm>tension_arch arms_behind_squirm>legs_pulled_open arms_behind_squirm>bent_over bent_over>arms_behind_squirm
legs_pulled_open>legs_held_open legs_held_open>hip_rock_spread hip_rock_spread>legs_held_open legs_held_open>bounce_spread bounce_spread>legs_held_open hip_rock_spread>bounce_spread bounce_spread>hip_rock_spread hip_rock_spread>tension_tiptoe bounce_spread>tension_tiptoe legs_held_open>tension_tiptoe
tension_tiptoe>afterglow_spread afterglow_spread>recover_spread recover_spread>legs_held_open tension_arch>afterglow_slump afterglow_slump>recover_slump recover_slump>arms_behind_squirm
elbows_up_strain>bounce_hung bounce_hung>elbows_up_strain
arms_behind_squirm>break_free legs_held_open>break_free elbows_up_strain>break_free wrap_squeeze>break_free wrap_tension>break_free held_from_behind>break_free engulf_struggle>break_free break_free>stand break_free>walk_unsteady
wrap_squeeze>wrap_tension
down_fall_back>down_pinned_kick down_pinned_kick>down_pinned_spread down_pinned_spread>down_pinned_kick down_pinned_spread>down_pinned_rock down_pinned_rock>down_pinned_spread down_pinned_rock>down_tension down_pinned_spread>down_tension down_tension>down_afterglow down_afterglow>down_recover down_recover>get_up down_pinned_kick>get_up get_up>stand
ankle_grabbed>down_face_down down_face_down>down_hips_up down_hips_up>down_face_down
engulf_sink>engulf_struggle engulf_struggle>engulf_rock engulf_rock>engulf_struggle engulf_rock>engulf_tension engulf_struggle>engulf_tension
kiss_forced>kiss_tension kiss_forced>kiss_respond kiss_respond>kiss_tension tempt_pose>kiss_respond kiss_tension>kiss_afterglow kiss_afterglow>kiss_recover kiss_recover>stand
clinger_peel>clinger_accept clinger_accept>clinger_peel clinger_peel>clinger_tension clinger_accept>clinger_tension clinger_tension>clinger_afterglow clinger_afterglow>clinger_recover clinger_recover>stand clinger_recover>walk_unsteady
tempt_pose>stand tempt_pose>tension_free tension_free>sit_afterglow sit_afterglow>sit_recover sit_recover>stand sit_recover>walk_unsteady chain_splay>sit_afterglow
spore_inhale>tension_free shiver_hug>tension_free gaze_trance>tension_free spore_inhale>stand shiver_hug>stand gaze_trance>stand bubble_float>stand gaze_trance>daze_sway
daze_sway>stand daze_sway>reach_toward reach_toward>stand edge_pull>stand edge_pull>walk_unsteady walk_unsteady>stand walk_unsteady>edge_pull walk_unsteady>trip_fall walk_unsteady>defeat_collapse trip_fall>stand`.trim().split(/\s+/).map(e=>e.split('>'));
/* the key poses at the two ends of a motion (loops: frame 0 both ways) */
const LIBS={restraint:RL(),scene:SL()};
function info(m){if(m==='stand')return{first:NEUTRAL,last:NEUTRAL,view:'front',expr:''};
 const src=RM[m]?'restraint':'scene',K=(RM[m]||SM[m]).keys,lib=LIBS[src],F=lib.poses[m].front,lp=lib.motions[m].loop;
 return{first:{...K[0],expr:F[0].expr},last:{...K[lp?0:K.length-1],expr:F[lp?0:F.length-1].expr},view:lib.motions[m].view,label:lib.motions[m].label}}
export function joinFrames(a,b){const A=info(a),B=info(b),g=keyGap(A.last,B.first);
 if(g<=LIMIT)return{gap:g,frames:[]};
 const n=Math.ceil(g/STEP)-1,out=[];
 for(let j=1;j<=n;j++){const u=j/(n+1),e=u*u*(3-2*u),q=between(A.last,B.first,e);q.binds=b==='break_free'?A.last.binds:e<.5?A.last.binds:B.first.binds;q.expr=e<.5?A.last.expr:B.first.expr;q.ms=70;q.phase=j===1?`つなぎ ${a} → ${b}`:'…';out.push(q)}
 return{gap:g,frames:out,from:A,to:B}}
const bindsOut=k=>(k.binds||[]).map((b,bi)=>({joint:b.j,joint2:b.j2,anchor:b.to?'bind'+bi:null,creature:b.creature?1:undefined,partner:b.partner?1:undefined,noLoop:b.noLoop?1:undefined,coil:b.coil?1:undefined,r:b.r,engulf:b.engulf?1:undefined,level:b.level,bubble:b.bubble?1:undefined}));
export const frameOf=(k,d)=>({direction:d,yaw:YAW[d],frame_ms:k.ms,phase:k.phase,expr:k.expr,binds:bindsOut(k),joints:project(pose(k),d)});
export function library(){
 const poses={},meta={};
 for(const [a,b] of EDGES){const r=joinFrames(a,b);if(!r.frames.length)continue;const id=`${a}__${b}`;
  poses[id]={};for(const d of DIRECTIONS)poses[id][d]=r.frames.map((k,i)=>({...frameOf(k,d),motion:id,frame:i}));
  meta[id]={label:`${a==='stand'?'立ち姿勢':a} → ${b==='stand'?'立ち姿勢':b} のつなぎ`,loop:false,from:a,to:b,gap:+r.gap.toFixed(1),view:b==='stand'?(r.from.view||'front'):r.to.view,frame_ms:r.frames.map(k=>k.ms),phases:r.frames.map(k=>k.phase)}}
 return{schema:'anatomical-eight-direction-motion/1.0',extends:'restraint-poses.json / scene-poses.json (same skeleton, canvas and projection)',
  notes:{what:'short joins played between two motions (motions.<id>.from, .to) so nothing jumps; loops are entered and left at their frame 0; "stand" is standing at rest',
   binds:'as in scene-poses.json'},canvas:[288,288],centre_x:144,ground_y:242,directions:DIRECTIONS,yaw:YAW,edges:EDGES.map(e=>e.join('>')),motions:meta,poses};
}
