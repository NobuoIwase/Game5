function renderUI(){
 const e=state.enemy;$('enemyHp').style.width=`${100*e.hp/e.maxHp}%`;$('enemyState').textContent=e.decision;
 $('party').innerHTML=state.heroes.map((h,i)=>`<button class="heroCard ${i===state.active?'active':''} ${h.dead?'dead':''}" data-i="${i}"><div class="heroTop"><span>${i+1}. ${h.name}</span><span class="role">${h.role}</span></div><div class="meter hp"><i style="width:${100*h.hp/h.maxHp}%"></i></div><div class="meter mp"><i style="width:${100*h.mp/h.maxMp}%"></i></div><div class="statusLine">${statusText(h)}　HP ${Math.ceil(h.hp)}/${h.maxHp}　MP ${Math.floor(h.mp)}</div></button>`).join('');
 document.querySelectorAll('.heroCard').forEach(b=>b.onclick=()=>selectHero(+b.dataset.i));
 const h=activeHero();$('activeName').textContent=h.name;$('activeHint').textContent=h.hint;
 document.querySelectorAll('.skill').forEach((b,i)=>{const sk=h.skills[i];b.querySelector('b').textContent=sk.name;b.querySelector('small').textContent=`MP ${sk.cost} / ${sk.desc}`;const cd=h.cd[i];b.disabled=!canUse(h,sk,i);b.classList.toggle('cooling',cd>0);b.querySelector('.cdtxt').textContent=cd>0?cd.toFixed(1):'';});
}
document.querySelectorAll('.skill').forEach((b,i)=>b.addEventListener('click',()=>useSkill(i)));
$('startBtn').onclick=()=>{state.started=true;$('startOverlay').classList.add('hidden');log('戦闘開始。赤い予兆から離れろ！');};
$('restartBtn').onclick=()=>reset();
addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(/^Digit[1-4]$/.test(e.code))selectHero(+e.code.slice(-1)-1);const map={KeyQ:0,KeyE:1,KeyR:2,KeyF:3};if(map[e.code]!=null&&!e.repeat)useSkill(map[e.code]);},{passive:false});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
document.querySelectorAll('[data-key]').forEach(b=>{const down=e=>{e.preventDefault();touchKeys.add(b.dataset.key);b.classList.add('pressed');try{b.setPointerCapture(e.pointerId)}catch{}};const up=e=>{e.preventDefault();touchKeys.delete(b.dataset.key);b.classList.remove('pressed');};b.addEventListener('pointerdown',down);['pointerup','pointercancel','lostpointercapture'].forEach(n=>b.addEventListener(n,up));});
let last=performance.now();function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(frame);}reset();requestAnimationFrame(frame);
