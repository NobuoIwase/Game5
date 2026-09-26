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
| `clinger_peel` | 吸液羽虫など張り付きモンスターの引き剥がし（胸の左右・下腹） |
| `clinger_tension` | 非拘束絶頂（張り付きモンスター） |
| `clinger_accept` | 張り付きモンスター受け入れ |

相手の体・張り付く生き物・床から伸びる触手は、ゲーム側で描く。相手の頭の位置は `binds` の `partner`、生き物の位置は `chest_left` / `chest_right` / `belly`。
