"""ChatGPT の歩行スプライトシート（3列×4行）を1コマずつに切り分ける。

行は 前・左・右・後ろ、列は歩きの3コマ（左足・立ち・右足）。
隣の段の髪と足が重なっているので、行・列の境目は透明な所を縫う線（シーム）で切る。
薄いにじみ（alpha<64）は消す。全コマを同じ大きさの枠に、足元をそろえて置く。

使い方: python3 newgame/tools/cut_sprites.py <シート.png> <出力フォルダ> <名前>
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROWS = ["front", "left", "right", "back"]
COLS = 3


def valleys(p, lo, hi, k, gap=120):
    sm = np.convolve(p, np.ones(15) / 15, "same")
    out = []
    for j in sorted(range(lo, hi), key=lambda j: sm[j]):
        if all(abs(j - o) > gap for o in out):
            out.append(j)
        if len(out) == k:
            break
    return sorted(out)


def seam(cost, guess, band):
    """cost[y, x] の中を上から下へ、guess±band の範囲で一番安い縦の線を探す。"""
    h, w = cost.shape
    lo, hi = max(0, guess - band), min(w, guess + band + 1)
    c = cost[:, lo:hi].astype(float)
    acc = c.copy()
    for y in range(1, h):
        prev = acc[y - 1]
        best = np.minimum(prev, np.minimum(np.r_[np.inf, prev[:-1]], np.r_[prev[1:], np.inf]))
        acc[y] += best
    path = np.zeros(h, int)
    path[-1] = int(np.argmin(acc[-1]))
    for y in range(h - 2, -1, -1):
        x = path[y + 1]
        cands = [(acc[y, xx], xx) for xx in (x - 1, x, x + 1) if 0 <= xx < acc.shape[1]]
        path[y] = min(cands)[1]
    return path + lo


def main(src, outdir, name):
    img = Image.open(src).convert("RGBA")
    a = np.array(img)
    a[a[..., 3] < 64] = 0
    alpha = a[..., 3]
    solid = alpha > 100
    h, w = alpha.shape
    ys, xs = np.nonzero(solid)
    colc = valleys(solid.sum(0), xs.min() + 100, xs.max() - 100, COLS - 1)
    rowc = valleys(solid.sum(1), ys.min() + 100, ys.max() - 100, len(ROWS) - 1)
    # 各画素がどの列・どの行に属するか（シームの左右・上下）
    col_of = np.zeros((h, w), int)
    for c in colc:
        s = seam(alpha, c, 40)
        col_of += (np.arange(w)[None, :] > s[:, None])
    row_of = np.zeros((h, w), int)
    for r in rowc:
        s = seam(alpha.T, r, 40)
        row_of += (np.arange(h)[:, None] > s[None, :])

    cells = {}
    for ri, rname in enumerate(ROWS):
        for ci in range(COLS):
            m = (row_of == ri) & (col_of == ci) & (alpha > 0)
            yy, xx = np.nonzero(m)
            box = (xx.min(), yy.min(), xx.max() + 1, yy.max() + 1)
            cell = np.zeros_like(a)
            cell[m] = a[m]
            cells[(rname, ci)] = Image.fromarray(cell).crop(box)
    W = max(im.width for im in cells.values()) + 8
    H = max(im.height for im in cells.values()) + 8
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (W * COLS, H * len(ROWS)))
    meta = {"name": name, "frameW": W, "frameH": H, "rows": ROWS, "cols": COLS,
            "walk": [0, 1, 2, 1], "source": Path(src).name}
    for (rname, ci), im in cells.items():
        frame = Image.new("RGBA", (W, H))
        frame.alpha_composite(im, ((W - im.width) // 2, H - 4 - im.height))
        frame.save(out / f"{name}_{rname}_{ci}.png")
        sheet.alpha_composite(frame, (ci * W, ROWS.index(rname) * H))
    sheet.save(out / f"{name}_sheet.png")
    (out / f"{name}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    print(name, "frame", W, H, "cols", colc, "rows", rowc)


if __name__ == "__main__":
    main(*sys.argv[1:4])
