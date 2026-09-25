(()=>{
'use strict';
/* v0.38.0 her state, readable at a glance.
   - badges under her gauges: 発情 (arousal: Nutera 40%+, 発情＋ at 70%+), 敏感 (sensitivity:
     Sail 30%+, or the minutes right after a climax when the next comes easier), 催眠, 魅了
   - the moment one starts, a large popup over her ("発情！", "敏感！") and a line in the message
     window say so
   - monster attacks that cause them are tagged by what they carry: 〔媚薬〕 (Nutera),
     〔敏感化〕 (Sail), 〔発情〕 (Lumane), 〔催眠〕, 〔魅了〕 - in the monster's label and the message */
const B=[
 {k:'heat',name:h=>(h.nutera||0)>=70?'発情＋':'発情',on:h=>(h.nutera||0)>=40,col:'#ff5fae',pop:'発情！',msg:n=>`${n}は 発情している……！`},
 {k:'sens',name:()=>'敏感',on:h=>(h.sailState?.value||0)>=30||state.time-(h._lastEstEnd??-99)<14,col:'#c78bff',pop:'敏感！',msg:n=>`${n}の 身体が 敏感になった！`},
 {k:'hyp',name:h=>`催眠${tierInfo(h.hypnosis||{value:0}).stage}`,on:h=>tierInfo(h.hypnosis||{value:0}).stage>=1,col:'#9b8cff',pop:'催眠！',msg:n=>`${n}の 目が とろんとしている……`},
 {k:'charm',name:()=>'魅了',on:h=>Object.values(h.charms||{}).some(tr=>tierInfo(tr).stage>=1),col:'#ff8fc8',pop:'魅了！',msg:n=>`${n}は 魅了されている……`}
];
const TAG=[['nutera','媚薬'],['sail','敏感化'],['lumane','発情'],['hypnosis','催眠'],['charm','魅了']];
function tag(e,key){const x=window.Game5Monsters?.profiles?.[e?.type]?.extra?.[key];if(!x)return'';const t=TAG.filter(([k])=>x[k]>0).map(([,n])=>n);return t.length?`〔${t.slice(0,2).join('・')}〕`:''}
const N=h=>h?.name?.replace(/^戦士/,'')||'アリア';
let on0={},est0=false;
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h||!state.started||h.dead)return;
 const est=!!h.estella?.active;if(!est&&est0)h._lastEstEnd=state.time;est0=est;
 for(const b of B){const v=b.on(h);
  if(v&&!on0[b.k]&&state.time>(h['_pop_'+b.k]||0)){h['_pop_'+b.k]=state.time+8;pops.push({text:b.pop,col:b.col,t:1.2});window.Game5Message?.say?.(b.msg(N(h)),'st:'+b.k,8)}
  on0[b.k]=v}
};
/* the tag goes into the monster's skill name as the cast begins */
const baseStart=startEnemySkill;
startEnemySkill=function(key,target){const e=state.enemy,r=baseStart(key,target);if(e?.cast?.sk){const tg=tag(e,key);if(tg&&!e.cast.sk.name.endsWith('〕'))e.cast.sk={...e.cast.sk,name:e.cast.sk.name+tg}}return r};
/* drawing: badges at her feet, popups over her */
const pops=[];let last=performance.now();
function draw(h){
 const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;
 const act=B.filter(b=>b.on(h));
 if(act.length){ctx.save();ctx.font='700 9px system-ui,sans-serif';ctx.textBaseline='middle';ctx.textAlign='center';
  const ws=act.map(b=>ctx.measureText(b.name(h)).width+10),tot=ws.reduce((a,b)=>a+b+3,-3);let x=h.x-tot/2;const y=h.y+(h.status?.bind>0?84:72);
  act.forEach((b,i)=>{const w=ws[i],beat=b.k==='heat'?.5+.5*Math.sin(state.time*8):.8;ctx.globalAlpha=.9;ctx.fillStyle='#0a0609cc';ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y-6,w,12,6):ctx.rect(x,y-6,w,12);ctx.fill();
   ctx.strokeStyle=b.col;ctx.globalAlpha=.6+.4*beat;ctx.lineWidth=1.2;ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=b.col;ctx.fillText(b.name(h),x+w/2,y+.5);x+=w+3});
  ctx.restore()}
 for(const p of pops){p.t-=dt;const u=1-p.t/1.2,a=Math.min(1,p.t*3),s=1+.5*Math.max(0,.2-u)/.2;
  ctx.save();ctx.globalAlpha=a;ctx.font=`900 ${Math.round(18*s)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=4;ctx.strokeStyle='#1a0612';ctx.strokeText(p.text,h.x,h.y-110-u*18);ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=10;ctx.fillText(p.text,h.x,h.y-110-u*18);ctx.restore()}
 for(let i=pops.length-1;i>=0;i--)if(pops[i].t<=0)pops.splice(i,1);
}
const G=window.Game5Graphics;
if(G){const o=G.drawHazardsOver;G.drawHazardsOver=function(){o?.();const h=state.hero;if(h&&state.started&&!h.dead)draw(h)}}
/* the status line in her panel */
const baseRender=renderUI;
renderUI=function(){baseRender();const h=state.hero,el=document.getElementById('heroStatus');if(!h||!el)return;const act=B.filter(b=>b.on(h)).map(b=>b.name(h));if(act.length){const t=act.join('・');if(!el.textContent.includes(act[0]))el.textContent=(el.textContent&&el.textContent!=='正常'?el.textContent+'・':'')+t}};
window.Game5Status={version:'0.38.0',tag,badges:B};
})();
