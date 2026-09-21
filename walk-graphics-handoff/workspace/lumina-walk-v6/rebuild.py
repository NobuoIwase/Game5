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
ARM_SOURCE=ROOT/'source-atlases/arms-v3.png'
CLEANUP_SOURCE=ROOT/'source-atlases/side-cleanup-v5.png'
NECK_SOURCE=ROOT/'source-atlases/neck-v6.png'
HANDS_SOURCE=ROOT/'source-atlases/hands-v6.png'
NAMES=['head','torso','skirt','hair','arm_far','arm_near','leg_far','leg_near','wing_far','wing_near','tail_far','tail_near']
SIZES={
 'front':[(88,103),(48,45),(102,73),(101,118),(28,49),(28,49),(18,58),(18,58),(56,43),(56,43),(52,54),(52,54)],
 'side':[(78,103),(33,45),(76,72),(76,120),(20,49),(20,49),(24,59),(24,59),(45,39),(48,41),(44,56),(48,58)]
}

# Generated atlas preprocessing: chroma key, cell extraction, nearest-neighbor
# sampling. All character artwork is supplied by the image-generation tool.
def keyed_atlas(path):
    rgb=np.array(Image.open(path).convert('RGB'))
    r,g,b=[rgb[:,:,i].astype(int) for i in range(3)]
    key=(g>r+25)&(g>b+25)
    rgba=np.dstack([rgb,np.where(key,0,255).astype('uint8')])
    # Suppress the small green fringe left by image generation at silhouette edges.
    edge=(g>r+5)&(g>b+5)&(~key)
    rgba[:,:,1][edge]=np.maximum(r,b)[edge].astype('uint8')
    return Image.fromarray(rgba)

