# 戦士の走行 v4 — 脚の接続と鞘の修正

v3には、上腿・下腿・足先の切断縁を別々に回転することで隙間が開く欠陥がありました。正面・背面の短縮時に下腿を消して足だけ移動する処理も、分離を起こしていました。前回の「継ぎ目の硬さ」という評価は不適切でした。

戦士の走行だけを修正しています。歩行、スカウト、汎用素体の元画像と走行周期は維持しています。

- 太腿～膝～足首～靴を一続きの画像として変形し、関節の切断縁を共有。
- 黒い生地に曲げを分散し、膝当ての上縁に変形が集中しないよう調整。深く折れた正面の膝は元の膝当ての丸みを保つ。
- 折れたすねを消す処理を削除。脚の前後関係を各コマの奥行きから決める。
- 腰と太腿の接続部には元の画素を重ね、切り抜きの透明な隙間を閉じる。
- 右向きの鞘は腕に隠れて上端が欠けた画像から、全長のある既存パーツへ交換。
- 全8方向の鞘の実際の口金を、腰ベルトの実際の画素へ校正して固定。

左右反転、顔・体型・衣装の再生成は行っていません。

## 確認用

- [修正版v4・軽量8方向プレイヤー](../players/warrior-run-v4.html)
- [横向きGIF](run-right.gif)、[正面GIF](run-front.gif)、[背面GIF](run-back.gif)
- [左斜め後ろGIF](run-up_left.gif)、[左斜め前GIF](run-down_left.gif)
- [同じコマでの修正前後](joint-comparison.png)
- [全64コマの一覧](../reviews/run-v4-final/warrior-run-all-frames.png)

## 再現・検査

`node tools/render.mjs warrior` で出力。`node tools/render.mjs --check-run-connections` は左右の脚128例の透明画素による分断と、鞘64例の口金・ベルトの接触を検査し、結果を `exports/run-connections.json` に保存します。数値検査だけでは形の自然さは保証しないため、明背景での関節拡大と再生を併用します。

プレビューの更新は `python tools/export_previews.py` → `python tools/build_player.py` → `python tools/build_run_v4_review.py`。各コマ384×512 px、8方向×8コマ、80 ms／コマ、透過PNGです。
