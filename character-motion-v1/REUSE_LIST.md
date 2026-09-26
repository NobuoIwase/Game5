# 使い回しと新規作成の一覧（依頼用）

作成：Claude（`node tools/build_reuse_list.mjs` で再生成）。機械が読む版は `motion/reuse.json`（コマごとに `use` と `from`）。

作り方の結論（1枚絵と部位の組み立ての振り分け）は `PRODUCTION_PLAN.md`。この一覧はその材料。

## 考え方

依頼するコマを全部並べ、同じ向きの前のコマと比べた。
- **比べるもの**：本人の体と顔だけ。拘束・張り付く生き物・泡・相手の頭・包む塊・輪はゲームが描くので比べない
- **比べる範囲**：攻撃・ほかのヒロインの技は8方向、歩き（`walk_unsteady`）も8方向、それ以外は依頼する1方向
- **ヒロインごとに比べる**：同じ姿勢でも、別のヒロインの絵は使い回さない。杖やナイフの位置が違えば別の絵
- **一致の基準**：関節の位置の差が288pxの図で0.5px以内（576pxのコマで1px以内）
- **左右反転での使い回しはしない**：左向きと右向きは別の絵として描く（`exports/manifest.json` の方針）

| 区分 | 意味 | 依頼のしかた |
|---|---|---|
| **新規** | そのコマだけの絵 | 描く |
| **同じ絵**（＝） | ほかのコマと体も顔も同じ | 描かずに、元のコマをそのまま使う |
| **顔だけ**（＝（顔）） | 体と頭の向きは同じで、表情だけ違う | 元のコマの顔だけ描き替える |
| **頭だけ**（＝（頭）） | 体は同じで、頭の向き・傾きだけ違う | 元のコマの頭だけ描き替える |

表の「使い回すコマ」は「このコマ＝元のコマ」。元が同じモーションならコマ番号だけ、別のモーションなら `id コマ番号` と書く。

## 全体

全 **2400** コマのうち：
- **新規 1938**
- 同じ絵 402
- 顔だけ 7
- 頭だけ 53

描く量は 1938 コマ＋部分描き替え 60 コマ。

**作成済みで依頼しないもの**
- 歩行・走行：`exports/<character>/walk.png` / `run.png`
- 戦士の部位素材（胴・腕・脚・剣・盾・鞘、8方向）：`parts/warrior/`
  - ゲームは今、この部位素材を骨格で動かして攻撃・拘束の仮の絵にしている

## 攻撃（依頼書：ATTACK_MOTION_REQUEST.md）

新規 **492** コマ・同じ絵 140・顔だけ 0・頭だけ 0（全632コマ）

| id | 向き | コマ | 新規 | 同じ絵 | 顔だけ | 頭だけ | 使い回すコマ（このコマ＝元のコマ） |
|---|---|---|---|---|---|---|---|
| `slash` | 8方向 | 96 | **88** | 8 | 0 | 0 | 11＝0（8方向とも、同じ方向のコマ） |
| `heavy` | 8方向 | 88 | **70** | 18 | 0 | 0 | front：0＝slash 0、9＝slash 10、10＝slash 0<br>down_right：0＝slash 0、10＝slash 0<br>right：0＝slash 0、10＝slash 0<br>up_right：0＝slash 0、10＝slash 0<br>back：0＝slash 0、9＝slash 10、10＝slash 0<br>up_left：0＝slash 0、10＝slash 0<br>left：0＝slash 0、10＝slash 0<br>down_left：0＝slash 0、10＝slash 0 |
| `kesa` | 8方向 | 96 | **64** | 32 | 0 | 0 | 0＝slash 0、9＝slash 9、10＝slash 10、11＝slash 0（8方向とも、同じ方向のコマ） |
| `yoko` | 8方向 | 96 | **64** | 32 | 0 | 0 | 0＝slash 0、9＝slash 9、10＝slash 10、11＝slash 0（8方向とも、同じ方向のコマ） |
| `thrust` | 8方向 | 72 | **46** | 26 | 0 | 0 | front：0＝slash 0、5＝4、7＝slash 10、8＝slash 0<br>down_right：0＝slash 0、5＝4、8＝slash 0<br>right：0＝slash 0、5＝4、8＝slash 0<br>up_right：0＝slash 0、5＝4、8＝slash 0<br>back：0＝slash 0、5＝4、7＝slash 10、8＝slash 0<br>up_left：0＝slash 0、5＝4、8＝slash 0<br>left：0＝slash 0、5＝4、8＝slash 0<br>down_left：0＝slash 0、5＝4、8＝slash 0 |
| `advance` | 8方向 | 64 | **64** | 0 | 0 | 0 | ― |
| `retreat` | 8方向 | 64 | **64** | 0 | 0 | 0 | ― |
| `swing_abandon` | 8方向 | 56 | **32** | 24 | 0 | 0 | 0＝slash 0、1＝slash 1、6＝slash 0（8方向とも、同じ方向のコマ） |

## 拘束された姿勢（依頼書：RESTRAINT_MOTION_REQUEST.md）

新規 **101** コマ・同じ絵 9・顔だけ 3・頭だけ 23（全136コマ）

