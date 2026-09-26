// Which frames to draw and which to take from another frame, for the art requests.
//   node tools/build_reuse_list.mjs
// Output: motion/reuse.json and REUSE_LIST.md
// Every frame the requests ask for (attacks in all eight directions; the restrained poses, scenes and joins
// in the direction each is shown in, the unsteady walk in all eight) is compared with the frames before it
// in the same direction. Restraints, clinging creatures, bubbles and the other's head are drawn by the game,
// so only her body and face count:
//   same  her body and face as another frame (within TOL px on the 288 canvas): use that frame as it is
//   face  the same body and head, another expression: that frame with the face redrawn
//   head  the same body, the head turned or tipped differently: that frame with the head redrawn
//   new   a picture of its own
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {library as A,DIRECTIONS} from '../motion/attack.mjs';
import {library as R} from '../motion/restraint.mjs';import {library as S} from '../motion/scenes.mjs';import {library as T} from '../motion/transitions.mjs';import {library as H} from '../motion/heroines.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),TOL=0.5;
const BODY=['root','thorax','neck','hip_left','hip_right','knee_left','knee_right','ankle_left','ankle_right','toe_left','toe_right','shoulder_left','shoulder_right','elbow_left','elbow_right','wrist_left','wrist_right','hand_left','hand_right'],
 HEAD=['head','face','eye_left','eye_right'],SWORD=['sword_tip','guard_a','guard_b','prop_a','prop_b'];
const SETS=[['attack','攻撃',A(),()=>DIRECTIONS,'ATTACK_MOTION_REQUEST.md'],['restraint','拘束された姿勢',R(),(m,x)=>[x.view],'RESTRAINT_MOTION_REQUEST.md'],
 ['scene','床・口づけ・拘束なし・張り付き',S(),(m,x)=>m==='walk_unsteady'?DIRECTIONS:[x.view],'SCENE_MOTION_REQUEST.md'],
 ['heroine','ほかのヒロイン',H(),(m,x)=>x.all8?DIRECTIONS:[x.view],'HEROINE_MOTION_REQUEST.md'],['join','つなぎ',T(),(m,x)=>[x.view],'SCENE_MOTION_REQUEST.md 5章']];
const d=(a,b,ks)=>Math.max(0,...ks.filter(k=>a.joints[k]&&b.joints[k]).map(k=>Math.hypot(a.joints[k].position[0]-b.joints[k].position[0],a.joints[k].position[1]-b.joints[k].position[1])));
const seen=[],out={},ORDER=['same','face','head'];
for(const [kind,,lib,views] of SETS)for(const [m,byDir] of Object.entries(lib.poses))for(const v of views(m,lib.motions[m]))byDir[v].forEach((f,i)=>{
 let hit=null;const armed=kind==='attack'||!!f.prop,look=f.look||'';   // only the same heroine, holding the same thing
 for(const y of seen){if(y.v!==v||y.armed!==armed||y.look!==look)continue;if(d(f,y.f,BODY)>TOL||armed&&d(f,y.f,SWORD)>TOL)continue;
  const t=d(f,y.f,HEAD)>TOL?'head':(f.expr||'')!==(y.f.expr||'')?'face':'same';if(!hit||ORDER.indexOf(t)<ORDER.indexOf(hit.t))hit={y,t};if(t==='same')break}
 const e={kind,motion:m,view:v,frame:i,use:hit?hit.t:'new',...(hit?{from:{motion:hit.y.m,view:v,frame:hit.y.i}}:{})};
 ((out[m]??={})[v]??=[]).push(e);seen.push({m,v,i,f,armed,look});
});
fs.writeFileSync(path.join(ROOT,'motion','reuse.json'),JSON.stringify({notes:{same:'use that frame as it is',face:'that frame with the face redrawn (another expression)',head:'that frame with the head redrawn (turned or tipped)',new:'a picture of its own',
 tolerance:`${TOL}px on the 288 canvas (${TOL*2}px on the 576 frames); restraints, creatures, bubbles and the other's head are the game's to draw and do not count`},frames:out},null,0));
