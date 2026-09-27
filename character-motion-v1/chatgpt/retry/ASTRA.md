# Astra への作業依頼：1枚絵のやり直し

作成：Claude（2026-09-27）。`../ASTRA.md`（1回目）で届いていないコマだけを描く。やり方は1回目と同じ。

## やること

`character-motion-v1/chatgpt/retry/jobs.json` の `batches`（12回ぶん・137枚）を上から順に描き、1回目と同じフォルダ・同じ名前の PNG で保存し、検品して、ブランチ `chatgpt-output` に push する。

- アリア：前に描けなかった30枚。**ほとんどが後ろ向き・斜め後ろ向き**。キャラクターの見た目の画像（`art/warrior-source.png`）の後ろ向きの絵を参考にし、顔はほとんど見えない。剣・盾は図の位置に描き、体に隠れる部分は隠れたままでよい
- 魔法使い：54枚
- ヒーラー：53枚。**見た目の基準は新しい8方向の絵 `art/healer-source-v8.png`**（`characters.healer.ref`）。前の原画（`sister-source-v7.png`）は使わない

## 読むもの

| 何 | 場所 |
|---|---|
| 一覧 | `character-motion-v1/chatgpt/retry/jobs.json` |
| キャラクターの見た目・決まり | `jobs.json` の `characters.<キャラクター>.ref`（`character-motion-v1/` からのパス）と `common` |
| 1回ぶんの内容 | `batches[i].ask` |
| 1回ぶんのポーズ一覧（番号つき） | `batches[i].sheet`（`chatgpt/retry/` からのパス） |
| 1枚ずつのポーズの図 | `frames[j].pose`（`chatgpt/` からのパス） |

## 保存と検品

1. 保存先：`character-motion-v1/chatgpt/out/<キャラクター>/<frames[j].file>`
2. 描いた絵をプログラムで縮小・減色・切り抜き・背景除去しない
3. どうしても描けないコマは飛ばしてよい。`character-motion-v1/chatgpt/out/skipped.txt` に `<ファイル名><タブ><理由>` を1行ずつ書く
4. 1回ぶん描いたら検品する：`cd character-motion-v1 && node tools/check_chatgpt_out.mjs`（`NG` は描き直す）
5. ブランチ `chatgpt-output` にコミットして push する（`main` には push しない）

## やらないこと

- `jobs.json`・`pose/`・`sheet/`・ほかのファイルを書き換えない（`out/` に絵と `skipped.txt` を置くだけ）
- `main` への push、ほかのブランチの書き換え

## 次の作業

この作業が終わり、ユーザーから頼まれたら、場面の絵 `../scenes/ASTRA.md` に進む。
