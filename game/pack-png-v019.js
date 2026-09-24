(()=>{
'use strict';
/* v0.20.0 art wiring.
   - monsters / tower / pool: Claude's reference drawings (asset-refs/sprites/*.svg) are drawn in
     the game until real generated art arrives. The v0.18 ChatGPT dot art was too small and too
     dithered to read, so it is no longer used (see asset-refs/README.md for the re-request).
     A PNG placed at assets/requested/final/monsters/<type>.png (or props/tower.png, pool.png)
     and listed in assets/requested/final/index.json takes priority.
   - floors: each floor's 64x32 block of floors_v018.png becomes the texture source of the
     baked flagstone floor, softened and pulled toward the room palette
   - allies: the start card shows the existing motion sheets */
const load=(s,fn)=>{const i=new Image();if(fn)i.onload=()=>fn(i);i.src=s;return i},ok=i=>i&&i.complete&&i.naturalWidth;
const TYPES=['gel','slug','leech','worm','orb','flower','moth','mirror_slime','silk_spider','bubble_shell','crown_attendant'];
const req=window.Game5Assets?.requested;
const S='./asset-refs/sprites/',F='./assets/requested/final/';
/* rasterise at 2x and trim the transparent margin so the feet sit on the sprite's bottom edge */
function raster(im,done){
 try{
  const k=2,c=document.createElement('canvas');c.width=im.naturalWidth*k;c.height=im.naturalHeight*k;const g=c.getContext('2d');g.drawImage(im,0,0,c.width,c.height);
  const d=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;
  for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2)if(d[(y*c.width+x)*4+3]>16){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y}
  if(x1<=x0)return done(im);
  const t=document.createElement('canvas');t.width=x1-x0+4;t.height=y1-y0+4;t.getContext('2d').drawImage(c,x0-2,y0-2,t.width,t.height,0,0,t.width,t.height);
  load(t.toDataURL(),done);
 }catch(_){done(im)}
}
const finals=new Set(),listed=fetch(F+'index.json').then(r=>r.ok?r.json():{}).catch(()=>({}));
function use(svg,png,set){
 load(svg,im=>raster(im,r=>{if(!finals.has(png))set(r)}));
 const [kind,name]=png.slice(F.length).replace('.png','').split('/');
 listed.then(j=>{if((j?.[kind]||[]).includes(name))load(png,im=>{finals.add(png);set(im)})});
}
for(const t of TYPES)use(`${S}monster_${t}.svg`,`${F}monsters/${t}.png`,im=>{if(req)req.monsters[t]=im});
const props=window.Game5Props=Object.assign(window.Game5Props||{},{});
use(`${S}prop_tower.svg`,`${F}props/tower.png`,im=>props.towerPng=im);
use(`${S}prop_pool.svg`,`${F}props/pool.png`,im=>props.poolPng=im);
/* keep the pack's softened SVG from overwriting these */
window.Game5ArtLock=true;

/* floors: 7 blocks of 64x32 in floors_v018.png, in room order */
const floorSheet=load('./assets/requested/generated/floors_v018.png');
const BLOCK=[[0,0],[64,0],[0,32],[64,32],[0,64],[64,64],[0,96]];
floorSheet.onload=()=>{
 const look=window.Game5RoomLook||[];
 BLOCK.forEach(([x,y],i)=>{look[i]={...(look[i]||{}),src:floorSheet,region:[x,y,64,32],patch:9,soft:1.6,unify:.5,contrast:.72}});
 window.Game5RoomLook=look;window.Game5Floor?.clear?.();
};

/* party candidates on the start card: the existing motion sheets in character-motion-v1
   (8 frames x 8 directions, 384x512 cells), walking toward the viewer */
const NAMES={sister:'シスター',witch:'魔女',scout:'斥候'};
const allies=Object.keys(NAMES).map(n=>({n,im:load(`../character-motion-v1/exports/${n}/walk.png`)}));
const card=document.querySelector('#startOverlay .card'),row=document.createElement('div');
row.className='allyRow';row.innerHTML='<small>仲間候補（準備中）</small><div>'+allies.map(a=>`<figure><canvas width="96" height="128" data-ally="${a.n}"></canvas><figcaption>${NAMES[a.n]}</figcaption></figure>`).join('')+'</div>';
card?.insertBefore?.(row,document.getElementById('startBtn'));
const cvs=[...row.querySelectorAll('canvas')];
(function tick(t){
 if(!document.getElementById('startOverlay')?.classList.contains('hidden'))cvs.forEach((c,i)=>{const im=allies[i].im,g=c.getContext('2d');if(!ok(im))return;g.clearRect(0,0,96,128);g.drawImage(im,(Math.floor(t/120)%8)*384,0,384,512,0,0,96,128)});
 requestAnimationFrame(tick);
})(0);
window.Game5PackPng={version:'0.20.0',props,floorSheet,allies,ok};
})();
