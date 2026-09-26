# 作り方の計画（1枚絵と部位の組み立ての振り分け）

作成：Claude（`node tools/build_plan.mjs` で再生成。機械が読む版は `motion/plan.json`）。

## 考え方

作業量と絵の質の間を取る。
- **1枚絵で丁寧に描く**：動きの見え方を決めるコマだけ
- **部位の組み立て**：残り（歩行と同じ作り方）
- **同じ絵**：これまでどおり描かない（`REUSE_LIST.md`）

| 区分 | 対象 |
|---|---|
| **1枚絵** | 攻撃：構え・溜め・命中・その直後（破城斬りは頂点・叩きつけ・衝撃、ためらいは止まる・目をそらす）を8方向<br>1回きりのモーション：名前の付いたキー姿勢（絶頂の頂点は必ず）。ただし、すでに1枚絵にするキーと12px以内の近い姿勢は、それを元に組み立てる<br>ループ：0コマ目・いちばん大きく動いたコマ・1回だけの見せ場（余震など） |
| **組み立て＋描き足し** | 上以外で、新しい部位の絵を4つ以上同時に使うコマ（寝た姿勢・前屈み・強い反りなど、組み立てだけでは硬く見えやすい） |
| **部位で組み立て** | 中割り、つなぎ、構えたままの前進・後退、ふらつく歩き、ループの残りのコマ |
| **同じ絵** | 体も顔もほかのコマと同じ |

## キャラクターごと

拘束・床・口づけ・張り付き・つなぎなどの共通のモーションは、キャラクターごとに描く。1人あたりの量は次のとおり。
- アリア：剣の攻撃＋共通
- ほかのヒロイン：自分の技・仕草＋共通

| キャラクター | 1枚絵 | 組み立て＋描き足し | 部位で組み立て | 同じ絵 | 新しい部位の絵 |
|---|---|---|---|---|---|
| アリア（戦士） | 290 | 69 | 972 | 304 | 103枚 |
| 斥候（シーフ） | 205 | 64 | 870 | 194 | 90枚 |
| 魔法使い | 193 | 57 | 832 | 203 | 85枚 |
| ヒーラー | 174 | 55 | 717 | 190 | 79枚 |

- 曲げた肘・膝の絵（27枚）と手の形（3種類×方向）も、キャラクターごとに要る
- 各ヒロインの特徴（背負ったバックパック・尻尾、機械の腕、胸の動きなど）の描き方は `HEROINE_MOTION_REQUEST.md`

## 全体（全キャラクターの依頼を重ねずに数えたもの）

全2400コマのうち：
- **1枚絵 424**
- **組み立て＋描き足し 80**
- **部位で組み立て 1494**
- 同じ絵 402

**組み立てに使う新しい部位の絵：110枚**（うち表情27枚）
- **曲げた肘・膝の絵：27枚**
  - 半分（60〜110度）／深く（110度〜）×方向
  - 歩行の肘は最大42度ほどしか曲がらないため、それより曲がる関節には専用の絵が要る
  - 組み立てのコマのうち、半分曲げが1016コマ、深く曲げが326コマ
- 手の形：3種類（開いた手のひら・体に当てる手・強く握った手）×方向
- 衣装・髪の差分：キャラクターごとに別途
- 部位の分け方の前提は `REUSE_LIST.md` 後半のとおり（各キャラクターを歩行と同じ部位に8方向ぶん分ける）

| | 1枚絵 | 組み立て＋描き足し | 部位で組み立て | 同じ絵 | 計 |
|---|---|---|---|---|---|
| 攻撃 | 144 | 14 | 334 | 140 | 632 |
| 拘束された姿勢 | 30 | 2 | 95 | 9 | 136 |
| 床・口づけ・拘束なし・張り付き | 116 | 37 | 291 | 90 | 534 |
| ほかのヒロイン | 134 | 10 | 491 | 71 | 706 |
| つなぎ | 0 | 17 | 283 | 92 | 392 |

**比べると**
- すべて1枚絵：新規1279コマ＋部分描き替え52コマ
- すべて組み立て：部位の絵107枚だけで済むが、動きの要のコマまで組み立てになり、硬く見える
- この計画：要のコマ424枚を1枚絵にし、80コマは組み立てたあとに描き足す

## 部位の絵の描き方（関節が切り取ったように見えないように）

