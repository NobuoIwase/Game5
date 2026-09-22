function drawSector(x,y,r,a,h,f,s){ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,r,a-h,a+h);ctx.closePath();if(f){ctx.fillStyle=f;ctx.fill()}if(s){ctx.strokeStyle=s;ctx.stroke()}}
function C(x,y,r,f,s){ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(f){ctx.fillStyle=f;ctx.fill()}if(s){ctx.strokeStyle=s;ctx.stroke()}}
function draw(){
 ctx.fillStyle='#142019';ctx.fillRect(0,0,W,H);const h=state.hero,e=state.enemy;
 ctx.globalAlpha=.08;C(h.x,h.y,h.hearingRange,null,'#b9d8e8');ctx.globalAlpha=.12;drawSector(h.x,h.y,h.visionRange,h.facing,h.visionHalf,'#e6efb8');ctx.globalAlpha=1;
 for(const z of state.hazards)C(z.x,z.y,z.r,z.kind.includes('Fog')?'#7a416544':'#632b4144','#d792b5');
 if(e.cast){const q=e.cast,s=q.sk;ctx.fillStyle='#e84a4555';ctx.strokeStyle='#ff826f';
  if(s.kind==='circle')C(q.target.x,q.target.y,s.r,'#e84a4555','#ff826f');
  else if(s.kind==='cone')drawSector(q.start.x,q.start.y,s.range,q.ang,.66,'#e84a4555','#ff826f');
  else{ctx.save();ctx.translate(q.start.x,q.start.y);ctx.rotate(q.ang);ctx.fillRect(0,-s.width/2,s.range,s.width);ctx.restore()}
 }
 if(h.cast&&['melee','bash','heavy'].includes(h.cast.sk.kind))drawSector(h.x,h.y,h.cast.sk.range,h.facing,.7,'#f4d77c22','#f4d77c');
 const im=state.images.get(h.id)?.walk;if(im?.complete&&im.naturalWidth)ctx.drawImage(im,h.frame*384,(DIR_ROWS[h.dir]||0)*512,384,512,h.x-42,h.y-90,84,112);else C(h.x,h.y,18,h.color,'#fff');
 ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(h.x+Math.cos(h.facing)*30,h.y+Math.sin(h.facing)*30);ctx.strokeStyle='#fff6';ctx.stroke();
 C(e.x,e.y,32,e.flash>0?'#eee':'#34323b','#ad7b83');ctx.fillStyle='#511';ctx.fillRect(e.x-55,e.y+40,110,7);ctx.fillStyle='#d45a57';ctx.fillRect(e.x-55,e.y+40,110*e.hp/e.maxHp,7);
 for(const f of state.effects){const a=clamp(f.t/f.max,0,1);ctx.globalAlpha=a;if(f.kind==='text'){ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y-20*(1-a))}else C(f.x,f.y,22+28*(1-a),null,f.color)}ctx.globalAlpha=1;
}
