// ==UserScript==
// @name         Game5 NAI Batch（スマホで連続生成）
// @namespace    game5-nai-batch
// @version      3.0.0
// @description  NAI Batch Director をもとに、Game5 のモーションの元絵（603枚）を NovelAI で連続生成する。下絵の img2img・精密参照・まとめて ZIP・GitHub へ送る。
// @match        https://novelai.net/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://nobuoiwase.github.io/Game5/character-motion-v1/nai/game5-nai-batch.user.js
// @downloadURL  https://nobuoiwase.github.io/Game5/character-motion-v1/nai/game5-nai-batch.user.js
// ==/UserScript==

/*
  もとは「NAI Batch Director 2.2.0」（ユーザー作）。キルータン量産（前のゲームのキャラ58人）を外し、
  Game5 のモーションの元絵を作る部分（🎬）を入れた。連続生成・ギャラリー・ZIP はもとのまま。
  使い方:
  1. novelai.net にログインした状態でページを開き、右下の「⚡」を押す
  2. 「🎬 Game5 モーションの元絵」を開く → キャラクターを選ぶ → 参照画像を入れる
  3. 「言葉」に ChatGPT の答え（JSON）を貼って取り込む（あなたの言葉もここに書く。このブラウザにだけ保存）
  4. 「▶ まだのコマを生成」。できた絵は下の「🖼 生成結果」に並ぶ
  5. 「⬆ GitHub へ送る」で、縮小した絵をリポジトリのブランチに送る（トークンが要る）
  ※ 生成には Anlas を消費します。精密参照は1枚ごとに参照画像1枚につき 5 Anlas かかります。
*/

