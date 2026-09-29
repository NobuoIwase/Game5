"""新作の魔物SVG（Game5 の asset-refs/sprites と同じ作法：256×256・柔らかいグラデーション・濃い縁取り）。

新しく描く5体をここで出力する。Game5 の見本から写す3体は sprites/ からコピーする。残りは Game4 の絵（trim_game4.py）。
使い方: python3 newgame/tools/make_monsters.py
"""
import json, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "newgame" / "assets" / "monsters"


def svg(defs, body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">'
            f"<defs>{defs}</defs>{body}</svg>\n")


def rgrad(id, stops, cx=0.38, cy=0.3, r=0.8):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<radialGradient id="{id}" cx="{cx}" cy="{cy}" r="{r}">{s}</radialGradient>'


def lgrad(id, stops, x2=0, y2=1):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{id}" x1="0" y1="0" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def shadow(rx=46, cy=230, op=0.22):
    return f'<ellipse cx="128" cy="{cy}" rx="{rx}" ry="8" fill="rgba(0,0,0,{op})"/>'


def eyes(cx, cy, sep=18, h=9, col="#2a1420"):
    out = ""
    for x in (cx - sep, cx + sep):
        out += (f'<ellipse cx="{x}" cy="{cy}" rx="{h*0.62:.1f}" ry="{h}" fill="{col}"/>'
                f'<circle cx="{x+h*0.22:.1f}" cy="{cy-h*0.38:.1f}" r="{h*0.3:.1f}" fill="#fff"/>')
    return out


def tube(d, outline, fill, hi, w=14):
    """太い管（触手・蔦）を 縁→本体→つや の三重の線で描く。"""
    return (f'<path d="{d}" fill="none" stroke="{outline}" stroke-width="{w+5}" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{fill}" stroke-width="{w}" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{hi}" stroke-width="{max(2, w//4)}" stroke-linecap="round" opacity=".55" transform="translate(-2 -2)"/>')


# ---------------------------------------------------------------- ローパー3種
ROPER_TENT = ["M98 100 C80 70 52 58 38 80", "M114 92 C104 64 106 40 122 26",
              "M142 92 C152 64 150 40 136 24", "M158 100 C176 70 204 58 218 82"]
ROPER_FOOT = ["M84 208 C66 212 52 206 44 196", "M172 208 C190 212 204 206 212 196"]
ROPER_BODY = "M80 222 C70 180 74 132 86 106 C98 82 158 82 170 106 C182 132 186 180 176 222 C156 232 100 232 80 222Z"


def roper(kind):
    P = {
        "roper": dict(l="#ffe0ec", m="#e58ab0", d="#8a2f5a", o="#4a1830", tip="#ffc0d8"),
        "mind_roper": dict(l="#f1e2ff", m="#ad84e2", d="#4f2c88", o="#261640", tip="#e6ccff"),
        "drain_roper": dict(l="#ffe0e6", m="#c9708e", d="#5e2440", o="#34101f", tip="#8ff0ff"),
    }[kind]
    defs = rgrad("rb", [(0, P["l"]), (0.5, P["m"]), (1, P["d"])])
    body = shadow(58)
    for d in ROPER_TENT + ROPER_FOOT:
        body += tube(d, P["o"], P["m"], P["l"], 13)
    body += f'<path d="{ROPER_BODY}" fill="url(#rb)" stroke="{P["o"]}" stroke-width="4"/>'
    for y in (178, 198):  # 胴の節
        body += f'<path d="M{86 if y==178 else 82} {y} C110 {y+8} 146 {y+8} {170 if y==178 else 174} {y}" fill="none" stroke="{P["d"]}" stroke-width="2.5" opacity=".45"/>'
    body += '<ellipse cx="108" cy="114" rx="12" ry="7" fill="#fff" opacity=".35" transform="rotate(-25 108 114)"/>'
    tips = [(38, 80), (122, 26), (136, 24), (218, 82)]
    for x, y in tips:
        body += f'<circle cx="{x}" cy="{y}" r="7" fill="{P["tip"]}" stroke="{P["o"]}" stroke-width="3"/>'
    if kind == "mind_roper":   # 額の渦と、第三の目
        body += '<path d="M128 104 m-10 0 a10 10 0 1 1 10 10 a6 6 0 1 1 -6 -6 a3 3 0 1 1 3 3" fill="none" stroke="#f3d8ff" stroke-width="2.5" opacity=".85"/>'
        for x, y in tips:
            body += f'<circle cx="{x}" cy="{y}" r="12" fill="#d9b8ff" opacity=".25"/>'
    if kind == "drain_roper":  # 先端で青い光（魔力）を吸う
        for x, y in tips:
            body += f'<circle cx="{x}" cy="{y}" r="13" fill="#8ff0ff" opacity=".28"/>'
        for x, y, r in [(22, 60, 4), (30, 44, 3), (232, 60, 4), (240, 100, 3), (150, 10, 3), (104, 12, 2.5)]:
            body += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#bff8ff" opacity=".85"/>'
    return svg(defs, body)


