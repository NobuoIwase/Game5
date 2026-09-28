"""Keeps the ChatGPT pictures of one heroine looking like one person.

Each picture ChatGPT draws is only a likeness: the hair's tufts, the crown, the hat, the size of the figure come out a
little different every time, and in an animation that flickers. For every heroine and every direction one frame is
the model (MODEL below); from it this tool carries over to the other frames of that direction:
  - the hair (and the hat): matched on the head (hair + face + lines, not the weapon), then only the hair / hat colours
    are laid over the frame; the face, eyes and mouth stay the frame's own, and whatever is in front of the head in
    the frame (sword, arm, shield, staff) stays on top. The hair below the head fades into the frame's own, so it still
    swings with the motion. Stray tufts of the frame's own hair that stick out past the new hair at the outline go.
  - the head of the staff (mage, healer): ChatGPT redraws its prongs / ring / gem differently every time; the head of
    one model frame (PROPS) is laid over the frame's own, found by its gem, turned the way the frame's shaft leaves
    it and sized to the figure. What is left of the old head is taken away, and what is in front of it stays.
  - Aria's sword and shield: the blade is drawn out or in along itself to the length the pose picture asks for (SWORD),
    and the face of the shield (the emblem) is the model frame's, stretched onto the frame's ellipse (SHIELD)
  - the size: the frame is scaled so its head is as big as the model's (about the feet), within 0.8-1.25
A frame whose head cannot be matched with confidence is left as it is (listed in the report).
The originals are never touched.

  python3 tools/unify_chatgpt_frames.py <originals dir: .../chatgpt/out> [char] [--preview]
Output: chatgpt/unified/<char>/<frame>.webp (512 px, for the game), chatgpt/unified/report.json,
        with --preview also chatgpt/unified/preview/<char>__<view>.webp (before | after, heads)
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
# the head sizes searched (ChatGPT often draws the figure smaller in a big move than in the model's guard)
S_LO, S_HI = .55, 1.6
# the pose pictures are cut to one square per heroine (tools/build_chatgpt_draw.mjs, build_chatgpt_scenes.mjs):
# the width of that square in canvas units, to compare the figure's size across the two sets
POSE_W = {'draw': {'aria': 276, 'scout': 201, 'mage': 230, 'healer': 255}, 'scenes': {'aria': 234, 'healer': 234, 'mage': 275, 'scout': 255}}

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

    def match(self, target, s_lo, s_hi, f=6):
        I = small(target, f); I3 = I[:, :, :3] * I[:, :, 3:4]; best = None
        for s in np.arange(s_lo, s_hi + .001, .03):
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
        new = np.concatenate([rgb, al], 2)
        sk0 = near(reg, [self.skin], .15) & (reg[:, :, 3] > .5); sk1 = near(new, [self.skin], .15) & (new[:, :, 3] > .5)
        self.face_kept = float(sk1.sum() / max(1, sk0.sum()))
        self.face_area = float(sk0.sum() / max(1, self.hull.sum() * s * s))
        out[y:y + a.shape[0], x:x + a.shape[1]] = new
        return out

# the staffs: ChatGPT redraws the head of the staff (prongs, ring, gem) a little differently every time. The head of the
# model frame (a front view with the staff upright) is laid over the frame's own, found by its gem.
PROPS = {
    'mage':   {'model': 'mage_bolt:front:0', 'shaft': '41363f', 'gem': lambda r, g, b: (r > .3) & (b > .3) & (g < .2) & (r - g > .22)},
    'healer': {'model': 'healer_pray:front:0', 'spread': 4, 'gem': lambda r, g, b: (b > .47) & (b - r > .24) & (b - g > .12)},
}
def metal_of(a):
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    return (r - b > .18) & (g - b > .05) & (r >= g - .02) & (a[:, :, 3] > .5)
def gem_at(a, test):
    m = test(a[:, :, 0], a[:, :, 1], a[:, :, 2]) & (a[:, :, 3] > .5)
    lab, n = ndimage.label(m)
    if not n: return None
    sz = ndimage.sum(m, lab, range(1, n + 1)); i = int(np.argmax(sz))
    if sz[i] < 40: return None
    y, x = ndimage.center_of_mass(lab == i + 1); return x, y, float(sz[i])

class Prop:
    """The head of the staff in the model frame, centred on its gem, upright."""
    def __init__(self, img, cfg):
        self.test = cfg['gem']; gx, gy, self.gem_area = gem_at(img, self.test); self.spread = cfg.get('spread', 16)
        self.line_col = hx(cfg['shaft']) if 'shaft' in cfg else None
        gem = self.test(img[:, :, 0], img[:, :, 1], img[:, :, 2]) & (img[:, :, 3] > .5)
        solid = ndimage.binary_closing(metal_of(img) | gem, iterations=4)
        # only near the gem (the staff's shaft and a brown glove would join it to the whole figure)
        gd = 2 * np.sqrt(self.gem_area / np.pi); yy, xx = np.mgrid[:img.shape[0], :img.shape[1]]
        solid &= np.hypot(xx - gx, yy - gy) < cfg.get('reach', 2.6) * gd
        solid |= ndimage.binary_fill_holes(gem & (np.hypot(xx - gx, yy - gy) < gd))
        lab, _ = ndimage.label(solid); ids = lab[gem & (lab > 0)]
        part = lab == np.bincount(ids).argmax()
        # small holes (the gem's highlight) are part of it; big ones (the inside of a ring) are not
        holes = ndimage.binary_fill_holes(part) & ~part; hl, hn = ndimage.label(holes)
        if hn: part |= np.isin(hl, 1 + np.where(ndimage.sum(holes, hl, range(1, hn + 1)) < .02 * part.sum())[0])
        ys, xs = np.where(part)
        # the head ends where the part narrows to the shaft
        top = ys.min(); widths = np.array([part[y].sum() for y in range(top, ys.max() + 1)])
        wmax = widths.max(); yi = int(np.argmax(widths))
        below = np.where(widths[yi:] < .3 * wmax)[0]
        bot = top + yi + (int(below[0]) if len(below) else len(widths) - yi - 1)
        sh = int(.25 * (bot - top)); y1 = min(img.shape[0], bot + sh)
        x0, x1 = xs[(ys >= top) & (ys < y1)].min(), xs[(ys >= top) & (ys < y1)].max() + 1
        pad = 4; x0, top, x1, y1 = max(0, x0 - pad), max(0, top - pad), x1 + pad, y1
        B = img[top:y1, x0:x1].copy(); P = part[top:y1, x0:x1]
        # its outline (the dark line around the metal) belongs to it
        L = B[:, :, :3].mean(2); P = P | (ndimage.binary_dilation(P, iterations=3) & (L < .3) & (B[:, :, 3] > .5))
        P = P & (B[:, :, 3] > .5)
        fade = np.clip((B.shape[0] - np.arange(B.shape[0])) / max(1, sh), 0, 1)[:, None]
        B[:, :, 3] = np.minimum(B[:, :, 3], P * fade)
        # the shaft's colour, just below the head
        r0 = bot - gy; stub = B[bot - top:bot - top + sh][P[bot - top:bot - top + sh]]
        self.shaft = np.median(stub[:, :3], 0); self.r0 = r0
        self.t = B; self.c = (gx - x0, gy - top)        # gem centre in the template
        self.r_head = float(np.hypot(*(np.array([[x0, top], [x1, top], [x0, bot], [x1, bot]]) - [gx, gy]).T).max())

    def place(self, s, deg):
        """The template scaled and turned about its gem: (rgba, gem x, gem y in it)."""
        t = self.t; h, w = t.shape[:2]
        # pad so the gem is in the middle, then turning keeps it there
        R = int(np.ceil(np.hypot(max(self.c[0], w - self.c[0]), max(self.c[1], h - self.c[1])))) + 2
        big = np.zeros((2 * R, 2 * R, 4), np.float32); ox, oy = int(R - self.c[0]), int(R - self.c[1])
        big[oy:oy + h, ox:ox + w] = t
        out = rot_scale(big, s, deg); return out, out.shape[1] / 2, out.shape[0] / 2

    def match(self, img, s_exp, f=3):
        g = gem_at(img, self.test)
        if g is None: return None
        gx, gy, _ = g; best = None
        R = int(self.r_head * s_exp * 1.3) + 10
        X0, Y0 = int(gx) - R, int(gy) - R
        win = np.zeros((2 * R, 2 * R, 4), np.float32)
        sx0, sy0 = max(0, X0), max(0, Y0); sx1, sy1 = min(img.shape[1], X0 + 2 * R), min(img.shape[0], Y0 + 2 * R)
        win[sy0 - Y0:sy1 - Y0, sx0 - X0:sx1 - X0] = img[sy0:sy1, sx0:sx1]
        W = small(win, f); W3 = W[:, :, :3] * W[:, :, 3:4]; cw = W.shape[0] / 2
        # the size comes from the figure (the head is as big against her as in the model); the staff is held
        # upright or nearly so (a staff lying down is left as it is: its match is poor)
        ax = self.axis(img, gx, gy, s_exp); self.ax = ax
        # (a ring looks the same turned a little, so there the shaft alone says which way it points)
        sp = self.spread if ax is not None else 40; ax = ax or 0
        degs = sorted({d % 360 for d in range(ax - sp, ax + sp + 1, 4)})
        for s in np.arange(s_exp * .94, s_exp * 1.06 + .001, .03):
            for deg in degs:
                t, cx, cy = self.place(s / f, deg); cx, cy = cx * f, cy * f; a = (t[:, :, 3] > .5).astype(np.float32)
                th, tw = t.shape[:2]; tc = t[:, :, :3] * a[:, :, None]
                for dy in (-2, -1, 0, 1, 2):
                    for dx in (-2, -1, 0, 1, 2):
                        yy, xx = int(round(cw - cy / f)) + dy, int(round(cw - cx / f)) + dx
                        if yy < 0 or xx < 0 or yy + th > W.shape[0] or xx + tw > W.shape[1]: continue
                        d = ((W3[yy:yy + th, xx:xx + tw] - tc) ** 2).sum(2) * a
                        v = float(d.sum() / max(1, a.sum()))
                        if best is None or v < best[0]: best = (v, float(s), deg if deg <= 180 else deg - 360, gx + dx * f, gy + dy * f)
        return best

    def axis(self, img, gx, gy, s):
        """Which way the shaft leaves the head (degrees, as the template is turned): the shaft is joined to the
        head, so the part of the staff reaching past the head shows it. None when it cannot be seen."""
        H, W = img.shape[:2]; R = int(2.8 * self.r0 * s) + 4
        X0, Y0 = max(0, int(gx) - R), max(0, int(gy) - R); win = img[Y0:int(gy) + R, X0:int(gx) + R]
        cx, cy = gx - X0, gy - Y0
        staff = (near(win, [self.shaft], .14) | metal_of(win)) & (win[:, :, 3] > .5)
        staff |= self.test(win[:, :, 0], win[:, :, 1], win[:, :, 2])
        staff = ndimage.binary_closing(staff, iterations=2)
        yy, xx = np.mgrid[:win.shape[0], :win.shape[1]]; d = np.hypot(xx - cx, yy - cy)
        lab, n = ndimage.label(staff)
        core = lab[d < .5 * self.r0 * s]; core = core[core > 0]
        if len(core):
            part = lab == np.bincount(core).argmax()
            out = part & (d > 1.3 * self.r0 * s) & (d < 2.7 * self.r0 * s)
            if out.sum() >= .15 * self.r0 * s:
                dx, dy = (xx[out] - cx).mean(), (yy[out] - cy).mean()
                return int(round(np.degrees(np.arctan2(dx, dy)) / 4) * 4)
        return self.line_axis(img, gx, gy, s) if self.line_col is not None else None

    def line_axis(self, img, gx, gy, s):
        """A dark shaft (the mage's) against dark clothes and hat: the ray from the gem along which a thin line
        of the shaft's colour runs (on both sides of it, something else)."""
        H, W = img.shape[:2]; rs = np.linspace(1.3, 2.6, 26) * self.r0 * s; w = .14 * self.r0 * s; best = (0, None)
        def hit(xs, ys):
            xs, ys = xs.astype(int), ys.astype(int); ok = (xs >= 0) & (ys >= 0) & (xs < W) & (ys < H)
            p = img[np.clip(ys, 0, H - 1), np.clip(xs, 0, W - 1)]
            return ok & (p[:, 3] > .5) & (np.sqrt(((p[:, :3] - self.line_col) ** 2).sum(1)) < .12)
        for deg in range(0, 360, 4):
            th = np.radians(deg); ux, uy = np.sin(th), np.cos(th)
            xs, ys = gx + rs * ux, gy + rs * uy
            c = hit(xs, ys); l = hit(xs + w * uy, ys - w * ux); r = hit(xs - w * uy, ys + w * ux)
            v = int((c & ~(l & r)).sum())
            if v > best[0]: best = (v, deg)
        if best[0] < .5 * len(rs): return None
        d = best[1]; return d - 360 if d > 180 else d

    def lay(self, img, s, deg, gx, gy):
        t, cx, cy = self.place(s, deg); h, w = t.shape[:2]
        x, y = int(round(gx - cx)), int(round(gy - cy))
        out = img.copy(); H, Wd = img.shape[:2]
        tx0, ty0 = max(0, -x), max(0, -y); x, y = max(0, x), max(0, y)
        t = t[ty0:, tx0:]; t = t[:H - y, :Wd - x]; h, w = t.shape[:2]; a = t[:, :, 3]
        reg = out[y:y + h, x:x + w]
        # the frame's old head: its metal and gem near the gem, outside the new one, goes (the shaft below stays)
        gem = self.test(img[:, :, 0], img[:, :, 1], img[:, :, 2]) & (img[:, :, 3] > .5)
        old = ndimage.binary_closing(metal_of(img) | gem, iterations=3)
        old |= ndimage.binary_dilation(old, iterations=4) & (img[:, :, :3].mean(2) < .2) & (img[:, :, 3] > .3)
        yy, xx = np.mgrid[:H, :Wd]; th = np.radians(deg if getattr(self, 'ax', None) is None else self.ax)
        # along the staff (0 at the gem, + towards the shaft) and across it
        along = (xx - gx) * np.sin(th) + (yy - gy) * np.cos(th); across = (xx - gx) * np.cos(th) - (yy - gy) * np.sin(th)
        rh = self.r_head * s * 1.35
        zone = (np.hypot(along, across) < rh) & ~((along > self.r_head * s * .45) & (np.abs(across) < .12 * rh + .25 * along))
        new = np.zeros((H, Wd), bool); new[y:y + h, x:x + w] = a > .2
        rest = old & zone & ~ndimage.binary_dilation(new, iterations=3)
        rest = ndimage.binary_dilation(rest, iterations=2) & zone & ~new & (img[:, :, 3] > .05)
        if rest.any():
            # where the old head stood over nothing, nothing; over the figure, the colour next to it
            keep = ~rest & (img[:, :, 3] > .5) & ~old
            idx = ndimage.distance_transform_edt(~keep, return_distances=False, return_indices=True)
            fill = img[idx[0], idx[1]]
            nearest_d = ndimage.distance_transform_edt(~keep)
            outside = ndimage.binary_dilation(img[:, :, 3] < .1, iterations=2)
            lab, n = ndimage.label(rest)
            gone = np.isin(lab, np.unique(lab[outside & rest]))
            out[rest] = fill[rest]; out[gone & (nearest_d > 6)] = 0
            self.removed = int(rest.sum())
        else: self.removed = 0
        reg = out[y:y + h, x:x + w]
        # whatever is in front of the old head in the frame (a hand, the hat brim) stays on top
        oldr = old[y:y + h, x:x + w]; hull = ndimage.binary_fill_holes(ndimage.binary_closing(oldr, iterations=6))
        # (a hole in the head, such as the inside of a ring, shows what is behind; something in front crosses the
        # head from outside it into its middle)
        fr = ~oldr & (img[y:y + h, x:x + w, 3] > .5); lab, n = ndimage.label(fr)
        deep = ndimage.binary_erosion(hull, iterations=max(2, int(.15 * self.r_head * s)))
        ids = np.intersect1d(np.unique(lab[deep & fr]), np.unique(lab[~hull & fr])); ids = ids[ids > 0]
        occ = ndimage.binary_opening(np.isin(lab, ids) & hull, iterations=2) & (a > .3)
        # and where a broad piece of the new head falls on something that is not the old head, the old head was
        # behind it there (the hat brim, a sleeve); a thin edge is only the two designs differing
        cand = (a > .3) & ~oldr & (img[y:y + h, x:x + w, 3] > .5)
        k = max(2, int(.07 * self.r_head * s))
        occ |= ndimage.binary_dilation(ndimage.binary_opening(cand, iterations=k), iterations=2) & cand
        self.occluded = float(occ.sum() / max(1, (a > .3).sum()))
        aa = a.copy(); aa[occ] = 0; aa = aa[:, :, None]
        rgb = reg[:, :, :3] * (1 - aa) + t[:, :, :3] * aa; al = np.maximum(reg[:, :, 3:4], aa)
        out[y:y + h, x:x + w] = np.concatenate([rgb, al], 2)
        return out

def rescale(img, k):
    """Scale the figure by k about its feet (bottom centre), on the same canvas."""
    x0, y0, x1, y1 = bbox(img); cx = (x0 + x1) / 2
    im = to_img(img); W, H = im.size
    # not so much that the figure (a raised staff, a sword) leaves the picture
    k = min(k, (y1 - 4) / max(1, y1 - y0), (W - 4 - cx) / max(1, x1 - cx), (cx - 4) / max(1, cx - x0)) if k > 1 else k
    if abs(k - 1) < .02: return img
    big = im.resize((int(W * k), int(H * k)), Image.LANCZOS)
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.paste(big, (int(round(cx - cx * k)), int(round(y1 - y1 * k))), big)
    return np.asarray(canvas).astype(np.float32) / 255

def pose_h(f):
    p = os.path.join(CG, f['pose']) if f.get('set') == 'draw' else os.path.join(CG, 'scenes', f['pose'])
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.int16); m = (a < 230).any(2)
    ys = np.where(m.any(1))[0]; return (ys.max() - ys.min()) * POSE_W[f['set']][f['char']] / a.shape[0]

