"""任意の行×列のスプライトシートを、1コマずつに切り分ける（cut_sprites.py の一般化）。

行・列の境目は、透明な所を縫う線（シーム）で切る。薄いにじみ・光（alpha<64）は消す。
--black を付けると、黒い背景（外周からつながる真っ黒）を透明にしてから切る。
コマは「行名_列名」で、足元をそろえた同じ大きさの枠に置く。

使い方:
  python3 newgame/tools/cut_grid.py <シート.png> <出力フォルダ> <名前の型> <行名,…> <列名,…> [--black]
  名前の型には {r} と {c} を入れる。例: "salute_{r}_{c}"
"""
import sys
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from cut_sprites import valleys, seam


def key_black(a, thr=26):
    """外周からつながる、ほぼ黒の画素を透明にする（輪郭の黒は残る）。"""
    h, w = a.shape[:2]
    dark = a[..., :3].max(-1) < thr
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dark[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if dark[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and dark[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True; q.append((yy, xx))
    a[seen, 3] = 0
    return a


def cut(src, outdir, pattern, rows, cols, black=False, gap=None):
    img = Image.open(src).convert("RGBA")
    a = np.array(img)
    if black: a = key_black(a)
    a[a[..., 3] < 64] = 0
    alpha = a[..., 3]
    solid = alpha > 100
    h, w = alpha.shape
    ys, xs = np.nonzero(solid)
    cw, rh = (xs.max() - xs.min()) / len(cols), (ys.max() - ys.min()) / len(rows)
    colc = valleys(solid.sum(0), int(xs.min() + cw * 0.5), int(xs.max() - cw * 0.5), len(cols) - 1, gap or int(cw * 0.6))
    rowc = valleys(solid.sum(1), int(ys.min() + rh * 0.5), int(ys.max() - rh * 0.5), len(rows) - 1, gap or int(rh * 0.6))
    col_of = np.zeros((h, w), int)
    for c in colc:
        s = seam(alpha, c, int(cw * 0.25))
        col_of += (np.arange(w)[None, :] > s[:, None])
    row_of = np.zeros((h, w), int)
    for r in rowc:
        s = seam(alpha.T, r, int(rh * 0.25))
        row_of += (np.arange(h)[:, None] > s[None, :])
    cells = {}
    for ri, rn in enumerate(rows):
        for ci, cn in enumerate(cols):
            m = (row_of == ri) & (col_of == ci) & (alpha > 0)
            yy, xx = np.nonzero(m)
            cell = np.zeros_like(a); cell[m] = a[m]
            cells[(rn, cn)] = Image.fromarray(cell).crop((xx.min(), yy.min(), xx.max() + 1, yy.max() + 1))
    W = max(im.width for im in cells.values()) + 8
    H = max(im.height for im in cells.values()) + 8
    out = Path(outdir); out.mkdir(parents=True, exist_ok=True)
    for (rn, cn), im in cells.items():
        frame = Image.new("RGBA", (W, H))
        frame.alpha_composite(im, ((W - im.width) // 2, H - 4 - im.height))
        frame.save(out / (pattern.format(r=rn, c=cn) + ".png"))
    print(pattern, "frame", W, H, "cols", colc, "rows", rowc)


if __name__ == "__main__":
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    cut(args[0], args[1], args[2], args[3].split(","), args[4].split(","), black="--black" in sys.argv)
