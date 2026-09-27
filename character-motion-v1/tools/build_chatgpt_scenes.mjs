// The scene pictures (the ones planned for NovelAI: held, on the floor, face close, small clinging creatures, and the
// heroines' own motions that go with them), set up for ChatGPT (Astra) in the same form as tools/build_chatgpt_draw.mjs:
// Astra draws what it can and lists the frames it leaves out; those stay with NovelAI.
// Mild names and descriptions (tools/nai_scene_ja.mjs CG_*); what holds her is drawn with the look words of nai/words.json.
//   node tools/build_chatgpt_scenes.mjs      (after build_nai_jobs.mjs)
// Output: chatgpt/scenes/jobs.json, pose/<char>__<frame>.png (512x512, the mannequin in her look with the purple lines
//         and masses where she is held), sheet/<batch>.png (numbered, to attach), index.html
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {library as R} from '../motion/restraint.mjs';import {library as S} from '../motion/scenes.mjs';import {library as H} from '../motion/heroines.mjs';
import {run} from './mannequin_svg.mjs';
import {CG_SIT,CG_MOTION,MOTION_JA} from './nai_scene_ja.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'chatgpt','scenes'),POSE=path.join(OUT,'pose'),SHEET=path.join(OUT,'sheet');
const NJ=JSON.parse(fs.readFileSync(path.join(ROOT,'nai','jobs.json'),'utf8'));
const WORDS=JSON.parse(fs.readFileSync(path.join(ROOT,'nai','words.json'),'utf8'));
const DRAW=JSON.parse(fs.readFileSync(path.join(ROOT,'chatgpt','jobs.json'),'utf8'));   // the characters and their first message

/* the words of each frame: its kinds of scene and its motion, from nai/words.json (keys are the request's aliases) */
const aliasOf=k=>CG_SIT[k][0],mid=Object.fromEntries(Object.entries(NJ.answerKeys.motionWords).map(([a,m])=>[m,a]));
const HOLDING=['bound','bound_rock','pinned','pinned_rock','held','kiss','clinger','engulf','wrap'];
const wordsOf=f=>{const holder=[],mood=[];
 for(const s of f.situations){const w=(WORDS.words[aliasOf(s)]||'').trim();if(w)(HOLDING.includes(s)?holder:mood).push(w)}
 const m=(WORDS.motionWords[mid[f.motion]]||'').trim();
 const uniq=a=>{const seen=new Set();return a.join(',').split(',').map(x=>x.trim()).filter(x=>{const k=x.toLowerCase();if(!x||seen.has(k))return false;seen.add(k);return true}).join(', ')};
 return {holder:uniq(holder),more:uniq([m,...mood])}};
const VIEW={front:'正面（こちらを向く）',down_right:'斜め前（体の正面が画面の右手前を向く）',right:'真横（画面の右を向く横顔）',
 up_right:'斜め後ろ（背中が見え、画面の右奥を向く）',back:'後ろ（背中）',up_left:'斜め後ろ（背中が見え、画面の左奥を向く）',
 left:'真横（画面の左を向く横顔）',down_left:'斜め前（体の正面が画面の左手前を向く）'};
/* one square per character that holds all of her frames with a margin (measured on the whole 288 canvas) */
const CROP={aria:[26,41,234],healer:[26,41,234],mage:[0,9,275],scout:[13,35,255]};
const LOOK={aria:null,scout:'scout',mage:'mage',healer:'healer'};
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const head=ph=>(/^[^\x00-\x7f…]\S*/.exec(ph||'')||[''])[0];

