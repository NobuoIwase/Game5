from pathlib import Path
import json,base64
import numpy as np
from PIL import Image

ROOT=Path(__file__).parent
NAMES=['head','upper_body','lower_body','neck','upper_arm','elbow','forearm','hand','thigh','knee','shin','foot','shoulder','hip','wrist','ankle']
SIZES={
 'front':[(68,65),(39,41),(32,33),(11,15),(10,29),(9,9),(8,23),(9,10),(15,33),(12,12),(11,34),(12,15),(11,11),(15,15),(7,7),(8,8)],
 'side':[(60,64),(30,41),(27,33),(10,15),(10,29),(9,9),(8,23),(9,10),(15,33),(12,12),(11,34),(22,14),(11,11),(15,15),(7,7),(8,8)]}

def clean(im):
    a=np.array(im.convert('RGBA'));a[:,:,3]=np.where(a[:,:,3]>=210,255,0)
    # Alpha fringe in the generated atlas is excluded before registration.
    opaque=a[:,:,3]>0;seen=np.zeros_like(opaque);largest=[]
    for y,x in zip(*np.nonzero(opaque)):
        if seen[y,x]:continue
        todo=[(y,x)];seen[y,x]=1;component=[]
        while todo:
            yy,xx=todo.pop();component.append((yy,xx))
            for dy,dx in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]:
                ny,nx=yy+dy,xx+dx
                if 0<=ny<a.shape[0] and 0<=nx<a.shape[1] and opaque[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=1;todo.append((ny,nx))
        if len(component)>len(largest):largest=component
    a[:,:,3]=0
    yy,xx=zip(*largest);a[yy,xx,3]=255
    im=Image.fromarray(a);return im.crop(im.getbbox())

assets={}
for view in ['front','side']:
    atlas=Image.open(ROOT/f'source-atlases/{view}.png');w,h=atlas.size
    folder=ROOT/'parts'/view;folder.mkdir(parents=True,exist_ok=True)
    assets[view]={}
    for i,(name,size) in enumerate(zip(NAMES,SIZES[view])):
        col,row=i%4,i//4
        p=clean(atlas.crop((round(col*w/4),round(row*h/4),round((col+1)*w/4),round((row+1)*h/4))))
        if name=='upper_body':
            # The collar peg is supplied by the independent neck asset.
            p=p.crop((0,round(p.height*.13),p.width,p.height))
        p=p.resize(size,Image.Resampling.NEAREST);p.save(folder/f'{name}.png')
        data={'file':f'parts/{view}/{name}.png','size':list(size),'pivot':[size[0]/2,size[1]/2]}
        if name in ['upper_arm','forearm','thigh','shin']:
            data.update(pivot=[size[0]/2,3],end=[size[0]/2,size[1]-3],length=size[1]-6)
        if name=='head':data['pivot']=[34,62] if view=='front' else [28,61]
        if name=='upper_body':data['pivot']=[size[0]/2,38]
        if name=='lower_body':data['pivot']=[size[0]/2,2]
        if name=='hand':data['pivot']=[size[0]/2,2]
        if name=='foot':
            data['pivot']=[6,2] if view=='front' else [7,2]
            ys,xs=np.nonzero(np.array(p)[:,:,3]);data['opaque_corners']=[[int(x+dx),int(y+dy)] for y,x in zip(ys,xs) for dx,dy in [(0,0),(0,1),(1,0),(1,1)]]
        assets[view][name]=data
    # A separate waist connector reuses the neutral joint material.
    p=Image.open(folder/'hip.png').resize((19,12),Image.Resampling.NEAREST);p.save(folder/'waist.png')
    assets[view]['waist']={'file':f'parts/{view}/waist.png','size':[19,12],'pivot':[9.5,6]}
(ROOT/'assets.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2))
print('Extracted 34 independent sprite parts.')
