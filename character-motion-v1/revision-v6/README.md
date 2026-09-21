# v6 — 戦士の原画整理と追加キャラクター

戦士の横向きの脚は、切り抜き跡を含む旧パーツを専用原画へ交換。靴のつま先・甲・すね当てを一続きの輪郭として描き直した。右向き・左向きは別原画を使用し、元の関節位置へ合わせている。身体から旧脚を除く範囲と、描画に使う新しい脚の画像は別に管理する。

左側面では腕の切り抜きに脇腹も含まれ、腕を上げると胴体の下地がなくなる原因があった。隠れていたコルセット側面・腰ベルト・腰の革飾りを原画として補い、元の頭・髪・可動する腕の下へ合成している。

追加キャラクターは魔女とエルフのシスター。仮の名前・設定文は採用せず、識別名を `witch` / `sister` としている。両者とも歩行・走行を8方向、各8コマで収録。杖は本人の右手に固定し、左向きの全身を右向きから反転する処理は使用していない。

## 確認プレイヤー

4キャラクターと汎用素体の歩行・走行、計10ページを収録。各HTMLは8方向×8コマの画像を内蔵し、単独でも再生できる。ダウンロード済み旧版との区別用にファイル名へ `v6` を付けた。キャラクター名はすべて仮の識別名。

| キャラクター | 歩行 | 走行 |
| --- | --- | --- |
| 戦士 | [歩行](../players/warrior-walk-v6.html) | [走行](../players/warrior-run-v6.html) |
| 獣人スカウト | [歩行](../players/scout-walk-v6.html) | [走行](../players/scout-run-v6.html) |
| 魔女 | [歩行](../players/witch-walk-v6.html) | [走行](../players/witch-run-v6.html) |
| エルフのシスター | [歩行](../players/sister-walk-v6.html) | [走行](../players/sister-run-v6.html) |
| 汎用 | [歩行](../players/generic-walk-v6.html) | [走行](../players/generic-run-v6.html) |

[全体の選択画面](../player.html)。表示は192×256、ゲーム用PNGは384×512。1ページは1MB以下を維持し、新しいキャラクターの追加によって全画像を同時に読み込む構成にはしていない。

## 原画と制作記録

原画の描き直しには内蔵の画像生成ツールを使用した。生成画像は `art/` に保存し、方向別の切り出し・配置、関節に沿った変形、部位の合成をプログラムで行っている。

- [戦士の脚の描き直し原画](../art/warrior-profile-v6-complete-source.png) / [左腿上端の補完原画](../art/warrior-profile-v6-open-source.png) / [靴の生成指示](../art/warrior-profile-v6-prompt.txt) / [隠れた太腿の補完指示](../art/warrior-profile-v6-complete-prompt.txt) / [腰へ差し込む上端の生成指示](../art/warrior-profile-v6-open-prompt.txt) / [配置記録](../art/warrior-profile-v6-layout.json)
- [魔女の8方向原画](../art/witch-source.png) / [生成指示](../art/witch-prompt.txt) / [採用した指示文・方向別出典・制作記録](../art/witch-notes.md)
- [戦士の左脇腹・腰の補完](../art/warrior-left-torso-v6.png) / [生成指示](../art/warrior-left-torso-v6-prompt.txt) / [配置記録](../art/warrior-left-torso-v6-layout.json)
- [シスターの8方向原画](../art/sister-source.png) / [生成指示](../art/sister-prompt.txt) / [衣装変更後の生成指示](../art/sister-covered-costume-prompt.txt) / [方向別出典](../art/sister-source-layout.json)
- [新しい2体のプレビュー](new-characters-preview.jpg)
- [戦士の靴の拡大](warrior-clean-boots.png)
- [戦士の修正前後](warrior-before-after.png)（左：v5、右：v6）

シスターは元の衣装での生成が拒否されたため、白金のハイネック・チュニック、長袖、不透明な白いレギンスへ変更している。黒灰色の長髪、閉じた目、長い耳、後頭部の編み込みと金の十字飾り、青緑の刺繍布、青い宝珠の杖を引き継ぐ。細い金の髪留めは、設定画の本人右側に対して、今回の原画では本人左側にある。衣装や細部まで設定画の完全再現ではない。[参照画との差異と制作記録](../art/sister-notes.md)。

## 確認用の画像

[戦士の右向き走行](warrior-run-right.gif)、[魔女の右向き走行](witch-run-right.gif)、[シスターの右向き走行](sister-run-right.gif)。この3体の正面・左向きGIFと、左右それぞれの歩行8コマ＋走行8コマの一覧もこのフォルダに保存する。

原画を部位に分けて動かす方式のため、深い膝の曲げや衣装の重なりには手描きの全コマとは異なる表現が残る。検査結果と目視確認の範囲は [確認記録](../docs/QA.md) を参照。
