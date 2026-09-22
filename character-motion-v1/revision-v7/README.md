# v7 — シスターの衣装を設定画へ近づける

シスターのv6別衣装を見直し、長手袋、細い前垂れ、高い脚ぐり、肌の見える上腿、膝上ストッキングへ変更した。黒灰の長髪、閉じた目、長い耳、後頭部の編み込みと金の十字飾り、青緑の刺繍布、青い宝珠の杖は引き継いでいる。キャラクター名・性格設定は仮のままで、確定設定として採用していない。

白い衣装は不透明な生地として生成している。金の髪留めは元資料の図と左右注記に解釈の差があり、今回も全方向の左右表現が完全に統一されてはいない。衣装の輪郭と意匠を設定画へ近づけた版であり、細部まで完全に再現した素材ではない。[元の設定画](../references/sister-reference.jpg)と[今回の制作記録・差異](../art/sister-v7-notes.md)を参照。
## 確認プレイヤー

4キャラクター＋汎用素体の歩行・走行、計10ページ。各ページは8方向×8コマを収録し、単独のHTMLだけで再生できる。歩行は120 ms、走行は80 ms／コマ。v7でゲーム用PNGを変更したのはシスターで、戦士・獣人スカウト・魔女・汎用素体はv6から維持している。
| キャラクター | 歩行 | 走行 |
| --- | --- | --- |
| 戦士（仮） | [歩行](../players/warrior-walk-v7.html) | [走行](../players/warrior-run-v7.html) |
| 獣人スカウト（仮） | [歩行](../players/scout-walk-v7.html) | [走行](../players/scout-run-v7.html) |
| 魔女（仮） | [歩行](../players/witch-walk-v7.html) | [走行](../players/witch-run-v7.html) |
| シスター（仮） | [歩行](../players/sister-walk-v7.html) | [走行](../players/sister-run-v7.html) |
| 汎用モーション | [歩行](../players/generic-walk-v7.html) | [走行](../players/generic-run-v7.html) |
[最新版の選択画面](../player.html)。表示用画像は192×256 px／コマ、各ページは1,000,000バイト以内。ゲーム用PNGは384×512 px／コマの透過画像で、横8コマ×縦8方向のシートも保存している。方向順は正面／右斜め前／右／右斜め後ろ／後ろ／左斜め後ろ／左／左斜め前。

[v6の文書と確認プレイヤー](../revision-v6/README.md)は履歴として保存している。v6付きHTMLの旧シスター衣装は更新していない。
## 原画と制作記録

原画の衣装変更には内蔵画像生成の builtin mode（`image_gen`）を使用した。生成結果を透過の8方向アトラスへ配置し、その画像から部位を切り出して動かす。左向きの全身を右向きから反転する方式ではない。杖は既存原画の位置を維持している。右側面の手と杖の前後関係には、旧版から残る曖昧さがある。

- [採用した8方向原画](../art/sister-source-v7.png)
- [生成結果](../art/sister-costume-v7-generated.png)と[生成指示全文](../art/sister-costume-v7-prompt.txt)
- [builtin mode・寸法・配置の記録](../art/sister-v7-layout.json)
- [制作記録と参照画との差異](../art/sister-v7-notes.md)
- [旧v6衣装の記録](../art/sister-notes.md)
## 比較と動きの確認

- [衣装の前後比較](sister-before-after.png)：上段がv6、下段がv7。同じ歩行1コマ目を、正面・右・後ろ・左の順で並べた。
- [歩行の8方向](sister-walk-eight-directions.png)／[走行の8方向](sister-run-eight-directions.png)：各方向の1コマ目を原寸で並べた確認画像。
- 歩行・走行とも8方向すべてGIFを生成する。命名は `sister-{walk|run}-{direction}.gif`。杖と手の前後関係、髪留めの左右、長い布の重なりなど、方向依存の問題を静止画だけで見落とさないための確認用。
確認画像は [build_v7_review.py](../tools/build_v7_review.py) でゲーム用の原寸コマから組み立てる。比較元は `before-v6/walk/{front,right,back,left}/00.png` に退避した旧版4枚。現行の歩行・走行128コマをすべて検証・ハッシュ化してから生成し、[入力画像のハッシュと生成物一覧](review-build-report.json)を保存する。比較用の背景合成以外に、原画の描き足しやコマの変形は行わない。

原画を部位ごとに動かす方式のため、深い膝の曲げや長い布の重なりには調整余地がある。検査結果と目視確認の範囲は [確認記録](../docs/QA.md) を参照。
