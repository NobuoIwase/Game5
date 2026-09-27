// Asks again for the whole pictures of chatgpt/jobs.json that are not yet on the chatgpt-output branch (skipped, or
// not done yet), in the same form: batches of up to 16 with a numbered pose sheet, a page and an instruction file.
// The rear views get a note, since those were the ones left out most.
//   git fetch origin chatgpt-output && node tools/build_chatgpt_retry.mjs
// Output: chatgpt/retry/jobs.json, sheet/<batch>.png, index.html (ASTRA.md is written by hand)
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),CG=path.join(ROOT,'chatgpt'),OUT=path.join(CG,'retry'),SHEET=path.join(OUT,'sheet');
const J=JSON.parse(fs.readFileSync(path.join(CG,'jobs.json'),'utf8'));
const done=new Set(execSync('git ls-tree -r --name-only origin/chatgpt-output -- character-motion-v1/chatgpt/out',{cwd:path.join(ROOT,'..')})
 .toString().split('\n').map(x=>x.split('/').pop()).filter(Boolean));
const frames=J.frames.filter(f=>!done.has(f.file)).map(f=>({...f}));
const REAR={back:1,up_right:1,up_left:1};
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const VIEW={front:'正面（こちらを向く）',down_right:'斜め前（体の正面が画面の右手前を向く）',right:'真横（画面の右を向く横顔）',
 up_right:'斜め後ろ（背中が見え、画面の右奥を向く）',back:'後ろ（背中）',up_left:'斜め後ろ（背中が見え、画面の左奥を向く）',
 left:'真横（画面の左を向く横顔）',down_left:'斜め前（体の正面が画面の左手前を向く）'};

/* batches: as in build_chatgpt_draw.mjs */
const MAX=16,batches=[];
{const groups={};for(const f of frames)(groups[f.char+'|'+f.motion]=groups[f.char+'|'+f.motion]||[]).push(f);
 const whole=[],split=[];
 for(const list of Object.values(groups)){
  if(list.length<=MAX/2){whole.push(list);continue}
  const byView=[];for(const f of list){const l=byView[byView.length-1];if(l&&l[0].view===f.view)l.push(f);else byView.push([f])}
  let cur=[];for(const v of byView){if(cur.length&&cur.length+v.length>MAX){split.push(cur);cur=[]}cur=cur.concat(v)}if(cur.length)split.push(cur);
 }
 for(const c of Object.keys(J.characters)){
  batches.push(...split.filter(x=>x[0].char===c));
  const bins=[];for(const l of whole.filter(x=>x[0].char===c)){const bin=bins.find(b=>b.length+l.length<=MAX);if(bin)bin.push(...l);else bins.push([...l])}
  batches.push(...bins);
 }}
const cnt={};
for(const bt of batches){const c=bt[0].char;cnt[c]=(cnt[c]||0)+1;bt.name=`${c}__retry${String(cnt[c]).padStart(2,'0')}`;bt.forEach((f,i)=>{f.no=i+1;f.batch=bt.name})}

/* numbered sheets from the pose pictures */
fs.mkdirSync(SHEET,{recursive:true});for(const f of fs.readdirSync(SHEET))fs.unlinkSync(path.join(SHEET,f));
const req=createRequire(import.meta.url),pw=req(execSync('npm root -g').toString().trim()+'/playwright');
{const b=await pw.chromium.launch(),p=await b.newPage({viewport:{width:1136,height:800}});
 for(const bt of batches){
  const cells=bt.map(f=>`<div class="c"><div class="n">#${f.no}</div><img src="data:image/png;base64,${fs.readFileSync(path.join(CG,f.pose)).toString('base64')}"></div>`).join('');
  await p.setContent(`<html><body style="margin:0;background:#fff;font:bold 22px sans-serif;width:1136px"><style>.c{display:inline-block;position:relative;width:256px;height:256px;margin:6px;border:2px solid #888}.c img{width:256px;height:256px}.n{position:absolute;left:6px;top:4px;color:#c03;font-size:26px}</style><div style="padding:6px">${cells}</div></body></html>`);
  await p.waitForLoadState('load');await p.screenshot({path:path.join(SHEET,bt.name+'.png'),fullPage:true});
 }
 await b.close();}

/* the words */
const title=bt=>[...new Set(bt.map(f=>f.label))].join('／');
const ask=bt=>{const mix=new Set(bt.map(f=>f.motion)).size>1;return `やり直し：${title(bt)}：${bt.length}枚
前に描けなかったコマです。添付のポーズ一覧の番号どおりに、1枚ずつ別の画像で描いてください。決まりは最初の文のとおりです。
${bt.some(f=>REAR[f.view])?'後ろ向き・斜め後ろ向きのコマは、キャラクターの見た目の画像の後ろ向き・斜め後ろ向きの絵を参考にしてください。顔はほとんど見えません。剣・盾・杖は図の位置に描き、体に隠れる部分は隠れたままでかまいません。\n':''}
${bt.map(f=>`#${f.no} → ${f.file}
　${mix?f.label+'／':''}向き：${VIEW[f.view]}／${f.of}コマのうち${f.frame+1}コマ目${f.step?'（'+f.step+'）':''}${REAR[f.view]?'【後ろから見た絵】':''}${f.detail?'\n　'+f.detail:''}`).join('\n')}`};
for(const bt of batches)bt.ask=ask(bt);

