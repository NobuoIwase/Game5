// Test: ask ChatGPT to finish a motion by cutting parts out of the drawings it made and fitting them to the motion.
// For each motion: a ZIP with the pose picture of every frame (pose/NN.png), the frames already drawn (keys/NN.png),
// and more drawings of the same heroine and direction to cut parts from (parts/*.png), and a page with the request.
//   git fetch origin chatgpt-output && node tools/build_cutout.mjs
// Output: chatgpt/cutout/<char>__<motion>__<view>.zip, chatgpt/cutout/index.html
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {library as A} from '../motion/attack.mjs';import {library as H} from '../motion/heroines.mjs';
import {library as R} from '../motion/restraint.mjs';import {library as S} from '../motion/scenes.mjs';
import {run} from './mannequin_svg.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'chatgpt','cutout');
const PICK=[['aria','heavy','front'],['scout','scout_sidestep','front'],['mage','mage_barrier','front'],['scout','ankle_grabbed','right'],['aria','held_from_behind','front']];
const LABEL={aria:'アリア（戦士）',scout:'斥候（シーフ）',mage:'魔法使い',healer:'ヒーラー'};
const LOOK={aria:null,scout:'scout',mage:'mage',healer:'healer'};
const CROP={aria:[6,27,276],scout:[13,35,255],mage:[0,9,275],healer:[16,13,255]};
const VIEW={front:'正面',right:'真横（右向き）',down_right:'斜め前',back:'後ろ'};
const lib={};for(const L of [A(),H(),R(),S()])for(const [m,bd] of Object.entries(L.poses))lib[m]={bd,meta:L.motions[m]};
const drawn=execSync('git ls-tree -r --name-only origin/chatgpt-output -- chatgpt/out',{cwd:ROOT}).toString().split('\n').filter(x=>x.endsWith('.png'));
const req=createRequire(import.meta.url),pw=req(execSync('npm root -g').toString().trim()+'/playwright');
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const b=await pw.chromium.launch(),pg=await b.newPage({viewport:{width:512,height:512}});
const rows=[];
for(const [c,m,v] of PICK){
 const F=lib[m].bd[v],name=`${c}__${m}__${v}`,dir=path.join(OUT,'.tmp',name);
 for(const d of ['pose','keys','parts'])fs.mkdirSync(path.join(dir,d),{recursive:true});
 const figs=run(F.map(x=>({...x,look:LOOK[c]||x.look||null})));const [x,y,w]=CROP[c];
 for(let i=0;i<F.length;i++){
  const g=figs[i].replace(/<ellipse [^>]*fill="#0a0f15"\/>/,'');
  await pg.setContent(`<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${w}" width="512" height="512"><rect x="${x}" y="${y}" width="${w}" height="${w}" fill="#fff"/>${g}</svg></body></html>`);
  await pg.screenshot({path:path.join(dir,'pose',String(i).padStart(2,'0')+'.png')});
 }
 const show=f=>execSync(`git show origin/chatgpt-output:character-motion-v1/${f}`,{cwd:ROOT,maxBuffer:1<<26});
 const keys=[];
 for(const f of drawn){const n=path.basename(f);if(!n.startsWith(name+'__'))continue;const i=+n.slice(name.length+2,-4);keys.push(i);fs.writeFileSync(path.join(dir,'keys',String(i).padStart(2,'0')+'.png'),show(f))}
 // parts: other drawings of her in this direction (up to 14, of other motions)
 const others=drawn.filter(f=>{const n=path.basename(f);return n.startsWith(c+'__')&&n.includes(`__${v}__`)&&!n.startsWith(name+'__')}).slice(0,14);
 for(const f of others)fs.writeFileSync(path.join(dir,'parts',path.basename(f)),show(f));
 execSync(`cd "${dir}" && zip -qr "${path.join(OUT,name+'.zip')}" .`);
 fs.copyFileSync(path.join(dir,'pose','00.png'),path.join(OUT,name+'__pose00.png'));
 keys.sort((a,b)=>a-b);
 rows.push({c,m,v,name,n:F.length,keys,label:lib[m].meta.label,ms:F.map(f=>f.frame_ms||100),parts:others.length});
}
await b.close();fs.rmSync(path.join(OUT,'.tmp'),{recursive:true});
const ask=r=>`添付の ZIP（${r.name}.zip）の中身を使って、2Dゲームのキャラクター「${LABEL[r.c].replace(/（.*/,'')}」のアニメーション「${r.label}」（向き：${VIEW[r.v]||r.v}、全${r.n}コマ）を完成させてください。

■ ZIP の中身
・pose/00.png〜${String(r.n-1).padStart(2,'0')}.png：各コマの姿勢の図（マネキン）。青＝本人の右半身、橙＝左半身、灰色＝胴と頭。${r.m==='ankle_grabbed'||r.m==='held_from_behind'?'紫の線や塊は、つかんでいるもの・抱えているものの位置。':''}
・keys/：あなた（ChatGPT）が前に描いた、このアニメーションのコマ（番号＝コマ番号：${r.keys.join('・')}）
・parts/：同じキャラクター・同じ向きの、ほかの絵（${r.parts}枚）

■ やってほしいこと
1. keys/ の絵をそのまま使い、足りないコマ（${[...Array(r.n).keys()].filter(i=>!r.keys.includes(i)).join('・')}）を作る
2. 新しく一から描くのではなく、keys/ と parts/ の絵から、頭・胴・腕・脚・髪・持ち物を切り抜き、pose/ の姿勢の図に合わせて回転・移動・変形して組み合わせる（画像処理のコードを書いて実行してよい）
3. 顔・髪型・衣装・色・大きさは keys/ の絵と同じに保つ（同じ人物に見えることが最優先）
4. 切り抜きの境目（関節・首・肩・腰）に隙間・段差・線の切れ目が出ないよう、つなぎ目は周りに合わせて描き直してよい。${r.m==='ankle_grabbed'||r.m==='held_from_behind'?'つかんでいるもの・抱えているものは、keys/ の絵に描かれているものと同じ見た目で、姿勢の図の紫の位置に置く。':''}
5. 全コマ同じ大きさの正方形（keys/ と同じサイズ）、背景は透明。足元の高さと体の大きさは全コマでそろえる

${r.m==='ankle_grabbed'||r.m==='held_from_behind'?'■ 場面の見た目（ここにあなたの言葉を入れる。空のままなら控えめ版）\n・\n\n':''}■ 返してほしいもの
・${r.name}__00.png〜${r.name}__${String(r.n-1).padStart(2,'0')}.png（全コマ。keys/ の分もそのまま入れる）を1つの ZIP で
・つなげて確かめられる GIF（1コマ ${Math.round(r.ms.reduce((a,b)=>a+b,0)/r.n)}ms 前後）
・作れなかったコマがあれば、その番号と理由`;
const body=rows.map(r=>`<section><h2>${esc(LABEL[r.c])}：${esc(r.label)} <small>${VIEW[r.v]||r.v}・${r.n}コマ・描いてある ${r.keys.length}コマ</small></h2>
<div class="card"><img src="${r.name}__pose00.png" width="120" alt=""><div class="side"><a href="${r.name}.zip" download>ZIP を保存</a>（姿勢の図・描いてあるコマ・部品用の絵）　<button class="copy">文をコピー</button><pre>${esc(ask(r))}</pre></div></div></section>`).join('');
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
fs.writeFileSync(path.join(OUT,'index.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>切り抜きでモーション（試し）</title><style>
:root{--bg:#f6f7f9;--fg:#1d232b;--sub:#5a6573;--card:#fff;--line:#d9dee5;--acc:#2f6fb3}
@media (prefers-color-scheme:dark){:root{--bg:#141a22;--fg:#e6edf3;--sub:#9fb0c0;--card:#1b2330;--line:#3a4658;--acc:#7fb4ea}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 system-ui,sans-serif}main{max-width:900px;margin:0 auto;padding:16px}
h2{font-size:17px;border-bottom:2px solid var(--acc)}small{color:var(--sub);font-weight:400}.box{background:var(--card);border-left:4px solid var(--acc);padding:8px 12px}
.card{display:flex;gap:10px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px}.card img{background:#fff;border-radius:4px}.side{flex:1;min-width:0}
pre{white-space:pre-wrap;word-break:break-word;font:14px/1.6 system-ui,sans-serif}button.copy{font:inherit;padding:4px 12px;border-radius:6px;border:1px solid var(--acc);background:transparent;color:var(--acc)}
@media (max-width:560px){.card{flex-direction:column}}
</style></head><body><main><h1>切り抜きでモーションを完成させる（ChatGPT で試し）</h1>
<div class="box">通常3つ・場面2つ。モーションごとに ZIP を ChatGPT に添付して、文を貼って送る。<br>場面の2つ（足首をつかまれる・後ろから抱えられる）には「場面の見た目」の空欄があります。空のまま送れば控えめ版、あなたの言葉を書き込めば露骨版として比べられます。</div>${body}</main>
<script>document.addEventListener('click',async e=>{const b=e.target.closest('button.copy');if(!b)return;const pre=b.parentElement.querySelector('pre');
try{await navigator.clipboard.writeText(pre.textContent);b.textContent='コピーしました'}catch(err){const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='選択しました'}setTimeout(()=>{b.textContent='文をコピー'},2000)});</script></body></html>`);
console.log(rows.map(r=>r.name+' '+r.n+' keys '+r.keys.join(',')+' parts '+r.parts).join('\n'));
