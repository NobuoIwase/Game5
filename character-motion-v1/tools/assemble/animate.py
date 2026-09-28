"""Animations of motions whose key frames ChatGPT drew: the in-between frames are made from the nearest drawn key of
the same motion and direction only (every part from that one drawing, moved a little to the in-between's joints), so
the whole animation is one drawing, one person.
  python3 animate.py <out dir> <char:motion:view> ...
Output: <out>/<char>__<motion>__<view>/<frame>.png, <out>/<char>__<motion>__<view>.webp (animated), <out>/index.html
"""
import json, os, sys
import numpy as np
from common import *
import assemble as A
import cv2

CHAIN_PTS = [('root', 'neck'), ('neck', 'head'), ('neck', 'shoulder_right'), ('shoulder_right', 'elbow_right'), ('elbow_right', 'wrist_right'),
             ('neck', 'shoulder_left'), ('shoulder_left', 'elbow_left'), ('elbow_left', 'wrist_left'), ('root', 'hip_right'),
             ('hip_right', 'knee_right'), ('knee_right', 'ankle_right'), ('root', 'hip_left'), ('hip_left', 'knee_left'), ('knee_left', 'ankle_left')]

UNI = json.load(open(os.path.join(ROOT, 'chatgpt', 'unified', 'report.json')))

def key_norm(lib, k):
    """The key drawing and its joints, scaled about her feet as tools/unify_chatgpt_frames.py does (so her head is the
    same size in every frame)."""
    img = drawing(lib.F[k], k); D = A.V(lib.J[k]); f = (UNI.get(k) or {}).get('resize', 1.0) if (UNI.get(k) or {}).get('done') else 1.0
    if abs(f - 1) < .02: return img, D
    ys, xs = np.nonzero(img[..., 3] > .15); c = np.array([(xs.min() + xs.max()) / 2, ys.max()])
    M = np.array([[f, 0, c[0] - f * c[0]], [0, f, c[1] - f * c[1]]])
    return cv2.warpAffine(img, M, (SIZE, SIZE), flags=cv2.INTER_LINEAR), {j: c + f * (p - c) for j, p in D.items()}

def pose_gap(Ma, Mb):
    ks = ['head', 'neck', 'root'] + [f'{p}_{s}' for p in ('shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle') for s in ('right', 'left')]
    A_ = np.array([Ma[k] for k in ks]) - Ma['root']; B_ = np.array([Mb[k] for k in ks]) - Mb['root']
    return float(np.sqrt(((A_ - B_) ** 2).sum(1)).mean())

def target_joints(D, Mk, Mt, s):
    """The in-between's joints on the key drawing: each bone of the drawing turned as the motion's bone turns between
    the key and the in-between, its length changed as the motion's projected length changes."""
    P = {'root': D['root'] + s * (Mt['root'] - Mk['root'])}
    for a, b in CHAIN_PTS:
        vk, vt, vd = Mk[b] - Mk[a], Mt[b] - Mt[a], D[b] - D[a]
        ang = np.arctan2(vt[1], vt[0]) - np.arctan2(vk[1], vk[0]); c, si = np.cos(ang), np.sin(ang)
        k = np.clip(np.linalg.norm(vt) / max(1e-6, np.linalg.norm(vk)), .6, 1.6)
        P[b] = P[a] + k * np.array([c * vd[0] - si * vd[1], si * vd[0] + c * vd[1]])
    return P

