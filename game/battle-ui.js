function renderUI(){const h=state.hero,e=state.enemy,d=state.director;
 $('enemyHp').style.width=100*e.hp/e.maxHp+'%';$('enemyHpText').textContent=`HP ${Math.ceil(e.hp)} / ${e.maxHp}`;$('enemyState').textContent=e.decision;$('enemyCast').textContent=e.cast?`${e.cast.sk.name} ${e.cast.t.toFixed(1)}s`:'予兆なし';
 $('heroName').textContent=`${h.name} Lv${h.level}`;$('heroStatus').textContent=statusText(h);
 for(const [k,v,m] of [['hp',h.hp,h.maxHp],['mp',h.mp,h.maxMp],['sp',h.sp,h.maxSp]]){$(k+'Fill').style.width=100*v/m+'%';$(k+'Text').textContent=`${Math.ceil(v)} / ${m}`}
 $('stats').textContent=`ATK ${h.atk} DEF ${h.def} AGI ${h.agi} FOCUS ${h.focus}`;$('thought').textContent=h.thought;$('perception').textContent=h.perception;
 $('knowledge').textContent='敵知識：'+Object.entries(h.knowledge).filter(x=>x[1]>.15).map(([k,v])=>`${ENEMY_LABELS[k]} ${v<1?'観察中':v<2?'既知':'習熟'}`).join(' / ')||'敵知識：ほぼ未知';
 $('skills').innerHTML=h.skills.map((s,i)=>`<div class="skill ${h.level<s.unlock?'lock':''}"><b>${s.name}</b><small>${h.level<s.unlock?'Lv'+s.unlock:h.cd[i]>0?h.cd[i].toFixed(1)+'s':'MP '+s.cost} / ${s.desc}</small></div>`).join('');
 $('directorEn').style.width=d.en+'%';$('directorEnText').textContent=`EN ${Math.floor(d.en)} / 100`;$('autoBtn').textContent='AUTO指揮：'+(d.auto?'ON':'OFF');
 document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===d.selected));
}
$('startBtn').onclick=()=>{state.started=true;$('startOverlay').classList.add('hidden')};$('restartBtn').onclick=reset;$('autoBtn').onclick=()=>{state.director.auto=!state.director.auto;renderUI()};
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{state.director.selected=b.dataset.tool;renderUI()});
function P(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
cv.addEventListener('pointermove',e=>Object.assign(state.director.cursor,P(e),{inside:true}));cv.addEventListener('pointerleave',()=>state.director.cursor.inside=false);cv.addEventListener('pointerdown',e=>{const p=P(e);placeDirectorTool(state.director.selected,p.x,p.y);renderUI()});
addEventListener('keydown',e=>{if(e.code==='Digit1')state.director.selected='snare';if(e.code==='Digit2')state.director.selected='fog';if(e.code==='Digit3')state.director.selected='lure';if(e.code==='KeyA')state.director.auto=!state.director.auto;renderUI()});
let last=performance.now();function frame(n){const dt=Math.min(.05,(n-last)/1000);last=n;update(dt);draw();requestAnimationFrame(frame)}reset();requestAnimationFrame(frame);