def extract():
    parts={}
    rows=[0,409,694,1024]
    cleanup=keyed_atlas(CLEANUP_SOURCE)
    # Generated skin-contour correction, registered to the original torso.
    neck=np.array(Image.open(NECK_SOURCE).convert('RGBA'))
    neck[:,:,3]=np.where(neck[:,:,3]>=128,255,0)
    neck=Image.fromarray(neck)
    neck=neck.crop(neck.getbbox()).resize((33,45),Image.Resampling.NEAREST)
    for view,path in SOURCES.items():
        folder=OUT/'parts'/view
        folder.mkdir(parents=True,exist_ok=True)
        atlas=keyed_atlas(path)
        parts[view]={}
        for i,name in enumerate(NAMES):
            row,col=divmod(i,4)
            piece=atlas.crop((384*col,rows[row],384*(col+1),rows[row+1]))
            bb=piece.getbbox()
            if not bb: raise ValueError((view,name,'empty'))
            original_piece=piece.crop(bb).resize(SIZES[view][i],Image.Resampling.NEAREST)
            if view=='side' and name in ['torso','hair']:
                # Keep the ORIGINAL registration and scale. Re-trimming the
                # shortened hair would stretch it back into the throat gap.
                piece=cleanup.crop((384*col,rows[row],384*(col+1),rows[row+1]))
            piece=piece.crop(bb).resize(SIZES[view][i],Image.Resampling.NEAREST)
            if view=='side' and name=='torso':
                # The requested artwork change is confined to the skin neck.
                # Retain the approved neckline, bodice and waist exactly.
                original_piece.paste(neck.crop((0,0,piece.width,13)),(0,0))
                piece=original_piece
            piece.save(folder/(name+'.png'))
            parts[view][name]=piece
        # Profile legs stay whole. A continuous mesh supplies the knee bend,
        # so cut edges and duplicate toe pixels cannot protrude at the joints.
    # Replacement hands use relaxed downward fingers; side-view thumbs face
    # screen-right. Keep the supplied alpha, sampled to the native pixel grid.
    arms=Image.open(ARM_SOURCE).convert('RGBA')
    hands=Image.open(HANDS_SOURCE).convert('RGBA').resize(arms.size,Image.Resampling.NEAREST)
    cw,ch=arms.width//2,arms.height//2
    for i,(view,name,size) in enumerate([
        ('front','arm_far',(16,50)),('front','arm_near',(16,50)),
        ('side','arm_far',(15,49)),('side','arm_near',(15,49))]):
        col,row=i%2,i//2
        p=arms.crop((col*cw,row*ch,(col+1)*cw,(row+1)*ch))
        a=np.array(p);a[:,:,3]=np.where(a[:,:,3]>=128,255,0)
        p=Image.fromarray(a)
        bounds=p.getbbox()
        p=p.crop(bounds).resize(size,Image.Resampling.NEAREST)
        if view=='side':
            edited=hands.crop((col*cw,row*ch,(col+1)*cw,(row+1)*ch))
            a=np.array(edited);a[:,:,3]=np.where(a[:,:,3]>=128,255,0)
            edited=Image.fromarray(a).crop(bounds).resize(size,Image.Resampling.NEAREST)
            # Preserve sleeve, elbow and forearm pixels; only the hand changes.
            p.paste(edited.crop((0,39,size[0],size[1])),(0,39))
        parts[view][name]=p
        p.save(OUT/'parts'/view/(name+'.png'))
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
    for name,x,offset in [('leg_far',87,0),('leg_near',105,4)]:
        fy=feet[(f+offset)%8]
        hip=182+b
        ops.append(op(name,x,hip,(9,0),sway*.8,1,(fy-hip)/58))
    # Sagittal swing projects as foreshortening and alternating occlusion.
    # The arm opposite the leading leg comes toward the viewer. Both hands
    # must not live permanently in front of the dress.
    depth=[1,.72,0,-.72,-1,-.72,0,.72][f]
    roll=sway*.45
    theta=math.radians(roll)
    front_arms=[]
    for name,local_x,pivot,sign in [('arm_far',-15,(11,3),-1),('arm_near',15,(5,3),1)]:
        z=depth*sign
        ax=96+sway+local_x*math.cos(theta)-13*math.sin(theta)
        ay=112+b+local_x*math.sin(theta)+13*math.cos(theta)
        sy=1-.19*abs(z)
        sx=1+.06*z
        arm=op(name,ax,ay,pivot,roll,sx,sy)
        arm['swing_depth']=round(z,3)
        if z<-.05:ops.append(arm)
        else:front_arms.append(arm)
    ops += [op('skirt',96+sway*.3,143+b*.6,(51,0),sway*.45)]
    ops += front_arms
    ops += [op('torso',96+sway,112+b,(24,0),sway*.45)]
    ops += [op('head',96+sway,20+b,(44,0),0)]
    return ops

def leg_joints(hip,target,bend=1):
    hx,hy=hip; tx,ty=target
    l1,l2=26,28
    dx,dy=tx-hx,ty-hy
    dist=math.hypot(dx,dy)
    if dist>l1+l2-.05:
        ratio=(l1+l2-.05)/dist
        dx*=ratio;dy*=ratio;tx=hx+dx;ty=hy+dy;dist=l1+l2-.05
    a=(l1*l1-l2*l2+dist*dist)/(2*dist)
    h=math.sqrt(max(0,l1*l1-a*a))
    kx=hx+a*dx/dist+bend*h*dy/dist
    ky=hy+a*dy/dist-bend*h*dx/dist
    return np.array([hx,hy],dtype=float),np.array([kx,ky],dtype=float),np.array([tx,ty],dtype=float)

