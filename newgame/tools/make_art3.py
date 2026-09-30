"""3回目に足した魔物と罠の見た目（SVG）と床。make_art.py と同じ作法。

- 蟲（小さなワーム）とヒル：釣り蟲・髄洞・響き蟲・泥蟲・擬態蟲・這い蟲・肥大化ヒル
- 変生の神殿：咥え蟲・鞘苔・掌の群れ・受け甕・先嬲りの小淫魔
- 教団：信者・説教師・抽出師・教祖（頭巾と祭衣。顔は描き込まない）
- 淫魔の館：実況・擽り・数える・嘲る小淫魔（丸い魔物の姿。人の子供の姿にはしない）。口づけの淫魔は inma.png の色違い
- 罠18種と、床3枚（floor_futa / floor_cult / floor_imp）
使い方: python3 newgame/tools/make_art3.py
"""
import math
from make_monsters import svg, rgrad, lgrad, shadow, eyes, tube
from make_art import P, star, spark, plate, glow, box, TC, STONE, METAL, WOOD, MON, TRAP, ENV


# ================================================================ 蟲・ヒル
def worm(x0, y0, x1, y1, w, fill, o, seg=5, bend=18):
    """体節のある小さなワーム（先端に丸い口）。"""
    mx, my = (x0 + x1) / 2 + bend, (y0 + y1) / 2 - bend * 0.4
    d = f"M{x0} {y0} Q{mx} {my} {x1} {y1}"
    out = tube(d, o, fill, "#fff", w)
    for i in range(1, seg):
        t = i / seg
        x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1
        y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1
        out += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{w*0.52:.1f}" fill="none" stroke="{o}" stroke-width="1.5" opacity=".45"/>'
    out += f'<circle cx="{x1}" cy="{y1}" r="{w*0.55:.1f}" fill="{o}"/><circle cx="{x1}" cy="{y1}" r="{w*0.28:.1f}" fill="#ff7fb0"/>'
    return out


def tsurimushi():
    o = "#4a1a30"; b = '<path d="M128 0 L128 70" stroke="#e8d0e0" stroke-width="2" opacity=".8"/>'
    b += shadow(24, 232, .12)
    b += worm(128, 70, 118, 190, 20, "#e89ab8", o, 6, 26)
    b += '<circle cx="128" cy="70" r="6" fill="#f4d8e8"/>'
    b += spark(160, 120, 6, "#ffd6ec")
    return svg("", b)


def zuidou():
    o = "#3a1428"; b = shadow(70)
    b += '<ellipse cx="128" cy="210" rx="74" ry="22" fill="#241018" stroke="#0e0508" stroke-width="4"/><ellipse cx="128" cy="206" rx="58" ry="14" fill="#10060a"/>'
    for (x0, x1, y1, bd) in [(96, 64, 110, 20), (116, 104, 70, -14), (132, 150, 60, 16), (150, 196, 104, -18), (108, 88, 140, 10), (146, 172, 140, -8)]:
        b += worm(x0, 206, x1, y1, 14, "#dc8aaa", o, 5, bd)
    return svg("", b)


def hibiki():
    o = "#3a1a46"; b = shadow(56, 226, .14)
    for i, (x, y, a) in enumerate([(88, 170, -20), (130, 150, 10), (168, 176, 30), (110, 196, 0), (150, 204, -10), (128, 120, 20)]):
        dx, dy = math.cos(math.radians(a)) * 22, math.sin(math.radians(a)) * 22
        b += worm(x - dx, y - dy, x + dx, y + dy, 11, "#d4a0f0", o, 4, 6)
    for x, y in [(70, 130), (190, 140), (128, 90)]:
        b += f'<path d="M{x-10} {y} q5 -8 10 0 q5 8 10 0" fill="none" stroke="#e8ccff" stroke-width="3" stroke-linecap="round"/>'
    b += glow(128, 170, 70, "#c890ff", .15)
    return svg("", b)


def doromushi():
    o = "#2a1a10"; b = ""
    b += '<ellipse cx="128" cy="196" rx="100" ry="36" fill="#5a4030" stroke="#2a1a10" stroke-width="4"/><ellipse cx="120" cy="190" rx="70" ry="20" fill="#6e5038"/>'
    for x in (80, 150, 186):
        b += f'<circle cx="{x}" cy="{196 - (x % 7)}" r="6" fill="#8a6848" stroke="{o}" stroke-width="2"/>'
    for (x0, x1, y1, bd) in [(96, 80, 132, 16), (134, 128, 112, -14), (164, 184, 140, -12)]:
        b += worm(x0, 196, x1, y1, 15, "#c49a86", o, 5, bd)
    return svg("", b)


def gitai():
    o = "#2a2432"; b = '<rect x="40" y="30" width="176" height="190" rx="4" fill="#6a6272" stroke="#2a2432" stroke-width="4"/>'
    for y in range(30, 220, 38):
        b += f'<path d="M40 {y} L216 {y}" stroke="#4a4452" stroke-width="3"/>'
    for (x0, y0, x1, y1) in [(70, 60, 120, 90), (130, 110, 186, 70), (80, 150, 140, 180), (150, 170, 196, 200), (100, 200, 60, 120)]:
        b += worm(x0, y0, x1, y1, 13, "#8a8298", o, 5, 12)
    for x, y in [(120, 90), (186, 70), (140, 180), (196, 200), (60, 120)]:
        b += f'<circle cx="{x}" cy="{y}" r="3" fill="#ff9ad0"/>'
    return svg("", b)


