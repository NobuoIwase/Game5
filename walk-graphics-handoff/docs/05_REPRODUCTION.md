# 開く・修正する・再出力する

## 閲覧

ZIPを展開し、`START_HERE.html` または `workspace/plain-walk-v13/plain-walk-player.html` を開きます。現行プレイヤーの画像・コード・設定は埋め込み済みで、サーバーや通信は必要ありません。GIFでも確認できます。

プレイヤーでは5方向、斜め2方向を含む方向別表示、停止・コマ送り、関節表示、部品一覧、腕振り・肘・速度の調整、配置JSON保存を扱えます。OSの動きを抑える設定により停止状態で開く場合があります。

## 再出力の環境

Python 3、Pillow、NumPy、Node.js、`@napi-rs/canvas` が必要です。現行 `package.json` はcanvas 0.1.100を指定しています。依存ライブラリーや実行環境自体はZIPへ複製していません。

```bash
cd workspace/plain-walk-v13
python -m pip install -r requirements.txt
npm install
```

必要なら作業用にフォルダーを複製してから変更します。この統括ZIPの元データを上書きせず比較元として残せます。

## 位置・動きだけを変えた場合

`config.json` または `rig.js` を変更し、次を実行します。

```bash
node validate.cjs
node validate-heads.cjs
node render.cjs
python assemble.py
node validate-player.cjs
```

renderは40コマ、計算済みrig、埋め込みHTMLを書き直します。assembleはGIF、APNG、シート、パーツ一覧を書き直します。`config.json` だけを変えても、既に書き出されたHTMLやGIFへ自動では反映されません。

## 素材を元画像から再生成する場合

```bash
python rebuild.py
```

これは `extract_parts.py` で元アトラスから部位PNGとassets.jsonを作り直し、検証・描画・組み立てを行います。画像生成サービスへの呼び出しは不要です。必要な元絵は同梱済みです。

部位PNGやassets.jsonだけを直接編集すると、次のrebuildで上書きされます。恒久的な変更は、元絵とextract_parts.pyにも反映してください。斜めの頭pivotとcervical_socket、v8の首の開口の修正もextract_parts.pyに記録されています。

## 比較画像の更新

元のrebuildは `head-neck-comparison.png`、`head-turnaround.png`、`diagonal-8frames-check.png` の3枚を自動更新しません。これらは各版の確認時に作った画像です。このZIPには更新用の補助スクリプトを追加しました。

パッケージ直下で実行する例：

```bash
python scripts/refresh_reviews.py --current workspace/plain-walk-v13 --previous workspace/plain-walk-v12
```

新しい版を作ったら、引数を新しい版と比較元の版へ置き換えます。通常のPNG/GIFの書き出し後に実行してください。

## 引き継ぎでの確認

`scripts/verify_package.py` は、梱包時のSHA-256とサイズでファイルを照合します。ZIPの展開直後に実行できます。ファイルを編集した後に不一致となるのは通常の結果です。

```bash
python scripts/verify_package.py
```

旧版やルートの検証スクリプトは当時の作業状態も含めて保存しています。古い絶対パスや環境依存の参照が残るものがあります。通常の継続作業には現行plain-walk-v13のコードを使い、旧版は比較・原因確認のために参照してください。