def mls_warp(img, src_pts, dst_pts, alpha=1.6, step=6):
    """Moving least squares (similarity) warp: the picture bent so src_pts go to dst_pts, smoothly (no cuts). Backward:
    for each output pixel, where it comes from (control points swapped), on a coarse grid then remapped."""
    p = np.asarray(dst_pts, float); q = np.asarray(src_pts, float)
    H, W = img.shape[:2]; gy, gx = np.mgrid[0:H + step:step, 0:W + step:step].astype(float); v = np.stack([gx.ravel(), gy.ravel()], 1)
    w = 1 / (((p[None] - v[:, None]) ** 2).sum(2) + 1e-6) ** alpha                     # n x k
    ws = w.sum(1, keepdims=True); ps = (w[..., None] * p[None]).sum(1) / ws; qs = (w[..., None] * q[None]).sum(1) / ws
    ph = p[None] - ps[:, None]; qh = q[None] - qs[:, None]
    mu = (w * (ph ** 2).sum(2)).sum(1)
    a = (w * (ph[..., 0] * qh[..., 0] + ph[..., 1] * qh[..., 1])).sum(1) / mu
    b = (w * (ph[..., 0] * qh[..., 1] - ph[..., 1] * qh[..., 0])).sum(1) / mu
    d = v - ps; out = np.stack([a * d[:, 0] - b * d[:, 1], b * d[:, 0] + a * d[:, 1]], 1) + qs
    mx = cv2.resize(out[:, 0].reshape(gx.shape).astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR)
    my = cv2.resize(out[:, 1].reshape(gx.shape).astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR)
    return cv2.remap(img, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)

def held_tip(img, D, fk, char):
    """Where the drawn sword's tip or staff's head is on the key drawing (or None)."""
    if 'sword_tip' in fk['joints']:
        from unify_blade import blade_of
        bl = blade_of(img, .12 * np.linalg.norm(D['neck'] - D['root']) * 2.2)
        if bl is None: return None
        Ln, Wd, c, v, mk = bl; ends = [c + v * Ln / 2, c - v * Ln / 2]
        return max(ends, key=lambda e: np.linalg.norm(e - D['wrist_right']))
    if 'prop_b' in fk['joints']:
        m = A.staff_mask(A.body_only(img), D, char, fk)
        return None if m is None else A.staff_mask.gem
    return None

def bend(img, D, P, extra=()):
    """Control points: every joint, points along each bone (so bones stay straight and move as one), and along what
    she holds."""
    src, dst = [], []
    for a0, b0, a1, b1 in extra:
        for t in np.linspace(0, 1, 7): src.append(a0 + t * (b0 - a0)); dst.append(a1 + t * (b1 - a1))
    for a, b in CHAIN_PTS:
        for t in np.linspace(0, 1, 5):
            src.append(D[a] + t * (D[b] - D[a])); dst.append(P[a] + t * (P[b] - P[a]))
    # the hand and foot past the wrist / ankle go with it
    for a, b in (('elbow_right', 'wrist_right'), ('elbow_left', 'wrist_left'), ('knee_right', 'ankle_right'), ('knee_left', 'ankle_left')):
        src.append(D[b] + .35 * (D[b] - D[a])); dst.append(P[b] + .35 * (P[b] - P[a]))
    return mls_warp(img, src, dst)

POSES = {}
for p in ('attack', 'heroine', 'restraint', 'scene'):
    d = json.load(open(os.path.join(ROOT, 'motion', f'{p}-poses.json')))
    for m, byv in d['poses'].items(): POSES[m] = (byv, d['motions'][m])
PLAN = json.load(open(os.path.join(ROOT, 'motion', 'plan.json')))['frames']

def frame_entry(char, m, v, i, template):
    fr = POSES[m][0][v][i]
    J = {j: [x['position'][0], x['position'][1], x.get('depth', 0)] for j, x in fr['joints'].items()}
    W = {j: x['world'] for j, x in fr['joints'].items() if 'world' in x}
    return dict(template, motion=m, view=v, frame=i, joints=J, world=W, yaw=fr.get('yaw', template.get('yaw')))

