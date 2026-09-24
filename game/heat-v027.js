(()=>{
'use strict';
/* v0.27.0 heat: the Nutera side of the game, made to linger.
   Built on docs/kink-profile-integrated.md: the point is the resistance giving way by degrees,
   effects that carry over ("what happened earlier is still in her body"), monsters she has
   met before getting different reactions, and the run ending in numbers, a title, a cold
   outside assessment and her own excuse.
   - close-up: the camera eases in while she is held (x1.4) and during Estella (x1.6);
     Estella starts in slow motion
   - body: a pink heat haze around her once Nutera passes 35%, breath clouds from 50%, and she
     trembles (more when held, most in Estella)
   - afterglow: after a hold or an Estella her legs stay unsteady for a while (slower, shaking),
     Nutera drains away more slowly, and she mutters about it
   - memory: every species keeps count of how often it has held her; the second time and from
     the third time on her reactions change, and from the third its specials land harder
   - record: grabs, specials taken (and which one most), holds broken vs. waited out, Estella,
     the species that held her most, a title (a good word against a bad one), an assessment
     in a cold observer's voice and her own self-assessment, on the result screen */
const C={
 zoom:{hold:1.7,estella:2,after:1.15},
 slow:{t:.7,k:.32},
 after:{hold:6,free:3.5,estella:10,speed:.86,keepNutera:.35},
 knownMul:1.1,
 aura:.35,breath:.5
};
const alive=()=>window.Game5MultiEnemy?.alive?.()||[];
const nameOf=t=>t==='snare'?'影の手':(window.Game5Monsters?.profiles?.[t]?.name||t);

/* ---------------- memory across runs (browser storage) ----------------
   how often each species has held her in all runs, and how many Estellas: shown on the start
   card, and a species that has held her often enough is "known" from the first grab */
const MK='game5.bodyMemory';
function mem(){try{return JSON.parse(localStorage.getItem(MK)||'{}')}catch(_){return{}}}
function memSave(m){try{localStorage.setItem(MK,JSON.stringify(m))}catch(_){}}
function memAdd(type){const m=mem();m.held||={};m.held[type]=(m.held[type]||0)+1;memSave(m)}
function memEstella(){const m=mem();m.estella=(m.estella||0)+1;memSave(m)}
function memCard(){
 const m=mem(),list=Object.entries(m.held||{}).sort((a,b)=>b[1]-a[1]).slice(0,3);
 const card=document.querySelector('#startOverlay .card');if(!card)return;
 let el=document.getElementById('bodyMemory');if(!list.length&&!m.estella){el?.remove();return}
 if(!el){el=document.createElement('p');el.id='bodyMemory';el.className='bodyMemory';card.insertBefore(el,document.getElementById('startBtn'))}
 el.innerHTML=`<small>身体の記憶</small>${list.map(([t,n])=>`${nameOf(t)} ${n}回`).join('・')}${m.estella?`／エステラ 通算${m.estella}回`:''}`;
}
try{setTimeout(()=>{try{memCard()}catch(_){}},1500)}catch(_){}

/* ---------------- per-run record ---------------- */
let R;
function fresh(){R={grabs:0,specials:0,free:0,waited:0,estella:0,edge:0,edgePulls:0,lost:0,lostBy:{},trance:0,watched:0,maxWatch:0,held:0,byType:{},special:{},maxNut:0,holdLen:[],titles:[],floor:null}}
function floorFresh(room){R.floor={room,grabs:0,specials:0,estella:0,edge:0,pulls:0,lost:0,lostBy:{},byType:{},special:{}}}
fresh();
const baseReset=reset;reset=function(){fresh();slowT=0;try{setTimeout(()=>{try{memCard()}catch(_){}},50)}catch(_){}if(typeof Q!=='undefined')Q.length=0;return baseReset()};

/* ---------------- slow motion ---------------- */
let slowT=0;
const baseUpdate=update;
update=function(dt){if(slowT>0){slowT-=dt;dt*=C.slow.k}return baseUpdate(dt)};

/* ---------------- memory: harder specials from a species that knows her ---------------- */
const baseNut=applyNutera;
applyNutera=function(h,base,meta={}){
 const t=h?.grapple?.e?.type;
 if(meta.grapple&&t&&(h.heldBy?.[t]||0)>=3)meta={...meta,mult:(meta.mult||1)*C.knownMul};
 return baseNut(h,base,meta);
};

/* ---------------- tracking ---------------- */
const baseHero=updateHero;
updateHero=function(h,dt){
 const g0=h?.grapple,sp0=g0?.specials||0,n0=h?.nutera||0,est0=!!h?._heatEst;
 // afterglow: legs unsteady -> slower (applied once per intent, like the other modifiers)
 if(h?.afterglow>0&&h.intent?.kind==='move'&&h.intent.label!=='回避'&&!h.intent._after){h.intent._after=true;h.intent.speed*=C.after.speed}
 baseHero(h,dt);
 if(!h||!state.started)return;
 const g=h.grapple;
 // a new hold
 if(g&&g!==h._heatG){
  const t=g.e?.type||'snare';h.heldBy||={};h.heldBy[t]=(h.heldBy[t]||0)+1;
  const life=(mem().held||{})[t]||0;h._grabRepeat=Math.max(h.heldBy[t],life>=8?3:life>=3?2:1);memAdd(t);
  R.grabs++;R.byType[t]=(R.byType[t]||0)+1;g._t0=state.time;
  if(R.floor){R.floor.grabs++;R.floor.byType[t]=(R.floor.byType[t]||0)+1}
  if(h.heldBy[t]===3)title(h,`${nameOf(t)}に覚えられた戦士`);
 }
 if(g){const wn=(window.Game5MultiEnemy?.alive?.()||[]).filter(o=>o.aware&&!o.grappling&&Math.hypot(o.x-h.x,o.y-h.y)<170).length;
  if(wn&&!g._watchCounted){g._watchCounted=true;R.watched++}R.maxWatch=Math.max(R.maxWatch,wn);if(wn>=2)title(h,'衆目の中で抗った戦士')}
 if(g){R.held+=dt;if(g.specials>sp0){R.specials++;const s=h._lastSpecial;if(s){R.special[s]=(R.special[s]||0)+1;(g._sp||={})[s]=(g._sp[s]||0)+1}if(R.floor){R.floor.specials++;if(s)R.floor.special[s]=(R.floor.special[s]||0)+1}}}
 // a hold that ended
 if(h._heatG&&!g){
  const len=state.time-(h._heatG._t0||state.time);R.holdLen.push(len);
  const freed=h._lastRelease==='free';if(freed)R.free++;else R.waited++;
  // v0.27 hypnosis: a hold in which she was hypnotised is one she does not remember
  const hg=h._heatG;
  if((hg.hypno||0)>=1){const t=hg.e?.type||'snare';R.lost++;R.lostBy[t]=(R.lostBy[t]||0)+1;if(R.floor){R.floor.lost++;R.floor.lostBy[t]=(R.floor.lostBy[t]||0)+1;for(const [k,v] of Object.entries(hg._sp||{})){R.floor.special[k]=Math.max(0,(R.floor.special[k]||0)-v);R.floor.specials=Math.max(0,R.floor.specials-v)}}
   if((hg.hypno||0)>=2){h._trance={left:(h._trance?.left||0)+1,next:rnd(9,18),t:0}}}
  if(h._lastRelease==='edge'){R.edge++;if(R.floor)R.floor.edge++;if(R.edge===1)title(h,'剣を握ったまま、腰で追った戦士');if(R.edge===3)title(h,'寸止めを三度数えた前衛')}
  h.afterglow=Math.max(h.afterglow||0,freed?C.after.free:C.after.hold);h.afterMax=h.afterglow;
 }
 h._heatG=g||null;
 // Estella
 const est=!!h.estella?.active;
 if(est&&!est0){R.estella++;memEstella();slowT=C.slow.t;h._estellaAt=state.time;if(R.floor)R.floor.estella++;
  if(R.estella===1)title(h,'声を殺せなかった戦士');if(R.estella===3)title(h,'エステラを重ねた前衛')}
 if(!est&&est0){h.afterglow=Math.max(h.afterglow||0,C.after.estella);h.afterMax=h.afterglow}
 h._heatEst=est;
 // afterglow: Nutera drains away more slowly, she mutters now and then
 if(h.afterglow>0){
  h.afterglow=Math.max(0,h.afterglow-dt);
  if(h.nutera<n0&&!est)h.nutera+=(n0-h.nutera)*C.after.keepNutera;
  if(!g&&!est&&Math.random()<dt*.22)h._voiceEvent||='afterglow';
 }
 R.maxNut=Math.max(R.maxNut,h.nutera||0);
 if((h.edgePulls||0)>(h._heatPulls||0)){const d=h.edgePulls-(h._heatPulls||0);R.edgePulls+=d;if(R.floor)R.floor.pulls+=d}h._heatPulls=h.edgePulls||0;
 // floors: start a tally, and when one is cleared she reports on it
 const room=state.dungeon?.room;
 if(!R.floor||R.floor.room!==room)floorFresh(room);
 if(state.dungeon?.pending&&!R.floor.reported){R.floor.reported=true;report(h,R.floor)}
 speakQueue(h);
 trance(h,dt);
 // the stairs wait for the end of her report (see decideHero below)
 const dd=state.dungeon;if(dd?.pending&&Q.some(q=>typeof q==='string')&&state.time-(h._reportT0??state.time)<14){h._reportT0??=state.time;dd.clearT=0}
 // close-up
 window.Game5Camera?.wantZoom?.(h.dead?1:est?C.zoom.estella:g?C.zoom.hold:h.afterglow>0?C.zoom.after:1);
};
/* ---------------- titles earned during the run ---------------- */
function title(h,name){
 if(R.titles.includes(name))return;R.titles.push(name);
 addFx('text',h.x,h.y-140,`称号「${name}」`,'#ffc2e6',2.2);log(`称号「${name}」が記録された。`);
}
/* ---------------- her report on a cleared floor ----------------
   Profile 3B-5: she reports, then corrects herself, and the correction is worse than the
   report. Only floors where something happened get one. */
const Q=[];
function report(h,F){
 if(!F.grabs&&!F.estella)return;
 const lostTop=top(F.lostBy);
 const truth=F.lost?{log:`（記録）第${(F.room??0)+1}区画では、ほかに${nameOf(lostTop[0])}に${F.lost}回捕まっている。本人は覚えていない。`}:null;
 const said=F.grabs-F.lost;
 if(said<=0&&!F.estella){Q.push(`……だ、第${(F.room??0)+1}区画は……な、何も、なかった……と、思う……。……た、たぶん……`);if(truth)Q.push(truth);return}
 F={...F,grabs:said,byType:Object.fromEntries(Object.entries(F.byType).map(([k,v])=>[k,v-(F.lostBy[k]||0)]).filter(([,v])=>v>0))};
 const edgeLines=[];
 if(F.edge){edgeLines.push('……さ、最後、の……は、は、離された、だけ……お、追いかけて、ない……ぜ、ぜったい……');if(F.pulls)edgeLines.push(`……っ、……い、${F.pulls>1?`${F.pulls}歩`:'一歩'}、だけ……です……あ、脚が、勝手に……`)}
 const n=(F.room??0)+1,tt=top(F.byType),ts=top(F.special),name=tt?nameOf(tt[0]):'',c=tt?tt[1]:0;
 const cnt=k=>k===1?'い、一回':k===2?'に、二回':`${k}回`;
 // she understates first, then owns up to the real number
 Q.push(`……だ、第${n}区画は……${name}に、${cnt(F.grabs>1?F.grabs-1:1)}……つ、捕まった、だけ……`);
 if(F.grabs>1)Q.push(`……ち、ちが……ほ、ほんとは、${cnt(F.grabs)}……です……${Object.keys(F.byType).length>1?'ほ、ほかのにも……':''}`);
 if(ts&&F.specials>=3)Q.push(`……「${ts[0]}」は……お、覚えて、ない……${F.specials>=6?'な、何回も、されたけど……っ':'ぜ、ぜんぜん……'}`);
 Q.push(...edgeLines);
 if(F.estella)Q.push(F.estella>1?`……エ、エステラ、は……${F.estella}回……い、言わせないで……っ`:'……エ、エステラ、は……し、してない……い、一回……だけ……');
 Q.push(F.grabs>=3||F.estella?'……つ、次は、捕まらない、から……ふ、ふひ……':'……だ、大丈夫……ぜんぜん、平気、だった、し……');
 if(truth)Q.push(truth);
}
function speakQueue(h){
 if(!Q.length||h.dead||h.grapple||h.estella?.active||h._trance?.t>0)return;
 if(state.time<(h._voiceHold||0))return;
 const l=Q.shift();
 if(l?.log){log(l.log);addFx('text',h.x,h.y-140,l.log,'#d4b8ff',3.4);h._voiceHold=state.time+1.2;return}
 h.thought=h._voiceShown=l;h._voiceHold=state.time+3.2;h._voiceKey='report';
}
/* she stops at the stairs until she has finished her report on the floor (at most 14s), so it
   does not run on into the next floor's lines */
const baseDecide=decideHero;
decideHero=function(h,dt){
 const it=baseDecide(h,dt),d=state.dungeon,r=window.Game5Dungeon?.room?.();
 if(!d?.pending){h._reportT0=null;return it}
 if(r?.exit&&Q.some(q=>typeof q==='string')&&Math.hypot(h.x-r.exit[0],h.y-r.exit[1])<90){
  h._reportT0??=state.time;
  if(state.time-h._reportT0<14){h.intent={kind:'hold',x:0,y:0,label:'報告'};return h.intent}
 }
 return it;
};
/* v0.27 trance: after being hypnotised hard in a hold, at some quiet moment later she stops,
   answers someone who is not there, and comes back without knowing it happened */
function trance(h,dt){
 const T=h._trance;if(!T||h.dead)return;
 if(T.t>0){T.t-=dt;h.status.stun=Math.max(h.status.stun||0,Math.min(.2,T.t));if(T.t<=0){h._voiceEvent='tranceOut';if(--T.left<=0)h._trance=null;else T.next=rnd(12,22)}return}
 if(h.grapple||h.estella?.active||h.cast)return;
 T.next-=dt;if(T.next>0)return;
 const near=(window.Game5MultiEnemy?.alive?.()||[]).some(e=>Math.hypot(e.x-h.x,e.y-h.y)<130);
 if(near){T.next=2;return}
 T.t=1.8;h.status.stun=Math.max(h.status.stun||0,.2);h._voiceEvent='tranceIn';R.trance++;
 window.Game5NuteraFX?.ring?.(h.x,h.y-60,6,60,.9,'#c9a6ff',2);
 log('数秒、彼女は立ったまま動かなかった。何かに答えたように見えた。本人は覚えていない。');
 if(R.trance===1)title(h,'覚えていない声に頷いた戦士');
}

/* ---------------- her body: trembling, heat haze, breath ---------------- */
function jitter(h){
 if(!state.started||h.dead)return null;
 const n=(h.nutera||0)/100,t=state.time;
 let a=0;
 if(h.estella?.active)a=2.4;else if(h.grapple)a=1.3+n;else if(h.afterglow>0)a=.6+1.4*(h.afterglow/(h.afterMax||1));
 if(n>.6)a=Math.max(a,(n-.6)*2.5);
 if(a<=0)return null;
 return{x:Math.sin(t*41)*a*.6+Math.sin(t*17)*a*.4,y:Math.sin(t*29+1)*a*.25};
}
const puffs=[];
function haze(h){
 const n=(h.nutera||0)/100;if(n<C.aura&&!(h.afterglow>0))return;
 const k=Math.max(n-C.aura,h.afterglow>0?.18:0),t=state.time,r=46+10*Math.sin(t*3);
 const g=ctx.createRadialGradient(h.x,h.y-36,6,h.x,h.y-36,r);
 g.addColorStop(0,`rgba(255,120,190,${.22*k+.04})`);g.addColorStop(1,'rgba(255,120,190,0)');
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(h.x,h.y-36,r,r*1.25,0,0,TAU);ctx.fill();ctx.restore();
}
function breath(h,dt){
 const n=(h.nutera||0)/100,on=n>C.breath||h.afterglow>0||h.grapple||h.estella?.active;
 if(on&&!h.dead&&Math.random()<dt*(1.2+n*1.8)){
  const side=['left','up_left','down_left'].includes(h.dir)?-1:1;
  puffs.push({x:h.x+side*10,y:h.y-74,vx:side*(10+Math.random()*8),vy:-14-Math.random()*8,t:1,s:5+Math.random()*4});
 }
 for(const p of puffs){p.t-=dt*.9;p.x+=p.vx*dt;p.y+=p.vy*dt;p.s+=dt*9}
 while(puffs.length&&puffs[0].t<=0)puffs.shift();
 ctx.save();
 for(const p of puffs){ctx.globalAlpha=Math.max(0,p.t)*.45;ctx.fillStyle=n>.8?'#ffd6ee':'#f4eef2';ctx.beginPath();ctx.ellipse(p.x,p.y,p.s,p.s*.7,0,0,TAU);ctx.fill()}
 ctx.restore();
}
let lastT=performance.now();
const G=window.Game5Graphics;
if(G){
 const under=G.drawHazardsUnder;G.drawHazardsUnder=function(){under?.();const h=state.hero;if(h&&state.started)haze(h)};
 const over=G.drawHazardsOver;G.drawHazardsOver=function(){over?.();const h=state.hero,now=performance.now(),dt=Math.min(.1,(now-lastT)/1000);lastT=now;if(h&&state.started)breath(h,dt)};
}

/* ---------------- the record ---------------- */
function top(o){return Object.entries(o).sort((a,b)=>b[1]-a[1])[0]||null}
function record(win){
 const h=state.hero,d=state.dungeon,n=window.Game5Dungeon?.rooms?.length||7,cleared=d?.complete?n:(d?.room||0);
 const tt=top(R.byType),ts=top(R.special),name=tt?nameOf(tt[0]):null;
 const good=cleared>=n?'最奥まで降りた':cleared>=5?'深層に届いた':cleared>=3?'中層まで進んだ':'入口で足踏みした';
 const bad=R.estella>=3?'エステラを重ねた前衛':tt&&tt[1]>=3?`${name}に覚えられた戦士`:R.grabs>=6?'捕まりやすい前衛':R.estella>=1?'声を殺せなかった戦士':R.grabs>=1?'まだ抗える戦士':'誰にも触れさせなかった戦士';
 const L=R.holdLen,grow=L.length>=3&&L.slice(-2).reduce((a,b)=>a+b,0)/2>L.slice(0,2).reduce((a,b)=>a+b,0)/2*1.2;
 const review=[];
 if(!R.grabs)review.push('一度も捕まらなかった。記録すべきことが何もないのは、この記録の中では珍しい。');
 else{
  if(tt&&tt[1]>=2)review.push(`${name}に${tt[1]}回捕まっている。${tt[1]>=3?'回を重ねるごとに、相手のほうが扱いに慣れていった。':'二度目は、一度目より声が早かった。'}`);
  const still=h?.grapple?1:0;
  review.push(`振りほどけたのは${R.grabs}回中${R.free}回。${R.waited?`${R.waited}回は、相手が離れるまでそのままだった。`:still?'':'すべて自力で抜けている。'}${still?'最後の1回は、捕まったまま終わっている。':''}`);
  if(grow)review.push('捕まるたびに、抜け出すまでの時間が延びていった。本人は気づいていない。');
  if(ts)review.push(`受けた特殊攻撃は${R.specials}回。いちばん多かったのは「${ts[0]}」。`);
 }
 const suki=Object.entries(h?._sukiRec||{}).sort((a,b)=>b[1]-a[1])[0],SN=window.Game5Charm?.names||[];
 if(suki)review.push(`${nameOf(suki[0])}には「${SN[suki[1]]}」まで落ちている。本人は「ちがう」と言っている。${h.hesitations?`斬りかけて剣を止めたのが${h.hesitations}回。`:''}`);
 if(h?.attachTotal)review.push(`吸着羽虫の類に${h.attachTotal}回吸い付かれ、そのまま${(h.attachWorn||0).toFixed(0)}秒歩いている。${(h.attachWorn||0)>20?'途中から、取ろうとする手つきが遅くなった。':''}`);
 if(R.watched)review.push(`捕まっている間、ほかの魔物が手を出さずに見物していたことが${R.watched}回。${R.maxWatch>=2?`多いときは${R.maxWatch}体が彼女を囲んでいた。`:''}`);
 if(R.lost){const lt=top(R.lostBy);review.push(`${nameOf(lt[0])}に捕まった${R.lost}回を、本人は覚えていない。報告にも、自己評価にも出てこない。${R.trance?`立ったまま何かに頷いていたことが${R.trance}回あった。`:''}`)}
 if(R.edge)review.push(`あと少しのところで離されたのが${R.edge}回。${R.edgePulls?`離されたあと、自分から魔物の方へ${R.edgePulls}度、腰を寄せている。本人は「脚がもつれた」と言っている。`:'離されたあとは、しばらく剣先が定まらなかった。'}`);
 if(R.estella)review.push(`エステラ${R.estella}回。${R.estella>=2?'二回目からは、声を抑えようとする素振りも消えた。':'本人は「何もなかった」と言っている。'}`);
 const self=(win?'……か、勝った、し。':'')+(R.estella>=2?'……き、記録とか……しなくて、いいから。ほ、ほんとに……ふひ……':R.estella===1?'あ、あれは……ちょっと、足が、もつれた、だけ……':R.grabs-R.lost>=5?'つ、捕まったのは……ゆ、油断した、だけ……だし……':R.grabs-R.lost>=1?'へ、へへ……ぜ、ぜんぜん、平気……だった……':'ふひっ……わ、わたし、けっこう、強い……かも……');
 const self2=self+(suki&&suki[1]>=2?`……${nameOf(suki[0])}のことは……な、なんとも、思って、ない、から……`:'');
 const cell=(k,v)=>`<div><small>${k}</small><b>${v}</b></div>`;
 const earned=R.titles.length?`<p class="recTitles"><small>道中の称号</small>${R.titles.map(t=>`「${t}」`).join(' ')}</p>`:'';
 return `<small class="recK">記録</small><b class="recTitle">「${good}、${bad}」</b>${earned}
 <div class="stats">${[cell('捕まった',`${R.grabs}回`),cell('特殊攻撃',`${R.specials}回`),cell('振りほどいた',`${R.free}回`),cell('捕まっていた時間',`${R.held.toFixed(1)}秒`),cell('いちばん捕まった相手',tt?`${name}（${tt[1]}回）`:'—'),cell('好き',suki?`${nameOf(suki[0])}（${SN[suki[1]]}）`:'—'),cell('寸止め',R.edge?`${R.edge}回（追った${R.edgePulls}歩）`:'—'),cell('最大ヌテラ',`${Math.round(R.maxNut)}%`)].join('')}</div>
 <p class="recReview"><small>総評</small>${review.join('')}</p>
 <p class="recSelf"><small>自己評価</small>「${self2}」</p>`;
}
const baseFinish=finish;
finish=function(win){
 const r=baseFinish(win);
 if(state.over){
  let el=$('endRecord');if(!el){el=document.createElement('div');el.id='endRecord';el.className='record';($('endStats')||$('endText'))?.after(el)}
  el.innerHTML=record(win);
 }
 return r;
};
window.Game5Heat={version:'0.28.0',cfg:C,jitter,title,record:()=>R};
})();