def frames_of():
    out = []
    for p in (os.path.join(CG, 'jobs.json'), os.path.join(CG, 'scenes', 'jobs.json')):
        if os.path.exists(p): out += [dict(f, set='scenes' if 'scenes' in p else 'draw') for f in json.load(open(p, encoding='utf-8'))['frames']]
    return out

# Aria's sword: ChatGPT draws the blade at about one length whatever the pose, but that length wanders (from 0.7 to 1.3
# of the usual). The pose picture has the sword too, drawn from the 3D pose, so it tells how long the blade should look
# (a blade pointing at the viewer looks short). The blade is drawn out or drawn in along itself, from the hilt, to lie
# between the pose's length and its full length.
SWORD = {'aria': {'hilt': ['c1a88c', '7d5951', 'a8834f', '5a3d33'],
                  # the full blade against the pose units (the median of the frames whose pose sword lies flat to the
                  # picture: 0.963 x 57)
                  'full': 55.0, 'pose_full': 57.0, 'cal': .963}}

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

def pose_blade(f):
    p = load(os.path.join(CG, f['pose'])) if f.get('set') == 'draw' else load(os.path.join(CG, 'scenes', f['pose']))
    pb = blade_of(p, 15)
    return None if pb is None else pb[0] * POSE_W[f['set']][f['char']] / p.shape[0]

