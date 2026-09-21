# Game5 — 8方向の歩行・走行グラフィック 修正版 v2

v2では戦士の正面と左斜め前を描き直し、顔と胴体の向きを揃えました。剣の握り位置と保持角度、左前腕に装着する盾の動きと重なりを調整し、走行の前傾を24度へ変更しています。[修正内容と比較画像](revision-v2/README.md)を参照してください。

`player.html` は軽量な選択画面です。戦士・獣人スカウト・汎用モーションの歩行と走行を、キャラクター別・動作別の6ページに分割しました。選んだ1動作だけを読み込み、8方向を同時に確認できます。再生・停止、コマ送り、速度、背景を変更できます。

スマホ用の各ページは `players/warrior-walk.html`、`warrior-run.html`、`scout-walk.html`、`scout-run.html`、`generic-walk.html`、`generic-run.html` です。それぞれ画像を内蔵した単独HTMLなので、1ファイルだけでも再生できます。キャラクター間の移動や一覧を使う場合は、`player.html` と `players/` の配置を保ってください。

表示専用の画像を192×256 px／コマのWebPに変換し、1ページ1枚だけ読み込みます。ゲーム用のPNGは元の384×512 pxのままです。各ページの容量は `players/build-report.json` に記録しています。以前の全キャラクター一体版は約34.6 MBでした。

PCのファイルパスや `127.0.0.1` / `localhost` は、スマホからPCへ接続するURLではありません。スマホでは個別HTMLを端末へ転送して対応するブラウザで開くか、HTMLを配信するWebサイトのURLから開いてください。GitHubのファイル表示画面はプレイヤーを実行する画面ではありません。

## 素材

- `exports/warrior/walk.png` / `run.png`：戦士の透過シート。
- `exports/scout/walk.png` / `run.png`：獣人スカウトの透過シート。
- `exports/<character>/<motion>/<direction>/00.png`〜`07.png`：個別コマ。
- `exports/<character>/<motion>-preview.gif`：8方向を並べた動きの確認用。
- `generic/`：汎用の素体・関節モーション。元サイズ192×256 px。
- `exports/manifest.json`：セル寸法、方向順、フレーム時間、装備の左右など。

キャラクター1コマは **384×512 px、透過RGBA**。シートは横8コマ×縦8方向（3072×4096 px）です。方向の行順は **正面／右斜め前／右／右斜め後ろ／後ろ／左斜め後ろ／左／左斜め前**。歩行は120 ms、走行は80 ms／コマです。ゲーム内の表示サイズは縮小して調整できます。

名前・性格設定は確定設定として使用していません。識別子は `warrior` と `scout` です。

## 参照と左右非対称

ユーザー提供の2枚の設定画を `references/` に保存しています。新しい設定画の意匠を優先して、内蔵画像生成で8方向の原画をそれぞれ描きました。プロンプトは `art/` に保存しています。

戦士は本人基準で **剣＝右手、盾＝左腕、肩当て＝右肩、鞘＝左腰** に固定しています。肩当ては設定画の立ち絵と「右のみ」の注記に不一致があるため、今回は注記を採用した仮決定です。左方向の全身画像を右方向から左右反転する処理はありません。装備を方向別の原画から分離して、本人基準の関節に取り付けています。

横向きで隠れた脚は、同じ方向を向いた左右共通の靴・脚のテクスチャを再利用しています。剣・盾・肩当てなどの非対称装備はその共有対象に含みません。

## 共通の歩行・走行

`motion/rig.mjs` は引き継ぎZIPの `plain-walk-v13` の歩行データと脚IKを基にしています。元の横向きの脚位置との照合を `motion/test.mjs` で行います。左右の関節を本人基準で固定し、8方向へ投影しています。

走行は歩行の早送りだけではなく、前傾、短い接地、膝と肘の屈曲、両足非接地のコマを持つ別の動きです。`motion/poses.json` には128ポーズ、中立姿勢、関節の親子関係、奥行き、接地情報と差分があり、別キャラクターにも使えます。

`rigs/` に部位の切り出しと支点、`parts/` に抽出した部位PNG、`tools/render.mjs` に部位合成処理があります。生成原画から部位を切り出し、太腿は腰側を固定したまま膝側へ曲がるように変形しています。関節接続部には短い重なりを設けています。スカウトは荷物を支える姿勢を維持するため、上半身・腕・リュックを一体として動かしています。

## 再出力

Node.js、`@napi-rs/canvas`、Python 3、Pillowが必要です。

```powershell
npm install
python -m pip install -r requirements.txt
node motion/export.mjs
python generic/render.py
node tools/render.mjs
python tools/export_previews.py
python tools/build_player.py
node motion/test.mjs
node tools/validate_exports.mjs
python tools/validate_mobile_player.py
```

元の引き継ぎZIPは変更していません。`motion/source-v13.json` に元データと出典を保存しています。画像生成を再実行せずにアニメーションを再出力できます。

スマホ用プレイヤーだけの更新は `python tools/build_player.py` で実行できます。元の大型一体版が必要な場合は `python tools/build_player.py --full` で `player-full.html` を別途出力します。

## この版の範囲

これは設定画をゲーム用アニメーションへ落とし込んだ初稿です。方向ごとに生成した原画には、顔の角度や細かな金具・髪の形の差が残ります。横向きで隠れていた部位は共有テクスチャと関節の重なりで補っています。武器を持ったままの移動姿勢で、攻撃や武器の抜き差しは含みません。ゲーム内の移動速度、接地足と地面の同期、衝突判定はゲーム側で設定してください。

確認は `player.html` の低速再生・コマ送りと `exports/*/joints-review.png` で行えます。確認内容と調整余地は `docs/QA.md` に記録しています。
