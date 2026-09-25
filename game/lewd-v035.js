(()=>{
'use strict';
/* v0.35.0 heat in words. Two voices:
   - her own (speech bubble): moans as Nutera climbs outside holds, a harder Estella that
     breaks from words to vowels to marks (profile 3B-3), and a longer afterglow
   - the narration in the message window (profile 3B-1 / 3B-8): short sentences that follow her
     body - every special of a hold gets a line that deepens beat by beat, and depends on how she
     is held (swallowed, wrapped, clung to, spores, scales, a gaze, bubbles, cold); Estella is
     told the way that hold makes it happen; the afterglow is told; the last line of each climax
     is her pride or her self-deception.
   Lines are kept short so they fit the window on a phone. */
const STYLE={gel:'engulf',slug:'engulf',mirror_slime:'engulf',crown_attendant:'engulf',water_wraith:'engulf',
 worm:'wrap',silk_spider:'wrap',snare:'wrap',creeping_hand:'wrap',lure_cap:'wrap',flower:'wrap',stone_sentinel:'wrap',
 leech:'cling',orb:'spore',moth:'dust',gazer:'gaze',bubble_shell:'bubble',wisp:'mist'};
const N='アリア';
/* narration per hold, three beats that deepen (specials 1-2, 3-4, 5+) */
const HOLD={
 engulf:[[`ぬるい粘体が、${N}の脚を腰まで呑みこんだ。`,`粘体の中で、内腿がゆっくり揉まれている。`,`剣を振ろうとした腕まで、ぬめりに押さえられた。`],
  [`粘体が脈打つたび、秘所に柔らかい圧がかかる。`,`押し返すほど、ぬめりは形を変えて入りこむ。`,`抗う腰の動きが、そのまま擦りつける動きになる。`],
  [`粘体の内側で、${N}の腰がびく、びくと跳ねる。`,`くぐもった声が、粘液の泡になって浮いてくる。`,`呑まれた下半身が、粘体の拍子に合わせて揺れている。`]],
 wrap:[[`節くれた何かが、${N}の腰に巻きついた。`,`締めつけが胸の下で一段、強くなる。`,`剣の柄を握る手首まで、ぐるりと巻かれた。`],
  [`締めて、緩めて、また締める。その拍子が続く。`,`巻かれた胸の先が、布越しに擦られている。`,`緩んだ一瞬に、腰だけが勝手に追いかけた。`],
  [`締めつけに合わせて、${N}の背中が反る。`,`巻きついたものが、内腿の間を這い上がっていく。`,`もう締めつけに逆らわず、腰で拍子を取っている。`]],
 cling:[[`吸盤が、${N}の首筋に吸いついた。`,`吸いつかれた肌が、じんわり熱を持っていく。`,`羽音が、耳のすぐ横で震えている。`],
  [`吸盤が胸元に移る。吸われるたび、息が詰まる。`,`羽の震えが、吸いついた一点から全身へ広がる。`,`剥がそうとした指が、途中で止まった。`],
  [`吸われるリズムに、${N}の喉が合わせて鳴る。`,`吸盤の下で、胸の先が硬く尖っている。`,`羽音と一緒に、甘い声が漏れはじめた。`]],
 spore:[[`甘い胞子を、${N}は正面から吸いこんだ。`,`胞子の粒が、汗ばんだ肌に貼りついていく。`,`息を止めても、肌から熱が入ってくる。`],
  [`こぶが押しつけられ、胞子がまた弾けた。`,`頭の芯がぼうっとして、剣先が下がる。`,`下腹の奥に、じくじくと熱がたまっていく。`],
  [`胞子を吸うたび、${N}の膝が内側に折れる。`,`もう息を止めようとしていない。`,`甘い匂いの中で、腰がゆるく揺れている。`]],
 dust:[[`鱗粉が、${N}の頬と首をふわりと撫でた。`,`翅の模様から、目が離れない。`,`撫でられた場所だけ、肌がちりちりと痺れる。`],
  [`鱗粉が、胸元から腹へと撫でおろされる。`,`翅の模様を見つめたまま、唇が半開きになる。`,`痺れが、下腹のあたりに集まっていく。`],
  [`撫でられるたび、${N}の身体が小さく跳ねる。`,`目は翅の模様を追ったまま、焦点が合っていない。`,`鱗粉まみれの肌が、汗でてらてらと光っている。`]],
 gaze:[[`大きな目が、${N}のすぐ前で止まった。`,`見つめられているだけで、脚が動かない。`,`瞳の奥で、何かがゆっくり渦を巻いている。`],
  [`触手が、見つめられて動けない身体を撫でていく。`,`瞳が近づくたび、${N}の抵抗が一拍遅れる。`,`撫でられた内腿が、命令されたように開いた。`],
  [`見つめられたまま、${N}は小さく頷いている。`,`何を言われたのか、本人はもう覚えていない。`,`瞳の渦に合わせて、腰がゆっくり回っている。`]],
 bubble:[[`泡が、${N}の身体をまるごと包みこんだ。`,`泡の中で、声がくぐもって外に漏れない。`,`殻の縁が、太腿に吸いついている。`],
  [`泡が肌の上で弾けるたび、びくりと震える。`,`殻の吸いつきが、内腿を少しずつ上ってくる。`,`弾ける泡の数を、身体が勝手に数えている。`],
  [`泡の中で、${N}の口がはくはくと開いている。`,`泡が弾けるたびに、腰が小さく跳ねる。`,`泡の外には、もう何も聞こえていない。`]],
 mist:[[`冷たい霧が、${N}の服の内側に入りこんだ。`,`耳元で、すすり泣くような声がする。`,`冷たさに、胸の先がきゅっと縮こまる。`],
  [`霧が、背中から腰へとすり抜けていく。`,`耳打ちの言葉が、頭の中でくり返される。`,`冷えた肌の下で、芯だけが熱くなっていく。`],
  [`冷たい手に撫でられたように、${N}が震える。`,`すすり泣きに、${N}自身の声が重なりはじめた。`,`冷気の中で、吐く息だけが白く甘い。`]]
};
/* Estella, told the way the hold makes it happen */
const CLIMAX={
 engulf:[`${N}の背中が、粘体の中で弓なりにしなった——`,`呑まれたまま達して、跳ねる先がない。`,`くぐもった痙攣が、粘体をぶるぶると震わせる。`,`粘体は、達したばかりの身体を吐き出さない。`],
 wrap:[`締めつけの中で、${N}の身体が大きく跳ねた——`,`巻かれた腰だけが、何度も、何度も波打つ。`,`締めつけは緩まない。震えを数えるように、締めなおす。`,`声にならない声が、喉の奥で途切れた。`],
 cling:[`吸いつかれた一点から、痺れが一気に弾けた——`,`${N}は羽音の中で、がくがくと膝を折った。`,`吸盤は、震える肌を吸いつづけている。`],
 spore:[`甘い匂いの中で、${N}の視界が白く弾けた——`,`膝から崩れて、胞子の中に座りこむ。`,`吸いこむたび、余韻がもう一度ぶり返す。`],
 dust:[`翅の模様を見つめたまま、${N}は達した——`,`痙攣する身体に、鱗粉がゆっくり降りつもる。`,`焦点の合わない目が、まだ模様を追っている。`],
 gaze:[`見つめられたまま、${N}の身体が勝手に達した——`,`声も、抵抗も、瞳の渦に吸いこまれていく。`,`何が起きたのか、本人だけが知らない。`],
 bubble:[`泡の中で、${N}の身体が大きく震えた——`,`声は泡に閉じこめられて、外には漏れない。`,`泡がひとつ弾けるたび、余韻が走る。`],
 mist:[`冷たい霧の中で、${N}の身体だけが熱く弾けた——`,`すすり泣きに、${N}の嬌声が混ざって消える。`,`震える肌を、冷気がなおも撫でていく。`],
 none:[`誰にも触れられていないのに、${N}は達した——`,`腰が抜け、剣を杖にして膝をつく。`,`内腿を、熱いものがつたって落ちていく。`]
};
const PRIDE=[`……それでも、剣の柄だけは離さなかった。`,`……唇を噛んで、声をもう一度殺そうとしている。`,`……震える手で、乱れた裾を直そうとしている。`,`……「見てない、よね」と、誰にともなくつぶやいた。`];
const AFTER=[`${N}の息が、まだととのわない。`,`太腿が、小刻みにふるえている。`,`歩くたびに、腰がかくんと落ちかける。`,`下腹の奥に、まだ熱が居座っている。`,`${N}は時々、何かを思い出したように身をすくめる。`,`乱れた髪を直す手が、まだ少し震えている。`];
const BAND={strain:[`${N}の頬が、うっすらと上気している。`,`${N}は時々、内腿をすり合わせている。`],
 yield:[`${N}の息が、目に見えて荒くなってきた。`,`歩くたびに、${N}は小さく息を詰める。`],
 crave:[`${N}の息が、甘く濁りはじめている。`,`剣を握る手に、もう力が入っていない。`]};
const WET=[`歩くたびに、ぬちゃ、と小さな音がする。`,`粘液が、内腿をつたって膝まで垂れている。`,`${N}の通ったあとに、濡れた足跡が続いている。`];
/* her own voice */
const V={
 moan:{strain:['ん……っ、く、ぅ……','……っ、な、なんで……い、今……','は、……っ、へ、変な、感じ……っ'],
  yield:['あ、……っ、ちが……これ、は……っ','ん、ぁ……っ、だ、だめ、……っ','……っ、ぁ、あし、……ちから、はい、らな……'],
  crave:['あ、あっ、……ぁあっ……そこ、……ぇ……っ','……っ、ぁ、……や、……もう、……ぁあ……','ふ、ぁ……っ、……ぁ、……ぁあ……♡']},
 estellaStart:['い、……っ、く……ち、ちが……っ、あ、ぁ、ぁあああ……っ——〜〜っ♡','や、だ、だめ、だめだめ……っ、——っ、〜〜〜っ♡♡','み、見ない、で……っ、いま、……ぁ、あ——〜〜っ♡','——っ♡！ ……ぁ、♡ ……っ、ぁ……♡'],
 estella:['〜〜っ♡ ……ぁ、……ぁ、♡','は、……っ、ぁ、……ま、また……っ♡','——っ、……ん、……ぁ♡ ……と、とまら、な……っ'],
 estellaEnd:['は……っ、は、……ぁ……っ、……ん……','……い、今の……ち、ちが……ちがう、から……','……ふ、ふひ……さ、最悪……ぜ、ぜったい、記録、しないで……','……ぁ……っ、……あ、脚……た、立て、な……'],
 afterHot:['……ん……っ、ま、まだ……じんじん、して……','……ふ、ふひ……ひ、膝……わらって、る……','……は、ぁ……い、今、さわられたら……だ、だめ……♡','……だ、大丈夫……わ、わたし、戦える……た、たぶん……']
};
const Vo=()=>window.Game5Voice,M=()=>window.Game5Message;
if(Vo()?.lines){const L=Vo().lines;L.moan=V.moan;L.afterHot=V.afterHot;L.estellaStart=[...V.estellaStart];L.estella=[...V.estella];L.estellaEnd=[...V.estellaEnd]}
if(Vo()?.strong)for(const k of ['moan','afterHot'])Vo().strong.add(k);
const band=h=>Vo()?.band?.(h)||'calm';
const pick=a=>a[(Math.random()*a.length)|0];
/* a queue so a climax is told over a few seconds instead of all at once */
let queue=[];
function tell(lines,gap=1.1,start=0){let t=state.time+start;for(const l of lines){queue.push({at:t,text:l});t+=gap}}
let sp0=null,est0=false,styleAt=null,band0='calm',n0=0,gainT=0,moanT=0,afterT=0,wetT=0,estN=0;
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h||!state.started||h.dead)return;
 const g=h.grapple,t=state.time,style=g?(STYLE[g.e?.type||'snare']||'wrap'):null;
 if(g)styleAt=style;
 // a line of narration for each special, deepening beat by beat
 if(g&&g.specials!==sp0&&sp0!=null&&g.specials>sp0&&!h.estella?.active&&!queue.length){const beat=Math.min(2,Math.floor((g.specials-1)/2)),pool=HOLD[style]?.[beat];if(pool)M()?.say?.(pick(pool),'lw',.2)}
 sp0=g?g.specials:null;
 // Estella: told as the hold makes it happen, ending on her pride
 const est=!!h.estella?.active;
 if(est&&!est0){estN++;const c=CLIMAX[g?style:'none']||CLIMAX.none;queue=[];tell([...c,pick(PRIDE)],1.25,.4)}
 if(!est&&est0){afterT=t+6}
 est0=est;
 // Nutera climbing outside holds: she moans; the narration notes the band
 const n=h.nutera||0;
 if(n>n0+.01)gainT+=n-n0;gainT=Math.max(0,gainT-dt*3);n0=n;
 if(!g&&!est&&gainT>6&&t>moanT&&t>(h._voiceHold||0)-.5){moanT=t+4.5;gainT=0;Vo()?.say?.(h,'moan',{force:true,hold:1.8})}
 const b=band(h);
 if(b!==band0&&BAND[b]&&!est&&!g&&({calm:0,strain:1,yield:2,crave:3}[b]>{calm:0,strain:1,yield:2,crave:3}[band0]))M()?.say?.(pick(BAND[b]),'band:'+b,20);
 band0=b;
 // afterglow: her breath and the narration
 if(!g&&!est&&(h.afterglow>0||t<afterT)){
  if(Math.random()<dt*.22)M()?.say?.(pick(AFTER),'after',5);
  if(Math.random()<dt*.12&&t>(h._voiceHold||0)+1)Vo()?.say?.(h,'afterHot',{hold:2.4});
 }
 // wet walking
 if(!g&&h.moving&&(h.wet||0)>.35&&t>wetT){wetT=t+10+Math.random()*6;M()?.say?.(pick(WET),'wetw',8)}
 // the queue
 while(queue.length&&queue[0].at<=t){const q=queue.shift();M()?.say?.(q.text,null)}
};
const baseReset=reset;reset=function(){const r=baseReset();queue=[];sp0=null;est0=false;band0='calm';return r};
window.Game5Lewd={version:'0.35.0',hold:HOLD,climax:CLIMAX,busy:()=>queue.length>0};
})();
