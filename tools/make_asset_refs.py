#!/usr/bin/env python3
"""Reference sheets (SVG) for the art Game5 wants from image generation.

Each asset gets a card: the drawing on a transparency checkerboard at the delivery size, the
palette with hex values, the file name / size, and short notes. The long description lives in
game/asset-refs/README.md. Run:  python3 tools/make_asset_refs.py
"""
import os, math, re
from xml.sax.saxutils import escape as X

OUT = os.path.join(os.path.dirname(__file__), '..', 'game', 'asset-refs')
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- helpers
def f(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')

def ell(cx, cy, rx, ry, fill, extra=''):
    return f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}" {extra}/>'

def circ(cx, cy, r, fill, extra=''):
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{fill}" {extra}/>'

def path(d, fill='none', extra=''):
    return f'<path d="{d}" fill="{fill}" {extra}/>'

def lg(id_, stops, x1=0, y1=0, x2=0, y2=1):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{s}</linearGradient>'

def rg(id_, stops, cx=.4, cy=.35, r=.7):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="{r}">{s}</radialGradient>'

def eyes(cx, cy, gap, r, look=(0, 2), col='#1c1624'):
    out = ''
    for sx in (-1, 1):
        x = cx + sx * gap
        out += ell(x, cy, r, r * 1.15, '#fbf8ff')
        out += ell(x + look[0], cy + look[1], r * .62, r * .74, col)
        out += circ(x + look[0] - r * .25, cy + look[1] - r * .3, r * .22, '#ffffff')
    return out

def shadow(cx, cy, rx, ry=None, a=.35):
    return ell(cx, cy, rx, ry or rx * .22, f'rgba(0,0,0,{a})')

def gloss(cx, cy, rx, ry, rot=-25, a=.55):
    return ell(cx, cy, rx, ry, f'rgba(255,255,255,{a})', f'transform="rotate({rot} {f(cx)} {f(cy)})"')

CHECK = ('<pattern id="chk" width="16" height="16" patternUnits="userSpaceOnUse">'
         '<rect width="16" height="16" fill="#2b2f36"/><rect width="8" height="8" fill="#343942"/>'
         '<rect x="8" y="8" width="8" height="8" fill="#343942"/></pattern>')

SHADOW = r'<ellipse [^>]*fill="rgba\(0,0,0,[^>]*/>'  # the game draws its own shadow
SPRITES = os.path.join(OUT, 'sprites')
os.makedirs(SPRITES, exist_ok=True)

def card(fname, title, sub, size, palette, notes, art, defs='', box=(256, 256), sprite=None):
    """640x340 card: art on the left (box scaled to fit 280x280), info on the right."""
    bw, bh = box
    k = min(280 / bw, 280 / bh)
    ox, oy = 20 + (280 - bw * k) / 2, 36 + (280 - bh * k) / 2
    sw = ''
    for i, (hexv, name) in enumerate(palette):
        y = 120 + i * 22
        sw += (f'<rect x="322" y="{y}" width="18" height="18" rx="3" fill="{hexv}" stroke="#ffffff30"/>'
               f'<text x="346" y="{y + 13}" class="s">{hexv}  {name}</text>')
    nt = ''.join(f'<text x="322" y="{254 + i * 17}" class="n">・{X(n)}</text>' for i, n in enumerate(notes))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="340" viewBox="0 0 640 340">
