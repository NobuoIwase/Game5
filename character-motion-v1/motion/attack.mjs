/** Full-body attack motions on the same skeleton and projection as rig.mjs / poses.json.
 *
 * The in-game cut-out rig can only turn whole parts about fixed pivots, so its swings read as
 * "standing still and moving an arm". These are reference poses for drawing new sprite frames
 * (or for a future rig with knees and a twisting trunk): the hips turn first, the shoulders
 * follow, the weight moves onto the stepping foot, the knees give at the cut, and the blade is
 * carried through and held before she recovers.
 *
 * World: [lateral, y (screen, down is +), forward]. Anatomical RIGHT is lateral < 0 (sword hand).
 * Projection is exactly the one in rig.mjs:
 *   x = 96 + cos(yaw)*lateral + sin(yaw)*forward,  depth = cos(yaw)*forward - sin(yaw)*lateral,
 *   y = worldY + 0.18*depth   (192x256 canvas, ground_y 242; the game sheets are 2x = 384x512)
 * Frames are IN PLACE: the game itself moves her during the step-in (see ATTACK_MOTION_REQUEST.md).
 */
export const DIRECTIONS=['front','down_right','right','up_right','back','up_left','left','down_left'];
export const YAW=Object.fromEntries(DIRECTIONS.map((d,i)=>[d,i*45]));
const rad=d=>d*Math.PI/180,r5=x=>+x.toFixed(3)||0;
const L={thigh:26,shin:28,upper:22.4,fore:17.2,hand:5,sword:54,neckToHead:20.5};
const lerp=(a,b,t)=>a+(b-a)*t;

/* ---- key poses (v3: bolder, aimed in the world, arms that extend and a wrist that snaps).
   Trunk: pelvis/torso yaw in degrees, + turns the RIGHT (sword) side back; pitch + leans forward;
   hipY is the height of the hip joints (screen y, larger = lower).
   The rest is in WORLD coordinates [lateral, y, forward] (she faces +forward; her right is
   lateral < 0; y down is +):
   foot [lateral, forward, lift, toe-out yaw]
   armR / armL {d:[direction from the shoulder], e: extension 0..1 (1 = elbow straight)}
   wrist  the blade's angle to the sword forearm, about the lateral axis of the cut, in degrees:
          + the blade is held back (cocked: up when the arm points forward, behind her when the
          arm points up), 0 in one line with the forearm, - snapped on past it
   shieldN  the way the face of the shield looks
   smear: the blade moves fast enough for a smear on this frame */
const GUARD={rootZ:-12,hipY:188,pelvis:30,torso:5,pitch:6,footL:[9,6,0,0],footR:[-10,-26,0,50],armR:{d:[-.3,.55,.78],e:.8},tip:-26,armL:{d:[.1,.3,.95],e:.55},shieldN:[0,0,1]};
/* v4: the feet stay where they stand. rootZ is how far the hips have travelled forward (the
   step is IN the frames). The rear (right) foot never leaves its spot during the cut; the lead
   (left) foot flies forward and, from the moment it lands, is nailed to that spot while the body
   rides forward over it. Feet are in world coordinates, not relative to the hips. */
