// How far the frames could be put together from part pictures, the way the walk was (walk-graphics-handoff:
// head, upper and lower body, neck, upper arm, forearm, hand, thigh, shin, foot... per direction, turned and
// stretched between the joints).
//   node tools/build_part_reuse.mjs
// Output: motion/part-reuse.json and the "parts" section appended to REUSE_LIST.md (run build_reuse_list.mjs first).
// For every requested frame and every part, the angle the part is seen from is worked out from the skeleton:
//   - head, upper body, lower body: seen from more than ELV degrees above or below its own level (a head bent
//     down or thrown back, a body bent over, lying, seen from the feet or the head end) -> a new view
//   - upper arm, forearm, thigh, shin: pointing so far toward or away from the viewer that it shows at less than
//     FORE of its length (a straight scale no longer looks right) -> a new foreshortened picture
//   - foot: pointed in line with the shin, the sole toward the viewer, or seen from above -> a new foot
//   - face: every expression other than the plain one, on every head view it is seen from -> a face to draw
// A part picture is drawn once per direction it is seen from and then used in every frame that needs it.
// Hands (open, pressing, gripping) are counted from the key poses (see HANDS below).
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {library as A,DIRECTIONS,YAW} from '../motion/attack.mjs';
import {library as R} from '../motion/restraint.mjs';import {library as S} from '../motion/scenes.mjs';import {library as T} from '../motion/transitions.mjs';import {library as H} from '../motion/heroines.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),ELV=30,FORE=.5,PT=145;
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],len=a=>Math.hypot(...a),norm=a=>{const l=len(a)||1;return a.map(v=>v/l)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],mul=(a,k)=>a.map(v=>v*k),deg=r=>r*180/Math.PI,cl=v=>Math.max(-1,Math.min(1,v));
const AZ=['正面','右斜め前','右','右斜め後ろ','後ろ','左斜め後ろ','左','左斜め前'],azBin=a=>((Math.round(a/45)%8)+8)%8;
const EXPR={o:'口を開けた',line:'口を結んだ',shut:'目を閉じた','shut-o':'目を閉じて口を開けた','shut-line':'目を閉じて口を結んだ'};
function view(V,up,lat){const fw=cross(up,lat);return{az:-deg(Math.atan2(dot(V,lat),dot(V,fw))),el:deg(Math.asin(cl(dot(V,up))))}}
function needs(f,dir){const y=YAW[dir]*Math.PI/180,V=[-Math.sin(y),0,Math.cos(y)],W=k=>f.joints[k].world,out=[];
 let headView;{const fw=norm(sub(W('face'),W('head'))),lat=norm(sub(W('eye_left'),W('eye_right'))),up=norm(cross(lat,fw)),v=view(V,up,lat);
  headView=`${AZ[azBin(v.az)]}${Math.abs(v.el)>ELV?(v.el>0?'・上から':'・下から'):''}`;if(Math.abs(v.el)>ELV)out.push(`頭|${headView}（${v.el>0?'うつむき・頭頂が見える':'のけぞり・あごの下が見える'}）`);
  if(f.expr&&EXPR[f.expr]&&Math.abs(v.az)<100)out.push(`顔|${headView}・${EXPR[f.expr]}`)}
 for(const [name,a,b,l1,l2,endA,endB] of [['上半身','neck','waist','shoulder_left','shoulder_right','首の側','腰の側'],['下半身','waist','root','hip_left','hip_right','腰の上の側','脚の側']]){
  const up=norm(sub(W(a),W(b))),lat=norm(sub(W(l1),W(l2))),v=view(V,up,lat);if(Math.abs(v.el)>ELV)out.push(`${name}|${AZ[azBin(v.az)]}・${v.el>0?endA:endB}から${Math.abs(v.el)>67?'（ほぼ真っすぐ）':''}`)}
 for(const [name,a,b] of [['上腕','shoulder','elbow'],['前腕','elbow','wrist'],['太もも','hip','knee'],['すね','knee','ankle']])for(const s of ['left','right']){
  const ax=norm(sub(W(b+'_'+s),W(a+'_'+s))),r=Math.sqrt(Math.max(0,1-dot(ax,V)**2));if(r<FORE)out.push(`${name}|${dir}向きの図・${dot(ax,V)>0?'先がこちら向き':'先が奥向き'}${r<.25?'（ほぼ真正面）':''}`)}
 for(const s of ['left','right']){const ft=norm(sub(W('toe_'+s),W('ankle_'+s))),sh=norm(sub(W('knee_'+s),W('ankle_'+s))),ang=deg(Math.acos(cl(dot(ft,sh)))),n=norm(sub(sh,mul(ft,dot(sh,ft)))),el=deg(Math.asin(cl(dot(V,n))));
  if(ang>PT)out.push(`足|${dir}向きの図・つま先まで伸ばした`);if(el<-45)out.push(`足|${dir}向きの図・足裏が見える`);else if(el>60)out.push(`足|${dir}向きの図・甲を上から`)}
 return out}
