function drawSector(x,y,r,a,h,f,s){
  ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,r,a-h,a+h);ctx.closePath();
  if(f){ctx.fillStyle=f;ctx.fill()} if(s){ctx.strokeStyle=s;ctx.stroke()}
}
function C(x,y,r,f,s){
  ctx.beginPath();ctx.arc(x,y,r,0,TAU);
  if(f){ctx.fillStyle=f;ctx.fill()} if(s){ctx.strokeStyle=s;ctx.stroke()}
}
function heroSpriteSample(h){
  const a=state.images.get(h.id),slow=h.status?.slow>0?.58:1,
    v=h.intent?.kind==='move'?(h.intent.speed||0)*slow:0,
    run=h.moving&&!h.cast&&v>=.84&&a?.run?.complete&&a.run.naturalWidth,
    m=run?'run':'walk',im=a?.[m]||a?.walk,
    frame=h.moving?Math.floor(state.time/(m==='run'?.08:.12))%8:0;
  h.motion=m;return{image:im,frame}
}
function drawFloor(){
  if(window.Game5Graphics?.drawDungeonBase?.()===true)return;
  const g=ctx.createRadialGradient(W*.5,H*.45,80,W*.5,H*.5,Math.max(W,H)*.7);
  g.addColorStop(0,'#26362b');g.addColorStop(1,'#08100c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#ffffff08';
  for(let x=0;x<W;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=0;y<H;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
}
/* v0.34: walking toward or away from the viewer her stride read too wide; below the hips the
   frame is drawn in thin strips that narrow toward the feet, so her knees and feet come inward */
const NARROW={front:.8,back:.8,down_left:.9,down_right:.9,up_left:.9,up_right:.9};
function drawWalkFrame(im,frame,row,x,y,dir){
  const sx=frame*384,sy=row*512,k=NARROW[dir];
  if(!k){ctx.drawImage(im,sx,sy,384,512,x,y,84,112);return}
  const hip=300,N=10,cx=x+42;
  ctx.drawImage(im,sx,sy,384,hip,x,y,84,hip*112/512);
  for(let i=0;i<N;i++){const a=hip+(512-hip)*i/N,b=hip+(512-hip)*(i+1)/N,u=(i+.5)/N,sc=1-(1-k)*u,w=84*sc;
    ctx.drawImage(im,sx,sy+a,384,b-a+.6,cx-w/2,y+a*112/512,w,(b-a)*112/512+.15)}
}
function draw(){
  drawFloor();
  const h=state.hero,e=state.enemy;
  window.Game5Graphics?.drawHazardsUnder?.();

  const fx=window.Game5FX;
  if(fx)fx.perception(h);
  else{ctx.save();ctx.globalAlpha=.055;C(h.x,h.y,h.hearingRange,null,'#b9d8e8');
  ctx.globalAlpha=.10;drawSector(h.x,h.y,h.visionRange,h.facing,h.visionHalf,'#e6efb8');ctx.restore();}

  if(fx)fx.underActors();
  else if(e.cast){
    const q=e.cast,s=q.sk,a=.14+.28*(1-Math.max(0,q.t)/Math.max(.01,q.total));
    ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#ff5e62';ctx.strokeStyle='#ffb07c';ctx.lineWidth=3;
    if(s.kind==='circle')C(q.target.x,q.target.y,s.r,'#e84a4555','#ff826f');
    else if(s.kind==='cone')drawSector(q.start.x,q.start.y,s.range,q.ang,.66,'#e84a4555','#ff826f');
    else{ctx.translate(q.start.x,q.start.y);ctx.rotate(q.ang);ctx.fillRect(0,-s.width/2,s.range,s.width);ctx.strokeRect(0,-s.width/2,s.range,s.width)}
    ctx.restore()
  }

  if(h.cast&&['melee','bash','heavy'].includes(h.cast.sk.kind)){
    const q=h.cast,p=1-q.t/q.total,r=q.sk.range;
    ctx.save();ctx.globalAlpha=.16+.20*p;drawSector(h.x,h.y,r,h.facing,.62,'#f4d77c33','#f4d77c');
    const tip=r*(.65+.25*p);C(h.x+Math.cos(h.facing)*tip,h.y+Math.sin(h.facing)*tip,5,'#fff0b8');
    ctx.restore()
  }

  // v0.27: a hook may shake her (trembling, see heat-v027.js)
  const jt=window.Game5Heat?.jitter?.(h)||null;ctx.save();if(jt)ctx.translate(jt.x,jt.y);
  ctx.save();ctx.shadowBlur=24;ctx.shadowColor='#d9efc4';
  const art=window.WarriorMotion?.drawGame?.(ctx,h)===true;ctx.restore();
  if(!art){
    const q=heroSpriteSample(h),im=q.image;
    if(im?.complete&&im.naturalWidth)drawWalkFrame(im,q.frame,DIR_ROWS[h.dir]||0,h.x-42,h.y-90,h.dir);
    else C(h.x,h.y,18,h.color,'#fff')
  }
  ctx.restore();
  if(!fx){ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(h.x+Math.cos(h.facing)*32,h.y+Math.sin(h.facing)*32);ctx.strokeStyle='#fff8';ctx.stroke();}

  const enemyArt=window.Game5Graphics?.drawEnemy?.(e)===true;
  if(!enemyArt){ctx.save();ctx.shadowBlur=18;ctx.shadowColor=e.flash>0?'#fff':'#9a685c';C(e.x,e.y,32,e.flash>0?'#eee':'#34323b','#ad7b83');ctx.restore()}
  if(!window.Game5MultiEnemy){ctx.fillStyle='#511';ctx.fillRect(e.x-55,e.y+40,110,7);ctx.fillStyle='#d45a57';ctx.fillRect(e.x-55,e.y+40,110*e.hp/e.maxHp,7);}

  // v0.37: pinned under a heavy monster she is drawn again over it, so she can be seen
  if(h.grapple?.pinned&&!h.dead){const jt2=window.Game5Heat?.jitter?.(h)||null;ctx.save();if(jt2)ctx.translate(jt2.x,jt2.y);ctx.globalAlpha=.92;window.WarriorMotion?.drawGame?.(ctx,h);ctx.restore()}
  window.Game5Graphics?.drawHazardsOver?.();

  if(fx)fx.effects();
  else for(const f of state.effects){
    const a=clamp(f.t/f.max,0,1);ctx.globalAlpha=a;
    if(f.kind==='text'){ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y-20*(1-a))}
    else C(f.x,f.y,2+28*(1-a),null,f.color)
  }
  ctx.globalAlpha=1;
  window.Game5Graphics?.drawAtmosphere?.();
  window.Game5Graphics?.drawLighting?.();
}