| id | 向き | コマ | 新規 | 同じ絵 | 顔だけ | 頭だけ | 使い回すコマ（このコマ＝元のコマ） |
|---|---|---|---|---|---|---|---|
| `arms_behind_squirm` | front | 8 | **5** | 0 | 0 | 3 | 3＝（頭）1、4＝（頭）0、7＝（頭）5 |
| `arms_behind_wrench` | front | 8 | **8** | 0 | 0 | 0 | ― |
| `elbows_up_strain` | front | 8 | **5** | 3 | 0 | 0 | 3＝1、4＝0、7＝5 |
| `legs_pulled_open` | front | 12 | **10** | 1 | 0 | 1 | 2＝（頭）1、11＝7 |
| `legs_held_open` | front | 8 | **8** | 0 | 0 | 0 | ― |
| `hip_rock_spread` | front | 8 | **7** | 0 | 1 | 0 | 4＝（顔）legs_held_open 0 |
| `hip_rock_closed` | front | 8 | **8** | 0 | 0 | 0 | ― |
| `bounce_spread` | front | 8 | **5** | 0 | 0 | 3 | 5＝（頭）3、6＝（頭）2、7＝（頭）1 |
| `bounce_hung` | front | 8 | **5** | 0 | 0 | 3 | 5＝（頭）3、6＝（頭）2、7＝（頭）1 |
| `tension_tiptoe` | front | 12 | **9** | 2 | 0 | 1 | 0＝（頭）hip_rock_spread 0、6＝4、7＝5 |
| `tension_arch` | front | 13 | **10** | 0 | 1 | 2 | 0＝（顔）hip_rock_closed 0、6＝（頭）4、8＝（頭）2 |
| `afterglow_spread` | front | 8 | **2** | 1 | 0 | 5 | 0＝（頭）tension_tiptoe 11、2＝1、3＝（頭）1、4＝（頭）tension_tiptoe 11、6＝（頭）tension_tiptoe 10、7＝（頭）6 |
| `recover_spread` | front | 6 | **2** | 2 | 1 | 1 | 0＝tension_tiptoe 11、1＝（頭）tension_tiptoe 10、4＝tension_tiptoe 0、5＝（顔）hip_rock_spread 4 |
| `afterglow_slump` | front | 8 | **4** | 0 | 0 | 4 | 0＝（頭）tension_arch 12、3＝（頭）1、4＝（頭）tension_arch 12、7＝（頭）6 |
| `recover_slump` | front | 5 | **5** | 0 | 0 | 0 | ― |
| `bent_over` | up_right | 8 | **8** | 0 | 0 | 0 | ― |

## 床・口づけ・拘束なし・張り付き（依頼書：SCENE_MOTION_REQUEST.md）

新規 **420** コマ・同じ絵 90・顔だけ 1・頭だけ 23（全534コマ）

| id | 向き | コマ | 新規 | 同じ絵 | 顔だけ | 頭だけ | 使い回すコマ（このコマ＝元のコマ） |
|---|---|---|---|---|---|---|---|
| `down_fall_back` | right | 19 | **19** | 0 | 0 | 0 | ― |
| `down_pinned_kick` | right | 8 | **5** | 3 | 0 | 0 | 3＝1、4＝0、7＝5 |
| `down_pinned_spread` | down_right | 8 | **8** | 0 | 0 | 0 | ― |
| `down_pinned_rock` | down_right | 8 | **5** | 0 | 0 | 3 | 3＝（頭）1、4＝（頭）0、7＝（頭）5 |
| `down_face_down` | right | 16 | **9** | 7 | 0 | 0 | 5＝3、6＝2、7＝1、8＝0、13＝11、14＝10、15＝9 |
| `down_hips_up` | right | 8 | **8** | 0 | 0 | 0 | ― |
| `get_up` | right | 19 | **19** | 0 | 0 | 0 | ― |
| `kiss_forced` | right | 8 | **5** | 3 | 0 | 0 | 3＝1、4＝0、7＝5 |
| `kiss_tension` | right | 11 | **10** | 0 | 0 | 1 | 5＝（頭）3 |
| `kiss_respond` | right | 8 | **5** | 3 | 0 | 0 | 3＝1、4＝0、7＝5 |
| `tempt_pose` | front | 8 | **5** | 3 | 0 | 0 | 3＝1、4＝0、7＝5 |
| `chain_splay` | front | 8 | **7** | 1 | 0 | 0 | 4＝0 |
| `tension_free` | front | 14 | **13** | 0 | 0 | 1 | 6＝（頭）4 |
| `sit_afterglow` | front | 8 | **1** | 6 | 0 | 1 | 0＝（頭）tension_free 13、2＝1、3＝1、4＝0、5＝tension_free 13、6＝5、7＝tension_free 13 |
| `held_from_behind` | front | 8 | **5** | 3 | 0 | 0 | 3＝1、4＝0、7＝5 |
| `down_afterglow` | down_right | 8 | **3** | 5 | 0 | 0 | 2＝1、3＝1、4＝0、6＝0、7＝0 |
| `down_recover` | down_right | 5 | **4** | 1 | 0 | 0 | 0＝down_afterglow 0 |
| `kiss_afterglow` | right | 8 | **5** | 0 | 0 | 3 | 3＝（頭）1、4＝（頭）0、7＝（頭）5 |
| `kiss_recover` | right | 11 | **10** | 0 | 0 | 1 | 0＝（頭）kiss_afterglow 0 |
| `sit_recover` | front | 14 | **13** | 1 | 0 | 0 | 0＝tension_free 13 |
| `clinger_afterglow` | front | 8 | **1** | 5 | 0 | 2 | 0＝tension_free 13、1＝（頭）sit_afterglow 1、2＝1、3＝1、4＝tension_free 13、6＝（頭）sit_afterglow 5、7＝tension_free 13 |
| `clinger_recover` | front | 16 | **4** | 12 | 0 | 0 | 0＝tension_free 13、1＝sit_recover 1、2＝sit_recover 2、3＝sit_recover 3、4＝sit_recover 4、5＝sit_recover 5、6＝sit_recover 6、7＝sit_recover 7、8＝sit_recover 8、9＝sit_recover 9、10＝sit_recover 10、11＝sit_recover 11 |
| `clinger_peel` | front | 22 | **22** | 0 | 0 | 0 | ― |
| `clinger_tension` | front | 14 | **9** | 4 | 0 | 1 | 0＝clinger_recover 15、6＝（頭）4、11＝tension_free 11、12＝tension_free 12、13＝tension_free 13 |
| `clinger_accept` | front | 8 | **5** | 3 | 0 | 0 | 3＝1、4＝0、7＝5 |
| `down_tension` | down_right | 13 | **11** | 0 | 0 | 2 | 0＝（頭）down_pinned_spread 4、5＝（頭）3 |
| `engulf_sink` | front | 10 | **9** | 0 | 1 | 0 | 0＝（顔）sit_recover 13 |
| `engulf_struggle` | front | 8 | **8** | 0 | 0 | 0 | ― |
| `engulf_rock` | front | 8 | **3** | 5 | 0 | 0 | 3＝0、4＝0、5＝1、6＝2、7＝0 |
| `engulf_tension` | front | 11 | **9** | 0 | 0 | 2 | 0＝（頭）engulf_rock 0、4＝（頭）2 |
| `wrap_squeeze` | front | 8 | **4** | 4 | 0 | 0 | 3＝2、5＝1、6＝0、7＝0 |
| `wrap_tension` | front | 9 | **8** | 0 | 0 | 1 | 4＝（頭）2 |
| `ankle_grabbed` | right | 17 | **17** | 0 | 0 | 0 | ― |
| `break_free` | front | 9 | **8** | 1 | 0 | 0 | 0＝wrap_tension 0 |
| `edge_pull` | right | 10 | **10** | 0 | 0 | 0 | ― |
| `walk_unsteady` | 8方向 | 64 | **64** | 0 | 0 | 0 | ― |
| `gaze_trance` | front | 8 | **1** | 3 | 0 | 4 | 1＝（頭）0、2＝（頭）1、3＝0、4＝0、5＝（頭）0、6＝（頭）5、7＝0 |
| `spore_inhale` | front | 8 | **2** | 6 | 0 | 0 | 1＝0、3＝0、4＝0、5＝0、6＝2、7＝0 |
| `shiver_hug` | front | 8 | **3** | 5 | 0 | 0 | 2＝0、3＝1、5＝1、6＝0、7＝1 |
| `bubble_float` | front | 8 | **5** | 3 | 0 | 0 | 3＝1、4＝0、7＝5 |
| `daze_sway` | front | 8 | **5** | 3 | 0 | 0 | 3＝1、4＝0、7＝5 |
| `reach_toward` | right | 11 | **10** | 0 | 0 | 1 | 0＝（頭）ankle_grabbed 0 |
| `trip_fall` | right | 23 | **23** | 0 | 0 | 0 | ― |
| `defeat_collapse` | right | 14 | **14** | 0 | 0 | 0 | ― |
| `grabbed_flinch` | front | 6 | **6** | 0 | 0 | 0 | ― |

