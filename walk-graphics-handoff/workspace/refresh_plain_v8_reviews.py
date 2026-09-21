from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json
r=Path('/workspace/scratch/61b71f8411e4');new=r/'plain-walk-v8';old=r/'plain-walk-v7'
font=ImageFont.truetype('DejaVuSans.ttf',14);bg=(25,28,36)
comparison=Image.new('RGB',(768,608),bg);d=ImageDraw.Draw(comparison)
for col,(v,version) in enumerate([('down_right',7),('down_right',8),('up_right',7),('up_right',8)]):
 for row,f in enumerate([0,1]):
  im=Image.open(r/f'plain-walk-v{version}/frames/{v}/{f:02d}.png').convert('RGBA').crop((82,117,114,161)).resize((192,264),Image.Resampling.NEAREST)
  x=col*192;y=row*304+30;comparison.paste(im,(x,y),im);d.text((x+4,y-22),f'{v} v{version} / {f+1}',font=font,fill=(220,225,235))
comparison.save(new/'head-neck-comparison.png')
turn=Image.new('RGB',(1060,258),bg);d=ImageDraw.Draw(turn)
for i,v in enumerate(['front','down_right','side','up_right','back']):
 im=Image.open(new/f'frames/{v}/00.png').convert('RGBA').crop((48,50,148,157)).resize((200,214),Image.Resampling.NEAREST)
 turn.paste(im,(i*212+6,34),im);d.text((i*212+12,12),v,font=font,fill=(220,225,235))
turn.save(new/'head-turnaround.png')
seq=Image.new('RGB',(1408,836),bg);d=ImageDraw.Draw(seq)
for row,v in enumerate(['down_right','up_right']):
 for f in range(8):
  im=Image.open(new/f'frames/{v}/{f:02d}.png').convert('RGBA').crop((54,54,138,252)).resize((168,396),Image.Resampling.NEAREST)
  x=f*176+4;y=row*418+22;seq.paste(im,(x,y),im);d.text((x,y-18),str(f+1),font=font,fill=(220,225,235))
seq.save(new/'diagonal-8frames-check.png')
for v in ['down_right','up_right']:
 a=np.array(Image.open(old/f'parts/{v}/upper_body.png'));b=np.array(Image.open(new/f'parts/{v}/upper_body.png'))
 yy,xx=np.nonzero(np.any(a!=b,axis=2));assert yy.max()<2
 assert np.array_equal(a[:,:,3],b[:,:,3]);print(v, len(xx),'changed pixels, only in the two-row neck edge.')
for v in ['front','side','back']:
 for f in range(8):
  file=f'frames/{v}/{f:02d}.png';assert (old/file).read_bytes()==(new/file).read_bytes()
a=json.loads((old/'rig.json').read_text());b=json.loads((new/'rig.json').read_text())
assert a['frames']==b['frames']
print('PASS: all joints and transforms unchanged; 24 other-view frames identical.')
for file in list(new.glob('*.gif'))+[new/f'plain-{v}-walk.png' for v in b['config']['views']]:
 im=Image.open(file);assert im.n_frames==8
 for f in range(8):im.seek(f);assert im.info['duration']==120
print('PASS: all GIF/APNG loops retain 8 frames at 120 ms.')