# ---------------------------------------------------------------- 垂れ蔦
def hanging_vine():
    defs = rgrad("vb", [(0, "#ffe6f0"), (0.5, "#e07aa6"), (1, "#7c2650")]) + lgrad("lf", [(0, "#cfe8b8"), (1, "#6f9a5c")])
    o, m, l = "#3e1528", "#b8507e", "#f2a6c6"
    vines = ["M60 0 C54 40 76 70 62 110 C52 140 70 160 84 170", "M100 0 C106 30 92 60 104 96",
             "M156 0 C150 34 166 60 152 96", "M198 0 C206 42 182 74 196 112 C204 140 186 160 172 170"]
    body = shadow(40, 234, .15)
    for d in vines:
        body += tube(d, o, m, l, 10)
    for x, y, r in [(70, 40, -30), (58, 96, 20), (96, 50, 30), (162, 44, -30), (192, 70, 25), (190, 130, -20)]:
        body += (f'<path d="M0 0 C8 -10 22 -8 26 0 C22 8 8 10 0 0Z" fill="url(#lf)" stroke="{o}" stroke-width="2.5" '
                 f'transform="translate({x} {y}) rotate({r})"/>')
    # 吊り下がった蕾（顔）
    body += tube("M128 0 C124 30 132 60 128 96", o, m, l, 12)
    body += f'<path d="M128 94 C92 96 84 150 104 176 C114 190 142 190 152 176 C172 150 164 96 128 94Z" fill="url(#vb)" stroke="{o}" stroke-width="4"/>'
    body += f'<path d="M104 104 C112 92 144 92 152 104 C140 100 116 100 104 104Z" fill="url(#lf)" stroke="{o}" stroke-width="2.5"/>'
    body += '<ellipse cx="112" cy="126" rx="8" ry="5" fill="#fff" opacity=".35" transform="rotate(-30 112 126)"/>'
    body += eyes(128, 146, 14, 8, o)
    body += tube("M84 170 C90 184 104 186 106 176", o, m, l, 8) + tube("M172 170 C166 184 152 186 150 176", o, m, l, 8)
    return svg(defs, body)


