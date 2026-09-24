(()=>{
'use strict';
/* v0.26.0 camera. A floor is W x H (2x2 screens); the canvas shows SW x SH of it.
   The camera follows the heroine with a little lead in the direction she faces, eases
   toward it, and snaps when she is moved far at once (new floor, reset). The whole draw
   runs under the camera transform; screen-fixed layers use screenSpace() (battle-core.js). */
let last=performance.now(),seen=null;
/* v0.27 kick: a short push along a hit, easing back (impact-v027.js) */
const K={x:0,y:0};const kick=(x,y)=>{K.x+=x;K.y+=y};
function target(h){
 const lead=h.moving?70:40,f=h.facing||0;
 return{x:clamp(h.x+Math.cos(f)*lead-SW/2,0,W-SW),y:clamp(h.y-20+Math.sin(f)*lead*.6-SH/2,0,H-SH)};
}
function follow(dt){
 const h=state.hero;if(!h)return;
 const t=target(h);
 const jump=!seen||Math.hypot(h.x-seen.x,h.y-seen.y)>260;
 if(jump){CAM.x=t.x;CAM.y=t.y}
 else{const k=1-Math.exp(-dt*5);CAM.x+=(t.x-CAM.x)*k;CAM.y+=(t.y-CAM.y)*k}
 seen={x:h.x,y:h.y};
}
const bDraw=draw;
draw=function(){
 const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;
 follow(dt);
 // draw at whole pixels (crisp sprites); keep the eased position for the next frame
 K.x*=Math.exp(-dt*14);K.y*=Math.exp(-dt*14);
 const fx=CAM.x,fy=CAM.y;CAM.x=Math.round(fx+K.x);CAM.y=Math.round(fy+K.y);
 ctx.save();ctx.setTransform(1,0,0,1,-CAM.x,-CAM.y);
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
  const r=window.Game5Dungeon?.room?.();if(r?.exit){const [ex,ey]=P(...r.exit);ctx.fillStyle=state.dungeon?.pending?'#ffe28a':'#8a7e6a';ctx.fillRect(ex-2.5,ey-2.5,5,5)}
  for(const e of window.Game5MultiEnemy?.alive?.()||[]){const [ex,ey]=P(e.x,e.y);ctx.fillStyle=e.aware?'#ff6f6f':'#b98cff';ctx.globalAlpha=e.aware?1:.7;ctx.beginPath();ctx.arc(ex,ey,2.4,0,TAU);ctx.fill()}
  ctx.globalAlpha=1;const hr=state.hero;if(hr){const [hx,hy]=P(hr.x,hr.y);ctx.fillStyle='#fff4c4';ctx.beginPath();ctx.arc(hx,hy,3,0,TAU);ctx.fill()}
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;ctx.strokeRect(x0+CAM.x/CS*k,y0+CAM.y/CS*k,SW/CS*k,SH/CS*k);
 });
}
const bDraw2=draw;
draw=function(){bDraw2();try{minimap()}catch(_){}};
window.Game5Camera={version:'0.27.0',follow,snap:()=>{seen=null},minimap,kick};
})();
