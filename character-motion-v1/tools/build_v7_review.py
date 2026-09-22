"""Build sister v7 review assets from native exports without altering source PNGs."""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DIRS = ("front","down_right","right","up_right","back","up_left","left","down_left")
CARDINALS = ("front","right","back","left")
MOTIONS = {"walk": 120, "run": 80}
SIZE, HEADER, PAPER, INK = (384,512), 28, "#e9e7e2", "#344653"

def build(before_dir: Path, output: Path) -> dict:
    manifest = json.loads((ROOT/"exports/manifest.json").read_text(encoding="utf-8-sig"))
    if manifest.get("revision") != 7 or manifest.get("character_revisions",{}).get("sister") != {"walk":7,"run":7}:
        raise ValueError("Render sister v7 and update the manifest before building the v7 review")

    inputs, outputs, current = {}, [], {}
    def read(path: Path) -> Image.Image:
        with Image.open(path) as im:
            if im.size != SIZE or im.mode != "RGBA":
                raise ValueError(f"Expected native 384x512 RGBA frame: {path}")
            copy = im.copy()
        inputs[path.resolve().relative_to(ROOT).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
        return copy

    # Validate all 128 current frames up front so stale/partial exports cannot produce a mixed review.
    for motion in MOTIONS:
        for direction in DIRS:
            for n in range(8):
                path = ROOT/"exports/sister"/motion/direction/f"{n:02}.png"
                current[motion,direction,n] = read(path)
    previous = {d: read(before_dir/"walk"/d/"00.png") for d in CARDINALS}
    output.mkdir(parents=True, exist_ok=True)

    def paper(im: Image.Image) -> Image.Image:
        page = Image.new("RGBA", SIZE, PAPER); page.alpha_composite(im)
        return page.convert("RGB")
    def save_png(page: Image.Image, name: str) -> None:
        page.convert("RGB").save(output/name); outputs.append(name)

    # Review every delivered direction in motion. This exposes direction-specific staff/hand,
    # hairpin-side and long-cloth overlap issues that three cardinal run GIFs cannot catch.
    for motion, duration in MOTIONS.items():
        for direction in DIRS:
            frames = [paper(current[motion,direction,n]) for n in range(8)]
            name = f"sister-{motion}-{direction}.gif"
            frames[0].save(output/name, save_all=True, append_images=frames[1:],
                           duration=duration, loop=0, optimize=False)
            outputs.append(name)

    for motion in MOTIONS:
        page = Image.new("RGBA", (SIZE[0]*4,(SIZE[1]+HEADER)*2), PAPER)
        draw = ImageDraw.Draw(page)
        for i,direction in enumerate(DIRS):
            x,y=(i%4)*SIZE[0],(i//4)*(SIZE[1]+HEADER)
            draw.text((x+12,y+8), f"v7 / {motion} / {direction} / frame 01", fill=INK)
            page.alpha_composite(current[motion,direction,0], (x,y+HEADER))
        save_png(page, f"sister-{motion}-eight-directions.png")

    page = Image.new("RGBA", (SIZE[0]*4,(SIZE[1]+HEADER)*2), PAPER)
    draw = ImageDraw.Draw(page)
    for row,rev in enumerate((6,7)):
        for col,direction in enumerate(CARDINALS):
            x,y=col*SIZE[0],row*(SIZE[1]+HEADER)
            draw.text((x+12,y+8), f"v{rev} / walk / {direction} / frame 01", fill=INK)
            im = previous[direction] if rev == 6 else current["walk",direction,0]
            page.alpha_composite(im, (x,y+HEADER))
    save_png(page, "sister-before-after.png")

    report = {
        "schema":"game5-v7-review/1.1", "character":"sister", "revision":7,
        "frame_size":list(SIZE), "motion_frame_ms":MOTIONS,
        "animated_directions":list(DIRS), "animated_motions":list(MOTIONS),
        "method":"Native RGBA exports composited on a light background; no artwork repainting or deformation",
        "input_sha256":inputs, "outputs":outputs,
    }
    (output/"review-build-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"v7 review ready: {len(outputs)} previews from {len(inputs)} native frames; all 8 directions animated for walk and run")
    return report

if __name__ == "__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--before-dir", type=Path, default=ROOT/"revision-v7/before-v6")
    p.add_argument("--output", type=Path, default=ROOT/"revision-v7")
    a=p.parse_args(); build(a.before_dir.resolve(), a.output.resolve())
