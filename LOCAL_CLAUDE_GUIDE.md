# ローカルの Claude への作業依頼 — ChatGPT で画像を作ってもらう

このファイルは、デスクトップアプリで動く Claude（あなた）に向けた手順書です。
あなたの役目は、**ブラウザの ChatGPT のチャット画面を操作して Game5 の画像素材を描かせ、できた PNG を検品してリポジトリに置くこと**です。発注係と検品係を兼ねます。

コードの修正・ゲームへの組み込み・最終の検収は、クラウドの Claude Code が行います。あなたはコードに触らないでください。

> **2026-09-25 更新（ユーザーの判断による変更）**
> - 描き手は **NovelAI（V5 Full）** にする。ChatGPT は見本の図をなぞった平たい絵になった。手順は下の「3a. NovelAI での手順」
> - **モンスターの方向性**: 濡れたツヤ・うっすら透ける血管・糸を引く粘液といった**肉々しい質感は全種共通**。「かわいく」は外した（牙・トゲ・血・傷はなし）
> - **色（2026-09-26 更新）**: 全部ピンクだと見分けにくいので、**ピンク〜肉色は「肉々しい種」「肌や粘膜に直接触れる種」だけ**（艶沼ナメクジ・吸着羽虫・灰冠の粘魔・灰冠の従者）。ほかは質感だけ肉々しく、色は下の「5. 作るもの」の指定色（見本カードも同じ色に更新済み）
> - 小物・UI・アイコンの配色は見本カードどおり（読みやすさ優先）
> - 唯一許される加工: **アルファ 2 以下の画素を 0 にする**（NovelAI の透過が外周に見えないノイズを残すため）。検品スクリプトも、アルファ 2 以下は透明として扱う
> - 大きいまま（1024px など）置いてよい。ゲーム用の軽い版は、クラウドの Claude Code が `tools/build_final_web.js` で作る

---

## 0. なぜこのやり方なのか

これまで ChatGPT にリポジトリを直接触らせてきましたが、次の事故が繰り返し起きました。

- `index.html` を書き換えてゲームを起動不能にした（2回）。日本語の文書を文字化けさせた
- 描いた画像を ChatGPT 自身のプログラムで縮小・減色・背景除去して保存した。その結果、点の粗いドット絵、8〜48色への減色、四隅に薄く残る背景、壊れた PNG（`leech.png` と `moth.png`）が届いた
- 「鏡面スライムを描き直した」として、**別の生き物（ナメクジ）**を置いた

ChatGPT の**画像生成そのものは上手**です（灰冠の粘魔・ナメクジ・胞子球・粘花・宝箱は良い出来）。そこで、ChatGPT には**チャットで描かせるだけ**にします。保存・確認・リポジトリへの配置はあなたが行います。

## 1. 準備

1. Game5 リポジトリ（`NobuoIwase/Game5`）を最新にする: `git pull origin main`
2. ブラウザで ChatGPT（chatgpt.com）を開く。**ログインはユーザーが済ませる**。あなたはパスワードを入力・保存しない
3. `python3` が使えることを確認する（検品スクリプトに使う。追加のインストールは不要）

## 2. 守ること

| してよいこと | してはいけないこと |
| --- | --- |
| ChatGPT のチャットで画像を生成させる | ChatGPT に GitHub やリポジトリを接続させる。コードや文書を書かせる |
| 生成された画像を**ダウンロードボタンで**保存する | スクリーンショット、プレビュー画像の右クリック保存（縮小されていることがある） |
| 保存した PNG を `game/assets/requested/final/` の下に置く | 画像を自分で加工する（縮小・拡大・減色・背景除去・切り抜き・色調補正）。**届いたままを置く**（例外: アルファ 2 以下を 0 にすることだけは可） |
| `final/index.json` に名前を足す。`NOTES_FROM_CHATGPT.md` に記録する | `game/*.js`、`index.html`、README、`asset-refs/`、`tools/` を変更する |
| 上記のファイルだけを commit して main に push する | それ以外のファイルを commit する。バージョン番号を変える |

