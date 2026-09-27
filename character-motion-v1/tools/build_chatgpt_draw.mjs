// The whole pictures that ChatGPT draws (everything the plan marks "draw" that NovelAI does not make): Aria's attacks
// and the other heroines' own skills and gestures. For each frame it writes a pose picture (the mannequin, with the
// weapon or staff, blue = her right side, orange = her left) and the words to send, and a page to work through them.
//   node tools/build_chatgpt_draw.mjs      (after build_plan.mjs and build_nai_jobs.mjs)
// Output: chatgpt/jobs.json, chatgpt/pose/<motion>__<view>__<frame>.png (512x512), chatgpt/sheet/<char>__<batch>.png (the
//         numbered pose sheet of one batch), chatgpt/index.html (the request, one message per batch of up to 16 frames),
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
 healer:{label:'ヒーラー',look:'healer',ref:'art/healer-source-v8.png',sheet:'references/sister-reference.jpg',
  carry:'右手に金の十字の杖（輪の中に青い宝珠）。エルフの長い耳。長い黒髪（頭に編み込み）で、いつも目を閉じている。白と金の衣装で、胸の前に細い前垂れが2枚下がり、腰から下は長い前垂れと裾。白い長手袋・白い長靴下・白いブーツ',
  note:''},
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

/* batches: one motion at a time, at most 16 frames, split between directions */
const MAX=16,batches=[];
{const groups={};for(const f of frames)(groups[f.char+'|'+f.motion]=groups[f.char+'|'+f.motion]||[]).push(f);
 for(const list of Object.values(groups)){
  const byView=[];for(const f of list){const last=byView[byView.length-1];if(last&&last[0].view===f.view)last.push(f);else byView.push([f])}
  let cur=[];const flush=()=>{if(cur.length)batches.push(cur);cur=[]};
  for(const v of byView){if(cur.length&&cur.length+v.length>MAX)flush();for(let k=0;k<v.length;k+=MAX){if(v.length>MAX){flush();cur=v.slice(k,k+MAX);flush()}else cur=cur.concat(v)}}
  flush();
 }}
// the short motions of one character go together, up to 16 frames a message (a motion that fills its own messages stays alone)
{const whole=bt=>batches.filter(x=>x[0].char===bt[0].char&&x[0].motion===bt[0].motion).length===1;
 const out=[];
 for(const c of Object.keys(CHARS)){const mine=batches.filter(bt=>bt[0].char===c);
  const big=mine.filter(bt=>!whole(bt)||bt.length>MAX/2),small=mine.filter(bt=>whole(bt)&&bt.length<=MAX/2);
  const bins=[];for(const bt of small){const bin=bins.find(b=>b.length+bt.length<=MAX);if(bin)bin.push(...bt);else bins.push([...bt])}
  out.push(...big,...bins)}
 batches.length=0;batches.push(...out)}
const SHEET=path.join(OUT,'sheet');fs.mkdirSync(SHEET,{recursive:true});for(const f of fs.readdirSync(SHEET))fs.unlinkSync(path.join(SHEET,f));
const counter={};let mixN={};
for(const bt of batches){const c=bt[0].char,m=bt[0].motion;bt.motions=[...new Set(bt.map(f=>f.motion))];
 if(bt.motions.length>1){mixN[c]=(mixN[c]||0)+1;bt.name=`${c}__mix${mixN[c]}`;bt.part=''}
 else{counter[c+m]=(counter[c+m]||0)+1;const parts=batches.filter(x=>x[0].char===c&&x[0].motion===m).length;
  bt.name=`${c}__${m}${parts>1?'__'+counter[c+m]:''}`;bt.part=parts>1?`${counter[c+m]}/${parts}`:''}
 bt.forEach((f,i)=>{f.no=i+1;f.batch=bt.name})}

/* the pose sheet of each batch: the frames with their numbers (#1…), 4 to a row */
{const b2=await pw.chromium.launch(),p2=await b2.newPage({viewport:{width:1136,height:800}});
 for(const bt of batches){
  const cells=bt.map(f=>`<div class="c"><div class="n">#${f.no}</div><img src="data:image/png;base64,${fs.readFileSync(path.join(POSE,f.id+'.png')).toString('base64')}"></div>`).join('');
  await p2.setContent(`<html><body style="margin:0;background:#fff;font:bold 22px sans-serif;width:1136px"><style>.c{display:inline-block;position:relative;width:256px;height:256px;margin:6px;border:2px solid #888}.c img{width:256px;height:256px}.n{position:absolute;left:6px;top:4px;color:#c03;font-size:26px}</style><div style="padding:6px">${cells}</div></body></html>`);
  await p2.waitForLoadState('load');
  await p2.screenshot({path:path.join(SHEET,bt.name+'.png'),fullPage:true});
 }
 await b2.close();}

