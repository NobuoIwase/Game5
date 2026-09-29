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
                    atk: { kind: "shot", range: 4.5, windup: 1.0, cd: 3.4, power: 1.1, fan: 0.4, alsoGrab: 1.7 }, desc: "囁きの波を扇状に放ち、動きを止めてから絡める" },
    gazer:        { name: "催眠のゲイズ",     type: "惑", art: "gazer.png",        hp: 28, spd: 1.0, r: 0.45, sight: 7, fov: 120, behavior: "float", cost: 3, ct: 9,
                    atk: { kind: "shot", range: 5, windup: 1.1, cd: 3.6, power: 1.2, fan: 0.55 }, desc: "目から光の扇を放ち、浴びた相手を呆けさせる" },
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

    // ---- Game4 から移した魔物（絵も Game4 の描画コードで描き出したもの） ----
    // breath: 近くにいるだけで甘い息（蕩）。発情が強いと、ふらりと花の方へ寄ってしまう
    nikubana:     { name: "肉花",             type: "蕩", art: "nikubana.png",     hp: 48, spd: 0,   r: 0.55, sight: 3.5, fov: 360, behavior: "static", cost: 3, ct: 10,
                    atk: { kind: "grab", range: 1.5, windup: 0.5, cd: 3.2, power: 1.1, breath: { range: 3.2, power: 0.35 } }, desc: "道端に据わって待つ肉の花。甘い息で誘い、寄ってきた脚を花びらで食む" },
    dakitake:     { name: "抱き茸",           type: "蕩", art: "dakitake.png",     hp: 55, spd: 0,   r: 0.6, sight: 2.2, fov: 360, behavior: "static", cost: 4, ct: 11,
                    atk: { kind: "grab", range: 1.25, windup: 0.9, cd: 3.6, power: 1.2 }, desc: "人の背丈ほどの柔らかい茸。傘をかぶせて閉じ込め、温かい襞で撫でつづける" },
    // cloud: 漂った跡に媚薬の靄を残す。倒すと大きく弾けて靄になる
    kouryuu:      { name: "媚香玉",           type: "蕩", art: "kouryuu.png",      hp: 16, spd: 0.9, r: 0.4, sight: 5, fov: 360, behavior: "float", cost: 3, ct: 8,
                    atk: { kind: "aura", range: 1.0, power: 0.6, cloud: { every: 2.4, r: 1.1, life: 6, power: 0.4 }, popCloud: { r: 1.8, life: 7, power: 0.5 } }, desc: "桃色の靄を吐きながら漂う玉。通った跡がそのまま甘い霧になる。倒すと弾けて広がる" },
    // possess: 腕に憑く。憑かれている間は光弾が撃てず（自分の胸を撃つことになる）、その手に撫でられつづける。果てると離れる
    tsukite:      { name: "憑き手",           type: "惑", art: "tsukite.png",      hp: 14, spd: 2.0, r: 0.35, sight: 6, fov: 300, behavior: "float", cost: 3, ct: 9,
                    atk: { kind: "possess", range: 0.9, windup: 0.45, cd: 3, power: 1.0, dur: 9 }, desc: "夜気が手の形に凝ったもの。袖から入り込んで腕に憑き、その腕で本人を撫でさせる" },
    // surge: 当たると、準備を待たずに快感が跳ね上がる
    shousha:      { name: "照射触手",         type: "蕩", art: "shousha.png",      hp: 30, spd: 0.5, r: 0.45, sight: 7, fov: 200, behavior: "lurk", cost: 5, ct: 12,
                    atk: { kind: "shot", range: 6, windup: 1.0, cd: 6.5, power: 0.8, proj: "beam", surge: 40 }, desc: "先端に水晶の眼を持つ細い触手。細い光条に撃たれた身体は、準備を待たずに上り詰める。撃った後はしばらく眼を閉じる" },
    // spread: 扇に何発か撃つ／sigil: 当たるたびに淫紋が一つ深くなる（その潜行のあいだ蕩が効きやすい）
    banjin:       { name: "遺跡の番人",       type: "蕩", art: "banjin.png",       hp: 60, spd: 0,   r: 0.55, sight: 6.5, fov: 360, behavior: "static", cost: 4, ct: 12,
                    atk: { kind: "shot", range: 5.5, windup: 1.2, cd: 4.2, power: 0.6, proj: "sigil", spread: 3, sigil: 1 }, desc: "祈るように膝をつく石像。額の紋が光ると、淫紋の光弾を扇に三つ放つ。当たるたび、下腹に紋が刻まれる" },
    // film: 見られているあいだに達すると、その姿が記録に残る
    medama:       { name: "覗き目玉",         type: "惑", art: "medama.png",       hp: 18, spd: 1.3, r: 0.4, sight: 7, fov: 360, behavior: "float", cost: 2, ct: 7,
                    atk: { kind: "aura", range: 5.5, power: 0.9, gaze: true, film: true }, desc: "瞼のない眼が翼で浮いている。近づかず、離れず、ただ見ている。見られながら達した姿は、記録に残る" },
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
    gate:    { name: "採寸門",     type: "絡", effect: "gate",    radius: 1.0, detect: 0.2, cost: 4, ct: 14, rearm: 30, big: true, desc: "真鍮の腕が伸び、受け台へ押し当てて全身を測る" },
    cuffs:   { name: "壁の環",     type: "絡", effect: "cuffs",   radius: 1.0, detect: 0.15, cost: 4, ct: 14, rearm: 30, big: true, desc: "扉が落ち、壁の鉄環が手首を留める。そして、何かが来るのを待たせる" },
    bed:     { name: "偽りの褥",   type: "惑", effect: "bed",     radius: 1.3, detect: 0.08, cost: 3, ct: 14, rearm: 40, big: true, desc: "乾いた寝台。傍を通る者に甘い香を吹きかけ、催眠で眠らせる" },
    spring:  { name: "乳白の湯",   type: "蕩", effect: "spring",  radius: 1.2, detect: 0.08, cost: 3, ct: 14, rearm: 40, big: true, lure: true, desc: "白く濁った湯。汚れを落としに浸かった者を、湯そのものが抱き込む" },
    // Game2 の罠をさらに移したもの
    slime_drop: { name: "粘体落とし", type: "蕩", effect: "slimeDrop", radius: 0.9, detect: 0.2,  cost: 3, ct: 10, rearm: 22, desc: "天井の継ぎ目が開き、重い粘体が真上から落ちてくる" },
    bud:     { name: "吊花の蕾",   type: "蕩", effect: "bud",     radius: 1.0, detect: 0.25, cost: 3, ct: 12, rearm: 24, big: true, desc: "天井から下がる蕾。足音に首をもたげ、蔓で足首を取って逆さに吊り、蜜を垂らす" },
    root:    { name: "蝕根の床",   type: "絡", effect: "root",    radius: 1.0, detect: 0.12, cost: 4, ct: 14, rearm: 30, big: true, desc: "床の継ぎ目から細い根が這い出し、腰から下を床下へ引き込む。上からは、下で何が起きているか見えない" },
    cocoon:  { name: "白繭",       type: "絡", effect: "cocoon",  radius: 1.1, detect: 0.2,  cost: 4, ct: 14, rearm: 34, big: true, desc: "白い菌糸が身体を包み、温かい繭に閉じ込める。小刀では切れない。中は湿って、熱がゆっくり溜まる" },
    ratchet: { name: "爪車の枠",   type: "絡", effect: "ratchet", radius: 1.0, detect: 0.18, cost: 4, ct: 14, rearm: 34, big: true, desc: "鉄の枠が俯せに抱え込む。もがくたび歯車が一つ鳴り、戻る歯は一つもない。決まった時間で開く" },
    altar:   { name: "淫紋の祭壇", type: "蕩", effect: "altar",   radius: 1.3, detect: 0.15, cost: 4, ct: 16, rearm: 40, big: true, desc: "黒い炎が影を引き、祭壇の紋を影伝いに下腹へ写す。踏ん張って押し返そうとするほど、深く焼き付く" },
    shadow:  { name: "影腕の燭",   type: "絡", effect: "shadow",  radius: 1.2, detect: 0.15, cost: 4, ct: 14, rearm: 30, big: true, desc: "四方の燭台が灯り、足元の影から腕が生える。腕は時とともに増え、光弾はすり抜ける" },
    // Game4 の設置物
    tower:   { name: "囁きの塔",   type: "惑", effect: "tower",   radius: 3.6, detect: 0.5,  cost: 3, ct: 12, rearm: 10, emit: true, desc: "細い石の塔。間をおいて囁きの波を放ち、近くにいる者の頭を痺れさせ、塔の方へ歩かせる" },
  };

  /* ---- 罠部屋（Game2 の「区画まるごとが一つの仕掛け」をなぞる） ----
   * 部屋ごとに仕掛けが一つ。その部屋に合う魔物が眠って潜み、踏み込むと一斉に目を覚ます。
   * center: 部屋の真ん中に据える罠 / traps: 部屋に散らす罠 / den: 潜んでいる魔物 [種, 数]
   * seal: 踏み込むと扉が閉まる秒数 / aura: 部屋にいる間ずっと効く [系統, 強さ] / from: 深さ（この階から出る）
   */
  G.TRAP_ROOMS = {
    vine_hall:   { name: "縛蔦の間",   type: "絡", from: 1, center: "vine", den: [["hanging_vine", 5]], desc: "幾房もの蔦が垂れ下がる。下を通ろうとした瞬間、四肢へ巻きつく" },
    kote_swarm:  { name: "小手の群れ", type: "絡", from: 2, den: [["puppet_hand", 6]], desc: "床一面に、小さな手が息を潜めている" },
    tent_pit:    { name: "触腕の坑",   type: "絡", from: 4, center: "rope", den: [["roper", 2], ["gulper_worm", 1]], seal: 6, desc: "床の坑から、太い触腕が這い出してくる" },
    idle_cell:   { name: "不作為の間", type: "絡", from: 1, center: "cuffs", den: [["goblin", 2]], seal: 12, wake: 4, desc: "扉が落ち、手首が壁に留められる。何が来るかは、待つしかない" },
    caliper:     { name: "採寸門",     type: "絡", from: 1, center: "gate", den: [["puppet_hand", 2]], desc: "回廊を塞ぐ真鍮の門。人型に凹んだ受け台がある" },
    feed_belt:   { name: "送り帯",     type: "絡", from: 3, center: "belt", traps: ["belt", "glue"], den: [["pot", 1]], desc: "床の帯が、奥の壺へ向かって流れている" },
    pillory:     { name: "晒し台",     type: "絡", from: 2, center: "pillory", den: [["goblin", 3]], wake: 3, desc: "部屋の真ん中に、首と手首を挟む板。物音がすれば、見物が集まる" },
    foam_cell:   { name: "泡沫の檻",   type: "蕩", from: 2, den: [["slime", 3]], seal: 8, aura: ["蕩", 0.35], desc: "扉が閉まると、床から温い泡が湧き上がる" },
    mist_hall:   { name: "霧の広間",   type: "蕩", from: 1, den: [["lure_cap", 2], ["fluff", 3]], aura: ["蕩", 0.5], desc: "甘い霧が立ち込める。吸うほど、体が火照る" },
    gel_urn:     { name: "甘露の甕",   type: "蕩", from: 5, center: "urn", den: [["slime", 2], ["jellyfish", 2]], desc: "大甕から、蜜のような粘りが溢れている" },
    tease_rack:  { name: "焦らしの台", type: "蕩", from: 2, center: "tease", den: [["peeper", 2]], desc: "寝台と、それを見下ろす無数の目" },
    hot_spring:  { name: "乳白の湯",   type: "蕩", from: 4, center: "spring", den: [["slime", 2]], desc: "白く濁った湯が湧いている。休めそうに見える" },
    fungal_bed:  { name: "偽りの褥",   type: "惑", from: 3, center: "bed", den: [["lure_cap", 2]], desc: "埃ひとつない小部屋に、寝台が一つ" },
    purify:      { name: "清めの手水", type: "削", from: 1, center: "basin", den: [["ghost_head", 2]], desc: "澄んだ水盤。身を清めれば、熱も引きそうに見える" },
    mirror_hall: { name: "幻影の鏡廊", type: "惑", from: 3, traps: ["mirror", "mirror"], den: [["mirror_slime", 2]], desc: "壁一面の鏡に、自分が何人も映る" },
    hypno_bell:  { name: "催眠の鈴",   type: "惑", from: 4, traps: ["bell", "bell", "bell"], den: [["mind_roper", 1]], desc: "天井から無数の鈴が下がっている" },
    twin_shadow: { name: "双影の燭",   type: "惑", from: 2, traps: ["decoy", "decoy"], den: [["gazer", 2]], desc: "燭台の火が揺れるたび、影が二つに増える" },
    dreamwalk:   { name: "夢渡り",     type: "惑", from: 4, den: [["imp", 2], ["moth", 2]], aura: ["惑", 0.4], desc: "足を踏み入れると、夢と現の境が薄くなる" },
    // ---- Game2・Game4 から移した罠部屋 ----
    slime_ceil:  { name: "粘体落としの間", type: "蕩", from: 2, traps: ["slime_drop", "slime_drop", "slime_drop"], den: [["slime", 2]], desc: "天井の石に、継ぎ目がやけに多い。床には乾ききらない水たまり" },
    bud_hall:    { name: "吊花の廊",   type: "蕩", from: 3, center: "bud", traps: ["bud"], den: [["nikubana", 1], ["fluff", 2]], desc: "天井いっぱいに、白い蕾が隙間なく下がっている" },
    flower_bed:  { name: "肉花の庭",   type: "蕩", from: 2, den: [["nikubana", 3]], aura: ["蕩", 0.3], desc: "道の端に、人ひとりが収まるほどの花が咲いている。襲ってはこない。ただ、口を開けて待っている" },
    incense_pool:{ name: "媚香の淀み", type: "蕩", from: 3, den: [["kouryuu", 3]], seal: 6, aura: ["蕩", 0.35], desc: "桃色の靄が床に溜まり、膝の高さで揺れている" },
    hug_grove:   { name: "抱き茸の森", type: "蕩", from: 4, den: [["dakitake", 2], ["lure_cap", 1]], aura: ["蕩", 0.25], desc: "人の背丈ほどの茸が、柔らかく傘を揺らしている" },
    beam_hall:   { name: "照射の回廊", type: "蕩", from: 5, den: [["shousha", 2], ["peeper", 2]], desc: "壁の穴から、水晶の眼をもつ細い触手が覗いている。見物の目も" },
    seal_altar:  { name: "淫紋の祭壇", type: "蕩", from: 6, center: "altar", den: [["banjin", 2]], wake: 3, desc: "突き当たりに黒い石の祭壇。左右の燭台が、踏み込むのと同時に灯る" },
    root_floor:  { name: "蝕根の床",   type: "絡", from: 3, center: "root", den: [["puppet_hand", 2], ["tsukite", 1]], desc: "床石の継ぎ目から、髪の毛ほどの根が数えきれないほど出ている" },
    cocoon_room: { name: "白繭の室",   type: "絡", from: 5, center: "cocoon", den: [["dakitake", 1]], seal: 8, aura: ["蕩", 0.25], desc: "壁も床も天井も、白い菌糸に厚く覆われた丸い小室。空気が生温く、湿っている" },
    ratchet_room:{ name: "爪車",       type: "絡", from: 5, center: "ratchet", den: [["goblin", 2]], wake: 5, desc: "何もない小部屋。床に一本、細い溝が端から端まで走っている" },
    shadow_hall: { name: "影腕の広間", type: "絡", from: 4, center: "shadow", den: [["tsukite", 2]], seal: 7, desc: "円い広間。壁の四方に燭台が一基ずつ据えてある" },
    whisper:     { name: "囁きの塔",   type: "惑", from: 3, center: "tower", den: [["gazer", 1], ["medama", 2]], desc: "部屋の真ん中に、細い石の塔が立っている。耳の奥が、ずっとくすぐったい" },
  };

  /* ---- ダンジョン ---- 固定枠4＋自由枠（候補から選ぶ）。削はどこでも自由枠に入れられる */
  const DRAIN = ["drain_roper", "ghost_head", "pot", "wisp"];
  G.DUNGEONS = {
    mist: { name: "霧鏡の回廊", type: "惑", floors: 10, pal: { floor: "#3a3548", floor2: "#342f42", wall: "#0e0b14", wallTop: "#6a6080", edge: "#5a4e74", fog: "#8a7cc0" },
            fixed: ["gazer", "mind_roper", "moth", "mirror_slime"], free: ["imp", "peeper", "tsukite", "medama", ...DRAIN], traps: ["bell", "mirror", "decoy", "shrine", "basin", "pillory", "belt", "tower", "shadow"],
            rooms: ["mirror_hall", "hypno_bell", "twin_shadow", "dreamwalk", "fungal_bed", "purify", "caliper", "pillory", "whisper", "shadow_hall"],
            desc: "鏡と霧の遺跡。見たものを信じるほど深く迷う" },
    mire: { name: "蜜溜まりの湿窟", type: "蕩", floors: 10, pal: { floor: "#43323a", floor2: "#3b2c33", wall: "#100a0c", wallTop: "#7a5a64", edge: "#7a4a5c", fog: "#c07a98" },
            fixed: ["slime", "slug", "jellyfish", "lure_cap"], free: ["fluff", "nikubana", "dakitake", "kouryuu", "shousha", "banjin", ...DRAIN], traps: ["glue", "vent", "urn", "shrine", "basin", "tease", "belt", "slime_drop", "bud", "altar"],
            rooms: ["foam_cell", "mist_hall", "gel_urn", "tease_rack", "hot_spring", "purify", "fungal_bed", "feed_belt", "slime_ceil", "bud_hall", "flower_bed", "incense_pool", "hug_grove", "beam_hall", "seal_altar", "cocoon_room"],
            desc: "甘い湿気の籠もる洞窟。息をするだけで熱がこもる" },
    vine: { name: "絡繰りの蔦森", type: "絡", floors: 10, pal: { floor: "#323d34", floor2: "#2c362e", wall: "#0a0e0b", wallTop: "#5e6a5c", edge: "#4a6a52", fog: "#7ab08a" },
            fixed: ["roper", "hanging_vine", "puppet_hand", "gulper_worm"], free: ["goblin", "mimic", "nikubana", "tsukite", ...DRAIN], traps: ["vine", "rope", "glue", "shrine", "basin", "pillory", "belt", "root", "cocoon", "ratchet", "shadow"],
            rooms: ["vine_hall", "kote_swarm", "tent_pit", "idle_cell", "caliper", "feed_belt", "pillory", "fungal_bed", "purify", "root_floor", "cocoon_room", "ratchet_room", "shadow_hall", "flower_bed"],
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
    flash: { cost: 12, cd: 14, radius: 2.3, push: 1.3, stun: 1.2 },   // ルミナ・フラッシュ（囲まれた・二か所以上掴まれた時に弾き飛ばす）
    breakout: { cd: 5, dist: 2.8 },                                    // 囲まれたら、空いている方へ突き抜ける
    mpRegen: 1.8, mpRest: 5.5,
    noTransform: 25,                                       // 変身が解けてから、また変身できるまで（秒）
    transformCast: 1.6,                                    // 星の雫で変身し直すのにかかる時間
    kit: { star: 2, salve: 2, smelling: 1, ether: 2, cool: 0, knife: 0 },
    // 装備（今はフレーバー。変身中と素の姿で入れ替わる）
    equip: {
      magica:   ["星杖「スターライト・ロッド」", "魔法衣装（白と菫）", "変身のコンパクト", "相棒の妖精（プラム）"],
      civilian: ["セーラー服", "変身のコンパクト", "相棒の妖精（プラム・鞄の中）"],
    },
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
