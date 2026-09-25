(()=>{
'use strict';
/* v0.34.0 message window, in the manner of Dragon Quest / era: a black box with a white frame
   along the bottom of the play area, three lines, the newest one typed out. It narrates what
   happens in plain third person - "アリアは あたりを 探索している。", "アリアは なにかの 音に
   気づいた。", "アリアの 斬撃！", "艶沼ナメクジの ぬめりの舐め上げ！" - taken from the same
   events the other modules react to. It is an HTML element over the canvas, so its text stays
   readable on a phone; taps go through it to the game. */
const MAXL=3,CPS=38,SAME=1.2;
const win=document.createElement('div');win.id='cmdWin';win.className='cmdWin hidden';
for(let i=0;i<MAXL;i++){const p=document.createElement('p');win.appendChild(p)}
document.querySelector('.arena')?.appendChild(win);
const lines=[];let typing=null,lastText='',lastAt=-99,throttle={};
function say(text,key,gap=0){
 const t=state.time;
 if(text===lastText&&t-lastAt<SAME)return;
 if(key&&gap&&t-(throttle[key]??-99)<gap)return;
 if(key)throttle[key]=t;lastText=text;lastAt=t;
 lines.push({text,shown:0});while(lines.length>12)lines.shift();
}
const HN=()=>state.hero?.name?.replace(/^戦士/,'')||'アリア';
const nm=e=>e?.name||'なにか';

/* ---- her plans (the AI's intent labels) ---- */
const INTENT={'探索':['は あたりを 探索している。',9],'宝箱へ':['は 宝箱を みつけた。',6],'階段へ移動':['は 階段へ むかった。',20],
 '回避':['は 身をかわした！',2.5],'退避':['は いったん 距離をとった。',6],'迂回':['は 回りこんだ。',6],'報告':['は 立ちどまって、ぽつぽつと 話しはじめた。',30],'息を整える':['は 息を ととのえている。',10]};
/* ---- lines of hers that mean something happened ---- */
const nearest=h=>(window.Game5MultiEnemy?.alive?.()||[]).filter(o=>o.aware).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];
function onVoice(h,k){
 const g=h.grapple,e=g?.e,n=HN();
 if(k==='search')say(`${n}は なにかの 音に 気づいた。`,'search',6);
 else if(k==='spot'){const o=nearest(h);say(`${n}は ${nm(o)}に 気づいた！`,'spot',3)}
 else if(k==='ambush'){const o=nearest(h);say(`${nm(o)}が 暗がりから あらわれた！`,'ambush',2)}
 else if(k==='trip')say(`${n}は つまずいた！`,'trip',2);
 else if(k==='grab'||k==='grabAgain'||k==='grabKnown'||k==='edgeRegrab')say(e?`${nm(e)}は ${n}を とらえた！`:`影の手が ${n}を とらえた！`,'grab',1);
 else if(k==='free')say(`${n}は ふりほどいた！`,'free',1);
 else if(k==='released')say(`${n}は 解放された。`,'rel',1);
 else if(k==='edge')say(`……あと少しの ところで、${n}は はなされた。`,'edge',1);
 else if(k==='edgePull')say(`${n}の 腰が、勝手に 魔物の方へ よっていく……`,'pull',3);
 else if(k==='estellaStart')say(`${n}は エステラに 達した……！`,'est',1);
 else if(k==='tranceIn')say(`${n}は 立ったまま うごかなくなった……`,'trance',1);
 else if(k==='tranceOut')say(`${n}は われに かえった。`,'trance2',1);
 else if(/^charmHesitate/.test(k))say(`${n}は ためらった！`,'hes',2);
 else if(k==='attach')say(`なにかが ${n}に 吸いついた！`,'att',2);
 else if(k==='watched')say(`まわりの 魔物が ${n}を 見ている……`,'watch',4);
 else if(k==='clear'&&!(window.Game5MultiEnemy?.alive?.()||[]).length)say(`区画を 制圧した！`,'clear',8);
}
let shown0=null,intent0=null,special0=null,room0=null,level0=null,pend0=false;
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h||!state.started)return;
 const n=HN();
 const room=state.dungeon?.room;
 if(room!==room0){room0=room;const r=window.Game5Dungeon?.rooms?.[room];if(r)say(`第${room+1}区画 ${r.name}に たどりついた。`,'room')}
 if(state.dungeon?.pending&&!pend0&&!(window.Game5MultiEnemy?.alive?.()||[]).length)say('区画を 制圧した！','clear');pend0=!!state.dungeon?.pending;
 if(level0!=null&&h.level>level0)say(`${n}は レベル${h.level}に あがった！`,'lv');level0=h.level;
 const lab=h.intent?.label;
 if(lab!==intent0){intent0=lab;const I=INTENT[lab];if(I)say(n+I[0],'i:'+lab,I[1])}
 if(h._voiceShown!==shown0){shown0=h._voiceShown;onVoice(h,h._voiceKey)}
 const g=h.grapple;
 if(g&&g.specials!==special0&&h._lastSpecial&&!h.estella?.active&&!window.Game5Lewd?.busy?.()){if(special0!=null&&g.specials>special0)say(`${nm(g.e)||'影の手'}の ${h._lastSpecial}！`,'sp',.4)}
 special0=g?g.specials:null;
 if(h.dead&&!h._msgDead){h._msgDead=true;say(`${n}は ちからつきた……`,'dead')}
 if(!h.dead)h._msgDead=false;
};
/* her skills, theirs, and the damage */
const baseStart=startHeroSkill;
startHeroSkill=function(slot,reason=''){const h=state.hero,r=baseStart(slot,reason);if(r&&h?.skills?.[slot])say(`${HN()}の ${h.skills[slot].name}！`,'hs',.3);return r};
const baseEnemy=startEnemySkill;
startEnemySkill=function(key,target){const e=state.enemy,r=baseEnemy(key,target);const s=e?.cast?.sk?.name;if(e&&s)say(`${nm(e)}の ${s}！`,'es:'+(e.id??e.type),1.2);return r};
const baseHurtE=hurtEnemy;
hurtEnemy=function(dmg,opts={}){const e=state.enemy,hp=e?.hp;const r=baseHurtE(dmg,opts);
 if(e&&hp>0){const d=Math.round(hp-Math.max(0,e.hp));if(e.hp<=0)say(`${nm(e)}を たおした！`,'kill');else if(d>0)say(`${nm(e)}に ${d}の ダメージ！`,'dmg',.35)}return r};
