"""2回目に足した魔物と、罠すべての見た目（SVG）。make_monsters.py と同じ作法（256×256・柔らかいグラデーション・濃い縁取り）。

- 魔物：Game4 に絵が無い10体（双子の小淫魔・ワルドーの5種・痺れ浮遊子・星喰み・触手の主）
- 罠：今まで文字（鈴・鏡…）で描いていた罠すべて。淫糸の巣と囁きの塔は Game4 の絵なので、ここでは描かない
- ワルドーの支部の床（floor_waldo.png）
使い方: python3 newgame/tools/make_art.py
"""
import math
from pathlib import Path
from make_monsters import svg, rgrad, lgrad, shadow, eyes, tube

ROOT = Path(__file__).resolve().parents[2]
MON = ROOT / "newgame" / "assets" / "monsters"
TRAP = ROOT / "newgame" / "assets" / "traps"
ENV = ROOT / "newgame" / "assets" / "env"


def P(pts):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def star(cx, cy, r1, r2, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        r = r1 if i % 2 == 0 else r2
        a = math.radians(rot + i * 180 / n)
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return pts


def spark(x, y, s, c):
    return f'<path d="M{x} {y-s} L{x+s*0.3} {y-s*0.3} L{x+s} {y} L{x+s*0.3} {y+s*0.3} L{x} {y+s} L{x-s*0.3} {y+s*0.3} L{x-s} {y} L{x-s*0.3} {y-s*0.3}Z" fill="{c}"/>'


# ================================================================ 魔物
def futago():
    """双子の小淫魔：蝙蝠の羽と角の、小さな悪魔が二体。人の子供の姿にはしない（丸い魔物の姿）"""
    defs = rgrad("fb", [(0, "#ffd2ea"), (0.55, "#e77ab4"), (1, "#8a2f66")]) + rgrad("fb2", [(0, "#e8d6ff"), (0.55, "#a07ae0"), (1, "#4f2c88")])
    body = shadow(70)
    for cx, g, o, flip in [(84, "fb", "#4a1834", 1), (172, "fb2", "#2a1848", -1)]:
        wing = f"M{cx} 130 C{cx-40*flip} 100 {cx-60*flip} 120 {cx-58*flip} 150 C{cx-44*flip} 140 {cx-36*flip} 150 {cx-24*flip} 146Z"
        body += f'<path d="{wing}" fill="#5a2a58" stroke="{o}" stroke-width="3"/>'
        body += f'<path d="M{cx+10*flip} 176 C{cx+34*flip} 186 {cx+44*flip} 204 {cx+30*flip} 214" fill="none" stroke="{o}" stroke-width="5" stroke-linecap="round"/>'
        body += f'<path d="M{cx+30*flip} 214 l{8*flip} -2 l-4 8z" fill="{o}"/>'
        body += f'<ellipse cx="{cx}" cy="160" rx="38" ry="44" fill="url(#{g})" stroke="{o}" stroke-width="4"/>'
        for s in (-1, 1):
            body += f'<path d="M{cx+s*18} 124 C{cx+s*24} 104 {cx+s*30} 98 {cx+s*34} 94 C{cx+s*30} 108 {cx+s*28} 118 {cx+s*26} 128Z" fill="#fff0f8" stroke="{o}" stroke-width="3"/>'
        body += eyes(cx, 156, 13, 8, o)
        body += f'<path d="M{cx-9} 178 Q{cx} {186} {cx+9} 178" fill="none" stroke="{o}" stroke-width="3" stroke-linecap="round"/>'
        body += f'<path d="M{cx+4} 180 q3 7 6 0" fill="#ff5f9e"/>'
        body += f'<ellipse cx="{cx-14}" cy="138" rx="9" ry="5" fill="#fff" opacity=".35"/>'
    body += spark(128, 96, 10, "#ffd6f0") + spark(128, 130, 6, "#e8d0ff")
    return svg(defs, body)


def waldo_grunt():
    """ワルドー戦闘員：全身タイツと目出しの覆面。胸に組織の紋章"""
    o = "#101018"
    defs = lgrad("wg", [(0, "#4a4a62"), (1, "#1c1c28")]) + rgrad("wh", [(0, "#5a5a74"), (1, "#20202c")])
    body = shadow(44)
    body += f'<path d="M104 222 L110 170 L146 170 L152 222 L136 222 L128 186 L120 222Z" fill="url(#wg)" stroke="{o}" stroke-width="4" stroke-linejoin="round"/>'
    body += f'<path d="M96 112 C96 98 160 98 160 112 L156 176 C140 184 116 184 100 176Z" fill="url(#wg)" stroke="{o}" stroke-width="4"/>'
    for s in (-1, 1):
        body += tube(f"M{128+s*30} 116 C{128+s*52} 136 {128+s*54} 158 {128+s*46} 178", o, "#34344a", "#6a6a88", 14)
        body += f'<circle cx="{128+s*46}" cy="180" r="9" fill="#26263a" stroke="{o}" stroke-width="3"/>'
    body += f'<ellipse cx="128" cy="78" rx="30" ry="32" fill="url(#wh)" stroke="{o}" stroke-width="4"/>'
    body += f'<path d="M106 74 L150 74 L146 86 L110 86Z" fill="#ff5f9e" opacity=".85"/>'
    body += f'<path d="M112 80 L144 80" stroke="#fff" stroke-width="2" opacity=".7"/>'
    body += f'<path d="M128 120 l14 12 l-14 12 l-14 -12z" fill="#9a6cff" stroke="#d8c8ff" stroke-width="2"/>'
    body += f'<circle cx="128" cy="132" r="3" fill="#fff"/>'
    body += f'<path d="M100 60 C110 50 146 50 156 60" fill="none" stroke="#7a7a96" stroke-width="3" opacity=".6"/>'
    return svg(defs, body)


def waldo_officer():
    """ワルドー幹部：長身・マント・制帽。掌に催眠の渦"""
    o = "#0c0c14"
    defs = lgrad("cape", [(0, "#5a1a44"), (1, "#240818")]) + lgrad("coat", [(0, "#3a3a58"), (1, "#16162a")])
    body = shadow(56)
    body += f'<path d="M84 104 C70 150 66 196 70 226 L186 226 C190 196 186 150 172 104Z" fill="url(#cape)" stroke="{o}" stroke-width="4"/>'
    body += f'<path d="M104 104 L152 104 L156 222 L100 222Z" fill="url(#coat)" stroke="{o}" stroke-width="4"/>'
    body += '<path d="M128 104 L128 222" stroke="#8a8ab0" stroke-width="2" opacity=".5"/>'
    for y in (130, 154, 178):
        body += f'<circle cx="138" cy="{y}" r="3.5" fill="#e8d27a"/>'
    body += f'<ellipse cx="128" cy="74" rx="24" ry="27" fill="#d8c4b8" stroke="{o}" stroke-width="4"/>'
    body += f'<path d="M104 60 L152 60 L160 46 C140 34 116 34 96 46Z" fill="#26263e" stroke="{o}" stroke-width="4"/>'
    body += f'<path d="M100 60 L156 60" stroke="{o}" stroke-width="6"/>'
    body += f'<path d="M128 40 l7 6 l-7 6 l-7 -6z" fill="#9a6cff"/>'
    body += f'<path d="M112 76 L124 78 M132 78 L144 76" stroke="{o}" stroke-width="3" stroke-linecap="round"/>'
    body += f'<path d="M118 90 Q128 96 140 88" fill="none" stroke="{o}" stroke-width="2.5" stroke-linecap="round"/>'
    body += tube("M154 116 C176 124 190 118 200 104", o, "#2c2c46", "#6a6a90", 13)
    for r, a in [(18, .5), (12, .7), (6, .9)]:
        body += f'<circle cx="206" cy="98" r="{r}" fill="none" stroke="#c8a0ff" stroke-width="3" opacity="{a}"/>'
    body += f'<path d="M128 124 l12 10 l-12 10 l-12 -10z" fill="#9a6cff" stroke="#d8c8ff" stroke-width="2"/>'
    return svg(defs, body)


def drone(kind):
    """ワルドーのドローン：浮かぶ球体。捕縛（ワイヤー）・くすぐり（羽根ブラシ）・記録（赤いレンズ）"""
    o = "#101420"
    defs = rgrad("db", [(0, "#f0f4ff"), (0.5, "#9aa6c8"), (1, "#3a4462")])
    body = shadow(40, 232, 0.16)
    if kind == "drone_capture":
        for a in (-150, -30, 30, 150, 90):
            x2, y2 = 128 + math.cos(math.radians(a)) * 92, 118 + math.sin(math.radians(a)) * 80
            body += f'<path d="M128 118 Q{(128+x2)/2+10} {(118+y2)/2-16} {x2:.0f} {y2:.0f}" fill="none" stroke="#c8d4ee" stroke-width="3" stroke-dasharray="6 4"/>'
            body += f'<circle cx="{x2:.0f}" cy="{y2:.0f}" r="7" fill="none" stroke="#e8f0ff" stroke-width="3"/>'
    if kind == "drone_tickle":
        for s in (-1, 1):
            body += f'<path d="M{128+s*40} 124 L{128+s*82} 104 L{128+s*96} 140" fill="none" stroke="{o}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
            body += f'<path d="M{128+s*40} 124 L{128+s*82} 104 L{128+s*96} 140" fill="none" stroke="#b8c2de" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
            for k in range(6):
                a = math.radians(70 + s * 20 + (k - 2.5) * 12)
                body += f'<path d="M{128+s*96} 140 l{math.cos(a)*s*26:.1f} {math.sin(a)*26:.1f}" stroke="#ffd6ec" stroke-width="4" stroke-linecap="round"/>'
        body += f'<path d="M128 150 L128 190" stroke="{o}" stroke-width="7"/><path d="M128 150 L128 190" stroke="#b8c2de" stroke-width="3"/>'
        body += f'<ellipse cx="128" cy="198" rx="14" ry="10" fill="#fff4fb" stroke="#e8b0d0" stroke-width="2"/>'
    body += f'<circle cx="128" cy="118" r="44" fill="url(#db)" stroke="{o}" stroke-width="4"/>'
    body += f'<path d="M86 116 C100 128 156 128 170 116" fill="none" stroke="{o}" stroke-width="3" opacity=".6"/>'
    lens = {"drone_capture": "#7fe8ff", "drone_tickle": "#ff9ad0", "drone_camera": "#ff3a4a"}[kind]
    body += f'<circle cx="128" cy="110" r="18" fill="#141828" stroke="{o}" stroke-width="3"/>'
    body += f'<circle cx="128" cy="110" r="10" fill="{lens}"/><circle cx="124" cy="106" r="4" fill="#fff" opacity=".8"/>'
    if kind == "drone_camera":
        body += f'<circle cx="160" cy="90" r="6" fill="#ff3a4a"/><circle cx="160" cy="90" r="12" fill="#ff3a4a" opacity=".25"/>'
        body += f'<path d="M110 110 L40 170 M146 110 L216 170" stroke="#ff3a4a" stroke-width="2" opacity=".25"/>'
    body += '<ellipse cx="108" cy="92" rx="12" ry="7" fill="#fff" opacity=".45" transform="rotate(-30 108 92)"/>'
    for s in (-1, 1):
        body += f'<path d="M{128+s*30} 80 L{128+s*44} 62" stroke="{o}" stroke-width="4"/><circle cx="{128+s*44}" cy="60" r="5" fill="#9a6cff"/>'
    return svg(defs, body)


def karte():
    """性感開発機〈カルテ〉：白い大型機。多関節のアームと青いレンズ"""
    o = "#1a2030"
    defs = lgrad("kb", [(0, "#ffffff"), (1, "#b8c4da")])
    body = shadow(80)
    body += f'<rect x="70" y="150" width="116" height="74" rx="14" fill="url(#kb)" stroke="{o}" stroke-width="4"/>'
    body += f'<rect x="84" y="168" width="88" height="10" rx="5" fill="#c8d8f0"/>'
    body += '<text x="128" y="206" font-size="15" text-anchor="middle" font-family="sans-serif" fill="#5a6a8a">KARTE</text>'
    for s in (-1, 1):
        d = f"M{128+s*40} 158 L{128+s*72} 110 L{128+s*98} 132 L{128+s*104} 170"
        body += f'<path d="{d}" fill="none" stroke="{o}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>'
        body += f'<path d="{d}" fill="none" stroke="#e8eef8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
        for x, y in [(128 + s * 72, 110), (128 + s * 98, 132)]:
            body += f'<circle cx="{x}" cy="{y}" r="7" fill="#9aa6c8" stroke="{o}" stroke-width="3"/>'
        body += f'<path d="M{128+s*104} 170 l{-s*6} 14 M{128+s*104} 170 l{s*6} 14" stroke="{o}" stroke-width="4" stroke-linecap="round"/>'
    body += f'<rect x="100" y="84" width="56" height="70" rx="10" fill="url(#kb)" stroke="{o}" stroke-width="4"/>'
    body += f'<circle cx="128" cy="112" r="20" fill="#0e1628" stroke="{o}" stroke-width="3"/>'
    body += '<circle cx="128" cy="112" r="12" fill="#5ab8ff"/><circle cx="123" cy="107" r="4" fill="#fff" opacity=".85"/>'
    body += '<circle cx="128" cy="112" r="28" fill="#5ab8ff" opacity=".15"/>'
    body += '<path d="M128 84 L128 64" stroke="#1a2030" stroke-width="4"/><circle cx="128" cy="60" r="6" fill="#9a6cff"/>'
    return svg(defs, body)


def shibire():
    """痺れ浮遊子：半透明の傘と、ぱちぱちする糸"""
    o = "#2a3a58"
    defs = rgrad("sb", [(0, "#f4fbff"), (0.55, "#a8d8ff"), (1, "#4a7ab8")])
    body = shadow(34, 234, 0.12)
    for i, x in enumerate([100, 116, 132, 148, 160]):
        body += f'<path d="M{x} 140 C{x-6} 170 {x+8} 190 {x-2} 214" fill="none" stroke="#bfe0ff" stroke-width="4" stroke-linecap="round" opacity=".85"/>'
    body += f'<path d="M72 142 C72 88 184 88 184 142 C166 132 150 150 128 138 C106 150 90 132 72 142Z" fill="url(#sb)" stroke="{o}" stroke-width="4" opacity=".92"/>'
    body += '<ellipse cx="110" cy="110" rx="16" ry="8" fill="#fff" opacity=".5" transform="rotate(-20 110 110)"/>'
    for x, y in [(62, 118), (196, 120), (84, 198), (176, 196), (128, 78)]:
        body += spark(x, y, 9, "#fff37a")
    body += '<path d="M150 170 l10 8 l-8 4 l10 10" fill="none" stroke="#fff37a" stroke-width="3" stroke-linejoin="round"/>'
    return svg(defs, body)


def hoshibami():
    """星喰み：星の形の小さな軟体。裏に吸盤"""
    o = "#5a1838"
    defs = rgrad("hb", [(0, "#ffe0ee"), (0.5, "#ff8ab8"), (1, "#a8306a")])
    body = shadow(50, 222, 0.16)
    pts = star(128, 138, 78, 34, 5, -90)
    body += f'<polygon points="{P(pts)}" fill="url(#hb)" stroke="{o}" stroke-width="5" stroke-linejoin="round"/>'
    for i in range(5):
        a = math.radians(-90 + i * 72)
        for r in (30, 46, 60):
            body += f'<circle cx="{128+math.cos(a)*r:.1f}" cy="{138+math.sin(a)*r:.1f}" r="{7-r/14:.1f}" fill="#ffd0e4" stroke="{o}" stroke-width="1.5" opacity=".9"/>'
    body += f'<circle cx="128" cy="138" r="12" fill="#7a1a48"/><circle cx="128" cy="138" r="6" fill="#ff5f9e"/>'
    body += '<ellipse cx="104" cy="112" rx="10" ry="6" fill="#fff" opacity=".45" transform="rotate(-30 104 112)"/>'
    return svg(defs, body)


def tentacle_lord():
    """触手の主：太い触腕の束。顔は付けない"""
    l, m, d, o = "#ffd6e6", "#d0709e", "#6e2250", "#3a0e28"
    defs = rgrad("tl", [(0, l), (0.5, m), (1, d)])
    body = shadow(90)
    tents = ["M84 196 C40 180 20 140 30 96", "M100 170 C80 120 70 80 88 40", "M128 160 C122 110 136 70 124 22", "M156 170 C176 120 186 80 170 40",
             "M172 196 C216 180 236 140 226 96", "M92 210 C56 214 30 206 18 190", "M164 210 C200 214 226 206 238 190"]
    for t in tents:
        body += tube(t, o, m, l, 18)
    for x, y in [(30, 96), (88, 40), (124, 22), (170, 40), (226, 96)]:
        body += f'<circle cx="{x}" cy="{y}" r="9" fill="{l}" stroke="{o}" stroke-width="3"/>'
    body += f'<path d="M64 228 C56 180 80 150 128 146 C176 150 200 180 192 228Z" fill="url(#tl)" stroke="{o}" stroke-width="5"/>'
    for y in (178, 200):
        body += f'<path d="M78 {y} C110 {y+10} 146 {y+10} 178 {y}" fill="none" stroke="{d}" stroke-width="3" opacity=".45"/>'
    for x, y in [(100, 188), (128, 194), (156, 188), (114, 212), (142, 212)]:
        body += f'<circle cx="{x}" cy="{y}" r="5" fill="{l}" opacity=".7"/>'
    return svg(defs, body)


MONSTERS = {
    "futago": futago(), "waldo_grunt": waldo_grunt(), "waldo_officer": waldo_officer(),
    "drone_capture": drone("drone_capture"), "drone_tickle": drone("drone_tickle"), "drone_camera": drone("drone_camera"),
    "karte": karte(), "shibire": shibire(), "hoshibami": hoshibami(), "tentacle_lord": tentacle_lord(),
}


# ================================================================ 罠（床に置いてある物）
TC = {"惑": ("#e6d6ff", "#a07ae0", "#3e2470"), "蕩": ("#ffd6e8", "#e77ab4", "#6a1e48"), "絡": ("#d8f0da", "#7ab88a", "#1e4a2c"), "削": ("#d8f8ff", "#6ac8e0", "#16485a")}
STONE = ("#d8d2e0", "#8a8298", "#2a2432")
METAL = ("#eef2fa", "#9aa6c8", "#1a2030")
WOOD = ("#e8c89a", "#a4743e", "#3e2410")


def plate(rx=70, ry=22, cy=206, c=STONE, op=1):
    return (f'<ellipse cx="128" cy="{cy+4}" rx="{rx+4}" ry="{ry+4}" fill="rgba(0,0,0,.25)"/>'
            f'<ellipse cx="128" cy="{cy}" rx="{rx}" ry="{ry}" fill="{c[1]}" stroke="{c[2]}" stroke-width="4" opacity="{op}"/>'
            f'<ellipse cx="128" cy="{cy-4}" rx="{rx-10}" ry="{ry-7}" fill="{c[0]}" opacity=".35"/>')


def glow(cx, cy, r, col, op=0.3):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{col}" opacity="{op}"/>'


def box(x, y, w, h, c, r=8):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c[1]}" stroke="{c[2]}" stroke-width="4"/><rect x="{x+6}" y="{y+6}" width="{w-12}" height="{max(4,h//5)}" rx="{r/2}" fill="{c[0]}" opacity=".55"/>'


def T_bell():
    c = TC["惑"]; b = plate(40, 12, 214)
    b += '<path d="M128 20 L128 64" stroke="#3e2470" stroke-width="4"/>'
    for i, (x, y) in enumerate([(84, 96), (128, 80), (172, 100), (104, 140), (152, 136)]):
        b += f'<path d="M128 40 Q{(128+x)/2} {y-40} {x} {y-26}" fill="none" stroke="#3e2470" stroke-width="2.5"/>'
        b += f'<path d="M{x-16} {y+6} C{x-16} {y-26} {x+16} {y-26} {x+16} {y+6}Z" fill="#f2d27a" stroke="#6a4a10" stroke-width="3"/><circle cx="{x}" cy="{y+9}" r="5" fill="#6a4a10"/>'
    b += glow(128, 110, 70, c[1], .15)
    return svg("", b)


def T_mirror():
    b = plate(56, 14, 214)
    b += '<rect x="84" y="40" width="88" height="172" rx="44" fill="#6a5a3a" stroke="#2a2010" stroke-width="5"/>'
    b += '<rect x="94" y="52" width="68" height="150" rx="34" fill="#cfd8ff"/>'
    b += '<path d="M104 90 L150 60 M104 130 L156 96" stroke="#fff" stroke-width="6" opacity=".6"/>'
    b += '<ellipse cx="128" cy="150" rx="16" ry="28" fill="#a07ae0" opacity=".35"/>'
    return svg("", b)


def T_decoy():
    b = plate(46, 12, 214)
    for x in (100, 156):
        b += f'<rect x="{x-8}" y="120" width="16" height="84" fill="#e8dcc8" stroke="#3a2c20" stroke-width="3"/>'
        b += f'<path d="M{x} 118 C{x-14} 96 {x+2} 82 {x} 70 C{x+14} 88 {x+12} 104 {x} 118Z" fill="#ffc86a" stroke="#8a4a10" stroke-width="3"/>'
    b += '<ellipse cx="128" cy="206" rx="16" ry="40" fill="#2a1840" opacity=".5" transform="rotate(20 128 206)"/>'
    b += '<ellipse cx="128" cy="206" rx="16" ry="40" fill="#2a1840" opacity=".5" transform="rotate(-20 128 206)"/>'
    return svg("", b)


def T_glue():
    b = '<path d="M50 190 C40 160 90 150 128 156 C180 150 220 166 206 196 C196 222 70 226 50 190Z" fill="#ff9ad0" stroke="#7a2a50" stroke-width="4" opacity=".9"/>'
    b += '<path d="M70 184 C90 170 170 168 190 186" fill="none" stroke="#fff" stroke-width="5" opacity=".45"/>'
    for x in (92, 128, 164):
        b += f'<path d="M{x} 170 C{x-4} 150 {x+4} 140 {x} 128" fill="none" stroke="#ffb8dc" stroke-width="4" opacity=".8"/><circle cx="{x}" cy="126" r="5" fill="#ffb8dc"/>'
    return svg("", b)


def T_vent():
    b = plate(52, 14, 214, METAL)
    b += '<rect x="96" y="176" width="64" height="30" rx="6" fill="#4a3a48" stroke="#1a1018" stroke-width="3"/>'
    for x in (106, 120, 134, 148):
        b += f'<rect x="{x}" y="182" width="6" height="18" fill="#1a1018"/>'
    for i, r in enumerate((28, 40, 52)):
        b += f'<circle cx="{120+i*8}" cy="{140-i*34}" r="{r}" fill="#ff9ad0" opacity="{.35-i*.08:.2f}"/>'
    return svg("", b)


def T_urn():
    b = plate(52, 14, 216)
    b += '<path d="M92 88 C60 120 70 200 96 212 L160 212 C186 200 196 120 164 88Z" fill="#c88a5a" stroke="#4a2410" stroke-width="5"/>'
    b += '<ellipse cx="128" cy="88" rx="38" ry="12" fill="#ff9ad0" stroke="#4a2410" stroke-width="4"/>'
    b += '<path d="M154 92 C170 110 176 140 168 160" fill="none" stroke="#ff9ad0" stroke-width="10" stroke-linecap="round" opacity=".85"/>'
    b += '<path d="M94 120 C92 150 98 180 110 200" fill="none" stroke="#fff" stroke-width="5" opacity=".3"/>'
    return svg("", b)


def T_vine():
    c = TC["絡"]; b = plate(66, 18, 210, c, .7)
    for d in ["M70 206 C60 170 90 150 84 120", "M128 210 C140 170 110 140 128 104", "M186 206 C200 170 168 150 176 118", "M100 210 C110 184 150 190 160 168"]:
        b += tube(d, c[2], c[1], c[0], 11)
    for x, y in [(84, 120), (128, 104), (176, 118)]:
        b += f'<path d="M{x} {y} l-10 -8 M{x} {y} l10 -8" stroke="{c[2]}" stroke-width="4" stroke-linecap="round"/>'
    return svg("", b)


def T_rope():
    b = plate(60, 16, 212, WOOD, .8)
    b += '<rect x="112" y="150" width="32" height="56" rx="6" fill="#8a6030" stroke="#3e2410" stroke-width="4"/>'
    b += '<circle cx="128" cy="150" r="30" fill="#c8a060" stroke="#3e2410" stroke-width="5"/>'
    for i in range(8):
        a = math.radians(i * 45)
        b += f'<path d="M{128+math.cos(a)*18:.1f} {150+math.sin(a)*18:.1f} L{128+math.cos(a)*34:.1f} {150+math.sin(a)*34:.1f}" stroke="#3e2410" stroke-width="6" stroke-linecap="round"/>'
    b += '<path d="M128 120 C90 90 60 110 40 80 M128 120 C166 90 196 110 216 80" fill="none" stroke="#d8b07a" stroke-width="6" stroke-linecap="round"/>'
    b += '<circle cx="40" cy="80" r="10" fill="none" stroke="#d8b07a" stroke-width="5"/><circle cx="216" cy="80" r="10" fill="none" stroke="#d8b07a" stroke-width="5"/>'
    return svg("", b)


def T_shrine():
    b = plate(60, 16, 214)
    b += '<rect x="92" y="120" width="72" height="88" fill="#d8c8a8" stroke="#3a2c1a" stroke-width="4"/>'
    b += '<path d="M78 124 L128 82 L178 124Z" fill="#8a3a3a" stroke="#3a1414" stroke-width="4"/>'
    b += '<rect x="112" y="146" width="32" height="40" rx="4" fill="#3a2c1a"/>'
    b += glow(128, 166, 20, "#7fe8ff", .45) + glow(128, 166, 44, "#7fe8ff", .15)
    return svg("", b)


def T_basin():
    b = plate(60, 16, 216)
    b += '<path d="M76 150 L180 150 L166 200 L90 200Z" fill="#b8b2c8" stroke="#2a2432" stroke-width="4"/>'
    b += '<ellipse cx="128" cy="150" rx="52" ry="14" fill="#8ff0ff" stroke="#2a2432" stroke-width="4"/>'
    b += '<ellipse cx="116" cy="148" rx="20" ry="4" fill="#fff" opacity=".6"/>'
    for x in (104, 128, 152):
        b += f'<path d="M{x} 136 C{x-6} 120 {x+6} 110 {x} 96" fill="none" stroke="#bff8ff" stroke-width="3" opacity=".6"/>'
    return svg("", b)


def T_pillory():
    b = plate(66, 16, 214, WOOD, .8)
    for x in (72, 184):
        b += f'<rect x="{x-8}" y="80" width="16" height="130" fill="#a4743e" stroke="#3e2410" stroke-width="4"/>'
    b += '<rect x="56" y="104" width="144" height="34" rx="4" fill="#c8945a" stroke="#3e2410" stroke-width="4"/>'
    b += '<path d="M56 121 L200 121" stroke="#3e2410" stroke-width="3"/>'
    for x, r in [(92, 9), (128, 15), (164, 9)]:
        b += f'<circle cx="{x}" cy="121" r="{r}" fill="#2a1408"/>'
    return svg("", b)


def T_tease():
    c = TC["蕩"]; b = plate(74, 16, 214, c, .6)
    b += '<rect x="58" y="136" width="140" height="44" rx="10" fill="#f4e0ea" stroke="#5a1e3a" stroke-width="4"/>'
    b += '<rect x="58" y="176" width="140" height="18" rx="4" fill="#8a4a64" stroke="#5a1e3a" stroke-width="4"/>'
    for x in (70, 186):
        b += f'<rect x="{x-6}" y="192" width="12" height="22" fill="#5a1e3a"/>'
    for x in (84, 172):
        b += f'<path d="M{x-12} 156 C{x-12} 146 {x+12} 146 {x+12} 156 C{x+12} 166 {x-12} 166 {x-12} 156" fill="none" stroke="#e77ab4" stroke-width="5"/>'
    b += glow(128, 150, 40, c[1], .25)
    return svg("", b)


def T_belt():
    b = '<path d="M30 200 L200 120 L230 146 L60 226Z" fill="#4a4250" stroke="#1a1418" stroke-width="4"/>'
    for i in range(7):
        t = i / 6
        x1, y1 = 30 + 170 * t, 200 - 80 * t
        b += f'<path d="M{x1+6:.0f} {y1+4:.0f} l30 26" stroke="#8a8098" stroke-width="4"/>'
    b += '<path d="M120 170 l18 -8 l-2 10 z M150 156 l18 -8 l-2 10 z" fill="#ffd27a"/>'
    return svg("", b)


def T_gate():
    b = plate(70, 16, 216, METAL, .8)
    for x in (70, 186):
        b += f'<rect x="{x-10}" y="50" width="20" height="162" rx="6" fill="#c8a860" stroke="#4a3a10" stroke-width="4"/>'
    b += '<path d="M60 56 C90 30 166 30 196 56" fill="none" stroke="#c8a860" stroke-width="14"/>'
    b += '<path d="M96 80 C88 110 92 160 100 200 L156 200 C164 160 168 110 160 80 C150 70 106 70 96 80Z" fill="#6a5a3a" stroke="#2a2010" stroke-width="3" opacity=".7"/>'
    for y in (90, 120, 150, 180):
        b += f'<path d="M84 {y} l10 0 M162 {y} l10 0" stroke="#4a3a10" stroke-width="3"/>'
    return svg("", b)


def T_cuffs():
    b = '<rect x="40" y="40" width="176" height="150" rx="6" fill="#6a6272" stroke="#2a2432" stroke-width="4"/>'
    for i in range(4):
        b += f'<path d="M40 {70+i*32} L216 {70+i*32}" stroke="#4a4252" stroke-width="3"/>'
    for x, y in [(80, 90), (176, 90), (92, 170), (164, 170)]:
        b += f'<circle cx="{x}" cy="{y}" r="16" fill="none" stroke="#c8c8d8" stroke-width="7"/><circle cx="{x}" cy="{y}" r="16" fill="none" stroke="#2a2432" stroke-width="2"/>'
        b += f'<rect x="{x-5}" y="{y-26}" width="10" height="12" fill="#8a8a98" stroke="#2a2432" stroke-width="2"/>'
    return svg("", b)


def T_bed():
    b = plate(78, 16, 218, STONE, .6)
    b += '<rect x="48" y="140" width="160" height="52" rx="12" fill="#f4eee4" stroke="#4a3a2a" stroke-width="4"/>'
    b += '<rect x="56" y="126" width="46" height="26" rx="10" fill="#fff" stroke="#4a3a2a" stroke-width="3"/>'
    b += '<rect x="48" y="186" width="160" height="16" rx="4" fill="#8a6a4a" stroke="#4a3a2a" stroke-width="4"/>'
    for i, (x, y) in enumerate([(150, 110), (170, 84), (148, 60)]):
        b += f'<circle cx="{x}" cy="{y}" r="{14-i*3}" fill="#c8a0ff" opacity=".35"/>'
    b += '<text x="176" y="118" font-size="22" fill="#a07ae0" font-family="sans-serif">z</text><text x="192" y="92" font-size="16" fill="#a07ae0" font-family="sans-serif">z</text>'
    return svg("", b)


def T_spring():
    b = '<ellipse cx="128" cy="170" rx="92" ry="40" fill="#8a8298" stroke="#2a2432" stroke-width="5"/>'
    b += '<ellipse cx="128" cy="166" rx="80" ry="32" fill="#f4f0f2"/>'
    b += '<ellipse cx="104" cy="160" rx="26" ry="6" fill="#fff" opacity=".8"/>'
    for x in (90, 128, 166):
        b += f'<path d="M{x} 140 C{x-10} 120 {x+10} 100 {x} 80" fill="none" stroke="#fff" stroke-width="5" opacity=".6"/>'
    for x, y in [(88, 176), (150, 180), (170, 160)]:
        b += f'<circle cx="{x}" cy="{y}" r="4" fill="#e8d8e0"/>'
    return svg("", b)


def T_slime_drop():
    c = TC["蕩"]
    b = '<rect x="40" y="18" width="176" height="26" fill="#6a6272" stroke="#2a2432" stroke-width="4"/><path d="M110 18 L110 44 M146 18 L146 44" stroke="#2a2432" stroke-width="3"/>'
    b += '<path d="M128 44 C108 60 100 90 110 108 C118 124 138 124 146 108 C156 90 148 60 128 44Z" fill="#ff9ad0" stroke="#7a2a50" stroke-width="4" opacity=".9"/>'
    b += '<ellipse cx="128" cy="204" rx="62" ry="16" fill="#ff9ad0" stroke="#7a2a50" stroke-width="4" opacity=".8"/>'
    for y in (140, 166):
        b += f'<circle cx="{128+(y-150)/4}" cy="{y}" r="{7-(y-140)/10}" fill="#ffb8dc"/>'
    b += '<path d="M60 190 L40 180 M196 190 L216 180" stroke="#ff9ad0" stroke-width="5" stroke-linecap="round"/>'
    return svg("", b)


def T_bud():
    c = TC["蕩"]
    b = '<path d="M0 20 L256 20" stroke="#3a4a30" stroke-width="10"/>'
    for x, h in [(64, 70), (128, 100), (192, 64)]:
        b += f'<path d="M{x} 20 C{x-6} {20+h/2} {x+6} {20+h/2} {x} {20+h}" fill="none" stroke="#5a7a44" stroke-width="5"/>'
        b += f'<path d="M{x} {20+h+34} C{x-24} {20+h+20} {x-18} {20+h-6} {x} {20+h} C{x+18} {20+h-6} {x+24} {20+h+20} {x} {20+h+34}Z" fill="#fff4f8" stroke="#8a4a64" stroke-width="3"/>'
        b += f'<circle cx="{x}" cy="{20+h+44}" r="5" fill="#ffd27a"/>'
    b += '<path d="M40 212 C80 196 176 196 216 212" fill="none" stroke="#5a7a44" stroke-width="6" stroke-linecap="round"/>'
    b += '<ellipse cx="128" cy="220" rx="40" ry="8" fill="#ffd27a" opacity=".5"/>'
    return svg("", b)


def T_root():
    c = TC["絡"]
    b = '<path d="M40 180 L216 180 L200 226 L56 226Z" fill="#6a6272" stroke="#2a2432" stroke-width="4"/>'
    b += '<path d="M60 202 L196 202 M128 180 L128 226" stroke="#2a2432" stroke-width="3"/>'
    for i in range(14):
        x = 50 + i * 12
        b += f'<path d="M{x} 202 C{x-8} {170-(i%3)*10} {x+10} {150-(i%4)*12} {x+2} {120-(i%5)*8}" fill="none" stroke="#c8d8a0" stroke-width="2.5" opacity=".9"/>'
    return svg("", b)


def T_cocoon():
    b = plate(60, 16, 216, ("#fff", "#e8e4ec", "#8a8298"), .8)
    b += '<ellipse cx="128" cy="130" rx="54" ry="86" fill="#f8f6fa" stroke="#8a8298" stroke-width="4"/>'
    for i in range(8):
        y = 60 + i * 18
        b += f'<path d="M{80+abs(i-4)*5} {y} C110 {y+10} 146 {y-6} {176-abs(i-4)*5} {y+6}" fill="none" stroke="#d8d2e0" stroke-width="3"/>'
    b += '<ellipse cx="108" cy="96" rx="12" ry="24" fill="#fff" opacity=".8"/>'
    b += glow(128, 130, 80, "#ffd6e8", .15)
    return svg("", b)


def T_ratchet():
    b = plate(70, 16, 216, METAL, .8)
    b += '<rect x="60" y="120" width="136" height="80" rx="8" fill="none" stroke="#2a2432" stroke-width="12"/>'
    b += '<rect x="60" y="120" width="136" height="80" rx="8" fill="none" stroke="#8a8a98" stroke-width="6"/>'
    for x in (92, 128, 164):
        b += f'<path d="M{x} 120 L{x} 200" stroke="#6a6a78" stroke-width="5"/>'
    b += '<circle cx="196" cy="110" r="26" fill="#b8b8c8" stroke="#2a2432" stroke-width="4"/>'
    for i in range(10):
        a = math.radians(i * 36)
        b += f'<path d="M{196+math.cos(a)*24:.1f} {110+math.sin(a)*24:.1f} L{196+math.cos(a)*34:.1f} {110+math.sin(a)*34:.1f}" stroke="#2a2432" stroke-width="6"/>'
    b += '<circle cx="196" cy="110" r="8" fill="#2a2432"/>'
    return svg("", b)


def T_altar():
    b = plate(70, 18, 216)
    b += '<rect x="76" y="130" width="104" height="80" fill="#2a2430" stroke="#0a080e" stroke-width="4"/>'
    b += '<rect x="68" y="120" width="120" height="16" fill="#3a3440" stroke="#0a080e" stroke-width="4"/>'
    b += '<path d="M128 150 C112 160 108 180 128 192 C148 180 144 160 128 150Z M110 172 L146 172" fill="none" stroke="#ff5fa8" stroke-width="4"/>'
    for x in (52, 204):
        b += f'<rect x="{x-5}" y="110" width="10" height="100" fill="#3a3440"/><path d="M{x} 108 C{x-10} 90 {x+4} 78 {x} 66 C{x+12} 84 {x+10} 96 {x} 108Z" fill="#1a1020" stroke="#8a5aa0" stroke-width="2"/>'
    b += glow(128, 172, 40, "#ff5fa8", .2)
    return svg("", b)


def T_shadow():
    b = '<ellipse cx="128" cy="200" rx="80" ry="22" fill="#1a1024" opacity=".8"/>'
    for i, (x, y) in enumerate([(70, 110), (104, 90), (152, 90), (186, 110)]):
        b += f'<path d="M{128+(x-128)*.5:.0f} 196 C{x} 170 {x} 140 {x} {y}" fill="none" stroke="#2a1840" stroke-width="12" stroke-linecap="round"/>'
        for f in (-8, 0, 8):
            b += f'<path d="M{x} {y} l{f} -16" stroke="#2a1840" stroke-width="5" stroke-linecap="round"/>'
    for x in (30, 226):
        b += f'<rect x="{x-5}" y="120" width="10" height="80" fill="#8a7a60"/><path d="M{x} 118 C{x-10} 100 {x+4} 88 {x} 76 C{x+12} 94 {x+10} 106 {x} 118Z" fill="#ffc86a"/>'
    return svg("", b)


def T_echo_gate():
    b = plate(74, 16, 218)
    b += '<path d="M60 214 L60 80 C60 36 196 36 196 80 L196 214Z" fill="#8a8298" stroke="#2a2432" stroke-width="5"/>'
    b += '<path d="M80 214 L80 90 C80 58 176 58 176 90 L176 214Z" fill="#4a4258" stroke="#2a2432" stroke-width="3"/>'
    for i in range(6):
        b += f'<path d="M96 {100+i*16} L{160-(i%3)*10} {100+i*16}" stroke="#e6d6ff" stroke-width="4" stroke-linecap="round" opacity=".85"/>'
    b += '<path d="M128 62 l10 8 l-10 8 l-10 -8z" fill="#a07ae0"/>'
    return svg("", b)


def T_lull_voice():
    b = ""
    for i, r in enumerate((30, 52, 76, 100)):
        b += f'<path d="M{128-r} 150 A{r} {r*0.7} 0 0 1 {128+r} 150" fill="none" stroke="#b8c8ff" stroke-width="{6-i}" opacity="{.8-i*.15:.2f}"/>'
    for x, y in [(80, 90), (176, 80), (128, 50)]:
        b += f'<path d="M{x} {y} l0 -22 l14 -4 l0 22" fill="none" stroke="#e6d6ff" stroke-width="4"/><ellipse cx="{x-4}" cy="{y}" rx="6" ry="4" fill="#e6d6ff"/><ellipse cx="{x+10}" cy="{y-4}" rx="6" ry="4" fill="#e6d6ff"/>'
    b += '<ellipse cx="128" cy="200" rx="30" ry="10" fill="#a07ae0" opacity=".35"/>'
    return svg("", b)


def T_armor():
    b = plate(52, 14, 218, METAL, .8)
    b += '<path d="M92 108 C92 94 164 94 164 108 L160 180 L96 180Z" fill="#9aa6c8" stroke="#1a2030" stroke-width="5"/>'
    b += '<path d="M128 104 L128 180" stroke="#1a2030" stroke-width="3"/><path d="M122 104 L122 180 L134 180 L134 104Z" fill="#2a1030" opacity=".8"/>'
    b += '<ellipse cx="128" cy="76" rx="26" ry="28" fill="#b8c2de" stroke="#1a2030" stroke-width="5"/>'
    b += '<rect x="110" y="72" width="36" height="8" fill="#0a0a10"/>'
    for x in (104, 152):
        b += f'<rect x="{x-10}" y="178" width="20" height="36" rx="4" fill="#9aa6c8" stroke="#1a2030" stroke-width="4"/>'
    b += '<path d="M126 110 C120 130 136 150 128 172" fill="none" stroke="#ff9ad0" stroke-width="4" opacity=".7"/>'
    return svg("", b)


def T_stasis():
    b = ""
    for i, x in enumerate((70, 100, 128, 156, 186)):
        b += f'<path d="M{x} 20 C{x-12} 80 {x+12} 150 {x} 214" fill="none" stroke="#d8e8ff" stroke-width="{10-abs(i-2)*2}" opacity=".45"/>'
    b += '<circle cx="128" cy="120" r="30" fill="none" stroke="#8fd3ff" stroke-width="5"/><path d="M128 120 L128 100 M128 120 L142 128" stroke="#8fd3ff" stroke-width="5" stroke-linecap="round"/>'
    b += '<path d="M40 20 L216 20" stroke="#6a6272" stroke-width="10"/>'
    return svg("", b)


def T_vow():
    b = plate(56, 14, 218)
    b += '<rect x="86" y="120" width="84" height="92" fill="#e8e0f0" stroke="#3e2470" stroke-width="4"/>'
    b += '<path d="M76 124 L180 124 L170 108 L86 108Z" fill="#c8b8e0" stroke="#3e2470" stroke-width="4"/>'
    for i in range(4):
        b += f'<path d="M100 {140+i*16} L{156-(i%2)*14} {140+i*16}" stroke="#a07ae0" stroke-width="4" stroke-linecap="round"/>'
    b += '<circle cx="128" cy="86" r="16" fill="none" stroke="#ff5fa8" stroke-width="5"/><path d="M116 98 L140 74" stroke="#ff5fa8" stroke-width="5"/>'
    return svg("", b)


def T_saddle():
    b = '<rect x="0" y="176" width="256" height="60" fill="#0a0810"/>'
    b += '<path d="M10 150 L246 120 L246 136 L10 166Z" fill="#a4743e" stroke="#3e2410" stroke-width="4"/>'
    for i in range(7):
        x = 30 + i * 32; y = 150 - (x - 10) * 30 / 236
        b += f'<ellipse cx="{x}" cy="{y-6:.0f}" rx="9" ry="8" fill="#d0709e" stroke="#6e2250" stroke-width="3"/>'
    return svg("", b)


def T_itch():
    b = plate(56, 14, 220, METAL, .7)
    b += '<path d="M78 70 C78 40 178 40 178 70 L178 210 L78 210Z" fill="none" stroke="#6a6272" stroke-width="6"/>'
    for x in range(90, 178, 16):
        b += f'<path d="M{x} 58 L{x} 210" stroke="#8a8298" stroke-width="4"/>'
    b += '<path d="M128 20 L128 46" stroke="#6a6272" stroke-width="6"/>'
    for x, y in [(100, 90), (140, 110), (116, 140), (156, 160), (104, 180), (136, 76)]:
        b += f'<circle cx="{x}" cy="{y}" r="3" fill="#ffe27a"/>'
    return svg("", b)


def T_tickle():
    b = '<rect x="20" y="40" width="30" height="170" fill="#6a6272" stroke="#2a2432" stroke-width="4"/><rect x="206" y="40" width="30" height="170" fill="#6a6272" stroke="#2a2432" stroke-width="4"/>'
    for s, x0 in ((1, 50), (-1, 206)):
        for y in (80, 130, 180):
            b += f'<path d="M{x0} {y} L{x0+s*44} {y-10}" stroke="#2a2432" stroke-width="6" stroke-linecap="round"/>'
            for k in range(5):
                a = math.radians(-40 + k * 20)
                b += f'<path d="M{x0+s*44} {y-10} l{s*math.cos(a)*22:.1f} {math.sin(a)*22:.1f}" stroke="#ffd6ec" stroke-width="3" stroke-linecap="round"/>'
    return svg("", b)


def T_aphro_wall():
    b = '<rect x="40" y="30" width="176" height="180" rx="6" fill="#8a5a6a" stroke="#3a1a28" stroke-width="4"/>'
    for i in range(12):
        x = 56 + (i * 37) % 150; y = 50 + (i * 53) % 130
        b += f'<path d="M{x} {y} C{x-4} {y+10} {x+4} {y+14} {x} {y+22}" fill="none" stroke="#ffb8dc" stroke-width="4" stroke-linecap="round" opacity=".8"/><circle cx="{x}" cy="{y+24}" r="3" fill="#ffb8dc"/>'
    b += glow(128, 120, 90, "#ff9ad0", .15)
    return svg("", b)


def T_exam():
    b = plate(78, 16, 220, METAL, .6)
    b += '<rect x="44" y="138" width="168" height="40" rx="10" fill="#f4f8ff" stroke="#1a2030" stroke-width="4"/>'
    for x in (60, 196):
        b += f'<rect x="{x-5}" y="176" width="10" height="36" fill="#9aa6c8" stroke="#1a2030" stroke-width="3"/>'
    for x in (74, 182):
        b += f'<path d="M{x-10} 150 L{x+10} 150 L{x+10} 166 L{x-10} 166Z" fill="none" stroke="#8a4a64" stroke-width="4"/>'
    b += '<rect x="150" y="96" width="60" height="16" rx="3" fill="#dde4f0" stroke="#1a2030" stroke-width="3"/>'
    b += '<path d="M160 96 L162 80 M176 96 L180 76 M194 96 L196 84" stroke="#9aa6c8" stroke-width="4" stroke-linecap="round"/>'
    return svg("", b)


def T_net():
    b = '<path d="M40 30 L216 30" stroke="#6a6272" stroke-width="10"/>'
    for i in range(7):
        x = 40 + i * 29
        b += f'<path d="M{x} 30 C{x+10} 100 {x-10} 160 {x+(i-3)*6} 210" fill="none" stroke="#c8b88a" stroke-width="3"/>'
    for j in range(5):
        y = 60 + j * 36
        b += f'<path d="M{40+j*4} {y} C100 {y+12} 156 {y-12} {216-j*4} {y}" fill="none" stroke="#c8b88a" stroke-width="3"/>'
    return svg("", b)


def T_pitfall():
    b = '<ellipse cx="128" cy="170" rx="86" ry="34" fill="#6a6272" stroke="#2a2432" stroke-width="4"/>'
    b += '<ellipse cx="128" cy="170" rx="66" ry="24" fill="#0a0810"/>'
    b += '<path d="M80 170 C96 150 110 160 116 176 M150 176 C156 154 172 152 180 166" fill="none" stroke="#5a2a48" stroke-width="5" stroke-linecap="round"/>'
    return svg("", b)


def T_toybox():
    b = box(66, 130, 124, 80, WOOD)
    b += '<path d="M62 132 C62 96 194 96 194 132Z" fill="#c8945a" stroke="#3e2410" stroke-width="4"/>'
    b += '<rect x="118" y="124" width="20" height="26" rx="3" fill="#f2d27a" stroke="#6a4a10" stroke-width="3"/>'
    for x, y in [(90, 90), (128, 76), (166, 90)]:
        b += f'<ellipse cx="{x}" cy="{y}" rx="9" ry="12" fill="#ff9ad0" stroke="#7a2a50" stroke-width="3"/>'
    b += glow(128, 100, 50, "#ffd27a", .25)
    return svg("", b)


def T_suit():
    b = '<path d="M70 40 L186 40" stroke="#6a4a2a" stroke-width="8"/><path d="M128 40 L128 20" stroke="#6a4a2a" stroke-width="6"/>'
    b += '<path d="M90 50 L166 50 L182 110 L166 116 L160 210 L96 210 L90 116 L74 110Z" fill="#d0709e" stroke="#3a0e28" stroke-width="4"/>'
    b += '<path d="M108 50 L128 80 L148 50" fill="none" stroke="#ffd6e6" stroke-width="4"/>'
    for y in (110, 140, 170):
        b += f'<path d="M100 {y} C116 {y+10} 140 {y-10} 156 {y}" fill="none" stroke="#6e2250" stroke-width="3" opacity=".7"/>'
    b += '<path d="M96 210 C92 222 100 226 104 216 M160 210 C164 222 156 226 152 216" stroke="#d0709e" stroke-width="5" fill="none" stroke-linecap="round"/>'
    return svg("", b)


def T_curtain():
    b = '<path d="M20 30 L236 30" stroke="#3a4a30" stroke-width="10"/>'
    for i in range(12):
        x = 30 + i * 18
        b += f'<path d="M{x} 30 C{x-8} 90 {x+8} 150 {x+(i%3-1)*6} {196+(i%2)*14}" fill="none" stroke="#b0708e" stroke-width="7" stroke-linecap="round"/>'
        b += f'<path d="M{x} 30 C{x-8} 90 {x+8} 150 {x+(i%3-1)*6} {196+(i%2)*14}" fill="none" stroke="#ffc0d8" stroke-width="2" opacity=".6"/>'
    return svg("", b)


def T_sucker():
    b = '<rect x="30" y="30" width="196" height="186" rx="8" fill="#b0708e" stroke="#4a1830" stroke-width="4"/>'
    for i in range(20):
        x = 52 + (i % 5) * 38 + (i // 5 % 2) * 18; y = 56 + (i // 5) * 42
        if x > 214: continue
        b += f'<circle cx="{x}" cy="{y}" r="13" fill="#ffc0d8" stroke="#6e2250" stroke-width="3"/><circle cx="{x}" cy="{y}" r="5" fill="#6e2250"/>'
    return svg("", b)


def T_honey():
    b = '<path d="M40 186 C30 156 90 146 128 152 C176 146 226 160 214 190 C204 220 60 224 40 186Z" fill="#f2b84a" stroke="#7a4a10" stroke-width="4" opacity=".92"/>'
    b += '<path d="M70 176 C100 164 160 162 190 176" fill="none" stroke="#fff4c8" stroke-width="6" opacity=".6"/>'
    for x in (96, 150):
        b += f'<circle cx="{x}" cy="{186}" r="6" fill="#ffe6a0"/>'
    return svg("", b)


def T_whisper_ring():
    b = '<ellipse cx="128" cy="180" rx="90" ry="34" fill="#4a3a58" opacity=".4"/>'
    for i in range(9):
        a = math.radians(i * 40)
        x, y = 128 + math.cos(a) * 80, 176 + math.sin(a) * 28
        b += f'<rect x="{x-4:.0f}" y="{y-26:.0f}" width="8" height="26" fill="#e8dcc8"/><path d="M{x-18:.0f} {y-24:.0f} C{x-18:.0f} {y-44:.0f} {x+18:.0f} {y-44:.0f} {x+18:.0f} {y-24:.0f}Z" fill="#a07ae0" stroke="#3e2470" stroke-width="3"/>'
    for r in (20, 36):
        b += f'<path d="M{128-r} 120 Q128 {100-r} {128+r} 120" fill="none" stroke="#e6d6ff" stroke-width="3" opacity=".6"/>'
    return svg("", b)


def T_hypno_ray():
    b = plate(70, 16, 216, METAL, .6)
    b += '<path d="M104 210 L112 120 L144 120 L152 210Z" fill="#6a728a" stroke="#1a2030" stroke-width="4"/>'
    b += '<circle cx="128" cy="96" r="34" fill="#1a1e30" stroke="#1a2030" stroke-width="5"/>'
    b += '<path d="M128 96 m-22 0 a22 22 0 1 1 22 22 a14 14 0 1 1 -14 -14 a7 7 0 1 1 7 7" fill="none" stroke="#9fb8ff" stroke-width="4"/>'
    b += '<path d="M128 116 l12 10 l-12 10 l-12 -10z" fill="#9a6cff" transform="translate(0 40)"/>'
    b += glow(128, 96, 70, "#9fb8ff", .15)
    return svg("", b)


def T_furnace():
    b = plate(66, 16, 218, METAL, .7)
    b += '<path d="M80 210 L86 100 C86 70 170 70 170 100 L176 210Z" fill="#4a5268" stroke="#1a2030" stroke-width="5"/>'
    b += '<ellipse cx="128" cy="140" rx="26" ry="34" fill="#8ff0ff" stroke="#1a2030" stroke-width="4"/>'
    b += '<ellipse cx="128" cy="140" rx="14" ry="20" fill="#e8feff"/>'
    for x in (96, 160):
        b += f'<path d="M{x} 100 C{x} 60 {x+(128-x)} 40 128 30" fill="none" stroke="#6ac8e0" stroke-width="5" opacity=".6"/>'
    b += glow(128, 140, 60, "#8ff0ff", .2)
    return svg("", b)


def T_pod():
    b = plate(50, 14, 222, METAL, .8)
    b += '<path d="M84 214 L84 70 C84 30 172 30 172 70 L172 214Z" fill="#6a728a" stroke="#1a2030" stroke-width="5"/>'
    b += '<path d="M96 206 L96 76 C96 46 160 46 160 76 L160 206Z" fill="#b8d0ff" stroke="#1a2030" stroke-width="3" opacity=".55"/>'
    b += '<path d="M128 70 C110 80 108 110 128 120 C148 110 146 80 128 70Z M128 120 L128 200" fill="none" stroke="#2a1840" stroke-width="4" opacity=".5"/>'
    b += '<path d="M112 36 l16 -12 l16 12" fill="none" stroke="#9a6cff" stroke-width="4"/>'
    b += '<rect x="104" y="180" width="48" height="12" rx="3" fill="#1a1e30"/><text x="128" y="190" font-size="10" text-anchor="middle" font-family="sans-serif" fill="#ff5f9e">No.2</text>'
    return svg("", b)


def T_capture():
    b = '<circle cx="128" cy="170" r="62" fill="none" stroke="#9a6cff" stroke-width="4"/><circle cx="128" cy="170" r="44" fill="#2a2440" opacity=".4"/>'
    b += '<path d="M128 132 l30 38 l-30 38 l-30 -38z" fill="none" stroke="#9a6cff" stroke-width="3"/>'
    for a in (-150, -30, 40, 140):
        r = math.radians(a)
        x, y = 128 + math.cos(r) * 62, 170 + math.sin(r) * 40
        x2, y2 = 128 + math.cos(r) * 30, 110 + math.sin(r) * 20
        b += f'<path d="M{x:.0f} {y:.0f} L{x2:.0f} {y2:.0f}" stroke="#1a2030" stroke-width="12" stroke-linecap="round"/><path d="M{x:.0f} {y:.0f} L{x2:.0f} {y2:.0f}" stroke="#9aa6c8" stroke-width="6" stroke-linecap="round"/>'
        b += f'<circle cx="{x2:.0f}" cy="{y2:.0f}" r="10" fill="none" stroke="#c8d0e8" stroke-width="5"/>'
    return svg("", b)


def T_rune():
    b = '<rect x="56" y="150" width="144" height="60" rx="6" fill="#8a8298" stroke="#2a2432" stroke-width="4" transform="skewX(-12) translate(22 0)"/>'
    b += '<path d="M128 160 C110 170 106 190 128 202 C150 190 146 170 128 160Z M104 182 L152 182" fill="none" stroke="#ff5fa8" stroke-width="4"/>'
    b += glow(128, 182, 36, "#ff5fa8", .3)
    return svg("", b)


TRAPS = {k[2:]: f for k, f in globals().items() if k.startswith("T_")}


def floor_waldo():
    """ワルドーの支部の床：金属板（4×2 のうち、右端の列は紋章入りの珍しい板）"""
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (256, 128), (40, 44, 58))
    d = ImageDraw.Draw(im)
    for row in range(2):
        for col in range(4):
            x0, y0 = col * 64, row * 64
            base = (58 + (col * 7 + row * 5) % 12, 62 + (col * 3) % 10, 80 + (row * 6) % 10)
            d.rectangle([x0, y0, x0 + 63, y0 + 63], fill=base)
            d.rectangle([x0 + 2, y0 + 2, x0 + 61, y0 + 61], outline=(90, 96, 122))
            d.line([x0 + 2, y0 + 62, x0 + 62, y0 + 62], fill=(26, 28, 38), width=2)
            d.line([x0 + 62, y0 + 2, x0 + 62, y0 + 62], fill=(26, 28, 38), width=2)
            for cx, cy in [(6, 6), (57, 6), (6, 57), (57, 57)]:
                d.ellipse([x0 + cx - 2, y0 + cy - 2, x0 + cx + 2, y0 + cy + 2], fill=(130, 138, 168))
            if col == 1:
                for k in range(4):
                    d.line([x0 + 10, y0 + 18 + k * 9, x0 + 54, y0 + 18 + k * 9], fill=(48, 52, 68), width=3)
            if col == 2:
                d.line([x0 + 32, y0 + 4, x0 + 32, y0 + 60], fill=(48, 52, 68), width=2)
            if col == 3:
                d.polygon([(x0 + 32, y0 + 16), (x0 + 48, y0 + 32), (x0 + 32, y0 + 48), (x0 + 16, y0 + 32)], outline=(154, 108, 255), fill=(70, 56, 110))
    return im


if __name__ == "__main__":
    MON.mkdir(parents=True, exist_ok=True)
    TRAP.mkdir(parents=True, exist_ok=True)
    for k, s in MONSTERS.items():
        (MON / f"{k}.svg").write_text(s)
    for k, f in TRAPS.items():
        (TRAP / f"{k}.svg").write_text(f())
    floor_waldo().convert("P", palette=1, colors=64).save(ENV / "floor_waldo.png")
    print("monsters", len(MONSTERS), "traps", len(TRAPS))
