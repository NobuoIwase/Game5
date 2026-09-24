# GAME5 — v0.18.0

見下ろし型リアルタイム自律戦闘ダンジョンRPG。アリアは直接操作せず、視界・聴覚・記憶・学習・性格で探索/戦闘。プレイヤーは敵側として罠・地形・モンスターを配置する。パイロット版は `game/`。

## v0.18.0 — 生成PNG正式採用
2026-09-24 / GPT-5.6 Sol

SVG仮素材ではなく、生成画像から作ったPNGアトラスを本編へ接続。
- `game/assets/requested/generated/monsters_v018.png` — モンスター11種
- `game/assets/requested/generated/floors_v018.png` — 7区画床
- `game/assets/requested/generated/extras_v018.png` — 宝箱/偽宝箱/階段/塔/粘沼/罠UI/VFX/Nutera・Estella素材
- `game/assets/requested/generated/allies_v018.png` — 仲間候補3人
- `game/generated-png-v018.js` — PNGを切り抜き、敵・床・設置物・VFX・UIへ割当
- `game/index.html` / `manifest.json` — v0.18.0へ更新

Nutera表現は痛み・牙・刃・流血ではなく、ぬめり、吸着、柔らかな包み込み、摩擦、泡、胞子、催眠を中心にする。

## 中心システム
アリアは引っ込み思案な戦士。初見敵を試行錯誤で学習し、既知の道や敵の知識を記憶する。戦闘は接触ダメージ主体ではなく、明確な射程、踏み込み、予兆、回避、拘束、状態異常、魔法を持つリアルタイム自動戦闘。

HP=体力、MP=技用精神力、SP=スタミナ。HP/SP 0で敗北。
Nuteraは拘束・張り付き・敵固有行動で上昇し100%でEstella。行動不能、MP少量漏出、SP大幅減少。発動後20〜30%まで高速低下。Lumane/Hypnosis/Charmは100%で1段階、Sailは%でNutera上昇量を増幅。輪紋は回復下限固定などを行う。

## 開発履歴
- 2026-09-23 v0.3.0 GPT-5.6 Sol — 自律AI/視界/聴覚
- 2026-09-23 v0.4.0 GPT-5.6 Sol — Nutera/Estella/Lumane/Sail/Hypnosis/輪紋
- 2026-09-23 v0.5.0〜v0.10.0 GPT-5.6 Sol — 戦士モーション、リーチ、踏み込み、予兆、FX、ライティング
- 2026-09-23 v0.11.0 GPT-5.6 Sol — 7区画/7種族/複数敵/学習/壁回避
- 2026-09-23 v0.12.0〜v0.16.0 Claude Code — AI/バランス/Game4資産/床/地形/Nutera演出/追加口
- 2026-09-24 v0.17.0 Claude Code — ChatGPTアセットパック統合/二重描画修正
- 2026-09-24 **v0.18.0 GPT-5.6 Sol** — **生成PNG正式採用、本編接続**

## 資料
`game/ASSET_REQUESTS.md` / `game/assets/requested/ASSET_PACK_v0161.md` / `game/NUTERA_SYSTEM.md` / `game/DUNGEON_SYSTEM.md` / `game/GRAPHICS.md` / `character-motion-v1/WARRIOR_MOTION_PLAN.md`
