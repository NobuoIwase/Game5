# ChatGPT に頼む1枚絵（ユーザー向け）

作成：Claude（2026-09-27）。作り直しは `node tools/build_chatgpt_draw.mjs`（`build_plan.mjs` と `build_nai_jobs.mjs` のあと）。

- **リポジトリを触れる Astra には、`ASTRA.md` を読ませるだけ**（一覧を読んで描き、`out/<キャラクター>/` に保存し、`node tools/check_chatgpt_out.mjs` で検品して、ブランチ `chatgpt-output` に push する）。下の依頼書・送るページは、チャットだけで頼むとき用
- 対象：作り方の計画（`../PRODUCTION_PLAN.md`）で1枚絵にするコマのうち、NovelAI で作らないもの。計329コマ
  - アリア：攻撃6種（144コマ）
  - 斥候77・魔法使い55・ヒーラー53：それぞれの技・仕草
  - ヒーラーは衣装を前垂れに替える予定なので、原画が決まるまで後回し
- 依頼書：`index.html`（https://nobuoiwase.github.io/Game5/character-motion-v1/chatgpt/index.html ）
  - キャラクターごとに「最初に1回だけ送る文」（見た目の画像を添付）と、**まとめて送る文**（1回に最大16コマ。番号つきのポーズ一覧 `sheet/<名前>.png` を添付）
  - 全部で25回（アリア10・斥候6・魔法使い4・ヒーラー5）。長いモーションは向きの切れ目で分け、短いモーションは同じキャラクターどうしでまとめる
  - ChatGPT には、番号ごとに決まったファイル名の別々の画像で、できれば1つの ZIP で返してもらう
- 下絵：`pose/<モーション>__<向き>__<コマ>.png`（マネキン。青＝本人の右半身、橙＝左半身。剣・盾・杖・ナイフ・尻尾・帽子も描いてある）
  - キャラクターごとに同じ枠で切ってあるので、コマが変わっても大きさと足元の高さがそろう
- 見た目の画像：`../art/warrior-source.png`・`scout-source.png`・`witch-source.png`・`sister-source-v7.png`（ゲームの8方向の絵）
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