## ほかのヒロイン（依頼書：HEROINE_MOTION_REQUEST.md）

新規 **629** コマ・同じ絵 71・顔だけ 0・頭だけ 6（全706コマ）

| id | 向き | コマ | 新規 | 同じ絵 | 顔だけ | 頭だけ | 使い回すコマ（このコマ＝元のコマ） |
|---|---|---|---|---|---|---|---|
| `scout_knife_combo` | 8方向 | 128 | **120** | 8 | 0 | 0 | 15＝0（8方向とも、同じ方向のコマ） |
| `scout_throw` | 8方向 | 152 | **144** | 8 | 0 | 0 | 0＝scout_knife_combo 0（8方向とも、同じ方向のコマ） |
| `scout_sense` | front | 12 | **9** | 1 | 0 | 2 | 5＝（頭）4、6＝（頭）4、11＝0 |
| `scout_disarm` | front | 8 | **7** | 1 | 0 | 0 | 4＝0 |
| `scout_rummage` | down_right | 16 | **15** | 1 | 0 | 0 | 15＝0 |
| `mage_bolt` | 8方向 | 96 | **88** | 8 | 0 | 0 | 11＝0（8方向とも、同じ方向のコマ） |
| `mage_area` | 8方向 | 144 | **127** | 17 | 0 | 0 | front：0＝mage_bolt 0、17＝mage_bolt 0<br>down_right：0＝mage_bolt 0、17＝mage_bolt 0<br>right：0＝mage_bolt 0、17＝mage_bolt 0<br>up_right：0＝mage_bolt 0、17＝mage_bolt 0<br>back：0＝mage_bolt 0、7＝6、17＝mage_bolt 0<br>up_left：0＝mage_bolt 0、17＝mage_bolt 0<br>left：0＝mage_bolt 0、17＝mage_bolt 0<br>down_left：0＝mage_bolt 0、17＝mage_bolt 0 |
| `mage_channel` | right | 8 | **6** | 1 | 0 | 1 | 0＝（頭）mage_bolt 5、4＝0 |
| `mage_suppress` | front | 8 | **3** | 2 | 0 | 3 | 2＝（頭）0、3＝1、4＝0、6＝（頭）0、7＝（頭）1 |
| `mage_suppress_tension` | front | 7 | **7** | 0 | 0 | 0 | ― |
| `healer_pray` | front | 8 | **1** | 7 | 0 | 0 | 1＝0、2＝1、3＝0、4＝0、5＝0、6＝0、7＝0 |
| `healer_buff` | 8方向 | 96 | **88** | 8 | 0 | 0 | 11＝0（8方向とも、同じ方向のコマ） |
| `healer_hex` | front | 6 | **3** | 3 | 0 | 0 | 0＝healer_buff 0、4＝2、5＝healer_buff 0 |
| `healer_disgust` | front | 9 | **8** | 1 | 0 | 0 | 0＝healer_buff 0 |
| `healer_cover` | front | 8 | **3** | 5 | 0 | 0 | 2＝1、3＝1、4＝0、6＝5、7＝5 |

## つなぎ（依頼書：SCENE_MOTION_REQUEST.md 5章）

新規 **296** コマ・同じ絵 92・顔だけ 3・頭だけ 1（全392コマ）

