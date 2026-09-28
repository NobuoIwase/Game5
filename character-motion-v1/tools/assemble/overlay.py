"""Draw the (fitted) joints over drawings, for checking by eye.  python3 overlay.py <out.png> <which: global|joints> files..."""
import json, os, sys
import numpy as np
from PIL import ImageDraw
from common import *

def joints_px(f, k, how):
    if how == 'joints':
        J = json.load(open(os.path.join(WORK, 'joints.json')))[k]; return {a: np.array(b[:2]) for a, b in J.items() if a != 'face'}
    sx, sy, tx, ty, _ = json.load(open(os.path.join(WORK, 'global.json')))[k]
    return {j: canvas_to_pose_px(f, v[:2]) * [sx, sy] + [tx, ty] for j, v in f['joints'].items()}

def main():
    out, how, files = sys.argv[1], sys.argv[2], sys.argv[3:]
    F = frames(); tiles = []
    for k in files:
        f = F[k]; d = drawing(f, k); J = joints_px(f, k, how)
        bg = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 255)); bg.alpha_composite(to_img(d)); dr = ImageDraw.Draw(bg)
        for a, b in BONES:
            if a in J and b in J:
                col = (0, 90, 255) if 'right' in a else ((255, 120, 0) if 'left' in a else (0, 160, 0))
                dr.line([tuple(J[a]), tuple(J[b])], fill=col, width=7)
        for j in KEY:
            if j in J: x, y = J[j]; dr.ellipse([x - 9, y - 9, x + 9, y + 9], fill=(255, 0, 0))
        tiles.append(bg.convert('RGB').resize((400, 400)))
    W = 4; S = Image.new('RGB', (W * 402, ((len(tiles) + W - 1) // W) * 402), 'white')
    for i, t in enumerate(tiles): S.paste(t, ((i % W) * 402, (i // W) * 402))
    S.save(out)

if __name__ == '__main__': main()
