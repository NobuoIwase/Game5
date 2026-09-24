(()=>{
'use strict';
/* v0.26.0 the heroine's voice.
   Aria is a warrior who is shy, withdrawn and bad with people: she stammers, trails off, talks
   to herself, and laughs in a creepy little "fuhi" when things go right or when she is nervous.
   Every line she says goes through here: the AI's plain thoughts are mapped to a situation and
   replaced with a line in her voice, and the new systems (holds, fatigue, ambushes) raise
   events of their own.
   Voice grammar (see docs/kink-profile-integrated.md, 第五部):
     first person わたし / sentences cut by 、and …… / endings dropped / laugh ふひっ・へ、へへ
     inner voice in （） / no typical feminine endings (〜だわ, 〜のよ)
     breaking point: the stammer turns into denial, the denial corrects itself into something
     worse, and the laugh leaks out as a breath. ♡ only at the very deepest band / Estella.
     After Estella she always closes on self-mockery or an excuse, never on surrender.
   Nutera bands: calm <35, strain <65, yield <90, crave (>=90 or Estella).
   Lines are drawn from shuffled bags so the same one does not come back soon. */
const P={
 explore:['……だ、誰も、いない……よね','こ、こっち……たぶん、こっち……','暗いとこ、やだな……ふひ……','ひ、ひとりのほうが、気楽、だし……','足音、わたしのだけ……だよね？','（地図、ほしい……）','奥……うぅ、行くしかない、か……','へ、へへ……探索は、得意……たぶん','……（帰りたい）'],
 search:['い、今の音……なに……？','き、聞こえた……気が、する……','音だけ、するの、いちばんやだ……','……いる。ぜったい、いる……','み、見えないの、ずるい……'],
 spot:['ひっ……！ い、いた……','あ、あっ……め、目が、合った……？','う、うわ……こっち、見てる……','で、出た……ふひっ、出ちゃった……','か、かわいく、ない……ぜんぜん……'],
 ambush:['ひゃっ！？ な、なんで、そこに……！','い、いつから、そこに……っ','き、聞いてない……っ！','そ、そこ、さっきまで、いなかった……っ'],
 dodge:['わ、わわっ……！','よ、避け……っ、避けた……！','むり、むりむり……っ','あぶ、な……っ、ふひ……','こ、こっち……！','ひ、……っ、当たって、ない……よね'],
 dodgeKnown:['そ、それ、知ってる……ふひっ','さっきと、同じ……なら……！','へ、へへ……もう、見た……'],
 attack:['え、えいっ……！','い、いけ……っ！','こ、今なら……当たる、はず……','ふひっ……い、今の、当たった……？','ご、ごめん……っ、えいっ……'],
 heavy:['ぜ、全力……っ、い、いきます……！','た、倒れて……っ、お願い……！'],
 guard:['た、盾……っ、盾……！','う、受け、る……っ！','こ、来ないで……っ'],
 interrupt:['じゃ、邪魔……する……っ','い、今……割り込め、る……！'],
 position:['ち、近い……近いって……','よ、横……横に……','間合い……間合い、だいじ……','そ、そんなに、寄らないで……'],
 retreat:['はぁ、はぁ……ちょ、ちょっと、休憩……','む、むり……いったん、逃げる……','息……っ、息、できない……','こ、ここなら……見つからない、よね……'],
 rest:['つ、疲れた……帰りたい……','す、少しだけ……座る……','ふぅ……だ、誰も、来ない、よね……'],
 trip:['あっ……！ こ、転んだ……ふひ……','い、いたた……み、見られて、ない……よね','足、もつれた……う、うそ……'],
 tired:['足、重……っ','も、もう、脚が、笑ってる……','ス、スタミナ……ないの、知ってた……'],
 lowSp:['も、もう……立って、られない、かも……','ま、まだ……倒れ、ない……っ'],
 chest:['た、宝箱……へへ……','あ、開けても、いい……よね？','ご褒美……ふひっ'],
 mimic:['ひっ……！ た、宝箱じゃ、ない……っ','う、うそ、うそ……っ','だ、騙された……っ、最悪……'],
 mimicWary:['こ、今度は……ほ、本物、だよね……？','た、叩いてから、開ける……'],
 item:['ふひっ……た、助かる……','へへ……これ、もらう……'],
 tower:['あ、あの塔……頭、ぐわんぐわん、する……','こ、壊す……っ、うるさい……'],
 clear:['お、終わった……？ ふひ……ふひひ……','か、勝った……わたし、勝った……','か、階段……は、はやく、次……'],
 surprise:['……え？ な、何か、来る……？','い、嫌な、感じ……'],
 watch:['み、見えてる……だ、大丈夫……','まだ……まだ、慌てない……'],
 fear:['こ、怖……っ、足、動かな……','ひ……っ、い、今の、遅れた……'],
 hazard:['あ、足元……なにか、ある……','ふ、踏まない……踏まない……'],
 grab:{calm:['ひっ……！ や、やだ、離し……っ','つ、捕まっ……た……？','ちょ、ちょっと、待っ……'],
  strain:['や、……また、捕まっ……っ','だ、だめ、今、捕まったら……っ'],
  yield:['……っ、ま、また……っ、ふ、ふひ……っ','や……いや、じゃ、なくて……っ'],
  crave:['ぁ、……っ、ま、また……♡']},
 special:{calm:['く、……っ、き、気持ち、悪……っ','ぬ、ぬるぬる、する……っ','や、やめ……っ、そこ、ちが……','っ、……へ、変な、とこ……っ'],
  strain:['ん、……っ、ち、ちが……これ、ちがう……っ','こ、声、出な……っ、出ない……っ','ふ、ふひ……っ、ちが、笑って、ない……っ','や……いえ、……止めなくても……っ、ち、ちがう……！'],
  yield:['あ、……っ、ぁ、……そこ、……そこ、は……っ','だ、だめ、……だめなのに……っ','ふ、……ふひ、……ぁ……っ','み、見ないで……わたし、今、キモい顔、してる……っ'],
  crave:['ぁ、……っ、ぁ……♡','も、……っ、もう……♡','や、……め、ないで……ぁ、ちが……♡']},
 struggle:{calm:['は、離れ……ろ……っ！','う、動け……っ、動けっ……'],strain:['ほ、ほどけ……っ、ほどけて……','ち、力……抜け、る……っ'],yield:['ち、力……入らない……っ','ぬ、抜けない……っ、ぁ……'],crave:['……っ、……ぁ……']},
 free:{calm:['ぬ、抜けた……っ！ ふひっ……','へ、へへ……振りほどいた……'],strain:['は、……っ、はぁ……っ、抜け、た……','……っ、い、今の、なし……なし、だから……'],yield:['……ぬ、抜け……た……？ あ、脚……っ','い、今の、ぜったい、忘れる……っ'],crave:['は、……っ、……ぁ……ぬ、けた……']},
 released:['……っ、は、離れ……た……？','な、なに、今の……'],
 toStrain:['か、身体、熱い……な、なんで……','へ、変……さっきから、ずっと……'],
 toYield:['……だ、だめ、……集中、できない……っ','あ、脚……ふらふら、する……っ'],
 toCrave:['も、もう、むり……っ、……ぁ……','……ふ、ふひ……わたし、なにして……'],
 estellaStart:['ぁ、……っ、——っ♡','い、……ぁ、……あ、ぁああ……っ♡','や、……っ、み、見ない、で……っ♡'],
 estella:['ぁ……♡ ……っ、……ぁ……','は、……っ、は、……ぁ……','——っ、……ん……♡'],
 estellaEnd:['は……っ、は、……ぁ……い、今のは……ちが……','……い、今の……ぜ、ぜったい、誰にも……言わない……','……ふ、ふひ……さ、最悪……','……み、見られて、ない……よね……？ ……よね……'],
 defeat:['……ご、ごめ……なさ……','……や、やっぱり……わたしじゃ……'],
 floor:['し、静か……ふひ、こういうの、嫌いじゃない……','じ、じめじめ……靴、濡れる……やだ……','い、糸……？ か、絡まったら、どうしよ……','こ、粉っぽい……吸ったら、だめな、やつ……','あ、甘い匂い……こ、こういうの、罠……','ね、眠くなる……だ、だめ、起きてて、わたし……','い、いちばん奥……こ、ここまで、来ちゃった……']
};
/* the AI's plain thoughts -> situations */
const MAP=[
 [/前と同じなら/,'dodgeKnown'],[/予兆|何が来る|射線|避け|外す|光の線/,'dodge'],[/盾で受け|受け止める/,'guard'],[/詠唱を止める|割り込む|詠唱の隙/,'interrupt'],
 [/全力|一気に間合い/,'heavy'],[/で仕掛ける|届かない|当てられる|斬/,'attack'],[/息が上が|離れよう|呼吸を整え|息を整え/,'rest'],
 [/偽物じゃないか|確かめてから/,'mimicWary'],[/宝箱じゃない|偽物/,'mimic'],[/宝箱/,'chest'],[/助かる/,'item'],[/塔/,'tower'],
 [/区画を制圧|階段へ/,'clear'],[/何か来る|え、/,'surprise'],[/慌てない|見えてる/,'watch'],[/怖い|遅れた/,'fear'],
 [/足元/,'hazard'],[/近すぎる|横へ回る|間合い/,'position'],[/静かすぎる|奥を確かめる|音|足音|確かめる|さっき見えた/,'search']
];
const RANK={calm:0,strain:1,yield:2,crave:3};
const band=h=>{const n=h.nutera||0;return h.estella?.active||n>=90?'crave':n>=65?'yield':n>=35?'strain':'calm'};
const bags=new Map(),lastLine=new Map();
function pick(key,b){
 const p=P[key];if(!p)return null;
 const arr=Array.isArray(p)?p:(p[b]||p.strain||p.calm),id=key+':'+(Array.isArray(p)?'':b);
 let bag=bags.get(id);
 if(!bag||!bag.length){bag=arr.slice().sort(()=>Math.random()-.5);if(bag.length>1&&bag[bag.length-1]===lastLine.get(id))bag.unshift(bag.pop());bags.set(id,bag)}
 const l=bag.pop();lastLine.set(id,l);return l;
}
function say(h,key,o={}){
 if(!o.force&&state.time<(h._voiceHold||0))return false;
 const l=pick(key,band(h));if(!l)return false;
 h.thought=h._voiceShown=l;h._voiceHold=state.time+(o.hold??2.4);h._voiceKey=key;return true;
}
/* a thought with no mapping keeps its content but gets her stammer */
function filter(raw){
 let s=raw.replace(/。$/,'……').replace(/。/g,'……');
 const c=s[0];if(/[ぁ-んァ-ン]/.test(c)&&Math.random()<.6)s=c+'、'+s;else if(Math.random()<.4)s='あ、'+s;
 return s;
}

/* stop the older pack lines (third person, generic tone) from speaking over her */
function mutePack(){const p=window.Game5Pack?.pack;if(p){p.dialog=null;p.rooms=null}}

const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h||!state.started)return;
 mutePack();
 const ev=h._voiceEvent;h._voiceEvent=null;
 if(h.dead){if(!h._saidDead){say(h,'defeat',{force:true,hold:99});h._saidDead=true}return}
 h._saidDead=false;
 // floor entry
 const room=state.dungeon?.room;
 if(room!=null&&h._voiceRoom!==room){h._voiceRoom=room;const l=P.floor[room];if(l){h.thought=h._voiceShown=l;h._voiceHold=state.time+3.2;return}}
 // Estella
 const est=!!h.estella?.active;
 if(est&&!h._vEst)say(h,'estellaStart',{force:true,hold:2.2});
 else if(!est&&h._vEst)say(h,'estellaEnd',{force:true,hold:3.4});
 else if(est&&state.time>(h._voiceHold||0))say(h,'estella',{hold:1.6});
 h._vEst=est;
 // events from the new systems
 if(ev){
  if(ev==='grab')say(h,'grab',{force:true,hold:1.8});
  else if(ev==='special')say(h,'special',{force:true,hold:1.4});
  else if(ev==='free')say(h,'free',{force:true,hold:2.4});
  else if(ev==='released')say(h,'released',{force:true,hold:2});
  else if(['trip','ambush','spot'].includes(ev))say(h,ev,{force:true,hold:2});
  else if(ev==='retreat')say(h,'retreat',{force:true,hold:2.6});
  else if(ev==='explore'&&state.time>(h._voiceHold||0)+2.5&&Math.random()<.35)say(h,'explore',{hold:3});
 }
 // Nutera climbing into a new band (outside holds, which have their own lines)
 const b=band(h);
 if(!h.grapple&&!est&&RANK[b]>RANK[h._vBand||'calm'])say(h,b==='strain'?'toStrain':b==='yield'?'toYield':'toCrave',{force:true,hold:2.6});
 h._vBand=b;
 if(h.grapple&&state.time>(h._voiceHold||0)+.6)say(h,'struggle',{hold:1.6});
 if(!h.grapple&&!est&&(h.fatigue||0)>.8&&h.moving&&state.time>(h._voiceHold||0)+4&&Math.random()<.02)say(h,'tired',{hold:2.2});
 if(!h.grapple&&!est&&h.sp<h.maxSp*.18&&state.time>(h._voiceHold||0)+5&&Math.random()<.02)say(h,'lowSp',{hold:2.2});
 // the AI's own thoughts
 if(h.thought&&h.thought!==h._voiceShown){
  const raw=h.thought;
  // the same situation keeps its line a little longer instead of cycling every tick
  if(state.time<(h._voiceHold||0)+(raw===h._lastRaw?3:0)){h.thought=h._voiceShown;return}
  h._lastRaw=raw;
  const m=MAP.find(([r])=>r.test(raw));
  if(!(m&&say(h,m[1],{hold:2.2}))){h.thought=h._voiceShown=filter(raw);h._voiceHold=state.time+2}
 }
};
window.Game5Voice={version:'0.26.0',lines:P,say,band};
})();
