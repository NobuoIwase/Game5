# Game5 battle pilot — v0.5.0

ヒロインを直接操作せず、AIが視界・聴覚・記憶・性格・敵知識から行動を選ぶリアルタイムRPGパイロット。

## v0.5.0 — Warrior Motion Foundation

- 戦士アリアの既存モーション資産を監査。
- 既存パーツ:
  `body / arm_left / arm_right / leg_left / leg_right / sword / shield / scabbard`
  が8方向に分離済みであることを確認。
- 汎用素体の walk/run は8方向×8コマで存在。
- 本編で高速移動時に `exports/warrior/run.png` を自動選択するよう変更。
- 低速追跡・旋回・音源確認は walk、高速接近・逃走・回避は run。
- `character-motion-v1/warrior-motion-lab.html` で戦士と汎用素体を同一フレーム比較可能。
- Motion Labで `通常斬り / 拘束 / エステラ` の前面カットアウト試作を再生・停止・コマ送り可能。
- 攻撃は既存右腕一枚の肩回転だけでは不十分なため、次段階で上腕/前腕/手/剣へ追加分割する。
- エステラは `onset / loop / recovery` の3相へ分ける方針。
- 拘束は敵ごとの拘束点データを戦士リグへ適用する方針。

詳細: `../character-motion-v1/WARRIOR_MOTION_PLAN.md`

## 現行システム

- HP / MP / SP
- 視界 / 聴覚 / 記憶 / 学習
- リーチ / 踏み込み / 攻撃判定 / 回避
- 敵の予兆 / 拘束 / 状態異常 / 魔法
- ヌテラ / エステラ
- ルマネ / 催眠 / 種族別魅了 / セイル / 輪紋
- 敵側ディレクター / AUTO配置

## 開発履歴

| 日付 | version | 開発モデル | 内容 |
| --- | --- | --- | --- |
| 2026-09-23 | v0.3.0 | GPT-5.6 Sol | 自律戦士AI、戦闘間合い、HP/MP/SP、敵知識、罠/AUTO |
| 2026-09-23 | v0.4.0 | GPT-5.6 Sol | ヌテラ/エステラ、段階状態、セイル、輪紋、欲求波、輪紋ビーム |
| 2026-09-23 | v0.5.0 | GPT-5.6 Sol | 戦士モーション監査、run本編接続、Motion Lab、斬撃/拘束/エステラ試作 |
