"""Keeps the ChatGPT pictures of one heroine looking like one person.

Each picture ChatGPT draws is only a likeness: the hair's tufts, the crown, the hat, the size of the figure come out a
little different every time, and in an animation that flickers. For every heroine and every direction one frame is
the model (MODEL below); from it this tool carries over to the other frames of that direction:
  - the hair (and the hat): matched on the head (hair + face + lines, not the weapon), then only the hair / hat colours
    are laid over the frame; the face, eyes and mouth stay the frame's own, and whatever is in front of the head in
    the frame (sword, arm, shield, staff) stays on top. The hair below the head fades into the frame's own, so it still
    swings with the motion. Stray tufts of the frame's own hair that stick out past the new hair at the outline go.
  - the size: the frame is scaled so its head is as big as the model's (about the feet), within 0.8-1.25
A frame whose head cannot be matched with confidence is left as it is (listed in the report).
The originals are never touched.

  python3 tools/unify_chatgpt_frames.py <originals dir: .../chatgpt/out> [char] [--preview]
Output: chatgpt/unified/<char>/<frame>.webp (512 px, for the game), chatgpt/unified/report.json,
        with --preview also chatgpt/unified/preview/<char>__<view>.png (before | after, heads)
"""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from scipy.signal import fftconvolve
from scipy.spatial import ConvexHull

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CG = os.path.join(ROOT, 'chatgpt')
SRC = sys.argv[1]
ONLY = next((a for a in sys.argv[2:] if not a.startswith('--')), None)
VIEWS = os.environ.get('VIEWS', '').split(',') if os.environ.get('VIEWS') else None
MOTIONS = os.environ.get('MOTIONS', '').split(',') if os.environ.get('MOTIONS') else None
PREVIEW = '--preview' in sys.argv
OUT = os.path.join(CG, 'unified')
SIZE = 512

hx = lambda s: np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255
# the colours that make each heroine recognisable on her head (measured on the models), and her skin
CHARS = {
    'aria':   {'ident': ['e38c64', 'bf7054'], 'skin': 'f3dcd3',
               'model': ['slash:0', 'heavy:1', 'kesa:3', 'yoko:3', 'thrust:2']},
    'scout':  {'ident': ['fac69f', 'e3a892'], 'skin': 'f9ddc6',
               'model': ['scout_knife_combo:0', 'scout_throw:6', 'scout_sidestep:3', 'scout_sense:0']},
    'mage':   {'ident': ['5c495e', '483445', 'c9446c', 'dbbceb', 'aa82d9'], 'skin': 'f5e2dc',
               'model': ['mage_bolt:0', 'mage_barrier:4', 'mage_area:5', 'mage_channel:0']},
    'healer': {'ident': ['4d4b53', '685e61', '28262c'], 'skin': 'fbe3d3',
               'model': ['healer_purify:3', 'healer_buff:4', 'healer_purify:9', 'healer_buff:8', 'healer_pray:0']},
}
TOL = .17

def load(p): return np.asarray(Image.open(p).convert('RGBA')).astype(np.float32) / 255
def to_img(a): return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
def near(img, cols, tol):
    d = np.min([np.sqrt(((img[:, :, :3] - c) ** 2).sum(2)) for c in cols], axis=0)
    return d < tol
def bbox(a):
    ys, xs = np.where(a[:, :, 3] > .15)
    return xs.min(), ys.min(), xs.max(), ys.max()
def rot_scale(img, s, deg):
    im = to_img(img); w, h = im.size
    im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.BILINEAR)
    return np.asarray(im.rotate(deg, resample=Image.BILINEAR, expand=True)).astype(np.float32) / 255