ChatGPT が描いた画像のサイズが 1024×1024 などでも、**そのまま置く**（大きい分には問題ない）。

## 3. 1枚ごとの作業手順

**1枚の素材につき新しいチャットを1つ**使う（前の絵の要素が混ざるのを防ぐため）。

1. **添付する**（チャットの添付ボタンから、ファイルを2つ）
   - デザインの見本: `game/asset-refs/png/card_<見本名>.png`（形・配色・注意点が書いたカード）
   - 画風の見本: `game/assets/requested/final/monsters/flower.png`（採用済みの絵。この塗り方に合わせる）
2. **依頼文を貼る**: 下の「4. 依頼文の雛形」に、「5. 作るものの一覧」の個別の指示を足して送る
3. **出てきた絵を目で確認する**（最重要。4点すべて）
   - 見本カードと**同じ生き物・同じ物**か（名前ではなく絵を比べる。前回、スライムを頼んでナメクジが返ってきた）
   - 背景が透明か。チェック模様（市松模様）が絵として描き込まれていないか
   - ドット絵になっていないか（点がカクカクしていないか）
   - 文字・枠・地面の影・台座が入っていないか
4. だめなら、**同じチャットで**何が違うかを短く伝えて描き直させる（例:「背景を完全な透明にしてください。チェック模様は描かないでください」）。**3回やってもだめなら、その素材は飛ばして**、次の「6. 報告」に理由を書く
5. **ダウンロードボタンで保存**し、ファイル名を一覧の「置き場所」の名前に変えて置く（例 `game/assets/requested/final/monsters/moth.png`。既存のファイルは上書きしてよい）
6. **検品スクリプトを実行する**
   ```
   python3 tools/check_final.py game/assets/requested/final/monsters/moth.png
   ```
   `PASS` なら次へ。`FAIL` の場合、画像を直そうとせず、理由を ChatGPT に伝えて描き直させる（手順4に戻る）
   - 「減色されたパレットPNG」と出た場合は、保存の仕方が原因のことが多い。ダウンロードボタンから保存し直す
   - 「四隅が透明でない」と出た場合は、背景を透明にして描き直させる
7. `game/assets/requested/final/index.json` の該当する配列に、パスを足す（例 `"monsters/moth.png"`。すでにあれば不要）

### 背景がどうしても透明にならないとき

3回頼んでも背景が残る場合は、**真緑一色（#00FF00）の背景**で描かせる。ほかの色が混ざらない、影も落とさない背景にさせる。
保存先を `game/assets/requested/final/_green/<置き場所と同じパス>` にし、報告に「緑背景」と書く。背景はクラウドの Claude Code が抜く。この場合は検品スクリプトの透明チェックが FAIL になるが、それでよい。`index.json` には足さない。

## 3a. NovelAI での手順（2026-09-25 のローカル Claude の記録から）

- モデル V5 Full、モード「アニメ」、「透過背景」オン、ステップ 28、正確度 7、1枚ずつ
- i2i: 下絵は `game/asset-refs/png/<見本名>.png`（カードではなく絵だけのもの）。強度の目安は、モンスター 0.76、尖塔 0.62、粘液溜まり 0.72、ハート 0.5〜0.6、アイコン 0.7。ノイズ 0
- プロンプトは英語タグ。モンスターの共通部分:
  ```
  no humans, monster, <形と特徴>, {{translucent flesh-pink ... body}}, {{two round black eyes ...}},
  soft meaty folds and fleshy lumps under the skin, faint red-pink veins, glistening mucus membranes,
  sticky pink strings of goo, oozing pink goo pooling around the base, moist, fleshy, organic,
  slightly grotesque yet alluring, sensual atmosphere, warm pink inner glow, semi-realistic, painterly,
  intricate details, rich shading, many small specular highlights, dark fantasy bestiary illustration,
  full body, centered, the whole creature fits inside the frame with margin
  ```
- 除外要素の共通部分:
  ```
  text, watermark, signature, frame, border, pixel art, ground shadow, pedestal, fangs, teeth, spikes,
  thorns, blood, gore, wound, human, girl, cute chibi, cropped, out of frame, cut off, touching edges,
  lens flare, hanging from above, string from top, no eyes, tentacles
  ```
