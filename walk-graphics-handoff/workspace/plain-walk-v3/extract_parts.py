from pathlib import Path
import json,base64
import numpy as np
from PIL import Image

ROOT=Path(__file__).parent
NAMES=['head','upper_body','lower_body','neck','upper_arm','elbow','forearm','hand','thigh','knee','shin','foot','shoulder','hip','wrist','ankle']
SIZES={
 'front':[(68,65),(34,34),(30,26),(9,10),(9,28),(6,6),(7,23),(8,9),(14,32),(8,8),(10,34),(12,15),(7,7),(8,8),(5,5),(6,6)],
 'side':[(60,64),(25,34),(24,26),(8,10),(9,28),(6,6),(7,23),(8,9),(14,32),(8,8),(10,34),(22,14),(7,7),(8,8),(5,5),(6,6)]}

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
    original=Image.open(ROOT/f'source-atlases/{view}-v1.png').resize(atlas.size,Image.Resampling.NEAREST)
    folder=ROOT/'parts'/view;folder.mkdir(parents=True,exist_ok=True)
    assets[view]={}
    for i,(name,size) in enumerate(zip(NAMES,SIZES[view])):
        col,row=i%4,i//4
        source=original if name in ['head','foot'] else atlas
        p=clean(source.crop((round(col*w/4),round(row*h/4),round((col+1)*w/4),round((row+1)*h/4))))
        p=p.resize(size,Image.Resampling.NEAREST);p.save(folder/f'{name}.png')
        data={'file':f'parts/{view}/{name}.png','size':list(size),'pivot':[size[0]/2,size[1]/2]}
        if name in ['upper_arm','forearm','thigh','shin']:
            data.update(pivot=[size[0]/2,3],end=[size[0]/2,size[1]-3],length=size[1]-6)
        if name=='head':data['pivot']=[34,62] if view=='front' else [28,61]
        if name=='upper_body':data['pivot']=[size[0]/2,32]
        if name=='upper_body' and view=='side':data['neck_socket']=[10,2]
        if name=='lower_body':data['pivot']=[size[0]/2,-2]
        if name=='hand':data['pivot']=[size[0]/2,2]
        if name=='foot':
            data['pivot']=[6,2] if view=='front' else [7,2]
            ys,xs=np.nonzero(np.array(p)[:,:,3]);data['opaque_corners']=[[int(x+dx),int(y+dy)] for y,x in zip(ys,xs) for dx,dy in [(0,0),(0,1),(1,0),(1,1)]]
        assets[view][name]=data
    # A separate waist connector reuses the neutral joint material.
    p=Image.open(folder/'hip.png').resize((18,10),Image.Resampling.NEAREST);p.save(folder/'waist.png')
    assets[view]['waist']={'file':f'parts/{view}/waist.png','size':[18,10],'pivot':[9,5]}
# Registered alternatives for the front foot; each stays on the same ankle.
feet=Image.open(ROOT/'source-atlases/front-feet-v3.png');w,h=feet.size
for i,(name,size) in enumerate([('foot',(12,15)),('foot_heel',(12,14)),('foot_swing',(12,14)),('foot_toe',(10,13))]):
    col,row=i%2,i//2
    p=clean(feet.crop((round(col*w/2),round(row*h/2),round((col+1)*w/2),round((row+1)*h/2)))).resize(size,Image.Resampling.NEAREST)
    p.save(ROOT/f'parts/front/{name}.png')
    ys,xs=np.nonzero(np.array(p)[:,:,3])
    assets['front'][name]={'file':f'parts/front/{name}.png','size':list(size),'pivot':[size[0]/2,2],
       'opaque_corners':[[int(x+dx),int(y+dy)] for y,x in zip(ys,xs) for dx,dy in [(0,0),(0,1),(1,0),(1,1)]]}
(ROOT/'assets.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2))
print('Extracted 37 sprite assets: 17 parts per view plus 3 front-foot alternatives.')
