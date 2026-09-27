// Round 3 for ChatGPT (Astra), in the same form as before (batches of up to 16 with numbered pose sheets, a page and an
// instruction file):
//   1. the whole pictures ChatGPT left out (chatgpt-output: out/skipped.txt, stopped by its safety check)
//   2. the whole pictures to draw again (the character came out too small)
//   3. the mild scene motions that ChatGPT can likely draw (GPT_OK below); the rest of the scenes stay with NovelAI
//   git fetch origin chatgpt-output && node tools/build_chatgpt_round3.mjs      (after build_chatgpt_draw/scenes)
// Output: chatgpt/round3/jobs.json, sheet/<batch>.png, index.html (ASTRA.md is written by hand)
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),CG=path.join(ROOT,'chatgpt'),OUT=path.join(CG,'round3'),SHEET=path.join(OUT,'sheet');
const D=JSON.parse(fs.readFileSync(path.join(CG,'jobs.json'),'utf8')),S=JSON.parse(fs.readFileSync(path.join(CG,'scenes','jobs.json'),'utf8'));
const git=a=>execSync('git '+a,{cwd:path.join(ROOT,'..')}).toString();

/* the scene motions ChatGPT can likely draw: caught, dazed, falling, getting up, holding the voice, held from behind,
   feet sinking. Held, rocked, stiffening, limp, clinging, coiled, tempting and the front panels stay with NovelAI. */
export const GPT_OK=['ankle_grabbed','scout_tail_grabbed','grabbed_flinch','break_free','gaze_trance','spore_inhale','shiver_hug',
 'bubble_float','daze_sway','reach_toward','edge_pull','trip_fall','defeat_collapse','get_up','sit_recover','kiss_recover',
 'mage_suppress','down_fall_back','held_from_behind','engulf_sink','engulf_struggle'];
/* drawn, but the character came out too small beside her other frames */
const REDO={'aria__thrust__left__4.png':'前に描いた絵は、キャラクターがほかのコマより3割ほど小さかった','aria__yoko__right__6.png':'前に描いた絵は、キャラクターがほかのコマより3割ほど小さかった'};

let skipped=[];try{skipped=git('show origin/chatgpt-output:character-motion-v1/chatgpt/out/skipped.txt').split('\n').map(l=>l.split('\t')[0].trim()).filter(Boolean)}catch(e){}
const byFile=new Map(D.frames.map(f=>[f.file,f]));
const frames=[];
for(const n of skipped){const f=byFile.get(n);if(f)frames.push({...f,pose:f.pose,why:'前回は画像生成の安全判定で止まった'})}
for(const [n,why] of Object.entries(REDO)){const f=byFile.get(n);if(f&&!frames.some(x=>x.file===n))frames.push({...f,why})}
for(const f of S.frames)if(GPT_OK.includes(f.motion))frames.push({...f,pose:'scenes/'+f.pose,scene:true});

const REAR={back:1,up_right:1,up_left:1};
const VIEW={front:'正面（こちらを向く）',down_right:'斜め前（体の正面が画面の右手前を向く）',right:'真横（画面の右を向く横顔）',
 up_right:'斜め後ろ（背中が見え、画面の右奥を向く）',back:'後ろ（背中）',up_left:'斜め後ろ（背中が見え、画面の左奥を向く）',
 left:'真横（画面の左を向く横顔）',down_left:'斜め前（体の正面が画面の左手前を向く）'};
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* batches: the frames to fix first, then one motion at a time up to 16 (split between directions), short motions together */
const MAX=16,batches=[];
for(const c of Object.keys(D.characters)){
 const fix=frames.filter(f=>f.char===c&&f.why);for(let i=0;i<fix.length;i+=MAX)batches.push(fix.slice(i,i+MAX));
 const groups={};for(const f of frames.filter(f=>f.char===c&&!f.why))(groups[f.motion]=groups[f.motion]||[]).push(f);
 const whole=[];
 for(const list of Object.values(groups)){
  if(list.length<=MAX/2){whole.push(list);continue}
  const byView=[];for(const f of list){const l=byView[byView.length-1];if(l&&l[0].view===f.view)l.push(f);else byView.push([f])}
  let cur=[];for(const v of byView){if(cur.length&&cur.length+v.length>MAX){batches.push(cur);cur=[]}cur=cur.concat(v)}if(cur.length)batches.push(cur);
 }
 const bins=[];for(const l of whole){const bin=bins.find(b=>b.length+l.length<=MAX);if(bin)bin.push(...l);else bins.push([...l])}
 batches.push(...bins);
}
const cnt={};
for(const bt of batches){const c=bt[0].char;cnt[c]=(cnt[c]||0)+1;bt.name=`${c}__r3_${String(cnt[c]).padStart(2,'0')}`;bt.forEach((f,i)=>{f.no=i+1;f.batch=bt.name})}

