(()=>{
'use strict';
/* v0.37.0 climaxes that pile up and leave marks.
   - chain: an Estella that starts within 10s of the last one ends is the next in a chain. If
     she is still held when one ends, her Nutera does not fall back and the after-Estella numbness
     is skipped, so the next comes quickly. The count shows ("連続絶頂 ×3"), the narration and
     her voice follow it, and from the third her legs splay (gani-mata) and her knees and hips
     shake (the pose itself is in warrior-motion-extra.js, read from h.chainN)
   - convulsions you can see: during Estella her whole body jerks every half second or so - a
     jolt in the sprite, a small screen shake, a "びくんっ" - and harder in a chain
   - the cost: every Estella lowers her maximum SP for the rest of this run (8% of it, to at most
     40% off); each new floor gives a little back (3%)
   - charmed monsters: the hearts toward a monster she has fallen for only show while she can see
     it, and the moment it comes into view she jumps ("ドキッ") */
const C={chainGap:10,heldNutera:[55,7,80],spasm:[.45,.8],maxPen:.25,perEst:.05,perFloor:.05,sight:360};
const Vo=()=>window.Game5Voice,M=()=>window.Game5Message,N=h=>h?.name?.replace(/^戦士/,'')||'アリア';
const L={
 chain2:['ま、また……っ、ま、まだ、おわ、って……な……っ、——〜〜っ♡','や、……っ、いま、……い、いったばっか、……ぁ、ぁあ……っ♡'],
 chain3:['〜〜〜っ♡♡ ……ぁ、……あし、……とまら、な……っ♡','——っ、……っ♡！ ……ぁ、……ぁ、……♡♡'],
 chainEnd:['……ぁ……っ、……は、……ぁ……♡ ……な、なんかい、め……？','……っ……ふ、ふひ……も、もう……か、かぞえ、られ、ない……']
};
if(Vo()?.lines)Object.assign(Vo().lines,L);
if(Vo()?.strong)for(const k of Object.keys(L))Vo().strong.add(k);
const NARR={2:[`間を置かずに、二度目の波が来た——`,`${'アリア'}の身体は、まだ一度目の痙攣が引いていない。`],
 3:[`三度目。脚が勝手に開いて、がくがくと震えている。`,`腰が、自分の意思と関係なく跳ねつづける。`],
 4:[`もう何度目か分からない。数える声すら出ていない。`,`開いた脚の間から、熱いものがぱたぱたと落ちる。`]};
let est0=false,lastEnd=-99,room0=null,spasmT=0;
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h||!state.started)return;
 const est=!!h.estella?.active,t=state.time;
 // ---- chain ----
 if(est&&!est0){
  h.chainN=t-lastEnd<C.chainGap?(h.chainN||1)+1:1;h.maxChain=Math.max(h.maxChain||0,h.chainN);
  if(h.chainN>=2){
   addFx('text',h.x,h.y-120,`連続絶頂 ×${h.chainN}`,'#ff8fd0',1.6);
   window.Game5FX?.shake?.(5+h.chainN);
   const nk=Math.min(4,h.chainN);M()?.say?.(NARR[nk][0],null);setTimeout?.(()=>M()?.say?.(NARR[nk][1],null),1400);
   Vo()?.say?.(h,h.chainN>=3?'chain3':'chain2',{force:true,hold:2.4});
   if(h.chainN===3)window.Game5Heat?.title?.(h,'三度つづけて果てた戦士');
  }
  // the cost: her maximum SP
  h.spPen=Math.min(C.maxPen,(h.spPen||0)+C.perEst);
  M()?.say?.(`${N(h)}の 最大SPが 下がった……（本来の ${Math.round((1-h.spPen)*100)}%）`,'sppen',1);
 }
 if(!est&&est0){
  lastEnd=t;
  if(h.grapple&&!h.dead){const [b,per,cap]=C.heldNutera;h.nutera=Math.max(h.nutera,Math.min(cap,b+per*(h.chainN||1)));h.afterEstellaT=0}   // still held: it keeps coming
  if((h.chainN||1)>=2)Vo()?.say?.(h,'chainEnd',{force:true,hold:3});
 }
 if(!est&&t-lastEnd>C.chainGap)h.chainN=0;
 est0=est;
 // ---- the maximum SP penalty, with a little back on each floor ----
 const room=state.dungeon?.room;
 if(room!==room0){if(room0!=null&&h.spPen>0)h.spPen=Math.max(0,h.spPen-C.perFloor);room0=room}
 if(h._spApplied!==h.maxSp)h._spBase=h.maxSp;          // someone else (a level up) changed it
 h._spBase??=h.maxSp;
 const want=Math.round(h._spBase*(1-(h.spPen||0)));
 if(h.maxSp!==want){h.maxSp=want;h.sp=Math.min(h.sp,want)}
 h._spApplied=h.maxSp;
 // ---- convulsions ----
 if(est){spasmT-=dt;if(spasmT<=0){const ch=h.chainN||1;spasmT=C.spasm[0]+Math.random()*(C.spasm[1]-C.spasm[0])-Math.min(.2,ch*.05);h._spasm=1;
   window.Game5FX?.shake?.(2+Math.min(4,ch));addFx('text',h.x+(Math.random()-.5)*30,h.y-70,Math.random()<.5?'びくんっ':'びくっ','#ffc2e6',.6)}}
 h._spasm=Math.max(0,(h._spasm||0)-dt*5);
 // ---- charmed monsters come into view ----
 const CH=window.Game5Charm;
 if(CH)for(const e of window.Game5MultiEnemy?.alive?.()||[]){
  const lv=CH.levelFor(h,e);if(!lv){e._inView=false;continue}
  const v=visible(h,e);
  if(v&&!e._inView&&!h.grapple&&!est){
   Vo()?.say?.(h,'charmSpot'+lv,{force:true,hold:2.2});
   addFx('text',h.x,h.y-100,'ドキッ','#ff9ad3',.9);
   const NF=window.Game5NuteraFX;for(let k=0;k<5;k++)NF?.emit?.(h.x,h.y-50,{ang:Math.atan2(e.y-h.y,e.x-h.x)+(Math.random()-.5)*.6,speed:120+Math.random()*60,kind:'pink',size:10});
  }
  e._inView=v;
 }
};
function visible(h,e){return Math.hypot(e.x-h.x,e.y-h.y)<C.sight&&!(window.Game5AI?.wallBetween?.(e,h))}
/* convulsions make her whole body jolt */
const HEAT=window.Game5Heat;
if(HEAT?.jitter){const j0=HEAT.jitter;HEAT.jitter=function(h){const j=j0(h)||{x:0,y:0},s=h?._spasm||0;if(!s)return j0(h);return{x:j.x+Math.sin(state.time*90)*3*s,y:j.y-5*s}}}
const baseReset=reset;reset=function(){const r=baseReset();const h=state.hero;if(h){h.spPen=0;h.chainN=0;h.maxChain=0;h._spBase=null;h._spApplied=null}room0=null;lastEnd=-99;return r};
window.Game5Climax={version:'0.37.0',cfg:C,visible};
})();
