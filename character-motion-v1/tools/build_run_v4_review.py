"""Assemble before/after inspections and compact GIFs from exported frames."""
from pathlib import Path
from shutil import copyfile
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'revision-v4'
OUT.mkdir(exist_ok=True)
# A distinct download name makes the corrected phone file easy to identify.
copyfile(ROOT / 'players/warrior-run.html', ROOT / 'players/warrior-run-v4.html')
for direction in ('right', 'front', 'back', 'up_left', 'down_left'):
    frames = []
    for frame in range(8):
        page = Image.new('RGBA', (256, 342), '#e8e7e2')
        with Image.open(ROOT / 'exports/warrior/run' / direction / f'{frame:02}.png') as sprite:
            page.alpha_composite(sprite.convert('RGBA').resize((256, 342), Image.Resampling.LANCZOS))
        frames.append(page.convert('RGB'))
    frames[0].save(OUT / f'run-{direction}.gif', save_all=True, append_images=frames[1:], duration=80, loop=0, optimize=False)

cases = [('right', 5), ('left', 5), ('up_left', 2), ('back', 5)]
page = Image.new('RGB', (960, 464), '#e8e7e2')
draw = ImageDraw.Draw(page)
for col, (direction, frame) in enumerate(cases):
    for row, version in enumerate(('v3', 'v4')):
        folder = ROOT / ('reviews/run-v3-final/warrior/run' if version == 'v3' else 'exports/warrior/run')
        with Image.open(folder / direction / f'{frame:02}.png') as sprite:
            crop = sprite.convert('RGBA').crop((72, 300, 312, 500))
            page.paste(crop, (col * 240, row * 232 + 32), crop)
        draw.text((col * 240 + 8, row * 232 + 9), f'{version} / {direction} / frame {frame+1}', fill='#28343d')
page.save(OUT / 'joint-comparison.png')
print('Saved v4 compact GIFs and before/after inspection.')
