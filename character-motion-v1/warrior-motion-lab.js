
(()=>{
'use strict';
const $=q=>document.querySelector(q);
const dirs=['front','down_right','right','up_right','back','up_left','left','down_left'];
const M=$('#m'),D=$('#d'),S=$('#s'),W=$('#w'),G=$('#g'),wc=W.getContext('2d'),gc=G.getContext('2d');
let f=0,p=0,last=performance.now(),playing=true;
const I=u=>{const x=new Image();x.src=u;return x};
const sheet={
  ww:I('exports/warrior/walk.png'),
  wr:I('exports/warrior/run.png'),
  gw:I('generic/generic-walk-8dir-8frames.png'),
  gr:I('generic/generic-run-8dir-8frames.png')
};
function isSheet(){return M.value==='walk'||M.value==='run'}
function render(){
  const mo=M.value,di=Math.max(0,dirs.indexOf(D.value));
  wc.clearRect(0,0,W.width,W.height);gc.clearRect(0,0,G.width,G.height);
  if(isSheet()){
    const wi=mo==='walk'?sheet.ww:sheet.wr,gi=mo==='walk'?sheet.gw:sheet.gr,fi=Math.floor(f)%8;
    if(wi.complete&&wi.naturalWidth)wc.drawImage(wi,fi*384,di*512,384,512,0,15,384,512);
    if(gi.complete&&gi.naturalWidth)gc.drawImage(gi,fi*192,di*256,192,256,0,0,192,256);
    $('#wm').textContent=`${D.value} / frame ${fi+1} / ${mo}`;
    $('#gm').textContent=`${D.value} / frame ${fi+1} / generic ${mo}`;
  }else{
    const ok=window.WarriorMotion?.drawLab?.(wc,D.value,mo,p,{rootX:192,rootY:330,scale:1});
    gc.fillStyle='#9aa8b2';gc.font='14px system-ui';gc.fillText(ok?'戦士固有リグを表示中':'リグ読込中…',26,126);
    $('#wm').textContent=`${D.value} / ${Math.round(p*100)}% / ${mo}`;
    $('#gm').textContent='walk / run 比較専用';
  }
  const q=window.WarriorMotion?.qa?.();
  $('#qa').textContent=q
    ?`通常斬りQA: max Δ ${q.maxJointDelta}°/sample / peak ${(q.peakProgress*100).toFixed(1)}% / smooth=${q.smooth} / impactClose=${q.impactClose}`
    :`レンダラー読込中… ${window.WarriorMotion?.error?.()||''}`;
}
function step(delta){
  playing=false;$('#play').textContent='再生';
  if(isSheet())f=(f+delta+8)%8;
  else p=(p+delta*.05+1)%1;
  render();
}
function tick(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(playing){
    const k=Number(S.value)||1;
    if(M.value==='walk')f=(f+dt*k/.12)%8;
    else if(M.value==='run')f=(f+dt*k/.08)%8;
    else p=(p+dt*k/(M.value==='estella'?2.6:1))%1;
    render();
  }
  requestAnimationFrame(tick);
}
M.addEventListener('change',()=>{f=0;p=0;render()});
D.addEventListener('change',render);S.addEventListener('change',render);
$('#play').addEventListener('click',()=>{playing=!playing;$('#play').textContent=playing?'停止':'再生'});
$('#prev').addEventListener('click',()=>step(-1));
$('#next').addEventListener('click',()=>step(1));
for(const im of Object.values(sheet))im.addEventListener('load',render);
render();requestAnimationFrame(tick);
})();