| id | 向き | コマ | 新規 | 同じ絵 | 顔だけ | 頭だけ | 使い回すコマ（このコマ＝元のコマ） |
|---|---|---|---|---|---|---|---|
| `stand__grabbed_flinch` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `stand__down_fall_back` | right | 3 | **3** | 0 | 0 | 0 | ― |
| `stand__kiss_forced` | right | 5 | **5** | 0 | 0 | 0 | ― |
| `stand__tempt_pose` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `stand__walk_unsteady` | right | 2 | **2** | 0 | 0 | 0 | ― |
| `stand__chain_splay` | front | 2 | **2** | 0 | 0 | 0 | ― |
| `grabbed_flinch__arms_behind_squirm` | front | 13 | **12** | 1 | 0 | 0 | 0＝grabbed_flinch 5 |
| `grabbed_flinch__elbows_up_strain` | front | 16 | **15** | 1 | 0 | 0 | 15＝elbows_up_strain 0 |
| `grabbed_flinch__legs_pulled_open` | front | 4 | **3** | 1 | 0 | 0 | 0＝grabbed_flinch__arms_behind_squirm 2 |
| `grabbed_flinch__wrap_squeeze` | front | 2 | **2** | 0 | 0 | 0 | ― |
| `grabbed_flinch__held_from_behind` | front | 7 | **7** | 0 | 0 | 0 | ― |
| `grabbed_flinch__spore_inhale` | front | 6 | **6** | 0 | 0 | 0 | ― |
| `grabbed_flinch__shiver_hug` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `grabbed_flinch__gaze_trance` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `grabbed_flinch__bubble_float` | front | 4 | **4** | 0 | 0 | 0 | ― |
| `grabbed_flinch__clinger_peel` | front | 2 | **2** | 0 | 0 | 0 | ― |
| `arms_behind_squirm__hip_rock_closed` | front | 9 | **1** | 7 | 1 | 0 | 1＝0、2＝0、3＝0、4＝（顔）0、5＝4、6＝4、7＝4、8＝4 |
| `hip_rock_closed__arms_behind_squirm` | front | 9 | **0** | 9 | 0 | 0 | 0＝arms_behind_squirm__hip_rock_closed 4、1＝arms_behind_squirm__hip_rock_closed 4、2＝arms_behind_squirm__hip_rock_closed 4、3＝arms_behind_squirm__hip_rock_closed 4、4＝arms_behind_squirm__hip_rock_closed 0、5＝arms_behind_squirm__hip_rock_closed 0、6＝arms_behind_squirm__hip_rock_closed 0、7＝arms_behind_squirm__hip_rock_closed 0、8＝arms_behind_squirm__hip_rock_closed 0 |
| `hip_rock_closed__tension_arch` | front | 9 | **0** | 9 | 0 | 0 | 0＝arms_behind_squirm__hip_rock_closed 4、1＝arms_behind_squirm__hip_rock_closed 4、2＝arms_behind_squirm__hip_rock_closed 4、3＝arms_behind_squirm__hip_rock_closed 4、4＝arms_behind_squirm__hip_rock_closed 3、5＝hip_rock_closed__arms_behind_squirm 4、6＝hip_rock_closed__arms_behind_squirm 4、7＝4、8＝4 |
| `arms_behind_squirm__legs_pulled_open` | front | 9 | **0** | 9 | 0 | 0 | 0＝arms_behind_squirm__hip_rock_closed 0、1＝arms_behind_squirm__hip_rock_closed 0、2＝arms_behind_squirm__hip_rock_closed 0、3＝arms_behind_squirm__hip_rock_closed 1、4＝2、5＝3、6＝4、7＝5、8＝6 |
| `arms_behind_squirm__bent_over` | up_right | 21 | **20** | 1 | 0 | 0 | 20＝bent_over 0 |
| `bent_over__arms_behind_squirm` | front | 21 | **20** | 1 | 0 | 0 | 20＝grabbed_flinch__arms_behind_squirm 12 |
| `elbows_up_strain__bounce_hung` | front | 6 | **6** | 0 | 0 | 0 | ― |
| `bounce_hung__elbows_up_strain` | front | 6 | **0** | 6 | 0 | 0 | 0＝elbows_up_strain__bounce_hung 5、1＝elbows_up_strain__bounce_hung 4、2＝elbows_up_strain__bounce_hung 3、3＝elbows_up_strain__bounce_hung 2、4＝elbows_up_strain__bounce_hung 1、5＝elbows_up_strain__bounce_hung 0 |
| `arms_behind_squirm__break_free` | front | 10 | **8** | 2 | 0 | 0 | 0＝grabbed_flinch__arms_behind_squirm 12、9＝wrap_tension 0 |
| `legs_held_open__break_free` | front | 5 | **5** | 0 | 0 | 0 | ― |
| `elbows_up_strain__break_free` | front | 13 | **13** | 0 | 0 | 0 | ― |
| `wrap_tension__break_free` | front | 2 | **2** | 0 | 0 | 0 | ― |
| `held_from_behind__break_free` | front | 6 | **3** | 3 | 0 | 0 | 0＝held_from_behind 0、1＝0、5＝4 |
| `engulf_struggle__break_free` | front | 2 | **2** | 0 | 0 | 0 | ― |
| `break_free__stand` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `break_free__walk_unsteady` | right | 3 | **3** | 0 | 0 | 0 | ― |
| `down_fall_back__down_pinned_kick` | right | 5 | **5** | 0 | 0 | 0 | ― |
| `down_pinned_kick__down_pinned_spread` | down_right | 7 | **7** | 0 | 0 | 0 | ― |
| `down_pinned_spread__down_pinned_kick` | right | 7 | **6** | 1 | 0 | 0 | 6＝down_pinned_kick 0 |
| `down_tension__down_afterglow` | down_right | 6 | **6** | 0 | 0 | 0 | ― |
| `down_pinned_kick__get_up` | right | 5 | **4** | 1 | 0 | 0 | 0＝down_fall_back__down_pinned_kick 4 |
| `ankle_grabbed__down_face_down` | right | 9 | **9** | 0 | 0 | 0 | ― |
| `down_face_down__down_hips_up` | right | 4 | **4** | 0 | 0 | 0 | ― |
| `down_hips_up__down_face_down` | right | 4 | **0** | 4 | 0 | 0 | 0＝down_face_down__down_hips_up 3、1＝down_face_down__down_hips_up 2、2＝down_face_down__down_hips_up 1、3＝down_face_down__down_hips_up 0 |
| `kiss_forced__kiss_respond` | right | 2 | **2** | 0 | 0 | 0 | ― |
| `kiss_respond__kiss_tension` | right | 2 | **2** | 0 | 0 | 0 | ― |
| `tempt_pose__kiss_respond` | right | 7 | **7** | 0 | 0 | 0 | ― |
| `kiss_recover__stand` | right | 3 | **3** | 0 | 0 | 0 | ― |
| `clinger_peel__clinger_accept` | front | 2 | **2** | 0 | 0 | 0 | ― |
| `clinger_accept__clinger_peel` | front | 2 | **0** | 2 | 0 | 0 | 0＝clinger_peel__clinger_accept 1、1＝clinger_peel__clinger_accept 0 |
| `clinger_peel__clinger_tension` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `clinger_accept__clinger_tension` | front | 4 | **4** | 0 | 0 | 0 | ― |
| `clinger_recover__stand` | front | 3 | **2** | 0 | 0 | 1 | 0＝（頭）clinger_peel__clinger_tension 2 |
| `clinger_recover__walk_unsteady` | right | 4 | **4** | 0 | 0 | 0 | ― |
| `tempt_pose__stand` | front | 3 | **0** | 3 | 0 | 0 | 0＝stand__tempt_pose 2、1＝stand__tempt_pose 1、2＝stand__tempt_pose 0 |
| `sit_recover__walk_unsteady` | right | 2 | **0** | 2 | 0 | 0 | 0＝stand__walk_unsteady 0、1＝stand__walk_unsteady 1 |
| `chain_splay__sit_afterglow` | front | 4 | **4** | 0 | 0 | 0 | ― |
| `spore_inhale__tension_free` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `shiver_hug__tension_free` | front | 2 | **2** | 0 | 0 | 0 | ― |
| `gaze_trance__tension_free` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `spore_inhale__stand` | front | 6 | **6** | 0 | 0 | 0 | ― |
| `shiver_hug__stand` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `bubble_float__stand` | front | 5 | **5** | 0 | 0 | 0 | ― |
| `stand@scout__scout_knife_combo` | right | 3 | **3** | 0 | 0 | 0 | ― |
| `scout_knife_combo__stand@scout` | right | 3 | **0** | 3 | 0 | 0 | 0＝stand@scout__scout_knife_combo 2、1＝stand@scout__scout_knife_combo 1、2＝stand@scout__scout_knife_combo 0 |
| `stand@scout__scout_throw` | right | 3 | **0** | 3 | 0 | 0 | 0＝stand@scout__scout_knife_combo 0、1＝stand@scout__scout_knife_combo 1、2＝stand@scout__scout_knife_combo 2 |
| `scout_throw__stand@scout` | right | 3 | **2** | 1 | 0 | 0 | 2＝stand@scout__scout_knife_combo 0 |
| `scout_sense__scout_throw` | right | 3 | **0** | 3 | 0 | 0 | 0＝stand@scout__scout_knife_combo 0、1＝stand@scout__scout_knife_combo 1、2＝stand@scout__scout_knife_combo 2 |
| `stand@scout__scout_disarm` | front | 5 | **5** | 0 | 0 | 0 | ― |
| `scout_disarm__stand@scout` | front | 5 | **0** | 4 | 1 | 0 | 0＝stand@scout__scout_disarm 4、1＝stand@scout__scout_disarm 3、2＝（顔）stand@scout__scout_disarm 2、3＝stand@scout__scout_disarm 1、4＝stand@scout__scout_disarm 0 |
| `mage_bolt__mage_channel` | right | 5 | **5** | 0 | 0 | 0 | ― |
| `mage_channel__stand@mage` | right | 5 | **0** | 5 | 0 | 0 | 0＝mage_bolt__mage_channel 4、1＝mage_bolt__mage_channel 3、2＝mage_bolt__mage_channel 2、3＝mage_bolt__mage_channel 1、4＝mage_bolt__mage_channel 0 |
| `stand@mage__mage_suppress` | front | 6 | **6** | 0 | 0 | 0 | ― |
| `mage_suppress__stand@mage` | front | 6 | **0** | 6 | 0 | 0 | 0＝stand@mage__mage_suppress 5、1＝stand@mage__mage_suppress 4、2＝stand@mage__mage_suppress 3、3＝stand@mage__mage_suppress 2、4＝stand@mage__mage_suppress 1、5＝stand@mage__mage_suppress 0 |
| `mage_suppress_tension__stand@mage` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `stand@healer__healer_pray` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `healer_pray__stand@healer` | front | 3 | **0** | 2 | 1 | 0 | 0＝stand@healer__healer_pray 2、1＝（顔）stand@healer__healer_pray 1、2＝stand@healer__healer_pray 0 |
| `healer_cover__stand@healer` | front | 3 | **3** | 0 | 0 | 0 | ― |
| `reach_toward__stand` | right | 3 | **3** | 0 | 0 | 0 | ― |
| `edge_pull__stand` | right | 2 | **2** | 0 | 0 | 0 | ― |
| `edge_pull__walk_unsteady` | right | 2 | **2** | 0 | 0 | 0 | ― |
| `walk_unsteady__stand` | right | 2 | **0** | 2 | 0 | 0 | 0＝stand__walk_unsteady 1、1＝stand__walk_unsteady 0 |
| `walk_unsteady__trip_fall` | right | 2 | **2** | 0 | 0 | 0 | ― |

