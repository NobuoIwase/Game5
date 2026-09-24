# GAME5 — v0.18.1

見下ろし型リアルタイム自律戦闘ダンジョンRPG。アリアは直接操作せず、視界・聴覚・記憶・学習・性格で探索/戦闘。プレイヤーは敵側として罠・地形・モンスターを配置する。パイロット版は `game/`。

## v0.18.1 — 生成PNGアセット実装の完成
2026-09-24 / GPT-5.6 Sol

生成PNGアトラスを本編へ利用する方針を実装。

- `game/assets/requested/generated/monsters_v018.png` — 敵アトラス11種肊
- `game/assets/requested/generated/floors_v018.png` — 7区画本編の床表珽
- `game/assets/requested/generated/extras_v018.png` — 宝箱、偍宝箱、訑眠の塔、隖段、粘沰、敵側ディレクターアイコン、VFX、ヌテラ/Estella表現
- `game/assets/requested/generated/allies_v018.png` — 仲間候衣のパーティーアセット
- `game/generated-png-v018.js` — PNGアセットを切り出し、敵・床・設置物/VFX/Nutera/Estellaたの表示へ割当

Nutera表現は痛み・流顀・鋒いお物でなく、ぬめり・吸着・星らかな包み込み・摩擦・泡・胞子・催眠を中心にした。�## 中心システム
アリアは引っ込み思案な戦士。初見敵を試行錯誤で学習し、既知の道や敵の知識を記憶する。戦闘は接触ダメージ主体ではなく、明確な射程、踏み込み、予兆、回避、拘束、状態異常、魔法を持つリアルタイム自動戦闘。

HP=体力、MP=技用精神力、SP=スタミナ。HP/SP 0で敗北。
Nuteraは拘束・張り付き・敵固有行動で上昇し100%でEstella。行動不能、MP少量漏出、SP大幅減少。発動後20〜30%まで高速低下。
## 開登屴歌
- 2026-09-23 v0.3.0 GPT-5.6 Sol — 自律AI/觖界/聴覚
- 2026-09-23 v0.4.0 GPT-5.6 Sol — Nutera/Estella/Lumane/Sail/Hypnosis/輪紋
- 2026-09-23 v0.5.0〜v0.10.0 GPT-5.6 Sol — 戦士モーション、リーチ、踏み込み、予兆、FX,ライティング
- 2026-09-23 v0.11.0 GPT-5.6 Sol — 7区画/7種族/複数敵/学��壀回へ
- 2026-09-23 v0.12.0“v0.16.0 Claude Code — AI/バランス/Game4一料/庒/地形/Nutera演击っ加婣
- 2026-09-24 v0.17.0 Claude Code — ChatGPTアセットパック統合/二重描画修正
- 2026-09-24 v0.18.0 GPT-5.6 Sol — 生成PNG正式採用、本編接続
- 2026-09-24 **v0.18.1 GPT-5.6 Sol** — 生成PNGアセットを実ランタイムへ安全切曻。設置物/VFX/Nutera/Estella/介間候補のPNG利用を拡張。