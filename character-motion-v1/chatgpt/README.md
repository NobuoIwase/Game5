# ChatGPT に頼む1枚絵（ユーザー向け）

作成：Claude（2026-09-27）。作り直しは `node tools/build_chatgpt_draw.mjs`（`build_plan.mjs` と `build_nai_jobs.mjs` のあと）。

- **リポジトリを触れる Astra には、`ASTRA.md` を読ませるだけ**（一覧を読んで描き、`out/<キャラクター>/` に保存し、`node tools/check_chatgpt_out.mjs` で検品して、ブランチ `chatgpt-output` に push する）。下の依頼書・送るページは、チャットだけで頼むとき用
- 対象：作り方の計画（`../PRODUCTION_PLAN.md`）で1枚絵にするコマのうち、NovelAI で作らないもの。計329コマ
  - アリア：攻撃6種（144コマ）
  - 斥候77・魔法使い55・ヒーラー53：それぞれの技・仕草
  - ヒーラーの見た目の基準は、新しい8方向の絵 `../art/healer-source-v8.png`（前垂れの衣装。2026-09-27）
- 依頼書：`index.html`（https://nobuoiwase.github.io/Game5/character-motion-v1/chatgpt/index.html ）
  - キャラクターごとに「最初に1回だけ送る文」（見た目の画像を添付）と、**まとめて送る文**（1回に最大16コマ。番号つきのポーズ一覧 `sheet/<名前>.png` を添付）
  - 全部で25回（アリア10・斥候6・魔法使い4・ヒーラー5）。長いモーションは向きの切れ目で分け、短いモーションは同じキャラクターどうしでまとめる
  - ChatGPT には、番号ごとに決まったファイル名の別々の画像で、できれば1つの ZIP で返してもらう
- 下絵：`pose/<モーション>__<向き>__<コマ>.png`（マネキン。青＝本人の右半身、橙＝左半身。剣・盾・杖・ナイフ・尻尾・帽子も描いてある）
  - キャラクターごとに同じ枠で切ってあるので、コマが変わっても大きさと足元の高さがそろう
- 見た目の画像：`../art/warrior-source.png`・`scout-source.png`・`witch-source.png`・`healer-source-v8.png`（ゲームの8方向の絵）
- 送る：`upload.html`（スマホで開く）。コマを選び、絵を選んで送ると、`<キャラクター>__<モーション>__<向き>__<コマ>` の名前でブランチ `chatgpt-output` の `character-motion-v1/chatgpt/out/<キャラクター>/` に入る（WebP に縮小）
  - ZIP か名前の付いたファイルは、まとめて選んで送れる（名前でどのコマか決まる。ZIP の中のフォルダは無視）
  - GitHub のトークンは Fine-grained personal access token（リポジトリは Game5 だけ、権限は Contents: Read and write だけ、期限は短め）
- 部位の絵（曲げた肘・膝、手の形、衣装の部位）の依頼は、まだ作っていない

## 場面の絵（2回目。NovelAI に回していたもの）

- `scenes/`：NovelAI で作る予定だった場面のコマ（拘束・床・顔を寄せられる・小さな生き物がくっつく など、165コマ×4人＝603枚）を、同じ形で Astra に頼む一式。作り直しは `node tools/build_chatgpt_scenes.mjs`
  - Astra には「character-motion-v1/chatgpt/scenes/ASTRA.md を読んで、そのとおりに作業して」と送る（1回目の `ASTRA.md` が終わってから）
  - 40回（1人10回）。言い方は ChatGPT 向けの控えめなもの（`tools/nai_scene_ja.mjs` の CG_*）。押さえているものの見た目・顔の言葉は `nai/words.json`
  - 下絵は、そのキャラクターの持ち物（尻尾・帽子・杖・バックパック）入りで、押さえられている所を色の線・塊で描いたもの
  - 描けない・描かない方がよいコマは飛ばしてよく、`out/skipped.txt` に書き残す。そのコマは NovelAI で作る