/* numbered sheets */
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
const line=(f,mix)=>{const head=`#${f.no} → ${f.file}
　${mix?f.label+'／':''}向き：${VIEW[f.view]}／${f.of}コマのうち${f.frame+1}コマ目${f.step?'（'+f.step+'）':''}${REAR[f.view]?'【後ろから見た絵】':''}`;
 const why=f.why?`\n　★${f.why}`:'';
 if(!f.scene)return head+why+(f.detail?'\n　'+f.detail:'');
 return head+why+`
　体勢：${f.body}／腕：${f.arms}／脚：${f.legs}／動き：${f.move}${f.held&&!/^なし/.test(f.held)?`
　押さえられている所：${f.held}${f.holder?`
　押さえているものの見た目：${f.holder}`:''}`:''}${f.more?`
　言葉：${f.more}`:''}`};
const title=bt=>[...new Set(bt.map(f=>f.label))].join('／');
const ask=bt=>{const mix=new Set(bt.map(f=>f.motion)).size>1;const fix=bt.some(f=>f.why);return `${fix?'描き直し：':''}${title(bt)}：${bt.length}枚
添付のポーズ一覧の番号どおりに、1枚ずつ別の画像で描いてください。決まりは最初の文のとおりです。
${fix?'★の付いた番号は描き直しです。キャラクターの大きさは、ほかのコマと同じにしてください（剣や杖が長くても体を縮めない。持ち物の先が画像の端に近くてもよいが、切れないように）。前回、安全判定で止まったものは、衣装はそのままに、向きや腕・持ち物・影で肌の出る所が自然に目立たない描き方にしてください。\n':''}${bt.some(f=>REAR[f.view])?'後ろ向き・斜め後ろ向きのコマは、見た目の画像の後ろ向きの絵を参考に。顔はほとんど見えません。\n':''}
${bt.map(f=>line(f,mix)).join('\n')}`};
for(const bt of batches)bt.ask=ask(bt);

fs.writeFileSync(path.join(OUT,'jobs.json'),JSON.stringify({version:new Date().toISOString().slice(0,10),gptOk:GPT_OK,
 characters:S.characters,batches:batches.map(bt=>({name:bt.name,char:bt[0].char,sheet:`sheet/${bt.name}.png`,frames:bt.map(f=>f.id),ask:bt.ask})),frames},null,1));

/* index.html */
const per={};for(const f of frames)(per[f.char]=per[f.char]||[]).push(f);
let body='';
for(const [c,list] of Object.entries(per)){const C=S.characters[c],bs=batches.filter(bt=>bt[0].char===c);
 body+=`<section id="${c}"><h2>${esc(C.label)} <small>${list.length}枚・${bs.length}回</small></h2>
<h3>最初に1回だけ送る文（見た目の画像を添付）</h3><p>添付する画像：<a href="../../${C.ref}" download>${esc(C.ref.split('/').pop())}</a></p>
<div class="msg"><button class="copy">この文をコピー</button><pre>${esc(C.common)}</pre></div><h3>まとめて送る文（そのポーズ一覧を添付）</h3>`;
 bs.forEach((bt,i)=>{body+=`<details class="motion"><summary>${i+1}. ${esc(title(bt))} <small>${bt.length}枚</small></summary>
<div class="card"><a href="sheet/${bt.name}.png" target="_blank"><img loading="lazy" src="sheet/${bt.name}.png" alt="" width="220"></a><div class="side">
<a href="sheet/${bt.name}.png" download="${bt.name}.png">ポーズ一覧を保存</a>　<button class="copy">文をコピー</button><pre>${esc(bt.ask)}</pre></div></div></details>`});
 body+='</section>';
}
fs.writeFileSync(path.join(OUT,'index.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChatGPT 3回目の依頼</title><style>
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
</style></head><body><main><h1>ChatGPT 3回目の依頼</h1>
<div class="box">描けなかった ${frames.filter(f=>f.why&&!REDO[f.file]).length}枚・描き直す ${Object.keys(REDO).length}枚・場面のうち ChatGPT でも描けそうな ${frames.filter(f=>f.scene).length}枚。<br>
<b>リポジトリを触れる Astra に頼むとき</b>：「character-motion-v1/chatgpt/round3/ASTRA.md を読んで、そのとおりに作業して」と送るだけ（<a href="ASTRA.md">ASTRA.md</a>）。</div>
<nav>${Object.entries(per).map(([c,l])=>`<a href="#${c}">${esc(S.characters[c].label)}（${l.length}枚）</a>`).join('')}</nav>${body}</main>
<script>
document.addEventListener('click',async e=>{const b=e.target.closest('button.copy');if(!b)return;const pre=b.parentElement.querySelector('pre');b.dataset.label=b.dataset.label||b.textContent;
 try{await navigator.clipboard.writeText(pre.textContent);b.textContent='コピーしました'}catch(err){const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='選択しました（コピーしてください）'}
 setTimeout(()=>{b.textContent=b.dataset.label},2000)});
</script></body></html>`);
console.log('frames',frames.length,'(skipped',skipped.length,'redo',Object.keys(REDO).length,'scenes',frames.filter(f=>f.scene).length+')',Object.fromEntries(Object.entries(per).map(([c,l])=>[c,l.length])),'batches',batches.length,batches.map(b=>b.name+':'+b.length).join(' '));
