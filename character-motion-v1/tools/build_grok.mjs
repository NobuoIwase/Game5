// The page for asking Grok for the frames still without a picture: one frame at a time (Grok draws one picture per
// request), with the character's reference pictures and the frame's pose picture to attach, and the words to paste.
//   git fetch origin chatgpt-output && node tools/build_grok.mjs
// Output: grok/index.html, grok/jobs.json
// Which frames: every frame of chatgpt/scenes/jobs.json and chatgpt/jobs.json that is not on the chatgpt-output branch.
// The words are ChatGPT's restrained ones (tools/nai_scene_ja.mjs CG_*, nai/words.json), not NovelAI's.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execSync} from 'node:child_process';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),CG=path.join(ROOT,'chatgpt'),OUT=path.join(ROOT,'grok');
const SC=JSON.parse(fs.readFileSync(path.join(CG,'scenes','jobs.json'),'utf8')),DR=JSON.parse(fs.readFileSync(path.join(CG,'jobs.json'),'utf8'));
const drawn=new Set(execSync('git ls-tree -r --name-only origin/chatgpt-output -- chatgpt/out',{cwd:ROOT}).toString().split('\n').map(x=>x.split('/').pop()).filter(x=>x.endsWith('.png')));
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const VIEW={front:'正面（こちらを向く）',down_right:'斜め前（体の正面が画面の右手前を向く）',right:'真横（画面の右を向く横顔）',
 up_right:'斜め後ろ（背中が見え、画面の右奥を向く）',back:'後ろ（背中）',up_left:'斜め後ろ（背中が見え、画面の左奥を向く）',
 left:'真横（画面の左を向く横顔）',down_left:'斜め前（体の正面が画面の左手前を向く）'};
const CHARS={aria:{label:'アリア（戦士）',sheet:'art/warrior-source.png'},scout:{label:'斥候（シーフ）',sheet:'art/scout-source.png'},
 mage:{label:'魔法使い',sheet:'art/witch-source.png'},healer:{label:'ヒーラー',sheet:'art/healer-source-v8.png'}};
// in the scenes her hands are often held: what she holds is drawn only where the pose picture has it
const FEAT={aria:'腰に剣の鞘（いつも）。剣と丸い盾（青い模様）は、ポーズの図に描いてあるときだけ持つ',
 scout:'大きなバックパック（上に丸めた寝袋）を背負う。大きな狐の耳と尻尾（いつも）。ナイフは、ポーズの図に描いてあるときだけ持つ',
 mage:'両腕の肘から先は金属の義腕。大きなとんがり帽子（いつも）。紫の宝珠の杖は、ポーズの図に描いてあるときだけ持つ',
 healer:'エルフの長い耳。長い黒髪（頭に編み込み）で、いつも目を閉じている。白と金の衣装で、胸の前に細い前垂れが2枚、腰から下は長い前垂れと裾。白い長手袋・白い長靴下・白いブーツ（いつも）。金の十字の杖（輪の中に青い宝珠）は、ポーズの図に描いてあるときだけ持つ'};
const feat=c=>FEAT[c];
// good likenesses to attach as well: the unified ChatGPT frames of her guard / idle, front and side
const SAMPLE={aria:['aria__slash__front__0','aria__slash__right__0'],scout:['scout__scout_knife_combo__front__0','scout__scout_knife_combo__right__0'],
 mage:['mage__mage_bolt__front__0','mage__mage_bolt__right__0'],healer:['healer__healer_pray__front__0','healer__healer_buff__right__0']};

const frames=[];
for(const f of SC.frames)if(!drawn.has(f.file))frames.push({...f,set:'scenes',img:`chatgpt/scenes/${f.pose}`});
for(const f of DR.frames)if(!drawn.has(f.file))frames.push({...f,set:'draw',img:`chatgpt/${f.pose}`});

const ask=f=>{const L=[
 `2Dゲームのキャラクター「${CHARS[f.char].label.replace(/（.*/,'')}」の、アニメーション用の1枚絵を1枚描いてください。`,
 `・添付のキャラクターの画像と同じ人物を、同じ絵柄・同じ頭身（小さめのデフォルメ）・同じ髪型・同じ衣装と色で描く。${feat(f.char)?'持ち物と特徴：'+feat(f.char):''}`,
 `・姿勢・向き・手足の位置は、添付のポーズの図（マネキン）に合わせる。図の色：青＝本人の右半身、橙＝左半身、灰色＝胴と頭。図の線・色・関節の丸は描かない${f.set==='scenes'?'。図の色の付いた線・輪・塊は、押さえているものの位置':''}`,
 `・全身が入る正方形。背景は白一色（できれば透明）。足元の影・床・効果線・文字・枠は描かない`,
 ``,`場面：${f.label}（${f.of}コマのうち${f.frame+1}コマ目${f.step?'・'+f.step:''}）`,`向き：${VIEW[f.view]}`];
 if(f.set==='scenes'){
  L.push(`体勢：${f.body||''}／腕：${f.arms||''}／脚：${f.legs||''}`);
  if(f.move)L.push(`動き：${f.move}`);
  if(f.held)L.push(`押さえられている所：${f.held}`);
  if(f.holder)L.push(`押さえているものの見た目：${f.holder}`);
  if(f.more)L.push(`様子（英語）：${f.more}`);
 }else if(f.detail)L.push(`動き（英語）：${f.detail}`);
 return L.join('\n');};
