(()=>{
'use strict';
/* v0.19.0 ChatGPT PNG pack (v0.18, assets/requested/generated/).
   The raw atlases were downscaled to ~40px and 6-8 colours, so they are rebuilt offline by
   tools/process-generated.js into assets/requested/processed/ (clean silhouettes, per-species
   colour ramps, outline, 4x pixel upscale). This file wires the rebuilt sprites in:
   - monsters: all 11 species, drawn crisp (no smoothing) in place of the SVG pack art
   - props: hypnosis tower and mire pool (the chest and stairs cells were too small to read,
     so the SVG chest and the original stairs stay)
   - floors: each floor's 64x32 block of floors_v018.png becomes the texture source of the
     baked flagstone floor, softened and pulled toward the room palette
   - allies: the ChatGPT ally art is not used; the start card shows the existing motion sheets */
const load=s=>{const i=new Image();i.src=s;return i},ok=i=>i&&i.complete&&i.naturalWidth;
const P='./assets/requested/processed/';
const TYPES=['gel','slug','leech','worm','orb','flower','moth','mirror_slime','silk_spider','bubble_shell','crown_attendant'];
const req=window.Game5Assets?.requested;
const pixel=new Set();
for(const t of TYPES){const im=load(`${P}monsters/${t}.png`);im.onload=()=>{if(req){req.monsters[t]=im;pixel.add(im)}}}
window.Game5PixelArt=pixel;

/* props: keep the pack's chest; the rebuilt tower and pool replace theirs */
const tower=load(`${P}props/tower.png`),pool=load(`${P}props/pool.png`);
window.Game5Props=Object.assign(window.Game5Props||{},{towerPng:tower,poolPng:pool});

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
window.Game5PackPng={version:'0.19.0',tower,pool,floorSheet,allies,ok};
})();