def haimushi():
    o = "#3a1428"; b = shadow(60)
    b += worm(40, 214, 216, 200, 22, "#e6a0bc", o, 9, -30)
    for x in range(60, 210, 22):
        b += f'<path d="M{x} 222 l-4 10 M{x+6} 222 l2 10" stroke="{o}" stroke-width="2" opacity=".5"/>'
    return svg("", b)


def hiru():
    o = "#2a0e1a"
    defs = rgrad("hr", [(0, "#b86a8a"), (0.55, "#6a2a48"), (1, "#2a0e1a")])
    b = shadow(66)
    b += f'<path d="M50 200 C40 150 90 110 140 118 C190 124 220 160 206 196 C196 222 70 226 50 200Z" fill="url(#hr)" stroke="{o}" stroke-width="5"/>'
    for i in range(6):
        x = 76 + i * 22
        b += f'<path d="M{x} {126 + abs(i-2.5)*6:.0f} C{x+4} 160 {x+4} 190 {x} 214" fill="none" stroke="#e8a0c0" stroke-width="2" opacity=".35"/>'
    b += f'<ellipse cx="200" cy="176" rx="18" ry="22" fill="#4a1428" stroke="{o}" stroke-width="4"/><circle cx="200" cy="176" r="10" fill="#ff7fb0"/><circle cx="200" cy="176" r="4" fill="#4a1428"/>'
    b += '<ellipse cx="110" cy="140" rx="26" ry="8" fill="#fff" opacity=".3" transform="rotate(-12 110 140)"/>'
    return svg(defs, b)


# ================================================================ 変生の神殿
def kuwaemushi():
    o = "#4a1430"
    defs = rgrad("kw", [(0, "#ffd6e6"), (0.55, "#e58ab0"), (1, "#8a2f5a")])
    b = shadow(50)
    b += tube("M128 226 C110 200 146 176 128 150", o, "#e58ab0", "#ffd6e6", 34)
    b += f'<ellipse cx="128" cy="112" rx="56" ry="50" fill="url(#kw)" stroke="{o}" stroke-width="5"/>'
    b += f'<ellipse cx="128" cy="100" rx="34" ry="28" fill="#5a1030" stroke="{o}" stroke-width="4"/>'
    b += '<ellipse cx="128" cy="104" rx="22" ry="16" fill="#ff7fb0" opacity=".85"/>'
    for a in range(0, 360, 30):
        x, y = 128 + math.cos(math.radians(a)) * 30, 100 + math.sin(math.radians(a)) * 24
        b += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.5" fill="#ffc0d8"/>'
    b += '<ellipse cx="100" cy="76" rx="12" ry="6" fill="#fff" opacity=".4"/>'
    return svg(defs, b)


def sayagoke():
    b = shadow(80)
    b += '<path d="M40 226 C30 170 60 120 128 116 C196 120 226 170 216 226Z" fill="#7a7488" stroke="#2a2432" stroke-width="5"/>'
    b += '<path d="M60 150 C90 120 166 120 196 150 C176 140 150 150 128 140 C106 150 80 140 60 150Z" fill="#8ac070" stroke="#2a4a20" stroke-width="3"/>'
    b += '<ellipse cx="128" cy="170" rx="30" ry="40" fill="#6aa050" stroke="#2a4a20" stroke-width="4"/><ellipse cx="128" cy="160" rx="14" ry="26" fill="#2a4a20"/>'
    for i in range(18):
        x = 104 + (i * 13) % 48; y = 140 + (i * 17) % 56
        b += f'<path d="M{x} {y} l0 -6" stroke="#c8f0a0" stroke-width="2" stroke-linecap="round"/>'
    b += '<ellipse cx="128" cy="154" rx="6" ry="14" fill="#ff9ad0" opacity=".55"/>'
    return svg("", b)


def tenohira():
    o = "#4a1a30"; b = shadow(84)
    b += '<ellipse cx="128" cy="220" rx="96" ry="18" fill="#3a2a30" stroke="#1a0e14" stroke-width="3"/>'
    for cx, flip in [(88, -1), (168, 1)]:
        b += f'<path d="M{cx-16} 222 L{cx-14} 150 L{cx+14} 150 L{cx+16} 222Z" fill="#e8a8bc" stroke="{o}" stroke-width="4"/>'
        b += f'<ellipse cx="{cx}" cy="140" rx="28" ry="24" fill="#f0b8c8" stroke="{o}" stroke-width="4"/>'
        for k in range(4):
            a = math.radians(-120 + k * 22) if flip < 0 else math.radians(-60 - k * 22)
            x1, y1 = cx + math.cos(a) * 26, 140 + math.sin(a) * 22
            x2, y2 = cx + math.cos(a) * 58, 140 + math.sin(a) * 50
            b += tube(f"M{x1:.1f} {y1:.1f} L{x2:.1f} {y2:.1f}", o, "#f0b8c8", "#fff", 11)
        a = math.radians(-180 if flip < 0 else 0)
        b += tube(f"M{cx+math.cos(a)*24:.1f} 146 L{cx+math.cos(a)*48:.1f} 128", o, "#f0b8c8", "#fff", 11)
    return svg("", b)


