// Rebuilds the ChatGPT v0.18 PNG atlases (game/assets/requested/generated/) into usable sprites.
// The source art was downscaled to ~40px and reduced to 6-8 colours with heavy dithering, so it
// reads as noise when scaled up. For each sprite this tool:
//   cut the right cell -> close holes in the silhouette -> smooth the dithered luminance ->
//   map luminance onto a per-species colour ramp -> add a dark outline -> integer upscale
// and writes one PNG per sprite to game/assets/requested/processed/.
// Usage: node tools/process-generated.js   (needs a static server on :8765 serving the repo root)
const {chromium}=require(process.env.PW||'playwright');
const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'..','game','assets','requested','processed');

// dark -> light, five tones per species
const RAMP={
 gel:['#1d1c24','#4b4a58','#7d7b8c','#b3b1c2','#e6e4f0'],
 slug:['#2a1224','#6d2c5c','#b04f8f','#e28ac0','#fbd0ea'],
 leech:['#0f1f2e','#24506e','#3f8fb4','#86cfe8','#dff6ff'],
 worm:['#241f33','#584c78','#9483b8','#cfc2ea','#f7f2ff'],
 orb:['#1a2410','#44621f','#7fa63a','#bfdc72','#f0ffc0'],
 flower:['#2e1016','#76283a','#c4526a','#f09aa6','#ffe0e2'],
 moth:['#20141a','#56364a','#8f6282','#c79ab8','#f2dcea'],
 mirror_slime:['#122028','#34566a','#6c98ac','#aed4e0','#effbff'],
 silk_spider:['#221c2c','#554868','#8c7ea4','#c6bcd8','#f6f2fc'],
 bubble_shell:['#2a1c18','#6a4a3e','#a88070','#dcbcaa','#fff0e6'],
 crown_attendant:['#1c1a22','#474358','#7a7490','#b2acc6','#ece8f6'],
 chest:['#1e120a','#5a3418','#9a6230','#d6a054','#ffe6a0'],
 stairs:['#101014','#2c2c36','#54546a','#8e8ea6','#d4d4e6'],
 tower:['#120e1c','#2e2446','#5a4686','#9c80d6','#e6d8ff'],
 pool:['#0e1a12','#23402c','#3f6e4c','#78a888','#c8ecd6']
};
const MONSTERS=['gel','slug','leech','worm','orb','flower','moth','mirror_slime','silk_spider','bubble_shell','crown_attendant'];
// cells in extras_v018.png (x,y,w,h), found by inspecting the sheet
// the chest and stairs cells are too small to read after cleanup; the existing art is kept for those
const PROPS={tower:[0,26,26,28],pool:[78,78,26,26]};

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
 const p=await b.newPage();
 await p.goto('http://localhost:8765/game/battle.css').catch(()=>{});
 const res=await p.evaluate(async({RAMP,MONSTERS,PROPS})=>{
  const L=s=>new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=s});
  const hex=h=>[1,3,5].map(k=>parseInt(h.slice(k,k+2),16));
  function cut(im,x,y,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);return c.getContext('2d').getImageData(0,0,w,h)}
  function rebuild(src,ramp,opt={}){
   const {width:w,height:h,data:d}=src,N=w*h,a=new Uint8Array(N),lum=new Float32Array(N);
   for(let i=0;i<N;i++){a[i]=d[i*4+3]>40?1:0;lum[i]=(d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11)/255}
   const nb=(m,x,y)=>{let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<w&&Y<h&&m[Y*w+X])n++}return n};
   // close: dilate then erode (sparse sprites such as the spore orb need more passes)
   let m=a;
   for(let k=0;k<(opt.close||1);k++){const o=new Uint8Array(N);for(let y=0;y<h;y++)for(let x=0;x<w;x++)o[y*w+x]=m[y*w+x]||nb(m,x,y)>=(opt.grow||3)?1:0;m=o}
   for(let k=0;k<(opt.close||1);k++){const o=new Uint8Array(N);for(let y=0;y<h;y++)for(let x=0;x<w;x++)o[y*w+x]=m[y*w+x]&&nb(m,x,y)>=4?1:0;m=o}
   // drop specks: keep the largest connected blob and anything big near it
   const lab=new Int32Array(N).fill(-1),sizes=[];
   for(let i=0;i<N;i++){if(!m[i]||lab[i]>=0)continue;const id=sizes.length,q=[i];lab[i]=id;let n=0;while(q.length){const k=q.pop(),x=k%w,y=(k/w)|0;n++;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy,j=Y*w+X;if(X>=0&&Y>=0&&X<w&&Y<h&&m[j]&&lab[j]<0){lab[j]=id;q.push(j)}}}sizes.push(n)}
   const big=Math.max(...sizes,1);for(let i=0;i<N;i++)if(m[i]&&sizes[lab[i]]<Math.max(6,big*.08))m[i]=0;
   // smooth luminance inside the mask (fills dither gaps), then contrast-normalise
   let s=lum.slice();
   for(let pass=0;pass<(opt.smooth??2);pass++){const o=s.slice();for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!m[i])continue;let t=0,c=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy,j=Y*w+X;if(X<0||Y<0||X>=w||Y>=h||!m[j])continue;const wt=(dx||dy)?1:2;t+=(a[j]?s[j]:s[i]*.85)*wt;c+=wt}o[i]=t/c}s=o}
   let lo=1,hi=0;for(let i=0;i<N;i++)if(m[i]){lo=Math.min(lo,s[i]);hi=Math.max(hi,s[i])}
   // simple top-left light: brighten upper pixels a little so the form reads as a volume
   const ys=[];for(let i=0;i<N;i++)if(m[i])ys.push((i/w)|0);const y0=Math.min(...ys),y1=Math.max(...ys);
   const R=ramp.map(hex),out=new ImageData(w,h);
   for(let i=0;i<N;i++){
    if(!m[i])continue;const y=(i/w)|0;
    let v=(s[i]-lo)/Math.max(.05,hi-lo);v=Math.min(1,Math.max(0,v*.75+.15+(1-(y-y0)/Math.max(1,y1-y0))*.18));
    // interior darker near the silhouette edge for a soft rim
    if(nb(m,i%w,y)<8)v=Math.min(v,.42);
    const k=Math.min(3,Math.floor(v*4)),f=v*4-k,c=R[k].map((q,j)=>Math.round(q+(R[k+1][j]-q)*f));
    out.data.set([...c,255],i*4);
   }
   // outline
   const ol=hex(ramp[0]);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(m[i])continue;if(nb(m,x,y)>0)out.data.set([...ol,235],i*4)}
   return out;
  }
  function upscale(img,k){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').putImageData(img,0,0);const o=document.createElement('canvas');o.width=img.width*k;o.height=img.height*k;const g=o.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(c,0,0,o.width,o.height);return o.toDataURL('image/png')}
  function trim(img,pad=2){const {width:w,height:h,data:d}=img;let x0=w,y0=h,x1=0,y1=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>0){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}if(x1<x0)return img;const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').putImageData(img,0,0);const W2=x1-x0+1+pad*2,H2=y1-y0+1+pad*2,o=document.createElement('canvas');o.width=W2;o.height=H2;o.getContext('2d').drawImage(c,x0-pad,y0-pad,W2,H2,0,0,W2,H2);return o.getContext('2d').getImageData(0,0,W2,H2)}
  const out={};
  const mon=await L('/game/assets/requested/generated/monsters_v018.png');
  const OPT={orb:{close:3,grow:2,smooth:3},flower:{close:3,grow:2,smooth:3},leech:{close:1},worm:{close:1}};
  MONSTERS.forEach((t,i)=>{const pad=4,src=cut(mon,(i%4)*40,Math.floor(i/4)*40,40,40),big=new ImageData(48,48);
   // pad so the outline is not clipped
   for(let y=0;y<40;y++)for(let x=0;x<40;x++)big.data.set(src.data.slice((y*40+x)*4,(y*40+x)*4+4),((y+pad)*48+x+pad)*4);
   out['monsters/'+t]=upscale(trim(rebuild(big,RAMP[t],OPT[t]||{})),4)});
  const ex=await L('/game/assets/requested/generated/extras_v018.png');
  for(const [k,[x,y,w,h]] of Object.entries(PROPS)){const ramp=RAMP[k.replace('_open','')];const src=cut(ex,x,y,w,h),big=new ImageData(w+6,h+6);for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)big.data.set(src.data.slice((yy*w+xx)*4,(yy*w+xx)*4+4),((yy+3)*(w+6)+xx+3)*4);out['props/'+k]=upscale(trim(rebuild(big,ramp,{close:2})),4)}
  // allies are not rebuilt: the game uses the motion sheets in character-motion-v1/exports
  return out;
 },{RAMP,MONSTERS,PROPS});
 for(const [k,url] of Object.entries(res)){const f=path.join(OUT,k+'.png');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,Buffer.from(url.split(',')[1],'base64'))}
 console.log('wrote',Object.keys(res).length,'files to',path.relative(process.cwd(),OUT));
 await b.close();
})();