/* the frames, for each character that draws them */
const lib={};for(const L of [R(),S(),H()])for(const [m,bd] of Object.entries(L.poses))lib[m]={byDir:bd,meta:L.motions[m]};
for(const d of [POSE,SHEET]){fs.mkdirSync(d,{recursive:true});for(const f of fs.readdirSync(d))fs.unlinkSync(path.join(d,f))}
const frames=[],svgs=[],figCache={};
for(const nf of Object.values(NJ.frames))for(const c of nf.chars){
 const L=lib[nf.motion],F=L.byDir[nf.view],fr=F[nf.frame];
 const k=c+'|'+nf.motion+'|'+nf.view;if(!figCache[k])figCache[k]=run(F.map(x=>({...x,look:LOOK[c]||x.look||null})));
 const J={...(MOTION_JA[nf.motion]||{}),...(CG_MOTION[nf.motion]||{})};
 const id=`${c}__${nf.id}`,w=wordsOf(nf);
 frames.push({id,char:c,motion:nf.motion,view:nf.view,frame:nf.frame,of:F.length,label:(J.label||nf.label).replace(/^(斥候|魔法使い|ヒーラー)：/,''),
  step:head(fr.phase),body:J.body||'',arms:J.arms||'',legs:J.legs||'',held:J.held||'',move:J.move||'',holder:w.holder,more:w.more,
  kinds:nf.situations.map(aliasOf),pose:`pose/${id}.png`,file:`${id}.png`});
 const g=figCache[k][nf.frame].replace(/<ellipse [^>]*fill="#0a0f15"\/>/,'');
 svgs.push([id,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CROP[c].join(" ")} ${CROP[c][2]}" width="512" height="512"><rect x="${CROP[c][0]}" y="${CROP[c][1]}" width="${CROP[c][2]}" height="${CROP[c][2]}" fill="#ffffff"/>${g}</svg>`]);
}
const tmp=path.join(OUT,'.svg');fs.mkdirSync(tmp,{recursive:true});for(const [id,s] of svgs)fs.writeFileSync(path.join(tmp,id+'.svg'),s);
const req=createRequire(import.meta.url),pw=req(execSync('npm root -g').toString().trim()+'/playwright');
const b=await pw.chromium.launch(),pg=await b.newPage({viewport:{width:512,height:512}});
for(const [id] of svgs){await pg.goto('file://'+path.join(tmp,id+'.svg'));await pg.screenshot({path:path.join(POSE,id+'.png')})}
fs.rmSync(tmp,{recursive:true});

/* batches: one motion at a time up to 16 frames, split between directions; short motions of a character go together */
const MAX=16;let batches=[];
{const groups={};for(const f of frames)(groups[f.char+'|'+f.motion]=groups[f.char+'|'+f.motion]||[]).push(f);
 const whole=[],split=[];
 for(const list of Object.values(groups)){
  if(list.length<=MAX/2){whole.push(list);continue}
  const byView=[];for(const f of list){const l=byView[byView.length-1];if(l&&l[0].view===f.view)l.push(f);else byView.push([f])}
  let cur=[];for(const v of byView){if(cur.length&&cur.length+v.length>MAX){split.push(cur);cur=[]}cur=cur.concat(v)}if(cur.length)split.push(cur);
 }
 for(const c of Object.keys(LOOK)){
  batches.push(...split.filter(x=>x[0].char===c));
  const bins=[];for(const l of whole.filter(x=>x[0].char===c)){const bin=bins.find(bb=>bb.length+l.length<=MAX);if(bin)bin.push(...l);else bins.push([...l])}
  batches.push(...bins);
 }}
const cnt={};
for(const bt of batches){const c=bt[0].char;cnt[c]=(cnt[c]||0)+1;bt.name=`${c}__scene${String(cnt[c]).padStart(2,'0')}`;bt.forEach((f,i)=>{f.no=i+1;f.batch=bt.name})}

/* numbered sheets */
{const p2=await b.newPage({viewport:{width:1136,height:800}});
 for(const bt of batches){
  const cells=bt.map(f=>`<div class="c"><div class="n">#${f.no}</div><img src="data:image/png;base64,${fs.readFileSync(path.join(POSE,f.id+'.png')).toString('base64')}"></div>`).join('');
  await p2.setContent(`<html><body style="margin:0;background:#fff;font:bold 22px sans-serif;width:1136px"><style>.c{display:inline-block;position:relative;width:256px;height:256px;margin:6px;border:2px solid #888}.c img{width:256px;height:256px}.n{position:absolute;left:6px;top:4px;color:#c03;font-size:26px}</style><div style="padding:6px">${cells}</div></body></html>`);
  await p2.waitForLoadState('load');
  await p2.screenshot({path:path.join(SHEET,bt.name+'.png'),fullPage:true});
 }}
await b.close();

/* the words to send */
const common=c=>DRAW.characters[c].common.replace('わかったら「OK」とだけ返してください。',
`・今回は、何かに押さえられたり、床に倒れたりする場面の絵です。図の色の付いた線・輪・塊・泡などは、押さえているものの位置です。番号ごとに書く「押さえているものの見た目」で、その位置に一緒に描いてください（図と同じ色では描かない）。
・「言葉」の欄は、見た目や顔・様子の言葉（英語）です。絵に反映してください。
・描けない、または描かない方がよいと判断した番号は、飛ばしてかまいません。飛ばした番号と理由を、最後にまとめて教えてください。

わかったら「OK」とだけ返してください。`);
const ask=bt=>{const titles=[...new Set(bt.map(f=>f.label))];return `${titles.join('／')}：${bt.length}枚
添付のポーズ一覧の番号どおりに、1枚ずつ別の画像で描いてください。決まりは最初の文のとおりです。

${bt.map(f=>`#${f.no} → ${f.file}
　${titles.length>1?f.label+'／':''}向き：${VIEW[f.view]}／${f.of}コマのうち${f.frame+1}コマ目${f.step?'（'+f.step+'）':''}
　体勢：${f.body}／腕：${f.arms}／脚：${f.legs}／動き：${f.move}${f.held&&!/^なし/.test(f.held)?`
　押さえられている所：${f.held}${f.holder?`
　押さえているものの見た目：${f.holder}`:''}`:''}${f.more?`
　言葉：${f.more}`:''}`).join('\n')}`};
for(const bt of batches)bt.ask=ask(bt);

fs.writeFileSync(path.join(OUT,'jobs.json'),JSON.stringify({version:new Date().toISOString().slice(0,10),
 characters:Object.fromEntries(Object.entries(DRAW.characters).map(([k,c])=>[k,{...c,common:common(k)}])),
 batches:batches.map(bt=>({name:bt.name,char:bt[0].char,sheet:`sheet/${bt.name}.png`,frames:bt.map(f=>f.id),ask:bt.ask})),frames},null,1));

/* index.html: the same layout as chatgpt/index.html */
const per={};for(const f of frames)(per[f.char]=per[f.char]||[]).push(f);
let body='';
for(const [c,list] of Object.entries(per)){const C=DRAW.characters[c],bs=batches.filter(bt=>bt[0].char===c);
 body+=`<section id="${c}"><h2>${esc(C.label)} <small>${list.length}コマ・${bs.length}回</small></h2>${C.note?`<p class="warn">${esc(C.note)}</p>`:''}
<h3>最初に1回だけ送る文（見た目の画像を添付）</h3><p>添付する画像：<a href="../../${C.ref}" download>${esc(C.ref.split('/').pop())}</a></p>
<div class="msg"><button class="copy">この文をコピー</button><pre>${esc(common(c))}</pre></div><h3>まとめて送る文（そのポーズ一覧を添付）</h3>`;
 bs.forEach((bt,i)=>{body+=`<details class="motion"><summary>${i+1}. ${esc([...new Set(bt.map(f=>f.label))].join('／'))} <small>${bt.length}枚</small></summary>
<div class="card"><a href="sheet/${bt.name}.png" target="_blank"><img loading="lazy" src="sheet/${bt.name}.png" alt="" width="220"></a><div class="side">
<a href="sheet/${bt.name}.png" download="${bt.name}.png">ポーズ一覧を保存</a>　<button class="copy">文をコピー</button><pre>${esc(bt.ask)}</pre></div></div></details>`});
 body+='</section>';
}
fs.writeFileSync(path.join(OUT,'index.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChatGPT 場面の絵の依頼</title><style>
:root{--bg:#f6f7f9;--fg:#1d232b;--sub:#5a6573;--card:#fff;--line:#d9dee5;--acc:#2f6fb3;--warn:#b3522f}
@media (prefers-color-scheme:dark){:root{--bg:#141a22;--fg:#e6edf3;--sub:#9fb0c0;--card:#1b2330;--line:#3a4658;--acc:#7fb4ea;--warn:#ff9c7a}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 system-ui,sans-serif}main{max-width:980px;margin:0 auto;padding:16px}
h2{margin-top:32px;border-bottom:2px solid var(--acc)}h2 small,summary small{color:var(--sub);font-weight:400;font-size:13px}
.box{background:var(--card);border-left:4px solid var(--acc);padding:8px 12px}.warn{color:var(--warn);font-weight:700}
.msg,.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;margin:8px 0}
pre{white-space:pre-wrap;word-break:break-word;font:14px/1.6 system-ui,sans-serif;margin:6px 0}
.card{display:flex;gap:10px;align-items:flex-start}.card img{flex:0 0 auto;border:1px solid var(--line);border-radius:4px;background:#fff;height:auto}.side{flex:1;min-width:0}
details.motion{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin:6px 0}summary{cursor:pointer;font-weight:700}
button.copy{font:inherit;padding:4px 12px;border-radius:6px;border:1px solid var(--acc);background:transparent;color:var(--acc);cursor:pointer}
nav a{display:inline-block;margin:2px 12px 2px 0}@media (max-width:560px){.card{flex-direction:column}.card img{width:100%}}
</style></head><body><main><h1>ChatGPT 場面の絵の依頼</h1>
<div class="box"><b>リポジトリを触れる Astra に頼むとき</b>：「character-motion-v1/chatgpt/scenes/ASTRA.md を読んで、そのとおりに作業して」と送るだけ（<a href="ASTRA.md">ASTRA.md</a>）。<br>
Astra が飛ばしたコマは、NovelAI で作る（<a href="../../nai/scenes.html">場面の説明</a>）。</div>
<nav>${Object.entries(per).map(([c,l])=>`<a href="#${c}">${esc(DRAW.characters[c].label)}（${batches.filter(bt=>bt[0].char===c).length}回）</a>`).join('')}</nav>${body}</main>
<script>
document.addEventListener('click',async e=>{const b=e.target.closest('button.copy');if(!b)return;const pre=b.parentElement.querySelector('pre');b.dataset.label=b.dataset.label||b.textContent;
 try{await navigator.clipboard.writeText(pre.textContent);b.textContent='コピーしました'}catch(err){const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='選択しました（コピーしてください）'}
 setTimeout(()=>{b.textContent=b.dataset.label},2000)});
</script></body></html>`);
console.log(frames.length,'frames',Object.fromEntries(Object.entries(per).map(([c,l])=>[c,l.length])),'batches',batches.length,Object.fromEntries(Object.keys(per).map(c=>[c,batches.filter(bt=>bt[0].char===c).length])));
