// The whole pictures that ChatGPT draws (everything the plan marks "draw" that NovelAI does not make): Aria's attacks
// and the other heroines' own skills and gestures. For each frame it writes a pose picture (the mannequin, with the
// weapon or staff, blue = her right side, orange = her left) and the words to send, and a page to work through them.
//   node tools/build_chatgpt_draw.mjs      (after build_plan.mjs and build_nai_jobs.mjs)
// Output: chatgpt/jobs.json, chatgpt/pose/<motion>__<view>__<frame>.png (512x512), chatgpt/index.html (the request),
//         chatgpt/upload.html (send the pictures to GitHub from a phone)
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {library as A} from '../motion/attack.mjs';import {library as H} from '../motion/heroines.mjs';
import {run} from './mannequin_svg.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'chatgpt'),POSE=path.join(OUT,'pose');
const PLAN=JSON.parse(fs.readFileSync(path.join(ROOT,'motion','plan.json'),'utf8')).frames;
const NAI=new Set(Object.values(JSON.parse(fs.readFileSync(path.join(ROOT,'nai','jobs.json'),'utf8')).frames).map(f=>f.motion));
const PAGES='https://nobuoiwase.github.io/Game5/character-motion-v1/';

/* the four heroines: what to attach for the look, and what they carry */
const CHARS={
 aria:{label:'アリア（戦士）',look:null,ref:'art/warrior-source.png',sheet:'references/warrior.jpg',
  carry:'右手に剣、左腕に丸い盾（青い模様）。腰に剣の鞘',note:''},
 scout:{label:'斥候（シーフ）',look:'scout',ref:'art/scout-source.png',sheet:'references/scout.jpg',
  carry:'右手にナイフ。大きなバックパック（上に丸めた寝袋）を背負う。大きな狐の耳と尻尾',note:''},
 mage:{label:'魔法使い',look:'mage',ref:'art/witch-source.png',sheet:'references/witch-reference.jpg',
  carry:'右手に紫の宝珠の杖。両腕の肘から先は金属の義腕。大きなとんがり帽子',note:''},
 healer:{label:'ヒーラー',look:'healer',ref:'art/sister-source-v7.png',sheet:'references/sister-reference.jpg',
  carry:'右手に金の十字の杖。長い耳。白い長手袋',
  note:'衣装は胸の前に下がる前垂れの衣装に替える予定（原画の手直し待ち）。衣装が決まるまでは後回しにする'},
};
/* which way she faces: blue is her right side in the pose picture */
const VIEW={
 front:'正面（こちらを向く）',down_right:'斜め前（体の正面が画面の右手前を向く）',right:'真横（画面の右を向く横顔）',
 up_right:'斜め後ろ（背中が見え、画面の右奥を向く）',back:'後ろ（背中）',up_left:'斜め後ろ（背中が見え、画面の左奥を向く）',
 left:'真横（画面の左を向く横顔）',down_left:'斜め前（体の正面が画面の左手前を向く）',
};
const VIEWS=Object.keys(VIEW);
/* one square per character that holds all of her frames (with a margin), so her size stays the same from frame to frame */
const CROP={aria:[6,27,276],scout:[44,58,201],mage:[29,27,230],healer:[16,13,255]};
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const head=ph=>(/^[^\x00-\x7f]\S*/.exec(ph||'')||[''])[0];
const rest=ph=>(ph||'').replace(/^[^\x00-\x7f]\S*\s*/,'').trim();