1枚絵から部位を切り出すと、関節の所が切り取られたように見える。
- 切り口に輪郭線が残る、トゲが出る、曲げると隙間ができる
- 歩行でも、脚の切り口のトゲや首の切り口の線を1つずつ直した（`walk-graphics-handoff/docs/04_HISTORY.md`）

そのため、**部位は部位として最初から描く**。1枚絵は切り出しに使わない。

1. **のりしろを付ける**
   - 上腕・前腕・太もも・すねは、関節の中心を越えて、太さの半分ほど先まで描く
   - 先は丸く閉じる
   - 隣の部位と重なって、曲げても隙間ができない
2. **切り口には輪郭線を描かない**
   - 関節側の端は、輪郭線を付けずにぼかすように終える
   - 外から見える輪郭は、隣の部位や関節の絵が受け持つ
3. **関節は別の絵にする**
   - 肩・肘・手首・股・膝・足首を、丸い関節の絵として別に描く（歩行と同じ）
   - 手前にあるときは上、奥にあるときは下に重ねる。関節の丸を常に一番上に貼ると、膝が逆向きに見える
4. **曲げた肘・膝は専用の絵**
   - 60度を超えて曲げる肘・膝は、曲げた形の関節の絵（上の27枚）を使う
   - 膝の前の角と裏のしわを、1枚の関節の絵に描いておく
   - 伸ばした関節の絵を回して、深い曲げをごまかさない
5. **胴には受け口を描く**
   - 上半身・下半身の絵に、肩・股・首がはまる受け口（`socket`）を描く
   - 腕・脚・首の付け根は、胴の絵の内側に隠れるようにする
6. **1枚絵と部位は同じ設定画から描く**
   - 絵柄・衣装・配色は、同じキャラクターの設定画と部位一覧をもとに、部位の絵と1枚絵の両方で合わせる
   - 1枚絵を部位の見本にはするが、切り出しには使わない
7. **組み立てたら関節を拡大して確かめる**（歩行の確認手順と同じ）
   - 首・肩・肘・膝・手首・足首を拡大する
   - 隙間、切り口の線、トゲ、裏向きの関節がないか見る
- **つなぎは短い**：1コマ70msで前後の絵に挟まれるので、部位の組み立てで十分
- **描き足しの範囲**：部位の境目の最終調整、胴の曲がり、衣装のしわや髪の流れ

## モーションごとの振り分け

### 攻撃

| id | 1枚絵で描くコマ | 組み立て＋描き足し | 部位で組み立て | 同じ絵 |
|---|---|---|---|---|
| `slash` | 32（各方向 0, 3, 6, 7 コマ目） | 2（各方向 5 コマ目） | 54 | 8 |
| `heavy` | 32（各方向 1, 3, 6, 7 コマ目） | 3（各方向 5 コマ目） | 35 | 18 |
| `kesa` | 24（各方向 3, 6, 7 コマ目） | 2（各方向 5 コマ目） | 38 | 32 |
| `yoko` | 24（各方向 3, 6, 7 コマ目） | 2（各方向 5 コマ目） | 38 | 32 |
| `thrust` | 16（各方向 2, 4 コマ目） | 0 | 29 | 26 |
| `advance` | 0 | 2（各方向 3 コマ目） | 62 | 0 |
| `retreat` | 0 | 2（各方向 5 コマ目） | 62 | 0 |
| `swing_abandon` | 16（各方向 3, 5 コマ目） | 0 | 16 | 24 |

### 拘束された姿勢

| id | 1枚絵で描くコマ | 組み立て＋描き足し | 部位で組み立て | 同じ絵 |
|---|---|---|---|---|
| `arms_behind_squirm` | 2（0, 2） | 0 | 6 | 0 |
| `arms_behind_wrench` | 2（0, 5） | 0 | 6 | 0 |
| `elbows_up_strain` | 2（0, 2） | 0 | 3 | 3 |
| `legs_pulled_open` | 2（0, 7） | 0 | 9 | 1 |
| `legs_held_open` | 2（0, 2） | 0 | 6 | 0 |
| `hip_rock_spread` | 2（0, 3） | 0 | 6 | 0 |
| `hip_rock_closed` | 2（0, 3） | 0 | 6 | 0 |
| `bounce_spread` | 2（0, 4） | 0 | 6 | 0 |
| `bounce_hung` | 2（0, 4） | 0 | 6 | 0 |
| `tension_tiptoe` | 2（0, 3） | 0 | 8 | 2 |
| `tension_arch` | 2（0, 3） | 2（5, 7） | 9 | 0 |
| `afterglow_spread` | 2（0, 5） | 0 | 5 | 1 |
| `recover_spread` | 0 | 0 | 4 | 2 |
| `afterglow_slump` | 2（0, 5） | 0 | 6 | 0 |
| `recover_slump` | 2（0, 2） | 0 | 3 | 0 |
| `bent_over` | 2（0, 2） | 0 | 6 | 0 |

