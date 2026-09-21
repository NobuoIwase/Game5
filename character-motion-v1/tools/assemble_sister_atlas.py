"""Mechanically pack independently generated views; never reflect or repaint."""
from pathlib import Path
import json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
base=Image.open(ROOT/'art/sister-atlas-generated.png').convert('RGBA')
patch=Image.open(ROOT/'art/sister-two-directions-generated.png').convert('RGBA')
directions=['front','down_right','right','up_right','back','up_left','left','down_left']
mapping=[('base',0),('patch',0),('base',6),('base',3),('base',4),('patch',1),('base',2),('base',7)]
atlas=Image.new('RGBA',(2048,1024))
layout=[]
for i,(kind,index) in enumerate(mapping):
    image=base if kind=='base' else patch
    columns,rows=(4,2) if kind=='base' else (2,1)
    box=(round(index%columns*image.width/columns),round(index//columns*image.height/rows),round((index%columns+1)*image.width/columns),round((index//columns+1)*image.height/rows))
    cell=image.crop(box)
    bounds=cell.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox()
    bounds=(max(0,bounds[0]-2),max(0,bounds[1]-2),min(cell.width,bounds[2]+2),min(cell.height,bounds[3]+2))
    figure=cell.crop(bounds)
    scale=min(474/figure.height,474/figure.width)
    size=(round(figure.width*scale),round(figure.height*scale))
    figure=figure.resize(size,Image.Resampling.LANCZOS)
    offset=((512-size[0])//2,494-size[1])
    target=Image.new('RGBA',(512,512));target.alpha_composite(figure,offset)
    target.save(ROOT/f'art/sister-{directions[i]}.png')
    atlas.alpha_composite(target,((i%4)*512,(i//4)*512))
    source_path='art/sister-atlas-generated.png' if kind=='base' else 'art/sister-two-directions-generated.png'
    layout.append(dict(direction=directions[i],source=source_path,source_kind=kind,index=index,source_cell_box=box,trim_box=bounds,scale=scale,target_offset=offset))
atlas.save(ROOT/'art/sister-source.png')
(ROOT/'art/sister-source-layout.json').write_text(json.dumps({'size':[2048,1024],'cell':[512,512],'no_reflection':True,'views':layout},indent=2)+'\n',encoding='utf-8')
print('Packed 8 independent views as 2048 x 1024 RGBA atlas (512 x 512 cells).')
