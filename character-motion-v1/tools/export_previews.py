"""Assemble preview GIFs and enlarge the reusable generic sheets for the player."""
from pathlib import Path
import argparse
import json
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
DIRECTIONS=['front','down_right','right','up_right','back','up_left','left','down_left']
BG=(37,45,57,255)
manifest_path=ROOT/'exports'/'manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
character_ids=[c['id'] for c in manifest['characters'] if c['id'] != 'generic']
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('characters',nargs='*',help='Optional character ids; omitted exports every preview')
selected=parser.parse_args().characters
if any(character not in character_ids+['generic'] for character in selected):
    parser.error('Unknown character in '+', '.join(selected))
for character in [c for c in character_ids if not selected or c in selected]:
    for motion,ms in [('walk',120),('run',80)]:
        sheet=Image.open(ROOT/'exports'/character/f'{motion}.png').convert('RGBA')
        frames=[]
        for f in range(8):
            page=Image.new('RGBA',(768,552),BG)
            draw=ImageDraw.Draw(page)
            for row,direction in enumerate(DIRECTIONS):
                tile=sheet.crop((f*384,row*512,(f+1)*384,(row+1)*512))
                tile=tile.resize((192,256),Image.Resampling.LANCZOS)
                x,y=row%4*192,row//4*276
                page.alpha_composite(tile,(x,y+20))
                draw.text((x+10,y+5),direction.upper().replace('_',' '),fill='#bbc8d8')
            frames.append(page.convert('RGB'))
        frames[0].save(ROOT/'exports'/character/f'{motion}-preview.gif',save_all=True,append_images=frames[1:],duration=ms,loop=0,optimize=False)
        print(character,motion,'GIF ready')

generic_dir=ROOT/'exports'/'generic'
generic_dir.mkdir(exist_ok=True)
for motion in ['walk','run']:
    if selected and 'generic' not in selected and (generic_dir/f'{motion}.png').is_file():
        continue
    src=Image.open(ROOT/'generic'/f'generic-{motion}-8dir-8frames.png').convert('RGBA')
    src.resize((3072,4096),Image.Resampling.NEAREST).save(generic_dir/f'{motion}.png')
if not any(c['id']=='generic' for c in manifest['characters']):
    manifest['characters'].append({'id':'generic','label':'汎用モーション'})
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