### 床・口づけ・拘束なし・張り付き

| id | 1枚絵で描くコマ | 組み立て＋描き足し | 部位で組み立て | 同じ絵 |
|---|---|---|---|---|
| `down_fall_back` | 5（0, 2, 8, 12, 17） | 0 | 14 | 0 |
| `down_pinned_kick` | 2（0, 2） | 0 | 3 | 3 |
| `down_pinned_spread` | 2（0, 6） | 6（1, 2, 3, 4, 5, 7） | 0 | 0 |
| `down_pinned_rock` | 2（0, 3） | 6（1, 2, 4, 5, 6, 7） | 0 | 0 |
| `down_face_down` | 2（0, 4） | 2（10, 12） | 5 | 7 |
| `down_hips_up` | 2（0, 2） | 0 | 6 | 0 |
| `get_up` | 6（0, 4, 8, 13, 16, 18） | 0 | 13 | 0 |
| `kiss_forced` | 2（0, 6） | 0 | 3 | 3 |
| `kiss_tension` | 3（0, 3, 8） | 1（2） | 7 | 0 |
| `kiss_respond` | 2（0, 6） | 0 | 3 | 3 |
| `tempt_pose` | 2（0, 6） | 0 | 3 | 3 |
| `chain_splay` | 2（0, 3） | 0 | 5 | 1 |
| `tension_free` | 4（0, 4, 11, 13） | 1（12） | 9 | 0 |
| `sit_afterglow` | 1（0） | 1（1） | 0 | 6 |
| `held_from_behind` | 2（0, 2） | 0 | 3 | 3 |
| `down_afterglow` | 2（0, 5） | 1（1） | 0 | 5 |
| `down_recover` | 1（2） | 3（1, 3, 4） | 0 | 1 |
| `kiss_afterglow` | 2（0, 5） | 0 | 6 | 0 |
| `kiss_recover` | 4（0, 5, 8, 10） | 0 | 7 | 0 |
| `sit_recover` | 5（2, 5, 9, 11, 13） | 3（1, 4, 6） | 5 | 1 |
| `clinger_afterglow` | 1（5） | 2（1, 6） | 0 | 5 |
| `clinger_recover` | 1（15） | 0 | 3 | 12 |
| `clinger_peel` | 3（0, 7, 20） | 0 | 19 | 0 |
| `clinger_tension` | 1（4） | 0 | 9 | 4 |
| `clinger_accept` | 2（0, 2） | 0 | 3 | 3 |
| `down_tension` | 3（0, 3, 12） | 10（1, 2, 4, 5, 6, 7, 8, 9, 10, 11） | 0 | 0 |
| `engulf_sink` | 3（0, 3, 6） | 0 | 7 | 0 |
| `engulf_struggle` | 2（0, 6） | 0 | 6 | 0 |
| `engulf_rock` | 2（0, 1） | 0 | 1 | 5 |
| `engulf_tension` | 4（0, 2, 6, 10） | 0 | 7 | 0 |
| `wrap_squeeze` | 1（0） | 0 | 3 | 4 |
| `wrap_tension` | 3（0, 2, 8） | 1（4） | 5 | 0 |
| `ankle_grabbed` | 4（0, 4, 6, 14） | 0 | 13 | 0 |
| `break_free` | 4（2, 3, 6, 8） | 0 | 4 | 1 |
| `edge_pull` | 3（0, 3, 7） | 0 | 7 | 0 |
| `walk_unsteady` | 0 | 0 | 64 | 0 |
| `gaze_trance` | 2（0, 1） | 0 | 3 | 3 |
| `spore_inhale` | 2（0, 2） | 0 | 0 | 6 |
| `shiver_hug` | 2（0, 4） | 0 | 1 | 5 |
| `bubble_float` | 2（0, 2） | 0 | 3 | 3 |
| `daze_sway` | 2（0, 2） | 0 | 3 | 3 |
| `reach_toward` | 3（0, 4, 8） | 0 | 8 | 0 |
| `trip_fall` | 6（0, 4, 11, 13, 18, 20） | 0 | 17 | 0 |
| `defeat_collapse` | 5（0, 2, 5, 9, 13） | 0 | 9 | 0 |
| `grabbed_flinch` | 2（0, 3） | 0 | 4 | 0 |

