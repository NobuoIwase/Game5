
(()=>{
'use strict';
const G={d:new Image(),e:new Image(),f:new Image()};
G.d.src='./assets/dungeon.png';G.e.src='./assets/enemies.png';G.f.src='./assets/fx.png';
const S=64,D={clean:[0,0],crack:[1,0],moss:[2,0],wall:[3,0],stairs:[0,1],door:[1,1],torch:[2,1],crystal:[3,1],swamp:[0,2],gas:[1,2],ring:[2,2],fog:[3,2],rubble:[0,3]},E={violet:[1,0],wisp:[2,0],moth:[3,0]},F={torch:[0,0],crystal:[1,0],poison:[2,0],fog:[0,1],shadow:[1,1],ring:[0,2],purple:[1,2]};
function a(im,c,x,y,w,h,alpha=1){
 if(!im.complete||!im.naturalWidth)return;
 ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(im,c[0]*S,c[1]*S,S,S,x,y,w,h);ctx.restore();
}
function floor(){
 ctx.fillStyle='#101612';ctx.fillRect(0,0,W,H);
 const s=96;
 for(let y=-4,j=0;y<H+4;y+=s,j++)for(let x=-4,i=0;x<W+4;x+=s,i++){
  let v=(i*17+j*31)%11,c=v===0?D.moss:v<4?D.crack:D.clean;a(G.d,c,x,y,s,s,.95);
 }
 for(let x=0;x<W;x+=128)a(G.d,D.wall,x,-16,128,96,.96);
 a(G.d,D.door,W/2-48,-5,96,96);a(G.d,D.rubble,46,H-108,96,96,.85);a(G.d,D.stairs,W-146,H-122,108,108,.92);
 a(G.d,D.ring,60,90,84,84,.72);a(G.d,D.swamp,W-202,68,120,120,.72);a(G.d,D.gas,W-320,H-120,94,94,.78);
 a(G.d,D.torch,90,28,74,74);a(G.d,D.crystal,W-152,26,74,74);
}
function overlayHazards(){
 for(const z of state.hazards||[]){
  if(z.kind?.includes('Fog'))a(G.f,F.fog,z.x-z.r,z.y-z.r,z.r*2,z.r*2,.26);
  if(z.kind==='directorRingBeam')a(G.f,F.ring,z.x-44,z.y-44,88,88,.42);
 }
}
function enemySoft(){
 const e=state.enemy;if(!e)return;
 let c=e.cast?.key==='fog'?E.wisp:e.cast?.key==='bolt'?E.moth:E.violet;
 let sz=e.phase===2?106:96,b=Math.sin(state.time*5.2)*3;
 a(G.f,F.shadow,e.x-52,e.y+12,104,48,.56);
 a(G.e,c,e.x-sz/2,e.y-sz*.62+b,sz,sz,1);
 if(e.cast)a(G.f,F.purple,e.x-62,e.y-62,124,124,.18);
}
function lights(){
 const h=state.hero,e=state.enemy;
 ctx.save();ctx.globalCompositeOperation='screen';
 a(G.f,F.torch,18,-24,180,180,.46);a(G.f,F.crystal,W-228,-34,180,180,.38);a(G.f,F.poison,W-245,28,188,158,.12);
 ctx.restore();
 const sh=document.createElement('canvas');sh.width=W;sh.height=H;const s=sh.getContext('2d');
 s.fillStyle='rgba(2,7,10,.54)';s.fillRect(0,0,W,H);s.globalCompositeOperation='destination-out';
 const hole=(x,y,r,k)=>{const q=s.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,`rgba(0,0,0,${k})`);q.addColorStop(.62,`rgba(0,0,0,${k*.7})`);q.addColorStop(1,'rgba(0,0,0,0)');s.fillStyle=q;s.beginPath();s.arc(x,y,r,0,TAU);s.fill()};
 hole(h.x,h.y,210,1);hole(112,56,130,.86);hole(W-112,56,120,.72);if(e?.cast)hole(e.x,e.y,94,.38);
 ctx.drawImage(sh,0,0);
 const v=ctx.createRadialGradient(W/2,H/2,H*.12,W/2,H/2,W*.7);v.addColorStop(.56,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.5)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
}
const base=window.draw||draw;
window.draw=draw=function(){
 ctx.clearRect(0,0,W,H);floor();
 const fr=ctx.fillRect.bind(ctx);let skip=true;
 ctx.fillRect=function(x,y,w,h){if(skip&&x===0&&y===0&&w===W&&h===H){skip=false;return}return fr(x,y,w,h)};
 try{base()}finally{ctx.fillRect=fr}
 overlayHazards();enemySoft();lights();
};
window.Game5Graphics={version:'0.8.0',assets:G};
})();
