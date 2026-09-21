#!/usr/bin/env python3
"""Build a self-contained, file://-safe eight-direction animation viewer.

Only Python's standard library is required. Run after the PNG sheets and
exports/manifest.json have been exported. The generated player embeds its
artwork and metadata, so it can be copied or opened without a web server.
"""

from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path
import struct


DIRECTIONS = [
    "front", "down_right", "right", "up_right", "back", "up_left", "left", "down_left"
]
DIRECTION_LABELS = ["正面", "右斜め前", "右", "右斜め後ろ", "背面", "左斜め後ろ", "左", "左斜め前"]


def png_size(data: bytes) -> tuple[int, int]:
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise ValueError("Not a PNG with an IHDR header")
    return struct.unpack(">II", data[16:24])


def make_payload(root: Path) -> dict:
    manifest_path = root / "exports" / "manifest.json"
    metadata = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    metadata.setdefault("frame_width", 384)
    metadata.setdefault("frame_height", 512)
    metadata.setdefault("frames_per_cycle", 8)
    metadata.setdefault("directions", DIRECTIONS)
    metadata.setdefault("characters", [{"id": "warrior", "label": "戦士"}, {"id": "scout", "label": "斥候"}])
    metadata.setdefault("motions", [{"id": "walk", "label": "歩行", "frame_ms": 120}, {"id": "run", "label": "走行", "frame_ms": 80}])
    direction_ids = [d.get("id") if isinstance(d, dict) else d for d in metadata["directions"]]
    if direction_ids != DIRECTIONS:
        raise ValueError("Direction rows must be: " + ", ".join(DIRECTIONS))
    if metadata["frames_per_cycle"] != 8:
        raise ValueError("This player expects eight animation frames")
    expected = (metadata["frame_width"] * 8, metadata["frame_height"] * 8)
    sheets = {}
    for character in metadata["characters"]:
        character_id = character["id"]
        sheets[character_id] = {}
        for motion in metadata["motions"]:
            motion_id = motion["id"]
            path = root / "exports" / character_id / f"{motion_id}.png"
            png = path.read_bytes()
            actual = png_size(png)
            if actual != expected:
                raise ValueError(f"{path}: expected {expected}, got {actual}")
            sheets[character_id][motion_id] = "data:image/png;base64," + base64.b64encode(png).decode("ascii")
    return {"manifest": metadata, "sheets": sheets, "directionLabels": DIRECTION_LABELS}


