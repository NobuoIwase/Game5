(()=>{
'use strict';
/* v0.36.0 the stairs open once she finds them; clearing the floor is no longer required.
   Whether she goes down or keeps exploring is her own call, made every couple of seconds:
   - she flees down when she is in trouble: high Nutera, low SP, worn out, still shaking from
     an afterglow, or two or more monsters on her heels (she is a coward, after all)
   - she stays while there is floor left to explore and she is doing fine - chests, experience -
     and a little more on a brave day
   - she goes when the floor is mostly explored or she has been here long enough
   Going down is the old "cleared" state (state.dungeon.pending), so the report at the stairs,
   the walk to the exit and the rest work as before; the "区画制圧" banner and message only
   appear when the floor really was cleared. Monsters left behind stay behind. */
const C={check:1.8,near:320,explore:{min:.5,enough:.82},time:{min:40,max:150},sight:260};
const Vo=()=>window.Game5Voice,M=()=>window.Game5Message;
const L={stairsFound:['か、階段……み、見つけた……ふひ……','あ……し、下に、行ける……'],
 goFlee:['む、むり……い、いったん、下に……に、逃げる……っ','こ、ここ、もう、やだ……お、降りる……っ'],
 goCalm:['こ、この区画は……も、もう、いい、かな……','つ、次……い、行こ……'],
 stay:['ま、まだ……た、宝箱、ある、かも……','も、もうちょっとだけ……み、見てから……']};
if(Vo()?.lines)Object.assign(Vo().lines,L);
const T=()=>window.Game5Terrain,alive=()=>window.Game5MultiEnemy?.alive?.()||[];
function explored(){
 const f=T()?.current?.();if(!f)return 0;let ex=0,fl=0;for(let k=0;k<f.explored.length;k+=2)if(f.grid[k]!==1){fl++;if(f.explored[k])ex++}
 return fl?ex/fl:0;
}
function seesExit(h,r){
 const f=T()?.current?.(),CS=T()?.CS||30,GW=T()?.GW||64;
 const [x,y]=r.exit;const i=Math.floor(y/CS)*GW+Math.floor(x/CS);
 return !!f?.explored?.[i]||Math.hypot(x-h.x,y-h.y)<C.sight;
}
let checkT=0,floorT=0,room0=null,brave=0,said={};
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 const d=state.dungeon;if(!h||!state.started||h.dead||!d?.active)return;
 if(d.room!==room0){room0=d.room;d.stairsFound=false;floorT=0;brave=Math.random()*.2;said={}}
 floorT+=dt;
 const r=window.Game5Dungeon?.room?.();if(!r)return;
 if(!d.stairsFound&&seesExit(h,r)){d.stairsFound=true;M()?.say?.(`${h.name?.replace(/^戦士/,'')||'アリア'}は 下り階段を みつけた。`,'stairs');if(!h.grapple)Vo()?.say?.(h,'stairsFound',{hold:2.2})}
 if(!d.stairsFound||d.pending||h.grapple||h.estella?.active)return;
 checkT-=dt;if(checkT>0)return;checkT=C.check;
 const chasing=alive().filter(e=>e.aware&&Math.hypot(e.x-h.x,e.y-h.y)<C.near).length;
 const trouble=(h.nutera||0)>=65||h.sp<h.maxSp*.4||(h.fatigue||0)>.75||(h.afterglow||0)>0&&(h.nutera||0)>40||chasing>=2;
 const ex=explored(),done=ex>=C.explore.enough+brave||floorT>C.time.max,early=ex<C.explore.min+brave&&floorT<C.time.min+brave*100;
 let go=null;
 if(trouble)go='flee';
 else if(done||!alive().length)go='calm';
 else if(early&&!said.stay){said.stay=true;Vo()?.say?.(h,'stay',{hold:2.2})}
 if(!go)return;
 d.pending=true;d.clearT=0;d.leftAlive=alive().length;
 if(state.enemy)state.enemy.cast=null;
 Vo()?.say?.(h,go==='flee'?'goFlee':'goCalm',{force:true,hold:2.4});
 M()?.say?.(go==='flee'?'アリアは 階段へ 逃げだした！':'アリアは 階段へ むかうことにした。','godown');
};
/* she does not stop to rest on the way down while something is after her */
const baseDecide=decideHero;
decideHero=function(h,dt){
 const d=state.dungeon;
 if(d?.pending&&alive().some(e=>e.aware&&Math.hypot(e.x-h.x,e.y-h.y)<C.near))h.restT=Math.max(h.restT||0,99);
 return baseDecide(h,dt);
};
const baseReset=reset;reset=function(){const r=baseReset();room0=null;return r};
window.Game5Stairs={version:'0.36.0',cfg:C,explored};
})();
