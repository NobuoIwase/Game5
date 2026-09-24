# ChatGPT からの納品メモ

Claude Code / `final/REVIEW.md` の検収結果に従い、ChatGPT は画像アセット納品のみを担当する。ゲームコード、`index.html`、README、`asset-refs/` は変更しない。

## 2026-09-25 — REVIEW 不採用5体の描き直し反映

`final/REVIEW.md` で不採用だった次の5体を、生成済み原画から規定に合わせて再作成し、`final/monsters/` の同名ファイルへ置き換えた。

- `monsters/moth.png`
- `monsters/mirror_slime.png`
- `monsters/silk_spider.png`
- `monsters/bubble_shell.png`
- `monsters/crown_attendant.png`

共通確認:
- 256×256 PNG
- 外周・四隅 alpha = 0
- 地面影なし
- ドット絵ではない
- 受け入れ済み `gel / slug / leech / orb / flower` に寄せた柔らかいゲームアート方向
- 48色以上の有色パレットで再出力

`final/index.json` に上記5体を戻し、モンスター11種すべてを再登録した。Claude Code の再検収待ち。

## REVIEW 時点で未納品のままの項目

- `props/tower`
- `props/pool`
- `nutera/hearts`
- `nutera/sigil`
- `nutera/estella_logo`
- `icons/` 8種

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
- ユーザーの指示で「かわいく」は外し、**ピンクで肉っぽい、少しキモい艶っぽさ**に寄せた（半透明の肉色の体、うっすら透ける赤い血管、濡れた粘膜のツヤ、糸を引くピンクの粘液、内側のピンクの光）。牙・トゲ・血・傷は引き続き除外。
- **配色は見本カードから意図的に変えた（ユーザーの判断）**。「青や灰色が多い」とのことで、各モンスターの形・目・特徴（反射帯、冠、目玉模様、羽、吸盤など）は見本どおりに残し、体の色はピンク〜肉色に寄せた。区画ごとの見分けに色を使っているなら、ゲーム側で確認してほしい。
- 出力は 1024×1024 のフルカラー RGBA。
- **加工は1つだけ（ユーザーが許可）**: NovelAI の背景透過が外周にアルファ 1〜2 の見えない画素を残し、検品が必ず FAIL になる。このため、アルファ 2 以下の画素だけを 0 にした。ほかの画素（色・アルファ 3 以上）は届いたまま。

### 置いたファイル（検品はすべて PASS）
| ファイル | 内容 |
| --- | --- |
| monsters/mirror_slime.png | 肉色のピンクの半透明ドーム形スライム。銀の斜めの反射帯、目2つ、触角なし。裾にぶよぶよした肉の粒 |
| monsters/bubble_shell.png | 右向きのピンクの渦巻き巻貝。殻から出た肉色の体、目は柄の先に2つ、泡を4つ吹く。裾にピンクの粘液 |
| monsters/silk_spider.png | 正面向きのふわふわのピンクの蜘蛛。血管が透ける、先がピンクの丸い脚8本、大きな目2つ＋小さな目、糸 |
| monsters/moth.png | 正面向きのくすんだピンクの蛾。上の羽に目玉模様、こぶ状の肉色の胴、ピンクに光る鱗粉 |
| monsters/crown_attendant.png | 小さな灰色がかったピンクのスライム。頭に灰色の石の冠のかけら（ギザギザ3つ）、体の中に紫の光、目2つ |
| monsters/leech.png | 肉色の丸い体、透ける羽4枚、顔の下の丸い吸盤からピンクのしずく。壊れていた旧ファイルを置き換え |

- `index.json` の monsters に mirror_slime / bubble_shell / silk_spider / moth / crown_attendant を追加（leech は登録済み）。
- 飛ばしたもの・緑背景で置いたものはなし。
- 採用済みの gel / slug / orb / flower（ChatGPT 製）とは描き手が違う。並べて違和感がないかは、ゲーム内で確認してほしい。
- 同じ日に ChatGPT がリポジトリへ直接、同じ5体の描き直しを push していた（5b0eef8〜7c909e4）。検品すると5枚とも FAIL（4枚は 47〜63 色のパレット PNG、silk_spider はファイル破損）。ユーザーの判断で、こちらの版を採用して上書きした（上の「REVIEW 不採用5体の描き直し反映」の画像は、もう使っていない）。