def small(a, f): return np.asarray(to_img(a).resize((a.shape[1] // f, a.shape[0] // f), Image.BILINEAR)).astype(np.float32) / 255

class Model:
    """The head of the model frame: where it is, what to match on, what to lay over."""
    def __init__(self, img, cfg):
        self.ident = [hx(c) for c in cfg['ident']]; self.skin = hx(cfg['skin'])
        x0, y0, x1, y1 = bbox(img); H = y1 - y0
        yb = y0 + int(H * .42)
        idm = near(img, self.ident, TOL) & (img[:, :, 3] > .5); idm[yb:] = False
        lab, n = ndimage.label(idm)
        if not n: raise ValueError('no hair found')
        sizes = ndimage.sum(idm, lab, range(1, n + 1)); idm = lab == (1 + np.argmax(sizes))
        ys, xs = np.where(idm); hx0, hx1, hy0 = xs.min(), xs.max(), ys.min()
        self.box = (hx0, hy0, hx1 + 1, yb)
        B = img[hy0:yb, hx0:hx1 + 1]; idb = idm[hy0:yb, hx0:hx1 + 1]
        pts = np.argwhere(idb); hv = pts[ConvexHull(pts).vertices]
        hull = Image.new('L', (B.shape[1], B.shape[0]), 0)
        ImageDraw.Draw(hull).polygon([(int(p[1]), int(p[0])) for p in hv], fill=1)
        self.hull = np.asarray(hull).astype(bool)
        L = B[:, :, :3].mean(2)
        w = self.hull & (B[:, :, 3] > .5) & (near(B, self.ident, TOL + .03) | near(B, [self.skin], .15) | (L < .25))
        self.match_t = B.copy(); self.match_t[:, :, 3] = w
        # what is laid over: the hair / hat only, fading out towards the bottom of the head box
        keep = ndimage.binary_opening(ndimage.binary_closing(idb, iterations=2), iterations=3)
        lab, n = ndimage.label(keep)
        if n: keep = lab == (1 + np.argmax(ndimage.sum(keep, lab, range(1, n + 1))))
        keep = keep.astype(np.float32)
        fade = np.clip((B.shape[0] - np.arange(B.shape[0])) / (.2 * B.shape[0]), 0, 1)[:, None]
        self.hair_t = B.copy(); self.hair_t[:, :, 3] = np.minimum(B[:, :, 3], keep * fade)
        self.head_h = B.shape[0]

    def match(self, target, f=6):
        I = small(target, f); I3 = I[:, :, :3] * I[:, :, 3:4]; best = None
        for s in np.arange(.84, 1.21, .03):
            for deg in range(-35, 36, 5):
                t = small(rot_scale(self.match_t, s, deg), f); w = (t[:, :, 3] > .5).astype(np.float32)
                if w.sum() < 20 or t.shape[0] >= I.shape[0] or t.shape[1] >= I.shape[1]: continue
                tc = t[:, :, :3] * w[:, :, None]
                ssd = (tc ** 2).sum() - 2 * sum(fftconvolve(I3[:, :, k], tc[::-1, ::-1, k], 'valid') for k in range(3)) \
                    + fftconvolve((I3 ** 2).sum(2), w[::-1, ::-1], 'valid')
                ssd /= w.sum(); j = np.unravel_index(np.argmin(ssd), ssd.shape)
                if best is None or ssd[j] < best[0]: best = (float(ssd[j]), float(s), deg, int(j[1] * f), int(j[0] * f))
        return best

    def fit(self, target, s, deg, x, y):
        """How much of the matched head lands on the frame's hair, skin and lines."""
        hh = rot_scale(np.dstack([self.hull.astype(np.float32)] * 4), s, deg)[:, :, 3] > .5
        reg = target[y:y + hh.shape[0], x:x + hh.shape[1]]; hh = hh[:reg.shape[0], :reg.shape[1]]
        ok = (near(reg, self.ident, TOL + .05) | near(reg, [self.skin], .18) | (reg[:, :, :3].mean(2) < .25)) & (reg[:, :, 3] > .5)
        return float((ok & hh).sum() / max(1, hh.sum()))

    def lay_hair(self, target, s, deg, x, y):
        t = rot_scale(self.hair_t, s, deg); out = target.copy()
        h, w = t.shape[:2]; reg = out[y:y + h, x:x + w]; t = t[:reg.shape[0], :reg.shape[1]]; a = t[:, :, 3]
        # the frame's own stray tufts outside the new hair, at the outline only, go
        th = np.zeros(out.shape[:2], bool); th[y:y + a.shape[0], x:x + a.shape[1]] = a > .3
        zone = np.zeros_like(th); zone[max(0, y - 40):y + int(h * .78), max(0, x - 60):x + w + 60] = True
        stray = zone & ~ndimage.binary_dilation(th, iterations=6) & near(out, self.ident, TOL) & (out[:, :, 3] > .1)
        lab, nl = ndimage.label(stray)
        if nl:
            outside = ndimage.binary_dilation(out[:, :, 3] < .1, iterations=1)
            ids = np.unique(lab[outside & stray]); ids = ids[ids > 0]
            # only small tufts (a whole lock of hair is part of the motion, and taking it away leaves a hole)
            area = ndimage.sum(stray, lab, ids); ids = ids[area < .006 * self.hull.size * s * s]
            out[:, :, 3] = np.where(np.isin(lab, ids), 0, out[:, :, 3])
        reg = out[y:y + h, x:x + w][:a.shape[0], :a.shape[1]]
        # whatever is in front of the head in the frame stays on top
        d = np.sqrt(((reg[:, :, :3] - t[:, :, :3]) ** 2).sum(2))
        occ = (d > .35) & ~near(reg, self.ident, TOL + .08) & (reg[:, :, 3] > .5) & (a > .3)
        occ = ndimage.binary_dilation(ndimage.binary_opening(occ, iterations=2), iterations=2)
        aa = np.asarray(to_img(a).filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255
        aa = np.minimum(aa, a); aa[occ] = 0; aa = aa[:, :, None]
        rgb = reg[:, :, :3] * (1 - aa) + t[:, :, :3] * aa; al = np.maximum(reg[:, :, 3:4], aa)
        out[y:y + a.shape[0], x:x + a.shape[1]] = np.concatenate([rgb, al], 2)
        return out

def rescale(img, k):
    """Scale the figure by k about its feet (bottom centre), on the same canvas."""
    if abs(k - 1) < .02: return img
    x0, y0, x1, y1 = bbox(img); cx = (x0 + x1) / 2
    im = to_img(img); W, H = im.size
    big = im.resize((int(W * k), int(H * k)), Image.LANCZOS)
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.paste(big, (int(round(cx - cx * k)), int(round(y1 - y1 * k))), big)
    return np.asarray(canvas).astype(np.float32) / 255

def frames_of():
    out = []
    for p in (os.path.join(CG, 'jobs.json'), os.path.join(CG, 'scenes', 'jobs.json')):
        if os.path.exists(p): out += json.load(open(p, encoding='utf-8'))['frames']
    return out

def main():
    report = {}; os.makedirs(OUT, exist_ok=True)
    frames = frames_of()
    for char, cfg in CHARS.items():
        if ONLY and char != ONLY: continue
        os.makedirs(os.path.join(OUT, char), exist_ok=True)
        have = lambda f: os.path.exists(os.path.join(SRC, char, f['file']))
        mine = [f for f in frames if f['char'] == char and have(f)]
        for view in sorted({f['view'] for f in mine}):
            if VIEWS and view not in VIEWS: continue
            vf = [f for f in mine if f['view'] == view and (not MOTIONS or f['motion'] in MOTIONS)]
            # the model: the first of the listed frames that exists for this direction
            model_f = None
            for m in cfg['model']:
                mo, fr = m.split(':')
                model_f = next((f for f in frames if f['char'] == char and f['motion'] == mo and f['view'] == view and str(f['frame']) == fr and have(f)), None)
                if model_f: break
            model = None
            if model_f:
                try: model = Model(load(os.path.join(SRC, char, model_f['file'])), cfg)
                except Exception as e: print(char, view, 'model failed:', e)
            tiles = []
            for f in vf:
                img = load(os.path.join(SRC, char, f['file'])); res = img; rec = {'view': view}
                if model is not None and f is not model_f:
                    v, s, deg, x, y = model.match(img)
                    fit = model.fit(img, s, deg, x, y)
                    rec.update(score=round(v, 4), scale=round(s, 3), rot=deg, fit=round(fit, 3))
                    if fit > .72:
                        res = model.lay_hair(img, s, deg, x, y)
                        k = float(np.clip(1 / s, .8, 1.25)); res = rescale(res, k); rec.update(done=True, resize=round(k, 3))
                    else: rec['done'] = False
                elif model is not None: rec.update(done=True, model=True)
                else: rec['done'] = False
                report[f['file']] = rec
                to_img(res).resize((SIZE, SIZE), Image.LANCZOS).save(os.path.join(OUT, char, f['file'].replace('.png', '.webp')), 'WEBP', quality=90, method=6)
                if PREVIEW:
                    for im in (img, res):
                        a = im; x0, y0, x1, y1 = bbox(a); hh = int((y1 - y0) * .5); cx = (x0 + x1) // 2
                        c = to_img(a).crop((cx - hh // 2 - 60, y0 - 20, cx + hh // 2 + 60, y0 + hh + 60)).resize((200, 200))
                        t = Image.new('RGBA', (200, 212), (205, 224, 205, 255)); t.alpha_composite(c)
                        ImageDraw.Draw(t).text((3, 200), f['motion'][:18] + ' ' + str(f['frame']) + ('' if rec.get('done') else ' (as is)'), fill=(0, 0, 0, 255))
                        tiles.append(t)
                print(char, view, f['file'], rec)
            if PREVIEW and tiles:
                os.makedirs(os.path.join(OUT, 'preview'), exist_ok=True)
                W = 8; S = Image.new('RGBA', (W * 202, ((len(tiles) + W - 1) // W) * 214), 'white')
                for i, t in enumerate(tiles): S.paste(t, ((i % W) * 202, (i // W) * 214))
                S.save(os.path.join(OUT, 'preview', f'{char}__{view}.png'))
    old = {}
    rp = os.path.join(OUT, 'report.json')
    if os.path.exists(rp): old = json.load(open(rp, encoding='utf-8'))
    old.update(report); json.dump(old, open(rp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    done = sum(1 for r in report.values() if r.get('done')); print('unified', done, 'of', len(report))

if __name__ == '__main__': main()
