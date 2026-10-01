# Grok に頼む絵の作業（手元の Claude が Grok を操作する）

手元の Claude Code が、ブラウザで Grok（grok.com の画像生成）を操作して絵を作り、ゲームの素材に整えて PR にするための指示書。
Grok に貼る英語のプロンプトは `grok_prompts/` に、手元の Claude に貼る指示は `grok_prompts/00_local_claude.txt` にある。

| 課題 | 中身 | 枚数 | Grok に貼るもの |
|---|---|---|---|
| A | 色違いで代用している魔物11種の専用の絵 | 11枚 | `grok_prompts/A_monsters.txt` |
| B | 罠部屋の床と飾り（触手以外の7種） | 床8マス＋飾り4つ ×7種 | `grok_prompts/B_rooms.txt` |

A と B は別の PR にする（ブランチ `grok/monster-art`、`grok/room-skins`）。どちらも main から切る。

---

## 共通の約束

- 最初に `newgame/README.md` の「作業の約束」と NG リストを読む。NG：産卵・出産、痛み・流血・殴打、獣姦、実在の虫、スカトロ・妊娠、搾乳、ゴブリン以外の人型種族（淫魔・小淫魔・ワルドー・教団は例外）、幽霊を増やさない。
- 魔物の配色がピンク寄りなのは意図どおり。直さない。
- 幼く見える描き方をしない。小淫魔も「小柄な大人」として描かせる（プロンプトの言い回しを変える時もここは崩さない）。
- `docs/` の中身は参照するだけで、プロンプトにも絵にも写さない。Game2・Game4 のリポジトリには触らない。
- ゲームの文章（台詞・場面・報告）は書き換えない。変えるのは絵と、絵を指す設定（`data.js` の `art`・`tint`、`render.js` の `FIG`）だけ。
- Grok の出力そのもの（元の大きな画像）はリポジトリに入れない。リポジトリの外（例：`~/grok_raw/<課題>/`）に保存し、整えた素材だけをコミットする。
- 確認は実際に実行して、出た出力をそのまま PR に貼る。実行していないものを「確認済み」と書かない。
- 終わったら PR を作り、マージはしない（作者が見てから入れる）。
- コミットや PR にモデル名を書かない。

## Grok の操作

1. grok.com を開き、画像生成（Imagine）を使う。ログインや年齢確認など、本人の操作が要る画面が出たら止めて、ユーザーに頼む。
2. プロンプトは `grok_prompts/` のブロックを **1つずつそのまま** 貼る（ブロックの区切りは `=====`）。共通の前置き（STYLE）が付いているので、前置きごと貼る。
3. 縦横比は正方形（1:1）を選ぶ。何枚か出たら、下の「選ぶ基準」で1枚選ぶ。合うものが無ければ、同じプロンプトでもう一度。3回やってだめなら、プロンプトの言い回しを少し変える（変えた文は PR に書く）。
4. 選んだ1枚を、できるだけ大きいまま PNG で保存する（`~/grok_raw/A/kuchizuke_1.png` のように、魔物の id と通し番号で）。
5. Grok が断った・ぼかした時は、言い回しを穏やかにする（衣装を増やす、ポーズを落ち着かせる）。断られた内容を押し通そうとしない。どうしても出なければ、その1種は飛ばして PR に書く。
6. ブラウザを操作できない時は、ユーザーにプロンプトを渡して生成と保存を頼み、保存先を教えてもらう。

### 選ぶ基準（全部満たすもの）
- 背景が一色のクロマキー（緑 #00FF00。A の魔物と B の飾り。B の床は背景なしの一面の床）。影や地面を描き込んでいない。本体に緑が入っていない（入っていると穴が開く）。
- 本体が1体だけ、全身が画面に収まっている（はみ出していない）。文字・枠・署名・透かしが無い。
- 既存の絵と並べて浮かない（下の「見本」）。
- NG に当たらない。実在の虫に見えない。幼く見えない。

## 整える道具：`tools/grok_fit.py`

Python 3 と Pillow（`pip install pillow`）で動く。リポジトリ直下から：

```
python3 newgame/tools/grok_fit.py sprite <元の画像> newgame/assets/monsters/<id>.png --pixel 2   # 魔物：背景を抜いて 256×256 の中央下寄せ。--pixel 2 でドット絵に寄せる
python3 newgame/tools/grok_fit.py deco   <元の画像> <作業用>/deco_1.png --pixel 2               # 部屋の飾り1つ：64×64 の中央下寄せ
python3 newgame/tools/grok_fit.py tile   <元の画像> <作業用>/tile_0.png --pixel 2               # 床1マス：64×64（32px 相当のドット絵に）
python3 newgame/tools/grok_fit.py sheet  newgame/assets/env/room_slime.png tile_0.png ... tile_7.png   # 床8マスを 256×128 に
python3 newgame/tools/grok_fit.py check  <絵>...                                                # 大きさ・透明・本体の範囲
```

背景は四隅の色をクロマキーとして抜き（本体の隙間に残った背景色も抜く）、縁の色かぶりも取る。
本体に背景と同じ色が入っていると穴が開くので、その時は背景色を変えて作り直す。抜けが甘い・削れすぎる時は `--tol`（既定 48）を上下させる。

## 見本（既存の絵）

- 魔物：`assets/monsters/inma.png`・`imp.png`（Game4 のドット絵。等身の低いゲームの立ち絵、暗い縁取り）と、`slug.png`・`slime.png`・`nikubana.png`（平たく塗ったやわらかい絵）。新しい絵は **inma.png・imp.png のドット絵の側に寄せる**。
- 一覧で見比べる：`npx http-server -p 8766` を起動して `http://localhost:8766/newgame/assets/index.html`。
- 部屋：`assets/env/room_*.png`（床）と `room_*_deco.png`（飾り）。一覧の「部屋」の欄に、入る前・入った後・満ちた時の見本が出る。

