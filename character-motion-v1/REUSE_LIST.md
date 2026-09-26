# 使い回しと新規作成の一覧（依頼用）

作成：Claude（`node tools/build_reuse_list.mjs` で再生成）。機械が読む版は `motion/reuse.json`（コマごとに `use` と `from`）。

## 考え方

依頼するコマを全部並べ、同じ向きの前のコマと比べた。
- **比べるもの**：本人の体と顔だけ。拘束・張り付く生き物・泡・相手の頭・包む塊・輪はゲームが描くので比べない
- **比べる範囲**：攻撃は8方向、歩き（`walk_unsteady`）も8方向、それ以外は依頼する1方向
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

全 **1635** コマのうち：
- **新規 1279**
- 同じ絵 304
- 顔だけ 5
- 頭だけ 47

描く量は 1279 コマ＋部分描き替え 52 コマ。

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

## つなぎ（依頼書：SCENE_MOTION_REQUEST.md 5章）

新規 **266** コマ・同じ絵 65・顔だけ 1・頭だけ 1（全333コマ）

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
| `reach_toward__stand` | right | 3 | **3** | 0 | 0 | 0 | ― |
| `edge_pull__stand` | right | 2 | **2** | 0 | 0 | 0 | ― |
| `edge_pull__walk_unsteady` | right | 2 | **2** | 0 | 0 | 0 | ― |
| `walk_unsteady__stand` | right | 2 | **0** | 2 | 0 | 0 | 0＝stand__walk_unsteady 1、1＝stand__walk_unsteady 0 |
| `walk_unsteady__trip_fall` | right | 2 | **2** | 0 | 0 | 0 | ― |
