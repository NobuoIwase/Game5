"""Verify that the sister-only revision preserves the other characters' art."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]


def payload(path):
    text = path.read_text(encoding="utf-8")
    match = re.search(r'<script type="application/json" id="payload">(.*?)</script>', text, re.S)
    if not match:
        raise ValueError(f"No player payload: {path}")
    return json.loads(match.group(1))


def main():
    baseline = json.loads((ROOT / "revision-v7/unchanged-sheet-hashes.json").read_text(encoding="utf-8-sig"))
    verified = []
    for record in baseline:
        path = ROOT / record["path"]
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != record["sha256"]:
            raise ValueError(f"Unrelated native art changed: {path}")
        character, motion = path.parent.name, path.stem
        old = payload(ROOT / f"players/{character}-{motion}-v6.html")
        new = payload(ROOT / f"players/{character}-{motion}-v7.html")
        if old["sheet"] != new["sheet"]:
            raise ValueError(f"Unrelated mobile art changed: {character}/{motion}")
        verified.append(record)
    for motion in ("walk", "run"):
        old = payload(ROOT / f"players/sister-{motion}-v6.html")
        new = payload(ROOT / f"players/sister-{motion}-v7.html")
        if old["sheet"] == new["sheet"]:
            raise ValueError(f"Sister still uses the old costume: {motion}")
    report = {"pass": True, "unchanged_native_sheets": verified,
              "unchanged_mobile_sheets": len(verified), "updated_sister_mobile_sheets": 2}
    (ROOT / "revision-v7/preservation-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"PASS: {len(verified)} unchanged native and mobile sheets; sister walk/run updated")


if __name__ == "__main__":
    main()