def ukegame():
    o = "#3a1e10"
    defs = rgrad("ug", [(0, "#f0c8a0"), (0.6, "#b87a4a"), (1, "#5a3014")])
    b = shadow(60)
    b += f'<path d="M78 90 C50 130 56 200 92 224 L164 224 C200 200 206 130 178 90Z" fill="url(#ug)" stroke="{o}" stroke-width="5"/>'
    b += f'<path d="M84 94 C100 60 156 60 172 94 C160 104 96 104 84 94Z" fill="#8a4a2a" stroke="{o}" stroke-width="4"/>'
    b += '<ellipse cx="128" cy="86" rx="30" ry="14" fill="#2a0a14"/><ellipse cx="128" cy="88" rx="22" ry="8" fill="#ff8ab8" opacity=".7"/>'
    b += '<path d="M112 98 C110 112 116 118 114 130" fill="none" stroke="#ffd0e4" stroke-width="5" stroke-linecap="round" opacity=".85"/>'
    for y in (140, 170, 198):
        b += f'<path d="M72 {y} C110 {y+8} 146 {y+8} 184 {y}" fill="none" stroke="{o}" stroke-width="2" opacity=".35"/>'
    return svg(defs, b)


def imp(g, o, extra="", mouth="smile", hands=""):
    """丸い小淫魔（futago と同じ作法）。"""
    b = shadow(46, 232, .16)
    for s in (-1, 1):
        b += f'<path d="M{128+s*30} 140 C{128+s*76} 104 {128+s*96} 128 {128+s*92} 164 C{128+s*76} 152 {128+s*66} 164 {128+s*50} 158Z" fill="#5a2a58" stroke="{o}" stroke-width="3"/>'
    b += f'<path d="M150 190 C176 202 188 220 172 230" fill="none" stroke="{o}" stroke-width="5" stroke-linecap="round"/><path d="M172 230 l9 -3 l-4 9z" fill="{o}"/>'
    b += f'<ellipse cx="128" cy="160" rx="46" ry="52" fill="url(#{g})" stroke="{o}" stroke-width="4"/>'
    for s in (-1, 1):
        b += f'<path d="M{128+s*22} 118 C{128+s*28} 96 {128+s*36} 90 {128+s*40} 84 C{128+s*36} 100 {128+s*34} 112 {128+s*32} 122Z" fill="#fff0f8" stroke="{o}" stroke-width="3"/>'
    b += eyes(128, 154, 16, 10, o)
    if mouth == "smile":
        b += f'<path d="M116 178 Q128 190 140 178" fill="none" stroke="{o}" stroke-width="3" stroke-linecap="round"/><path d="M130 182 q3 8 7 0" fill="#ff5f9e"/>'
    elif mouth == "grin":
        b += f'<path d="M110 174 Q128 196 146 174 Z" fill="#5a1030" stroke="{o}" stroke-width="3"/><path d="M122 186 q6 8 12 0" fill="#ff5f9e"/>'
    elif mouth == "o":
        b += f'<ellipse cx="128" cy="182" rx="7" ry="9" fill="#5a1030" stroke="{o}" stroke-width="2"/>'
    b += '<ellipse cx="108" cy="134" rx="11" ry="6" fill="#fff" opacity=".35"/>'
    return b + hands + extra


def G_imp(a, b2, c):
    return rgrad("ip", [(0, a), (0.55, b2), (1, c)])


def sakiimp():
    o = "#4a1834"
    ex = '<path d="M176 132 C196 120 210 128 204 142" fill="none" stroke="#4a1834" stroke-width="6" stroke-linecap="round"/>'
    ex += '<circle cx="206" cy="140" r="16" fill="none" stroke="#ffd6f0" stroke-width="2" stroke-dasharray="4 4"/>'
    ex += '<path d="M92 214 C110 204 146 204 164 214" fill="none" stroke="#4a1834" stroke-width="7" stroke-linecap="round"/>'
    return svg(G_imp("#ffd2ea", "#e77ab4", "#8a2f66"), imp("ip", o, ex, "smile"))


def jikkyou():
    o = "#2a1848"
    ex = '<rect x="96" y="132" width="64" height="42" rx="4" fill="none" stroke="#fff37a" stroke-width="5"/>'
    ex += '<circle cx="196" cy="100" r="8" fill="#ff3a6a"/><circle cx="196" cy="100" r="14" fill="none" stroke="#ff3a6a" stroke-width="2" opacity=".6"/>'
    return svg(G_imp("#e8d6ff", "#a07ae0", "#4f2c88"), imp("ip", o, ex, "grin"))


