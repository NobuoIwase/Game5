# GAME5 — v0.5.0

見下ろし型のリアルタイム・コマンドRPG。ヒロインは自律AIで行動し、プレイヤーは敵・罠・環境を配置する。
Game5は「接触ダメージ中心」ではなく、射程・予兆・踏み込み・拘束・状態異常・学習AI・ヌテラ/エステラを軸に設計する。

現在のパイロット版は `game/`。

## v0.5.0
戦士アリアのモーション制作基盤を整理。

- `walk-graphics-handoff/` の歩行修正履歴と `character-motion-v1/` を再確認。
- 戦士の既存8方向パーツ分割を正式な基盤として採用。
- 汎用歩行・汎用走行が既に8方向×8コマで成立していることを確認。
- ゲーム本体で読み込んでいた `run.png` を高速移動時に実際に使用するよう接続。
- `character-motion-v1/warrior-motion-lab.html` を追加。戦士と汎用素体を同一位相で再生・停止・コマ送り可能。
- 同Motion Labに通常斬り、拘束、エステラの前面カットアウト試作を追加。
- 攻撃は肩一軸回転だけでは棒振りになるため、本番では上腕/前腕/手/剣へ追加分割する方針を確定。
- `character-motion-v1/WARRIOR_MOTION_PLAN.md` に制作・QA基準を記録。

詳細:
- `game/README.md`
- `game/NUTERA_SYSTEM.md`
- `character-motion-v1/WARRIOR_MOTION_PLAN.md`
- `character-motion-v1/warrior-motion-lab.html`

## 開発履歴

| 日付 | version | 開発モデル | 内容 |
| --- | --- | --- | --- |
| 2026-09-23 | v0.3.0 | GPT-5.6 Sol | 自律戦士AI、視界/聴覚、間合い/踏み込み、HP/MP/SP、敵知識/学習、敵側罠/AUTO、観測HUD |
| 2026-09-23 | v0.4.0 | GPT-5.6 Sol | ヌテラ/エステラ、ルマネ/催眠/種族別魅了、セイル、輪紋、欲求波、輪紋ビーム、Game4由来の敵設計指針 |
| 2026-09-23 | v0.5.0 | GPT-5.6 Sol | 戦士モーション監査、汎用walk/run確認、run本編接続、Motion Lab、斬撃/拘束/エステラのカットアウト試作とQA計画 |
