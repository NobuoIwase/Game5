(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const names = { warrior:"戦士", scout:"獣人スカウト", witch:"魔女", sister:"シスター" };
  const rows = { front:0, down_right:1, right:2, up_right:3, back:4, up_left:5, left:6, down_left:7 };
  const crystals0 = [{x:460,y:865},{x:1040,y:330},{x:1390,y:1000}];
  const G = window.G5 = {
    canvas, ctx, names, rows,
    W:1800, H:1200, VW:1280, VH:720, cellW:384, cellH:512,
    walkSpeed:165, runSpeed:285, radius:19,
    obstacles:[
      {x:510,y:165,w:170,h:210,kind:"ruin"},
      {x:865,y:540,w:210,h:150,kind:"pond"},
      {x:1240,y:735,w:240,h:170,kind:"ruin"},
      {x:150,y:395,w:170,h:170,kind:"grove"},
    ],
    shrine:{x:1585,y:205,r:58},
    player:{x:300,y:930,dir:"front",motion:"walk",frame:0,clock:0,moving:false,running:false,char:"warrior"},
    camera:{x:0,y:0}, assets:new Map(), complete:false,
    crystals:crystals0.map(v=>({...v,collected:false})),
    ui:{
      loading:document.getElementById("loadingCard"),
      complete:document.getElementById("completeCard"),
      char:document.getElementById("characterLabel"),
      motion:document.getElementById("motionLabel"),
      crystal:document.getElementById("crystalLabel"),
      title:document.getElementById("messageTitle"),
      body:document.getElementById("messageBody"),
    }
  };

  G.reset = () => {
    Object.assign(G.player,{x:300,y:930,dir:"front",motion:"walk",frame:0,clock:0,moving:false,running:false});
    G.crystals = crystals0.map(v=>({...v,collected:false}));
    G.complete=false;
    G.ui.complete.classList.add("hidden");
    G.ui.crystal.textContent="結晶 0 / 3";
    G.ui.title.textContent="3つの結晶を集める";
    G.ui.body.textContent="森を歩き、すべて集めたら北東の祭壇へ。";
  };

  const image = src => new Promise((ok,ng)=>{
    const im=new Image();
    im.onload=()=>ok(im);
    im.onerror=()=>ng(new Error(src));
    im.src=src;
  });

  G.loadChar = char => {
    const old=G.assets.get(char);
    if(old?.ready) return Promise.resolve(old);
    if(old?.promise) return old.promise;
    const a={ready:false};
    const base=`../character-motion-v1/exports/${char}`;
    a.promise=Promise.all([image(`${base}/walk.png`),image(`${base}/run.png`)]).then(([walk,run])=>{
      Object.assign(a,{walk,run,ready:true}); return a;
    });
    G.assets.set(char,a);
    return a.promise;
  };

  G.setChar = async char => {
    if(!G.names[char]) return;
    const prev=G.player.char;
    G.player.char=char;
    document.querySelectorAll("[data-character]").forEach(b=>b.classList.toggle("active",b.dataset.character===char));
    G.ui.char.textContent=`${G.names[char]} 読込中`;
    try {
      await G.loadChar(char);
      G.ui.char.textContent=G.names[char];
    } catch(e) {
      G.player.char=prev;
      G.ui.char.textContent=G.names[prev];
      G.ui.title.textContent="素材の読み込みに失敗";
      G.ui.body.textContent="リポジトリ全体を取得して game/index.html を開いてください。";
      console.error(e);
    }
  };
})();