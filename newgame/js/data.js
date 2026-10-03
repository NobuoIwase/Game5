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
    jellyfish:    { name: "浮遊水母",         type: "蕩", art: "jellyfish.png",    hp: 22, spd: 1.2, r: 0.45, sight: 5, fov: 360, behavior: "float", cost: 3, ct: 7,
                    atk: { kind: "grab", range: 1.1, windup: 0.5, cd: 2.4, power: 0.8 }, desc: "垂れた触手で絡め、痺れる熱を流し込む" },
    lure_cap:     { name: "媚芯茸",           type: "蕩", art: "lure_cap.png",     hp: 26, spd: 0,   r: 0.45, sight: 3, fov: 360, behavior: "static", cost: 2, ct: 9,
                    atk: { kind: "aura", range: 2.6, power: 1.0 }, desc: "甘い胞子を撒く。吸うほど体が火照る" },
    fluff:        { name: "綿毛",             type: "蕩", art: "fluff.png",        hp: 6,  spd: 0.8, r: 0.35, sight: 6, fov: 360, behavior: "float", cost: 1, ct: 4,
                    atk: { kind: "aura", range: 0.9, power: 1.6, burst: true }, desc: "漂ってきて、触れると弾ける。倒しても弾ける" },
    roper:        { name: "ローパー",         type: "絡", art: "roper.png",        hp: 50, spd: 0.7, r: 0.55, sight: 5, fov: 360, behavior: "lurk", cost: 4, ct: 10,
                    atk: { kind: "grab", range: 1.9, windup: 0.8, cd: 3.0, power: 1.2 }, desc: "長い触手で遠くから絡め取る" },
    hanging_vine: { name: "垂れ蔦",           type: "絡", art: "hanging_vine.png", hp: 30, spd: 0,   r: 0.5, sight: 2.2, fov: 360, behavior: "static", cost: 2, ct: 8, hidden: true,
                    atk: { kind: "grab", range: 1.7, windup: 0.3, cd: 2.5, power: 1.0 }, desc: "天井から垂れ、真下を通った者を吊り上げる" },
    puppet_hand:  { name: "傀儡手",           type: "絡", art: "puppet_hand.png",  hp: 16, spd: 2.2, r: 0.35, sight: 6, fov: 220, behavior: "wander", cost: 2, ct: 5,
                    atk: { kind: "grab", range: 0.8, windup: 0.3, cd: 2.0, power: 0.6 }, desc: "床を這い、足首をつかむ。数で来る" },
    gulper_worm:  { name: "丸呑みワーム",     type: "絡", art: "gulper_worm.png",  hp: 45, spd: 1.4, r: 0.55, sight: 5, fov: 180, behavior: "wander", cost: 4, ct: 10,
                    atk: { kind: "grab", range: 0.9, windup: 0.9, cd: 3.5, power: 1.4 }, desc: "足から呑み込もうとする。抜けるには力がいる" },
    mimic:        { name: "ミミック",         type: "絡", art: "mimic.png",        hp: 35, spd: 0,   r: 0.5, sight: 1.6, fov: 360, behavior: "static", cost: 3, ct: 12, chest: true,
                    atk: { kind: "grab", range: 1.3, windup: 0.2, cd: 3.0, power: 1.2 }, desc: "宝箱のふり。開けに来た手を引きずり込む" },
    goblin:       { name: "ゴブリン",         type: "絡", art: "goblin.png",       hp: 20, spd: 2.0, r: 0.4, sight: 6, fov: 200, behavior: "wander", cost: 3, ct: 8, pack: 2,
                    atk: { kind: "grab", range: 0.8, windup: 0.5, cd: 2.2, power: 0.9 }, desc: "群れで来て、押さえ込む" },
    mind_roper:   { name: "マインドローパー", type: "惑", art: "mind_roper.png",   hp: 45, spd: 0.7, r: 0.55, sight: 6, fov: 360, behavior: "lurk", cost: 4, ct: 10,
                    atk: { kind: "shot", range: 4.5, windup: 1.0, cd: 3.4, power: 1.1, fan: 0.4, alsoGrab: 1.7 }, desc: "囁きの波を扇状に放ち、動きを止めてから絡める" },
    gazer:        { name: "催眠のゲイズ",     type: "惑", art: "gazer.png",        hp: 28, spd: 1.0, r: 0.45, sight: 7, fov: 120, behavior: "float", cost: 3, ct: 9,
                    atk: { kind: "shot", range: 5, windup: 1.1, cd: 3.6, power: 1.2, fan: 0.55 }, desc: "目から光の扇を放ち、浴びた相手を呆けさせる" },
    moth:         { name: "灯蛾",             type: "惑", art: "moth.png",         hp: 14, spd: 2.0, r: 0.4, sight: 6, fov: 360, behavior: "float", cost: 2, ct: 6,
                    atk: { kind: "aura", range: 1.9, power: 0.9 }, desc: "鱗粉で頭をぼんやりさせる" },
    imp:          { name: "小淫魔",           type: "惑", art: "imp.png",          hp: 24, spd: 2.4, r: 0.4, sight: 7, fov: 240, behavior: "wander", cost: 4, ct: 10, flee: true,
                    atk: { kind: "lure", range: 5, windup: 0.8, cd: 4.0, power: 1.0 }, desc: "甘い声で呼び寄せる。傷つくと逃げる" },
    peeper:       { name: "覗き子",           type: "惑", art: "peeper.png",       hp: 10, spd: 0.5, r: 0.3, sight: 5, fov: 90, behavior: "lurk", cost: 1, ct: 5,
                    atk: { kind: "aura", range: 5, power: 0.6, gaze: true }, desc: "責めない。ただ、じっと見ている" },
    mirror_slime: { name: "鏡面スライム",     type: "惑", art: "mirror_slime.png", hp: 30, spd: 1.0, r: 0.45, sight: 5, fov: 360, behavior: "wander", cost: 3, ct: 8, reflect: 0.35,
                    atk: { kind: "grab", range: 0.8, windup: 0.6, cd: 2.6, power: 0.9 }, desc: "光を映して跳ね返す。映った自分に見とれる" },
    drain_roper:  { name: "ドレインローパー", type: "削", art: "drain_roper.png",  hp: 45, spd: 0.7, r: 0.55, sight: 5, fov: 360, behavior: "lurk", cost: 4, ct: 11,
                    atk: { kind: "grab", range: 1.8, windup: 0.8, cd: 3.2, power: 0.8, drain: 3 }, desc: "絡めた先から魔力を吸い上げる" },
    ghost_head:   { name: "ゴーストヘッド",   type: "削", art: "ghost_head.png",   hp: 20, spd: 1.6, r: 0.45, sight: 6, fov: 360, behavior: "float", cost: 3, ct: 8,
                    atk: { kind: "drain", range: 2.2, power: 1.0 }, desc: "近くにいるだけで魔力が抜けていく" },
    pot:          { name: "触手壺",           type: "削", art: "pot.png",          hp: 40, spd: 0,   r: 0.5, sight: 3, fov: 360, behavior: "static", cost: 3, ct: 10,
                    atk: { kind: "drain", range: 2.6, power: 1.3, legGrab: 1.0 }, desc: "近づいた者の力を吸い込み、脚を絡める" },
    wisp:         { name: "漂い霊",           type: "削", art: "wisp.png",         hp: 12, spd: 2.2, r: 0.35, sight: 7, fov: 360, behavior: "float", cost: 2, ct: 6,
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
    // ---- 淫魔（Game4 の絵／Game2 の双子） ----
    // deny: 絶頂を禁じる（快感は溜まるのに、あと少しで止まる。解けた時に溜まった分が来る）／command: 近くの魔物を急かす
    inma:         { name: "寸止めの淫魔",     type: "惑", art: "inma.png",         hp: 32, spd: 1.6, r: 0.45, sight: 7, fov: 360, behavior: "float", cost: 5, ct: 12, flee: true, command: 4,
                    atk: { kind: "deny", range: 5, windup: 0.9, cd: 9, power: 0.6, dur: 8 }, desc: "指先ひとつで快感に栓をする淫魔。自分では責めない。近くの魔物を急かし、溢れた分を身体に溜めさせてから、栓を抜く" },
    // omazuke: 寸前まで引き上げて止める。三度止められると、ひかりはねだってしまう。そこで初めて許しが出る／summon: 小淫魔を呼ぶ
    muma_queen:   { name: "夢魔の女王",       type: "惑", art: "muma_queen.png",   hp: 90, spd: 0.8, r: 0.6, sight: 7, fov: 360, behavior: "float", cost: 8, ct: 20, command: 5, summon: { kind: "imp", every: 14, max: 3 },
                    atk: { kind: "omazuke", range: 4.5, windup: 1.2, cd: 7, power: 0.8 }, desc: "淫魔たちの女王。栓はしない。責めを一瞬だけ止めて、寸前で引き戻す。三度目で、彼女のほうからねだらせる" },
    // pair: 必ず二体で出る／whisper: 両側から囁く（触れない責め）。二体とも近いと強い
    futago:       { name: "双子の小淫魔",     type: "惑", art: "futago.png",       hp: 12, spd: 2.2, r: 0.35, sight: 7, fov: 360, behavior: "float", cost: 4, ct: 10, pair: true, flee: true,
                    atk: { kind: "aura", range: 2.2, power: 0.7, whisper: true }, desc: "瓜二つの小さな淫魔。触れない。左右から耳元で、別々のことを囁きつづける" },
    // ---- ワルドー（Game2：ひかりの宿敵。催眠と洗脳で人を戦闘員に変える組織） ----
    // musk: 近くにいると雄の臭い。発情していると、つい嗅いでしまう
    waldo_grunt:  { name: "ワルドー戦闘員",   type: "絡", art: "waldo_grunt.png",  hp: 16, spd: 2.1, r: 0.4, sight: 6, fov: 200, behavior: "wander", cost: 3, ct: 7, pack: 3, musk: 1.6, waldo: true,
                    atk: { kind: "grab", range: 0.8, windup: 0.5, cd: 2.2, power: 0.8 }, desc: "全身タイツの戦闘員。数で押さえ込み、捕らえて同じ戦闘員にしようとする" },
    // ひかりを失った後だけ出る：洗脳された元・魔法少女（倒しても、退いていくだけ）
    lumina_grunt: { name: "戦闘員の女その1", type: "惑", art: "../hikari/hikari_waldo_magica_front_1.png", hp: 46, spd: 2.0, r: 0.4, sight: 7, fov: 220, behavior: "wander", cost: 9, ct: 30, waldo: true, special: true,
                    saluteArt: "../hikari/hikari_gani_magica_front.png", atk: { kind: "shot", range: 4.5, windup: 0.9, cd: 3.2, power: 1.0, brain: 6 }, desc: "黒い全身スーツの戦闘員。……桃色の髪と髪飾りに、見覚えがある。ワルドー仕様の光弾を撃ち、ガニ股で敬礼して媚びる" },
    // brain: 当たると洗脳が進む（100で戦闘員化）
    waldo_officer:{ name: "ワルドー幹部",     type: "惑", art: "waldo_officer.png", hp: 60, spd: 1.4, r: 0.45, sight: 7, fov: 220, behavior: "lurk", cost: 6, ct: 16, command: 5, waldo: true,
                    atk: { kind: "shot", range: 5, windup: 1.1, cd: 4.0, power: 1.0, fan: 0.45, brain: 14, alsoGrab: 1.0 }, desc: "マントに組織の紋章。掌から催眠の波を扇に放つ。戦闘員を急かし、抗う者ほど良い戦闘員になると笑う" },
    // wire: 遠くからワイヤーで吊り上げる
    drone_capture:{ name: "捕縛ドローン",     type: "絡", art: "drone_capture.png", hp: 14, spd: 1.8, r: 0.35, sight: 7, fov: 360, behavior: "float", cost: 3, ct: 8, waldo: true,
                    atk: { kind: "grab", range: 2.4, windup: 0.9, cd: 5.0, power: 0.55, wire: true }, desc: "ワイヤーの射出口を並べた球体。手首と足首を取り、宙に吊り上げる" },
    // tickle: くすぐり。気力がどんどん削れる
    drone_tickle: { name: "くすぐり機ドローン", type: "蕩", art: "drone_tickle.png", hp: 16, spd: 1.6, r: 0.4, sight: 6, fov: 360, behavior: "float", cost: 3, ct: 9, waldo: true,
                    atk: { kind: "grab", range: 1.0, windup: 0.6, cd: 3.6, power: 0.5, tickle: true, brief: 5 }, desc: "羽根ブラシと細筆のアーム。『痛イコトハ、一切シナイ』" },
    drone_camera: { name: "記録ドローン",     type: "惑", art: "drone_camera.png", hp: 12, spd: 1.5, r: 0.35, sight: 7, fov: 360, behavior: "float", cost: 2, ct: 7, waldo: true,
                    atk: { kind: "aura", range: 5.5, power: 0.8, gaze: true, film: true }, desc: "赤いランプのレンズ。まばたきもせず、全部を記録する" },
    // develop: 捕まっている間、少しずつ敏感にされる。装束も剥がされる
    karte:        { name: "性感開発機〈カルテ〉", type: "蕩", art: "karte.png",     hp: 70, spd: 0,   r: 0.6, sight: 3, fov: 360, behavior: "static", cost: 5, ct: 14, waldo: true,
                    atk: { kind: "grab", range: 1.6, windup: 1.0, cd: 4.0, power: 1.0, develop: true }, desc: "多関節のアームと青いレンズ。『検体ヲ確認。適性検査ヲ開始シマス』" },
    // ---- Game4・Game2 の魔物 ----
    // numb: 触れると痺れる（攻撃が遅く、足がもたつく）
    shibire:      { name: "痺れ浮遊子",       type: "蕩", art: "shibire.png",      hp: 8,  spd: 1.0, r: 0.35, sight: 5, fov: 360, behavior: "float", cost: 1, ct: 5,
                    atk: { kind: "aura", range: 0.9, power: 0.4, numb: 5 }, desc: "半透明の傘の胞子。触れると微弱な痺れを流す。痛くはないが、指先がもたつく" },
    // spore: 吸うと「ハイ」。抜けたあとに「中毒」が残り、茸を見ると寄っていってしまう
    sekitake:     { name: "咳き茸",           type: "蕩", art: "sekitake.png",     hp: 12, spd: 0,   r: 0.4, sight: 2, fov: 360, behavior: "static", cost: 2, ct: 7,
                    atk: { kind: "aura", range: 1.3, power: 0.5, spore: true }, desc: "膝ほどの茸。近くで暴れると傘が破れて粉が上がる。吸った身体は、次から自分で寄っていく" },
    suiyou:       { name: "水妖",             type: "絡", art: "suiyou.png",       hp: 26, spd: 1.2, r: 0.45, sight: 3, fov: 360, behavior: "lurk", cost: 3, ct: 9, hidden: true,
                    atk: { kind: "grab", range: 1.4, windup: 0.4, cd: 3.0, power: 0.9 }, desc: "水たまりの下に潜む。水そのものが腕になって脚に絡む。冷たいのに、絡まれた所だけ熱い" },
    kabeguchi:    { name: "肉壁の口",         type: "蕩", art: "kabeguchi.png",    hp: 40, spd: 0,   r: 0.5, sight: 1.4, fov: 360, behavior: "static", cost: 3, ct: 10, hidden: true,
                    atk: { kind: "grab", range: 1.0, windup: 0.2, cd: 3.5, power: 1.3 }, desc: "肉の床に開いた口。気づかずに踏み込んだ脚を吸って、離さない" },
    // brief: 抱きついて数秒で離れる／sens: 翼の粉で敏感になる
    inyoku:       { name: "淫翼",             type: "蕩", art: "inyoku.png",       hp: 10, spd: 2.6, r: 0.35, sight: 7, fov: 360, behavior: "float", cost: 2, ct: 6,
                    atk: { kind: "grab", range: 0.9, windup: 0.4, cd: 3.0, power: 0.6, brief: 2.5, sens: 1 }, desc: "桃色の翼の小さな飛行種。急降下して腕に抱きつき、数秒で舞い戻る。翼の粉が肌を敏感にする" },
    // attach: 身体に貼りつく（付着体）。自分からは剥がれない
    hoshibami:    { name: "星喰み",           type: "蕩", art: "hoshibami.png",    hp: 8,  spd: 1.2, r: 0.3, sight: 5, fov: 360, behavior: "float", cost: 2, ct: 8,
                    atk: { kind: "attach", range: 0.8, windup: 0.4, cd: 3, power: 1.0, as: "hoshibami" }, desc: "星の形の小さな軟体。服の中へ滑り込み、胸の先に貼りついて吸いつづける" },
    tentacle_lord:{ name: "触手の主",         type: "絡", art: "tentacle_lord.png", hp: 120, spd: 0.4, r: 0.7, sight: 6, fov: 360, behavior: "lurk", cost: 7, ct: 20,
                    atk: { kind: "grab", range: 2.4, windup: 0.9, cd: 3.0, power: 1.6, alsoGrab: 3.0 }, desc: "触腕の群れの主。一本に捕まれば、残りが順番に取りついてくる" },
    // ---- 蟲（小さなワーム）とヒル（Game2 の蟲の塒・Game4 の地上ワーム） ----
    // attach: 服の中へ潜って貼りつく（付着体）
    tsurimushi:   { name: "吊り蟲",           type: "蕩", art: "tsurimushi.png",   hp: 8,  spd: 0,   r: 0.3, sight: 1.6, fov: 360, behavior: "static", cost: 2, ct: 6, hidden: true,
                    atk: { kind: "attach", range: 1.2, windup: 0.2, cd: 3, power: 1.0, as: "mushi" }, desc: "天井から糸で垂れる、光る管のような蟲。真下を通ると落ちてきて、服の中へ潜り込む" },
    zuidou:       { name: "隧道蟲",           type: "絡", art: "zuidou.png",       hp: 22, spd: 1.4, r: 0.4, sight: 3, fov: 360, behavior: "lurk", cost: 2, ct: 7, hidden: true,
                    atk: { kind: "grab", range: 1.1, windup: 0.3, cd: 3, power: 0.8 }, desc: "床下を掘り進む腕ほどの蟲。足元から出てきて脛に巻きつく。狭い道では撃ちにくい" },
    // swarmOnHit: 撃たれるたびに仲間を呼ぶ（撃てば増える）
    hibiki:       { name: "響き蟲",           type: "蕩", art: "hibiki.png",       hp: 6,  spd: 1.3, r: 0.3, sight: 5, fov: 360, behavior: "wander", cost: 2, ct: 6, swarmOnHit: 0.45,
                    atk: { kind: "attach", range: 0.8, windup: 0.3, cd: 3, power: 1.0, as: "hibiki" }, desc: "淡く光って震える小さな蟲。撃てば壁が鳴って群れが増える。衣装の内側で一斉に震える" },
    doromushi:    { name: "泥蟲",             type: "絡", art: "doromushi.png",    hp: 20, spd: 1.0, r: 0.4, sight: 3, fov: 360, behavior: "lurk", cost: 2, ct: 7, hidden: true,
                    atk: { kind: "grab", range: 1.2, windup: 0.5, cd: 3.2, power: 0.8, mud: true }, desc: "泥の底の白い影。光は泥に吸われて当たらない。脛を掴んだら、泥ごと引く" },
    gitai:        { name: "擬態蟲",           type: "絡", art: "gitai.png",        hp: 18, spd: 0,   r: 0.4, sight: 1.4, fov: 360, behavior: "static", cost: 2, ct: 8, hidden: true,
                    atk: { kind: "grab", range: 1.1, windup: 0.2, cd: 3, power: 0.9 }, desc: "古びた縄や蔓のふりをして垂れている。掴んで体重を預けた手に、巻きつき返す" },
    // swarm: いつも三匹で出る。手足に一匹ずつ絡む
    haimushi:     { name: "這い蟲",           type: "絡", art: "haimushi.png",     hp: 10, spd: 1.2, r: 0.3, sight: 4, fov: 360, behavior: "wander", cost: 2, ct: 6, trio: true,
                    atk: { kind: "grab", range: 0.8, windup: 0.4, cd: 3, power: 0.35, brief: 3 }, desc: "のろく弱い小さなワームの群れ。触れると手足に絡みつく。一匹なら何ともない" },
    // swell: 吸い付いた所が腫れて、敏感になっていく（肥大化）
    hiru:         { name: "肥大化ヒル",       type: "蕩", art: "hiru.png",         hp: 16, spd: 0.8, r: 0.35, sight: 4, fov: 360, behavior: "lurk", cost: 3, ct: 8,
                    atk: { kind: "attach", range: 0.9, windup: 0.5, cd: 3.5, power: 1.0, as: "hiru" }, desc: "腕ほどに太ったヒル。乳首やクリトリスに吸い付いて根元から吸い伸ばし、ぷっくりと肥大させる。一度大きくなった所は、なかなか元に戻らない" },
    // ---- 変生の神殿（ふたなり） futa: 変生した部位を狙う（射精感が溜まる） ----
    kuwaemushi:   { name: "咥え蟲",           type: "蕩", art: "kuwaemushi.png",   hp: 18, spd: 1.2, r: 0.4, sight: 5, fov: 360, behavior: "wander", cost: 3, ct: 8, futa: true,
                    atk: { kind: "grab", range: 0.9, windup: 0.5, cd: 3.2, power: 0.8, futaSuck: 14 }, desc: "口だけの白い蟲。変生した部位を根元まで咥え、吸い上げる。奥はやわらかい襞ばかり" },
    sayagoke:     { name: "鞘苔",             type: "蕩", art: "sayagoke.png",     hp: 30, spd: 0,   r: 0.5, sight: 1.6, fov: 360, behavior: "static", cost: 3, ct: 9, hidden: true, futa: true,
                    atk: { kind: "grab", range: 1.3, windup: 0.4, cd: 3.5, power: 1.0, futaSuck: 11 }, desc: "袋の形の苔。内側は全周が繊毛。引き剥がそうとすれば、繊毛が逆立って深く食い込む" },
    tenohira:     { name: "掌の群れ",         type: "絡", art: "tenohira.png",     hp: 14, spd: 1.8, r: 0.35, sight: 5, fov: 360, behavior: "wander", cost: 2, ct: 6, pack: 2, futa: true,
                    atk: { kind: "grab", range: 0.8, windup: 0.4, cd: 2.6, power: 0.6, futaSuck: 8 }, desc: "宙を泳ぐ掌の群れ。握って、扱いて、離れる。いつも何か一つを、みんなで握りたがる" },
    ukegame:      { name: "受け壺",           type: "蕩", art: "ukegame.png",      hp: 36, spd: 0,   r: 0.5, sight: 1.8, fov: 360, behavior: "static", cost: 3, ct: 9, futa: true,
                    atk: { kind: "grab", range: 1.1, windup: 0.6, cd: 3.5, power: 0.9, futaSuck: 10 }, desc: "口を上に向けた温かい壺。受けるためだけに据えられている" },
    // tipTease: 先だけを撫でる。射精感は上がるのに、行き着かない
    sakiimp:      { name: "先嬲りの小淫魔",   type: "惑", art: "sakiimp.png",      hp: 16, spd: 2.0, r: 0.35, sight: 7, fov: 360, behavior: "float", cost: 4, ct: 10, flee: true, futa: true, imp: true,
                    atk: { kind: "aura", range: 1.8, power: 0.5, tipTease: true }, desc: "宙に胡座をかく淫魔。先だけを、爪の先で円を描くように撫でる。根元には、触れない" },
    // ---- 教団（攻撃に行くだけ。潜入はしない） ----
    shinja:       { name: "信者",             type: "絡", art: "shinja.png",       hp: 18, spd: 1.8, r: 0.4, sight: 6, fov: 200, behavior: "wander", cost: 3, ct: 7, pack: 2, cult: true,
                    atk: { kind: "grab", range: 0.8, windup: 0.6, cd: 3.2, power: 0.6 }, desc: "白い祭衣の信者。『救いを』と唱えながら、祈りの形に押さえ込む" },
    // crack: 浴びるたび、心の防護壁にヒビが入る（翌日以降も残る）
    sekkyoushi:   { name: "説教師",           type: "惑", art: "sekkyoushi.png",   hp: 40, spd: 1.2, r: 0.45, sight: 7, fov: 220, behavior: "lurk", cost: 4, ct: 12, cult: true,
                    atk: { kind: "aura", range: 3.5, power: 0.55, sermon: true }, desc: "蜜のような声で説く上級信者。『ちからを、ぬきなさい』。聞くほど、心の壁が薄くなる" },
    chuushutsu:   { name: "抽出師",           type: "蕩", art: "chuushutsu.png",   hp: 30, spd: 1.3, r: 0.4, sight: 6, fov: 220, behavior: "lurk", cost: 4, ct: 10, cult: true,
                    atk: { kind: "shot", range: 4.5, windup: 0.8, cd: 3.4, power: 1.1, proj: "mucus", sens: 1 }, desc: "スポイトを携えた信者。濃縮した媚薬の雫を撃ち込む。当たった所から肌が敏感になる" },
    // gazeCharm: 見つめられるほど惹かれる。惹かれていると、祈ってしまう
    kyouso:       { name: "教祖",             type: "惑", art: "kyouso.png",       hp: 110, spd: 0.8, r: 0.55, sight: 8, fov: 360, behavior: "lurk", cost: 9, ct: 24, cult: true, command: 6, deep: 6,
                    atk: { kind: "aura", range: 5, power: 0.8, gazeCharm: true, gaze: true }, desc: "教団の頂。肥えた中年の男。何もしない。見つめるだけで、見つめられた者の腰が揺れる" },
    // ---- 淫魔（淫魔の館） ----
    // broadcast: 捕まったり達したりすると『中継』する（見られ熱・恥）
    jikkyou:      { name: "実況する小淫魔",   type: "惑", art: "jikkyou.png",      hp: 14, spd: 2.2, r: 0.35, sight: 8, fov: 360, behavior: "float", cost: 3, ct: 9, flee: true, imp: true,
                    atk: { kind: "aura", range: 6, power: 0.4, broadcast: true }, desc: "両手の指で枠を作り、そこから覗く。捕まった姿も、達した瞬間も、全部『中継』する" },
    kusuguri:     { name: "擽りの小淫魔",     type: "蕩", art: "kusuguri.png",     hp: 14, spd: 2.0, r: 0.35, sight: 6, fov: 360, behavior: "float", cost: 3, ct: 9, flee: true, imp: true,
                    atk: { kind: "grab", range: 2.2, windup: 0.7, cd: 4.5, power: 0.5, wire: true, tickle: true }, desc: "粘糸で手首を吊り上げ、羽根のような尾で脇腹を掃く。痛くはしない。笑いが熱に変わるまで" },
    // countGame: 十数えるあいだ声を出したら負け。負けても勝っても、寸前で置き去り
    kazoe:        { name: "数える小淫魔",     type: "惑", art: "kazoe.png",        hp: 14, spd: 2.0, r: 0.35, sight: 7, fov: 360, behavior: "float", cost: 4, ct: 14, flee: true, imp: true,
                    atk: { kind: "count", range: 4, windup: 0.6, cd: 16, power: 0.6 }, desc: "指を一本立てて笑う。『十まで数えるあいだ、声を出さなきゃ勝ち』。淫紋の算術で快感を数える" },
    // mock: 捕まっている姿を嘲る。罵られるほど、なぜか好きになっていく
    azakeri:      { name: "嘲りの小淫魔",     type: "惑", art: "azakeri.png",      hp: 18, spd: 2.0, r: 0.35, sight: 7, fov: 360, behavior: "float", cost: 4, ct: 12, flee: true, imp: true, summon: { kind: "haimushi", every: 12, max: 2 },
                    atk: { kind: "aura", range: 3.5, power: 0.5, mock: true }, desc: "張り出しに座って足をぷらぷら。使い魔をけしかけ、捕まった獲物を口で嘲る" },
    // kiss: 口づけ。口づけの印が残ると、次からは淫魔の口づけだけで好きになってしまう
    kuchizuke:    { name: "口づけの淫魔",     type: "惑", art: "kuchizuke.png", hp: 34, spd: 1.8, r: 0.45, sight: 7, fov: 360, behavior: "float", cost: 5, ct: 14, imp: true,
                    atk: { kind: "grab", range: 0.9, windup: 0.6, cd: 5, power: 0.7, brief: 3.5, kiss: true }, desc: "唇だけで勝負する淫魔。抱き寄せて、口を塞ぐ。口づけの印が残った唇は、もう口づけに逆らえない" },
    // 魅了してくる者たち（見つめる・歌う・香る・囁く）。惹かれるほど、撃つ手が止まり、足がそちらへ向く
    utaimp:       { name: "歌う小淫魔",       type: "惑", art: "utaimp.png", hp: 20, spd: 2.2, r: 0.38, sight: 7, fov: 360, behavior: "wander", cost: 3, ct: 9, flee: true, imp: true,
                    atk: { kind: "lure", range: 5.5, windup: 0.9, cd: 3.8, power: 0.9, charm: 0.7 }, desc: "子守唄のような歌で呼び寄せる。聴いているうちに、この子を撃つのが可哀想になってくる" },
    hitomi:       { name: "見つめる淫魔",     type: "惑", art: "hitomi.png", hp: 30, spd: 1.2, r: 0.45, sight: 8, fov: 360, behavior: "float", cost: 4, ct: 12, imp: true,
                    atk: { kind: "aura", range: 5, power: 0.7, gaze: true, allure: true }, desc: "何もしない。ただ、潤んだ瞳で見つめてくる。目が合うたびに、胸の奥が甘く疼く" },
    miwakubana:   { name: "魅惑の花",         type: "惑", art: "miwakubana.png", hp: 26, spd: 0, r: 0.5, sight: 5, fov: 360, behavior: "lurk", cost: 3, ct: 10,
                    atk: { kind: "aura", range: 3.8, power: 0.8, allure: true, scent: true }, desc: "甘い香りの花。嗅いでいるうちに、この花のそばにいたくなる。近づけば、花弁が閉じてくる" },
    // Game4 から：ナメクジの一族（魅了は種族ごと）
    namekuji:     { name: "ナメクジ",         type: "惑", art: "namekuji.png", hp: 12, spd: 0.8, r: 0.32, sight: 4, fov: 200, behavior: "wander", cost: 2, ct: 6, pack: 2,
                    atk: { kind: "grab", range: 0.7, windup: 0.7, cd: 3.0, power: 0.5, brief: 2.2, charmTouch: 1 }, desc: "のろく弱い。けれど触れられるたび、『ナメクジという種族』が好きになっていく。好きになった種族には、撃つ手が鈍り、自分から寄っていってしまう" },
    namequeen:    { name: "ナメクジ女王",     type: "惑", art: "namequeen.png", hp: 50, spd: 0.5, r: 0.7, sight: 6, fov: 360, behavior: "lurk", cost: 7, ct: 20,
                    charmPulse: { every: 6, r: 3.4, kinds: ["namekuji", "namequeen"] },
                    atk: { kind: "grab", range: 0.9, windup: 0.8, cd: 3.4, power: 0.8, charmTouch: 1 }, desc: "背に王冠めいた襞を持つ大ナメクジ。数秒ごとに甘い脈動を放ち、届く範囲の彼女を、ナメクジの一族ごと魅了していく" },
    firstslug:    { name: "はじめの夜の主",   type: "惑", art: "firstslug.png", hp: 60, spd: 0.8, r: 0.4, sight: 6, fov: 240, behavior: "wander", cost: 9, ct: 30, grows: true,
                    atk: { kind: "grab", range: 0.8, windup: 0.7, cd: 3.0, power: 0.6, charmTouch: 1 }, desc: "最初の一体と同じ姿。大きくない、速くない。ただ、与えられた傷の分だけ濃くなる——体力が伸び、掴みが外れにくくなり、触れた時の魅了が深くなる。抗わなければ、ただのナメクジのままでいる" },
    // Game2 から：燐光の蟲・媚芯茸・手懐ける小淫魔
    mitsusui:     { name: "蜜吸い虫",         type: "惑", art: "mitsusui.png", hp: 16, spd: 1.2, r: 0.3, sight: 5, fov: 360, behavior: "float", cost: 2, ct: 7,
                    charmGlow: { r: 2.4, every: 1.6 },
                    atk: { kind: "grab", range: 0.7, windup: 0.6, cd: 3.2, power: 0.5, brief: 2.5 }, desc: "手のひらほどの、頼りない光る蟲。甘い燐光を吸うと、この蟲がいじらしく見えて撃てなくなる。その隙に膝へすがりつき、吸う" },
    bishin:       { name: "媚芯茸",           type: "蕩", art: "bishin.png", hp: 20, spd: 0, r: 0.4, sight: 4, fov: 360, behavior: "lurk", cost: 3, ct: 10,
                    charmGlow: { r: 2.8, every: 1.8, futa: true },
                    atk: { kind: "aura", range: 2.8, power: 0.7 }, desc: "胞子を浴びた者の芯を熱くする茸。浴びるほどこの茸が愛しくなる。生えている者は、そこから疼く" },
    tenazuke:     { name: "手懐ける小淫魔",   type: "惑", art: "tenazuke.png", hp: 18, spd: 2.0, r: 0.35, sight: 7, fov: 360, behavior: "float", cost: 4, ct: 12, flee: true, imp: true,
                    atk: { kind: "aura", range: 3.5, power: 0.6, mock: true, charm: 0.6 }, desc: "嬲って、罵って、手懐ける小淫魔。雑にしか触れていないと嘲られるほど、なぜかその子が恋しくなる" },
    sasayaki:     { name: "囁きスライム",     type: "惑", art: "sasayaki.png", hp: 28, spd: 1.1, r: 0.42, sight: 6, fov: 360, behavior: "wander", cost: 3, ct: 9,
                    atk: { kind: "lure", range: 4, windup: 0.8, cd: 3.4, power: 0.8, charm: 0.5, alsoGrab: 1.0 }, desc: "耳元で囁くように泡立つ粘体。呼び寄せて、寄ってきた獲物を包みこむ" },
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
    // 満ちる触手の間の中心：撃ち割れば、満ちた触手が退く（部屋の仕掛けだが、これだけは壊せる）
    flood_orb: { name: "満ち引きの玉", holdName: "満ちてくる触手", type: "絡", effect: "floodOrb", radius: 0.5, detect: 1, cost: 9, ct: 99, rearm: 9999, inert: true, breakable: 4,
                 desc: "床の穴のふちで脈打つ玉。部屋に満ちる触手の満ち引きを操っている。硬い殻は、脈打つ一瞬だけ開く。その隙に四度当てて割れば、触手は潮のように退く" },
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
    tower:   { name: "囁きの塔",   type: "惑", art: "tower.png", effect: "tower",   radius: 3.6, detect: 0.5,  cost: 3, ct: 12, rearm: 10, emit: true, desc: "細い石の塔。間をおいて囁きの波を放ち、近くにいる者の頭を痺れさせ、塔の方へ歩かせる" },
    // ---- Game2 の罠をさらに（呪装・幻影・拘束具・機械・放置） ----
    echo_gate: { name: "復唱の門",   type: "惑", effect: "echo",    radius: 1.0, detect: 0.2,  cost: 3, ct: 12, rearm: 30, big: true, desc: "門をくぐるには、刻まれた文句を声に出して読まねばならない。読んだ言葉は、頭の底に鉤を残す" },
    lull_voice:{ name: "微睡の声",   type: "惑", effect: "lull",    radius: 3.0, detect: 0.3,  cost: 3, ct: 12, rearm: 12, emit: true, desc: "どこからか子守唄のような声。聞いているうちに瞼が重くなり、足が遅くなる" },
    armor:     { name: "うつろの鎧", type: "絡", effect: "armor",   radius: 1.0, detect: 0.2,  cost: 4, ct: 14, rearm: 30, big: true, desc: "空の鎧が立っている。近づくと前が開き、中へ閉じ込める。内側は柔らかく、手も杖も動かせない" },
    stasis:    { name: "静止の帳",   type: "惑", effect: "stasis",  radius: 1.2, detect: 0.12, cost: 4, ct: 16, rearm: 36, big: true, desc: "薄い帳をくぐった瞬間、身体の時間だけが止まる。止まっている間も、感覚だけは積もっていく" },
    vow:       { name: "誓いの祭壇", type: "惑", effect: "vow",     radius: 1.2, detect: 0.15, cost: 4, ct: 16, rearm: 60, big: true, desc: "誓いを立てさせる祭壇。『この階を出るまで、達しない』。溜まった分は、階を出た瞬間にまとめて返ってくる" },
    saddle:    { name: "鞍の渡り",   type: "蕩", effect: "saddle",  radius: 1.0, detect: 0.25, cost: 3, ct: 12, rearm: 24, big: true, desc: "奈落に一本だけ渡された、瘤の並ぶ梁。跨って渡るしかない。梁のほうが動く" },
    itch:      { name: "掻痒の檻",   type: "蕩", effect: "itch",    radius: 1.0, detect: 0.2,  cost: 4, ct: 14, rearm: 30, big: true, desc: "閉じ込めた者に痒みの粉を吹く檻。手は届かない。出たあとも、疼きが残る" },
    tickle:    { name: "くすぐりの廊", type: "蕩", effect: "tickle", radius: 0.9, detect: 0.3,  cost: 2, ct: 8,  rearm: 12, desc: "壁から羽根の腕が伸びる通路。笑いを堪えるうちに、息も気力も削られる" },
    aphro_wall:{ name: "媚壁",       type: "蕩", effect: "aphro",   radius: 1.8, detect: 0.3,  cost: 3, ct: 10, rearm: 8, emit: true, desc: "湿った壁から甘い汗が滲む。そばにいるだけで、肌が敏感になっていく" },
    exam:      { name: "診察台",     type: "絡", effect: "exam",    radius: 1.0, detect: 0.2,  cost: 4, ct: 14, rearm: 30, big: true, desc: "白い台と、器具の並んだ盆。寝かせた者を固定し、どこが弱いかを一つずつ確かめる" },
    net:       { name: "投網",       type: "絡", effect: "net",     radius: 0.9, detect: 0.35, cost: 2, ct: 7,  rearm: 14, desc: "天井から網が落ちてくる。絡まった手足をほどくのに、手間取る" },
    pitfall:   { name: "落とし穴",   type: "絡", effect: "pit",     radius: 0.8, detect: 0.3,  cost: 2, ct: 8,  rearm: 18, desc: "腰まで嵌まる穴。底は柔らかく、上がろうとするほど沈む。物音で魔物が寄ってくる" },
    toybox:    { name: "装具箱",     type: "蕩", effect: "toybox",  radius: 0.9, detect: 0.1,  cost: 3, ct: 12, rearm: 40, lure: true, desc: "金具の光る宝箱。開けると中身が跳び、肌に貼りつく。震える珠は、自分では外せない" },
    suit:      { name: "纏い衣",     type: "惑", effect: "suit",    radius: 0.9, detect: 0.1,  cost: 3, ct: 12, rearm: 40, lure: true, desc: "上等な防具に見える衣。着た者には『良い装備』としか思えない。内側で、ずっと動いている" },
    curtain:   { name: "垂帳の触手", type: "絡", effect: "curtain", radius: 1.0, detect: 0.3,  cost: 2, ct: 8,  rearm: 10, desc: "通路を塞ぐ触手の簾。くぐり抜けるあいだ、全身を撫でられる。ときどき一本が離さない" },
    sucker:    { name: "吸盤の壁",   type: "絡", effect: "sucker",  radius: 1.0, detect: 0.25, cost: 2, ct: 9,  rearm: 16, desc: "壁一面の吸盤。すれ違いざまに、服の上から吸いついて剥がれない" },
    honey:     { name: "蜜溜まり",   type: "蕩", effect: "honey",   radius: 1.1, detect: 0.3,  cost: 2, ct: 8,  rearm: 10, desc: "床に溜まった琥珀色の蜜。踏み込めば膝まで捕まり、甘い熱が脚から上ってくる" },
    whisper_ring:{ name: "囁き茸の輪", type: "惑", effect: "wring", radius: 1.4, detect: 0.25, cost: 3, ct: 10, rearm: 20, desc: "茸の輪の真ん中に立つと、足元から囁きが上ってくる。聞いた言葉が、自分の考えのように思えてくる" },
    // ---- ワルドーの装置 ----
    hypno_ray: { name: "催眠照射機", type: "惑", effect: "hray",    radius: 3.4, detect: 0.5,  cost: 4, ct: 14, rearm: 10, emit: true, desc: "部屋の四隅から渦を巻く光。浴びるたび思考の縁が溶け、洗脳が進む" },
    furnace:   { name: "精気吸収炉", type: "削", effect: "furnace", radius: 2.6, detect: 0.5,  cost: 4, ct: 14, rearm: 8, emit: true, desc: "脈打つ炉。近くの者から魔力を吸い上げる。吸われる感触が、なぜか甘い" },
    pod:       { name: "戦闘員化ポッド", type: "惑", effect: "pod",  radius: 1.0, detect: 0.2,  cost: 5, ct: 18, rearm: 40, big: true, desc: "人型のポッド。吸い込んだ者の名前を塗り替え、戦闘員として登録する" },
    capture:   { name: "捕縛アーム", type: "絡", effect: "capture", radius: 1.1, detect: 0.2,  cost: 4, ct: 14, rearm: 30, big: true, desc: "床の紋様から機械の腕。手首・足首・腰を取り、大の字に固定して戦闘員に引き渡す" },
    // ---- Game4 の設置物 ----
    web:       { name: "淫糸の巣",   type: "絡", art: "web.png", effect: "web",     radius: 1.0, detect: 0.3,  cost: 2, ct: 9,  rearm: 16, desc: "床から壁へ張られた糸。触れた四肢を、空いている分だけ全部つなぎ留める" },
    rune:      { name: "淫紋の敷石", type: "蕩", effect: "rune",    radius: 0.8, detect: 0.2,  cost: 2, ct: 9,  rearm: 20, desc: "踏むと灯る紋の石。灯した分だけ、下腹の紋が濃くなる" },
    // ---- 蟲 ----
    mushi_pit: { name: "蟲溜まり",   type: "蕩", effect: "mushiPit", radius: 0.9, detect: 0.25, cost: 3, ct: 10, rearm: 20, desc: "床の窪みに、細い蟲がかたまって蠢いている。落ちれば、服の中まで入ってくる" },
    hive_wall: { name: "響き孔の壁", type: "蕩", effect: "hive",    radius: 3.0, detect: 0.4,  cost: 3, ct: 12, rearm: 14, emit: true, desc: "壁一面の孔。奥で光るものが震えている。音が鳴るたび、孔から蟲がせり出す" },
    // ---- 変生の神殿（ふたなり） ----
    ring:      { name: "締環",       type: "蕩", effect: "ring",    radius: 0.9, detect: 0.2,  cost: 3, ct: 12, rearm: 40, desc: "宙を回る金属の環。変生した部位の根元に潜って締まり、二度とゆるまない。溜まる一方で、抜け口がない" },
    gauze:     { name: "研ぎ布",     type: "蕩", effect: "gauze",   radius: 1.0, detect: 0.2,  cost: 4, ct: 14, rearm: 30, big: true, desc: "ぬめる布を張った台。捕らえた者の先を、布で左右に研ぎ上げる" },
    temari:    { name: "手鞠",       type: "蕩", effect: "temari",  radius: 0.9, detect: 0.25, cost: 2, ct: 9,  rearm: 16, desc: "柔らかな鞠が跳ねてくる。当たった所を、手のひらのように揉みしだいて転がっていく" },
    count_altar:{ name: "数取りの祭壇", type: "蕩", effect: "count", radius: 1.1, detect: 0.15, cost: 4, ct: 16, rearm: 60, big: true, desc: "升目の彫られた祭壇。昇るたびに下腹の紋が一つ増え、升が一つ埋まる。升は、減らない" },
    feather_bed:{ name: "綿毛の褥",  type: "蕩", effect: "feather", radius: 1.1, detect: 0.12, cost: 3, ct: 14, rearm: 36, big: true, lure: true, desc: "ふかふかの綿毛の寝床。横になった者を綿毛が包み、全身をくすぐるように撫でる" },
    lips:      { name: "唇の群れ",   type: "蕩", effect: "lips",    radius: 2.2, detect: 0.35, cost: 3, ct: 12, rearm: 12, emit: true, desc: "壁と床に咲いた、唇の形の花。通る者の肌という肌に、吸いつくような口づけを落とす" },
    namagoroshi:{ name: "生殺しの花", type: "蕩", effect: "nama",   radius: 1.1, detect: 0.2,  cost: 4, ct: 14, rearm: 30, big: true, desc: "捕らえた者を、寸前まで咲かせて止める花。蜜は出ない。出させない" },
    suikan:    { name: "吸い管",     type: "蕩", effect: "suikan",  radius: 1.0, detect: 0.2,  cost: 4, ct: 14, rearm: 30, big: true, desc: "壁から伸びる透明な管。咥えた先を、規定の量が溜まるまで吸い上げる" },
    // ---- 教団の魔導具 ----
    yurugi:    { name: "揺さぶりの魔導具", type: "惑", effect: "yurugi", radius: 3.4, detect: 0.4, cost: 4, ct: 14, rearm: 12, emit: true, desc: "精神の防護壁を叩く魔導具。一度では何ともない。何度も浴びるうち、壁にヒビが入る" },
    kaikou:    { name: "怪光線の魔導具", type: "蕩", effect: "kaikou", radius: 3.4, detect: 0.4, cost: 4, ct: 14, rearm: 14, emit: true, desc: "強制的に絶頂させる怪光線。防いでも、ヒビから入った分が『絶頂にも満たない絶頂』になって、夜に疼く" },
    shashin:   { name: "教祖の写真の間", type: "惑", effect: "shashin", radius: 1.4, detect: 0.2, cost: 4, ct: 16, rearm: 40, big: true, desc: "四方八方から教祖の顔。祈りを知った身体は、見つめられるだけで腰を揺らしてしまう" },
    maseki:    { name: "魔石の台",   type: "削", effect: "maseki",  radius: 0.9, detect: 0.1,  cost: 3, ct: 12, rearm: 30, lure: true, desc: "桃色に光る丸い石。手に取った者の魔力を、甘い感触と一緒に吸い上げる" },
    seisui:    { name: "聖水の盤",   type: "蕩", effect: "seisui",  radius: 0.9, detect: 0.1,  cost: 3, ct: 12, rearm: 30, lure: true, desc: "香り高い聖水。喉の渇きを癒やすように見える。甘く、痺れる味" },
    jouka:     { name: "浄化の台",   type: "蕩", effect: "jouka",   radius: 1.1, detect: 0.2,  cost: 4, ct: 16, rearm: 40, big: true, desc: "手足を留めて媚薬を垂らし、そのまま放っておく台。『救いは、求めなければ与えられない』" },
    // ---- 淫魔の館 ----
    kouro:     { name: "淫魔の香炉", type: "惑", effect: "kouro",   radius: 3.0, detect: 0.4,  cost: 3, ct: 12, rearm: 12, emit: true, desc: "甘い煙を吐く香炉。吸った者は、淫魔の声がやけに甘く聞こえるようになる" },
    keiyaku:   { name: "淫魔の契約書", type: "惑", effect: "keiyaku", radius: 0.9, detect: 0.1, cost: 3, ct: 14, rearm: 60, lure: true, desc: "宝のように置かれた巻物。読めば契約が結ばれる。『許しが出るまで、達してはならない』" },
  };

  /* ---- 罠部屋（Game2 の「区画まるごとが一つの仕掛け」をなぞる） ----
   * 部屋ごとに仕掛けが一つ。その部屋に合う魔物が眠って潜み、踏み込むと一斉に目を覚ます。
   * center: 部屋の真ん中に据える罠 / traps: 部屋に散らす罠 / den: 潜んでいる魔物 [種, 数]
   * seal: 踏み込むと扉が閉まる秒数 / aura: 部屋にいる間ずっと効く [系統, 強さ] / from: 深さ（この階から出る）
   */
  // 床64px×4列×2行。飾り64px×4列（壁・大・小・光）。描画専用。
  G.ROOM_SKINS = {
    tentacle: { floor: "assets/env/room_tentacle.png", deco: "assets/env/room_tentacle_deco.png", proc: "tentacle", wall: 0, scatter: [1, 2, 3], density: 0.22, wallTop: "#76525f", overlay: "rgba(155,66,95,0.12)", fog: "#c889aa", speed: 0.8 },
    slime: { floor: "assets/env/room_slime.png", deco: "assets/env/room_slime_deco.png", wall: 0, scatter: [1, 2, 3], density: 0.26, wallTop: "#796786", overlay: "rgba(168,115,186,0.12)", fog: "#b29bcf", speed: 0.6 },
    flesh: { floor: "assets/env/room_flesh.png", deco: "assets/env/room_flesh_deco.png", wall: 0, scatter: [1, 2, 3], density: 0.23, wallTop: "#875c68", overlay: "rgba(182,86,111,0.12)", fog: "#d395ac", speed: 0.7 },
    worm: { floor: "assets/env/room_worm.png", deco: "assets/env/room_worm_deco.png", wall: 0, scatter: [1, 2, 3], density: 0.21, wallTop: "#685860", overlay: "rgba(126,90,106,0.08)", fog: "#b993a7", speed: 0.5 },
    mirror: { floor: "assets/env/room_mirror.png", deco: "assets/env/room_mirror_deco.png", wall: 0, scatter: [1, 2, 3], density: 0.14, wallTop: "#7c8c9e", overlay: "rgba(130,175,201,0.08)", fog: "#a8c6db", speed: 0.35 },
    cult: { floor: "assets/env/room_cult.png", deco: "assets/env/room_cult_deco.png", wall: 0, scatter: [1, 2, 3], density: 0.14, wallTop: "#79525f", overlay: "rgba(132,44,65,0.12)", fog: "#cba3ac", speed: 0.4 },
    lab: { floor: "assets/env/room_lab.png", deco: "assets/env/room_lab_deco.png", wall: 0, scatter: [1, 2, 3], density: 0.12, wallTop: "#7c8596", overlay: "rgba(128,146,173,0.06)", fog: "#a9bbd6", speed: 0.3 },
    boudoir: { floor: "assets/env/room_boudoir.png", deco: "assets/env/room_boudoir_deco.png", wall: 0, scatter: [1, 2, 3], density: 0.13, wallTop: "#815a74", overlay: "rgba(146,72,113,0.10)", fog: "#c9a0c5", speed: 0.4 },
  };

  G.TRAP_ROOMS = {
    vine_hall:   { skin: "tentacle", name: "縛蔦の間",   type: "絡", from: 1, center: "vine", den: [["hanging_vine", 5]], desc: "幾房もの蔦が垂れ下がる。下を通ろうとした瞬間、四肢へ巻きつく" },
    kote_swarm:  { skin: "tentacle", name: "小手の群れ", type: "絡", from: 2, den: [["puppet_hand", 6]], desc: "床一面に、小さな手が息を潜めている" },
    tent_flood:  { skin: "tentacle", name: "満ちる触手の間", type: "絡", from: 3, center: "flood_orb", den: [], seal: 999, flood: { rise: 26, fullHold: 25 },
                   desc: "広間の真ん中に、丸い穴。踏み込むと扉が落ち、穴から触手が水位のように満ちてくる。穴のふちの玉が、その満ち引きを操っている" },
    tent_pit:    { skin: "tentacle", name: "触腕の坑",   type: "絡", from: 4, center: "rope", den: [["roper", 2], ["gulper_worm", 1]], seal: 6, desc: "床の坑から、太い触腕が這い出してくる" },
    idle_cell:   { skin: "lab", name: "不作為の間", type: "絡", from: 1, center: "cuffs", den: [["goblin", 2]], seal: 12, wake: 4, desc: "扉が落ち、手首が壁に留められる。何が来るかは、待つしかない" },
    caliper:     { skin: "lab", name: "採寸門",     type: "絡", from: 1, center: "gate", den: [["puppet_hand", 2]], desc: "回廊を塞ぐ真鍮の門。人型に凹んだ受け台がある" },
    feed_belt:   { skin: "lab", name: "送り帯",     type: "絡", from: 3, center: "belt", traps: ["belt", "glue"], den: [["pot", 1]], desc: "床の帯が、奥の壺へ向かって流れている" },
    pillory:     { skin: "cult", name: "晒し台",     type: "絡", from: 2, center: "pillory", den: [["goblin", 3]], wake: 3, desc: "部屋の真ん中に、首と手首を挟む板。物音がすれば、見物が集まる" },
    foam_cell:   { skin: "slime", name: "泡沫の檻",   type: "蕩", from: 2, den: [["slime", 3]], seal: 8, aura: ["蕩", 0.35], desc: "扉が閉まると、床から温い泡が湧き上がる" },
    mist_hall:   { skin: "flesh", name: "霧の広間",   type: "蕩", from: 1, den: [["lure_cap", 2], ["fluff", 3]], aura: ["蕩", 0.5], desc: "甘い霧が立ち込める。吸うほど、体が火照る" },
    gel_urn:     { skin: "slime", name: "甘露の甕",   type: "蕩", from: 5, center: "urn", den: [["slime", 2], ["jellyfish", 2]], desc: "大甕から、蜜のような粘りが溢れている" },
    tease_rack:  { skin: "boudoir", name: "焦らしの台", type: "蕩", from: 2, center: "tease", den: [["peeper", 2]], desc: "寝台と、それを見下ろす無数の目" },
    hot_spring:  { skin: "slime", name: "乳白の湯",   type: "蕩", from: 4, center: "spring", den: [["slime", 2]], desc: "白く濁った湯が湧いている。休めそうに見える" },
    fungal_bed:  { skin: "boudoir", name: "偽りの褥",   type: "惑", from: 3, center: "bed", den: [["lure_cap", 2]], desc: "埃ひとつない小部屋に、寝台が一つ" },
    purify:      { skin: "mirror", name: "清めの手水", type: "削", from: 1, center: "basin", den: [["ghost_head", 2]], desc: "澄んだ水盤。身を清めれば、熱も引きそうに見える" },
    mirror_hall: { skin: "mirror", name: "幻影の鏡廊", type: "惑", from: 3, traps: ["mirror", "mirror"], den: [["mirror_slime", 2]], desc: "壁一面の鏡に、自分が何人も映る" },
    hypno_bell:  { skin: "tentacle", name: "催眠の鈴",   type: "惑", from: 4, traps: ["bell", "bell", "bell"], den: [["mind_roper", 1]], desc: "天井から無数の鈴が下がっている" },
    twin_shadow: { skin: "cult", name: "双影の燭",   type: "惑", from: 2, traps: ["decoy", "decoy"], den: [["gazer", 2]], desc: "燭台の火が揺れるたび、影が二つに増える" },
    dreamwalk:   { skin: "boudoir", name: "夢渡り",     type: "惑", from: 4, den: [["imp", 2], ["moth", 2]], aura: ["惑", 0.4], desc: "足を踏み入れると、夢と現の境が薄くなる" },
    // ---- Game2・Game4 から移した罠部屋 ----
    slime_ceil:  { skin: "slime", name: "粘体落としの間", type: "蕩", from: 2, traps: ["slime_drop", "slime_drop", "slime_drop"], den: [["slime", 2]], desc: "天井の石に、継ぎ目がやけに多い。床には乾ききらない水たまり" },
    bud_hall:    { skin: "flesh", name: "吊花の廊",   type: "蕩", from: 3, center: "bud", traps: ["bud"], den: [["nikubana", 1], ["fluff", 2]], desc: "天井いっぱいに、白い蕾が隙間なく下がっている" },
    flower_bed:  { skin: "flesh", name: "肉花の庭",   type: "蕩", from: 2, den: [["nikubana", 3]], aura: ["蕩", 0.3], desc: "道の端に、人ひとりが収まるほどの花が咲いている。襲ってはこない。ただ、口を開けて待っている" },
    incense_pool:{ skin: "slime", name: "媚香の淀み", type: "蕩", from: 3, den: [["kouryuu", 3]], seal: 6, aura: ["蕩", 0.35], desc: "桃色の靄が床に溜まり、膝の高さで揺れている" },
    hug_grove:   { skin: "flesh", name: "抱き茸の森", type: "蕩", from: 4, den: [["dakitake", 2], ["lure_cap", 1]], aura: ["蕩", 0.25], desc: "人の背丈ほどの茸が、柔らかく傘を揺らしている" },
    beam_hall:   { skin: "tentacle", name: "照射の回廊", type: "蕩", from: 5, den: [["shousha", 2], ["peeper", 2]], desc: "壁の穴から、水晶の眼をもつ細い触手が覗いている。見物の目も" },
    seal_altar:  { skin: "cult", name: "淫紋の祭壇", type: "蕩", from: 6, center: "altar", den: [["banjin", 2]], wake: 3, desc: "突き当たりに黒い石の祭壇。左右の燭台が、踏み込むのと同時に灯る" },
    root_floor:  { skin: "tentacle", name: "蝕根の床",   type: "絡", from: 3, center: "root", den: [["puppet_hand", 2], ["tsukite", 1]], desc: "床石の継ぎ目から、髪の毛ほどの根が数えきれないほど出ている" },
    cocoon_room: { skin: "flesh", name: "白繭の室",   type: "絡", from: 5, center: "cocoon", den: [["dakitake", 1]], seal: 8, aura: ["蕩", 0.25], desc: "壁も床も天井も、白い菌糸に厚く覆われた丸い小室。空気が生温く、湿っている" },
    ratchet_room:{ skin: "lab", name: "爪車",       type: "絡", from: 5, center: "ratchet", den: [["goblin", 2]], wake: 5, desc: "何もない小部屋。床に一本、細い溝が端から端まで走っている" },
    shadow_hall: { skin: "cult", name: "影腕の広間", type: "絡", from: 4, center: "shadow", den: [["tsukite", 2]], seal: 7, desc: "円い広間。壁の四方に燭台が一基ずつ据えてある" },
    whisper:     { skin: "mirror", name: "囁きの塔",   type: "惑", from: 3, center: "tower", den: [["gazer", 1], ["medama", 2]], desc: "部屋の真ん中に、細い石の塔が立っている。耳の奥が、ずっとくすぐったい" },
    // ---- 淫魔 ----
    imp_nest:    { skin: "boudoir", name: "嗤いの巣",   type: "惑", from: 3, den: [["futago", 1], ["imp", 2]], aura: ["惑", 0.3], desc: "壁の窪みという窪みから、くすくす笑う声がする" },
    edge_parlor: { skin: "boudoir", name: "寸止めの間", type: "惑", from: 4, center: "vow", den: [["inma", 1], ["jellyfish", 1]], seal: 8, desc: "甘い香の焚かれた小部屋。壁の祭壇に、読めない誓いの文句が刻まれている" },
    dream_throne:{ skin: "boudoir", name: "夢魔の玉座", type: "惑", from: 7, den: [["muma_queen", 1], ["imp", 2]], seal: 10, aura: ["蕩", 0.3], desc: "繭を積んだ玉座。頬杖をついた女王が、退屈そうにこちらを見下ろしている" },
    // ---- Game2 の罠部屋 ----
    echo_hall:   { skin: "mirror", name: "復唱の門",   type: "惑", from: 3, center: "echo_gate", den: [["peeper", 2]], desc: "回廊を塞ぐ門。扉には文句が刻まれ、読み上げないと開かない" },
    stasis_room: { skin: "boudoir", name: "静止の帳",   type: "惑", from: 5, center: "stasis", den: [["tsukite", 1], ["puppet_hand", 2]], desc: "天井から薄い帳が幾重にも下がっている。帳の向こうの空気が、動いていない" },
    armor_hall:  { skin: "lab", name: "うつろの鎧", type: "絡", from: 4, center: "armor", traps: ["armor"], den: [["puppet_hand", 2]], desc: "空の鎧が壁際に並ぶ。兜の奥は暗く、どれも前が少しだけ開いている" },
    itch_cell:   { skin: "flesh", name: "掻痒の檻",   type: "蕩", from: 3, center: "itch", den: [["shibire", 3]], seal: 6, desc: "部屋の真ん中に吊られた檻。床に、細かな粉が積もっている" },
    saddle_pit:  { skin: "boudoir", name: "鞍の渡り",   type: "蕩", from: 4, center: "saddle", den: [["inyoku", 2]], desc: "床の真ん中が奈落。向こう岸へは、瘤の並んだ梁が一本だけ" },
    tickle_hall: { skin: "flesh", name: "くすぐりの廊", type: "蕩", from: 2, traps: ["tickle", "tickle", "tickle"], den: [["fluff", 2]], desc: "壁一面に羽根の腕が畳まれている。空気がかすかに、くすぐったい" },
    sucker_hall: { skin: "tentacle", name: "吸盤の壁",   type: "絡", from: 2, traps: ["sucker", "sucker", "curtain"], den: [["hoshibami", 2]], desc: "左右の壁が、吸盤でびっしり覆われた通路" },
    honey_cave:  { skin: "slime", name: "蜜溜まりの間", type: "蕩", from: 2, traps: ["honey", "honey"], den: [["nikubana", 1], ["kabeguchi", 1]], aura: ["蕩", 0.25], desc: "床のあちこちに琥珀色の蜜。甘い匂いで、喉が渇く" },
    box_room:    { skin: "boudoir", name: "装具の蔵",   type: "蕩", from: 3, traps: ["toybox", "suit"], den: [["mimic", 1]], desc: "宝箱と、上等な衣が掛けられた衣桁。どれも手招きしているように見える" },
    web_hall:    { skin: "tentacle", name: "淫糸の巣",   type: "絡", from: 3, traps: ["web", "web", "web"], den: [["puppet_hand", 2]], desc: "天井から床まで、細い糸が縦横に張られている" },
    rune_road:   { skin: "cult", name: "淫紋の敷石", type: "蕩", from: 4, traps: ["rune", "rune", "rune", "rune"], den: [["banjin", 1]], desc: "床石の一枚ずつに、薄く紋が彫られている。どこを踏んでも、灯りそうだ" },
    mouth_floor: { skin: "flesh", name: "肉の床",     type: "蕩", from: 5, den: [["kabeguchi", 3]], aura: ["蕩", 0.25], desc: "石だったはずの床が、ところどころ柔らかい。踏むと、温かい" },
    lord_den:    { skin: "tentacle", name: "触手の主の坑", type: "絡", from: 7, den: [["tentacle_lord", 1], ["roper", 1]], seal: 8, desc: "坑の底で、太い触腕の束がゆっくりと脈打っている" },
    pond:        { skin: "slime", name: "水妖の沼",   type: "絡", from: 3, den: [["suiyou", 3]], desc: "床が浅い水に沈んでいる。水面が、ときどき人の腕の形に盛り上がる" },
    spore_field: { skin: "flesh", name: "胞子の花畑", type: "蕩", from: 3, den: [["sekitake", 3], ["shibire", 2]], aura: ["蕩", 0.2], desc: "膝ほどの茸がびっしり。歩くたびに、粉が舞う" },
    // ---- ワルドーの支部 ----
    w_intake:    { skin: "lab", name: "受付と採寸", type: "絡", from: 2, center: "capture", den: [["waldo_grunt", 2]], wake: 3, desc: "白い床に、人の形の枠が描かれている。壁に『素体受付』の札" },
    w_ray_room:  { skin: "lab", name: "催眠照射室", type: "惑", from: 2, center: "hypno_ray", den: [["drone_camera", 2]], seal: 7, desc: "四隅にレンズ付きの装置。床の中央だけ、光が集まるように磨かれている" },
    w_furnace:   { skin: "lab", name: "精気吸収炉", type: "削", from: 3, center: "furnace", den: [["waldo_grunt", 2]], desc: "部屋の中央で、炉が心臓のように脈打っている" },
    w_lab:       { skin: "lab", name: "開発室",     type: "蕩", from: 3, center: "exam", den: [["karte", 1], ["drone_tickle", 1]], seal: 8, desc: "白い台と器具の盆。壁の書類棚に、検体の記録がずらりと並ぶ" },
    w_pod_hall:  { skin: "lab", name: "戦闘員化ポッド", type: "惑", from: 5, center: "pod", traps: ["pod"], den: [["waldo_grunt", 3]], wake: 4, desc: "人型のポッドが壁際にずらりと並ぶ。一つが、ひとりでに開いた" },
    w_command:   { skin: "lab", name: "幹部室",     type: "惑", from: 6, den: [["waldo_officer", 1], ["waldo_grunt", 2], ["drone_capture", 1]], seal: 8, desc: "組織の紋章の掛かった部屋。机の上に、ルミナの写真と『回収予定』の書類" },
    w_drone_bay: { skin: "lab", name: "ドローン格納庫", type: "絡", from: 2, den: [["drone_capture", 2], ["drone_tickle", 1], ["drone_camera", 1]], desc: "天井の棚に、球体の機械が並んで眠っている" },
    // ---- 蟲 ----
    worm_nest:   { skin: "worm", name: "蟲の塒",     type: "絡", from: 2, traps: ["mushi_pit"], den: [["haimushi", 1], ["zuidou", 2]], desc: "丸い小部屋。床のくぼみで、細い蟲がかたまって蠢いている" },
    hive_cave:   { skin: "worm", name: "響き孔の洞", type: "蕩", from: 3, center: "hive_wall", den: [["hibiki", 3]], seal: 6, desc: "壁一面に孔。奥で光るものが、何百とひしめいて震えている" },
    drop_shaft:  { skin: "worm", name: "吊り蟲の縦穴", type: "蕩", from: 2, den: [["tsurimushi", 4]], desc: "天井から、糸の先で光る管がいくつも垂れている。ちょうど目の高さで揺れている" },
    mud_hall:    { skin: "worm", name: "泥の広間",   type: "絡", from: 3, den: [["doromushi", 3]], aura: ["蕩", 0.15], desc: "広間が膝まで泥に沈んでいる。濁った底を、白く細長い影がよぎる" },
    leech_bank:  { skin: "worm", name: "ヒルの水辺", type: "蕩", from: 3, den: [["hiru", 3]], desc: "浅い水たまりのふちで、腕ほどに太ったヒルがてらてら光っている" },
    // ---- 変生の神殿 ----
    f_ring_hall: { skin: "lab", name: "締環の廊",   type: "蕩", from: 1, traps: ["ring", "temari", "temari"], den: [["tenohira", 1]], desc: "宙に金属の環がくるくると回っている。鞠がいくつも、床を転がっている" },
    f_moss_wall: { skin: "flesh", name: "鞘苔の壁",   type: "蕩", from: 2, den: [["sayagoke", 3]], aura: ["蕩", 0.2], desc: "壁の窪みに袋の形の苔。どれも口を上に向け、生温かい湯気を立てている" },
    f_count_room:{ skin: "cult", name: "数取りの間", type: "蕩", from: 3, center: "count_altar", den: [["sakiimp", 1]], seal: 8, desc: "低い石の祭壇。升目は十二。どれも、まだ空っぽだ" },
    f_gauze_room:{ skin: "boudoir", name: "研ぎ布の台", type: "蕩", from: 3, center: "gauze", den: [["tenohira", 1]], desc: "ぬめる布を張った台が一つ。布の端が、ゆっくり左右に揺れている" },
    f_suck_room: { skin: "slime", name: "吸い管の室", type: "蕩", from: 4, center: "suikan", den: [["ukegame", 2]], seal: 8, desc: "壁から透明な管が何本も垂れている。どれも先が、ひくひくと開いている" },
    f_worm_hall: { skin: "worm", name: "咥え蟲の穴", type: "蕩", from: 2, den: [["kuwaemushi", 3]], desc: "白い蟲が、口だけをこちらへ向けて並んでいる" },
    f_nama_room: { skin: "flesh", name: "生殺しの花園", type: "蕩", from: 5, center: "namagoroshi", traps: ["lips"], den: [["sakiimp", 1]], desc: "寸前で止まったまま咲いている花。壁には、唇の形の花がびっしり" },
    f_feather:   { skin: "boudoir", name: "綿毛の寝所", type: "蕩", from: 2, center: "feather_bed", den: [["tenohira", 1]], desc: "ふかふかの綿毛の寝床。いかにも、休んでいけと言わんばかり" },
    // ---- 教団の拠点 ----
    c_hall:      { skin: "cult", name: "説法の広間", type: "惑", from: 1, center: "yurugi", den: [["sekkyoushi", 1], ["shinja", 2]], wake: 3, desc: "香が霞のようにたなびく広間。高座に、揺さぶりの魔導具が据えてある" },
    c_ray_room:  { skin: "cult", name: "怪光線の間", type: "蕩", from: 2, center: "kaikou", den: [["shinja", 2]], desc: "天井に据えられた魔導具のレンズが、部屋の真ん中を向いている" },
    c_photo:     { skin: "cult", name: "教祖の写真の間", type: "惑", from: 3, center: "shashin", den: [["shinja", 1]], seal: 6, desc: "丸い部屋。壁一面に、同じ男の写真が隙間なく貼られている" },
    c_extract:   { skin: "cult", name: "抽出の間",   type: "蕩", from: 3, center: "jouka", traps: ["seisui"], den: [["chuushutsu", 2]], seal: 8, desc: "むせ返るほど甘い匂い。台と、バケツと、スポイト" },
    c_treasury:  { skin: "cult", name: "魔石の蔵",   type: "削", from: 2, traps: ["maseki", "maseki"], den: [["shinja", 2]], desc: "桃色に光る丸い石が、棚に並んでいる" },
    c_sanctum:   { skin: "cult", name: "教祖の間",   type: "惑", from: 8, center: "shashin", den: [["kyouso", 1], ["shinja", 2]], seal: 10, aura: ["蕩", 0.3], desc: "むせ返る雌と雄の匂い。寝台の上に、あの顔がある" },
    // ---- 淫魔の館 ----
    i_stage:     { skin: "boudoir", name: "中継の舞台", type: "惑", from: 1, den: [["jikkyou", 1], ["imp", 1]], traps: ["glue"], desc: "床が飴のようにねばつく小さな舞台。天井の梁に、誰かが座っている" },
    i_count:     { skin: "boudoir", name: "数え歌の廊", type: "惑", from: 2, den: [["kazoe", 1], ["nikubana", 1]], desc: "石畳の割れ目から花のつぼみ。甘い匂い。梁の上で、誰かが指を一本立てている" },
    i_tickle:    { skin: "boudoir", name: "擽りの間",   type: "蕩", from: 2, den: [["kusuguri", 2]], desc: "天井から粘糸が垂れている。梁の上で、細い尾が揺れている" },
    i_mock:      { skin: "boudoir", name: "嘲りの張り出し", type: "惑", from: 3, den: [["azakeri", 1], ["haimushi", 1]], desc: "張り出しの上に小さな影。足をぷらぷらさせながら、こちらを見下ろしている" },
    i_kiss:      { skin: "boudoir", name: "口づけの寝所", type: "惑", from: 4, center: "kouro", den: [["kuchizuke", 1], ["futago", 1]], seal: 7, desc: "甘い煙の籠もる寝所。天蓋の奥で、唇を舐める音がする" },
    i_contract:  { skin: "boudoir", name: "契約の書庫", type: "惑", from: 3, traps: ["keiyaku", "kouro"], den: [["inma", 1]], desc: "書架の間に、宝物のように置かれた巻物が一つ" },
    i_throne:    { skin: "boudoir", name: "嗤いの玉座", type: "惑", from: 7, den: [["muma_queen", 1], ["jikkyou", 1], ["azakeri", 1]], seal: 10, aura: ["惑", 0.25], desc: "繭を積み上げた玉座。まわりを漂う小淫魔たちが、こちらを見てくすくす笑う" },
  };

  /* ---- ダンジョン ---- 固定枠4＋自由枠（候補から選ぶ）。削はどこでも自由枠に入れられる */
  const DRAIN = ["drain_roper", "ghost_head", "pot", "wisp"];
  G.DUNGEONS = {
    mist: { name: "霧鏡の回廊", type: "惑", floors: 10, pal: { floor: "#3a3548", floor2: "#342f42", wall: "#0e0b14", wallTop: "#6a6080", edge: "#5a4e74", fog: "#8a7cc0" },
            fixed: ["gazer", "mind_roper", "moth", "mirror_slime"], free: ["imp", "peeper", "tsukite", "medama", "inma", "futago", "muma_queen", "shibire", "hitomi", "utaimp", ...DRAIN], traps: ["bell", "mirror", "decoy", "shrine", "basin", "pillory", "belt", "tower", "shadow", "echo_gate", "lull_voice", "stasis", "vow", "whisper_ring", "suit", "rune"],
            rooms: ["mirror_hall", "hypno_bell", "twin_shadow", "dreamwalk", "fungal_bed", "purify", "caliper", "pillory", "whisper", "shadow_hall", "imp_nest", "edge_parlor", "dream_throne", "echo_hall", "stasis_room", "box_room"],
            desc: "鏡と霧の遺跡。見たものを信じるほど深く迷う" },
    mire: { name: "蜜溜まりの湿窟", type: "蕩", floors: 10, pal: { floor: "#43323a", floor2: "#3b2c33", wall: "#100a0c", wallTop: "#7a5a64", edge: "#7a4a5c", fog: "#c07a98" },
            fixed: ["slime", "slug", "jellyfish", "lure_cap"], free: ["fluff", "nikubana", "sasayaki", "miwakubana", "namekuji", "namequeen", "firstslug", "mitsusui", "bishin", "dakitake", "kouryuu", "shousha", "banjin", "sekitake", "kabeguchi", "inyoku", "hoshibami", "inma", "hiru", "hibiki", "tsurimushi", "doromushi", ...DRAIN], traps: ["glue", "vent", "urn", "shrine", "basin", "tease", "belt", "slime_drop", "bud", "altar", "saddle", "itch", "tickle", "aphro_wall", "toybox", "honey", "rune", "vow"],
            rooms: ["tent_flood", "foam_cell", "mist_hall", "gel_urn", "tease_rack", "hot_spring", "purify", "fungal_bed", "feed_belt", "slime_ceil", "bud_hall", "flower_bed", "incense_pool", "hug_grove", "beam_hall", "seal_altar", "cocoon_room", "itch_cell", "saddle_pit", "tickle_hall", "honey_cave", "rune_road", "mouth_floor", "spore_field", "edge_parlor", "hive_cave", "drop_shaft", "mud_hall", "leech_bank"],
            desc: "甘い湿気の籠もる洞窟。息をするだけで熱がこもる" },
    vine: { name: "絡繰りの蔦森", type: "絡", floors: 10, pal: { floor: "#323d34", floor2: "#2c362e", wall: "#0a0e0b", wallTop: "#5e6a5c", edge: "#4a6a52", fog: "#7ab08a" },
            fixed: ["roper", "hanging_vine", "puppet_hand", "gulper_worm"], free: ["goblin", "mimic", "nikubana", "miwakubana", "namekuji", "tsukite", "suiyou", "hoshibami", "tentacle_lord", "kabeguchi", "zuidou", "gitai", "haimushi", ...DRAIN], traps: ["vine", "rope", "glue", "shrine", "basin", "pillory", "belt", "root", "cocoon", "ratchet", "shadow", "armor", "net", "pitfall", "curtain", "sucker", "web", "exam"],
            rooms: ["tent_flood", "vine_hall", "kote_swarm", "tent_pit", "idle_cell", "caliper", "feed_belt", "pillory", "fungal_bed", "purify", "root_floor", "cocoon_room", "ratchet_room", "shadow_hall", "flower_bed", "armor_hall", "sucker_hall", "web_hall", "lord_den", "pond", "mouth_floor", "worm_nest", "mud_hall"],
            desc: "蔦に呑まれた古い砦。道も壁も、ゆっくり動く" },
    waldo: { name: "ワルドーの支部", type: "惑", floors: 10, pal: { floor: "#2e3240", floor2: "#282b38", wall: "#0a0b10", wallTop: "#565c74", edge: "#4c5a7a", fog: "#7a90c0" },
            fixed: ["waldo_grunt", "waldo_officer", "drone_capture", "drone_camera"], free: ["drone_tickle", "karte", "inma", "tsukite", ...DRAIN], traps: ["hypno_ray", "capture", "net", "pitfall", "exam", "furnace", "pod", "stasis", "echo_gate", "suit"],
            rooms: ["w_intake", "w_ray_room", "w_furnace", "w_lab", "w_pod_hall", "w_command", "w_drone_bay", "echo_hall", "stasis_room", "box_room"],
            desc: "催眠と洗脳で人を戦闘員に変える組織の支部。ひかりを狙っている" },
    // 入ると『変生』（ふたなり化）の呪いがかかる。潜行のあいだだけ
    futa: { name: "変生の神殿", type: "蕩", floors: 10, futa: true, pal: { floor: "#4a3038", floor2: "#422a32", wall: "#140a0e", wallTop: "#8a5a68", edge: "#8a4a60", fog: "#d08aa8" },
            fixed: ["kuwaemushi", "tenohira", "sayagoke", "sakiimp"], free: ["ukegame", "hibiki", "futago", "inma", "hiru", "bishin", ...DRAIN], traps: ["ring", "temari", "lips", "gauze", "count_altar", "feather_bed", "namagoroshi", "suikan", "aphro_wall", "tease"],
            rooms: ["tent_flood", "f_ring_hall", "f_moss_wall", "f_count_room", "f_gauze_room", "f_suck_room", "f_worm_hall", "f_nama_room", "f_feather", "tease_rack"],
            desc: "入った者の身体を作り変える神殿。潜っているあいだ、そこに無かったものが生える" },
    // 教団：攻めに行く。潜入はしない
    cult: { name: "教団の拠点", type: "惑", floors: 10, pal: { floor: "#3e3438", floor2: "#382e32", wall: "#100c0e", wallTop: "#7a6a70", edge: "#8a4a4a", fog: "#c09a8a" },
            fixed: ["shinja", "sekkyoushi", "chuushutsu", "roper"], free: ["kyouso", "tsurimushi", "nikubana", "miwakubana", "mitsusui", ...DRAIN], traps: ["yurugi", "kaikou", "shashin", "maseki", "seisui", "jouka", "vow", "net", "altar"],
            rooms: ["c_hall", "c_ray_room", "c_photo", "c_extract", "c_treasury", "c_sanctum", "leech_bank", "seal_altar"],
            desc: "『性の悦びこそ救い』と説く教団の拠点。媚薬と魔導具で人を狂わせる。叩き潰しに行く" },
    imp: { name: "淫魔の館", type: "惑", floors: 10, pal: { floor: "#3a2c40", floor2: "#342638", wall: "#0e0812", wallTop: "#7a5a86", edge: "#8a4a8a", fog: "#c08ad0" },
            fixed: ["imp", "jikkyou", "kusuguri", "kazoe"], free: ["azakeri", "kuchizuke", "futago", "inma", "muma_queen", "sakiimp", "utaimp", "hitomi", "tenazuke", ...DRAIN], traps: ["kouro", "keiyaku", "vow", "lips", "tease", "glue", "feather_bed"],
            rooms: ["i_stage", "i_count", "i_tickle", "i_mock", "i_kiss", "i_contract", "i_throne", "imp_nest", "edge_parlor", "dream_throne"],
            desc: "淫魔たちの住まう館。自分では何もしない者ばかり。見て、数えて、嘲って、許しを出さない" },
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
    hpMax: 145, mpMax: 100, magicMax: 100, willMax: 100,
    spd: { magica: 3.15, civilian: 2.4 },
    shot: { dmg: 7, cost: 4, cd: 0.8, cast: 0.3, speed: 8, range: 6.5 },   // ルミナ・ショット（遠距離・消費大）
    melee: { dmg: 9, cost: 1, cd: 0.65, cast: 0.16, range: 1.35, arc: 1.25 },  // ルミナ・ストライク（杖で打つ・消費小）
    burst: { dmg: 11, cost: 16, cd: 5, cast: 0.7, radius: 2.3, magic: 3 },   // シャイン・バスター
    flash: { cost: 12, cd: 9, radius: 2.3, push: 1.3, stun: 1.2 },   // ルミナ・フラッシュ（囲まれた・二か所以上掴まれた時に弾き飛ばす）
    breakout: { cd: 5, dist: 2.8 },                                    // 囲まれたら、空いている方へ突き抜ける
    mpRegen: 2.6, mpRest: 6.5,
    noTransform: 25,                                       // 変身が解けてから、また変身できるまで（秒）
    transformCast: 1.6,                                    // 星の雫で変身し直すのにかかる時間
    kit: { star: 2, salve: 2, smelling: 1, ether: 2, cool: 0, knife: 0 },
    // 装備（今はフレーバー。変身中と素の姿で入れ替わる）
    equip: {
      magica:   ["星杖「スターライト・ロッド」", "魔法衣装（白と菫）", "変身のコンパクト", "相棒の妖精（プラム）"],
      civilian: ["セーラー服", "変身のコンパクト", "相棒の妖精（プラム・鞄の中）"],
    },
    // 仮設の白山遥（Game2 の設定から）。変身はしない
    equipHaruka: ["打刀「忠」（腐食耐性。離れても手元へ還る）", "巫女装束（紅白）", "脛当てと草鞋", "故郷の御守り"],
  };

  /* ---- ひかりの成長：レベル（ゆっくり・上限あり）と、閃き（ロマサガ式）----
   * 時間が巻き戻らない（毎日が続く）ので、レベルで強くなりすぎないように、伸びは小さく頭打ちにする。
   * 本当の伸びしろは「閃き」：戦いの最中に、低い確率で新しい技や戦い方を思いつく。装備できる数は限られる。
   * how：閃くきっかけ（dodge 避けた時／shot 光弾／melee 杖／burst 大技／struggle もがいた時／flash 光で弾いた時／rest 息を整えた時／pinch 追い詰められた時／hit 何かを浴びた時／walk 歩いている時）
   */
  G.SKILLS = {
    mikiri:    { name: "見切り",                 how: "dodge",    desc: "構えを見てから避けるまでが速くなる" },
    stardust:  { name: "スターダスト・ステップ", how: "dodge",    desc: "避ける一歩が伸び、その瞬間だけ何にも捕まらない" },
    twin:      { name: "ルミナ・ツインショット", how: "shot",     desc: "光弾を二発まとめて撃つ（一発ずつは軽い。MPを少し多く使う）" },
    spear:     { name: "スター・スピア",         how: "melee",    desc: "杖の突きが伸び、重くなる" },
    nova:      { name: "シャイン・ノヴァ",       how: "burst",    desc: "シャイン・バスターが広く、強くなる" },
    hodoki:    { name: "縄抜けの型",             how: "struggle", desc: "捕まった時、もがき方が上手くなる" },
    heartlock: { name: "心の錠",                 how: "struggle", desc: "捕まって触れられても、快感が入りにくい" },
    flash2:    { name: "フラッシュ・ヴェール",   how: "flash",    desc: "ルミナ・フラッシュが軽く、広く、早く使える" },
    prism:     { name: "プリズム・ガード",       how: "hit",      desc: "浴びせられる熱や惑いを、少し弾く" },
    breath:    { name: "月光の呼吸",             how: "rest",     desc: "MPと気力の戻りが早くなる" },
    wind:      { name: "追い風",                 how: "walk",     desc: "足取りが軽くなる" },
    veil:      { name: "ルミナ・ヴェール",       how: "pinch",    desc: "階ごとに一度だけ、掴みかかってきた手を弾く" },
  };
  G.GROWTH = {
    lvMax: 30,
    xpNeed: lv => Math.round(40 * Math.pow(lv, 1.35)),          // 次のレベルまで
    hpMax: lv => 145 + Math.min(40, 2 * (lv - 1)),   // 星の欠片1つにつき、体力+3・MP+2・最初の気力+1（気力は15まで）
    mpMax: lv => 100 + Math.min(30, Math.round(1.5 * (lv - 1))),
    dmg: lv => 1 + Math.min(0.3, 0.02 * (lv - 1)),
    slots: lv => 2 + (lv >= 6 ? 1 : 0) + (lv >= 14 ? 1 : 0),     // 装備できる技の数（最大4）
  };

  /* ---- 迷宮の法則（Game2）：潜行の入口で決まり、潜行全体に効く。無い日もある ---- */
  G.LAWS = {
    shumoku:   { name: "衆目の法則", note: "触れるより『見られる』。視線の熱が増し、見られながら達した姿は記録に残る" },
    juntaku:   { name: "潤沢の法則", note: "空気そのものが媚薬。入った時点で、もう効いている" },
    kinzetsu:  { name: "禁絶の法則", note: "この迷宮の中では達することが許されない。溜まった分は、門を出た瞬間に全部返ってくる" },
    seishi:    { name: "静止の法則", note: "捕らえて、何もしない。拘束が長く、時間そのものが責めになる" },
    boukyaku:  { name: "忘却の法則", note: "されたという事実ごと奪う。本人は『何も無かった』と信じて帰る" },
    eibin:     { name: "鋭敏の法則", note: "階を降りるたび、肌の感覚だけが研ぎ澄まされていく" },
    hakudatsu: { name: "剥奪の法則", note: "階を降りるごとに装束が失われていく" },
    kokuin:    { name: "刻印の法則", note: "入口で淫紋を刻まれる。潜るほど、紋が効いてくる" },
    yuuka:     { name: "雄化の法則", note: "入った者の身体を作り変える。帰れば戻る。記録は、戻らない" },
  };

  /* ---- 性癖（Game2・Game4）：行動の積み重ねで身につき、消えない。段階 1〜3 ----
   * count: 数える事柄（game.js の finishDive で数える）／need: 段階ごとの必要数
   * どれも戦力を減らさない（Game4 の考え）：その場面の快感の入りが増え、代わりに同じ責めへの慣れ（振りほどき）も増える */
  G.SHARD_MAX = 20;   // 星の欠片は20まで
  G.TRAITS = {
    swarmHabit: { name: "群がられ癖",   count: "swarm",   need: [3, 8, 16],  ctx: "swarm",   desc: "何人もの手に一度に触れられると、どこで感じているのか分からなくなる" },
    loser:      { name: "負け癖",       count: "defeat",  need: [2, 4, 7],   ctx: "bound",   desc: "組み伏せられた時、抗うより先に息が抜けるようになった" },
    bindhabit:  { name: "拘束癖",       count: "hold",    need: [8, 20, 40], ctx: "bound",   desc: "手足を塞がれた形を、身体が覚えてしまった" },
    edgeweak:   { name: "焦らし弱",     count: "edge",    need: [3, 7, 14],  ctx: "edge",    desc: "栓をされている間の宙吊りに、身体が期待を覚えた" },
    squirthabit:{ name: "決壊癖",       count: "climax",  need: [6, 15, 30], ctx: "climax",  desc: "一度決壊すると、止め方が分からなくなった" },
    publicHeat: { name: "見られ熱",     count: "watched", need: [3, 7, 14],  ctx: "watched", desc: "視線が肌に触れているように感じる" },
    drainBliss: { name: "吸われ悦び",   count: "drain",   need: [6, 15, 30], ctx: "drain",   desc: "吸い出される感触が、失う感覚ではなく預ける感覚になった" },
    musk:       { name: "雄臭への発情", count: "sniff",   need: [2, 5, 10],  ctx: "musk",    desc: "雄の臭いと発情が結びついた。嗅ぐだけで、身体が先に支度をする" },
    sigilJoy:   { name: "紋を灯す悦び", count: "sigil",   need: [2, 5, 10],  ctx: "sigil",   desc: "紋が灯る感触を、身体が先に憶えた" },
    hypnoObey:  { name: "忘れる従順",   count: "hypno",   need: [2, 5, 10],  ctx: "hypno",   desc: "覚えていないことには抗えない。抗う理由の方が、先に流れていく" },
    waitfall:   { name: "待ち堕ち癖",   count: "drawn",   need: [2, 5, 10],  ctx: "drawn",   desc: "待っているものに、自分から近づいてしまう" },
    ticklish:   { name: "弱擽過敏",     count: "tickle",  need: [2, 5, 10],  ctx: "tickle",  desc: "笑いを堪えることが、そのまま熱に変わるようになった" },
    engulfCalm: { name: "丸呑まれ安堵", count: "engulf",  need: [4, 10, 20], ctx: "engulf",  desc: "包み込まれると、抗うより先に息が落ち着く" },
    rhythmSub:  { name: "律動従属",     count: "machine", need: [3, 8, 16],  ctx: "machine", desc: "機械の一定の拍子に、身体が合わせてしまう" },
    impLove:    { name: "淫魔好き",     count: "imp",     need: [3, 8, 16],  ctx: "imp",     desc: "淫魔の甘い声を聞くと、胸が勝手に跳ねる" },
    wormCalm:   { name: "蟲馴染み",     count: "worm",    need: [3, 8, 16],  ctx: "worm",    desc: "服の中で何かが這う感触に、身体が慣れてしまった" },
    shasei:     { name: "変生の悦び",   count: "shasei",  need: [2, 6, 12],  ctx: "futa",    desc: "無かったはずの場所の快感を、身体が覚えてしまった" },
    prayer:     { name: "祈り癖",       count: "pray",    need: [2, 5, 10],  ctx: "pray",    desc: "腰を揺らして祈る形を、身体が先に覚えてしまった" },
    kissHabit:  { name: "口づけ癖",     count: "kiss",    need: [2, 5, 10],  ctx: "kiss",    desc: "唇が触れると、抗うより先に目を閉じてしまう" },
  };
  G.TRAIT_STAGE = ["", "芽生え", "癖", "刷り込み"];

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
