// Exercise actual attack release paths; effects must be emitted at release/hit.
const assert = require('node:assert/strict');
const {run} = require('../check/common');
const result = run(function () {
  const all=[];
  for(const [kind,skill] of [['melee',null],['melee','spear'],['shot',null],['shot','twin'],['burst',null],['burst','nova'],['flash',null],['flash','flash2']]){
    G.U.setSeed(9);const s=G.Game.newSave();G.Game.morning(s);G.Game.assign(s,0,null,null);G.Game.prep(s);
    const r=G.Game.startDive(s),w=G.Game.makeFloor(r),h=r.h;
    h.skills=skill?[skill]:[];w.scene=null;w.monsters=[];w.traps=[];w.fx=[];w.projs=[];
    w.map.t.fill(0);h.x=10;h.y=10;h.mp=100;h.form='magica';h.bound=null;
    if(kind==='flash')G.F.flash(w);
    else {h.cast={kind,tx:11,ty:10,t:0};G.F.releaseCast(w);}
    all.push({kind,skill,fx:w.fx.map(f=>f.combatFx),shots:w.projs.length,radius:w.fx[0]?.r,mp:h.mp});
  }
  return all;
},{});
assert.equal(result[0].fx[0],'staff-sweep');assert.equal(result[1].fx[0],'staff-thrust');
assert.equal(result[2].shots,1);assert.equal(result[3].shots,2);
assert.equal(result[4].fx[0],'light-burst');assert.equal(result[5].fx[0],'light-burst');
assert.ok(result[5].radius>result[4].radius);
assert.equal(result[6].fx[0],'repel-ring');assert.equal(result[7].fx[0],'repel-ring');
assert.ok(result[7].radius>result[6].radius);
console.log(JSON.stringify({pass:true,cases:result},null,2));
