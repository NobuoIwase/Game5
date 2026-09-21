"""Assemble review previews from exported frames, without modifying artwork."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'revision-v6'
OUT.mkdir(exist_ok=True)

def frame(character, motion, direction, number):
    return Image.open(ROOT / 'exports' / character / motion / direction / f'{number:02}.png').convert('RGBA')

for character in ('warrior', 'witch', 'sister'):
    for direction in ('front', 'right', 'left'):
        frames = []
        for n in range(8):
            tile = frame(character, 'run', direction, n)
            page = Image.new('RGBA', tile.size, '#e9e7e2')
            page.alpha_composite(tile)
            frames.append(page.convert('RGB'))
        frames[0].save(OUT / f'{character}-run-{direction}.gif', save_all=True,
                       append_images=frames[1:], duration=80, loop=0, optimize=False)

preview = Image.new('RGBA', (1024, 704), '#e9e7e2')
draw = ImageDraw.Draw(preview)
for row, character in enumerate(('witch', 'sister')):
    for col, direction in enumerate(('front', 'right', 'back', 'left')):
        tile = frame(character, 'walk', direction, 0).resize((256, 341), Image.Resampling.LANCZOS)
        preview.alpha_composite(tile, (col*256, row*352))
        draw.text((col*256+12, row*352+12), f'{character} / {direction}', fill='#344653')
preview.convert('RGB').save(OUT / 'new-characters-preview.jpg', quality=94)

# Only completed native exports are used; contact sheets retain the native scale.
for character in ('warrior', 'witch', 'sister'):
    for direction in ('right', 'left'):
        sheet = Image.new('RGBA', (384*8, 512*2), '#e9e7e2')
        draw = ImageDraw.Draw(sheet)
        for row, motion in enumerate(('walk', 'run')):
            for n in range(8):
                sheet.alpha_composite(frame(character, motion, direction, n), (n*384, row*512))
                draw.text((n*384+12, row*512+12), f'{character} {direction} {motion} {n+1}', fill='#344653')
        sheet.convert('RGB').save(OUT / f'{character}-{direction}-all-frames.jpg', quality=94)
print('v6 native-frame review previews ready')
