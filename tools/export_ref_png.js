// Exports the asset reference SVGs (game/asset-refs/) as PNGs that can be attached to an
// image-generation chat: game/asset-refs/png/card_<name>.png (the card with notes and palette)
// and game/asset-refs/png/<name>.png (the bare drawing, transparent, 512px on the long side).
// Usage: npx http-server -p 8765 -s -c-1 .   (repo root, in another shell)
//        node tools/export_ref_png.js
const {chromium}=require(process.env.PW||'playwright');
const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'..','game','asset-refs'),OUT=path.join(DIR,'png');
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
 const p=await b.newPage();
 await p.goto('http://localhost:8765/game/asset-refs/index.html');
 const cards=fs.readdirSync(DIR).filter(f=>f.endsWith('.svg')).map(f=>f.slice(0,-4));
 const sprites=fs.readdirSync(path.join(DIR,'sprites')).filter(f=>f.endsWith('.svg')).map(f=>f.slice(0,-4));
 const res=await p.evaluate(async({cards,sprites})=>{
  const L=s=>new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=s});
  const out={};
  for(const n of cards){const im=await L(n+'.svg'),c=document.createElement('canvas');c.width=im.naturalWidth*2;c.height=im.naturalHeight*2;c.getContext('2d').drawImage(im,0,0,c.width,c.height);out['card_'+n]=c.toDataURL('image/png')}
  for(const n of sprites){const im=await L('sprites/'+n+'.svg'),k=512/Math.max(im.naturalWidth,im.naturalHeight),c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);out[n]=c.toDataURL('image/png')}
  return out;
 },{cards,sprites});
 for(const [k,url] of Object.entries(res))fs.writeFileSync(path.join(OUT,k+'.png'),Buffer.from(url.split(',')[1],'base64'));
 console.log('wrote',Object.keys(res).length,'PNGs to',path.relative(process.cwd(),OUT));
 await b.close();
})();
