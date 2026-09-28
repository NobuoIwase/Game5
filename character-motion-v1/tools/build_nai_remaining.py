"""What is left for NovelAI once ChatGPT (Astra) has drawn what it could.

  git fetch origin chatgpt-output && python3 tools/build_nai_remaining.py

Reads the pictures on the chatgpt-output branch and writes nai/remaining.json, which the phone script
(game5-nai-batch.user.js, 「残りだけ」) and the PC helper read next to nai/jobs.json:
  - skip:   frames of nai/jobs.json that ChatGPT has drawn (NovelAI need not make them again)
  - frames, jobs: the whole pictures of chatgpt/jobs.json that ChatGPT could not draw (skipped by its safety check),
            as NovelAI jobs: the pose picture of chatgpt/pose/ as the base (img2img), the view and move as words
  - hold:   characters left out for now, with the reason
"""
import json, os, subprocess, datetime
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NAI = os.path.join(ROOT, 'nai'); CG = os.path.join(ROOT, 'chatgpt')

# Held characters, with the reason (none now: the healer, held for a while because ChatGPT declined her frames, is a
# grown woman like the others; every prompt carries "adult, mature female" and excludes child / loli / young)
HOLD = {}

VIEW = {'front': 'from front, facing viewer', 'down_right': 'three-quarter view, facing to the right',
        'right': 'from side, profile, facing right', 'up_right': 'from behind, back, three-quarter back view, facing away to the right',
        'back': 'from behind, back, facing away', 'up_left': 'from behind, back, three-quarter back view, facing away to the left',
        'left': 'from side, profile, facing left', 'down_left': 'three-quarter view, facing to the left'}
# what each attack is, in words (the base picture gives the exact pose)
MOVE = {'kesa': 'holding sword, sword swing, diagonal slash, round shield, fighting stance, legs apart',
        'yoko': 'holding sword, horizontal slash, follow-through, round shield, fighting stance, legs apart',
        'thrust': 'holding sword, thrusting, lunge, arm extended, round shield, legs apart',
        'slash': 'holding sword, sword swing, slashing, round shield, fighting stance',
        'heavy': 'holding sword, overhead swing, jumping slash, round shield',
        'healer_buff': 'holding staff, raising staff, casting spell, magic',
        'healer_purify': 'holding staff, staff planted on the ground, casting spell, magic'}

def git(*a): return subprocess.check_output(['git', *a], cwd=ROOT).decode()

def main():
    sha = git('rev-parse', '--short', 'origin/chatgpt-output').strip()
    drawn = {p.rsplit('/', 1)[-1] for p in git('ls-tree', '-r', '--name-only', 'origin/chatgpt-output', '--', 'chatgpt/out').split()
             if p.endswith('.png')}
    nai = json.load(open(os.path.join(NAI, 'jobs.json'), encoding='utf-8'))
    draw = json.load(open(os.path.join(CG, 'jobs.json'), encoding='utf-8'))
    skip = sorted(j['file'] for j in nai['jobs'] if j['file'] in drawn)
    frames, jobs = {}, []
    for f in draw['frames']:
        if f['file'] in drawn or f['char'] in HOLD: continue
        fid = f"{f['motion']}__{f['view']}__{f['frame']}"
        assert fid not in nai['frames'], fid
        base = f'base/{fid}.png'
        Image.open(os.path.join(CG, f['pose'])).convert('RGB').resize(tuple(nai['size']), Image.LANCZOS).save(os.path.join(NAI, base))
        words = ', '.join(x for x in (VIEW[f['view']], MOVE.get(f['motion'], ''), 'dynamic pose') if x)
        frames[fid] = {'id': fid, 'motion': f['motion'], 'kind': 'attack', 'view': f['view'], 'frame': f['frame'],
                       'label': f['label'], 'look': None, 'chars': [f['char']], 'situations': [], 'prompt': words,
                       'note': f.get('detail', ''), 'base': base, 'guide': base,
                       'ja': {'body': f"{f['label']}（{f['of']}コマのうち{f['frame'] + 1}コマ目・{f.get('step', '')}）",
                              'held': '', 'move': 'ChatGPT が安全判定で描けなかった1枚絵'}, 'step': f.get('step', '')}
        jobs.append({'char': f['char'], 'frame': fid, 'file': f['file']})
    out = {'version': datetime.date.today().isoformat(), 'from': f'chatgpt-output@{sha}', 'skip': skip,
           'hold': HOLD, 'frames': frames, 'jobs': jobs}
    json.dump(out, open(os.path.join(NAI, 'remaining.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    left = {}
    for j in nai['jobs'] + jobs:
        if j['file'] not in drawn and j['char'] not in HOLD: left[j['char']] = left.get(j['char'], 0) + 1
    print('ChatGPT drew', len(skip), 'of the NovelAI list; added', len(jobs), 'whole pictures; left for NovelAI', left,
          'held', list(HOLD))

if __name__ == '__main__': main()
