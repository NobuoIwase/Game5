/* hero.js — いま潜っているヒロイン（星野ひかり／仮設の白山遙）と、その見た目・言葉の置き換え。
 * 台詞はひかりの声で書かれている。遙の番は、名前・一人称・呼び方を置き換えて読ませる（仮設）。 */
(function () {
  "use strict";
  const J = "⁠";                                  // 置き換えから守る印（見えない）
  const keep = s => String(s).replace(/ひかり|ルミナ|魔法少女|星野|あたし/g, m => m[0] + J + m.slice(1));
  const DATA = {
    hikari: { id: "hikari", name: "星野 ひかり", kana: "ほしの ひかり", short: "ひかり", formName: "ルミナ", civName: "ひかり", first: "あたし", transforms: true },
    haruka: { id: "haruka", name: "白山 遙", kana: "しらやま はるか", short: "遙", formName: "遙", civName: "遙", first: "私", transforms: false, temp: true,
      job: "剣士（自称・侍）",
      appearance: "腰まで届く黒髪を高く束ねている。東方の巫女装束——紅の袴に白の小袖——が、この街では否応なく目を引く。所作は常に真っ直ぐで、隙がない。",
      personality: "忠義に厚く、受けた務めは何があっても果たそうとする。恥を「不忠」と結び付けて考えるため、己の失態を記録に残すことを何よりも恐れる。" },
  };
  // 遙の番：ひかりの声の文を、遙の名前と言葉に寄せる（固有の書き下ろしが揃うまでの仮設）
  const TX_HARUKA = [
    [/星野[ 　]?ひかり/g, "白山 遙"], [/ほしの ひかり/g, "しらやま はるか"],
    [/魔法少女ルミナ/g, "女剣士・遙"], [/魔法少女/g, "女剣士"],
    [/ルミナ・?ストライク/g, "抜刀術「初雪」"],
    [/ルミナちゃん|ひかりちゃん/g, "遙ちゃん"], [/ルミナ|ひかり/g, "遙"],
    [/あたし/g, "私"], [/監査官さん/g, "監査官殿"],
    [/プラム/g, "御守り"], [/コンパクト/g, "御守り"],
    [/変身が解け/g, "構えが崩れ"], [/変身を解/g, "構えを解"], [/変身し直/g, "構え直"], [/再変身/g, "構え直し"], [/変身/g, "構え"],
  ];
  const Hero = {
    J, keep, DATA,
    cur: "hikari",
    set(id) { Hero.cur = DATA[id] ? id : "hikari"; return Hero.cur; },
    get d() { return DATA[Hero.cur]; },
    is(id) { return Hero.cur === id; },
    // 文の置き換え（ひかりの番は、そのまま）
    tx(t) {
      if (t == null) return t;
      let s = String(t);
      if (Hero.cur === "haruka") for (const [re, to] of TX_HARUKA) s = s.replace(re, to);
      return s;                                      // 守りの印（見えない）は残す：画面で二度置き換えても、名前が変わらないように
    },
    // 場での名前（変身中はルミナ）
    name(form) { const d = DATA[Hero.cur]; return form === "magica" ? d.formName : d.civName; },
    // 場の立ち姿：教団の器・祈り・遙
    sprite(h, dir, i) {
      i = i == null ? 1 : i;
      if (Hero.cur === "haruka") return `assets/haruka/haruka_${dir}_${i}.png`;
      const f = h.form === "magica" ? "magica" : "civilian";
      if (h.vessel) {
        if (h.pray > 0) return `assets/hikari/hikari_${h.arousal > 70 || h.pleasure > 70 ? "tongue" : "pray"}_${f}_${dir}_${i}.png`;
        return `assets/hikari/hikari_vessel_${f}_${dir}_${i}.png`;
      }
      return `assets/hikari/hikari_${f}_${dir}_${i}.png`;
    },
    // 実況の立ち絵（前向き。i は 0/1 で交互）。達した時は、器なら法悦の顔
    live(h, i, cx) {
      if (Hero.cur !== "haruka" && h.vessel && cx) return `assets/hikari/hikari_dream_${h.form === "magica" ? "magica" : "civilian"}.png`;
      if (Hero.cur !== "haruka" && h.vessel && (h.pleasure > 75 || h.arousal > 80)) return `assets/hikari/hikari_tongue_${h.form === "magica" ? "magica" : "civilian"}_front_${i}.png`;
      return Hero.sprite(h, "front", i);
    },
    // 監査官室の立ち姿（素の姿）
    portrait(s, dir) {
      dir = dir || "front";
      if (Hero.cur === "haruka") return `assets/haruka/haruka_${dir}_1.png`;
      if (s && s.vessel) return `assets/hikari/hikari_vessel_civilian_${dir}_1.png`;
      return `assets/hikari/hikari_civilian_${dir}_1.png`;
    },
  };
  /* ---------------------------------------------------------------- 場面
   * img：その行で立ち絵を差し替える。name：話し手（監査官・ひかり以外） */
  const IMG = k => "assets/hikari/hikari_" + k + ".png";
  const UE = "ワルドー上官";
  // ワルドーに洗脳された：報告の代わりに、ギルドの水晶に流れる「戦闘員の女その1」
  Hero.SCENES = {
    waldoLost: () => [
      { who: "n", img: IMG("waldo_magica_front_1"), text: "翌朝。監査官室の水晶が、勝手に灯った。ギルドの回線に、ワルドーの電波が割り込んでいる。" },
      { who: "n", text: "映ったのは、見慣れた桃色の髪。……首から爪先まで、黒く艶光りする全身スーツ。胸の丸みも、腰のくびれも、脚の付け根の溝まで、そのまま浮いている。" },
      { who: "n", text: "——『ルミナー！』『がんばれー！』。この街の人たちが、何度も手を振って送り出した、頼もしい魔法少女。" },
      { who: "w", name: UE, text: "えー、では、新入りの……なんだっけ、名前。まあいい。戦闘員の女、その1！ 前へ！" },
      { who: "h", img: IMG("salute_magica_front"), text: "イーッ！ 戦闘員の女その1、出頭いたしましたっ！ ワルドー様に、栄光あれっ♡" },
      { who: "w", name: UE, text: "うむ。敬礼は……ええと、マニュアルによると……（ページをめくる）……あ、逆さまだった。……とにかく、脚だ。脚が閉じとる" },
      { who: "h", img: IMG("gani_magica_front"), text: "し、失礼いたしましたっ！ 戦闘員の敬礼は、ガニ股でありますっ！" },
      { who: "n", text: "膝を外へ割り、腰を落とす。スーツの股の縫い目が、ぴんと張って食い込んだ。割れ目の形まで、黒い艶にくっきりと浮かび上がる。" },
      { who: "w", name: UE, text: "よーし、よし。……ふむ。このスーツ、『感度三倍仕様』と書いてあるが……本当か？ 確かめる。動くなよ" },
      { who: "n", text: "上官の太い指が、張りつめた股の縫い目を、前から後ろへ、ゆっくりなぞった。" },
      { who: "h", text: "イッ……イーッ♡ ……う、動きませんっ！ 戦闘員は、上官どのの点検中、敬礼を崩しませんっ……ぁ、っ♡" },
      { who: "n", text: "敬礼の手が、額の上で震えている。なぞられるたび、ガニ股の膝がかくかくと内へ寄りかけては、慌てて外へ戻った。" },
      { who: "w", name: UE, text: "こっちはどうだ。……乳首が、スーツの上から尖っとるな。……あ、これは押すとどうなるんだったか" },
      { who: "n", text: "黒い艶の上から、ぷくりと浮いた乳首を、上官が指先で押しこむ。くり、くり、と、つまみを回すように。" },
      { who: "h", text: "ひぁっ♡ そ、そこはっ……イーッ♡ イーッ♡ 乳首、回されると、敬礼が……っ、勝手に、深くなっちゃいますぅ♡" },
      { who: "w", name: UE, text: "わはは、面白い。……おい記録係、ちゃんと撮っとるか。これを街に流せと本部に言われとるんだ。……あれ、どのボタンだったかな" },
      { who: "n", text: "記録ドローンの赤いランプが、ガニ股の股間へ寄っていく。……レンズの前で、黒いスーツの縫い目が、じわりと濡れて色を変えた。" },
      { who: "h", text: "街の、みなさーん♡ ……見てますかぁ♡ 魔法少女ルミナは、ワルドー様の、戦闘員の女その1に、なりましたぁ♡" },
      { who: "n", text: "一瞬、桃色の瞳が揺れた。「……あれ。あたし、なんで、こんな……」——スーツの首元の紋章が、低く唸る。" },
      { who: "h", text: "……っ、イーッ♡ ……なんでも、ありませんっ！ 戦闘員の女その1、余計なことは、考えませんっ♡" },
      { who: "w", name: UE, text: "よーし、いい子だ。では最後の点検。……股の具合だ。……ええと、どこまでやっていいんだったか。まあ、全部だな" },
      { who: "n", text: "縫い目に沿って、指が股をくぐる。ぐっと押し上げられたまま、前後に擦られる。スーツ越しのクリに、縫い目の硬い筋が、何度も、何度も当たった。" },
      { who: "h", text: "イッ、イーッ♡ イーッ♡ 上官どのぉ♡ 戦闘員、点検中に、いっちゃ、いけないのにぃ……っ、イーッ♡♡" },
      { who: "n", text: "ガニ股のまま、腰ががくがくと前へ突き出される。敬礼の手だけは、額から離れない。——無様に、律儀に、果てた。スーツの股から、黒い艶を伝って、雫が床に落ちる。" },
      { who: "w", name: UE, text: "……あ。いかせてしまった。マニュアルにあったかな、これ。……まあいい！ 戦闘員の女その1、よくやった！ 本日付で第七小隊に配属！" },
      { who: "h", img: IMG("salute_magica_front"), text: "イーッ！ ありがとうございますっ♡ 戦闘員の女その1、どこまでもお供しますっ♡ ワルドー様に、栄光あれっ♡" },
      { who: "n", img: IMG("waldo_magica_back_1"), text: "黒いスーツの背中が、戦闘員の列に並んで、画面の奥へ行進していく。ガニ股の癖が抜けないのか、少しだけ、歩き方がおかしかった。" },
      { who: "n", text: "水晶の光が消えた。——この日を最後に、魔法少女ルミナは、ギルドの記録から消えた。星野ひかりの名前は、行方不明者の欄に移された。" },
      { who: "a", text: "…………" },
      { who: "a", text: "……次の担当を、手配する" },
    ].map(l => Object.assign(l, { text: keep(l.text) })),
    // 教団の器になった翌朝
    vesselMorning: () => [
      { who: "n", text: "扉が叩かれた。……返事を待たずに、扉が開く。" },
      { who: "n", img: IMG("vessel_civilian_front_1"), text: "入ってきたひかりは、見慣れない服を着ていた。白と金の聖衣。胸元は大きく開き、裾は脚の付け根まで切れこんでいる。" },
      { who: "h", text: "おはようございます、監査官さん♡ ……これ、似合います？ 教えの、正装なんです" },
      { who: "a", text: "……教団に、何をされた" },
      { who: "h", img: IMG("pray_civilian_front_1"), text: "何も、されてませんよ？ ……満たしてもらった、だけです。……ほら" },
      { who: "n", text: "ひかりは、ごく自然に床に膝をつき、胸の前で手を組んだ。" },
      { who: "n", img: IMG("tongue_civilian_front_1"), text: "祈りの形のまま、唇が緩む。舌先がのぞき、頬が上気していく。組んだ手の下で、腰がゆっくりと揺れはじめた。" },
      { who: "h", text: "……ぁ……祈ると、ね、……中が、満たされて……っ、……ん、ぁ……♡" },
      { who: "n", img: IMG("dream_civilian"), text: "瞳の奥に、きらきらと光が灯る。——監査官の目の前で、ひかりは、祈りだけで果てた。" },
      { who: "h", text: "……ふふ。……あたし、冒険者は、続けますよ。……教えの器として、迷宮に、潜ります♡" },
      { who: "a", text: "……報告は、正確に" },
      { who: "h", img: IMG("vessel_civilian_front_1"), text: "はい♡ ……教えに誓って、正直に" },
    ],
    vesselTalk: ["……今朝も、お祈りしてから来ました♡ ……膝、ちょっと赤いの、そのせいです", "……教えの方たちに会うと、身体が勝手に跪いちゃうんです。……戦わなきゃ、なのに", "……監査官さんも、一緒に祈りませんか。……満たされると、ほんとに、きもちいいんですよ♡", "……聖衣、透けてます？ ……教えに隠しごとは、しちゃいけないので♡"],
    // 仮設ヒロイン：白山遙の着任
    harukaIntro: () => [
      { who: "n", text: "ギルドから回されてきた書類には、赤く『仮設』の判が押されていた。" },
      { who: "n", img: "assets/haruka/haruka_front_1.png", text: "扉が叩かれ、黒髪の娘が一礼して入ってくる。紅の袴に、白の小袖。腰には一振りの打刀。所作は真っ直ぐで、隙がない。" },
      { who: "h", text: "本日より、こちらの監査を受けることになりました。白山 遙と申します。剣士として登録されておりますが……自称は、侍です" },
      { who: "a", text: "……前任者の件は、聞いているか" },
      { who: "h", text: keep("……はい。ワルドーなる者どもに、攫われたと。……星野ひかり殿。迷宮で見かけましたら、必ず、連れ戻します") },
      { who: "a", text: "……報告は、正確に。それだけだ" },
      { who: "h", text: "心得ました。……己の失態を記録に残すのは、正直、何より恐ろしい。……ですが、未熟の身なれど、受けた務めは果たします" },
    ].map(l => Object.assign(l, { text: keep(l.text) })),
  };
  G.Hero = Hero;
})();
if (typeof module !== "undefined") module.exports = G;
