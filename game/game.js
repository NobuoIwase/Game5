(() => {
  const G=window.G5, keys=new Set(), touch=new Set(), pointers=new Map();
  const active=k=>keys.has(k)||touch.has(k), dist=(a,b,c,d)=>Math.hypot(a-c,b-d);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const collide=(x,y,r,o)=>{
    const px=clamp(x,o.x,o.x+o.w),py=clamp(y,o.y,o.y+o.h);
    return (x-px)**2+(y-py)**2<r*r;
  };
  const can=(x,y)=>x>=G.radius&&y>=G.radius&&x<=G.W-G.radius&&y<=G.H-G.radius&&!G.obstacles.some(o=>collide(x,y,G.radius,o));

  function vector(){
    let x=0,y=0;
    if(active("ArrowLeft")||active("KeyA"))x--;
    if(active("ArrowRight")||active("KeyD"))x++;
    if(active("ArrowUp")||active("KeyW"))y--;
    if(active("ArrowDown")||active("KeyS"))y++;
    if(x&&y){x*=Math.SQRT1_2;y*=Math.SQRT1_2;} return {x,y};
  }
  function direction(x,y){
    const a=Math.sign(x),b=Math.sign(y);
    return b>0?(a>0?"down_right":a<0?"down_left":"front"):
      b<0?(a>0?"up_right":a<0?"up_left":"back"):
      a>0?"right":a<0?"left":G.player.dir;
  }
  function move(dx,dy){
    const p=G.player;
    if(can(p.x+dx,p.y))p.x+=dx;
    if(can(p.x,p.y+dy))p.y+=dy;
  }

  function update(dt){
    if(G.complete)return;
    const p=G.player,v=vector();
    p.moving=!!(v.x||v.y);
    p.running=p.moving&&(active("ShiftLeft")||active("ShiftRight"));
    p.motion=p.running?"run":"walk";
    if(p.moving){
      p.dir=direction(v.x,v.y); move(v.x*(p.running?G.runSpeed:G.walkSpeed)*dt,v.y*(p.running?G.runSpeed:G.walkSpeed)*dt);
      p.clock+=dt*1000;const ms=p.running?80:120;
      while(p.clock>=ms){p.clock-=ms;p.frame=(p.frame+1)%8;}
    }else{p.frame=0;p.clock=0;}

    G.crystals.forEach(v=>{if(!v.collected&&dist(p.x,p.y,v.x,v.y)<34)v.collected=true;});
    const n=G.crystals.filter(v=>v.collected).length;
    G.ui.crystal.textContent=`結晶 ${n} / 3`;
    G.ui.motion.textContent=p.moving?(p.running?"走行":"歩行"):"待機";
    if(n===3){
      G.ui.title.textContent="祭壇へ向かう";G.ui.body.textContent="北東にある光る祭壇へ入るとクリア。";
      if(dist(p.x,p.y,G.shrine.x,G.shrine.y)<G.shrine.r){G.complete=true;G.ui.complete.classList.remove("hidden");}
    }else{
      G.ui.title.textContent="3つの結晶を集める";G.ui.body.textContent="森を歩き、すべて集めたら北東の祭壇へ。";
    }
    const tx=clamp(p.x-G.VW/2,0,G.W-G.VW),ty=clamp(p.y-G.VH/2,0,G.H-G.VH);
    G.camera.x+=(tx-G.camera.x)*Math.min(1,dt*8);G.camera.y+=(ty-G.camera.y)*Math.min(1,dt*8);
  }

  const moveCodes=new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD","ShiftLeft","ShiftRight"]);
  addEventListener("keydown",e=>{
    if(moveCodes.has(e.code)){e.preventDefault();keys.add(e.code);}
    if(/^Digit[1-4]$/.test(e.code))G.setChar(["warrior","scout","witch","sister"][+e.code.at(-1)-1]);
    if(e.code==="KeyR")G.reset();
  },{passive:false});
  addEventListener("keyup",e=>keys.delete(e.code));
  addEventListener("blur",()=>{keys.clear();touch.clear();pointers.clear();document.querySelectorAll(".pressed").forEach(b=>b.classList.remove("pressed"));});

  document.querySelectorAll("[data-character]").forEach(b=>b.addEventListener("click",()=>G.setChar(b.dataset.character)));
  document.querySelectorAll(".touch-controls [data-key]").forEach(b=>{
    const press=e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,b.dataset.key);touch.add(b.dataset.key);b.classList.add("pressed");};
    const release=e=>{e.preventDefault();const k=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(k&&![...pointers.values()].includes(k))touch.delete(k);b.classList.remove("pressed");};
    b.addEventListener("pointerdown",press);["pointerup","pointercancel","lostpointercapture"].forEach(n=>b.addEventListener(n,release));
  });
  document.getElementById("restartButton").addEventListener("click",G.reset);

  let last=performance.now();
  const frame=now=>{const dt=Math.min((now-last)/1000,.05);last=now;update(dt);G.draw();requestAnimationFrame(frame);};
  G.loadChar("warrior").then(()=>{
    G.ui.loading.classList.add("hidden");G.ui.char.textContent=G.names.warrior;requestAnimationFrame(frame);
  }).catch(e=>{
    G.ui.loading.querySelector("strong").textContent="素材を読み込めませんでした";
    G.ui.loading.querySelector("span").textContent="リポジトリ全体を取得して game/index.html を開いてください。";
    console.error(e);requestAnimationFrame(frame);
  });
})();