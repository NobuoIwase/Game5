"""Shared bits for putting together frames from the ChatGPT drawings (tools/assemble/)."""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORK = os.environ.get('ASM_WORK', '/tmp/asm')          # frames.json and mask/ from tools/export_frames.mjs
SRC = os.environ.get('ASM_SRC', '')                    # the drawings: .../chatgpt/out
SIZE = 1254

def frames():
    return json.load(open(os.path.join(WORK, 'frames.json')))

def load(p, size=None):
    im = Image.open(p).convert('RGBA')
    if size and im.size != (size, size): im = im.resize((size, size), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255

def to_img(a): return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))

def drawing(f, file): return load(os.path.join(SRC, f['char'], file))

def mask_of(file): return load(os.path.join(WORK, 'mask', file))

def canvas_to_pose_px(f, xy):
    """Motion canvas (288) -> pixels of the 512 pose picture / mask."""
    x0, y0, w = f['crop']; xy = np.asarray(xy, float)
    return (xy - [x0, y0]) * 512 / w

BONES = [('neck', 'head'), ('neck', 'thorax'), ('thorax', 'waist'), ('waist', 'root'),
         ('shoulder_right', 'elbow_right'), ('elbow_right', 'wrist_right'), ('wrist_right', 'hand_right'),
         ('shoulder_left', 'elbow_left'), ('elbow_left', 'wrist_left'), ('wrist_left', 'hand_left'),
         ('hip_right', 'knee_right'), ('knee_right', 'ankle_right'), ('ankle_right', 'toe_right'),
         ('hip_left', 'knee_left'), ('knee_left', 'ankle_left'), ('ankle_left', 'toe_left')]
KEY = ['head', 'neck', 'thorax', 'waist', 'root', 'shoulder_right', 'elbow_right', 'wrist_right', 'hand_right',
       'shoulder_left', 'elbow_left', 'wrist_left', 'hand_left', 'hip_right', 'knee_right', 'ankle_right', 'toe_right',
       'hip_left', 'knee_left', 'ankle_left', 'toe_left']
