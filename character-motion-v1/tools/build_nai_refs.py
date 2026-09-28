"""Reference pictures for NovelAI's precise reference, one pair per heroine, from her 8-direction sheet (art/).

  python3 tools/build_nai_refs.py

The front view is the top-left of the 2 x 4 sheet. From it:
  nai/ref/<char>-body.png  the whole figure, on white, 1024 x 1536 (NovelAI's portrait size, so nothing is padded)
  nai/ref/<char>-face.png  the head, on white, 1472 x 1472
On white, not transparent: the phone script pads with black, and a transparent picture would come out on black.
The healer is left out while she is held (see tools/build_nai_remaining.py).
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SHEETS = {'aria': 'art/warrior-source.png', 'scout': 'art/scout-source.png', 'mage': 'art/witch-source.png'}
OUT = os.path.join(ROOT, 'nai', 'ref')

def on_white(im):
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); return bg.convert('RGB')

def fit(im, W, H, margin=.06):
    """im (RGBA) scaled to fit W x H with a margin, centred, on white."""
    k = min(W * (1 - 2 * margin) / im.width, H * (1 - 2 * margin) / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    c = Image.new('RGBA', (W, H), (255, 255, 255, 255)); c.alpha_composite(im, ((W - im.width) // 2, (H - im.height) // 2))
    return c.convert('RGB')

def main():
    os.makedirs(OUT, exist_ok=True)
    for ch, p in SHEETS.items():
        sheet = Image.open(os.path.join(ROOT, p)).convert('RGBA')
        cell = sheet.crop((0, 0, sheet.width // 4, sheet.height // 2))
        a = np.asarray(cell)[..., 3] > 40
        # the figure: the largest piece (the sheet has stray specks and a red fringe)
        lab, n = ndimage.label(ndimage.binary_closing(a, iterations=3))
        big = lab == 1 + np.argmax(ndimage.sum(a, lab, range(1, n + 1)))
        ys, xs = np.where(big); fig = cell.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        fit(fig, 1024, 1536).save(os.path.join(OUT, f'{ch}-body.png'))
        # the head: the top of the figure (a chibi head is about 0.4 of her height), as a square
        h = int(fig.height * .42); cx = fig.width // 2; half = max(h, int(fig.width * .5)) // 2 + 10
        head = fig.crop((cx - half, 0, cx + half, 2 * half))
        fit(head, 1472, 1472, .04).save(os.path.join(OUT, f'{ch}-face.png'))
        print(ch, 'figure', fig.size)

if __name__ == '__main__': main()
