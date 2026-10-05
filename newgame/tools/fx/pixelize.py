"""Generated-image -> transparent, palette-limited combat sprites. Pillow only.
Run: python newgame/tools/fx/pixelize.py source-atlas.png
The source is AI generated, not reconstructed with drawing primitives.
"""
from pathlib import Path
import sys, json, hashlib
from PIL import Image, ImageDraw

source = Path(sys.argv[1])
blade = len(sys.argv) > 2 and sys.argv[2] == 'blade'
Path('evidence').mkdir(exist_ok=True)
out = Path(__file__).resolve().parents[2] / 'assets' / 'fx'
out.mkdir(parents=True, exist_ok=True)
im = Image.open(source).convert('RGBA')
assert im.size == (1536, 1024), im.size
palette = [(100,55,36),(170,98,38),(222,154,51),(255,202,81),
           (255,230,142),(255,246,200),(255,255,239),(143,229,235)]
names = ['staff-sweep','staff-thrust','star-bolt','light-burst','repel-ring','hit-spark']
if blade:
    names = ['blade-slash','blade-thrust','blade-flight','blade-spin','blade-parry','blade-iai']
    palette = [(48,64,92),(70,97,138),(87,132,196),(121,173,231),
               (165,207,246),(204,228,251),(230,244,255),(255,255,255)]
preview = Image.new('RGB',(768,576),'#181b29')
d = ImageDraw.Draw(preview)
meta = {'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'source_size':list(im.size),'frame_size':64,'frames':4,'palette':palette,
        'alpha':'binary; remove generated low-opacity glow before resize','assets':{}}
for i,name in enumerate(names):
    x,y=(i%3)*512,(i//3)*512
    raw=im.crop((x,y,x+512,y+512))
    # The generated ring's top star touches the row boundary; do not let it
    # inflate the thrust crop or leak into the flying bolt's left margin.
    if name == 'staff-thrust': raw=im.crop((529,145,1024,360))
    if name == 'star-bolt': raw=im.crop((1070,145,1510,355))
    raw.putalpha(raw.getchannel('A').point(lambda a:255 if a>=110 else 0))
    box=raw.getbbox()
    assert box, name
    base=raw.crop(box)
    base.thumbnail((56,56),Image.Resampling.LANCZOS)
    sheet=Image.new('RGBA',(256,64))
    for f,scale in enumerate([0.82,1.0,0.96,0.90]):
        frame=base.resize((max(1,round(base.width*scale)),max(1,round(base.height*scale))),Image.Resampling.NEAREST)
        pixels=[]
        for r,g,b,a in frame.getdata():
            if a<100: pixels.append((0,0,0,0));continue
            color=min(palette,key=lambda c:sum((c[j]-[r,g,b][j])**2 for j in range(3)))
            pixels.append((*color,255))
        frame.putdata(pixels)
        sheet.paste(frame,(f*64+(64-frame.width)//2,(64-frame.height)//2))
    sheet.save(out/(name+'.png'),optimize=True)
    meta['assets'][name]={'file':name+'.png','source_cell':[x,y,512,512],'source_bounds':list(box),'bytes':(out/(name+'.png')).stat().st_size}
    thumb=sheet.resize((768,192),Image.Resampling.NEAREST)
    # Contact sheet: first two frames per asset, six rows.
    for f in range(2):
        tile=sheet.crop((f*64,0,(f+1)*64,64)).resize((80,80),Image.Resampling.NEAREST)
        preview.paste(tile,(i%3*256+30+f*100,i//3*288+80),tile)
    d.text((i%3*256+24,i//3*288+35),name,fill='#ffe68e')
    d.text((i%3*256+24,i//3*288+190),'64px / 4 frames / 8 colors',fill='#a7bac8')
preview.save('evidence/pixel-blade-assets.png' if blade else 'evidence/pixel-assets.png')
(out/('blade-manifest.json' if blade else 'manifest.json')).write_text(json.dumps(meta,indent=2)+'\n',encoding='utf8')
print(json.dumps(meta,indent=2))
