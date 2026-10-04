# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Where the work is

- The active project is **`newgame/`** (「監査官と魔法少女」). It is published from `main` by GitHub Pages at https://nobuoiwase.github.io/Game5/newgame/.
- **Read `newgame/README.md` first.** It holds:
  - the author's rules
  - the NG content list
  - the code map
  - one numbered section per round of work (append a new one each round)
  - the remaining tasks
- `game/` is the older pilot (v0.27). Do not touch it unless asked.
  - Its JS files wrap each other, and `game/index.html` has a strict load order.
  - Root `README.md` lists files other AIs must not edit.
  - Root `README.md` also says the character motion/appearance work is cancelled (`character-motion-v1/` etc.).
- `docs/` is sensitive reference material. Never copy it into the game or anything published.
  - Treat the read-only repos Game2 and Game4 the same way: read their JS for data and code only.

## Working rules from the author (summarised from `newgame/README.md`)

**How to work**
- Reply in Japanese.
- You are the programmer, not a director. Don't argue with the author's settings.
- Report only numbers you actually measured.

**What not to touch**
- Never modify the Game2 / Game4 repositories.
- Never disable TLS verification.

**Content: NG list**
- 産卵・出産、痛み・流血・殴打、獣姦、実在の虫、スカトロ・妊娠、搾乳、ゴブリン以外の人型種族.
- Exceptions:
  - 蟲 and ヒル are allowed.
  - Waldo, the cult (教団) and 淫魔 may be humanoid.
- Pink monster colours are intentional.

**Content: heroines**
- ひかり is an 18+ university student who wears a sailor uniform. Do not "fix" this.
- The second heroine is 白山 遙. Keep this spelling.
- 遙's text must be written for her. Never reuse ひかり's lines for 遙.

**Commits and PRs**
- Never put a model name in commits or PRs.
- Use the commit trailer and PR footer format given in `newgame/README.md` §0, with the current session's URL.
- Publish flow: push the branch → PR → merge to `main` → wait until the Pages copy matches (e.g. `curl` the published `newgame/index.html`).

## Commands (no build step; plain browser JS + Node for tools)

```bash
node newgame/tools/check.js                 # CI check (also run by .github/workflows/newgame-check.yml on PRs)
node newgame/tools/fingerprint.js 10 1      # deterministic hash of solo runs (changes whenever RNG consumption changes)
node newgame/tools/sim.js 30 7 [--dup|--show]   # N-day headless simulation + report-repetition stats
node newgame/tools/check/haruka.js 12 3 [--dup] [--list out.json]   # 遙 text: key coverage, leaks, ひかり words, duplicate sentences
node newgame/tools/check/pair.js            # two-heroine dive: rescue, both-down scene/night, both reports
node newgame/tools/check/stuck.js --seeds 1 --runs 1
```

`check.js` runs, in order:
1. `fingerprint.js`
2. a 10-day `sim.js`
3. `stuck.js`
4. `check/haruka.js`
5. `check/pair.js`

Run a single check by calling its file directly.

Browser test:
1. From the repo root, start `npx http-server -p 8766`.
2. Run `OUT=<dir> node newgame/tools/play.js`. It clicks office → request → dive → report → audit → next day, and saves screenshots plus page errors.
3. Playwright uses `/opt/pw-browsers/chromium`.

## Architecture (newgame/js)

**Loading and the global `G`**
- One global `G`, no modules. Files attach `G.Text`, `G.Game`, `G.Field`, `G.Report`, `G.Hero`, …
- **Load order is defined in `newgame/tools/files.js`.** `newgame/index.html` must have the same `<script>` order.
- Node tools load files in that order into a `vm` context.
- `ui.js` and `render.js` are DOM-only and are not in `files.js`.

**Day loop (`game.js`)**
1. `newSave`, then `morning` (requests).
2. `assign` (forge the request paper / swap destination), `prep`, `startDive`.
3. Floors: `makeFloor` → `G.Field.step` until `w.outcome` → `afterFloor`.
4. `finishDive` (rec: report / doc / monitor).
5. `audit`, then `rereport` / `reint`, then `treat`, then `endDay`.
6. `S.phase` drives `route()` in `ui.js`.

**Per-heroine save data**
- The fields in `PERSONAL` belong to the heroine who is "out".
- The other heroine's copy lives in `s.archive[id]`.
- `swapHero` exchanges the two copies.
- `pview(s, id)` is a Proxy that reads and writes the partner's personal data while sharing guild fields.
- `pairFlip` swaps the active heroine during a pair report (`s.rec` ↔ `s.duoRec`).

**Field (`js/field/*`)**
- A single-heroine simulation built around `w.run.h` / `w.run.save`.
- The modules share functions through `G.F`. Each module pushes a binder into `G.F.bind`, and `step.js` runs them.
- `step()` = `heroPre` + `updateHikari` + `worldPart` + `heroPost`.
- Keep the solo path's RNG order stable. `fingerprint.js` is the tripwire.
- **Two-heroine dives (`duo.js`)** re-use the single-heroine code:
  - `ctx(w,i)` swaps `w.run.h`, `w.run.save` and `G.Hero.cur` per turn.
  - Monsters target the heroine holding them, otherwise the nearest standing one.
  - Traps and projectiles get `dt` on the first standing heroine and `0` on the second.
  - `defeat()` → `duoDown` puts a heroine "out" and her partner rescues her. Both out = defeat with the pair scene and night.
  - Events carry `hero` when in duo. `finishDive` splits them per heroine; the partner's record goes to `s.duoRec` via `pview`.

**Text: two heroines with separate tables**
- ひかり's tables live in `text.js`, `report.js`, `diary.js`, `reint.js` (`R`), `ui.js` (`UI`). They are registered in `G.TextL`.
- 遙's tables live in `js/haruka/*.js` under the same names/keys in `G.TextH`.
- `G.Hero.T(name, base, key)` / `G.Hero.A(name, base)` return 遙's entry when `G.Hero.cur === "haruka"`. A missing key is logged to `G.Hero.leaks`, which `check/haruka.js` fails on.
- `G.Hero.keep()` inserts U+2060 into names so a 遙 line can name ひかり without being flagged.
- Pair-only text (both heroines named directly) is in `pair.js` and `pair_defeat.js` (`G.Pair`).

**Reports**
- `report.js` builds the oral report from event "units", with postures, lies and probes, plus the written doc and the crystal monitor log.
- `reint.js` is the re-interrogation / examination.

**Assets**
- `newgame/assets/`. Portraits: `assets/portrait/<hero>/<NN_mood>.png`.
