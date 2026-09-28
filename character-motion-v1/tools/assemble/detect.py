"""Step 1: the joints of every ChatGPT drawing, found by a pose model (RTMPose-x, COCO 17 points, via rtmlib).

The model finds the chibi limbs well; it can mix up left and right in side views, which match.py settles with the
motion data. Output: WORK/detect.json {file: {'kp': [[x, y], ...17], 'score': [...17]}}; drawings on white first.
  pip install rtmlib onnxruntime   (the model files are fetched on first use)
"""
import json, os, sys
import numpy as np
from common import *

def main():
    from rtmlib import Body
    model = Body(mode='performance', backend='onnxruntime', device='cpu')
    F = frames(); p = os.path.join(WORK, 'detect.json'); out = json.load(open(p)) if os.path.exists(p) else {}
    todo = [k for k, f in F.items() if os.path.exists(os.path.join(SRC, f['char'], k)) and k not in out]
    for i, k in enumerate(todo):
        d = drawing(F[k], k); a = d[..., 3:4]
        rgb = ((d[..., :3] * a + (1 - a)) * 255).astype(np.uint8)[..., ::-1].copy()   # BGR
        kp, sc = model(rgb)
        if len(kp) == 0: out[k] = None; continue
        # the heroine: the person whose points lie most on her (not a holder the detector took for someone)
        ys, xs = np.nonzero(a[..., 0] > .5)
        def on_her(j):
            q = np.clip(np.round(kp[j]).astype(int), 0, SIZE - 1); return float((a[q[:, 1], q[:, 0], 0] > .5).mean() * sc[j].mean())
        j = max(range(len(kp)), key=on_her)
        out[k] = {'kp': np.round(kp[j], 1).tolist(), 'score': np.round(sc[j], 3).tolist(), 'people': len(kp)}
        if i % 20 == 0:
            json.dump(out, open(p, 'w')); print(i, len(todo), k, flush=True)
    json.dump(out, open(p, 'w')); print('done', len(out))

if __name__ == '__main__': main()
