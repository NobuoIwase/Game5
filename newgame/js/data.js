/* data.js — 魔物・罠・ダンジョン・準備の品・数値。DOM に触れない
 *
 * 系統（type）：惑＝催眠・魅了・幻／蕩＝媚薬・粘液・熱／絡＝触手・拘束／削＝魔力を削る
 * 距離の単位はマス（1マス＝床タイル1枚）、時間は秒。
 */
var G = (typeof G !== "undefined") ? G : {};
(function () {
  "use strict";

  G.TYPES = ["惑", "蕩", "絡"];          // 三すくみ（依頼書に書ける系統）
  G.ALL_TYPES = ["惑", "蕩", "絡", "削"];

  /* ---- 魔物 ----
   * behavior: wander（歩き回る）/ lurk（その場で待ち伏せ）/ static（動かない）/ float（漂う）
   * atk.kind:
   *   grab  … 届けば捕まえる（拘束）。type が蕩なら包み込み、絡なら巻き付き
   *   shot  … 弾を撃つ（当たると type の効き目）
   *   aura  … まわりに効き続ける（胞子・鱗粉・視線）
   *   lure  … 惹きつけて呼び寄せる（惑）
   *   drain … 近くにいるだけで魔力を吸う（削）
   */
  G.MONSTERS = {
    slime:        { name: "スライム",         type: "蕩", art: "slime.png",        hp: 30, spd: 1.0, r: 0.45, sight: 5, fov: 360, behavior: "wander", cost: 2, ct: 6,
                    atk: { kind: "grab", range: 0.8, windup: 0.6, cd: 2.5, power: 1.0 }, desc: "包み込んで離さない。中は温かい" },
    slug:         { name: "大湿殻",           type: "蕩", art: "slug.png",         hp: 40, spd: 0.6, r: 0.5, sight: 5, fov: 200, behavior: "lurk", cost: 3, ct: 8,
                    atk: { kind: "shot", range: 4.5, windup: 0.9, cd: 3.2, power: 1.0, proj: "mucus" }, desc: "粘液を吐きかける。浴びると熱が引かない" },
    jellyfish:    { name: "浮遊水母",         type: "蕩", art: "jellyfish.svg",    hp: 22, spd: 1.2, r: 0.45, sight: 5, fov: 360, behavior: "float", cost: 3, ct: 7,
                    atk: { kind: "grab", range: 1.1, windup: 0.5, cd: 2.4, power: 0.8 }, desc: "垂れた触手で絡め、痺れる熱を流し込む" },
    lure_cap:     { name: "媚芯茸",           type: "蕩", art: "lure_cap.png",     hp: 26, spd: 0,   r: 0.45, sight: 3, fov: 360, behavior: "static", cost: 2, ct: 9,
                    atk: { kind: "aura", range: 2.6, power: 1.0 }, desc: "甘い胞子を撒く。吸うほど体が火照る" },
    fluff:        { name: "綿毛",             type: "蕩", art: "fluff.png",        hp: 6,  spd: 0.8, r: 0.35, sight: 6, fov: 360, behavior: "float", cost: 1, ct: 4,
                    atk: { kind: "aura", range: 0.9, power: 1.6, burst: true }, desc: "漂ってきて、触れると弾ける。倒しても弾ける" },
    roper:        { name: "ローパー",         type: "絡", art: "roper.svg",        hp: 50, spd: 0.7, r: 0.55, sight: 5, fov: 360, behavior: "lurk", cost: 4, ct: 10,
                    atk: { kind: "grab", range: 1.9, windup: 0.8, cd: 3.0, power: 1.2 }, desc: "長い触手で遠くから絡め取る" },
    hanging_vine: { name: "垂れ蔦",           type: "絡", art: "hanging_vine.svg", hp: 30, spd: 0,   r: 0.5, sight: 2.2, fov: 360, behavior: "static", cost: 2, ct: 8, hidden: true,
                    atk: { kind: "grab", range: 1.7, windup: 0.3, cd: 2.5, power: 1.0 }, desc: "天井から垂れ、真下を通った者を吊り上げる" },
    puppet_hand:  { name: "傀儡手",           type: "絡", art: "puppet_hand.png",  hp: 16, spd: 2.2, r: 0.35, sight: 6, fov: 220, behavior: "wander", cost: 2, ct: 5,
                    atk: { kind: "grab", range: 0.8, windup: 0.3, cd: 2.0, power: 0.6 }, desc: "床を這い、足首をつかむ。数で来る" },
    gulper_worm:  { name: "丸呑みワーム",     type: "絡", art: "gulper_worm.png",  hp: 45, spd: 1.4, r: 0.55, sight: 5, fov: 180, behavior: "wander", cost: 4, ct: 10,
                    atk: { kind: "grab", range: 0.9, windup: 0.9, cd: 3.5, power: 1.4 }, desc: "足から呑み込もうとする。抜けるには力がいる" },
    mimic:        { name: "ミミック",         type: "絡", art: "mimic.svg",        hp: 35, spd: 0,   r: 0.5, sight: 1.6, fov: 360, behavior: "static", cost: 3, ct: 12, chest: true,
                    atk: { kind: "grab", range: 1.3, windup: 0.2, cd: 3.0, power: 1.2 }, desc: "宝箱のふり。開けに来た手を引きずり込む" },
    goblin:       { name: "ゴブリン",         type: "絡", art: "goblin.png",       hp: 20, spd: 2.0, r: 0.4, sight: 6, fov: 200, behavior: "wander", cost: 3, ct: 8, pack: 2,
                    atk: { kind: "grab", range: 0.8, windup: 0.5, cd: 2.2, power: 0.9 }, desc: "群れで来て、押さえ込む" },
    mind_roper:   { name: "マインドローパー", type: "惑", art: "mind_roper.svg",   hp: 45, spd: 0.7, r: 0.55, sight: 6, fov: 360, behavior: "lurk", cost: 4, ct: 10,
                    atk: { kind: "shot", range: 5, windup: 1.0, cd: 3.4, power: 1.1, proj: "psy", alsoGrab: 1.7 }, desc: "頭の中へ直接囁き、動きを止めてから絡める" },
    gazer:        { name: "催眠のゲイズ",     type: "惑", art: "gazer.png",        hp: 28, spd: 1.0, r: 0.45, sight: 7, fov: 120, behavior: "float", cost: 3, ct: 9,
                    atk: { kind: "shot", range: 6, windup: 1.1, cd: 3.6, power: 1.2, proj: "beam" }, desc: "見つめた相手を呆けさせる" },
    moth:         { name: "灯蛾",             type: "惑", art: "moth.png",         hp: 14, spd: 2.0, r: 0.4, sight: 6, fov: 360, behavior: "float", cost: 2, ct: 6,
                    atk: { kind: "aura", range: 1.9, power: 0.9 }, desc: "鱗粉で頭をぼんやりさせる" },
    imp:          { name: "小淫魔",           type: "惑", art: "imp.png",          hp: 24, spd: 2.4, r: 0.4, sight: 7, fov: 240, behavior: "wander", cost: 4, ct: 10, flee: true,
                    atk: { kind: "lure", range: 5, windup: 0.8, cd: 4.0, power: 1.0 }, desc: "甘い声で呼び寄せる。傷つくと逃げる" },
    peeper:       { name: "覗き子",           type: "惑", art: "peeper.png",       hp: 10, spd: 0.5, r: 0.3, sight: 5, fov: 90, behavior: "lurk", cost: 1, ct: 5,
                    atk: { kind: "aura", range: 5, power: 0.6, gaze: true }, desc: "責めない。ただ、じっと見ている" },
    mirror_slime: { name: "鏡面スライム",     type: "惑", art: "mirror_slime.svg", hp: 30, spd: 1.0, r: 0.45, sight: 5, fov: 360, behavior: "wander", cost: 3, ct: 8, reflect: 0.35,
                    atk: { kind: "grab", range: 0.8, windup: 0.6, cd: 2.6, power: 0.9 }, desc: "光を映して跳ね返す。映った自分に見とれる" },
    drain_roper:  { name: "ドレインローパー", type: "削", art: "drain_roper.svg",  hp: 45, spd: 0.7, r: 0.55, sight: 5, fov: 360, behavior: "lurk", cost: 4, ct: 11,
                    atk: { kind: "grab", range: 1.8, windup: 0.8, cd: 3.2, power: 0.8, drain: 3 }, desc: "絡めた先から魔力を吸い上げる" },
    ghost_head:   { name: "ゴーストヘッド",   type: "削", art: "ghost_head.png",   hp: 20, spd: 1.6, r: 0.45, sight: 6, fov: 360, behavior: "float", cost: 3, ct: 8,
                    atk: { kind: "drain", range: 2.2, power: 1.0 }, desc: "近くにいるだけで魔力が抜けていく" },
    pot:          { name: "触手壺",           type: "削", art: "pot.png",          hp: 40, spd: 0,   r: 0.5, sight: 3, fov: 360, behavior: "static", cost: 3, ct: 10,
                    atk: { kind: "drain", range: 2.6, power: 1.3, legGrab: 1.0 }, desc: "近づいた者の力を吸い込み、脚を絡める" },
    wisp:         { name: "漂い霊",           type: "削", art: "wisp.svg",         hp: 12, spd: 2.2, r: 0.35, sight: 7, fov: 360, behavior: "float", cost: 2, ct: 6,
                    atk: { kind: "shot", range: 5, windup: 0.7, cd: 2.6, power: 1.0, proj: "cold" }, desc: "冷たい火を投げる。当たると魔力が凍える" },
  };

  /* ---- 罠（置いてある物） ----
   * effect: bell（足止め＋惑）/ mirror（偽の道へ誘う）/ decoy（偽の影で無駄撃ち）/ glue（足止め）/ vent（香り）
   *         urn（浴びせる）/ vine（足に絡む）/ rope（縛る）/ shrine（休むと吸う）/ basin（変身の力が抜ける）
   */
  G.TRAPS = {
    bell:   { name: "催眠の鈴",   type: "惑", effect: "bell",   radius: 1.6, detect: 0.35, cost: 2, ct: 8, rearm: 9,  desc: "近くを通ると鳴り、足が止まってぼんやりする" },
    mirror: { name: "幻影の鏡廊", type: "惑", effect: "mirror", radius: 1.5, detect: 0.25, cost: 2, ct: 10, rearm: 14, desc: "映った偽の通路へ誘い込む" },
    decoy:  { name: "双影の燭",   type: "惑", effect: "decoy",  radius: 3.5, detect: 0.2,  cost: 2, ct: 9, rearm: 12, desc: "偽の影を見せ、魔法を無駄撃ちさせる" },
    glue:   { name: "粘着床",     type: "蕩", effect: "glue",   radius: 0.8, detect: 0.4,  cost: 1, ct: 5, rearm: 6,  desc: "踏むと足が取られる" },
    vent:   { name: "香油の廊",   type: "蕩", effect: "vent",   radius: 2.2, detect: 0.3,  cost: 2, ct: 8, rearm: 7,  desc: "甘い香りを噴き、熱を溜める" },
    urn:    { name: "甘露の甕",   type: "蕩", effect: "urn",    radius: 1.3, detect: 0.5,  cost: 2, ct: 9, rearm: 16, desc: "近づくと中身が溢れ、浴びせかける" },
    vine:   { name: "縛蔦の間",   type: "絡", effect: "vine",   radius: 0.9, detect: 0.3,  cost: 2, ct: 7, rearm: 8,  desc: "床の蔦が足首に絡みつく" },
    rope:   { name: "爪車の縄",   type: "絡", effect: "rope",   radius: 0.9, detect: 0.25, cost: 3, ct: 10, rearm: 14, desc: "張られた縄が引かれ、腕ごと縛られる" },
    shrine: { name: "偽りの祠",   type: "削", effect: "shrine", radius: 1.2, detect: 0.1,  cost: 2, ct: 12, rearm: 20, lure: true, desc: "休めそうに見える。休むと魔力を吸われる" },
    basin:  { name: "清めの手水", type: "削", effect: "basin",  radius: 1.0, detect: 0.1,  cost: 2, ct: 12, rearm: 20, lure: true, desc: "清めの水に見える。触れると変身の力が抜ける" },
    // Game2 の部屋型の罠（部屋の真ん中に据える大仕掛け）
    pillory: { name: "晒し台",     type: "絡", effect: "pillory", radius: 1.1, detect: 0.2, cost: 4, ct: 14, rearm: 30, big: true, desc: "踏み込むと首と手首を固定される。物音で魔物が集まってくる" },
    tease:   { name: "焦らしの台", type: "蕩", effect: "tease",   radius: 1.1, detect: 0.2, cost: 4, ct: 14, rearm: 30, big: true, desc: "寝台に縫い留め、熱だけを溜めさせる。果てさせてはくれない" },
    belt:    { name: "送り帯",     type: "絡", effect: "belt",    radius: 1.0, detect: 0.25, cost: 3, ct: 12, rearm: 18, big: true, desc: "床の帯が動き出し、捕らえた者を罠の奥へ運んでいく" },
  };

  /* ---- ダンジョン ---- 固定枠4＋自由枠（候補から選ぶ）。削はどこでも自由枠に入れられる */
  const DRAIN = ["drain_roper", "ghost_head", "pot", "wisp"];
  G.DUNGEONS = {
    mist: { name: "霧鏡の回廊", type: "惑", floors: 10, pal: { floor: "#3a3548", floor2: "#342f42", wall: "#1c1826", edge: "#5a4e74", fog: "#8a7cc0" },
            fixed: ["gazer", "mind_roper", "moth", "mirror_slime"], free: ["imp", "peeper", ...DRAIN], traps: ["bell", "mirror", "decoy", "shrine", "basin", "pillory", "belt"],
            desc: "鏡と霧の遺跡。見たものを信じるほど深く迷う" },
    mire: { name: "蜜溜まりの湿窟", type: "蕩", floors: 10, pal: { floor: "#43323a", floor2: "#3b2c33", wall: "#1e1418", edge: "#7a4a5c", fog: "#c07a98" },
            fixed: ["slime", "slug", "jellyfish", "lure_cap"], free: ["fluff", ...DRAIN], traps: ["glue", "vent", "urn", "shrine", "basin", "tease", "belt"],
            desc: "甘い湿気の籠もる洞窟。息をするだけで熱がこもる" },
    vine: { name: "絡繰りの蔦森", type: "絡", floors: 10, pal: { floor: "#323d34", floor2: "#2c362e", wall: "#141c16", edge: "#4a6a52", fog: "#7ab08a" },
            fixed: ["roper", "hanging_vine", "puppet_hand", "gulper_worm"], free: ["goblin", "mimic", ...DRAIN], traps: ["vine", "rope", "glue", "shrine", "basin", "pillory", "belt"],
            desc: "蔦に呑まれた古い砦。道も壁も、ゆっくり動く" },
  };

  /* ---- ひかりの準備の品（依頼書に書かれた系統を見て、対策して来る） ----
   * guard: その系統の効き目を下げる／side: 副作用（別の系統の効き目が上がる、など）
   */
  G.PREP = {
    "惑": { id: "incense", name: "鎮心の香", guard: { "惑": 0.6 }, side: { "蕩": 1.5 }, numb: true,
            note: "心を鈍らせ、惑わされなくする。鈍った分、体の反応に気づきにくい" },
    "蕩": { id: "sealwear", name: "封肌の衣", guard: { "蕩": 0.6 }, side: { "絡": 1.5 }, slow: 0.82,
            note: "肌を覆って感覚を遮る。重く締め付け、身動きが取りにくい" },
    "絡": { id: "tonic", name: "覚醒の薬", guard: { "絡": 0.6 }, side: { "惑": 1.6 },
            note: "反射と力を高め、振りほどけるようにする。気が昂ぶり、暗示にかかりやすい" },
  };

  /* ---- ひかり ----
   * 素で惑に強い。変身中は絡にも強い。変身が解けると一気に崩れる */
  G.HIKARI = {
    name: "星野 ひかり", short: "ひかり", magicaName: "ルミナ",
    resist: {
      magica:   { "惑": 0.55, "蕩": 1.0, "絡": 0.6, "削": 1.0 },
      civilian: { "惑": 0.8,  "蕩": 1.35, "絡": 1.6, "削": 1.0 },
    },
    hpMax: 100, mpMax: 60, magicMax: 100, willMax: 100,
    spd: { magica: 2.9, civilian: 2.3 },
    shot: { dmg: 9, cost: 7, cd: 0.8, cast: 0.3, speed: 8, range: 6.5 },   // ルミナ・ショット（遠距離・消費大）
    melee: { dmg: 11, cost: 1, cd: 0.65, cast: 0.16, range: 1.35, arc: 1.25 },  // ルミナ・ストライク（杖で打つ・消費小）
    burst: { dmg: 14, cost: 18, cd: 5, cast: 0.7, radius: 2.3, magic: 3 },   // シャイン・バスター
    mpRegen: 1.8, mpRest: 5.5,
    noTransform: 25,                                       // 変身が解けてから、また変身できるまで（秒）
    transformCast: 1.6,                                    // 星の雫で変身し直すのにかかる時間
    kit: { star: 2, salve: 2, smelling: 1 },               // 星の雫・治癒の軟膏・気付け
  };

  G.BAL = {
    floorCost(f) { return 6 + f; },       // 階ごとのコストの上限
    maxLive: 4,                           // 同時に出していられる数（呼んだ分）
    nightBudget: 10,                      // 観測フェーズで使えるコスト
    nightBeats: 6,
    freeSlots: 2,
    passiveMagicDrain: 0.04,              // 変身を保つだけで減る魔力（毎秒）
  };
})();
if (typeof module !== "undefined") module.exports = G;
