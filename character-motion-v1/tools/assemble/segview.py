"""The parts of source drawings, coloured, with their joints.  python3 segview.py <out.png> files..."""
import sys, os
from PIL import ImageDraw
from common import *
import assemble as A
COL = np.array([[0, 0, 0], [180, 180, 180], [0, 90, 255], [120, 180, 255], [255, 120, 0], [255, 200, 120], [0, 160, 60], [120, 230, 150], [200, 0, 160], [240, 140, 220]]) / 255
def main():
    out, files = sys.argv[1], sys.argv[2:]; lib = A.Library(*A.load_all()); tiles = []
    for k in files:
        img, D, lab, rad, _ = lib.cut(k); col = COL[np.clip(lab, 0, 9)]
        v = img[..., :3] * .45 + col * .55; v[img[..., 3] < .08] = 1
        im = to_img(np.dstack([v, np.ones(v.shape[:2])])); d = ImageDraw.Draw(im)
        for j, p in D.items():
            okj = lib.ok[k].get(j, False); d.ellipse([p[0] - 10, p[1] - 10, p[0] + 10, p[1] + 10], fill=(0, 200, 0) if okj else (255, 0, 0))
        tiles.append(im.convert('RGB').resize((450, 450)))
    W = 3; S = Image.new('RGB', (W * 452, ((len(tiles) + W - 1) // W) * 452), 'white')
    for i, t in enumerate(tiles): S.paste(t, ((i % W) * 452, (i // W) * 452))
    S.save(out)
if __name__ == '__main__': main()