- 保存は NovelAI の「画像をダウンロード」ボタン → アルファ 2 以下を 0 にする → `python3 tools/check_final.py <ファイル>` で検品

## 4. 依頼文の雛形

各素材で、`【個別】` の部分だけを差し替えて送る。

```
ブラウザ用2Dダンジョンゲームの素材を1枚描いてください。

【添付1】デザインの見本カードです。左の絵の形・配色・向きに合わせてください。右側の説明文と色コードにも従ってください。
【添付2】同じゲームで採用済みの絵です。この塗り方（柔らかい手描きイラスト、はっきりした輪郭、2〜3段の陰影、左上から光）に合わせてください。

【個別】
（ここに、下の一覧の「個別の指示」を入れる）

【必須条件】
・背景は完全な透明（transparent background の PNG）。白・黒・グレーの背景や、透明を表すチェック模様を描き込まないでください
・ドット絵にしないでください
・1枚に1体（1個）だけ描く。周りに十分な余白を取り、はみ出さないでください
・文字、枠線、地面の影、台座は入れないでください
・柔らかく丸い、少しかわいい雰囲気にしてください。牙・刃・トゲ・血など怖い表現はなし
```

## 5. 作るもの（2026-09-26 版。これが最新。下の旧一覧より優先）

NovelAI で、**全モンスターを同じ画質・同じ画風にそろえる**。見本カード（`game/asset-refs/png/card_<見本名>.png`）と下絵（`game/asset-refs/png/<見本名>.png`）は、この色に合わせて描き直してある。

### 色の決め方
- ピンク〜肉色にしてよいのは、表の「色」欄がピンク系の4種だけ
- ほかは、住んでいる区画の床の色と被らない色にしてある（例: 緑の床の胞子球はからし色、薔薇色の床の粘花は象牙色＋深紅、薄紫の床の蜘蛛は炭色）
- 質感（濡れたツヤ、半透明、うっすら透ける血管、糸を引く粘液）は全種で使ってよい。粘液の色も体の色に合わせる（ピンクの粘液はピンクの種だけ）

### プロンプトの差し替え
「3a」の共通プロンプトのうち、色に関わる語（`flesh-pink`、`pink goo`、`warm pink inner glow` など）は、ピンク系の4種以外では**表の「色のタグ」に置き換える**。

### A. モンスター（`final/monsters/<名前>.png`）

| 名前 | 見本名 | 区画 | 色 | 色のタグ（例） | 作業 |
| --- | --- | --- | --- | --- | --- |
| slug 艶沼ナメクジ | monster_slug | 1 | ピンク〜桃紫 | translucent flesh-pink body, pink goo | 描き直し（旧 ChatGPT 版） |
| leech 吸着羽虫 | monster_leech | 2 | ピンク〜肉色 | （現状のまま） | 済（作らない） |
| bubble_shell 泡吹き貝 | monster_bubble_shell | 2 | 真珠色の殻＋珊瑚色の体 | pearly cream spiral shell, coral-orange soft body, clear bubbles | 描き直し（色変更） |
| water_wraith 水妖 | monster_water_wraith | 2 | 明るい水色＋白い泡の縁 | translucent bright aqua water body, white foam rim | **新規** |
| wisp 漂い霊 | monster_wisp | 2・6 | 青白い半透明 | translucent pale cyan-white membrane body, cold glow | **新規** |
| worm 絹輪ワーム | monster_worm | 3 | 象牙〜淡い肌色 | ivory-beige segmented body, white silk threads | 描き直し（旧 ChatGPT 版） |
| silk_spider 糸繰り蜘蛛 | monster_silk_spider | 3 | 炭色＋白い糸 | charcoal-gray fuzzy body, white silk | 描き直し（色変更） |
| creeping_hand 這い寄る手 | monster_creeping_hand | 3・5 | 青白い肌 | pale bluish-gray skin, short rounded nails | **新規** |
| orb ルマネ胞子球 | monster_orb | 4 | からし色 | mustard-yellow fleshy spore ball, amber glow | 描き直し（旧 ChatGPT 版） |
| lure_cap 誘い茸 | monster_lure_cap | 4・5 | 青緑に光る傘＋紫の襞 | glowing turquoise mushroom cap, wet violet gills | **新規** |
| stone_sentinel 石の番兵 | monster_stone_sentinel | 4・7 | 灰色の石＋ひびの奥の桃色の肉 | gray stone golem, glowing pink flesh inside the cracks, moss | **新規** |
| flower 粘花 | monster_flower | 5 | 象牙色の花弁、縁と奥が深紅 | thick ivory petals with deep crimson edges, amber nectar | 描き直し（旧 ChatGPT 版） |
| moth 夢鱗蛾 | monster_moth | 6 | 琥珀色 | amber-brown furry moth, cream eye spots | 描き直し（色変更） |
| mirror_slime 鏡面スライム | monster_mirror_slime | 6 | 銀＋水色の反射 | chrome-silver mirror slime, pale cyan reflections | 描き直し（色変更） |
| gazer 凝視の眼 | monster_gazer | 6・7 | 白目＋紫の瞳、ワイン色の膜の羽 | huge white eyeball, violet iris, wine-red membrane wings | **新規** |
| crown_attendant 灰冠の従者 | monster_crown_attendant | 7 | ピンク〜肉色＋灰色の冠 | （現状のまま） | 済（作らない） |
| gel 灰冠の粘魔（ボス） | monster_gel | 7 | 肉色の半透明＋灰色の石の冠、紫の核 | translucent flesh-pink giant slime, gray stone crown, violet core | 描き直し（旧 ChatGPT 版） |