for(const f of frames)f.ask=ask(f);
// the frame put together from ChatGPT's drawings (tools/assemble/), when there is one: sent as the base picture
const ASM=path.join(ROOT,'assembled');
const base=f=>`2Dゲームのキャラクター「${CHARS[f.char].label.replace(/（.*/,'')}」の、アニメーション用の1枚絵を1枚描いてください。
・添付の「下絵」は、同じキャラクターの絵の部位を切り貼りして、この姿勢に並べたものです。人物・髪型・衣装・色・絵柄・頭身・姿勢・向き・構図はこの下絵のまま変えずに、切り貼りの継ぎ目・ずれ・欠け・はみ出しだけを自然に描き直して、1枚の絵として仕上げてください
・手足の位置は、添付のポーズの図（マネキン）にも合わせる。図の線・色は描かない${f.set==='scenes'?'。図の色の付いた線・輪・塊は、押さえているものの位置':''}
・背景は白一色（できれば透明）。足元の影・床・効果線・文字・枠は描かない

`+f.ask.split('\n\n').slice(1).join('\n\n');
for(const f of frames){const a=path.join(ASM,f.char,f.file.replace('.png','.webp'));if(fs.existsSync(a)){f.asm=`assembled/${f.char}/${f.file.replace('.png','.webp')}`;f.askBase=base(f)}}

fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(path.join(OUT,'jobs.json'),JSON.stringify({version:new Date().toISOString().slice(0,10),drawn:drawn.size,
 frames:frames.map(f=>({file:f.file,char:f.char,motion:f.motion,view:f.view,frame:f.frame,label:f.label,pose:f.img,ask:f.ask,...(f.asm?{base:f.asm,askBase:f.askBase}:{})}))},null,1));

