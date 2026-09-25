(()=>{
'use strict';
/* v0.12.0 UI: pause / speed / AUTO intensity controls, enemy roster, director tool
   cost and cooldown, placement preview on the canvas, colour-coded log, run statistics
   on the result screen. */
const VERSION='0.37.0';
state.version=VERSION;document.title=`Game5 v${VERSION}`;
const alive=()=>window.Game5MultiEnemy?.alive?.()||(state.enemy?.hp>0?[state.enemy]:[]);
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const view={paused:false,speed:1};

/* ---------- controls ---------- */
const bar=$('controls');
const INT=window.Game5Balance?.intensity||{};
bar.innerHTML=`<div class="grp"><button data-act="pause">一時停止</button></div>
<span class="lbl">速度</span><div class="grp">${[1,2,4].map(n=>`<button data-speed="${n}">×${n}</button>`).join('')}</div>
<span class="lbl">AUTO指揮の強さ</span><div class="grp">${Object.entries(INT).map(([k,v])=>`<button data-int="${k}">${v.label}</button>`).join('')}</div>
<span class="keys"><kbd>Space</kbd> 一時停止 <kbd>F</kbd> 速度 <kbd>1</kbd>-<kbd>8</kbd> 罠 <kbd>A</kbd> AUTO</span>`;
function syncControls(){
 bar.querySelector('[data-act=pause]').textContent=view.paused?'再開':'一時停止';
 bar.querySelector('[data-act=pause]').classList.toggle('on',view.paused);
 bar.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('on',+b.dataset.speed===view.speed));
 bar.querySelectorAll('[data-int]').forEach(b=>b.classList.toggle('on',b.dataset.int===(state.director.intensity||'normal')));
}
function setSpeed(n){view.speed=n;save();syncControls()}
function togglePause(){if(!state.started||state.over)return;view.paused=!view.paused;syncControls()}
bar.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.act==='pause')togglePause();
 if(b.dataset.speed)setSpeed(+b.dataset.speed);
 if(b.dataset.int){state.director.intensity=b.dataset.int;save();syncControls()}
});
addEventListener('keydown',e=>{
 if(e.target.closest?.('input,textarea'))return;
 if(e.code==='Space'){e.preventDefault();togglePause()}
 if(e.code==='KeyF'){const s=[1,2,4];setSpeed(s[(s.indexOf(view.speed)+1)%s.length])}
 if(e.code==='KeyR'&&state.over)$('restartBtn').click();
});
function save(){try{localStorage.setItem('game5.ui',JSON.stringify({speed:view.speed,intensity:state.director.intensity}))}catch(_){}}
try{const o=JSON.parse(localStorage.getItem('game5.ui')||'{}');if([1,2,4].includes(o.speed))view.speed=o.speed;if(INT[o.intensity])state.director.intensity=o.intensity}catch(_){}
syncControls();

/* pause and fast-forward run the simulation in fixed sub-steps */
const baseUpdate=update;
update=function(dt){
 if(view.paused&&state.started&&!state.over)return;
 for(let i=0;i<view.speed;i++)baseUpdate(dt);
};

/* ---------- enemy roster ---------- */
const card=document.querySelector('.top .enemy');
const roster=document.createElement('div');roster.className='roster';card.appendChild(roster);
function drawRoster(){
 const list=alive();
 if(list.length<2){roster.innerHTML='';return}
 roster.innerHTML=list.map(e=>`<div class="foe ${e===state.enemy?'main':''}"><b>${esc(e.name)}</b><div class="bar"><i style="width:${100*e.hp/e.maxHp}%"></i></div><span class="${e.cast?'cast':''}">${e.cast?esc(e.cast.sk.name)+' '+Math.max(0,e.cast.t).toFixed(1)+'s':esc(e.decision||'')}</span></div>`).join('');
}

/* ---------- director tools ---------- */
const btns=[...document.querySelectorAll('[data-tool]')];
const HINT={hide:'見えない暗がりで待ち伏せ',snare:'踏むと拘束・SP減',fog:'ヌテラとセイルが上昇',lure:'音で注意を逸らす',ringbeam:'輪紋を刻む直線',pool:'足が鈍りSPが削れる',tower:'催眠の電波を放つ',mimic:'開けると拘束',summon:'魔物を1体呼ぶ'};
for(const b of btns){const t=DIRECTOR_TOOLS[b.dataset.tool];if(!t)continue;b.insertAdjacentHTML('beforeend',`<small>EN ${t.cost} / ${HINT[b.dataset.tool]||''}</small><i class="cd"></i>`)}
function drawTools(){
 const d=state.director;
 for(const b of btns){
  const k=b.dataset.tool,t=DIRECTOR_TOOLS[k];if(!t)continue;
  const cd=d.cd[k]||0;b.classList.toggle('dim',cd>0||d.en<t.cost);
  const bar=b.querySelector('.cd');if(bar)bar.style.width=cd>0?`${100*cd/t.cd}%`:'0';
 }
}