# ---------------------------------------------------------------- 浮遊水母
def jellyfish():
    defs = rgrad("jb", [(0, "#fff2f8"), (0.45, "#f4a9cc"), (1, "#a8467a")], 0.4, 0.3, 0.85) + \
        rgrad("jg", [(0, "#ffffff"), (1, "#ffc6e0")], 0.5, 0.5, 0.5)
    o = "#5a1c3e"
    body = shadow(30, 238, .14)
    for i, x in enumerate((74, 100, 128, 156, 182)):
        w = 8 if i % 2 else -8
        d = f"M{x} 132 C{x+w} 160 {x-w} 184 {x+w/2} 214 C{x+w} 226 {x} 232 {x-w/2} 240"
        body += f'<path d="{d}" fill="none" stroke="#e98ab8" stroke-width="6" stroke-linecap="round" opacity=".75"/>'
        body += f'<path d="{d}" fill="none" stroke="#ffd8ea" stroke-width="2" stroke-linecap="round" opacity=".8"/>'
    bell = "M52 132 C46 70 88 42 128 42 C168 42 210 70 204 132 C188 142 172 134 160 140 C148 132 138 142 128 136 C118 142 108 132 96 140 C84 134 68 142 52 132Z"
    body += f'<path d="{bell}" fill="url(#jb)" opacity=".9" stroke="{o}" stroke-width="4"/>'
    body += '<ellipse cx="128" cy="100" rx="34" ry="22" fill="url(#jg)" opacity=".55"/>'
    body += '<ellipse cx="94" cy="72" rx="14" ry="7" fill="#fff" opacity=".45" transform="rotate(-30 94 72)"/>'
    body += eyes(128, 108, 18, 8, o)
    return svg(defs, body)


# ---------------------------------------------------------------- 小淫魔（小さな悪魔。かわいい寄り）
def imp():
    defs = rgrad("ih", [(0, "#ffe8f2"), (0.55, "#f2a8c8"), (1, "#b95a88")], 0.4, 0.32, 0.8) + \
        lgrad("iw", [(0, "#9a3a72"), (1, "#4a1636")], 1, 1) + rgrad("is", [(0, "#8e3a74"), (1, "#3e1030")], 0.4, 0.3, 0.9)
    o = "#2e0c22"
    body = shadow(36)
    for s in (1, -1):  # 翼
        x = 128
        d = (f"M{x+s*28} 150 C{x+s*70} 120 {x+s*102} 116 {x+s*110} 132 C{x+s*96} 136 {x+s*92} 146 {x+s*96} 156 "
             f"C{x+s*82} 152 {x+s*74} 160 {x+s*74} 170 C{x+s*60} 164 {x+s*44} 168 {x+s*30} 176Z")
        body += f'<path d="{d}" fill="url(#iw)" stroke="{o}" stroke-width="3.5"/>'
    body += f'<path d="M150 196 C184 206 196 186 190 170" fill="none" stroke="{o}" stroke-width="7" stroke-linecap="round"/>'
    body += '<path d="M150 196 C184 206 196 186 190 170" fill="none" stroke="#7a2c5e" stroke-width="4" stroke-linecap="round"/>'
    body += f'<path d="M190 170 C182 158 198 150 192 162 C198 150 212 160 200 170 L192 180Z" fill="#ff6fa8" stroke="{o}" stroke-width="2.5"/>'
    body += f'<path d="M104 222 C98 200 100 170 128 164 C156 170 158 200 152 222 C140 228 116 228 104 222Z" fill="url(#is)" stroke="{o}" stroke-width="3.5"/>'
    body += f'<circle cx="128" cy="116" r="50" fill="url(#ih)" stroke="{o}" stroke-width="4"/>'
    for s in (1, -1):  # 角と耳
        body += f'<path d="M{128+s*26} 74 C{128+s*30} 52 {128+s*44} 44 {128+s*52} 48 C{128+s*42} 56 {128+s*40} 66 {128+s*40} 80Z" fill="#3b1a33" stroke="{o}" stroke-width="3"/>'
        body += f'<path d="M{128+s*48} 112 C{128+s*66} 104 {128+s*74} 96 {128+s*76} 90 C{128+s*72} 110 {128+s*62} 122 {128+s*48} 126Z" fill="url(#ih)" stroke="{o}" stroke-width="3"/>'
    for x in (108, 148):  # にやりと細めた目
        body += f'<path d="M{x-10} 118 C{x-4} 108 {x+4} 108 {x+10} 118" fill="none" stroke="{o}" stroke-width="4" stroke-linecap="round"/>'
        body += f'<ellipse cx="{x}" cy="120" rx="5" ry="3.5" fill="#e0407e"/>'
    body += f'<path d="M114 140 C122 148 134 148 142 140" fill="none" stroke="{o}" stroke-width="3.5" stroke-linecap="round"/>'
    body += '<path d="M136 144 L139 151 L142 142Z" fill="#fff"/>'
    body += '<ellipse cx="100" cy="134" rx="8" ry="4" fill="#ff8fb8" opacity=".5"/><ellipse cx="156" cy="134" rx="8" ry="4" fill="#ff8fb8" opacity=".5"/>'
    return svg(defs, body)