def kusuguri():
    o = "#4a1834"
    ex = ""
    for k in range(6):
        a = math.radians(-30 + k * 14)
        ex += f'<path d="M176 226 l{math.cos(a)*30:.1f} {-math.sin(a)*30:.1f}" stroke="#ffd6ec" stroke-width="4" stroke-linecap="round"/>'
    ex += '<path d="M84 150 C60 110 50 80 60 40" fill="none" stroke="#fff0f8" stroke-width="2" opacity=".8"/><path d="M172 150 C196 110 206 80 196 40" fill="none" stroke="#fff0f8" stroke-width="2" opacity=".8"/>'
    return svg(G_imp("#ffe0f0", "#f090c0", "#8a3068"), imp("ip", o, ex, "grin"))


def kazoe():
    o = "#3a1848"
    ex = '<path d="M176 150 L196 120" stroke="#3a1848" stroke-width="8" stroke-linecap="round"/><path d="M196 120 L200 96" stroke="#fff0f8" stroke-width="6" stroke-linecap="round"/>'
    for i, (x, y) in enumerate([(56, 90), (74, 64), (100, 50)]):
        ex += f'<text x="{x}" y="{y}" font-size="22" font-family="serif" fill="#ffe27a" font-weight="bold">{["1","2","3"][i]}</text>'
    return svg(G_imp("#f0dcff", "#c08ae8", "#5a2c88"), imp("ip", o, ex, "smile"))


def azakeri():
    o = "#4a1428"
    ex = '<path d="M74 150 C60 170 62 190 80 196" fill="none" stroke="#4a1428" stroke-width="7" stroke-linecap="round"/>'
    ex += '<path d="M182 150 C196 130 196 110 184 100" fill="none" stroke="#4a1428" stroke-width="7" stroke-linecap="round"/><circle cx="184" cy="100" r="6" fill="#f0a0c0"/>'
    ex += '<path d="M150 96 l12 -12 M160 104 l14 -8" stroke="#ffd6ec" stroke-width="3" stroke-linecap="round"/>'
    return svg(G_imp("#ffd8e4", "#e8708e", "#8a2446"), imp("ip", o, ex, "grin"))


# ================================================================ 教団（頭巾と祭衣。顔は影）
def robe(fill, trim, o, face="#1a0e14", eye="#ffe27a", w=58, top=64):
    b = f'<path d="M{128-w} 226 C{128-w-4} 170 {128-w+10} 120 {128-30} {top+40} L{128+30} {top+40} C{128+w-10} 120 {128+w+4} 170 {128+w} 226Z" fill="{fill}" stroke="{o}" stroke-width="5"/>'
    b += f'<path d="M128 {top+44} L128 226" stroke="{trim}" stroke-width="6"/>'
    b += f'<path d="M{128-w+4} 222 L{128+w-4} 222" stroke="{trim}" stroke-width="5"/>'
    b += f'<path d="M90 {top+46} C86 {top} 170 {top} 166 {top+46} C150 {top+56} 106 {top+56} 90 {top+46}Z" fill="{fill}" stroke="{o}" stroke-width="5"/>'
    b += f'<ellipse cx="128" cy="{top+36}" rx="24" ry="20" fill="{face}"/>'
    b += f'<circle cx="119" cy="{top+34}" r="3.5" fill="{eye}"/><circle cx="137" cy="{top+34}" r="3.5" fill="{eye}"/>'
    return b


def shinja():
    b = shadow(60) + robe("#f2eee8", "#c8a24a", "#3a3028")
    b += '<path d="M112 150 L128 170 L144 150" fill="none" stroke="#3a3028" stroke-width="5" stroke-linejoin="round"/>'
    b += '<circle cx="128" cy="136" r="7" fill="#c8a24a" stroke="#3a3028" stroke-width="2"/>'
    return svg("", b)


def sekkyoushi():
    b = shadow(62) + robe("#e8e0f0", "#b890e0", "#2a2038")
    b += '<rect x="150" y="140" width="40" height="50" rx="3" fill="#6a3a2a" stroke="#2a1a10" stroke-width="3" transform="rotate(12 170 165)"/>'
    for i, r in enumerate((14, 24, 34)):
        b += f'<path d="M{86-r} {90} q{-6} 12 0 24" fill="none" stroke="#e8ccff" stroke-width="3" opacity="{0.9-i*0.25:.2f}"/>'
    return svg("", b)


def chuushutsu():
    b = shadow(58) + robe("#f0ece4", "#8ad0e0", "#2a3038")
    b += '<path d="M168 130 L196 96" stroke="#2a3038" stroke-width="10" stroke-linecap="round"/><path d="M168 130 L196 96" stroke="#d8f8ff" stroke-width="6" stroke-linecap="round"/>'
    b += '<ellipse cx="200" cy="90" rx="10" ry="12" fill="#ff8ab8" stroke="#2a3038" stroke-width="3"/>'
    b += '<path d="M200 106 q-4 8 0 12 q4 -4 0 -12" fill="#ff8ab8"/>'
    return svg("", b)


