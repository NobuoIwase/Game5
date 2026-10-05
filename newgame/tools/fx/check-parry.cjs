const assert=require('node:assert/strict'),{run}=require('../check/common');
const result=run(function(){
 G.U.setSeed(31);const s=G.Game.newSave();G.Game.swapHero(s,'haruka');G.Game.morning(s);G.Game.assign(s,0,null,null);G.Game.prep(s);
 const r=G.Game.startDive(s),w=G.Game.makeFloor(r),h=r.h;
 w.scene=null;w.monsters=[];w.traps=[];w.fx=[];w.map.t.fill(0);
 Object.assign(h,{x:10,y:10,a:0,form:'magica',bound:null,skills:[],zan:1,arousal:0,hyp:0,numb:0,will:100,mp:100,sleep:0,trance:0,freeze:0,glue:0,cast:null});
 const id=Object.keys(G.MONSTERS).find(k=>G.MONSTERS[k].spd>0&&G.MONSTERS[k].atk.kind==='grab');
 const m=G.F.spawnMonster(w,id,10.8,10,false);m.hp=m.maxHp=10000;
 let success=false;for(let n=0;n<20&&!success;n++){h.parryCd=0;success=G.F.bladeParry(w,m);}
 const parryFx=w.fx.map(f=>f.combatFx);w.fx=[];
 const hp=m.hp;h.cast={kind:'melee',blade:true,tx:m.x,ty:m.y,t:0};G.F.releaseCast(w);
 const damage=hp-m.hp,riposteFx=w.fx.map(f=>f.combatFx),consumed=h.riposte===null;
 h.parryCd=0;m.x=9;w.fx=[];const back=G.F.bladeParry(w,m);
 return {success,parryFx,damage,riposteFx,consumed,back,backFx:w.fx.length};
},{});
assert.ok(result.success&&result.parryFx.includes('blade-parry'));
assert.ok(result.riposteFx.includes('blade-iai')&&result.consumed);
assert.ok(Math.abs(result.damage-12*1.8)<0.0001);
assert.equal(result.back,false);assert.equal(result.backFx,0);
console.log(JSON.stringify({pass:true,...result},null,2));
