# GAME5 — v0.6.0

見下ろし型リアルタイム・コマンドRPG。ヒロインは性格・視界・聴覚・記憶・学習に基づいて自律行動し、プレイヤーは敵・罠・環境を配置する。

現在のパイロット版は `game/`。

## v0.6.0 — Warrior Motion

戦士アリアのモーション基盤を本編へ接続した。

- 完成済み8方向×8コマの walk / run を移動速度に応じて使い分ける。
- `rigs/warrior.json` の肩・肘・手首・腕ポリゴンを利用し、既存 `arm_right.png` を実行時に上腕 / 前腕 / 手へマスク切り抜き。
- 通常斬り・破城斬りを `肩 → 肘 → 手首 → 剣` の階層モーション化。
- 見た目の命中フレームを各スキルの実際の `cast` 完了時刻へ同期。
- 拘束中は左右腕・左右脚を別位相で抵抗させるカットアウト描画へ切替。
- エステラは onset / loop / recovery を意識した非対称の部位収縮へ変更。
- `character-motion-v1/warrior-motion-lab.html` を本編と同じレンダラーへ統一。
- Motion Labで8方向、0.5x/1x/1.5x/2x、停止、コマ送りを確認可能。
- 通常斬り数値QA: 最大関節変化 2.613°/sample、加速ピーク 51.7%。
- 破城斬り数値QA: 最大関節変化 2.414°/sample、加速ピーク 61.3%。

詳細:
- `game/README.md`
- `game/NUTERA_SYSTEM.md`
- `character-motion-v1/WARRIOR_MOTION_PLAN.md`
- `character-motion-v1/warrior-motion-lab.html`

## 開発履歴

| 日付 | version | 開発モデル | 内容 |
| --- | --- | --- | --- |
| 2026-09-23 | v0.3.0 | GPT-5.6 Sol | 自律戦士AI、視界/聴覚、間合い/踏み込み、HP/MP/SP、敵知識/学習、敵側罠/AUTO、観測HUD |
| 2026-09-23 | v0.4.0 | GPT-5.6 Sol | ヌテラ/エステラ、段階状態、セイル、輪紋、欲求波、輪紋ビーム、Game4由来の敵設計指針 |
| 2026-09-23 | v0.5.0 | GPT-5.6 Sol | 戦士モーション監査、walk/run確認、run本編接続、Motion Lab初版 |
| 2026-09-23 | v0.6.0 | GPT-5.6 Sol | 関節カットアウト攻撃、拘束/エステラ描画、命中時刻同期、共通Motion Lab、数値QA |
