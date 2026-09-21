from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json
BASE=Path(__file__).resolve().parents[2]
rig=json.loads((BASE/'rigs/warrior.json').read_text(encoding='utf-8'))
src=Image.open(BASE/rig['source']).convert('RGBA')
out=Path(__file__).resolve().parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12)
sheet=Image.new('RGB',(362*4,543*2),(32,37,44))
for i,(direction,v) in enumerate(rig['views'].items()):
    cell=src.crop((i%4*362,i//4*543,i%4*362+362,i//4*543+543))
    over=Image.new('RGBA',cell.size)
    draw=ImageDraw.Draw(over)
    erase=Image.new('L',cell.size);ed=ImageDraw.Draw(erase)
    for limb in v['legs']+v['arms']:
        poly=[tuple(p) for p in limb['polygon']]
        color=(50,170,255,110) if limb['side']=='right' else (255,155,40,110)
        if poly:
            draw.polygon(poly,fill=color,outline=color[:3]+(255,),width=2)
            ed.polygon(poly,fill=255)
        for key in ('hip','knee','ankle','shoulder','elbow','wrist'):
            if key in limb:
                x,y=limb[key];draw.ellipse((x-3,y-3,x+3,y+3),fill=(255,255,255,255));draw.text((x+4,y-4),key[:1],font=font,fill=(255,255,255,255))
    for key in ['root','neck']:
        x,y=v[key];draw.ellipse((x-4,y-4,x+4,y+4),fill=(80,255,100,255))
    bg=Image.new('RGBA',cell.size,(32,37,44,255));bg.alpha_composite(cell);bg.alpha_composite(over)
    ImageDraw.Draw(bg).text((8,8),direction,font=font,fill=(255,255,255))
    bg.convert('RGB').save(out/f'{direction}-mask.png');sheet.paste(bg.convert('RGB'),(i%4*362,i//4*543))
    body=cell.copy();body.putalpha(ImageChops.subtract(cell.getchannel('A'),erase));body.save(out/f'{direction}-body.png')
sheet.save(out/'all-masks.jpg',quality=94)
print('Wrote cutout masks, landmarks and separated body debug views.')
