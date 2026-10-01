const vm=require('vm'),fs=require('fs');const c={console,Math,Date,JSON};vm.createContext(c);
for(const f of require("../files"))vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..','..','js',f+'.js'),'utf8'),c,{filename:f});
vm.runInContext(`
const by={},spot={};let n=0;
for(const dg of ["imp","mist","mire","vine","cult"])for(let seed=1;seed<=5;seed++){G.U.setSeed(seed*13);
const s=G.Game.newSave();G.Game.morning(s);const ri=s.requests.findIndex(r=>r.dungeon===dg);if(ri<0)continue;G.Game.assign(s,ri,null,null);G.Game.prep(s);const run=G.Game.startDive(s);run.autoDirector=true;
for(;;){const w=G.Game.makeFloor(run);w.dir.auto=true;let t=0;while(!w.outcome&&t<200){if(w.scene)w.scene=null;G.Field.step(w,1/30);t+=1/30;}if(!w.outcome)w.outcome="retreat";if(G.Game.afterFloor(run,w)==="end")break;}
n++;for(const e of run.events){if(e.kind==="charm")by[e.mon]=(by[e.mon]||0)+1;if(e.kind==="spot"&&["utaimp","hitomi","miwakubana","sasayaki"].includes(e.mon))spot[e.mon]=(spot[e.mon]||0)+1;}}
console.log("dives",n,"charm by",JSON.stringify(by),"spotted new",JSON.stringify(spot));
`,c);
