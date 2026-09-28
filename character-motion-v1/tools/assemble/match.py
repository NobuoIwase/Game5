"""Step 2: the detected joints under the motion's names, left and right settled, and each heroine's proportions.

COCO points -> joints: shoulders, elbows, wrists, hips, knees, ankles; neck = between the shoulders; root = between the
hips; head = the face points. The detector's left/right can be swapped (arms and legs apart): of the four ways, the
one that best matches the motion joints after a similarity fit is kept.
Proportions: the chibi drawings are not the mannequin's shape. For each bone, the drawn length against the motion's
(after the fit), over the frames where the bone lies flat to the picture, per heroine (median).
Output: WORK/joints.json {file: {joint: [x, y, conf]}}, WORK/fit.json {file: [s, angle, tx, ty, err]},
        WORK/proportions.json {char: {bone: ratio}}
"""
import json, os
import numpy as np
from common import *

COCO = {'shoulder_left': 5, 'shoulder_right': 6, 'elbow_left': 7, 'elbow_right': 8, 'wrist_left': 9, 'wrist_right': 10,
        'hip_left': 11, 'hip_right': 12, 'knee_left': 13, 'knee_right': 14, 'ankle_left': 15, 'ankle_right': 16}
ARM = ['shoulder', 'elbow', 'wrist']; LEG = ['hip', 'knee', 'ankle']
PB = [('shoulder', 'elbow'), ('elbow', 'wrist'), ('hip', 'knee'), ('knee', 'ankle')]

def similarity(A, B, w):
    """Weighted similarity (scale, rotation, translation) taking points A onto B. Returns (s, R, t, err)."""
    w = w / w.sum(); ma = (A * w[:, None]).sum(0); mb = (B * w[:, None]).sum(0)
    a = A - ma; b = B - mb
    C = (b * w[:, None]).T @ a; U, S, Vt = np.linalg.svd(C); D = np.diag([1, np.sign(np.linalg.det(U @ Vt))])
    R = U @ D @ Vt; s = (S * np.diag(D)).sum() / (w * (a ** 2).sum(1)).sum()
    t = mb - s * (R @ ma); err = np.sqrt((w * ((s * (R @ A.T).T + t - B) ** 2).sum(1)).sum())
    return s, R, t, err

def detected(det, swap_arm, swap_leg):
    kp = np.array(det['kp']); sc = np.array(det['score']); J = {}
    for name, i in COCO.items():
        side = name.split('_')[1]; part = name.split('_')[0]
        flip = (swap_arm and part in ARM) or (swap_leg and part in LEG)
        if flip: i = COCO[part + '_' + ('left' if side == 'right' else 'right')]
        J[name] = (kp[i], sc[i])
    return J, kp, sc

def main():
    F = frames(); D = json.load(open(os.path.join(WORK, 'detect.json')))
    joints, fits, ratios = {}, {}, {}
    for k, det in D.items():
        if not det: continue
        f = F[k]; M = {j: np.array(v[:2]) for j, v in f['joints'].items()}
        best = None
        for sa in (0, 1):
            for sl in (0, 1):
                J, kp, sc = detected(det, sa, sl)
                names = list(COCO)
                A = np.array([M[n] for n in names]); B = np.array([J[n][0] for n in names]); w = np.array([J[n][1] for n in names]) + 1e-3
                s, R, t, err = similarity(A, B, w)
                if best is None or err < best[0]: best = (err, sa, sl, s, R, t, J, kp, sc)
        err, sa, sl, s, R, t, J, kp, sc = best
        out = {n: [round(float(v[0][0]), 1), round(float(v[0][1]), 1), round(float(v[1]), 3)] for n, v in J.items()}
        sh = (np.array(out['shoulder_left'][:2]) + np.array(out['shoulder_right'][:2])) / 2
        hp = (np.array(out['hip_left'][:2]) + np.array(out['hip_right'][:2])) / 2
        face = [i for i in range(5) if sc[i] > .3]
        head = kp[face].mean(0) if face else sh + (sh - hp) * .6
        out['neck'] = [round(float(sh[0]), 1), round(float(sh[1]), 1), round(float(min(out['shoulder_left'][2], out['shoulder_right'][2])), 3)]
        out['root'] = [round(float(hp[0]), 1), round(float(hp[1]), 1), round(float(min(out['hip_left'][2], out['hip_right'][2])), 3)]
        out['head'] = [round(float(head[0]), 1), round(float(head[1]), 1), round(float(sc[face].mean()) if face else 0, 3)]
        out['face'] = [[round(float(x), 1) for x in kp[i]] + [round(float(sc[i]), 3)] for i in range(5)]
        joints[k] = out
        ang = float(np.degrees(np.arctan2(R[1, 0], R[0, 0])))
        fits[k] = [round(float(s), 4), round(ang, 2), round(float(t[0]), 1), round(float(t[1]), 1), round(float(err), 1), sa, sl]
        # bones lying flat to the picture: projected length close to the 3D length
        W = {j: np.array(v) for j, v in f['joints'].items()}
        for side in ('left', 'right'):
            for a, b in PB:
                ja, jb = f'{a}_{side}', f'{b}_{side}'
                p2 = np.linalg.norm(M[ja] - M[jb]); d3 = abs(W[ja][2] - W[jb][2])
                if p2 < 1 or d3 / p2 > .35 or min(out[ja][2], out[jb][2]) < .5: continue
                drawn = np.linalg.norm(np.array(out[ja][:2]) - np.array(out[jb][:2]))
                ratios.setdefault(f['char'], {}).setdefault(f'{a}-{b}', []).append(drawn / (s * p2))
    json.dump(joints, open(os.path.join(WORK, 'joints.json'), 'w'))
    json.dump(fits, open(os.path.join(WORK, 'fit.json'), 'w'))
    prop = {c: {b: round(float(np.median(v)), 3) for b, v in r.items()} for c, r in ratios.items()}
    json.dump(prop, open(os.path.join(WORK, 'proportions.json'), 'w'), indent=1)
    print(json.dumps(prop, indent=1))
    e = sorted(v[4] for v in fits.values()); print('fit error median', e[len(e) // 2], 'p90', e[int(len(e) * .9)])

if __name__ == '__main__': main()
