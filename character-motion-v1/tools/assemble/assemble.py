"""Step 3: a missing frame put together from the ChatGPT drawings of the same heroine and direction.

The core (torso, head, hair, clothes) comes from the drawing whose body is posed most like the target (spine, head,
shoulders, hips) and whose limbs hide the least of it; each arm and leg comes from the drawing where that limb is bent
and turned most like the target's and was found reliably. Every piece is cut by its bone (a capsule as wide as her
build allows), turned and drawn out along the bone so its joints land on the target's, scaled to the core's drawing,
and laid back to front by the target's depth. The core's holes where its own limbs lay over it are filled from around.
  python3 assemble.py <target file> ... [--out DIR]
"""
import json, os, sys
import numpy as np, cv2
from scipy import ndimage
from common import *

LIMBS = {'uarm_r': ('shoulder_right', 'elbow_right'), 'farm_r': ('elbow_right', 'wrist_right'),
         'uarm_l': ('shoulder_left', 'elbow_left'), 'farm_l': ('elbow_left', 'wrist_left'),
         'thigh_r': ('hip_right', 'knee_right'), 'shin_r': ('knee_right', 'ankle_right'),
         'thigh_l': ('hip_left', 'knee_left'), 'shin_l': ('knee_left', 'ankle_left')}
CHAINS = {'arm_r': ('neck', 'shoulder_right', 'elbow_right', 'wrist_right', ['uarm_r', 'farm_r']),
          'arm_l': ('neck', 'shoulder_left', 'elbow_left', 'wrist_left', ['uarm_l', 'farm_l']),
          'leg_r': ('root', 'hip_right', 'knee_right', 'ankle_right', ['thigh_r', 'shin_r']),
          'leg_l': ('root', 'hip_left', 'knee_left', 'ankle_left', ['thigh_l', 'shin_l'])}
RADIUS = {'uarm': .17, 'farm': .17, 'thigh': .25, 'shin': .2}   # x the neck-root length
EXT = {'farm_r': .45, 'farm_l': .45, 'shin_r': .35, 'shin_l': .35}   # hand / foot past the end joint (x bone length)
PROP = {'elbow': 'shoulder-elbow', 'wrist': 'elbow-wrist', 'knee': 'hip-knee', 'ankle': 'knee-ankle'}
GROUND = 242
# her hair colours (as tools/unify_chatgpt_frames.py): the long hair below the neck lies behind her body and arms
HAIR = {'aria': ['e38c64', 'bf7054', 'd07850'], 'scout': ['fac69f', 'e3a892', 'f0b890'], 'mage': ['aa82d9', 'dbbceb', 'c3a0e6', '9470c8'],
        'healer': ['4d4b53', '685e61', '28262c', '3a383f']}
def hexc(h): return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255
# the staff (mage, healer): found by its gem (as tools/unify_chatgpt_frames.py) and the right hand it is held in
GEM = {'mage': lambda r, g, b: (r > .42) & (b > .38) & (g < .25) & (r - g > .3),
       'healer': lambda r, g, b: (b > .47) & (b - r > .24) & (b - g > .12)}
HEAD_R = {'mage': .42, 'healer': .45}      # the staff head's radius, x the neck-root length

