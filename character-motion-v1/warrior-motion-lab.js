(()=>{
'use strict';
const $=q=>document.querySelector(q),dirs=['front','down_right','right','up_right','back','up_left','left','down_left'];
const M=$('#m'),D=$('#d'),S=$('#s'),W=$('#w'),G=$('#g'),wc=W.getContext('2d'),gc=G.getContext('2d');
let frame=0,p=0,last=performance.now(),playing=true;
const I=u=>{const x=new Image();x.src=u;return x},sheet={
 ww:I('exports/warrior/walk.png'),wr:I('exports/warrior/run.png'),
 gw:I('generic/generic-walk-8dir-8frames.png'),gr:I('generic/generic-run-8dir-8frames.png')
};
const oldStates=new Set(['slash','heavy','bind','estella']);
function isSheet(){return M.value==='walk'||M.value==='run'}
function fakeHero(name,progress){
 const h={id:'warrior',x:192,y:330,dir:D.value,dead:false,moving:false,cast:null,intent:{speed:0},status:{bind:0,stun:0,guard:0},estella:{active:false,t:0,total:2.6}};
 if(name==='idle'){}
 else if(name==='turn')h._mxTurn={t:(1-progress)*.16,T:.16};
 else if(name==='dodge')h._mxDodge={t:(1-progress)*.3,T:.3};
 else if(name==='bash')h._mxSkill={n:'bash',e:progress*.54,T:.54,hit:.32};
 else if(name==='guard')h.status.guard=2;
 else if(name==='hit')h._mxHit={t:(1-progress)*.28,T:.28};
 else if(name==='stun')h.status.stun=1;
 else if(name==='recovery')h._mxRec={t:(1-progress)*.56,T:.56};
 else if(name==='defeat'){h.dead=true;h._mxDead=performance.now()/1000-progress*.72}
 return h;
}
function render(){
 const mo=M.value,di=Math.max(0,dirs.indexOf(D.value));
 wc.clearRect(0,0,W.width,W.height);gc.clearRect(0,0,G.width,G.height);
 if(isSheet()){
  const wi=mo==='walk'?sheet.ww:sheet.wr,gi=mo==='walk'?sheet.gw:sheet.gr,fi=Math.floor(frame)%8;
  if(wi.complete&&wi.naturalWidth)wc.drawImage(wi,fi*384,di*512,384,512,0,15,384,512);
  if(gi.complete&&gi.naturalWidth)gc.drawImage(gi,fi*192,di*256,192,256,0,0,192,256);
  $('#wm').textContent=`${D.value} / frame ${fi+1} / ${mo}`;$('#gm').textContent=`generic ${mo}`;
 }else if(oldStates.has(mo)){
  const ok=window.WarriorMotion?.drawLab?.(wc,D.value,mo,p,{rootX:192,rootY:330,scale:1});
  $('#wm').textContent=`${D.value} / ${Math.round(p*100)}% / ${mo}${ok?'':' / loading...'}`;$('#gm').textContent='walk/run 比較専用';
 }else{
  const h=fakeHero(mo,p),a=(()=>{
    if(mo==='idle')return {n:'idle',p};
    if(mo==='turn')return {n:'turn',p};
    if(mo==='dodge')return {n:'dodge',p};
    if(mo==='bash')return {n:'bash',p,hit:.59};
    if(mo==='guard')return {n:'guard',p};
    if(mo==='hit')return {n:'hit',p};
    if(mo==='stun')return {n:'stun',p};
    if(mo==='recovery')return {n:'recovery',p};
    if(mo==='defeat')return {n:'defeat',p};
    return {n:'idle',p};
  })();
  const ok=window.WarriorMotionExtra?.draw?.(wc,h,a);
  $('#wm').textContent=`${D.value} / ${Math.round(p*100)}% / ${mo}${ok?'':' / loading...'}`;$('#gm').textContent='walk/run 比較専用';
 }
 const catalog=window.WarriorMotion?.motions||[];
 $('#qa').innerHTML=`<b>基準:</b> 8方向 / 0.5–2x / コマ送り　 <span class="tag">本編共通</span><br><b>登録:</b> ${catalog.join(' / ')||'loading...'}`;
}
function step(delta){playing=false;$('#play').textContent='再生';if(isSheet())frame=(frame+delta+8)%8;else p=(p+delta*.05+1)%1;render()}
function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(playing){const k=Number(S.value)||1;if(M.value==='walk')frame=(frame+dt*k/.12)%8;else if(M.value==='run')frame=(frame+dt*k/.08)%8;else p=(p+dt*k/(M.value==='estella'?2.6:1))%1;render()}requestAnimationFrame(tick)}
M.addEventListener('change',()=>{frame=p=0;render()});D.addEventListener('change',render);S.addEventListener('change',render);
$('#play').addEventListener('click',()=>{playing=!playing;$('#play').textContent=playing?'停止':'再生'});
$('#prev').addEventListener('click',()=>step(-1));$('#next').addEventListener('click',()=>step(1));
for(const im of Object.values(sheet))im.addEventListener('load',render);
render();requestAnimationFrame(tick);
})();