HTML = r'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>8方向モーション | Character Motion Study</title>
<style>
:root{font-family:"Yu Gothic UI","Hiragino Kaku Gothic ProN",Meiryo,sans-serif;color:#eef0ec;background:#0b1012;font-synthesis:none;--muted:#98a8ae;--line:#2d3b40;--accent:#c8eaad;--surface:#151e22;--stage:#202c32}
*{box-sizing:border-box}body{margin:0}button,input,select{font:inherit}button,a,input,select{-webkit-tap-highlight-color:transparent}button,select{color:inherit}button,a,select,input{outline-offset:5px}button{cursor:pointer}button:disabled{cursor:wait;opacity:.5}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}.page{max-width:1500px;margin:0 auto;padding:42px 48px 30px}.top{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}.eyebrow{color:var(--accent);font-size:11px;letter-spacing:.19em;font-weight:700;text-transform:uppercase;margin:0 0 12px}.title{font-size:clamp(27px,3.2vw,42px);letter-spacing:.035em;line-height:1.35;font-weight:600;margin:0}.sub{color:var(--muted);font-size:13px;line-height:1.9;margin:12px 0 0}.edition{display:flex;align-items:center;gap:9px;border:1px solid var(--line);border-radius:30px;padding:8px 13px;color:#bdc9ce;font-size:11px;white-space:nowrap;margin-top:4px}.dot{width:6px;height:6px;border-radius:50%;background:var(--accent)}.controls{border:1px solid var(--line);background:#11191d;border-radius:16px;padding:18px 20px;margin:30px 0 20px;display:flex;gap:24px;align-items:center;flex-wrap:wrap}.field{display:flex;flex-direction:column;gap:8px}.field-label{font-size:10px;color:var(--muted);letter-spacing:.12em}.segmented{display:flex;gap:3px;background:#202c31;border:1px solid #344247;padding:3px;border-radius:9px}.segmented button{border:0;background:transparent;color:#aabbc1;font-size:12px;padding:9px 15px;border-radius:6px;white-space:nowrap}.segmented button.active{background:var(--accent);color:#18211d;font-weight:700}.controls-divider{height:48px;border-left:1px solid var(--line)}.select{background:#202c31;border:1px solid #344247;border-radius:8px;font-size:12px;padding:10px 26px 10px 12px;min-height:39px}.zoom-row{display:flex;align-items:center;gap:10px;min-height:39px}.zoom-row input{width:90px;accent-color:var(--accent)}.zoom-value{font:11px ui-monospace,Consolas,monospace;color:#c6d2d6;width:40px}.theme{margin-left:auto}.theme-toggle{border:1px solid #344247;background:#202c31;border-radius:8px;min-height:39px;min-width:92px;font-size:12px;padding:8px 12px}.grid-header{display:flex;justify-content:space-between;gap:16px;align-items:center;margin:26px 0 12px}.grid-header h2{font-size:14px;letter-spacing:.045em;font-weight:600;margin:0}.grid-note{font-size:11px;color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.card{border:1px solid var(--line);border-radius:13px;overflow:hidden;background:var(--surface)}.card-top{display:flex;justify-content:space-between;align-items:center;padding:13px 15px 0;position:relative;z-index:1}.card-label{font-size:12px;color:#d6e0e3}.dir-code{font:10px ui-monospace,Consolas,monospace;letter-spacing:.10em;color:#7e979f}.stage{height:clamp(185px,21vw,285px);position:relative;overflow:hidden;background:radial-gradient(ellipse at 50% 60%,#293b43 0,transparent 60%);margin-top:2px}.stage::after{content:"";position:absolute;width:56%;height:13%;left:22%;bottom:8%;border:1px solid #3f525a70;border-radius:50%;pointer-events:none}.stage canvas{display:block;width:100%;height:100%;position:relative;z-index:1}.stage.light{background-color:#e1e5e2;background-image:linear-gradient(45deg,#d4dbd6 25%,transparent 25%),linear-gradient(-45deg,#d4dbd6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d4dbd6 75%),linear-gradient(-45deg,transparent 75%,#d4dbd6 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0}.stage.light::after{border-color:#7b8d8140}.card-bottom{display:flex;justify-content:space-between;padding:9px 15px 11px;font-size:10px;color:#849ba4;border-top:1px solid #293940}.card-count{font-family:ui-monospace,Consolas,monospace}.timeline{border:1px solid var(--line);border-radius:13px;margin-top:16px;background:#111a1e;display:flex;gap:20px;align-items:center;padding:17px 20px;flex-wrap:wrap}.playback{display:flex;align-items:center;gap:6px}.icon-btn{border:1px solid #38494f;background:#202d32;border-radius:8px;height:38px;width:38px;display:grid;place-items:center;font-size:13px}.play-btn{width:96px;background:var(--accent);border:1px solid var(--accent);color:#172218;gap:7px;display:flex;justify-content:center;font-size:12px;font-weight:700}.frames{display:flex;gap:7px;flex:1;min-width:180px}.frame-btn{height:34px;flex:1;min-width:18px;border:1px solid #34464e;background:#1f2b30;border-radius:5px;color:#8098a2;font:11px ui-monospace,Consolas,monospace}.frame-btn.active{border-color:var(--accent);background:#c8eaad20;color:var(--accent)}.time-readout{color:#b7c9d0;font:12px ui-monospace,Consolas,monospace;white-space:nowrap}.keys{font-size:10px;color:#8298a2;white-space:nowrap}.lower{display:grid;grid-template-columns:1.05fr 1fr;gap:40px;margin-top:25px}.note-title{font-size:11px;color:#c2d2d8;letter-spacing:.07em;margin:0 0 8px}.note-copy{font-size:11px;color:var(--muted);line-height:1.85;margin:0}.downloads{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.download{border:1px solid #33474e;border-radius:7px;padding:8px 11px;font-size:11px;color:#c6d8de;display:inline-flex;gap:7px;align-items:center}.download:hover{background:#22323a;text-decoration:none;border-color:#698578}.footer{border-top:1px solid #26383f;margin-top:27px;padding-top:17px;display:flex;justify-content:space-between;gap:16px;font-size:10px;letter-spacing:.07em;color:#697f89}.loading{color:var(--muted);font-size:12px;min-height:18px}.loading:empty{display:none}.error{color:#ffb5a9;font-size:13px;line-height:1.7;background:#461e21;padding:12px;border-radius:8px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(min-width:1500px){.stage{height:285px}}@media(max-width:1050px){.page{padding:32px 26px 24px}.controls{gap:18px}.controls-divider{display:none}.theme{margin-left:0}.keys{display:none}.timeline{gap:14px}}@media(max-width:720px){.page{padding:24px 15px 20px}.top{gap:10px}.edition{font-size:9px;padding:7px 9px}.eyebrow{font-size:9px;letter-spacing:.14em}.sub{font-size:11px}.controls{margin-top:23px;padding:15px;gap:16px}.segmented button{padding:9px 13px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.grid-note{font-size:10px}.grid-header h2{font-size:12px}.stage{height:240px}.card-top{padding:11px 12px 0}.card-bottom{padding:8px 12px}.timeline{padding:13px 12px;gap:12px}.frames{order:3;flex-basis:100%}.time-readout{margin-left:auto}.lower{grid-template-columns:1fr;gap:22px}.footer{line-height:1.6;font-size:9px}.zoom-row input{width:80px}}@media(max-width:420px){.stage{height:205px}.edition{display:none}.grid-note{display:none}.frame-btn{height:30px}.controls{gap:13px}.select{padding-right:14px}.field-label{font-size:9px}.theme-toggle{min-width:76px}.card-label{font-size:11px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style>
</head>
<body>
<main class="page">
  <header class="top"><div><p class="eyebrow">Game5 / Character motion study</p><h1 class="title">8方向モーション</h1><p class="sub">キャラクターの歩行・走行を、8つの角度から。<br>同じコマを並べて、動きと装備の見え方を確認できます。</p></div><div class="edition"><span class="dot"></span>最初のプロトタイプ · v1</div></header>
  <section class="controls" aria-label="表示設定">
    <div class="field"><span class="field-label" id="character-label">CHARACTER / キャラクター</span><div class="segmented" id="characters" role="group" aria-labelledby="character-label"></div></div>
    <div class="controls-divider" aria-hidden="true"></div>
    <div class="field"><span class="field-label" id="motion-label">MOTION / モーション</span><div class="segmented" id="motions" role="group" aria-labelledby="motion-label"></div></div>
    <div class="field"><label class="field-label" for="speed">SPEED / 再生速度</label><select class="select" id="speed"><option value="0.5">0.5 ×</option><option value="0.75">0.75 ×</option><option value="1" selected>1.0 ×</option><option value="1.5">1.5 ×</option><option value="2">2.0 ×</option></select></div>
    <div class="field"><label class="field-label" for="zoom">SCALE / 表示倍率</label><div class="zoom-row"><input id="zoom" type="range" min="0.65" max="1.35" step="0.05" value="1"><output class="zoom-value" id="zoom-value" for="zoom">100%</output></div></div>
    <div class="field theme"><span class="field-label">BACKGROUND / 背景</span><button type="button" class="theme-toggle" id="background" aria-pressed="false">明るくする</button></div>
  </section>
  <div class="loading" id="loading" role="status" aria-live="polite">モーションを読み込み中…</div>
  <section aria-labelledby="grid-heading"><div class="grid-header"><h2 id="grid-heading">8 DIRECTION VIEWS</h2><span class="grid-note">8方向 × 8コマ / 透過PNG</span></div><div class="grid" id="grid"></div></section>
  <section class="timeline" aria-label="再生コントロール">
    <div class="playback"><button type="button" class="icon-btn" id="prev" aria-label="前のコマ" title="前のコマ（←）">‹</button><button type="button" class="icon-btn play-btn" id="play" aria-label="一時停止">Ⅱ 一時停止</button><button type="button" class="icon-btn" id="next" aria-label="次のコマ" title="次のコマ（→）">›</button></div>
    <div class="frames" id="frames" role="group" aria-label="コマを選択"></div><div class="time-readout" id="frame-readout">01 / 08</div><span class="keys">Space 再生・停止　← → コマ送り</span>
  </section>
  <div class="lower"><section><h2 class="note-title">制作メモ</h2><p class="note-copy">左右の向きは方向ごとの素材を使用する構成です。盾・剣・肩の装備や荷物の左右を、各方向の見え方で確認してください。名称と設定は仮の扱いです。</p><p class="note-copy" style="margin-top:7px">動きの速度や大きさは、この画面で調整できます。画面の拡大率は書き出し素材に影響しません。</p></section><section><h2 class="note-title">素材を取り出す</h2><p class="note-copy" id="export-info">横8コマ × 縦8方向のスプライトシート。</p><div class="downloads" id="downloads"></div></section></div>
  <footer class="footer"><span>CHARACTER MOTION ARCHIVE / 001</span><span>オフライン対応 · 画像と設定を内蔵</span></footer>
</main>
<script id="embedded-data" type="application/json">__PAYLOAD__</script>
<script>
"use strict";
const data=JSON.parse(document.getElementById("embedded-data").textContent), meta=data.manifest;
const $=id=>document.getElementById(id), pad=n=>String(n).padStart(2,"0");
const codes=["S","SE","E","NE","N","NW","W","SW"];
const state={character:meta.characters[0].id,motion:meta.motions[0].id,frame:0,playing:!matchMedia("(prefers-reduced-motion: reduce)").matches,speed:1,zoom:1,light:false};
const sprites={}, cards=[], frameButtons=[];let previousTime=0,elapsed=0,ready=false;
const frameMs=()=>Number(meta.motions.find(m=>m.id===state.motion).frame_ms)||120;
function createSegments(target,items,key){for(const item of items){const button=document.createElement("button");button.type="button";button.textContent=item.label||item.id;button.dataset.id=item.id;button.addEventListener("click",()=>{state[key]=item.id;state.frame=0;elapsed=0;updateControls();updateDownloads();draw()});target.append(button)}}
createSegments($("characters"),meta.characters,"character");createSegments($("motions"),meta.motions,"motion");
for(let row=0;row<8;row++){const card=document.createElement("article");card.className="card";const top=document.createElement("div");top.className="card-top";const label=document.createElement("span");label.className="card-label";label.textContent=data.directionLabels[row];const code=document.createElement("span");code.className="dir-code";code.textContent=codes[row];top.append(label,code);const stage=document.createElement("div");stage.className="stage";const canvas=document.createElement("canvas");canvas.setAttribute("aria-label",data.directionLabels[row]+"のアニメーション");canvas.setAttribute("role","img");stage.append(canvas);const bottom=document.createElement("div");bottom.className="card-bottom";const number=document.createElement("span");number.textContent="VIEW "+pad(row+1);const count=document.createElement("span");count.className="card-count";bottom.append(number,count);card.append(top,stage,bottom);$("grid").append(card);cards.push({canvas,stage,count,context:canvas.getContext("2d")})}
for(let f=0;f<8;f++){const button=document.createElement("button");button.type="button";button.className="frame-btn";button.textContent=pad(f+1);button.setAttribute("aria-label",(f+1)+"コマ目を表示");button.addEventListener("click",()=>{state.playing=false;state.frame=f;elapsed=0;updateControls();draw()});$("frames").append(button);frameButtons.push(button)}
function updateControls(){for(const [id,key] of [["characters","character"],["motions","motion"]])for(const button of $(id).children){const active=button.dataset.id===state[key];button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))}$("play").textContent=state.playing?"Ⅱ 一時停止":"▶ 再生";$("play").setAttribute("aria-label",state.playing?"一時停止":"再生");$("grid-heading").textContent=(meta.characters.find(c=>c.id===state.character).label||state.character)+" / "+(meta.motions.find(m=>m.id===state.motion).label||state.motion);$("background").textContent=state.light?"暗くする":"明るくする";$("background").setAttribute("aria-pressed",String(state.light));for(const card of cards)card.stage.classList.toggle("light",state.light)}
function draw(){const image=sprites[state.character]?.[state.motion];for(let row=0;row<cards.length;row++){const card=cards[row],rect=card.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);if(card.canvas.width!==width||card.canvas.height!==height){card.canvas.width=width;card.canvas.height=height}const ctx=card.context;ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";if(image){const scale=Math.min(width/meta.frame_width,height/meta.frame_height)*state.zoom;const drawWidth=meta.frame_width*scale,drawHeight=meta.frame_height*scale;ctx.drawImage(image,state.frame*meta.frame_width,row*meta.frame_height,meta.frame_width,meta.frame_height,(width-drawWidth)/2,(height-drawHeight)/2,drawWidth,drawHeight)}card.count.textContent="FRAME "+pad(state.frame+1)}for(let i=0;i<8;i++){const active=i===state.frame;frameButtons[i].classList.toggle("active",active);frameButtons[i].setAttribute("aria-pressed",String(active))}$("frame-readout").textContent=pad(state.frame+1)+" / 08"}
function updateDownloads(){const list=$("downloads");list.replaceChildren();const label=meta.characters.find(c=>c.id===state.character).label||state.character;for(const motion of meta.motions){const a=document.createElement("a");a.className="download";a.href=data.sheets[state.character][motion.id];a.download=state.character+"-"+motion.id+".png";a.textContent="↓ "+label+"・"+(motion.label||motion.id)+" PNG";list.append(a)}const metadata=document.createElement("a");metadata.className="download";metadata.href="data:application/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(meta,null,2));metadata.download="manifest.json";metadata.textContent="↓ 設定 JSON";list.append(metadata);$("export-info").textContent="1コマ "+meta.frame_width+" × "+meta.frame_height+" px ／ 横8コマ × 縦8方向。行の順番は上の表示順です。"}
function step(delta){state.playing=false;state.frame=(state.frame+delta+8)%8;elapsed=0;updateControls();draw()}
function togglePlay(){state.playing=!state.playing;elapsed=0;updateControls()}
$("play").addEventListener("click",togglePlay);$("prev").addEventListener("click",()=>step(-1));$("next").addEventListener("click",()=>step(1));$("speed").addEventListener("change",event=>{state.speed=Number(event.target.value);elapsed=0});$("zoom").addEventListener("input",event=>{state.zoom=Number(event.target.value);$("zoom-value").textContent=Math.round(state.zoom*100)+"%";draw()});$("background").addEventListener("click",()=>{state.light=!state.light;updateControls()});
document.addEventListener("keydown",event=>{if(event.target.closest("input,select,textarea,button,a"))return;if(event.code==="Space"){event.preventDefault();togglePlay()}else if(event.code==="ArrowLeft"){event.preventDefault();step(-1)}else if(event.code==="ArrowRight"){event.preventDefault();step(1)}});
new ResizeObserver(()=>draw()).observe($("grid"));document.addEventListener("visibilitychange",()=>{previousTime=0;elapsed=0});
function tick(time){if(!previousTime)previousTime=time;const delta=Math.min(time-previousTime,200);previousTime=time;if(ready&&state.playing&&!document.hidden){elapsed+=delta;const duration=frameMs()/state.speed;if(elapsed>=duration){const advance=Math.floor(elapsed/duration);state.frame=(state.frame+advance)%8;elapsed%=duration;draw()}}requestAnimationFrame(tick)}
async function start(){updateControls();updateDownloads();draw();try{await Promise.all(Object.entries(data.sheets).flatMap(([character,motions])=>Object.entries(motions).map(([motion,src])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{(sprites[character]??={})[motion]=image;resolve()};image.onerror=()=>reject(new Error(character+" / "+motion+" の読み込みに失敗しました。"));image.src=src}))));ready=true;$("loading").textContent="";draw();requestAnimationFrame(tick)}catch(error){$("loading").className="error";$("loading").textContent=error.message;$("play").disabled=true}}
start();
</script>
</body></html>
'''


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path, help="Output HTML path (default: ROOT/player.html)")
    args = parser.parse_args()
    root = args.root.resolve()
    output = args.output or root / "player.html"
    payload = make_payload(root)
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    output.write_text(HTML.replace("__PAYLOAD__", encoded), encoding="utf-8")
    print(f"Built {output} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