def staff_mask(img, D, char, f):
    """The staff in drawing img (bool mask), or None. Its shaft is the longest straight line of the drawing's outline
    that runs out of a gem (Hough lines on the edges); its head is round that gem, in the head's own colours."""
    if char not in GEM: return None
    r, g, b = img[..., 0], img[..., 1], img[..., 2]; m = GEM[char](r, g, b) & (img[..., 3] > .5)
    n, lab_, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    # a gem: round, and not on her chest or face (a brooch, a blush, the skirt's blue)
    quad = np.array([D['shoulder_left'], D['shoulder_right'], D['hip_right'], D['hip_left']]); qc = quad.mean(0); quad = qc + (quad - qc) * 1.1
    def ok_gem(i):
        w_, h_, ar = st[i, cv2.CC_STAT_WIDTH], st[i, cv2.CC_STAT_HEIGHT], st[i, cv2.CC_STAT_AREA]
        if ar < 25 or not (.45 < w_ / max(1, h_) < 2.2) or ar / (np.pi * (max(w_, h_) / 2) ** 2) < .28: return False
        c = cen[i]
        if cv2.pointPolygonTest(quad.astype(np.float32).reshape(-1, 1, 2), (float(c[0]), float(c[1])), False) >= 0: return False
        sp_ = D['neck'] - D['root']; ls_ = np.linalg.norm(sp_)
        if (c - D['root']) @ sp_ / ls_ < -.3 * ls_: return False          # not low down by her legs (the skirt)
        return np.linalg.norm(c - D['head']) > .45 * ls_
    gems = [cen[i] for i in 1 + np.argsort(-st[1:, cv2.CC_STAT_AREA])[:8] if ok_gem(i)][:5] if n > 1 else []
    if not gems: return None
    spine = np.linalg.norm(D['neck'] - D['root']); hr = HEAD_R[char] * spine; H, W = m.shape
    a = img[..., 3:4]; grey = (((img[..., :3] * a + (1 - a)).mean(2)) * 255).astype(np.uint8)
    edges = cv2.Canny(grey, 40, 120)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 360, 60, minLineLength=int(.45 * spine), maxLineGap=int(.1 * spine))
    if lines is None: return None
    best = None
    for gm in gems:
        for x1, y1, x2, y2 in lines.reshape(-1, 4):
            p1, p2 = np.array([x1, y1], float), np.array([x2, y2], float); v = p2 - p1; L = np.linalg.norm(v); u = v / L
            t = (gm - p1) @ u; dist = abs((gm - p1) @ np.array([-u[1], u[0]]))
            if dist > .22 * hr or t > L + 1.3 * hr or t < -1.3 * hr or .2 * L < t < .8 * L: continue   # at an end of it
            far = p2 if t < L / 2 else p1; reach = np.linalg.norm(far - gm)
            # held: the line passes by one of her hands (the hat's brim, a cloak's edge do not)
            hd = min(seg_dist(np.array([D[w_]]), gm, far)[0] for w_ in ('wrist_right', 'wrist_left'))
            if hd > .45 * spine: continue
            if best is None or reach > best[0]: best = (reach, gm, far)
    if best is None or best[0] < .7 * spine: return None
    _, gem, end = best; dv = (end - gem) / np.linalg.norm(end - gem); end = end + dv * .05 * spine
    hair = [hexc(h) for h in HAIR.get(char, [])]
    ys, xs = np.nonzero(img[..., 3] > .1); P = np.c_[xs, ys].astype(float); col = img[ys, xs, :3]
    not_hair = np.min([np.sqrt(((col - h) ** 2).sum(1)) for h in hair], 0) > .15 if hair else np.ones(len(P), bool)
    near = (np.hypot(P[:, 0] - gem[0], P[:, 1] - gem[1]) < .5 * hr) & not_hair
    if near.sum() < 20: return None
    _, _, cc = cv2.kmeans(np.float32(col[near]), 5, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, .01), 3, cv2.KMEANS_PP_CENTERS)
    close = lambda c, pl, t: np.min([np.sqrt(((c - q) ** 2).sum(1)) for q in pl], 0) < t
    in_head = np.hypot(P[:, 0] - gem[0], P[:, 1] - gem[1]) < hr
    dseg = seg_dist(P, gem, end)
    sel = (in_head & close(col, cc, .15) & not_hair) | ((dseg < .055 * spine) & not_hair)
    out = np.zeros((H, W), bool); out[ys[sel], xs[sel]] = True
    out = cv2.morphologyEx(out.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)) > 0
    staff_mask.gem = gem
    return out & (img[..., 3] > .1)

CORE_J = ['head', 'neck', 'root', 'shoulder_right', 'shoulder_left', 'hip_right', 'hip_left']

def load_all():
    F = frames(); J = json.load(open(os.path.join(WORK, 'joints.json'))); fit = json.load(open(os.path.join(WORK, 'fit.json')))
    prop = json.load(open(os.path.join(WORK, 'proportions.json'))); return F, J, fit, prop

def V(d): return {j: np.array(v[:2], float) for j, v in d.items() if j != 'face'}

def seg_dist(P, a, b, flat_start=False):
    """Distance to the segment a-b; with flat_start, nothing behind a counts (the limb is cut square at the joint
    it hangs from, so it does not take the body around that joint)."""
    ab = b - a; tr = ((P - a) @ ab) / max(1e-6, ab @ ab); t = np.clip(tr, 0, 1)
    d = np.linalg.norm(P - (a + t[:, None] * ab), axis=1)
    if flat_start: d = np.where(tr < .04, np.inf, d)
    return d

