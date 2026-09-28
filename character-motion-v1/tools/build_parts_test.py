"""The rest of the trial set (after node tools/build_parts_test.mjs): the drawn key frames of each motion and where
their joints are, a zip to hand to ChatGPT, and the page with the request.
  ASM_WORK=<dir of tools/assemble> ASM_SRC=<chatgpt-output .../chatgpt/out> python3 tools/build_parts_test.py
Output: chatgpt/parts_test/<name>/keys/<frame>.png, <name>/motion.json (with 'keys'), parts_test.zip, index.html
"""
import json, os, sys, zipfile, html
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assemble'))
from common import *
import assemble as A
import animate as AN

OUT = os.path.join(ROOT, 'chatgpt', 'parts_test')
PLAN = json.load(open(os.path.join(ROOT, 'motion', 'plan.json')))['frames']
SC = {f['file']: f for f in json.load(open(os.path.join(ROOT, 'chatgpt', 'scenes', 'jobs.json')))['frames']}
DR = {f['file']: f for f in json.load(open(os.path.join(ROOT, 'chatgpt', 'jobs.json')))['frames']}

def main():
    lib = A.Library(*A.load_all()); names = sorted(d for d in os.listdir(OUT) if os.path.isdir(os.path.join(OUT, d)))
    for name in names:
        mj = json.load(open(os.path.join(OUT, name, 'motion.json'))); c, m, v = name.split('__')
        kd = os.path.join(OUT, name, 'keys'); os.makedirs(kd, exist_ok=True); keys = {}
        for e in PLAN[m][v]:
            i = e['frame']; k = f'{c}__{m}__{v}__{i}.png'
            if e['use'] == 'same':
                fr = e['from']; k = f"{c}__{fr['motion']}__{fr['view']}__{fr['frame']}.png"
            if k not in lib.J: continue
            img, D = AN.key_norm(lib, k); s = 512 / SIZE
            to_img(img).resize((512, 512), Image.LANCZOS).save(os.path.join(kd, f'{i:02d}.png'))
            keys[i] = {j: [round(float(p[0] * s), 1), round(float(p[1] * s), 1)] for j, p in D.items()}
        f0 = SC.get(f'{c}__{m}__{v}__0.png') or next((f for f in list(SC.values()) + list(DR.values()) if f['char'] == c and f['motion'] == m), {})
        mj['label'] = f0.get('label', mj['label']); mj['keys'] = keys
        json.dump(mj, open(os.path.join(OUT, name, 'motion.json'), 'w'), ensure_ascii=False, indent=1)
        print(name, 'frames', len(mj['frames']), 'keys', sorted(keys))
    with zipfile.ZipFile(os.path.join(OUT, 'parts_test.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
        for name in names:
            for root, _, fs in os.walk(os.path.join(OUT, name)):
                for f in fs: p = os.path.join(root, f); z.write(p, os.path.relpath(p, OUT))
        for c in {n.split('__')[0] for n in names}:
            for suf in ('body', 'face'): z.write(os.path.join(ROOT, 'nai', 'ref', f'{c}-{suf}.png'), f'ref/{c}-{suf}.png')
    rows = ''.join(f"<li><b>{html.escape(json.load(open(os.path.join(OUT, n, 'motion.json')))['label'])}</b>　<code>{n}</code>（{len(json.load(open(os.path.join(OUT, n, 'motion.json')))['frames'])}コマ、描いてあるキー {len(json.load(open(os.path.join(OUT, n, 'motion.json')))['keys'])}枚）</li>" for n in names)
    ask = open(os.path.join(OUT, 'ASK.txt'), encoding='utf-8').read()
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChatGPT 部位組み立ての試し</title><style>
:root{{--bg:#f6f7f9;--fg:#1d232b;--card:#fff;--line:#d9dee5;--acc:#2f6fb3}}@media (prefers-color-scheme:dark){{:root{{--bg:#141a22;--fg:#e6edf3;--card:#1b2330;--line:#3a4658;--acc:#7fb4ea}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 system-ui,sans-serif}}main{{max-width:900px;margin:0 auto;padding:16px}}
.box{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin:10px 0}}pre{{white-space:pre-wrap;word-break:break-word;font:14px/1.6 system-ui,sans-serif}}
button{{font:inherit;padding:6px 14px;border-radius:6px;border:1px solid var(--acc);background:transparent;color:var(--acc)}}a.dl{{display:inline-block;padding:6px 14px;border-radius:6px;background:var(--acc);color:#fff;text-decoration:none}}
</style></head><body><main><h1>ChatGPT に部位の組み立てを頼む（試し・5モーション）</h1>
<div class="box"><ol><li><a class="dl" href="parts_test.zip" download>parts_test.zip を保存</a>（ポーズの図・描いてあるキーのコマ・関節の位置・キャラクターの画像）</li>
<li>ChatGPT（コードを実行できるモード）に ZIP を添付し、下の文を貼って送る</li><li>返ってきた ZIP のコマと動く絵を見る</li></ol><ul>{rows}</ul></div>
<div class="box"><button id="c">文をコピー</button><pre id="t">{html.escape(ask)}</pre></div></main>
<script>document.getElementById('c').onclick=async e=>{{try{{await navigator.clipboard.writeText(document.getElementById('t').textContent);e.target.textContent='コピーしました'}}catch(err){{const r=document.createRange();r.selectNodeContents(document.getElementById('t'));getSelection().removeAllRanges();getSelection().addRange(r);e.target.textContent='選択しました'}}}}</script></body></html>''')

if __name__ == '__main__': main()