def lay_blade(f, img, base, rec):
    """Aria's blade drawn out or in to the length the pose asks for (see SWORD)."""
    cfg = SWORD.get(f['char'])
    if not cfg or f.get('set') != 'draw': return base
    b = bbox(img); H = b[3] - b[1]; u = H / pose_h(f)
    bl = blade_of(img, .12 * H)
    if bl is None: rec['blade'] = 'not seen'; return base
    Ln, W, c, v, mk = bl
    ys, xs = np.where(mk); t = (xs - c[0]) * v[0] + (ys - c[1]) * v[1]
    ends = [c + v * t.min(), c + v * t.max()]
    # the hilt end: the guard / grip / glove colours just past it
    hilt = near(img, [hx(x) for x in cfg['hilt']], .12) & (img[..., 3] > .5)
    def hilt_near(e, d):
        p = e + d * v * .06 * Ln; r = int(.05 * Ln) + 4; x0, y0 = int(p[0]) - r, int(p[1]) - r
        return hilt[max(0, y0):y0 + 2 * r, max(0, x0):x0 + 2 * r].sum()
    h0, h1 = hilt_near(ends[0], -1), hilt_near(ends[1], 1)
    if max(h0, h1) < 20: rec['blade'] = 'no hilt'; return base
    hp, vv = (ends[0], v) if h0 >= h1 else (ends[1], -v)     # vv: from the hilt towards the tip
    P = pose_blade(f)
    lo = cfg['cal'] * P * u * .9 if P else 0
    hi = cfg['full'] * u * 1.05
    Lt = float(np.clip(Ln, lo, hi)); k = Lt / Ln
    rec['blade'] = {'length': round(Ln / u, 1), 'pose': round(P, 1) if P else None, 'k': round(k, 3)}
    if abs(k - 1) < .06: return base
    # the blade strip (with its outline), and where it goes
    strip = ndimage.binary_dilation(mk, iterations=5) & (img[..., 3] > .05)
    Hh, Ww = strip.shape; yy, xx = np.mgrid[:Hh, :Ww]
    ta = (xx - hp[0]) * vv[0] + (yy - hp[1]) * vv[1]; tn = (xx - hp[0]) * -vv[1] + (yy - hp[1]) * vv[0]
    # source of each pixel: along the blade, 1/k as far from the hilt
    sx = hp[0] + vv[0] * (ta / k) - vv[1] * tn; sy = hp[1] + vv[1] * (ta / k) + vv[0] * tn
    region = (ta > 0) & (ta < Lt + 8) & (np.abs(tn) < W * 2 + 6)
    src_in = ndimage.map_coordinates(strip.astype(np.float32), [sy, sx], order=1, mode='constant') > .5
    new = region & src_in
    out = base.copy()
    # what the old blade leaves: the picture next to it, or nothing where it stood over nothing
    gone = strip & ~new & (ta > 0)
    if gone.any():
        keep = ~strip & (img[..., 3] > .5)
        idx = ndimage.distance_transform_edt(~keep, return_distances=False, return_indices=True)
        dist = ndimage.distance_transform_edt(~keep)
        out[gone] = base[idx[0], idx[1]][gone]
        out[gone & (dist > 5)] = 0
    for ch in range(4):
        vals = ndimage.map_coordinates(base[..., ch], [sy, sx], order=1, mode='constant')
        out[..., ch] = np.where(new, vals, out[..., ch])
    if k < 1:
        # scraps of the old tip (its faint outline) left standing alone past the new tip go
        lane = (ta > Lt - 4) & (ta < Ln + 40) & (np.abs(tn) < W * 2 + 14)
        lab, n = ndimage.label(out[..., 3] > .02)
        if n:
            sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
            ids = np.unique(lab[lane & (lab > 0)]); ids = ids[sizes[ids - 1] < 1500]
            out[np.isin(lab, ids)] = 0
    return out

