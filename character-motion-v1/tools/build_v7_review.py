"""Assemble sister v7 review images from native exports; preserve all source PNGs."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DIRECTIONS = ("front", "down_right", "right", "up_right", "back", "up_left", "left", "down_left")
COMPARISON_DIRECTIONS = ("front", "right", "back", "left")
SIZE = (384, 512)
HEADER = 28
PAPER = "#e9e7e2"
INK = "#344653"


def build(before_dir: Path, output: Path) -> dict:
    manifest = json.loads((ROOT / "exports/manifest.json").read_text(encoding="utf-8-sig"))
    if manifest.get("revision") != 7 or manifest.get("character_revisions", {}).get("sister") != {"walk": 7, "run": 7}:
        raise ValueError("Render sister v7 and update its manifest revision before building the v7 review")
    inputs = {}
    outputs = []

    def read_frame(path: Path) -> Image.Image:
        with Image.open(path) as source:
            if source.size != SIZE or source.mode != "RGBA":
                raise ValueError(f"Expected native 384x512 RGBA frame: {path}")
            tile = source.copy()
        inputs[path.resolve().relative_to(ROOT).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
        return tile

    def frame(motion: str, direction: str, number: int) -> Image.Image:
        return read_frame(ROOT / "exports/sister" / motion / direction / f"{number:02}.png")

    # Load every input before writing any review image, so missing exports do
    # not leave a mixture of old and new comparison artifacts.
    current = {(m, d, n): frame(m, d, n)
               for m in ("walk", "run") for d in DIRECTIONS
               for n in (range(8) if m == "run" and d in ("front", "right", "left") else (0,))}
    previous = {d: read_frame(before_dir / "walk" / d / "00.png") for d in COMPARISON_DIRECTIONS}
    output.mkdir(parents=True, exist_ok=True)

    def save_png(page: Image.Image, name: str) -> None:
        page.convert("RGB").save(output / name)
        outputs.append(name)

    for direction in ("front", "right", "left"):
        frames = []
        for n in range(8):
            page = Image.new("RGBA", SIZE, PAPER)
            page.alpha_composite(current["run", direction, n])
            frames.append(page.convert("RGB"))
        name = f"sister-run-{direction}.gif"
        frames[0].save(output / name, save_all=True, append_images=frames[1:], duration=80, loop=0, optimize=False)
        outputs.append(name)

    # Each tile is pasted at its native size. Labels occupy a separate header
    # rather than covering the character, staff, or feet.
    for motion in ("walk", "run"):
        page = Image.new("RGBA", (SIZE[0] * 4, (SIZE[1] + HEADER) * 2), PAPER)
        draw = ImageDraw.Draw(page)
        for i, direction in enumerate(DIRECTIONS):
            x, y = (i % 4) * SIZE[0], (i // 4) * (SIZE[1] + HEADER)
            draw.text((x + 12, y + 8), f"v7 / {motion} / {direction} / frame 01", fill=INK)
            page.alpha_composite(current[motion, direction, 0], (x, y + HEADER))
        save_png(page, f"sister-{motion}-eight-directions.png")

    comparison = Image.new("RGBA", (SIZE[0] * 4, (SIZE[1] + HEADER) * 2), PAPER)
    draw = ImageDraw.Draw(comparison)
    for row, revision in enumerate((6, 7)):
        for col, direction in enumerate(COMPARISON_DIRECTIONS):
            x, y = col * SIZE[0], row * (SIZE[1] + HEADER)
            draw.text((x + 12, y + 8), f"v{revision} / walk / {direction} / frame 01", fill=INK)
            comparison.alpha_composite(previous[direction] if revision == 6 else current["walk", direction, 0], (x, y + HEADER))
    save_png(comparison, "sister-before-after.png")

    report = {"schema": "game5-v7-review/1.0", "character": "sister", "revision": 7,
              "frame_size": list(SIZE), "run_frame_ms": 80,
              "method": "Native RGBA exports composited on a light background; no artwork repainting or deformation",
              "input_sha256": inputs, "outputs": outputs}
    (output / "review-build-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"v7 review ready: {len(outputs)} previews from {len(inputs)} native frames; source PNGs unchanged")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--before-dir", type=Path, default=ROOT / "revision-v7/before-v6")
    parser.add_argument("--output", type=Path, default=ROOT / "revision-v7")
    args = parser.parse_args()
    build(args.before_dir.resolve(), args.output.resolve())
