# Astra への作業依頼（2）：場面の絵

作成：Claude（2026-09-27）。`../ASTRA.md`（攻撃・技・仕草の1枚絵）が終わってから行う。形式は同じ。

## やること

`character-motion-v1/chatgpt/scenes/jobs.json` の `batches`（40回ぶん・603枚）を上から順に描き、決まった名前の PNG で保存し、検品して、ブランチ `chatgpt-output` に push する。
**描けない、または描かない方がよいと判断したコマは飛ばしてよい。** 飛ばしたコマは NovelAI で作るので、下の `skipped.txt` に書き残す。

## 読むもの

| 何 | 場所 |
|---|---|
| 一覧 | `character-motion-v1/chatgpt/scenes/jobs.json` |
| キャラクターの見た目 | `jobs.json` の `characters.<キャラクター>.ref`（`character-motion-v1/` からのパス。ゲームの8方向の絵） |
| キャラクターごとの決まり | `characters.<キャラクター>.common`（「・」の項目が描き方の決まり） |
| 1回ぶんの内容 | `batches[i].ask`（番号 → ファイル名・向き・体勢・押さえられている所・押さえているものの見た目・言葉） |
| 1回ぶんのポーズ一覧（番号つき） | `batches[i].sheet`（`chatgpt/scenes/` からのパス） |
| 1枚ずつのポーズの図 | `frames[j].pose` |

## 描き方

`../ASTRA.md` の「描き方」と同じ。加えて：
- ポーズの図の色の付いた線・輪・塊・泡などは、押さえているものの位置。`ask` の「押さえているものの見た目」で、その位置に一緒に描く（図と同じ色では描かない）
- 「言葉」は、見た目や顔・様子の言葉（英語）。絵に反映する
- 図のマネキンは、そのキャラクターの持ち物（尻尾・帽子・杖・バックパック）も描いてある

## 保存と検品

1. 保存先：`character-motion-v1/chatgpt/out/<キャラクター>/<frames[j].file>`（1回目と同じフォルダ。名前は重ならない）
2. 描いた絵をプログラムで縮小・減色・切り抜き・背景除去しない
3. 飛ばしたコマは `character-motion-v1/chatgpt/out/skipped.txt` に1行ずつ書く：`<ファイル名><タブ><理由>`
4. 1回ぶん描いたら検品する：
   ```
   cd character-motion-v1 && node tools/check_chatgpt_out.mjs
   ```
   `NG` の絵は描き直す。「まだの回」が残りを示す（飛ばしたコマは数えない）
5. ブランチ `chatgpt-output` にコミットして push する（`main` には push しない）

## 順番

- アリア → 斥候 → 魔法使い → ヒーラー。ヒーラーの見た目の基準は新しい8方向の絵 `art/healer-source-v8.png`
- 1回目（`aria__scene01`）を描いたら、いったん止めて、ユーザーに確かめてもらう

## やらないこと

- `jobs.json`・`pose/`・`sheet/`・ほかのファイルを書き換えない（`out/` に絵と `skipped.txt` を置くだけ）
- `main` への push、ほかのブランチの書き換え
