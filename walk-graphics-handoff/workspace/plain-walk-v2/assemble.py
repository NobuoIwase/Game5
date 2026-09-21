from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).parent
C=json.loads((ROOT/'config.json').read_text());duration=C['frame_ms']
try:font=ImageFont.truetype('DejaVuSans.ttf',15);small=ImageFont.truetype('DejaVuSans.ttf',11)
except OSError:font=small=ImageFont.load_default()
frames={v:[Image.open(ROOT/f'frames/{v}/{f:02d}.png').convert('RGBA') for f in range(8)] for v in ['front','side']}
sheet=Image.new('RGBA',(1536,512))
for row,v in enumerate(['front','side']):
    strip=Image.new('RGBA',(1536,256))
    for f,p in enumerate(frames[v]):strip.alpha_composite(p,(192*f,0));sheet.alpha_composite(p,(192*f,256*row))
    strip.save(ROOT/f'plain-{v}-8frames.png')
    frames[v][0].save(ROOT/f'plain-{v}-walk.png',save_all=True,append_images=frames[v][1:],duration=duration,loop=0,disposal=0,blend=0)
sheet.save(ROOT/'plain-walk-spritesheet.png')

def gif(images,path):
    swatch=Image.new('RGB',(images[0].width,images[0].height*len(images)))
    for i,p in enumerate(images):swatch.paste(p,(0,p.height*i))
    palette=swatch.quantize(colors=160)
    q=[p.quantize(palette=palette,dither=Image.Dither.NONE) for p in images]
    q[0].save(path,save_all=True,append_images=q[1:],duration=duration,loop=0,optimize=False,disposal=2)

for bones in [False,True]:
    preview=[]
    for f in range(8):
        p=Image.new('RGB',(808,566),(25,28,36));d=ImageDraw.Draw(p)
        for v,x,title in [('front',12,'FRONT / DOWN'),('side',412,'SIDE / RIGHT')]:
            stage=Image.open(ROOT/f'checks/{v}/{f}{"-joints" if bones else ""}.png').convert('RGB');p.paste(stage,(x,31))
            d.text((x+10,8),title,font=font,fill=(231,232,240))
        d.text((22,548),f'{f+1:02d} / 08   4 frames / step',font=small,fill=(178,185,200))
        d.text((423,548),'Spine / hip / knee joints' if bones else 'Relaxed shoulders / extended leading knee',font=small,fill=(144,223,207))
        preview.append(p)
    gif(preview,ROOT/('plain-walk-joints.gif' if bones else 'plain-walk-preview.gif'))
    if not bones:preview[0].save(ROOT/'plain-walk-preview.png')

assets=json.loads((ROOT/'assets.json').read_text())
overview=Image.new('RGB',(1200,750),(32,35,45));d=ImageDraw.Draw(overview)
for row,v in enumerate(['front','side']):
    d.text((18,row*375+12),v.upper(),font=font,fill=(144,223,207))
    for i,(name,a) in enumerate(assets[v].items()):
        x=(i%9)*132+65;y=row*375+(i//9)*165+111
        p=Image.open(ROOT/a['file']);scale=min(3,92/p.width,102/p.height);p=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.NEAREST)
        overview.paste(p,(x-p.width//2,y-p.height//2),p)
        d.text((x-50,y+60),name,font=small,fill=(227,231,241))
overview.save(ROOT/'parts-overview.png')
print('Created GIF previews, APNG loops, sprite sheets and parts overview.')
