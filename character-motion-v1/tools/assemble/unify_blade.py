"""The blade finder of tools/unify_chatgpt_frames.py (that file reads its arguments on import)."""
import numpy as np
from scipy import ndimage

def blade_of(a, minlen):
    """The longest thin light-grey piece: (length, width, centre, direction, its mask)."""
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]; L = a[..., :3].mean(2)
    m = (L > .6) & (np.abs(r - b) < .1) & (np.abs(r - g) < .08) & (al > .5)
    lab, n = ndimage.label(m); best = None
    for i, sl in enumerate(ndimage.find_objects(lab)):
        comp = lab[sl] == i + 1; ys, xs = np.where(comp)
        if len(xs) < 30: continue
        P = np.c_[xs, ys].astype(float); c = P.mean(0); _, _, vt = np.linalg.svd(P - c, full_matrices=False)
        proj = (P - c) @ vt[0]; wid = np.abs((P - c) @ vt[1])
        Ln = proj.max() - proj.min(); W = np.percentile(wid, 90) * 2 + 1
        if Ln < minlen or Ln / W < 5: continue
        if best is None or Ln > best[0]:
            mk = np.zeros(m.shape, bool); mk[sl] = comp
            best = (Ln, W, c + [sl[1].start, sl[0].start], vt[0], mk)
    return best

