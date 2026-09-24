#!/usr/bin/env python3
"""Checks delivered art in game/assets/requested/final/ against the delivery rules.

Pure Python (no Pillow needed). Usage:
    python3 tools/check_final.py                     # every PNG under final/
    python3 tools/check_final.py path/to/a.png ...   # specific files

Per file it reports size, PNG colour type, colour count, corner alpha and the share of fully
transparent pixels, then PASS / FAIL with reasons. Floors (final/floors/) must be opaque;
everything else must have a truly transparent background.
"""
import os, sys, struct, zlib, glob

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'assets', 'requested', 'final')
MIN_SIZE = {'monsters': 256, 'props': 128, 'icons': 64, 'nutera': 64, 'floors': 128}
# alpha at or below this counts as transparent: generators leave invisible 1-2 alpha noise
NOISE = 2
CT_NAME = {0: 'gray', 2: 'RGB', 3: 'palette', 4: 'gray+alpha', 6: 'RGBA'}


def read_png(path):
    b = open(path, 'rb').read()
    if b[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('PNG ではない（拡張子だけ .png の JPEG/WebP など）')
    pos, idat, plte, trns = 8, b'', None, None
    while pos < len(b):
        n, typ = struct.unpack('>I4s', b[pos:pos + 8])
        data = b[pos + 8:pos + 8 + n]
        if typ == b'IHDR':
            w, h, depth, ct, _, _, inter = struct.unpack('>IIBBBBB', data)
        elif typ == b'PLTE':
            plte = data
        elif typ == b'tRNS':
            trns = data
        elif typ == b'IDAT':
            idat += data
        elif typ == b'IEND':
            break
        pos += 12 + n
    if inter:
        raise ValueError('インターレース PNG は未対応。インターレースなしで保存し直す')
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    bpp = max(1, ch * depth // 8)
    stride = (w * ch * depth + 7) // 8
    raw = zlib.decompress(idat)  # a zlib.error here means the file is damaged
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(h):
        f = raw[i]; line = bytearray(raw[i + 1:i + 1 + stride]); i += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            up = prev[x]; c = prev[x - bpp] if x >= bpp else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + up) & 255
            elif f == 3: line[x] = (line[x] + ((a + up) >> 1)) & 255
            elif f == 4:
                p = a + up - c; pa, pb, pc = abs(p - a), abs(p - up), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else up if pb <= pc else c)) & 255
        rows.append(line); prev = line

    def samples(line):
        if depth == 8: return list(line)
        if depth == 16: return [line[k] for k in range(0, len(line), 2)]
        per = 8 // depth; mask = (1 << depth) - 1; out = []
        for byte in line:
            for s in range(per): out.append((byte >> (8 - depth * (s + 1))) & mask)
        return out

    px = []  # (r, g, b, a) 0..255
    for line in rows:
        s = samples(line)[:w * ch]
        for x in range(w):
            v = s[x * ch:(x + 1) * ch]
            if ct == 6: px.append(tuple(v))
            elif ct == 2: px.append((*v, 255))
            elif ct == 4: px.append((v[0], v[0], v[0], v[1]))
            elif ct == 0: g = v[0] * 255 // ((1 << depth) - 1); px.append((g, g, g, 255))
            else:
                k = v[0]; r, g, bl = plte[k * 3:k * 3 + 3]
                a = trns[k] if trns and k < len(trns) else 255
                px.append((r, g, bl, a))
    return w, h, depth, ct, px


def check(path):
    rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
    kind = rel.split('/')[0]
    problems = []
    try:
        w, h, depth, ct, px = read_png(path)
    except zlib.error:
        return rel, None, ['ファイルが壊れている（圧縮データが読めない。ブラウザでは表示できても不可）。ダウンロードし直して、加工せずに置く']
    except Exception as e:
        return rel, None, [str(e)]
    N = w * h
    colors = len({p[:3] for p in px if p[3] > 0})
    clear = sum(1 for p in px if p[3] <= NOISE) / N
    corners = [px[0][3], px[w - 1][3], px[(h - 1) * w][3], px[N - 1][3]]
    # a border one pixel in: catches frames and faint boxes
    border = [px[y * w + x][3] for x in range(w) for y in (0, h - 1)] + [px[y * w + x][3] for y in range(h) for x in (0, w - 1)]
    need = MIN_SIZE.get(kind, 64)
    if min(w, h) < need and not (kind in ('props', 'floors') and h >= need // 2 and w >= need):
        problems.append(f'小さすぎる（{w}×{h}、{need}px 以上）')
    if ct == 3:
        problems.append(f'減色されたパレットPNG（{colors}色）。フルカラー RGBA で保存する')
    elif colors < 200 and kind != 'icons':
        problems.append(f'色数が少ない（{colors}色）。減色・ドット絵化していないか')
    if kind == 'floors':
        if any(p[3] < 255 for p in px):
            problems.append('床なのに透明な部分がある（床は不透明）')
    else:
        if ct in (0, 2):
            problems.append('アルファチャンネルがない（背景が透けない）')
        if max(corners) > NOISE:
            problems.append(f'四隅が透明でない（アルファ {corners}）。背景が残っている')
        elif max(border) > NOISE:
            problems.append('外周に不透明な部分がある（枠線・見切れ・背景の残り）')
        if clear < .25:
            problems.append(f'透明な部分が {clear:.0%} しかない（背景が残っているか、余白がない）')
    info = f'{w}×{h} {CT_NAME.get(ct, ct)} {depth}bit, {colors}色, 透明 {clear:.0%}, 四隅α {corners}'
    return rel, info, problems


def main():
    files = sys.argv[1:] or sorted(glob.glob(os.path.join(ROOT, '**', '*.png'), recursive=True))
    bad = 0
    for f in files:
        rel, info, problems = check(os.path.abspath(f))
        print(('PASS ' if not problems else 'FAIL ') + rel + (f'  [{info}]' if info else ''))
        for p in problems:
            print('     - ' + p)
        bad += bool(problems)
    print(f'\n{len(files) - bad}/{len(files)} PASS')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