---

## 課題A：魔物11種の専用の絵

今は既存の絵の色違い（`data.js` の `art` と `tint`）で代用している。

| id | 名前 | 今の代用 | 背景 | 大きさの扱い |
|---|---|---|---|---|
| kuchizuke | 口づけの淫魔 | inma.png | 緑 | 人の大きさ（FIG にある：1.8） |
| hitomi | 見つめる淫魔 | inma.png | 緑 | 人の大きさ（FIG に足す：1.8） |
| utaimp | 歌う小淫魔 | imp.png | 緑 | 人の大きさ（FIG に足す：1.45） |
| tenazuke | 手懐ける小淫魔 | azakeri.svg | 緑 | 人の大きさ（FIG に足す：1.45） |
| miwakubana | 魅惑の花 | nikubana.png | 緑 | そのまま |
| sasayaki | 囁きスライム | slime.png | 緑 | そのまま |
| namekuji | ナメクジ | slug.png | 緑 | そのまま |
| namequeen | ナメクジ女王 | slug.png | 緑 | そのまま |
| firstslug | はじめの夜の主 | slug.png | 緑 | そのまま |
| mitsusui | 蜜吸い虫 | haimushi.svg | 緑 | そのまま |
| bishin | 媚芯茸 | sekitake.png | 緑 | そのまま |

手順：
1. `A_monsters.txt` のブロックで1種ずつ作り、`grok_fit.py sprite ... --pixel 2` で `assets/monsters/<id>.png` にする。
2. `data.js` の該当の魔物の `art` を `"<id>.png"` にし、`tint` を消す（ほかの値は触らない）。
3. 人の大きさの4種：`grok_fit.py check` で出る本体の範囲 `(x0, y0, x1, y1)` から、`render.js` の `FIG` に `<id>: [身長, y0, y1]` を書く（既存の `kuchizuke` は値を新しい絵に合わせて直す）。
4. 一覧（assets/index.html）と、実際の潜行画面で大きさを見る。人の大きさの4種は、ルミナと並んだ時に淫魔はほぼ同じ、小淫魔は少し小さい。

合格：
- `node newgame/tools/fingerprint.js 40 1` と `40 2` の1行目が作業前と同じ（絵と表示だけの変更なので）。
- `OUT=<保存先> node newgame/tools/play.js` が `errors []`（幅 390 と 1280 の両方。`W=1280 H=800`）。
- 一覧のスクリーンショット（11種が見える範囲）と、ルミナと並んだ潜行画面のスクリーンショットを PR に貼る。
- 使ったプロンプトと、言い回しを変えた所を PR に書く。

## 課題B：罠部屋の床と飾り（7種）

対象：`slime`（粘体）・`flesh`（肉）・`worm`（蟲の巣穴）・`mirror`（鏡）・`cult`（教団）・`lab`（研究所）・`boudoir`（閨）。触手（`tentacle`）は手続きで描いているので触らない。

素材の形（`render.js` の `roomTile`・`roomDecor` が読む）：
- 床 `assets/env/room_<種>.png`：256×128。64×64 のマスが横4×縦2。
  各行の左3マス（列0〜2）がふつうの床で、ランダムに並ぶ。右端（列3）は 5% だけ出る珍しいマス（小さな見どころ）。
  **どのマスとどのマスが隣り合っても継ぎ目が目立たない**こと（明るさと色をそろえ、大きな模様を置かない）。上に 28% の暗い膜と部屋の色の膜が重なる。
- 飾り `assets/env/room_<種>_deco.png`：256×64。64×64 が4つ。透明の背景で、**下端の中央が根元**。
  0番：壁から生えるもの（壁の向きに合わせて回して描かれる）。1〜3番：床に散らばる小物（ゆらゆら揺れる）。

手順：
1. `B_rooms.txt` のブロックで、種ごとに「床」「珍しい床」「飾り0〜3」を作る。床は1回の生成で出る何枚かを、ふつうの床6マスに使ってよい。
2. 床：`grok_fit.py tile` で 64×64 を8枚（列0〜2×2行＝6枚、列3×2行＝珍しいマス2枚）作り、`sheet` で `room_<種>.png` にする。並べる順は 左上から 列0,1,2,3（1行目）、列0,1,2,3（2行目）。
3. 飾り：`grok_fit.py deco` で4つ作り、`sheet` で `room_<種>_deco.png` にする（0,1,2,3 の順）。
4. 元の素材は上書きする前に見比べ、明らかに悪くなる種は差し替えない（PR に「見送った」と書く）。

合格：
- `node newgame/tools/rooms.js` が通る。
- fingerprint が作業前と同じ。play.js が `errors []`。
- 一覧の「部屋」の欄（7種×入る前・入った後・満ちた時）の、作業前と作業後のスクリーンショットを PR に並べて貼る。

---

## 作業ごとのコマンド（リポジトリ直下）

```
node newgame/tools/fingerprint.js 40 1     # 作業前に控えて、作業後と比べる
node newgame/tools/fingerprint.js 40 2
node newgame/tools/check.js                # 最後の行 check PASS
npx http-server -p 8766 -s -c-1 . &        # 別に起動しておく
OUT=/tmp/shots node newgame/tools/play.js
OUT=/tmp/shots W=1280 H=800 node newgame/tools/play.js
```

play.js は playwright と Chromium の場所が Claude のクラウド環境向けになっている。手元で動かない時は、環境変数 `PW`（playwright の場所）と `CHROMIUM`（Chromium の実行ファイル。空文字なら playwright 同梱のもの）を差し替える。
