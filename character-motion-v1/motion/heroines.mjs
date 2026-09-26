/** Motions of the other heroines (same skeleton; attack.mjs's pose(), scenes.mjs's helpers).
 * Each motion belongs to one of them (look):
 *   scout  - the fennec merchant: big ears, a tail, a large backpack always on; knives (main one at the hip).
 *            Quick on her feet, with a keen sense for traps and monsters.
 *   mage   - the witch: pointed hat, long coat, both forearms mechanical; the arm is what she casts through (the
 *            staff in her right hand as well). Quiet and cool; she keeps her voice in.
 *   healer - the elf cleric: long ears, a staff with a cross in her right hand; buffs and weakening spells. Her chest
 *            moves a lot and is covered only by two hanging front panels. She shrinks from anything lewd.
 * A prop is drawn from the hand: prop {kind:'staff'|'knife', dir:[x,y,z] (world) or 'fore' (along the forearm), len,
 * back (how far it reaches behind the hand)}. The healer's frames carry chest_lag: how far her chest trails the body's
 * movement (px, screen) - the secondary motion to draw in all her frames, her own and the shared ones.
 */
import {pose,project,DIRECTIONS,YAW} from './attack.mjs';
import {tween,loop,foot,BASE,STAND,SIT} from './scenes.mjs';
const TAU=Math.PI*2,S=t=>Math.sin(TAU*t),C=t=>Math.cos(TAU*t);
const STAFF_UP={kind:'staff',dir:[0,-1,.05],len:62,back:26},KNIFE={kind:'knife',dir:'fore',len:15,back:3};
/* standing with the staff held upright at her right side */
const WITH_STAFF={...STAND,armR:{d:[-.25,.75,.35],e:.72},prop:STAFF_UP};
/* the scout's knife guard: low, weight forward */
const LOWGUARD={...STAND,hipY:187,pitch:10,footL:foot(9,8,{knee:.1}),footR:foot(-10,-10,{knee:.1,lift:2}),armR:{d:[-.3,.55,.78],e:.78},armL:{d:[.3,.35,.88],e:.7},prop:KNIFE};
/* each heroine standing at rest (where her own motions start and end; the joins use them as stand@<look>) */
export const NEUTRALS={scout:{...STAND,prop:KNIFE},mage:{...WITH_STAFF},healer:{...STAND,armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP}};
export const MOTIONS={
 /* ======== scout ======== */
 scout_knife_combo:{look:'scout',label:'斥候：ナイフで素早く二連撃して跳び退く',loop:false,view:'right',all8:true,keys:tween([
  [{...LOWGUARD,phase:'構え low guard, knife in the right hand'},1],
  [{...LOWGUARD,rootZ:4,torso:18,armR:{d:[-.8,.2,.55],e:.85},phase:'引き the knife hand draws back'},1],
  [{...LOWGUARD,rootZ:10,pitch:14,torso:-22,footL:foot(9,18,{knee:.15}),armR:{d:[.55,.25,.8],e:1},expr:'line',phase:'一閃 steps in: slashes across to her left'},1],
  [{...LOWGUARD,rootZ:11,pitch:12,torso:20,footL:foot(9,18,{knee:.15}),armR:{d:[-.85,.05,.5],e:1},expr:'line',phase:'返し the backhand cut to her right'},1],
  [{...LOWGUARD,rootZ:-4,hipY:180,footL:foot(9,4,{lift:6,air:1,knee:.1}),footR:foot(-10,-14,{lift:4,air:1,knee:.1}),phase:'跳び退く hops back'},2],
  [{...LOWGUARD,phase:'構え guard again'},0]]).map(k=>({...k,ms:/^(一閃|返し)/.test(k.phase)?50:70}))},
 scout_throw:{look:'scout',label:'斥候：ナイフを投げる',loop:false,view:'right',all8:true,keys:tween([
  [{...LOWGUARD,phase:'構え'},1],
  [{...LOWGUARD,rootZ:-4,torso:24,pitch:-4,footL:foot(9,10,{knee:.1}),armR:{d:[-.35,-.7,-.6],e:.85},armL:{d:[.3,-.1,.95],e:.8},phase:'振りかぶり the knife back behind her head, the other hand aims'},2],
  [{...LOWGUARD,rootZ:6,torso:-18,pitch:14,footL:foot(9,14,{knee:.15}),armR:{d:[-.1,.05,1],e:1},armL:{d:[.5,.4,-.3],e:.8},prop:null,expr:'line',phase:'投げる the throw: arm straight out, the knife gone'},1],
  [{...LOWGUARD,rootZ:5,torso:-10,pitch:12,footL:foot(9,14,{knee:.15}),armR:{d:[.2,.7,.6],e:.95},armL:{d:[.4,.5,.2],e:.8},prop:null,phase:'振り抜き follow-through'},2],
  [{...LOWGUARD,prop:{...KNIFE,len:12},phase:'構え the next knife from the belt'},0]]).map(k=>({...k,ms:/^投げる/.test(k.phase)?50:80}))},
 scout_sense:{look:'scout',label:'斥候：気配を察知して身を低くし、辺りをうかがう',loop:false,view:'front',keys:tween([
  [{...STAND,phase:'立つ standing'},1],
  [{...STAND,hipY:179,head:[6,0,0],expr:'o',phase:'気づく stops short, ears up, head lifts'},2],
  [{...STAND,hipY:192,pitch:12,footL:foot(8,7,{knee:-.12}),footR:foot(-8,-9,{knee:-.12,lift:4}),armL:{d:[.4,-.1,.9],e:.6},head:[0,0,40],expr:'line',phase:'うかがう drops low - feet close, one ahead, knees forward, the back heel up - a hand up (wait); looks one way'},2],
  [{...STAND,hipY:192,pitch:12,footL:foot(8,7,{knee:-.12}),footR:foot(-8,-9,{knee:-.12,lift:4}),armL:{d:[.4,-.1,.9],e:.6},head:[0,0,-40],expr:'line',phase:'見回す and the other'},2],
  [{...STAND,hipY:190,pitch:10,footL:foot(8,7,{knee:-.12}),footR:foot(-8,-9,{knee:-.12,lift:4}),armL:{d:[.2,.4,.9],e:.9},head:[-6,0,0],expr:'line',phase:'指す points to where it is'},2],
  [{...STAND,phase:'立つ'},0]]).map(k=>({...k,ms:110}))},
 scout_disarm:{look:'scout',label:'斥候：片膝をついて罠を外す',loop:true,view:'front',keys:loop(8,120,t=>({...STAND,
  hipY:205,pitch:32,head:[-30,0,6*S(t)],
  footL:foot(10,-30,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,12,{knee:.1,up:.8}),
  armR:{d:[-.15+.06*S(t),.85,.5],e:.95},armL:{d:[.18-.06*S(2*t),.85,.5],e:.95},prop:{...KNIFE,len:10},
  expr:'line',phase:'on one knee at the trap, both hands working at it close to the floor, the tail swaying'}))},
 scout_rummage:{look:'scout',label:'斥候：背中のバックパックから品物を出して見せる（商人）',loop:false,view:'down_right',keys:tween([
  [{...STAND,phase:'立つ'},2],
  [{...STAND,torso:-12,head:[0,0,-20],armR:{d:[-.25,-.9,-.35],e:.8},phase:'探る reaches back over her shoulder into the pack'},2],
  [{...STAND,torso:-8,head:[0,0,-10],armR:{d:[-.2,-.95,-.15],e:.7},phase:'取り出す pulls something out'},2],
  [{...STAND,torso:6,head:[-6,0,0],armR:{d:[-.05,.1,1],e:.75},armL:{d:[.2,.4,.9],e:.6},expr:'o',phase:'見せる holds it out to show it, a small smile'},2],
  [{...STAND,phase:'立つ'},0]]).map(k=>({...k,ms:110}))},
 /* ======== mage ======== */
 mage_bolt:{look:'mage',label:'魔法使い：機械の腕を向けて魔力の弾を放つ',loop:false,view:'right',all8:true,keys:tween([
  [{...WITH_STAFF,phase:'立つ the staff upright in the right hand'},1],
  [{...WITH_STAFF,armL:{d:[.15,.15,1],e:.65},phase:'集める the mechanical left arm comes up bent, gathering'},2],
  [{...WITH_STAFF,armL:{d:[.05,-.03,1],e:1},footL:foot(10,6),phase:'狙う the arm straight at the target'},1],
  [{...WITH_STAFF,rootZ:-2,armL:{d:[.05,-.25,.97],e:.97},head:[-4,0,0],phase:'放つ the shot: the arm kicks up'},1],
  [{...WITH_STAFF,armL:{d:[.05,-.1,1],e:1},phase:'残心 held a moment'},2],
  [{...WITH_STAFF,phase:'下ろす'},0]]).map(k=>({...k,ms:/^放つ/.test(k.phase)?50:90}))},
 mage_area:{look:'mage',label:'魔法使い：杖と腕を掲げて溜め、振り下ろして範囲魔法',loop:false,view:'right',all8:true,keys:tween([
  [{...WITH_STAFF,phase:'立つ'},2],
  [{...WITH_STAFF,pitch:-6,armR:{d:[-.2,-.95,.2],e:.8},armL:{d:[.3,-.85,.3],e:.9},head:[12,0,0],phase:'掲げる the staff and the left arm raised high'},2],
  [{...WITH_STAFF,pitch:-8,armR:{d:[-.2,-.97,.1],e:.82},armL:{d:[.3,-.9,.2],e:.92},head:[14,0,0],phase:'溜め holding it up, the gauntlet glowing'},1],
  [{...WITH_STAFF,pitch:16,hipY:186,footL:foot(10,10,{knee:.1}),armR:{d:[-.1,.55,.83],e:.95},armL:{d:[.8,.35,.4],e:.95},prop:{...STAFF_UP,dir:[0,.75,.66]},head:[-8,0,0],phase:'振り下ろす the staff comes down to the floor ahead, the arm sweeps out'},1],
  [{...WITH_STAFF,pitch:14,hipY:186,footL:foot(10,10,{knee:.1}),armR:{d:[-.1,.55,.83],e:.95},armL:{d:[.8,.3,.4],e:.95},prop:{...STAFF_UP,dir:[0,.75,.66]},head:[-8,0,0],phase:'残心 held'},2],
  [{...WITH_STAFF,phase:'立つ'},0]]).map(k=>({...k,ms:/^振り下ろす/.test(k.phase)?50:100}))},
 mage_channel:{look:'mage',label:'魔法使い：腕を向けたまま魔力を流し続ける',loop:true,view:'right',keys:loop(8,110,t=>({...WITH_STAFF,
  footL:foot(10,6),armL:{d:[.05,-.03+.02*S(2*t),1],e:1},shrug:.8*S(t),head:[-2,0,0],phase:'the arm held out, a slight tremble as the power runs through it; the coat stirs'}))},
 mage_suppress:{look:'mage',label:'魔法使い：機械の手で口を押さえ、声を出さずに耐える',loop:true,view:'front',keys:loop(8,110,(t,i)=>({...WITH_STAFF,
  hipY:184+(i===5?2:0),pitch:8,shrug:2+(i===5?1.5:0),head:[-12,0,4*S(t)],sway:(i%2?1:-1)*.6,
  footL:foot(8,0,{yaw:-12,knee:-.45}),footR:foot(-8,0,{yaw:-12,knee:-.45}),armL:{t:[3,70,16],p:[1,.5,.3]},armR:{d:[-.2,.9,.3],e:.85},prop:{...STAFF_UP,dir:[-.1,-.95,.2]},
  expr:'shut-line',phase:i===5?'堪える a shudder she swallows: the hand presses harder':'knees together, the mechanical hand over her mouth, holding every sound in'}))},
 mage_suppress_tension:{look:'mage',label:'魔法使い：口を押さえたまま全身がこわばり、杖にすがって片膝をつく',loop:false,view:'front',keys:tween([
  [{...WITH_STAFF,hipY:184,pitch:8,shrug:2,head:[-12,0,0],footL:foot(8,0,{yaw:-12,knee:-.45}),footR:foot(-8,0,{yaw:-12,knee:-.45}),armL:{t:[3,70,16],p:[1,.5,.3]},armR:{d:[-.2,.9,.3],e:.85},prop:{...STAFF_UP,dir:[-.1,-.95,.2]},expr:'shut-line',phase:'堪える'},2],
  [{...WITH_STAFF,hipY:188,pitch:24,shrug:4,head:[-26,0,0],footL:foot(8,0,{yaw:-12,knee:-.5,point:20}),footR:foot(-8,0,{yaw:-12,knee:-.5,point:20}),armL:{t:[3,68,18],p:[1,.5,.3]},armR:{d:[-.2,.9,.35],e:.85},prop:{...STAFF_UP,dir:[-.1,-.95,.2]},expr:'shut-line',phase:'頂点 peak, curled in, not arched: hunched over the hand, shoulders up, silent'},1],
  [{...WITH_STAFF,hipY:190,pitch:22,shrug:3,head:[-22,0,6],footL:foot(8,0,{yaw:-12,knee:-.5,point:14}),footR:foot(-8,0,{yaw:-12,knee:-.5,point:14}),armL:{t:[3,68,18],p:[1,.5,.3]},armR:{d:[-.2,.9,.35],e:.85},prop:{...STAFF_UP,dir:[-.1,-.95,.2]},expr:'shut-line',phase:'震え small shudders'},2],
  [{...WITH_STAFF,hipY:210,pitch:14,head:[-18,0,0],footL:foot(10,-30,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,12,{knee:.1,up:.8}),armL:{t:[2,62,16],p:[1,.5,.3]},armR:{d:[-.25,.3,.9],e:.9},prop:{...STAFF_UP,dir:[0,.95,.1],len:40,back:40},expr:'shut',phase:'膝をつく down on one knee, leaning on the staff planted beside her'},0]]).map(k=>({...k,ms:/^頂点/.test(k.phase)?170:100}))},
 /* ======== healer ======== */
 healer_pray:{look:'healer',label:'ヒーラー：杖を立てて祈り、癒やす',loop:true,view:'front',keys:loop(8,150,t=>({...STAND,
  pitch:-2+1.5*S(t),shrug:.8*Math.max(0,S(t)),head:[-16,0,0],armR:{d:[-.28,.55,.55],e:.7},armL:{t:[3,36,11],p:[1,.5,.2]},prop:STAFF_UP,
  expr:'shut',phase:'the staff upright, the other hand at her breast, head bowed, eyes closed, breathing slowly'}))},
 healer_buff:{look:'healer',label:'ヒーラー：杖を掲げてから仲間へ向け、加護を与える',loop:false,view:'right',all8:true,keys:tween([
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,phase:'立つ'},2],
  [{...STAND,pitch:-5,armR:{d:[-.1,-.95,.3],e:.85},armL:{d:[.3,-.3,.9],e:.6},head:[14,0,0],prop:STAFF_UP,phase:'掲げる the staff raised high'},2],
  [{...STAND,rootZ:4,pitch:6,footL:foot(10,8),armR:{d:[-.1,-.15,1],e:1},armL:{d:[.3,.5,.8],e:.6},prop:{...STAFF_UP,dir:[0,-.25,1]},phase:'授ける the staff pointed at the one she blesses'},2],
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,phase:'戻す'},0]]).map(k=>({...k,ms:100}))},
 healer_hex:{look:'healer',label:'ヒーラー：目立たないように片手で印を結び、弱体の呪いをかける',loop:false,view:'front',keys:tween([
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,phase:'立つ'},2],
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},armL:{t:[10,-4,8],p:[1,.6,0]},head:[-6,0,24],prop:STAFF_UP,expr:'line',phase:'印 a sign made low by her hip, half hidden; a cold sidelong look'},2],
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},armL:{t:[10,-4,8],p:[1,.6,0]},head:[-6,0,24],prop:STAFF_UP,expr:'line',phase:'呪う held'},1],
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},head:[0,0,0],prop:STAFF_UP,phase:'何事もなく as if nothing happened'},0]]).map(k=>({...k,ms:110}))},
 healer_disgust:{look:'healer',label:'ヒーラー：嫌なものから顔を背け、胸をかばって杖で遮る',loop:false,view:'front',keys:tween([
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,phase:'立つ'},1],
  [{...STAND,rootZ:-6,torso:24,pitch:-6,head:[-6,0,-40],footR:foot(-10,-14),armL:{t:[-6,34,12],p:[1,.4,.4]},armR:{d:[-.1,.25,1],e:.75},prop:{...STAFF_UP,dir:[.55,-.8,.25]},expr:'line',phase:'拒む recoils: turns her face away, an arm across her chest, the staff held across as a bar'},1],
  [{...STAND,rootZ:-8,torso:26,pitch:-8,head:[-10,0,-44],footR:foot(-10,-16),armL:{t:[-6,34,12],p:[1,.4,.4]},armR:{d:[-.1,.25,1],e:.75},prop:{...STAFF_UP,dir:[.55,-.8,.25]},expr:'shut-line',phase:'嫌悪 eyes shut, holding it off'},3],
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},armL:{t:[-6,34,12],p:[1,.4,.4]},prop:STAFF_UP,expr:'line',phase:'構え直す straightens, still covering herself'},0]]).map(k=>({...k,ms:k.phase?.startsWith('拒む')?60:100}))},
 healer_cover:{look:'healer',label:'ヒーラー：前垂れを押さえて胸を隠しながら立つ',loop:true,view:'front',keys:loop(8,140,t=>({...STAND,
  sway:1.5*S(t),pelvis:4*S(t),head:[-8,0,0],armL:{t:[-5,33,12],p:[1,.4,.4]},armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,expr:'line',
  phase:'an arm across her chest holding the front panels down; as she sways they would lift'}))},
 /* ======== scout: more of her own ======== */
 scout_sidestep:{look:'scout',label:'斥候：低く横へ跳んで身をかわす',loop:false,view:'front',all8:true,keys:tween([
  [{...LOWGUARD,phase:'構え'},1],
  [{...LOWGUARD,hipY:191,sway:-6,pitch:12,footL:foot(9,6,{knee:.05}),footR:foot(-12,-8,{knee:.05}),phase:'沈む drops her weight to push off'},1],
  [{...LOWGUARD,hipY:180,sway:14,torso:-8,footL:foot(22,4,{lift:8,air:1,knee:0}),footR:foot(4,-6,{lift:10,air:1,knee:0}),armL:{d:[.6,.2,.7],e:.9},phase:'跳ぶ springs sideways, low'},1],
  [{...LOWGUARD,hipY:192,sway:24,pitch:14,footL:foot(34,4,{knee:.1}),footR:foot(14,-8,{knee:.1}),phase:'着地 lands low, the knife still up'},2],
  [{...LOWGUARD,sway:24,footL:foot(34,8,{knee:.1}),footR:foot(14,-10,{knee:.1}),phase:'構え ready again, a step aside'},0]]).map(k=>({...k,ms:/^跳ぶ/.test(k.phase)?50:80}))},
 scout_dash_stop:{look:'scout',label:'斥候：身を低くして駆け込み、足を滑らせて止まる',loop:false,view:'right',keys:tween([
  [{...STAND,hipY:186,pitch:24,rootZ:0,footL:foot(9,18,{lift:4,air:1,knee:.1,up:.4}),footR:foot(-9,-20,{lift:6,point:30}),armR:{d:[-.2,.3,-.9],e:.9},armL:{d:[.2,.5,.8],e:.8},phase:'駆ける a long low stride'},2],
  [{...STAND,hipY:188,pitch:-6,rootZ:6,footL:foot(9,30,{knee:.05}),footR:foot(-9,4,{knee:.2}),armR:{d:[-.5,.3,.8],e:.9},armL:{d:[.5,.3,.8],e:.9},expr:'o',phase:'滑る the lead foot plants and slides, body leaning back'},2],
  [{...STAND,hipY:196,pitch:10,rootZ:10,footL:foot(9,32,{knee:.2}),footR:foot(-9,6,{knee:.3}),armR:{d:[-.3,.9,.3],e:.95},armL:{d:[.4,.6,.7],e:.8},phase:'止まる stops low, one hand near the floor'},2],
  [{...STAND,rootZ:12,footL:foot(10,12,{yaw:-8,knee:-.25}),footR:foot(-10,12,{yaw:-8,knee:-.25}),phase:'立つ standing, feet together under her'},0]]).map(k=>({...k,ms:80}))},
 scout_tail_grabbed:{look:'scout',label:'斥候：尻尾をつかまれて跳び上がり、手を後ろへやる',loop:false,view:'right',keys:tween([
  [{...STAND,binds:[{j:'root',to:[0,194,-30]}],phase:'立つ something reaches her tail from behind'},1],
  [{...STAND,hipY:176,pitch:-12,shrug:4,head:[10,0,0],footL:foot(9,0,{point:30,knee:-.2}),footR:foot(-9,0,{point:30,knee:-.2}),armR:{d:[-.4,.1,.9],e:.6},armL:{d:[.4,.1,.9],e:.6},binds:[{j:'root',to:[0,196,-46]}],expr:'o',phase:'びくっ the tail is seized: she jumps upright onto her toes'},1],
  [{...STAND,hipY:184,pitch:-8,head:[-4,0,50],armR:{d:[-.3,.6,-.75],e:.95},armL:{d:[.3,.6,-.75],e:.95},binds:[{j:'root',to:[0,196,-50]}],expr:'line',phase:'振り返る looks back over her shoulder, both hands reaching back for it'},2],
  [{...STAND,hipY:188,pitch:12,head:[-10,0,40],footL:foot(9,4,{knee:-.4}),footR:foot(-9,0,{knee:-.4}),armR:{d:[-.3,.6,-.75],e:.95},armL:{d:[.3,.6,-.75],e:.95},binds:[{j:'root',to:[0,196,-54]}],expr:'shut-line',phase:'すくむ knees give inward; pulling at it'},0]]).map(k=>({...k,ms:k.phase?.startsWith('びくっ')?60:100}))},
 scout_pack_adjust:{look:'scout',label:'斥候：バックパックの肩ひもを引き上げて背負い直す（待機の仕草）',loop:false,view:'down_right',keys:tween([
  [{...STAND,phase:'立つ'},2],
  [{...STAND,hipY:183,armR:{t:[-7,40,4],p:[-1,.3,.5]},armL:{t:[7,40,4],p:[1,.3,.5]},head:[-6,0,0],phase:'つかむ hands on both straps'},2],
  [{...STAND,hipY:178,shrug:4,pitch:-4,footL:foot(10,0,{lift:4}),footR:foot(-10,0,{lift:4}),armR:{t:[-7,44,4],p:[-1,.3,.5]},armL:{t:[7,44,4],p:[1,.3,.5]},phase:'背負い直す a little hop and a shrug to hitch the pack up'},1],
  [{...STAND,armR:{t:[-7,38,4],p:[-1,.3,.5]},armL:{t:[7,38,4],p:[1,.3,.5]},expr:'o',phase:'よし settled, a satisfied breath'},2],
  [{...STAND,phase:'立つ'},0]]).map(k=>({...k,ms:100}))},
 scout_tension:{look:'scout',label:'斥候：全身がこわばり尻尾が逆立つ、そのあと膝が崩れる',loop:false,view:'front',keys:tween([
  [{...STAND,armR:{t:[-7,40,4],p:[-1,.3,.5]},armL:{t:[7,40,4],p:[1,.3,.5]},head:[-8,0,0],expr:'line',phase:'こらえる gripping her straps'},2],
  [{...STAND,hipY:180,pitch:-10,shrug:3,head:[20,0,0],footL:foot(9,0,{point:40,knee:-.25}),footR:foot(-9,0,{point:40,knee:-.25}),armR:{t:[-7,42,4],p:[-1,.3,.5]},armL:{t:[7,42,4],p:[1,.3,.5]},expr:'shut-o',phase:'頂点 peak: up on her toes, the tail straight up and bristling, ears up'},1],
  [{...STAND,hipY:181,pitch:-7,head:[14,0,6],footL:foot(9,0,{point:30,knee:-.25}),footR:foot(-9,0,{point:30,knee:-.25}),armR:{t:[-7,42,4],p:[-1,.3,.5]},armL:{t:[7,42,4],p:[1,.3,.5]},expr:'shut-o',phase:'震え shudders'},2],
  [{...STAND,hipY:200,pitch:14,head:[-18,0,0],footL:foot(10,0,{knee:-.5}),footR:foot(-10,0,{knee:-.5}),armR:{d:[-.2,.95,.2],e:.95},armL:{d:[.2,.95,.2],e:.95},expr:'o',phase:'崩れる knees give, the tail and ears drop'},0]]).map(k=>({...k,ms:/^頂点/.test(k.phase)?160:100}))},
 /* ======== mage: more of her own ======== */
 mage_barrier:{look:'mage',label:'魔法使い：義腕の手のひらを向けて障壁を張る',loop:false,view:'right',all8:true,keys:tween([
  [{...WITH_STAFF,phase:'立つ'},1],
  [{...WITH_STAFF,footL:foot(10,8,{knee:.05}),armL:{d:[.15,-.2,.97],e:.8},phase:'かざす the mechanical palm comes up toward the threat'},1],
  [{...WITH_STAFF,rootZ:-2,pitch:-4,footL:foot(10,8,{knee:.05}),armL:{d:[.1,-.25,.96],e:.9},phase:'張る the barrier holds; she braces'},3],
  [{...WITH_STAFF,phase:'解く'},0]]).map(k=>({...k,ms:90}))},
 mage_overheat:{look:'mage',label:'魔法使い：撃ちすぎて熱をもった義腕を振って冷ます',loop:false,view:'front',keys:tween([
  [{...WITH_STAFF,armL:{d:[.25,.3,.9],e:.8},head:[-14,0,-10],phase:'見る looks at the hot arm, steam venting from it'},2],
  [{...WITH_STAFF,armL:{d:[.7,.5,.4],e:.95},torso:-6,head:[-10,0,-14],phase:'振る shakes it out to the side'},1],
  [{...WITH_STAFF,armL:{d:[.5,.8,.2],e:.95},torso:4,head:[-10,0,-14],phase:'…'},1],
  [{...WITH_STAFF,armL:{d:[.7,.5,.4],e:.95},torso:-6,head:[-10,0,-14],phase:'振る'},1],
  [{...WITH_STAFF,armL:{d:[.2,.35,.9],e:.7},head:[-12,0,-6],phase:'握る flexes the metal fingers, one by one'},2],
  [{...WITH_STAFF,phase:'立つ back to calm'},0]]).map(k=>({...k,ms:90}))},
 mage_hat_tug:{look:'mage',label:'魔法使い：帽子のつばを引き下げて顔を隠す（照れ・気まずさ）',loop:false,view:'down_right',keys:tween([
  [{...WITH_STAFF,phase:'立つ'},2],
  [{...WITH_STAFF,armL:{d:[.25,-.75,.6],e:.62},head:[-8,0,-10],phase:'つば the mechanical hand goes up to the brim'},2],
  [{...WITH_STAFF,armL:{d:[.2,-.65,.72],e:.6},head:[-24,0,-16],expr:'line',phase:'隠す pulls it down over her eyes, turning a little away'},3],
  [{...WITH_STAFF,head:[-10,0,-6],expr:'line',phase:'立つ'},0]]).map(k=>({...k,ms:110}))},
 mage_arms_bound:{look:'mage',label:'魔法使い：両方の義腕を頭の上でまとめて縛られ、魔法を封じられてもがく',loop:true,view:'front',keys:loop(8,110,t=>({...STAND,
  hipY:181+1.5*Math.abs(S(t)),pelvis:8*S(t),torso:-5*S(t),sway:1.5*S(t),head:[-6,0,18*S(t)],
  footL:foot(9,0,{yaw:-10,knee:-.3,point:12*Math.max(0,S(t))}),footR:foot(-9,0,{yaw:-10,knee:-.3,point:12*Math.max(0,-S(t))}),
  armR:{d:[.05,-.97,.1],e:.9},armL:{d:[-.05,-.97,.1],e:.9},binds:[{j:'wrist_right',j2:'wrist_left'},{j:'wrist_right',to:[0,40,6]}],
  expr:'line',phase:'the metal forearms crossed and bound high over her head; she twists and pulls, keeping her face composed'}))},
 mage_recover:{look:'mage',label:'魔法使い：片膝から杖を支えに立ち上がり、何事もなかった顔をする',loop:false,view:'front',keys:tween([
  [{...WITH_STAFF,hipY:210,pitch:14,head:[-18,0,0],footL:foot(10,-30,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,12,{knee:.1,up:.8}),armL:{t:[2,62,16],p:[1,.5,.3]},armR:{d:[-.25,.3,.9],e:.9},prop:{...STAFF_UP,dir:[0,.95,.1],len:40,back:40},expr:'shut',phase:'片膝 on one knee on the staff (where mage_suppress_tension ends)'},2],
  [{...WITH_STAFF,hipY:196,pitch:12,head:[-12,0,0],footL:foot(10,-8,{lift:3}),footR:foot(-10,8,{knee:.1}),armL:{d:[.2,.9,.3],e:.9},armR:{d:[-.25,.4,.85],e:.9},prop:{...STAFF_UP,dir:[0,.95,.1],len:40,back:40},expr:'line',phase:'立ち上がる pushes up on the staff'},2],
  [{...WITH_STAFF,armL:{d:[.25,-.75,.6],e:.62},head:[-14,0,-8],expr:'line',phase:'整える straightens the hat'},2],
  [{...WITH_STAFF,head:[0,0,0],phase:'立つ composed, as if nothing happened'},0]]).map(k=>({...k,ms:110}))},
 /* ======== healer: more of her own ======== */
 healer_kneel_heal:{look:'healer',label:'ヒーラー：倒れた仲間のそばに膝をつき、杖を立てて片手をかざして癒やす',loop:true,view:'down_right',keys:loop(8,150,t=>({...STAND,
  hipY:206,pitch:18,head:[-24,0,0],shrug:.8*S(t),footL:foot(10,-30,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,-30,{lift:-6,point:40,dir:[0,1,.2]}),
  armR:{d:[-.3,.35,.6],e:.72},armL:{d:[.15,.7,.7],e:.85},prop:{...STAFF_UP,len:58,back:20},expr:'shut',phase:'kneeling, the staff upright in her right hand, the left hand held out low over the one she heals, eyes closed'}))},
 healer_purify:{look:'healer',label:'ヒーラー：杖で床を突き、清めの光を広げる',loop:false,view:'right',all8:true,keys:tween([
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,phase:'立つ'},1],
  [{...STAND,hipY:179,pitch:-4,armR:{d:[-.2,-.3,.9],e:.75},prop:STAFF_UP,head:[8,0,0],phase:'持ち上げる lifts the staff a little'},1],
  [{...STAND,hipY:186,pitch:8,armR:{d:[-.2,.7,.65],e:.85},prop:{...STAFF_UP,dir:[0,.97,.1],len:30,back:48},head:[-10,0,0],expr:'shut',phase:'突く drives its foot to the floor: the light spreads'},1],
  [{...STAND,hipY:184,pitch:6,armR:{d:[-.2,.7,.65],e:.85},armL:{t:[3,36,11],p:[1,.5,.2]},prop:{...STAFF_UP,dir:[0,.97,.1],len:30,back:48},head:[-12,0,0],expr:'shut',phase:'祈る holds it there, praying'},3],
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,phase:'立つ'},0]]).map(k=>({...k,ms:/^突く/.test(k.phase)?50:100}))},
 healer_panel_catch:{look:'healer',label:'ヒーラー：めくれかけた前垂れを慌てて押さえ、顔を赤くして背ける',loop:false,view:'front',keys:tween([
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,phase:'立つ'},1],
  [{...STAND,hipY:179,shrug:3,armR:{d:[-.28,.6,.5],e:.7},armL:{d:[.3,.2,.9],e:.6},prop:STAFF_UP,expr:'o',phase:'めくれる the panels flip up: she starts'},1],
  [{...STAND,hipY:183,pitch:8,torso:18,armR:{d:[-.28,.6,.5],e:.7},armL:{t:[-5,33,12],p:[1,.4,.4]},prop:STAFF_UP,head:[-10,0,-34],expr:'shut-line',phase:'押さえる slaps them down with her arm across her chest, face turned away'},2],
  [{...STAND,torso:10,armR:{d:[-.28,.6,.5],e:.7},armL:{t:[-5,33,12],p:[1,.4,.4]},prop:STAFF_UP,head:[-6,0,-20],expr:'line',phase:'にらむ a sidelong glare'},0]]).map(k=>({...k,ms:k.phase?.startsWith('押さえる')?60:100}))},
 healer_run_cover:{look:'healer',label:'ヒーラー：胸を押さえながら走る（揺れを抑えようとする）',loop:true,view:'right',keys:loop(8,80,(t,i)=>{const c=C(t),sn=S(t);return{...STAND,
  hipY:184-3*Math.abs(sn),pitch:14,rootZ:0,sway:1.5*sn,pelvis:10*sn,head:[-6,0,0],
  footL:foot(8,16*c,{lift:sn>0?12*sn:0,air:sn>.3,knee:.05,up:.5*Math.max(0,sn)}),footR:foot(-8,-16*c,{lift:sn<0?-12*sn:0,air:sn<-.3,knee:.05,up:.5*Math.max(0,-sn)}),
  armL:{t:[-5,33,12],p:[1,.4,.4]},armR:{d:[-.25,.55,.35-.4*c],e:.8},prop:{...STAFF_UP,dir:[0,-.93,.35]},expr:'line',phase:'running, one arm clamped across her chest against the bounce, the staff held tilted up in the other hand'}})},
 healer_dark_prayer:{look:'healer',label:'ヒーラー：人目を避けてひざまずき、ひそかに別の神へ祈る',loop:false,view:'up_right',keys:tween([
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,phase:'立つ'},2],
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,head:[-4,0,50],phase:'見回す makes sure no one is looking'},2],
  [{...STAND,hipY:206,pitch:10,head:[-30,0,0],footL:foot(10,-30,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,-30,{lift:-6,point:40,dir:[0,1,.2]}),armR:{t:[-2,30,12],p:[-1,.5,.2]},armL:{t:[2,24,12],p:[1,.5,.2]},prop:{...STAFF_UP,dir:[.15,-.95,-.25],len:52,back:24},phase:'祈る kneels, the staff held against her, the hands clasped the other way round, head low, eyes open'},4],
  [{...STAND,hipY:206,pitch:10,head:[-10,0,-30],footL:foot(10,-30,{lift:-6,point:40,dir:[0,1,.2]}),footR:foot(-10,-30,{lift:-6,point:40,dir:[0,1,.2]}),armR:{t:[-2,30,12],p:[-1,.5,.2]},armL:{t:[2,24,12],p:[1,.5,.2]},prop:{...STAFF_UP,dir:[.15,-.95,-.25],len:52,back:24},expr:'o',phase:'気配 a sound: she glances round, a faint smile gone at once'},2],
  [{...STAND,armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,phase:'立つ back on her feet, the cleric again'},0]]).map(k=>({...k,ms:120}))},
 healer_tension_refuse:{look:'healer',label:'ヒーラー：首を横に振って拒みながら全身がこわばり、胸をかばったまま崩れる',loop:false,view:'front',keys:tween([
  [{...STAND,armL:{t:[-5,33,12],p:[1,.4,.4]},armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,head:[-8,0,25],expr:'line',phase:'拒む shaking her head: no'},1],
  [{...STAND,armL:{t:[-5,33,12],p:[1,.4,.4]},armR:{d:[-.28,.6,.5],e:.7},prop:STAFF_UP,head:[-8,0,-25],expr:'line',phase:'拒む'},1],
  [{...STAND,hipY:181,pitch:-12,shrug:3,head:[22,0,0],footL:foot(9,0,{point:40,knee:-.25}),footR:foot(-9,0,{point:40,knee:-.25}),armL:{t:[-5,34,12],p:[1,.4,.4]},armR:{d:[-.4,.5,.7],e:.8},prop:{...STAFF_UP,dir:[.2,-.95,.2]},expr:'shut-line',phase:'頂点 peak: arched, on her toes, still covering herself, lips pressed'},1],
  [{...STAND,hipY:182,pitch:-8,head:[16,0,6],footL:foot(9,0,{point:30,knee:-.25}),footR:foot(-9,0,{point:30,knee:-.25}),armL:{t:[-5,34,12],p:[1,.4,.4]},armR:{d:[-.4,.5,.7],e:.8},prop:{...STAFF_UP,dir:[.2,-.95,.2]},expr:'shut-line',phase:'震え shudders'},2],
  [{...SIT,head:[-16,0,-20],armL:{t:[-5,33,12],p:[1,.4,.4]},armR:{d:[-.3,.7,.6],e:.85},prop:{...STAFF_UP,dir:[.3,-.9,.3],len:50,back:20},expr:'line',phase:'崩れる sinks to the floor, arm still across her chest, face turned away'},0]]).map(k=>({...k,ms:/^頂点/.test(k.phase)?160:100}))}
};
/* where a prop reaches, in the world (from the hand) */
function propPoints(J,p,side='right'){const h=J['hand_'+side],d=p.dir==='fore'?norm(sub(h,J['wrist_'+side])):norm(p.dir);return[add(h,mul(d,-(p.back||0))),add(h,mul(d,p.len))]}
const sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,k)=>a.map(v=>v*k),norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
export function library(){
 const poses={},meta={};
 for(const [name,m] of Object.entries(MOTIONS)){
  poses[name]={};let prevT=null;const lag=[];
  // the healer's chest: it trails the body - the frame-to-frame movement of her chest, pushed one frame late
  m.keys.forEach((k,i)=>{const J=pose(k);const T=J.thorax;lag.push(prevT?[-(T[0]-prevT[0])*.6,-(T[1]-prevT[1])*.9]:[0,0]);prevT=T});
  if(m.loop&&m.keys.length>1){const J0=pose(m.keys[0]),Jn=pose(m.keys[m.keys.length-1]);lag[0]=[-(J0.thorax[0]-Jn.thorax[0])*.6,-(J0.thorax[1]-Jn.thorax[1])*.9]}
  for(const d of DIRECTIONS)poses[name][d]=m.keys.map((k,i)=>{const J=pose(k);if(k.prop){const [a,b]=propPoints(J,k.prop);J.prop_a=a;J.prop_b=b}
   const P=project(J,d);return{direction:d,yaw:YAW[d],motion:name,frame:i,frame_ms:Math.round(k.ms*(k.msScale||1)),phase:k.phase,expr:k.expr,look:m.look,
    prop:k.prop?{kind:k.prop.kind,from:'prop_a',to:'prop_b'}:undefined,chest_lag:m.look==='healer'?lag[(i-1+lag.length)%lag.length].map(v=>+Math.max(-4,Math.min(4,v)).toFixed(1)):undefined,
    binds:(k.binds||[]).map((b,bi)=>({joint:b.j,joint2:b.j2,anchor:b.to?'bind'+bi:null,noLoop:b.noLoop?1:undefined})),joints:P}});
  meta[name]={look:m.look,label:m.label,loop:m.loop,view:m.view,all8:!!m.all8,frame_ms:m.keys.map(k=>Math.round(k.ms*(k.msScale||1))),phases:m.keys.map(k=>k.phase)};
 }
 return{schema:'anatomical-eight-direction-motion/1.0',extends:'scene-poses.json (same skeleton, canvas and projection)',
  notes:{look:'which heroine the motion is for: scout, mage, healer',prop:'the staff or knife in her hand runs from joints[prop.from] to joints[prop.to]',
   chest_lag:'healer only: how far her chest trails the body in this frame (px on the 288 canvas; x, y); draw it in every frame of hers',all8:'attacks and spells: drawn in all eight directions'},
  canvas:[288,288],centre_x:144,ground_y:242,directions:DIRECTIONS,yaw:YAW,motions:meta,poses};
}
