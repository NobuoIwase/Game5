"""Pack the two image-generated replacement views into the existing atlas grid."""
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parents[1]
original = Image.open(root / "art/warrior-body.png").convert("RGBA")
replacements = Image.open(root / "art/warrior-front-downleft-v2-source.png").convert("RGBA")
cell = (362, 543)
assert original.size == (cell[0] * 4, cell[1] * 2)
result = original.copy()
records = []
for index, direction, slot in [(0, "front", 0), (1, "down_left", 7)]:
    raw = replacements.crop((index * replacements.width // 2, 0, (index + 1) * replacements.width // 2, replacements.height))
    bounds = raw.getchannel("A").point(lambda alpha: 255 if alpha > 32 else 0).getbbox()
    x0, y0, x1, y1 = bounds
    bounds = (max(0, x0-2), max(0, y0-2), min(raw.width, x1+2), min(raw.height, y1+2))
    figure = raw.crop(bounds)
    scale = 523 / figure.height
    packed = figure.resize((round(figure.width * scale), 523), Image.Resampling.LANCZOS)
    surface = Image.new("RGBA", cell)
    offset = ((cell[0] - packed.width) // 2, 12)
    surface.alpha_composite(packed, offset)
    target = (slot % 4 * cell[0], slot // 4 * cell[1])
    result.paste(surface, target)
    surface.save(root / "art" / f"warrior-{direction}-body-v2.png")
    records.append({"direction": direction, "generated_source_bounds": bounds, "packed_offset": offset, "packed_size": packed.size})
result.save(root / "art/warrior-body-v2.png")
for slot in range(8):
    if slot in [0, 7]:
        continue
    rect = (slot % 4 * cell[0], slot // 4 * cell[1], (slot % 4+1)*cell[0], (slot // 4+1)*cell[1])
    assert original.crop(rect).tobytes() == result.crop(rect).tobytes()
(root / "art/warrior-body-v2-layout.json").write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
print("Packed front and down_left; the other six cells are byte-identical.")
