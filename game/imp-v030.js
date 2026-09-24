(()=>{
'use strict';
/* v0.30.0 a voice from the dark (profile: 小淫魔 - teasing, sweet-voiced ♡, "ざぁ〜こ♡", never
   lifts a hand herself and sets the others on the prey; and 報告・追及・訂正, the three layers
   of a confession). The director's familiar, a little succubus nobody sees, comments on the
   heroine's worst moments: caught by a shadow, let go at the edge, hesitating over the one she
   has fallen for, tripping, being watched, Estella. When Aria understates her report on a
   floor, it is the voice that calls the lie, and her correction comes after it.
   Text only, top centre of the screen; she sometimes answers it. */
const C={cool:9,chance:.55,show:2.8};
const T={
 grab:['ざぁ〜こ♡ また捕まった〜♡','あはっ♡ 自分から当たりに行ってない〜？♡'],
 snare:['影にまで捕まるんだ〜♡ ざぁ〜こ♡','ほら、足元♡ 見てなかったの〜？♡'],
 edge:['あはっ♡ いま、ちょっと残念そうだったね〜♡','あと少しだったのに〜♡ ねえ、続き、ほしい？♡'],
 edgePull:['ほら〜♡ 腰、そっち行ってるよ〜？♡','戦士さん、自分から寄ってってる〜♡ だっさ〜♡'],
 hesitate:['斬れないんだ〜♡ そいつのこと、好きになっちゃった？♡','あはっ♡ 剣、下ろしちゃった〜♡'],
 trip:['転んだ〜♡ よわよわ〜♡','ねえ今の見た〜？♡ みんな見てたよ〜♡'],
 watched:['みんな見てるよ〜♡ 声、我慢しないの〜？♡','ほら、見られてる♡ いい顔しなきゃ〜♡'],
 estella:['え〜♡ もうエステラ〜？ 戦士さん、よわよわ〜♡','あはっ♡ 記録しとくね〜♡ ぜ〜んぶ♡'],
 lie:['うそつき〜♡ ほんとは何回だっけ〜？♡','え〜？♡ それだけ〜？ ちゃんと数えて〜♡'],
 forgot:['ほんとに〜？♡ あはっ、覚えてないんだ〜♡','な〜んにも？♡ ふ〜ん♡'],
 trance:['いい子いい子♡ ちゃんとお返事できたね〜♡'],
 attach:['くっつけたまま歩くんだ〜♡ 似合ってるよ〜♡']
};
/* which of her lines it answers, and how */
const ON={grab:'grab',grabAgain:'grab',grabKnown:'grab',edge:'edge',edgePull:'edgePull',charmHesitate1:'hesitate',charmHesitate2:'hesitate',charmHesitate3:'hesitate',
 trip:'trip',watched:'watched',estellaStart:'estella',tranceOut:'trance',attach:'attach'};
const REACT=['……だ、誰……っ','う、うるさい……っ、ち、ちが……','……き、聞こえて、ない……','……い、いまの、声……っ'];
const V=()=>window.Game5Voice;
if(V()?.lines){V().lines.impReact=REACT}
const bags={};
function pick(k){const a=T[k];let b=bags[k];if(!b||!b.length){b=bags[k]=a.slice().sort(()=>Math.random()-.5)}return b.pop()}
let cur=null,queue=null,lastT=-99,lastShown=null,count=0;
function taunt(k,delay=.8,force=false){
 if(!T[k]||queue)return;
 if(!force&&(state.time-lastT<C.cool||Math.random()>C.chance))return;
 queue={k,at:state.time+delay};
}
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h||!state.started||state.over)return;
 if(h._voiceShown!==lastShown){
  lastShown=h._voiceShown;const k=h._voiceKey,s=h._voiceShown||'';
  if(k==='report'&&/捕まった、だけ/.test(s)){if(/ほんとは/.test(window.Game5Heat?.peek?.()||''))taunt('lie',1.1,true)}
  else if(k==='report'&&/何も、なかった/.test(s))taunt('forgot',1.1,true);
  else if(k==='grab'&&!h.grapple?.e)taunt('snare');
  else if(ON[k])taunt(ON[k],k==='estellaStart'?1.4:.8,k==='estellaStart');
 }
 if(queue&&state.time>=queue.at){
  const l=pick(queue.k);cur={text:l,t:C.show};lastT=state.time;count++;h.impTaunts=count;queue=null;
  log(`闇の声「${l}」`);
  if(!h.estella?.active)applyNutera(h,1.5,{source:'闇の声'});
  // she answers now and then, unless she is busy with something worse
  if(!h.grapple&&!h.estella?.active&&Math.random()<.45)h._impReplyAt=state.time+1.2;
 }
 if(h._impReplyAt&&state.time>=h._impReplyAt){h._impReplyAt=0;V()?.say?.(h,'impReact',{hold:2})}
};
const baseReset=reset;reset=function(){const r=baseReset();cur=null;queue=null;count=0;lastT=-99;return r};
/* drawing */
let last=performance.now();
function draw_(){
 const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;
 if(!cur)return;cur.t-=dt;if(cur.t<=0){cur=null;return}
 const a=Math.min(1,cur.t*3,(C.show-cur.t)*6);
 ctx.save();ctx.globalAlpha=a;ctx.font='700 14px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 const w=ctx.measureText(cur.text).width+34,x=SW/2,y=64;
 ctx.fillStyle='rgba(28,6,22,.82)';ctx.strokeStyle='rgba(255,120,200,.55)';ctx.lineWidth=1.2;
 ctx.beginPath();ctx.roundRect?ctx.roundRect(x-w/2,y-15,w,30,15):ctx.rect(x-w/2,y-15,w,30);ctx.fill();ctx.stroke();
 ctx.fillStyle='#ffc2e6';ctx.fillText(cur.text,x,y+1);
 ctx.font='700 9px system-ui,sans-serif';ctx.fillStyle='#c98ab0';ctx.fillText('闇の声',x,y-22);
 ctx.restore();
}
const bDraw=draw;
draw=function(){bDraw();if(state.started)screenSpace(draw_)};
window.Game5Imp={version:'0.30.0',cfg:C,lines:T,count:()=>count};
})();
