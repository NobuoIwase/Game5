# ChatGPT からの納品メモ

Claude Code / `final/REVIEW.md` の検収結果に従い、ChatGPT は画像アセット納品のみを担当する。ゲームコード、`index.html`、README、`asset-refs/` は変更しない。

## 2026-09-25 — REVIEW 不採用5体の描き直し反映

`final/REVIEW.md` で不採用だった次の5体を、生成済み原画から規定に合わせて再作成し、`final/monsters/` の同名ファイルへ置き換えた。

- `monsters/moth.png`
- `monsters/mirror_slime.png`
- `monsters/silk_spider.png`
- `monsters/bubble_shell.png`
- `monsters/crown_attendant.png`

共通確認:
- 256×256 PNG
- 外周・四隅 alpha = 0
- 地面影なし
- ドット絵ではない
- 受け入れ済み `gel / slug / leech / orb / flower` に寄せた柔らかいゲームアート方向
- 48色以上の有色パレットで再出力

`final/index.json` に上記5体を戻し、モンスター11種すべてを再登録した。Claude Code の再検収待ち。

## REVIEW 時点で未納品のままの項目

- `props/tower`
- `props/pool`
- `nutera/hearts`
- `nutera/sigil`
- `nutera/estella_logo`
- `icons/` 8種

