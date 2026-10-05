const assert=require('node:assert/strict'),{run}=require('../check/common');
const result=run(function(){
 const cases=[];
 for(const hero of ['hikari','haruka'])for(const [kind,skill] of [['melee',null],['melee','spear'],['shot',null],['shot','twin'],['burst',null],['burst','nova'],['flash',null],['flash','flash2'],...(hero==='haruka'?[['iai',null]]:[])]){
  G.U.setSeed(9);const s=G.Game.newSave();G.Game.swapHero(s,hero);G.Game.morning(s);G.Game.assign(s,0,null,null);G.Game.prep(s);
  const r=G.Game.startDive(s),w=G.Game.makeFloor(r),h=r.h;
  h.skills=skill?[skill]:[];w.scene=null;w.monsters=[];w.traps=[];w.fx=[];w.projs=[];w.map.t.fill(0);
  h.x=10;h.y=10;h.mp=100;h.form='magica';h.bound=null;h.zan=1;
  if(kind==='flash')G.F.flash(w);else {h.cast={kind,blade:hero==='haruka',tx:11,ty:10,t:0};G.F.releaseCast(w);}
  cases.push({hero,kind,skill,fx:w.fx.map(f=>f.combatFx),shots:w.projs.map(p=>p.kind),radius:w.fx[0]?.r,mp:h.mp});
 }
 return cases;
},{});
for(const row of result){
 const b=row.hero==='haruka';
 if(row.kind==='melee')assert.equal(row.fx[0],b?(row.skill?'blade-thrust':'blade-slash'):(row.skill?'staff-thrust':'staff-sweep'));
 if(row.kind==='shot'){assert.equal(row.shots.length,row.skill?2:1);assert.ok(row.shots.every(x=>x===(b?'blade':'star')));}
 if(row.kind==='burst')assert.equal(row.fx[0],b?'blade-spin':'light-burst');
 if(row.kind==='flash')assert.equal(row.fx[0],b?'blade-spin':'repel-ring');
 if(row.kind==='iai')assert.deepEqual(row.fx,['blade-iai','blade-spin']);
}
console.log(JSON.stringify({pass:true,cases:result},null,2));