def reliable(f, Js, fitv):
    """Joints the detector found where the motion says they are (after the similarity fit), and surely."""
    s, ang = fitv[0], np.radians(fitv[1]); R = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]]); t = np.array(fitv[2:4])
    M = V(f['joints']); spine = s * np.linalg.norm(M['neck'] - M['root']); ok = {}
    for j, v in Js.items():
        if j == 'face' or j not in M: continue
        res = np.linalg.norm(s * R @ M[j] + t - np.array(v[:2])) / max(spine, 1)
        ok[j] = v[2] > .35 and res < .45
    return ok

def chain_angles(M, ch):
    base, a, b, c, _ = ch
    u1 = M[b] - M[a]; u2 = M[c] - M[b]
    return np.array([np.arctan2(u1[1], u1[0]), np.arctan2(u2[1], u2[0])]), np.array([np.linalg.norm(u1), np.linalg.norm(u2)])

def adiff(x, y): return np.abs((x - y + np.pi) % (2 * np.pi) - np.pi)

def core_distance(Mt, Ms):
    A = np.array([Mt[k] for k in CORE_J]) - Mt['root']; B = np.array([Ms[k] for k in CORE_J]) - Ms['root']
    return float(np.sqrt(((A - B) ** 2).sum(1)).mean())

def body_only(img):
    a = (img[..., 3] > .1).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(a, 8)
    if n <= 2: return img
    keep = lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); out = img.copy(); out[..., 3] *= keep; return out

def segment(img, D):
    """0 none, 1 core, 2.. limbs (LIMBS order); and each limb's half width."""
    H, W = img.shape[:2]; m = (img[..., 3] > .08).astype(np.uint8)
    dt = cv2.distanceTransform(m, cv2.DIST_L2, 5); ys, xs = np.nonzero(m); P = np.c_[xs, ys].astype(float)
    spine = np.linalg.norm(D['neck'] - D['root']); dist = []; rad = []
    for n, (ja, jb) in LIMBS.items():
        A, B = D[ja], D[jb]
        if n in EXT: B = B + (B - A) * EXT[n]
        q = np.clip(np.round(A + np.linspace(.15, .85, 12)[:, None] * (B - A)).astype(int), 0, SIZE - 1)
        r = max(14.0, float(min(np.median(dt[q[:, 1], q[:, 0]]) * 1.25, RADIUS[n[:-2]] * spine))); rad.append(r)
        dist.append(seg_dist(P, A, B, flat_start=n[:-2] in ('uarm', 'thigh')) / r)
    dist = np.vstack(dist); best = np.argmin(dist, 0); dmin = dist[best, np.arange(len(best))]
    quad = np.array([D['shoulder_left'], D['shoulder_right'], D['hip_right'], D['hip_left']]); c = quad.mean(0); quad = c + (quad - c) * 1.15
    qm = np.zeros((H, W), np.uint8); cv2.fillPoly(qm, [quad.astype(np.int32)], 1); in_quad = qm[ys, xs] > 0
    limb = (dmin < .8) | ((dmin < 1.0) & ~in_quad)
    lab = np.zeros((H, W), np.int16); lab[ys, xs] = np.where(limb, 2 + best, 1)
    # the overlap margin of each limb: a disc round the joint it hangs from (whatever lies there), laid under its
    # parent so a turned limb leaves no gap at the hip, shoulder, knee or elbow
    caps = []
    for i, (n_, (ja, jb)) in enumerate(LIMBS.items()):
        A = D[ja]; r = rad[i] * 1.05
        caps.append(((xs - A[0]) ** 2 + (ys - A[1]) ** 2 < r * r))
    capm = np.zeros((len(LIMBS), H, W), bool)
    for i, c in enumerate(caps): capm[i, ys[c], xs[c]] = True
    return lab, rad, capm

def xform(a0, b0, a1, b1, along=(.4, 2.2), across=(.8, 1.25), k_across=1.0):
    """2x3 matrix taking a0-b0 onto a1-b1: turned, stretched along the bone, scaled k_across across."""
    v0 = b0 - a0; v1 = b1 - a1; l0 = max(1e-6, np.linalg.norm(v0)); l1 = np.linalg.norm(v1)
    k = np.clip(l1 / l0, *along); ka = np.clip(k_across, *across)
    u0 = v0 / l0; n0 = np.array([-u0[1], u0[0]]); u1 = v1 / max(1e-6, l1); n1 = np.array([-u1[1], u1[0]])
    A = k * np.outer(u1, u0) + ka * np.outer(n1, n0); return np.c_[A, a1 - A @ a0]

