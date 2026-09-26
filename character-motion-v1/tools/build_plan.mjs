// The way to make each requested frame, balancing the amount of drawing against how it looks.
//   node tools/build_plan.mjs      (after build_reuse_list.mjs and build_part_reuse.mjs)
// Output: motion/plan.json and PRODUCTION_PLAN.md
//   same    another frame with the same body and face: use it (reuse.json)
//   draw    a whole picture: the frames that carry the motion -
//           attacks: guard, the cocked blade, the hit and the frame after it (heavy: its top, the slam, the shock;
//                    the swing she abandons: where it stops and where she looks away), in all eight directions
//           one-off motions: the named keys (phases that are not '…') and always the peak of a climax, leaving out a
//                    key within NEAR px of one already drawn
//           loops: frame 0, the frame furthest from it, and any beat that happens once (an aftershock)
//   finish  put together from parts, then touched up by hand: frames using four or more new part pictures at once
//   parts   put together from parts only: in-betweens, joins, the guarded steps, the rest of the loops
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {library as A,DIRECTIONS} from '../motion/attack.mjs';
import {library as R} from '../motion/restraint.mjs';import {library as S} from '../motion/scenes.mjs';import {library as T} from '../motion/transitions.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const RU=JSON.parse(fs.readFileSync(path.join(ROOT,'motion','reuse.json'),'utf8')).frames,PR=JSON.parse(fs.readFileSync(path.join(ROOT,'motion','part-reuse.json'),'utf8')).frames;
const NEAR=12;   // px on the 288 canvas: a key this close to one already drawn is put together from it
const ATTACK_KEYS=/^(構え|溜め|命中|振り抜き|頂点|叩きつけ|衝撃|止まる|目をそらす)/;
const JS=['head','thorax','root','knee_left','knee_right','ankle_left','ankle_right','elbow_left','elbow_right','wrist_left','wrist_right'];
const far=(F)=>{let b=0,bi=0;F.forEach((f,i)=>{const d=Math.max(...JS.map(k=>Math.hypot(f.joints[k].position[0]-F[0].joints[k].position[0],f.joints[k].position[1]-F[0].joints[k].position[1])));if(d>b){b=d;bi=i}});return bi};
const SETS=[['attack','攻撃',A(),()=>DIRECTIONS],['restraint','拘束された姿勢',R(),(m,x)=>[x.view]],['scene','床・口づけ・拘束なし・張り付き',S(),(m,x)=>m==='walk_unsteady'?DIRECTIONS:[x.view]],['join','つなぎ',T(),(m,x)=>[x.view]]];
const plan={},count={same:0,draw:0,finish:0,parts:0},byKind={};
for(const [kind,label,lib,views] of SETS)for(const [m,byDir] of Object.entries(lib.poses))for(const v of views(m,lib.motions[m])){const F=byDir[v],meta=lib.motions[m];
 const ph=F.map(f=>(f.phase||'').split(' ')[0]),keys=new Set();
 if(kind==='attack'){if(m!=='advance'&&m!=='retreat')ph.forEach((p,i)=>{if(ATTACK_KEYS.test(p)||i===meta.hit_frame||meta.hit_frame!=null&&i===meta.hit_frame+1)keys.add(i)})}
 else if(kind==='join'){}
 else if(meta.loop&&m!=='walk_unsteady'){keys.add(0);keys.add(far(F));const cnt={};ph.forEach(p=>cnt[p]=(cnt[p]||0)+1);ph.forEach((p,i)=>{if(cnt[p]===1&&p&&p!=='…')keys.add(i)})}
 else if(m==='walk_unsteady'){}   // a walk: put together from parts, like the walk and run
 else{   // one-off motions: the named keys, but not one that is close to a key already drawn (the shudders after a
       // peak, holding against it...): those are put together from the drawn one
  const dist=(a,b)=>Math.max(...JS.map(k=>Math.hypot(F[a].joints[k].position[0]-F[b].joints[k].position[0],F[a].joints[k].position[1]-F[b].joints[k].position[1])));
  ph.forEach((p,i)=>{if(!p||p==='…')return;if(/^頂点/.test(p)||[...keys].every(j=>dist(i,j)>NEAR))keys.add(i)})}
 plan[m]??={};plan[m][v]=F.map((f,i)=>{const r=RU[m]?.[v]?.[i],np=(PR[m]?.[v]?.[i]||[]).filter(k=>!k.startsWith('顔')).length;
  const use=r?.use==='same'?'same':keys.has(i)?'draw':np>=4?'finish':'parts';count[use]++;(byKind[kind]??={same:0,draw:0,finish:0,parts:0})[use]++;return{frame:i,use,...(use==='same'?{from:r.from}:{})}});
}
// the part pictures still needed by the frames that are put together (parts / finish)
const need=new Map();for(const [m,o] of Object.entries(plan))for(const [v,F] of Object.entries(o))F.forEach(e=>{if(e.use!=='parts'&&e.use!=='finish')return;for(const k of PR[m]?.[v]?.[e.frame]||[]){need.set(k,(need.get(k)||0)+1)}});
const groups={};for(const k of need.keys()){const p=k.split('|')[0];groups[p]=(groups[p]||0)+1}
// bent elbows and knees in the assembled frames: the walk bends the elbow to about 42 degrees at most, so a joint bent
// further needs its own picture of the bent joint (drawn over the fold), per direction: half (60-110) and deep (110+)
const JB={},bentFrames={half:0,deep:0},sub3=(p,q)=>p.map((v,i)=>v-q[i]),ang=(u,v)=>Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1]+u[2]*v[2])/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;
for(const [kind,,lib,views] of SETS)for(const [m,byDir] of Object.entries(lib.poses))for(const v of views(m,lib.motions[m]))byDir[v].forEach((f,i)=>{const e=plan[m][v][i];if(e.use!=='parts'&&e.use!=='finish')return;
 const W=k=>f.joints[k].world;let worst=0;for(const [j,a1,b1,c1] of [['肘','shoulder','elbow','wrist'],['膝','hip','knee','ankle']])for(const sd of ['left','right']){const b=ang(sub3(W(b1+'_'+sd),W(a1+'_'+sd)),sub3(W(c1+'_'+sd),W(b1+'_'+sd)));
  if(b>=60){const k=`${j}|${b<110?'半分曲げた（60〜110度）':'深く曲げた（110度〜）'}|${v}`;JB[k]=(JB[k]||0)+1;worst=Math.max(worst,b)}}
 if(worst>=110)bentFrames.deep++;else if(worst>=60)bentFrames.half++});