新規の6種は Game4 の魔物（ゴースト、這い寄る手、覗き目玉／催眠ゲイザー、媚茸、水妖、石の番兵）をもとにした。ゲームのデータは入れてあり、今は見本の絵で出ている。

### B. 小物（`final/props/`）
| 名前 | 見本名 | 作業 |
| --- | --- | --- |
| chest 宝箱（閉／開の2コマ） | prop_chest | 描き直し（旧 ChatGPT 版）。**2コマは別々に1枚ずつ描いて** `chest_closed.png` と `chest_open.png` で置く（並べる作業はクラウド側でやる） |
| mimic 偽りの宝箱（閉／正体） | prop_mimic | 同上。`mimic_closed.png` と `mimic_open.png` |
| stairs 下り階段（封印／開放） | prop_stairs | 同上。`stairs_sealed.png` と `stairs_open.png` |

### C. 任意（余裕があれば）
- `nutera/heart_deep.png`（濃いピンク #d62c8c。今はゲーム側で代用中）
- 床 `floors/room1.png`〜`room7.png`（今の ChatGPT 版は質感の元として使えている。描き直すなら、真上から見た石畳、低コントラスト、64px の繰り返し模様にする）

## 5（旧）. 作るものの一覧（2026-09-24 版。済んだもの）

見本名は `game/asset-refs/png/card_<見本名>.png` の `<見本名>` の部分。置き場所はいずれも `game/assets/requested/final/` の下です。

### A. 描き直し（不採用・破損のもの）

| 置き場所 | 見本名 | 個別の指示 |
| --- | --- | --- |
| `monsters/mirror_slime.png` | monster_mirror_slime | 銀と水色の、鏡のようにつるつるしたドーム形のスライム。斜めの白い反射の帯が数本。丸い目が2つ。**ナメクジではない**（触角なし） |
| `monsters/bubble_shell.png` | monster_bubble_shell | 右を向いた桃色の**渦巻きの巻貝**。殻の口から小さな顔がのぞき、上に向かって透明な泡を3〜4個吹いている |
| `monsters/silk_spider.png` | monster_silk_spider | 丸くてふわふわした薄紫の蜘蛛。怖くない。太く短い脚が8本で先が丸い。大きな目2つと小さな目2つ。お尻から白い糸が1本 |
| `monsters/moth.png` | monster_moth | 正面を向いた茶紫の大きな蛾。上の羽に大きな丸い目玉模様が1つずつ。体はふわふわの毛。周りに光る鱗粉の粒 |
| `monsters/crown_attendant.png` | monster_crown_attendant | 小さな灰色の半透明スライム。頭に石の冠のかけら（小さなギザギザ3つ）。体の中に小さな紫の光。丸い目が2つ |
| `monsters/leech.png` | monster_leech | 今のファイルは壊れているので描き直す。青白く光る丸い体に、透ける羽が4枚の羽虫。顔の下に丸い吸盤。今の `leech.png` の絵柄を画風の見本として添付してもよい |