- 出来上がりのファイル名は NovelAI の分と同じ `<キャラクター>__<モーション>__<向き>__<コマ>.png`
- 検品 `node tools/check_chatgpt_out.mjs` は、1回目と場面の両方の一覧を見る

## やり直し（1回目で届いていないコマ）

- `retry/`：`chatgpt-output` ブランチにまだないコマだけを、同じ形で頼み直す一式。作り直しは `git fetch origin chatgpt-output && node tools/build_chatgpt_retry.mjs`（そのたびに残りだけになる）
  - Astra には「character-motion-v1/chatgpt/retry/ASTRA.md を読んで、そのとおりに作業して」と送る
  - 2026-09-27 時点：届いた192枚を除く137枚（アリア30・魔法使い54・ヒーラー53）を12回で。アリアは後ろ向き・斜め後ろ向きが飛びやすかったので、その回には後ろ向きの描き方を書き足した

## 3回目（描けなかった絵・描き直し・穏やかな場面）

- `round3/`：`node tools/build_chatgpt_round3.mjs`（`git fetch origin chatgpt-output` のあと）。Astra には「character-motion-v1/chatgpt/round3/ASTRA.md を読んで、そのとおりに作業して」
  - 前回、安全判定で止まった11枚（`out/skipped.txt`）＋描き直す2枚（アリアが小さかった）＋場面のうち ChatGPT でも描けそうな262枚＝275枚を22回で
  - ChatGPT に回す場面は `GPT_OK`（つかまれる・ぼんやりする・転ぶ・倒れる・起き上がる・声をこらえる・後ろから抱えられる・足が塊に沈む）。縛られる・揺さぶられる・こわばる・力が抜ける・張り付かれる・巻きつかれる・誘う姿勢・前垂れは NovelAI で作る

## 元データの保管

- 描いた絵の元（1254×1254 の PNG、2026-09-28 時点で 244MB）は、ブランチ `chatgpt-output` に置いたまま残す。**main には入れない**
- 1回目と2回目が終わった時点の状態は、ブランチ `originals/chatgpt-2026-09-28` として固定する（3回目の最初に Astra が作る。`round3/ASTRA.md`）。あとで `chatgpt-output` が進んでも、この時点の絵を取り出せる
- ゲームに使うのは、ここから縮めた版（別に作る）

## 同じ人に見えるようにそろえる（`unified/`）

ChatGPT の絵は毎回「似せて描いた別の絵」なので、髪の跳ね・帽子・杖の頭（魔法使いの爪と宝石、ヒーラーの輪）・大きさがコマごとに少しずつ違い、動かすとちらつく。`tools/unify_chatgpt_frames.py` で、手本のコマからそろえる（元の絵は触らない）。

```
git fetch origin chatgpt-output
git worktree add ../../wt-out origin/chatgpt-output        # 元の絵（1254px）を取り出す
python3 tools/unify_chatgpt_frames.py ../../wt-out/character-motion-v1/chatgpt/out --preview
```

- 髪・帽子：向きごとの手本のコマから、髪・帽子の色の所だけを重ねる。顔・目・口はそのコマのまま。頭の前にある剣・腕・杖はそのまま前に残す。頭の下の方は元の髪に溶かすので、揺れは残る
- 杖の頭（魔法使い・ヒーラー）：手本のコマ（魔法使い `mage_bolt` 正面0、ヒーラー `healer_pray` 正面0）の杖の頭を、宝石の位置に、そのコマの柄の向きに合わせて、体の大きさに合う大きさで重ねる。元の頭の余った所は消し、手や帽子のつばが前にある所はそのまま前に残す
- 大きさ：頭の大きさが手本と同じになるように、足元を中心に拡大・縮小（0.8〜1.45倍）
- 自信がないコマ（顔に髪がかかる・合わせ方が悪い・杖の頭が見えない など）はそのまま。理由は `unified/report.json`
- 出力：`unified/<キャラクター>/<名前>.webp`（512px、ゲーム用）、`unified/preview/`（前後の比べ）
