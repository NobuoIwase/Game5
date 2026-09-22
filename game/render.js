(() => {
  const G=window.G5, c=G.ctx;
  const rr=(x,y,w,h,r)=>{
    r=Math.min(r,w/2,h/2); c.beginPath(); c.moveTo(x+r,y);
    c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
  };

  function world(){
    c.fillStyle="#2f4a35"; c.fillRect(0,0,G.VW,G.VH);
    c.save(); c.translate(-G.camera.x,-G.camera.y);
    c.strokeStyle="rgba(231,242,226,.035)";
    for(let x=0;x<=G.W;x+=80){c.beginPath();c.moveTo(x,0);c.lineTo(x,G.H);c.stroke();}
    for(let y=0;y<=G.H;y+=80){c.beginPath();c.moveTo(0,y);c.lineTo(G.W,y);c.stroke();}
    c.fillStyle="#796e50"; rr(90,820,1620,165,75);c.fill(); rr(1380,140,230,860,75);c.fill();
    c.fillStyle="rgba(219,204,151,.14)"; rr(108,845,1575,112,56);c.fill(); rr(1418,165,150,820,56);c.fill();
    c.restore();
  }

  function obstacle(o){
    if(o.kind==="pond"){
      c.fillStyle="#183d3f";rr(o.x,o.y,o.w,o.h,55);c.fill();
      c.strokeStyle="rgba(172,214,201,.22)";c.lineWidth=4;c.beginPath();
      c.ellipse(o.x+o.w/2,o.y+o.h/2,o.w*.36,o.h*.25,0,0,Math.PI*2);c.stroke(); return;
    }
    if(o.kind==="grove"){
      c.fillStyle="#162a1d";rr(o.x,o.y,o.w,o.h,34);c.fill();c.fillStyle="#406446";
      [[34,42,38],[90,52,48],[135,42,36],[57,108,43],[122,116,46]].forEach(([x,y,r])=>{
        c.beginPath();c.arc(o.x+x,o.y+y,r,0,Math.PI*2);c.fill();
      }); return;
    }
    c.fillStyle="#4f5548";rr(o.x,o.y,o.w,o.h,12);c.fill();c.fillStyle="#676d5f";
    c.fillRect(o.x+16,o.y+18,o.w-32,24);c.fillRect(o.x+22,o.y+o.h-48,o.w-44,20);
    c.fillStyle="rgba(223,231,210,.13)";c.fillRect(o.x+30,o.y+58,16,o.h-126);c.fillRect(o.x+o.w-46,o.y+58,16,o.h-126);
  }

  function shrine(){
    const ready=G.crystals.every(v=>v.collected), p=.5+Math.sin(performance.now()/260)*.5, s=G.shrine;
    c.save();c.translate(s.x,s.y);c.fillStyle=ready?`rgba(231,227,169,${.18+p*.12})`:"rgba(160,168,156,.12)";
    c.beginPath();c.arc(0,0,s.r+18,0,Math.PI*2);c.fill();
    c.strokeStyle=ready?"#e7e3a9":"#7f887c";c.lineWidth=6;c.beginPath();c.arc(0,0,s.r,0,Math.PI*2);c.stroke();
    c.fillStyle=ready?"#efecc8":"#939b90";c.fillRect(-8,-42,16,70);c.fillRect(-28,-26,56,12);
    c.fillStyle="rgba(248,249,230,.8)";c.font="700 14px system-ui";c.textAlign="center";
    c.fillText(ready?"祭壇 / GOAL":"祭壇 / LOCKED",0,92);c.restore();
  }

  function crystals(){
    const t=performance.now();
    G.crystals.forEach((v,i)=>{
      if(v.collected)return; const bob=Math.sin(t/330+i)*6;
      c.save();c.translate(v.x,v.y+bob);c.fillStyle="rgba(198,233,212,.2)";
      c.beginPath();c.arc(0,0,30,0,Math.PI*2);c.fill();c.fillStyle="#c6e9d4";
      c.beginPath();c.moveTo(0,-18);c.lineTo(12,-2);c.lineTo(6,18);c.lineTo(-7,16);c.lineTo(-13,-2);c.closePath();c.fill();c.restore();
    });
  }

  function player(){
    const p=G.player,a=G.assets.get(p.char);c.save();c.translate(p.x,p.y);
    c.fillStyle="rgba(3,8,5,.3)";c.beginPath();c.ellipse(0,6,30,12,0,0,Math.PI*2);c.fill();
    if(!a?.ready){c.fillStyle="#dce8d7";c.beginPath();c.arc(0,-28,18,0,Math.PI*2);c.fill();c.fillRect(-13,-12,26,46);c.restore();return;}
    const sheet=a[p.motion], row=G.rows[p.dir], dw=154, dh=205;
    c.imageSmoothingEnabled=true;c.drawImage(sheet,p.frame*G.cellW,row*G.cellH,G.cellW,G.cellH,-dw/2,-dh*.90,dw,dh);c.restore();
  }

  G.draw=()=>{
    world();c.save();c.translate(-G.camera.x,-G.camera.y);
    G.obstacles.forEach(obstacle);shrine();crystals();player();c.restore();
  };
})();