export const MOTIONS={
 slash:{label:'通常斬り（踏み込み振り下ろし）',loop:false,hitFrame:6,keys:[
  {...GUARD,ms:100,phase:'構え guard: lead (shield) foot forward, wide stance, knees soft, blade up'},
  {rootZ:-14,hipY:191,pelvis:40,torso:10,pitch:0,footL:[9,6,0,0],footR:[-10,-26,0,50],armR:{d:[-.25,-.6,.76],e:.75},tip:-88,armL:{d:[.1,.25,.96],e:.7},shieldN:[0,0,1],ms:70,phase:'振り上げ raise: sink onto the rear foot, the blade goes up in front of the face'},
  {rootZ:-12,hipY:188,pelvis:55,torso:20,pitch:-8,footL:[9,8,5,0,1],footR:[-10,-26,0,50],armR:{d:[-.15,-.95,-.1],e:.7},tip:-150,armL:{d:[.05,.1,.99],e:.92},shieldN:[0,0,1],ms:70,phase:'振りかぶり wind-up: over the head and back, the lead foot lifts, shield thrust out'},
  {rootZ:-6,hipY:186,pelvis:58,torso:22,pitch:-10,footL:[9,16,12,0,1],footR:[-10,-26,3,50],armR:{d:[-.12,-.9,-.42],e:.72},tip:165,armL:{d:[.05,.15,.99],e:.9},shieldN:[0,0,1],ms:80,phase:'溜め cocked: wrist bent back, the blade hangs down her back; the rear foot drives her on'},
  {rootZ:2,hipY:192,pelvis:25,torso:10,pitch:8,footL:[9,24,0,0],footR:[-10,-26,5,50],armR:{d:[-.1,-.95,.2],e:.9},tip:-145,armL:{d:[.25,.35,.9],e:.75},shieldN:[.2,0,.98],ms:50,phase:'着地 lead foot lands - nailed there from now on; the arm comes over, the blade lags behind it'},
  {rootZ:7,hipY:195,pelvis:-10,torso:-12,pitch:20,footL:[9,24,0,0],footR:[-10,-26,6,50],armR:{d:[-.05,-.3,.95],e:1},tip:-58,armL:{d:[.5,.6,.6],e:.7},shieldN:[.5,0,.85],smear:true,ms:40,phase:'振り下ろし the cut (smear): hips ride forward over the planted foot, arm straight, blade catching up'},
  {rootZ:13,hipY:196,pelvis:-25,torso:-15,pitch:26,footL:[9,24,0,0],footR:[-10,-26,7,50],armR:{d:[0,.38,.93],e:1},tip:21,armL:{d:[.55,.75,.35],e:.7},shieldN:[.7,0,.7],ms:90,phase:'命中 impact (hit-stop): the wrist snaps - arm and blade one straight line; front knee deep, rear leg long'},
  {rootZ:12,hipY:194,pelvis:-40,torso:-20,pitch:20,footL:[9,24,0,0],footR:[-10,-26,7,50],armR:{d:[.2,.85,.48],e:1},tip:40,armL:{d:[.6,.6,-.5],e:.75},shieldN:[.8,0,-.6],smear:true,ms:80,phase:'振り抜き follow-through: the straight arm carries on right down to her front knee; the blade stays shallower than the arm (the wrist turns up) - cut through, not stuck in'},
  {rootZ:12,hipY:193,pelvis:-42,torso:-18,pitch:16,footL:[9,24,0,0],footR:[-10,-26,6,50],armR:{d:[.22,.88,.42],e:1},tip:44,armL:{d:[.6,.6,-.5],e:.75},shieldN:[.8,0,-.6],ms:130,phase:'残心 hold: arm long and low, the blade held out level-ish ahead of her knee'},
  {rootZ:2,hipY:193,pelvis:0,torso:0,pitch:12,footL:[9,24,0,0],footR:[-10,-26,2,50],armR:{d:[-.3,.45,.84],e:.85},tip:-15,armL:{d:[.15,.3,.94],e:.6},shieldN:[0,0,1],ms:80,phase:'戻り push back off the front foot (still planted); the blade comes up'},
  {rootZ:-8,hipY:190,pelvis:20,torso:4,pitch:8,footL:[9,12,6,0,1],footR:[-10,-26,0,50],armR:{d:[-.3,.5,.81],e:.82},tip:-24,armL:{d:[.1,.3,.95],e:.58},shieldN:[0,0,1],ms:70,phase:'引き the lead foot comes back'},
  {...GUARD,ms:90,phase:'構え guard again'}]},
 heavy:{label:'破城斬り（跳び上がって叩きつけ）',loop:false,hitFrame:6,keys:[
  {...GUARD,ms:140,phase:'構え guard'},
  {rootZ:-16,hipY:204,pelvis:40,torso:10,pitch:18,footL:[11,6,0,0],footR:[-12,-26,0,50],armR:{d:[-.3,-.3,-.9],e:.85},tip:-125,armL:{d:[.1,.45,.89],e:.7},shieldN:[0,0,1],ms:130,phase:'溜め deep crouch over the rear foot, blade drawn up and back'},
  {rootZ:-8,hipY:172,pelvis:45,torso:20,pitch:-14,footL:[9,8,16,0,1],footR:[-10,-24,18,30],armR:{d:[-.15,-.9,-.4],e:.8},tip:-150,armL:{d:[.05,0,1],e:.9},shieldN:[0,-.3,.95],ms:80,phase:'跳躍 launch: off both feet, blade swept up and cocked'},
  {rootZ:2,hipY:160,pelvis:40,torso:18,pitch:-18,footL:[9,10,28,0],footR:[-10,-8,32,20],armR:{d:[-.1,-.97,-.2],e:.85},tip:170,armL:{d:[.05,-.05,1],e:.9},shieldN:[0,-.3,.95],ms:140,phase:'頂点 apex: hangs in the air, bowed back, blade hanging down the back'},
  {rootZ:8,hipY:174,pelvis:10,torso:4,pitch:12,footL:[9,26,16,0,1],footR:[-10,-8,20,40],armR:{d:[-.05,-.6,.8],e:1},tip:-100,armL:{d:[.3,.3,.9],e:.8},shieldN:[.4,0,.9],smear:true,ms:60,phase:'降下 dive: the arm comes over straight, the blade whipping after it'},
  {rootZ:8,hipY:198,pelvis:-15,torso:-6,pitch:28,footL:[9,28,0,0],footR:[-10,-22,6,50],armR:{d:[0,.1,1],e:1},tip:-20,armL:{d:[.5,.6,.6],e:.7},shieldN:[.7,0,.7],smear:true,ms:40,phase:'着地 lead foot lands and stays; the blade still coming'},
  {rootZ:9,hipY:200,pelvis:-25,torso:-12,pitch:36,footL:[9,28,0,0],footR:[-10,-22,5,50],armR:{d:[0,.74,.67],e:1},tip:62,armL:{d:[.6,.75,.25],e:.7},shieldN:[.8,0,.6],ms:130,phase:'叩きつけ SLAM (hit): wrist snapped, blade driven into the floor'},
  {rootZ:9,hipY:199,pelvis:-25,torso:-12,pitch:34,footL:[9,28,0,0],footR:[-10,-22,5,50],armR:{d:[0,.74,.67],e:1},tip:62,armL:{d:[.6,.75,.25],e:.7},shieldN:[.8,0,.6],ms:170,phase:'衝撃 shock: holds while the floor cracks'},
  {rootZ:0,hipY:195,pelvis:0,torso:0,pitch:16,footL:[9,28,0,0],footR:[-10,-26,2,50],armR:{d:[-.3,.45,.84],e:.85},tip:-15,armL:{d:[.15,.3,.94],e:.6},shieldN:[0,0,1],ms:90,phase:'戻り wrench the blade free, push back'},
  {rootZ:-8,hipY:190,pelvis:20,torso:4,pitch:8,footL:[9,14,6,0,1],footR:[-10,-26,0,50],armR:{d:[-.3,.5,.81],e:.82},tip:-24,armL:{d:[.1,.3,.95],e:.58},shieldN:[0,0,1],ms:80,phase:'引き the lead foot comes back'},
  {...GUARD,ms:110,phase:'構え guard'}]},
 kesa:{label:'袈裟懸け（右上から左下への斜め斬り）',loop:false,hitFrame:6,keys:[
  {...GUARD,ms:100,phase:'構え guard'},
  {rootZ:-14,hipY:191,pelvis:45,torso:15,pitch:0,footL:[9,6,0,0],footR:[-10,-26,0,50],armR:{d:[-.55,-.55,.6],e:.75},plane:'kesa',tip:-95,armL:{d:[.1,.25,.96],e:.7},shieldN:[0,0,1],ms:70,phase:'振り上げ raise to her right shoulder'},
  {rootZ:-12,hipY:188,pelvis:60,torso:22,pitch:-8,footL:[9,8,5,0,1],footR:[-10,-26,0,50],armR:{d:[-.45,-.85,-.25],e:.72},plane:'kesa',tip:-150,armL:{d:[.05,.1,.99],e:.92},shieldN:[0,0,1],ms:70,phase:'振りかぶり wind-up over the right shoulder, the lead foot lifts'},
  {rootZ:-6,hipY:186,pelvis:62,torso:24,pitch:-10,footL:[9,16,12,0,1],footR:[-10,-26,3,50],armR:{d:[-.35,-.93,-.1],e:.78},plane:'kesa',tip:-160,armL:{d:[.05,.15,.99],e:.9},shieldN:[0,0,1],ms:80,phase:'溜め cocked: the blade hangs behind her right shoulder'},
  {rootZ:2,hipY:192,pelvis:25,torso:10,pitch:8,footL:[9,24,0,0],footR:[-10,-26,5,50],armR:{d:[-.45,-.8,.3],e:.92},plane:'kesa',tip:-140,armL:{d:[.25,.35,.9],e:.75},shieldN:[.2,0,.98],ms:50,phase:'着地 lead foot lands and stays; the arm starts down the diagonal, blade lagging'},
  {rootZ:7,hipY:195,pelvis:-10,torso:-12,pitch:16,footL:[9,24,0,0],footR:[-10,-26,6,50],armR:{d:[-.3,-.35,.9],e:1},plane:'kesa',tip:-55,armL:{d:[.5,.6,.6],e:.7},shieldN:[.5,0,.85],smear:true,ms:40,phase:'斬り下ろし the cut (smear) along the diagonal'},
  {rootZ:12,hipY:196,pelvis:-28,torso:-15,pitch:18,footL:[9,24,0,0],footR:[-10,-26,7,50],armR:{d:[.15,.35,.92],e:1},plane:'kesa',tip:15,armL:{d:[.55,.7,.2],e:.7},shieldN:[.7,0,.7],ms:90,phase:'命中 impact: wrist snapped, arm and blade in line, cutting down to her left'},
  {rootZ:12,hipY:195,pelvis:-42,torso:-22,pitch:18,footL:[9,24,0,0],footR:[-10,-26,7,50],armR:{d:[.5,.8,.33],e:1},plane:'kesa',tip:45,armL:{d:[.6,.6,-.5],e:.75},shieldN:[.8,0,-.6],smear:true,ms:80,phase:'振り抜き carried through to below her left hip'},
  {rootZ:12,hipY:194,pelvis:-44,torso:-20,pitch:15,footL:[9,24,0,0],footR:[-10,-26,6,50],armR:{d:[.55,.8,.25],e:1},plane:'kesa',tip:52,armL:{d:[.6,.6,-.5],e:.75},shieldN:[.8,0,-.6],ms:130,phase:'残心 hold: arm long across to her left, blade low behind'},
  {rootZ:2,hipY:193,pelvis:0,torso:0,pitch:12,footL:[9,24,0,0],footR:[-10,-26,2,50],armR:{d:[-.3,.45,.84],e:.85},tip:-15,armL:{d:[.15,.3,.94],e:.6},shieldN:[0,0,1],ms:80,phase:'戻り push back off the front foot (still planted); the blade comes up'},
  {rootZ:-8,hipY:190,pelvis:20,torso:4,pitch:8,footL:[9,12,6,0,1],footR:[-10,-26,0,50],armR:{d:[-.3,.5,.81],e:.82},tip:-24,armL:{d:[.1,.3,.95],e:.58},shieldN:[0,0,1],ms:70,phase:'引き the lead foot comes back'},
  {...GUARD,ms:90,phase:'構え guard again'}]},
 yoko:{label:'横一文字（右から左への水平斬り）',loop:false,hitFrame:6,keys:[
  {...GUARD,ms:100,phase:'構え guard'},
  {rootZ:-14,hipY:190,pelvis:60,torso:20,pitch:0,footL:[9,6,0,0],footR:[-10,-26,0,50],armR:{d:[-.85,.15,-.3],e:.8},plane:'yoko',tip:-120,armL:{d:[.2,.25,.95],e:.7},shieldN:[0,0,1],ms:70,phase:'引き構え draw the blade to her right side'},
  {rootZ:-12,hipY:188,pelvis:75,torso:25,pitch:-2,footL:[9,8,5,0,1],footR:[-10,-26,0,50],armR:{d:[-.7,.1,-.7],e:.8},plane:'yoko',tip:-165,armL:{d:[.25,.2,.95],e:.85},shieldN:[0,0,1],ms:70,phase:'振りかぶり wind-up: turned far round, blade behind her at waist height, lead foot lifts'},
  {rootZ:-6,hipY:187,pelvis:78,torso:26,pitch:-2,footL:[9,16,11,0,1],footR:[-10,-26,3,50],armR:{d:[-.6,.1,-.8],e:.78},plane:'yoko',tip:178,armL:{d:[.25,.2,.95],e:.85},shieldN:[0,0,1],ms:80,phase:'溜め cocked: the blade points straight back'},
  {rootZ:2,hipY:192,pelvis:40,torso:10,pitch:6,footL:[9,24,0,0],footR:[-10,-26,5,50],armR:{d:[-.9,0,.3],e:.95},plane:'yoko',tip:-130,armL:{d:[.35,.35,.85],e:.75},shieldN:[.3,0,.95],ms:50,phase:'着地 lead foot lands; hips open first, the blade trails round'},
  {rootZ:7,hipY:194,pelvis:0,torso:-10,pitch:10,footL:[9,24,0,0],footR:[-10,-26,6,50],armR:{d:[-.4,.05,.92],e:1},plane:'yoko',tip:-45,armL:{d:[.5,.5,.6],e:.7},shieldN:[.5,0,.85],smear:true,ms:40,phase:'薙ぎ the sweep (smear): arm straight, level'},
  {rootZ:12,hipY:195,pelvis:-25,torso:-20,pitch:12,footL:[9,24,0,0],footR:[-10,-26,7,50],armR:{d:[.1,.08,.99],e:1},plane:'yoko',tip:10,armL:{d:[.6,.55,.3],e:.7},shieldN:[.7,0,.7],ms:90,phase:'命中 impact: blade level at her chest, in line with the arm'},
  {rootZ:10,hipY:194,pelvis:-50,torso:-30,pitch:10,footL:[9,24,0,0],footR:[-10,-26,7,50],armR:{d:[.8,.1,.5],e:1},plane:'yoko',tip:70,armL:{d:[.6,.6,-.5],e:.75},shieldN:[.8,0,-.6],smear:true,ms:80,phase:'振り抜き carried round to her left'},
  {rootZ:10,hipY:193,pelvis:-55,torso:-30,pitch:8,footL:[9,24,0,0],footR:[-10,-26,6,50],armR:{d:[.85,.15,-.1],e:1},plane:'yoko',tip:100,armL:{d:[.6,.6,-.5],e:.75},shieldN:[.8,0,-.6],ms:130,phase:'残心 hold: arm stretched out to her left, blade behind'},
  {rootZ:2,hipY:193,pelvis:0,torso:0,pitch:12,footL:[9,24,0,0],footR:[-10,-26,2,50],armR:{d:[-.3,.45,.84],e:.85},tip:-15,armL:{d:[.15,.3,.94],e:.6},shieldN:[0,0,1],ms:80,phase:'戻り push back off the front foot (still planted); the blade comes up'},
  {rootZ:-8,hipY:190,pelvis:20,torso:4,pitch:8,footL:[9,12,6,0,1],footR:[-10,-26,0,50],armR:{d:[-.3,.5,.81],e:.82},tip:-24,armL:{d:[.1,.3,.95],e:.58},shieldN:[0,0,1],ms:70,phase:'引き the lead foot comes back'},
  {...GUARD,ms:90,phase:'構え guard again'}]},
 thrust:{label:'突き',loop:false,hitFrame:4,keys:[
  {...GUARD,ms:100,phase:'構え guard'},
  {rootZ:-14,hipY:191,pelvis:50,torso:10,pitch:0,footL:[9,6,0,0],footR:[-10,-26,0,50],armR:{d:[-.45,.6,-.2],e:.55,p:[-.35,.3,-1]},tip:8,armL:{d:[.1,.2,.97],e:.8},shieldN:[0,0,1],ms:90,phase:'引き draw the sword back by her hip, point toward the target, shield covering'},
  {rootZ:-16,hipY:192,pelvis:55,torso:12,pitch:-2,footL:[9,8,6,0,1],footR:[-10,-26,0,50],armR:{d:[-.45,.55,-.3],e:.48,p:[-.35,.3,-1]},tip:6,armL:{d:[.1,.2,.97],e:.85},shieldN:[0,0,1],ms:70,phase:'溜め coil: weight back, lead foot lifts'},
  {rootZ:-4,hipY:188,pelvis:20,torso:4,pitch:6,footL:[9,22,10,0,1],footR:[-10,-26,4,50],armR:{d:[-.2,.12,.97],e:.8},tip:4,armL:{d:[.3,.3,.9],e:.8},shieldN:[.3,0,.95],smear:true,ms:50,phase:'踏み込み lunge: the arm drives out ahead of the body'},
  {rootZ:12,hipY:195,pelvis:-30,torso:-10,pitch:14,footL:[9,30,0,0],footR:[-10,-26,7,50],armR:{d:[-.05,.06,1],e:1},tip:4,armL:{d:[.5,.3,-.8],e:.9},shieldN:[.7,0,-.7],ms:100,phase:'命中 full extension: arm and blade one line, rear leg straight, shield arm thrown back'},
  {rootZ:12,hipY:195,pelvis:-30,torso:-10,pitch:14,footL:[9,30,0,0],footR:[-10,-26,7,50],armR:{d:[-.05,.06,1],e:1},tip:4,armL:{d:[.5,.3,-.8],e:.9},shieldN:[.7,0,-.7],ms:110,phase:'残心 hold at full stretch'},
  {rootZ:4,hipY:192,pelvis:20,torso:4,pitch:8,footL:[9,30,0,0],footR:[-10,-26,2,50],armR:{d:[-.45,.6,-.2],e:.55,p:[-.35,.3,-1]},tip:8,armL:{d:[.15,.25,.95],e:.7},shieldN:[0,0,1],ms:80,phase:'引き戻し the blade comes back'},
  {rootZ:-8,hipY:190,pelvis:22,torso:4,pitch:6,footL:[9,14,6,0,1],footR:[-10,-26,0,50],armR:{d:[-.3,.5,.81],e:.82},tip:-24,armL:{d:[.1,.3,.95],e:.58},shieldN:[0,0,1],ms:70,phase:'引き the lead foot comes back'},
  {...GUARD,ms:90,phase:'構え guard again'}]},
 advance:{label:'構えたまま前進',loop:true,keys:[]},
 retreat:{label:'構えたまま後退',loop:true,keys:[]},
 /* the swing she cannot finish (a monster she has fallen for): raised, held, lowered, and she looks away */
 swing_abandon:{label:'振りかぶったまま止まり、剣を下ろして目をそらす',loop:false,hitFrame:null,keys:[
  {...GUARD,ms:100,phase:'構え guard'},
  {rootZ:-14,hipY:191,pelvis:40,torso:10,pitch:0,footL:[9,6,0,0],footR:[-10,-26,0,50],armR:{d:[-.25,-.6,.76],e:.75},tip:-88,armL:{d:[.1,.25,.96],e:.7},shieldN:[0,0,1],ms:80,phase:'振り上げ raise'},
  {rootZ:-12,hipY:188,pelvis:55,torso:20,pitch:-8,footL:[9,8,0,0],footR:[-10,-26,0,50],armR:{d:[-.15,-.95,-.1],e:.7},tip:-150,armL:{d:[.05,.1,.99],e:.92},shieldN:[0,0,1],ms:90,phase:'振りかぶり wind-up'},
  {rootZ:-12,hipY:188,pelvis:52,torso:18,pitch:-6,footL:[9,8,0,0],footR:[-10,-26,0,50],armR:{d:[-.15,-.95,-.1],e:.7},tip:-150,armL:{d:[.05,.1,.99],e:.92},shieldN:[0,0,1],head:[4,0,0],ms:260,phase:'止まる it stops there: held over her head, trembling'},
  {rootZ:-12,hipY:190,pelvis:35,torso:8,pitch:4,footL:[9,6,0,0],footR:[-10,-26,0,50],armR:{d:[-.3,.2,.93],e:.8},tip:10,armL:{d:[.1,.5,.86],e:.6},shieldN:[0,0,1],head:[-8,0,-10],ms:110,phase:'下ろす the blade comes down, not a cut'},
  {rootZ:-12,hipY:190,pelvis:25,torso:4,pitch:8,footL:[9,6,0,0],footR:[-10,-26,0,50],armR:{d:[-.2,.85,.48],e:.95},tip:60,armL:{d:[.1,.6,.8],e:.55},shieldN:[0,0,1],head:[-14,0,-30],ms:220,phase:'目をそらす point down by her knee; she looks away'},
  {...GUARD,ms:110,phase:'構え guard again'}]}
};
/* guarded steps, drawn in place (the game moves her): a "step-drag" - the lead foot steps out
   while the planted rear foot slides back under her (0-3), then the rear foot is picked up and
   brought back to its place while the lead foot slides back (4-7). Backing off: rear foot first.
   A light bounce on each step. */
