# Astra への作業依頼（3回目）：描けなかった絵・描き直し・穏やかな場面

作成：Claude（2026-09-28）。やり方はこれまでと同じ。

## 最初に1回だけ：元データの保管

描き始める前に、今の `chatgpt-output` を、そのまま保管用のブランチとして残す（ここまでの絵の元データ。あとで上書きされても取り出せるように）。
```
git fetch origin chatgpt-output
git push origin origin/chatgpt-output:refs/heads/originals/chatgpt-2026-09-28
```
このブランチには、このあと何も足さない・書き換えない。

## やること

`character-motion-v1/chatgpt/round3/jobs.json` の `batches`（22回ぶん・275枚）を上から順に描き、これまでと同じフォルダ・同じ名前の PNG で保存し、検品して、ブランチ `chatgpt-output` に push する。

- 各キャラクターの1回目（`<キャラクター>__r3_01`）は、★の付いた描き直し
  - 前回、安全判定で止まった11枚：衣装はそのままに、向き・腕・持ち物・影で、肌の出る所が自然に目立たない描き方にする
  - アリアの2枚（`aria__thrust__left__4`・`aria__yoko__right__6`）：キャラクターがほかのコマより小さかった。大きさをほかのコマに合わせ、剣が長くても体を縮めない（剣先は画像の端に近くてよいが、切れないように）
- 残りは、場面のうち穏やかなもの（つかまれる・ぼんやりする・転ぶ・倒れる・起き上がる・声をこらえる・後ろから抱えられる・足が塊に沈む）。書き方は場面の依頼（`../scenes/ASTRA.md`）と同じ：
  - ポーズの図の色の付いた線・輪・塊・泡などは、押さえているものの位置。`ask` の「押さえているものの見た目」で、その位置に一緒に描く（図と同じ色では描かない）
  - 「言葉」は、見た目や顔・様子の言葉（英語）。絵に反映する

## 読むもの

| 何 | 場所 |
|---|---|
| 一覧 | `character-motion-v1/chatgpt/round3/jobs.json` |
| キャラクターの見た目・決まり | `characters.<キャラクター>.ref`（`character-motion-v1/` からのパス）と `common` |
| 1回ぶんの内容 | `batches[i].ask` |
| 1回ぶんのポーズ一覧（番号つき） | `batches[i].sheet`（`chatgpt/round3/` からのパス） |
| 1枚ずつのポーズの図 | `frames[j].pose`（`chatgpt/` からのパス） |

## 保存と検品

1. 保存先：`character-motion-v1/chatgpt/out/<キャラクター>/<frames[j].file>`（描き直しは上書き）
2. 描いた絵をプログラムで縮小・減色・切り抜き・背景除去しない
3. 描けたコマが `character-motion-v1/chatgpt/out/skipped.txt` にあれば、その行を消す。どうしても描けないコマは、その行を残す／書き足す（`<ファイル名><タブ><理由>`）。場面の描けなかったコマは NovelAI で作る
4. 1回ぶん描いたら検品：`cd character-motion-v1 && node tools/check_chatgpt_out.mjs`（`NG` は描き直す）
5. ブランチ `chatgpt-output` にコミットして push する（`main` には push しない）

## やらないこと

- `jobs.json`・`pose/`・`sheet/`・ほかのファイルを書き換えない（`out/` に絵と `skipped.txt` を置くだけ）
- `main` への push、ほかのブランチ・タグの書き換え（上の保管用ブランチを最初に作ることだけは行う）

`chatgpt-output` ブランチは、描いた絵の元データの保管場所。main には入れない（ゲームに使う大きさにした版を別に作る）。
