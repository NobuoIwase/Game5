# 引き継ぎ：残りの絵（2026-09-28・Claude から ChatGPT Astra へ）

Astra はこのファイルを読み、下の数を実際のファイルで確かめ、違えば直してコミットしてよい。画像生成は Grok に任せる。

## いまの状態

| 何 | 状態 | どこ |
|---|---|---|
| モーション（関節の動き） | できている | `motion/*-poses.json`、ポーズの図 `chatgpt/pose/`・`chatgpt/scenes/pose/`・`nai/base/` |
| ChatGPT の1枚絵（攻撃・技・仕草）329枚 | 320枚できた・9枚は安全判定で未 | 元絵：ブランチ `chatgpt-output` の `character-motion-v1/chatgpt/out/<キャラ>/`（main に入れない） |
| ChatGPT の場面の絵 | 171枚できた | 同上。飛ばした理由は `chatgpt/out/skipped.txt` |
| そろえた版（髪・杖・剣・盾・大きさ） | 491枚 | `chatgpt/unified/<キャラ>/*.webp`（`tools/unify_chatgpt_frames.py`、説明は `chatgpt/README.md`） |
| NovelAI | 同一キャラにならず中止 | `nai/`（道具は残す） |

## 残り（まだ絵がないコマ）＝ Grok で作るもの

一覧は **`nai/jobs.json` の `jobs` から `nai/remaining.json` の `skip` を除き、`remaining.json` の `jobs` を足したもの**。

| キャラ | 残り | 内訳 |
|---|---|---|
| アリア | 98 | 場面95＋斜め後ろの攻撃3（`kesa`/`yoko`/`thrust` の `up_right`） |
| 斥候 | 85 | 場面 |
| 魔法使い | 101 | 場面 |
| ヒーラー | 157 | 場面151＋技6（`healer_buff`/`healer_purify`） |
| 計 | 441 | |

- 1コマの中身：`nai/jobs.json` の `frames[<frame>]`（`label`＝何の場面か、`ja`＝体勢・押さえ・動き、`view`＝向き、`base`＝ポーズの図）。足した9コマは `remaining.json` の `frames`
- 場面ごとの説明：`nai/scenes.html`。場面・モーションごとの言葉（ユーザーの言葉）：`nai/words.json`
- ChatGPT の絵が増えたら一覧を作り直す：`git fetch origin chatgpt-output && python3 tools/build_nai_remaining.py`

## Grok に渡すもの

- **Grok 用のページ：`grok/index.html`**（https://nobuoiwase.github.io/Game5/character-motion-v1/grok/index.html 、作り直しは `git fetch origin chatgpt-output && node tools/build_grok.mjs`）。1コマずつ、添付する画像と貼る文と保存名がある

- 見た目の基準：参照画像 `nai/ref/<キャラ>-body.png`・`-face.png`（白背景）と8方向の絵 `art/warrior-source.png`・`scout-source.png`・`witch-source.png`・`healer-source-v8.png`
- 似せる手本：同じキャラの `chatgpt/unified/<キャラ>/` の絵（同じ向きのもの）
- 姿勢：そのコマの `base`（ポーズの図。青＝本人の右半身、橙＝左半身。図の線や色は描かない）
- 描き方は ChatGPT と同じ（`chatgpt/ASTRA.md` の「描き方」）：同じ絵柄・頭身・衣装・色、1コマ1枚、正方形 1024 以上、背景は透明か白、影・文字・枠なし、足元は下から1割

## 決まり（変えない）

- NG：卵・出産、痛み・流血、獣姦、実在の虫
- 4人とも大人の女性（デフォルメの頭身）
- モンスターのピンク系の配色はわざと
- `docs/` は参照だけ
- 出来た絵のファイル名：`<キャラ>__<モーション>__<向き>__<コマ>.png`
- 元絵の置き場（案）：ブランチ `grok-output` の `character-motion-v1/grok/out/<キャラ>/`（main には入れない）。検品は `tools/check_chatgpt_out.mjs` を写して使う
- 出来たら `tools/unify_chatgpt_frames.py`（髪・杖・剣・盾・大きさをそろえる）を通してゲームに使う

## 試したがやめたこと

- NovelAI（V4.5＋精密参照・下絵の img2img）：同一キャラにならない
- ChatGPT の絵を部位に切って組み立てる案：絵の中の関節の位置がモーションの関節と合わない（頭身・手足の長さが違う）ので、関節の位置を1枚ずつ見つける仕組みが先に要る。未着手