for(const [name,dir] of [['advance',1],['retreat',-1]]){
 const keys=[],S=16,Lz=18,Rz=-18;
 for(let f=0;f<8;f++){const a=f<4,u=(f%4)/4,sw=Math.sin(u*Math.PI),e=.5-.5*Math.cos(u*Math.PI);
  let zl,zr,ll=0,lr=0;
  if(dir>0){ if(a){zl=Lz+S*e;ll=9*sw;zr=Rz-S*e}else{zl=Lz+S-S*e;zr=Rz-S+S*e;lr=8*sw} }
  else     { if(a){zr=Rz-S*e;lr=9*sw;zl=Lz+S*e}else{zr=Rz-S+S*e;zl=Lz+S-S*e;ll=8*sw} }
  keys.push({...GUARD,rootZ:0,hipY:189-sw*3,pitch:dir>0?10:0,torso:dir>0?5:0,footL:[9,zl,ll,0],footR:[-10,zr,lr,50],
   armR:dir>0?{d:[-.3,.5,.81],e:.82}:{d:[-.3,.6,.74],e:.72},tip:dir>0?-30:-55,armL:dir>0?{d:[.1,.25,.96],e:.6}:{d:[.1,.3,.95],e:.5},ms:90,
   phase:(dir>0?'前進 ':'後退 ')+(a?(dir>0?'lead foot steps out':'rear foot steps back'):(dir>0?'rear foot drawn up':'lead foot drawn back'))});
 }
 MOTIONS[name].keys=keys;
}

