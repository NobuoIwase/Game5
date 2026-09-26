# 攻撃モーションの参考資料 attack-v1

依頼書は `../../ATTACK_MOTION_REQUEST.md`。ここには参考資料だけを置く。

## 骨格の図（SVG、Claude作成）

`motion/attack.mjs` の骨格を `tools/render_attack_svg.mjs` で描いたマネキン図（v2）。
- 青はアリア本人の**右**半身（剣の腕）、橙は**左**半身（盾の腕）
- 白い線は剣、黒い短い線は鍔
- 盾は左前腕の外側に付いた厚みのある円盤。向きによって見え方が変わる：
  - 表（明るい面に十字と中央の金具）
  - 縁
  - 裏（暗い面に腕の帯）
- コマは 288×288（ゲーム用は2倍の 576×576）。踏み込みの移動はコマの中に入っていて、後ろ足と、着地後の前足は動かない

| ファイル | 内容 |
|---|---|
| `<motion>_sheet.svg` | 8方向×全コマの一覧（行＝方向、列＝コマ）。命中コマは赤い背景 |
| `<motion>_keys_right.svg` / `_keys_down_right.svg` | 右向き・右斜め前向きの全コマを大きく並べ、各コマの狙いと表示時間を書いたもの。赤い点線は剣先の軌跡 |
| `<motion>_preview.svg` | ブラウザで開くと8方向が同時に動くアニメーション（SMIL）。表示時間は `frame_ms` のとおり |

`<motion>` は次の4つ。
- `slash`（通常斬り＝振り下ろし）
- `heavy`（破城斬り）
- `advance`（構えたまま前進）
- `retreat`（構えたまま後退）

## 実写の連続写真（パブリックドメイン）

Eadweard Muybridge『The Attitudes of Animals in Motion』（1881年、パロアルトで1878〜79年撮影）。米国議会図書館（LoC）の所蔵で、権利表記は **"No known restrictions on publication."**。画像はLoCの閲覧用JPEG（長辺1024px）。

| ファイル | 題 | LoC | 参考にするところ |
|---|---|---|---|
| `muybridge_swinging_pick.jpg` | Athletes. Swinging pick | https://www.loc.gov/item/2009630545/ | **頭上から振り下ろす一連の流れ**：振りかぶりで背中が反り、振り下ろしで膝が沈み、道具が低く振り抜かれる。今回の振り下ろしの手本 |
| `muybridge_fencing.jpg` | Athletes. Fencing | https://www.loc.gov/item/2009630531/ | 構え・踏み込み・引き。前足と後ろ足の幅、腰の高さ、剣を持たない腕の釣り合い |
| `muybridge_throwing_lance.jpg` | Athletes. Throwing lance | https://www.loc.gov/item/2009630530/ | 腕を引いてから投げる：腰から回り始め、肩と腕が遅れてついてくる。後ろ足から前足への体重移動 |
| `muybridge_swinging_clubs.jpg` | Athletes. Swinging clubs | https://www.loc.gov/item/2009630535/ | 頭上で振る腕の軌道と、肘・手首の遅れ |
| `muybridge_boxing.jpg` | Athletes. Boxing | https://www.loc.gov/item/2009630526/ | 構えたままの足さばき（前進・後退）と、打った後に引く動き |

写真のモデルは当時の運動選手で、衣服をほとんど着ていない。身体の動きを見るための資料で、絵柄や体型は参考にしない。

## キャラクターの設定画

`../warrior.jpg`（戦士アリアの設定画）と、`../../exports/warrior/walk.png`・`run.png`（既存の歩き・走り）が、絵の同一性の基準になる。
