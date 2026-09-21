# 汎用 8 方向の歩行・走行リグ

`rig.mjs` は依存ライブラリなしの ES module です。`makePose(direction, motion, frame)`、`restPose(direction)`、`makeLibrary()` を export します。ブラウザと Node.js の両方から利用できます。

## データ形式

- `poses.json` の `motions.walk[direction][frame]` / `motions.run[direction][frame]` に 8 コマ。
- 方向順: `front, down_right, right, up_right, back, up_left, left, down_left`。
- 歩行 120 ms / コマ、走行 80 ms / コマ。
- 192 × 256 px。左上が原点、右が x 正方向、下が y 正方向。
- `rest[direction]` は同じ関節名の中立ポーズです。
- `joints[id].position` は投影後の `[x,y]`。`depth` は大きいほど手前。`world` は `[横,高さの画面y座標,前方]`。
- `deltas[id]` は中立ポーズからの画面上 `[dx,dy]`。キャラクター固有のパーツ配置へ倍率をかけて適用できます。部位長とシルエットに応じて再調整してください。
- 関節は `root, waist, thorax, neck, head` と、左右の `hip, knee, ankle, toe, shoulder, elbow, wrist, hand`。
- `head` は頭の中心目安（中立 y=103.5）、`neck` は首の付け根目安（中立 y=124）です。v13 の頭画像 pivot とは区別してください。
- 足首に `contact`, `foot_pitch`, `lift`、膝と肘に `flex` を記録。
- 走行の足首に `phase_name` を記録。走行の `head_pitch_degrees: 0` と `head.pitch_degrees: 0` は頭の向きが水平であることを表します。
- `flight` は両足非接地。走行の frame 3 / 7 に発生します。

左右は常に**キャラクター本人の解剖学的左右**です。正面で `right` は画面左。方向が変わっても装備のアタッチ先 ID を変更しません。左向きのポーズは同じ三次元的関節を別 yaw で投影し、完成画像の左右反転は使いません。

## 元素材との関係

提供 ZIP 内 `plain-walk-v13` の config、rig、足パーツの不透明領域から足裏の支点を抽出しました。歩行は元リグの `foot_forward`、`foot_angle`、遊脚の足首高さ、上下動、四コマずらした左右位相、腕の角度・肘曲げ、上腿 26 / 下腿 28 px を使用します。元の横向き全 8 コマの脚の関節位置と一致することをテストします。

走行は同じ骨格に対する追加モーションです。今回受け取った参考ファイルは、左へ走る姿勢を描いた JPEG 1 枚です。その水平な視線、曲げた肘と脚の逆位相、前脚の伸展と後脚の折り畳みをもとに、8 コマの周期を組み立てています。参考 GIF の連続フレームを抽出したものではありません。

接地は 3/8 周期、両足が離れる空中区間は frame 3 / 7。各脚は着地 → 沈み込み → 蹴り出し → 回収 → 踵を上げる → 入れ替え → 伸展 → 空中、の順で動きます。沈み込み時には骨盤が下がって膝が曲がり、回収時には踵を後方へ引き上げ、次の接地の前に脚を伸ばします。左右の腕は同じ側の脚と反対へ振り、肘を 74〜98 度に曲げます。

前回の 24 度から **13 度の穏やかな前傾**へ修正しました。腰・胸郭・首・両肩を骨盤中心で回転し、頭は首から鉛直方向に 20.5 px 上へ置いて、胴とは独立して水平な視線を保ちます。胴と腕の骨長を保ち、8 方向は同じ姿勢を投影します。女性戦士の体格へ適用する際も、誇張した腰振りや内股は加えず、足の通り道を解剖学的な左右に維持します。腕の横への開きと体の左右揺れは小さくしています。`RUN_LEAN_DEGREES` を export しています。

走行を変更しても、歩行と中立ポーズ全体の SHA-256 が v2 と完全一致することを `test.mjs` で検査しています。キャラクター側の描画では頭と胴を別部位として扱い、全体を一枚の画像として傾けたり、縦につぶしたりしないでください。

`source-v13.json` と `.mjs` に抽出値と元ファイル SHA-256 を保存。生成は以下で再実行します。

```text
node motion/extract-source.mjs [plain-walk-v13フォルダ]
node motion/export.mjs
node motion/test.mjs
python generic/render.py
```

`generic/` はリグ確認用マネキンです。青が本人の右半身、橙が左半身。右肩のマーカーは方向変更時の非対称部位の確認用で、完成キャラクターの絵柄ではありません。