# ---------------------------------------------------------------- ゴーストヘッド（魔力を吸う）
def ghost_head():
    defs = rgrad("gh", [(0, "#fbf4ff"), (0.55, "#d7c3f0"), (1, "#8a6cb8")], 0.4, 0.3, 0.85)
    o = "#3a2658"
    body = shadow(30, 238, .12)
    d = ("M128 36 C182 36 200 84 194 124 C188 160 170 176 168 196 C166 214 176 222 186 228 "
         "C164 234 146 222 142 206 C138 222 120 226 108 214 C98 222 80 218 76 202 C62 190 58 150 62 124 C58 84 74 36 128 36Z")
    body += f'<path d="{d}" fill="url(#gh)" opacity=".88" stroke="{o}" stroke-width="4"/>'
    body += '<ellipse cx="96" cy="70" rx="16" ry="8" fill="#fff" opacity=".5" transform="rotate(-30 96 70)"/>'
    for x in (104, 152):
        body += f'<ellipse cx="{x}" cy="110" rx="13" ry="17" fill="{o}"/><circle cx="{x+4}" cy="104" r="3.5" fill="#bff8ff"/>'
    body += f'<ellipse cx="128" cy="152" rx="14" ry="18" fill="{o}"/><ellipse cx="128" cy="156" rx="8" ry="10" fill="#5ad8ec" opacity=".45"/>'
    for x, y, r in [(40, 150, 5), (58, 160, 4), (76, 158, 3.5), (92, 156, 3), (106, 154, 2.5), (30, 132, 3), (46, 176, 3)]:
        body += f'<circle cx="{x}" cy="{y}" r="{r+4}" fill="#8ff0ff" opacity=".2"/><circle cx="{x}" cy="{y}" r="{r}" fill="#c8faff"/>'
    return svg(defs, body)


