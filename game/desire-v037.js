(()=>{
'use strict';
/* v0.37.0 desire.
   - the lust wave (欲求波) now swells and ebbs slowly - a period of about half a minute - instead
     of a quick sine; the higher her Nutera, the faster it rises and the slower it falls. Some of
     it is there even without Lumane once Nutera is high.
   - at a high wave she cannot think straight: now and then she stands there dazed, or drifts
     toward the nearest monster, instead of doing what she meant to
   - the tempting pose: standing still with high Nutera, a high wave, or a monster she has fallen
     for (or is charmed by) in sight, she opens her legs and pushes her hips out (drawn by the
     rig, see warrior-motion-extra.js 'tempt'), and the narration says so
   - her charm and "like" toward each kind is listed in her status panel
   - monster fogs no longer poison her: they raise her Nutera (発情の霧) */
const C={period:28,up:.5,down:.32,impair:{from:.72,chance:1,daze:.8,drift:.9},tempt:{nutera:75,wave:.8,charm:2}};
const Vo=()=>window.Game5Voice,M=()=>window.Game5Message,alive=()=>window.Game5MultiEnemy?.alive?.()||[];
const L={daze:['……ぁ……れ……？ な、なにを……して、たんだっけ……','……ふ、ふわ、ふわ……する……','……っ、い、今……ぼーっと……してた……'],
 drift:['……あ、あし、……そっちに……い、行っちゃ、だめ、なのに……','……ち、ちょっと、だけ……ち、近くで、見る、だけ……'],
 tempt:['……ぁ……っ、……み、見て……ち、ちが、見ないで……っ','……ふ、ふひ……あ、脚……と、閉じ、られない……','……は、ぁ……っ、……こ、こっち……ち、ちが……っ']};
if(Vo()?.lines)Object.assign(Vo().lines,L);
if(Vo()?.strong)Vo().strong.add('tempt');
/* ---- the wave ---- */
const baseNS=updateNuteraSystem;
updateNuteraSystem=function(h,dt){
 const w0=h?.lumaneWave??0;
 baseNS(h,dt);
 if(!h)return;
 const lum=tierInfo(h.lumane||{value:0}).stage,n=Math.min(1,(h.nutera||0)/100);
 h._wavePh=(h._wavePh??Math.random()*6.28)+dt*(Math.PI*2/C.period);
 const amp=lum>0?.55+.15*lum:.55*n,target=Math.min(1,.1*lum+.25*n+amp*(.5+.5*Math.sin(h._wavePh)));
 const k=target>w0?C.up*(1+2*n):C.down*(1-.75*n);
 h.lumaneWave=w0+(target-w0)*Math.min(1,dt*k);
};
/* ---- not thinking straight ---- */
const baseDecide=decideHero;
decideHero=function(h,dt){
 const r=baseDecide(h,dt);
 if(!h||h.dead||h.grapple||h.estella?.active||h.cast||state.dungeon?.pending)return r;
 const w=h.lumaneWave||0;
 if(w<C.impair.from||state.time<(h._impairT||0))return r;
 if(Math.random()>(w-C.impair.from)*C.impair.chance)return r;
 h._impairT=state.time+2.5;
 const near=alive().filter(e=>Math.hypot(e.x-h.x,e.y-h.y)<260).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];
 if(near&&Math.random()<.55){const dx=near.x-h.x,dy=near.y-h.y,l=Math.hypot(dx,dy)||1;h.intent={kind:'move',x:dx/l,y:dy/l,speed:.35,label:'誘われる'};Vo()?.say?.(h,'drift',{force:true,hold:2});M()?.say?.(`${N(h)}は ふらふらと ${near.name}の方へ 歩きだした。`,'drift',6)}
 else{h.intent={kind:'hold',x:0,y:0,label:'ぼんやり'};h.aiWait=C.impair.daze;Vo()?.say?.(h,'daze',{force:true,hold:2});M()?.say?.(`${N(h)}は ぼうっと 立ちつくしている。`,'daze',6)}
 return h.intent;
};
const N=h=>h?.name?.replace(/^戦士/,'')||'アリア';
/* ---- the tempting pose (flag read by the rig) ---- */
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h||!state.started)return;
 const n=h.nutera||0,CH=window.Game5Charm,CL=window.Game5Climax;
 const lover=CH&&alive().find(e=>(CH.levelFor(h,e)>=C.tempt.charm||charmStage(h,e.family)>=C.tempt.charm)&&(!CL||CL.visible(h,e)));
 const t=!h.moving&&!h.cast&&!h.grapple&&!h.estella?.active&&!h.dead&&(n>=C.tempt.nutera||(h.lumaneWave||0)>=C.tempt.wave||!!lover);
 if(t&&!h._tempt){h._temptTo=lover||null;if(state.time>(h._temptSaid||0)){h._temptSaid=state.time+14;Vo()?.say?.(h,'tempt',{hold:2.4});M()?.say?.(lover?`${N(h)}は 脚を開いたまま、${lover.name}を 見つめている……`:`${N(h)}は 立ち止まって、無意識に 脚を開いている……`,'tempt',10)}}
 h._tempt=t;
 if(t&&lover){const a=Math.atan2(lover.y-h.y,lover.x-h.x);h.facing=a;h.dir=dirFrom(Math.cos(a),Math.sin(a))}
};
/* ---- fogs: Nutera, not poison ---- */
const FE=window.FOG_TICK?.enemy||(typeof FOG_TICK!=='undefined'?FOG_TICK.enemy:null);
if(FE){FE.hp=0;FE.poison=0}
if(typeof ENEMY_SKILLS!=='undefined'&&ENEMY_SKILLS.fog){ENEMY_SKILLS.fog.damage=0;ENEMY_SKILLS.fog.name='発情の霧'}
if(typeof ENEMY_LABELS!=='undefined')ENEMY_LABELS.fog='発情の霧';
const baseHaz=updateHazards;let fogT=0;
updateHazards=function(dt){
 baseHaz(dt);const h=state.hero;if(!h||h.dead)return;
 fogT-=dt;if(fogT>0)return;fogT=.64;
 for(const z of state.hazards||[])if(z.kind==='enemyFog'&&Math.hypot(h.x-z.x,h.y-z.y)<z.r+h.r){applyNutera(h,2.4,{source:'発情の霧'});break}
};
/* ---- her charm and "like", listed ---- */
const baseRender=renderUI;
renderUI=function(){
 baseRender();
 const h=state.hero;if(!h)return;
 let el=document.getElementById('likeText');
 if(!el){el=document.createElement('div');el.id='likeText';el.className='likeText';document.getElementById('desireText')?.after(el)}
 const CH=window.Game5Charm,names=CH?.names||[],rows=[];
 for(const [t,lv] of Object.entries(h._suki||{}))if(lv>0)rows.push(`<span class="lk">好き：${window.Game5Monsters?.profiles?.[t]?.name||t}（${names[lv]}）</span>`);
 for(const [f,tr] of Object.entries(h.charms||{})){const st=tierInfo(tr).stage;if(st>0)rows.push(`<span class="ch">魅了：${ENEMY_FAMILY_LABELS?.[f]||f} 段階${st}</span>`)}
 const html=rows.length?rows.join(''):'<span class="none">好き・魅了：なし</span>';
 if(el.innerHTML!==html)el.innerHTML=html;
};
window.Game5Desire={version:'0.37.0',cfg:C};
})();
