# 作業中の検査スクリプト（正式なツールにする前の下書き）

開発の途中で使ってきた検査。どれもリポジトリ直下から `node newgame/tools/wip/<名前>` で動く。
形は荒いので、正式なツール（`newgame/tools/` 直下・オプション・説明つき）に整える作業を CODEX_TASKS.md の「課題2」で頼んでいる。

| ファイル | 何を見るか | 使い方 |
|---|---|---|
| `rates.js` | オート指揮なしで潜行を回し、踏破・帰還・敗北・打ち切り（1階300秒超）の数、脅威度ごとの内訳、帰還の理由、敗北させた魔物、罠を壊した数・作動した数を JSON 1行で出す | `node newgame/tools/wip/rates.js <種> <回数>`。8組並べて合計するのがいつもの見方 |
| `stuck.js` | 固まり検出：全ダンジョン×種×5階で、気づいている魔物が近くにいるのに8秒動かない場面を探し、その時の様子（ラベル・位置・MP・近くの魔物）を出す | `node newgame/tools/wip/stuck.js`。最後の行 `found 0 {}` なら合格 |
| `timeouts.js` | 一階に300秒以上かかった階で、後半150秒に何をしていたか（ラベルの上位5つ） | `node newgame/tools/wip/timeouts.js` |
| `charmdive.js` | 5ダンジョン×5回の潜行で、魅了がどの魔物から何回起きたか | `node newgame/tools/wip/charmdive.js` |

ほかに `newgame/tools/fingerprint.js`（挙動の指紋）、`sim.js`（30日分）、`bal.js`、`play.js`（ブラウザ）がある。