# ---------------------------------------------------------------- ゴブリン
def goblin():
    defs = rgrad("gs", [(0, "#e2f2c6"), (0.55, "#9cc47e"), (1, "#4f7a3e")], 0.4, 0.3, 0.85) + \
        lgrad("gc", [(0, "#b98a5e"), (1, "#6a4428")], 1, 1)
    o = "#22301a"
    body = shadow(44)
    body += f'<path d="M168 206 L204 108" stroke="{o}" stroke-width="14" stroke-linecap="round"/><path d="M168 206 L204 108" stroke="#8a5a34" stroke-width="9" stroke-linecap="round"/>'
    body += f'<ellipse cx="206" cy="104" rx="15" ry="22" fill="url(#gc)" stroke="{o}" stroke-width="3.5" transform="rotate(20 206 104)"/>'
    body += f'<path d="M100 224 C94 196 98 166 128 160 C158 166 162 196 156 224 C142 230 114 230 100 224Z" fill="url(#gs)" stroke="{o}" stroke-width="3.5"/>'
    body += f'<path d="M100 194 C116 202 140 202 156 194 L160 214 C140 222 116 222 96 214Z" fill="url(#gc)" stroke="{o}" stroke-width="3"/>'
    body += f'<path d="M156 176 C168 184 170 196 168 206" fill="none" stroke="{o}" stroke-width="12" stroke-linecap="round"/><path d="M156 176 C168 184 170 196 168 206" fill="none" stroke="#9cc47e" stroke-width="7" stroke-linecap="round"/>'
    for s in (1, -1):  # 長い耳
        body += f'<path d="M{128+s*38} 100 C{128+s*70} 84 {128+s*92} 80 {128+s*100} 84 C{128+s*86} 104 {128+s*66} 120 {128+s*40} 124Z" fill="url(#gs)" stroke="{o}" stroke-width="3.5"/>'
    body += f'<ellipse cx="128" cy="112" rx="46" ry="44" fill="url(#gs)" stroke="{o}" stroke-width="4"/>'
    for x in (110, 146):
        body += f'<ellipse cx="{x}" cy="108" rx="10" ry="11" fill="#fff6c8" stroke="{o}" stroke-width="2.5"/><circle cx="{x+2}" cy="110" r="5" fill="{o}"/><circle cx="{x+4}" cy="107" r="1.8" fill="#fff"/>'
    body += f'<path d="M110 134 C120 144 138 144 148 134" fill="none" stroke="{o}" stroke-width="3.5" stroke-linecap="round"/><path d="M122 138 L124 146 L128 139Z" fill="#fff"/>'
    body += f'<path d="M124 118 C126 124 130 124 132 118" fill="none" stroke="{o}" stroke-width="2.5" stroke-linecap="round"/>'
    return svg(defs, body)


# ---------------------------------------------------------------- 綿毛（Game4）
def fluff():
    import math
    defs = rgrad("fc", [(0, "#fffaf2"), (1, "#f0c8d8")], 0.4, 0.35, 0.7)
    o = "#6a3a52"
    body = shadow(36, 234, .12)
    cx, cy = 128, 118
    for k in range(40):
        a = k * math.pi * 2 / 40
        r = 62 + (k % 3) * 4
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        body += f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="#fff" stroke-width="1.6" opacity=".75"/>'
        body += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="#fff8fb" opacity=".9"/>'
    body += f'<circle cx="{cx}" cy="{cy}" r="46" fill="#ffffff" opacity=".35"/>'
    body += f'<circle cx="{cx}" cy="{cy}" r="30" fill="url(#fc)" stroke="{o}" stroke-width="3"/>'
    body += eyes(cx, cy + 2, 11, 6, o)
    for x, y in [(36, 200), (58, 214), (214, 190), (196, 214)]:
        body += (f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y+10}" stroke="#e8c8d6" stroke-width="1.5"/>'
                 f'<circle cx="{x}" cy="{y}" r="5" fill="#fff" opacity=".85"/>')
    return svg(defs, body)


# ---------------------------------------------------------------- 覗き子（Game4：見るだけ）
def peeper():
    defs = rgrad("pe", [(0, "#ffffff"), (0.6, "#fff0f4"), (1, "#dcb4c2")], 0.4, 0.35, 0.8) + \
        rgrad("pl", [(0, "#f6c0d4"), (1, "#a8486e")], 0.5, 0.2, 0.9) + \
        lgrad("pv", [(0, "rgba(255,190,220,0.35)"), (1, "rgba(255,190,220,0)")], 1, 0.4)
    o = "#4a1830"
    body = '<path d="M150 150 L250 96 L250 214Z" fill="url(#pv)"/>'  # じっと見ている扇
    body += shadow(34, 222)
    body += f'<path d="M128 196 C124 206 118 214 110 218 M128 196 C132 206 138 214 146 218" stroke="{o}" stroke-width="6" stroke-linecap="round" fill="none"/>'
    body += f'<circle cx="128" cy="150" r="46" fill="url(#pe)" stroke="{o}" stroke-width="4"/>'
    body += f'<circle cx="140" cy="158" r="20" fill="#8a4cc8"/><circle cx="142" cy="160" r="10" fill="#2a1030"/><circle cx="147" cy="153" r="4" fill="#fff"/>'
    body += f'<path d="M82 146 C86 104 170 104 174 146 C160 134 96 134 82 146Z" fill="url(#pl)" stroke="{o}" stroke-width="3.5"/>'
    for x, a in [(96, -30), (112, -12), (128, 0), (144, 12), (160, 30)]:
        body += f'<line x1="{x}" y1="{138 if x in (96,160) else 134}" x2="{x}" y2="{128 if x in (96,160) else 124}" stroke="{o}" stroke-width="3" stroke-linecap="round" transform="rotate({a} {x} 136)"/>'
    body += '<path d="M100 188 C92 178 88 170 88 164" stroke="#dcb4c2" stroke-width="3" fill="none" opacity=".6"/>'
    return svg(defs, body)


