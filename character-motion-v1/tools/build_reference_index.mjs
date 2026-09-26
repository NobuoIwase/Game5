// Builds references/index.html: every attack, restrained-pose and scene motion on one page, animated,
// with links to the frame sheets and the key-frame pages.
//   node tools/build_reference_index.mjs   (after render_attack_svg.mjs / render_restraint_svg.mjs / render_scene_svg.mjs)
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {library as attackLib} from '../motion/attack.mjs';
import {library as restraintLib} from '../motion/restraint.mjs';
import {library as sceneLib} from '../motion/scenes.mjs';
import {library as joinLib} from '../motion/transitions.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'references','index.html');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const VIEW={front:'正面',up_right:'斜め後ろ',back:'後ろ',right:'真横',down_right:'斜め前'};
function cards(lib,dir,kind){
 return Object.entries(lib.motions).map(([id,m])=>{
  const n=m.frame_ms.length,tot=m.frame_ms.reduce((a,b)=>a+b,0),keys=kind==='attack'?['right','down_right']:kind==='scene'?(m.view==='front'?['front','right']:[m.view,m.view==='right'?'down_right':'right']):(m.view==='front'?['front','right']:['up_right','back','right']);
  const hit=m.hit_frame!=null?` · 命中 ${m.hit_frame}コマ目`:'';
  return `<article class="card" data-kind="${kind}"><h3>${esc(m.label)}</h3><p class="meta"><code>${id}</code> · ${n}コマ · ${tot}ms · ${m.loop?'ループ':'1回'}${hit}${m.view?` · 向き：${VIEW[m.view]||m.view}`:''}</p>
<a href="${dir}/${id}_preview.svg" target="_blank"><img loading="lazy" src="${dir}/${id}_preview.svg" alt="${esc(m.label)}"></a>
<p class="links"><a href="${dir}/${id}_sheet.svg" target="_blank">全方向×全コマ</a>${keys.map(k=>`<a href="${dir}/${id}_keys_${k}.svg" target="_blank">要所（${VIEW[k]}）</a>`).join('')}</p></article>`}).join('\n');
}
const a=attackLib(),r=restraintLib(),sc=sceneLib(),tj=joinLib();
const joinCards=()=>Object.entries(tj.motions).map(([id,m])=>`<article class="card" data-kind="join"><h3>${esc(m.label)}</h3><p class="meta"><code>${id}</code> · つなぎ${m.frame_ms.length}コマ · 両端のずれ ${m.gap}px</p>
<a href="transition-v1/${id}_preview.svg" target="_blank"><img loading="lazy" src="transition-v1/${id}_preview.svg" alt="${esc(m.label)}"></a>
<p class="links"><a href="transition-v1/${id}_keys_${m.view}.svg" target="_blank">前後を含めた全コマ（${VIEW[m.view]||m.view}）</a></p></article>`).join('\n');
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Game5 モーション参考資料</title>
<style>
:root{--bg:#f4f1ea;--card:#fffdf8;--ink:#23252c;--sub:#6b6f7a;--line:#d8d2c4;--acc:#7b3fa0}
@media (prefers-color-scheme:dark){:root{--bg:#17181c;--card:#202127;--ink:#e8e6e1;--sub:#a3a6ae;--line:#34363e;--acc:#c79be6}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif}
header{padding:20px 16px 8px;max-width:1280px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}header p{margin:0;color:var(--sub);font-size:13px}
nav{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:8px 16px;z-index:2}
nav .in{max-width:1280px;margin:0 auto;display:flex;gap:8px;flex-wrap:wrap}
nav button{font:inherit;font-size:13px;padding:5px 12px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer}
nav button[aria-pressed=true]{background:var(--acc);border-color:var(--acc);color:#fff}
main{max-width:1280px;margin:0 auto;padding:8px 16px 40px}h2{font-size:17px;margin:24px 0 10px;border-left:4px solid var(--acc);padding-left:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,560px),1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px}
.card h3{margin:0;font-size:15px}.meta{margin:2px 0 8px;color:var(--sub);font-size:12px}.meta code{font-size:11px}
.card img{display:block;width:100%;height:auto;border-radius:6px;background:#f4f1ea}
.links{margin:8px 0 0;display:flex;gap:6px;flex-wrap:wrap}.links a{font-size:12px;color:var(--acc);text-decoration:none;border:1px solid var(--line);border-radius:6px;padding:2px 8px}
.hide{display:none}
</style></head><body>
<header><h1>Game5 モーション参考資料</h1><p>骨格から描いたマネキン図（青＝本人の右半身、橙＝左半身、紫＝拘束・相手の頭（点線の円）、桃色＝体に張り付く小さな生き物）。図をタップすると大きく開きます。依頼書：<a href="https://github.com/NobuoIwase/Game5/blob/main/character-motion-v1/ATTACK_MOTION_REQUEST.md">攻撃</a> · <a href="https://github.com/NobuoIwase/Game5/blob/main/character-motion-v1/RESTRAINT_MOTION_REQUEST.md">拘束された姿勢</a> · <a href="https://github.com/NobuoIwase/Game5/blob/main/character-motion-v1/SCENE_MOTION_REQUEST.md">床・口づけ・拘束なし・張り付き</a></p></header>
<nav><div class="in"><button data-f="all" aria-pressed="true">すべて</button><button data-f="attack" aria-pressed="false">攻撃（${Object.keys(a.motions).length}）</button><button data-f="restraint" aria-pressed="false">拘束された姿勢（${Object.keys(r.motions).length}）</button><button data-f="scene" aria-pressed="false">床・口づけ・拘束なし・張り付き（${Object.keys(sc.motions).length}）</button><button data-f="join" aria-pressed="false">つなぎ（${Object.keys(tj.motions).length}）</button></div></nav>
<main>
<section data-kind="attack"><h2>攻撃</h2><div class="grid">${cards(a,'attack-v1','attack')}</div></section>
<section data-kind="restraint"><h2>拘束された姿勢</h2><div class="grid">${cards(r,'restraint-v1','restraint')}</div></section>
<section data-kind="scene"><h2>床・口づけ・拘束なし・張り付き</h2><div class="grid">${cards(sc,'scene-v1','scene')}</div></section>
<section data-kind="join"><h2>つなぎ（モーションとモーションの間）</h2><p class="meta">前のモーションの終わり → つなぎ → 次のモーションの始まり、を続けて再生しています。ループするモーションには0コマ目で入り、0コマ目で抜けます。</p><div class="grid">${joinCards()}</div></section>
</main>
<script>
const bs=[...document.querySelectorAll('nav button')];
bs.forEach(b=>b.onclick=()=>{bs.forEach(x=>x.setAttribute('aria-pressed',x===b));const f=b.dataset.f;document.querySelectorAll('section').forEach(s=>s.classList.toggle('hide',f!=='all'&&s.dataset.kind!==f))});
</script></body></html>`;
fs.writeFileSync(OUT,html);
console.log('wrote',path.relative(ROOT,OUT));