const nJoints=Object.keys(JB).length;
const nParts=[...need.keys()].length,nFaces=groups['顔']||0;
fs.writeFileSync(path.join(ROOT,'motion','plan.json'),JSON.stringify({notes:{same:'use the frame in from',draw:'a whole picture',finish:'put together from parts, then touched up',parts:'put together from parts only',joint_pictures:'bent elbows and knees drawn as their own pictures (joint|bend|direction: frames using it)'},part_pictures:[...need.keys()],joint_pictures:JB,frames:plan}));
const tot=Object.values(count).reduce((a,b)=>a+b,0);
const kindRows=SETS.map(([k,l])=>{const c=byKind[k];return`| ${l} | ${c.draw} | ${c.finish} | ${c.parts} | ${c.same} | ${c.draw+c.finish+c.parts+c.same} |`}).join('\n');
const motionRows=SETS.map(([k,l,lib,views])=>`### ${l}\n\n| id | 1枚絵で描くコマ | 組み立て＋描き足し | 部位で組み立て | 同じ絵 |\n|---|---|---|---|---|\n`+Object.keys(lib.poses).map(m=>{const vs=views(m,lib.motions[m]),F=plan[m][vs[0]],pick=u=>F.filter(e=>e.use===u).map(e=>e.frame);
 const n=u=>vs.reduce((a,v)=>a+plan[m][v].filter(e=>e.use===u).length,0),lst=u=>{const p=pick(u);return p.length?`${n(u)}（${vs.length>1?'各方向 ':''}${p.join(', ')}${vs.length>1?' コマ目':''}）`:'0'};
 return`| \`${m}\` | ${lst('draw')} | ${lst('finish')} | ${n('parts')} | ${n('same')} |`}).join('\n')).join('\n\n');