const per={};for(const f of frames)((per[f.char]=per[f.char]||{})[f.motion]=per[f.char][f.motion]||[]).push(f);
let body='';
for(const c of Object.keys(CHARS)){const byM=per[c]||{},n=Object.values(byM).flat().length;
 const refs=[['全身（白背景）',`nai/ref/${c}-body.png`],['顔のアップ',`nai/ref/${c}-face.png`],['8方向の絵',CHARS[c].sheet],
  ...SAMPLE[c].map((s,i)=>[`手本${i+1}（ChatGPT の絵）`,`chatgpt/unified/${c}/${s}.webp`])];
 body+=`<section id="${c}"><h2>${esc(CHARS[c].label)} <small>残り ${n}枚</small></h2>
<h3>キャラクターの画像（毎回1〜2枚添付。まずは全身）</h3><div class="refs">${refs.map(([t,p])=>`<a href="../${p}" download><img loading="lazy" src="../${p}" alt=""><span>${t}</span></a>`).join('')}</div>`;
 for(const [m,list] of Object.entries(byM)){
  body+=`<details class="motion"><summary>${esc(list[0].label)} <small>${list.length}枚</small></summary>`;
  for(const f of list)body+=`<div class="card" data-file="${f.file}"><div class="imgs"><a href="../${f.img}" download="${f.file.replace('.png','')}__pose.png"><img loading="lazy" src="../${f.img}" alt="" width="160" height="160"></a>${f.asm?`<a href="../${f.asm}" download="${f.file.replace('.png','')}__base.webp"><img loading="lazy" class="asm" src="../${f.asm}" alt="" width="160" height="160"></a>`:''}</div><div class="side">
<div class="fn"><label><input type="checkbox" class="done"> できた</label>　<code>${f.file}</code></div>
<button class="copy">文をコピー</button> <a href="../${f.img}" download="${f.file.replace('.png','')}__pose.png">ポーズの図を保存</a><pre>${esc(f.ask)}</pre>${f.asm?`<details><summary>下絵（組み立てた絵）を添付して頼む</summary><button class="copy">下絵つきの文をコピー</button> <a href="../${f.asm}" download="${f.file.replace('.png','')}__base.webp">下絵を保存</a><pre>${esc(f.askBase)}</pre></details>`:''}</div></div>`;
  body+='</details>';
 }
 body+='</section>';
}
fs.writeFileSync(path.join(OUT,'index.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grok に頼む残りの絵</title><style>
:root{--bg:#f6f7f9;--fg:#1d232b;--sub:#5a6573;--card:#fff;--line:#d9dee5;--acc:#2f6fb3;--ok:#2f8f4e}
@media (prefers-color-scheme:dark){:root{--bg:#141a22;--fg:#e6edf3;--sub:#9fb0c0;--card:#1b2330;--line:#3a4658;--acc:#7fb4ea;--ok:#6fcf8e}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 system-ui,sans-serif}main{max-width:980px;margin:0 auto;padding:16px}
h2{margin-top:32px;border-bottom:2px solid var(--acc)}h2 small,summary small{color:var(--sub);font-weight:400;font-size:13px}
.box{background:var(--card);border-left:4px solid var(--acc);padding:8px 12px}
.refs{display:flex;flex-wrap:wrap;gap:8px}.refs a{display:flex;flex-direction:column;align-items:center;width:120px;color:var(--fg);text-decoration:none;font-size:12px}
.refs img{width:120px;height:120px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:4px}
details.motion{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin:6px 0}summary{cursor:pointer;font-weight:700}
.card{display:flex;gap:10px;align-items:flex-start;border-top:1px solid var(--line);padding:8px 0}.card img{flex:0 0 auto;background:#fff;border:1px solid var(--line);border-radius:4px}
.card.ok{opacity:.45}.imgs{display:flex;flex-direction:column;gap:4px}.imgs img.asm{background:#e9edf2}.side{flex:1;min-width:0}.fn code{font-size:12px;word-break:break-all}
pre{white-space:pre-wrap;word-break:break-word;font:13px/1.6 system-ui,sans-serif;margin:6px 0}
button.copy{font:inherit;padding:4px 12px;border-radius:6px;border:1px solid var(--acc);background:transparent;color:var(--acc);cursor:pointer}
nav a{display:inline-block;margin:2px 12px 2px 0}#count{color:var(--ok);font-weight:700}
@media (max-width:560px){.card{flex-direction:column}.card img{width:100%;height:auto}}
</style></head><body><main><h1>Grok に頼む残りの絵</h1>
<div class="box">ChatGPT で描けなかった・頼まなかったコマ <b>${frames.length}枚</b>（ChatGPT の絵 ${drawn.size}枚は除く）。<span id="count"></span><ol>
<li>キャラクターの画像（まず「全身」。似ないときは「顔のアップ」や「手本」も）と、そのコマの「ポーズの図」を Grok に添付する</li>
<li>「文をコピー」で文をコピーして貼り、送る</li>
<li>できた絵を、表示している名前（<code>アリアなら aria__…png</code>）で保存する。背景を透明にできるなら透明に</li>
<li>「できた」に印を付ける（このブラウザにだけ残る）</li></ol>
下に灰色の地の絵があるコマは、ChatGPT の絵の部位を並べ直した「下絵」（<a href="../assembled/index.html">組み立てたコマ</a>）があります。同じ人物のまま姿勢だけ変えてあるので、似ないときは「下絵を添付して頼む」を使ってください。<br>
押さえているものの見た目などの言葉は ChatGPT 用の控えめなものです。足したい言葉は、貼るときに書き足してください。<br>
作り直し：<code>git fetch origin chatgpt-output &amp;&amp; node tools/build_grok.mjs</code></div>
<nav>${Object.keys(CHARS).map(c=>`<a href="#${c}">${esc(CHARS[c].label)}（${Object.values(per[c]||{}).flat().length}）</a>`).join('')}</nav>${body}</main>
<script>
const K='game5.grok.done';let D={};try{D=JSON.parse(localStorage.getItem(K))||{}}catch(e){}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(D))}catch(e){}};
const cnt=()=>{const all=document.querySelectorAll('.card').length,n=document.querySelectorAll('.card.ok').length;document.getElementById('count').textContent=' できた '+n+' / '+all+'枚'};
for(const c of document.querySelectorAll('.card')){const cb=c.querySelector('.done'),f=c.dataset.file;cb.checked=!!D[f];c.classList.toggle('ok',cb.checked);
 cb.addEventListener('change',()=>{if(cb.checked)D[f]=1;else delete D[f];c.classList.toggle('ok',cb.checked);save();cnt()})}
cnt();
document.addEventListener('click',async e=>{const b=e.target.closest('button.copy');if(!b)return;b.dataset.l=b.dataset.l||b.textContent;
 let pre=b.nextElementSibling;while(pre&&pre.tagName!=='PRE')pre=pre.nextElementSibling;
 try{await navigator.clipboard.writeText(pre.textContent);b.textContent='コピーしました'}catch(err){const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='選択しました（コピーしてください）'}
 setTimeout(()=>{b.textContent=b.dataset.l},2000)});
</script></body></html>`);
console.log('frames',frames.length,Object.fromEntries(Object.entries(per).map(([c,m])=>[c,Object.values(m).flat().length])));