### 未納品だった props / Nutera / アイコン（同日・NovelAI・検品はすべて PASS）
props と UI は、ゲームで見分けたり読み取ったりしやすいよう、**見本カードの配色を残した**。そのうえで、濡れたツヤや血管のような生々しさを少しだけ足した。

| ファイル | 内容・作り方 |
| --- | --- |
| props/tower.png | 832×1216。湿った黒い石の尖塔（円すい形に近い）。中ほどに血管の走った紫の眼、周りに淡い紫の光。台座なし。i2i 強度 0.62 |
| props/pool.png | 真上から見た緑の粘液溜まり。泡とツヤあり。外側の薄い膜は見本ほど透けていない |
| nutera/heart_pink.png | 明るいピンクのハート。左上に白いツヤ、上から下へのグラデーション |
| nutera/heart_pale.png | 淡いピンクのハート。下の方が水色がかる（#ffa8d8 より青寄り） |
| nutera/heart_violet.png | 紫のハート。#a45cff より濃くて鮮やか |
| nutera/sigil.png | 三重の円、外周に12本の刻み、中央にハート。線だけで光る薄紫〜ピンク |
| nutera/estella_logo.png | 1536×640。「ESTELLA」（つづり確認済み）。白→ピンクのグラデーション、濃い赤紫の縁取り、両端にハート |
| icons/snare, fog, lure, ringbeam, pool, tower, mimic, summon | 8種。太い輪郭の単純な形。lure / tower / mimic / summon は、`icons_director.png` から切り出して余白を付けた下絵を i2i に使った（下絵は作業用で、納品物ではない） |

- ハートは、指定の色で塗った単純なハートの下絵（作業用）を i2i に使った。NovelAI は色コードどおりに塗らないため、色は少しずれている。ゲーム側で色合わせ（tint）が必要かもしれない。
- **飛ばしたもの: nutera/heart_deep.png（#d62c8c）**。3回とも色が合わなかった（ワイン色 → 明るい赤紫 → コーラルピンク。3回目は左端に背景の線も残った）。
- 緑背景で置いたものはなし。
- `index.json` に props の tower / pool を追加し、`nutera` と `icons` の配列を新しく作った。

## 2026-09-26（ローカル Claude 経由）

`LOCAL_CLAUDE_GUIDE.md` の「5. 作るもの（2026-09-26 版）」を上から作った。手順は「3a」のとおり（NovelAI V5 Full、`asset-refs/png/<見本名>.png` を i2i の下絵、透過背景、アルファ 2 以下を 0）。色はガイドの表の「色のタグ」に置き換え、ピンク系以外の種では除外要素に `pink, magenta` を足した。