(function () {
  'use strict';
  if (window.__game5NaiBatch) return;
  window.__game5NaiBatch = true;

  const LS_KEY = 'game5NaiBatch.v1';
  const API = 'https://image.novelai.net/ai/generate-image';

  /* ---------------- state ---------------- */
  const defaultState = () => ({
    projects: [newProject('プロジェクト1')],
    cur: 0,
    settings: {
      model: 'nai-diffusion-4-5-full',
      width: 1024, height: 1024,
      steps: 28, scale: 5,
      sampler: 'k_euler_ancestral',
      delay: 3,
      token: '',
      autoDL: false,
      addQuality: true,   // 品質タグを自動付与
      ucPreset: 'heavy',  // none | light | heavy
      seed: '',           // 空=毎回ランダム / 数値=固定
      cfgRescale: 0,      // Prompt Guidance Rescale (0〜1)
      noiseSchedule: 'karras',
      onError: 'skip',    // stop | skip（エラー時に次の枚へ進む）
    },
  });

  // モデル別 品質タグ（NovelAI Web UI「Add Quality Tags」の公式定義。プロンプト末尾に付与）
  const QUALITY = {
    'nai-diffusion-4-5-full': 'location, very aesthetic, masterpiece, no text',
    'nai-diffusion-4-5-curated': 'location, masterpiece, no text, -0.8::feet::, rating:general',
    'nai-diffusion-4-full': 'no text, best quality, very aesthetic, absurdres',
    'nai-diffusion-4-curated-preview': 'rating:general, amazing quality, very aesthetic, absurdres',
    'nai-diffusion-3': 'best quality, amazing quality, very aesthetic, absurdres',
  };
  // 除外プリセット（Undesired Content。公式のモデル別定義）
  const UC = {
    'nai-diffusion-4-5-full': {
      heavy: 'lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page',
      light: 'lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page',
    },
    'nai-diffusion-4-5-curated': {
      heavy: 'blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page',
      light: 'blurry, lowres, upscaled, artistic error, scan artifacts, jpeg artifacts, logo, too many watermarks, negative space, blank page',
    },
    'nai-diffusion-4-full': {
      heavy: 'blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks',
      light: 'blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing',
    },
    'nai-diffusion-4-curated-preview': {
      heavy: 'blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts',
      light: 'blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, logo, dated, signature',
    },
    'nai-diffusion-3': {
      heavy: 'lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]',
      light: 'lowres, jpeg artifacts, worst quality, watermark, blurry, very displeasing',
    },
  };
  // 数値ガード：空欄・0・NaNなら既定値に戻し、範囲内に収める
  const num = (v, d, min, max) => {
    v = Number(v);
    if (!isFinite(v) || v <= 0) v = d;
    return Math.min(max, Math.max(min, v));
  };
  const joinTag = (a, b) => (a && b) ? (a.replace(/,\s*$/, '') + ', ' + b) : (a || b || '');
  function newProject(name) {
    return { name, negative: '', tabs: [newTab()], curTab: 0 };
  }
  // キャラ: {p:プロンプト, n:ネガティブ, pos:{x,y}|null(自動)}
  const normChar = c => (typeof c === 'string')
    ? { p: c, n: '', pos: null }
    : { p: c.p || '', n: c.n || '', pos: (c.pos && isFinite(c.pos.x)) ? { x: c.pos.x, y: c.pos.y } : null };
  function newTab(copyFrom) {
    if (copyFrom) return { base: copyFrom.base, chars: copyFrom.chars.map(c => normChar(normChar(c))) };
    return { base: '', chars: [] };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(LS_KEY)) || defaultState(); }
  catch (e) { S = defaultState(); }
  if (!S.projects || !S.projects.length) S = defaultState();
  // 旧バージョンの保存データに新設定項目をマージ（既存の入力内容はそのまま維持）
  S.settings = Object.assign({}, defaultState().settings, S.settings || {});
  S.projects.forEach(p => (p.tabs || []).forEach(t => { t.chars = (t.chars || []).map(normChar); }));
  const save = () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
    scheduleSnapshot();
  };

  /* ---------------- 履歴（戻る/進む） ---------------- */
  const hist = { stack: [], idx: -1, max: 80, lock: false, timer: null };
  function takeSnapshot() {
    if (hist.lock) return;
    const snap = JSON.stringify(S);
    if (hist.stack[hist.idx] === snap) return;
    hist.stack.splice(hist.idx + 1);
    hist.stack.push(snap);
    if (hist.stack.length > hist.max) hist.stack.shift();
    hist.idx = hist.stack.length - 1;
    updHistBtns();
  }
  function scheduleSnapshot() {
    if (hist.lock) return;
    clearTimeout(hist.timer);
    hist.timer = setTimeout(takeSnapshot, 800);
  }
  function applyHist(dir) {
    clearTimeout(hist.timer);
    takeSnapshot();
    const ni = hist.idx + dir;
    if (ni < 0 || ni >= hist.stack.length) return;
    hist.idx = ni;
    hist.lock = true;
    try {
      S = JSON.parse(hist.stack[ni]);
      S.settings = Object.assign({}, defaultState().settings, S.settings || {});
      S.projects.forEach(p => (p.tabs || []).forEach(t => { t.chars = (t.chars || []).map(normChar); }));
      localStorage.setItem(LS_KEY, JSON.stringify(S));
      renderAll();
      setStatus(dir < 0 ? '↶ 元に戻しました。' : '↷ やり直しました。');
    } finally { hist.lock = false; }
    updHistBtns();
  }
  function updHistBtns() {
    const u = root && root.querySelector('#nbd-undo'), r = root && root.querySelector('#nbd-redo');
    if (!u) return;
    u.disabled = hist.idx <= 0;
    r.disabled = hist.idx >= hist.stack.length - 1;
  }

  const proj = () => S.projects[Math.min(S.cur, S.projects.length - 1)];
  const tab = () => { const p = proj(); return p.tabs[Math.min(p.curTab, p.tabs.length - 1)]; };

  /* ---------------- gallery ---------------- */
  const gallery = []; // {url, name, seed, tabNo, id}
  let running = false, stopFlag = false;

  /* ---- ギャラリー永続化（IndexedDB。ページを閉じても残る） ---- */
  const GAL_MAX = 900; // Game5 は 603 枚
  function idbOpen() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('g5Gallery', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('imgs', { keyPath: 'id', autoIncrement: true });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbAdd(rec) {
    const db = await idbOpen();
    let key = null;
    await new Promise((res, rej) => {
      const tx = db.transaction('imgs', 'readwrite');
      const rq = tx.objectStore('imgs').add(rec);
      rq.onsuccess = () => { key = rq.result; };
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    await new Promise((res) => {
      const tx = db.transaction('imgs', 'readwrite');
      const st = tx.objectStore('imgs');
      const cnt = st.count();
      cnt.onsuccess = () => {
        let over = cnt.result - GAL_MAX;
        if (over <= 0) return;
        const cur = st.openCursor();
        cur.onsuccess = () => {
          const c = cur.result;
          if (c && over > 0) { c.delete(); over--; c.continue(); }
        };
      };
      tx.oncomplete = res; tx.onerror = res;
    });
    return key;
  }
  async function idbDel(id) {
    if (id == null) return;
    const db = await idbOpen();
    return new Promise((res) => {
      const tx = db.transaction('imgs', 'readwrite');
      tx.objectStore('imgs').delete(id);
      tx.oncomplete = res; tx.onerror = res;
    });
  }
  async function idbAll() {
    const db = await idbOpen();
    return new Promise((res, rej) => {
      const rq = db.transaction('imgs').objectStore('imgs').getAll();
      rq.onsuccess = () => res(rq.result || []);
      rq.onerror = () => rej(rq.error);
    });
  }
  async function idbClear() {
    const db = await idbOpen();
    return new Promise((res) => {
      const tx = db.transaction('imgs', 'readwrite');
      tx.objectStore('imgs').clear();
      tx.oncomplete = res; tx.onerror = res;
    });
  }
  async function restoreGallery() {
    try {
      const recs = await idbAll();
      for (const r of recs) gallery.push({ url: URL.createObjectURL(r.blob), name: r.name, seed: r.seed, tabNo: r.tabNo, id: r.id });
      if (recs.length) { renderGallery(); setStatus(`🖼 前回までの画像 ${recs.length}枚 を復元しました。`); }
    } catch (e) {}
  }
  // 同じ名前の古い絵は置き換える（同じコマを作り直したとき）
  function galAdd(u8, name, seed, tabNo) {
    const old = gallery.findIndex(g => g.name === name);
    if (old >= 0) galDelete(old);
    const blob = new Blob([u8], { type: 'image/png' });
    const entry = { url: URL.createObjectURL(blob), name, seed, tabNo, id: null };
    gallery.push(entry);
    idbAdd({ blob, name, seed, tabNo, ts: Date.now() }).then(id => { entry.id = id; }).catch(() => {});
    if (S.settings.autoDL) {
      const a = document.createElement('a');
      a.href = entry.url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
    }
    return entry;
  }

  /* ---------------- token ---------------- */
  function detectToken() {
    try {
      for (const k of Object.keys(localStorage)) {
        const v = localStorage.getItem(k);
        if (!v || v.length < 60) continue;
        try {
          const j = JSON.parse(v);
          if (j && typeof j.auth_token === 'string' && j.auth_token.length > 60) return j.auth_token;
          if (j && j.session && typeof j.session.auth_token === 'string') return j.session.auth_token;
        } catch (e) {
          if (/^(pst-|ey[A-Za-z0-9_-]{20,}\.)/.test(v)) return v.trim();
        }
      }
    } catch (e) {}
    return null;
  }
  function getToken() {
    if (S.settings.token && S.settings.token.trim()) return S.settings.token.trim();
    return detectToken();
  }

  /* ---------------- payload ---------------- */
  function buildPayload(t, p, s) {
    const chars = t.chars.map(normChar).filter(c => c.p.trim());
    const useCoords = chars.some(c => c.pos);
    const centerOf = c => c.pos ? { x: c.pos.x, y: c.pos.y } : { x: 0.5, y: 0.5 };
    const isV4 = s.model.indexOf('nai-diffusion-4') === 0;

    let input = (t.base || '').trim();
    if (s.addQuality !== false) input = joinTag(input, QUALITY[s.model] || '');

    const ucText = (s.ucPreset && s.ucPreset !== 'none')
      ? ((UC[s.model] || {})[s.ucPreset] || '') : '';
    const negative = joinTag(ucText, (p.negative || '').trim());

    const width = num(s.width, 1024, 64, 1856);
    const height = num(s.height, 1024, 64, 1856);
    const steps = num(s.steps, 28, 1, 50);
    const scale = num(s.scale, 5, 0.1, 10);

    const params = {
      params_version: 3,
      width, height,
      scale, sampler: s.sampler, steps,
      n_samples: 1,
      ucPreset: { heavy: 0, light: 1, none: 3 }[s.ucPreset] ?? 0,
      qualityToggle: s.addQuality !== false,
      dynamic_thresholding: false, controlnet_strength: 1, legacy: false,
      add_original_image: true,
      cfg_rescale: Math.min(1, Math.max(0, Number(s.cfgRescale) || 0)),
      noise_schedule: ['karras', 'native', 'exponential', 'polyexponential'].includes(s.noiseSchedule) ? s.noiseSchedule : 'karras',
      legacy_v3_extend: false,
      seed: /^\d+$/.test(String(s.seed || '').trim())
        ? Math.min(4294967295, parseInt(String(s.seed).trim(), 10))
        : Math.floor(Math.random() * 4294967295),
      negative_prompt: negative,
    };
    if (isV4) {
      params.autoSmea = false;
      params.use_coords = useCoords;
      if (s.sampler === 'k_euler_ancestral') {
        params.deliberate_euler_ancestral_bug = false;
        params.prefer_brownian = true;
      }
      params.characterPrompts = chars.map(c => ({ prompt: c.p.trim(), uc: (c.n || '').trim(), center: centerOf(c), enabled: true }));
      params.v4_prompt = {
        caption: { base_caption: input, char_captions: chars.map(c => ({ char_caption: c.p.trim(), centers: [centerOf(c)] })) },
        use_coords: useCoords, use_order: true,
      };
      params.v4_negative_prompt = {
        caption: { base_caption: negative, char_captions: chars.map(c => ({ char_caption: (c.n || '').trim(), centers: [centerOf(c)] })) },
        legacy_uc: false,
      };
    } else {
      params.sm = false; params.sm_dyn = false;
      if (chars.length) input += (input ? ', ' : '') + chars.map(c => c.p.trim()).join(', ');
    }
    const pl = { input, model: s.model, action: 'generate', parameters: params };
    pl.__fixedSeed = /^\d+$/.test(String(s.seed || '').trim());
    return pl;
  }

  function payloadSummary(pl) {
    const pr = pl.parameters;
    const cp = pr.characterPrompts || [];
    const chInfo = cp.length
      ? cp.map((c, i) => `  ${i + 1}: ${c.prompt.slice(0, 24)}… ${pr.use_coords ? `(x${c.center.x},y${c.center.y})` : '(位置:自動)'}${c.uc ? ' [ネガ有]' : ''}`).join('\n')
      : '  なし';
    const opusFree = (pr.width * pr.height <= 1048576 && pr.steps <= 28) ? '✅ Opus無料枠内（精密参照の分は別）' : '⚠ Anlas消費（サイズorSteps超過）';
    const refs = (pr.director_reference_images || []).length;
    return `モデル: ${pl.model} / ${pl.action}\nサイズ: ${pr.width}×${pr.height} / Steps: ${pr.steps} / Guidance: ${pr.scale}\nシード: ${pl.__fixedSeed ? pr.seed + '（固定）' : 'ランダム'}\n${opusFree}\n下絵(img2img): ${pr.image ? '強さ ' + pr.strength : 'なし'} / 精密参照: ${refs}枚${refs ? '（+' + refs * 5 + ' Anlas）' : ''}\nキャラ(${cp.length}人):\n${chInfo}\nプロンプト: ${pl.input.slice(0, 400)}${pl.input.length > 400 ? '…' : ''}\nネガティブ先頭: ${(pr.negative_prompt || '(空)').slice(0, 70)}…`;
  }

  /* ---------------- zip ---------------- */
  async function unzip(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf), files = [];
    let eocd = -1;
    const min = Math.max(0, buf.byteLength - 22 - 65536);
    for (let i = buf.byteLength - 22; i >= min; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) {
      if (dv.getUint32(0, false) === 0x89504e47) files.push({ name: 'image.png', data: u8 });
      return files;
    }
    const count = dv.getUint16(eocd + 10, true);
    let off = dv.getUint32(eocd + 16, true);
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      const method = dv.getUint16(off + 10, true);
      const csize = dv.getUint32(off + 20, true);
      const nameLen = dv.getUint16(off + 28, true);
      const extraLen = dv.getUint16(off + 30, true);
      const cmtLen = dv.getUint16(off + 32, true);
      const lho = dv.getUint32(off + 42, true);
      const name = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nameLen));
      const lnl = dv.getUint16(lho + 26, true), lel = dv.getUint16(lho + 28, true);
      const start = lho + 30 + lnl + lel;
      let data = u8.slice(start, start + csize);
      if (method === 8) {
        const ds = new DecompressionStream('deflate-raw');
        data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer());
      }
      files.push({ name, data });
      off += 46 + nameLen + extraLen + cmtLen;
    }
    return files;
  }

  /* ---------------- runner ---------------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let wakeLock = null;
  async function acquireWake() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
  }
  function releaseWake() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }

  // 1枚分の生成。429/5xx/通信断は自動リトライ（最大3試行）
  async function generateOne(pl, token, label) {
    delete pl.__fixedSeed;
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (stopFlag) return { stopped: true };
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify(pl),
        });
        if (res.ok) {
          const files = await unzip(await res.arrayBuffer());
          if (files.length) return { files };
          return { error: `${label}: 画像の展開に失敗しました。` };
        }
        let msg = ''; try { msg = await res.text(); } catch (e) {}
        const retryable = res.status === 429 || res.status >= 500;
        const reason = res.status === 401 ? 'トークンが無効です。'
          : res.status === 402 ? 'Anlas不足の可能性があります。'
          : res.status === 429 ? '混雑（レート制限）です。' : '';
        if (retryable && attempt < 3) {
          for (let w = attempt * 8; w > 0 && !stopFlag; w--) {
            setStatus(`⚠ ${label}: HTTP ${res.status} ${reason} ${w}秒後に再試行（${attempt}/2回目）…`);
            await sleep(1000);
          }
          continue;
        }
        return { error: `${label}: HTTP ${res.status} ${reason} ${msg.slice(0, 160)}` };
      } catch (e) {
        if (attempt < 3) {
          for (let w = attempt * 8; w > 0 && !stopFlag; w--) {
            setStatus(`⚠ ${label}: 通信エラー。${w}秒後に再試行（${attempt}/2回目）…`);
            await sleep(1000);
          }
          continue;
        }
        return { error: `${label}: 通信エラー: ` + (e && e.message ? e.message : e) };
      }
    }
    return { error: `${label}: 再試行しましたが失敗しました。` };
  }

  const stampNow = () => {
    const ts = new Date();
    return `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}-${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}`;
  };

  // 枚数タブの連続生成（もとの機能）
  async function runRange(startIdx, endIdx) {
    if (running) return;
    const token = getToken();
    if (!token) { setStatus('❌ トークン未検出。設定欄に Persistent API Token(pst-…)を貼るか、NovelAIにログインしてください。'); return; }
    const p = proj(), s = S.settings;
    startIdx = Math.max(0, startIdx); endIdx = Math.min(p.tabs.length - 1, endIdx);
    const n = endIdx - startIdx + 1;
    const pf = buildPayload(p.tabs[startIdx], p, s).parameters;
    const free = (pf.width * pf.height <= 1048576 && pf.steps <= 28);
    if (n > 1 && !confirm(`${startIdx + 1}枚目〜${endIdx + 1}枚目の ${n}枚 を連続生成します。\n${s.model} / ${pf.width}×${pf.height} / steps ${pf.steps}\n${free ? '✅ Opusなら無料枠内の設定です' : '⚠ Anlasを消費する設定です'}\n\n実行しますか？`)) return;
    running = true; stopFlag = false;
    acquireWake();
    $('#nbd-run').textContent = '生成中…';
    $('#nbd-stop').style.display = '';
    const stamp = stampNow();
    let ok = 0, failed = [];
    for (let i = startIdx; i <= endIdx; i++) {
      if (stopFlag) break;
      setStatus(`⏳ ${i + 1}枚目（${i - startIdx + 1}/${n}）を生成中…`);
      const pl = buildPayload(p.tabs[i], p, s);
      const seed = pl.parameters.seed;
      const r = await generateOne(pl, token, `${i + 1}枚目`);
      if (r.stopped) break;
      if (r.error) {
        failed.push(i + 1);
        if (s.onError === 'skip') { setStatus(`⚠ ${r.error} → スキップして続行します。`); await sleep(1500); continue; }
        setStatus('❌ ' + r.error);
        break;
      }
      for (const f of r.files) galAdd(f.data, `nai-${stamp}-${String(i + 1).padStart(2, '0')}.png`, seed, i + 1);
      ok++;
      renderGallery();
      setStatus(`✅ ${i + 1}枚目 完了（seed: ${seed}）`);
      if (i < endIdx) {
        for (let w = +s.delay || 0; w > 0 && !stopFlag; w--) { setStatus(`⏸ 次の生成まで ${w} 秒…`); await sleep(1000); }
      }
    }
    releaseWake();
    const tail = failed.length ? ` / 失敗: ${failed.join(',')}枚目` : '';
    setStatus(stopFlag ? `⏹ 停止しました（完了 ${ok}枚${tail}）` : `🏁 終了: 完了 ${ok}/${n}枚${tail}`);
    running = false; stopFlag = false;
    $('#nbd-run').textContent = '▶ 連続生成';
    $('#nbd-stop').style.display = 'none';
  }
  const runAll = () => runRange(0, proj().tabs.length - 1);

  /* ---------------- UI ---------------- */
  const css = `
  #nbd-fab{position:fixed;right:14px;bottom:14px;z-index:99998;width:52px;height:52px;border-radius:50%;
    background:#F5F3C2;color:#191B31;border:none;font-size:24px;box-shadow:0 4px 14px rgba(0,0,0,.5);cursor:pointer}
  #nbd-panel{position:fixed;inset:0;z-index:99999;background:#0E0F21;color:#fff;display:none;flex-direction:column;
    font-family:"Source Sans Pro",-apple-system,sans-serif;font-size:15px;overscroll-behavior:contain}
  #nbd-panel.open{display:flex}
  #nbd-panel *{box-sizing:border-box}
  .nbd-head{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#191B31;border-bottom:1px solid #22253F;flex-wrap:wrap}
  .nbd-title{font-family:Eczar,serif;color:#F5F3C2;font-weight:700;font-size:17px;letter-spacing:.5px;margin-right:auto}
  .nbd-body{flex:1;overflow-y:auto;padding:12px;padding-bottom:120px}
  .nbd-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
  .nbd-btn{background:#22253F;color:#fff;border:1px solid #34375a;border-radius:6px;padding:8px 12px;cursor:pointer;font-weight:600}
  .nbd-btn.acc{background:#F5F3C2;color:#191B31;border-color:#F5F3C2}
  .nbd-btn.warn{color:#FF9c9c}
  .nbd-btn.sm{padding:5px 9px;font-size:13px}
  .nbd-btn:disabled{opacity:.35;color:#888}
  select.nbd-in,input.nbd-in{background:#13152C;color:#fff;border:1px solid #22253F;border-radius:6px;padding:8px;font-size:14px}
  textarea.nbd-ta{width:100%;min-height:88px;background:#13152C;color:#fff;border:1px solid #22253F;border-radius:8px;
    padding:10px;font-size:15px;line-height:1.5;resize:vertical}
  .nbd-label{color:#F5F3C2;font-weight:600;font-size:13px;margin:10px 0 4px;display:block}
  .nbd-tabs{display:flex;gap:6px;overflow-x:auto;padding:4px 0;margin-bottom:6px;-webkit-overflow-scrolling:touch}
  .nbd-chip{flex:0 0 auto;background:#191B31;border:1px solid #22253F;border-radius:16px;padding:6px 14px;cursor:pointer;white-space:nowrap;font-weight:600}
  .nbd-chip.on{background:#F5F3C2;color:#191B31;border-color:#F5F3C2}
  #nbd-panel input,#nbd-panel textarea{user-select:text!important;-webkit-user-select:text!important;
    -webkit-touch-callout:default!important;touch-action:auto!important}
  .nbd-charbox{background:#13152C;border:1px solid #22253F;border-radius:8px;padding:8px;margin-bottom:8px}
  .nbd-charhead{display:flex;align-items:center;gap:6px;margin-bottom:6px}
  .nbd-charhead b{color:#F5F3C2;font-size:13px;margin-right:auto}
  .nbd-sublabel{font-size:12px;color:#bbb;margin:6px 0 3px}
  .nbd-poswrap{display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap}
  .nbd-pos{display:grid;grid-template-columns:repeat(5,24px);grid-auto-rows:24px;gap:3px}
  .nbd-pos span{border:1px solid #34375a;border-radius:4px;background:#0E0F21;cursor:pointer}
  .nbd-pos span.on{background:#F5F3C2;border-color:#F5F3C2}
  .nbd-labelrow{display:flex;align-items:center;gap:8px}
  .nbd-labelrow .nbd-label{margin:10px 0 4px}
  .nbd-foot{position:fixed;left:0;right:0;bottom:0;background:#191B31;border-top:1px solid #22253F;padding:10px 12px;z-index:2}
  #nbd-status{font-size:13px;color:#F5F3C2;min-height:18px;margin-bottom:6px;word-break:break-word}
  details.nbd-set{background:#13152C;border:1px solid #22253F;border-radius:8px;padding:8px 10px;margin-bottom:10px}
  details.nbd-set summary{cursor:pointer;color:#F5F3C2;font-weight:600}
  details.nbd-sub{margin:8px 0;border-top:1px solid #22253F;padding-top:6px}
  details.nbd-sub summary{cursor:pointer;color:#ddd;font-weight:600;font-size:14px}
  .nbd-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
  .nbd-grid label{font-size:12px;color:#bbb;display:block;margin-bottom:2px}
  .nbd-gal{display:flex;gap:6px;overflow-x:auto;padding:6px 0}
  .nbd-gal img{height:84px;border-radius:6px;cursor:pointer;border:1px solid #22253F}
  .g5-note{font-size:12px;color:#bbb;margin:4px 0 8px;line-height:1.5}
  .g5-refs{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0}
  .g5-refs img{height:90px;border-radius:6px;border:1px solid #22253F;background:#000}
  .g5-job{display:flex;gap:8px;align-items:flex-start;background:#0E0F21;border:1px solid #22253F;border-radius:8px;padding:6px;margin:6px 0}
  .g5-job img{width:84px;height:84px;background:#fff;border-radius:4px;flex:0 0 auto}
  #nbd-viewer{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.94);display:none;flex-direction:column;align-items:center;justify-content:center}
  #nbd-viewer.open{display:flex}
  #nbd-viewer img{max-width:96vw;max-height:78vh;border-radius:6px}
  .nbd-vbar{display:flex;gap:10px;margin-top:12px;align-items:center;flex-wrap:wrap;justify-content:center}
  `;

  const html = `
  <button id="nbd-fab" title="Game5 NAI Batch">⚡</button>
  <div id="nbd-panel">
    <div class="nbd-head">
      <span class="nbd-title">⚡ Game5 NAI Batch</span>
      <select id="nbd-proj" class="nbd-in"></select>
      <button class="nbd-btn sm" id="nbd-proj-add">＋</button>
      <button class="nbd-btn sm" id="nbd-proj-ren">✎</button>
      <button class="nbd-btn sm" id="nbd-undo" title="元に戻す">↶</button>
      <button class="nbd-btn sm" id="nbd-redo" title="やり直す">↷</button>
      <button class="nbd-btn sm warn" id="nbd-proj-del">🗑</button>
      <button class="nbd-btn sm" id="nbd-close">✕</button>
    </div>
    <div class="nbd-body">
      <details class="nbd-set">
        <summary>⚙ 設定（モデル・サイズ・トークンなど）</summary>
        <div class="nbd-grid">
          <div><label>モデル</label>
            <select id="s-model" class="nbd-in" style="width:100%">
              <option value="nai-diffusion-4-5-full">V4.5 Full</option>
              <option value="nai-diffusion-4-5-curated">V4.5 Curated</option>
              <option value="nai-diffusion-4-full">V4 Full</option>
              <option value="nai-diffusion-4-curated-preview">V4 Curated</option>
              <option value="nai-diffusion-3">V3（キャラ欄はベースに結合）</option>
            </select></div>
          <div><label>サンプラー</label>
            <select id="s-sampler" class="nbd-in" style="width:100%">
              <option value="k_euler_ancestral">Euler Ancestral</option>
              <option value="k_euler">Euler</option>
              <option value="k_dpmpp_2s_ancestral">DPM++ 2S Ancestral</option>
              <option value="k_dpmpp_2m_sde">DPM++ 2M SDE</option>
              <option value="k_dpmpp_sde">DPM++ SDE</option>
            </select></div>
          <div><label>サイズプリセット</label>
            <select id="s-preset" class="nbd-in" style="width:100%">
              <option value="">（手動指定）</option>
              <option value="832x1216">縦 832×1216（無料枠）</option>
              <option value="1216x832">横 1216×832（無料枠）</option>
              <option value="1024x1024">正方 1024×1024（無料枠）</option>
              <option value="1024x1536">縦・大 1024×1536</option>
              <option value="1536x1024">横・大 1536×1024</option>
              <option value="1472x1472">正方・大 1472×1472</option>
            </select></div>
          <div><label>シード（空=毎回ランダム）</label><input id="s-seed" class="nbd-in" style="width:100%" placeholder="固定したい数値" inputmode="numeric"></div>
          <div><label>幅</label><input id="s-width" class="nbd-in" type="number" style="width:100%"></div>
          <div><label>高さ</label><input id="s-height" class="nbd-in" type="number" style="width:100%"></div>
          <div><label>Steps（Opus無料は28まで）</label><input id="s-steps" class="nbd-in" type="number" style="width:100%"></div>
          <div><label>Guidance</label><input id="s-scale" class="nbd-in" type="number" step="0.1" style="width:100%"></div>
          <div><label>Guidance Rescale（0〜1）</label><input id="s-rescale" class="nbd-in" type="number" step="0.05" min="0" max="1" style="width:100%"></div>
          <div><label>ノイズスケジュール</label>
            <select id="s-noise" class="nbd-in" style="width:100%">
              <option value="karras">karras（既定）</option>
              <option value="native">native</option>
              <option value="exponential">exponential</option>
              <option value="polyexponential">polyexponential</option>
            </select></div>
          <div><label>生成間隔（秒）</label><input id="s-delay" class="nbd-in" type="number" style="width:100%"></div>
          <div><label>自動ダウンロード</label>
            <select id="s-autodl" class="nbd-in" style="width:100%"><option value="1">する</option><option value="0">しない（ギャラリーのみ）</option></select></div>
          <div><label>品質タグ自動付与（本体と同じ）</label>
            <select id="s-quality" class="nbd-in" style="width:100%"><option value="1">ON（推奨）</option><option value="0">OFF</option></select></div>
          <div><label>除外プリセット（Undesired Content）</label>
            <select id="s-ucpreset" class="nbd-in" style="width:100%"><option value="heavy">Heavy（推奨）</option><option value="light">Light</option><option value="none">なし</option></select></div>
          <div><label>エラー時の動作</label>
            <select id="s-onerror" class="nbd-in" style="width:100%">
              <option value="skip">スキップして続行</option>
              <option value="stop">中断する</option>
            </select></div>
        </div>
        <label class="nbd-label">APIトークン（空欄なら自動検出。動かない時は NovelAI設定→アカウント→「Persistent API Token」を貼付）</label>
        <input id="s-token" class="nbd-in" style="width:100%" placeholder="pst-…（任意）">
        <div class="nbd-row" style="margin-top:8px">
          <button class="nbd-btn sm" id="nbd-export">⬇ 全データ書き出し</button>
          <button class="nbd-btn sm" id="nbd-import">⬆ 読み込み</button>
          <input type="file" id="nbd-import-file" accept=".json,application/json" style="display:none">
        </div>
      </details>

      <details class="nbd-set" id="nbd-free">
        <summary>📝 自由入力の連続生成（もとの機能）</summary>
      <div class="nbd-labelrow"><label class="nbd-label">ネガティブプロンプト（このプロジェクト共通）</label>
        <button class="nbd-btn sm" id="nbd-copy-neg">📄 コピー</button>
        <button class="nbd-btn sm" id="nbd-paste-neg">📋 貼り付け</button></div>
      <textarea id="nbd-neg" class="nbd-ta" style="min-height:56px" placeholder="除外したい要素…"></textarea>

      <label class="nbd-label">枚数タブ（＋で追加。新しい枚は前の枚を自動コピー）</label>
      <div class="nbd-tabs" id="nbd-tabs"></div>
      <div class="nbd-row">
        <button class="nbd-btn sm" id="nbd-tab-add">＋ 枚を追加</button>
        <button class="nbd-btn sm" id="nbd-tab-copy">← 前の枚からコピー</button>
        <button class="nbd-btn sm" id="nbd-tab-left" title="この枚を左へ">◀</button>
        <button class="nbd-btn sm" id="nbd-tab-right" title="この枚を右へ">▶</button>
        <button class="nbd-btn sm warn" id="nbd-tab-del">この枚を削除</button>
      </div>
      <div class="nbd-row">
        <button class="nbd-btn sm" id="nbd-run-one">▶ この枚だけ生成（お試し）</button>
        <button class="nbd-btn sm" id="nbd-run-from">▶▶ この枚から最後まで</button>
        <button class="nbd-btn sm" id="nbd-run">▶ 連続生成</button>
        <button class="nbd-btn sm" id="nbd-check">🔍 送信内容</button>
      </div>

      <div class="nbd-labelrow"><label class="nbd-label">ベースプロンプト</label>
        <button class="nbd-btn sm" id="nbd-prev-base" title="前の枚のベースだけ取り込む">↩ 前の枚</button>
        <button class="nbd-btn sm" id="nbd-copy-base">📄 コピー</button>
        <button class="nbd-btn sm" id="nbd-paste-base">📋 貼り付け</button></div>
      <textarea id="nbd-base" class="nbd-ta" placeholder="シーン全体のプロンプト…"></textarea>

      <label class="nbd-label">キャラクタープロンプト（0人以上）</label>
      <div id="nbd-chars"></div>
      <button class="nbd-btn sm" id="nbd-char-add">＋ キャラを追加</button>
      </details>

      <label class="nbd-label">🖼 生成結果（タップで拡大スライド表示）</label>
      <div class="nbd-gal" id="nbd-gal"><span style="color:#777">まだ画像はありません</span></div>
      <div class="nbd-row">
        <button class="nbd-btn sm" id="nbd-slide">▶ スライド表示</button>
        <button class="nbd-btn sm acc" id="nbd-zipsmall" title="WebPに縮小してZIP化">🗜 縮小ZIP（転送用）</button>
        <button class="nbd-btn sm" id="nbd-zipall" title="元のPNGのままZIP化(大容量)">🗜 フルZIP</button>
        <button class="nbd-btn sm" id="nbd-dlall">⬇ 1枚ずつ保存</button>
        <button class="nbd-btn sm warn" id="nbd-galclear">ギャラリーを空にする</button>
      </div>
    </div>
    <div class="nbd-foot">
      <div id="nbd-status"></div>
      <div class="nbd-row" style="margin:0">
        <button class="nbd-btn acc" id="g5-run-foot" style="flex:1">▶ Game5：まだのコマを生成</button>
        <button class="nbd-btn warn" id="nbd-stop" style="display:none">■ 停止</button>
      </div>
    </div>
  </div>
  <div id="nbd-viewer">
    <img id="nbd-vimg" alt="">
    <div id="nbd-vmeta" style="color:#bbb;font-size:13px;margin-top:8px"></div>
    <div class="nbd-vbar">
      <button class="nbd-btn" id="nbd-vprev">←</button>
      <span id="nbd-vcnt" style="color:#F5F3C2;font-weight:700"></span>
      <button class="nbd-btn" id="nbd-vnext">→</button>
      <button class="nbd-btn" id="nbd-vdl">⬇ 保存</button>
      <button class="nbd-btn" id="nbd-vseed" title="この画像のシードを設定に入れて再現・微調整に使う">♻ シード再利用</button>
      <button class="nbd-btn warn" id="nbd-vtrash" title="この画像を削除">🗑 削除</button>
      <button class="nbd-btn" id="nbd-vclose">✕ 閉じる</button>
    </div>
  </div>`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);

  const $ = sel => root.querySelector(sel);
  const setStatus = t => { $('#nbd-status').textContent = t; };

  /* ---- render ---- */
  function renderProjects() {
    const sel = $('#nbd-proj');
    sel.innerHTML = '';
    S.projects.forEach((p, i) => {
      const o = document.createElement('option');
      o.value = i; o.textContent = p.name;
      sel.appendChild(o);
    });
    sel.value = S.cur;
  }
  function renderTabs() {
    const p = proj(), box = $('#nbd-tabs');
    box.innerHTML = '';
    p.tabs.forEach((t, i) => {
      const c = document.createElement('div');
      c.className = 'nbd-chip' + (i === p.curTab ? ' on' : '');
      c.textContent = `${i + 1}枚目`;
      c.onclick = () => { p.curTab = i; save(); renderEditor(); renderTabs(); };
      box.appendChild(c);
    });
  }
  function renderChars() {
    const t = tab(), box = $('#nbd-chars');
    box.innerHTML = '';
    if (!t.chars.length) {
      box.innerHTML = '<div style="color:#777;font-size:13px;margin-bottom:6px">キャラ指定なし（0人）</div>';
    }
    const GRID = [0.1, 0.3, 0.5, 0.7, 0.9];
    t.chars.forEach((c, i) => {
      const box2 = document.createElement('div');
      box2.className = 'nbd-charbox';
      const head = document.createElement('div');
      head.className = 'nbd-charhead';
      const title = document.createElement('b');
      title.textContent = `キャラクター${i + 1}`;
      const pull = document.createElement('button');
      pull.className = 'nbd-btn sm'; pull.textContent = '↩ 前の枚';
      pull.onclick = () => {
        const p2 = proj();
        if (p2.curTab === 0) { setStatus('1枚目より前はありません。'); return; }
        const prevChar = (p2.tabs[p2.curTab - 1].chars || [])[i];
        if (!prevChar) { setStatus(`前の枚にキャラクター${i + 1}がいません。`); return; }
        t.chars[i] = normChar(normChar(prevChar));
        save(); renderChars();
      };
      const del = document.createElement('button');
      del.className = 'nbd-btn sm warn'; del.textContent = '🗑 削除';
      del.onclick = () => { t.chars.splice(i, 1); save(); renderChars(); };
      head.appendChild(title); head.appendChild(pull); head.appendChild(del);
      box2.appendChild(head);
      const lp = document.createElement('div');
      lp.className = 'nbd-sublabel'; lp.textContent = 'プロンプト';
      box2.appendChild(lp);
      const ta = document.createElement('textarea');
      ta.className = 'nbd-ta';
      ta.value = c.p;
      ta.addEventListener('input', () => { c.p = ta.value; save(); });
      box2.appendChild(ta);
      const rowP = document.createElement('div'); rowP.className = 'nbd-row'; rowP.style.margin = '4px 0 0';
      rowP.appendChild(makeCopyBtn(ta)); rowP.appendChild(makePasteBtn(ta));
      box2.appendChild(rowP);
      const ln = document.createElement('div');
      ln.className = 'nbd-sublabel'; ln.textContent = 'ネガティブ（このキャラ専用・任意）';
      box2.appendChild(ln);
      const tn = document.createElement('textarea');
      tn.className = 'nbd-ta'; tn.style.minHeight = '56px';
      tn.value = c.n || '';
      tn.addEventListener('input', () => { c.n = tn.value; save(); });
      box2.appendChild(tn);
      const wrap = document.createElement('div');
      wrap.className = 'nbd-poswrap';
      const toggle = document.createElement('button');
      toggle.className = 'nbd-btn sm';
      const grid = document.createElement('div');
      grid.className = 'nbd-pos';
      grid.style.display = 'none';
      const auto = document.createElement('button');
      auto.className = 'nbd-btn sm'; auto.textContent = '自動に戻す';
      auto.style.display = 'none';
      const updState = () => {
        toggle.textContent = (c.pos ? `📍 位置: x${c.pos.x}/y${c.pos.y}` : '📍 位置: 自動') + (grid.style.display === 'none' ? ' ▸' : ' ▾');
        grid.querySelectorAll('span').forEach(cell => {
          cell.classList.toggle('on', !!c.pos && +cell.dataset.x === c.pos.x && +cell.dataset.y === c.pos.y);
        });
      };
      toggle.onclick = () => {
        const open = grid.style.display === 'none';
        grid.style.display = open ? 'grid' : 'none';
        auto.style.display = open ? '' : 'none';
        updState();
      };
      GRID.forEach(y => GRID.forEach(x => {
        const cell = document.createElement('span');
        cell.dataset.x = x; cell.dataset.y = y;
        cell.onclick = () => { c.pos = (c.pos && c.pos.x === x && c.pos.y === y) ? null : { x, y }; save(); updState(); };
        grid.appendChild(cell);
      }));
      auto.onclick = () => { c.pos = null; save(); updState(); };
      wrap.appendChild(toggle); wrap.appendChild(auto);
      box2.appendChild(wrap);
      box2.appendChild(grid);
      updState();
      box.appendChild(box2);
    });
  }
  function renderEditor() {
    $('#nbd-neg').value = proj().negative || '';
    $('#nbd-base').value = tab().base || '';
    renderChars();
  }
  function renderSettings() {
    const s = S.settings;
    $('#s-model').value = s.model;
    $('#s-sampler').value = s.sampler;
    $('#s-width').value = s.width; $('#s-height').value = s.height;
    $('#s-steps').value = s.steps; $('#s-scale').value = s.scale;
    $('#s-delay').value = s.delay;
    $('#s-autodl').value = s.autoDL ? '1' : '0';
    $('#s-quality').value = s.addQuality === false ? '0' : '1';
    $('#s-ucpreset').value = s.ucPreset || 'heavy';
    $('#s-seed').value = s.seed || '';
    $('#s-rescale').value = s.cfgRescale ?? 0;
    $('#s-noise').value = s.noiseSchedule || 'karras';
    $('#s-onerror').value = s.onError || 'skip';
    const pv = `${s.width}x${s.height}`;
    $('#s-preset').value = [...$('#s-preset').options].some(o => o.value === pv) ? pv : '';
    $('#s-token').value = s.token || '';
  }
  function renderGallery() {
    const g = $('#nbd-gal');
    g.innerHTML = gallery.length ? '' : '<span style="color:#777">まだ画像はありません</span>';
    gallery.forEach((im, i) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;flex:0 0 auto';
      const img = document.createElement('img');
      img.src = im.url; img.alt = im.name; img.title = im.name;
      img.onclick = () => openViewer(i);
      const del = document.createElement('button');
      del.textContent = '✕';
      del.style.cssText = 'position:absolute;top:2px;right:2px;width:20px;height:20px;line-height:1;padding:0;border-radius:50%;border:none;background:rgba(0,0,0,.65);color:#ff9c9c;cursor:pointer;font-size:12px';
      del.onclick = e => { e.stopPropagation(); galDelete(i); };
      wrap.appendChild(img); wrap.appendChild(del);
      g.appendChild(wrap);
    });
  }
  function renderAll() { renderProjects(); renderTabs(); renderEditor(); renderSettings(); renderGallery(); }

  /* ---- viewer ---- */
  let vIdx = 0;
  function openViewer(i) {
    if (!gallery.length) { setStatus('画像がまだありません。'); return; }
    vIdx = Math.max(0, Math.min(i, gallery.length - 1));
    updViewer();
    $('#nbd-viewer').classList.add('open');
  }
  function updViewer() {
    const im = gallery[vIdx];
    $('#nbd-vimg').src = im.url;
    $('#nbd-vcnt').textContent = `${vIdx + 1} / ${gallery.length}`;
    $('#nbd-vmeta').textContent = `${im.name}${im.seed ? ' / seed: ' + im.seed : ''}`;
    $('#nbd-vseed').style.display = im.seed ? '' : 'none';
  }
  $('#nbd-vseed').onclick = () => {
    const im = gallery[vIdx];
    if (!im.seed) return;
    S.settings.seed = String(im.seed);
    save(); renderSettings();
    $('#nbd-viewer').classList.remove('open');
    setStatus(`♻ シード ${im.seed} を設定に入れました（空欄に戻すとランダムに戻ります）。`);
  };
  $('#nbd-vtrash').onclick = () => {
    if (!gallery.length) return;
    galDelete(vIdx);
    if (!gallery.length) { $('#nbd-viewer').classList.remove('open'); return; }
    vIdx = Math.min(vIdx, gallery.length - 1);
    updViewer();
  };
  $('#nbd-vprev').onclick = () => { vIdx = (vIdx - 1 + gallery.length) % gallery.length; updViewer(); };
  $('#nbd-vnext').onclick = () => { vIdx = (vIdx + 1) % gallery.length; updViewer(); };
  $('#nbd-vclose').onclick = () => $('#nbd-viewer').classList.remove('open');
  $('#nbd-vdl').onclick = () => {
    const im = gallery[vIdx];
    const a = document.createElement('a');
    a.href = im.url; a.download = im.name;
    document.body.appendChild(a); a.click(); a.remove();
  };
  let tx = null;
  $('#nbd-viewer').addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  $('#nbd-viewer').addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 45) (dx < 0 ? $('#nbd-vnext') : $('#nbd-vprev')).click();
    tx = null;
  }, { passive: true });

  /* ---- events ---- */
  $('#nbd-fab').onclick = () => $('#nbd-panel').classList.toggle('open');
  $('#nbd-close').onclick = () => $('#nbd-panel').classList.remove('open');

  $('#nbd-proj').addEventListener('change', e => { S.cur = +e.target.value; save(); renderTabs(); renderEditor(); });
  $('#nbd-proj-add').onclick = () => {
    const name = prompt('新しいプロジェクト名', 'プロジェクト' + (S.projects.length + 1));
    if (name === null) return;
    S.projects.push(newProject(name || '無題'));
    S.cur = S.projects.length - 1;
    save(); renderAll();
  };
  $('#nbd-proj-ren').onclick = () => {
    const name = prompt('プロジェクト名を変更', proj().name);
    if (name) { proj().name = name; save(); renderProjects(); }
  };
  $('#nbd-proj-del').onclick = () => {
    if (S.projects.length <= 1) { setStatus('最後のプロジェクトは削除できません。'); return; }
    if (!confirm(`「${proj().name}」を削除しますか？（プロンプトも消えます）`)) return;
    S.projects.splice(S.cur, 1);
    S.cur = Math.max(0, S.cur - 1);
    save(); renderAll();
  };
  $('#nbd-tab-add').onclick = () => {
    const p = proj();
    p.tabs.push(newTab(p.tabs[p.tabs.length - 1]));
    p.curTab = p.tabs.length - 1;
    save(); renderTabs(); renderEditor();
  };
  $('#nbd-tab-copy').onclick = () => {
    const p = proj();
    if (p.curTab === 0) { setStatus('1枚目より前はありません。'); return; }
    p.tabs[p.curTab] = newTab(p.tabs[p.curTab - 1]);
    save(); renderEditor();
  };
  $('#nbd-tab-del').onclick = () => {
    const p = proj();
    if (p.tabs.length <= 1) { setStatus('最後の1枚は削除できません。'); return; }
    if (!confirm(`${p.curTab + 1}枚目を削除しますか？`)) return;
    p.tabs.splice(p.curTab, 1);
    p.curTab = Math.max(0, p.curTab - 1);
    save(); renderTabs(); renderEditor();
  };
  $('#nbd-base').addEventListener('input', e => { tab().base = e.target.value; save(); });
  $('#nbd-neg').addEventListener('input', e => { proj().negative = e.target.value; save(); });
  $('#nbd-char-add').onclick = () => { tab().chars.push({ p: '', n: '', pos: null }); save(); renderChars(); };

  /* ---- 貼り付け対応（本体がタッチ・選択イベントを横取りする対策） ---- */
  ['touchstart', 'touchend', 'touchmove', 'pointerdown', 'pointerup', 'mousedown', 'mouseup',
   'contextmenu', 'selectstart', 'copy', 'cut', 'paste', 'keydown', 'keyup', 'keypress',
  ].forEach(ev => {
    $('#nbd-panel').addEventListener(ev, e => e.stopPropagation());
    $('#nbd-viewer').addEventListener(ev, e => e.stopPropagation());
  });
  function pasteInto(target) {
    return async () => {
      try {
        const txt = await navigator.clipboard.readText();
        if (!txt) { setStatus('クリップボードが空です。'); return; }
        const st = target.selectionStart ?? target.value.length;
        const en = target.selectionEnd ?? st;
        target.value = target.value.slice(0, st) + txt + target.value.slice(en);
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        target.focus();
        setStatus('📋 貼り付けました。');
      } catch (e) {
        setStatus('❌ 貼り付けできません。ブラウザにクリップボードの読み取りを許可してください。');
      }
    };
  }
  function makePasteBtn(target) {
    const b = document.createElement('button');
    b.className = 'nbd-btn sm'; b.textContent = '📋 貼り付け'; b.style.marginTop = '4px';
    b.onclick = pasteInto(target);
    return b;
  }
  $('#nbd-paste-base').onclick = pasteInto($('#nbd-base'));
  $('#nbd-paste-neg').onclick = pasteInto($('#nbd-neg'));
  function copyFrom(target) {
    return async () => {
      try {
        const st = target.selectionStart ?? 0, en = target.selectionEnd ?? 0;
        const txt = (en > st) ? target.value.slice(st, en) : target.value;
        if (!txt) { setStatus('コピーする内容がありません。'); return; }
        await navigator.clipboard.writeText(txt);
        setStatus(`📄 コピーしました（${txt.length}文字）。`);
      } catch (e) { setStatus('❌ コピーできません。'); }
    };
  }
  function makeCopyBtn(target) {
    const b = document.createElement('button');
    b.className = 'nbd-btn sm'; b.textContent = '📄 コピー'; b.style.marginTop = '4px';
    b.onclick = copyFrom(target);
    return b;
  }
  $('#nbd-copy-base').onclick = copyFrom($('#nbd-base'));
  $('#nbd-copy-neg').onclick = copyFrom($('#nbd-neg'));
  $('#nbd-prev-base').onclick = () => {
    const p = proj();
    if (p.curTab === 0) { setStatus('1枚目より前はありません。'); return; }
    tab().base = p.tabs[p.curTab - 1].base || '';
    save(); renderEditor();
  };
  $('#nbd-undo').onclick = () => applyHist(-1);
  $('#nbd-redo').onclick = () => applyHist(1);

  const bindSet = (id, key, cast) => {
    $(id).addEventListener('change', e => { S.settings[key] = cast ? cast(e.target.value) : e.target.value; save(); });
  };
  bindSet('#s-model', 'model'); bindSet('#s-sampler', 'sampler');
  bindSet('#s-width', 'width', Number); bindSet('#s-height', 'height', Number);
  bindSet('#s-steps', 'steps', Number); bindSet('#s-scale', 'scale', Number);
  bindSet('#s-delay', 'delay', Number);
  bindSet('#s-autodl', 'autoDL', v => v === '1');
  bindSet('#s-quality', 'addQuality', v => v === '1');
  bindSet('#s-ucpreset', 'ucPreset');
  bindSet('#s-seed', 'seed');
  bindSet('#s-rescale', 'cfgRescale', Number);
  bindSet('#s-noise', 'noiseSchedule');
  bindSet('#s-onerror', 'onError');
  $('#s-preset').addEventListener('change', e => {
    const v = e.target.value;
    if (!v) return;
    const [w, h] = v.split('x').map(Number);
    S.settings.width = w; S.settings.height = h;
    save(); renderSettings();
  });
  bindSet('#s-token', 'token');

  $('#nbd-check').onclick = () => {
    try { alert('【送信内容の確認（現在の枚）】\n\n' + payloadSummary(buildPayload(tab(), proj(), S.settings))); }
    catch (e) { alert('確認エラー: ' + e); }
  };
  $('#nbd-run').onclick = runAll;
  $('#nbd-run-one').onclick = () => runRange(proj().curTab, proj().curTab);
  $('#nbd-run-from').onclick = () => runRange(proj().curTab, proj().tabs.length - 1);
  $('#nbd-stop').onclick = () => { stopFlag = true; };
  const moveTab = dir => {
    const p = proj(), i = p.curTab, j = i + dir;
    if (j < 0 || j >= p.tabs.length) { setStatus('これ以上動かせません。'); return; }
    [p.tabs[i], p.tabs[j]] = [p.tabs[j], p.tabs[i]];
    p.curTab = j;
    save(); renderTabs(); renderEditor();
  };
  $('#nbd-tab-left').onclick = () => moveTab(-1);
  $('#nbd-tab-right').onclick = () => moveTab(1);

  // 全データの書き出し / 読み込み（トークンは安全のため含めない）
  $('#nbd-export').onclick = () => {
    const data = JSON.parse(JSON.stringify(S));
    if (data.settings) data.settings.token = '';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nai-batch-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
  };
  $('#nbd-import').onclick = () => $('#nbd-import-file').click();
  $('#nbd-import-file').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.projects) || !data.projects.length) throw new Error('形式が違います');
      if (!confirm('読み込むと現在の全プロジェクトが置き換わります（↶で戻せます）。よろしいですか？')) return;
      takeSnapshot();
      const keepToken = S.settings.token;
      S = data;
      S.settings = Object.assign({}, defaultState().settings, S.settings || {});
      if (!S.settings.token) S.settings.token = keepToken;
      S.cur = Math.min(S.cur || 0, S.projects.length - 1);
      S.projects.forEach(p => (p.tabs || []).forEach(t => { t.chars = (t.chars || []).map(normChar); }));
      save(); renderAll();
      setStatus('⬆ 読み込みました。');
    } catch (err) {
      setStatus('❌ 読み込み失敗: ' + (err && err.message ? err.message : err));
    }
  });
  $('#nbd-slide').onclick = () => openViewer(0);
  $('#nbd-zipall').onclick = () => zipAllGallery(false);
  $('#nbd-zipsmall').onclick = () => zipAllGallery(true);
  $('#nbd-dlall').onclick = () => {
    gallery.forEach((im, i) => setTimeout(() => {
      const a = document.createElement('a');
      a.href = im.url; a.download = im.name;
      document.body.appendChild(a); a.click(); a.remove();
    }, i * 400));
  };
  $('#nbd-galclear').onclick = () => {
    if (!confirm('ギャラリーを空にしますか？（保存済みの復元データも消えます。GitHub に送っていない絵は消えます）')) return;
    gallery.forEach(im => URL.revokeObjectURL(im.url));
    gallery.length = 0; renderGallery();
    idbClear().catch(() => {});
  };

  /* ---- 画像の小道具 ---- */
  function u8ToB64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const kCrcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function kCrc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = kCrcTable[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function makeZip(items) {   // items: [{name, u8}] 無圧縮
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    for (const it of items) {
      const nameB = enc.encode(it.name), crc = kCrc32(it.u8), sz = it.u8.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true);
      lh.setUint16(26, nameB.length, true);
      parts.push(new Uint8Array(lh.buffer), nameB, it.u8);
      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true);
      cd.setUint32(16, crc, true); cd.setUint32(20, sz, true); cd.setUint32(24, sz, true);
      cd.setUint16(28, nameB.length, true); cd.setUint32(42, offset, true);
      central.push(new Uint8Array(cd.buffer), nameB);
      offset += 30 + nameB.length + sz;
    }
    let cdSize = 0; central.forEach(c => { cdSize += c.length; });
    const eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true);
    eocd.setUint16(8, items.length, true); eocd.setUint16(10, items.length, true);
    eocd.setUint32(12, cdSize, true); eocd.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(eocd.buffer)]), { type: 'application/zip' });
  }
  /* 転送用の縮小変換: 高さmaxHに縮小しWebP(非対応ならPNG)へ */
  async function shrinkU8(u8, maxH, quality) {
    const bmp = await createImageBitmap(new Blob([u8], { type: 'image/png' }));
    const scale = Math.min(1, maxH / bmp.height);
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
    let blob = await new Promise(r => cv.toBlob(r, 'image/webp', quality));
    let ext = '.webp';
    if (!blob || blob.type !== 'image/webp') { blob = await new Promise(r => cv.toBlob(r, 'image/png')); ext = '.png'; }
    return { u8: new Uint8Array(await blob.arrayBuffer()), ext };
  }
  async function galBytes(im) { return new Uint8Array(await (await fetch(im.url)).arrayBuffer()); }
  async function zipAllGallery(small) {
    if (!gallery.length) { setStatus('画像がまだありません。'); return; }
    const items = [], used = {};
    let n = 0;
    for (const im of gallery) {
      n++;
      setStatus(`🗜 ${small ? '縮小して' : ''}ZIPを作成中… (${n}/${gallery.length})`);
      let name = im.name || 'image.png';
      try {
        let u8 = await galBytes(im);
        if (small) { const r = await shrinkU8(u8, G.opt.upSize, 0.9); u8 = r.u8; name = name.replace(/\.png$/i, '') + r.ext; }
        if (used[name]) { used[name]++; name = name.replace(/(\.[a-z]+)$/i, '(' + used[name] + ')$1'); }
        else used[name] = 1;
        items.push({ name, u8 });
      } catch (e) {}
    }
    if (!items.length) { setStatus('❌ ZIP作成に失敗しました。'); return; }
    const blob = makeZip(items);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `game5-nai-${small ? 'small-' : ''}${stampNow()}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setStatus(`🗜 ${items.length}枚を ${a.download} に保存しました (${(blob.size / 1048576).toFixed(1)}MB)。`);
  }
  function galDelete(i) {
    const im = gallery[i]; if (!im) return;
    URL.revokeObjectURL(im.url);
    if (im.id != null) idbDel(im.id).catch(() => {});
    gallery.splice(i, 1);
    renderGallery();
  }

  /* ================================================================
     🎬 Game5 モーションの元絵
     - どのコマを作るか・下絵・姿勢の言葉は、リポジトリの nai/jobs.json（GitHub Pages）から読む
     - 場面の種類ごとの言葉など、ユーザーが書く言葉はこのブラウザ（localStorage）にだけ置く
     - 下絵を img2img に、キャラクターの参照画像を精密参照（V4.5）に使う
     - できた絵は <キャラクター>__<モーション>__<向き>__<コマ>.png の名前でギャラリーへ
     ================================================================ */
  const G_SRC = 'https://nobuoiwase.github.io/Game5/character-motion-v1/nai/';
  const G_LS = 'game5NaiBatch.words.v1';
  let G; try { G = JSON.parse(localStorage.getItem(G_LS)) || {}; } catch (e) { G = {}; }
  G.words = G.words || {}; G.motionWords = G.motionWords || {}; G.charWords = G.charWords || {}; G.extraNeg = G.extraNeg || '';
  G.done = G.done || {}; G.up = G.up || {}; G.char = G.char || 'aria';
  G.opt = Object.assign({ useBase: true, strength: 0.7, noise: 0, refMode: 'character&style', refStrength: 1, refFidelity: 1, limit: 20,
    ghOwner: 'NobuoIwase', ghRepo: 'Game5', ghBranch: 'nai-output', ghDir: 'character-motion-v1/nai/out', ghToken: '', upSize: 1024, upWebp: true }, G.opt || {});
  const gSave = () => { try { localStorage.setItem(G_LS, JSON.stringify(G)); } catch (e) { setStatus('⚠ 保存できませんでした（容量不足の可能性）'); } };
  let GD = null;          // jobs.json
  const baseCache = {};   // 下絵の base64

  /* ---- 参照画像（IndexedDB。キャラクターごとに最大2枚） ---- */
  function refDb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('g5Refs', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('refs');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function refGet(ch) {
    const db = await refDb();
    return new Promise(res => { const q = db.transaction('refs').objectStore('refs').get(ch); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); });
  }
  async function refSet(ch, list) {
    const db = await refDb();
    return new Promise(res => { const tx = db.transaction('refs', 'readwrite'); tx.objectStore('refs').put(list, ch); tx.oncomplete = res; tx.onerror = res; });
  }
  // 精密参照の画像は 1024×1536・1536×1024・1472×1472 のどれかに、黒い余白で合わせる
  async function padRef(file) {
    const bmp = await createImageBitmap(file);
    const r = bmp.width / bmp.height;
    const [W, H] = r < 0.8 ? [1024, 1536] : r > 1.25 ? [1536, 1024] : [1472, 1472];
    const k = Math.min(W / bmp.width, H / bmp.height);
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
    cx.drawImage(bmp, Math.round((W - w) / 2), Math.round((H - h) / 2), w, h);
    const blob = await new Promise(r2 => cv.toBlob(r2, 'image/png'));
    return u8ToB64(new Uint8Array(await blob.arrayBuffer()));
  }

  /* ---- 1コマ分のプロンプト（同じ言葉は1回だけ） ---- */
  function gPrompt(job) {
    const f = GD.frames[job.frame], ch = GD.characters[job.char];
    const parts = [GD.common, ch.tags, G.charWords[job.char] || '', ...f.situations.map(s => G.words[s] || ''), G.motionWords[f.motion] || '', f.prompt, f.note];
    const seen = new Set();
    return parts.join(',').split(',').map(x => x.trim()).filter(x => { const k = x.toLowerCase().replace(/\s+/g, ' '); if (!k || seen.has(k)) return false; seen.add(k); return true; }).join(', ');
  }
  const gNeg = () => [GD.negative, G.extraNeg].map(x => (x || '').trim()).filter(Boolean).join(', ');
  async function gBase(job) {
    const f = GD.frames[job.frame];
    if (!baseCache[f.base]) {
      const res = await fetch(G_SRC + f.base);
      if (!res.ok) throw new Error('下絵 ' + res.status);
      baseCache[f.base] = u8ToB64(new Uint8Array(await res.arrayBuffer()));
    }
    return baseCache[f.base];
  }
  async function gPayload(job, refs) {
    const s = Object.assign({}, S.settings, { width: GD.size[0], height: GD.size[1] });
    const pl = buildPayload({ base: gPrompt(job), chars: [] }, { negative: gNeg() }, s);
    const p = pl.parameters;
    if (G.opt.useBase) {
      pl.action = 'img2img';
      p.image = await gBase(job);
      p.strength = Math.min(0.99, Math.max(0.01, +G.opt.strength || 0.7));
      p.noise = Math.min(0.99, Math.max(0, +G.opt.noise || 0));
      p.extra_noise_seed = p.seed;
    }
    if (refs.length) {
      p.director_reference_images = refs;
      p.director_reference_descriptions = refs.map(() => ({ caption: { base_caption: G.opt.refMode, char_captions: [] }, legacy_uc: false }));
      p.director_reference_information_extracted = refs.map(() => 1);
      p.director_reference_strength_values = refs.map(() => Math.min(1, Math.max(0, +G.opt.refStrength)));
      // 画面の「Fidelity」は、送るときは 1 - Fidelity
      p.director_reference_secondary_strength_values = refs.map(() => Math.round((1 - Math.min(1, Math.max(0, +G.opt.refFidelity))) * 100) / 100);
    }
    return pl;
  }
  const gJobs = () => GD ? GD.jobs.filter(j => j.char === G.char) : [];
  const gTodo = () => gJobs().filter(j => !G.done[j.file]);

  async function gLoad() {
    try {
      setStatus('🎬 コマの一覧を読み込み中…');
      const res = await fetch(G_SRC + 'jobs.json?t=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      GD = await res.json();
      gRender();
      setStatus(`🎬 コマの一覧を読み込みました（${GD.jobs.length}枚、版 ${GD.version}）。`);
    } catch (e) { setStatus('❌ コマの一覧を読み込めません: ' + e.message); }
  }

  async function gRun(one) {
    if (running) { setStatus('別の生成が実行中です。'); return; }
    if (!GD) { await gLoad(); if (!GD) return; }
    const token = getToken();
    if (!token) { setStatus('❌ トークン未検出。設定欄を確認してください。'); return; }
    const refs = (await refGet(G.char)).map(r => r.b64);
    const list = one ? [one] : gTodo().slice(0, Math.max(1, +G.opt.limit || 20));
    if (!list.length) { setStatus('このキャラクターのコマはすべて作り終えています。'); return; }
    const label = GD.characters[G.char].label;
    if (!refs.length && !confirm(`${label}の参照画像が入っていません。参照なしで作りますか？（絵柄がそろいにくくなります）`)) return;
    if (!one && !confirm(`${label}：${list.length}枚を作ります（残り ${gTodo().length}枚）。\n下絵(img2img): ${G.opt.useBase ? '使う・強さ ' + G.opt.strength : '使わない'}\n精密参照: ${refs.length}枚 → 1枚ごとに約 ${refs.length * 5} Anlas\n合計の目安: 約 ${list.length * refs.length * 5} Anlas（精密参照の分）\n\n実行しますか？`)) return;
    running = true; stopFlag = false; acquireWake();
    $('#nbd-stop').style.display = '';
    let ok = 0; const failed = [];
    for (let i = 0; i < list.length; i++) {
      if (stopFlag) break;
      const job = list[i];
      setStatus(`⏳ ${label} ${i + 1}/${list.length}：${GD.frames[job.frame].label}（${job.file}）`);
      let pl;
      try { pl = await gPayload(job, refs); } catch (e) { failed.push(job.file); setStatus('⚠ ' + e.message); continue; }
      const seed = pl.parameters.seed;
      const r = await generateOne(pl, token, job.file);
      if (r.stopped) break;
      if (r.error) {
        failed.push(job.file);
        if (S.settings.onError === 'skip') { setStatus('⚠ ' + r.error + ' → 次へ'); await sleep(1500); continue; }
        setStatus('❌ ' + r.error); break;
      }
      galAdd(r.files[0].data, job.file, seed, 0);
      G.done[job.file] = Date.now(); delete G.up[job.file]; gSave();
      ok++; renderGallery(); gRenderCount();
      if (i < list.length - 1) for (let w = +S.settings.delay || 0; w > 0 && !stopFlag; w--) { setStatus(`⏸ 次まで ${w} 秒…（${ok}枚できた）`); await sleep(1000); }
    }
    releaseWake();
    running = false; stopFlag = false;
    $('#nbd-stop').style.display = 'none';
    setStatus(`🏁 ${label}：${ok}枚できました` + (failed.length ? ` / 失敗 ${failed.length}枚（もう一度「まだのコマを生成」で作り直せます）` : '') + ` / 残り ${gTodo().length}枚`);
    gRender();
  }

  /* ---- ChatGPT の答え（chatgpt_request.html）を取り込む ---- */
  function gImport(text) {
    if (!GD) { setStatus('先にコマの一覧を読み込んでください。'); return; }
    try {
      const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      const K = GD.answerKeys || {}, known = { words: GD.situations, motionWords: GD.motions || GD.slots || {}, charWords: GD.characters };
      let n = 0;
      for (const key of ['words', 'motionWords', 'charWords'])
        for (const [k0, v] of Object.entries(j[key] || {})) {
          const k = (K[key] || {})[k0] || k0;
          if (k in known[key] && typeof v === 'string' && v.trim()) { G[key][k] = v.trim(); n++; }
        }
      if (typeof j.extraNeg === 'string' && j.extraNeg.trim()) { G.extraNeg = j.extraNeg.trim(); n++; }
      gSave(); gRender();
      setStatus(`✅ ${n} 個の欄を埋めました。`);
    } catch (e) { setStatus('❌ 取り込めませんでした: ' + e.message); }
  }

  /* ---- GitHub へ送る（Git Data API。1回のコミットに最大25枚） ---- */
  async function gh(method, path, body) {
    const res = await fetch('https://api.github.com/repos/' + G.opt.ghOwner + '/' + G.opt.ghRepo + path, {
      method,
      headers: { 'Authorization': 'Bearer ' + G.opt.ghToken.trim(), 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) { let t = ''; try { t = await res.text(); } catch (e) {} const err = new Error(`GitHub ${res.status} ${t.slice(0, 160)}`); err.status = res.status; throw err; }
    return res.status === 204 ? null : res.json();
  }
  async function ghHead() {
    const br = encodeURIComponent(G.opt.ghBranch).replace(/%2F/g, '/');
    try { return (await gh('GET', '/git/ref/heads/' + br)).object.sha; }
    catch (e) {
      if (e.status !== 404) throw e;
      const repo = await gh('GET', '');
      const sha = (await gh('GET', '/git/ref/heads/' + repo.default_branch)).object.sha;
      await gh('POST', '/git/refs', { ref: 'refs/heads/' + G.opt.ghBranch, sha });
      setStatus(`🌿 ブランチ ${G.opt.ghBranch} を作りました。`);
      return sha;
    }
  }
  async function gUpload() {
    if (running) { setStatus('実行中です。'); return; }
    if (!G.opt.ghToken.trim()) { setStatus('❌ GitHub のトークンを入れてください（🎬 の「GitHub へ送る」の欄）。'); return; }
    const items = gallery.filter(im => /^(aria|scout|mage|healer)__.+\.png$/.test(im.name) && !G.up[im.name]);
    if (!items.length) { setStatus('送っていない Game5 の絵はありません。'); return; }
    if (!confirm(`${items.length}枚を ${G.opt.ghOwner}/${G.opt.ghRepo} のブランチ「${G.opt.ghBranch}」の ${G.opt.ghDir}/ に送ります。\n${G.opt.upWebp ? 'WebP・高さ' + G.opt.upSize + 'px に縮小' : 'PNG のまま'}。よろしいですか？`)) return;
    running = true; stopFlag = false; acquireWake();
    let sent = 0;
    try {
      for (let b = 0; b < items.length && !stopFlag; b += 25) {
        const batch = items.slice(b, b + 25), tree = [];
        for (const im of batch) {
          if (stopFlag) break;
          setStatus(`⬆ 送る準備 ${sent + tree.length + 1}/${items.length}：${im.name}`);
          let u8 = await galBytes(im), name = im.name;
          if (G.opt.upWebp) { const r = await shrinkU8(u8, +G.opt.upSize || 1024, 0.9); u8 = r.u8; name = name.replace(/\.png$/i, '') + r.ext; }
          const blob = await gh('POST', '/git/blobs', { content: u8ToB64(u8), encoding: 'base64' });
          tree.push({ path: `${G.opt.ghDir.replace(/\/+$/, '')}/${name.split('__')[0]}/${name}`, mode: '100644', type: 'blob', sha: blob.sha, _name: im.name });
        }
        if (!tree.length) break;
        const head = await ghHead();
        const baseTree = (await gh('GET', '/git/commits/' + head)).tree.sha;
        const t = await gh('POST', '/git/trees', { base_tree: baseTree, tree: tree.map(({ _name, ...x }) => x) });
        const c = await gh('POST', '/git/commits', { message: `NAI: ${tree.length} motion pictures (${G.char})`, tree: t.sha, parents: [head] });
        await gh('PATCH', '/git/refs/heads/' + G.opt.ghBranch, { sha: c.sha });
        for (const x of tree) G.up[x._name] = Date.now();
        sent += tree.length; gSave(); gRenderCount();
        setStatus(`⬆ ${sent}/${items.length}枚 送りました。`);
      }
      setStatus(`✅ ${sent}枚を GitHub（${G.opt.ghBranch}）に送りました。Claude に「送った」と伝えてください。`);
    } catch (e) { setStatus('❌ 送れませんでした: ' + e.message + `（${sent}枚までは送れています）`); }
    releaseWake(); running = false; stopFlag = false;
  }

  /* ---- UI ---- */
  let gPreviewIdx = 0;
  function gRenderCount() {
    const el = $('#g5-count'); if (!el || !GD) return;
    const js = gJobs(), nd = js.filter(j => G.done[j.file]).length, nu = js.filter(j => G.up[j.file]).length;
    el.textContent = `作った ${nd} / ${js.length}枚　GitHub に送った ${nu}枚`;
  }
  async function gRenderRefs() {
    const box = $('#g5-refs'); if (!box) return;
    const list = await refGet(G.char);
    box.innerHTML = list.length ? '' : '<span style="color:#777;font-size:13px">まだ入っていません</span>';
    list.forEach((r, i) => {
      const w = document.createElement('div'); w.style.cssText = 'position:relative';
      const im = document.createElement('img'); im.src = 'data:image/png;base64,' + r.b64; w.appendChild(im);
      const d = document.createElement('button'); d.textContent = '✕'; d.className = 'nbd-btn sm warn';
      d.style.cssText = 'position:absolute;top:2px;right:2px;padding:2px 6px';
      d.onclick = async () => { list.splice(i, 1); await refSet(G.char, list); gRenderRefs(); };
      w.appendChild(d); box.appendChild(w);
    });
  }
  function gRenderPreview() {
    const box = $('#g5-preview'); if (!box || !GD) return;
    const js = gJobs(); if (!js.length) { box.innerHTML = ''; return; }
    gPreviewIdx = Math.max(0, Math.min(gPreviewIdx, js.length - 1));
    const job = js[gPreviewIdx], f = GD.frames[job.frame], J = f.ja || {};
    box.innerHTML = '';
    const row = document.createElement('div'); row.className = 'g5-job';
    const im = document.createElement('img'); im.src = G_SRC + (f.guide || f.base); row.appendChild(im);
    const tx2 = document.createElement('div'); tx2.style.cssText = 'font-size:13px;line-height:1.5;flex:1';
    tx2.innerHTML = '';
    const line = (k, v) => { const d = document.createElement('div'); d.innerHTML = `<span style="color:#bbb">${k}</span> `; d.appendChild(document.createTextNode(v || '')); tx2.appendChild(d); };
    const hd = document.createElement('div'); hd.style.cssText = 'color:#F5F3C2;font-weight:700'; hd.textContent = `${gPreviewIdx + 1}/${js.length} ${f.label}${G.done[job.file] ? '（作成済み）' : ''}`; tx2.appendChild(hd);
    line('体勢', J.body); line('押さえ', J.held); line('動き', J.move);
    line('場面', f.situations.map(s => GD.situations[s]).join(' ＋ '));
    row.appendChild(tx2); box.appendChild(row);
    const mw = document.createElement('textarea'); mw.className = 'nbd-ta'; mw.style.minHeight = '56px';
    mw.placeholder = 'このモーションだけの言葉（全キャラクター・全コマに入る）';
    mw.value = G.motionWords[f.motion] || '';
    mw.addEventListener('change', () => { G.motionWords[f.motion] = mw.value; gSave(); });
    box.appendChild(mw);
  }
  function gRenderWords() {
    const box = $('#g5-words'); if (!box || !GD) return;
    box.innerHTML = '';
    const ta = (label, sub, val, onv) => {
      const w = document.createElement('div'); w.style.margin = '6px 0';
      const l = document.createElement('div'); l.style.cssText = 'font-weight:700;font-size:13px'; l.textContent = label; w.appendChild(l);
      if (sub) { const s2 = document.createElement('div'); s2.className = 'g5-note'; s2.style.margin = '0'; s2.textContent = sub; w.appendChild(s2); }
      const t = document.createElement('textarea'); t.className = 'nbd-ta'; t.style.minHeight = '56px'; t.value = val || '';
      t.addEventListener('change', () => { onv(t.value); gSave(); });
      w.appendChild(t); box.appendChild(w);
    };
    for (const [k, label] of Object.entries(GD.situations)) {
      const ms = [...new Set(Object.values(GD.frames).filter(f => f.situations.includes(k)).map(f => f.label))];
      if (!ms.length) continue;
      ta(label, '書くこと：' + ((GD.hints || {})[k] || '') + '　／　入るモーション：' + ms.join('、'), G.words[k], v => { G.words[k] = v; });
    }
    for (const [k, c] of Object.entries(GD.characters)) ta('キャラクター：' + c.label, '見た目で足すものだけ（全コマに入る）', G.charWords[k], v => { G.charWords[k] = v; });
    ta('除外する言葉の追加', '', G.extraNeg, v => { G.extraNeg = v; });
  }
  function gRender() {
    const sel = $('#g5-char'); if (!sel) return;
    if (GD) {
      sel.innerHTML = '';
      for (const [k, c] of Object.entries(GD.characters)) { const o = document.createElement('option'); o.value = k; o.textContent = c.label; sel.appendChild(o); }
      sel.value = G.char;
    }
    gRenderCount(); gRenderRefs(); gRenderPreview(); gRenderWords();
  }
  function initGame5() {
    const sec = document.createElement('details');
    sec.className = 'nbd-set'; sec.open = true;
    sec.innerHTML = `
      <summary>🎬 Game5 モーションの元絵（603枚）</summary>
      <div class="g5-note">どのコマを作るか・下絵・姿勢の言葉はリポジトリから読みます。あなたが書く言葉はこのブラウザにだけ保存されます。
        <a href="${G_SRC}scenes.html" target="_blank" style="color:#9cc4ff">場面の説明</a>・<a href="${G_SRC}chatgpt_request.html" target="_blank" style="color:#9cc4ff">ChatGPT への依頼書</a></div>
      <div class="nbd-row">
        <select id="g5-char" class="nbd-in" style="flex:1"></select>
        <button class="nbd-btn sm" id="g5-reload">↻ 一覧を読み直す</button>
      </div>
      <div id="g5-count" style="font-size:13px;color:#F5F3C2;margin-bottom:6px"></div>

      <details class="nbd-sub" open><summary>① 参照画像（精密参照・このキャラクター）</summary>
        <div class="g5-note">全身の画像と顔のアップを入れる（最大2枚）。黒い余白で NovelAI の決まった大きさに合わせてから保存します。1枚につき、生成1回ごとに 5 Anlas かかります。キャラクターを替えたら、そのキャラクターの画像を入れてください。</div>
        <div class="g5-refs" id="g5-refs"></div>
        <div class="nbd-row">
          <button class="nbd-btn sm" id="g5-refadd">＋ 画像を入れる</button>
          <input type="file" id="g5-reffile" accept="image/*" multiple style="display:none">
        </div>
        <div class="nbd-grid">
          <div><label>種類</label><select id="g5-refmode" class="nbd-in" style="width:100%"><option value="character&style">キャラクターと絵柄</option><option value="character">キャラクターだけ</option></select></div>
          <div><label>強さ（Strength 0〜1）</label><input id="g5-refstr" class="nbd-in" type="number" step="0.05" min="0" max="1" style="width:100%"></div>
          <div><label>忠実さ（Fidelity 0〜1）</label><input id="g5-reffid" class="nbd-in" type="number" step="0.05" min="0" max="1" style="width:100%"></div>
        </div>
      </details>

      <details class="nbd-sub"><summary>② 下絵（img2img）</summary>
        <div class="g5-note">姿勢だけのマネキン図を下絵にします。強さを上げると NovelAI の絵らしくなるが姿勢が離れる。下げると姿勢は合うがマネキンの形が残る。</div>
        <div class="nbd-grid">
          <div><label><input type="checkbox" id="g5-usebase"> 下絵を使う</label></div>
          <div><label>強さ（0.3〜0.95）</label><input id="g5-str" class="nbd-in" type="number" step="0.05" min="0.3" max="0.95" style="width:100%"></div>
          <div><label>ノイズ（0〜0.5）</label><input id="g5-noise" class="nbd-in" type="number" step="0.05" min="0" max="0.5" style="width:100%"></div>
        </div>
      </details>

      <details class="nbd-sub"><summary>③ 言葉（場面の種類ごと・キャラクター・除外）</summary>
        <div class="g5-note">ChatGPT の答え（JSON）を貼って「取り込む」。あなたの言葉も、ここに直接書けます（このブラウザにだけ保存）。</div>
        <textarea id="g5-json" class="nbd-ta" style="min-height:56px" placeholder="ChatGPT が返した JSON をここに貼る"></textarea>
        <div class="nbd-row"><button class="nbd-btn sm" id="g5-paste">📋 貼り付け</button><button class="nbd-btn sm acc" id="g5-import">取り込む</button></div>
        <div id="g5-words"></div>
      </details>

      <details class="nbd-sub"><summary>④ コマを見る・1枚だけ試す</summary>
        <div class="nbd-row">
          <button class="nbd-btn sm" id="g5-prev">◀</button>
          <button class="nbd-btn sm" id="g5-next">▶</button>
          <button class="nbd-btn sm" id="g5-nexttodo">次のまだのコマ</button>
          <button class="nbd-btn sm" id="g5-check">🔍 送信内容</button>
          <button class="nbd-btn sm acc" id="g5-one">▶ このコマだけ生成</button>
        </div>
        <div id="g5-preview"></div>
      </details>

      <details class="nbd-sub" open><summary>⑤ 連続生成</summary>
        <div class="nbd-row">
          <label style="font-size:13px">1回に作る枚数 <input id="g5-limit" class="nbd-in" type="number" min="1" max="200" style="width:80px"></label>
          <button class="nbd-btn acc" id="g5-run" style="flex:1">▶ まだのコマを生成</button>
        </div>
        <div class="nbd-row"><button class="nbd-btn sm warn" id="g5-reset">このキャラクターの「作った」印を消す</button></div>
      </details>

      <details class="nbd-sub"><summary>⑥ GitHub へ送る</summary>
        <div class="g5-note">スマホから直接リポジトリへ送ります。GitHub の「Fine-grained personal access token」を作り、リポジトリは Game5 だけ、権限は Contents: Read and write だけにして、期限を短めにしてください。トークンはこのブラウザ（novelai.net のページ）にだけ保存されます。送った絵は、下のブランチに入ります（main には入りません）。</div>
        <div class="nbd-grid">
          <div><label>持ち主</label><input id="g5-gho" class="nbd-in" style="width:100%"></div>
          <div><label>リポジトリ</label><input id="g5-ghr" class="nbd-in" style="width:100%"></div>
          <div><label>ブランチ（なければ作る）</label><input id="g5-ghb" class="nbd-in" style="width:100%"></div>
          <div><label>フォルダ</label><input id="g5-ghd" class="nbd-in" style="width:100%"></div>
          <div><label><input type="checkbox" id="g5-webp"> WebP に縮小して送る</label></div>
          <div><label>高さ（px）</label><input id="g5-upsize" class="nbd-in" type="number" style="width:100%"></div>
        </div>
        <label class="nbd-label">トークン</label>
        <input id="g5-ghtoken" class="nbd-in" type="password" style="width:100%" placeholder="github_pat_…">
        <div class="nbd-row" style="margin-top:8px"><button class="nbd-btn acc" id="g5-upload" style="flex:1">⬆ まだ送っていない絵を GitHub へ送る</button></div>
      </details>`;
    const firstSet = root.querySelector('details.nbd-set');
    firstSet.parentNode.insertBefore(sec, firstSet);

    const bindG = (id, key, kind) => {
      const el = $(id);
      if (kind === 'check') { el.checked = !!G.opt[key]; el.onchange = () => { G.opt[key] = el.checked; gSave(); }; }
      else { el.value = G.opt[key]; el.onchange = () => { G.opt[key] = kind === 'num' ? Number(el.value) : el.value; gSave(); }; }
    };
    bindG('#g5-refmode', 'refMode'); bindG('#g5-refstr', 'refStrength', 'num'); bindG('#g5-reffid', 'refFidelity', 'num');
    bindG('#g5-usebase', 'useBase', 'check'); bindG('#g5-str', 'strength', 'num'); bindG('#g5-noise', 'noise', 'num');
    bindG('#g5-limit', 'limit', 'num');
    bindG('#g5-gho', 'ghOwner'); bindG('#g5-ghr', 'ghRepo'); bindG('#g5-ghb', 'ghBranch'); bindG('#g5-ghd', 'ghDir');
    bindG('#g5-webp', 'upWebp', 'check'); bindG('#g5-upsize', 'upSize', 'num'); bindG('#g5-ghtoken', 'ghToken');

    $('#g5-char').onchange = e => { G.char = e.target.value; gPreviewIdx = 0; gSave(); gRender(); setStatus('参照画像も、このキャラクターのものか確かめてください。'); };
    $('#g5-reload').onclick = gLoad;
    $('#g5-refadd').onclick = () => $('#g5-reffile').click();
    $('#g5-reffile').addEventListener('change', async e => {
      const files = [...(e.target.files || [])]; e.target.value = '';
      const list = await refGet(G.char);
      for (const f of files) {
        if (list.length >= 2) { setStatus('参照画像は2枚までです。'); break; }
        try { list.push({ b64: await padRef(f), name: f.name }); } catch (err) { setStatus('❌ 画像を読めません: ' + err.message); }
      }
      await refSet(G.char, list); gRenderRefs();
    });
    $('#g5-paste').onclick = pasteInto($('#g5-json'));
    $('#g5-import').onclick = () => gImport($('#g5-json').value);
    $('#g5-prev').onclick = () => { gPreviewIdx--; gRenderPreview(); };
    $('#g5-next').onclick = () => { gPreviewIdx++; gRenderPreview(); };
    $('#g5-nexttodo').onclick = () => { const js = gJobs(); const k = js.findIndex((j, i) => i > gPreviewIdx && !G.done[j.file]); const k2 = k >= 0 ? k : js.findIndex(j => !G.done[j.file]); if (k2 >= 0) { gPreviewIdx = k2; gRenderPreview(); } else setStatus('まだのコマはありません。'); };
    $('#g5-check').onclick = async () => {
      if (!GD) return;
      const job = gJobs()[gPreviewIdx]; if (!job) return;
      const refs = (await refGet(G.char)).map(r => r.b64);
      try { const pl = await gPayload(job, refs); alert('【送信内容の確認】' + job.file + '\n\n' + payloadSummary(pl)); } catch (e) { alert('確認エラー: ' + e.message); }
    };
    $('#g5-one').onclick = () => { const job = gJobs()[gPreviewIdx]; if (job) gRun(job); };
    $('#g5-run').onclick = () => gRun();
    $('#g5-run-foot').onclick = () => gRun();
    $('#g5-reset').onclick = () => { if (!confirm('このキャラクターの「作った」印を全部消しますか？（絵は消えません）')) return; for (const j of gJobs()) delete G.done[j.file]; gSave(); gRender(); };
    $('#g5-upload').onclick = gUpload;
    gLoad();
  }

  renderAll();
  initGame5();
  takeSnapshot();
  restoreGallery();
  setStatus(getToken() ? '✅ ログイン情報を検出しました。準備OKです。' : '⚠ トークン未検出。設定欄にPersistent API Tokenを貼ってください。');
})();