/* the frames */
fs.mkdirSync(POSE,{recursive:true});for(const f of fs.readdirSync(POSE))fs.unlinkSync(path.join(POSE,f));
const frames=[],svgs=[];
for(const L of [A(),H()])for(const [m,byDir] of Object.entries(L.poses)){
 if(NAI.has(m))continue;
 const meta=L.motions[m],look=meta.look||null,char=look?Object.keys(CHARS).find(k=>CHARS[k].look===look):'aria';
 for(const v of VIEWS){const F=byDir[v],p=PLAN[m]?.[v];if(!F||!p)continue;
  const figs=run(F);
  p.forEach((e,i)=>{if(e.use!=='draw')return;const fr=F[i],id=`${m}__${v}__${i}`;
   frames.push({id,char,motion:m,label:meta.label.replace(/^(斥候|魔法使い|ヒーラー)：/,''),view:v,frame:i,of:F.length,loop:!!meta.loop,
    step:head(fr.phase),detail:rest(fr.phase),pose:`pose/${id}.png`,file:`${char}__${id}.png`});
   const g=figs[i].replace(/<ellipse [^>]*fill="#0a0f15"\/>/,'');   // no ground shadow
   const [x,y,w]=CROP[char];
   svgs.push([id,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${w}" width="512" height="512"><rect x="${x}" y="${y}" width="${w}" height="${w}" fill="#ffffff"/>${g}</svg>`]);
  });
 }
}
const tmp=path.join(OUT,'.svg');fs.mkdirSync(tmp,{recursive:true});for(const [id,s] of svgs)fs.writeFileSync(path.join(tmp,id+'.svg'),s);
const req=createRequire(import.meta.url),pw=req(execSync('npm root -g').toString().trim()+'/playwright');
const b=await pw.chromium.launch(),pg=await b.newPage({viewport:{width:512,height:512}});
for(const [id] of svgs){await pg.goto('file://'+path.join(tmp,id+'.svg'));await pg.screenshot({path:path.join(POSE,id+'.png')})}
await b.close();fs.rmSync(tmp,{recursive:true});

/* the words */
const common=c=>`これから、2Dゲームのキャラクターのアニメーション用の絵を、1コマずつお願いします。

・添付の画像のキャラクター「${CHARS[c].label.replace(/（.*）/,'')}」を、同じ絵柄・同じ頭身（小さめのデフォルメ）・同じ衣装と色で描いてください。
・持ち物と特徴：${CHARS[c].carry}。
・毎回、ポーズの下絵（マネキンの図）を1枚添付します。姿勢・向き・手足と持ち物の位置は、下絵に合わせてください。
・下絵の色の意味：青＝キャラクター本人の右半身、橙＝左半身、灰色＝胴と頭。下絵の線・色・関節の丸は描かないでください。
・1回に1枚。正方形（1024×1024）。全身が入るように上下左右に1割くらいの余白をとり、立っているときの足元は、毎回、画像の下から1割くらいの高さにそろえてください。
・背景は透明（できなければ真っ白の無地）。影・床・効果線・文字・枠は描かないでください。
・動きの途中のコマでも、1枚の絵として自然に見えるように描いてください。

わかったら「OK」とだけ返してください。`;
const ask=f=>`${f.label}（${f.of}コマのうち${f.frame + 1}コマ目${f.step?'：'+f.step:''}）
向き：${VIEW[f.view]}
${f.detail?'このコマ：'+f.detail+'\n':''}添付の下絵のポーズで描いてください。`;
for(const f of frames)f.ask=ask(f);

fs.writeFileSync(path.join(OUT,'jobs.json'),JSON.stringify({version:new Date().toISOString().slice(0,10),characters:Object.fromEntries(Object.entries(CHARS).map(([k,c])=>[k,{label:c.label,ref:c.ref,sheet:c.sheet,note:c.note,common:common(k)}])),
 frames},null,1));

/* chatgpt/index.html: the request, one character at a time */
const per={};for(const f of frames)(per[f.char]=per[f.char]||[]).push(f);
const byMotion=list=>{const o={};for(const f of list)(o[f.motion]=o[f.motion]||[]).push(f);return o};
let body='';
for(const [c,list] of Object.entries(per)){const C=CHARS[c];
 body+=`<section id="${c}"><h2>${esc(C.label)} <small>${list.length}コマ</small></h2>
${C.note?`<p class="warn">${esc(C.note)}</p>`:''}
<h3>最初に1回だけ送る文（見た目の画像を添付）</h3>
<p>添付する画像：<a href="../${C.ref}" download>${esc(C.ref.split('/').pop())}</a>（ゲームの8方向の絵）と、必要なら設定画 <a href="../${C.sheet}" download>${esc(C.sheet.split('/').pop())}</a></p>
<div class="msg"><pre>${esc(common(c))}</pre><button class="copy">この文をコピー</button></div>
<h3>1コマずつ送る文（そのコマのポーズの下絵を添付）</h3>`;
 for(const [m,mf] of Object.entries(byMotion(list))){
  body+=`<details class="motion"><summary>${esc(mf[0].label)} <small>${mf.length}コマ・<code>${m}</code></small></summary>`;
  for(const f of mf)body+=`<div class="card" id="${f.id}"><img loading="lazy" src="${f.pose}" alt="" width="160" height="160"><div class="side"><div class="name">${esc(f.file)}</div><pre>${esc(f.ask)}</pre><button class="copy">文をコピー</button> <a href="${f.pose}" download="${f.id}.png">下絵を保存</a></div></div>`;
  body+='</details>';
 }
 body+='</section>';
}
const toc=Object.entries(per).map(([c,l])=>`<a href="#${c}">${esc(CHARS[c].label)}（${l.length}）</a>`).join('');
fs.writeFileSync(path.join(OUT,'index.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChatGPT 1枚絵の依頼</title><style>
:root{--bg:#f6f7f9;--fg:#1d232b;--sub:#5a6573;--card:#fff;--line:#d9dee5;--acc:#2f6fb3;--warn:#b3522f}
@media (prefers-color-scheme:dark){:root{--bg:#141a22;--fg:#e6edf3;--sub:#9fb0c0;--card:#1b2330;--line:#3a4658;--acc:#7fb4ea;--warn:#ff9c7a}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 system-ui,sans-serif}main{max-width:980px;margin:0 auto;padding:16px}
h2{margin-top:32px;border-bottom:2px solid var(--acc)}h2 small,summary small{color:var(--sub);font-weight:400;font-size:13px}
.box{background:var(--card);border-left:4px solid var(--acc);padding:8px 12px}.warn{color:var(--warn);font-weight:700}
.msg,.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;margin:8px 0}
pre{white-space:pre-wrap;word-break:break-word;font:14px/1.6 system-ui,sans-serif;margin:0 0 6px}
.card{display:flex;gap:10px;align-items:flex-start}.card img{flex:0 0 auto;border:1px solid var(--line);border-radius:4px;background:#fff}
.side{flex:1;min-width:0}.name{font:12px monospace;color:var(--sub);word-break:break-all}
details.motion{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin:6px 0}summary{cursor:pointer;font-weight:700}
button.copy{font:inherit;padding:4px 12px;border-radius:6px;border:1px solid var(--acc);background:transparent;color:var(--acc);cursor:pointer}
nav a{display:inline-block;margin:2px 12px 2px 0}
@media (max-width:560px){.card{flex-direction:column}.card img{width:200px;height:200px}}
</style></head><body><main>
<h1>ChatGPT 1枚絵の依頼</h1>
<div class="box"><b>使い方</b><ol>
<li>キャラクターごとに ChatGPT の新しい会話を始め、「最初に1回だけ送る文」を、そのキャラクターの見た目の画像を添付して送る</li>
<li>「OK」が返ったら、1コマずつ「文をコピー」→ ChatGPT に貼り、そのコマの<b>下絵</b>を添付して送る</li>
<li>できた絵を保存し、<a href="upload.html">送るページ</a>で、そのコマを選んで GitHub へ送る（ファイル名は自動で付く）</li></ol>
<p>絵柄や頭身がずれてきたら、最初の文と見た目の画像をもう一度送る。<br>
攻撃のコマの下絵の白い線は剣、盾は円盤。杖・ナイフも下絵に描いてある。<br>
拘束・床・口づけなどの場面の絵は NovelAI で作る（<a href="../nai/scenes.html">場面の説明</a>）。ここにはない。</p></div>
<nav>${toc}</nav>${body}</main>
<script>
document.addEventListener('click',async e=>{const b=e.target.closest('button.copy');if(!b)return;const pre=b.parentElement.querySelector('pre');
 b.dataset.label=b.dataset.label||b.textContent;
 try{await navigator.clipboard.writeText(pre.textContent);b.textContent='コピーしました'}
 catch(err){const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='選択しました（コピーしてください）'}
 setTimeout(()=>{b.textContent=b.dataset.label},2000)});
</script></body></html>`);
console.log(frames.length,'frames',Object.fromEntries(Object.entries(per).map(([c,l])=>[c,l.length])));
