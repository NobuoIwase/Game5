"""Check unpacked package files against MANIFEST.json; standard library only."""
from pathlib import Path
import hashlib,json,sys
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'MANIFEST.json').read_text(encoding='utf-8'))
failed=[]
for item in manifest['files']:
 p=root/item['path']
 if not p.is_file():failed.append((item['path'],'missing'));continue
 if p.stat().st_size!=item['size_bytes']:failed.append((item['path'],'size'));continue
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 if h.hexdigest()!=item['sha256']:failed.append((item['path'],'sha256'))
for p,reason in failed:print(reason,p)
print(f"Checked {len(manifest['files'])} files; {len(failed)} mismatches.")
sys.exit(bool(failed))