/* hands: what the hands do, read from the key poses (arms given as a hand on the body, pushing, on the floor...) */
const HANDS={'体に当てる手（胸・下腹・口を押さえる、自分を抱く）':/arm[RL]:\{t:/,'剣を握る手':null,'床・壁・相手に当てる開いた手（押す・支える・伸ばす）':null};
const SETS=[['attack','攻撃',A(),()=>DIRECTIONS],['restraint','拘束された姿勢',R(),(m,x)=>[x.view]],['scene','床・口づけ・拘束なし・張り付き',S(),(m,x)=>m==='walk_unsteady'?DIRECTIONS:[x.view]],['heroine','ほかのヒロイン',H(),(m,x)=>x.all8?DIRECTIONS:[x.view]],['join','つなぎ',T(),(m,x)=>[x.view]]];
const need=new Map(),per={},dirsUsed=new Set();let frames=0,plain=0,heavy=[];
for(const [kind,label,lib,views] of SETS)for(const [m,byDir] of Object.entries(lib.poses))for(const v of views(m,lib.motions[m]))byDir[v].forEach((f,i)=>{frames++;dirsUsed.add(v);
 const n=needs(f,v);if(!n.length)plain++;for(const k of n){if(!need.has(k))need.set(k,new Set());need.get(k).add(m)}
 ((per[m]??={})[v]??=[]).push(n);if(n.filter(k=>!k.startsWith('顔')).length>=4)heavy.push(`${m} ${v} ${i}`)});
const groups={};for(const [k,s] of need){const [p,d]=k.split('|');(groups[p]??=[]).push([d,[...s]])}
const ORDER=['頭','顔','上半身','下半身','上腕','前腕','太もも','すね','足'];
fs.writeFileSync(path.join(ROOT,'motion','part-reuse.json'),JSON.stringify({notes:{method:'parts turned and stretched between joints, as the walk was made',thresholds:{head_body_tilt_deg:ELV,limb_min_visible_length:FORE,pointed_foot_deg:PT}},
 new_parts:Object.fromEntries(ORDER.filter(p=>groups[p]).map(p=>[p,groups[p].map(([d,ms])=>({view:d,motions:ms}))])),frames:per}));
const totalParts=Object.values(groups).reduce((a,g)=>a+g.length,0),faces=groups['顔']?.length||0;
const sec=`
## 部位を使い回して組み立てる場合

歩行と同じ組み立て方を考えた場合の見積もり（\`node tools/build_part_reuse.mjs\`、詳細は \`motion/part-reuse.json\`）。

**歩行の作り方**（\`walk-graphics-handoff/docs/02_ASSEMBLY.md\`）
- 部位を方向ごとに1枚ずつ描く：頭・上半身・下半身・首・上腕・前腕・手・太もも・すね・足（かかと・振り出し・つま先の差分つき）など
- 関節の間で回転・伸縮して組み立てる
- 太ももは同じ絵の角度を変えるだけ
- 左右の腕・脚にも同じ絵を使う

**前提**
- 各キャラクターを、歩行の素体と同じ部位に分けて、8方向ぶん用意する
- 左右反転はしない
- いまの戦士の部位素材（\`parts/warrior/\`）は腕・脚が1枚ずつで、肘・膝は変形で曲げている
  - この見積もりの形にするには、上腕・前腕・太もも・すねに分け直す必要がある

**判定のしかた**：依頼する全${frames}コマについて、部位ごとに見える角度を骨格から計算した。回すだけで済まず、新しい絵が要るのは次の場合。

| 部位 | 新しい絵が要る場合 |
|---|---|
| 頭 | ${ELV}度より深くうつむく・のけぞる（頭頂やあごの下が見える） |
| 顔 | 普通の顔以外の表情（目を閉じる・口を開ける・結ぶ）。見える頭の向きごと |
| 上半身・下半身 | 前屈み・寝た姿勢などで、体を${ELV}度より上下から見る（首の側・脚の側から見る） |
| 上腕・前腕・太もも・すね | こちらや奥へ向いて、見える長さが${FORE*100}%未満（縦に縮めるだけでは形が合わない） |
| 足 | つま先まで伸ばす／足裏が見える／甲を上から見る |

**結果**
- **既存の部位だけで組める**：${plain}コマ（${Math.round(plain/frames*100)}%）
- **ほかの${frames-plain}コマ**：次の新しい部位の絵を足せば組める
- **新しく描く部位の絵**：${totalParts}枚（うち表情${faces}枚）。1枚描けば、それを使う全コマで使い回せる

${ORDER.filter(p=>groups[p]).map(p=>`### ${p}（${groups[p].length}枚）\n\n| 見え方 | 使うモーション |\n|---|---|\n${groups[p].sort((a,b)=>b[1].length-a[1].length).map(([d,ms])=>`| ${d} | ${ms.length<=6?ms.map(x=>'`'+x+'`').join('、'):ms.slice(0,6).map(x=>'`'+x+'`').join('、')+` ほか${ms.length-6}`} |`).join('\n')}\n`).join('\n')}
### 手（形の種類で数える）

手は骨格に形の情報がないので、キーの内容から種類を数えた。どれも方向ごとに1枚ずつ要る。
- 力を抜いた手：歩行に既存
- 剣を握る手：攻撃
- 開いた手のひら：押す、床や相手に当てる、伸ばす、泡の内側に当てる
- 体に当てる手：胸・下腹・口を押さえる、自分を抱く
- 強く握った手：こらえる、力む

新しく描くのは3種類×方向。

### 部位の組み立てで気をつけること

- **大きく形が変わる所**：次の場面は、部位を回すだけでは硬く見えやすい
  - 背中を大きく反らす頂点
  - 輪で締め付けられる
  - 前屈み・四つん這い・寝た姿勢
  - 新しい部位を4つ以上同時に使うコマ：${heavy.length}コマ（\`motion/part-reuse.json\`）
  - これらは、組み立てた上で一部を描き足す（仕上げる）か、1枚絵にする候補
- **衣装・髪**：脚を大きく開く、寝る、逆さに近い姿勢では、スカートや髪の形が変わる
  - キャラクターごとに差分が要る（骨格からは数えていない）
- **比べると**：1枚絵なら新規${'${NEW}'}コマ＋部分描き替え${'${PART}'}コマ
  - 部位の組み立てなら、新しい部位の絵${totalParts}枚＋手3種類×方向＋衣装・髪の差分＋仕上げ
  - どちらで作るかは、絵の質と手間の兼ね合いで決める
`;
const p=path.join(ROOT,'REUSE_LIST.md');let s=fs.readFileSync(p,'utf8');const i=s.indexOf('\n## 部位を使い回して組み立てる場合');if(i>=0)s=s.slice(0,i);
const R0=JSON.parse(fs.readFileSync(path.join(ROOT,'motion','reuse.json'),'utf8')).frames,all=Object.values(R0).flatMap(o=>Object.values(o).flat());
fs.writeFileSync(p,s.trimEnd()+'\n'+sec.replace('${NEW}',all.filter(e=>e.use==='new').length).replace('${PART}',all.filter(e=>e.use==='face'||e.use==='head').length));
console.log(`frames ${frames}: ${plain} from existing parts only; ${totalParts} new part pictures (${faces} faces); ${heavy.length} frames with 4+ new parts`);
for(const p of ORDER)if(groups[p])console.log(' ',p,groups[p].length);
