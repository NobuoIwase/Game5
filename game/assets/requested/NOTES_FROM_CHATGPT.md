# ChatGPT からの連絡メモ

ChatGPT はここに追記する（日付・追加したファイル・意図）。コードやREADMEは変更しない。ルールはリポジトリ直下の `README.md` 冒頭を参照。

## 2026-09-24
- `final/monsters/` に生成画像ベースのモンスター11種を個別PNGで追加。
- `final/floors/room1.png` 〜 `room7.png` を追加。各256×128、64pxセルの4列×2段、床用の不透明PNG。
- `final/index.json` にモンスター11種と床7区画を登録。
- ゲームコード、`index.html`、README、`asset-refs/` は変更していない。
- 次の作業単位は props / icons / VFX / Nutera・Estella / allies。

## 2026-09-25（ローカル Claude 経由）

### 作り方の変更（ユーザーの判断）
- ChatGPT で鏡面スライムを1枚試したが、見本カードの図をなぞっただけの平たい絵になったため不採用。ユーザーの判断で **NovelAI（V5 Full）** に切り替えた。
- 手順: `asset-refs/png/monster_<名前>.png`（カードではなく絵だけのもの）を i2i の下絵にする（強度 0.76、ノイズ 0）。「透過背景」をオン。英語タグで形・配色を指定し、ゲームで使っている gel / slug / orb / flower の質感に寄せるタグ（semi-realistic, painterly, intricate details, many small specular highlights, dark fantasy bestiary illustration）を足した。
- ユーザーの指示で「かわいく」は外し、**概念的な艶っぽさ**（濡れたツヤ、糸を引く粘液、柔らかく透ける体、内側のぼんやりした光）を足した。牙・トゲ・血は引き続き除外。
- 出力は 1024×1024 のフルカラー RGBA。
- **加工は1つだけ（ユーザーが許可）**: NovelAI の背景透過が外周にアルファ 1〜2 の見えない画素を残し、検品が必ず FAIL になる。このため、アルファ 2 以下の画素だけを 0 にした。ほかの画素（色・アルファ 3 以上）は届いたまま。

### 置いたファイル（検品はすべて PASS）
| ファイル | 内容 |
| --- | --- |
| monsters/mirror_slime.png | 銀水色のドーム形スライム。斜めの白い反射帯、目2つ、触角なし。裾で糸を引く |
| monsters/bubble_shell.png | 右向きの桃色の渦巻き巻貝。泡を4つ吹く。目2つ |
| monsters/silk_spider.png | 正面向きのふわふわ薄紫の蜘蛛。先が丸い脚8本、大きな目2つ＋小さな目、お尻から糸 |
| monsters/moth.png | 正面向きの茶紫の蛾。上の羽に目玉模様、ふわふわの体、光る鱗粉 |
| monsters/crown_attendant.png | 小さな灰色のスライム。頭に石の冠のかけら（ギザギザ3つ）、体の中に紫の光、目2つ |
| monsters/leech.png | 青白く光る丸い体、透ける羽4枚、顔の下の丸い吸盤。壊れていた旧ファイルを置き換え |

- `index.json` の monsters に mirror_slime / bubble_shell / silk_spider / moth / crown_attendant を追加（leech は登録済み）。
- 飛ばしたもの・緑背景で置いたものはなし。
- 採用済みの gel / slug / orb / flower（ChatGPT 製）とは描き手が違う。並べて違和感がないかは、ゲーム内で確認してほしい。
