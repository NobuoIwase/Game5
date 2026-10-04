/* game.js — 1日の流れと、日をまたいで残るもの（セーブ）。DOM に触れない
 *
 * 朝（ギルド）→ 依頼を割り当てる（すり替え・書き換え）→ ひかりの準備 → 潜行10階
 *   → 敗北なら観測フェーズ（一晩）→ 救出 → 口頭報告 → 書類監査（→ 再報告）→ 処置 → 翌日
 */
var G = (typeof G !== "undefined") ? G : {};
(function () {
  "use strict";
  const U = G.U;

  const AILMENTS = {
    heat:    { name: "発情",     note: "熱が引かない。次の潜行は熱を抱えたまま始まる", fee: 10 },
    haze:    { name: "催眠残滓", note: "思い出せない時間がある。惑に掛かりやすい",     fee: 12 },
    soiled:  { name: "汚濁",     note: "粘液の匂いが抜けない",                         fee: 6 },
    hollow:  { name: "魔力枯渇", note: "変身の光が弱い。次の潜行は魔力が少ない",       fee: 10 },
    sigil:   { name: "淫紋",     note: "下腹に紋が薄く残っている。次の潜行は熱が入りやすい", fee: 14 },
    // ---- Game2・Game4 の状態異常 ----
    sensitive:  { name: "過敏",       note: "肌が触れるだけで反応する。服の擦れにも耐えている。次の潜行は敏感化2から", fee: 8 },
    throb:      { name: "疼き",       note: "痒みと熱が抜けない。次の潜行の始めは、ずっと疼いている", fee: 8, ongoing: true },
    omazuke:    { name: "おあずけ",   note: "許しの出ないまま溜まった熱が残っている。次の潜行の1階を出るまで達せない。そのあと全部来る", fee: 16, ongoing: true },
    charm:      { name: "魅了",       note: "特定の相手に見惚れた感覚が抜けない。その相手を撃てず、目で追ってしまう", fee: 12 },
    attached:   { name: "付着体",     note: "身体に貼りついたものが外れていない。報告のあいだも動いている", fee: 14, ongoing: true },
    exposure:   { name: "装束損壊",   note: "装束が用を成していない。次の潜行は替えの衣装から（見られやすい）", fee: 5 },
    paralysis:  { name: "麻痺",       note: "痺れが残り、得物を握る手に力が入らない", fee: 6 },
    exhaustion: { name: "疲弊",       note: "極度の消耗。声に張りがない。気力が戻りきらない", fee: 6 },
    mindTaint:  { name: "思考汚染",   note: "淫らな想念が湧き、暗示が通りやすい（惑に弱い）", fee: 10 },
    addict:     { name: "中毒",       note: "咳き茸の粉が忘れられない。茸を見ると、自分から寄っていく", fee: 12 },
    hairTrigger:{ name: "暗示の引き金", note: "解けた暗示の底に鉤が残っている。前触れなく無様な発作が出る（深層処置）", fee: 30, kink: true },
    rewired:    { name: "常識改変",   note: "ワルドーの『敬礼』を正式な挨拶だと信じ込んでいる。本人は疑わない（深層処置）", fee: 30, kink: true },
    // ---- 蟲・変生・教団・淫魔 ----
    swell:      { name: "肥大化",     note: "ヒルに吸われた乳首とクリトリスが、ぷっくり肥大したまま戻らない。下着や布が擦れるたびに声が出る", fee: 10, ongoing: true },
    futaAfter:  { name: "変生の名残", note: "神殿で生えたものが、まだ引っ込まない。次の潜行も生えたまま始まる", fee: 12, ongoing: true },
    futaFixed:  { name: "変生の定着", note: "射精を数え取られ、身体が『そういう形』で覚えてしまった。どこへ潜っても生える（深層処置）", fee: 30, kink: true },
    crack:      { name: "心のヒビ",   note: "教団の説法で心の防護壁に入ったヒビ。惑が隙間から入り込む。一度の処置で三つ分しか塞がらない", fee: 14, kink: true },
    impCurse:   { name: "淫魔の呪い", note: "淫魔に気に入られた印。起きた時からもう熱い。次の潜行は熱を抱えて始まる", fee: 12, ongoing: true },
    kissMark:   { name: "口づけの印", note: "唇に淫魔の印が残っている。口づけ一つで、相手を好きになってしまう", fee: 14 },
    permit:     { name: "絶頂許可制", note: "淫魔と結んだ契約が生きている。許しをもらうまで達せない。三度ねだると許される", fee: 18, ongoing: true },
    defeatBrand:{ name: "敗北洗脳",   note: "『この相手には勝てない』と刷り込まれた。その種に本気を出せない（深層処置）", fee: 30, kink: true },
  };
  for (const k in AILMENTS) AILMENTS[k].fee = Math.max(3, Math.round(AILMENTS[k].fee * 0.7));   // 処置は安め
  // 自分で何とかできる・時間で薄れるもの（一晩で引く）。それ以外は、放っておくと日ごとに重くなる
  const NATURAL = ["heat", "exposure", "soiled", "paralysis", "throb", "exhaustion"];
  // 状態異常の名前と説明：遙の番は、ひかりに寄った分だけ js/haruka/field.js の AIL で差し替える（効き目は同じ）
  const ail = id => (G.Hero.is("haruka") && G.TextH.AIL && G.TextH.AIL[id] ? Object.assign({}, AILMENTS[id], G.TextH.AIL[id]) : AILMENTS[id]);
  // 状態異常の表示名（魅了は向き先つき）
  function ailmentName(a) {
    const A = ail(a.id); if (!A) return a.id;
    if (a.id === "charm" && a.to) return A.name + "（" + Object.keys(a.to).map(k => G.MONSTERS[k].name + ["", "Ⅰ", "Ⅱ", "Ⅲ"][a.to[k]]).join("・") + "）";
    if (a.id === "attached" && a.list) return A.name + "（" + a.list.join("・") + "）";
    if (a.id === "defeatBrand" && a.to) return A.name + "（" + G.MONSTERS[a.to].name + "）";
    if (a.id === "crack" && a.n) return A.name + "（" + a.n + "）";
    if (a.id === "swell" && a.n) return A.name + "（" + a.n + "）" + (a.age ? `・${a.age}日放置` : "");
    return A.name + (a.age ? `（${a.age}日放置）` : "");
  }

  const SHOP = {
    freeSlot: { name: "デッキの自由枠 +1",   costs: [6, 12, 18], note: "ダンジョンごとのデッキに、好きな魔物・罠を1つ多く入れられる" },
    live:     { name: "同時に出せる数 +1",   costs: [8, 16],     note: "呼び出した魔物を、同時にもう1体多く出していられる" },
    budget:   { name: "階ごとのコスト +2",   costs: [5, 10, 15], note: "1つの階で使えるコストの上限が上がる" },
    swapDest: { name: "行き先のすり替え",     costs: [4],         note: "依頼書はそのままに、実際の行き先だけを別のダンジョンへ差し替えられる" },
  };

  /* ---- 持ち込み品（市場で買う。潜行中にひかりが自分の判断で使う） ---- */
  const ITEMS = {
    star:     { name: "星の雫",       price: 6, note: "魔力を戻し、変身し直せる" },
    salve:    { name: "治癒の軟膏",   price: 3, note: "体力を戻す" },
    smelling: { name: "気付け薬",     price: 3, note: "気力を戻し、惑いを払う" },
    ether:    { name: "魔力の水薬",   price: 4, note: "MP を戻す" },
    cool:     { name: "熱冷まし",     price: 4, note: "火照りを鎮める" },
    knife:    { name: "縄抜けの小刀", price: 5, note: "捕まった時、拘束を切って抜けやすくする" },
  };

  /* ---- 依頼書の中身：主な魔物・規模・脅威度・長の有無。これを書き換えて渡す ---- */
  const SCALE = { 1: "小さな群れ", 2: "群れ", 3: "大群" };
  const LEVEL = { 1: "弱い", 2: "", 3: "手練れの" };
  const LEVEL_NAME = { 1: "低い", 2: "並", 3: "高い" };
  const SCALE_NAME = { 1: "小規模", 2: "中規模", 3: "大規模" };
  const FLOORS_BY_SCALE = { 1: 6, 2: 8, 3: 10 };      // 規模＝深さ
  const VERB = ["討伐", "駆除", "調査", "掃討"];
  function requestTitle(c) {
    const mon = G.MONSTERS[c.main].name;
    // 例：「弱いスライムの小さな群れの駆除」「ゴブリンの長が率いる、手練れの大群の討伐」
    if (c.boss) return `${mon}の長が率いる、${LEVEL[c.level]}${SCALE[c.scale]}の${c.verb}`;
    return `${LEVEL[c.level]}${mon}の${SCALE[c.scale]}の${c.verb}`;
  }
  // 種族特化のダンジョンの名前（たまに出る。その種が七割を占める）
  const DEN_NAME = {
    goblin: "ゴブリンの巣穴", slime: "スライムの溜まり場", roper: "ローパーの園", hanging_vine: "垂れ蔦の回廊", puppet_hand: "傀儡手の工房",
    gulper_worm: "ワームの坑道", mimic: "ミミックの宝物庫", mind_roper: "囁きの底", gazer: "凝視の塔", moth: "灯蛾の塔", imp: "小淫魔の館",
    peeper: "覗き子の書庫", mirror_slime: "鏡粘体の間", slug: "大湿殻の沼", jellyfish: "水母の地底湖", lure_cap: "茸の洞", fluff: "綿毛の野",
    inma: "寸止めの館", muma_queen: "夢魔の宮", futago: "双子の小部屋", waldo_grunt: "ワルドーの詰所", waldo_officer: "ワルドーの司令室", drone_capture: "ドローン工廠",
    drone_tickle: "ドローン工廠", drone_camera: "記録室", karte: "開発棟", shibire: "胞子の野", sekitake: "咳き茸の洞", suiyou: "水妖の沼", kabeguchi: "肉の回廊",
    inyoku: "淫翼の巣", hoshibami: "星喰みの磯", tentacle_lord: "触手の主の坑",
    tsurimushi: "吊り蟲の縦穴", zuidou: "隧道蟲の巣", hibiki: "響き蟲の洞", doromushi: "泥蟲の沼", gitai: "擬態蟲の回廊", haimushi: "這い蟲の床", hiru: "ヒルの淵",
    kuwaemushi: "咥え蟲の祠", sayagoke: "鞘苔の岩室", tenohira: "掌の間", ukegame: "受け壺の蔵", sakiimp: "先舐めの間",
    shinja: "教団の礼拝所", sekkyoushi: "説法の間", chuushutsu: "抽出所", kyouso: "教祖の座",
    jikkyou: "中継の舞台", kusuguri: "くすぐりの間", kazoe: "数え歌の間", azakeri: "嘲りの回廊", kuchizuke: "口づけの寝所",
    nikubana: "肉花の庭", dakitake: "抱き茸の森", kouryuu: "媚香の淀み", tsukite: "憑き手の礼拝堂", shousha: "照射の回廊", banjin: "沈んだ祭殿", medama: "目玉の天窓",
  };
  function placeName(dungeon, species) { return species ? (DEN_NAME[species] || G.MONSTERS[species].name + "の巣") : G.DUNGEONS[dungeon].name; }
  // 依頼書に書ける主な魔物（削は主役にしない）
  const MAINS = Object.keys(G.MONSTERS).filter(k => G.MONSTERS[k].type !== "削" && !G.MONSTERS[k].special);

  /* ================================================================ 新しいゲーム */
  function newSave() {
    const decks = {};
    for (const k in G.DUNGEONS) { const dg = G.DUNGEONS[k]; decks[k] = [dg.free.find(x => G.MONSTERS[x].type === "削" && x !== "drain_roper"), "trap:" + dg.traps[0]]; }
    return {
      v: 2, day: 1, phase: "guild",
      funds: 60, dark: 0, taint: 0, trust: 50, suspicion: 0, body: 0, mind: 0, fatigue: 0,
      ailments: [], upgrades: { freeSlot: 0, live: 0, budget: 0, swapDest: 0 },
      decks, autoDirector: false, speed: 1,
      history: [], reportMem: {}, lastPosture: null, caughtDay: -9, silentAccepted: false,
      requests: null, pick: null, rec: null, log: [],
      traits: {}, counts: {}, waldo: { rescues: 0, converted: 0 }, carry: {}, crack: 0, futaMarks: 0, futaFixed: false,
      lv: 1, xp: 0, skills: {}, equip: [], know: {}, lewd: {},
      heroine: "hikari", captured: {}, archive: {}, vessel: false, sequelae: {}, convN: 0, rep: 60,
    };
  }
  /* ================================================================ ヒロインの交代 */
  // ヒロインごとの記録（堕ち・状態・性癖・成長・手帳・知識）。ギルドの記録（資金・澱晶・日付・依頼の書）は残る
  const PERSONAL = ["body", "mind", "trust", "suspicion", "fatigue", "ailments", "traits", "counts", "waldo", "carry", "crack", "futaMarks", "futaFixed", "lv", "xp", "skills", "equip",
    "know", "lewd", "shards", "parts", "climaxParts", "monLog", "episodes", "reportMem", "lastPosture", "caughtDay", "renamed", "reintCount", "reintHonest", "reintDev", "lastGrowth",
    "diary", "diarySeen", "vessel", "silentAccepted", "sequelae", "convN", "rep"];
  const HEROES = ["hikari", "haruka"];
  const other = id => (id === "hikari" ? "haruka" : "hikari");
  // まだ誰も使っていない、ヒロイン一人分の記録
  function freshPersonal() {
    const f = newSave(), o = {};
    for (const k of PERSONAL) o[k] = f[k] !== undefined ? JSON.parse(JSON.stringify(f[k])) : undefined;
    return o;
  }
  function syncHero(s) { if (s) G.Hero.set(s.heroine || "hikari"); }
  // 今日、潜らせるヒロインを替える：いまの記録をしまい、相手の記録を出す
  function swapHero(s, id) {
    const cur = s.heroine || "hikari";
    if (id === cur || !HEROES.includes(id) || (s.captured || {})[id] || (s.sortied || []).includes(id)) return false;   // 午前に潜った方は、午後にもう一度は出せない      // 捕らわれている方は、潜らせられない
    s.archive = s.archive || {};
    const keep = {}; for (const k of PERSONAL) keep[k] = s[k];
    const next = s.archive[id] || freshPersonal();
    for (const k of PERSONAL) s[k] = next[k];
    s.archive[cur] = keep; delete s.archive[id];
    s.heroine = id; syncHero(s);
    return true;
  }
  // 記録の一項目を、出ている方／しまってある方のどちらからでも
  const pget = (s, id, k) => (id === (s.heroine || "hikari") ? s[k] : ((s.archive || {})[id] || {})[k]);
  const pset = (s, id, k, v) => { if (id === (s.heroine || "hikari")) s[k] = v; else { s.archive[id] = s.archive[id] || freshPersonal(); s.archive[id][k] = v; } };

  /* ================================================================ 後遺症（ワルドーの戦闘員にされた回数で、増えていく） */
  const SEQUELAE = {
    brainEasy: { name: "洗脳されやすい", desc: "一度塗り替えられた頭は、塗り替えの跡を覚えている。洗脳が進みやすい" },
    salute:    { name: "敬礼の癖", desc: "ふとした拍子に、右手が額へ上がる。気づくと、ガニ股で敬礼している" },
    swellPerm: { name: "乳首とクリの肥大（不可逆）", desc: "スーツの感度強化の名残。乳首とクリが、元に戻らない大きさに膨れたまま" },
    repFall:   { name: "評判の失墜", desc: "戦闘員の映像は、街じゅうに流れた。ギルドでの評判は、地の底" },
    pavCx:     { name: "号令で達する", desc: "『イーッ』の掛け声を聞くと、点検の記憶で、身体が勝手に達してしまう" },
    suitAche:  { name: "黒スーツの疼き", desc: "肌が、あの黒い艶の締めつけを恋しがる。ワルドーの気配で、身体が熱くなる" },
    ii:        { name: "戦闘員の口癖", desc: "話の端々に、『イーッ』が混ざる" },
    willWear:  { name: "意志の摩耗", desc: "命令に従う心地よさを、身体が覚えてしまった。気力が戻りきらない" },
    crest:     { name: "ワルドーの紋章", desc: "下腹に、組織の紋章が焼きついている。戦闘員たちは、それを目印に寄ってくる" },
  };
  // 何度目の戦闘員化で、何が残るか（二人とも堕ちた時は、さらに重く）
  const SEQ_STEP = [["brainEasy", "salute"], ["swellPerm", "repFall"], ["pavCx", "suitAche"], ["ii", "willWear"], ["crest", "brainEasy"]];
  function addSequelae(s, id, severe) {
    const n = pget(s, id, "convN") || 1, seq = Object.assign({}, pget(s, id, "sequelae") || {}), got = [];
    const add = k => { seq[k] = (seq[k] || 0) + 1; got.push(k); };
    for (const k of SEQ_STEP[Math.min(SEQ_STEP.length - 1, n - 1)]) add(k);
    if (severe) { add("repFall"); add("brainEasy"); const more = SEQ_STEP[Math.min(SEQ_STEP.length - 1, n)].find(k => !got.includes(k)); if (more) add(more); }
    pset(s, id, "sequelae", seq);
    if (got.includes("repFall")) pset(s, id, "rep", Math.max(0, (pget(s, id, "rep") ?? 60) - 30 * got.filter(k => k === "repFall").length));
    return got;
  }

  /* ================================================================ ワルドーに捕らわれる・救い出す */
  // 洗脳が仕上がった日の後始末：手帳は書かない。残った方が、明日から救出に向かう。二人とも捕らわれたら、ギルドの救出隊が出る
  function finalizeLoss(s) {
    if (s.rec) { s.rec.diaryDone = true; s.rec.epDone = true; }
    const id = s.heroine || "hikari", o = other(id);
    s.convN = (s.convN || 0) + 1;
    s.captured = s.captured || {}; s.captured[id] = { day: s.day };
    s.log = s.log || []; s.log.push({ day: s.day, text: G.Hero.keep(id === "haruka" ? "白山遙は、ワルドーに洗脳され、戦闘員の女その2として連れ去られた" : "星野ひかり（魔法少女ルミナ）は、ワルドーに洗脳され、戦闘員の女その1として連れ去られた") });
    if (!s.captured[o]) {
      endDay(s);
      swapHero(s, o);
      s.pendingScene = "partnerTaken";              // 残った方が、相棒を連れ戻すと誓う朝
      morning(s);                                   // 救出の依頼を、残った方の朝に出す
      return "swap";
    }
    // 二人とも：ギルドが総出で取り返す。数日かかり、重い後遺症が残る
    const got = {}; for (const k of HEROES) { got[k] = addSequelae(s, k, true); }
    s.captured = {};
    s.rescueNote = { by: "guild", got, day: s.day };
    endDay(s); endDay(s);                            // 救出に、二日かかった
    s.pendingScene = "guildRescue";
    return "double";
  }
  // 救出に成功した：相棒が戻ってくる（後遺症つきで）
  function rescueAlly(s, id) {
    if (!s.captured || !s.captured[id]) return null;
    delete s.captured[id];
    const got = addSequelae(s, id, false);
    s.rescueNote = { by: s.heroine, who: id, got, day: s.day };
    s.pendingScene = "allyRescued";
    return got;
  }
  // 古いセーブに、後から足した項目を補う（v2 のまま）
  function upgradeSave(s) {
    if (!s) return s;
    s.traits = s.traits || {}; s.counts = s.counts || {}; s.waldo = s.waldo || { rescues: 0, converted: 0 }; s.carry = s.carry || {};
    s.crack = s.crack || 0; s.shards = s.shards || 0; s.futaMarks = s.futaMarks || 0; s.futaFixed = !!s.futaFixed;
    s.know = s.know || {}; s.lewd = s.lewd || {};
    s.lv = s.lv || 1; s.xp = s.xp || 0; s.skills = s.skills || {}; s.equip = (s.equip || []).filter(id => G.SKILLS[id]);
    for (const k in G.DUNGEONS) if (!s.decks[k]) { const dg = G.DUNGEONS[k]; s.decks[k] = [dg.free.find(x => G.MONSTERS[x].type === "削" && x !== "drain_roper"), "trap:" + dg.traps[0]]; }
    for (const k in s.decks) { const dg = G.DUNGEONS[k]; if (dg && !dg.free.includes("drain_roper")) s.decks[k] = s.decks[k].map(c => c === "drain_roper" ? dg.free.find(x => G.MONSTERS[x] && G.MONSTERS[x].type === "削" && x !== "drain_roper") : c); }   // ドレインローパーは湿窟と蔦森だけに
    s.ailments = (s.ailments || []).filter(a => AILMENTS[a.id]);
    s.heroine = s.heroine || "hikari"; s.archive = s.archive || {}; s.vessel = !!s.vessel; s.captured = s.captured || {};
    s.sequelae = s.sequelae || {}; s.convN = s.convN || 0; if (s.rep == null) s.rep = 60;
    // 前の仕組み（失ったら交代）の記録：失った方は「捕らわれている」に
    if (s.lost) { for (const k in s.lost) if (k !== s.heroine) s.captured[k] = { day: s.lost[k].day }; delete s.lost; }
    if (s.phase === "end") { delete s.ended; s.captured = {}; s.phase = "guild"; }
    // 二人とも、最初からいる：まだ記録の無い方の分を用意する
    for (const k of HEROES) if (k !== s.heroine && !s.archive[k]) s.archive[k] = freshPersonal();
    syncHero(s);
    return s;
  }

  /* ================================================================ 朝：依頼 */
  function makeRequests(s) {
    const keys = Object.keys(G.DUNGEONS);
    const out = [];
    for (const k of U.shuffle(keys)) {
      const dg = G.DUNGEONS[k];
      if (dg.hidden) continue;                              // すり替えでしか向かわせられない所
      const real = { main: U.pick(dg.fixed.concat(dg.free.filter(x => G.MONSTERS[x].type !== "削"))), level: U.ri(1, 3), scale: U.ri(1, 3), boss: U.chance(0.35 + s.day * 0.005), verb: U.pick(VERB) };
      if (U.chance(0.25)) real.species = real.main;          // ときどき種族特化
      out.push({ id: s.day + ":" + k, dungeon: k, real, place: placeName(k, real.species), title: requestTitle(real), stated: G.MONSTERS[real.main].type,
                 reward: Math.round((26 + real.level * 8 + real.scale * 4 + (real.boss ? 14 : 0)) * [0, 0.6, 0.82, 1][real.scale]) });   // 小さい依頼ほど、報酬は少ない
    }
    // 高難度の依頼（二人推奨）：一日に一、二枚。深く、強く、長がいる。報酬も大きい
    const nHard = s.day >= 2 ? (U.chance(0.4) ? 2 : 1) : 0;
    for (const k of U.shuffle(keys.filter(k => !G.DUNGEONS[k].hidden && k !== "waldo")).slice(0, nHard)) {
      const dg = G.DUNGEONS[k];
      const real = { main: U.pick(dg.fixed.filter(x => G.MONSTERS[x].type !== "削")), level: 4, scale: 3, boss: true, verb: U.pick(VERB), hard: true };
      out.push({ id: s.day + ":hard:" + k, dungeon: k, real, hard: true, place: placeName(k, null), title: "【高難度】" + requestTitle(Object.assign({}, real, { level: 3 })), stated: G.MONSTERS[real.main].type, reward: 120 + U.ri(0, 4) * 10 });
    }
    // 相棒がワルドーに捕らわれている：救出の依頼（支部の最下層に、戦闘員にされた相棒がいる）
    for (const id in s.captured || {}) {
      if (id === (s.heroine || "hikari")) continue;
      const real = { main: id === "hikari" ? "lumina_grunt" : "haruka_grunt", level: 2, scale: 2, boss: true, verb: "救出" };
      out.unshift({ id: s.day + ":rescue:" + id, dungeon: "waldo", real, rescue: id, place: "ワルドーの支部・最下層", title: G.Hero.keep(`救出：戦闘員にされた${id === "hikari" ? "星野ひかり" : "白山遙"}を連れ戻す`), stated: "惑", reward: 30 });
    }
    return out;
  }
  function morning(s) {
    syncHero(s);
    s.phase = "guild";
    s.requests = makeRequests(s);
    s.pick = null;
    // 違和感が確信に変わった
    if (s.suspicion >= 100) {
      const tier = G.tier(s.body, s.mind);
      if (tier >= 3) { s.suspicion = 70; s.pendingEvent = "silent"; }
      else s.pendingEvent = "confront";
    }
  }
  // 確信された：裏のリソースを全部使って矯正（信頼は最大、リソースは0）
  function resolveConfront(s) {
    s.log.push({ day: s.day, text: G.Hero.keep(`違和感を抱いた${G.Hero.d.short}を矯正した（澱晶 ${s.dark} をすべて使った）`) });
    s.dark = 0; s.trust = 100; s.suspicion = 0; s.pendingEvent = null;
  }

  // 依頼を割り当てる。paper＝依頼書に書く中身（主な魔物・規模・脅威度・長）、dest＝実際の行き先（すり替え）
  function forgeSize(real, paper, destChanged) {
    return (destChanged && destChanged.hidden ? 3 : 0) + (paper.main !== real.main ? 2 : 0) + Math.abs(paper.level - real.level) + Math.abs(paper.scale - real.scale) + (real.boss && !paper.boss ? 2 : 0) + (destChanged ? 2 : 0);
  }
  function assign(s, reqIdx, paper, dest) {
    const r = s.requests[reqIdx];
    const real = Object.assign({}, r.real);
    paper = Object.assign({}, r.real, paper || {});
    const dungeon = dest || r.dungeon;
    const size = forgeSize(real, paper, dungeon !== r.dungeon && (G.DUNGEONS[dungeon].hidden ? G.DUNGEONS[dungeon] : true));
    s.pick = { req: r, real, paper, title: requestTitle(paper), stated: G.MONSTERS[paper.main].type, dungeon, forged: size > 0, forgeSize: size };
    s.phase = "prep";
    return s.pick;
  }

  /* ================================================================ 準備（ひかりが依頼書を見て整える） */
  function prep(s) {
    const p = s.pick;
    // 万全の準備：依頼書の脅威度で量を、書かれた系統で中身を決める（楽そうなら少なめ）
    const lv = p.paper.level + (p.paper.boss ? 1 : 0);
    const n = lv <= 1 ? 1 : lv === 2 ? 2 : 3;
    const kit = { star: Math.max(1, n - 1), salve: n, smelling: n >= 2 ? 1 : 0, ether: n, cool: 0, knife: 0 };
    if (p.stated === "惑") kit.smelling += 1;          // 惑わされたら、気付け薬で覚ます
    if (p.stated === "蕩") kit.cool += n;              // 火照りは、熱冷ましで鎮める
    if (p.stated === "絡") kit.knife += Math.max(1, n - 1);   // 捕まったら、小刀で切る
    if (p.paper.boss) { kit.salve += 1; kit.star += 1; }
    const priceOf = k => Object.keys(k).reduce((a, x) => a + k[x] * ITEMS[x].price, 0);
    // 資金が足りなければ、優先度の低いものから削る
    for (const x of ["cool", "knife", "smelling", "ether", "salve", "star"]) while (priceOf(kit) > s.funds && kit[x] > (x === "star" || x === "salve" ? 1 : 0)) kit[x]--;
    const cost = priceOf(kit);
    p.kitCost = cost;
    p.caution = [0, 0.75, 1, 1.2][p.paper.level] * (p.paper.boss ? 1.1 : 1) * (p.paper.scale === 1 ? 0.9 : 1);
    s.funds = Math.max(0, s.funds - Math.min(s.funds, cost));
    p.kit = kit;
    p.prepItem = G.PREP[p.stated];
    return p;
  }

  function deckFor(s, dungeon) {
    const dg = G.DUNGEONS[dungeon];
    const n = G.BAL.freeSlots + s.upgrades.freeSlot;
    return dg.fixed.slice().concat((s.decks[dungeon] || []).slice(0, n));
  }
  function freeCandidates(dungeon) {
    const dg = G.DUNGEONS[dungeon];
    return dg.free.concat(dg.traps.map(t => "trap:" + t));
  }

  /* ================================================================ 潜行 */
  // 潜るヒロインの、潜行中の身体（ヒロインごとの記録 sv から）
  function heroOf(sv, p) {
    const s = sv;
    const has = id => s.ailments.some(a => a.id === id);
    const ail = id => s.ailments.find(a => a.id === id);
    const hpMul = (G.Hero.cur === "haruka" ? G.HARUKA.hpMul : 1) || 1;   // 遙は、ひかりほど頑丈ではない
    return {
        lv: s.lv || 1, hpMax: Math.round((G.GROWTH.hpMax(s.lv || 1) + 3 * (s.shards || 0)) * hpMul), mpMax: G.GROWTH.mpMax(s.lv || 1) + 2 * (s.shards || 0), dmgMul: G.GROWTH.dmg(s.lv || 1), skills: (s.equip || []).slice(),
        hp: Math.round((G.GROWTH.hpMax(s.lv || 1) + 3 * (s.shards || 0)) * hpMul * (1 - s.fatigue / 250)), mp: G.GROWTH.mpMax(s.lv || 1) + 2 * (s.shards || 0), magic: has("hollow") ? 60 : G.HIKARI.magicMax,
        will: Math.round(100 + Math.min(15, s.shards || 0) - s.fatigue / 5 - (has("exhaustion") ? 20 : 0) - 8 * ((s.sequelae || {}).willWear || 0)), arousal: Math.min(70, (has("heat") ? 30 : 0) + (has("impCurse") ? 25 + 5 * Math.min(4, (ail("impCurse") || {}).age || 0) : 0)), pleasure: 0, climax: 0, form: "magica", kit: Object.assign({}, p.kit),
        sigil: has("sigil") ? 1 : 0,
        // 前の潜行から持ち越した状態
        sens: has("sensitive") ? Math.min(5, 2 + ((ail("sensitive") || {}).age || 0)) : 0, sensBase: has("sensitive") ? 1 : 0, ache: has("throb") ? 40 : 0, numb: has("paralysis") ? 20 : 0,
        omazuke: has("omazuke") ? { over: (s.carry.omazuke || 40), floor: 1 } : null,
        charm: Object.assign({}, (ail("charm") || {}).to || {}), attach: (s.carry.attach || []).slice(),
        exposure: has("exposure"), addict: has("addict"), trigger: has("hairTrigger"), rewired: has("rewired"), taint: has("mindTaint"),
        brand: (ail("defeatBrand") || {}).to || null, brain: 0,
        swell: Math.max(has("swell") ? (s.carry.swell || 1) : 0, Math.min(3, (s.sequelae || {}).swellPerm || 0)),      // 不可逆の肥大は、処置しても戻らない crack: s.crack || 0,
        futa: !!(G.DUNGEONS[p.dungeon].futa || s.futaFixed || has("futaAfter")), cum: 0, shasei: 0,
        futaCarry: has("futaAfter") && !G.DUNGEONS[p.dungeon].futa && !s.futaFixed,   // 名残だけで生えている（神殿の外）
        kissMark: has("kissMark"), permit: has("permit") ? { over: 0, edges: 0 } : null,
        vessel: !!s.vessel,          // 教団の器：見た目と、祈りの発作
      };
  }
  // 相棒の記録の窓：ヒロインごとの項目は相棒の記録へ、ギルドの項目（資金・日付など）は共通の記録へ読み書きする
  function pview(s, id) {
    const per = new Set(PERSONAL);
    const own = t => (t.heroine || "hikari") === id;           // 入れ替わった後（いまの子が id）でも、正しい所を指す
    const box = t => { t.archive = t.archive || {}; return t.archive[id] || (t.archive[id] = freshPersonal()); };
    return new Proxy(s, {
      get(t, k) { if (k === "heroine") return id; if (k === "rec") return own(t) ? t.rec : t.duoRec; if (per.has(k) && !own(t)) return box(t)[k]; return t[k]; },
      set(t, k, v) { if (k === "heroine") return true; if (k === "rec") { if (own(t)) t.rec = v; else t.duoRec = v; return true; } if (per.has(k) && !own(t)) { box(t)[k] = v; return true; } t[k] = v; return true; },
    });
  }
  // 二人の報告の間：前に出る子を入れ替える（記録・報告の束ごと）
  function pairFlip(s) {
    const cur = s.heroine || "hikari", o = other(cur);
    s.archive = s.archive || {};
    const keep = {}; for (const k of PERSONAL) keep[k] = s[k];
    const next = s.archive[o] || freshPersonal();
    for (const k of PERSONAL) s[k] = next[k];
    s.archive[cur] = keep; delete s.archive[o];
    s.heroine = o; const r = s.rec; s.rec = s.duoRec; s.duoRec = r;
    syncHero(s);
  }
  function startDive(s, opt) {
    syncHero(s);
    const p = s.pick;
    // 迷宮の法則：入口で決まる。無い日もある（ワルドーの支部には無い）
    const law = p.dungeon !== "waldo" && p.dungeon !== "strobe" && U.chance(0.45) ? U.pick(Object.keys(G.LAWS)) : null;
    const run = {
      day: s.day, dungeon: p.dungeon, stated: p.stated, realType: G.DUNGEONS[p.dungeon].type, forged: p.forged,
      real: p.real, paper: p.paper, caution: p.caution || 1, forgeSize: p.forgeSize || 0,
      dungeonName: p.dungeon === p.req.dungeon ? p.req.place + "（" + G.DUNGEONS[p.dungeon].name + "）" : placeName(p.dungeon, null),
      events: [], night: [], deck: deckFor(s, p.dungeon), maxLive: G.BAL.maxLive + s.upgrades.live,
      autoDirector: s.autoDirector, save: s, recall: false, floor: 1, mismatch: 0, floors: FLOORS_BY_SCALE[(p.real && p.real.scale) || 2],
      h: heroOf(s, p),
      law, hero: s.heroine || "hikari", rescue: (p.req && p.req.rescue) || null, captured: Object.keys(s.captured || {}), seq: Object.assign({}, s.sequelae || {}),
      budgetBonus: s.upgrades.budget * 2,
    };
    // 二人で潜る：相棒の身体も用意する（持ち物は二人分を分けて持つ）
    if (opt && opt.pair && canPair(s)) {
      const o = other(s.heroine || "hikari"), v = pview(s, o);
      G.Hero.set(o); run.pair = { id: o, h: heroOf(v, p), save: v }; G.Hero.set(s.heroine || "hikari");
    }
    s.phase = "dive";
    return run;
  }
  function makeFloor(run) {
    const w = G.Field.createWorld(run, run.floor);
    w.dir.cap += run.budgetBonus || 0;
    return w;
  }
  // 階の結果を受けて、次へ進むか終わるか
  function afterFloor(run, w) {
    if (w.outcome === "down") { run.floor++; return "next"; }
    run.outcome = w.outcome === "cleared" ? "cleared" : w.outcome;
    run.defeatBy = w.defeatBy || null;
    run.floorReached = run.floor;
    return "end";
  }


  /* ================================================================ 出来事の記憶（後の日の言い回しに使う） */
  // 本人が覚えている件だけを、いつ・どこで・誰に・どこを・どう報告したか、まで残す
  const EP_PART = { "胸": "胸", "胸の先": "胸の先", "脚の間": "脚の間", "秘所": "あそこ", "突起": "クリ", "お尻": "お尻", "内腿": "内腿", "太腿": "太腿", "首筋": "首筋",
    "耳": "耳", "脇": "脇", "脇腹": "脇腹", "肌": "肌じゅう", "全身": "全身", "胸と秘所": "胸とあそこ", "生えたもの": "生えたの", "先端": "先っぽ", "脚の付け根": "脚の付け根", "胸の横": "胸の横", "足の裏": "足の裏" };
  // 遙の番は js/haruka/diary.js の EP_PART（前の件を思い出して言う時の、部位の呼び方）
  const epPart = k => G.Hero.A("EP_PART", EP_PART)[k] || k;
  G.TextL = Object.assign(G.TextL || {}, { EP_PART });
  function recordEpisodes(s) {
    const rec = s.rec; if (!rec || rec.epDone) return;
    rec.epDone = true;
    const caught = new Set(((rec.audit || {}).caught || []).map(d => d.unit).filter(Boolean));
    if (!Array.isArray(s.episodes)) s.episodes = [];
    const L = s.episodes;
    const seen = new Set();
    for (const u of (rec.units || []).slice().sort((a, b) => (b.shame || 0) - (a.shame || 0))) {
      if (u.hidden || u.kind !== "hold" || !u.mon || !G.MONSTERS[u.mon] || seen.has(u.mon)) continue;
      seen.add(u.mon);
      const parts = u.acts ? Object.entries(u.acts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k) : [];
      L.push({ day: rec.day, mon: u.mon, monName: u.monName || G.MONSTERS[u.mon].name, place: rec.dungeonName, floor: u.floor, parts, stage: u.stage || 0, climax: u.climax || 0, swarm: u.swarm || 1,
        lied: u.truth === "false" || u.docTruth === "false", caught: caught.has(u) || !!u.confessed, defeat: false });
    }
    // 負けた夜：相手は一体に絞って、朝まで、で覚えている
    if (rec.outcome === "defeat" && rec.night && rec.night.length) {
      const by = rec.night.map(b => b.mon).find(k => k && G.MONSTERS[k]);
      if (by) L.push({ day: rec.day, mon: by, monName: G.MONSTERS[by].name, place: rec.dungeonName, floor: rec.floorReached, parts: [], stage: 2,
        climax: rec.night.reduce((a, b) => a + (b.climaxN || (b.climax ? 1 : 0)), 0), swarm: 1, lied: rec.nightTruth === "denial", caught: false, defeat: true });
    }
    while (L.length > 40) L.shift();
  }
  // その相手との、いちばん最近の件（今日より前）
  function pastEpisode(s, mon, day) {
    const L = s && Array.isArray(s.episodes) ? s.episodes : [];
    for (let i = L.length - 1; i >= 0; i--) { const e = L[i]; if (e && e.mon === mon && typeof e.day === "number" && e.day < day && Array.isArray(e.parts) && G.MONSTERS[mon]) return e; }
    return null;
  }
  function agoText(epDay, day) { const d = day - epDay; return d <= 1 ? "昨日" : d === 2 ? "一昨日" : d + "日前"; }
  function epCtx(ep, day) {
    return { mon: ep.monName || G.MONSTERS[ep.mon].name, ago: agoText(ep.day, day), place: ep.place || "迷宮", floor: ep.floor, n: ep.climax, parts: ep.parts.map(epPart).join("と、") || (G.Hero.is("haruka") ? "身体のあちこち" : "身体じゅう") };
  }
  /* ================================================================ 帰還後：堕ち・状態異常・リソース */
  function advanceOf(req) { return Math.round(req.reward * [0, 0.3, 0.42, 0.5][(req.real && req.real.scale) || 2]); }
  // 潜行の後始末。二人で潜った日は、一人ずつ（相棒の分は相棒の記録へ）。報酬と記録の一行は一度だけ
  function finishDive(s, run) {
    if (!run.pair) return finishOne(s, run);
    const lead = s.heroine || "hikari", o = run.pair.id;
    const mine = id => e => (e.hero || lead) === id;
    const part = (h, id) => ({ h, events: run.events.filter(mine(id)), defeatBy: h.out ? h.out.by : run.defeatBy, shards: run["shards_" + id] || 0, night: run.night.filter(b => (b.hero || lead) === id), firstParts: (run.firstParts || []).filter(f => (f.hero || lead) === id), abduct: (run.abduct || []).filter(a => a.hero === id) });
    const recA = finishOne(s, Object.assign({}, run, part(run.h, lead), { pairWith: o, allEvents: run.events }));
    G.Hero.set(o);
    const recB = finishOne(run.pair.save, Object.assign({}, run, part(run.pair.h, o), { noPay: true, rescue: null, rescued: false, lostHero: false, dirStats: null, pairWith: lead }));
    G.Hero.set(lead);
    recA.pair = o; recB.pair = lead; recB.partner = true;
    s.sortied = [lead, o];
    s.phase = "report";
    return recA;
  }
  function finishOne(s, run) {
    syncHero(s);
    const ev = run.events;
    s.dirTotal = s.dirTotal || { placed: 0, holds: 0, acts: 0, climax: 0 };
    if (run.dirStats) for (const k in s.dirTotal) s.dirTotal[k] += run.dirStats[k] || 0;
    const holdSec = ev.filter(e => e.kind === "hold").reduce((a, e) => a + (e.dur || 3), 0);
    const nightBeats = run.night.length;
    const climaxes = run.h.climax;
    // 肉体は一晩で一段（25）まで。精神は、その日の肉体の伸びの1/3まで
    // 堕ちはゆっくり。一日の上限を低くし、進むほど進みにくい（抗う心がまだ強い）
    const bodyGain = Math.min(5, climaxes * 0.45 + holdSec * 0.03 + nightBeats * 0.6 + run.h.arousal * 0.008 + ((run.abduct || [])[0] ? 0.6 : 0)) * (1 - s.body / 125);
    // 心は、身体の覚えたことに少し遅れてついていく（達した数・捕まった時間・一夜・負け）
    let mindGain = ((run.outcome === "defeat" ? 1.5 : 0) + nightBeats * 0.3 + climaxes * 0.12 + holdSec * 0.008) * (1 - s.mind / 150);
    mindGain = Math.min(bodyGain * 0.6, 2.6, mindGain);
    s.body = U.clamp(s.body + bodyGain, 0, 100);
    s.mind = U.clamp(s.mind + mindGain, 0, 100);
    // 探索の実り：踏破すれば、迷宮の澱みごと身体が清められる。星の欠片は、ルミナの光そのものを強くする
    const merit = { body: 0, mind: 0, healed: [], shards: run.shards || 0 };
    if (run.outcome === "cleared") {
      const b0 = s.body, m0 = s.mind;
      s.body = U.clamp(s.body - 6, 0, 100); s.mind = U.clamp(s.mind - 2.5, 0, 100);
      merit.body = +(b0 - s.body).toFixed(1); merit.mind = +(m0 - s.mind).toFixed(1);
      merit.purified = true;
    } else if (run.outcome !== "defeat" && run.floorReached >= Math.ceil((run.floors || 8) * 0.6)) {   // 深くまで降りて自分で帰った日も、少しだけ
      const b0 = s.body; s.body = U.clamp(s.body - 2, 0, 100); merit.body = +(b0 - s.body).toFixed(1);
    }
    s.shards = Math.min(G.SHARD_MAX, (s.shards || 0) + merit.shards);
    // 状態異常
    const add = id => { if (!s.ailments.some(a => a.id === id)) s.ailments.push({ id, day: s.day }); };
    if ((run.h.arousal > 55 || nightBeats > 0) && run.outcome !== "cleared") add("heat");      // 踏破の光は、熱も払う
    if (ev.some(e => e.kind === "trance" && e.hidden)) add("haze");
    if (ev.filter(e => e.type === "蕩" && (e.kind === "arouse" || e.kind === "hold")).length >= 4) add("soiled");
    if (run.h.form === "civilian") add("hollow");
    if (run.h.sigil >= 1) add("sigil");      // 刻まれた紋は、処置するまで残る
    const H = run.h, n = k => ev.filter(e => e.kind === k).length;
    if ((H.sens || 0) >= 3) add("sensitive");
    if (H.ache > 0 || ev.some(e => e.trap === "itch")) add("throb");
    const over = ((H.omazuke || {}).over || 0) + ((H.deny || {}).over || 0) + ((H.kinOver || {}).over || 0) + ((H.urge || 0) >= 40 ? H.urge * 0.8 : 0);   // 出させてもらえないまま帰った欲求も、持ち越す
    if (H.omazuke || over > 20) { add("omazuke"); s.carry.omazuke = Math.round(over + 30); } else if (!s.ailments.some(a => a.id === "omazuke")) s.carry.omazuke = 0;
    if (H.charm && Object.values(H.charm).some(v => v > 0)) { add("charm"); s.ailments.find(a => a.id === "charm").to = Object.assign({}, H.charm); }
    if (H.attach && H.attach.length) { add("attached"); s.carry.attach = H.attach.slice(); s.ailments.find(a => a.id === "attached").list = H.attach.map(id => ((G.ATTACH_NAME || {})[id]) || ({ orb: "震え珠", suit: "纏い衣", hoshibami: "星喰み", sucker: "吸盤", mushi: "潜り蟲", hibiki: "響き蟲", hiru: "肥大化ヒル" })[id] || id); } else s.carry.attach = [];
    // 蟲・変生・教団・淫魔
    if (H.swell) { add("swell"); s.carry.swell = H.swell; s.ailments.find(a => a.id === "swell").n = H.swell; }
    if (s.futaFixed) { add("futaFixed"); s.ailments = s.ailments.filter(a => a.id !== "futaAfter"); }
    else if (H.futaCarry && run.law !== "yuuka") s.ailments = s.ailments.filter(a => a.id !== "futaAfter");   // 名残は、神殿の外で一度潜ると引く
    else if (H.futa && (H.shasei || 0) >= 1) add("futaAfter");
    s.crack = H.crack || 0;
    if (run.vesselNew === true || run.vesselNew === (s.heroine || "hikari")) { s.vessel = true; s.vesselMorning = true; s.crack = 0; s.ailments = s.ailments.filter(a => a.id !== "crack"); s.log = s.log || []; s.log.push({ day: s.day, text: G.Hero.keep(G.Hero.d.short + "は、教団の器になった（冒険者のまま）") }); }
    if (s.crack > 0) { add("crack"); s.ailments.find(a => a.id === "crack").n = s.crack; }
    const IMPS2 = ["imp", "futago", "inma", "muma_queen", "sakiimp", "jikkyou", "kusuguri", "kazoe", "azakeri", "kuchizuke", "utaimp", "hitomi", "tenazuke"];
    if (ev.filter(e => (e.kind === "charm" || e.kind === "kiss" || e.kind === "beg" || e.kind === "countGame" || e.kind === "hold") && IMPS2.includes(e.mon)).length >= 3 || (run.outcome === "defeat" && IMPS2.includes(run.defeatBy))) add("impCurse");
    if (H.kissMark) add("kissMark");
    if (H.permit) add("permit");
    if (H.exposure) add("exposure");
    if (n("numb") >= 2) add("paralysis");
    if (run.outcome === "defeat" && s.fatigue >= 45) add("exhaustion");      // 連日の敗北で
    if (H.taint || n("trance") >= 8) add("mindTaint");
    if (H.addict) add("addict");
    if (H.trigger) add("hairTrigger");
    if (H.rewired) add("rewired");
    { const ab = (run.abduct || [])[0]; if (ab) { s.counts = s.counts || {}; s.counts["abduct:" + ab.mon] = (s.counts["abduct:" + ab.mon] || 0) + 1; } }   // 巣へ持ち帰られた回数（相手ごと）
    // 敗北洗脳：同じ種に二度負けると
    if (run.outcome === "defeat" && run.defeatBy && G.MONSTERS[run.defeatBy]) {
      s.counts["lost:" + run.defeatBy] = (s.counts["lost:" + run.defeatBy] || 0) + 1;
      if (s.counts["lost:" + run.defeatBy] >= 2 && !s.ailments.some(a => a.id === "defeatBrand")) { add("defeatBrand"); s.ailments.find(a => a.id === "defeatBrand").to = run.defeatBy; }
    }
    // 性癖：行動の積み重ねで身につき、消えない
    const MACH = ["ratchet", "karte", "exam", "capture", "pod", "drone_capture", "drone_tickle", "belt", "gate", "armor"], IMP = ["imp", "futago", "inma", "muma_queen", "sakiimp", "jikkyou", "kusuguri", "kazoe", "azakeri", "kuchizuke"];
    const WORM = ["tsurimushi", "zuidou", "hibiki", "doromushi", "gitai", "haimushi", "hiru"];
    const cnt = {
      defeat: run.outcome === "defeat" ? 1 : 0, hold: n("hold"), edge: n("edge") + n("deny") + n("vow"), climax: climaxes,
      watched: n("filmed") + n("salute") + ev.filter(e => e.trap === "pillory").length, drain: n("drain"), sniff: n("sniff"), sigil: n("sigil") + n("rune"),
      hypno: ev.filter(e => e.hidden).length, drawn: n("drawn"), tickle: ev.filter(e => e.kind === "hold" && (e.mon === "drone_tickle" || e.mon === "tickle")).length,
      engulf: ev.filter(e => e.kind === "hold" && e.type === "蕩").length, machine: ev.filter(e => e.kind === "hold" && MACH.includes(e.mon)).length,
      imp: ev.filter(e => (e.kind === "charm" || e.kind === "deny" || e.kind === "beg" || e.kind === "kiss" || e.kind === "countGame") && IMP.includes(e.mon)).length,
      worm: ev.filter(e => WORM.includes(e.mon) && (e.kind === "hold" || e.kind === "attach")).length, shasei: n("shasei") + n("ringRelease"),
      pray: n("pray") + n("crack"), kiss: n("kiss"), swarm: ev.filter(e => e.kind === "hold" && (e.n || 1) >= 3).length,
    };
    const gained = [];
    // 一度の潜行で数えるのは、種類ごとに数回まで（性癖は日を重ねて少しずつ身につく）
    const CAP = { hold: 2, climax: 2, drain: 2 };
    for (const k in cnt) s.counts[k] = (s.counts[k] || 0) + Math.min(cnt[k], CAP[k] ?? 1);
    for (const [id, T] of Object.entries(G.TRAITS)) {
      const c = s.counts[T.count] || 0, cur = s.traits[id] || 0;
      let st = 0; for (let i = 0; i < 3; i++) if (c >= T.need[i]) st = i + 1;
      if (st > cur) { s.traits[id] = st; gained.push({ id, stage: st }); }
    }
    run.traitsGained = gained;
    // 成長：経験（倒した数・降りた深さ・踏破・抜け出した回数）でゆっくりレベルが上がる。閃いた技は潜行中に覚えている
    const lv0 = s.lv || 1;
    const xp = n("kill") * 3 + run.floorReached * 6 + (run.outcome === "cleared" ? 25 : 0) + n("breakout") + n("escape") * 2 + 4;
    s.xp = (s.xp || 0) + xp;
    while (s.lv < G.GROWTH.lvMax && s.xp >= G.GROWTH.xpNeed(s.lv)) { s.xp -= G.GROWTH.xpNeed(s.lv); s.lv++; }
    const inspired = ev.filter(e => e.kind === "inspire").map(e => e.skill);
    for (const id of inspired) if (s.equip.length < G.GROWTH.slots(s.lv) && !s.equip.includes(id)) s.equip.push(id);   // 空きがあれば、すぐ使う
    run.growth = { lv0, lv: s.lv, xp, inspired };
    // 魔物ごとの出来事の記録（手帳のメモに、日付つきで書き足される）
    s.monLog = s.monLog || {};
    const note = (k, what) => { if (!G.MONSTERS[k]) return; const L = s.monLog[k] || (s.monLog[k] = []); if (!L.some(x => x.what === what)) L.push({ day: s.day, what }); };
    for (const e of ev) {
      if (e.hidden) continue;                        // 本人が覚えていない件は、本人のメモに書けない
      if (e.kind === "spot") note(e.mon, "seen");
      else if (e.kind === "hold") { note(e.mon, "caught"); if ((e.stage || 0) >= 2) note(e.mon, "direct"); if ((e.n || 1) >= 3) note(e.mon, "swarm"); }
      else if (e.kind === "climax" && e.mon) note(e.mon, "climax");
      else if (e.kind === "kill") note(e.mon, "killed");
      else if (e.kind === "anticipate") note(e.mon, "crave");
    }
    if (run.outcome === "defeat" && run.defeatBy) note(run.defeatBy, "defeat");
    // 報酬
    const req = s.pick.req;
    // 前金（失敗しても返さない。小さい依頼ほど割合も低い）。踏破で残り。倒した魔物には討伐手当
    const advance = advanceOf(req), rest = run.outcome === "cleared" ? req.reward - advance : 0;
    const bounty = (run.allEvents || ev).filter(e => e.kind === "kill").reduce((a, e) => { const d = G.MONSTERS[e.mon]; return a + (e.boss ? 12 : d ? Math.max(1, Math.round((d.hp || 8) / 9)) : 1); }, 0);
    const funds = run.noPay ? 0 : advance + rest + bounty;           // 二人の日は、報酬は一度だけ
    s.funds = Math.max(0, s.funds + funds);
    run.pay = { advance, rest, bounty };
    const sevSum = ev.reduce((a, e) => a + (["hold", "climax", "trap", "trance", "arouse", "untransform"].includes(e.kind) ? (e.sev || 0) : 0), 0);
    const dark = Math.round(Math.min(10, sevSum / 10) + climaxes * 0.8 + nightBeats * 0.6 + (run.outcome === "defeat" ? 3 : 0));
    s.dark += dark;
    s.taint = U.clamp(s.taint + dark * 0.18, 0, 100);
    // 違和感（依頼書と中身の食い違い）
    // 見かけた「話と違う魔物」の種類の数で決める（同じ種を何度見ても1）
    const odd = new Set(ev.filter(e => e.kind === "spot" && e.type !== run.stated && e.type !== "削").map(e => e.mon)).size;
    let sus = -4;
    if (run.forged) {
      sus = 2 + Math.min(odd, 6) * 1.6 + run.forgeSize * 1.2;
      if (run.strongNoticed) sus += (run.real.level - run.paper.level) * 3;
      if (run.bossSeen && !run.paper.boss) sus += 8;           // 書いていない長に出くわした
    }
    sus *= [1, 0.85, 0.6, 0.3][G.tier(s.body, s.mind)];
    s.suspicion = U.clamp(s.suspicion + sus, 0, 100);
    s.fatigue = U.clamp(s.fatigue + (run.outcome === "defeat" ? 40 : 25), 0, 100);
    const rec = {
      day: s.day, dungeon: run.dungeon, dungeonName: run.dungeonName || G.DUNGEONS[run.dungeon].name, stated: run.stated, realType: run.realType, forged: run.forged,
      outcome: run.outcome, floorReached: run.floorReached, events: ev, night: run.night, mismatch: run.mismatch || 0,
      h: { hp: run.h.hp, arousal: run.h.arousal, form: run.h.form, climax: climaxes, attach: (run.h.attach || []).slice(), rewired: !!run.h.rewired }, ailments: s.ailments.map(a => a.id),
      law: run.law || null, dirStats: run.dirStats || null, merit, traitsGained: run.traitsGained || [], converted: !!run.converted, growth: run.growth, firstParts: run.firstParts || [], abduct: (run.abduct || [])[0] || null,
      gain: { body: +bodyGain.toFixed(1), mind: +mindGain.toFixed(1), funds, dark, sus: +sus.toFixed(1), pay: run.pay },
    };
    rec.report = G.Report.build(rec, s);
    rec.doc = G.Report.documentLines(rec, s);
    rec.monitor = G.Report.monitorLog(rec);
    s.rec = rec;
    s.phase = "report";
    if (run.lostHero) { s.phase = "lost"; rec.lostHero = true; }        // ワルドーに連れ去られた：報告は無い
    if (run.rescued && !run.lostHero) { rec.rescued = run.rescue; rescueAlly(s, run.rescue); }   // 相棒を、取り返した
    if (!run.noPay) s.history.push({ day: s.day, hero: s.heroine || "hikari", pair: run.pairWith ? [s.heroine || "hikari", run.pairWith] : null, half: s.half || 1, dungeon: run.dungeon, stated: run.stated, outcome: run.outcome, floor: run.floorReached, climax: climaxes, posture: rec.postureName, forged: run.forged, title: s.pick.title, realTitle: s.pick.req.title, abduct: rec.abduct ? rec.abduct.place : null });
    if (s.history.length > 60) s.history.shift();
    if (run.pairWith) rec.pairWith = run.pairWith;
    return rec;
  }

  // 口頭報告が終わってから、報告書を書く（追及で認めたことも反映される。ただし書面では、また隠すことがある）
  function writeDoc(s) {
    const rec = s.rec; if (!rec) return;
    rec.doc = G.Report.documentLines(rec, s);
    rec.docWritten = true;
  }
  // 技を付け替える（装備できる数はレベルで決まる）
  function equipSkill(s, id) {
    if (!s.skills[id]) return "none";
    const i = s.equip.indexOf(id);
    if (i >= 0) { s.equip.splice(i, 1); return "off"; }
    if (s.equip.length >= G.GROWTH.slots(s.lv)) return "full";
    s.equip.push(id); return "on";
  }
  /* ================================================================ 書類監査 */
  function audit(s, flagged) {
    const rec = s.rec, doc = rec.doc;
    const res = { caught: [], wrong: [], missed: [] };
    doc.forEach((d, i) => {
      const f = flagged.includes(i);
      if (f && d.kind === "false") res.caught.push(d);
      else if (f) res.wrong.push(d);
      else if (d.kind === "false") res.missed.push(d);
    });
    s.trust = U.clamp(s.trust + res.caught.length * 8 - res.wrong.length * 6, 0, 100);
    // 暴かれると心は少し戻る。隠し通せた嘘は、自分を誤魔化した分だけ心を進める
    s.mind = U.clamp(s.mind - Math.min(1.2, res.caught.length * 0.4) + res.missed.length * 1.1 * (1 - s.mind / 150), 0, 100);   // 暴かれても、戻るのは少しだけ
    s.dark += res.caught.length;
    if (res.caught.length) s.caughtDay = s.day;
    rec.audit = res;
    s.phase = res.caught.length ? "rereport" : "clinic";
    return res;
  }
  // 再報告のあとの選択：記録だけ取る／踏み込んで確認する
  // 再尋問の検分を終えた結果：踏み込んだ分だけ、信頼と引き換えに堕ちと澱みが進む
  function reintResult(s, sess, formal) {
    s.reintCount = (s.reintCount || 0) + 1;
    if (formal || !sess.everTouched) { s.trust = U.clamp(s.trust + 2, 0, 100); s.phase = "clinic"; return; }
    const c = sess.climaxes;
    s.trust = U.clamp(s.trust - 4 - c, 0, 100); s.dark += 2 + c; s.taint = U.clamp(s.taint + 2, 0, 100);
    s.body = U.clamp(s.body + Math.min(2.5, 0.8 + 0.4 * c), 0, 100); s.mind = U.clamp(s.mind + Math.min(1.8, 0.4 + 0.3 * c + 0.2 * sess.edges), 0, 100);
    if (s.trust >= 45) s.reintHonest = Math.min(3, (s.reintHonest || 0) + (c ? 2 : 1));    // 手ひどく検められると、次は最初から認めるようになる
    if (s.rec) { s.rec.lewdCheck = true; s.rec.reint = { climax: c, edges: sess.edges, parts: Object.keys(sess.touched) }; }
    s.phase = "clinic";
  }
  function rereportChoice(s, lewd) {
    if (lewd) { s.trust = U.clamp(s.trust - 6, 0, 100); s.dark += 3; s.taint = U.clamp(s.taint + 2, 0, 100); s.body = U.clamp(s.body + 2, 0, 100); if (s.rec) s.rec.lewdCheck = true; }
    s.phase = "clinic";
  }

  /* ================================================================ 処置と翌日 */
  function treat(s, ids) {
    for (const id of ids) {
      const a = AILMENTS[id];
      if (!a || s.funds < a.fee) continue;
      s.funds -= a.fee;
      s.ailments = s.ailments.filter(x => x.id !== id);
      if (id === "attached") s.carry.attach = [];
      if (id === "omazuke") s.carry.omazuke = 0;
      if (id === "swell") s.carry.swell = 0;
      if (id === "futaFixed") { s.futaFixed = false; s.futaMarks = 0; }
      if (id === "crack") { s.crack = Math.max(0, (s.crack || 0) - 3); if (s.crack > 0) s.ailments.push({ id: "crack", day: s.day, n: s.crack }); }
    }
  }
  function endDay(s) {
    if (G.Diary && s.rec && !s.rec.diaryDone) { s.rec.diaryDone = true; G.Diary.write(s); }   // その夜、ひかりは手帳を書く
    recordEpisodes(s);                                  // 手帳を書いたあとで、今日の件を覚えておく（今日の手帳は、前の件と比べて書く）
    if (s.duoRec) {                                     // 二人で潜った日：相棒も、自分の手帳を書く
      const v = pview(s, other(s.heroine || "hikari"));
      G.Hero.set(v.heroine);
      if (G.Diary && !s.duoRec.diaryDone) { s.duoRec.diaryDone = true; G.Diary.write(v); }
      recordEpisodes(v);
      v.fatigue = U.clamp(v.fatigue - 22, 0, 100);
      syncHero(s);
      s.duoRec = null;
    }
    // 残した状態異常は、ギルドの空気を少しずつ澱ませる
    s.taint = U.clamp(s.taint + s.ailments.length * 1.5, 0, 100);
    s.fatigue = U.clamp(s.fatigue - 22, 0, 100);
    for (const id in s.archive || {}) if (s.archive[id] && typeof s.archive[id].fatigue === "number" && !(s.sortied || []).includes(id)) s.archive[id].fatigue = U.clamp(s.archive[id].fatigue - 30, 0, 100);   // 潜らなかった方は、休んでいる（午前に潜った方は、午後に休んだ分を引いてある）
    s.half = 1; s.sortied = [];
    // 一晩たつと：着替え・湯浴み・眠りで引くものは引く。処置しなかったものは、根を張って重くなる
    s.healedNight = s.ailments.filter(a => NATURAL.includes(a.id) && a.day < s.day + 1).map(a => ail(a.id).name);
    s.ailments = s.ailments.filter(a => !NATURAL.includes(a.id));
    let kept = 0;
    for (const a of s.ailments) {
      a.age = (a.age || 0) + 1;
      if (AILMENTS[a.id] && AILMENTS[a.id].kink) continue;          // 深層のものは、もともと抜けない
      kept++;
      if (a.id === "swell" && a.age % 2 === 0) { s.carry.swell = Math.min(3, (s.carry.swell || 1) + 1); a.n = s.carry.swell; }
      if (a.id === "crack" && a.age % 2 === 0) { s.crack = Math.min(10, (s.crack || 0) + 1); a.n = s.crack; }
      if (a.id === "crack" && s.crack >= 10 && !s.vessel) { s.vessel = true; s.vesselMorning = true; s.crack = 0; a.gone = true; }   // 塞がないまま、夜のうちに割れきった
      if (a.id === "omazuke") s.carry.omazuke = (s.carry.omazuke || 40) + 15;
      if (a.id === "charm" && a.to && a.age % 3 === 0) for (const k in a.to) a.to[k] = Math.min(3, a.to[k] + 1);
      if (a.id === "mindTaint") s.mind = U.clamp(s.mind + 0.4, 0, 100);
    }
    s.ailments = s.ailments.filter(a => !a.gone);
    // 抱えたままの夜は、少しずつ堕ちを進める
    s.body = U.clamp(s.body + Math.min(1.2, kept * 0.2), 0, 100); s.mind = U.clamp(s.mind + Math.min(0.5, kept * 0.08), 0, 100);
    s.day++;
    s.lastGrowth = s.rec && s.rec.growth || null;      // 翌朝の会話で使う
    s.rec = null;
    morning(s);
  }

  // 二人で潜れるか：相棒が捕らわれておらず、今日まだ潜っていない（午前の部だけ）
  function canPair(s) { const o = other(s.heroine || "hikari"); return (s.half || 1) === 1 && !(s.captured || {})[o]; }
  /* ================================================================ 一日に二度の出撃（一人ずつなら交互に） */
  // 午前に潜った方の処置が済んだら、午後はもう一人を出せる。同じ子を二度は出さない
  function canSecond(s) {
    const o = other(s.heroine || "hikari");
    return (s.half || 1) === 1 && !(s.captured || {})[o] && !(s.rec && s.rec.pair);
  }
  function secondSortie(s) {
    if (!canSecond(s)) return false;
    const cur = s.heroine || "hikari";
    if (G.Diary && s.rec && !s.rec.diaryDone) { s.rec.diaryDone = true; G.Diary.write(s); }   // 午前の子は、ここで今日の手帳を書く
    recordEpisodes(s);
    s.fatigue = U.clamp(s.fatigue - 22, 0, 100);       // 午後は休める（夜に休む分を、先に）
    s.sortied = [cur];
    s.rec = null; s.pick = null;
    swapHero(s, other(cur));
    s.half = 2; s.phase = "guild";
    s.requests = makeRequests(s);                       // 午後の依頼の束
    s.greeted = null;
    return true;
  }

  // 休養：今日は潜らない。疲労が大きく抜け、軽い状態異常（発情・過敏・疼き・疲弊）は自然に引く。堕ちも少し戻る。報酬は無い
  const REST_HEAL = ["heat", "sensitive", "throb", "exhaustion"];
  function rest(s) {
    const healed = s.ailments.filter(a => REST_HEAL.includes(a.id)).map(a => ail(a.id).name);
    s.ailments = s.ailments.filter(a => !REST_HEAL.includes(a.id));
    const f0 = s.fatigue, b0 = s.body, m0 = s.mind;
    s.fatigue = U.clamp(s.fatigue - 50, 0, 100);
    s.body = U.clamp(s.body - 2.5, 0, 100); s.mind = U.clamp(s.mind - 1.5, 0, 100);
    s.rested = (s.rested || 0) + 1;
    const out = { healed, fatigue: Math.round(f0 - s.fatigue), body: +(b0 - s.body).toFixed(1), mind: +(m0 - s.mind).toFixed(1) };
    if (G.Diary && G.Diary.writeRest) G.Diary.writeRest(s, out);
    s.rec = null;
    endDay(s);
    return out;
  }
  function buy(s, key) {
    const it = SHOP[key], lv = s.upgrades[key] || 0;
    if (!it || lv >= it.costs.length) return "max";
    if (s.dark < it.costs[lv]) return "cost";
    s.dark -= it.costs[lv];
    s.upgrades[key] = lv + 1;
    return "ok";
  }

  function taintStage(s) { return s.taint >= 100 ? 4 : s.taint >= 70 ? 3 : s.taint >= 42 ? 2 : s.taint >= 18 ? 1 : 0; }

  G.Game = { canPair, pview, pairFlip, heroOf, canSecond, secondSortie, finalizeLoss, swapHero, rescueAlly, addSequelae, SEQUELAE, HEROES, pget, freshPersonal, syncHero, PERSONAL, reintResult, pastEpisode, epCtx, EP_PART, epPart, ail, advanceOf, NATURAL, equipSkill, writeDoc, upgradeSave, ailmentName, placeName, ITEMS, AILMENTS, SHOP, SCALE_NAME, LEVEL_NAME, MAINS, requestTitle, forgeSize, newSave, morning, resolveConfront, assign, prep, deckFor, freeCandidates, startDive, makeFloor, afterFloor, finishDive, audit, rereportChoice, treat, endDay, rest, buy, taintStage };
})();
if (typeof module !== "undefined") module.exports = G;