## 部位を使い回して組み立てる場合

歩行と同じ組み立て方を考えた場合の見積もり（`node tools/build_part_reuse.mjs`、詳細は `motion/part-reuse.json`）。

**歩行の作り方**（`walk-graphics-handoff/docs/02_ASSEMBLY.md`）
- 部位を方向ごとに1枚ずつ描く：頭・上半身・下半身・首・上腕・前腕・手・太もも・すね・足（かかと・振り出し・つま先の差分つき）など
- 関節の間で回転・伸縮して組み立てる
- 太ももは同じ絵の角度を変えるだけ
- 左右の腕・脚にも同じ絵を使う

**前提**
- 各キャラクターを、歩行の素体と同じ部位に分けて、8方向ぶん用意する
- 左右反転はしない
- いまの戦士の部位素材（`parts/warrior/`）は腕・脚が1枚ずつで、肘・膝は変形で曲げている
  - この見積もりの形にするには、上腕・前腕・太もも・すねに分け直す必要がある

**判定のしかた**：依頼する全2400コマについて、部位ごとに見える角度を骨格から計算した。回すだけで済まず、新しい絵が要るのは次の場合。

| 部位 | 新しい絵が要る場合 |
|---|---|
| 頭 | 30度より深くうつむく・のけぞる（頭頂やあごの下が見える） |
| 顔 | 普通の顔以外の表情（目を閉じる・口を開ける・結ぶ）。見える頭の向きごと |
| 上半身・下半身 | 前屈み・寝た姿勢などで、体を30度より上下から見る（首の側・脚の側から見る） |
| 上腕・前腕・太もも・すね | こちらや奥へ向いて、見える長さが50%未満（縦に縮めるだけでは形が合わない） |
| 足 | つま先まで伸ばす／足裏が見える／甲を上から見る |