const baseHurtH=hurtHero;
hurtHero=function(h,dmg,status=null,meta={}){const hp=h?.hp,r=baseHurtH(h,dmg,status,meta);
 if(h&&!h.dead&&hp>h.hp){const d=Math.round(hp-h.hp);if(d>=2)say(`${HN()}は ${d}の ダメージを うけた！`,'hd',1.2)}return r};
const baseReset=reset;reset=function(){const r=baseReset();lines.length=0;room0=null;level0=null;intent0=null;shown0=null;throttle={};lastText='';return r};

/* drawing: type out the newest line; keep the last three */
let last=performance.now(),html='';
function render(){
 const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;
 win.classList.toggle('hidden',!state.started||state.over);
 const pw=window.Game5Portrait?.width?.();if(pw){const L=((pw+24)/SW*100).toFixed(1)+'%';if(win.style.left!==L)win.style.left=L}
 const view=lines.slice(-MAXL);
 for(const l of view)if(l.shown<l.text.length){l.shown=Math.min(l.text.length,l.shown+CPS*dt*(view.indexOf(l)<view.length-1?4:1));break}
 const h2=view.map((l,i)=>`${i<view.length-1?'<span class="old">':'<span>'}${l.text.slice(0,Math.ceil(l.shown))}</span>`).join('|');
 if(h2===html)return;html=h2;
 const ps=win.children,parts=h2.split('|');
 for(let i=0;i<MAXL;i++)ps[i].innerHTML=parts[i]||'';
}
const bDraw=draw;draw=function(){bDraw();try{render()}catch(_){}};
window.Game5Message={version:'0.34.0',say,lines};
})();