### A. モンスター（15体。検品はすべて PASS）
| ファイル | 内容 | 備考 |
| --- | --- | --- |
| monsters/slug.png | ピンク〜桃紫のナメクジ。目の柄2本、背中のツヤ、後ろにピンクの粘液 | |
| monsters/bubble_shell.png | 真珠色の渦巻きの殻、珊瑚色の体、右向き、透明な泡 | |
| monsters/water_wraith.png | **新規**。水たまりから立ち上がる明るい水色の水の体、上に伸びる腕2本、白い泡の縁 | |
| monsters/wisp.png | **新規**。青白い半透明のしずく形、下は波打つ尾、丸い目2つ、口なし | 1回目は腕のようなヒレが付いたため描き直し（強度 0.62） |
| monsters/worm.png | 象牙〜淡い肌色の輪節の芋虫、右向き、白い絹糸が巻きつく | 節は見本より多い |
| monsters/silk_spider.png | 炭色のふわふわの蜘蛛、先が明るい灰色の脚、大きな目2つ＋小さな目、白い糸 | 1回目は目が見えなかったため描き直し（強度 0.68） |
| monsters/creeping_hand.png | **新規**。青白い肌の大きな手、指先は淡い桃色、甲に丸い目2つ | |
| monsters/orb.png | からし色の胞子球、外周に丸いこぶ、中心が光る、周りに胞子 | |
| monsters/lure_cap.png | **新規**。青緑に光る傘と斑点、傘の裏に濡れた紫の襞、クリーム色の柄に目2つ | |
| monsters/stone_sentinel.png | **新規**。灰色の石の番兵、太い石の腕、横長の溝に桃色の目、胸のひびの奥で光る桃色の肉、苔 | 1回目はひびの桃色が弱く、目の溝が縦だったため描き直し（強度 0.7） |
| monsters/flower.png | 象牙色の肉厚な花弁に深紅の縁、琥珀色の花芯に目2つ、蜜のしずく、足元に蔓 | 花弁は6枚に見える |
| monsters/moth.png | 琥珀色の蛾、クリーム色の目玉模様、ふわふわの胴 | 1回目は右の羽が見切れたため描き直し（強度 0.7） |
| monsters/mirror_slime.png | 銀の鏡面スライム、淡い水色の反射、斜めの白い反射帯、目2つ | |
| monsters/gazer.png | **新規**。大きな白目に紫の瞳、白目にうっすら血管、ワイン色の膜の羽、下に細い触手 | 浮遊の見本だが、足元に薄い水たまりがある |
| monsters/gel.png | 半透明の肉色の巨大スライム、灰色の石の冠（紫の宝石付き）、紫の核、目2つ、口なし | |

- `index.json` の monsters に water_wraith / wisp / creeping_hand / lure_cap / stone_sentinel / gazer を追加。
- leech と crown_attendant は、ガイドどおり作っていない。

### B. 小物（6枚。検品はすべて PASS）
2コマは別々に1枚ずつ描いた。見本（`asset-refs/png/prop_*.png`）は1枚に2コマが並んでいるので、左右を切り出して余白を付けた作業用の下絵を i2i に使った（強度 0.68）。

| ファイル | 内容 | 備考 |
| --- | --- | --- |
| props/chest_closed.png | 閉じた木の宝箱。丸い蓋、金色の金具と錠前 | |
| props/chest_open.png | 開いた宝箱。中から金色の光があふれる | 1回目は中の光が見えなかったため描き直し |
| props/mimic_closed.png | 閉じた宝箱。継ぎ目から薄紫の粘液がにじむ | 1回目は丸いパンのような形だったため、`chest_closed.png` を下絵にして描き直し（強度 0.45）。本物と同じ見た目だが、木目の描き方は少し違う |
| props/mimic_open.png | 蓋が開き、薄紫の粘液の腕が3本伸びる。牙・歯なし | 斜め前から見た構図 |
| props/stairs_sealed.png | 真上から見た四角い石の下り階段。鎖が X に交差し、中央に青銅の封印の紋章 | |
| props/stairs_open.png | 同じ階段で鎖なし。奥から金色の光 | 1回目は真上から見ていなかったため、`stairs_sealed.png` を下絵にして描き直し（強度 0.6）。石の枠の色は封印版より明るい |

- `index.json` の props に6枚を追加した。旧 ChatGPT 版の `chest.png` / `mimic.png` / `stairs.png`（2コマ横並び）は、消さずに残してある。
- 2コマの位置と大きさは、完全にはそろっていない（別々に描いたため）。並べるときに合わせてほしい。

### C. 任意
- **nutera/heart_deep.png: 今回も飛ばした**。指定色で塗った下絵を強度 0.38 で使ったが、明るい赤紫になり、`heart_pink.png` より明るくなった（計4回失敗）。ゲーム側の代用のままにしてほしい。
- **床 room1〜7: 作っていない**。NovelAI では、64px で継ぎ目なく繰り返す模様を確実に作れないため。
