/* hero.js — いま潜っているヒロイン（星野ひかり／仮設の白山遙）と、その見た目・言葉の置き換え。
 * 台詞はひかりの声で書かれている。遙の番は、名前・一人称・呼び方を置き換えて読ませる（仮設）。 */
(function () {
  "use strict";
  const J = "⁠";                                  // 置き換えから守る印（見えない）
  const keep = s => String(s).replace(/ひかり|ルミナ|魔法少女|星野|あたし/g, m => m[0] + J + m.slice(1));
  const DATA = {
    hikari: { id: "hikari", name: "星野 ひかり", kana: "ほしの ひかり", short: "ひかり", formName: "ルミナ", civName: "ひかり", first: "あたし", transforms: true },
    haruka: { id: "haruka", name: "白山 遙", kana: "しらやま はるか", short: "遙", formName: "遙", civName: "遙", first: "私", transforms: false,
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
  // 遙の書き下ろし（js/haruka/*.js）。表の名前ごとに、ひかりの表と同じ鍵で持つ
  const TH = (typeof G !== "undefined" && G.TextH) || {};
  if (typeof G !== "undefined") G.TextH = TH;
  const Hero = {
    J, keep, DATA,
    cur: "hikari",
    leaks: {},
    leak(name, key) { const k = name + ":" + key; Hero.leaks[k] = (Hero.leaks[k] || 0) + 1; },
    // いまのヒロインの文：遙の番は遙の表から。遙の表に無ければ、漏れとして記録する（検査で落とす）
    T(name, base, key) {
      if (Hero.cur !== "haruka") return base ? base[key] : undefined;
      const t = TH[name];
      if (t && t[key] != null) return t[key];
      if (base && base[key] != null) { Hero.leak(name, key); return base[key]; }
      return undefined;
    },
    // 表まるごと（配列の表など）
    A(name, base) {
      if (Hero.cur !== "haruka") return base;
      if (TH[name] != null) return TH[name];
      Hero.leak(name, "*"); return base;
    },
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
      if (Hero.cur === "haruka") {                     // 遙：変身はしない。器なら聖衣、祈りの間は跪く
        if (h.vessel) return `assets/haruka/haruka_${h.pray > 0 ? "pray" : "vessel"}_${dir}_${i}.png`;
        return `assets/haruka/haruka_${dir}_${i}.png`;
      }
      const f = h.form === "magica" ? "magica" : "civilian";
      if (h.vessel) {
        if (h.pray > 0) return `assets/hikari/hikari_${h.arousal > 70 || h.pleasure > 70 ? "tongue" : "pray"}_${f}_${dir}_${i}.png`;
        return `assets/hikari/hikari_vessel_${f}_${dir}_${i}.png`;
      }
      return `assets/hikari/hikari_${f}_${dir}_${i}.png`;
    },
    // 実況の立ち絵（前向き。i は 0/1 で交互）。達した時は、器なら法悦の顔
    live(h, i, cx) {
      if (Hero.cur === "haruka") {
        if (h.vessel && (cx || h.pleasure > 75 || h.arousal > 80)) return `assets/haruka/haruka_pray_front_${cx ? 2 : i}.png`;   // 遙の祈りの正面は、舌を出した法悦の顔
        return Hero.sprite(h, "front", i);
      }
      if (h.vessel && cx) return `assets/hikari/hikari_dream_${h.form === "magica" ? "magica" : "civilian"}.png`;
      if (h.vessel && (h.pleasure > 75 || h.arousal > 80)) return `assets/hikari/hikari_tongue_${h.form === "magica" ? "magica" : "civilian"}_front_${i}.png`;
      return Hero.sprite(h, "front", i);
    },
    // 報告の立ち絵（表情）：その一言の中身と、件の重さで選ぶ。聖衣の絵には表情の差分が無いので、器の間は使わない
    FACES: ["01_happy", "02_angry", "03_sad", "04_joyful", "05_embarrassed", "06_downcast_eyes", "07_cover_up", "08_sideways_blush", "09_bowed_head", "10_bowed_head_blush"],
    faceImg(k) { return `assets/portrait/${Hero.cur}/${k}.png`; },
    faceOf(id, k) { return `assets/portrait/${id}/${k}.png`; },
    face(l, rec, s) {
      if (!l || l.who !== "h" || (s && s.vessel)) return null;
      const t = String(l.text || ""), u = l.unit;
      let k = l.mood;
      if (!k) {
        if (l.lie) k = "07_cover_up";                                                     // ごまかす
        else if (/ごめん|申し訳|すみません|面目|不忠|お詫び|失格/.test(t)) k = "09_bowed_head";     // 頭を下げる
        else if (/本当は|嘘、でした|嘘でした|偽りました|嘘、書きました|白状|……言います|わかりました、言います|ばれ/.test(t)) k = "10_bowed_head_blush";   // 打ち明ける
        else if (l.renamed) k = "08_sideways_blush";                                       // 言い直させられる
        else if (/しつこい|疑われ|勘弁|もう、いいですよね|見せなくて|間違ってる|聞いてません|関係、?ない|何が言いたい/.test(t)) k = "02_angry";
        else if (/イ[っくきッ]|いっちゃ|いかされ|達し|果て|頭が真っ白|イき/.test(t)) k = "10_bowed_head_blush";   // 達したことを口にする
        else if (/乳首|クリ|おまんこ|おちんちん|あそこ|胸の、?先|中、まで|直接|奥まで|♡/.test(t)) k = "08_sideways_blush";
        else if (l.night || /負け|朝まで|救出|助けて|帰れな/.test(t)) k = "03_sad";
        else if (u && (u.climax || u.shame >= 3)) k = "05_embarrassed";
        else if (u && u.shame >= 2) k = "05_embarrassed";
        else if (u) k = "06_downcast_eyes";
        else if (/思いつ|閃|新しい技|強く|身体が軽い|踏破|楽勝|簡単でした|頑張り|ファイト/.test(t)) k = "04_joyful";
        else if (rec && rec.outcome === "defeat") k = "03_sad";
        else if (rec && rec.outcome === "cleared") k = "01_happy";
        else k = "06_downcast_eyes";
      }
      return Hero.faceImg(k);
    },
    // 監査官室の立ち姿（素の姿）
    portrait(s, dir) {
      dir = dir || "front";
      if (Hero.cur === "haruka") return `assets/haruka/haruka_${s && s.vessel ? "vessel_" : ""}${dir}_1.png`;
      if (s && s.vessel) return `assets/hikari/hikari_vessel_civilian_${dir}_1.png`;
      return `assets/hikari/hikari_civilian_${dir}_1.png`;
    },
  };
  /* ---------------------------------------------------------------- 場面
   * img：その行で立ち絵を差し替える。name：話し手（監査官・ひかり以外） */
  const IMG = k => "assets/hikari/hikari_" + k + ".png";
  const F = (id, k) => `assets/portrait/${id}/${k}.png`;
  const UE = "ワルドー上官";
  // ワルドーに洗脳された：報告の代わりに、ギルドの水晶に流れる「戦闘員の女その1」
  Hero.SCENES = {
    waldoLost: (withJunior) => [
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
      { who: "n", text: "水晶の光が消えた。——魔法少女ルミナは、ワルドーの戦闘員の女その1になった。" },
      { who: "a", text: "…………" },
      { who: "a", text: "……救出を、手配する" },
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
    // 遙がワルドーに：戦闘員の女その2。先輩は、その1
    waldoLostHaruka: (withSenpai) => [
      { who: "n", img: "assets/haruka/haruka_waldo_front_1.png", text: "翌朝。監査官室の水晶が、また勝手に灯った。……見覚えのある、ワルドーの回線。" },
      { who: "n", text: "映ったのは、腰まで届く黒髪と、紅い髪紐。……巫女装束は、どこにもない。首から爪先まで、黒く艶光りする全身スーツ。" },
      { who: "w", name: UE, text: "えー、本日の新入り。……武家の、なんだっけ。まあいい。戦闘員の女、その2！ 前へ！" },
      { who: "h", img: "assets/haruka/haruka_salute_front.png", text: "……イ、イーッ。……戦闘員の女その2、白山……いえ。……その2、出頭、いたしました" },
      { who: "w", name: UE, text: "硬い硬い。……おい、その1。先輩として、手本を見せてやれ", senpai: 1 },
      { who: "w", name: UE, text: "硬い硬い。……ええと、手本は……わしがやるのか？ ……こう、膝を外へ、だ", senpai: 0 },
      { who: "h", name: "戦闘員の女その1", senpai: 1, img: IMG("gani_magica_front"), text: "イーッ♡ はぁい♡ ……いい？ 戦闘員の敬礼はね、こうやって、ガニ股で、腰を落として……股の縫い目、ぴんって張るまで♡" },
      { who: "n", senpai: 1, text: "黒いスーツの桃色の髪が、くすくす笑いながら、見本のように股を突き出してみせた。……かつて、この街で一番頼もしかった魔法少女が。" },
      { who: "h", img: "assets/haruka/haruka_gani_front.png", text: "……っ。……こう、で、ございますか。……膝を、外へ……腰を……っ" },
      { who: "n", text: "稽古で鍛えた脚が、律儀に外へ割れる。正座で鍛えた腰が、深く落ちる。……スーツの股が食い込み、袴の下に隠してきた形が、黒い艶にそのまま浮いた。" },
      { who: "w", name: UE, text: "おお、上手い上手い。さすが武家。姿勢がいい。……では点検だ。『感度三倍仕様』、その2の分も確かめんとな" },
      { who: "n", text: "上官の指が、張りつめた股の縫い目を前から後ろへなぞる。もう片方の手が、スーツ越しに尖った乳首を、くり、と捻った。" },
      { who: "h", text: "……ぅ、く……っ。……不忠、で……いえ、……イーッ……。……戦闘員は、点検中、敬礼を崩しません……っ、ぁ……" },
      { who: "h", name: "戦闘員の女その1", senpai: 1, img: IMG("salute_magica_front"), text: "ほらぁ、声、我慢しなくていいんだよ♡ 上官どのに点検されるの、きもちいいでしょ？ 一緒に言お？ イーッ♡" },
      { who: "h", img: "assets/haruka/haruka_gani_front.png", text: "……イ、イーッ……♡ ……っ、……私、いま……何を……っ、イーッ♡" },
      { who: "n", text: "縫い目が、股の奥をくぐって擦り上げる。スーツ越しのクリに、硬い筋が何度も当たる。腰がかくかくと前へ出て、ガニ股の膝が震えた。" },
      { who: "h", text: "……は、果て……っ、点検中に、果てては、ならぬ、のに……っ、イーッ♡ イーッ♡♡" },
      { who: "n", text: "敬礼の手を額から離さぬまま、武家の娘は、無様に、律儀に、果てた。" },
      { who: "w", name: UE, text: "よーし！ 戦闘員の女その2、本日付で第七小隊！ ……あれ、隊長ってわしだっけ？" },
      { who: "h", img: "assets/haruka/haruka_salute_front.png", text: "イーッ！ ……戦闘員の女その2、……どこまでも、お供いたします。……ワルドー様に、栄光あれ" },
      { who: "n", img: "assets/haruka/haruka_waldo_back_1.png", text: "黒いスーツの背中が、戦闘員の列に並んで、画面の奥へ行進していく。腰まで届く黒髪が揺れる。……少しだけ、ガニ股が抜けていなかった。" },
      { who: "n", text: "水晶の光が消えた。——白山遙は、ワルドーの戦闘員の女その2になった。" },
      { who: "a", text: "……救出を、手配する" },
      { who: "a", text: "…………" },
    ].filter(l => l.senpai == null || !!l.senpai === !!withSenpai).map(l => Object.assign(l, { text: keep(l.text) })),
    // 誰もいなくなった
    allLost: () => [
      { who: "n", text: "水晶は、それから毎朝、勝手に灯るようになった。" },
      { who: "h", name: "戦闘員の女その1", text: "イーッ♡ ギルドの監査官さーん、見てますかぁ♡ 今日も第七小隊、元気に点検されてまぁす♡" },
      { who: "h", name: "戦闘員の女その2", text: "イーッ……♡ ……監査官殿。……報告は、正確に。……私どもは、今朝も、二度ずつ、果てました♡" },
      { who: "n", text: "画面の中で、二人の元冒険者が、そろってガニ股で敬礼している。……監査官の机の上には、もう、提出される報告書がない。" },
    ].map(l => Object.assign(l, { text: keep(l.text) })),
    // 遙が教団の器になった翌朝
    vesselMorningHaruka: () => [
      { who: "n", text: "扉が叩かれた。……いつもより、ずっと柔らかい音だった。" },
      { who: "n", img: "assets/haruka/haruka_vessel_front_1.png", text: "入ってきた遙は、巫女装束を着ていなかった。白と金と碧の聖衣。胸元は大きく開き、裾は脚の付け根まで切れこんでいる。" },
      { who: "h", text: "おはようございます、監査官殿。……この装い、お見苦しくはございませんか。……教えの、正装にございます" },
      { who: "a", text: "……教団に、何をされた" },
      { who: "h", img: "assets/haruka/haruka_pray_front_1.png", text: "何も。……満たしていただいた、だけにございます。……ご覧に、入れます" },
      { who: "n", text: "遙は、作法通りに膝をつき、胸の前で手を組んだ。……正座で鍛えた背筋が、祈りの形のまま、ゆるやかに反っていく。" },
      { who: "n", img: "assets/haruka/haruka_pray_front_0.png", text: "唇がほどけ、舌先がのぞく。頬が上気し、組んだ手の下で、腰がゆっくりと揺れはじめた。" },
      { who: "h", text: "……ぁ……祈りますと、……中が、満ちて……っ。……主君への忠義より、……ずっと、確かな……っ、ん、ぁ……♡" },
      { who: "n", img: "assets/haruka/haruka_pray_front_2.png", text: "瞳の奥に、光が灯る。——監査官の目の前で、遙は、祈りだけで果てた。" },
      { who: "h", text: "……ふふ。……務めは、果たします。冒険者として。……教えの、器として" },
      { who: "a", text: "……報告は、正確に" },
      { who: "h", img: "assets/haruka/haruka_vessel_front_1.png", text: "心得ております。……教えに誓って、偽りは申しませぬ" },
    ],
    vesselTalkHaruka: ["……今朝も、祈りを済ませてから参りました。……膝が赤いのは、そのためにございます", "……教えの方々を前にすると、身体が勝手に膝を折るのです。……刀を抜かねばならぬのに", "……監査官殿も、共に祈られませぬか。……満たされるというのは、まことに、心地よいものにございます", "……この聖衣、透けておりましょうか。……教えに、隠しごとはなりませぬゆえ"],
    // 白山遙：はじめて潜らせる日の挨拶（ひかりと組んで登録している剣士）
    harukaIntro: () => [
      { who: "n", text: "もう一人の担当、白山遙。……ひかりと組んで、このギルドに登録している剣士だ。" },
      { who: "n", img: "assets/haruka/haruka_front_1.png", text: "扉が叩かれ、黒髪の娘が一礼して入ってくる。紅の袴に、白の小袖。腰には一振りの打刀。所作は真っ直ぐで、隙がない。" },
      { who: "h", raw: true, img: F("haruka", "01_happy"), text: "本日は、私が参ります。白山遙と申します。剣士として登録されておりますが……自称は、侍です" },
      { who: "a", text: "……報告は、正確に。それだけだ" },
      { who: "h", raw: true, img: F("haruka", "06_downcast_eyes"), text: "心得ました。……己の失態を記録に残すのは、正直、何より恐ろしい。……ですが、未熟の身なれど、受けた務めは果たします" },
      { who: "h", raw: true, img: F("haruka", "04_joyful"), text: "……ひかり殿は、今日は休みで？ ……あの方の分まで、働いて参ります" },
    ],
    // 相棒が捕らわれた翌朝：残った方が、連れ戻すと誓う
    partnerTaken: (rem) => rem === "hikari" ? [
      { who: "n", text: "朝。水晶に流れた『戦闘員の女その2』の映像は、ギルドじゅうに広まっていた。" },
      { who: "h", name: "ひかり", raw: true, img: F("hikari", "03_sad"), text: "……遙さん、あんな顔、させられて。……あんな格好で、ガニ股で……っ" },
      { who: "h", name: "ひかり", raw: true, img: F("hikari", "02_angry"), text: "……あたしが、連れ戻します。ワルドーの支部、一番下まで行って、絶対" },
      { who: "a", text: "救出の依頼を出す。……支部の最下層に、戦闘員にされた白山遙がいる。打ち倒せば、洗脳の紋章が砕ける" },
      { who: "h", name: "ひかり", raw: true, img: F("hikari", "06_downcast_eyes"), text: "……はい。……待ってて、遙さん" },
    ] : [
      { who: "n", text: "朝。水晶に流れた『戦闘員の女その1』の映像は、ギルドじゅうに広まっていた。" },
      { who: "h", name: "遙", raw: true, img: F("haruka", "03_sad"), text: "……ひかり殿が、あのような。……不覚。共に潜っておれば" },
      { who: "h", name: "遙", raw: true, img: F("haruka", "02_angry"), text: "この遙が、必ず取り戻します。……刀に誓って" },
      { who: "a", text: "救出の依頼を出す。……支部の最下層に、戦闘員にされた星野ひかりがいる。打ち倒せば、洗脳の紋章が砕ける" },
      { who: "h", name: "遙", raw: true, img: F("haruka", "06_downcast_eyes"), text: "……承知。……今しばし、お待ちくだされ、ひかり殿" },
    ],
    // 救い出された相棒が、戻ってくる朝（後遺症つき）
    allyRescued: (who, got) => {
      const H = who === "hikari", nm = H ? "ひかり" : "遙", SQ = (G.Game && G.Game.SEQUELAE) || {};
      return [
        { who: "n", text: `扉が開いた。黒いスーツの上からギルドの外套を羽織った${H ? "ひかり" : "遙"}が、肩を借りて入ってくる。` },
        { who: "h", name: nm, raw: true, img: F(who, "09_bowed_head"), text: H ? "……ただいま、です。……迷惑、かけました" : "……戻りました。……面目、次第もございませぬ" },
        { who: "h", name: nm, raw: true, img: F(who, "11_salute"), text: "イーッ！" },
        { who: "h", name: nm, raw: true, img: F(who, "12_salute_snap"), text: H ? "……っ、あ。……今の、なしで。……身体が、勝手に……" : "……っ。……今のは、忘れてくだされ。……身体が、勝手に" },
        { who: "a", text: "……検査の結果は、聞いている" },
        { who: "n", text: "（残ったもの：" + got.map(k => (SQ[k] || {}).name || k).join("・") + "）" },
        { who: "h", name: nm, raw: true, img: F(who, "10_bowed_head_blush"), text: H ? "……スーツの中で、されたこと。……身体のほうが、まだ、覚えてて" : "……あの黒い装束の中で、されたこと。……身体のほうが、まだ、覚えておるのです" },
      ].map(l => Object.assign(l, { text: keep(l.text) }));
    },
    // 二人とも捕らわれた：ギルドの救出隊が、二日がかりで取り返した
    guildRescue: (got) => {
      const SQ = (G.Game && G.Game.SEQUELAE) || {}, names = k => (got[k] || []).map(x => (SQ[x] || {}).name || x).join("・");
      return [
        { who: "n", text: "ギルドは、総出で支部に踏みこんだ。……二日がかりで、戦闘員の女その1とその2は、取り返された。" },
        { who: "n", text: "街じゅうに流れた映像は、消せなかった。……二人の評判は、地の底に落ちた。" },
        { who: "h", name: "ひかり", raw: true, img: F("hikari", "11_salute"), text: "イーッ！ ……っ、……あ、……" },
        { who: "h", name: "遙", raw: true, img: F("haruka", "11_salute"), text: "イーッ……！ ……っ、……私まで、何を……" },
        { who: "h", name: "ひかり", raw: true, img: F("hikari", "12_salute_snap"), text: "……あたしたち、二人そろって、……ガニ股で、点検されてたんですよね。……全部、覚えてます" },
        { who: "h", name: "遙", raw: true, img: F("haruka", "10_bowed_head_blush"), text: "……二人並んで、上官殿の前で、果てたことも。……忘れられませぬ" },
        { who: "n", text: "（ひかりに残ったもの：" + names("hikari") + "）" },
        { who: "n", text: "（遙に残ったもの：" + names("haruka") + "）" },
        { who: "a", text: "……それでも、潜ってもらう。冒険者として" },
      ].map(l => Object.assign(l, { text: keep(l.text) }));
    },
  };
  G.Hero = Hero;
})();
if (typeof module !== "undefined") module.exports = G;
