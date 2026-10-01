"""Grok などで作った絵を、ゲームの素材の形に整える。

  python3 newgame/tools/grok_fit.py sprite <入力> <出力.png> [--pixel 2] [--tol 48]
      魔物の絵：背景（四隅の色をクロマキーとみなす）を透明にし、本体だけ切り出して
      256×256 の中央下寄せに置く（上下左右 8px あける。既存の assets/monsters/*.png と同じ）。
      --pixel N を付けると 256/N の大きさに縮めてから拡大し直し、ドット絵に寄せる。
  python3 newgame/tools/grok_fit.py deco <入力> <出力.png> [--pixel 2] [--tol 48]
      部屋の飾り1つ：背景を透明にして 64×64 の中央下寄せに置く。
  python3 newgame/tools/grok_fit.py tile <入力> <出力.png> [--pixel 2]
      床の1マス：中央を正方形に切り出して 64×64 に縮める（背景は抜かない）。
      既存の床・飾りは 32px 相当のドット絵なので、--pixel 2 を付けると並べた時になじむ。
  python3 newgame/tools/grok_fit.py sheet <出力.png> <64pxの絵>...
      64×64 の絵を左上から横4枚ずつ並べた1枚にする（床は8枚で 256×128、飾りは4枚で 256×64）。
  python3 newgame/tools/grok_fit.py check <絵>...
      大きさ・透明の有無・本体の範囲を出す。
"""
import sys
from PIL import Image


def opt(args, name, default):
    if name in args:
        i = args.index(name)
        v = args[i + 1]
        del args[i:i + 2]
        return type(default)(v)
    return default


KEY = {"green": False, "magenta": False}


def despill(im):
    """縮めた後にも残る、背景色の色かぶりを取る。"""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            if KEY["green"] and g > max(r, b):
                px[x, y] = (r, max(r, b), b, a)
            elif KEY["magenta"] and min(r, b) > g + 40:
                px[x, y] = (min(r, g + 40), g, min(b, g + 40), a)
    return im


def cut_bg(im, tol):
    """四隅の色を背景（クロマキー）とみなして抜く。背景色は本体に使っていない色（緑 #00FF00 か マゼンタ #FF00FF）にしておくこと。
    本体の隙間に残った背景色も抜く。近い色はなめらかに半透明にし、縁に残る背景色の色かぶりを取る。"""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))   # 四隅の中央寄りの値
    green = bg[1] > bg[0] + 60 and bg[1] > bg[2] + 60
    magenta = bg[0] > bg[1] + 60 and bg[2] > bg[1] + 60
    KEY.update(green=green, magenta=magenta)
    hi = tol * 2.2
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = ((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2) ** 0.5
            if d <= tol:
                px[x, y] = (0, 0, 0, 0); continue
            if d < hi:
                a = round(a * (d - tol) / (hi - tol))
            if green and g > max(r, b):                 # 緑かぶりを取る
                g = max(r, b)
            if magenta and min(r, b) > g:               # マゼンタかぶりを取る
                m = max(g, (r + b) // 2 - 40)
                r, b = min(r, m + 40), min(b, m + 40)
            px[x, y] = (r, g, b, a)
    return im


def clean(im):
    """縮めた時に出る薄い縁（alpha<32）を消す。"""
    a = im.getchannel("A").point(lambda v: 0 if v < 32 else v)
    im.putalpha(a)
    return im


def place(im, size, pad):
    box = im.getbbox()
    if not box:
        raise SystemExit("本体が見つからない（全部透明になった）。--tol を下げる")
    im = im.crop(box)
    k = (size - pad * 2) / max(im.width, im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.alpha_composite(im, ((size - im.width) // 2, size - pad - im.height))
    return despill(clean(out))


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__); return
    mode = a.pop(0)
    tol = opt(a, "--tol", 48)
    pixel = opt(a, "--pixel", 1)
    if mode == "sprite":
        im = place(cut_bg(Image.open(a[0]), tol), 256, 8)
        if pixel > 1:
            n = 256 // pixel
            im = clean(im.resize((n, n), Image.LANCZOS)).resize((256, 256), Image.NEAREST)
            im = despill(im)
        im.save(a[1])
    elif mode == "deco":
        im = place(cut_bg(Image.open(a[0]), tol), 64, 2)
        if pixel > 1:
            n = 64 // pixel
            im = despill(clean(im.resize((n, n), Image.LANCZOS)).resize((64, 64), Image.NEAREST))
        im.save(a[1])
    elif mode == "tile":
        im = Image.open(a[0]).convert("RGBA")
        s = min(im.size)
        im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
        im = im.resize((64, 64), Image.LANCZOS)
        if pixel > 1:
            n = 64 // pixel
            im = im.resize((n, n), Image.LANCZOS).resize((64, 64), Image.NEAREST)
        im.save(a[1])
    elif mode == "sheet":
        out, files = a[0], a[1:]
        rows = (len(files) + 3) // 4
        sh = Image.new("RGBA", (256, 64 * rows), (0, 0, 0, 0))
        for i, f in enumerate(files):
            im = Image.open(f).convert("RGBA")
            if im.size != (64, 64):
                raise SystemExit(f"{f} が 64×64 ではない: {im.size}")
            sh.alpha_composite(im, (64 * (i % 4), 64 * (i // 4)))
        sh.save(out)
    elif mode == "check":
        for f in a:
            im = Image.open(f)
            al = im.convert("RGBA").getchannel("A")
            print(f, im.size, im.mode, "透明あり" if al.getextrema()[0] < 255 else "透明なし", "本体", im.convert("RGBA").getbbox())
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
