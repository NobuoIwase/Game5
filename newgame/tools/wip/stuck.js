const vm=require('vm'),fs=require('fs');const c={console,Math,Date,JSON};vm.createContext(c);
for(const f of require("../files"))vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..','..','js',f+'.js'),'utf8'),c,{filename:f});
vm.runInContext(`
let found=0;const L={};
for(const dg of Object.keys(G.DUNGEONS))for(let seed=7;seed<=14;seed++){G.U.setSeed(seed*7);
const s=G.Game.newSave();G.Game.morning(s);const ri=s.requests.findIndex(r=>r.dungeon===dg);G.Game.assign(s,ri,null,null);G.Game.prep(s);const run=G.Game.startDive(s);
for(let f=0;f<5;f++){const w=G.Game.makeFloor(run);const h=run.h;let t=0,idle=0,labs={};
 while(t<150&&!w.outcome){if(w.scene)w.scene=null;const x0=h.x,y0=h.y;G.Field.step(w,1/30);t+=1/30;
  const busy=h.cast||h.bound||h.trance>0||h.glue>0||h.freeze>0||h.pray>0||h.sniff>0||h.salute>0||h.rest>0||h.convey||h.drawn||h.think>0.2;
  const near=w.monsters.some(m=>m.hp>0&&m.alert>0&&h.known[m.id]&&w.t-h.known[m.id].t<0.5&&G.U.dist(m.x,m.y,h.x,h.y)<5);
  if(near&&!busy&&G.U.dist(x0,y0,h.x,h.y)<0.01){idle+=1/30;labs[h.label]=(labs[h.label]||0)+1;}else{idle=0;labs={};}
  if(idle>8){found++;console.log(dg,seed,f,t.toFixed(1),h.label,h.x.toFixed(1),h.y.toFixed(1),"mp",h.mp|0,"cdShot",h.cdShot.toFixed(1),"form",h.form,"cast",!!h.cast,"st",h.state,"goal",JSON.stringify(h.goal),"intent",JSON.stringify(h.intent),"think",h.think,JSON.stringify(w.monsters.filter(m=>m.hp>0&&G.U.dist(m.x,m.y,h.x,h.y)<6).map(m=>[m.kind,+G.U.dist(m.x,m.y,h.x,h.y).toFixed(1),m.alert>0,m.stun>0,+(m.hp).toFixed(1),G.Map.los(w.map,h.x,h.y,m.x,m.y)])));const k=dg+":"+Object.keys(labs).join("/");L[k]=(L[k]||0)+1;idle=-999;}}
 if(G.Game.afterFloor(run,w)==="end")break;}}
console.log("found",found,JSON.stringify(L));
`,c);
