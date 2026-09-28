"""Frames of an animation in a row (for checking).  python3 animsheet.py <out.png> <anim dir> name..."""
import os, sys, json
from PIL import ImageDraw
from common import *
od = sys.argv[2]; info = {r[0]: r[1] for r in json.load(open(os.path.join(od, 'anim.json')))}
rows = []
for name in sys.argv[3:]:
    fs = sorted(os.listdir(os.path.join(od, name))); t = Image.new('RGB', (len(fs) * 160, 175), 'white')
    for i, f in enumerate(fs):
        bg = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 255)); bg.alpha_composite(Image.open(os.path.join(od, name, f)).convert('RGBA'))
        t.paste(bg.convert('RGB').resize((160, 160)), (i * 160, 0))
        ImageDraw.Draw(t).text((i * 160 + 2, 161), f[:2] + ' ' + info[name][i][:14], fill=(200, 0, 0) if info[name][i] == 'drawn' else (0, 120, 0) if info[name][i].startswith('hold') else (0, 0, 0))
    rows.append((name, t))
W = max(t.width for _, t in rows); S = Image.new('RGB', (W, 190 * len(rows)), 'white')
for j, (nm, t) in enumerate(rows): S.paste(t, (0, j * 190 + 12)); ImageDraw.Draw(S).text((2, j * 190), nm, fill=0)
S.save(sys.argv[1])
