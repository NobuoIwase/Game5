(()=>{
'use strict';
/* v0.28.0 好き堕ち (profile: 魅了 - a "like" that grows against her will, in levels:
   ドキッ -> キュン -> 弄られるだけで幸せ; the lower the monster, the better).
   The more often one kind of monster has held her - in this run, and in earlier runs through the
   body memory - the further she falls for it. Each level:
   - raises her charm toward its family to that level, so the old charm effects apply: slower
     reactions to it, less running away at high Nutera, reaching toward it when the Lumane wave
     peaks, and the pink tethers from her to it
   - makes her hesitate to cut it: the swing is abandoned before it starts
   - changes what she says when she sees it, and when a new level is reached
   The record keeps the level and the title; she denies all of it. */
const C={need:[3,5,8],lifetime:.25,hesitate:[0,.12,.22,.34],hesitateCd:1.1};
const NAMES=['','ドキッ','キュン','弄られるだけで幸せ'];
const L={
 charmUp1:['……さ、さっきから、あいつのこと、ばっかり……か、考えて、ない……','……な、なんで、あいつの、動き……め、目で、追って……っ'],
 charmUp2:['……な、なんで、胸……きゅって……ち、ちが……','……つ、次、いつ、来るんだろ……ち、ちが、警戒、してる、だけ……'],
 charmUp3:['……ふ、ふひ……ま、また、捕まえて、ほしい……ち、ちが、今のは……ぜったい、ちが……','……あ、あいつに、触られるの……い、いや、じゃ……ち、ちがう、いやに、決まって……っ'],
 charmSpot1:['……っ、ま、また、あいつ……な、なんで、ちょっと、ほっとして……','……ひ、ひっ……い、いた……よ、よかっ……ち、ちが……'],
 charmSpot2:['……き、来た……ち、ちが、待ってない……っ','……こ、こっち、来る……？ ふ、ふひ……ち、ちが……'],
 charmSpot3:['……ふ、ふひ……み、見つけて、くれた……','……ま、待って、た……ち、ちが……ちがく、ない……っ'],
 charmHesitate1:['……っ、い、今の、なし……ね、狙い、ずれた、だけ……','……あ、あれ……？ き、斬る、つもり、だった……のに……'],
 charmHesitate2:['……な、なんで……き、斬りたく、ない……ち、ちが……','……だ、だめ……け、剣が、上がら、ない……っ'],
 charmHesitate3:['……ふ、ふひ……き、斬れない、よ……だ、だって……ち、ちがう、今のは……っ','……ご、ごめん、ね……ち、ちが、なんで、謝って……っ']
};
const V=()=>window.Game5Voice;
if(V()?.lines)Object.assign(V().lines,L);
if(V()?.strong)for(const k of Object.keys(L))V().strong.add(k);
const alive=()=>window.Game5MultiEnemy?.alive?.()||[];
const PROF=()=>window.Game5Monsters?.profiles||{};

/* lifetime holds per species, read at the start of each run (the heat module keeps adding to it) */
let life={};
function readLife(){try{life=JSON.parse(localStorage.getItem('game5.bodyMemory')||'{}').held||{}}catch(_){life={}}}
readLife();
const baseReset=reset;reset=function(){const r=baseReset();readLife();const h=state.hero;if(h){h._suki={};h._sukiRec=null}return r};

function familyOf(t){const e=alive().find(o=>o.type===t);return e?.family||PROF()[t]?.family||t}
function nameOf(t){const e=alive().find(o=>o.type===t);return e?.name||PROF()[t]?.name||t}
/* level per species: holds this run + a quarter of the lifetime holds */
function level(h,t){const s=(h.heldBy?.[t]||0)+(life[t]||0)*C.lifetime;return s>=C.need[2]?3:s>=C.need[1]?2:s>=C.need[0]?1:0}
function levelFor(h,e){return e?.type?level(h,e.type):0}

let lastShown=null;
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h||!state.started)return;
 h._suki||={};
 // a new level for some species
 for(const t of Object.keys(h.heldBy||{})){
  const lv=level(h,t),was=h._suki[t]||0;
  if(lv>was){h._suki[t]=lv;
   const nm=nameOf(t);(h._sukiRec||={})[t]=lv;
   if(!h.dead&&!h.estella?.active)V()?.say?.(h,'charmUp'+lv,{force:true,hold:3});
   addFx('text',h.x,h.y-120,`${nm}に……${NAMES[lv]}`,'#ffb0dc',1.8);
   log(`アリアの中で、${nm}への気持ちが「${NAMES[lv]}」になった。本人は否定している。`);
   window.Game5Heat?.title?.(h,lv===1?`${nm}を目で追ってしまう戦士`:lv===2?`${nm}を待ってしまう前衛`:`${nm}に心まで覚えられた戦士`);
  }
 }
 // hold the charm track of each family at its level
 for(const [t,lv] of Object.entries(h._suki)){if(!lv)continue;const f=familyOf(t);h.charms||={};const tr=h.charms[f]||(h.charms[f]={value:0,lastGain:-99});tr.value=Math.max(tr.value||0,lv*100+5)}
 // she just said a "spotted it" line: if it was one she has fallen for, say this instead
 if(h._voiceShown!==lastShown){
  lastShown=h._voiceShown;
  if(h._voiceKey==='spot'){
   const near=alive().filter(o=>o.aware).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0],lv=levelFor(h,near);
   if(lv>0){V()?.say?.(h,'charmSpot'+lv,{force:true,hold:2.4});lastShown=h._voiceShown}
  }
 }
};
/* she abandons a swing at one she has fallen for */
const baseStart=startHeroSkill;
startHeroSkill=function(slot,reason=''){
 const h=typeof activeHero==='function'?activeHero():state.hero,e=state.enemy,sk=h?.skills?.[slot];
 if(h&&e&&sk&&slot!==2&&['melee','bash','heavy'].includes(sk.kind)){
  if(state.time<(h._hesitateT||0))return false;
  const lv=levelFor(h,e);
  if(lv>0&&Math.random()<C.hesitate[lv]){
   h._hesitateT=state.time+C.hesitateCd;h.hesitations=(h.hesitations||0)+1;
   V()?.say?.(h,'charmHesitate'+lv,{force:true,hold:2.2});
   addFx('text',h.x,h.y-96,'……ためらった','#ffb0dc',.9);
   window.Game5Heat?.title?.(h,`${e.name}を斬れなかった戦士`);
   return false;
  }
 }
 return baseStart(slot,reason);
};
window.Game5Charm={version:'0.28.0',cfg:C,names:NAMES,level,levelFor};
})();
