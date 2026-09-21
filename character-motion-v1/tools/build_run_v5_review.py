"""Package compact v5 previews and inspect original versus isolated leg art."""
from pathlib import Path
from shutil import copyfile
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'revision-v5'
OUT.mkdir(exist_ok=True)
for motion in ('walk', 'run'):
    copyfile(ROOT / f'players/warrior-{motion}.html', ROOT / f'players/warrior-{motion}-v5.html')
for direction in ('right', 'left'):
    frames = []
    for frame in range(8):
        page = Image.new('RGBA', (256, 342), '#e8e7e2')
        with Image.open(ROOT / 'exports/warrior/run' / direction / f'{frame:02}.png') as sprite:
            page.alpha_composite(sprite.convert('RGBA').resize((256, 342), Image.Resampling.LANCZOS))
        frames.append(page.convert('RGB'))
    frames[0].save(OUT / f'run-{direction}.gif', save_all=True, append_images=frames[1:], duration=80, loop=0, optimize=False)

page = Image.new('RGB', (640, 620), '#e8e7e2')
draw = ImageDraw.Draw(page)
for col, direction in enumerate(('right', 'left')):
    for row, version in enumerate(('v4', 'v5')):
        source = OUT / 'before' / f'{direction}-leg.png' if row == 0 else ROOT / 'parts/warrior' / direction / f'leg_{direction}.png'
        with Image.open(source) as sprite:
            crop = sprite.convert('RGBA').crop((120, 410, 280, 543)).resize((320, 266), Image.Resampling.NEAREST)
            page.paste(crop, (col * 320, row * 310 + 30), crop)
        draw.text((col * 320 + 10, row * 310 + 8), f'{version} / {direction} / one leg texture', fill='#28343d')
page.save(OUT / 'source-comparison.png')
print('Saved versioned v5 players, two running GIFs and source comparison.')
