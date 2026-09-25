(()=>{
'use strict';
/* v0.26.0 camera. A floor is W x H (2x2 screens); the canvas shows SW x SH of it.
   The camera follows the heroine with a little lead in the direction she faces, eases
   toward it, and snaps when she is moved far at once (new floor, reset). The whole draw
   runs under the camera transform; screen-fixed layers use screenSpace() (battle-core.js). */
let last=performance.now(),seen=null;
/* v0.27 kick: a short push along a hit, easing back (impact-v027.js) */
const K={x:0,y:0};const kick=(x,y)=>{K.x+=x;K.y+=y};
/* v0.27 zoom: CAM.z (1 = normal). The view is SW/z x SH/z world pixels from CAM.x,CAM.y.
   Other modules ask for a close-up through Game5Camera.wantZoom (holds, Estella). */
CAM.z=1;let wantZ=1;
/* v0.27 dead zone: the view stays still while she moves inside the middle of the screen and
   only follows once she leaves it, so turning round or pacing does not swing the whole
   screen. In a close-up she is simply centred. */
const DZ={x:.16,y:.14};
function target(h){
 const z=CAM.z,vw=SW/z,vh=SH/z,hy=h.y+(z>1.05?30:28);   // v0.38: she sits higher, clear of the message window along the bottom
 if(z>1.05)return{x:clamp(h.x-vw/2,0,W-vw),y:clamp(hy-vh/2,0,H-vh)};
 let x=CAM.x,y=CAM.y;const cx=x+vw/2,cy=y+vh/2,dx=vw*DZ.x,dy=vh*DZ.y;
 if(h.x<cx-dx)x=h.x+dx-vw/2;else if(h.x>cx+dx)x=h.x-dx-vw/2;
 if(hy<cy-dy)y=hy+dy-vh/2;else if(hy>cy+dy)y=hy-dy-vh/2;
 return{x:clamp(x,0,W-vw),y:clamp(y,0,H-vh)};
}
function follow(dt){
 const h=state.hero;if(!h)return;
 const z0=CAM.z;CAM.z+=(wantZ-CAM.z)*(1-Math.exp(-dt*(wantZ>CAM.z?2.6:1.8)));
 // zoom about the view centre so the close-up does not lurch
 if(Math.abs(CAM.z-z0)>1e-4){const cx=CAM.x+SW/z0/2,cy=CAM.y+SH/z0/2;CAM.x=cx-SW/CAM.z/2;CAM.y=cy-SH/CAM.z/2}
 const t=target(h);
 const jump=!seen||Math.hypot(h.x-seen.x,h.y-seen.y)>260;
 if(jump){CAM.x=clamp(h.x-SW/CAM.z/2,0,W-SW/CAM.z);CAM.y=clamp(h.y-30-SH/CAM.z/2,0,H-SH/CAM.z)}
 else{const k=1-Math.exp(-dt*6);CAM.x+=(t.x-CAM.x)*k;CAM.y+=(t.y-CAM.y)*k}
 seen={x:h.x,y:h.y};
}
const bDraw=draw;
draw=function(){
 const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;
 follow(dt);
 // draw at whole pixels (crisp sprites); keep the eased position for the next frame
 K.x*=Math.exp(-dt*14);K.y*=Math.exp(-dt*14);
 const fx=CAM.x,fy=CAM.y;CAM.x=Math.round((fx+K.x)*CAM.z)/CAM.z;CAM.y=Math.round((fy+K.y)*CAM.z)/CAM.z;
 const z=CAM.z;
 ctx.save();ctx.setTransform(z,0,0,z,-CAM.x*z,-CAM.y*z);
 try{bDraw()}finally{ctx.restore();CAM.x=fx;CAM.y=fy}
};
/* minimap (top right): the whole floor, what she has explored, the stairs, her, and every
   monster - the player plays the monsters' side, so they all show; aware ones in red */
const mm=document.createElement('canvas'),mg=mm.getContext('2d');let mmKey='';
function minimap(){
 const T=window.Game5Terrain,f=T?.current?.();if(!f||!state.started)return;
 const {GW,GH,CS}=T,k=Math.min(170/GW,96/GH)|0||2,w=GW*k,h=GH*k,x0=SW-w-10,y0=10;
 const key=`${state.dungeon?.room}:${f.seed}`;
 if(mmKey!==key){mmKey=key;mm.width=w;mm.height=h;mg.clearRect(0,0,w,h);for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)if(f.grid[y*GW+x]!==1){mg.fillStyle='#6f7b72';mg.fillRect(x*k,y*k,k,k)}}
 screenSpace(()=>{
  ctx.globalAlpha=.82;ctx.fillStyle='#050807';ctx.fillRect(x0-3,y0-3,w+6,h+6);
  ctx.globalAlpha=.28;ctx.drawImage(mm,x0,y0);
  ctx.globalAlpha=.9;for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){const i=y*GW+x;if(f.explored[i]&&f.grid[i]!==1){ctx.fillStyle='#a9b8ad';ctx.fillRect(x0+x*k,y0+y*k,k,k)}}
  const P=(px,py)=>[x0+px/CS*k,y0+py/CS*k];
  const r=window.Game5Dungeon?.room?.();if(r?.exit){const [ex,ey]=P(...r.exit);ctx.fillStyle=(state.dungeon?.pending||state.dungeon?.stairsFound)?'#ffe28a':'#8a7e6a';ctx.fillRect(ex-2.5,ey-2.5,5,5)}
  for(const e of window.Game5MultiEnemy?.alive?.()||[]){const [ex,ey]=P(e.x,e.y);ctx.fillStyle=e.aware?'#ff6f6f':'#b98cff';ctx.globalAlpha=e.aware?1:.7;ctx.beginPath();ctx.arc(ex,ey,2.4,0,TAU);ctx.fill()}
  ctx.globalAlpha=1;const hr=state.hero;if(hr){const [hx,hy]=P(hr.x,hr.y);ctx.fillStyle='#fff4c4';ctx.beginPath();ctx.arc(hx,hy,3,0,TAU);ctx.fill()}
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;ctx.strokeRect(x0+CAM.x/CS*k,y0+CAM.y/CS*k,SW/CAM.z/CS*k,SH/CAM.z/CS*k);
 });
}
const bDraw2=draw;
draw=function(){bDraw2();try{minimap()}catch(_){}};
window.Game5Camera={version:'0.27.0',follow,snap:()=>{seen=null},minimap,kick,wantZoom:z=>{wantZ=clamp(z||1,1,2)}};
})();
