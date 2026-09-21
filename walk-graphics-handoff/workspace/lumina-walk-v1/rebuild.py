from pathlib import Path
import math, json, base64, shutil, zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
OUT = ROOT
OUT.mkdir(exist_ok=True)
W,H = 192,256
N=8
DURATION=120
SOURCES = {
    'front': ROOT/'source-atlases/front.png',
    'side': ROOT/'source-atlases/side.png',
}
NAMES=['head','torso','skirt','hair','arm_far','arm_near','leg_far','leg_near','wing_far','wing_near','tail_far','tail_near']
SIZES={
 'front':[(88,103),(48,45),(102,73),(101,118),(28,49),(28,49),(18,58),(18,58),(56,43),(56,43),(52,54),(52,54)],
 'side':[(78,103),(33,45),(76,72),(76,120),(20,49),(20,49),(24,59),(24,59),(45,39),(48,41),(44,56),(48,58)]
}

# Generated atlas preprocessing: chroma key, cell extraction, nearest-neighbor
# sampling. All character artwork is supplied by the image-generation tool.
def extract():
    parts={}
    rows=[0,409,694,1024]
    for view,path in SOURCES.items():
        folder=OUT/'parts'/view
        folder.mkdir(parents=True,exist_ok=True)
        rgb=np.array(Image.open(path).convert('RGB'))
        r,g,b=[rgb[:,:,i].astype(int) for i in range(3)]
        key=(g>r+25)&(g>b+25)
        rgba=np.dstack([rgb,np.where(key,0,255).astype('uint8')])
        # Suppress the small green fringe left by image generation at silhouette edges.
        edge=(g>r+5)&(g>b+5)&(~key)
        rgba[:,:,1][edge]=np.maximum(r,b)[edge].astype('uint8')
        atlas=Image.fromarray(rgba)
        parts[view]={}
        for i,name in enumerate(NAMES):
            row,col=divmod(i,4)
            piece=atlas.crop((384*col,rows[row],384*(col+1),rows[row+1]))
            bb=piece.getbbox()
            if not bb: raise ValueError((view,name,'empty'))
            piece=piece.crop(bb).resize(SIZES[view][i],Image.Resampling.NEAREST)
            piece.save(folder/(name+'.png'))
            parts[view][name]=piece
        # Articulate the profile legs at the knees and ankles. Overlaps prevent seams.
        for name in ['leg_far','leg_near']:
            leg=parts[view][name]
            if view=='side':
                for suffix,box in [('thigh',(0,0,24,32)),('shin',(0,27,24,54)),('foot',(0,50,24,59))]:
                    p=leg.crop(box)
                    parts[view][name+'_'+suffix]=p
                    p.save(folder/(name+'_'+suffix+'.png'))
    return parts

PARTS=extract()
RIG={'canvas':[W,H],'fps':1000/DURATION,'frames_per_step':4,'frames_per_cycle':8,
     'directions':['front','side'],'ground_y':242,'parts':{},'frames':{},
     'hierarchy':{'root':['pelvis'],'pelvis':['legs','skirt','torso','tails'],
                  'torso':['head','arms','wings'],'head':['hair','halo_in_head']}}
for v in PARTS:
    RIG['parts'][v]={n:{'file':f'parts/{v}/{n}.png','size':list(im.size)} for n,im in PARTS[v].items()}

def op(name,x,y,pivot=(0,0),angle=0,sx=1,sy=1):
    return {'part':name,'x':round(x,3),'y':round(y,3),'pivot':list(pivot),'angle':round(angle,3),'scale':[round(sx,4),round(sy,4)]}