### ほかのヒロイン

| id | 1枚絵で描くコマ | 組み立て＋描き足し | 部位で組み立て | 同じ絵 |
|---|---|---|---|---|
| `scout_knife_combo` | 27（各方向 0, 2, 6 コマ目） | 0 | 90 | 8 |
| `scout_throw` | 24（各方向 6, 13, 16 コマ目） | 0 | 119 | 8 |
| `scout_sense` | 3（0, 4, 8） | 0 | 8 | 1 |
| `scout_disarm` | 2（0, 2） | 5（1, 3, 5, 6, 7） | 0 | 1 |
| `scout_rummage` | 3（0, 5, 11） | 0 | 12 | 1 |
| `mage_bolt` | 24（各方向 0, 3, 5 コマ目） | 0 | 64 | 8 |
| `mage_area` | 16（各方向 5, 13 コマ目） | 0 | 111 | 17 |
| `mage_channel` | 2（0, 3） | 0 | 5 | 1 |
| `mage_suppress` | 2（0, 5） | 0 | 4 | 2 |
| `mage_suppress_tension` | 3（0, 2, 6） | 1（5） | 3 | 0 |
| `healer_pray` | 1（0） | 0 | 0 | 7 |
| `healer_buff` | 24（各方向 0, 4, 8 コマ目） | 0 | 64 | 8 |
| `healer_hex` | 0 | 0 | 3 | 3 |
| `healer_disgust` | 2（4, 8） | 0 | 6 | 1 |
| `healer_cover` | 1（0） | 0 | 2 | 5 |

### つなぎ