# Aria's shield: the emblem on its face (blue on beige) comes out a different shape every time. The face of the model
# frame's shield is laid into the frame's: the face is taken as an ellipse, and the model's face (beige and emblem) is
# stretched from its ellipse to the frame's, upright. Whatever lies over the face in the frame (the sword, a hand,
# hair) stays on top. The back of the shield (no emblem) is left as it is.
SHIELD = {'aria': {'model': 'slash:front:0', 'emblem': lambda r, g, b: (b - r > .1) & (b > g) & (b > .3) & (b < .62)}}
def shield_face(a, test):
    """The face of the shield: (its mask, centre, 2x2 matrix mapping the unit circle onto it) or None."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; al = a[..., 3] > .5
    em = test(r, g, b) & al; lab, n = ndimage.label(em)
    if not n: return None
    sz = ndimage.sum(em, lab, range(1, n + 1)); i = int(np.argmax(sz))
    if sz[i] < 400: return None
    em = lab == i + 1; ys, xs = np.where(em); cx, cy = xs.mean(), ys.mean(); R = 3.2 * np.sqrt(sz[i])
    L = a[..., :3].mean(2)
    beige = (r - b > .06) & (r - b < .26) & (r >= g) & (g >= b - .02) & (L > .38) & (L < .86) & al
    yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]; near_ = np.hypot(xx - cx, yy - cy) < R
    face = ndimage.binary_closing((beige | em) & near_, iterations=3)
    lab, _ = ndimage.label(face); ids = lab[em & (lab > 0)]
    if not len(ids): return None
    face = ndimage.binary_fill_holes(lab == np.bincount(ids).argmax())
    ys, xs = np.where(face)
    if len(xs) < 2000: return None
    P = np.c_[xs, ys].astype(float); c = P.mean(0); C = np.cov((P - c).T)
    w, V = np.linalg.eigh(C); ax = 2 * np.sqrt(np.maximum(w, 1e-6))        # a uniform ellipse: var = a^2/4
    A = V @ np.diag(ax) @ V.T
    # how well an ellipse fits it
    inv = np.linalg.inv(A); q = (np.c_[xx.ravel(), yy.ravel()] - c) @ inv.T
    ell = (np.hypot(q[:, 0], q[:, 1]) < 1).reshape(face.shape)
    iou = (ell & face).sum() / max(1, (ell | face).sum())
    return face, c, A, float(iou), float(ax.min() / ax.max())

class Shield:
    def __init__(self, img, cfg):
        self.test = cfg['emblem']; sf = shield_face(img, self.test)
        if sf is None: raise ValueError('no shield face in the model')
        self.face, self.c, self.A, _, _ = sf; self.img = img
    def lay(self, img, base, rec):
        sf = shield_face(img, self.test)
        if sf is None: rec['shield'] = 'no face seen'; return base
        face, c, A, iou, ratio = sf
        if iou < .8 or ratio < .3: rec['shield'] = f'not an ellipse ({iou:.2f}, {ratio:.2f})'; return base
        # the model's pixel for each pixel of the frame's ellipse (shrunk a little: the rim stays the frame's)
        H, W = face.shape; x0, y0 = [int(v) for v in np.floor(c - np.abs(A).sum(1) - 4)]; x1, y1 = [int(v) for v in np.ceil(c + np.abs(A).sum(1) + 4)]
        x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(W, x1), min(H, y1)
        yy, xx = np.mgrid[y0:y1, x0:x1]; q = np.c_[xx.ravel() - c[0], yy.ravel() - c[1]] @ np.linalg.inv(A).T
        inside = (np.hypot(q[:, 0], q[:, 1]) < .96).reshape(yy.shape) & face[y0:y1, x0:x1]
        src = (q @ self.A.T + self.c).reshape(yy.shape + (2,))
        vals = np.stack([ndimage.map_coordinates(self.img[..., ch], [src[..., 1], src[..., 0]], order=1) for ch in range(4)], -1)
        okm = ndimage.map_coordinates(self.face.astype(np.float32), [src[..., 1], src[..., 0]], order=1) > .5
        # over the face in the frame: what is neither beige nor emblem stays (the frame's own face is the mask already,
        # so a sword or hand across it has cut the mask: fill_holes put it back in, so take it out again)
        a = img[y0:y1, x0:x1]; r, g, b = a[..., 0], a[..., 1], a[..., 2]; L = a[..., :3].mean(2)
        own = ((r - b > .04) & (r - b < .3) & (L > .33) & (L < .9)) | self.test(r, g, b)
        own = ndimage.binary_closing(own, iterations=2)
        put = inside & okm & own
        aa = ndimage.gaussian_filter(put.astype(np.float32), 1.0)[..., None] * put[..., None]
        out = base.copy(); reg = out[y0:y1, x0:x1]
        out[y0:y1, x0:x1] = reg * (1 - aa) + vals * aa
        rec['shield'] = {'iou': round(iou, 3), 'ratio': round(ratio, 3), 'laid': int(put.sum())}
        return out

def shield_of(char, frames):
    cfg = SHIELD.get(char)
    if not cfg: return None
    mo, vw, fn = cfg['model'].split(':')
    pf = next((f for f in frames if f['char'] == char and f['motion'] == mo and f['view'] == vw and str(f['frame']) == fn), None)
    if pf is None or not os.path.exists(os.path.join(SRC, char, pf['file'])): return None
    return Shield(load(os.path.join(SRC, char, pf['file'])), cfg)

STAFF_POOR = .2
STAFF_POOR_NO_AXIS = .11
def staff_of(char, frames):
    """The staff model of a heroine: (Prop, its frame, its figure-to-pose ratio), or None."""
    cfg = PROPS.get(char)
    if not cfg: return None
    mo, vw, fn = cfg['model'].split(':')
    pf = next((f for f in frames if f['char'] == char and f['motion'] == mo and f['view'] == vw and str(f['frame']) == fn), None)
    if pf is None or not os.path.exists(os.path.join(SRC, char, pf['file'])): return None
    pimg = load(os.path.join(SRC, char, pf['file'])); b = bbox(pimg)
    return Prop(pimg, cfg), pf, (b[3] - b[1]) / pose_h(pf)

def lay_staff(st, f, img, base, rec):
    """The model's staff head over the frame's (img: the original, base: the picture so far)."""
    if st is None: return base
    prop, pf, ratio = st
    if f['file'] == pf['file']: rec['staff'] = 'model'; return base
    b = bbox(img); se = (b[3] - b[1]) / pose_h(f) / ratio
    m = prop.match(img, se)
    if m is None: rec['staff'] = 'no staff head seen'; return base
    v, s, deg, gx, gy = m
    # without the shaft to go by, only a close match (an upright staff whose shaft is hidden)
    if v > (STAFF_POOR if prop.ax is not None else STAFF_POOR_NO_AXIS): rec['staff'] = f'poor match {v:.3f}'; return base
    out = prop.lay(base, s, deg, gx, gy)
    rec['staff'] = {'score': round(v, 4), 'scale': round(s, 3), 'rot': deg, 'axis': prop.ax, 'removed': prop.removed}
    return out

def lay_gear(st, sh, f, img, base, rec):
    """The things she holds, after the hair: the staff head, the blade's length, the shield's face."""
    base = lay_blade(f, img, lay_staff(st, f, img, base, rec), rec)
    return sh.lay(img, base, rec) if sh is not None else base

def main():
    report = {}; os.makedirs(OUT, exist_ok=True)
    frames = frames_of(); fmap = {f['file']: f for f in frames}; staffs = {}; shields = {}
    for char, cfg in CHARS.items():
        if ONLY and char != ONLY: continue
        os.makedirs(os.path.join(OUT, char), exist_ok=True)
        have = lambda f: os.path.exists(os.path.join(SRC, char, f['file']))
        mine = [f for f in frames if f['char'] == char and have(f)]
        st = staffs[char] = staff_of(char, frames); sh = shields[char] = shield_of(char, frames)
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
            if model is not None:
                mimg = load(os.path.join(SRC, char, model_f['file'])); b = bbox(mimg)
                model_ratio = (b[3] - b[1]) / pose_h(model_f)
            for f in vf:
                img = load(os.path.join(SRC, char, f['file'])); res = img; tried = None; rec = {'view': view}
                if model is not None and f is not model_f:
                    b = bbox(img); s_exp = (b[3] - b[1]) / pose_h(f) / model_ratio
                    rec['s_exp'] = round(float(s_exp), 3)
                    v, s, deg, x, y = model.match(img, max(S_LO, s_exp * .88), min(S_HI, s_exp * 1.12))
                    fit = model.fit(img, s, deg, x, y)
                    rec.update(score=round(v, 4), scale=round(s, 3), rot=deg, fit=round(fit, 3))
                    why = []
                    if fit <= .72: why.append('fit')
                    if not (S_LO < s_exp < S_HI): why.append('size far from the model')
                    if not why:
                        res = model.lay_hair(img, s, deg, x, y)
                        rec['face_kept'] = round(model.face_kept, 3); rec['face_area'] = round(model.face_area, 4)
                        if view not in ('back', 'up_left', 'up_right') and model.face_kept < .93: why.append('hair over the face'); tried = res; res = img
                    if why: rec.update(done=False, why=why); res = lay_gear(st, sh, f, img, res, rec)
                    else:
                        res = lay_gear(st, sh, f, img, res, rec)
                        k = float(np.clip(1 / s, .8, 1.45)); res = rescale(res, k); rec.update(done=True, resize=round(k, 3))
                elif model is not None: rec.update(done=True, model=True); res = lay_gear(st, sh, f, img, res, rec)
                else: rec['done'] = False; res = lay_gear(st, sh, f, img, res, rec)
                report[f['file']] = rec
                to_img(res).resize((SIZE, SIZE), Image.LANCZOS).save(os.path.join(OUT, char, f['file'].replace('.png', '.webp')), 'WEBP', quality=90, method=6)
                if PREVIEW:
                    for im in (img, res if tried is None else tried):
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
                S.convert('RGB').save(os.path.join(OUT, 'preview', f'{char}__{view}.webp'), 'WEBP', quality=80, method=6)
    for char in {k.split('__')[0] for k in report}:
        sc = sorted(r['score'] for k, r in report.items() if k.startswith(char + '__') and 'score' in r)
        if not sc: continue
        med = sc[len(sc) // 2]
        for k, r in report.items():
            if k.startswith(char + '__') and r.get('done') and 'score' in r and r['score'] > 2.2 * med:
                r.update(done=False, why=['poor match']); src = load(os.path.join(SRC, char, k))
                to_img(lay_gear(staffs.get(char), shields.get(char), fmap[k], src, src, r)).resize((SIZE, SIZE), Image.LANCZOS).save(os.path.join(OUT, char, k.replace('.png', '.webp')), 'WEBP', quality=90, method=6)
    old = {}
    rp = os.path.join(OUT, 'report.json')
    if os.path.exists(rp): old = json.load(open(rp, encoding='utf-8'))
    old.update(report); json.dump(old, open(rp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    done = sum(1 for r in report.values() if r.get('done')); print('unified', done, 'of', len(report))

if __name__ == '__main__': main()
