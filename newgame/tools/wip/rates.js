const vm=require('vm'),fs=require('fs');const DIR=process.env.DIR||require('path').join(__dirname,'..','..','js');const c={console,Math,Date,JSON};vm.createContext(c);
for(const f of require("../files"))vm.runInContext(fs.readFileSync(DIR+'/'+f+'.js','utf8'),c,{filename:f});
vm.runInContext(`
G.U.setSeed(${process.argv[2]||1});const N=${process.argv[3]||20};
const r={cleared:0,retreat:0,defeat:0,timeout:0,ordered:0,floors:0,lv:{}};
for(let i=0;i<N;i++){const s=G.Game.newSave();s.autoDirector=false;G.Game.morning(s);const q=s.requests[i%s.requests.length];G.Game.assign(s,i%s.requests.length,null,null);G.Game.prep(s);const run=G.Game.startDive(s);let to=false;
 for(;;){const w=G.Game.makeFloor(run);let t=0;while(!w.outcome&&t<300){if(w.scene)w.scene=null;G.Field.step(w,1/30);t+=1/30;}if(!w.outcome){w.outcome='retreat';to=true;}if(G.Game.afterFloor(run,w)==='end')break;}
 const o=to?'timeout':run.outcome;if(o==='retreat'){r.why=r.why||{};r.why[run.retreatWhy]=(r.why[run.retreatWhy]||0)+1;}r[o]=(r[o]||0)+1;r.floors+=run.floorReached;r.tb=(r.tb||0)+run.events.filter(e=>e.kind==='trapBreak').length;r.tt=(r.tt||0)+run.events.filter(e=>e.kind==='trap').length;const L=q.real.level;r.lv[L]=r.lv[L]||{n:0,c:0,d:0};r.lv[L].n++;if(o==='cleared')r.lv[L].c++;if(o==='defeat'){r.lv[L].d++;r.by=r.by||{};r.by[run.defeatBy]=(r.by[run.defeatBy]||0)+1;}}
console.log(JSON.stringify(r));
`,c);
