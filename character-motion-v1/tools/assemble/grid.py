"""Results in a grid, small: pose picture over result, for looking at many at once.  python3 grid.py <out.png> <result dir> [filter]"""
import os, sys, json
from PIL import ImageDraw
from common import *
G = {f['file']: f for f in json.load(open(os.path.join(ROOT, 'grok', 'jobs.json')))['frames']}
def main():
    out, rd = sys.argv[1], sys.argv[2]; flt = sys.argv[3] if len(sys.argv) > 3 else ''
    files = sorted(f for f in os.listdir(rd) if f.endswith('.png') and flt in f); tiles = []
    for k in files:
        t = Image.new('RGB', (200, 330), 'white')
        if k in G: t.paste(Image.open(os.path.join(ROOT, G[k]['pose'])).convert('RGB').resize((120, 120)), (40, 0))
        bg = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 255)); bg.alpha_composite(Image.open(os.path.join(rd, k)).convert('RGBA'))
        t.paste(bg.convert('RGB').resize((200, 200)), (0, 118)); ImageDraw.Draw(t).text((2, 318), k.split('__', 1)[1][:32], fill=0); tiles.append(t)
    W = 8; S = Image.new('RGB', (W * 202, ((len(tiles) + W - 1) // W) * 332), (230, 230, 230))
    for i, t in enumerate(tiles): S.paste(t, ((i % W) * 202, (i // W) * 332))
    S.save(out); print(len(tiles))
if __name__ == '__main__': main()
