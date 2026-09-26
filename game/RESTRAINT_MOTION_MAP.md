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
| `bent_over` | 尻を突き出す前屈みの拘束（後ろ・斜め後ろ向きで表示） |

股の下を通る触手・床から伸びる触手は、ゲーム側で描く（骨格データの `crotch` の点が位置の目安）。