def warp_strip(source,vertex):
    """Continuous nearest-neighbor mesh shared by articulated limbs."""
    ih,iw=source.shape[:2]
    dst=np.zeros((80,96,4),dtype=np.uint8)
    def triangle(src,dest):
        minx=max(0,int(math.floor(dest[:,0].min())))
        maxx=min(95,int(math.ceil(dest[:,0].max())))
        miny=max(0,int(math.floor(dest[:,1].min())))
        maxy=min(79,int(math.ceil(dest[:,1].max())))
        if maxx<minx or maxy<miny:return
        yy,xx=np.mgrid[miny:maxy+1,minx:maxx+1]
        points=np.stack([xx.ravel()+.5,yy.ravel()+.5],axis=1)
        m=np.column_stack([dest[1]-dest[0],dest[2]-dest[0]])
        if abs(np.linalg.det(m))<1e-8:return
        uv=(points-dest[0])@np.linalg.inv(m).T
        inside=(uv[:,0]>=-1e-7)&(uv[:,1]>=-1e-7)&(uv.sum(axis=1)<=1+1e-7)
        if not inside.any():return
        uv=uv[inside]
        srcpoints=src[0]+uv[:,0,None]*(src[1]-src[0])+uv[:,1,None]*(src[2]-src[0])
        srcx=np.clip(np.floor(srcpoints[:,0]).astype(int),0,iw-1)
        srcy=np.clip(np.floor(srcpoints[:,1]).astype(int),0,ih-1)
        samples=source[srcy,srcx]
        opaque=samples[:,3]>0
        dst[yy.ravel()[inside][opaque],xx.ravel()[inside][opaque]]=samples[opaque]
    for y in range(ih):
        src=np.array([[0,y],[iw,y],[iw,y+1],[0,y+1]],dtype=float)
        dest=np.array([vertex(x,sy) for x,sy in src])
        for ids in [[0,1,2],[0,2,3]]:triangle(src[ids],dest[ids])
    return Image.fromarray(dst)

def whole_arm(name,shoulder,upper_angle,frame):
    """A forward-flexing elbow, with no horizontal texture reflection.

    The elbow stays on the rear side of the bent arm while the forearm
    folds toward screen-right. Texture handedness is retained at the wrist.
    """
    source=np.array(PARTS['side'][name])
    origin=np.array([48.,3.])
    upper=math.radians(upper_angle)
    flex=30-5*upper_angle/18
    lower=math.radians(upper_angle-flex)
    upper_axis=np.array([-math.sin(upper),math.cos(upper)])
    lower_axis=np.array([-math.sin(lower),math.cos(lower)])
    elbow=origin+23*upper_axis
    wrist_source_y=39
    wrist=elbow+(wrist_source_y-26)*18/17*lower_axis
    # A relaxed wrist lets the hand drop toward vertical instead of holding
    # its fingers rigidly in line with the swinging forearm.
    wrist_flex=14+2*upper_angle/18
    hand_angle=lower+math.radians(wrist_flex)
    hand_axis=np.array([-math.sin(hand_angle),math.cos(hand_angle)])
    # Ignore the old baked-in elbow curvature; map the texture's centerline
    # onto actual shoulder/elbow/wrist positions, without reversing the thumb.
    def src_center(y):
        xs=np.flatnonzero(source[y,:,3]>0)
        return float((xs.min()+xs.max()+1)/2)
    controls_y=[3,16,26,wrist_source_y,49]
    controls_x=[src_center(y) for y in [3,16,26,wrist_source_y]]
    controls_x.append(controls_x[-1])
    def center(y):
        upper_pos=origin+upper_axis*(y-3)
        lower_pos=elbow+lower_axis*((y-26)*18/17)
        t=float(np.clip((y-23)/6,0,1));t=t*t*(3-2*t)
        arm_pos=(1-t)*upper_pos+t*lower_pos
        hand_pos=wrist+hand_axis*((y-wrist_source_y)*18/17)
        u=float(np.clip((y-(wrist_source_y-1.5))/3,0,1));u=u*u*(3-2*u)
        return (1-u)*arm_pos+u*hand_pos
    def vertex(x,y):
        c=center(y)
        tangent=center(y+.01)-center(y-.01)
        tangent/=max(np.linalg.norm(tangent),1e-6)
        normal=np.array([tangent[1],-tangent[0]])
        return c+normal*(x-float(np.interp(y,controls_y,controls_x)))
    key=f'{name}_walk_{frame:02d}'
    img=warp_strip(source,vertex)
    PARTS['side'][key]=img;img.save(OUT/'parts'/'side'/f'{key}.png')
    pose=op(key,*shoulder,tuple(origin))
    world_offset=np.array(shoulder)-origin
    pose['joints']={'shoulder':list(shoulder),'elbow':list(elbow+world_offset),'wrist':list(wrist+world_offset)}
    pose['elbow_flex']=round(flex,3)
    pose['wrist_flex']=round(wrist_flex,3)
    return [pose]

