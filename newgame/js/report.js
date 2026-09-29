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
  };
  // 監査官が読み上げるときの言い方
  const WHAT_A = {
    hold: "{mon}による拘束、{dur}", trap: "罠「{trap}」の作動", arouse: "{mon}による催淫", trance: "{mon}による惑い",
    drain: "{mon}による魔力の吸収", untransform: "変身の解除",
  };
  const CLIMAX = { 1: ["……最後、力が抜けちゃって", "……一回、頭が真っ白になりました", "……それで、その、達しちゃいました", "……一回だけ、堪えきれなくて"],
                   n: ["……{n}回、頭が真っ白になりました", "……数えてたのは{n}回まで、です", "……{n}回。途中から、堪えるふりだけしてました", "……{n}回です。……数え間違いじゃ、ないです"] };
  const DOWNPLAY = ["{mon}にちょっと掴まれたけど、すぐ振りほどきました", "{mon}とすれ違いざまに、軽く触られたくらいです", "{mon}？ ……ああ、何もなかったです。避けました",
                    "{mon}に一瞬捕まったけど、ほんとに一瞬で", "{mon}はいましたけど、遠くから撃って終わりです"];
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
    aroused: ["（頬が上気している。座り方が、落ち着かない）", "（呼吸が、少し浅い。本人は気づいていないようだ）"],
    civilian: ["（変身は解けたままだ。私服の袖を、何度も引っ張っている）"],
    tired: ["（声に張りがない。消耗が色濃い）", "（椅子に沈むように座っている）"],
    night: ["（救出から半日。まだ目の焦点が、ときどき合わない）", "（毛布を肩に掛けたまま、報告の席に着いた）"],
    fine: ["（背筋は伸びている。問いが核心へ寄るたび、指先がスカートの裾を握る）", "（いつもの明るさで入ってきたが、目だけが笑っていない）",
           "（報告書を胸の前に抱えている。書き直した跡が多い）", "（椅子に浅く腰掛け、足先を小さく揺らしている）"],
  };

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
        out.push({ kind: "hold", floor: e.floor, t: e.t, mon: e.mon, monName: e.monName, type: e.type, sev: e.sev || 2, dur: e.dur || 3, climax: cl, hidden: false });
      } else if (e.kind === "trap" && (e.sev || 0) >= 1) {
        const same = out.find(u => u.kind === "trap" && u.trap === e.trap && u.floor === e.floor);
        if (same) { same.n = (same.n || 1) + 1; continue; }
        out.push({ kind: "trap", floor: e.floor, t: e.t, trap: e.trap, trapName: e.trapName, type: e.type, sev: e.sev, dur: 0, climax: 0 });
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
    const arr = WHAT[key] || WHAT.arouse;
    let s = U.fill(freshPick(mem, day, "what:" + key, arr, 2), { mon: u.monName, trap: u.trapName, floor: u.floor });
    if (u.climax) s += "。" + U.fill(freshPick(mem, day, "cl" + (u.climax > 1 ? "n" : "1"), u.climax > 1 ? CLIMAX.n : CLIMAX[1], 2), { n: u.climax });
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

    push("a", freshPick(mem, day, "aud:open", AUD.open, 3));
    // 書き出し：姿勢の一言＋結果
    let open = U.fill(freshPick(mem, day, "open:" + rec.outcome, OPEN[rec.outcome] || OPEN.retreat, 4), ctxBase);
    const pre = freshPick(mem, day, "openP:" + posture, OPEN_BY_POSTURE[posture], 2);
    if (posture === "silent" && U.chance(0.7)) { push("h", pre); push("a", freshPick(mem, day, "aud:silent", AUD.silentPush, 3)); push("h", open); }
    else push("h", pre + (pre.endsWith("。") || pre.endsWith("…") ? "" : " ") + open);

    // 一件ずつ
    const lies = {};
    for (const u of rec.units) u.truth = decideLie(u, s, rec);
    const ord = order(rec.units.filter(u => u.truth !== "missing"), posture);
    const used = {};
    let stamLeft = posture === "crack" ? 2 : (rec.h.arousal > 55 ? 1 : 0);
    ord.list.forEach((u, i) => {
      if (i > 0 && U.chance(0.45)) push("a", freshPick(mem, day, "aud:between", AUD.between, 1));
      const ctx = { floor: u.floor, mon: u.monName || u.trapName || "", dur: durText(u.dur), n: u.climax || u.n || 1 };
      if (u.truth === "false") {
        // 嘘：軽く言う
        const t = U.fill(u.kind === "trap" ? freshPick(mem, day, "downT", DOWNPLAY_TRAP, 2) : freshPick(mem, day, "down", DOWNPLAY, 2), Object.assign({ trap: u.trapName }, ctx));
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
        tail: u.kind === "hold" ? (u.climax ? "" : durText(u.dur) + "くらいで抜けました。") : (u.kind === "untransform" && u.n > 1 ? `……${u.n}回、です。` : ""),
      });
      let htext = tpl.h ? U.fill(tpl.h, fillc) : null;
      if (htext && stamLeft > 0 && u.shame >= 2) { htext = stammer(htext); stamLeft--; }
      if (tpl.a && !tpl.h2) { push("a", U.fill(tpl.a, fillc)); push("h", htext, { unit: u }); }
      else {
        if (htext) push("h", htext, { unit: u });
        if (tpl.a) push("a", U.fill(tpl.a, fillc));
        if (tpl.h2) push("h", U.fill(tpl.h2, fillc), { unit: u });
      }
    });
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
        else if (u.truth === "false") out.push({ text: U.fill(u.kind === "trap" ? freshPick(mem, day, "doc:falseT", DOC.falseTrap, 1) : freshPick(mem, day, "doc:false", DOC.false, 1), ctx), kind: "false", unit: u });
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
      if (e.kind === "hold") out.push(`${e.floor}階 ${e.t}秒：${who}が拘束（${durText(e.dur)}）`);
      else if (e.kind === "climax") out.push(`${e.floor}階 ${e.t}秒：絶頂${who ? "（" + who + "）" : ""}`);
      else if (e.kind === "trap") out.push(`${e.floor}階 ${e.t}秒：罠「${who}」作動`);
      else if (e.kind === "untransform") out.push(`${e.floor}階 ${e.t}秒：変身解除`);
      else if (e.kind === "trance" && e.hidden) out.push(`${e.floor}階 ${e.t}秒：${who}の惑い（本人の記憶に残らない深さ）`);
      else if (e.kind === "defeat") out.push(`${e.floor}階 ${e.t}秒：行動不能`);
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