def trunk_side(f):
    """For each limb part of frame f: True if it lies over the trunk (the mannequin's rule, tools/mannequin_svg.mjs:
    the trunk is an elliptic cylinder round the spine, 11 wide and 7 deep; arms need a small margin to go under,
    legs a clear one to come over)."""
    W = {j: np.array(v, float) for j, v in f['world'].items()}; yr = np.radians(f.get('yaw') or 0)
    nm = lambda a: a / (np.linalg.norm(a) or 1)
    fwd = nm(np.cross(W['neck'] - W['root'], W['shoulder_left'] - W['shoulder_right']))
    V = np.array([-np.sin(yr), 0, np.cos(yr)]); up = nm(W['neck'] - W['root']); fz = nm(fwd - up * (fwd @ up)); lx = np.cross(up, fz)
    vx, vz = V @ lx, V @ fz; TA, TB = 11, 7
    def dd(w):
        a = W['root']; ab = W['neck'] - a; t = np.clip(((w - a) @ ab) / (ab @ ab or 1), 0, 1); q = w - (a + ab * t)
        return ((q @ lx) * vx / TA ** 2 + (q @ fz) * vz / TB ** 2) * TB ** 2
    out = {}
    for n, (a, b) in LIMBS.items():
        w = W[b] if a.startswith('shoulder') else (W[a] + W[b]) / 2
        out[n] = dd(w) > (-1.5 if n[:-2] in ('uarm', 'farm') else 4)
    return out

def over(dst, L):
    a = L[..., 3:4]; dst[..., :3] = dst[..., :3] * (1 - a) + L[..., :3] * a; dst[..., 3:4] = dst[..., 3:4] * (1 - a) + a

PROPPED = {'bubble_float', 'engulf_sink', 'engulf_struggle', 'edge_pull', 'reach_toward', 'spore_inhale'}
NEAR_VIEW = {'down_right': {'right', 'front'}, 'down_left': {'left', 'front'}, 'up_right': {'right', 'back'}, 'up_left': {'left', 'back'}}
HOLDING = {'restrained', 'restrained_sway', 'floor_hold', 'floor_sway', 'hug_behind', 'face_close', 'small_cling', 'sink', 'coil', 'caught'}

class Library:
    def __init__(self, F, J, fit, prop):
        self.F, self.J, self.fit, self.prop = F, J, fit, prop; self.cache = {}
        self.ok = {k: reliable(F[k], J[k], fit[k]) for k in J}
        # drawings with something holding her or beside her (a creature, a mass, water): their parts carry it along
        sc = json.load(open(os.path.join(ROOT, 'chatgpt', 'scenes', 'jobs.json')))['frames']
        self.held = {f['file'] for f in sc if HOLDING & set(f.get('kinds', []))}
        # drawings with a big thing round her that is drawn as part of her (a bubble, a mass, a ledge)
        self.held |= {k for k in J if F[k]['motion'] in PROPPED}
        self.cover = {}; self.gems = {}
    def covered(self, k):
        """How much of her torso her own arms hide in drawing k (0..1): those holes have to be filled."""
        if k not in self.cover:
            img, D, lab, rad, _ = self.cut(k)
            quad = np.array([D['shoulder_left'], D['shoulder_right'], D['hip_right'], D['hip_left']]).astype(np.int32)
            qm = np.zeros((SIZE, SIZE), np.uint8); cv2.fillPoly(qm, [quad], 1)
            arm = (lab >= 2) & (lab <= 5)
            self.cover[k] = float((arm & (qm > 0)).sum() / max(1, qm.sum()))
        return self.cover[k]
    def cands(self, char, view, near=False):
        vs = {view} | (NEAR_VIEW.get(view, set()) if near else set())
        return [k for k in self.J if self.F[k]['char'] == char and self.F[k]['view'] in vs]
    def cut(self, k):
        if k not in self.cache:
            img = body_only(drawing(self.F[k], k)); D = V(self.J[k]); lab, rad, capm = segment(img, D)
            sm = staff_mask(img, D, self.F[k]['char'], self.F[k])
            if sm is not None: lab = np.where(sm, -1, lab); self.gems[k] = staff_mask.gem      # -1: the staff
            if len(self.cache) > 12: self.cache.pop(next(iter(self.cache)))
            self.cache[k] = (img, D, lab, rad, capm)
        return self.cache[k]