def pose_front(f):
    b=[0,2,0,-2][f%4]
    sway=[-1,-1,0,1,1,1,0,-1][f]
    lag=[-1,0,1,2,1,0,-1,-2][f]
    ops=[]
    ops+=[op('wing_far',75,126+b,(52,29),-lag*1.1),op('wing_near',117,126+b,(4,29),-lag*1.1)]
    ops+=[op('hair',96+sway,41+b,(50,0),lag*.6)]
    ops+=[op('tail_far',77,183+b,(46,3),lag*1.5),op('tail_near',115,183+b,(6,3),lag*1.5)]
    feet=[241,241,238,236,233,229,233,238]
    for name,x,offset in [('leg_far',82,0),('leg_near',111,4)]:
        fy=feet[(f+offset)%8]
        hip=182+b
        ops.append(op(name,x,hip,(9,0),sway*.8,1,(fy-hip)/58))
    swing=[-5,-3,0,3,5,3,0,-3][f]
    ops += [op('arm_far',75+sway,125+b,(23,3),swing),op('arm_near',117+sway,125+b,(5,3),swing)]
    ops += [op('skirt',96+sway*.3,143+b*.6,(51,0),sway*.45)]
    ops += [op('torso',96+sway,112+b,(24,0),sway*.45)]
    ops += [op('head',96+sway,20+b,(44,0),0)]
    return ops

def ik_leg(name,hip,target,bend=1):
    hx,hy=hip; tx,ty=target
    l1,l2=29,26
    dx,dy=tx-hx,ty-hy
    dist=math.hypot(dx,dy)
    if dist>l1+l2-.05:
        ratio=(l1+l2-.05)/dist
        dx*=ratio;dy*=ratio;tx=hx+dx;ty=hy+dy;dist=l1+l2-.05
    a=(l1*l1-l2*l2+dist*dist)/(2*dist)
    h=math.sqrt(max(0,l1*l1-a*a))
    kx=hx+a*dx/dist+bend*h*dy/dist
    ky=hy+a*dy/dist-bend*h*dx/dist
    def angle(x1,y1,x2,y2):return math.degrees(math.atan2(-(x2-x1),y2-y1))
    return [op(name+'_thigh',hx,hy,(11,1),angle(hx,hy,kx,ky)),
            op(name+'_shin',kx,ky,(10,2),angle(kx,ky,tx,ty)),
            op(name+'_foot',tx,ty,(9,1),0)]

def pose_side(f):
    b=[0,2,0,-2][f%4]
    lag=[-1,0,1,2,1,0,-1,-2][f]
    s=[-18,-12,0,13,18,11,0,-12][f]
    hip=(100,181+b)
    footx=[17,9,0,-10,-17,-11,0,12]
    footy=[234,234,234,234,234,226,223,229]
    def leg(name,offset):
        k=(f+offset)%8
        return ik_leg(name,hip,(100+footx[k],footy[k]))
    ops=[op('wing_far',91,130+b,(42,27),lag),
         op('tail_far',100,181+b,(40,3),lag*1.7)]
    ops+=leg('leg_far',4)
    ops+=[op('arm_far',105,126+b,(8,3),-s*.7)]
    ops+=[op('hair',94,41+b,(42,0),lag*.8),
          op('tail_near',101,183+b,(44,3),lag*1.7)]
    ops+=leg('leg_near',0)
    ops += [op('skirt',103,144+b*.65,(40,0),lag*.5),
            op('torso',102,112+b,(17,0),0),
            op('wing_near',89,128+b,(44,27),lag*1.2),
            op('arm_near',106,126+b,(7,3),s*.7),
            op('head',99,20+b,(40,0),0)]
    return ops

def draw_part(canvas,view,t):
    p=PARTS[view][t['part']]
    theta=math.radians(t['angle'])
    c,s=math.cos(theta),math.sin(theta)
    sx,sy=t['scale'];px,py=t['pivot'];x,y=t['x'],t['y']
    # Forward matrix follows canvas: x'=c*sx*x-s*sy*y+tx, y'=s*sx*x+c*sy*y+ty.
    tx=x-c*sx*px+s*sy*py;ty=y-s*sx*px-c*sy*py
    a,b,c0=c/sx,s/sx,(-c*tx-s*ty)/sx
    d,e,f0=-s/sy,c/sy,(s*tx-c*ty)/sy
    layer=p.transform((W,H),Image.Transform.AFFINE,(a,b,c0,d,e,f0),resample=Image.Resampling.NEAREST)
    canvas.alpha_composite(layer)

