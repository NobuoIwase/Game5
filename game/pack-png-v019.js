(()=>{
'use strict';
/* v0.20.0 art wiring.
   - monsters / tower / pool: Claude's reference drawings (asset-refs/sprites/*.svg) are drawn in
     the game until real generated art arrives. The v0.18 ChatGPT dot art was too small and too
     dithered to read, so it is no longer used (see asset-refs/README.md for the re-request).
     A PNG placed at assets/requested/final/monsters/<type>.png (or props/tower.png, pool.png)
     and listed in assets/requested/final/index.json takes priority.
   - props: chest / mimic / stairs 2-frame sheets from final/props/
   - nutera: hearts, sigil and ESTELLA logo; icons: the director tool buttons
   - floors: final/floors/roomN.png (else the room's 64x32 block of floors_v018.png) becomes
     the texture source of the baked flagstone floor, softened and pulled toward the room palette
   - allies: the start card shows the existing motion sheets */
const load=(s,fn)=>{const i=new Image();if(fn)i.onload=()=>fn(i);i.src=s;return i},ok=i=>i&&i.complete&&i.naturalWidth;
const TYPES=['gel','slug','leech','worm','orb','flower','moth','mirror_slime','silk_spider','bubble_shell','crown_attendant',
 'wisp','creeping_hand','gazer','lure_cap','water_wraith','stone_sentinel'];
const req=window.Game5Assets?.requested;
const S='./asset-refs/sprites/',F='./assets/requested/final/';
/* rasterise (SVG at 2x) and trim the transparent margin so the feet sit on the sprite's bottom edge */
function raster(im,done,k=2){
 try{
  const c=document.createElement('canvas');c.width=im.naturalWidth*k;c.height=im.naturalHeight*k;const g=c.getContext('2d');g.drawImage(im,0,0,c.width,c.height);
  const d=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;
  for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2)if(d[(y*c.width+x)*4+3]>16){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y}
  if(x1<=x0)return done(im);
  const t=document.createElement('canvas');t.width=x1-x0+4;t.height=y1-y0+4;t.getContext('2d').drawImage(c,x0-2,y0-2,t.width,t.height,0,0,t.width,t.height);
  load(t.toDataURL(),done);
 }catch(_){done(im)}
}
/* final/index.json lists delivered files per kind, either as names ("gel") or paths
   ("monsters/gel.png"). Claude removes entries that fail review; see final/REVIEW.md */
/* final/_web/ holds trimmed, downscaled WebP copies made by tools/build_final_web.js (the
   deliveries are 1024px PNGs, ~12MB in total); they are used when the manifest lists them */
const finals=new Set(),getJSON=u=>fetch(u).then(r=>r.ok?r.json():{}).catch(()=>({}));
const listed=Promise.all([getJSON(F+'index.json'),getJSON(F+'_web/manifest.json')]);
const has=(j,kind,name)=>(j?.[kind]||[]).some(e=>String(e).replace(/^.*\//,'').replace(/\.png$/,'')===name);
function final(kind,name,fn){listed.then(([j,web])=>{if(!has(j,kind,name))return;const w=web?.files?.[kind+'/'+name];load(w?`${F}_web/${w.file}`:`${F}${kind}/${name}.png`,fn)})}
function use(svg,kind,name,set,trim){
 const key=kind+'/'+name;
 if(svg)load(svg,im=>raster(im,r=>{if(!finals.has(key))set(r)}));
 final(kind,name,im=>{finals.add(key);trim?raster(im,set,1):set(im)});
}
for(const t of TYPES)use(`${S}monster_${t}.svg`,'monsters',t,im=>{if(req)req.monsters[t]=im},true);
const props=window.Game5Props=Object.assign(window.Game5Props||{},{});
use(`${S}prop_tower.svg`,'props','tower',im=>props.towerPng=im);
use(`${S}prop_pool.svg`,'props','pool',im=>props.poolPng=im);
/* 2-frame sheets: chest (closed, open), mimic (closed, revealed), stairs */
const paired={};
use(null,'props','chest',im=>{if(!paired.chest)props.chest=im});
use(null,'props','mimic',im=>{if(!paired.mimic)props.mimic=im});
use(null,'props','stairs',im=>{if(!paired.stairs)props.stairs=im});
/* frames delivered one per file (chest_closed + chest_open, ...) are joined into the same
   2-frame sheet, each frame bottom-centred in an equal cell; they win over a delivered sheet */
function pair(a,b,set){
 const got={};let done=false;
 const join=()=>{if(done||!got[a]||!got[b])return;done=true;const A=got[a],B=got[b],w=Math.max(A.naturalWidth,B.naturalWidth),h=Math.max(A.naturalHeight,B.naturalHeight);
  const c=document.createElement('canvas');c.width=w*2;c.height=h;const g=c.getContext('2d');g.imageSmoothingQuality='high';
  g.drawImage(A,(w-A.naturalWidth)/2,h-A.naturalHeight);g.drawImage(B,w+(w-B.naturalWidth)/2,h-B.naturalHeight);load(c.toDataURL(),set)};
 final('props',a,im=>{got[a]=im;join()});final('props',b,im=>{got[b]=im;join()});
}
pair('chest_closed','chest_open',im=>{paired.chest=true;props.chest=im});
pair('mimic_closed','mimic_open',im=>{paired.mimic=true;props.mimic=im});
pair('stairs_open','stairs_sealed',im=>{paired.stairs=true;props.stairs=im});   // stairs sheet order: open, sealed
/* keep the pack's softened SVG from overwriting these */
window.Game5ArtLock=true;

/* Nutera / Estella art: hearts replace the drawn heart sprites (deep pink is the pink heart
   darkened, as no matching delivery exists), the sigil and the ESTELLA logo are drawn by
   nutera-fx-v016.js when present */
const NA=window.Game5NuteraArt=window.Game5NuteraArt||{};
function heartSprite(im,filter){
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),k=112/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*k,h=im.naturalHeight*k;
 g.imageSmoothingQuality='high';if(filter)g.filter=filter;g.drawImage(im,(128-w)/2,(128-h)/2,w,h);return c;
}
const SPR=()=>window.Game5NuteraFX?.sprites;
final('nutera','heart_pink',im=>{const S=SPR();if(!S)return;S.pink=heartSprite(im);if(!NA.deepDelivered)S.deep=heartSprite(im,'brightness(.8) saturate(1.05)')});
final('nutera','heart_deep',im=>{const S=SPR();if(!S)return;NA.deepDelivered=true;S.deep=heartSprite(im)});
final('nutera','heart_pale',im=>{const S=SPR();if(S)S.soft=heartSprite(im)});
final('nutera','heart_violet',im=>{const S=SPR();if(S)S.violet=heartSprite(im)});
final('nutera','sigil',im=>NA.sigil=im);
final('nutera','estella_logo',im=>NA.logo=im);

/* director tool icons on the trap buttons */
for(const b of document.querySelectorAll?.('[data-tool]')||[])final('icons',b.dataset.tool,im=>{
 let i=b.querySelector('img.ticon');if(!i){i=document.createElement('img');i.className='ticon';i.alt='';b.classList.add('hasIcon');b.appendChild(i)}
 i.src=im.src;
});

/* floors: a delivered final/floors/roomN.png replaces that floor's texture source */
const FLOOR_LOOK={patch:14,soft:1.2,unify:.5,contrast:.7};
for(let i=0;i<7;i++)final('floors',`room${i+1}`,im=>{
 const look=window.Game5RoomLook||[];look[i]={...(look[i]||{}),src:im,region:[0,0,im.naturalWidth,im.naturalHeight],...FLOOR_LOOK,final:true};
 window.Game5RoomLook=look;window.Game5Floor?.clear?.();
});

/* floors: 7 blocks of 64x32 in floors_v018.png, in room order */
const floorSheet=load('./assets/requested/generated/floors_v018.png');
const BLOCK=[[0,0],[64,0],[0,32],[64,32],[0,64],[64,64],[0,96]];
floorSheet.onload=()=>{
 const look=window.Game5RoomLook||[];
 BLOCK.forEach(([x,y],i)=>{if(look[i]?.final)return;look[i]={...(look[i]||{}),src:floorSheet,region:[x,y,64,32],patch:9,soft:1.6,unify:.5,contrast:.72}});
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