# ---------------------------------------------------------------- 触手壺（Game4：ジェム＝魔力を喰う）
def pot():
    defs = rgrad("pb", [(0, "#ffe2ea"), (0.5, "#d9829e"), (1, "#7a2a48")], 0.38, 0.35, 0.85)
    o, m, l = "#3e1226", "#d2688e", "#ffc0d6"
    body = shadow(54)
    body += f'<path d="M86 96 C60 120 58 196 92 220 C112 232 144 232 164 220 C198 196 196 120 170 96Z" fill="url(#pb)" stroke="{o}" stroke-width="4"/>'
    for y in (150, 180):
        body += f'<path d="M{70 if y==150 else 74} {y} C104 {y+10} 152 {y+10} {186 if y==150 else 182} {y}" fill="none" stroke="#7a2a48" stroke-width="2.5" opacity=".4"/>'
    for d in ["M104 92 C92 62 70 58 60 70", "M128 90 C124 58 138 42 150 44", "M152 92 C166 66 190 66 198 80"]:
        body += tube(d, o, m, l, 11)
    body += f'<ellipse cx="128" cy="96" rx="46" ry="15" fill="#5a1630" stroke="{o}" stroke-width="4"/><ellipse cx="128" cy="98" rx="34" ry="8" fill="#2a0814"/>'
    body += '<ellipse cx="96" cy="130" rx="10" ry="6" fill="#fff" opacity=".35" transform="rotate(-30 96 130)"/>'
    body += eyes(128, 158, 18, 8, o)
    for x, y, c in [(40, 40, "#8ff0ff"), (214, 36, "#ffe27a"), (28, 110, "#ffe27a"), (226, 120, "#8ff0ff")]:
        body += f'<path d="M{x} {y-9} L{x+7} {y} L{x} {y+9} L{x-7} {y}Z" fill="{c}" stroke="{o}" stroke-width="2"/>'
    return svg(defs, body)


# Game4 に絵がある種（小淫魔・ゴブリン・綿毛・覗き子・触手壺・ゴーストなど）は Game4 の絵を使う
# （export_game4_monsters.js → trim_game4.py）。ここで描くのは Game4 にも無い5体だけ。
# imp()・ghost_head()・goblin()・fluff()・peeper()・pot() は、Game4 の絵に差し替える前の下書き。
NEW = {
    "roper": roper("roper"), "mind_roper": roper("mind_roper"), "drain_roper": roper("drain_roper"),
    "hanging_vine": hanging_vine(), "jellyfish": jellyfish(),
}
# Game5 の見本（game/asset-refs/sprites）から写す分：新作での id → 元のファイル名
EXISTING = {
    "mimic": "prop_mimic", "mirror_slime": "monster_mirror_slime", "wisp": "monster_wisp",
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for k, s in NEW.items():
        (OUT / f"{k}.svg").write_text(s)
    src = ROOT / "game" / "asset-refs" / "sprites"
    for k, f in EXISTING.items():
        shutil.copyfile(src / f"{f}.svg", OUT / f"{k}.svg")
    print("new", len(NEW), "copied", len(EXISTING))