FRAMES={}
for view,fn in [('front',pose_front),('side',pose_side)]:
    folder=OUT/'frames'/view;folder.mkdir(parents=True,exist_ok=True)
    FRAMES[view]=[];RIG['frames'][view]=[]
    for f in range(N):
        img=Image.new('RGBA',(W,H))
        pose=fn(f);RIG['frames'][view].append(pose)
        for t in pose:draw_part(img,view,t)
        bb=img.getbbox()
        if not (bb and bb[0]>0 and bb[1]>0 and bb[2]<W and bb[3]<H):raise ValueError(('clipping',view,f,bb))
        img.save(folder/f'{f:02d}.png');FRAMES[view].append(img)
    strip=Image.new('RGBA',(W*N,H))
    for f,img in enumerate(FRAMES[view]):strip.alpha_composite(img,(f*W,0))
    strip.save(OUT/f'lumina-{view}-8frames.png')
    FRAMES[view][0].save(OUT/f'lumina-{view}-walk.png',save_all=True,append_images=FRAMES[view][1:],duration=DURATION,loop=0,disposal=0,blend=0)
sheet=Image.new('RGBA',(W*N,H*2))
for row,view in enumerate(['front','side']):
    for f,img in enumerate(FRAMES[view]):sheet.alpha_composite(img,(f*W,row*H))
sheet.save(OUT/'lumina-walk-spritesheet.png')
(OUT/'rig.json').write_text(json.dumps(RIG,ensure_ascii=False,indent=2))

# A compact animated contact sheet on a flat map, enlarged without smoothing.
preview=[]
try:
    font=ImageFont.truetype('DejaVuSans.ttf',14)
    small=ImageFont.truetype('DejaVuSans.ttf',11)
except OSError:
    font=ImageFont.load_default()
    small=ImageFont.load_default()
for f in range(N):
    p=Image.new('RGB',(416,286),(32,33,43));d=ImageDraw.Draw(p)
    for x in range(0,417,32):d.line((x,38,x,286),fill=(39,40,51))
    for y in range(46,286,24):d.line((0,y,416,y),fill=(39,40,51))
    d.text((18,12),'FRONT / DOWN',font=font,fill=(238,229,212))
    d.text((226,12),'SIDE / RIGHT',font=font,fill=(238,229,212))
    for x,view in [(8,'front'),(216,'side')]:
        d.ellipse((x+69,253,x+125,263),fill=(23,24,33))
        p.paste(FRAMES[view][f],(x,18),FRAMES[view][f])
    d.text((18,269),f'{f+1:02d} / 08',font=small,fill=(188,183,190))
    d.text((225,269),'4 frames / step',font=small,fill=(188,183,190))
    preview.append(p.resize((832,572),Image.Resampling.NEAREST))
palette=Image.new('RGB',(832,572*N))
for i,p in enumerate(preview):palette.paste(p,(0,572*i))
palette=palette.quantize(colors=128)
q=[p.quantize(palette=palette,dither=Image.Dither.NONE) for p in preview]
q[0].save(OUT/'lumina-walk-preview.gif',save_all=True,append_images=q[1:],duration=DURATION,loop=0,optimize=False,disposal=2)
preview[0].save(ROOT/'walk-check.png')

# Player assets are embedded so it works offline with a file:// URL.
DATA={'rig':RIG,'images':{}}
for view in PARTS:
    DATA['images'][view]={}
    for name in PARTS[view]:
        DATA['images'][view][name]='data:image/png;base64,'+base64.b64encode((OUT/f'parts/{view}/{name}.png').read_bytes()).decode()
(ROOT/'player-data.json').write_text(json.dumps(DATA,separators=(',',':')))
template=ROOT/'player-template.html'
if template.exists():
    (OUT/'lumina-walk-player.html').write_text(template.read_text().replace('__DATA__',json.dumps(DATA,separators=(',',':'))))
print(json.dumps({'output':str(OUT),'part_count':sum(len(p) for p in PARTS.values()),'frame_count':16,'preview':str(ROOT/'walk-check.png')}))
