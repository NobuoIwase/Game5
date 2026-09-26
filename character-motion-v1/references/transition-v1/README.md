# つなぎ（モーションとモーションの間）の参考資料 transition-v1

依頼書は `../../SCENE_MOTION_REQUEST.md` の5章。全モーションの一覧ページは `../index.html`（「つなぎ」の区分）。

`motion/transitions.mjs` が作るつなぎを `tools/render_transition_svg.mjs` で描いたもの。
- どのモーションからどのモーションへ移るかは、ゲームの流れに沿って `motion/transitions.mjs` の `EDGES` に並べてある
  - 例：捕まる → もがく → 絶頂 → 余韻 → 回復
- そのうち、前のモーションの終わりと次の始まりが離れているものにだけ、つなぎがある
- ループするモーションには0コマ目から入り、0コマ目で抜ける

| ファイル | 内容 |
|---|---|
| `<前>__<次>_keys_<view>.svg` | 前のモーションの終わり（2コマ）→ つなぎ → 次のモーションの始まり（2コマ）を並べたもの |
| `<前>__<次>_preview.svg` | 同じ流れを2方向で再生するアニメーション |

検品：
- `node tools/check_transitions.mjs`：全部の組み合わせで、どの部位も1コマで20pxより大きく跳ばないか
- `node tools/check_legs.mjs`：脚の交差
- `node tools/check_occlusion.mjs --hover`：体の後ろの部位が出たり隠れたりしないか
