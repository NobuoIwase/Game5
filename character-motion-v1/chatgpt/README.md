# ChatGPT に頼む1枚絵（ユーザー向け）

作成：Claude（2026-09-27）。作り直しは `node tools/build_chatgpt_draw.mjs`（`build_plan.mjs` と `build_nai_jobs.mjs` のあと）。

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