def kyouso():
    o = "#2a1a10"
    b = shadow(96)
    b += '<rect x="30" y="170" width="196" height="50" rx="10" fill="#8a2a3a" stroke="#2a0a10" stroke-width="5"/><rect x="36" y="176" width="184" height="10" rx="4" fill="#c8a24a" opacity=".7"/>'
    b += f'<path d="M50 200 C40 150 70 96 128 96 C186 96 216 150 206 200Z" fill="#f2e8d8" stroke="{o}" stroke-width="5"/>'
    b += f'<path d="M128 100 L128 200" stroke="#c8a24a" stroke-width="7"/>'
    b += f'<ellipse cx="128" cy="78" rx="40" ry="34" fill="#e8d8b8" stroke="{o}" stroke-width="5"/>'
    b += f'<path d="M86 70 C90 30 166 30 170 70 C156 60 100 60 86 70Z" fill="#c8a24a" stroke="{o}" stroke-width="4"/>'
    b += '<ellipse cx="128" cy="84" rx="26" ry="16" fill="#1a0e14"/>'
    b += '<circle cx="118" cy="84" r="4.5" fill="#ff9ad0"/><circle cx="138" cy="84" r="4.5" fill="#ff9ad0"/>'
    b += glow(128, 84, 60, "#ff9ad0", .12)
    for r in (70, 90):
        b += f'<circle cx="128" cy="84" r="{r}" fill="none" stroke="#ffd6ec" stroke-width="2" opacity=".35" stroke-dasharray="6 8"/>'
    return svg("", b)


MONSTERS = {
    "tsurimushi": tsurimushi(), "zuidou": zuidou(), "hibiki": hibiki(), "doromushi": doromushi(), "gitai": gitai(), "haimushi": haimushi(), "hiru": hiru(),
    "kuwaemushi": kuwaemushi(), "sayagoke": sayagoke(), "tenohira": tenohira(), "ukegame": ukegame(), "sakiimp": sakiimp(),
    "shinja": shinja(), "sekkyoushi": sekkyoushi(), "chuushutsu": chuushutsu(), "kyouso": kyouso(),
    "jikkyou": jikkyou(), "kusuguri": kusuguri(), "kazoe": kazoe(), "azakeri": azakeri(),
}


# ================================================================ 罠
def T_mushi_pit():
    b = '<ellipse cx="128" cy="190" rx="90" ry="34" fill="#241018" stroke="#0e0508" stroke-width="5"/><ellipse cx="128" cy="186" rx="72" ry="24" fill="#10060a"/>'
    for (x0, x1, y1, bd) in [(90, 70, 150, 12), (116, 110, 132, -10), (140, 150, 128, 10), (166, 190, 152, -12)]:
        b += worm(x0, 190, x1, y1, 10, "#dc8aaa", "#3a1428", 4, bd)
    return svg("", b)


def T_hive_wall():
    b = '<rect x="36" y="30" width="184" height="190" rx="6" fill="#7a5a64" stroke="#2a1018" stroke-width="4"/>'
    for i in range(14):
        x = 58 + (i * 41) % 150; y = 52 + (i * 29) % 150
        b += f'<ellipse cx="{x}" cy="{y}" rx="10" ry="8" fill="#1a0810" stroke="#4a2030" stroke-width="3"/>'
    b += worm(100, 110, 130, 140, 9, "#d4a0f0", "#3a1a46", 3, 8) + worm(170, 150, 190, 180, 9, "#d4a0f0", "#3a1a46", 3, -6)
    b += glow(128, 124, 80, "#c890ff", .12)
    return svg("", b)


def T_ring():
    b = plate(56, 16, 214)
    b += '<ellipse cx="128" cy="140" rx="46" ry="46" fill="none" stroke="#6a4a10" stroke-width="18"/><ellipse cx="128" cy="140" rx="46" ry="46" fill="none" stroke="#f2d27a" stroke-width="12"/>'
    b += '<ellipse cx="116" cy="112" rx="12" ry="5" fill="#fff" opacity=".6" transform="rotate(-30 116 112)"/>'
    for a in range(0, 360, 45):
        x, y = 128 + math.cos(math.radians(a)) * 46, 140 + math.sin(math.radians(a)) * 46
        b += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#ff7fb0"/>'
    b += glow(128, 140, 70, "#f2d27a", .15)
    return svg("", b)


def T_gauze():
    b = '<path d="M20 20 L236 20" stroke="#6a6272" stroke-width="8"/>'
    b += '<path d="M40 24 C60 90 50 150 70 210 C110 196 146 196 186 210 C206 150 196 90 216 24Z" fill="#f8f4f0" stroke="#a89ca8" stroke-width="3" opacity=".9"/>'
    for x in range(56, 210, 12):
        b += f'<path d="M{x} 30 C{x-6} 100 {x+6} 150 {x} 204" stroke="#d8d0d8" stroke-width="1.2"/>'
    for y in range(40, 210, 14):
        b += f'<path d="M52 {y} L204 {y}" stroke="#e0d8e0" stroke-width="1"/>'
    for x, y in [(90, 90), (150, 130), (110, 170), (170, 70)]:
        b += f'<path d="M{x} {y} q3 12 0 20" stroke="#bfe8ff" stroke-width="4" stroke-linecap="round" opacity=".7"/>'
    return svg("", b)


