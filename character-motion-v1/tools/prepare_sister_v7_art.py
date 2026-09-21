"""Resize the edited atlas to the existing native grid; no drawing or reflection."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'art/sister-costume-v7-generated.png'
image = Image.open(source).convert('RGBA')
atlas = image.resize((2048, 1024), Image.Resampling.LANCZOS)
atlas.save(ROOT / 'art/sister-source-v7.png')
record = {
    'source': str(source.relative_to(ROOT)).replace('\\', '/'),
    'source_size': list(image.size), 'output': 'art/sister-source-v7.png',
    'size': [2048, 1024], 'cell': [512, 512], 'grid': [4, 2],
    'directions': ['front', 'down_right', 'right', 'up_right', 'back', 'up_left', 'left', 'down_left'],
    'operation': 'full-atlas Lanczos resize, preserving generated alpha; no reflection or repainting',
    'edit_target': 'art/sister-source.png',
    'design_reference': 'references/sister-reference.jpg',
    'prompt': 'art/sister-costume-v7-prompt.txt',
    'mode': 'built-in image_gen',
}
(ROOT / 'art/sister-v7-layout.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Saved sister-source-v7.png: 2048 x 1024 RGBA, unchanged eight-cell arrangement')
