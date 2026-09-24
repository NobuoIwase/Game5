(()=>{
'use strict';
/* v0.14.0 polish.
   - speech bubble above Aria for the moments that matter (routine combat chatter stays in the
     THOUGHT panel only)
   - monsters squash and fade out instead of vanishing
   - run history on the start screen (best floor reached, last runs) */
const alive=()=>window.Game5MultiEnemy?.alive?.()||(state.enemy?.hp>0?[state.enemy]:[]);

/* ---------- speech bubble ---------- */
const ROUTINE=/斬る|横へ回る|慌てない|半歩|間合いへ|届かない|振り向く|確認する|確かめる。$|見えない|呼吸を整える|踏み込める|割り込む|詠唱を止める/;
const bubble={text:'',t:0,last:new Map(),cool:0};
function watchThought(h,dt){
 bubble.t=Math.max(0,bubble.t-dt);bubble.cool=Math.max(0,bubble.cool-dt);
 const s=h.thought||'';
 if(s===bubble.seen)return;
 bubble.seen=s;
 // v0.27: only lines in her voice (voice-v026) reach the bubble - a raw AI thought can sit in
 // h.thought for one frame before she voices it - and lines about her body skip the cooldown
 const V=window.Game5Voice;if(V&&s!==h._voiceShown){bubble.seen=null;return}
 const strong=V?.strong?.has(h._voiceKey);
 if(!s||ROUTINE.test(s)||bubble.cool>0&&!strong)return;
 if(!strong&&state.time-(bubble.last.get(s)??-99)<12)return;
 bubble.last.set(s,state.time);bubble.text=s;bubble.t=2.4;bubble.cool=2.6;
}
function wrap(text,max){
 const out=[];let line='';
 for(const ch of text){if(ctx.measureText(line+ch).width>max&&line){out.push(line);line=ch}else line+=ch}
 if(line)out.push(line);return out.slice(0,3);
}
function drawBubble(h){
 if(bubble.t<=0||h.dead)return;
 const a=Math.min(1,bubble.t*3,(2.4-bubble.t)*8);
 ctx.save();ctx.globalAlpha=a;ctx.font='600 12px system-ui,sans-serif';
 const lines=wrap(bubble.text,190),w=Math.max(...lines.map(l=>ctx.measureText(l).width))+18,hh=lines.length*16+10;
 const x=clamp(h.x-w/2,CAM.x+8,CAM.x+SW-w-8),y=Math.max(CAM.y+8,h.y-112-hh);
 ctx.fillStyle='rgba(250,246,236,.94)';ctx.strokeStyle='rgba(60,50,40,.5)';ctx.lineWidth=1;
 ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,hh,8):ctx.rect(x,y,w,hh);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(clamp(h.x-6,x+8,x+w-20),y+hh);ctx.lineTo(clamp(h.x,x+14,x+w-14),y+hh+8);ctx.lineTo(clamp(h.x+6,x+20,x+w-8),y+hh);ctx.closePath();ctx.fill();
 ctx.fillStyle='#2b241d';ctx.textBaseline='top';lines.forEach((l,i)=>ctx.fillText(l,x+9,y+6+i*16));
 ctx.restore();
}

/* ---------- death dissolve ---------- */
const ghosts=[];
const bHurt=hurtEnemy;
hurtEnemy=function(dmg,opts={}){
 const e=state.enemy,b=e?.hp;bHurt(dmg,opts);
 if(e&&b>0&&e.hp<=0&&ghosts.length<8)ghosts.push({e:{...e,hp:1,cast:null,flash:0,stun:0},t:.6,max:.6});
};
function drawGhosts(dt){
 const draw1=window.Game5DungeonGraphics?.drawEnemy;if(!draw1)return;
 const h=state.hero,bind=h.status.bind;
 for(const g of ghosts){
  g.t-=dt;const p=1-Math.max(0,g.t)/g.max,e=g.e;
  ctx.save();ctx.globalAlpha=Math.max(0,1-p);
  ctx.translate(e.x,e.y+20);ctx.scale(1+.35*p,1-.75*p);ctx.translate(-e.x,-e.y-20);
  h.status.bind=0;draw1(e);h.status.bind=bind;
  ctx.restore();
 }
 for(let i=ghosts.length-1;i>=0;i--)if(ghosts[i].t<=0)ghosts.splice(i,1);
}

/* ---------- run history ---------- */
const KEY='game5.runs';
function loadRuns(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(_){return[]}}
function saveRun(r){try{const a=loadRuns();a.unshift(r);localStorage.setItem(KEY,JSON.stringify(a.slice(0,20)))}catch(_){}}
function showHistory(){
 const card=document.querySelector('#startOverlay .card');if(!card)return;
 let el=document.getElementById('history');
 if(!el){el=document.createElement('div');el.id='history';el.className='history';card.insertBefore(el,document.getElementById('startBtn'))}
 const runs=loadRuns();
 if(!runs.length){el.innerHTML='';return}
 const best=runs.reduce((a,r)=>Math.max(a,r.cleared),0),wins=runs.filter(r=>r.win).length;
 el.innerHTML=`<div class="histHead"><b>これまでの探索</b><span>最高 ${best}/7区画・踏破 ${wins}/${runs.length}回</span></div>`+
  runs.slice(0,5).map(r=>`<div class="histRow ${r.win?'win':''}"><span>${r.win?'踏破':`第${r.cleared+1}区画で敗北`}</span><span>Lv${r.level}</span><span>${r.time}</span><span>${r.mode}</span></div>`).join('');
}
const bFinish=finish;
finish=function(win){
 const before=state.over,r=bFinish(win);
 if(state.over&&!before){
  const h=state.hero,d=state.dungeon,t=Math.round(state.time),lv=window.Game5Balance?.intensity?.[state.director.intensity||'normal'];
  saveRun({win:!!d?.complete,cleared:d?.complete?7:(d?.room||0),level:h.level,time:`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`,mode:state.director.auto?`AUTO ${lv?.label||''}`:'手動',at:Date.now()});
  showHistory();
 }
 return r;
};
showHistory();
/* the restart button holds the reset from battle-ui.js, which renders before the dungeon has
   spawned the floor's monsters: refresh once more so the header shows the real encounter */
$('restartBtn').addEventListener('click',()=>{renderUI();showHistory()});

/* ---------- hooks ---------- */
let last=performance.now();
const bDraw=draw;
draw=function(){
 const n=performance.now(),dt=Math.min(.1,(n-last)/1000);last=n;
 bDraw();
 if(state.started){drawGhosts(dt);watchThought(state.hero,dt);drawBubble(state.hero)}
};
window.Game5Polish={version:'0.14.0',bubble,ghosts,loadRuns};
})();