### B. まだ無いもの

| 置き場所 | 見本名 | 個別の指示 |
| --- | --- | --- |
| `props/tower.png` | prop_tower | 黒い石でできた細い尖塔が1本。中ほどに紫に光る眼が1つ。眼の周りに淡い紫の光。1コマだけでよい |
| `props/pool.png` | prop_pool | **真上から見た**円形の緑の粘液溜まり。縁は透明に溶けて消える。表面にツヤと泡がいくつか |
| `nutera/heart_pink.png` | nutera_hearts | ツヤのある明るい桃色（#ff4fae）のハートを1つ。上から下へのグラデーション、左上に白いツヤ、周りに柔らかいピンクの光 |
| `nutera/heart_deep.png` | nutera_hearts | 同じ形で、濃いピンク（#d62c8c） |
| `nutera/heart_pale.png` | nutera_hearts | 同じ形で、淡い桃色（#ffa8d8） |
| `nutera/heart_violet.png` | nutera_hearts | 同じ形で、薄紫（#a45cff） |
| `nutera/sigil.png` | nutera_sigil | 真上から見た魔法陣。三重の円と、外周に12本の刻み。中央に大きめのハート。線は薄紫〜ピンクで光り、中は塗らない |
| `nutera/estella_logo.png` | nutera_estella_logo | 「ESTELLA」という飾り文字（この素材だけは文字を入れる）。白から桃色へのグラデーション、濃い赤紫の縁取り、両端に小さなハート。横長 |
| `icons/snare.png` ほか8種 | icons_director | 下の表のとおり1つずつ別のチャットで描く。正方形。**小さく表示しても分かる**太い輪郭と単純な形 |

アイコン8種:

| 置き場所 | 描くもの |
| --- | --- |
| `icons/snare.png` | 地面に刺さった、ピンク色に光る細い影の杭 |
| `icons/fog.png` | 紫の煙が立ちのぼる、丸い壺 |
| `icons/lure.png` | 小さな金色の鐘 |
| `icons/ringbeam.png` | 光る薄紫の輪（二重丸） |
| `icons/pool.png` | 緑の粘液の水たまり |
| `icons/tower.png` | 紫の眼が付いた黒い尖塔 |
| `icons/mimic.png` | 継ぎ目から紫の粘液がにじむ宝箱 |
| `icons/summon.png` | 薄紫に光る星形の紋章 |

宝箱・偽りの宝箱・階段・床は採用済みなので**作らない**。灰冠の粘魔・ナメクジ・絹輪ワーム・胞子球・粘花も作らない。

## 6. 報告

作業の区切りごとに、次の2つを行う。

1. `game/assets/requested/NOTES_FROM_CHATGPT.md` の末尾に追記する（見出しは `## <日付>（ローカル Claude 経由）`）
   - 置いたファイルと、検品スクリプトの結果（PASS/FAIL）
   - 飛ばした素材とその理由（例:「3回とも背景が残った」「別の生き物になった」）
   - 緑背景で置いたもの
2. 置いたファイル、`index.json`、`NOTES_FROM_CHATGPT.md` だけを commit して、main に push する
   ```
   git add game/assets/requested/final game/assets/requested/NOTES_FROM_CHATGPT.md
   git commit -m "assets final: <何を置いたか>"
   git push origin main
   ```
   push が拒否された場合は、`assets/local-<日付>` というブランチに push して、ユーザーにそう伝える

最後にユーザーへ、何を置き、何を飛ばしたかを短く報告してください。クラウドの Claude Code がゲームへの組み込みと最終の検収を行います。