fs.writeFileSync(path.join(ROOT,'PRODUCTION_PLAN.md'),`# 作り方の計画（1枚絵と部位の組み立ての振り分け）

作成：Claude（\`node tools/build_plan.mjs\` で再生成。機械が読む版は \`motion/plan.json\`）。

## 考え方

作業量と絵の質の間を取る。
- **1枚絵で丁寧に描く**：動きの見え方を決めるコマだけ
- **部位の組み立て**：残り（歩行と同じ作り方）
- **同じ絵**：これまでどおり描かない（\`REUSE_LIST.md\`）

| 区分 | 対象 |
|---|---|
| **1枚絵** | 攻撃：構え・溜め・命中・その直後（破城斬りは頂点・叩きつけ・衝撃、ためらいは止まる・目をそらす）を8方向<br>1回きりのモーション：名前の付いたキー姿勢（絶頂の頂点は必ず）。ただし、すでに1枚絵にするキーと12px以内の近い姿勢は、それを元に組み立てる<br>ループ：0コマ目・いちばん大きく動いたコマ・1回だけの見せ場（余震など） |
| **組み立て＋描き足し** | 上以外で、新しい部位の絵を4つ以上同時に使うコマ（寝た姿勢・前屈み・強い反りなど、組み立てだけでは硬く見えやすい） |
| **部位で組み立て** | 中割り、つなぎ、構えたままの前進・後退、ふらつく歩き、ループの残りのコマ |
| **同じ絵** | 体も顔もほかのコマと同じ |

## 全体

全${tot}コマのうち：
- **1枚絵 ${count.draw}**
- **組み立て＋描き足し ${count.finish}**
- **部位で組み立て ${count.parts}**
- 同じ絵 ${count.same}

**組み立てに使う新しい部位の絵：${nParts}枚**（うち表情${nFaces}枚）
- **曲げた肘・膝の絵：${nJoints}枚**
  - 半分（60〜110度）／深く（110度〜）×方向
  - 歩行の肘は最大42度ほどしか曲がらないため、それより曲がる関節には専用の絵が要る
  - 組み立てのコマのうち、半分曲げが${bentFrames.half}コマ、深く曲げが${bentFrames.deep}コマ
- 手の形：3種類（開いた手のひら・体に当てる手・強く握った手）×方向
- 衣装・髪の差分：キャラクターごとに別途
- 部位の分け方の前提は \`REUSE_LIST.md\` 後半のとおり（各キャラクターを歩行と同じ部位に8方向ぶん分ける）

| | 1枚絵 | 組み立て＋描き足し | 部位で組み立て | 同じ絵 | 計 |
|---|---|---|---|---|---|
${kindRows}

**比べると**
- すべて1枚絵：新規1279コマ＋部分描き替え52コマ
- すべて組み立て：部位の絵107枚だけで済むが、動きの要のコマまで組み立てになり、硬く見える
- この計画：要のコマ${count.draw}枚を1枚絵にし、${count.finish}コマは組み立てたあとに描き足す

## 部位の絵の描き方（関節が切り取ったように見えないように）

1枚絵から部位を切り出すと、関節の所が切り取られたように見える。
- 切り口に輪郭線が残る、トゲが出る、曲げると隙間ができる
- 歩行でも、脚の切り口のトゲや首の切り口の線を1つずつ直した（\`walk-graphics-handoff/docs/04_HISTORY.md\`）

そのため、**部位は部位として最初から描く**。1枚絵は切り出しに使わない。

1. **のりしろを付ける**
   - 上腕・前腕・太もも・すねは、関節の中心を越えて、太さの半分ほど先まで描く
   - 先は丸く閉じる
   - 隣の部位と重なって、曲げても隙間ができない
2. **切り口には輪郭線を描かない**
   - 関節側の端は、輪郭線を付けずにぼかすように終える
   - 外から見える輪郭は、隣の部位や関節の絵が受け持つ
3. **関節は別の絵にする**
   - 肩・肘・手首・股・膝・足首を、丸い関節の絵として別に描く（歩行と同じ）
   - 手前にあるときは上、奥にあるときは下に重ねる。関節の丸を常に一番上に貼ると、膝が逆向きに見える
4. **曲げた肘・膝は専用の絵**
   - 60度を超えて曲げる肘・膝は、曲げた形の関節の絵（上の${nJoints}枚）を使う
   - 膝の前の角と裏のしわを、1枚の関節の絵に描いておく
   - 伸ばした関節の絵を回して、深い曲げをごまかさない
5. **胴には受け口を描く**
   - 上半身・下半身の絵に、肩・股・首がはまる受け口（\`socket\`）を描く
   - 腕・脚・首の付け根は、胴の絵の内側に隠れるようにする
6. **1枚絵と部位は同じ設定画から描く**
   - 絵柄・衣装・配色は、同じキャラクターの設定画と部位一覧をもとに、部位の絵と1枚絵の両方で合わせる
   - 1枚絵を部位の見本にはするが、切り出しには使わない
7. **組み立てたら関節を拡大して確かめる**（歩行の確認手順と同じ）
   - 首・肩・肘・膝・手首・足首を拡大する
   - 隙間、切り口の線、トゲ、裏向きの関節がないか見る
- **つなぎは短い**：1コマ70msで前後の絵に挟まれるので、部位の組み立てで十分
- **描き足しの範囲**：部位の境目の最終調整、胴の曲がり、衣装のしわや髪の流れ

## モーションごとの振り分け

${motionRows}
`);
console.log(`plan: draw ${count.draw}, finish ${count.finish}, parts ${count.parts}, same ${count.same} (of ${tot}); part pictures ${nParts} (faces ${nFaces}); joint pictures ${nJoints}; bent frames ${JSON.stringify(bentFrames)}`,JSON.stringify(byKind));