/* ---------- log ---------- */
const LOG_CLASS=[[/^LEVEL UP|新しい技/,'level'],[/ESTELLA|エステラ/,'estella'],[/^第\d+区画|最深部|階段|敵編成/,'room'],[/^AUTO指揮|^プレイヤー：/,'dir'],[/^敵：/,'enemy'],[/覚えた|見えてきた|読み切り/,'learn'],[/^戦士アリア|^アリア/,'hero']];
log=function(s){
 const cls=(LOG_CLASS.find(([r])=>r.test(s))||[0,'sys'])[1];
 logs.unshift(`<span class="lg-${cls}">${esc(s)}</span>`);logs.splice(12);
 const el=$('log');if(el)el.innerHTML=logs.map(x=>`<div>${x}</div>`).join('');
 stats.log(s);
};

/* ---------- run statistics ---------- */
const stats={
 hero:null,
 reset(){Object.assign(this,{hits:0,dodges:0,dealt:0,kills:0,snares:0,maxNutera:0,t0:state.time})},
 log(s){if(/影杭が足を取った/.test(s))this.snares++}
};
stats.reset();
const bHurtEnemy=hurtEnemy;
hurtEnemy=function(dmg,opts={}){const e=state.enemy,b=e?.hp;bHurtEnemy(dmg,opts);if(e&&b>e.hp){stats.dealt+=b-e.hp;if(e.hp<=0)stats.kills++}};
const bResolveEnemy=resolveEnemy;
resolveEnemy=function(c){
 const h=state.hero,e=state.enemy,live=e?.cast===c,hit=live&&h&&!h.dead&&nuteraCastHitsHero(c,h);
 bResolveEnemy(c);
 if(live&&hit)stats.hits++;else if(live&&h?.dodgeCastId===c.id)stats.dodges++;
};

const bFinish=finish;
finish=function(win){
 const r=bFinish(win);
 if(state.over)showStats();
 return r;
};
function showStats(){
 const h=state.hero,d=state.dungeon,n=window.Game5Dungeon?.rooms?.length||7,time=state.time-stats.t0;
 const cleared=d?.complete?n:(d?.room||0);
 const cell=(k,v)=>`<div><small>${k}</small><b>${v}</b></div>`;
 let el=$('endStats');if(!el){el=document.createElement('div');el.id='endStats';el.className='stats';$('endText').after(el)}
 el.innerHTML=[cell('踏破区画',`${cleared} / ${n}`),cell('経過時間',`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`),cell('レベル',`Lv${h.level}`),
  cell('与ダメージ',Math.round(stats.dealt)),cell('撃破',stats.kills),cell('回避 / 被弾',`${stats.dodges} / ${stats.hits}`),
  cell('エステラ',`${h.estella?.count||0}回`),cell('影杭に掛かった',`${stats.snares}回`),cell('最大ヌテラ',`${Math.round(stats.maxNutera)}%`)].join('');
 $('restartBtn').textContent='再探索（R）';
}

/* ---------- canvas: placement preview and pause banner ---------- */
const baseDraw=draw;
draw=function(){
 baseDraw();
 const d=state.director,c=d.cursor,t=DIRECTOR_TOOLS[d.selected];
 if(c?.inside&&t&&state.started&&!state.over){
  const ready=(d.cd[d.selected]||0)<=0&&d.en>=t.cost,col=ready?'#e8a6d6':'#8b7f88';
  ctx.save();ctx.globalAlpha=.8;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.setLineDash([5,5]);
  if(d.selected==='ringbeam'){
   const sx=CAM.x+SW-52,sy=clamp(c.y,CAM.y+65,CAM.y+SH-65),a=Math.atan2(c.y-sy,c.x-sx);
   ctx.lineWidth=46;ctx.globalAlpha=.12;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*920,sy+Math.sin(a)*920);ctx.stroke();
  }else{ctx.beginPath();ctx.arc(c.x,c.y,t.r,0,TAU);ctx.stroke()}
  ctx.setLineDash([]);ctx.globalAlpha=1;ctx.font='700 11px system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle=col;
  const cd=d.cd[d.selected]||0;ctx.fillText(ready?t.name:cd>0?`${t.name} ${cd.toFixed(1)}s`:`${t.name} EN不足`,c.x,c.y-(t.r||20)-8);
  ctx.restore();
 }
 if(view.paused&&state.started&&!state.over){
  screenSpace(()=>{ctx.fillStyle='#0008';ctx.fillRect(0,0,SW,SH);ctx.textAlign='center';ctx.fillStyle='#f5eedb';ctx.font='800 28px system-ui,sans-serif';
  ctx.fillText('一時停止中',SW/2,SH/2);ctx.font='500 13px system-ui,sans-serif';ctx.fillStyle='#b9c4bb';ctx.fillText('Space・一時停止ボタンで再開',SW/2,SH/2+26)});
 }
};

/* ---------- per-frame UI ---------- */
const baseRender=renderUI;
renderUI=function(){
 baseRender();
 const h=state.hero;
 if(h!==stats.hero){stats.hero=h;stats.reset();view.paused=false;syncControls();$('restartBtn').textContent='再探索'}
 stats.maxNutera=Math.max(stats.maxNutera,h.nutera||0);
 drawRoster();drawTools();
 const lv=INT[state.director.intensity||'normal'];
 $('autoBtn').textContent=`AUTO指揮：${state.director.auto?'ON':'OFF'}${state.director.auto&&lv?`（${lv.label}）`:''}`;
};
const v=document.querySelector('.top small');if(v)v.textContent=`GAME5 v${VERSION}`;
renderUI();
window.Game5UI={version:VERSION,view,stats};
})();