<defs>{CHECK}{defs}<style>
text{{font-family:"Noto Sans JP","Hiragino Sans","Yu Gothic",sans-serif;fill:#e8e4dc}}
.t{{font-size:19px;font-weight:700}} .i{{font-size:12px;fill:#a9b0a8}} .s{{font-size:11.5px;fill:#cfd4cc}} .n{{font-size:11.5px;fill:#cfd4cc}} .h{{font-size:11px;fill:#8d968c;letter-spacing:.08em}}
</style></defs>
<rect width="640" height="340" rx="14" fill="#171b1f"/>
<text x="20" y="24" class="h">GAME5 ASSET REFERENCE</text>
<rect x="20" y="36" width="280" height="280" rx="8" fill="url(#chk)"/>
<clipPath id="art"><rect width="{bw}" height="{bh}"/></clipPath><g transform="translate({f(ox)} {f(oy)}) scale({f(k)})"><g clip-path="url(#art)">{art}</g></g>
<rect x="20.5" y="36.5" width="279" height="279" rx="8" fill="none" stroke="#ffffff22"/>
<text x="322" y="58" class="t">{title}</text>
<text x="322" y="78" class="i">{X(sub)}</text>
<text x="322" y="96" class="i">{size}</text>
<text x="322" y="112" class="h">PALETTE</text>
{sw}{nt}
</svg>'''
    with open(os.path.join(OUT, fname), 'w', encoding='utf-8') as fp:
        fp.write(svg)
    # bare art (transparent, no card) for the game to use until the real art arrives
    if sprite is not False:
        vx, vy, vw, vh = sprite or (0, 0, bw, bh)
        sp = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{vw}" height="{vh}" viewBox="{vx} {vy} {vw} {vh}">'
              f'<defs>{defs}</defs>{re.sub(SHADOW, "", art)}</svg>')
        with open(os.path.join(SPRITES, fname), 'w', encoding='utf-8') as fp:
            fp.write(sp)
    return fname


# ---------------------------------------------------------------- monsters (256x256, feet ~ y=218)
M = []

def gel():
    d = rg('gB', [(0, '#f2f1f7'), (.45, '#b3b1c2'), (1, '#5a5870')], .38, .3, .8) + rg('gC', [(0, '#f6d6ff'), (.5, '#b36bdc'), (1, '#5a2a78')], .5, .5, .5)
    a = shadow(128, 220, 96)
    a += path('M40 214 C34 160 58 104 128 96 C198 104 222 160 216 214 C200 226 170 222 160 218 C150 228 132 226 124 219 C112 229 90 226 84 218 C70 224 50 222 40 214Z', 'url(#gB)', 'opacity=".93" stroke="#3c3a4c" stroke-width="4"')
    a += circ(128, 184, 20, 'url(#gC)', 'opacity=".9"') + circ(128, 184, 32, 'rgba(200,120,240,.18)')
    # stone crown sunk into the top
    a += path('M84 112 L88 72 L106 94 L128 62 L150 94 L168 72 L172 112 C150 104 106 104 84 112Z', '#a8a39a', 'stroke="#4a463f" stroke-width="4" stroke-linejoin="round"')
    a += path('M92 108 L94 86 M128 70 L128 98 M164 108 L162 86', 'none', 'stroke="#d6d1c6" stroke-width="3" stroke-linecap="round"')
    a += circ(128, 92, 7, '#c77ae6', 'stroke="#4a2a5c" stroke-width="2"')
    a += eyes(128, 140, 26, 11, (0, 3))
    a += gloss(84, 128, 18, 8) + gloss(172, 176, 8, 4, 30, .35)
    a += path('M60 206 q6 14 0 20 M196 206 q-4 12 2 18', 'none', 'stroke="#8f8ca0" stroke-width="5" stroke-linecap="round" opacity=".7"')
    return card('monster_gel.svg', '灰冠の粘魔', 'monsters/gel.png ／ 最終区画のボス', '256×256 透過PNG ／ 接地 y≈218',
                [('#e6e4f0', '光'), ('#b3b1c2', '体'), ('#5a5870', '影'), ('#a8a39a', '石の冠'), ('#b36bdc', '核')],
                ['半透明の灰色スライム。頭に石の冠がめり込む', '体の奥で紫の核が光る（唯一の強い彩度）', 'ボスなので他より一回り大きく重たい形', '牙・棘なし。口は描かない'], a, d)
M.append(gel)

def slug():
    d = lg('sB', [(0, '#fbd0ea'), (.35, '#e28ac0'), (1, '#6d2c5c')], 0, 0, 0, 1)
    a = shadow(128, 218, 92, 16)
    a += path('M36 206 C40 176 70 170 104 172 C136 150 188 138 214 164 C230 184 214 212 186 214 C140 220 80 222 36 206Z', 'rgba(230,160,210,.28)')
    a += path('M52 200 C56 170 84 160 112 164 C140 126 196 116 214 150 C228 178 206 206 170 208 C130 212 84 214 52 200Z', 'url(#sB)', 'stroke="#4a1a3c" stroke-width="4"')
    a += path('M118 162 C146 132 190 128 204 152', 'none', 'stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity=".55"')
    a += path('M176 132 L168 96 M198 138 L204 102', 'none', 'stroke="#b04f8f" stroke-width="7" stroke-linecap="round"')
    a += circ(168, 94, 9, '#fbf8ff', 'stroke="#4a1a3c" stroke-width="3"') + circ(170, 96, 4, '#2a1224')
    a += circ(204, 100, 9, '#fbf8ff', 'stroke="#4a1a3c" stroke-width="3"') + circ(206, 102, 4, '#2a1224')
    a += ''.join(circ(64 + i * 22, 194 + (i % 2) * 4, 3, 'rgba(255,255,255,.45)') for i in range(5))
    return card('monster_slug.svg', '艶沼ナメクジ', 'monsters/slug.png ／ 第1区画の主', '256×256 透過PNG ／ 右下向き',
                [('#fbd0ea', '艶'), ('#e28ac0', '体'), ('#b04f8f', '触角'), ('#6d2c5c', '影'), ('#4a1a3c', '輪郭')],
                ['桃紫の大きなナメクジ。背中に長いツヤ', '体の後ろに半透明の粘液の跡', '2本の触角の先が目', '重く低い重心、ゆっくりした印象'], a, d)
M.append(slug)

def leech():
    d = rg('lB', [(0, '#ffffff'), (.4, '#86cfe8'), (1, '#24506e')], .45, .35, .7) + rg('lW', [(0, 'rgba(230,248,255,.85)'), (1, 'rgba(120,200,230,.25)')], .5, .5, .6)
    a = shadow(128, 222, 40, 8, .25)
    for sx in (-1, 1):
        a += ell(128 + sx * 52, 110, 54, 26, 'url(#lW)', f'stroke="#9ad8f0" stroke-width="3" transform="rotate({sx*-20} {128+sx*52} 110)"')
        a += ell(128 + sx * 40, 146, 34, 16, 'url(#lW)', f'stroke="#9ad8f0" stroke-width="2.5" transform="rotate({sx*18} {128+sx*40} 146)"')
    a += circ(128, 136, 40, 'url(#lB)', 'stroke="#1a3c54" stroke-width="4"')
    a += circ(128, 162, 15, '#dff6ff', 'stroke="#1a3c54" stroke-width="3"') + circ(128, 162, 8, '#3f8fb4') + circ(128, 162, 4, '#1a3c54')
    a += eyes(128, 126, 16, 8, (0, 2))
    a += circ(128, 136, 58, 'rgba(134,207,232,.12)') + gloss(112, 112, 12, 6)
    a += path('M112 176 l-6 12 M144 176 l6 12', 'none', 'stroke="#24506e" stroke-width="4" stroke-linecap="round"')
    return card('monster_leech.svg', '吸着羽虫', 'monsters/leech.png ／ 第2区画', '256×256 透過PNG ／ 浮遊（影は離す）',
                [('#dff6ff', '発光'), ('#86cfe8', '体'), ('#3f8fb4', '吸盤'), ('#24506e', '影'), ('#9ad8f0', '羽の縁')],
                ['青白く光る小型の羽虫。透ける羽が4枚', '顔の下に丸い吸盤（刺す口ではない）', '浮いているので影は体から離して小さく', '素早く飛び回る軽さ'], a, d)
M.append(leech)

def worm():
    d = rg('wB', [(0, '#ffffff'), (.5, '#cfc2ea'), (1, '#584c78')], .4, .3, .75)
    a = shadow(128, 214, 100, 16)
    segs = [(58, 176, 26), (88, 168, 30), (122, 164, 33), (156, 160, 34), (190, 148, 36)]
    for x, y, r in segs:
        a += circ(x, y, r, 'url(#wB)', 'stroke="#3e3458" stroke-width="4"')
        a += path(f'M{x-r*.6} {y-r*.2} Q{x} {y-r*.9} {x+r*.6} {y-r*.2}', 'none', 'stroke="#ffffff" stroke-width="3" opacity=".5"')
    a += eyes(196, 144, 13, 8, (2, 2))
    a += path('M40 150 C80 120 150 206 222 170 M50 196 C100 150 170 196 224 128', 'none', 'stroke="rgba(247,242,255,.75)" stroke-width="2"')
    return card('monster_worm.svg', '絹輪ワーム', 'monsters/worm.png ／ 第3区画', '256×256 透過PNG ／ 右向き・頭が右',
                [('#f7f2ff', '絹糸'), ('#cfc2ea', '体'), ('#9483b8', '節の影'), ('#584c78', '影'), ('#3e3458', '輪郭')],
                ['白〜薄紫の柔らかい輪節の芋虫（5節）', '体に細い絹糸がゆるく巻きつく', '頭の節が一番大きい。顔は丸い目だけ', '長い巻きつき拘束の担当'], a, d)
M.append(worm)

def orb():
    d = rg('oB', [(0, '#fcffe0'), (.35, '#bfdc72'), (1, '#44621f')], .42, .38, .7)
    a = shadow(128, 224, 44, 9, .22)
    bumps = ''.join(circ(128 + math.cos(t) * 50, 128 + math.sin(t) * 48, 13, '#9fc454', 'stroke="#34501a" stroke-width="3"') for t in [i * math.pi / 6 for i in range(12)])
    a += bumps + circ(128, 128, 52, 'url(#oB)', 'stroke="#34501a" stroke-width="4"')
    a += circ(128, 128, 20, 'rgba(255,255,220,.7)') + circ(128, 128, 64, 'rgba(200,240,120,.13)')
    a += eyes(128, 122, 18, 8, (0, 2), '#1a2410')
    for i, (x, y, r) in enumerate([(44, 64, 6), (212, 80, 5), (60, 196, 4), (200, 186, 6), (30, 130, 3), (226, 132, 4)]):
        a += circ(x, y, r, '#d8f09a', 'opacity=".75"')
    return card('monster_orb.svg', 'ルマネ胞子球', 'monsters/orb.png ／ 第4区画', '256×256 透過PNG ／ 浮遊',
                [('#f0ffc0', '中心の光'), ('#bfdc72', '体'), ('#9fc454', '胞子の粒'), ('#44621f', '影'), ('#34501a', '輪郭')],
                ['ふわふわ浮く黄緑の胞子の塊', '外周に丸いこぶが並ぶ（棘にしない）', '周りに小さな胞子の粒が漂う', '遠距離から胞子を撒く後衛'], a, d)
M.append(orb)

def flower():
    d = rg('fP', [(0, '#ffe0e2'), (.5, '#f09aa6'), (1, '#c4526a')], .5, .3, .8) + rg('fC', [(0, '#fff6c8'), (1, '#e0a040')], .5, .4, .6)
    a = shadow(128, 216, 84, 14)
    a += path('M60 214 C70 190 90 196 100 180 M196 214 C184 190 164 196 156 180 M80 218 C96 200 112 206 118 188', 'none', 'stroke="#5d8a4a" stroke-width="8" stroke-linecap="round"')
    for i in range(5):
        t = -math.pi / 2 + i * 2 * math.pi / 5
        x, y = 128 + math.cos(t) * 50, 132 + math.sin(t) * 44
        a += ell(x, y, 38, 26, 'url(#fP)', f'stroke="#7a2a40" stroke-width="4" transform="rotate({math.degrees(t)+90:.0f} {x:.0f} {y:.0f})"')
    a += circ(128, 132, 30, 'url(#fC)', 'stroke="#7a4a20" stroke-width="4"')
    a += eyes(128, 128, 12, 7, (0, 2), '#3a2010')
    a += path('M150 158 q4 12 0 18 q-4 -6 0 -18Z', '#ffd2e6', 'stroke="#c4526a" stroke-width="2"')
    return card('monster_flower.svg', '粘花', 'monsters/flower.png ／ 第5区画の主', '256×256 透過PNG ／ 正面',
                [('#ffe0e2', '花弁の光'), ('#f09aa6', '花弁'), ('#c4526a', '花弁の影'), ('#e0a040', '花芯'), ('#5d8a4a', '蔓')],
                ['地面に根を張る大きな珊瑚色の5枚花', '花芯に顔、蜜のしずくが垂れる', '足元は蔓（動かない待ち伏せ型）', '花弁は丸く柔らかく、トゲなし'], a, d)
M.append(flower)

def moth():
    d = lg('mW', [(0, '#c79ab8'), (1, '#56364a')], 0, 0, 1, 1)
    a = shadow(128, 222, 46, 8, .22)
    for sx in (-1, 1):
        a += path(f'M128 118 C{128+sx*40} 60 {128+sx*112} 56 {128+sx*112} 110 C{128+sx*110} 150 {128+sx*60} 150 128 136Z', 'url(#mW)', 'stroke="#2e1a28" stroke-width="4"')
        a += path(f'M128 138 C{128+sx*50} 150 {128+sx*92} 170 {128+sx*70} 196 C{128+sx*40} 204 128 170 128 150Z', 'url(#mW)', 'stroke="#2e1a28" stroke-width="4"')
        cx = 128 + sx * 72
        a += circ(cx, 104, 20, '#f2dcea', 'stroke="#2e1a28" stroke-width="3"') + circ(cx, 104, 12, '#8f6282') + circ(cx, 104, 5, '#20141a')
    a += ell(128, 140, 16, 40, '#8f6282', 'stroke="#2e1a28" stroke-width="4"')
    a += path('M120 104 C110 80 100 74 94 72 M136 104 C146 80 156 74 162 72', 'none', 'stroke="#2e1a28" stroke-width="3" stroke-linecap="round"')
    a += eyes(128, 112, 7, 5, (0, 1), '#20141a')
    a += ''.join(circ(x, y, 2.5, '#f6e6ff', 'opacity=".8"') for x, y in [(40, 150), (60, 176), (208, 160), (196, 184), (90, 62), (170, 58)])
    return card('monster_moth.svg', '夢鱗蛾', 'monsters/moth.png ／ 第6区画の主', '256×256 透過PNG ／ 浮遊・正面',
                [('#f2dcea', '眼状紋'), ('#c79ab8', '羽の光'), ('#8f6282', '体'), ('#56364a', '羽の影'), ('#2e1a28', '輪郭')],
                ['茶と紫の大きな蛾。上羽に大きな眼状紋', '鱗粉が光の粒になって舞う', '催眠の担当。眼状紋が「見つめる」印象', '体はふわふわの毛並み'], a, d)
M.append(moth)

def mirror():
    d = lg('rB', [(0, '#effbff'), (.4, '#aed4e0'), (1, '#34566a')], 0, 0, .3, 1)
    a = shadow(128, 218, 84)
    a += path('M52 212 C44 160 72 112 128 106 C184 112 212 160 204 212 C170 222 90 222 52 212Z', 'url(#rB)', 'stroke="#20384a" stroke-width="4"')
    a += path('M76 150 L110 118 M84 176 L140 124 M150 200 L190 160', 'none', 'stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity=".75"')
    a += path('M118 184 q10 -26 20 0 q-10 8 -20 0Z', 'rgba(52,86,106,.55)')
    a += eyes(128, 150, 22, 9, (0, 2), '#122028')
    return card('monster_mirror_slime.svg', '鏡面スライム', 'monsters/mirror_slime.png ／ 新種・第6区画', '256×256 透過PNG ／ 正面',
                [('#effbff', '反射'), ('#aed4e0', '体'), ('#6c98ac', '中間'), ('#34566a', '影'), ('#20384a', '輪郭')],
                ['銀と水色の鏡のようなスライム', '斜めの鋭い白い反射帯で「鏡面」を出す', '体の中にアリアの影がうっすら映る', 'アリアの動きを真似て滑り寄る'], a, d)
M.append(mirror)

def spider():
    d = rg('pB', [(0, '#f6f2fc'), (.5, '#c6bcd8'), (1, '#554868')], .4, .3, .75)
    a = shadow(128, 214, 88)
    for sx in (-1, 1):
        for j, (dx, dy) in enumerate([(66, -20), (80, 6), (78, 34), (62, 58)]):
            a += path(f'M{128+sx*30} {150+j*6} Q{128+sx*(dx-10)} {150+dy-28} {128+sx*dx} {150+dy}', 'none', 'stroke="#554868" stroke-width="11" stroke-linecap="round"')
            a += circ(128 + sx * dx, 150 + dy, 7, '#8c7ea4', 'stroke="#3a3048" stroke-width="2"')
    a += ell(128, 164, 46, 40, 'url(#pB)', 'stroke="#3a3048" stroke-width="4"')
    a += circ(128, 118, 30, 'url(#pB)', 'stroke="#3a3048" stroke-width="4"')
    a += eyes(128, 116, 12, 7, (0, 2), '#221c2c') + circ(114, 102, 3, '#221c2c') + circ(142, 102, 3, '#221c2c')
    a += path('M128 204 C128 226 150 236 176 240', 'none', 'stroke="#f6f2fc" stroke-width="2"')
    return card('monster_silk_spider.svg', '糸繰り蜘蛛', 'monsters/silk_spider.png ／ 新種・第3区画', '256×256 透過PNG ／ 正面',
                [('#f6f2fc', '光・糸'), ('#c6bcd8', '体'), ('#8c7ea4', '脚先'), ('#554868', '脚'), ('#3a3048', '輪郭')],
                ['丸くて柔らかい薄紫の蜘蛛。怖くしない', '脚は太く短く、先が丸い', '目は大2＋小2のかわいい配置', 'お尻から絹糸が伸びる（罠の糸を張る）'], a, d)
M.append(spider)

def shell():
    d = rg('hB', [(0, '#fff0e6'), (.5, '#dcbcaa'), (1, '#6a4a3e')], .4, .3, .8)
    a = shadow(128, 216, 86)
    a += path('M52 204 C48 176 64 160 92 160 L196 170 C214 176 214 204 196 210 C150 220 90 220 52 204Z', '#e9c8b6', 'stroke="#4a3028" stroke-width="4"')
    a += circ(122, 138, 58, 'url(#hB)', 'stroke="#4a3028" stroke-width="4"')
    a += path('M122 138 m-40 0 a40 40 0 1 1 40 40 a28 28 0 1 1 -28 -28 a16 16 0 1 1 16 16', 'none', 'stroke="#a88070" stroke-width="5" stroke-linecap="round"')
    a += eyes(190, 180, 9, 6, (1, 2), '#2a1c18')
    for x, y, r in [(182, 110, 14), (206, 80, 9), (192, 52, 11), (218, 40, 6)]:
        a += circ(x, y, r, 'rgba(220,245,255,.35)', 'stroke="#e8fbff" stroke-width="2.5"') + circ(x - r * .35, y - r * .35, r * .25, '#ffffff')
    return card('monster_bubble_shell.svg', '泡吹き貝', 'monsters/bubble_shell.png ／ 新種・第2区画', '256×256 透過PNG ／ 右向き',
                [('#fff0e6', '殻の光'), ('#dcbcaa', '殻'), ('#a88070', '渦'), ('#6a4a3e', '影'), ('#e8fbff', '泡')],
                ['桃色がかった渦巻きの巻貝', '殻の口から泡を吹き上げる', 'ほとんど動かない固定砲台', '泡は透明＋白いハイライトで'], a, d)
M.append(shell)

def attendant():
    d = rg('aB', [(0, '#ece8f6'), (.5, '#b2acc6'), (1, '#474358')], .4, .3, .8)
    a = shadow(128, 216, 60)
    a += path('M72 212 C66 170 90 136 128 132 C166 136 190 170 184 212 C160 220 96 220 72 212Z', 'url(#aB)', 'stroke="#2c2a36" stroke-width="4"')
    a += path('M104 138 L108 112 L120 126 L128 104 L136 126 L148 112 L152 138 C140 134 116 134 104 138Z', '#a8a39a', 'stroke="#4a463f" stroke-width="3" stroke-linejoin="round"')
    a += circ(128, 180, 10, '#ba78e0', 'opacity=".85"')
    a += eyes(128, 164, 16, 7, (0, 2), '#1c1a22') + gloss(98, 156, 10, 5)
    return card('monster_crown_attendant.svg', '灰冠の従者', 'monsters/crown_attendant.png ／ 新種・第7区画', '256×256 透過PNG ／ 正面',
                [('#ece8f6', '光'), ('#b2acc6', '体'), ('#7a7490', '中間'), ('#474358', '影'), ('#a8a39a', '冠のかけら')],
                ['灰冠の粘魔を小さくした取り巻き', '冠の小さなかけらを頭に載せる', 'ボスと並べて主従が分かるように', 'ボスより小さく、核も小さい'], a, d)
M.append(attendant)


# ---------------------------------------------------------------- props
P = []

def chest():
    a = ''
    for ox, open_ in ((0, False), (140, True)):
        a += shadow(ox + 64, 112, 50, 9)
        a += f'<rect x="{ox+18}" y="62" width="92" height="48" rx="6" fill="#9a6230" stroke="#3a2210" stroke-width="4"/>'
        if open_:
            a += path(f'M{ox+18} 62 L{ox+26} 22 L{ox+102} 22 L{ox+110} 62Z', '#5a3418', 'stroke="#3a2210" stroke-width="4"')
            a += f'<rect x="{ox+24}" y="56" width="80" height="12" fill="#ffe6a0" opacity=".85"/>' + circ(ox + 64, 56, 30, 'rgba(255,230,160,.25)')
        else:
            a += path(f'M{ox+18} 66 C{ox+18} 36 {ox+110} 36 {ox+110} 66Z', '#b07438', 'stroke="#3a2210" stroke-width="4"')
            a += f'<rect x="{ox+56}" y="58" width="16" height="18" rx="3" fill="#ffd060" stroke="#3a2210" stroke-width="3"/>'
        a += f'<rect x="{ox+18}" y="80" width="92" height="7" fill="#d6a054"/>'
    return card('prop_chest.svg', '宝箱（閉／開）', 'props/chest.png ／ 2コマ横並び', '256×128 透過PNG（128×128×2）',
                [('#ffe6a0', '光'), ('#d6a054', '金具'), ('#b07438', '蓋'), ('#9a6230', '木'), ('#3a2210', '輪郭')],
                ['左：閉じた宝箱、右：開いて中が光る', '2コマの位置・大きさを完全に揃える', '木と金具、丸みのある蓋', '偽りの宝箱も閉じた状態は同じ見た目'], a, '', (256, 128))
P.append(chest)

def mimic():
    a = ''
    for ox, open_ in ((0, False), (140, True)):
        a += shadow(ox + 64, 112, 50, 9)
        a += f'<rect x="{ox+18}" y="62" width="92" height="48" rx="6" fill="#9a6230" stroke="#3a2210" stroke-width="4"/>'
        if not open_:
            a += path(f'M{ox+18} 66 C{ox+18} 36 {ox+110} 36 {ox+110} 66Z', '#b07438', 'stroke="#3a2210" stroke-width="4"')
            a += path(f'M{ox+40} 66 q3 10 0 14 M{ox+90} 66 q-2 8 1 12', 'none', 'stroke="#c890e0" stroke-width="4" stroke-linecap="round" opacity=".8"')
        else:
            a += path(f'M{ox+18} 62 L{ox+26} 22 L{ox+102} 22 L{ox+110} 62Z', '#5a3418', 'stroke="#3a2210" stroke-width="4"')
            a += path(f'M{ox+30} 60 C{ox+10} 20 {ox+40} 8 {ox+50} 40 M{ox+98} 60 C{ox+124} 24 {ox+92} 6 {ox+80} 38 M{ox+64} 58 C{ox+62} 30 {ox+70} 20 {ox+64} 8', 'none', 'stroke="#b06ad0" stroke-width="10" stroke-linecap="round"')
            a += ell(ox + 64, 60, 40, 8, '#d49ae8')
        a += f'<rect x="{ox+18}" y="80" width="92" height="7" fill="#d6a054"/>'
    return card('prop_mimic.svg', '偽りの宝箱（閉／正体）', 'props/mimic.png ／ 2コマ横並び', '256×128 透過PNG（128×128×2）',
                [('#d49ae8', '粘液'), ('#b06ad0', '粘液の腕'), ('#b07438', '蓋'), ('#9a6230', '木'), ('#3a2210', '輪郭')],
                ['左：本物とほぼ同じ。継ぎ目から紫の粘液が少しにじむ', '右：蓋が開き、柔らかい粘液の腕が出る', '牙・歯は描かない', '閉じた絵は本物の宝箱と同じ寸法で'], a, '', (256, 128))
P.append(mimic)

def stairs():
    a = ''
    for ox, open_ in ((0, False), (140, True)):
        a += f'<rect x="{ox+12}" y="20" width="104" height="92" rx="8" fill="#2c2c36" stroke="#15151c" stroke-width="4"/>'
        for i in range(4):
            y = 30 + i * 20
            a += f'<rect x="{ox+22+i*6}" y="{y}" width="{84-i*12}" height="14" fill="{["#8e8ea6","#6e6e86","#54546a","#3e3e50"][i]}"/>'
        if open_:
            a += f'<rect x="{ox+46}" y="90" width="36" height="18" fill="#ffe28a" opacity=".85"/>' + circ(ox + 64, 96, 40, 'rgba(255,226,138,.25)')
        else:
            a += path(f'M{ox+14} 30 L{ox+114} 104 M{ox+114} 30 L{ox+14} 104', 'none', 'stroke="#8a7e6a" stroke-width="6"')
            a += circ(ox + 64, 67, 14, '#5a5a70', 'stroke="#c8b890" stroke-width="3"')
    return card('prop_stairs.svg', '下り階段（封印／開放）', 'props/stairs.png ／ 2コマ横並び', '256×128 透過PNG（128×128×2）',
                [('#ffe28a', '開放の光'), ('#8e8ea6', '段の光'), ('#54546a', '段'), ('#2c2c36', '縁'), ('#8a7e6a', '鎖')],
                ['上から見下ろした石の下り階段', '左：鎖が交差し中央に紋章（封印中）', '右：鎖が消え、奥から金色の光', '部屋の出口に置く。制圧で左→右に変わる'], a, '', (256, 128))
P.append(stairs)

def tower():
    a = ''
    for i, glow in enumerate((.25, .6, 1)):
        ox = i * 86
        a += shadow(ox + 40, 184, 30, 7)
        a += path(f'M{ox+18} 184 L{ox+30} 40 L{ox+50} 40 L{ox+62} 184Z', '#2e2446', 'stroke="#120e1c" stroke-width="4"')
        a += path(f'M{ox+30} 40 L{ox+40} 16 L{ox+50} 40Z', '#5a4686', 'stroke="#120e1c" stroke-width="3"')
        a += ell(ox + 40, 76, 14, 9, '#e6d8ff', 'stroke="#120e1c" stroke-width="3"') + circ(ox + 40, 76, 6, '#9c80d6')
        a += circ(ox + 40, 76, 16 + 18 * glow, f'rgba(190,150,255,{0.12+0.25*glow})')
        a += path(f'M{ox+26} 120 h28 M{ox+24} 150 h32', 'none', 'stroke="#5a4686" stroke-width="3"')
    return card('prop_tower.svg', '催眠の塔（3コマ）', 'props/tower.png ／ 3コマ横並び', '384×192 透過PNG（128×192×3）',
                [('#e6d8ff', '眼'), ('#9c80d6', '瞳・光'), ('#5a4686', '刻み'), ('#2e2446', '石'), ('#120e1c', '輪郭')],
                ['黒い石の尖塔に紫の眼が1つ', '3コマは眼の光の強さだけが違う', '電波を出す瞬間が3コマ目', 'アリアが壊しに来る＝狙える形に'], a, '', (256, 192), (170, 8, 84, 184))
P.append(tower)

def pool():
    d = rg('plG', [(0, 'rgba(160,230,180,.9)'), (.6, 'rgba(70,130,90,.8)'), (1, 'rgba(40,80,50,0)')], .5, .5, .5)
    a = ell(128, 128, 120, 110, 'url(#plG)')
    a += ell(110, 110, 30, 12, 'rgba(255,255,255,.35)', 'transform="rotate(-15 110 110)"')
    a += ''.join(circ(x, y, r, 'none', 'stroke="rgba(220,255,230,.55)" stroke-width="2"') for x, y, r in [(150, 150, 10), (90, 160, 6), (170, 100, 7)])
    return card('prop_pool.svg', '粘沼', 'props/pool.png', '256×256 透過PNG ／ 真上から',
                [('#c8ecd6', '光'), ('#78a888', '表面'), ('#3f6e4c', '深み'), ('#23402c', '縁'), ('#ffffff', 'ツヤ')],
                ['真上から見た円形の粘液溜まり', '縁は透明に溶けて床になじむ', '泡とツヤで「粘り」を出す', 'ゲーム側で半径72pxに拡縮'], a, d)
P.append(pool)


# ---------------------------------------------------------------- nutera / icons / floors
N = []

def hearts():
    def heart(cx, cy, s, top, bot, stroke):
        return path(f'M{cx} {cy+s*.36} C{cx-s*.12} {cy+s*.22} {cx-s*.52} {cy+s*.04} {cx-s*.52} {cy-s*.2} C{cx-s*.52} {cy-s*.48} {cx-s*.14} {cy-s*.56} {cx} {cy-s*.28} C{cx+s*.14} {cy-s*.56} {cx+s*.52} {cy-s*.48} {cx+s*.52} {cy-s*.2} C{cx+s*.52} {cy+s*.04} {cx+s*.12} {cy+s*.22} {cx} {cy+s*.36}Z', f'url(#{top})', f'stroke="{stroke}" stroke-width="2"')
    d = ''.join(lg(f'h{i}', [(0, t), (1, b)]) for i, (t, b) in enumerate([('#ffc2e6', '#ff4fae'), ('#ff9ad3', '#d62c8c'), ('#fff0f8', '#ffa8d8'), ('#e9c8ff', '#a45cff')]))
    a = ''
    for i, stroke in enumerate(['#ffe4f3', '#ffd0ea', '#ffffff', '#f0dcff']):
        cx = 32 + i * 64
        a += circ(cx, 32, 26, ['rgba(255,127,200,.18)', 'rgba(224,71,158,.2)', 'rgba(255,208,234,.2)', 'rgba(192,140,255,.2)'][i])
        a += heart(cx, 34, 44, f'h{i}', '', stroke) + ell(cx - 9, 22, 5, 3, 'rgba(255,255,255,.8)', f'transform="rotate(-35 {cx-9} 22)"')
    return card('nutera_hearts.svg', 'ヌテラのハート（4種）', 'nutera/hearts.png ／ 4コマ横並び', '256×64 透過PNG（64×64×4）',
                [('#ff4fae', '桃'), ('#d62c8c', '濃いピンク'), ('#ffa8d8', '淡桃'), ('#a45cff', '薄紫'), ('#ffffff', 'ツヤ')],
                ['ヌテラ上昇で湧くハート。小さく表示される', '左から 明るい桃／濃いピンク／淡桃／薄紫', '上から下へのグラデーション＋左上のツヤ', '周りに柔らかい発光（透過で）'], a, d, (256, 64))
N.append(hearts)

def sigil():
    a = ''
    for r, w, c in [(110, 5, '#e89bff'), (88, 3, '#f3b3dd'), (60, 3, '#d68cff')]:
        a += circ(128, 128, r, 'none', f'stroke="{c}" stroke-width="{w}" opacity=".85"')
    for i in range(12):
        t = i * math.pi / 6
        a += path(f'M{128+math.cos(t)*88:.0f} {128+math.sin(t)*88:.0f} L{128+math.cos(t)*110:.0f} {128+math.sin(t)*110:.0f}', 'none', 'stroke="#e89bff" stroke-width="3"')
    a += path('M128 164 C70 128 92 84 128 110 C164 84 186 128 128 164Z', 'rgba(255,160,220,.35)', 'stroke="#ffd5eb" stroke-width="4"')
    return card('nutera_sigil.svg', '輪紋（足元の紋章）', 'nutera/sigil.png', '256×256 透過PNG ／ ゲームで横に潰して敷く',
                [('#e89bff', '外輪'), ('#f3b3dd', '中輪'), ('#d68cff', '内輪'), ('#ffd5eb', 'ハート'), ('#ffffff', '光')],
                ['三重の円＋12本の放射状の刻み', '中央に大きめのハート', '線だけで塗りは薄く（床が透ける）', 'ゆっくり回転させて使う'], a)
N.append(sigil)

def estella_logo():
    d = lg('eL', [(0, '#fff0f8'), (1, '#ff6fc0')])
    a = '<text x="256" y="84" text-anchor="middle" font-family="Georgia,serif" font-size="76" font-weight="700" fill="url(#eL)" stroke="#5a0f3c" stroke-width="4" paint-order="stroke">ESTELLA</text>'
    a += circ(34, 62, 14, '#ff9ad3') + circ(478, 62, 14, '#ff9ad3')
    return card('nutera_estella_logo.svg', 'ESTELLA ロゴ', 'nutera/estella_logo.png', '512×128 透過PNG',
                [('#fff0f8', '文字の上'), ('#ff6fc0', '文字の下'), ('#5a0f3c', '縁取り'), ('#ff9ad3', '飾りのハート'), ('#ff4fae', '発光')],
                ['エステラ発動の瞬間に画面に出す飾り文字', '白→桃のグラデーション＋濃い縁取り', '両端に小さなハート、周りに光の粒', 'セリフ体寄りの上品な形'], a, d, (512, 128))
N.append(estella_logo)

def icons():
    names = ['影杭', '瘴気壺', '囮鐘', '輪紋ビーム', '粘沼', '催眠の塔', '偽りの宝箱', '増援召喚']
    draw = [
        path('M32 8 L40 44 L32 56 L24 44Z', '#e5a2d0', 'stroke="#3a1830" stroke-width="3"'),
        ell(32, 40, 18, 14, '#8a5ab0', 'stroke="#2a1838" stroke-width="3"') + ell(32, 18, 12, 8, 'rgba(180,107,214,.6)'),
        path('M20 44 C20 20 44 20 44 44Z', '#f2d38a', 'stroke="#4a3a10" stroke-width="3"') + circ(32, 48, 5, '#c89a40'),
        circ(32, 32, 20, 'none', 'stroke="#df9dff" stroke-width="4"') + circ(32, 32, 9, '#df9dff'),
        ell(32, 36, 24, 14, '#6fa07e', 'stroke="#23402c" stroke-width="3"') + ell(26, 32, 7, 3, 'rgba(255,255,255,.5)'),
        path('M24 56 L28 16 L36 16 L40 56Z', '#2e2446', 'stroke="#120e1c" stroke-width="3"') + circ(32, 28, 5, '#e6d8ff'),
        f'<rect x="12" y="28" width="40" height="24" rx="3" fill="#9a6230" stroke="#3a2210" stroke-width="3"/>' + path('M12 30 C12 14 52 14 52 30Z', '#b07438', 'stroke="#3a2210" stroke-width="3"') + path('M24 30 q2 7 0 10', 'none', 'stroke="#c890e0" stroke-width="3"'),
        path('M32 8 L38 26 L56 26 L42 38 L48 56 L32 45 L16 56 L22 38 L8 26 L26 26Z', '#b98cff', 'stroke="#2a1848" stroke-width="3"'),
    ]
    a = ''
    for i, g in enumerate(draw):
        ox, oy = (i % 4) * 64, (i // 4) * 64
        a += f'<g transform="translate({ox} {oy})">{g}</g>'
    return card('icons_director.svg', '罠ボタンのアイコン（8種）', 'icons/<名前>.png ／ 1つずつ別ファイル', '64×64 透過PNG ×8',
                [('#e5a2d0', '影杭'), ('#8a5ab0', '瘴気壺'), ('#f2d38a', '囮鐘'), ('#df9dff', '輪紋'), ('#b98cff', '召喚')],
                ['上段：影杭・瘴気壺・囮鐘・輪紋ビーム', '下段：粘沼・催眠の塔・偽りの宝箱・増援召喚', '32pxに縮めても形が分かる太い輪郭', 'ファイル名は snare/fog/lure/ringbeam/…'], a, '', (256, 128))
N.append(icons)

FLOORS = [
    ('floor_room1.svg', '石の前室', 'floors/room1.png', '#4f5752', '#2a312e', '#6ea16f', 'moss'),
    ('floor_room2.svg', '湿った回廊', 'floors/room2.png', '#3c5266', '#1f2a38', '#70b8d8', 'puddle'),
    ('floor_room3.svg', '絹輪の間', 'floors/room3.png', '#56506a', '#2d2838', '#dbc4ea', 'silk'),
    ('floor_room4.svg', '胞子庭', 'floors/room4.png', '#4c5a48', '#263226', '#a4bd65', 'spore'),
    ('floor_room5.svg', '粘花苑', 'floors/room5.png', '#654a57', '#3a2632', '#e58aa7', 'nectar'),
    ('floor_room6.svg', '夢鱗回廊', 'floors/room6.png', '#4a4768', '#23233a', '#b580ff', 'dream'),
    ('floor_room7.svg', '灰冠の深室', 'floors/room7.png', '#4a4d55', '#282a30', '#c39cff', 'rune'),
]
def make_floor(fn, name, file, base, grout, fx, motif):
    def floor():
        a = f'<rect width="256" height="128" fill="{grout}"/>'
        rows = [(0, 42), (42, 43), (85, 43)]
        widths = [[58, 70, 62, 66], [44, 72, 64, 76], [66, 54, 74, 62]]
        for r, (y, h) in enumerate(rows):
            x = -18 if r % 2 else 0
            for w in widths[r] * 2:
                if x >= 256: break
                a += f'<rect x="{x+1.5}" y="{y+1.5}" width="{w-3}" height="{h-3}" rx="4" fill="{base}"/>'
                a += f'<rect x="{x+1.5}" y="{y+1.5}" width="{w-3}" height="5" rx="3" fill="rgba(255,255,255,.07)"/>'
                x += w
        m = {
            'moss': ''.join(ell(x, y, r, r * .7, fx, 'opacity=".35"') for x, y, r in [(30, 90, 9), (150, 20, 7), (210, 100, 11), (96, 56, 5)]),
            'puddle': ell(80, 70, 34, 12, '#10151d', 'opacity=".35"') + path('M60 66 q20 -6 40 0', 'none', f'stroke="{fx}" stroke-width="2" opacity=".5"'),
            'silk': path('M10 20 Q80 60 150 30 M120 110 Q180 60 250 90', 'none', f'stroke="{fx}" stroke-width="1.5" opacity=".45"'),
            'spore': ''.join(circ(x, y, 2.5, fx, 'opacity=".45"') for x, y in [(20, 30), (60, 90), (110, 40), (160, 100), (200, 30), (236, 70), (140, 70)]),
            'nectar': ''.join(ell(x, y, 6, 3, fx, f'opacity=".45" transform="rotate({a_} {x} {y})"') for x, y, a_ in [(30, 40, 20), (90, 100, -30), (170, 30, 60), (220, 90, 10)]),
            'dream': ''.join(path(f'M{x} {y} l8 -8', 'none', f'stroke="{fx}" stroke-width="1.5" opacity=".5"') for x, y in [(30, 60), (80, 20), (140, 90), (200, 50), (240, 110)]),
            'rune': circ(128, 64, 30, 'none', f'stroke="{fx}" stroke-width="1.5" opacity=".35"') + circ(128, 64, 18, 'none', f'stroke="{fx}" stroke-width="1.5" opacity=".35"'),
        }[motif]
        a += m
        return card(fn, f'床：{name}', f'{file} ／ シームレス', '256×128 不透明PNG（64×64×8）',
                    [(base, '石'), (grout, '目地'), (fx, '模様'), ('#ffffff', '上面の光（7%）'), ('#000000', '影')],
                    ['大小ばらばらの石を段違いに敷く', '目地は細く、黒くしすぎない（石より2段暗い）', f'模様（{ {"moss":"苔","puddle":"水たまり","silk":"絹糸","spore":"胞子","nectar":"花弁","dream":"鱗粉","rune":"紋様"}[motif] }）は控えめ、全体は低コントラスト', 'キャラより目立たせない。上下左右が繋がる'], a, '', (256, 128), False)
    return floor
for fl in FLOORS:
    N.append(make_floor(*fl))


if __name__ == '__main__':
    files = [fn() for fn in M + P + N]
    print('wrote', len(files), 'SVG files to', os.path.relpath(OUT))
