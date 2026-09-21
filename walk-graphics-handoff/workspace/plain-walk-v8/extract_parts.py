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
rows={'down_right':[0,.26,.49,.72,.82,1],'up_right':[0,.25,.46,.70,.81,1],'back':[0,.25,.46,.68,.80,1]}
for view in rows:
    atlas=Image.open(ROOT/f'source-atlases/{view}.png');w,h=atlas.size
    folder=ROOT/'parts'/view;folder.mkdir(parents=True,exist_ok=True);assets[view]={}
    sizes=list(SIZES['front']);sizes[0]=(68,65) if view=='back' else (64,65)
    sizes[1]=(34,34) if view=='back' else (32,34)
    sizes[2]=(30,26) if view=='back' else (28,26)
    sizes[11]=(12,14) if view=='back' else (18,14)
    for i,name in enumerate(NAMES+['foot_heel','foot_swing','foot_toe']):
        col,row=i%4,i//4
        size=sizes[i] if i<16 else ((12,15) if view=='back' else (18,15))
        p=clean(atlas.crop((round(col*w/4),round(rows[view][row]*h),round((col+1)*w/4),round(rows[view][row+1]*h))))
        if view=='up_right' and name=='head':p=clean(Image.open(ROOT/'source-atlases/up-right-head-v4.png'))
        p=p.resize(size,Image.Resampling.NEAREST);p.save(folder/f'{name}.png')
        data={'file':f'parts/{view}/{name}.png','size':list(size),'pivot':[size[0]/2,size[1]/2]}
        if name in ['upper_arm','forearm','thigh','shin']:
            data.update(pivot=[size[0]/2,3],end=[size[0]/2,size[1]-3],length=size[1]-6)
        if name=='head':data['pivot']=[34 if view=='back' else 31,62]
        if name=='upper_body':
            data['pivot']=[size[0]/2,32]
            xx=np.nonzero(np.array(p)[2,:,3])[0];data['neck_socket']=[float(xx.mean())+.5,2]
        if name=='lower_body':data['pivot']=[size[0]/2,-2]
        if name=='hand':data['pivot']=[size[0]/2,2]
        if name.startswith('foot'):
            a=np.array(p);xx=np.nonzero(a[2,:,3])[0];data['pivot']=[float(xx.mean())+.5,2]
            ys,xs=np.nonzero(a[:,:,3]);data['opaque_corners']=[[int(x+dx),int(y+dy)] for y,x in zip(ys,xs) for dx,dy in [(0,0),(0,1),(1,0),(1,1)]]
        assets[view][name]=data
    p=Image.open(folder/'hip.png').resize((18,10),Image.Resampling.NEAREST);p.save(folder/'waist.png')
    assets[view]['waist']={'file':f'parts/{view}/waist.png','size':[18,10],'pivot':[9,5]}
corrections={
 'down_right':('down-corrections-v5.png',[0,.42,.69,1],[('upper_body',(32,34)),('neck',(8,10)),('foot',(17,16)),('foot_heel',(17,15)),('foot_swing',(17,16)),('foot_toe',(15,17))]),
 'up_right':('up-corrections-v5.png',[0,.55,1],[('upper_body',(32,34)),('neck',(8,10)),('head',(64,65)),('hand',(8,9))])}
for view,(file,edges,items) in corrections.items():
    source=Image.open(ROOT/'source-atlases'/file);w,h=source.size
    for i,(name,size) in enumerate(items):
        col,row=i%2,i//2
        p=clean(source.crop((round(col*w/2),round(edges[row]*h),round((col+1)*w/2),round(edges[row+1]*h))))
        if name=='head':p=clean(Image.open(ROOT/'source-atlases/up-head-v5.png'))
        p=p.resize(size,Image.Resampling.NEAREST);p.save(ROOT/f'parts/{view}/{name}.png')
        a=assets[view][name];a['size']=list(size)
        if name=='neck':a['pivot']=[size[0]/2,size[1]/2]
        if name=='upper_body':
            xx=np.nonzero(np.array(p)[2,:,3])[0];a['neck_socket']=[float(xx.mean())+.5,2]
            a['shoulder_sockets']={'near':[27,13],'far':[5,11]} if view=='up_right' else {'near':[6,13],'far':[27,12]}
        if name.startswith('foot'):
            pixels=np.array(p);xx=np.nonzero(pixels[2,:,3])[0];a['pivot']=[float(xx.mean())+.5,2]
            ys,xs=np.nonzero(pixels[:,:,3]);a['opaque_corners']=[[int(x+dx),int(y+dy)] for y,x in zip(ys,xs) for dx,dy in [(0,0),(0,1),(1,0),(1,1)]]
# Each diagonal uses its own three-quarter skull contour. The mount lies
# behind the jaw, within the skull base; registration leaves a visible nape.
head_corrections={
 'down_right':('down-head-v7.png',[30,62]),
 'up_right':('up-head-v7.png',[34,62])}
for view,(file,pivot) in head_corrections.items():
    p=clean(Image.open(ROOT/'source-atlases'/file)).resize((64,65),Image.Resampling.NEAREST)
    p.save(ROOT/f'parts/{view}/head.png')
    assets[view]['head'].update(pivot=pivot,attachment='skull_base')
# Integrate only the generated open neck edge. Keep the approved torso,
# shoulder registration, silhouette, and all pixels outside this tiny seam.
for view,file in {'down_right':'down-neck-open-v8.png','up_right':'up-neck-open-v8.png'}.items():
    path=ROOT/f'parts/{view}/upper_body.png'
    original=Image.open(path).convert('RGBA');pixels=np.array(original)
    generated=clean(Image.open(ROOT/'source-atlases'/file)).resize(original.size,Image.Resampling.NEAREST)
    sample=np.array(generated)
    opening=np.nonzero((sample[0,:,3]>0)&(sample[0,:,:3].mean(axis=1)>170))[0]
    assert len(opening)>=3,'Generated neck opening must not have a dark cap'
    cap=np.nonzero(pixels[0,:,3]>0)[0]
    left,right=int(cap.min()+1),int(cap.max())
    patch=generated.crop((int(opening.min()),0,int(opening.max())+1,2)).resize((right-left,2),Image.Resampling.NEAREST)
    pixels[:2,left:right,:3]=np.array(patch)[:,:,:3]
    Image.fromarray(pixels).save(path)
    assets[view]['upper_body']['open_neck_edge']=[left,0,right,2]
(ROOT/'assets.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2))
print(f'Extracted {sum(map(len,assets.values()))} sprite assets across five directions.')