**結果**
- **既存の部位だけで組める**：768コマ（32%）
- **ほかの1632コマ**：次の新しい部位の絵を足せば組める
- **新しく描く部位の絵**：115枚（うち表情30枚）。1枚描けば、それを使う全コマで使い回せる

### 頭（3枚）

| 見え方 | 使うモーション |
|---|---|
| 右・下から（のけぞり・あごの下が見える） | `down_pinned_spread`、`down_pinned_rock`、`down_recover`、`down_tension`、`down_pinned_kick__down_pinned_spread` |
| 正面・上から（うつむき・頭頂が見える） | `afterglow_slump`、`scout_disarm` |
| 正面・下から（のけぞり・あごの下が見える） | `tension_arch` |

### 顔（30枚）

| 見え方 | 使うモーション |
|---|---|
| 正面・口を結んだ | `arms_behind_squirm`、`arms_behind_wrench`、`elbows_up_strain`、`legs_pulled_open`、`legs_held_open`、`tension_tiptoe` ほか53 |
| 正面・口を開けた | `hip_rock_spread`、`hip_rock_closed`、`bounce_spread`、`bounce_hung`、`tension_tiptoe`、`tension_arch` ほか33 |
| 右・口を結んだ | `down_pinned_kick`、`down_pinned_spread`、`down_face_down`、`kiss_recover`、`ankle_grabbed`、`edge_pull` ほか16 |
| 正面・目を閉じて口を開けた | `tension_tiptoe`、`tension_arch`、`afterglow_spread`、`chain_splay`、`tension_free`、`clinger_afterglow` ほか14 |
| 右・口を開けた | `down_fall_back`、`down_hips_up`、`down_afterglow`、`down_recover`、`kiss_afterglow`、`kiss_recover` ほか14 |
| 右・目を閉じた | `down_fall_back`、`down_hips_up`、`get_up`、`kiss_tension`、`kiss_respond`、`down_tension` ほか9 |
| 正面・目を閉じて口を結んだ | `clinger_peel`、`clinger_tension`、`wrap_squeeze`、`break_free`、`shiver_hug`、`mage_suppress` ほか6 |
| 右斜め前・口を結んだ | `held_from_behind`、`spore_inhale`、`scout_knife_combo`、`scout_throw`、`scout_sense`、`healer_hex` ほか3 |
| 正面・目を閉じた | `tension_tiptoe`、`tension_arch`、`mage_suppress_tension`、`healer_pray`、`mage_suppress_tension__stand@mage`、`stand@healer__healer_pray` ほか1 |
| 右・目を閉じて口を開けた | `down_fall_back`、`kiss_tension`、`down_afterglow`、`edge_pull`、`walk_unsteady`、`defeat_collapse` |
| 右・目を閉じて口を結んだ | `kiss_forced`、`kiss_tension`、`stand__kiss_forced`、`kiss_forced__kiss_respond`、`kiss_respond__kiss_tension` |
| 左斜め前・口を結んだ | `held_from_behind`、`scout_knife_combo`、`scout_throw`、`scout_sense`、`healer_disgust` |
| 右・下から・口を結んだ | `down_pinned_spread`、`down_recover`、`down_pinned_kick__down_pinned_spread` |
| 右・下から・口を開けた | `down_pinned_rock`、`down_tension` |
| 右斜め前・口を開けた | `walk_unsteady`、`scout_rummage` |
| 左・口を結んだ | `scout_knife_combo`、`scout_throw` |
| 正面・下から・目を閉じて口を開けた | `tension_arch` |
| 正面・上から・口を開けた | `afterglow_slump` |
| 正面・上から・目を閉じて口を開けた | `afterglow_slump` |
| 右・下から・目を閉じた | `down_pinned_rock` |
| 右・下から・目を閉じて口を結んだ | `down_tension` |
| 右・下から・目を閉じて口を開けた | `down_tension` |
| 右斜め前・目を閉じて口を開けた | `walk_unsteady` |
| 左・口を開けた | `walk_unsteady` |
| 左・目を閉じて口を開けた | `walk_unsteady` |
| 左斜め前・口を開けた | `walk_unsteady` |
| 左斜め前・目を閉じて口を開けた | `walk_unsteady` |
| 右斜め前・目を閉じた | `spore_inhale` |
| 正面・上から・口を結んだ | `scout_disarm` |
| 左斜め前・目を閉じて口を結んだ | `healer_disgust` |

