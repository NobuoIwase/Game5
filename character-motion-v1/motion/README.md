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
- `flight` は両足非接地。走行の frame 3 / 7 に発生します。

左右は常に**キャラクター本人の解剖学的左右**です。正面で `right` は画面左。方向が変わっても装備のアタッチ先 ID を変更しません。左向きのポーズは同じ三次元的関節を別 yaw で投影し、完成画像の左右反転は使いません。

## 元素材との関係

提供 ZIP 内 `plain-walk-v13` の config、rig、足パーツの不透明領域から足裏の支点を抽出しました。歩行は元リグの `foot_forward`、`foot_angle`、遊脚の足首高さ、上下動、四コマずらした左右位相、腕の角度・肘曲げ、上腿 26 / 下腿 28 px を使用します。元の横向き全 8 コマの脚の関節位置と一致することをテストします。

走行は同じ骨格に対する追加モーションです。接地を 3/8 周期に短縮し、2 回の空中区間、強い膝の折り畳み、24 度の前傾、より大きい腕振りと肘曲げを追加しています。再生速度だけを変更した歩行ではありません。

走行時の前傾は骨盤を中心に、腰・胸郭・首・頭・両肩を同じ角度で前方へ回転します。腕もこの胸郭の座標系に合わせ、頭だけを下げる姿勢にはしません。骨盤から各部までの長さと腕の長さを保ち、8 方向は同じ姿勢を投影します。頭中心の前方位置は約 30.9 px で、全コマで両足の足首より前へ出ます。`RUN_LEAN_DEGREES` を export しています。実際のキャラクター描画に係数を掛ける場合は、その分だけ見た目の前傾が小さくなります。

`source-v13.json` と `.mjs` に抽出値と元ファイル SHA-256 を保存。生成は以下で再実行します。

```text
node motion/extract-source.mjs [plain-walk-v13フォルダ]
node motion/export.mjs
node motion/test.mjs
python generic/render.py
```

`generic/` はリグ確認用マネキンです。青が本人の右半身、橙が左半身。右肩のマーカーは方向変更時の非対称部位の確認用で、完成キャラクターの絵柄ではありません。