/* the words */
const common=c=>`これから、2Dゲームのキャラクターのアニメーション用の絵を、何枚かずつまとめてお願いします。

・添付の画像のキャラクター「${CHARS[c].label.replace(/（.*）/,'')}」を、同じ絵柄・同じ頭身（小さめのデフォルメ）・同じ衣装と色で描いてください。
・持ち物と特徴：${CHARS[c].carry}。
・毎回、番号つきの「ポーズ一覧」の画像を添付し、番号ごとに向きと動きを書きます。番号1つにつき1枚の別々の画像を描いてください（1枚に並べない）。
・姿勢・向き・手足と持ち物の位置は、ポーズ一覧の図（マネキン）に合わせてください。図の色の意味：青＝キャラクター本人の右半身、橙＝左半身、灰色＝胴と頭。図の線・色・関節の丸・番号は描かないでください。
・1枚ごとに正方形（1024×1024）。全身が入るように上下左右に1割くらいの余白をとり、立っているときの足元は、どの絵も画像の下から1割くらいの高さにそろえてください。キャラクターの大きさも、どの絵でもそろえてください。
・背景は透明（できなければ真っ白の無地）。影・床・効果線・文字・枠は描かないでください。
・ファイル名は、番号ごとに指定する名前にしてください。できれば全部を1つのZIPにまとめてください。
・描いた絵を縮小・減色・切り抜きしないでください（描いたままの PNG）。

わかったら「OK」とだけ返してください。`;
const title=bt=>bt.motions.length>1?[...new Set(bt.map(f=>f.label))].join('／'):bt[0].label+(bt.part?`（${bt.part}）`:'');
const ask=bt=>{const mix=bt.motions.length>1;return `${title(bt)}：${bt.length}枚
添付のポーズ一覧の番号どおりに、1枚ずつ別の画像で描いてください。決まりは最初の文のとおりです。

${bt.map(f=>`#${f.no} → ${f.file}
　${mix?f.label+'／':''}向き：${VIEW[f.view]}／${f.of}コマのうち${f.frame+1}コマ目${f.step?'（'+f.step+'）':''}${f.detail?'\n　'+f.detail:''}`).join('\n')}`};
for(const bt of batches)bt.ask=ask(bt);

fs.writeFileSync(path.join(OUT,'jobs.json'),JSON.stringify({version:new Date().toISOString().slice(0,10),
 characters:Object.fromEntries(Object.entries(CHARS).map(([k,c])=>[k,{label:c.label,ref:c.ref,sheet:c.sheet,note:c.note,common:common(k)}])),
 batches:batches.map(bt=>({name:bt.name,char:bt[0].char,motion:bt[0].motion,sheet:`sheet/${bt.name}.png`,frames:bt.map(f=>f.id),ask:bt.ask})),
 frames},null,1));

