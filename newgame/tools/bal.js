// ブラウザなしで潜行だけを回し、1回ごとの結果を1行で出す（バランス確認用）
// node newgame/tools/bal.js <seed> <オート指揮 true|false> <回数>
// 列：行き先 本当の脅威度 結果 到達階 秒 捕まった回数 倒した数 撃った数 最後の姿 変身解除 再変身 置いた数 催眠の秒数 催眠の最大 発情40超の秒数 拘束の長さ 魔力を削った元
const vm=require('vm'),fs=require('fs');const c={console,Math,Date,JSON};vm.createContext(c);
for(const f of ['util','data','map','text','field','report','game'])vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..','js',f+'.js'),'utf8'),c,{filename:f});
vm.runInContext(`
G.U.setSeed(${process.argv[2]||1});const auto=${process.argv[3]||'true'};
const out=[];
for(let i=0;i<${process.argv[4]||16};i++){
 const s=G.Game.newSave();s.autoDirector=auto;G.Game.morning(s);
 const ri=i%3; G.Game.assign(s,ri,null,null);G.Game.prep(s);const run=G.Game.startDive(s);let T=0;const HY={t:0,max:0,ar:0},HB={t:0,l:[]};
 for(;;){const w=G.Game.makeFloor(run);let t=0;while(!w.outcome&&t<200){if(w.scene)w.scene=null;G.Field.step(w,1/30);t+=1/30;const h=run.h;if(h.hyp>0)HY.t+=1/30;HY.max=Math.max(HY.max,h.hyp||0);if(h.bound){HB.t+=1/30}else if(HB.t>0){HB.l.push(+HB.t.toFixed(1));HB.t=0}if(h.arousal>40)HY.ar+=1/30}T+=t;if(!w.outcome)w.outcome='retreat';if(G.Game.afterFloor(run,w)==='end')break;}
 const ev=run.events;const c=k=>ev.filter(e=>e.kind===k).length;
 out.push([run.dungeon,run.real.level,run.outcome,run.floorReached,Math.round(T),'hold',c('hold'),'kill',c('kill'),'shot',c('shot'),'dodge?',run.h.form,'untr',c('untransform'),'retr',c('retransform'),'place',c('place'),'hypT',Math.round(HY.t),'hypMax',Math.round(HY.max),'arousT',Math.round(HY.ar),'holds',JSON.stringify(HB.l.slice(0,8)),JSON.stringify(Object.fromEntries(Object.entries(run.h.drainLog||{}).map(([k,v])=>[k,Math.round(v)])))].join(' '));
}
console.log(out.join('\\n'));
`,c);
