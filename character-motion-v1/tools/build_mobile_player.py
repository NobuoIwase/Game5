"""Build six small, self-contained animation pages and a thumbnail index."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
from io import BytesIO
from pathlib import Path

from PIL import Image

ORIGINAL_BUNDLED_BYTES = 34_550_379
DIRECTIONS = ["front", "down_right", "right", "up_right", "back", "up_left", "left", "down_left"]
LABELS = ["正面", "右斜め前", "右", "右斜め後ろ", "後ろ", "左斜め後ろ", "左", "左斜め前"]
FRAME_SIZE = (192, 256)
MAX_PAGE_BYTES = 1_000_000
MAX_INDEX_BYTES = 80_000


def encode_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


def data_url(image: Image.Image, *, quality: int = 82, lossless: bool = False) -> tuple[str, int]:
    stream = BytesIO()
    image.save(stream, format="WEBP", quality=quality, lossless=lossless, method=6)
    encoded = stream.getvalue()
    return "data:image/webp;base64," + base64.b64encode(encoded).decode("ascii"), len(encoded)


def build(root: Path) -> dict:
    root = root.resolve()
    manifest = json.loads((root / "exports/manifest.json").read_text(encoding="utf-8-sig"))
    if manifest["directions"] != DIRECTIONS or manifest["frames_per_cycle"] != 8:
        raise ValueError("Expected the established 8-direction, 8-frame layout")
    expected_source_size = (manifest["frame_width"] * 8, manifest["frame_height"] * 8)
    player_template = (root / "tools/mobile-player-template.html").read_text(encoding="utf-8")
    index_template = (root / "tools/mobile-index-template.html").read_text(encoding="utf-8")
    if player_template.count("__PAYLOAD_JSON__") != 1 or index_template.count("__CATALOG_JSON__") != 1:
        raise ValueError("Each template must contain exactly one payload marker")
    output_dir = root / "players"
    output_dir.mkdir(exist_ok=True)
    pages, records = [], []
    for character in manifest["characters"]:
        for motion in manifest["motions"]:
            char_id, motion_id = character["id"], motion["id"]
            source_path = root / "exports" / char_id / f"{motion_id}.png"
            with Image.open(source_path) as source:
                if source.size != expected_source_size:
                    raise ValueError(f"Unexpected sheet dimensions: {source_path}")
                sheet = source.convert("RGBA").resize(
                    (FRAME_SIZE[0] * 8, FRAME_SIZE[1] * 8),
                    Image.Resampling.NEAREST if char_id == "generic" else Image.Resampling.LANCZOS,
                )
            encoded_sheet, webp_bytes = data_url(sheet, lossless=char_id == "generic")
            payload = {
                "character": character, "motion": motion,
                "frame_width": FRAME_SIZE[0], "frame_height": FRAME_SIZE[1],
                "frames_per_cycle": 8, "directions": DIRECTIONS,
                "directionLabels": LABELS, "sheet": encoded_sheet,
            }
            page_id = f"{char_id}-{motion_id}"
            page_path = output_dir / f"{page_id}.html"
            page = player_template.replace("__PAYLOAD_JSON__", encode_json(payload))
            page_bytes = len(page.encode("utf-8"))
            if page_bytes > MAX_PAGE_BYTES:
                raise ValueError(f"Mobile page exceeds 1 MB budget: {page_id}: {page_bytes}")
            page_path.write_text(page, encoding="utf-8", newline="\n")
            thumbnail = sheet.crop((0, 0, *FRAME_SIZE)).resize((72, 96), Image.Resampling.LANCZOS)
            thumbnail_url, _ = data_url(thumbnail, quality=68)
            entry = {
                "id": char_id, "label": character["label"],
                "motion_id": motion_id, "motion_label": motion["label"],
                "href": f"players/{page_id}.html", "bytes": page_bytes,
                "thumbnail": thumbnail_url,
            }
            pages.append(entry)
            records.append({
                "id": page_id, "path": entry["href"], "bytes": page_bytes,
                "webp_bytes": webp_bytes, "sheet_size": list(sheet.size),
                "source_png_sha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
                "original_source_bytes": source_path.stat().st_size,
            })
    catalog = {"pages": pages, "original_bytes": ORIGINAL_BUNDLED_BYTES}
    index = index_template.replace("__CATALOG_JSON__", encode_json(catalog))
    index_bytes = len(index.encode("utf-8"))
    if index_bytes > MAX_INDEX_BYTES:
        raise ValueError(f"Index exceeds 80 KB budget: {index_bytes}")
    (root / "player.html").write_text(index, encoding="utf-8", newline="\n")
    report = {
        "schema": "game5-mobile-player/1.0", "original_bundled_bytes": ORIGINAL_BUNDLED_BYTES,
        "index_bytes": index_bytes, "preview_frame_size": list(FRAME_SIZE),
        "pages": records, "total_page_bytes": sum(p["bytes"] for p in records),
        "largest_page_bytes": max(p["bytes"] for p in records),
        "format": "One embedded WebP sprite sheet per standalone HTML page; no network dependencies",
        "original_pngs_unchanged": True,
    }
    (output_dir / "build-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", type=Path, default=Path(__file__).resolve().parents[1])
    build(parser.parse_args().root)