def run(lib, char, m, v, od):
    F = lib.F; plan = PLAN[m][v]; n = len(plan)
    keys = {}
    for k, f in F.items():
        if f['char'] == char and f['motion'] == m and f['view'] == v and k in lib.J: keys[f['frame']] = k
    # drawings of the same pose in another motion ('same' in the plan) are keys too
    for e in plan:
        fr_ = e.get('from') or {}
        if e['use'] == 'same' and e['frame'] not in keys:
            k2 = f"{char}__{fr_.get('motion')}__{fr_.get('view')}__{fr_.get('frame')}.png"
            if k2 in lib.J: keys[e['frame']] = k2
    if not keys: print(m, v, 'no keys'); return None
    tmpl = F[next(iter(keys.values()))]
    name = f'{char}__{m}__{v}'; d = os.path.join(od, name); os.makedirs(d, exist_ok=True)
    frames, info = [], []
    for i in range(n):
        e = plan[i]
        fr_ = e.get('from') or {}
        same = f"{char}__{fr_.get('motion')}__{fr_.get('view')}__{fr_.get('frame')}.png" if e['use'] == 'same' else None
        src = None
        if i in keys:
            img, _ = key_norm(lib, keys[i]); how = 'drawn'
        elif same and same in lib.J:
            img, _ = key_norm(lib, same); how = 'same as ' + same.split('__', 1)[1][:-4]
        else:
            # the nearest key in time (a loop wraps round)
            loop = POSES[m][1].get('loop')
            def dist(k): return min(abs(k - i), n - abs(k - i)) if loop else abs(k - i)
            # of the keys either side, the one posed nearest (a big change bends the drawing too far)
            prev = [k for k in keys if (k < i) or loop]; nxt = [k for k in keys if (k > i) or loop]
            near2 = {min(prev, key=dist) if prev else None, min(nxt, key=dist) if nxt else None} - {None}
            Mi = A.V(frame_entry(char, m, v, i, tmpl)['joints'])
            src = min(near2, key=lambda k: pose_gap(Mi, A.V(F[keys[k]]['joints'])) + 2 * dist(k))
            sk = keys[src]; ft = frame_entry(char, m, v, i, tmpl)
            Mk = A.V(F[sk]['joints']); Mt = A.V(ft['joints']); key_img, D = key_norm(lib, sk); s = lib.fit[sk][0]
            P = target_joints(D, Mk, Mt, s); extra = []
            tj = 'sword_tip' if 'sword_tip' in Mt else 'prop_b' if 'prop_b' in Mt else None
            if tj and tj in Mk:
                tip = held_tip(key_img, D, F[sk], char)
                if tip is not None:
                    vk, vt = Mk[tj] - Mk['wrist_right'], Mt[tj] - Mt['wrist_right']; ang = np.arctan2(vt[1], vt[0]) - np.arctan2(vk[1], vk[0])
                    c, si = np.cos(ang), np.sin(ang); vd = tip - D['wrist_right']
                    extra.append((D['wrist_right'], tip, P['wrist_right'], P['wrist_right'] + np.array([c * vd[0] - si * vd[1], si * vd[0] + c * vd[1]])))
            # a turn too big to bend a drawing through: hold the key as it is
            def turn(a, b):
                vk, vt = Mk[b] - Mk[a], Mt[b] - Mt[a]
                return abs((np.arctan2(vt[1], vt[0]) - np.arctan2(vk[1], vk[0]) + np.pi) % (2 * np.pi) - np.pi)
            big = max(turn(a, b) for a, b in CHAIN_PTS[2:])
            if tj and tj in Mk: big = max(big, turn('wrist_right', tj))
            if big > np.radians(40): img = key_img; how = f'hold {src}'
            else: img = bend(key_img, D, P, extra); how = f'from {src}'
        frames.append((img, keys.get(i) or (keys[src] if src is not None else None))); info.append(how)
    out = []
    for i, (img, k) in enumerate(frames):
        to_img(img).save(os.path.join(d, f'{i:02d}.png')); out.append(img)
    frames = out
    # all frames placed as one strip would be in the game: the same canvas
    ms = [POSES[m][0][v][i].get('frame_ms', 100) for i in range(n)]
    ims = []
    for a in frames:
        bg = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 255)); bg.alpha_composite(to_img(a)); ims.append(bg.convert('RGB').resize((400, 400), Image.LANCZOS))
    ims[0].save(os.path.join(od, name + '.webp'), save_all=True, append_images=ims[1:], duration=[max(60, x) * 2 for x in ms], loop=0, quality=85)
    return name, info, ms

def main():
    od = sys.argv[1]; os.makedirs(od, exist_ok=True); lib = A.Library(*A.load_all()); res = []
    for spec in sys.argv[2:]:
        c, m, v = spec.split(':'); r = run(lib, c, m, v, od)
        if r: res.append(r); print(r[0], r[1], flush=True)
    json.dump(res, open(os.path.join(od, 'anim.json'), 'w'), indent=1)

if __name__ == '__main__': main()
