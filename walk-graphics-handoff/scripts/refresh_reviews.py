"""Rebuild visual review sheets after render.cjs and assemble.py."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import argparse
p=argparse.ArgumentParser();p.add_argument('--current',type=Path,required=True);p.add_argument('--previous',type=Path);a=p.parse_args()
root=a.current
try:font=ImageFont.truetype('DejaVuSans.ttf',14)
except OSError:font=ImageFont.load_default()
bg=(25,28,36)
def paste(out,folder,v,f,box,scale,xy,label):
 im=Image.open(folder/f'frames/{v}/{f:02d}.png').convert('RGBA').crop(box)
 im=im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST)
 out.paste(im,xy,im);ImageDraw.Draw(out).text((xy[0],xy[1]-22),label,font=font,fill=(220,225,235))
if a.previous:
 out=Image.new('RGB',(560,704),bg)
 for row,v in enumerate(['down_right','up_right']):
  for col,folder in enumerate([a.previous,root]):paste(out,folder,v,0,(56,54,140,158),3,(col*280+14,row*352+32),f'{v} {folder.name.rsplit("-",1)[-1]}')
 out.save(root/'head-neck-comparison.png')
out=Image.new('RGB',(1060,278),bg)
for i,v in enumerate(['front','down_right','side','up_right','back']):paste(out,root,v,0,(48,50,148,167),2,(i*212+6,34),v)
out.save(root/'head-turnaround.png')
out=Image.new('RGB',(1408,836),bg)
for row,v in enumerate(['down_right','up_right']):
 for f in range(8):paste(out,root,v,f,(54,54,138,252),2,(f*176+4,row*418+22),str(f+1))
out.save(root/'diagonal-8frames-check.png')
print('Updated review sheets in',root)