| id | 1枚絵で描くコマ | 組み立て＋描き足し | 部位で組み立て | 同じ絵 |
|---|---|---|---|---|
| `stand__grabbed_flinch` | 0 | 0 | 3 | 0 |
| `stand__down_fall_back` | 0 | 0 | 3 | 0 |
| `stand__kiss_forced` | 0 | 0 | 5 | 0 |
| `stand__tempt_pose` | 0 | 0 | 3 | 0 |
| `stand__walk_unsteady` | 0 | 0 | 2 | 0 |
| `stand__chain_splay` | 0 | 0 | 2 | 0 |
| `grabbed_flinch__arms_behind_squirm` | 0 | 0 | 12 | 1 |
| `grabbed_flinch__elbows_up_strain` | 0 | 0 | 15 | 1 |
| `grabbed_flinch__legs_pulled_open` | 0 | 0 | 3 | 1 |
| `grabbed_flinch__wrap_squeeze` | 0 | 0 | 2 | 0 |
| `grabbed_flinch__held_from_behind` | 0 | 0 | 7 | 0 |
| `grabbed_flinch__spore_inhale` | 0 | 0 | 6 | 0 |
| `grabbed_flinch__shiver_hug` | 0 | 0 | 3 | 0 |
| `grabbed_flinch__gaze_trance` | 0 | 0 | 3 | 0 |
| `grabbed_flinch__bubble_float` | 0 | 1（3） | 3 | 0 |
| `grabbed_flinch__clinger_peel` | 0 | 0 | 2 | 0 |
| `arms_behind_squirm__hip_rock_closed` | 0 | 0 | 2 | 7 |
| `hip_rock_closed__arms_behind_squirm` | 0 | 0 | 0 | 9 |
| `hip_rock_closed__tension_arch` | 0 | 0 | 0 | 9 |
| `arms_behind_squirm__legs_pulled_open` | 0 | 0 | 0 | 9 |
| `arms_behind_squirm__bent_over` | 0 | 0 | 20 | 1 |
| `bent_over__arms_behind_squirm` | 0 | 0 | 20 | 1 |
| `elbows_up_strain__bounce_hung` | 0 | 0 | 6 | 0 |
| `bounce_hung__elbows_up_strain` | 0 | 0 | 0 | 6 |
| `arms_behind_squirm__break_free` | 0 | 0 | 8 | 2 |
| `legs_held_open__break_free` | 0 | 0 | 5 | 0 |
| `elbows_up_strain__break_free` | 0 | 0 | 13 | 0 |
| `wrap_tension__break_free` | 0 | 0 | 2 | 0 |
| `held_from_behind__break_free` | 0 | 0 | 3 | 3 |
| `engulf_struggle__break_free` | 0 | 0 | 2 | 0 |
| `break_free__stand` | 0 | 0 | 3 | 0 |
| `break_free__walk_unsteady` | 0 | 0 | 3 | 0 |
| `down_fall_back__down_pinned_kick` | 0 | 0 | 5 | 0 |
| `down_pinned_kick__down_pinned_spread` | 0 | 7（0, 1, 2, 3, 4, 5, 6） | 0 | 0 |
| `down_pinned_spread__down_pinned_kick` | 0 | 0 | 6 | 1 |
| `down_tension__down_afterglow` | 0 | 6（0, 1, 2, 3, 4, 5） | 0 | 0 |
| `down_pinned_kick__get_up` | 0 | 0 | 4 | 1 |
| `ankle_grabbed__down_face_down` | 0 | 0 | 9 | 0 |
| `down_face_down__down_hips_up` | 0 | 0 | 4 | 0 |
| `down_hips_up__down_face_down` | 0 | 0 | 0 | 4 |
| `kiss_forced__kiss_respond` | 0 | 0 | 2 | 0 |
| `kiss_respond__kiss_tension` | 0 | 0 | 2 | 0 |
| `tempt_pose__kiss_respond` | 0 | 0 | 7 | 0 |
| `kiss_recover__stand` | 0 | 0 | 3 | 0 |
| `clinger_peel__clinger_accept` | 0 | 0 | 2 | 0 |
| `clinger_accept__clinger_peel` | 0 | 0 | 0 | 2 |
| `clinger_peel__clinger_tension` | 0 | 0 | 3 | 0 |
| `clinger_accept__clinger_tension` | 0 | 0 | 4 | 0 |
| `clinger_recover__stand` | 0 | 0 | 3 | 0 |
| `clinger_recover__walk_unsteady` | 0 | 0 | 4 | 0 |
| `tempt_pose__stand` | 0 | 0 | 0 | 3 |
| `sit_recover__walk_unsteady` | 0 | 0 | 0 | 2 |
| `chain_splay__sit_afterglow` | 0 | 2（2, 3） | 2 | 0 |
| `spore_inhale__tension_free` | 0 | 0 | 3 | 0 |
| `shiver_hug__tension_free` | 0 | 0 | 2 | 0 |
| `gaze_trance__tension_free` | 0 | 0 | 3 | 0 |
| `spore_inhale__stand` | 0 | 0 | 6 | 0 |
| `shiver_hug__stand` | 0 | 0 | 3 | 0 |
| `bubble_float__stand` | 0 | 0 | 5 | 0 |
| `stand@scout__scout_knife_combo` | 0 | 0 | 3 | 0 |
| `scout_knife_combo__stand@scout` | 0 | 0 | 0 | 3 |
| `stand@scout__scout_throw` | 0 | 0 | 0 | 3 |
| `scout_throw__stand@scout` | 0 | 0 | 2 | 1 |
| `scout_sense__scout_throw` | 0 | 0 | 0 | 3 |
| `stand@scout__scout_disarm` | 0 | 0 | 5 | 0 |
| `scout_disarm__stand@scout` | 0 | 0 | 1 | 4 |
| `mage_bolt__mage_channel` | 0 | 0 | 5 | 0 |
| `mage_channel__stand@mage` | 0 | 0 | 0 | 5 |
| `stand@mage__mage_suppress` | 0 | 0 | 6 | 0 |
| `mage_suppress__stand@mage` | 0 | 0 | 0 | 6 |
| `mage_suppress_tension__stand@mage` | 0 | 1（0） | 2 | 0 |
| `stand@healer__healer_pray` | 0 | 0 | 3 | 0 |
| `healer_pray__stand@healer` | 0 | 0 | 1 | 2 |
| `healer_cover__stand@healer` | 0 | 0 | 3 | 0 |
| `reach_toward__stand` | 0 | 0 | 3 | 0 |
| `edge_pull__stand` | 0 | 0 | 2 | 0 |
| `edge_pull__walk_unsteady` | 0 | 0 | 2 | 0 |
| `walk_unsteady__stand` | 0 | 0 | 0 | 2 |
| `walk_unsteady__trip_fall` | 0 | 0 | 2 | 0 |
