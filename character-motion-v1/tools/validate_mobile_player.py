"""Check the actual delivered mobile HTML, embedded images, links and size budgets."""
import base64
import hashlib
import json
import re
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def payload(path, element_id):
    html = path.read_text(encoding="utf-8")
    match = re.search(r'<script\s+type="application/json"\s+id="' + element_id + r'">(.*?)</script>', html, re.S)
    assert match, f"Missing embedded data: {path}"
    assert not re.search(r'<(?:script|link)[^>]+(?:src|href)\s*=', html, re.I), f"External dependency in {path}"
    return json.loads(match.group(1))


catalog = payload(ROOT / "player.html", "catalog-data")
report = json.loads((ROOT / "players/build-report.json").read_text(encoding="utf-8"))
manifest = json.loads((ROOT / "exports/manifest.json").read_text(encoding="utf-8"))
characters = [c["id"] for c in manifest["characters"]]
motions = [m["id"] for m in manifest["motions"]]
assert set(characters) == {"warrior", "scout", "witch", "sister", "generic"}
assert len(characters) == 5 and motions == ["walk", "run"]
expected = {f"{c}-{m}" for c in characters for m in motions}
assert len(catalog["pages"]) == len(expected)
assert catalog["revision"] == manifest["revision"] == 6
assert (ROOT / "player.html").stat().st_size <= 80_000
assert {f'{p["id"]}-{p["motion_id"]}' for p in catalog["pages"]} == expected
checked_tiles = 0
for entry in catalog["pages"]:
    path = ROOT / entry["href"]
    assert path.is_file()
    data = payload(path, "payload")
    assert data["characters"] == manifest["characters"] and data["motions"] == manifest["motions"]
    assert data["revision"] == manifest["revision"]
    for character in data["characters"]:
        assert (path.parent / f'{character["id"]}-{data["motion"]["id"]}-v{data["revision"]}.html').is_file()
    for motion in data["motions"]:
        assert (path.parent / f'{data["character"]["id"]}-{motion["id"]}-v{data["revision"]}.html').is_file()
    key = f'{data["character"]["id"]}-{data["motion"]["id"]}'
    assert key == f'{entry["id"]}-{entry["motion_id"]}'
    assert path.stat().st_size == entry["bytes"] <= 1_000_000
    assert data["frames_per_cycle"] == 8 and len(data["directions"]) == 8
    assert data["motion"]["frame_ms"] == (120 if entry["motion_id"] == "walk" else 80)
    assert data["sheet"].startswith("data:image/webp;base64,")
    sheet = Image.open(BytesIO(base64.b64decode(data["sheet"].split(",", 1)[1]))).convert("RGBA")
    assert sheet.size == (1536, 2048)
    for row in range(8):
        frames = set()
        for frame in range(8):
            tile = sheet.crop((frame * 192, row * 256, (frame + 1) * 192, (row + 1) * 256))
            assert tile.getchannel("A").getbbox(), f"Blank frame: {key}/{row}/{frame}"
            frames.add(hashlib.sha256(tile.tobytes()).hexdigest())
            checked_tiles += 1
        assert len(frames) == 8, f"Repeated frames: {key}/{row}"
    original = ROOT / "exports" / data["character"]["id"] / (data["motion"]["id"] + ".png")
    record = next(r for r in report["pages"] if r["id"] == key)
    assert path.read_bytes() == (ROOT / record["canonical_path"]).read_bytes(), f"Stale canonical page: {key}"
    assert hashlib.sha256(original.read_bytes()).hexdigest() == record["source_png_sha256"]
assert report["index_bytes"] == (ROOT / "player.html").stat().st_size
print(f"PASS: {len(expected)} standalone pages, {checked_tiles} nonempty distinct frames, valid character/motion links, source hashes, no external dependencies, all size budgets met.")
