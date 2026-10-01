const vm=require('vm'),fs=require('fs');const c={console,Math,Date,JSON};vm.createContext(c);
for(const f of ['util','data','map','text','field','report','game'])vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..','..','js',f+'.js'),'utf8'),c,{filename:f});
vm.runInContext(`
for(const seed of [1,2,3,4]){G.U.setSeed(seed);
for(let i=0;i<20;i++){const s=G.Game.newSave();s.autoDirector=false;G.Game.morning(s);G.Game.assign(s,i%s.requests.length,null,null);G.Game.prep(s);const run=G.Game.startDive(s);
 for(;;){const w=G.Game.makeFloor(run);let t=0;const lab={};while(!w.outcome&&t<300){if(w.scene)w.scene=null;G.Field.step(w,1/30);t+=1/30;if(t>150)lab[run.h.label+(run.h.bound?"(bound)":"")]=(lab[run.h.label+(run.h.bound?"(bound)":"")]||0)+1;}
  if(!w.outcome){const seen=w.map.seen.reduce((a,b)=>a+b,0);console.log(seed,i,run.dungeon,"floor",w.floorNo,"alive",w.monsters.filter(m=>m.hp>0).length,"seen",seen,"downSeen",!!w.map.seen[Math.floor(w.map.down.y)*w.map.W+Math.floor(w.map.down.x)],JSON.stringify(Object.entries(lab).sort((a,b)=>b[1]-a[1]).slice(0,5)));w.outcome='retreat';}
  if(G.Game.afterFloor(run,w)==='end')break;}}}
`,c);