### 上半身（5枚）

| 見え方 | 使うモーション |
|---|---|
| 右・腰の側から | `bent_over`、`down_pinned_spread`、`down_pinned_rock`、`down_afterglow`、`down_recover`、`down_tension` ほか3 |
| 右斜め後ろ・腰の側から | `bent_over`、`arms_behind_squirm__bent_over` |
| 正面・首の側から | `scout_disarm`、`bent_over__arms_behind_squirm` |
| 正面・腰の側から | `tension_arch` |
| 正面・首の側から（ほぼ真っすぐ） | `bent_over__arms_behind_squirm` |

### 下半身（5枚）

| 見え方 | 使うモーション |
|---|---|
| 右・脚の側から | `bent_over`、`down_pinned_spread`、`down_pinned_rock`、`down_afterglow`、`down_recover`、`down_tension` ほか3 |
| 右斜め後ろ・脚の側から | `bent_over`、`arms_behind_squirm__bent_over` |
| 正面・腰の上の側から | `scout_disarm`、`bent_over__arms_behind_squirm` |
| 正面・脚の側から | `tension_arch` |
| 正面・腰の上の側から（ほぼ真っすぐ） | `bent_over__arms_behind_squirm` |

### 上腕（24枚）

| 見え方 | 使うモーション |
|---|---|
| front向きの図・先がこちら向き | `slash`、`heavy`、`kesa`、`yoko`、`swing_abandon`、`scout_knife_combo` ほか8 |
| back向きの図・先が奥向き | `slash`、`heavy`、`kesa`、`yoko`、`swing_abandon`、`scout_knife_combo` ほか3 |
| down_right向きの図・先がこちら向き | `yoko`、`thrust`、`swing_abandon`、`scout_knife_combo`、`scout_throw`、`scout_rummage` ほか2 |
| front向きの図・先がこちら向き（ほぼ真正面） | `heavy`、`yoko`、`thrust`、`scout_throw`、`mage_bolt`、`healer_buff` ほか1 |
| up_right向きの図・先が奥向き | `heavy`、`yoko`、`scout_knife_combo`、`scout_throw`、`mage_bolt`、`mage_area` ほか1 |
| down_left向きの図・先がこちら向き | `heavy`、`yoko`、`scout_knife_combo`、`scout_throw`、`mage_bolt`、`mage_area` ほか1 |
| up_left向きの図・先が奥向き | `yoko`、`thrust`、`swing_abandon`、`scout_knife_combo`、`scout_throw`、`mage_area` ほか1 |
| down_right向きの図・先が奥向き | `down_pinned_spread`、`down_pinned_rock`、`down_afterglow`、`down_recover`、`down_tension`、`down_pinned_kick__down_pinned_spread` ほか1 |
| back向きの図・先が奥向き（ほぼ真正面） | `heavy`、`yoko`、`thrust`、`scout_throw`、`mage_bolt`、`healer_buff` |
| right向きの図・先がこちら向き | `kesa`、`defeat_collapse`、`scout_knife_combo`、`scout_throw`、`mage_area`、`healer_buff` |
| left向きの図・先が奥向き | `kesa`、`scout_knife_combo`、`scout_throw`、`mage_area`、`healer_buff` |
| right向きの図・先がこちら向き（ほぼ真正面） | `yoko`、`scout_throw`、`mage_area`、`healer_buff` |
| left向きの図・先が奥向き（ほぼ真正面） | `yoko`、`scout_throw`、`mage_area`、`healer_buff` |
| right向きの図・先が奥向き | `kesa`、`yoko`、`mage_area` |
| up_right向きの図・先がこちら向き | `kesa`、`thrust`、`scout_throw` |
| left向きの図・先がこちら向き | `kesa`、`yoko`、`mage_area` |
| down_left向きの図・先が奥向き | `kesa`、`thrust`、`scout_throw` |
| down_right向きの図・先がこちら向き（ほぼ真正面） | `scout_knife_combo`、`scout_rummage` |
| up_right向きの図・先がこちら向き（ほぼ真正面） | `heavy` |
| down_left向きの図・先が奥向き（ほぼ真正面） | `heavy` |
| front向きの図・先が奥向き | `thrust` |
| back向きの図・先がこちら向き | `thrust` |
| up_left向きの図・先が奥向き（ほぼ真正面） | `scout_knife_combo` |
| down_right向きの図・先が奥向き（ほぼ真正面） | `down_tension__down_afterglow` |

### 前腕（23枚）

