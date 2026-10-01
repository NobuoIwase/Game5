"""Pillowで部屋用64pxチップを再生成する。実行場所によらずassets/envへ出力。

床は4列×2行、飾りは壁・大・小・光の4列。32pxで描き2倍にする。
乱数はスキン・チップごとに固定し、ゲームの乱数とは独立している。
"""
from pathlib import Path
import math
import random
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'env'
PALETTES = {
    'tentacle': ('#513340', '#754452', '#ad6377', '#edacc0'),
    'slime': ('#403546', '#674e71', '#a774a4', '#e6bcdf'),
    'flesh': ('#52333f', '#794857', '#bc7586', '#eab2bd'),
    'worm': ('#37333b', '#51464f', '#8d6679', '#bd929f'),
    'mirror': ('#303640', '#4c576b', '#869bad', '#c7dce0'),
    'cult': ('#382a36', '#64404c', '#a75368', '#d6aa83'),
    'lab': ('#303642', '#4e5869', '#8992a9', '#c5cbd4'),
    'boudoir': ('#402c40', '#68415e', '#a56483', '#d3a9a0'),
}


def floor_tile(kind, index):
    dark, base, mid, light = PALETTES[kind]
    rng = random.Random(kind + str(index))
    im = Image.new('RGBA', (32, 32), base)
    d = ImageDraw.Draw(im)
    for _ in range(95):
        x, y = rng.randrange(32), rng.randrange(32)
        d.rectangle((x, y, x + rng.randrange(1, 4), y + 1), fill=rng.choice([dark, base, base, mid]))
    if kind in ('tentacle', 'flesh'):
        for n in range(3):
            x, y = rng.randrange(-5, 22), rng.randrange(-5, 22)
            d.ellipse((x, y, x + 20, y + 13), fill=base, outline=dark, width=2)
            d.arc((x+2, y+1, x+18, y+11), 195, 275, fill=mid, width=2)
        d.line([(0, 25), (8, 21), (16, 25), (25, 23), (32, 27)], fill=mid, width=1)
        if index % 4 == 3:
            d.arc((5, 6, 28, 21), 190, 270, fill=light)
    elif kind == 'slime':
        d.ellipse((-4, 6, 30, 28), fill=mid, outline=dark, width=2)
        d.ellipse((0, 9, 26, 25), fill=base)
        d.arc((-2, 7, 28, 26), 200, 290, fill=light)
        d.ellipse((21, 3, 26, 8), fill=mid, outline=light)
    elif kind == 'worm':
        for _ in range(3 if index % 4 == 3 else 1):
            x, y = rng.randrange(3, 23), rng.randrange(4, 23)
            d.ellipse((x-2, y-2, x+8, y+6), fill=mid)
            d.ellipse((x, y, x+7, y+5), fill=dark)
    elif kind == 'mirror':
        d.polygon([(0, 16), (16, 0), (31, 16), (16, 31)], fill=base, outline=mid)
        d.line([(3, 15), (15, 3)], fill=light)
        d.line([(12, 25), (27, 10)], fill=mid, width=2)
    elif kind == 'lab':
        d.rectangle((1, 1, 30, 30), fill=base, outline=dark, width=2)
        d.line([(3, 28), (3, 3), (28, 3)], fill=mid)
        for x, y in [(5, 5), (26, 5), (5, 26), (26, 26)]:
            d.rectangle((x, y, x+1, y+1), fill=light)
        if index % 4 == 3:
            for y in range(10, 24, 3): d.line((9, y, 23, y), fill=dark)
    else:
        d.rectangle((0, 0, 31, 31), fill=base, outline=dark)
        for y in range(2, 32, 4): d.line((0, y, 31, y), fill=mid if kind == 'boudoir' else base)
        d.polygon([(16, 7), (24, 16), (16, 25), (8, 16)], outline=mid, fill=base)
        if index % 4 == 3: d.polygon([(16, 11), (20, 16), (16, 21), (12, 16)], fill=light)
    return im


