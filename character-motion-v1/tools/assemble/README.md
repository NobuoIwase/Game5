# 組み立て（ChatGPT の絵の部位から、足りないコマを作る）

ChatGPT が描いた絵を部位に切り、モーションの関節に合わせて並べ直す。画素は全部 ChatGPT の絵なので、同じ人物に見える。

```
node tools/export_frames.mjs $WORK            # 全コマの関節（モーション）→ $WORK/frames.json
cd tools/assemble
export ASM_WORK=$WORK ASM_SRC=<chatgpt-output の character-motion-v1/chatgpt/out>
pip install rtmlib onnxruntime                # 姿勢推定（RTMPose。初回にモデルを取得）
python3 detect.py                             # 絵の中の関節を見つける → detect.json
python3 match.py                              # 左右をモーションと合わせる・体格の比 → joints.json, fit.json, proportions.json
python3 assemble.py <コマ>...                 # 組み立て → $WORK/out/<コマ>.png と sources.json
python3 publish.py $WORK/out                  # assembled/ に WebP と確認ページ
```

- 胴（頭・髪・服）：体の姿勢がいちばん近く、自分の腕で胴を隠していない絵から。腕があった所は周りの色で埋める
- 腕・脚：肘・膝の曲がりと向きがいちばん近い絵から（1本ずつ別の絵でもよい）。関節に合わせて回し、骨の長さに合わせて伸び縮み
- 重なり：マネキンと同じ決まり（胴の前か後ろか）。長い髪は一番後ろ
- 押さえているもの・泡・塊が描かれた絵は、なるべく使わない。寝た姿勢など、その向きに近い絵がないときは隣の向きの絵を使う
- 確かめる：`sheet.py`（ポーズの図・元の絵・結果）、`grid.py`（一覧）、`segview.py`（部位の切り分け）、`overlay.py`（見つけた関節）