| 見え方 | 使うモーション |
|---|---|
| front向きの図・先がこちら向き | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`advance` ほか32 |
| front向きの図・先がこちら向き（ほぼ真正面） | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`clinger_peel` ほか10 |
| down_right向きの図・先がこちら向き | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`advance` ほか7 |
| back向きの図・先が奥向き | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`advance` ほか7 |
| up_right向きの図・先が奥向き | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`advance` ほか6 |
| up_left向きの図・先が奥向き | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`advance` ほか6 |
| down_left向きの図・先がこちら向き | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`advance` ほか6 |
| back向きの図・先が奥向き（ほぼ真正面） | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`scout_knife_combo` ほか3 |
| down_right向きの図・先がこちら向き（ほぼ真正面） | `heavy`、`swing_abandon`、`scout_knife_combo`、`scout_rummage`、`mage_bolt` |
| right向きの図・先が奥向き | `kiss_tension`、`kiss_recover`、`stand__kiss_forced`、`clinger_recover__walk_unsteady`、`reach_toward__stand` |
| front向きの図・先が奥向き（ほぼ真正面） | `slash`、`kesa`、`yoko`、`thrust` |
| back向きの図・先がこちら向き（ほぼ真正面） | `slash`、`kesa`、`yoko`、`thrust` |
| up_left向きの図・先が奥向き（ほぼ真正面） | `heavy`、`swing_abandon`、`scout_knife_combo`、`mage_bolt` |
| down_right向きの図・先が奥向き | `down_afterglow`、`down_recover`、`scout_throw`、`down_tension__down_afterglow` |
| front向きの図・先が奥向き | `yoko`、`clinger_tension`、`scout_throw` |
| right向きの図・先がこちら向き | `kiss_tension`、`stand__kiss_forced`、`clinger_recover__walk_unsteady` |
| right向きの図・先が奥向き（ほぼ真正面） | `yoko`、`clinger_recover__walk_unsteady` |
| back向きの図・先がこちら向き | `yoko`、`scout_throw` |
| up_right向きの図・先が奥向き（ほぼ真正面） | `scout_knife_combo`、`mage_area` |
| down_left向きの図・先がこちら向き（ほぼ真正面） | `scout_knife_combo`、`mage_area` |
| right向きの図・先がこちら向き（ほぼ真正面） | `stand__kiss_forced`、`clinger_recover__walk_unsteady` |
| left向きの図・先がこちら向き（ほぼ真正面） | `yoko` |
| up_left向きの図・先がこちら向き | `scout_throw` |

### 太もも（4枚）

| 見え方 | 使うモーション |
|---|---|
| front向きの図・先がこちら向き | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`advance` ほか10 |
| front向きの図・先がこちら向き（ほぼ真正面） | `heavy`、`thrust`、`sit_recover`、`clinger_recover`、`scout_disarm`、`mage_suppress_tension` ほか3 |
| back向きの図・先が奥向き | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`advance` ほか1 |
| back向きの図・先が奥向き（ほぼ真正面） | `heavy`、`thrust` |

### すね（7枚）

| 見え方 | 使うモーション |
|---|---|
| front向きの図・先が奥向き | `slash`、`heavy`、`kesa`、`yoko`、`tension_free`、`sit_recover` ほか6 |
| front向きの図・先が奥向き（ほぼ真正面） | `tension_free`、`sit_afterglow`、`sit_recover`、`clinger_afterglow`、`clinger_recover`、`clinger_tension` ほか6 |
| back向きの図・先がこちら向き | `slash`、`heavy`、`kesa`、`yoko` |
| down_right向きの図・先がこちら向き（ほぼ真正面） | `down_afterglow`、`down_recover`、`down_tension`、`down_tension__down_afterglow` |
| down_right向きの図・先が奥向き | `heavy` |
| up_left向きの図・先がこちら向き | `heavy` |
| down_right向きの図・先がこちら向き | `down_tension` |

### 足（14枚）

| 見え方 | 使うモーション |
|---|---|
| front向きの図・甲を上から | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`advance` ほか16 |
| right向きの図・つま先まで伸ばした | `advance`、`retreat`、`down_fall_back`、`down_pinned_kick`、`down_face_down`、`get_up` ほか9 |
| back向きの図・足裏が見える | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`advance` ほか3 |
| up_left向きの図・足裏が見える | `slash`、`heavy`、`kesa`、`yoko`、`thrust`、`advance` ほか1 |
| down_right向きの図・つま先まで伸ばした | `advance`、`retreat`、`down_pinned_spread`、`down_pinned_rock`、`down_recover`、`down_tension` ほか1 |
| down_right向きの図・足裏が見える | `down_pinned_rock`、`down_afterglow`、`down_recover`、`down_tension`、`down_tension__down_afterglow` |
| front向きの図・つま先まで伸ばした | `advance`、`retreat`、`tension_tiptoe`、`wrap_tension` |
| right向きの図・足裏が見える | `down_pinned_kick`、`down_face_down`、`defeat_collapse` |
| right向きの図・甲を上から | `down_face_down`、`ankle_grabbed`、`defeat_collapse` |
| up_right向きの図・つま先まで伸ばした | `advance`、`retreat` |
| back向きの図・つま先まで伸ばした | `advance`、`retreat` |
| up_left向きの図・つま先まで伸ばした | `advance`、`retreat` |
| left向きの図・つま先まで伸ばした | `advance`、`retreat` |
| down_left向きの図・つま先まで伸ばした | `advance`、`retreat` |

### 手（形の種類で数える）

手は骨格に形の情報がないので、キーの内容から種類を数えた。どれも方向ごとに1枚ずつ要る。
- 力を抜いた手：歩行に既存
- 剣を握る手：攻撃
- 開いた手のひら：押す、床や相手に当てる、伸ばす、泡の内側に当てる
- 体に当てる手：胸・下腹・口を押さえる、自分を抱く
- 強く握った手：こらえる、力む

新しく描くのは3種類×方向。

### 部位の組み立てで気をつけること

- **大きく形が変わる所**：次の場面は、部位を回すだけでは硬く見えやすい
  - 背中を大きく反らす頂点
  - 輪で締め付けられる
  - 前屈み・四つん這い・寝た姿勢
  - 新しい部位を4つ以上同時に使うコマ：142コマ（`motion/part-reuse.json`）
  - これらは、組み立てた上で一部を描き足す（仕上げる）か、1枚絵にする候補
- **衣装・髪**：脚を大きく開く、寝る、逆さに近い姿勢では、スカートや髪の形が変わる
  - キャラクターごとに差分が要る（骨格からは数えていない）
- **比べると**：1枚絵なら新規1938コマ＋部分描き替え60コマ
  - 部位の組み立てなら、新しい部位の絵115枚＋手3種類×方向＋衣装・髪の差分＋仕上げ
  - どちらで作るかは、絵の質と手間の兼ね合いで決める