// the list for people
const tot={new:0,same:0,face:0,head:0},lines=[];
const rng=a=>{const s=[...a].sort((x,y)=>x-y),r=[];for(let i=0;i<s.length;i++){let j=i;while(j+1<s.length&&s[j+1]===s[j]+1)j++;r.push(i===j?`${s[i]}`:`${s[i]}〜${s[j]}`);i=j}return r.join(', ')};
for(const [kind,label,lib,views,doc] of SETS){const rows=[],sub={new:0,same:0,face:0,head:0};
 for(const m of Object.keys(lib.poses))for(const v of views(m,lib.motions[m])){const F=out[m][v],c={new:0,same:0,face:0,head:0};F.forEach(e=>{c[e.use]++;sub[e.use]++;tot[e.use]++});
  const refs=F.filter(e=>e.use!=='new').map(e=>`${e.frame}${{same:'＝',face:'＝（顔）',head:'＝（頭）'}[e.use]}${e.from.motion===m?'':e.from.motion+' '}${e.from.frame}`);
  if(kind==='attack'||kind==='scene'&&m==='walk_unsteady'||kind==='heroine'&&lib.motions[m].all8){const vs=views(m,lib.motions[m]);if(v!==vs[0])continue;
   const all=vs.flatMap(w=>out[m][w]),cc={new:0,same:0,face:0,head:0};all.forEach(e=>cc[e.use]++);
   const ref=w=>out[m][w].filter(e=>e.use!=='new').map(e=>`${e.frame}${{same:'＝',face:'＝（顔）',head:'＝（頭）'}[e.use]}${e.from.motion===m?'':e.from.motion+' '}${e.from.frame}`).join('、');
   const rs=vs.map(ref),one=rs.every(r=>r===rs[0]);
   rows.push(`| \`${m}\` | 8方向 | ${all.length} | **${cc.new}** | ${cc.same} | ${cc.face} | ${cc.head} | ${one?(rs[0]?rs[0]+'（8方向とも、同じ方向のコマ）':'―'):vs.map((w,k)=>`${w}：${rs[k]||'―'}`).join('<br>')} |`);continue}
  rows.push(`| \`${m}\` | ${v} | ${F.length} | **${c.new}** | ${c.same} | ${c.face} | ${c.head} | ${refs.length?refs.join('、'):'―'} |`)}
 lines.push(`## ${label}（依頼書：${doc}）\n\n新規 **${sub.new}** コマ・同じ絵 ${sub.same}・顔だけ ${sub.face}・頭だけ ${sub.head}（全${sub.new+sub.same+sub.face+sub.head}コマ）\n\n| id | 向き | コマ | 新規 | 同じ絵 | 顔だけ | 頭だけ | 使い回すコマ（このコマ＝元のコマ） |\n|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`)}
const all=tot.new+tot.same+tot.face+tot.head;
fs.writeFileSync(path.join(ROOT,'REUSE_LIST.md'),`# 使い回しと新規作成の一覧（依頼用）

作成：Claude（\`node tools/build_reuse_list.mjs\` で再生成）。機械が読む版は \`motion/reuse.json\`（コマごとに \`use\` と \`from\`）。

作り方の結論（1枚絵と部位の組み立ての振り分け）は \`PRODUCTION_PLAN.md\`。この一覧はその材料。

## 考え方

依頼するコマを全部並べ、同じ向きの前のコマと比べた。
- **比べるもの**：本人の体と顔だけ。拘束・張り付く生き物・泡・相手の頭・包む塊・輪はゲームが描くので比べない
- **比べる範囲**：攻撃・ほかのヒロインの技は8方向、歩き（\`walk_unsteady\`）も8方向、それ以外は依頼する1方向
- **ヒロインごとに比べる**：同じ姿勢でも、別のヒロインの絵は使い回さない。杖やナイフの位置が違えば別の絵
- **一致の基準**：関節の位置の差が288pxの図で${TOL}px以内（576pxのコマで${TOL*2}px以内）
- **左右反転での使い回しはしない**：左向きと右向きは別の絵として描く（\`exports/manifest.json\` の方針）

| 区分 | 意味 | 依頼のしかた |
|---|---|---|
| **新規** | そのコマだけの絵 | 描く |
| **同じ絵**（＝） | ほかのコマと体も顔も同じ | 描かずに、元のコマをそのまま使う |
| **顔だけ**（＝（顔）） | 体と頭の向きは同じで、表情だけ違う | 元のコマの顔だけ描き替える |
| **頭だけ**（＝（頭）） | 体は同じで、頭の向き・傾きだけ違う | 元のコマの頭だけ描き替える |

表の「使い回すコマ」は「このコマ＝元のコマ」。元が同じモーションならコマ番号だけ、別のモーションなら \`id コマ番号\` と書く。

## 全体

全 **${all}** コマのうち：
- **新規 ${tot.new}**
- 同じ絵 ${tot.same}
- 顔だけ ${tot.face}
- 頭だけ ${tot.head}

描く量は ${tot.new} コマ＋部分描き替え ${tot.face+tot.head} コマ。

**作成済みで依頼しないもの**
- 歩行・走行：\`exports/<character>/walk.png\` / \`run.png\`
- 戦士の部位素材（胴・腕・脚・剣・盾・鞘、8方向）：\`parts/warrior/\`
  - ゲームは今、この部位素材を骨格で動かして攻撃・拘束の仮の絵にしている

${lines.join('\n')}`);
console.log(`wrote REUSE_LIST.md and motion/reuse.json: ${all} frames, new ${tot.new}, same ${tot.same}, face ${tot.face}, head ${tot.head}`);