def pick_core(lib, ft, cands):
    Mt = V(ft['joints'])
    def score(k):
        Ms = V(lib.F[k]['joints']); ok = lib.ok[k]
        bad = sum(not ok.get(j, False) for j in ['neck', 'root', 'shoulder_right', 'shoulder_left', 'hip_right', 'hip_left'])
        # limbs near the target's too: fewer holes to fill in the core
        limbs = np.mean([adiff(chain_angles(Mt, ch)[0], chain_angles(Ms, ch)[0]).mean() for ch in CHAINS.values()])
        return core_distance(Mt, Ms) + 6 * limbs + 8 * bad + .08 * lib.fit[k][4] + 25 * (k in lib.held) + 12 * (lib.F[k]['set'] == 'draw' and ft['set'] == 'scenes') + 10 * (lib.F[k]['view'] != ft['view'])
    # the few nearest by pose; of them, the one whose own arms hide least of her torso
    near_ = sorted(cands, key=score)[:5]
    return min(near_, key=lambda k: score(k) + 60 * lib.covered(k))

def pick_chain(lib, ft, cands, name):
    ch = CHAINS[name]; Mt = V(ft['joints']); at, lt = chain_angles(Mt, ch)
    def score(k):
        Ms = V(lib.F[k]['joints']); ok = lib.ok[k]; as_, ls = chain_angles(Ms, ch)
        bad = sum(not ok.get(j, False) for j in ch[1:4])
        # the bend matters most (it cannot be made by turning); then the direction; then foreshortening
        flex = adiff(at[1] - at[0], as_[1] - as_[0])
        # a hand holding a sword or staff, or a limb with something on it, only when nothing else is near
        return 3 * flex + adiff(at, as_).sum() + .6 * abs(np.log((ls[0] + 1) / (lt[0] + 1))) + 2.5 * bad \
            + 1.2 * (k in lib.held) + .8 * (lib.F[k]['set'] == 'draw' and ft['set'] == 'scenes' and name.startswith('arm')) + .8 * (lib.F[k]['view'] != ft['view'])
    return min(cands, key=score)

