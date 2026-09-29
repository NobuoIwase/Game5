"""export_game4_monsters.js で描き出した Game4 の魔物を、新作用の 256px の PNG に整える。

- 触手壺（pot）は届く範囲の輪も一緒に描かれるので、本体のまわりだけ残す
- 薄い光の端（alpha<=3）より外は切り詰め、縦横比を変えずに 256×256 の中央下寄せに置く
- 小淫魔（imp）は Game4 でも絵の画像（assets/sprites/imp_hd.png）なので、それをそのまま整える

使い方: python3 newgame/tools/trim_game4.py <描き出したフォルダ> <Game4のフォルダ>
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "assets" / "monsters"
# Game4 の id → 新作の id
MAP = {"slime": "slime", "slug": "slug", "lurecap": "lure_cap", "fluff": "fluff", "hand": "puppet_hand",
       "worm": "gulper_worm", "goblin": "goblin", "gazer": "gazer", "moth": "moth", "peeper": "peeper",
       "ghost": "ghost_head", "pot": "pot", "imp": "imp"}


def bbox(al, t):
    ys, xs = np.nonzero(al > t)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def fit(a, size=256, pad=8):
    x0, y0, x1, y1 = bbox(a[..., 3], 3)  # 薄い光も端まで入れる（四角く切れないように）
    im = Image.fromarray(a).crop((max(0, x0 - 2), max(0, y0 - 2), x1 + 2, y1 + 2))
    k = (size - pad * 2) / max(im.width, im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new("RGBA", (size, size))
    out.alpha_composite(im, ((size - im.width) // 2, size - pad - im.height))
    return out


def main(src, game4):
    src = Path(src)
    for g4, new in MAP.items():
        if g4 == "imp":
            a = np.array(Image.open(Path(game4) / "assets" / "sprites" / "imp_hd.png").convert("RGBA"))
        else:
            a = np.array(Image.open(src / f"{g4}.png").convert("RGBA"))
        if g4 == "pot":
            x0, y0, x1, y1 = bbox(a[..., 3], 90)
            keep = np.zeros(a.shape[:2], bool)
            keep[max(0, y0 - 10):y1 + 10, max(0, x0 - 10):x1 + 10] = True
            a[~keep] = 0
            # 輪の切れ端（暗い青灰色）も消す。壺と触手は赤みが勝つので残る
            r, g, b = (a[..., i].astype(int) for i in range(3))
            a[(b > r + 8) & (g > r) & (a[..., 3] > 0)] = 0
        fit(a).save(OUT / f"{new}.png")
        print(g4, "->", new)


if __name__ == "__main__":
    main(*sys.argv[1:3])
