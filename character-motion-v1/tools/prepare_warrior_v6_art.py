"""Pack generated single-leg artwork into the existing native joint coordinate space.

This only crops, scales and positions generated pixels; it does not paint artwork.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art/warrior-profile-v6-complete-source.png'

def main():
    source = Image.open(SOURCE).convert('RGBA')
    open_source = Image.open(ROOT / 'art/warrior-profile-v6-open-source.png').convert('RGBA')
    definitions = [('right', (159, 319, 258, 538)), ('left', (135, 317, 224, 528))]
    manifest = {'schema': 'game5-generated-single-leg-texture/1', 'coordinates': [362, 543],
                'notes': ['Independently redrawn profile textures. One connected leg and one boot per texture.',
                          'Original anatomy polygons still erase both stationary legs from the body.',
                          'Artwork is cropped/resized into native coordinates; no painting or horizontal reflection.'], 'views': {}}
    placements = []
    comparison = Image.new('RGB', (720, 590), '#e9e7e2')
    labels = ImageDraw.Draw(comparison)
    for n, (direction, target) in enumerate(definitions):
        half = source.crop((n * source.width // 2, 0, (n+1) * source.width // 2, source.height))
        # Ignore virtually invisible alpha speckles when choosing the crop bounds;
        # preserve the actual generated alpha pixels during packing.
        bounds = half.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        if direction == 'left':
            # The revised texture continues into the torso. Preserve the boot's
            # original scale/position while retaining the extra skin overlap above.
            original_bounds = bounds
            half = open_source.crop((open_source.width//2, 0, open_source.width, open_source.height))
            bounds = (original_bounds[0], 0, original_bounds[2], original_bounds[3])
            extra = round(original_bounds[1] * (target[3]-target[1]) / (original_bounds[3]-original_bounds[1]))
            target = (target[0], target[1]-extra, target[2], target[3])
        packed = half.crop(bounds).resize((target[2]-target[0], target[3]-target[1]), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (362, 543))
        canvas.alpha_composite(packed, target[:2])
        name = f'art/warrior-{direction}-leg-v6.png'
        canvas.save(ROOT / name)
        # Samples cover the metal shin, primary toe and former stray second foot.
        opaque = [[187, 481], [215, 527]] if direction == 'right' else [[200, 475], [163, 518]]
        transparent = [[235, 491], [252, 522]] if direction == 'right' else [[146, 488], [133, 495]]
        manifest['views'][direction] = {'textureSource': name, 'opaquePoints': opaque, 'transparentPoints': transparent}
        if direction == 'left':
            manifest['views'][direction]['openHipTop'] = 317
        placements.append({'direction': direction, 'source': 'art/warrior-profile-v6-open-source.png' if direction == 'left' else 'art/warrior-profile-v6-complete-source.png', 'sourceHalfBounds': list(bounds), 'nativeBounds': list(target)})
        zoom = canvas.crop((125, 390, 265, 543)).resize((350, 383), Image.Resampling.LANCZOS)
        comparison.paste(zoom, (n*360+5, 75), zoom)
        labels.text((n*360+15, 35), f'{direction} / v6 redrawn single boot', fill='#24313a')
    (ROOT / 'rigs/warrior-run-v6-legs.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    (ROOT / 'art/warrior-profile-v6-layout.json').write_text(json.dumps(placements, indent=2)+'\n', encoding='utf-8')
    (ROOT / 'revision-v6').mkdir(exist_ok=True)
    comparison.save(ROOT / 'revision-v6/warrior-clean-boots.png')
    print(json.dumps(placements))

if __name__ == '__main__':
    main()
