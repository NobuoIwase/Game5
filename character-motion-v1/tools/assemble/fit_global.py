"""Step 1: where the mannequin of each drawn frame lies on the drawing.

ChatGPT keeps the pose of the pose picture but not its framing: the figure is bigger and placed by the
"feet a tenth from the bottom" rule. For each drawing, the mannequin silhouette (tools/export_frames.mjs) is moved and
scaled (x and y apart) to overlap the drawing's silhouette best. Output: WORK/global.json {file: [sx, sy, tx, ty, iou]}
mapping 512 mask px -> 1254 drawing px: X = sx * x + tx.
"""
import json, os, sys
import numpy as np
from scipy import ndimage
from common import *

N = 128   # the grid the fit runs on

def fit(dm, mm):
    """dm, mm: boolean masks (N x N) of the drawing and the mannequin (mask space). Best (sx, sy, tx, ty) in N px."""
    ys, xs = np.nonzero(mm); P = np.c_[xs, ys].astype(float)
    D = dm.astype(np.float32); dsum = D.sum(); best = (-1, None)
    # start from the bounding boxes
    dy, dx = np.nonzero(dm)
    for sx in np.arange(.7, 1.75, .05):
        for sy in np.arange(.7, 1.75, .05):
            if not (.8 < sx / sy < 1.25): continue
            # place so the bottoms and centres agree, then search around
            Q = P * [sx, sy]
            bx = (dx.min() + dx.max()) / 2 - (Q[:, 0].min() + Q[:, 0].max()) / 2
            by = dy.max() - Q[:, 1].max()
            for ox in range(-8, 9, 2):
                for oy in range(-8, 9, 2):
                    q = np.round(Q + [bx + ox, by + oy]).astype(int)
                    ok = (q[:, 0] >= 0) & (q[:, 1] >= 0) & (q[:, 0] < N) & (q[:, 1] < N)
                    q = np.unique(q[ok], axis=0)
                    inter = D[q[:, 1], q[:, 0]].sum(); iou = inter / (dsum + len(q) - inter)
                    if iou > best[0]: best = (iou, (sx, sy, bx + ox, by + oy))
    return best

def main():
    F = frames(); out = {}
    todo = [k for k, f in F.items() if os.path.exists(os.path.join(SRC, f['char'], k))]
    if len(sys.argv) > 1: todo = [k for k in todo if any(a in k for a in sys.argv[1:])]
    for k in todo:
        f = F[k]
        d = drawing(f, k); m = mask_of(k)
        dm = np.asarray(to_img(d).resize((N, N), Image.BILINEAR))[..., 3] > 100
        mm = np.asarray(to_img(m).resize((N, N), Image.BILINEAR))[..., 3] > 100
        iou, (sx, sy, tx, ty) = fit(dm, mm)
        # N-grid mask px -> drawing px: mask px (512) * N/512 -> * sx + tx -> * 1254/N
        k1, k2 = N / 512, SIZE / N
        out[k] = [sx * k1 * k2, sy * k1 * k2, tx * k2, ty * k2, round(float(iou), 3)]
        print(k, out[k], flush=True)
    p = os.path.join(WORK, 'global.json'); old = json.load(open(p)) if os.path.exists(p) else {}
    old.update(out); json.dump(old, open(p, 'w'))

if __name__ == '__main__': main()