/* chatgpt/index.html: the request, one character at a time, one message per batch */
const per={};for(const f of frames)(per[f.char]=per[f.char]||[]).push(f);
let body='';
for(const [c,list] of Object.entries(per)){const C=CHARS[c],bs=batches.filter(bt=>bt[0].char===c);
 body+=`<section id="${c}"><h2>${esc(C.label)} <small>${list.length}コマ・${bs.length}回</small></h2>
${C.note?`<p class="warn">${esc(C.note)}</p>`:''}
<h3>最初に1回だけ送る文（見た目の画像を添付）</h3>
<p>添付する画像：<a href="../${C.ref}" download>${esc(C.ref.split('/').pop())}</a>（ゲームの8方向の絵）と、必要なら設定画 <a href="../${C.sheet}" download>${esc(C.sheet.split('/').pop())}</a></p>
<div class="msg"><pre>${esc(common(c))}</pre><button class="copy">この文をコピー</button></div>
<h3>まとめて送る文（そのポーズ一覧を添付）</h3>`;
 bs.forEach((bt,i)=>{body+=`<details class="motion" id="${bt.name}"><summary>${i+1}. ${esc(title(bt))} <small>${bt.length}枚</small></summary>
<div class="card"><a href="sheet/${bt.name}.png" target="_blank"><img loading="lazy" src="sheet/${bt.name}.png" alt="" width="220"></a><div class="side">
<a href="sheet/${bt.name}.png" download="${bt.name}.png">ポーズ一覧を保存</a>　<button class="copy">文をコピー</button><pre>${esc(bt.ask)}</pre></div></div></details>`});
 body+='</section>';
}
const toc=Object.entries(per).map(([c,l])=>`<a href="#${c}">${esc(CHARS[c].label)}（${batches.filter(bt=>bt[0].char===c).length}回）</a>`).join('');
fs.writeFileSync(path.join(OUT,'index.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChatGPT 1枚絵の依頼</title><style>
:root{--bg:#f6f7f9;--fg:#1d232b;--sub:#5a6573;--card:#fff;--line:#d9dee5;--acc:#2f6fb3;--warn:#b3522f}
@media (prefers-color-scheme:dark){:root{--bg:#141a22;--fg:#e6edf3;--sub:#9fb0c0;--card:#1b2330;--line:#3a4658;--acc:#7fb4ea;--warn:#ff9c7a}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 system-ui,sans-serif}main{max-width:980px;margin:0 auto;padding:16px}
h2{margin-top:32px;border-bottom:2px solid var(--acc)}h2 small,summary small{color:var(--sub);font-weight:400;font-size:13px}
.box{background:var(--card);border-left:4px solid var(--acc);padding:8px 12px}.warn{color:var(--warn);font-weight:700}
.msg,.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;margin:8px 0}
pre{white-space:pre-wrap;word-break:break-word;font:14px/1.6 system-ui,sans-serif;margin:6px 0}
.card{display:flex;gap:10px;align-items:flex-start}.card img{flex:0 0 auto;border:1px solid var(--line);border-radius:4px;background:#fff;height:auto}
.side{flex:1;min-width:0}
details.motion{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin:6px 0}summary{cursor:pointer;font-weight:700}
button.copy{font:inherit;padding:4px 12px;border-radius:6px;border:1px solid var(--acc);background:transparent;color:var(--acc);cursor:pointer}
nav a{display:inline-block;margin:2px 12px 2px 0}
@media (max-width:560px){.card{flex-direction:column}.card img{width:100%}}
</style></head><body><main>
<h1>ChatGPT 1枚絵の依頼</h1>
<div class="box"><b>リポジトリを触れる Astra に頼むとき</b>：「character-motion-v1/chatgpt/ASTRA.md を読んで、そのとおりに作業して」と送るだけ。下の手順は要らない（<a href="ASTRA.md">ASTRA.md</a>）。</div>
<div class="box" style="margin-top:8px"><b>チャットだけで頼むときの使い方</b><ol>
<li>キャラクターごとに ChatGPT の新しい会話を始め、「最初に1回だけ送る文」を、そのキャラクターの見た目の画像を添付して送る</li>
<li>「OK」が返ったら、番号順に「文をコピー」→ ChatGPT に貼り、その<b>ポーズ一覧</b>（番号つきの画像）を添付して送る。1回で最大16枚</li>
<li>できた絵（ZIP か、名前の付いた画像）を、<a href="upload.html">送るページ</a>の「まとめて送る」で選ぶ。ファイル名で、どのコマか自動で決まる</li></ol>
<p>名前が付いていない絵は、送るページでコマを選んでから1枚ずつ送れる。<br>
絵柄や頭身がずれてきたら、最初の文と見た目の画像をもう一度送る。<br>
攻撃の図の白い線は剣、盾は円盤。杖・ナイフも図に描いてある。<br>
拘束・床・口づけなどの場面の絵は NovelAI で作る（<a href="../nai/scenes.html">場面の説明</a>）。ここにはない。</p></div>
<nav>${toc}</nav>${body}</main>
<script>
document.addEventListener('click',async e=>{const b=e.target.closest('button.copy');if(!b)return;const pre=b.parentElement.querySelector('pre');
 b.dataset.label=b.dataset.label||b.textContent;
 try{await navigator.clipboard.writeText(pre.textContent);b.textContent='コピーしました'}
 catch(err){const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='選択しました（コピーしてください）'}
 setTimeout(()=>{b.textContent=b.dataset.label},2000)});
</script></body></html>`);
console.log(frames.length,'frames',Object.fromEntries(Object.entries(per).map(([c,l])=>[c,l.length])),'batches',batches.length,Object.fromEntries(Object.keys(per).map(c=>[c,batches.filter(bt=>bt[0].char===c).length])));
