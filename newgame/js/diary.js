/* diary.js — ひかりの手帳。本人が夜に書く、私的な日記と、魔物のメモ。
 *
 * 監査官がこっそり覗く、という体裁。報告（口頭・書面）では隠したことも、ここには本当のことを書いてしまう。
 * 日記は一日の終わり（処置のあと）に一ページ書かれる。魔物メモは、知っている度合い・された事・期待で中身が変わる。
 */
var G = (typeof G !== "undefined") ? G : {};
(function () {
  "use strict";
  const U = G.U;
  // 最近書いた言い回しは避ける（手帳をめくった時に、同じ文ばかりにならないように）
  let MEM = {};
  function pick(a) {
    const key = a[0] + a.length, used = MEM[key] || [];
    const pool = a.filter(x => !used.includes(x)), s = U.pick(pool.length ? pool : a);
    used.push(s); if (used.length > Math.max(1, Math.floor(a.length * 0.7))) used.shift(); MEM[key] = used;
    return s;
  }
  const PART = { "胸": "胸", "胸の先": "胸の先", "脚の間": "脚の間", "秘所": "……あそこ", "突起": "一番敏感なところ", "お尻": "お尻", "内腿": "内腿", "太腿": "太腿", "首筋": "首筋",
    "耳": "耳", "脇": "脇", "脇腹": "脇腹", "肌": "肌じゅう", "全身": "全部", "胸と秘所": "胸とあそこ", "生えたもの": "生えたの", "先端": "先っぽ", "脚の付け根": "脚の付け根", "胸の横": "胸の横", "足の裏": "足の裏" };

  /* ---------------------------------------------------------------- 日記 */
  const D = {
    open: {
      cleared: ["今日は最後まで行けた。ちょっとだけ、自慢。", "踏破！ 転移陣の光、きれいだった。", "最下層まで。足が棒みたい。でも、行けた。", "依頼、達成。……帰り道のパン屋さん、閉まってた。"],
      retreat: ["今日は途中で引き返した。判断は、間違ってなかったと思う。", "撤退。悔しいけど、ちゃんと帰ってこられた。", "途中まで。……今日は、ここまでで精一杯だった。"],
      ordered: ["監査官さんの合図で戻った。助かった、のかな。", "帰還の勧告。……正直、ほっとした。"],
      defeat: ["……書くの、やめようかと思った。", "負けた。朝になって、救出の人に起こされた。", "今日のことは、書きたくない。でも、書く。書かないと、眠れない。",
               "また、負けた。救出の人の顔、まともに見られなかった。", "医務室のベッドで書いてる。……字が震えてる。", "ルミナ、敗北。……こんな見出し、つけたくなかった。"],
    },
    hold: ["{mon}に捕まった。", "{mon}に、捕まっちゃった。", "{floor}階で、{mon}に掴まれた。", "{mon}。……油断した。", "{floor}階。{mon}に、つかまった。"],
    holdParts: ["{parts}を、……触られた。", "{parts}を、何回も。", "{parts}。……思い出すと、顔が熱い。", "{parts}を。……しつこく。", "{parts}ばっかり、狙われた。"],
    holdStage2: ["服の中まで、だった。……直接、だった。", "最後は、服の上からじゃ、なかった。", "中まで、……入ってきた。"],
    holdSwarm: ["{n}体に、いっぺんに。どこを触られてるのか、途中から分からなかった。", "囲まれて、{n}体に。……逃げ場、なかった。"],
    holdClimax: ["……いっちゃった。{n}回。", "{p}、……頭が真っ白になった。", "捕まってる間に、{n}回。……数えてる自分が、いや。"],
    trap: ["{trap}に引っかかった。", "{trap}。……見抜けなかった。"],
    lie: ["報告では『何もなかった』って言った。……嘘。本当は、{what}", "監査官さんには言えなかった。{what}", "報告書には書かなかった。……{what}", "『問題なし』って書いた。……問題、しかなかった。{what}", "書類には、書けないことばっかり。{what}"],
    lieMore: ["ほかにも、隠したことがある。……{n}つ。", "隠したのは、それだけじゃない。", "……数えたら、{n}つも嘘をついてた。"],
    lieCaught: ["……全部、ばれてた。記録の水晶って、ずるい。", "嘘、見抜かれた。……恥ずかしくて死にそう。", "問いただされた。……言わされた。全部。"],
    lieSafe: ["ばれなかった。……ばれなかったのに、なんでこんなに、胸が痛いんだろう。", "隠し通せた。……よかった、はずなのに。", "たぶん、ばれてない。……たぶん。", "監査官さん、気づいてないみたいだった。……ごめんなさい。", "嘘が上手くなっていく。……それが、一番こわい。"],
    writtenLie: ["口では言えたのに、報告書には書けなかった。ずっと残るって思ったら、手が止まった。"],
    confess: ["追及されて、本当のことを言っちゃった。……言ったら、少しだけ楽になった。"],
    probed: ["『具体的に言え』って。……言わされた。どこを、どうされたか。監査官さんの前で。", "詳しく聞かれた。……答えてる間、ずっと、身体が熱かった。"],
    anticipate: ["{mon}を見ただけで、身体が熱くなった。……あたし、おかしいのかな。", "{mon}の姿を見た瞬間、お腹の奥がきゅってした。……前のこと、身体が覚えてる。", "また{mon}。……会いたくなかった。……本当に？"],
    night: ["倒れてから朝まで、{mons}に……。何回いったか、途中から数えてない。", "夜のことは、書かない。……{mons}。それだけ。", "一晩じゅう。{mons}が、代わる代わる。……朝の光が、あんなに嬉しかったことはない。"],
    inspire: ["戦ってる最中に『{skill}』を思いついた！ 明日から使う。", "閃いた。『{skill}』。……身体が勝手に動いた感じ。忘れないように、ここに書いとく。"],
    lvup: ["なんとなく、身体が軽い。ルミナ、ちょっとだけ強くなった……かも。"],
    rereportLewd: ["……奥の部屋でのことは、ここにも書けない。", "『確認』。……あれは、確認なんかじゃなかった。……でも、いやじゃ、なかった、かも。消す。"],
    trust: { high: ["監査官さんは、優しい。……たぶん、この街で一番、あたしのことを知ってる人。"], low: ["監査官さんの目が、最近、こわい。"] },
    ail: {
      futaAfter: ["神殿のせいで、まだ……生えてる。お風呂、どうしよう。"],
      futaFixed: ["もう、戻らない。……慣れた、って書いたら、本当に慣れちゃいそうで、書かない。"],
      crack: ["説法の声が、まだ耳の奥で鳴ってる。『ちからを、ぬきなさい』。……ぬかない。"],
      kissMark: ["唇が、まだじんじんする。鏡で見たら、紋が見えた。"],
      permit: ["契約が、まだ生きてる。……許可って、誰にもらえばいいの。"],
      attached: ["服の下の、まだ取れない。……今も、動いてる。これを書いてる間も。"],
      omazuke: ["……溜まったまま。眠れる気がしない。"],
      rewired: ["明日も、ちゃんとワルドー式の挨拶をしよう。礼儀は大事。"],
      charm: ["{to}のこと、なんでこんなに考えちゃうんだろう。"],
      sigil: ["お腹の紋、消えない。触ると、熱い。"],
    },
    close: [
      ["明日も頑張る。ルミナ、ファイト！", "おやすみなさい。明日は、もっと上手くやる。"],
      ["……明日は、大丈夫。たぶん。", "寝る。……夢に、出てこないといいな。"],
      ["……明日、また潜るんだ。……楽しみ、なんて、思ってない。", "身体は嫌がってない。……心だけが、置いていかれてる。"],
      ["……早く、明日にならないかな。", "明日は、どこに行くんだろう。……どんな魔物が、いるんだろう。"],
    ],
  };
  const fill = (s, c) => U.fill(s, c || {});
  function partsText(acts) {
    if (!acts) return "";
    return Object.entries(acts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => PART[k] || k).join("と、");
  }
  // 一日分を書く（処置のあと、翌日の前に呼ぶ）
  function write(s) {
    const rec = s.rec; if (!rec) return null;
    const out = [], tier = G.tier(s.body, s.mind);
    out.push(pick(D.open[rec.outcome] || D.open.retreat));
    const units = (rec.units || []).filter(u => !u.hidden).slice().sort((a, b) => b.shame - a.shame).slice(0, 3);
    for (const u of units) {
      if (u.kind === "hold") {
        let t = fill(pick(D.hold), { mon: u.monName, floor: u.floor });
        if (u.acts) t += fill(pick(D.holdParts), { parts: partsText(u.acts) });
        if (u.stage >= 2) t += pick(D.holdStage2);
        if (u.swarm >= 3) t += fill(pick(D.holdSwarm), { n: u.swarm });
        if (u.climax) t += fill(pick(D.holdClimax), { n: u.climax, p: ((u.climaxActs || [])[0] || "触られて").replace(/ /g, "") });
        out.push(t);
      } else if (u.kind === "trap") out.push(fill(pick(D.trap), { trap: u.trapName }));
      else if (u.kind === "anticipate") out.push(fill(pick(D.anticipate), { mon: u.monName }));
      if (u.confessed) out.push(pick(D.confess));
    }
    // 嘘：一番重いものを一つだけ、中身ごと。残りは数だけ
    const lies = (rec.units || []).filter(u => !u.hidden && (u.truth === "false" || u.docTruth === "false")).sort((a, b) => b.shame - a.shame);
    if (lies.length) {
      const u = lies[0];
      const whatTxt = u.acts ? partsText(u.acts) + "を、触られた。" : u.kind === "trap" ? u.trapName + "に、掛かった。" : u.climax ? "……達しちゃった。" : (u.monName ? u.monName + "に、……された。" : "……本当は、あった。");
      out.push(fill(pick(D.lie), { what: whatTxt }));
      if (lies.length > 1) out.push(fill(pick(D.lieMore), { n: lies.length }));
      if (lies.some(x => x.writtenLie)) out.push(pick(D.writtenLie));
      const caught = rec.audit && rec.audit.caught.length;
      out.push(pick(caught ? D.lieCaught : D.lieSafe));
    }
    if ((rec.probes || 0) > 0 && U.chance(0.7)) out.push(pick(D.probed));
    if (rec.outcome === "defeat" && rec.night && rec.night.length) {
      const mons = [...new Set(rec.night.map(b => b.monName).filter(Boolean))].join("と") || "何か";
      const cl = rec.night.reduce((a, b) => a + (b.climaxN || (b.climax ? 1 : 0)), 0), acts = rec.night.reduce((a, b) => a + (b.acts || 0), 0);
      out.push(fill(pick(D.night), { mons }) + (cl ? fill(pick(["……{c}回。数えなきゃよかった。", "{c}回、いかされた。{a}回、触られた。……記録係の人が、そう言ってた。", "朝までに、{c}回。"]), { c: cl, a: acts }) : ""));
    }
    const gr = rec.growth;
    if (gr && gr.inspired && gr.inspired.length) out.push(fill(pick(D.inspire), { skill: gr.inspired.map(id => G.SKILLS[id].name).join("』と『") }));
    if (gr && gr.lv > gr.lv0) out.push(pick(D.lvup));
    if (rec.lewdCheck) out.push(pick(D.rereportLewd));
    const ails = s.ailments.map(a => a.id).filter(id => D.ail[id]);
    if (ails.length) {
      const id = U.pick(ails), charmTo = Object.keys((s.ailments.find(a => a.id === "charm") || {}).to || {}).map(k => G.MONSTERS[k] ? G.MONSTERS[k].name : k)[0] || "";
      out.push(fill(pick(D.ail[id]), { to: charmTo }));
    }
    if (s.trust >= 75 && U.chance(0.4)) out.push(pick(D.trust.high)); else if (s.trust < 30 && U.chance(0.5)) out.push(pick(D.trust.low));
    out.push(pick(D.close[tier]));
    const page = { day: rec.day, weather: U.pick(["晴れ", "くもり", "雨", "晴れのち雨", "風が強い", "霧", "小雨"]), lines: out };
    s.diary = s.diary || []; s.diary.push(page); if (s.diary.length > 60) s.diary.shift();
    return page;
  }

  /* ---------------------------------------------------------------- 魔物メモ */
  // 代表的な種は、本人の言葉で（三段：見た／知っている／よく知っている）
  const OWN = {
    goblin: ["緑の小鬼。一匹なら蹴っ飛ばせる。", "群れで来る。一匹が掴んだら、仲間が寄ってくる。囲まれる前に数を減らすこと。", "臭い。……あの臭い、嫌いなのに、覚えちゃった。"],
    slime: ["ぷるぷる。かわいい……って油断しちゃだめ。", "包みこまれると、服が溶ける。足元に注意。", "中に入ってくる。……それだけは、絶対に、だめ。"],
    roper: ["触手の塊。顔はない。", "触手が届くのは、二歩くらい先まで。それより離れて撃つ。", "吸盤が、……胸に。思い出したくない。"],
    tentacle_lord: ["大きい。触手の、主。", "一本に捕まると、次々来る。最初の一本を避けること。", "持ち上げられて、……順番に、全部。"],
    imp: ["小さな淫魔。すぐ笑う。", "呼び声に引っぱられる。耳をふさぐ！", "『ざぁこ♡』って。……言われると、なんか、変な気持ちになる。"],
    inma: ["指を一本立てる淫魔。『まだ、だめ』。", "栓をされると、達せない。溜まった分は、あとで一度に来る。", "あの指が、……忘れられない。"],
    muma_queen: ["女王様。格が違う。", "寸前で三回止められると、……ねだっちゃう。四回目は、ない。", "……女王様の声、夢に出てくる。"],
    waldo_grunt: ["ワルドーの戦闘員。全身タイツ。", "数で押さえ込んでくる。雄の臭いに、足が止まらないように。", "……番号で呼ばれた。名前じゃなくて。"],
    waldo_officer: ["ワルドーの幹部。扇から催眠の光。", "光の扇は、構えたら横へ。正面にいないこと。", "『抗うほど良い戦闘員になる』。……ならない。"],
    drone_tickle: ["羽根ブラシのドローン。『痛いことはしない』。", "捕まったら、笑いで力が抜ける。近づかせない。", "笑ってたはずなのに、途中から、別の声になった。"],
    kyouso: ["教団の教祖。見るだけで、何もしない。", "目を合わせない。写真の間にも注意。", "……祈っちゃった。自分から。"],
    kuchizuke: ["赤い唇の淫魔。", "二度口づけされると、印が残る。一度目で振りほどくこと。", "唇が、まだ覚えてる。"],
    nikubana: ["道端の大きな花。甘い息。", "寄っていかなければ、襲ってこない。息を吸わないこと。", "花の拍子で、揺すられた。……ゆっくりなのが、一番だめ。"],
    kuwaemushi: ["口しかない蟲。", "咥えられたら、剥がすのは無理。近寄らせない。", "……吸われて、出しちゃった。蟲に。"],
  };
  // それ以外は、攻撃の仕方と種類から
  const GEN = {
    first: { "絡": ["縛ってくる相手。", "捕まえに来る相手。"], "蕩": ["熱くしてくる相手。", "身体を火照らせる相手。"], "惑": ["頭をぼんやりさせる相手。", "心に入ってくる相手。"], "削": ["魔力を吸う相手。", "変身の力を削る相手。"] },
    tip: {
      grab: ["掴んでくる。届くのは{r}歩くらい。それより離れて撃つ。", "腕が届く距離は{r}歩。そこに入らないこと。"],
      shot: ["遠くから撃ってくる。構えたら、横へ。", "狙ってくる線から外れること。"],
      aura: ["近くにいるだけで効く。近寄らない。", "そばにいる時間を短く。"],
      drain: ["魔力を吸われる。長く一緒にいないこと。"],
      lure: ["呼び声。耳をふさぐ。"], deny: ["栓をしてくる。溜まったら、あとで来る。"], omazuke: ["寸止めされる。三回まで。"], possess: ["袖から入ってくる。袖を締める。"],
      attach: ["貼りついてくる。光で弾けることもある。"], count: ["数えてくる。声を出さない。"],
    },
    weak: ["体力はそれほどない。光弾{n}発くらい。", "{n}発で落とせる。"],
    lewd: [
      "……変なところを、触られた。気をつけること。",
      "……{parts}を。……ここには、書きたくない。",
      "……次に会ったら、たぶん、また。……だめ。気をつけること。",
    ],
  };
  const STAGE = ["見たことがある", "知っている", "よく知っている"];
  function monsterNotes(s) {
    const out = [];
    for (const [kind, d] of Object.entries(G.MONSTERS)) {
      const k = (s.know || {})[kind] || 0; if (!k) continue;
      const lv = k >= 14 ? 2 : k >= 5 ? 1 : 0, ex = Math.min(1, ((s.lewd || {})[kind] || 0) / 30);
      const own = OWN[kind], lines = [];
      if (own) { for (let i = 0; i <= lv; i++) lines.push(own[i]); }
      else {
        lines.push(pick(GEN.first[d.type] || GEN.first["絡"]) + (d.desc ? "（" + d.desc + "）" : ""));
        if (lv >= 1) lines.push(fill(pick(GEN.tip[d.atk.kind] || GEN.tip.aura), { r: Math.round(((d.atk.range || 1) + 0.3) * 2) / 2 }));
        if (lv >= 2) lines.push(fill(pick(GEN.weak), { n: Math.max(1, Math.ceil(d.hp / 9)) }));
      }
      const parts = partsText(((s.parts || {})[kind]) || null);
      if (ex > 0.1) lines.push(fill(GEN.lewd[ex > 0.6 ? 2 : ex > 0.3 || parts ? 1 : 0], { parts: parts || "いろんなところ" }));
      out.push({ kind, name: d.name, art: d.art, tint: d.tint, type: d.type, stage: STAGE[lv], lines, ex });
    }
    return out;
  }

  G.Diary = { write, monsterNotes };
})();
if (typeof module !== "undefined") module.exports = G;
