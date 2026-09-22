# Game5 Graphics Specification — v0.8.0

## 方針

Game5の画面を単色Canvas中心の仮表示から、トップダウン・ダンジョンRPGとして読める画面へ移行するための基盤です。

敵側は「痛み」を視覚テーマにしません。ヌテラの設定に合わせ、ぬめり、摩擦、吸着、包み込み、柔らかな巻き付き、ガス、催眠、魅了、輪紋・魔力干渉を中心にします。

## アトラス

全アトラスは64pxセルです。

### `assets/dungeon.png` — 4列

| index | asset |
| ---: | --- |
| 0 | clean stone floor |
| 1 | cracked stone floor |
| 2 | moss stone floor |
| 3 | straight wall |
| 4 | stairs down |
| 5 | wooden door |
| 6 | torch sconce |
| 7 | blue crystal |
| 8 | green swamp |
| 9 | gas vent |
| 10 | ring sigil |
| 11 | fog patch |
| 12 | rubble |

### `assets/enemies.png` — 4列

| index | asset |
| ---: | --- |
| 0 | blue slime / 粘魔 phase 1 |
| 1 | violet slime / 粘魔 phase 2 |
| 2 | blue wisp |
| 3 | hypnotic moth |

### `assets/fx.png` — 3列

| index | effect |
| ---: | --- |
| 0 | warm glow |
| 1 | crystal glow |
| 2 | poison / slime haze |
| 3 | fog |
| 4 | soft shadow |
| 5 | darkness patch |
| 6 | ring pulse |
| 7 | purple distortion |
| 8 | floor ambient light |

## レンダリング順

`graphics-enhance.js` は戦闘ロジックを変えずに描画を合成します。

1. ベース背景
2. ダンジョン床 / 壁 / 環境チップ
3. 既存の戦闘予兆・ヒロイン
4. 既存罠
5. 新罠FX
6. 敵スプライト
7. 霧 / エステラ歪み
8. 暗所ライティング
9. 発光加算

## ライティング

- 全画面に暗色レイヤー
- ヒロイン周囲を最も明るく抜く
- 燭台・結晶を固定光源として扱う
- 敵phase 2は弱い自己発光
- FXは `lighter` 合成
- ライティングCanvasは毎フレーム新規生成せず再利用

## 次の拡張

- 装飾マップチップを探索マップ・衝突判定へ接続
- Game4由来の軟体系、付着系、ガス系、眼魔系をGame5仕様で追加
- 敵の呼吸、伸縮、吸着、変形アニメーション
- ヒロインへの環境光・敵光源による色味変化
- 部屋単位の光源配置と視界遮蔹
