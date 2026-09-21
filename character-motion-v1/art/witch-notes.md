# 魔女の原画とリグ

## 採用素材

- `witch-source.png`: 1448 × 1086 px、透過RGBA。4列 × 2行、1方向362 × 543 px。
- 順序: front / down_right / right / up_right / back / up_left / left / down_left。
- 元の意匠: `../references/witch-reference.jpg`。長い薄紫の髪、黒い帽子、本人左側の赤紫のリボン、機械装甲の両腕、白黒の衣装、長いコート、茶のブーツ、本人右手の紫宝珠の杖を基準にした。
- 画像の制作は組み込み `image_gen`。全身の左右反転は行っていない。

## 生成と配置の記録

採用した6方向は `witch-generated-base.png`、不足した右斜め前・左斜め後ろは `witch-generated-two-views.png` から配置した。切り出し領域・拡縮率を再現する寸法は `witch-layout.json` に保存している。最大連結アルファ領域周囲3 pxを保持し、別セルの小さな混入を除き、透明余白の切り詰めと等倍比率の拡縮・配置のみを行った。原画の描き足し、色塗り、描画による修繕はしていない。

主な生成指示:

- `witch-prompt.txt`: 最初の原画指示。
- `witch-correction-prompt.txt`: 体型と8方向を調整し、採用6方向を得た指示。
- `witch-missing-views-prompt.txt`: 右斜め前・左斜め後ろの独立生成。
- `witch-two-views-compact-prompt.txt`: 採用した2方向をSD比率に整えた最終指示。
- `witch-missing-sd-prompt.txt` / `witch-transparency-prompt.txt`: 不採用の途中試作の記録。

`witch-generated-two-views-opaque.png` は背景条件を満たさなかった途中試作で、ゲーム出力には使っていない。

## 可動範囲

`../rigs/witch.json` は両脚・膝・足首を別々に注釈している。横向きの隠れた脚には、同方向の前景脚1本だけを切り出したテクスチャを共有する。装備やキャラクター全体は反転しない。杖と握り手、帽子、上半身、長い髪とコートは元の重なりを保持する。髪や手袋で隠れる上腿の画素は身体側に残し、可視部を脚側に分離する。上端の接続と脚の輪郭は、実際の歩行・走行の全コマで確認する。

この形式は1枚原画の関節変形による試作。布や長髪の独立した揺れ、武器の別モーション、隠れた部分の完全な描き起こしは含まない。

## 最終確認

歩行64コマ・走行64コマを再出力し、明るい背景で全128コマの脚を確認した。256脚の連続面検査は失敗0、画像枠の接触・欠けは0。足の二重混入、固定bodyの低アルファの靴輪郭、横・後ろの根元の離れを修正した。帽子・髪・杖・頭部は枠内に収まる。

検査記録は `../exports/witch/connections.json` と `../exports/witch/source-validation.json`。後者には全8方向の旧靴輪郭がbodyから消えた座標と、左斜め前で残す靴先/除く別足片の透明度を記録している。明るい背景の確認シートは `../temp/witch-final-light/`。黒い細長い部分のうち、原画の腿間に描かれたコートの裾は保持している。