def deco_tile(kind, index):
    dark, base, mid, light = PALETTES[kind]
    im = Image.new('RGBA', (32, 32))
    d = ImageDraw.Draw(im)
    if index == 3:  # 薄い光・水面。床を透かす。
        d.ellipse((4, 21, 28, 28), fill=mid+'50')
        d.arc((6, 20, 26, 27), 180, 270, fill=light+'b0')
        d.line((22, 18, 22, 22), fill=light+'90')
        d.line((20, 20, 24, 20), fill=light+'90')
    elif kind == 'tentacle':
        for j in range(3 if index != 2 else 2):
            points = [(int(10+j*5+math.sin(t/6+j)*4), 29-t) for t in range(23-j*3)]
            d.line(points, fill=dark, width=7)
            d.line(points, fill=mid, width=5)
            d.line([(x-1,y) for x,y in points], fill=base, width=2)
            for x,y in points[2::5]: d.ellipse((x+1,y-1,x+2,y+1),fill=light)
        if index == 0: im=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    elif kind == 'slime':
        if index == 0:
            for x, h in [(7, 20), (15, 28), (24, 16)]:
                d.rounded_rectangle((x, 0, x+5, h), radius=3, fill=mid+'a0', outline=light+'90')
        else:
            d.ellipse((3, 13+index*2, 29, 29), fill=mid+'a0', outline=light+'a0')
            d.arc((5, 16, 23, 27),180,280,fill=light)
            d.ellipse((18, 12, 24, 18),fill=base+'b0',outline=light+'b0')
    elif kind == 'flesh':
        for j in range(5):
            a=j*math.tau/5; x=16+int(math.cos(a)*7); y=19+int(math.sin(a)*6)
            d.ellipse((x-5,y-7,x+5,y+6),fill=mid,outline=dark,width=2)
            d.arc((x-4,y-6,x+3,y+4),180,280,fill=light)
        d.ellipse((12,14,20,23),fill=base,outline=light)
    elif kind == 'worm':
        d.ellipse((3,8,29,29),fill=base,outline=mid,width=2)
        d.ellipse((8,12,25,26),fill=dark)
        if index == 1:
            d.line([(17,24),(20,20),(16,16),(18,10),(24,9)],fill=mid,width=4)
            d.line([(18,22),(21,20)],fill=light)
    elif kind == 'mirror':
        pts=[(6,6),(24,3),(27,27),(9,30)] if index != 2 else [(7,26),(14,12),(24,28)]
        d.polygon(pts,fill=mid,outline=dark,width=3)
        d.line([(11,23),(20,9)],fill=light,width=2)
        d.line([(15,26),(24,12)],fill=base,width=2)
    elif kind == 'cult':
        if index == 0:
            d.polygon([(5,0),(27,0),(26,29),(16,25),(6,29)],fill=mid,outline=dark,width=2)
            d.line((11,2,11,24),fill=base,width=2)
            d.polygon([(16,8),(20,14),(16,20),(12,14)],outline=light)
        else:
            d.line((16,15,16,28),fill=light,width=3);d.ellipse((9,26,23,30),fill=base,outline=mid)
            d.rectangle((12,9,20,17),fill=light)
            d.ellipse((14,3,18,10),fill='#edb186');d.point((16,5),fill='#ffe7b6')
    elif kind == 'lab':
        d.line([(5,0),(5,12),(18,12),(18,23),(27,23)],fill=dark,width=7)
        d.line([(5,0),(5,12),(18,12),(18,23),(27,23)],fill=mid,width=4)
        for x,y in [(5,12),(18,12),(18,23)]: d.ellipse((x-3,y-3,x+3,y+3),fill=base,outline=light)
        d.line([(27,19),(24,23),(27,27)],fill=light,width=2)
    else:
        if index == 0:
            d.polygon([(2,0),(30,0),(26,29),(20,21),(16,8),(11,23),(5,29)],fill=mid,outline=dark,width=2)
            d.line([(4,2),(16,8),(28,2)],fill=light)
        else:
            d.ellipse((9,22,23,29),fill=base,outline=light)
            d.line((16,20,16,12),fill=mid,width=2)
            d.arc((12,4,22,16),70,270,fill=light+'80',width=2)
            d.line((10,29,8,31),fill=mid);d.line((22,29,24,31),fill=mid)
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for kind in PALETTES:
        floor=Image.new('RGBA',(128,64));deco=Image.new('RGBA',(128,32))
        for i in range(8): floor.paste(floor_tile(kind,i),((i%4)*32,(i//4)*32))
        for i in range(4): deco.paste(deco_tile(kind,i),(i*32,0))
        floor.resize((256,128),Image.Resampling.NEAREST).save(OUT/f'room_{kind}.png')
        deco.resize((256,64),Image.Resampling.NEAREST).save(OUT/f'room_{kind}_deco.png')
    print('room chips: 8 floors (256x128), 8 decorations (256x64)')


if __name__ == '__main__': main()