def assemble(tk, lib, override=None):
    F = lib.F; ft = F[tk]; cands = lib.cands(ft['char'], ft['view'])
    if not cands: return None, None, None
    Mt = V(ft['joints']); Wt = ft['joints']
    ck = (override or {}).get('core') or pick_core(lib, ft, cands)
    # nothing in this direction is posed near enough (lying down seen from 3/4, say): the next direction's drawings
    if core_distance(Mt, V(F[ck]['joints'])) > 28 and ft['view'] in NEAR_VIEW:
        wide = lib.cands(ft['char'], ft['view'], near=True); ck2 = pick_core(lib, ft, wide)
        if core_distance(Mt, V(F[ck2]['joints'])) < .6 * core_distance(Mt, V(F[ck]['joints'])): ck, cands = ck2, wide
    img, D, lab, rad, _ = lib.cut(ck); fs = F[ck]; Ms = V(fs['joints']); s = lib.fit[ck][0]; prop = lib.prop.get(ft['char'], {})
    # the target's core joints on the core drawing: from its root, placed on the ground line
    keys = [j for j in CORE_J + ['elbow_right', 'elbow_left', 'wrist_right', 'wrist_left', 'knee_right', 'knee_left', 'ankle_right', 'ankle_left']]
    g = max(D[k][1] for k in keys) + s * (GROUND - max(Ms[k][1] for k in keys))
    P = {'root': np.array([D['root'][0] + s * (Mt['root'][0] - Ms['root'][0]), g - s * (GROUND - Mt['root'][1])])}
    for j in ('neck', 'hip_right', 'hip_left'): P[j] = P['root'] + s * (Mt[j] - Mt['root'])
    for j in ('shoulder_right', 'shoulder_left'): P[j] = P['neck'] + s * (Mt[j] - Mt['neck'])
    v = D['head'] - D['neck']; a0 = np.arctan2(*(Ms['head'] - Ms['neck'])[::-1]); a1 = np.arctan2(*(Mt['head'] - Mt['neck'])[::-1])
    c, si = np.cos(a1 - a0), np.sin(a1 - a0); P['head'] = P['neck'] + np.array([c * v[0] - si * v[1], si * v[0] + c * v[1]])
    # the core, without its limbs. Where its own limbs lay over it: inside the torso's outline (the shoulders-hips
    # quad, pulled in by the arm's half width) the torso is filled from around; where they lay over the long hair, the
    # hair is filled from the hair; anything else is left clear (the new limbs, or nothing, go there)
    depth = lambda js: np.mean([Wt[j][2] for j in js])
    Mc = xform(D['root'], D['neck'], P['root'], P['neck'], (.85, 1.15))
    # (only what is joined to her torso: a sword or staff left in the hand after the arm is cut out goes)
    cm = ((lab == 1) & (img[..., 3] > .08)).astype(np.uint8); nn, cl, st, _ = cv2.connectedComponentsWithStats(cm, 8)
    ctr = np.round((D['neck'] + D['root']) / 2).astype(int)
    keep = cl[ctr[1], ctr[0]] if cl[ctr[1], ctr[0]] > 0 else 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    lab = np.where((lab == 1) & (cl != keep), 0, lab)
    core = img.copy(); core[..., 3] *= (lab == 1); holes = (lab >= 2) | (lab == -1)
    sl, sr, hr, hl = D['shoulder_left'], D['shoulder_right'], D['hip_right'], D['hip_left']
    def inward(p, q, d):   # p moved toward q by d
        v = q - p; return p + v / max(1e-6, np.linalg.norm(v)) * d
    quad = np.array([inward(sl, sr, .7 * rad[2]), inward(sr, sl, .7 * rad[0]), inward(hr, hl, .15 * rad[4]), inward(hl, hr, .15 * rad[6])])
    top = (D['neck'] - (D['root'] - D['neck']) * .05)
    qm = np.zeros((SIZE, SIZE), np.uint8); cv2.fillPoly(qm, [np.vstack([quad[:2], quad[2:]]).astype(np.int32)], 1)
    cols = [hexc(h) for h in HAIR.get(ft['char'], [])]
    u = (D['root'] - D['neck']) / max(1e-6, np.linalg.norm(D['root'] - D['neck']))
    yy, xx = np.mgrid[:SIZE, :SIZE]; below = ((xx - D['neck'][0]) * u[0] + (yy - D['neck'][1]) * u[1]) > .05 * np.linalg.norm(D['root'] - D['neck'])
    hm = np.zeros((SIZE, SIZE), bool)
    if cols:
        dcol = np.min([np.sqrt(((img[..., :3] - c) ** 2).sum(2)) for c in cols], 0)
        # the hair that is not around the face (the sides, the back, the ponytail): behind her body and arms
        fc = np.array([p_[:2] for p_ in lib.J[ck]['face'] if p_[2] > .3]); fc = fc.mean(0) if len(fc) else D['head']
        fr_ = .95 * np.linalg.norm(fc - D['neck'])
        away = np.hypot(xx - fc[0], yy - fc[1]) > fr_
        hm = cv2.morphologyEx(((dcol < .16) & (below | away) & (lab == 1) & (img[..., 3] > .05)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)) > 0
    kz = int(max(31, 2.2 * max(rad[:4])))
    hair_hull = cv2.morphologyEx(hm.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kz, kz))) > 0
    def fill_from(src_mask, region):
        _, idx = ndimage.distance_transform_edt(~(src_mask & (img[..., 3] > .9)), return_indices=True)
        base8 = (np.clip(img[idx[0], idx[1], :3], 0, 1) * 255).astype(np.uint8)
        return cv2.inpaint(base8, region.astype(np.uint8) * 255, 7, cv2.INPAINT_TELEA) / 255.
    tor = holes & (qm > 0)
    if tor.any(): f_ = fill_from((lab == 1) & ~hm, tor); core[tor, :3] = f_[tor]; core[tor, 3] = 1
    hh = holes & ~(qm > 0) & hair_hull & below
    # the rest of the holes that her body closes round (a backpack, a cloak, the waist behind the arms): from the core
    body_hull = cv2.morphologyEx(((lab == 1) & ~hm).astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kz, kz))) > 0
    enc = holes & body_hull & ~(qm > 0) & ~hh
    if enc.any(): f_ = fill_from((lab == 1) & ~hm, enc); core[enc, :3] = f_[enc]; core[enc, 3] = 1
    back = core.copy(); back[..., 3] *= hm
    if hh.any(): f_ = fill_from(hm, hh); back[hh, :3] = f_[hh]; back[hh, 3] = 1
    core[..., 3] *= ~hm
    layers = [(-1e6, cv2.warpAffine(back, Mc, (SIZE, SIZE)), 'hair'), (0, cv2.warpAffine(core, Mc, (SIZE, SIZE)), 'core')]
    used = {'core': ck}; side = trunk_side(ft)
    for name, ch in CHAINS.items():
        base_, a, b, c_, parts = ch
        lk = (override or {}).get(name) or pick_chain(lib, ft, cands, name); used[name] = lk
        limg, LD, llab, lrad, lcap = lib.cut(lk); lMs = V(F[lk]['joints']); ls_ = lib.fit[lk][0]; k_sz = s / ls_   # its size -> the core's
        for pa, pb in ((a, b), (b, c_)):
            # the drawn bone of the limb's own drawing, to the core's size, foreshortened as the motion is
            lt_, lsrc = np.linalg.norm(Mt[pb] - Mt[pa]), np.linalg.norm(lMs[pb] - lMs[pa]); ld = np.linalg.norm(LD[pb] - LD[pa]) * k_sz
            kp = prop.get(PROP[pb.split('_')[0]], 1.0)
            L = ld * lt_ / lsrc if lsrc > 4 else s * kp * lt_
            L = float(np.clip(L, .6 * s * kp * lt_, 1.5 * s * kp * lt_ + 1))
            d = (Mt[pb] - Mt[pa]) / max(lt_, 1e-6); P[pb] = P[pa] + d * L
        prev_d = 0
        for pn in parts:
            ja, jb = LIMBS[pn]; i = list(LIMBS).index(pn)
            pm = (llab == 2 + i).astype(np.uint8); nn, cl, st, _ = cv2.connectedComponentsWithStats(pm, 8)
            if nn > 2: pm = (cl == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
            part = limg.copy(); part[..., 3] *= pm
            # over the trunk: above the core (1000 + depth); under it: below (-1000 + depth), as the mannequin draws it
            M = xform(LD[ja], LD[jb], P[ja], P[jb], k_across=k_sz); d_ = (1000 if side[pn] else -1000) + depth([ja, jb])
            layers.append((d_, cv2.warpAffine(part, M, (SIZE, SIZE)), pn))
            if pn == 'farm_r' and 'prop_b' in ft['joints'] and (llab == -1).any() and lk in lib.gems:
                # the staff: held at the hand, its head turned the way the target's staff points (prop_b is the head)
                st_ = limg.copy(); st_[..., 3] *= (llab == -1); gem = lib.gems[lk]
                L0 = np.linalg.norm(gem - LD['wrist_right']) * k_sz; dv = Mt['prop_b'] - Mt['wrist_right']; dv = dv / max(1e-6, np.linalg.norm(dv))
                Ms_ = xform(LD['wrist_right'], gem, P['wrist_right'], P['wrist_right'] + dv * L0, along=(k_sz, k_sz), k_across=k_sz)
                layers.append((d_ + .5, cv2.warpAffine(st_, Ms_, (SIZE, SIZE)), 'staff'))
            cap = limg.copy(); cap[..., 3] *= lcap[i] & (llab != -1)
            # under its parent: the core for an upper arm / thigh, the upper part for a forearm / shin
            parent_d = 0 if pn[:-2] in ('uarm', 'thigh') else prev_d
            layers.append((parent_d - .001, cv2.warpAffine(cap, M, (SIZE, SIZE)), pn + '_cap')); prev_d = d_
    out = np.zeros((SIZE, SIZE, 4), np.float32)
    for L in sorted(layers, key=lambda x: x[0]): over(out, L[1])
    assemble.layers = layers
    return out, used, P

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    od = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(WORK, 'out')
    if od in args: args.remove(od)
    os.makedirs(od, exist_ok=True); lib = Library(*load_all())
    sp = os.path.join(od, 'sources.json'); srcs = json.load(open(sp)) if os.path.exists(sp) else {}
    for tk in args:
        if tk not in lib.F: print(tk, 'unknown'); continue
        out, used, P = assemble(tk, lib)
        if out is None: print(tk, 'no source'); continue
        to_img(out).save(os.path.join(od, tk)); srcs[tk] = used; print(tk, used, flush=True)
    json.dump(srcs, open(sp, 'w'), indent=1)

if __name__ == '__main__': main()
