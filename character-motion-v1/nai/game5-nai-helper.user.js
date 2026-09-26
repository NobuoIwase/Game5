// ==UserScript==
// @name         Game5 NAI helper
// @namespace    nobuoiwase-game5
// @version      1.2
// @description  Game5 のモーションの元絵を NovelAI で作るための手伝い。ボタン1つで次のコマの下絵とプロンプトを入れる
// @match        https://novelai.net/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      nobuoiwase.github.io
// @updateURL    https://nobuoiwase.github.io/Game5/character-motion-v1/nai/game5-nai-helper.user.js
// @downloadURL  https://nobuoiwase.github.io/Game5/character-motion-v1/nai/game5-nai-helper.user.js
// ==/UserScript==
// How it works
//   - the list of frames and their pose-only base pictures come from nai/jobs.json (tools/build_nai_jobs.mjs)
//   - 「次のコマを入れる」 picks the next frame not yet saved and arms it
//   - when NovelAI sends the next generate request, the armed frame's prompt, negative prompt and base picture
//     (img2img) replace what is in the request. The words the user wrote for each kind of scene (設定) are added
//     here; they are kept only in this browser (GM storage), never in the page's prompt box or in the repository
//   - 「保存」 downloads the picture on screen under the frame's file name and marks the frame done; with 自動保存
//     (the user's setting) it does so by itself as soon as the new picture shows
(function(){
'use strict';
const SRC='https://nobuoiwase.github.io/Game5/character-motion-v1/nai/';
const W=unsafeWindow;
const get=(k,d)=>{try{const v=GM_getValue(k);return v===undefined?d:v}catch(e){return d}},set=(k,v)=>{try{GM_setValue(k,v)}catch(e){}};
let DATA=null,armed=null,armedImage=null,msg='';
const st={char:get('char','aria'),done:get('done',{}),words:get('words',{}),charWords:get('charWords',{}),motionWords:get('motionWords',{}),extraNeg:get('extraNeg',''),
 useBase:get('useBase',true),autoSave:get('autoSave',false),strength:get('strength',0.7),pos:get('pos',{})};
const save=()=>{for(const k of Object.keys(st))set(k,st[k])};

function xhr(url,type){return new Promise((ok,ng)=>GM_xmlhttpRequest({method:'GET',url:url+(url.includes('?')?'&':'?')+'t='+Date.now(),responseType:type,
 onload:r=>r.status===200?ok(r.response):ng(new Error(url+' '+r.status)),onerror:()=>ng(new Error(url))}))}
const b64=buf=>{const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};

const jobsOf=c=>DATA?DATA.jobs.filter(j=>j.char===c):[];
function promptOf(job){
 const f=DATA.frames[job.frame],ch=DATA.characters[job.char];
 const parts=[DATA.common,ch.tags,st.charWords[job.char]||'',...f.situations.map(s=>st.words[s]||''),st.motionWords[f.motion]||'',f.prompt,f.note];
 return parts.map(x=>(x||'').trim()).filter(Boolean).join(', ');
}
const negOf=()=>[DATA.negative,st.extraNeg].map(x=>(x||'').trim()).filter(Boolean).join(', ');

/* the request: the armed frame replaces the prompt and, with a base picture, turns it into img2img */
function rewrite(body){
 const job=armed,prompt=promptOf(job),neg=negOf(),p=body.parameters=body.parameters||{};
 body.input=prompt;p.negative_prompt=neg;
 if(p.v4_prompt&&p.v4_prompt.caption){p.v4_prompt.caption.base_caption=prompt;p.v4_prompt.caption.char_captions=[]}
 if(p.v4_negative_prompt&&p.v4_negative_prompt.caption){p.v4_negative_prompt.caption.base_caption=neg;p.v4_negative_prompt.caption.char_captions=[]}
 if(Array.isArray(p.characterPrompts))p.characterPrompts=[];
 p.width=DATA.size[0];p.height=DATA.size[1];
 if(st.useBase&&armedImage){body.action='img2img';p.image=armedImage;p.strength=+st.strength;p.noise=0;p.extra_noise_seed=p.seed||Math.floor(Math.random()*4e9)}
}
const origFetch=W.fetch;
W.fetch=function(input,init){
 try{
  const url=typeof input==='string'?input:(input&&input.url)||'';
  if(armed&&/\/ai\/generate-image/.test(url)){
   if(init&&typeof init.body==='string'){const body=JSON.parse(init.body);rewrite(body);init=Object.assign({},init,{body:JSON.stringify(body)});note('送信：'+armed.file);
    const job=armed,prev=(currentImage()||{}).src,pr=origFetch.call(W,input,init);pr.then(()=>waitNew(job,prev),()=>{});return pr}
   else note('送り方が想定と違うため、書き換えられませんでした（プロンプト欄のまま送られます）');
  }
 }catch(e){note('書き換えに失敗：'+e.message)}
 return origFetch.call(W,input,init);
};

/* the picture on screen: the largest generated image */
function currentImage(){let best=null;for(const im of document.querySelectorAll('img')){if(!/^(blob:|data:image)/.test(im.src))continue;if(!best||im.naturalWidth*im.naturalHeight>best.naturalWidth*best.naturalHeight)best=im}return best}

/* ---- panel ---- */
let root,detOpen=false;
const VJ={front:'正面',right:'真横',left:'真横',down_right:'斜め前',down_left:'斜め前',up_right:'斜め後ろ',up_left:'斜め後ろ',back:'後ろ'};
const h=(tag,attrs={},...kids)=>{const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='style')e.style.cssText=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v)}for(const c of kids)e.append(c);return e};
function note(t){msg=t;draw()}
function nextJob(from){const js=jobsOf(st.char);if(!js.length)return null;const i0=from==null?(st.pos[st.char]??-1):from;
 for(let k=1;k<=js.length;k++){const j=js[(i0+k)%js.length];if(!st.done[j.file])return j}return null}
