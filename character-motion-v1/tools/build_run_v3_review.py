"""Assemble small GIFs from the exported running frames without altering art."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'revision-v3'
OUT.mkdir(exist_ok=True)
for direction in ('right', 'front', 'down_left'):
    frames = []
    for frame in range(8):
        page = Image.new('RGBA', (256, 342), '#252d39')
        ImageDraw.Draw(page).line((30, 314, 226, 314), fill='#3a4757', width=1)
        with Image.open(ROOT / 'exports/warrior/run' / direction / f'{frame:02}.png') as sprite:
            page.alpha_composite(sprite.convert('RGBA').resize((256, 342), Image.Resampling.LANCZOS))
        frames.append(page.convert('RGB'))
    frames[0].save(OUT / f'run-{direction}.gif', save_all=True, append_images=frames[1:], duration=80, loop=0, optimize=False)
print('Saved small v3 running GIFs.')