/* ---- forward kinematics ---- */
function yawPt(l,z,a){const c=Math.cos(rad(a)),s=Math.sin(rad(a));return[l*c-z*s,l*s+z*c]}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],len=a=>Math.hypot(...a),norm=a=>mul(a,1/(len(a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function ik3(a,target,l1,l2,pole){
 let d=sub(target,a);const dl=len(d),m=Math.max(Math.abs(l1-l2)+.01,Math.min(l1+l2-.05,dl));d=mul(norm(d),m);const u=norm(d);
 const x=(l1*l1-l2*l2+m*m)/(2*m),h=Math.sqrt(Math.max(0,l1*l1-x*x));let p=sub(pole,mul(u,dot(pole,u)));p=norm(p);
 return{mid:add(add(a,mul(u,x)),mul(p,h)),end:add(a,d)};
}
/* the cut planes: e1 ahead, e2 the way the stroke comes down/across. tip angles are measured in
   this plane from her sword shoulder: 0 = ahead, +90 = along e2, -90 = against it (where the
   stroke starts), 180 = behind her */
const PLANES={vertical:{e1:[0,0,1],e2:[0,1,0]},kesa:{e1:[0,0,1],e2:[.7071,.7071,0]},yoko:{e1:[0,0,1],e2:[1,0,0]}};
/* v5 feminine: a narrower track and toes turned out less; she sinks and leans less; the hips
   sway toward the leg that carries her weight and the chest answers the other way (an S line);
   knees track a touch inward; narrower shoulders */
function feminine(k){
 const q={...k},fz=f=>f&&[f[0]*.7,f[1],f[2],(f[3]||0)*.6,f[4]];
 q.footL=fz(k.footL);q.footR=fz(k.footR);
 q.hipY=188+(k.hipY-188)*.82;q.pitch=k.pitch*.8;
 const w=Math.max(0,Math.min(1,((k.rootZ||0)+12)/26));   // 0 = weight on the rear foot, 1 = on the front
 q.sway=(k.footL[2]>2||k.footR[2]>6)&&w<.2?0:2.6*w-1.4*(1-w);
 return q;
}
export function pose(k0){
 const k=k0.raw?{...k0,sway:k0.sway||0}:feminine(k0);   // raw: poses authored exactly (restraint.mjs)
 const J={},root=[k.sway||0,k.hipY,k.rootZ||0],P=rad(k.pitch),chest=k.pelvis+k.torso;
 // a point on the trunk: [lateral, rise above the hip joints, forward], turned by yaw then leaned
 const trunk=(l,rise,z,yaw)=>{const [l1,z1]=yawPt(l,z,yaw),z2=z1*Math.cos(P)+rise*Math.sin(P),r2=rise*Math.cos(P)-z1*Math.sin(P);return[root[0]+l1,root[1]-r2,root[2]+z2]};
 J.root=root;const cs=-(k.sway||0)*.9;J.waist=trunk(cs*.3,19.5,0,k.pelvis);J.thorax=trunk(cs,36.5,0,chest);J.neck=trunk(cs*.8,55.5,0,chest);   // the chest answers the hips (S line)
 // the head stays level, eyes on the target - unless the key tips it: head [pitch (+ back), roll (+ toward
 // her left shoulder), yaw (+ turns to her left)]
 const hp=rad((k.head||[])[0]||0),hr=rad((k.head||[])[1]||0),hy=rad((k.head||[])[2]||0);
 J.head=[J.neck[0]+Math.sin(hr)*L.neckToHead,J.neck[1]-L.neckToHead*Math.cos(hp)*Math.cos(hr),J.neck[2]+2-Math.sin(hp)*L.neckToHead];
 // where she looks (9px ahead of the head centre) and her two eyes, set across the head's own
 // left-right axis - so a head thrown back still has its eyes side by side
 {const fw=[Math.sin(hy)*Math.cos(hp),-Math.sin(hp),Math.cos(hy)*Math.cos(hp)],lat=[Math.cos(hy)*Math.cos(hr),Math.sin(hr),-Math.sin(hy)*Math.cos(hr)];
  J.face=add(J.head,mul(fw,9));const ec=add(J.head,add(mul(fw,8.5),[0,-1,0]));J.eye_left=add(ec,mul(lat,4));J.eye_right=add(ec,mul(lat,-4))}
 J.crotch=[root[0],root[1]+7,root[2]+1];
 // points on the front of the body (where small creatures cling)
 J.chest_left=trunk(5.5+cs,33,8.5,chest);J.chest_right=trunk(-5.5+cs,33,8.5,chest);J.belly=trunk(cs*.3,7,8,k.pelvis);J.groin=trunk(0,-6,6.5,k.pelvis);
 for(const [side,sg] of [['right',-1],['left',1]]){
  const hip=trunk(8.5*sg,0,0,k.pelvis),f=k['foot'+(side==='right'?'R':'L')],fy=rad(f[3]||0);
  const toe=[-sg*Math.sin(fy)*(side==='right'?1:-1)*0+(side==='right'?-Math.sin(fy):Math.sin(fy)),0,Math.cos(fy)];   // toes turned out to her own side
  const onToe=f[2]>0&&f[2]<=8&&!f[4];let ankle=[f[0],232-(onToe?Math.min(f[2],4.5):f[2]),f[1]];   // heel up: the ankle rises only as far as the foot allows
  // f[5]: pointed toes (degrees past the resting foot angle). On the ground she rises onto her toes
  // (the toes stay where they were, the heel comes up); in the air the toes point down.
  const pt=f[5]||0,fp=rad(36+pt),FL=13.6;
  if(pt&&!f[4]&&f[2]<=8){const t0=[f[0]+toe[0]*11,240,f[1]+toe[2]*11];ankle=[t0[0]-toe[0]*FL*Math.cos(fp),240-FL*Math.sin(fp),t0[2]-toe[2]*FL*Math.cos(fp)]}
  // knees go the way the toes point (and a little outward), never inward across the body
  const ko=f[6]!=null?f[6]:-.08,ku=f[7]||0;const leg=ik3(hip,ankle,L.thigh,L.shin,f[8]?norm([f[8][0]*(side==='right'?-1:1),f[8][1],f[8][2]]):norm(add(toe,[sg*ko,-ku,0])));   // f[8]: the knee's direction given outright ([out, down, forward], mirrored per side)   // f[7]: knees raised (+, lying on the back) or pressed down (-, kneeling)   // knees track a touch inward; f[6] sets it (- = knees together, + = splayed out)
  J['hip_'+side]=hip;J['knee_'+side]=leg.mid;J['ankle_'+side]=leg.end;
  const lift=f[2]>2?1:0;   // a lifted foot hangs toes-down a little
  // a planted foot whose heel comes up (lift <= 8 on the ground) keeps its toes on the floor
  const ty=onToe?240:leg.end[1]+8-lift*3,tz=onToe?Math.sqrt(Math.max(0,185-(240-leg.end[1])**2)):11;
  // f[9]: the foot's direction given outright ([out, down, forward], mirrored per side), or 'shin' to carry on the
  // line of the shin (a pointed foot lying face down or kicking up from there)
  if(f[9]){const e=leg.end,dv=f[9]==='shin'?norm(sub(e,leg.mid)):norm([f[9][0]*(side==='right'?-1:1),f[9][1],f[9][2]]);J['toe_'+side]=add(e,mul(dv,FL))}
  else if(pt){const e=leg.end,gnd=!f[4]&&f[2]<=8;J['toe_'+side]=gnd?[e[0]+toe[0]*FL*Math.cos(fp),240,e[2]+toe[2]*FL*Math.cos(fp)]:[e[0]+toe[0]*FL*Math.cos(fp),e[1]+FL*Math.sin(fp),e[2]+toe[2]*FL*Math.cos(fp)]}
  else J['toe_'+side]=[leg.end[0]+toe[0]*tz,ty,leg.end[2]+toe[2]*tz];
  const sh=trunk(11.5*sg+cs,41+(k.shrug||0),0,chest),A=k['arm'+(side==='right'?'R':'L')],hv=A.w?add(root,A.w):A.t?trunk(A.t[0],A.t[1],A.t[2],chest):add(sh,mul(norm(A.d),(L.upper+L.fore-.06)*A.e));   // A.w: the wrist given outright, measured from the root (the joins between motions use it); A.t: a hand position on the body (tied behind her back...)
  // elbows point out and down; the sword elbow lifts out to the side when the hand is overhead
  const over=hv[1]<sh[1]-12;const pole=A.p||(side==='right'?(over?[-1,-.2,-.6]:[-1,.6,-.3]):[1,.9,.05]);   // A.p: an elbow direction for this key   // the shield elbow stays close to her side
  const arm=ik3(sh,hv,L.upper,L.fore,pole);
  J['shoulder_'+side]=sh;J['elbow_'+side]=arm.mid;J['wrist_'+side]=arm.end;
  const fa=norm(sub(arm.end,arm.mid));J['hand_'+side]=add(arm.end,mul(fa,L.hand));
 }
 // knees may touch but never pass each other: if they come closer than 8 px across (her right is -x), each knee
 // swings outward about its own hip-ankle line (the foot stays where it is) until they clear
 {const gap=()=>J.knee_left[0]-J.knee_right[0];
  if(gap()<8){const rot=(side,th)=>{const h=J['hip_'+side],u=norm(sub(J['ankle_'+side],h)),v=sub(J['knee_'+side],h);
    return add(h,add(add(mul(v,Math.cos(th)),mul(cross(u,v),Math.sin(th))),mul(u,dot(u,v)*(1-Math.cos(th)))))};
   const kl=J.knee_left,kr=J.knee_right,dirL=rot('left',.05)[0]>rot('left',-.05)[0]?1:-1,dirR=rot('right',.05)[0]<rot('right',-.05)[0]?1:-1;
   for(let th=.02;th<1.2&&gap()<8;th+=.02){J.knee_left=kl;J.knee_right=kr;J.knee_left=rot('left',dirL*th);J.knee_right=rot('right',dirR*th)}}}
 // the blade: the sword forearm turned about the cut's lateral axis by the wrist angle. When a
 // key gives tip (the angle of the tip seen from her right shoulder, side view: 0 = ahead,
 // -90 = straight up, 90 = straight down), the wrist angle is solved to put it there.
 if(!k.noSword){
 const PL=PLANES[k.plane||'vertical'],ax=norm(cross(PL.e2,PL.e1));   // the wrist turns the blade about the plane's normal
 const f=norm(sub(J.wrist_right,J.elbow_right)),axf=cross(ax,f);
 const bladeAt=w=>{let v=norm(add(add(mul(f,Math.cos(w)),mul(axf,Math.sin(w))),mul(ax,dot(ax,f)*(1-Math.cos(w)))));return norm(sub(v,mul(ax,dot(v,ax)*.6)))};   // kept mostly in the plane
 let w=rad(k.wrist||0);
 if(k.tip!=null){const sh=J.shoulder_right,want=rad(k.tip);let best=1e9;for(let d=-180;d<=180;d+=.5){const v=bladeAt(rad(d)),t=add(J.hand_right,mul(v,L.sword)),r=sub(t,sh),a=Math.atan2(dot(r,PL.e2),dot(r,PL.e1)),e=Math.abs(Math.atan2(Math.sin(a-want),Math.cos(a-want)));if(e<best){best=e;w=rad(d)}}Object.defineProperty(J,'_wrist',{value:+(w*180/Math.PI).toFixed(1),enumerable:false})}
 const sd=bladeAt(w);   // (the blade is kept in the plane of the cut)
 J.sword_tip=add(J.hand_right,mul(sd,L.sword));
 // the cross-guard: across the blade, flat to the swing
 const side=norm(cross(sd,[0,-1,0]).map((v,i)=>v||(i===0?1:0)));J.guard_a=add(J.hand_right,mul(side,6));J.guard_b=add(J.hand_right,mul(side,-6));
 }
 if(!k.noShield){
 // the shield rides on the outside of the left forearm, its face turned by shieldN
 const fm=mul(add(J.elbow_left,J.wrist_left),.5),n=norm(k.shieldN||[0,0,1]);J.shield=add(fm,mul(n,3));
 // the rim (8 points) and a point just in front of the face: the renderer draws the ellipse
 // through the rim and shows the face (boss and cross) or the back (arm strap) by which way the
 // face points in that view. The strap runs along the forearm.
 let u=norm(cross(n,[0,1,0]));if(len(u)<.1)u=[1,0,0];const v=norm(cross(n,u));
 for(let q=0;q<8;q++){const a=q*Math.PI/4;J['shield_r'+q]=add(J.shield,add(mul(u,15*Math.cos(a)),mul(v,15*Math.sin(a))))}
 J.shield_face=add(J.shield,mul(n,6));
 for(let q=0;q<8;q++){const a=q*Math.PI/4;J['shield_b'+q]=add(J.shield,add(add(mul(u,14*Math.cos(a)),mul(v,14*Math.sin(a))),mul(n,-3.5)))}   // the back rim: the shield has a thickness
 const fa2=norm(sub(J.wrist_left,J.elbow_left));J.strap_a=add(J.shield,mul(fa2,-8));J.strap_b=add(J.shield,mul(fa2,8));
 }
 // restraints (restraint.mjs): each bind ties a joint to an anchor in the world or to another joint
 (k.binds||[]).forEach((b,i)=>{if(b.to)J['bind'+i]=b.to.slice();if(b.via)J['bindvia'+i]=b.via.slice()});
 return J;
}
const PARENT={root:null,waist:'root',thorax:'waist',neck:'thorax',head:'neck',hip_right:'root',knee_right:'hip_right',ankle_right:'knee_right',toe_right:'ankle_right',
 shoulder_right:'thorax',elbow_right:'shoulder_right',wrist_right:'elbow_right',hand_right:'wrist_right',hip_left:'root',knee_left:'hip_left',ankle_left:'knee_left',toe_left:'ankle_left',
 shoulder_left:'thorax',elbow_left:'shoulder_left',wrist_left:'elbow_left',hand_left:'wrist_left',sword_tip:'hand_right',guard_a:'hand_right',guard_b:'hand_right',shield:'wrist_left',shield_r0:'shield',shield_r1:'shield',shield_r2:'shield',shield_r3:'shield',shield_r4:'shield',shield_r5:'shield',shield_r6:'shield',shield_r7:'shield',shield_face:'shield',strap_a:'shield',strap_b:'shield',shield_b0:'shield',shield_b1:'shield',shield_b2:'shield',shield_b3:'shield',shield_b4:'shield',shield_b5:'shield',shield_b6:'shield',shield_b7:'shield'};
export function project(J,direction){
 const yaw=YAW[direction],s=Math.sin(rad(yaw)),c=Math.cos(rad(yaw)),out={};
 for(const [id,w] of Object.entries(J)){const [l,y,z]=w,depth=c*z-s*l;out[id]={parent:PARENT[id],position:[r5(144+c*l+s*z),r5(y+.18*depth)],depth:r5(depth),world:[r5(l),r5(y),r5(z)]}}
 return out;
}
export function library(){
 const motions={};
 for(const [name,m] of Object.entries(MOTIONS)){
  motions[name]={};
  for(const d of DIRECTIONS)motions[name][d]=m.keys.map((k,i)=>({direction:d,yaw:YAW[d],motion:name,frame:i,frame_ms:k.ms,root_forward:k.rootZ||0,cut_plane:k.plane||'vertical',phase:k.phase,hit:i===m.hitFrame||undefined,smear:k.smear||undefined,joints:project(pose(k),d)}));
 }
 return{schema:'anatomical-eight-direction-motion/1.0',extends:'poses.json (same skeleton, canvas and projection)',canvas:[288,288],origin:'top-left',ground_y:242,centre_x:144,root_forward:'rootZ per frame: forward travel of the hips baked into the frames',
  directions:DIRECTIONS,yaw:YAW,anatomical_sides:{right:'negative world lateral; sword hand',left:'positive world lateral; shield forearm'},
  projection:'x=144+cos(yaw)*lateral+sin(yaw)*forward; y=worldY+0.18*depth; depth=cos(yaw)*forward-sin(yaw)*lateral. Positive depth is nearer.',
  cut_planes:{vertical:'the blade swings in the upright plane through her and the target (slash, heavy, thrust)',kesa:'the diagonal plane from above her right shoulder down to her left hip',yoko:'the level plane at chest height, right to left'},feminine:'narrower track, less toe-out, shallower sink and lean, hips sway to the weight-bearing leg with the chest answering (S line), knees a touch inward, shield elbow close',
  in_place:false,planted_feet:'right foot fixed through the cut; left foot fixed from landing (slash 4-9, heavy 5-9)',extra_joints:{sword_tip:'end of the blade (hand_right + 54px along the blade)',guard_a:'cross-guard end',guard_b:'cross-guard end',shield:'centre of the shield on the left forearm',shield_r0:'shield rim, 8 points 45deg apart (r0..r7); the face is the plane through them',shield_b0:'back rim of the shield, 8 points (thickness 3.5px)',shield_face:'a point 6px in front of the face of the shield: nearer than shield = the face is toward the viewer',strap_a:'arm strap end (along the left forearm)',strap_b:'arm strap end'},
  motions:Object.fromEntries(Object.entries(MOTIONS).map(([n,m])=>[n,{label:m.label,loop:m.loop,hit_frame:m.hitFrame??null,frame_ms:m.keys.map(k=>k.ms),phases:m.keys.map(k=>k.phase)}])),
  poses:motions};
}
