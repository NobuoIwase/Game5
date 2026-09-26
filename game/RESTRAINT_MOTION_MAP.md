# 拘束モーションのゲーム内での使い道（ゲーム側の対応表）

`character-motion-v1/motion/restraint.mjs` の汎用モーションを、ゲームのどの場面に使うか。依頼書（`character-motion-v1/RESTRAINT_MOTION_REQUEST.md`）には書かない情報なので、ここにまとめる。

| モーション | 使う場面 |
|---|---|
| `arms_behind_squirm` / `arms_behind_wrench` | 後ろ手の拘束中の待機／振り払い（もがき） |
| `elbows_up_strain` | 両手首を吊られた拘束中の振り払い |
| `legs_pulled_open` → `legs_held_open` | 触手に脚を開かれる → 開かれたまま |
| `hip_rock_spread` / `hip_rock_closed` | 素股（ガニ股／内股で挟む） |
| `bounce_spread` / `bounce_hung` | 挿入中の上下（ガニ股／腕を吊られて） |
| `tension_tiptoe` / `tension_arch` | エステラ（絶頂）：爪先を伸ばす／のけぞり |
| `afterglow_spread` → `recover_spread` | `tension_tiptoe`（絶頂）のあとの余韻 → 回復（脚を開かれた拘束に戻る） |
| `afterglow_slump` → `recover_slump` | `tension_arch`（のけぞり絶頂）のあとの余韻 → 回復（吊られた拘束に戻る） |
| `bent_over` | 尻を突き出す前屈みの拘束（後ろ・斜め後ろ向きで表示） |

股の下を通る触手・床から伸びる触手は、ゲーム側で描く（骨格データの `crotch` の点が位置の目安）。

## 床・口づけ・拘束なし・張り付き（`character-motion-v1/motion/scenes.mjs`、依頼書 `SCENE_MOTION_REQUEST.md`）

| モーション | 使う場面 |
|---|---|
| `down_fall_back` | 押し倒される（倒れ込み） |
| `down_pinned_kick` | 押し倒されて両手首を押さえられ、脚で抵抗 |
| `down_pinned_spread` | 押し倒されて脚を開かれる（M字） |
| `down_pinned_rock` | 押し倒された状態での挿入中（正常位の前後） |
| `down_face_down` | うつ伏せに押さえ込まれる |
| `down_hips_up` | うつ伏せで尻を上げさせられた状態での挿入中（後背位） |
| `get_up` | 押し倒しからの脱出・起き上がり |
| `kiss_forced` | キス責め（抵抗中） |
| `kiss_tension` | キス絶頂 |
| `kiss_respond` | キス応答（快楽堕ちが進んだ状態・誘惑状態） |
| `tempt_pose` | 誘惑状態 |
| `chain_splay` | 連続絶頂中の脚開き（がに股で震える） |
| `tension_free` | 非拘束絶頂（立ったまま絶頂して座り込む） |
| `sit_afterglow` | 絶頂後の余韻・へたり込み |
| `held_from_behind` | 背後からの抱きつき拘束 |
| `down_afterglow` → `down_recover` → `get_up` | 押し倒されての絶頂後の余韻 → 回復 → 起き上がり |
| `kiss_afterglow` → `kiss_recover` | キス絶頂（`kiss_tension`）後の余韻 → 回復 |
| `sit_afterglow` → `sit_recover` | 非拘束絶頂（`tension_free`）後の余韻 → 回復。連続絶頂（`chain_splay`）の終わりにも使える |
| `clinger_peel` | 吸液羽虫など張り付きモンスターの引き剥がし（胸の左右・下腹） |
| `clinger_tension` | 非拘束絶頂（張り付きモンスター） |
| `clinger_accept` | 張り付きモンスター受け入れ |
| `clinger_afterglow` → `clinger_recover` | 非拘束絶頂（張り付き、`clinger_tension`）後の余韻 → 回復（張り付かれたまま） |

## 拘束の種類ごと・ゲーム内の状態ごと（v3 で追加）

ゲームの拘束の見た目（`lewd-v035.js` の `STYLE`）と、押し倒し（`grapple-v026.js` の `HEAVY`）に合わせたもの。

| モーション | 使う場面 |
|---|---|
| `grabbed_flinch` | 拘束が始まった瞬間（全種共通） |
| `down_tension` → `down_afterglow` | 押し倒し中のエステラ（ゲームの `pinnedClimax`）。灰冠の粘魔・絹輪ワーム・水妖・灰冠の従者・石の番兵・女王羽虫 |
| `engulf_sink` → `engulf_struggle` / `engulf_rock` → `engulf_tension` | 呑み込み（engulf）で押し倒しにならない種：艶沼ナメクジ・鏡面スライム。もがき中 → 特殊攻撃のたび → エステラ |
| `wrap_squeeze` → `wrap_tension` | 巻きつき（wrap）で押し倒しにならない種：糸繰り蜘蛛・誘い茸・粘花・影の手（罠） |
| `ankle_grabbed` | 這い寄る手の「足首つかみ」 |
| `clinger_*` | 吸着羽虫（cling）。3匹目の位置をゲームと同じ陰核の位置（骨格の `groin`）に直した |
| `spore_inhale` | ルマネ胞子球（spore）、誘い茸の「甘い胞子」、胞子霧の中 |
| `shiver_hug` | 夢鱗蛾の鱗粉（dust）、漂い霊の冷気（mist） |
| `gaze_trance` | 凝視の眼（gaze）の拘束、催眠のあとのトランス（`heat-v027.js` の trance） |
| `bubble_float` | 泡吹き貝（bubble） |
| `break_free` | 拘束を自力で振りほどいたとき（今の共通の `recover` の代わり） |
| `edge_pull` | 寸止め後に体が勝手に寄る（`edgePull`） |
| `daze_sway` / `reach_toward` | 欲求の波が高いときの `daze` / `drift`、魅了の波で手を伸ばす |
| `swing_abandon`（攻撃モーション） | 魅了した相手を斬れずに攻撃を中断する（`charm-v028.js` の hesitate） |
| `walk_unsteady` | 拘束・絶頂のあとの余韻の歩き、張り付かれたまま歩く、濡れたまま歩く |
| `trip_fall` | 疲れて回避でつまずく（`ai-v026.js` の trip） |
| `defeat_collapse` | 戦闘不能（`defeat`） |

相手の体・張り付く生き物・床から伸びる触手は、ゲーム側で描く。相手の頭の位置は `binds` の `partner`、生き物の位置は `chest_left` / `chest_right` / `belly`。
