"""Step 4: the assembled frames into the repository, with a page to look through them.

  python3 publish.py <result dir>
Output: assembled/<char>/<frame>.webp (512 px, transparent), assembled/sources.json (which drawings each came from),
        assembled/index.html (pose picture, result, sources; a mark "usable / redo / use as Grok's base" kept in the browser)
"""
import json, os, sys, html
from common import *

OUT = os.path.join(ROOT, 'assembled')

def main():
    rd = sys.argv[1]; src = json.load(open(os.path.join(rd, 'sources.json')))
    G = {f['file']: f for f in json.load(open(os.path.join(ROOT, 'grok', 'jobs.json')))['frames']}
    os.makedirs(OUT, exist_ok=True); rows = {}
    for k in sorted(src):
        p = os.path.join(rd, k)
        if not os.path.exists(p) or k not in G: continue
        f = G[k]; os.makedirs(os.path.join(OUT, f['char']), exist_ok=True)
        im = Image.open(p).convert('RGBA'); bb = im.getbbox()
        im.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, f['char'], k.replace('.png', '.webp')), 'WEBP', quality=88, method=6)
        rows.setdefault(f['char'], {}).setdefault(f['label'], []).append(k)
    json.dump(src, open(os.path.join(OUT, 'sources.json'), 'w'), indent=1)
    CH = {'aria': 'アリア（戦士）', 'scout': '斥候（シーフ）', 'mage': '魔法使い', 'healer': 'ヒーラー'}
    body = ''; n = 0
    for c in CH:
        if c not in rows: continue
        cnt = sum(len(v) for v in rows[c].values()); n += cnt
        body += f'<section id="{c}"><h2>{CH[c]} <small>{cnt}枚</small></h2>'
        for label, ks in rows[c].items():
            body += f'<details class="motion"><summary>{html.escape(label)} <small>{len(ks)}枚</small></summary><div class="grid">'
            for k in ks:
                s = src[k]; srcs = ' / '.join(sorted({v.split("__", 1)[1].replace('.png', '') for v in s.values()}))
                body += (f'<div class="card" data-file="{k}"><div class="pair"><img loading="lazy" src="../{G[k]["pose"]}" alt="">'
                         f'<img loading="lazy" class="res" src="{c}/{k.replace(".png", ".webp")}" alt=""></div>'
                         f'<code>{k}</code><div class="src">元：{html.escape(srcs)}</div>'
                         f'<div class="mark"><label><input type="radio" name="{k}" value="ok"> 使える</label>'
                         f'<label><input type="radio" name="{k}" value="grok"> Grok の下絵に</label>'
                         f'<label><input type="radio" name="{k}" value="ng"> だめ</label></div></div>')
            body += '</div></details>'
        body += '</section>'
    page = f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>組み立てたコマ</title><style>
:root{{--bg:#f6f7f9;--fg:#1d232b;--sub:#5a6573;--card:#fff;--line:#d9dee5;--acc:#2f6fb3}}
@media (prefers-color-scheme:dark){{:root{{--bg:#141a22;--fg:#e6edf3;--sub:#9fb0c0;--card:#1b2330;--line:#3a4658;--acc:#7fb4ea}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 system-ui,sans-serif}}main{{max-width:1100px;margin:0 auto;padding:16px}}
h2{{border-bottom:2px solid var(--acc);margin-top:28px}}small{{color:var(--sub);font-weight:400}}.box{{background:var(--card);border-left:4px solid var(--acc);padding:8px 12px}}
details.motion{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin:6px 0}}summary{{cursor:pointer;font-weight:700}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-top:8px}}
.card{{border:1px solid var(--line);border-radius:6px;padding:6px;font-size:12px}}.pair{{display:flex;gap:4px}}
.pair img{{width:50%;aspect-ratio:1;object-fit:contain;background:#fff;border-radius:4px}}.pair img.res{{background:#e9edf2}}
code{{word-break:break-all}}.src{{color:var(--sub)}}.mark label{{margin-right:8px;white-space:nowrap}}#sum{{font-weight:700}}
</style></head><body><main><h1>組み立てたコマ（ChatGPT の絵から）</h1>
<div class="box">Grok に頼む残りのコマ（<a href="../grok/index.html">grok/index.html</a>）を、ChatGPT が描いた同じキャラクターの絵の部位（胴・頭・髪、上腕・前腕・太もも・すね）を切り出して、モーションの関節に合わせて並べ直したもの。全{n}枚。<br>
左：ポーズの図　右：組み立てた絵（画素は全部 ChatGPT の絵なので、見た目は同じ人物）。<br>
印（このブラウザにだけ残る）：<b>使える</b>＝そのまま使う／<b>Grok の下絵に</b>＝これを Grok に添付して「この絵を整えて」と頼む／<b>だめ</b>＝Grok に一から頼む。<span id="sum"></span><br>
作り直し：<code>tools/assemble/</code>（README.md）</div>
<nav>{" ".join(f'<a href="#{c}">{CH[c]}</a>' for c in CH if c in rows)}</nav>{body}</main>
<script>
const K='game5.assembled.mark';let M={{}};try{{M=JSON.parse(localStorage.getItem(K))||{{}}}}catch(e){{}}
const sum=()=>{{const v=Object.values(M);document.getElementById('sum').textContent=' 使える '+v.filter(x=>x==='ok').length+'・下絵 '+v.filter(x=>x==='grok').length+'・だめ '+v.filter(x=>x==='ng').length}};
for(const r of document.querySelectorAll('.mark input')){{if(M[r.name]===r.value)r.checked=true;r.addEventListener('change',()=>{{M[r.name]=r.value;try{{localStorage.setItem(K,JSON.stringify(M))}}catch(e){{}};sum()}})}}
sum();
</script></body></html>'''
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(page); print('published', n)

if __name__ == '__main__': main()
