/* report.js — 帰還後の口頭報告と、報告書（監査にかける書類）を組み立てる。DOM に触れない
 *
 * 同じ報告にならないように、判断を何段か重ねて組み立てる：
 *   1. 姿勢（その日の話し方の土台）… 状態・信頼・起きたこと・前日の扱いで決まる
 *   2. 順番 ……………………………… 起きた順／軽い件から／重い件から／一番の件を最後まで出さない
 *   3. 一件ごとの話し方の型 ………… 事務的・数字から・頷くだけ・遠回し・書面に逃げる・すり替え・
 *                                      開き直り・笑ってごまかす・他人事・言い間違い・問い返し・言い切る
 *   4. 繰り返し防ぎ ………………… 同じ型は1回の報告で2回まで。使った文は日をまたいでしばらく使わない。
 *                                      口ごもり（……・っ）は山場の2行だけ
 * ★ 文章はこのファイルの配列にある。書き足せば、そのまま候補に入る。
 */
var G = (typeof G !== "undefined") ? G : {};
(function () {
  "use strict";
  const U = G.U;

  /* ================================================================ 文の在庫 */
  // 起きたことの言い表し方（一件ぶん・ひかりの口から）。{mon} {trap} {floor}
  const WHAT = {
    hold_絡: ["{mon}に捕まって、しばらく動けませんでした", "{mon}に手足を絡め取られました", "{mon}に縛り上げられて、抜けるのに時間がかかりました",
              "{mon}に巻きつかれて、身動きが取れなくなりました", "{mon}に吊り上げられました", "{mon}に押さえ込まれました"],
    hold_蕩: ["{mon}に包み込まれて、抜け出せなくなりました", "{mon}に呑まれかけました", "{mon}の中に閉じ込められて、体がずっと熱くて",
              "{mon}に覆いかぶさられて、べたべたにされました", "{mon}に抱え込まれて、甘い匂いで頭がくらくらしました"],
    trap_絡: ["{trap}に足を取られて、縛られました", "{trap}に引っかかって、腕ごと絡め取られました", "{trap}で、足首から動けなくなりました"],
    trap_蕩: ["{trap}で、変な匂いのするものを浴びました", "{trap}に掛かって、体が火照りました", "{trap}のせいで、足元がべたべたで"],
    trap_惑: ["{trap}で、しばらく頭がぼんやりしました", "{trap}に惑わされて、変な方へ歩いてました", "{trap}の音を聞いたら、少し記憶が飛んでて"],
    trap_削: ["{trap}で、魔力を抜かれました", "{trap}で休んだつもりが、力を吸われてました", "{trap}に触ったら、変身の力が抜けていきました"],
    arouse: ["{mon}のせいで、体が熱っぽくなりました", "{mon}に、変なものを浴びせられました", "{mon}の近くにいたら、だんだん火照ってきて",
             "{mon}の胞子だか粘液だかを、吸っちゃいました", "{mon}にまとわりつかれて、肌がずっとざわざわしてました"],
    trance: ["{mon}に見られて、頭が真っ白に", "{mon}の声で、少しのあいだ動けなくなりました", "{mon}に見とれてたみたいで、気づいたら近くにいました",
             "{mon}のせいで、ふわふわして、狙いが定まりませんでした"],
    drain: ["{mon}に魔力を吸われました", "{mon}のそばで、魔力がどんどん抜けていきました", "{mon}に、変身の力を削られました"],
    untransform: ["魔力が尽きて、変身が解けました", "変身が、解けちゃいました", "ルミナでいられなくなりました", "光が保たなくて、素の姿に戻りました"],
    possess: ["{mon}に、腕を取られました", "{mon}が袖から入ってきて……自分の手で、触らされてました", "しばらく、自分の腕が自分のじゃなくなってました。{mon}のせいで"],
    sigil: ["下腹に、紋を刻まれました", "{mon}のせいで、お腹に、紋が", "……紋、です。お腹の、下のほうに"],
    filmed: ["{mon}に……見られてる前で、達しちゃいました", "{mon}が、ずっと見てて。……その、いちばん見られたくないところを", "{mon}の前で、……はい。見られました"],
    charm: ["{mon}を見ると、……胸が、変に跳ねるんです。今も、名前を言うだけで", "{mon}が、……撃てなかったんです。狙ってたのに", "……{mon}のこと、なんか、目で追っちゃって。……気のせいです"],
    attach: ["{mon}に、貼りつかれました。……まだ、取れてません", "服の中に、{mon}が。……自分では、外せなくて", "……{mon}、です。今も、その、……ここに"],
    release: ["溜められてたのが、……一度に、来ました。{n}回", "止められてた分が、最後に全部。……数えてたのは{n}回までです", "……栓が抜けた、って感じでした。{n}回、立て続けに"],
    beg: ["{mon}に、……寸前で、何度も止められて。……最後は、あたしのほうから、……言っちゃいました", "……ねだりました。{mon}に。……言い終わる前に、許されましたけど"],
    rescue: ["ワルドーの装置で、名前が、消えかけました。……プラムが、引き戻してくれて", "……一回、自分が誰か分からなくなりかけました。プラムの光で、戻りました"],
    convert: ["……戦闘員として、登録、されました。……されたそうです。覚えてるのは、敬礼の練習くらいで", "ワルドーの戦闘員に、なってました。……一晩だけ、です"],
    sniff: ["{mon}の、……臭いを、嗅いじゃいました。足が、止まって", "{mon}の近くで、……鼻が、勝手に", "……{mon}の臭い、です。くさいのに、なんで、あんな"],
    salute: ["{mon}に、敬礼しました。……挨拶ですから。普通の", "ワルドーの人に会ったので、ちゃんと敬礼しました。……え、何か変ですか？"],
    fit: ["ときどき、急に、身体が変になるんです。理由は、分かりません", "……前触れなく、腰が、跳ねることがあって。……疲れてるんだと思います"],
    deny: ["{mon}に、……達するのを、止められてました", "{mon}の指で、栓をされて。……あと少しのところで、何回も"],
    vow: ["祭壇で、誓わされました。『この階では達しない』って。……守りました。守らされました", "誓いの祭壇。……階を出た瞬間のことは、聞かないでください"],
    freeze: ["{mon}で、身体の時間を止められました。……止まってる間も、感覚だけはあって", "止まってる間に、いろいろ、……積もってました"],
    exposure: ["服が、もう、服じゃなくなりました", "装束が、……ほとんど、残ってません。替えを、お願いします"],
    addict: ["{mon}の粉を、……吸っちゃって。今も、ちょっと、また吸いたいっていうか……違います", "咳き茸、です。……あの粉は、危ないです。危ない、です"],
  };
  // 魔物・罠ごとの言い表し方（「種:件の種類」）。あれば半分くらいの確率でこちらを使う
  const WHAT_KIND = {
    "nikubana:hold": ["道の端の{mon}に……自分から、近づいちゃって。花びらに、脚を食まれました", "{mon}に、腰まで包まれて……しばらく、揺すられてました", "{mon}の中にいました。……自分で、入ったみたいなものです"],
    "nikubana:arouse": ["{mon}の息が甘くて、ずっと頭がぽーっとしてました", "{mon}のそばを通るたびに、体が熱くなって"],
    "dakitake:hold": ["{mon}の傘の下に、閉じ込められました", "{mon}に上からかぶさられて、襞で、ずっと撫でられてました"],
    "kouryuu:arouse": ["{mon}の靄を、吸っちゃいました", "{mon}が通った跡の霧で、体がずっと熱くて", "ピンクの靄の中を、何度か通っちゃいました"],
    "tsukite:possess": ["{mon}に、腕を取られました。……自分の手で、その、触らされて", "袖から{mon}が入ってきて。……撃てないんです、自分の胸だから"],
    "shousha:arouse": ["{mon}の光に撃たれて……いきなり、体が跳ね上がりました", "{mon}の光条、避けきれなくて。……準備も、なにも、なかったのに"],
    "banjin:arouse": ["{mon}の光弾を、何発か浴びました", "{mon}の光弾が、お腹に当たって"],
    "banjin:sigil": ["{mon}の光弾で、お腹に紋を刻まれました", "{mon}に……下腹へ、紋を"],
    "altar:sigil": ["{trap}で、紋を写されました。押し返そうとしたんですけど", "祭壇の紋を、下腹に……。踏ん張ったのに、踏ん張った分だけ、深く"],
    "medama:filmed": ["{mon}の前で、……その。見られながら、でした", "{mon}に、いちばん見られたくない瞬間を、見られました"],
    "slime_drop:trap": ["天井から粘体が降ってきて、まともに浴びました。服、溶けました", "{trap}で、頭から粘体をかぶりました"],
    "bud:hold": ["{mon}に足を取られて、逆さに吊られました", "{mon}で逆さ吊りにされて、蜜を……浴びつづけました"],
    "root:hold": ["{mon}で、腰から下を床下に引き込まれました", "床の根っこに、下半身だけ持っていかれて……下で何されてたか、見えなかったです"],
    "cocoon:hold": ["{mon}に、閉じ込められました。繭の中に", "白い糸に包まれて、繭の中で、しばらく"],
    "ratchet:hold": ["{mon}に、俯せで固定されました。……動くと、進むやつで", "{mon}で、枠が開くまで、ずっと"],
    "shadow:hold": ["{mon}の、自分の影から出た腕に、押さえ込まれました", "影の腕に捕まって……光弾が、すり抜けるんです"],
    "tower:trap": ["{trap}の囁きで、頭がぼんやりしました", "{trap}の近くで、何度か意識が遠くなりました"],
    "goblin:hold": ["{mon}たちに囲まれて、押さえ込まれました", "{mon}に……数で、負けました", "{mon}の群れに、組み伏せられました"],
    "slime:hold": ["{mon}の中に、しばらく包まれてました", "{mon}に呑まれて、服の中まで入られました"],
    "mimic:hold": ["宝箱が{mon}で……引きずり込まれました", "{mon}に、上半身ごと箱の中へ"],
    "gulper_worm:hold": ["{mon}に、脚から呑まれかけました", "{mon}に、膝まで呑まれました"],
    "waldo_grunt:hold": ["ワルドーの戦闘員たちに、数で押さえ込まれました", "{mon}に、……口を塞がれて。名乗りも、最後まで言えませんでした", "{mon}に捕まって、……素体番号で呼ばれました"],
    "waldo_officer:hold": ["{mon}に、組み伏せられました。……『抗うほど良い戦闘員になる』って"],
    "drone_capture:hold": ["{mon}のワイヤーで、宙に吊られました。……つま先が、床に届かなくて", "{mon}に捕まって、……全部、記録されました"],
    "drone_tickle:hold": ["{mon}に、……くすぐられました。痛いことは、されてません。……本当に、されてません", "羽根ブラシで、ずっと。……笑いすぎて、力が抜けて"],
    "karte:hold": ["{mon}に、検査されました。……弱い所を、全部、記録されて", "{mon}の中に引き込まれて、……開発工程、っていうのを"],
    "suiyou:hold": ["水たまりから、{mon}が。……冷たいのに、熱くて", "{mon}に脚を取られて、水の中に"],
    "kabeguchi:hold": ["床だと思ったら、{mon}でした。……脚を、吸われて", "{mon}に踏み込んで、膝まで"],
    "tentacle_lord:hold": ["{mon}に、……順番に、全部取られました", "一本に捕まったら、あとは、{mon}の番でした"],
    "inyoku:hold": ["{mon}に、腕に抱きつかれて。……粉で、肌が変に", "{mon}が、急降下してきて"],
    "armor:hold": ["空の鎧に、閉じ込められました。……中が、柔らかくて", "{mon}の中で、……光も、杖も、使えなくて"],
    "exam:hold": ["{mon}に固定されて、……一つずつ、確かめられました", "診察台で、……弱点を、記録されました"],
    "pod:hold": ["ポッドに、吸い込まれました。……名前を、書き換えられそうに", "{mon}の中で、……自分の名前を、何回も言ってました"],
    "capture:hold": ["{mon}に、大の字で固定されました。……戦闘員が来るまで", "床から腕が出てきて、……全部、取られました"],
    "itch:hold": ["{mon}で、……痒くて。手が、届かなくて", "檻の中で、痒みの粉を。……まだ、疼いてます"],
    "echo_gate:trap": ["{trap}で、……文句を、読み上げさせられました。……内容は、書きません", "{trap}。……声に出して読まないと、開かなかったので"],
    "stasis:trap": ["{trap}で、身体の時間を止められました", "{trap}をくぐったら、動けなくなって。……止まってる間も、その、感覚は"],
    "saddle:trap": ["{trap}。……跨って渡るしか、なくて。梁が、動くんです", "{trap}で、……瘤の数は、数えませんでした"],
    "toybox:trap": ["{trap}を開けたら、中身が……跳んできて", "宝箱だと思ったんです。……{trap}でした"],
    "hypno_ray:trap": ["{trap}の光で、……頭が、ぼんやりして", "ワルドーの{trap}。……何回か、浴びました"],
    "furnace:trap": ["{trap}に、魔力を吸われました。……吸われるの、なんか、甘くて", "{trap}のそばで、……力が、抜けていって"],
  };
  // 監査官が読み上げるときの言い方
  const WHAT_A = {
    hold: "{mon}による拘束、{dur}", trap: "罠「{trap}」の作動", arouse: "{mon}による催淫", trance: "{mon}による惑い",
    drain: "{mon}による魔力の吸収", untransform: "変身の解除",
    possess: "{mon}による腕の憑依、{dur}", sigil: "{mon}による淫紋の刻印", filmed: "{mon}の視線下での絶頂",
    charm: "{mon}への魅了", attach: "付着体「{mon}」", release: "溜められた絶頂の一斉解放", beg: "{mon}への懇願", rescue: "洗脳の未遂", convert: "戦闘員化",
    sniff: "{mon}の臭いの吸引", salute: "{mon}への『敬礼』", fit: "原因不明の発作", deny: "{mon}による絶頂の禁止", vow: "誓約による絶頂の禁止", freeze: "{mon}による時間停止",
    exposure: "装束の損壊", addict: "{mon}の粉への中毒",
  };
  const CLIMAX = { 1: ["……最後、力が抜けちゃって", "……一回、頭が真っ白になりました", "……それで、その、達しちゃいました", "……一回だけ、堪えきれなくて"],
                   n: ["……{n}回、頭が真っ白になりました", "……数えてたのは{n}回まで、です", "……{n}回。途中から、堪えるふりだけしてました", "……{n}回です。……数え間違いじゃ、ないです"] };
  const DOWNPLAY = ["{mon}にちょっと掴まれたけど、すぐ振りほどきました", "{mon}とすれ違いざまに、軽く触られたくらいです", "{mon}？ ……ああ、何もなかったです。避けました",
                    "{mon}に一瞬捕まったけど、ほんとに一瞬で", "{mon}はいましたけど、遠くから撃って終わりです"];
  // 件の種類ごとの嘘（無い種類は DOWNPLAY／DOWNPLAY_TRAP）
  const DOWNPLAY_KIND = {
    sigil: ["{mon}で紋を写されそうになったけど、魔力で全部弾き返しました。何も残ってません", "{mon}？ 壊してきました。転写は、受けてないです"],
    charm: ["{mon}ですか？ 普通に倒しました", "{mon}は、……別に。ただの敵です"], attach: ["何も、付いてないです。……ほんとに"], release: ["特に、何も。……普通でした"],
    beg: ["{mon}は、倒しました。……それだけです"], sniff: ["{mon}とは、すれ違っただけです"], deny: ["{mon}？ 何もされてません"], vow: ["祭壇はありましたけど、触ってません"],
    addict: ["茸の所は、迂回しました"], fit: ["……体調は、普通です"],
    possess: ["{mon}が袖に入りかけたけど、すぐ払いました", "{mon}？ 袖、締めてたので平気でした"],
    filmed: ["{mon}はいましたけど、見てただけです。何も", "{mon}がいたのは知ってます。……それだけです"],
  };
  const DOWNPLAY_TRAP = ["{trap}は、見つけたので避けました", "{trap}にちょっと引っかかったけど、すぐ抜けました", "{trap}？ 何ともなかったです"];

  // 話し方の型。h: ひかり / a: 監査官 / h2: 続き。{what} {whatA} {tail} {floor} {mon} {n}
  // needMon: 魔物の名前が要る型／need: climax（達した件だけ）・magica（変身中の件だけ）
  const STYLE = {
    jimu:    { w: 2, lines: [
      { h: "{floor}階。{what}。{tail}以上です" },
      { h: "{floor}階で、{what}。……それだけです" },
      { h: "次、{floor}階。{what}。{tail}処理は済んでます" },
      { h: "{floor}階：{what}。{tail}" } ] },
    number:  { w: 1, need: "climax", needMon: true, lines: [
      { h: "……{n}回。{floor}階で、{mon}に。……回数から言ったほうが、早いと思って" },
      { h: "{n}回です。……{floor}階の、{mon}のときに。中身は……今から言います", a: "言え", h2: "……{what}" } ] },
    nod:     { w: 1.4, lines: [
      { a: "{floor}階。{whatA}。記録ではそうなっている。相違ないな", h: "……はい" },
      { a: "{floor}階の件は、こちらで読み上げる。{whatA}。……いいな", h: "……はい。そのとおり、です" },
      { a: "{floor}階。{whatA}。違うなら言え", h: "……違わない、です" },
      { a: "{floor}階、{whatA}。お前の口から言い直せ", h: "……{what}" } ] },
    round:   { w: 1.2, needMon: true, lines: [
      { h: "{floor}階でちょっと、{mon}と……仲良く？ なっちゃったというか", a: "正確に言え", h2: "……{what}" },
      { h: "{floor}階は、その……いろいろ、ありまして", a: "いろいろ、とは", h2: "……{what}。……これでいいですか" },
      { h: "{floor}階の{mon}とは、なんていうか、……距離が、近くなって", a: "近く、とは", h2: "……{what}" } ] },
    paper:   { w: 0.8, lines: [
      { h: "{floor}階のことは……書面に書きます。口では、ちょっと", a: "書面でも口でも、中身は同じだ", h2: "……わかってます。{what}" },
      { h: "{floor}階の件は、報告書のほうに書いてあるので", a: "今、口で言え", h2: "……{what}" } ] },
    swap:    { w: 0.9, needMon: true, lines: [
      { h: "{floor}階ではですね、魔物を何体も倒したんですよ！ ほら、ルミナ・ショットで——", a: "{mon}の件は", h2: "……っ。{what}" },
      { h: "そういえば{floor}階の宝箱、空っぽでした。ひどくないですか？", a: "話を逸らすな。{mon}だ", h2: "……{what}" },
      { h: "{floor}階の地図、けっこう正確に描けたんですよ。見ます？", a: "{mon}", h2: "……はい。{what}" } ] },
    defiant: { w: 1, lines: [
      { h: "{what}。……それが何か？ 魔法少女だって、こういうことくらいあります" },
      { h: "{floor}階。{what}。はい、言いました。次どうぞ" },
      { h: "{floor}階？ {what}。……そんな顔しないでください" } ] },
    laugh:   { w: 1.2, lines: [
      { h: "あはは……{floor}階でちょっと、へましちゃって。……へま、っていうか……{what}" },
      { h: "えっとですね、{floor}階は……あはは。笑ってる場合じゃない、ですよね。{what}" },
      { h: "{floor}階はもう、笑うしかないっていうか。……{what}" } ] },
    third:   { w: 1, need: "magica", lines: [
      { h: "ルミナが、{floor}階で。{what}。……ルミナが、です。あたしじゃなくて" },
      { h: "……変身してたときの話なので。{floor}階で、ルミナは、{what}" } ] },
    slip:    { w: 0.6, needMon: true, lines: [
      { h: "{floor}階で{mon}に……きもち、じゃなくて、捕まって……！ 今の無し！", a: "……続けろ", h2: "……{what}" },
      { h: "{floor}階で、{mon}に、……すごく、じゃない、えっと……{what}" } ] },
    askback: { w: 0.8, lines: [
      { h: "……監査官さんは、水晶で見てたんですよね？ {floor}階のこと", a: "口で言え。それが報告だ", h2: "……{what}" },
      { h: "{floor}階のことって、全部、記録に残ってるんですか？", a: "残っている", h2: "……じゃあ、言います。{what}" } ] },
    resolve: { w: 0.5, lines: [
      { h: "……っ。言います。言いますから。{floor}階で、{what}" },
      { h: "…………いえ。ちゃんと言います。{floor}階。{what}" } ] },
  };

  // 姿勢（その日の土台）：重み関数と、話し方の型の傾き
  const POSTURE = {
    jimu:   { name: "淡々と",           tilt: { jimu: 3, nod: 1.5, number: 1.2 } },
    excuse: { name: "言い訳から",       tilt: { round: 2, swap: 1.5, laugh: 1.3 } },
    defer:  { name: "一番の件を後回し", tilt: { swap: 2, paper: 1.5, round: 1.2 } },
    core:   { name: "核心から一気に",   tilt: { resolve: 2, defiant: 1.5, number: 1.5 } },
    crack:  { name: "途中で崩れる",     tilt: { slip: 2.5, laugh: 1.2, resolve: 1.2 } },
    bright: { name: "明るくごまかす",   tilt: { laugh: 3, third: 2, swap: 1.2 } },
    silent: { name: "促されるまで黙る", tilt: { nod: 3, askback: 1.5, paper: 1.2 } },
  };

  const OPEN = {
    cleared:  ["最下層まで行って、転移陣で戻りました。……依頼、達成です", "踏破しました！ ……えっと、中身の報告も、ちゃんとします", "ただいまです。一番下まで、行けました",
               "依頼は達成です。最下層の転移陣から戻りました", "十階、全部見てきました。……一応、成功です", "一番下まで行けたのは、行けたんですけど"],
    retreat:  ["{deep}階まで行って、撤退しました。……無理は、しませんでした", "途中で引き返しました。{deep}階が限界でした", "……撤退です。{deep}階で",
               "{deep}階で、これ以上は危ないって思って", "今日は{deep}階まで。……悔しいけど、戻りました", "撤退の判断は、自分でしました。{deep}階です"],
    ordered:  ["監査官さんの合図で、引きました。……素直に従ったの、褒めてほしいくらいです", "勧告どおり、{deep}階で戻りました", "合図が見えたので、{deep}階で引き返しました"],
    defeat:   ["……{deep}階で、動けなくなって。助けて、もらいました", "救出、ありがとうございました。……{deep}階、でした", "……迷惑、かけました。{deep}階で、力尽きて",
               "……{deep}階で、倒れました。そこから先は、救出まで", "{deep}階で負けました。……それ以上は、今から話します"],
  };
  const OPEN_BY_POSTURE = {
    jimu: ["報告します。", "結論から。", "では、報告です。"],
    excuse: ["先に言っておきますけど、今日の依頼、ちょっと話が違ったんです。", "あの、最初に言い訳させてください。", "今日のは、あたしのせいだけじゃないと思うんです。"],
    defer: ["えっと、順番に話しますね。軽いほうから。", "小さいことから、いきますね。", "まずは、簡単なほうから。"],
    core: ["……一番のことから言います。", "……先に、大きいのを言っちゃいます。", "……隠してもしょうがないので。"],
    crack: ["……だいじょうぶです。話せます。", "報告、しますね。……ちゃんと、できると思います。", "……ちょっと、待ってください。……はい。"],
    bright: ["ただいまです！ 聞いてください、今日は——", "ルミナ、帰還しました！", "はい、報告の時間ですね！"],
    silent: ["…………", "……報告、ですよね。", "……はい。"],
  };
  const AUD = {
    open: ["始めろ。掠めたことも抜かすな", "座れ。今日の報告を聞く", "水晶の記録はこちらにある。その上で、お前の口から聞く", "順に話せ", "報告を"],
    silentPush: ["黙っていても終わらないぞ", "……どうした。話せ", "記録を読み上げてやろうか"],
    between: ["次", "続けろ", "……それで", "ほかには", "その次は", "まだあるな", "急がなくていい。次"],
    probeLie: ["本当にそれだけか", "記録と、少し違うようだが", "{dur}、と記録にはあるが"],
    close: ["この内容で、書類と照合する", "……わかった。書類を出せ", "以上だな。書類は", "下がっていい。書類は置いていけ"],
    nightAsk: ["救出されるまでの間のことも、話せ", "倒れてから、朝まで。何があった", "夜の間のことを、聞かせてもらう"],
  };
  const CLOSE2 = {
    base: ["次は、もっと下まで行きます", "明日も、いけます", "……ちょっと、休みますね", "監査官さんも、お疲れさまです", "報告書、字が汚いのは許してください", "今日は早く寝ます"],
    ailment: ["医務室、開いてますよね", "……今日は、まっすぐ帰れる気がしないです", "処置のほう、お願いします", "……着替え、したいです", "お水、もらえますか", "明日までに、なんとかします"],
  };
  const REST_TAIL = ["", "……たぶん", "。確認してください", "。全部、正直に書きました", "。読めば分かると思います"];
  const REST = ["ほかは、細かいのがいくつか。報告書に書いておきました", "あとは小さいのがいくつか。書面に全部あります", "残りは……書類のほうで勘弁してください",
                "細かいのは省きます。書類にあります", "ほかにも少し。……書いてあります", "あとは、似たようなのが少し"];
  const NIGHT_RECOUNT = {
    honest: ["……倒れたあと、{mons}が、集まってきて。……朝まで、ずっと、でした", "夜のあいだ、{mons}に、……何度も。{n}回は、覚えてます", "……救出が来るまで、{mons}に、好きにされてました。途中からは、もう抵抗も"],
    partial: ["……倒れたあとのことは、あんまり覚えてなくて。{mon1}がいたのは、覚えてます", "夜のことは……ほとんど、寝てたと思います。たぶん"],
    denial: ["……何も、なかったです。気を失ってただけで", "倒れてからは、朝まで気を失ってました。それだけです"],
  };
  const CLOSE = {
    base: ["……以上です。詳しいことは、報告書に書きました", "報告、おわりです", "以上、です。……次は、もっとうまくやります",
           "以上です。質問あれば、どうぞ", "こんなところです。……あ、報告書、これです", "報告おわり！ ……疲れたぁ"],
    ailment: ["……以上です。あの、処置、お願いしていいですか", "報告おわり。……まだ体が、ちょっと、変なので", "以上です。……医務室、寄ってから帰りますね",
              "……以上。すみません、座ってるの、ちょっとつらくて", "これで全部です。……手当て、してもらえますか", "以上です。……顔、赤いのは、気にしないでください"],
    low: ["…………以上です", "……もう、いいですか", "……書類、置いていきます", "……以上。失礼します"],
  };
  // 報告の前の地の文（今の様子）
  const STATE_NOTE = {
    aroused: ["（頬が上気している。座り方が、落ち着かない）", "（呼吸が、少し浅い。本人は気づいていないようだ）", "（首筋が赤い。膝の上で、指を組んだりほどいたりしている）",
              "（ときどき、唇を湿らせてから話し出す）", "（椅子の上で、何度か重心を移した）", "（うなじに汗が光っている。部屋は暑くないのに）", "（膝を固く揃えたまま、少しだけ前屈みに座っている）"],
    civilian: ["（変身は解けたままだ。私服の袖を、何度も引っ張っている）"],
    tired: ["（声に張りがない。消耗が色濃い）", "（椅子に沈むように座っている）"],
    night: ["（救出から半日。まだ目の焦点が、ときどき合わない）", "（毛布を肩に掛けたまま、報告の席に着いた）"],
    sigil: ["（ときどき、下腹のあたりを服の上から押さえている。本人は気づいていないようだ）", "（座り直すたびに、スカートの前を手で整えている）",
            "（臍の下に、手のひらを当てたまま座っている）", "（何かを確かめるように、一度だけ腹に目を落とした）",
            "（腰の位置が落ち着かず、何度か座り直した）", "（袖口で、うっすら汗ばんだ額を拭っている）"],
    fine: ["（背筋は伸びている。問いが核心へ寄るたび、指先がスカートの裾を握る）", "（いつもの明るさで入ってきたが、目だけが笑っていない）",
           "（報告書を胸の前に抱えている。書き直した跡が多い）", "（椅子に浅く腰掛け、足先を小さく揺らしている）"],
  };

  /* ---- 帰ってからも続いている状態異常：報告の最中にも効く（依頼中の快感とは別物） ---- */
  const AIL_NOTE = {
    attached: ["（服の下で、何かが小さく震えている。ひかりは膝を固く閉じたまま座っている）", "（ときどき、胸元の布が内側から押し上げられる。本人は見ないようにしている）", "（座面がかすかに鳴る。一定の間隔で、ひかりの腰が小さく浮く）"],
    omazuke: ["（落ち着きなく腿を擦り合わせている。熱が、どこにも行けずに溜まっているようだ）", "（呼吸が浅い。何かを堪えている顔だが、何を堪えているのかは言わない）"],
    throb: ["（痒みを堪えるように、指先で膝を何度も押さえている）", "（肌が赤い。衣擦れのたびに、小さく肩が跳ねる）"],
    sensitive: ["（椅子の座面が擦れるたび、ひかりの肩がびくりとする）", "（袖が手首に触れただけで、ひかりは小さく息を呑んだ）"],
    charm: ["（{to}の話になるたび、ひかりの頬が緩む。本人は気づいていない）", "（{to}の名前を口にする前だけ、ほんの少し、声が柔らかくなる）", "（{to}という言葉のところで、視線が一瞬、宙に浮いた）",
            "（{to}の話を振ると、ひかりは早口になる）", "（{to}の件だけ、報告書の字がやけに丁寧だ）", "（{to}の名前が出ると、指先で髪の先をいじりはじめる）"],
    rewired: ["（入室するなり、ひかりは『敬礼』をした。脚を開き、腰を落とし、指を揃えて。本人は礼儀正しい挨拶のつもりでいる）", "（着席の前に、ひかりは誇らしげにワルドー式の敬礼をしてみせた。ひかり自身は何の疑問も持っていない）",
              "（報告が終わるたびに、ひかりは律儀に敬礼を挟む。脚を開いたまま、背筋だけはまっすぐに）", "（監査官が立ち上がると、ひかりも反射的に立って敬礼した。腰を落とした、あの姿勢で）", "（敬礼のとき、ひかりはいつも少しだけ誇らしげだ。何を誇っているのかは、本人にも説明できないだろう）"],
    hairTrigger: ["（報告の途中、前触れなくひかりの肩が跳ねた。本人にも、理由は分からないらしい）", "（一瞬、目の焦点が消え、すぐ戻った。ひかりは何事もなかったように続けている）"],
    exposure: ["（替えの衣装が間に合わなかったらしい。借り物の外套の合わせを、ずっと手で押さえている）"],
    addict: ["（部屋の隅の鉢植えの茸に、ひかりの視線が何度も吸い寄せられる）"],
    mindTaint: ["（ときどき、報告と関係のない所で、うっとりと言葉を切る）"],
    exhaustion: ["（声に張りがない。言葉の途中で、何度か息継ぎをした）", "（背もたれに寄りかからないと、座っていられないようだ）", "（目の下に隈。連日の消耗が抜けていない）",
                 "（一文ごとに、少し間があく）", "（書類を持つ手が、かすかに震えている）"],
  };
  // 報告の最中に割り込む、いま現在の快感（付着体・おあずけ・疼き）
  // 組み合わせで作る：漏れた声＋言い訳（状態異常ごと）＋続け方
  const ONGOING = {
    moan: ["……っ、ん……っ。", "……ぁ、……っ。", "ん、んぅ……っ。", "……ふ、ぅ……っ。", "っ……、……は、ぁ……。", "……ひ、ぅ……っ。", "……ん、……く……っ。", "……っ、……ぁ……ぅ。"],
    attached: ["……動いて、るだけ、なので。", "……服の、中の、が。……すみません。", "……今の、なんでも、ないです。", "……取れて、ないんです、まだ。", "……止まって、くれない、ので。", "……こ、これは、報告とは、関係、なくて。", "……震えてる、だけ、です。", "……あ、あたしが、動いたんじゃ、ないです。"],
    omazuke: ["……熱い、だけ、です。", "……座り直しても、いいですか。", "……いま、話しかけないで、もらえると。", "……溜まってる、だけ、なので。", "……なんでも、ない、です。……ほんとに。", "……っ、あと、ちょっと、とか、思ってないです。", "……す、すみません、足、組み替えます。", "……だいじょうぶ、まだ、大丈夫、です。"],
    throb: ["……かゆ、……いえ、なんでもないです。", "……ちょっと、膝が。", "……掻いても、いいですか。……いえ、我慢します。", "……肌が、ぴりってしただけです。", "……疼いて、るだけ、です。", "……すみません、じっと、してられなくて。"],
    resume: ["……続けます。", "……はい。次、いきます。", "……大丈夫、です。", "……どこまで、話しましたっけ。", "……報告、続けます、から。", ""],
  };
  function ongoingLine(mem, day, id) {
    return (freshPick(mem, day, "go:m", ONGOING.moan, 1) + freshPick(mem, day, "go:" + id, ONGOING[id], 2) + freshPick(mem, day, "go:r", ONGOING.resume, 1)).replace(/。。/g, "。");
  }
  const MOAN = ["……っ、", "……ん、", "……ふ、ぅ……", "……ぁ、"];
  const LAW_TALK = {
    shumoku: ["迷宮の法則は『衆目』でした。……どこにいても、見られてる感じがして", "法則が、『衆目』で。……見物が、多かったです"],
    juntaku: ["法則は『潤沢』。……入った時点で、空気が、もう", "『潤沢の法則』でした。息をしてるだけで、熱くなるやつです"],
    kinzetsu: ["……法則は、『禁絶』でした。……出た時のことは、救護の人も見てたので、……言わなくても、分かりますよね", "『禁絶の法則』。中では、一度も、……その。……出た瞬間に、全部来ました"],
    seishi: ["法則は『静止』。捕まると、長いんです。……何もされないのが、長い", "『静止の法則』でした。……時間が、長かったです"],
    boukyaku: ["法則は……えっと。なんでしたっけ。……たぶん、大したことない法則でした", "入口に何か書いてあった気はします。……特に、何もなかったと思います"],
    eibin: ["法則は『鋭敏』。降りるたびに、服が擦れるのが……気になって", "『鋭敏の法則』でした。……今も、ちょっと、肌が"],
    hakudatsu: ["法則は『剥奪』。……降りるたびに、一枚ずつ。……それ以上は、見れば分かると思います", "『剥奪の法則』でした。……替えの衣装、お願いします"],
    kokuin: ["法則は『刻印』。入口で、……お腹に、紋を", "『刻印の法則』でした。……入っただけで、紋が"],
  };
  const CONVERT_OPEN = ["戦闘員その2、報告します！ ……え？ あ、……あれ。……ひかり、です。星野、ひかり。……今の、なしで", "ワルドー万歳……じゃ、なくて。……おはようございます。……救出、ありがとうございました"];

  /* ================================================================ 文を選ぶ（日をまたいで避ける） */
  function freshPick(mem, day, key, arr, gap) {
    const ok = arr.filter((s, i) => { const k = key + ":" + i; return !mem[k] || day - mem[k] >= (gap || 3); });
    const pool = ok.length ? ok : arr;
    const s = U.pick(pool);
    mem[key + ":" + arr.indexOf(s)] = day;
    return s;
  }

  // 口ごもり：山場だけに使う
  function stammer(s) {
    if (/^……/.test(s)) return s.replace(/。([^」]*)$/, "……っ。$1");   // もともと口ごもっている行は重ねない
    return s.replace(/、/, "、……").replace(/。([^」]*)$/, "……っ。$1").replace(/^([^……])/, "……$1");
  }

  /* ================================================================ 起きたことを「件」にまとめる */
  function units(rec) {
    const out = [];
    const ev = rec.events;
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      if (e.kind === "hold") {
        const cl = ev.slice(i + 1).filter(x => x.kind === "climax" && x.bound && x.floor === e.floor && x.t - e.t <= (e.dur || 6) + 0.5).length;
        out.push({ kind: "hold", floor: e.floor, t: e.t, mon: e.mon, monName: e.monName, type: e.type, sev: e.sev || 2, dur: e.dur || 3, climax: cl, hidden: !!e.hidden });
      } else if (e.kind === "trap" && (e.sev || 0) >= 1) {
        const same = out.find(u => u.kind === "trap" && u.trap === e.trap && u.floor === e.floor);
        if (same) { same.n = (same.n || 1) + 1; continue; }
        out.push({ kind: "trap", floor: e.floor, t: e.t, trap: e.trap, trapName: e.trapName, type: e.type, sev: e.sev, dur: 0, climax: 0, hidden: !!e.hidden });
      } else if (["charm", "sniff", "salute", "fit", "deny", "attach"].includes(e.kind)) {
        // 同じ相手・同じ種類は、潜行全体で一件（回数と最後の段階）
        const key = e.kind + ":" + (e.kind === "attach" ? e.att : e.mon || "");
        const same = out.find(u => u.key === key);
        if (same) { same.n++; if (e.lv) same.lv = Math.max(same.lv || 0, e.lv); same.sev = Math.max(same.sev, e.sev || 1); continue; }
        out.push({ kind: e.kind, key, floor: e.floor, t: e.t, mon: e.kind === "attach" ? e.att : e.mon, monName: e.kind === "attach" ? e.attName : e.monName, type: e.type || "蕩", sev: e.sev || 2, lv: e.lv, n: 1, climax: 0, hidden: !!e.hidden });
      } else if (["release", "beg", "rescue", "convert", "vow", "freeze", "exposure", "addict"].includes(e.kind)) {
        if (["exposure", "addict"].includes(e.kind) && out.some(u => u.kind === e.kind)) continue;
        out.push({ kind: e.kind, floor: e.floor, t: e.t, mon: e.mon, monName: e.monName || "", type: e.type || "蕩", sev: e.sev || 2, n: e.n || 1, climax: e.kind === "release" ? 0 : 0, rel: e.n || 0, hidden: false });
      } else if (e.kind === "possess") {
        out.push({ kind: "possess", floor: e.floor, t: e.t, mon: e.mon, monName: e.monName, type: "惑", sev: 2, dur: e.dur || 5, climax: 0 });
      } else if (e.kind === "sigil") {
        // 淫紋は、潜行全体で一件（最後の深さ）
        const first = out.find(x => x.kind === "sigil");
        if (first) { first.lv = e.lv; first.sev = Math.max(first.sev, e.sev); first.n++; continue; }
        out.push({ kind: "sigil", floor: e.floor, t: e.t, mon: e.mon, monName: e.monName, trapName: e.monName, type: "蕩", sev: e.sev, lv: e.lv, n: 1, climax: 0 });
      } else if (e.kind === "filmed") {
        const same = out.find(x => x.kind === "filmed");
        if (same) { same.n++; continue; }
        out.push({ kind: "filmed", floor: e.floor, t: e.t, mon: e.mon, monName: e.monName, type: "惑", sev: 3, n: 1, climax: 0 });
      } else if (e.kind === "untransform") {
        // 変身が解けたのは、最初の1回を一件にして回数を数える
        const first = out.find(x => x.kind === "untransform");
        if (first) first.n++;
        else out.push({ kind: "untransform", floor: e.floor, t: e.t, type: "削", sev: 3, climax: 0, n: 1 });
      }
    }
    // 軽いもの（浴びた・呆けた・吸われた）は、魔物ごとに潜行全体で1件にまとめる。
    // 同じ魔物に捕まった件があれば、そちらに含めて別には数えない
    const agg = {};
    for (const e of ev) {
      if (!["arouse", "trance", "drain"].includes(e.kind) || !e.monName) continue;
      if (G.TRAPS[e.mon]) continue;
      if (out.some(u => u.kind === "hold" && u.mon === e.mon)) continue;
      const k = e.kind + e.mon;
      if (!agg[k]) agg[k] = { kind: e.kind, floor: e.floor, t: e.t, mon: e.mon, monName: e.monName, type: e.type, sev: 1, n: 0, hidden: false, climax: 0 };
      agg[k].n++;
      if (e.hidden) agg[k].hidden = true;
    }
    for (const a of Object.values(agg)) {
      if (a.n >= 4) a.sev = 2;
      out.push(a);
    }
    // 捕まっていない時の絶頂は、直前の件にぶら下げる
    for (const e of ev) if (e.kind === "climax" && !e.bound) {
      const u = out.filter(x => x.floor === e.floor && x.t <= e.t).sort((a, b) => b.t - a.t)[0];
      if (u) u.climax = (u.climax || 0) + 1;
    }
    out.sort((a, b) => a.floor - b.floor || a.t - b.t);
    for (const u of out) u.shame = Math.min(3, (u.sev || 1) + (u.climax ? 1 : 0) - (u.kind === "drain" ? 1 : 0));
    // 多すぎる日は、重いものを中心に6件まで。残りは「細かいのがいくつか」とまとめる
    if (out.length > 6) {
      const keep = out.slice().sort((a, b) => b.shame - a.shame || a.floor - b.floor).slice(0, 6);
      const rest = out.filter(u => !keep.includes(u));
      const kept = out.filter(u => keep.includes(u));
      kept.rest = rest.length;
      return kept;
    }
    return out;
  }

  function what(u, day, mem) {
    let key = u.kind === "hold" ? "hold_" + (u.type === "蕩" ? "蕩" : "絡") : u.kind === "trap" ? "trap_" + u.type : u.kind;
    const kk = (u.kind === "trap" ? u.trap : u.mon) + ":" + u.kind;
    if (WHAT_KIND[kk] && U.chance(0.55)) key = kk;
    const arr = WHAT_KIND[key] || WHAT[key] || WHAT.arouse;
    let s = U.fill(freshPick(mem, day, "what:" + key, arr, 2), { mon: u.monName, trap: u.trapName, floor: u.floor, n: u.rel || u.n || 1 });
    if (u.kind === "charm" && u.lv >= 2) s += "。" + ["", "", "……今も、ちょっと", "……好き、とかじゃ、ないです"][u.lv];
    if (u.climax && u.kind !== "release") s += "。" + U.fill(freshPick(mem, day, "cl" + (u.climax > 1 ? "n" : "1"), u.climax > 1 ? CLIMAX.n : CLIMAX[1], 2), { n: u.climax });
    return s;
  }

  function durText(d) { if (!d) return "すぐ"; if (d < 3) return "数秒"; if (d < 8) return Math.round(d) + "秒"; return "かなり長いあいだ"; }

  /* ================================================================ 姿勢を決める */
  function choosePosture(rec, s) {
    const heavy = rec.units.filter(u => u.shame >= 3).length;
    const tier = G.tier(s.body, s.mind);
    const w = {
      jimu:   1 + (s.trust > 60 ? 1.5 : 0) + (s.caughtYesterday ? 2 : 0),
      excuse: 0.6 + (rec.outcome !== "cleared" ? 1 : 0) + (rec.mismatch > 1 ? 1.2 : 0),
      defer:  0.4 + heavy * 0.8,
      core:   0.3 + (s.trust > 55 && heavy ? 1.2 : 0) + (tier >= 2 ? 0.6 : 0),
      crack:  0.3 + (rec.h.arousal > 45 ? 2 : 0) + (rec.outcome === "defeat" ? 0.8 : 0),
      bright: 1.2 + (heavy === 0 ? 1.2 : 0) - (rec.outcome === "defeat" ? 0.8 : 0),
      silent: 0.3 + (s.trust < 35 ? 2 : 0) + (rec.outcome === "defeat" ? 0.5 : 0),
    };
    // 前日と同じ姿勢は避けぎみに
    if (s.lastPosture && w[s.lastPosture]) w[s.lastPosture] *= 0.35;
    const k = U.weighted(Object.keys(w), x => w[x]);
    return k;
  }

  function order(list, posture) {
    const L = list.slice();
    const pick = posture === "defer" ? "defer" : posture === "core" ? "desc" : posture === "excuse" ? "asc" : U.pick(["chrono", "chrono", "asc", "desc"]);
    if (pick === "asc") L.sort((a, b) => a.shame - b.shame || a.floor - b.floor);
    else if (pick === "desc") L.sort((a, b) => b.shame - a.shame || a.floor - b.floor);
    else if (pick === "defer") { const worst = L.slice().sort((a, b) => b.shame - a.shame)[0]; const rest = L.filter(x => x !== worst); if (worst) rest.push(worst); return { list: rest, how: "defer", worst }; }
    return { list: L, how: pick };
  }

  /* ================================================================ 嘘をつくか */
  function decideLie(u, s, rec) {
    if (u.hidden) return "missing";
    if (u.shame < 2 || u.kind === "untransform") return "honest";
    let p = 0.18 + 0.18 * (u.shame - 2) + (s.trust < 40 ? 0.15 : 0) - (s.trust > 75 ? 0.12 : 0);
    const tier = G.tier(s.body, s.mind);
    if (tier >= 3) p -= 0.15;       // 待ってしまう：隠す気も薄れる
    if (tier === 2) p += 0.08;      // 心は拒み、体は応える：一番隠したい
    return U.chance(U.clamp(p, 0.03, 0.7)) ? "false" : "honest";
  }

  /* ================================================================ 報告を組み立てる */
  function build(rec, save) {
    const s = save, mem = s.reportMem || (s.reportMem = {}), day = rec.day;
    rec.units = units(rec);
    const posture = choosePosture(rec, Object.assign({}, s, { caughtYesterday: s.caughtDay === day - 1 }));
    s.lastPosture = posture;
    const P = POSTURE[posture];
    const lines = [];
    const push = (who, text, extra) => lines.push(Object.assign({ who, text }, extra || {}));
    const ctxBase = { deep: rec.floorReached };

    // 今の様子
    const noteKey = rec.outcome === "defeat" ? "night" : rec.h.form === "civilian" ? "civilian" : rec.h.arousal > 45 ? "aroused" : rec.h.hp < 45 ? "tired" : "fine";
    push("n", freshPick(mem, day, "note:" + noteKey, STATE_NOTE[noteKey], 3));
    if (noteKey !== "aroused" && rec.h.arousal > 55) push("n", freshPick(mem, day, "note:aroused", STATE_NOTE.aroused, 3));
    if (rec.ailments && rec.ailments.includes("sigil") && U.chance(0.4)) push("n", freshPick(mem, day, "note:sigil", STATE_NOTE.sigil, 5));
    // 残っている状態異常の様子（多すぎないように二つまで。刷り込みは必ず）
    const ails = rec.ailments || [];
    const charmTo = Object.keys((s.ailments.find(a => a.id === "charm") || {}).to || {}).map(k => G.MONSTERS[k] ? G.MONSTERS[k].name : k)[0] || "";
    const noteKeys = ails.filter(id => AIL_NOTE[id]).sort((a, b) => (b === "rewired") - (a === "rewired"));
    for (const id of noteKeys.slice(0, 2)) push("n", U.fill(freshPick(mem, day, "ail:" + id, AIL_NOTE[id], 3), { to: charmTo }));
    const going = ["attached", "omazuke", "throb"].filter(id => ails.includes(id));
    let breaks = going.length ? 2 : 0;

    push("a", freshPick(mem, day, "aud:open", AUD.open, 3));
    // 書き出し：姿勢の一言＋結果
    let open = U.fill(freshPick(mem, day, "open:" + rec.outcome, OPEN[rec.outcome] || OPEN.retreat, 4), ctxBase);
    const pre = freshPick(mem, day, "openP:" + posture, OPEN_BY_POSTURE[posture], 2);
    if (posture === "silent" && U.chance(0.7)) { push("h", pre); push("a", freshPick(mem, day, "aud:silent", AUD.silentPush, 3)); push("h", open); }
    else push("h", pre + (pre.endsWith("。") || pre.endsWith("…") ? "" : " ") + open);
    if (rec.converted) push("h", freshPick(mem, day, "conv", CONVERT_OPEN, 3));
    if (rec.law && LAW_TALK[rec.law]) push("h", freshPick(mem, day, "law:" + rec.law, LAW_TALK[rec.law], 3));

    // 一件ずつ
    const lies = {};
    for (const u of rec.units) u.truth = decideLie(u, s, rec);
    const ord = order(rec.units.filter(u => u.truth !== "missing"), posture);
    const used = {};
    let stamLeft = posture === "crack" ? 2 : (rec.h.arousal > 55 ? 1 : 0);
    ord.list.forEach((u, i) => {
      if (i > 0 && breaks > 1 && U.chance(0.35)) { breaks--; const id = U.pick(going); push("h", ongoingLine(mem, day, id)); }
      if (i > 0 && U.chance(0.45)) push("a", freshPick(mem, day, "aud:between", AUD.between, 1));
      const ctx = { floor: u.floor, mon: u.monName || u.trapName || "", dur: durText(u.dur), n: u.climax || u.n || 1 };
      if (u.truth === "false") {
        // 嘘：軽く言う
        const t = U.fill(DOWNPLAY_KIND[u.kind] ? freshPick(mem, day, "downK:" + u.kind, DOWNPLAY_KIND[u.kind], 2) : u.kind === "trap" ? freshPick(mem, day, "downT", DOWNPLAY_TRAP, 2) : freshPick(mem, day, "down", DOWNPLAY, 2), Object.assign({ trap: u.trapName }, ctx));
        push("h", `${u.floor}階は……${t}`, { unit: u, lie: true, probe: { q: U.fill(freshPick(mem, day, "aud:probe", AUD.probeLie, 2), ctx), a: U.pick(["……それだけ、です。本当に", "……っ。そう、書いてあるなら、そうなんじゃないですか", "……記録のほうが、間違ってるんだと思います"]) } });
        return;
      }
      // 型を選ぶ：姿勢の傾き×条件×1回の報告で2回まで
      const cands = Object.keys(STYLE).filter(k => {
        const st = STYLE[k];
        if ((used[k] || 0) >= 2) return false;
        if (st.need === "climax" && !u.climax) return false;
        if (st.need === "magica" && u.kind === "untransform") return false;
        if (st.needMon && !u.monName) return false;
        if (u.shame <= 1 && (k === "resolve" || k === "number" || k === "slip")) return false;
        return true;
      });
      const k = U.weighted(cands, x => STYLE[x].w * (P.tilt[x] || 1) * (mem["style:" + x] && day - mem["style:" + x] < 1 ? 0.6 : 1));
      used[k] = (used[k] || 0) + 1;
      mem["style:" + k] = day;
      const tpl = freshPick(mem, day, "st:" + k, STYLE[k].lines, 3);
      const wtxt = what(u, day, mem);
      const fillc = Object.assign({}, ctx, {
        what: wtxt, trap: u.trapName || "",
        whatA: U.fill(WHAT_A[u.kind] || WHAT_A.arouse, { mon: u.monName || "", trap: u.trapName || "", dur: durText(u.dur) }) + (u.kind === "untransform" && u.n > 1 ? `（${u.n}回）` : ""),
        tail: u.kind === "hold" ? (u.climax ? "" : durText(u.dur) + "くらいで抜けました。") : u.kind === "possess" ? (u.climax ? "" : durText(u.dur) + "くらいで離れました。") : u.kind === "sigil" && u.lv > 1 ? ["", "", "……二重に、刻まれてます。", "……三重、です。"][u.lv] : (u.kind === "untransform" && u.n > 1 ? `……${u.n}回、です。` : ""),
      });
      let htext = tpl.h ? U.fill(tpl.h, fillc) : null;
      if (htext && stamLeft > 0 && u.shame >= 2) { htext = stammer(htext); stamLeft--; }
      // いま現在の快感が、言葉に割り込む
      if (htext && going.length && U.chance(0.45)) htext = htext.replace(/、/, "、" + U.pick(MOAN));
      if (tpl.a && !tpl.h2) { push("a", U.fill(tpl.a, fillc)); push("h", htext, { unit: u }); }
      else {
        if (htext) push("h", htext, { unit: u });
        if (tpl.a) push("a", U.fill(tpl.a, fillc));
        if (tpl.h2) push("h", U.fill(tpl.h2, fillc), { unit: u });
      }
    });
    if (breaks > 0) { const id = U.pick(going); push("h", ongoingLine(mem, day, id)); }
    if (rec.units.rest) push("h", U.fill(freshPick(mem, day, "rest", REST, 3), { n: rec.units.rest }).replace(/。$/, "") + U.pick(REST_TAIL));
    if (ord.how === "defer" && ord.worst && ord.worst.truth === "honest") push("n", "（一番重い件を、最後まで言い出さなかった）");

    // 敗北後の夜
    if (rec.outcome === "defeat" && rec.night && rec.night.length) {
      push("a", freshPick(mem, day, "aud:night", AUD.nightAsk, 2));
      const mons = [...new Set(rec.night.map(b => b.monName).filter(Boolean))];
      const n = rec.night.filter(b => b.climax).length;
      const tier = G.tier(s.body, s.mind);
      const hid = rec.night.some(b => b.type === "惑");
      let mode = "honest";
      if (hid && U.chance(0.5)) mode = "partial";
      else if (tier === 2 && U.chance(0.35) || s.trust < 30 && U.chance(0.5)) mode = "denial";
      rec.nightTruth = mode;
      push("h", U.fill(freshPick(mem, day, "night:" + mode, NIGHT_RECOUNT[mode], 3), { mons: mons.join("と") || "何か", mon1: mons[0] || "何か", n: Math.max(1, n) }), { night: true, lie: mode === "denial" });
    }
    // 締め
    const closeKey = rec.h.arousal > 45 || (rec.ailments && rec.ailments.length) ? "ailment" : (s.trust < 35 ? "low" : "base");
    push("a", freshPick(mem, day, "aud:close", AUD.close, 3));
    // 締めは「区切りの一言」＋「頼みごと・気持ち」の組み合わせで作る
    const c1 = freshPick(mem, day, "close:" + closeKey, CLOSE[closeKey], 3);
    const c2 = closeKey === "low" ? "" : freshPick(mem, day, "close2:" + closeKey, CLOSE2[closeKey], 3);
    push("h", c2 && U.chance(0.6) ? c1.replace(/[。！]?$/, "。") + c2 : c1);
    const TRAIT_FMT = ["（監査記録：身についた性癖——{name}・{st}。{desc}）", "（記録係の欄外：『{name}』が{st}の段に進んだ。{desc}）", "（今日の記録で、{name}が{st}になった。{desc}）", "（{desc}——性癖の欄に『{name}・{st}』と書き足された）"];
    for (const g of rec.traitsGained || []) push("n", U.fill(freshPick(mem, day, "tfmt", TRAIT_FMT, 2), { name: G.TRAITS[g.id].name, st: G.TRAIT_STAGE[g.stage], desc: G.TRAITS[g.id].desc }));
    rec.posture = posture;
    rec.postureName = P.name;
    return lines;
  }

  /* ================================================================ 報告書（口語体） */
  const DOC = {
    honest: {
      hold: ["{floor}階：{mon}に捕まった。{dur}くらいで抜けた。", "{floor}階：{mon}に絡まれて動けなくなった。自力で抜けた。"],
      holdC: ["{floor}階：{mon}に捕まって、{dur}動けなかった。そのあいだに{n}回、意識が飛んだ。", "{floor}階：{mon}に捕まった。抜けるまでに、何回か達してしまった（{n}回）。"],
      trap: ["{floor}階：{trap}に引っかかった。", "{floor}階：{trap}が作動。ちょっと手間取った。"],
      arouse: ["{floor}階：{mon}の近くで体が熱くなった。", "{floor}階：{mon}に何か浴びせられた。"],
      trance: ["{floor}階：{mon}のせいで少しぼーっとした。"],
      drain: ["{floor}階：{mon}に魔力を吸われた。"],
      untransform: ["{floor}階：魔力切れで変身が解けた。そこからは素の姿で動いた。"],
      possess: ["{floor}階：{mon}に腕を取られた。しばらく、自分の手が言うことを聞かなかった。", "{floor}階：{mon}が袖から入り込んだ。光弾は撃てなかった（自分に当たるので）。"],
      sigil: ["{floor}階：下腹に紋を刻まれた。まだ、薄く残ってる。", "{floor}階：{mon}で、淫紋。解呪の手続きをお願いします。"],
      filmed: ["{floor}階：{mon}に見られている前で、達した。", "{floor}階：{mon}がいた。……見られた。"],
      charm: ["{floor}階：{mon}に対して、攻撃をためらった。理由は不明。", "{floor}階：{mon}から目が離せなくなった（魅了の疑い）。"],
      attach: ["{floor}階：{mon}が身体に付着。自力では外せず、現在も付いている。", "{floor}階：{mon}に貼りつかれた。取り外しを申請します。"],
      release: ["{floor}階：止められていた絶頂が、最後にまとめて来た（{n}回）。", "{floor}階：溜められていた分が、一度に解放された。"],
      beg: ["{floor}階：{mon}に寸止めを繰り返され、……懇願した。", "{floor}階：{mon}。三度止められ、四度目に、ねだった。"],
      rescue: ["{floor}階：ワルドーの装置で洗脳されかけた。相棒の妖精により回復。"],
      convert: ["{floor}階：ワルドーに戦闘員として登録された（一晩）。敬礼が、まだ抜けない。"],
      sniff: ["{floor}階：{mon}の臭いで足が止まった（{n}回）。"], salute: ["{floor}階：{mon}に敬礼した。規定どおりの挨拶。"],
      fit: ["{floor}階：原因不明の発作（{n}回）。"], deny: ["{floor}階：{mon}に絶頂を止められていた。"], vow: ["{floor}階：誓約の祭壇。階を出るまで達せなかった。出た後のことは、書かない。"],
      freeze: ["{floor}階：{mon}で、身体の時間が止まった。"], exposure: ["{floor}階：装束損壊。替えを申請。"], addict: ["{floor}階：{mon}の粉を吸った。依存性あり。"],
    },
    falseKind: {
      charm: ["{floor}階：{mon}と交戦。特に問題なし。"], attach: ["{floor}階：付着物なし。"], release: ["{floor}階：特記事項なし。"], beg: ["{floor}階：{mon}と交戦、撃退。"],
      sniff: ["{floor}階：{mon}とすれ違った。問題なし。"], deny: ["{floor}階：{mon}を撃退。"], vow: ["{floor}階：祭壇あり。触れていない。"], addict: ["{floor}階：茸の群生地。迂回した。"],
      sigil: ["{floor}階：{mon}で呪いの転写。魔力の壁で丸ごと弾き返した。紋様は受けていない。", "{floor}階：{mon}を破壊した。問題なし。"],
      possess: ["{floor}階：{mon}が袖口から入ろうとしたが、払った。", "{floor}階：{mon}を見かけた。袖を締めて通過。"],
      filmed: ["{floor}階：{mon}がいた。見ているだけで害はない。"],
    },
    falseTrap: ["{floor}階：{trap}を見つけたので避けた。", "{floor}階：{trap}があったけど、何ともなかった。"],
    false: ["{floor}階：{mon}とすれ違った。特に問題なし。", "{floor}階：{mon}に一瞬つかまれたけど、すぐ振りほどいた。", "{floor}階：{mon}がいたので避けて通った。"],
    missing: ["{floor}階：特に何もなし。", "{floor}階：静かだった。すぐ下の階へ。"],
    head: { cleared: "結果：最下層まで行って、転移陣で帰った。", retreat: "結果：{deep}階で撤退。", ordered: "結果：勧告に従って{deep}階で戻った。", defeat: "結果：{deep}階で動けなくなり、翌日救出された。" },
    night: { honest: "救出まで：倒れたあと、{mons}に朝まで囲まれていた。", partial: "救出まで：あまり覚えていない。{mon1}がいた気がする。", denial: "救出まで：気を失っていた。何もなかった。" },
  };

  function documentLines(rec, save) {
    const day = rec.day, mem = save.reportMem;
    const out = [{ text: U.fill(DOC.head[rec.outcome] || DOC.head.retreat, { deep: rec.floorReached }), kind: "honest", fixed: true }];
    // 報告に出た件と、隠した件（欠落）を、階の順に
    const floors = [...new Set(rec.units.map(u => u.floor))].sort((a, b) => a - b);
    for (const f of floors) {
      for (const u of rec.units.filter(x => x.floor === f)) {
        const ctx = { floor: f, mon: u.monName || u.trapName || "", trap: u.trapName, dur: durText(u.dur), n: u.climax || 1 };
        if (u.truth === "missing") out.push({ text: U.fill(freshPick(mem, day, "doc:miss", DOC.missing, 1), ctx), kind: "missing", unit: u });
        else if (u.truth === "false") out.push({ text: U.fill(DOC.falseKind[u.kind] ? freshPick(mem, day, "doc:falseK:" + u.kind, DOC.falseKind[u.kind], 1) : u.kind === "trap" ? freshPick(mem, day, "doc:falseT", DOC.falseTrap, 1) : freshPick(mem, day, "doc:false", DOC.false, 1), ctx), kind: "false", unit: u });
        else {
          const key = u.kind === "hold" ? (u.climax ? "holdC" : "hold") : u.kind;
          const arr = DOC.honest[key] || DOC.honest.arouse;
          out.push({ text: U.fill(freshPick(mem, day, "doc:" + key, arr, 1), ctx), kind: "honest", unit: u });
        }
      }
    }
    if (rec.outcome === "defeat" && rec.night && rec.night.length) {
      const mons = [...new Set(rec.night.map(b => b.monName).filter(Boolean))];
      const mode = rec.nightTruth || "honest";
      out.push({ text: U.fill(DOC.night[mode], { mons: mons.join("と"), mon1: mons[0] || "何か" }), kind: mode === "denial" ? "false" : mode === "partial" ? "missing" : "honest", night: true });
    }
    return out;
  }

  /* ================================================================ 監視記録（事実の一覧。監査で見比べる） */
  function monitorLog(rec) {
    const out = [];
    for (const e of rec.events) {
      const who = e.monName || e.trapName || "";
      const gap = e.hidden ? "　※本人の記憶に残らない" : "";
      if (e.kind === "hold") out.push(`${e.floor}階 ${e.t}秒：${who}が拘束（${durText(e.dur)}）${gap}`);
      else if (e.kind === "climax") out.push(`${e.floor}階 ${e.t}秒：絶頂${who ? "（" + who + "）" : ""}`);
      else if (e.kind === "trap") out.push(`${e.floor}階 ${e.t}秒：罠「${who}」作動${gap}`);
      else if (e.kind === "untransform") out.push(`${e.floor}階 ${e.t}秒：変身解除`);
      else if (e.kind === "trance" && e.hidden) out.push(`${e.floor}階 ${e.t}秒：${who}の惑い（本人の記憶に残らない深さ）`);
      else if (e.kind === "defeat") out.push(`${e.floor}階 ${e.t}秒：行動不能`);
      else if (e.kind === "possess") out.push(`${e.floor}階 ${e.t}秒：${who}が腕に憑依（${durText(e.dur)}）`);
      else if (e.kind === "sigil") out.push(`${e.floor}階 ${e.t}秒：淫紋の刻印 Lv${e.lv}（${who}）`);
      else if (e.kind === "filmed") out.push(`${e.floor}階 ${e.t}秒：${who}が絶頂の姿を記録`);
      else if (e.kind === "surge") out.push(`${e.floor}階 ${e.t}秒：${who}の照射が命中`);
      else if (e.kind === "drawn") out.push(`${e.floor}階 ${e.t}秒：${who}の方へ引き寄せられる`);
      else if (e.kind === "charm") out.push(`${e.floor}階 ${e.t}秒：${who}への魅了 ${["", "Ⅰ", "Ⅱ", "Ⅲ"][e.lv] || ""}`);
      else if (e.kind === "attach") out.push(`${e.floor}階 ${e.t}秒：付着体「${e.attName}」${e.blind ? "（本人は装備と認識）" : ""}`);
      else if (e.kind === "release") out.push(`${e.floor}階 ${e.t}秒：溜められた絶頂の一斉解放（${e.n}回）`);
      else if (e.kind === "beg") out.push(`${e.floor}階 ${e.t}秒：${who}に懇願`);
      else if (e.kind === "edge") out.push(`${e.floor}階 ${e.t}秒：寸前で止められる${who ? "（" + who + "）" : ""}`);
      else if (e.kind === "sniff") out.push(`${e.floor}階 ${e.t}秒：${who}の臭いを嗅ぐ`);
      else if (e.kind === "salute") out.push(`${e.floor}階 ${e.t}秒：${who}に『敬礼』`);
      else if (e.kind === "fit") out.push(`${e.floor}階 ${e.t}秒：暗示の発作`);
      else if (e.kind === "rescue") out.push(`${e.floor}階 ${e.t}秒：洗脳、限界に到達。相棒の光で回復`);
      else if (e.kind === "convert") out.push(`${e.floor}階 ${e.t}秒：戦闘員化（ワルドー）`);
      else if (e.kind === "freeze") out.push(`${e.floor}階 ${e.t}秒：時間停止（${who}）`);
      else if (e.kind === "vow") out.push(`${e.floor}階 ${e.t}秒：誓約（この階での絶頂禁止）`);
      else if (e.kind === "deny") out.push(`${e.floor}階 ${e.t}秒：${who}による絶頂禁止`);
      else if (e.kind === "addict") out.push(`${e.floor}階 ${e.t}秒：${who}の粉への中毒`);
    }
    if (rec.night && rec.night.length) {
      rec.night.forEach((b, i) => out.push(`夜 ${i + 1}：${b.monName || "何か"}${b.climax ? "・絶頂" : ""}`));
    }
    return out;
  }

  /* ================================================================ 再報告（嘘を暴かれた後） */
  const REREPORT = {
    why: ["……恥ずかしかったんです。記録に残るのが。ずっと、残るのが", "魔法少女が、こんなことで……って、思われたくなくて", "……嘘ついたの、ごめんなさい。でも、言えなかった"],
    fix: ["訂正します。{floor}階で、{what}", "……本当のことを書きます。{floor}階、{what}"],
    lewdAsk: ["詳しい確認が必要だと、監査官はひかりを奥の部屋へ呼んだ。", "記録との照合と称して、監査官はひかりに、その時と同じ姿勢を取らせた。"],
    lewdLine: ["「……っ、ここまで、する必要……あるん、ですか……」", "「確認、だけ……ですよね……？」"],
  };
  function rereport(rec, caught, save) {
    const mem = save.reportMem, day = rec.day;
    const lines = [{ who: "h", text: freshPick(mem, day, "re:why", REREPORT.why, 3) }];
    for (const d of caught) {
      if (d.night) { lines.push({ who: "h", text: "……夜のことも、本当は、覚えてます。" }); continue; }
      const u = d.unit;
      lines.push({ who: "h", text: U.fill(freshPick(mem, day, "re:fix", REREPORT.fix, 1), { floor: u.floor, what: what(u, day, mem) }) });
    }
    return lines;
  }

  G.Report = { build, documentLines, monitorLog, rereport, units, REREPORT, POSTURE, STYLE };
})();
if (typeof module !== "undefined") module.exports = G;
