"""Render code-native anatomical mannequins; no artwork is mirrored or edited."""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent
LIB=json.loads((HERE.parent/'motion'/'poses.json').read_text(encoding='utf-8'))
SIZE=(192,256)
S=3
FONT_PATH='C:/Windows/Fonts/arial.ttf'
def font(n):
    try: return ImageFont.truetype(FONT_PATH,n)
    except OSError: return ImageFont.load_default()
OUTLINE=(24,34,48,255)
RIGHT=(90,182,240,255)
LEFT=(238,157,90,255)
BODY=(182,194,204,255)

def render(p,background=False):
    im=Image.new('RGBA',(SIZE[0]*S,SIZE[1]*S),(0,0,0,0))
    d=ImageDraw.Draw(im)
    js=p['joints']
    pos=lambda n:tuple(v*S for v in js[n]['position'])
    def ellipse(center,rx,ry,fill,outline=OUTLINE):
        x,y=center
        d.ellipse((x-rx*S,y-ry*S,x+rx*S,y+ry*S),fill=fill,outline=outline,width=2*S if outline else 1)
    def line(a,b,width,fill):
        d.line([a,b],fill=OUTLINE,width=round((width+3)*S))
        d.line([a,b],fill=fill,width=round(width*S))
        for pt in [a,b]:ellipse(pt,width/2,width/2,fill)
    def limb(side):
        col=RIGHT if side=='right' else LEFT
        for a,b,w in [('hip','knee',9),('knee','ankle',7)]:line(pos(a+'_'+side),pos(b+'_'+side),w,col)
        ankle=pos('ankle_'+side)
        yaw=math.radians(p['yaw']); sx=math.sin(yaw)
        # Foot tip is projected, and its depth changes with direction.
        tip=pos('toe_'+side)
        line((ankle[0],ankle[1]+4*S),tip,7,col)
        ellipse(pos('knee_'+side),4,4,(225,232,236,255))
    def arm(side):
        col=RIGHT if side=='right' else LEFT
        for a,b,w in [('shoulder','elbow',7),('elbow','wrist',6)]:line(pos(a+'_'+side),pos(b+'_'+side),w,col)
        ellipse(pos('wrist_'+side),4,5,col)
        if side=='right':
            x,y=pos('shoulder_right')
            d.polygon([(x,y-8*S),(x+7*S,y-2*S),(x+4*S,y+6*S),(x-5*S,y+4*S),(x-7*S,y-2*S)],fill=(36,106,158,255),outline=OUTLINE,width=S)
    # Whole limb groups are depth sorted. Equipment remains on the same side.
    ops=[]
    for side in ['right','left']:
        ops.append((sum(js[n+'_'+side]['depth'] for n in ['hip','knee','ankle'])/3,lambda side=side:limb(side)))
        ops.append((sum(js[n+'_'+side]['depth'] for n in ['shoulder','elbow','wrist'])/3,lambda side=side:arm(side)))
    def torso():
        a=pos('shoulder_right');b=pos('shoulder_left');hr=pos('hip_right');hl=pos('hip_left')
        yaw=math.radians(p['yaw']);half=8+5*abs(math.cos(yaw))
        cx,cy=pos('thorax');rx,ry=pos('root')
        d.polygon([(cx-half*S,cy-10*S),(cx+half*S,cy-10*S),(rx+(half-4)*S,ry),(rx-(half-4)*S,ry)],fill=BODY,outline=OUTLINE,width=2*S)
        ellipse(pos('root'),10,7,(99,116,135,255))
        line(pos('neck'),pos('thorax'),7,BODY)
    ops.append((0,torso))
    for _,op in sorted(ops,key=lambda v:v[0]):op()
    yaw=math.radians(p['yaw']);c=math.cos(yaw);s=math.sin(yaw)
    h=pos('head');ellipse(h,21,24,(210,219,225,255))
    if c>0.2:
        for lateral in [-7,7]:
            eye=(h[0]+(lateral*c+7*s)*S,h[1]-1*S)
            ellipse(eye,1.8,2.2,OUTLINE,None)
        d.arc((h[0]-5*S+6*s*S,h[1]+4*S,h[0]+5*S+6*s*S,h[1]+10*S),0,180,fill=OUTLINE,width=S)
    elif abs(s)>.8:
        ellipse((h[0]+s*15*S,h[1]-2*S),1.7,2,OUTLINE,None)
        d.polygon([(h[0]+s*19*S,h[1]+1*S),(h[0]+s*25*S,h[1]+5*S),(h[0]+s*19*S,h[1]+8*S)],fill=(210,219,225,255),outline=OUTLINE,width=S)
    if c<-.2:
        d.arc((h[0]-12*S,h[1]-16*S,h[0]+12*S,h[1]+18*S),190,350,fill=(159,176,189,255),width=2*S)
    result=im.resize(SIZE,Image.Resampling.LANCZOS)
    if background:
        bg=Image.new('RGBA',SIZE,(25,32,42,255));bd=ImageDraw.Draw(bg)
        for x in range(0,192,24):bd.line((x,35,x,255),fill=(34,43,55,255))
        for y in range(50,256,24):bd.line((0,y,191,y),fill=(34,43,55,255))
        bd.ellipse((61,237,131,248),fill=(10,15,21,255))
        bg.alpha_composite(result)
        return bg
    return result

def main():
    dirs=LIB['directions']
    for motion in ['walk','run']:
        sheet=Image.new('RGBA',(192*8,256*8))
        frames={}
        for row,direction in enumerate(dirs):
            folder=HERE/'frames'/motion/direction;folder.mkdir(parents=True,exist_ok=True)
            frames[direction]=[]
            for f,p in enumerate(LIB['motions'][motion][direction]):
                frame=render(p);frame.save(folder/f'{f:02d}.png');sheet.alpha_composite(frame,(f*192,row*256))
                frames[direction].append(render(p,True))
            frames[direction][0].save(HERE/f'{motion}-{direction}.gif',save_all=True,append_images=frames[direction][1:],duration=LIB['frame_ms'][motion],loop=0,disposal=2)
        sheet.save(HERE/f'generic-{motion}-8dir-8frames.png')
        preview=[]
        for f in range(8):
            grid=Image.new('RGB',(192*4,256*2+42),(18,24,33))
            gd=ImageDraw.Draw(grid)
            gd.text((14,11),f'GENERIC {motion.upper()}   /   right = blue, left = amber   /   frame {f+1:02d}',font=font(16),fill=(224,234,242))
            for i,direction in enumerate(dirs):
                p=LIB['motions'][motion][direction][f]
                card=frames[direction][f].convert('RGB');cd=ImageDraw.Draw(card)
                cd.text((10,9),direction,font=font(14),fill=(196,210,223))
                cd.text((10,30),'FLIGHT' if p['flight'] else 'CONTACT '+','.join(p['contact_sides']),font=font(10),fill=(108,204,239) if p['flight'] else (167,182,194))
                grid.paste(card,((i%4)*192,(i//4)*256+42))
            preview.append(grid)
        preview[0].save(HERE/f'generic-{motion}-preview.gif',save_all=True,append_images=preview[1:],duration=LIB['frame_ms'][motion],loop=0,disposal=2)
        preview[0].save(HERE/f'generic-{motion}-overview.png')
    print('Rendered 128 transparent generic frames, two 8x8 sprite sheets, per-direction GIFs and eight-direction previews.')

if __name__=='__main__':main()
