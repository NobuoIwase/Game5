(()=>{
'use strict';
/* v0.32.0 Aria's notebook (profile 3B-6: the bestiary as her own handwritten record - plain
   "da/de aru" style, crossings-out where desire pulled the pen, entries that get worse with each
   addition, margin notes where the truth leaks; and 推論4: the world remembers).
   One page per kind of monster that has held her, kept across runs in the body memory. Each
   remembered hold adds to the page: the first entry is calm and practical, the second has a
   line struck through, from the third the writing breaks up and a margin note appears, and a
   page she has returned to many times gets one last line. Holds lost to hypnosis are not in her
   notebook at all - but an unfamiliar hand has added the real count to those pages.
   Opened from the start card and the end card. */
const E={
 slug:['石の前室に多い。動きは遅い。粘膜に触れると滑って足を取られる。距離を取って斬れば問題ない。',
  '二度目。足首から這い上がってくる。粘膜は温かい。<s>思っていたより、嫌では</s>距離を取ること。徹底する。',
  'ぬめりが、脚を伝って、上まで。<s>舐め上げられると、声が</s>書かなくていい。距離を。|靴の中まで濡れていた。まだ乾かない。',
  '（同じ一文が何度も消されている。最後の一行だけ読める）……次は、近づかない。'],
 leech:['小さい。速い。吸盤で吸い付いて離れない。取れるまで歩きにくい。見つけたら先に落とす。',
  '吸い付かれた場所が、しばらく熱い。羽音が、身体の奥まで響く。<s>震えが、ちょうど</s>先に落とす。',
  '吸い付いたまま歩いた。歩くたびに、<s>擦れて、何度も</s>落とせなかった。|跡が、まだ少し赤い。見ないで。',
  '（強い筆圧で、一行だけ）……ちいさいくせに。'],
 worm:['太い。絹の糸で締め付けてくる。締め付けは強いが、節の間が弱いはず。',
  '節がうねると、締め付けが波のように来る。<s>波のたびに息が</s>節の間を狙う。狙えなかった。',
  '締められて、身体の形を、覚えられた気がする。<s>次に締められたら、きっと、もう</s>|絹が肌に残って、ずっとくすぐったい。',
  '（絹糸が一本、このページに挟まっている）'],
 orb:['胞子を吹きかけてくる。吸うと頭がぼんやりする。息を止めて近づく。',
  '息を止めても、肌から入ってくる。こぶを押し付けられると、<s>甘い匂いで、力が</s>息を止める時間を延ばす練習をする。',
  '胞子の匂いが、まだ服に残っている。<s>嗅いでしまう。わざとではない。</s>|洗っても取れない。……洗ってない、かもしれない。',
  '（ページの端が、少しだけ甘い匂いがする）'],
 gel:['最奥の主。大きい。粘膜で包み込んでくる。冠が脈打つと、頭の中まで響く。',
  '包まれている間、外の音が聞こえなかった。冠の脈動に、<s>心臓を合わせてしまった</s>冠を狙う。',
  '包まれると、ぜんぶ、どうでもよくなる。<s>包まれていたい</s>|主を倒すのが、わたしの役目。わたしの、役目。',
  '（「役目」という字が、何度も重ねて書かれている）'],
 flower:['動かない花。蜜を垂らして待っている。近づかなければ、無害。',
  '近づくつもりは、なかった。蜜の匂いがして、<s>気づいたら、自分から</s>近づかないこと。',
  '花弁に抱かれると、あたたかい。<s>待っていてくれた、と思ってしまった</s>|花は、誰でも待っている。わたしだけじゃない。……わかってる。',
  '（押し花にされた花弁が一枚、挟まっている）'],
 moth:['鱗粉で撫でてくる。翅の模様を見てはいけない。目を逸らして斬る。',
  '翅の模様を、見てしまった気がする。そのあとのことは、よく覚えていない。<s>覚えていないのに、身体が</s>見ないこと。',
  '（途中から、誰かに言われた言葉を書き写したような字になっている）|わたし、こんなこと書いた？',
  '（「見ないこと」と、何十回も書いてある）'],
 mirror_slime:['鏡のような体。映った自分と重なろうとしてくる。冷たい。',
  '映し身と重なると、自分に触られているみたいだった。<s>自分の顔が、あんな</s>映さないように、横から斬る。',
  '鏡の中のわたしは、抵抗していなかった。<s>あれが本当の</s>|ちがう。あれは鏡。鏡は嘘をつく。',
  '（ページの一部に、手鏡を置いたような丸い曇りがある）'],
 silk_spider:['糸で巻いてくる。脚が多い。糸は刃で切れる。',
  '巻かれている間、脚で撫でられた。数えたら、八本ぜんぶだった。<s>数える余裕が</s>糸は、切れるうちに切る。',
  '巻かれると、動けないのが、少し楽だと思った。<s>動かなくていいなら</s>|楽じゃない。楽じゃない。',
  '（白い糸くずが、ページに絡まっている）'],
 bubble_shell:['泡で包み込んでくる。泡は割れやすい。殻は固い。',
  '殻に吸い付かれた。泡の中は、息がしにくい。<s>泡の中だと、声が外に漏れない</s>泡を割ってから斬る。',
  '泡が肌の上で弾けるたびに、<s>小さく、何度も</s>|水の音が耳に残っている。',
  '（丸い水の染みが、いくつも並んでいる）'],
 crown_attendant:['主の手前にいる。灰色の粘液で抱え込んでくる。冠が主と共鳴する。',
  '共鳴を聞いたあと、しばらく主の声が聞こえる気がした。<s>命じられたら、きっと</s>耳をふさいで斬る。',
  '（途中から筆跡が変わる。丁寧すぎる字で「はい」と一行だけある）|わたしの字じゃない。',
  '（灰色の指の跡が、ページの角についている）'],
 wisp:['冷たい。すり抜けてくる。斬っても手応えが薄い。',
  '耳元ですすり泣く。何を言っているのか、分かりそうで分からない。<s>分かってしまったら</s>耳を貸さない。',
  'すすり泣きが、わたしの声に聞こえた。|夜、同じ声がする。わたしは泣いていない。',
  '（文字が一か所、水で滲んでいる）'],
 creeping_hand:['床を這う手。足首をつかんでくる。見た目より力が強い。',
  '足首から、指が一本ずつ上がってくる。数えないようにしても、<s>次がどこか、待ってしまう</s>足元を先に見る。',
  '指の感触を、まだ覚えている。<s>どこまで上がってきたか</s>|書かない。',
  '（ページの下の方に、爪で引っかいたような線が五本ある）'],
 gazer:['大きな目。見られると、動けなくなる。見返してはいけない。',
  '見られている間のことが、ところどころ抜けている。<s>抜けているところで、わたしは</s>見返さない。',
  '（このページは白紙に近い。真ん中に小さく「はい」と書いてある）|いつ書いた？',
  '（小さな「はい」が、ページいっぱいに並んでいる）'],
 lure_cap:['光る茸。甘い胞子で誘う。襞が巻きついてくる。光に近づかない。',
  '光がきれいで、立ち止まってしまった。襞は、<s>柔らかくて、湿っていて</s>光を見ない。',
  '甘い匂いがすると、脚が向く。<s>向かせてくれる</s>|自分の脚なのに。',
  '（青緑に光る粉が、ページの隅に残っている）'],
 water_wraith:['水の腕で引き込んでくる。冷たい。水から離れて戦う。',
  '引き込まれて、水の中で抱えられた。冷たいのに、<s>中が熱くて</s>水辺を歩かない。',
  '水の流れが、身体の中まで入ってくる気がした。<s>流されてしまえば</s>|まだ耳の奥で水の音がする。',
  '（ページ全体が一度濡れて、乾いたように波打っている）'],
 stone_sentinel:['石の番兵。動きは遅い。ひびの奥に桃色の肉が見える。ひびを狙う。',
  '石の腕で抱えられると、びくともしない。ひびが脈打つたびに、<s>こちらの鼓動まで</s>近づく前にひびを狙う。',
  '石なのに、あたたかかった。<s>もう少し、あのまま</s>|石に、あたたかいと書くのはおかしい。消さない。',
  '（小さな石のかけらが、挟まっている）'],
 snare:['床の影から手が出る。誰かが仕掛けている。足元を見る。',
  '影の手は、わたしの弱いところを、知っている。<s>誰が、教えた</s>足元を見る。',
  '誰かが、わたしが捕まるのを見ている気がする。<s>見ていてほしい</s>|見てない。誰も見てない。',
  '（「足元」とだけ、何度も書いてある）']
};
const MK='game5.bodyMemory';
function mem(){try{return JSON.parse(localStorage.getItem(MK)||'{}')}catch(_){return{}}}
function save(m){try{localStorage.setItem(MK,JSON.stringify(m))}catch(_){}}
/* remembered holds are counted separately from all holds; older saves count everything as remembered */
function counts(m){m.noted||={};m.lostHeld||={};return m}
// once, before this session adds anything: an older save counts all its holds as remembered
try{const m0=mem();if(!m0.noted&&m0.held){m0.noted={...m0.held};m0.lostHeld={};save(m0)}}catch(_){}
let added=[];
const tierOf=n=>n>=8?4:Math.min(3,n);
function note(t,lost){
 const m=counts(mem());
 if(lost)(m.lostHeld||={})[t]=(m.lostHeld[t]||0)+1;
 else{const n0=m.noted[t]||0,n1=n0+1;m.noted[t]=n1;if(E[t]&&tierOf(n1)>tierOf(n0))added.push({t,tier:tierOf(n1)})}
 save(m);
}
const baseReset=reset;reset=function(){const r=baseReset();added=[];return r};
const nameOf=t=>window.Game5Monsters?.profiles?.[t]?.name||(t==='snare'?'影の手':t);
const esc=s=>s;
function page(t,n,lost){
 const e=E[t];if(!e)return'';
 const tiers=n>=8?4:Math.min(3,n),out=[];
 if(n<=0&&lost>0)out.push('<p class="nbBlank">（白紙。なぜか栞が挟まっている。挟んだ覚えはない）</p>');
 for(let i=0;i<Math.min(tiers,3);i++){const [body,margin]=e[i].split('|');out.push(`<p class="nbE nbT${i+1}">${esc(body)}</p>`);if(margin)out.push(`<p class="nbM">欄外：${esc(margin)}</p>`)}
 if(tiers>=4)out.push(`<p class="nbE nbT4">${e[3]}</p>`);
 if(lost>0)out.push(`<p class="nbImp">（知らない筆跡で）ほんとは、あと${lost}回♡</p>`);
 return `<section class="nbPage"><h4>${nameOf(t)}<small>${n?`記憶にあるのは${n}回`:'記憶にない'}</small></h4>${out.join('')}</section>`;
}
function html(){
 const m=counts(mem()),types=[...new Set([...Object.keys(m.noted||{}),...Object.keys(m.lostHeld||{})])].filter(t=>E[t]);
 types.sort((a,b)=>((m.noted[b]||0)+(m.lostHeld?.[b]||0))-((m.noted[a]||0)+(m.lostHeld?.[a]||0)));
 const T=Object.entries(m.titles||{}).sort((a,b)=>b[1]-a[1]);
 const slip=T.length?`<section class="nbSlip"><h4>（最後のページに、誰かが紙を貼っている）</h4><p class="nbSlipHead">記録係の控え——この戦士に付いた称号</p><ul>${T.map(([n,c])=>`<li>「${n}」${c>1?`<small>×${c}</small>`:''}</li>`).join('')}</ul><p class="nbM">欄外（本人の字）：剥がせない。</p></section>`:'';
 if(!types.length)return (slip||'<p class="nbEmpty">まだ何も書かれていない。</p>');
 return types.map(t=>page(t,m.noted[t]||0,m.lostHeld?.[t]||0)).join('')+slip;
}
function open(){
 let o=document.getElementById('notebook');
 if(!o){o=document.createElement('div');o.id='notebook';o.className='notebook';o.addEventListener('click',e=>{if(e.target===o||e.target.closest('.nbClose'))o.classList.add('hidden')});document.body.appendChild(o)}
 o.innerHTML=`<div class="nbBook"><div class="nbHead"><b>アリアの手帳</b><small>魔物の覚え書き（本人の字）</small><button class="nbClose" type="button">閉じる</button></div><div class="nbBody">${html()}</div></div>`;
 o.classList.remove('hidden');
}
function button(card,after){
 if(!card||card.querySelector('.nbOpen'))return;
 const m=mem();if(!Object.keys(m.held||{}).length)return;
 const b=document.createElement('button');b.type='button';b.className='nbOpen';b.textContent='アリアの手帳を見る';b.onclick=e=>{e.stopPropagation();open()};
 (after&&after.parentNode===card)?after.after(b):card.insertBefore(b,card.querySelector('.primary'));
}
function refresh(){try{button(document.querySelector('#startOverlay .card'),document.getElementById('bodyMemory'));button(document.querySelector('#endOverlay .card'),document.getElementById('endRecord'))}catch(_){}}
try{setTimeout(refresh,1700)}catch(_){}
const baseFinish=finish;finish=function(win){const r=baseFinish(win);if(state.over)refresh();return r};
window.Game5Notebook={version:'0.32.0',entries:E,note,open,html,added:()=>added.slice(),nameOf};
})();
