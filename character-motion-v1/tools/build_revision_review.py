"""Assemble before/after review panels from rendered game frames."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
output = ROOT / "revision-v2"
output.mkdir(exist_ok=True)
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 18)
small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 14)
selections = [("walk", 0, "FRONT"), ("walk", 7, "DOWN LEFT"), ("run", 2, "RUN RIGHT"), ("walk", 4, "SHIELD / BACK")]
page = Image.new("RGB", (1536, 1094), "#252d39")
draw = ImageDraw.Draw(page)
for col, (motion, direction, title) in enumerate(selections):
    for row, version in enumerate(["before", "after"]):
        source_path = output / "before" / f"{motion}-overview.png" if row == 0 else ROOT / "exports/warrior" / f"{motion}-overview.png"
        with Image.open(source_path) as atlas:
            tile = atlas.crop((direction % 4 * 384, direction // 4 * 512, (direction % 4 + 1)*384, (direction // 4 + 1)*512))
        page.paste(tile, (col * 384, row * 547 + 35))
        # Cover the original direction label and replace it consistently.
        draw.rectangle((col*384, row*547, (col+1)*384, row*547+70), fill="#252d39")
        draw.text((col*384+15, row*547+12), title, fill="#e2e9ef", font=font)
        draw.text((col*384+15, row*547+39), version.upper(), fill="#a8b7c8" if row == 0 else "#c8e9ad", font=small)
page.save(output / "before-after.png")
print("Saved revision-v2/before-after.png")