def whole_leg(name,hip,target,frame,foot_angle=0):
    """Rasterize one connected leg through a continuous textured strip.

    Every source pixel, including the toes, has only one place in the mesh.
    Adjacent strips share vertices; no separate rectangular end caps overlap.
    """
    key=f'{name}_walk_{frame:02d}'
    source=np.array(PARTS['side'][name])
    ih,iw=source.shape[:2]
    joint_hip,joint_knee,joint_ankle=leg_joints(hip,target)
    origin=np.array([48.,3.])
    offset=origin-joint_hip
    joint_hip+=offset;joint_knee+=offset;joint_ankle+=offset
    yhip,yknee,yankle=1.,28.,48.
    foot_theta=math.radians(foot_angle)
    foot_axis=np.array([-math.sin(foot_theta),math.cos(foot_theta)])
    def smooth(t):
        t=np.clip(t,0.,1.)
        return t*t*(3-2*t)
    def center(y):
        thigh=joint_hip+(joint_knee-joint_hip)*(y-yhip)/(yknee-yhip)
        shin=joint_knee+(joint_ankle-joint_knee)*(y-yknee)/(yankle-yknee)
        foot=joint_ankle+foot_axis*(y-yankle)
        a=smooth((y-(yknee-4))/8)
        upper=(1-a)*thigh+a*shin
        b=smooth((y-(yankle-3))/6)
        return (1-b)*upper+b*foot
    def vertex(x,y):
        c=center(y)
        tangent=center(y+.01)-center(y-.01)
        tangent/=max(np.linalg.norm(tangent),1e-6)
        normal=np.array([tangent[1],-tangent[0]])
        # Follow the actual ankle center instead of centering the wide toes.
        source_center=float(np.interp(y,[0,28,48,59],[11,8,8,8]))
        return c+normal*(x-source_center)
    img=warp_strip(source,vertex)
    PARTS['side'][key]=img
    img.save(OUT/'parts'/'side'/f'{key}.png')
    pose=op(key,hip[0],hip[1],tuple(origin))
    pose['foot_angle']=foot_angle
    pose['joints']={k:list(v-offset) for k,v in [('hip',joint_hip),('knee',joint_knee),('ankle',joint_ankle)]}
    return [pose]

def support_ankle_y(name,angle):
    """Keep the lowest rotated foot pixel on the same ground plane."""
    a=np.array(PARTS['side'][name])[:,:,3]
    ys,xs=np.nonzero(a[49:,:]);ys=ys+49
    theta=math.radians(angle)
    # Use corners of solid source texels, not the enclosing rectangular crop.
    offsets=[]
    for dx in [0,1]:
        for dy in [0,1]:
            offsets.append(math.sin(theta)*(xs+dx-8)+math.cos(theta)*(ys+dy-48))
    return 242-float(np.max(offsets))