fs.writeFileSync(path.join(OUT,'jobs.json'),JSON.stringify({version:new Date().toISOString().slice(0,10),done:done.size,
 characters:J.characters,batches:batches.map(bt=>({name:bt.name,char:bt[0].char,sheet:`sheet/${bt.name}.png`,frames:bt.map(f=>f.id),ask:bt.ask})),frames},null,1));

/* index.html */
const per={};for(const f of frames)(per[f.char]=per[f.char]||[]).push(f);
let body='';
for(const [c,list] of Object.entries(per)){const C=J.characters[c],bs=batches.filter(bt=>bt[0].char===c);
 body+=`<section id="${c}"><h2>${esc(C.label)} <small>${list.length}コマ・${bs.length}回</small></h2>
<h3>最初に1回だけ送る文（見た目の画像を添付）</h3><p>添付する画像：<a href="../../${C.ref}" download>${esc(C.ref.split('/').pop())}</a></p>
<div class="msg"><button class="copy">この文をコピー</button><pre>${esc(C.common)}</pre></div><h3>まとめて送る文（そのポーズ一覧を添付）</h3>`;
 bs.forEach((bt,i)=>{body+=`<details class="motion"><summary>${i+1}. ${esc(title(bt))} <small>${bt.length}枚</small></summary>
<div class="card"><a href="sheet/${bt.name}.png" target="_blank"><img loading="lazy" src="sheet/${bt.name}.png" alt="" width="220"></a><div class="side">
<a href="sheet/${bt.name}.png" download="${bt.name}.png">ポーズ一覧を保存</a>　<button class="copy">文をコピー</button><pre>${esc(bt.ask)}</pre></div></div></details>`});
 body+='</section>';
}
fs.writeFileSync(path.join(OUT,'index.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChatGPT 1枚絵のやり直し</title><style>
:root{--bg:#f6f7f9;--fg:#1d232b;--sub:#5a6573;--card:#fff;--line:#d9dee5;--acc:#2f6fb3}
@media (prefers-color-scheme:dark){:root{--bg:#141a22;--fg:#e6edf3;--sub:#9fb0c0;--card:#1b2330;--line:#3a4658;--acc:#7fb4ea}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 system-ui,sans-serif}main{max-width:980px;margin:0 auto;padding:16px}
h2{margin-top:32px;border-bottom:2px solid var(--acc)}h2 small,summary small{color:var(--sub);font-weight:400;font-size:13px}
.box{background:var(--card);border-left:4px solid var(--acc);padding:8px 12px}
.msg,.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;margin:8px 0}
pre{white-space:pre-wrap;word-break:break-word;font:14px/1.6 system-ui,sans-serif;margin:6px 0}
.card{display:flex;gap:10px;align-items:flex-start}.card img{flex:0 0 auto;border:1px solid var(--line);border-radius:4px;background:#fff;height:auto}.side{flex:1;min-width:0}
details.motion{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin:6px 0}summary{cursor:pointer;font-weight:700}
button.copy{font:inherit;padding:4px 12px;border-radius:6px;border:1px solid var(--acc);background:transparent;color:var(--acc);cursor:pointer}
nav a{display:inline-block;margin:2px 12px 2px 0}@media (max-width:560px){.card{flex-direction:column}.card img{width:100%}}
</style></head><body><main><h1>ChatGPT 1枚絵のやり直し</h1>
<div class="box">1回目で届いていない ${frames.length}枚（届いた ${done.size}枚を除く）。<br>
<b>リポジトリを触れる Astra に頼むとき</b>：「character-motion-v1/chatgpt/retry/ASTRA.md を読んで、そのとおりに作業して」と送るだけ（<a href="ASTRA.md">ASTRA.md</a>）。</div>
<nav>${Object.entries(per).map(([c,l])=>`<a href="#${c}">${esc(J.characters[c].label)}（${l.length}枚）</a>`).join('')}</nav>${body}</main>
<script>
document.addEventListener('click',async e=>{const b=e.target.closest('button.copy');if(!b)return;const pre=b.parentElement.querySelector('pre');b.dataset.label=b.dataset.label||b.textContent;
 try{await navigator.clipboard.writeText(pre.textContent);b.textContent='コピーしました'}catch(err){const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='選択しました（コピーしてください）'}
 setTimeout(()=>{b.textContent=b.dataset.label},2000)});
</script></body></html>`);
console.log('done',done.size,'retry',frames.length,Object.fromEntries(Object.entries(per).map(([c,l])=>[c,l.length])),'batches',batches.length,batches.map(b=>b.name+':'+b.length).join(' '));