async function arm(job){
 armed=job;armedImage=null;if(!job){note('このキャラクターのコマはすべて保存済みです');return}
 st.pos[st.char]=jobsOf(st.char).indexOf(job);save();note('下絵を読み込み中…');
 try{armedImage=b64(await xhr(SRC+DATA.frames[job.frame].base,'arraybuffer'));note('準備できました。生成ボタンを押してください')}catch(e){note('下絵を読み込めません：'+e.message)}
}
/* after a generate request: wait for the new picture, then save it when the user turned 自動保存 on */
function waitNew(job,prev){let n=0;const t=setInterval(()=>{const im=currentImage();if(im&&im.src!==prev&&im.complete&&im.naturalWidth){clearInterval(t);if(st.autoSave&&armed===job)saveImage();else note('できました：'+job.file)}else if(++n>240){clearInterval(t);note('新しい画像が見つかりません（2分）')}},500)}
function saveImage(){
 const im=currentImage();if(!armed){note('コマが選ばれていません');return}if(!im){note('画面に生成された画像が見つかりません');return}
 const a=document.createElement('a');a.href=im.src;a.download=armed.file;document.body.append(a);a.click();a.remove();
 st.done[armed.file]=Date.now();save();note('保存しました：'+armed.file);
}
function draw(){
 if(!root)return;root.innerHTML='';
 const box='position:fixed;right:12px;bottom:12px;z-index:2147483647;width:340px;max-height:80vh;overflow:auto;background:#1b2330;color:#e6edf3;font:13px/1.45 sans-serif;border:1px solid #3a4658;border-radius:8px;padding:10px;box-shadow:0 4px 16px #0008';
 root.style.cssText=box;
 const btn=(t,f,c='#2f6fb3')=>h('button',{style:`margin:2px 4px 2px 0;padding:6px 10px;border:0;border-radius:5px;background:${c};color:#fff;cursor:pointer;font:inherit`,onclick:f},t);
 const ta=(label,val,onv,sub)=>{const t=h('textarea',{rows:'2',style:'width:100%;box-sizing:border-box;background:#0f151d;color:#e6edf3;border:1px solid #3a4658;border-radius:4px'});t.value=val||'';t.addEventListener('change',e=>{onv(e.target.value);save()});return h('div',{style:'margin:6px 0'},h('div',{style:'font-weight:700'},label),sub?h('div',{style:'color:#9fb0c0;font-size:12px'},sub):'',t)};
 root.append(h('div',{style:'font-weight:700;margin-bottom:6px'},'Game5 モーションの元絵'));
 root.append(h('div',{},h('a',{href:SRC+'scenes.html',target:'_blank',style:'color:#7fb4ea'},'場面の説明を開く（どの場面が、どんな姿勢か）')));
 if(!DATA){root.append(h('div',{},msg||'一覧を読み込み中…'));return}
 const sel=h('select',{style:'width:100%;margin-bottom:6px',onchange:e=>{st.char=e.target.value;armed=null;save();note('精密参照に「'+DATA.characters[st.char].label+'」の参照画像を入れてください')}});
 for(const [k,c] of Object.entries(DATA.characters)){const o=h('option',{value:k},c.label);if(k===st.char)o.selected=true;sel.append(o)}
 root.append(sel);
 const js=jobsOf(st.char),nd=js.filter(j=>st.done[j.file]).length;
 root.append(h('div',{},`保存済み ${nd} / ${js.length}`));
 if(armed){const f=DATA.frames[armed.frame];root.append(h('div',{style:'margin:6px 0;padding:6px;background:#0f151d;border-radius:5px'},
  h('div',{style:'font-weight:700'},armed.file),h('div',{},f.label),h('div',{style:'color:#9fb0c0'},`${VJ[f.view]||f.view}から・${f.frame}コマ目${f.step?'：'+f.step:''}`),
  h('div',{style:'margin-top:4px'},f.ja||''),h('div',{style:'color:#ffd48a'},'押さえられている所：'+(f.held||'')),
  h('div',{style:'color:#9fb0c0'},'場面の種類：'+f.situations.map(x=>DATA.situations[x]).join(' ＋ ')),
  h('div',{},h('img',{src:SRC+(f.guide||f.base),title:'どこを押さえられているか（読むためだけの絵）',style:'width:120px;height:120px;background:#fff;margin:4px 4px 0 0;border-radius:4px'}),
   h('img',{src:SRC+f.base,title:'送る下絵（姿勢だけ）',style:'width:120px;height:120px;background:#fff;margin-top:4px;border-radius:4px'})),
  h('div',{style:'color:#9fb0c0;font-size:12px'},'左：どこを押さえられているか　右：送る下絵'),
  ta('このモーションだけの言葉（全キャラクター・全コマに足す）',st.motionWords[f.motion],v=>st.motionWords[f.motion]=v)))}
 root.append(h('div',{},btn('次のコマを入れる',()=>arm(nextJob()),'#2f8f4e'),btn('飛ばす',()=>arm(nextJob(armed?js.indexOf(armed):undefined)),'#56606e')));
 root.append(h('div',{},btn('保存（ユーザー用）',saveImage,'#b3522f')));
 if(msg)root.append(h('div',{style:'margin-top:6px;color:#ffd48a'},msg));
 // settings: the words for each kind of scene (kept in this browser only)
 const det=h('details',{style:'margin-top:8px'});det.open=detOpen;det.addEventListener('toggle',()=>{detOpen=det.open});det.append(h('summary',{style:'cursor:pointer'},'設定（ユーザー用）'));
 det.append(h('div',{style:'color:#9fb0c0;margin:4px 0'},'場面の種類ごとの言葉。このブラウザにだけ保存され、プロンプト欄には表示されません。送るときに足されます。'));
 for(const [k,label] of Object.entries(DATA.situations)){
  const ms=[...new Set(Object.values(DATA.frames).filter(f=>f.situations.includes(k)).map(f=>f.label))];
  det.append(ta(label,st.words[k],v=>st.words[k]=v,'書くとよいもの：'+((DATA.hints||{})[k]||'')+'　／　入るモーション：'+ms.join('、')))}
 for(const [k,c] of Object.entries(DATA.characters))det.append(ta('キャラクター：'+c.label,st.charWords[k],v=>st.charWords[k]=v));
 det.append(ta('除外する言葉の追加',st.extraNeg,v=>st.extraNeg=v));
 const cb=h('input',{type:'checkbox'});cb.checked=st.useBase;cb.addEventListener('change',e=>{st.useBase=e.target.checked;save()});
 const sr=h('input',{type:'number',min:'0.3',max:'0.95',step:'0.05',value:String(st.strength),style:'width:60px'});sr.addEventListener('change',e=>{st.strength=+e.target.value;save()});
 det.append(h('div',{style:'margin:4px 0'},h('label',{},cb,' 下絵を使う（img2img）　強さ '),sr));
 const as=h('input',{type:'checkbox'});as.checked=st.autoSave;as.addEventListener('change',e=>{st.autoSave=e.target.checked;save()});
 det.append(h('div',{style:'margin:4px 0'},h('label',{},as,' 自動保存（できた画像をこのブラウザがすぐダウンロードする）')));
 det.append(h('div',{},btn('保存済みの印を全部消す',()=>{if(confirm('このキャラクターの保存済みの印を消しますか？')){for(const j of js)delete st.done[j.file];save();draw()}},'#56606e')));
 root.append(det);
}
function mount(){if(root||!document.body)return;root=h('div',{id:'game5-nai-helper'});document.body.append(root);draw()}
const t=setInterval(()=>{if(document.body){clearInterval(t);mount()}},300);
xhr(SRC+'jobs.json','json').then(d=>{DATA=typeof d==='string'?JSON.parse(d):d;draw()}).catch(e=>note('一覧を読み込めません：'+e.message));
})();
