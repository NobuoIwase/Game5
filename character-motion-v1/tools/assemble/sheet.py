"""A sheet for checking: for each target, its pose picture, the source drawing and the result.  python3 sheet.py <out.png> <result dir> files..."""
import os, sys, json
from PIL import ImageDraw
from common import *
G = {f['file']: f for f in json.load(open(os.path.join(ROOT, 'grok', 'jobs.json')))['frames']}
def main():
    out, rd, files = sys.argv[1], sys.argv[2], sys.argv[3:]
    srcs = json.load(open(os.path.join(rd, 'sources.json'))) if os.path.exists(os.path.join(rd, 'sources.json')) else {}
    tiles = []
    for k in files:
        if not os.path.exists(os.path.join(rd, k)): continue
        row = []
        pose = Image.open(os.path.join(ROOT, G[k]['pose'])).convert('RGB').resize((300, 300)) if k in G else Image.new('RGB', (300, 300), 'white')
        row.append(pose)
        s = srcs.get(k); F = frames()
        if isinstance(s, dict): s = s.get('core')
        for p in ([os.path.join(SRC, F[s]['char'], s)] if s else []) + [os.path.join(rd, k)]:
            bg = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 255)); bg.alpha_composite(Image.open(p).convert('RGBA').resize((SIZE, SIZE)))
            row.append(bg.convert('RGB').resize((300, 300)))
        t = Image.new('RGB', (len(row) * 302, 316), 'white')
        for i, r in enumerate(row): t.paste(r, (i * 302, 0))
        ImageDraw.Draw(t).text((4, 302), k + ('  <- ' + s if s else ''), fill=(0, 0, 0)); tiles.append(t)
    W = max(t.width for t in tiles); S = Image.new('RGB', (W, 316 * len(tiles)), 'white')
    for i, t in enumerate(tiles): S.paste(t, (0, i * 316))
    S.save(out)
if __name__ == '__main__': main()