def pose_side(f):
    b=[0,2,-3,-2][f%4]
    lag=[-1,0,1,2,1,0,-1,-2][f]
    swing=[18,13,0,-13,-18,-13,0,13][f]
    hip=(104,181+b)
    # Passing swing first carries the knee forward. The next pose extends
    # the shin ahead of the knee, before the following heel-strike pose.
    footx=[22,12,-1,-14,-23,-12,9,23]
    angles=[-14,0,0,18,32,24,-6,-12]
    swing_y={5:218,6:219,7:227}
    def leg(name,offset):
        k=(f+offset)%8
        fy=support_ankle_y(name,angles[k]) if k<=4 else swing_y[k]
        return whole_leg(name,hip,(104+footx[k],fy),f,angles[k])
    # Torso, shoulder sockets and neck share a waist-centered forward lean.
    # This removes the chest/backward-head/pushed-forward-pelvis S shape.
    lean=6
    def torso_point(px,py):
        a=math.radians(lean);dx,dy=px-17,py-37
        return (104+dx*math.cos(a)-dy*math.sin(a),146+b+dx*math.sin(a)+dy*math.cos(a))
    neck=torso_point(18,1)
    far_shoulder=torso_point(20,14)
    near_shoulder=torso_point(22,14)
    wing=torso_point(4,17)
    ops=[op('wing_far',wing[0]+2,wing[1]+2,(42,27),lag),
         op('tail_far',104,181+b,(40,3),lag*1.7)]
    ops+=leg('leg_far',4)
    ops+=whole_arm('arm_far',far_shoulder,-swing,f)
    ops+=[op('hair',neck[0]-8,neck[1]-61,(42,0),lag*.5),
          op('tail_near',105,183+b,(44,3),lag*1.7)]
    ops+=leg('leg_near',0)
    ops += [op('skirt',104,144+b*.65,(40,0),lag*.35),
            op('torso',104,146+b,(17,37),lean)]
    ops+=whole_arm('arm_near',near_shoulder,swing,f)
    # The head asset contains the long front hair. Put the near wing after
    # that layer, while preserving the approved hair-over-shoulder overlap.
    ops+=[op('head',*neck,(50,82),0),
          op('wing_near',*wing,(44,27),lag*1.2)]
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
for v in PARTS:
    RIG['parts'][v]={n:{'file':f'parts/{v}/{n}.png','size':list(im.size),'bounds':list(im.getbbox())} for n,im in PARTS[v].items()}
RIG['revision']=6
RIG['leg_deformation']='continuous mesh from a whole leg; pre-rasterized per pose'
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
preview[0].save(ROOT/'walk-check-v6.png')

side_preview=[]
for f in range(N):
    p=Image.new('RGB',(192,276),(32,33,43));d=ImageDraw.Draw(p)
    for x in range(0,193,24):d.line((x,20,x,252),fill=(39,40,51))
    for y in range(26,253,24):d.line((0,y,192,y),fill=(39,40,51))
    d.text((10,7),'SIDE / RIGHT',font=small,fill=(238,229,212))
    d.ellipse((76,239,132,247),fill=(23,24,33))
    p.paste(FRAMES['side'][f],(0,0),FRAMES['side'][f])
    d.text((10,257),f'{f+1:02d} / 08',font=small,fill=(188,183,190))
    side_preview.append(p.resize((384,552),Image.Resampling.NEAREST))
sp=Image.new('RGB',(384,552*N))
for i,p in enumerate(side_preview):sp.paste(p,(0,552*i))
sp=sp.quantize(colors=128)
sq=[p.quantize(palette=sp,dither=Image.Dither.NONE) for p in side_preview]
sq[0].save(OUT/'lumina-right-preview.gif',save_all=True,append_images=sq[1:],duration=DURATION,loop=0,optimize=False,disposal=2)

# Player assets are embedded so it works offline with a file:// URL.
DATA={'rig':RIG,'images':{}}
for view in PARTS:
    DATA['images'][view]={}
    for name in PARTS[view]:
        DATA['images'][view][name]='data:image/png;base64,'+base64.b64encode((OUT/f'parts/{view}/{name}.png').read_bytes()).decode()
(ROOT/'player-data-v6.json').write_text(json.dumps(DATA,separators=(',',':')))
template=ROOT/'player-template-v6.html'
if template.exists():
    (OUT/'lumina-walk-player.html').write_text(template.read_text().replace('__DATA__',json.dumps(DATA,separators=(',',':'))))
print(json.dumps({'output':str(OUT),'part_count':sum(len(p) for p in PARTS.values()),'frame_count':16,'preview':str(ROOT/'walk-check-v6.png')}))
