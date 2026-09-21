from pathlib import Path
import subprocess,sys
root=Path(__file__).parent
for cmd in [[sys.executable,'extract_parts.py'],['node','validate.cjs'],['node','validate-heads.cjs'],['node','render.cjs'],[sys.executable,'assemble.py']]:
    subprocess.run(cmd,cwd=root,check=True)