def T_temari():
    b = shadow(40, 226, .2)
    b += '<circle cx="128" cy="150" r="60" fill="#e77ab4" stroke="#6a1e48" stroke-width="5"/>'
    for a in range(0, 180, 30):
        b += f'<ellipse cx="128" cy="150" rx="60" ry="{abs(math.cos(math.radians(a)))*60+4:.0f}" fill="none" stroke="#ffe27a" stroke-width="3" transform="rotate({a} 128 150)"/>'
    b += '<ellipse cx="106" cy="122" rx="16" ry="8" fill="#fff" opacity=".4" transform="rotate(-30 106 122)"/>'
    b += spark(200, 90, 10, "#ffd6f0") + spark(60, 110, 7, "#ffd6f0")
    return svg("", b)


def T_count_altar():
    b = plate(90, 22, 210)
    b += box(40, 110, 176, 90, STONE, 6)
    for i in range(12):
        x = 54 + (i % 6) * 26; y = 128 + (i // 6) * 30
        b += f'<rect x="{x}" y="{y}" width="20" height="22" rx="3" fill="#4a4252" stroke="#2a2432" stroke-width="2"/>'
    for i in range(3):
        x = 54 + i * 26
        b += f'<rect x="{x+4}" y="132" width="12" height="14" rx="2" fill="#fff4f8"/>'
    b += '<path d="M128 60 L128 100" stroke="#2a2432" stroke-width="4"/><circle cx="128" cy="56" r="10" fill="#ff9ad0" stroke="#6a1e48" stroke-width="3"/>'
    return svg("", b)


def T_feather_bed():
    b = shadow(100, 226, .22)
    b += '<rect x="24" y="130" width="208" height="84" rx="20" fill="#f8e8f4" stroke="#8a5a7a" stroke-width="5"/>'
    b += '<rect x="30" y="120" width="196" height="30" rx="14" fill="#fff4fa" stroke="#8a5a7a" stroke-width="4"/>'
    for i in range(9):
        x = 44 + i * 21; y = 124 - (i % 3) * 10
        a = -40 + (i * 17) % 80
        b += f'<path d="M{x} {y} q{math.cos(math.radians(a))*10:.0f} -22 {math.sin(math.radians(a))*8:.0f} -40" fill="none" stroke="#ffd6ec" stroke-width="7" stroke-linecap="round"/>'
        b += f'<path d="M{x} {y} q{math.cos(math.radians(a))*10:.0f} -22 {math.sin(math.radians(a))*8:.0f} -40" fill="none" stroke="#8a5a7a" stroke-width="1.5"/>'
    return svg("", b)


def T_lips():
    b = '<rect x="36" y="30" width="184" height="190" rx="6" fill="#8a4a64" stroke="#3a1428" stroke-width="4"/>'
    for i in range(9):
        x = 70 + (i % 3) * 58; y = 70 + (i // 3) * 58
        b += f'<path d="M{x-20} {y} C{x-10} {y-14} {x-2} {y-8} {x} {y-4} C{x+2} {y-8} {x+10} {y-14} {x+20} {y} C{x+10} {y+14} {x-10} {y+14} {x-20} {y}Z" fill="#ff5f9e" stroke="#5a1030" stroke-width="3"/>'
        b += f'<path d="M{x-16} {y} Q{x} {y+4} {x+16} {y}" stroke="#5a1030" stroke-width="2" fill="none"/>'
    return svg("", b)


def T_namagoroshi():
    b = '<ellipse cx="128" cy="210" rx="96" ry="20" fill="#3a5a30" stroke="#1a2a10" stroke-width="4"/>'
    for i, x in enumerate([64, 100, 138, 176, 208]):
        h = 120 + (i * 23) % 50
        b += f'<path d="M{x} 210 C{x-6} {h+40} {x+6} {h+20} {x} {h}" fill="none" stroke="#4a7a3a" stroke-width="6"/>'
        b += f'<path d="M{x} {h} C{x-18} {h-10} {x-14} {h-34} {x} {h-40} C{x+14} {h-34} {x+18} {h-10} {x} {h}Z" fill="#ff8ab8" stroke="#6a1e48" stroke-width="3"/>'
        b += f'<path d="M{x} {h-4} L{x} {h-30}" stroke="#ffd6ec" stroke-width="3"/>'
    return svg("", b)


def T_suikan():
    b = plate(60, 18, 214, METAL)
    b += '<rect x="92" y="70" width="72" height="140" rx="30" fill="#d8f0ff" stroke="#1a2030" stroke-width="5" opacity=".85"/>'
    b += '<ellipse cx="128" cy="74" rx="34" ry="12" fill="#1a2030"/><ellipse cx="128" cy="74" rx="22" ry="7" fill="#ff8ab8" opacity=".7"/>'
    for y in range(100, 200, 16):
        b += f'<path d="M96 {y} L108 {y}" stroke="#1a2030" stroke-width="3"/>'
    b += '<path d="M164 180 C200 180 214 150 214 110 L214 40" fill="none" stroke="#1a2030" stroke-width="12"/><path d="M164 180 C200 180 214 150 214 110 L214 40" fill="none" stroke="#9aa6c8" stroke-width="6"/>'
    b += '<rect x="112" y="150" width="32" height="46" rx="12" fill="#ffd0e4" opacity=".6"/>'
    return svg("", b)


def T_yurugi():
    b = plate(40, 12, 214)
    b += '<rect x="112" y="80" width="32" height="132" fill="#c8b8a8" stroke="#3a2a20" stroke-width="4"/>'
    b += '<path d="M100 80 L156 80 L146 52 L110 52Z" fill="#c8a24a" stroke="#3a2a20" stroke-width="4"/>'
    b += '<circle cx="128" cy="66" r="6" fill="#3a2a20"/>'
    for i, r in enumerate((24, 44, 64, 84)):
        for s in (-1, 1):
            b += f'<path d="M{128+s*r} 50 q{s*10} 18 0 36" fill="none" stroke="#e8b0a0" stroke-width="{4-i*0.6:.1f}" opacity="{0.9-i*0.18:.2f}"/>'
    return svg("", b)


def T_kaikou():
    b = plate(50, 14, 214)
    b += '<path d="M128 214 L128 120" stroke="#6a4a10" stroke-width="8"/>'
    b += f'<polygon points="{P(star(128, 100, 44, 18, 8))}" fill="#ffe27a" stroke="#6a4a10" stroke-width="4"/>'
    b += '<circle cx="128" cy="100" r="14" fill="#fff8d0"/>'
    for a in range(0, 360, 30):
        x1, y1 = 128 + math.cos(math.radians(a)) * 56, 100 + math.sin(math.radians(a)) * 56
        x2, y2 = 128 + math.cos(math.radians(a)) * 80, 100 + math.sin(math.radians(a)) * 80
        b += f'<path d="M{x1:.0f} {y1:.0f} L{x2:.0f} {y2:.0f}" stroke="#ffe27a" stroke-width="3" opacity=".6"/>'
    b += glow(128, 100, 80, "#ffe27a", .15)
    return svg("", b)


def T_shashin():
    b = '<rect x="24" y="24" width="208" height="196" rx="4" fill="#5a4a44" stroke="#2a1a14" stroke-width="4"/>'
    for i in range(12):
        x = 36 + (i % 4) * 50; y = 36 + (i // 4) * 62
        r = (i * 7) % 11 - 5
        b += f'<g transform="rotate({r} {x+20} {y+26})"><rect x="{x}" y="{y}" width="40" height="52" fill="#f4ece0" stroke="#3a2a20" stroke-width="2"/>'
        b += f'<rect x="{x+4}" y="{y+4}" width="32" height="36" fill="#c8b098"/><ellipse cx="{x+20}" cy="{y+20}" rx="10" ry="9" fill="#8a6a50"/>'
        b += f'<circle cx="{x+16}" cy="{y+19}" r="1.8" fill="#ff5f9e"/><circle cx="{x+24}" cy="{y+19}" r="1.8" fill="#ff5f9e"/></g>'
    return svg("", b)


def T_maseki():
    b = plate(40, 12, 214)
    b += '<path d="M128 40 L168 110 L148 200 L108 200 L88 110Z" fill="#8ac8f0" stroke="#16485a" stroke-width="5"/>'
    b += '<path d="M128 40 L128 200 M88 110 L168 110" stroke="#d8f8ff" stroke-width="2" opacity=".7"/>'
    b += '<path d="M104 60 L116 44" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>'
    b += glow(128, 120, 70, "#6ac8e0", .2)
    return svg("", b)


def T_seisui():
    b = plate(56, 16, 214)
    b += '<path d="M76 120 L180 120 L168 180 C160 200 96 200 88 180Z" fill="#c8b8a8" stroke="#3a2a20" stroke-width="5"/>'
    b += '<ellipse cx="128" cy="122" rx="52" ry="12" fill="#ffc0dc" stroke="#3a2a20" stroke-width="4"/>'
    b += '<rect x="118" y="180" width="20" height="30" fill="#c8b8a8" stroke="#3a2a20" stroke-width="4"/>'
    for x, y in [(100, 100), (130, 86), (156, 98)]:
        b += f'<path d="M{x} {y} q-3 -10 0 -18 q3 8 0 18" fill="#ffd6ec" opacity=".8"/>'
    b += glow(128, 122, 60, "#ff9ad0", .15)
    return svg("", b)


def T_jouka():
    b = shadow(96, 228, .22)
    b += '<rect x="30" y="140" width="196" height="40" rx="6" fill="#f2eee8" stroke="#3a3028" stroke-width="5"/>'
    b += '<rect x="44" y="180" width="16" height="40" fill="#d8d0c8" stroke="#3a3028" stroke-width="4"/><rect x="196" y="180" width="16" height="40" fill="#d8d0c8" stroke="#3a3028" stroke-width="4"/>'
    for x in (58, 104, 152, 198):
        b += f'<path d="M{x} 140 L{x} 180" stroke="#6a3a2a" stroke-width="6"/>'
    for x in (80, 128, 176):
        b += f'<path d="M{x} 20 L{x} 90" stroke="#d8d0c8" stroke-width="3"/><ellipse cx="{x}" cy="100" rx="14" ry="12" fill="#fff" stroke="#3a3028" stroke-width="3"/>'
        b += f'<path d="M{x-10} 106 l-2 12 M{x-3} 110 l-1 12 M{x+4} 110 l1 12 M{x+11} 106 l2 12" stroke="#3a3028" stroke-width="3" stroke-linecap="round"/>'
    return svg("", b)


def T_kouro():
    b = plate(40, 12, 214, METAL)
    b += '<path d="M92 150 C92 200 164 200 164 150Z" fill="#8a5aa0" stroke="#2a1038" stroke-width="5"/>'
    b += '<path d="M86 150 L170 150" stroke="#2a1038" stroke-width="6"/><path d="M110 196 L104 212 M146 196 L152 212" stroke="#2a1038" stroke-width="5"/>'
    for i, x in enumerate((110, 128, 146)):
        b += f'<path d="M{x} 146 C{x-14} 120 {x+14} 100 {x} 70 C{x-10} 50 {x+8} 40 {x} 24" fill="none" stroke="#e0a0ff" stroke-width="{6-i}" stroke-linecap="round" opacity=".7"/>'
    b += '<path d="M178 70 C170 60 186 52 190 64 C194 52 210 60 202 70 L190 84Z" fill="#ff7fb0"/>'
    return svg("", b)


def T_keiyaku():
    b = '<rect x="40" y="170" width="176" height="46" rx="4" fill="#6a3a2a" stroke="#2a1a10" stroke-width="4"/>'
    b += '<path d="M70 50 L186 50 L186 170 L70 170Z" fill="#f4e4c8" stroke="#6a4a20" stroke-width="4"/>'
    b += '<path d="M60 46 C60 34 80 34 80 46 L80 56 L60 56Z M176 164 C176 176 196 176 196 164 L196 154 L176 154Z" fill="#e8d4a8" stroke="#6a4a20" stroke-width="3"/>'
    for y in range(70, 150, 12):
        b += f'<path d="M84 {y} L{172 - (y % 24)} {y}" stroke="#8a6a4a" stroke-width="2"/>'
    b += '<path d="M120 150 C130 140 140 160 156 146" fill="none" stroke="#c0304a" stroke-width="3"/>'
    b += '<circle cx="164" cy="156" r="10" fill="#c0304a" stroke="#6a1020" stroke-width="2"/>'
    b += glow(128, 110, 70, "#ff5f9e", .12)
    return svg("", b)


TRAPS = {k[2:]: f for k, f in globals().items() if k.startswith("T_")}


def floor(kind):
    """床（4×2 のタイル。右端の列は珍しい模様）"""
    from PIL import Image, ImageDraw
    base, line, acc = {
        "futa": ((92, 60, 72), (130, 88, 104), (230, 150, 190)),   # 薄紅の大理石
        "cult": ((88, 80, 78), (140, 130, 120), (200, 162, 74)),   # 白石に金の筋
        "imp": ((70, 48, 82), (104, 72, 120), (220, 140, 230)),    # 紫の絨毯
    }[kind]
    im = Image.new("RGB", (256, 128), base)
    d = ImageDraw.Draw(im)
    for row in range(2):
        for col in range(4):
            x0, y0 = col * 64, row * 64
            c = tuple(max(0, v - 6 + (col * 5 + row * 7) % 12) for v in base)
            d.rectangle([x0, y0, x0 + 63, y0 + 63], fill=c)
            if kind == "imp":
                for k in range(0, 64, 8):
                    d.line([x0 + k, y0, x0, y0 + k], fill=tuple(v + 6 for v in c))
                d.rectangle([x0 + 1, y0 + 1, x0 + 62, y0 + 62], outline=line)
            else:
                d.line([x0, y0 + 63, x0 + 63, y0 + 63], fill=tuple(v // 2 for v in base), width=2)
                d.line([x0 + 63, y0, x0 + 63, y0 + 63], fill=tuple(v // 2 for v in base), width=2)
                for k in range(3):
                    sx = x0 + (k * 23 + col * 11) % 60
                    d.line([sx, y0 + 4, sx + 18, y0 + 58], fill=line, width=1)
            if col == 3:
                cx, cy = x0 + 32, y0 + 32
                if kind == "futa":
                    d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], outline=acc, width=3)
                elif kind == "cult":
                    d.polygon([(cx, cy - 16), (cx + 14, cy + 10), (cx - 14, cy + 10)], outline=acc)
                    d.ellipse([cx - 4, cy - 2, cx + 4, cy + 6], fill=acc)
                else:
                    d.polygon([(cx, cy + 12), (cx - 14, cy - 2), (cx - 8, cy - 12), (cx, cy - 6), (cx + 8, cy - 12), (cx + 14, cy - 2)], fill=acc)
    return im


if __name__ == "__main__":
    for k, s in MONSTERS.items():
        (MON / f"{k}.svg").write_text(s)
    for k, f in TRAPS.items():
        (TRAP / f"{k}.svg").write_text(f())
    for k in ("futa", "cult", "imp"):
        floor(k).convert("P", palette=1, colors=64).save(ENV / f"floor_{k}.png")
    print("monsters", len(MONSTERS), "traps", len(TRAPS))
