// The whole pictures that are made with NovelAI (V4.5 + Precise Reference) instead of ChatGPT: every "draw" frame
// of the restraint and scene motions (for each of the four heroines) and of the heroines' own motions that belong
// with them. For each frame it writes the pose-only base picture for img2img and a prompt made of plain words
// (the character, the view, the pose, the face, what holds her).
// The situation itself is not written here: the helper (nai/game5-nai-helper.user.js) adds the user's own words for
// each kind of scene, which live only in the user's browser.
//   node tools/build_nai_jobs.mjs      (after build_plan.mjs)
// Output: nai/jobs.json, nai/base/<motion>__<view>__<frame>.png (1024x1024), nai/guide/<same>.png (where she is held, for the
// user only; never sent) and nai/scenes.html (what each scene is, in Japanese)
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {library as R} from '../motion/restraint.mjs';import {library as S} from '../motion/scenes.mjs';import {library as H} from '../motion/heroines.mjs';
import {run} from './mannequin_svg.mjs';import {MOTION_JA,SIT_HINT} from './nai_scene_ja.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'nai'),BASE=path.join(OUT,'base'),GUIDE=path.join(OUT,'guide');
const PLAN=JSON.parse(fs.readFileSync(path.join(ROOT,'motion','plan.json'),'utf8')).frames;

/* the kinds of scene: the user writes their own words for each, once */
export const SITUATIONS={
 bound:'拘束されている（腕・脚を縛られる、前屈みで縛られる）',
 bound_rock:'拘束されたまま揺さぶられる',
 pinned:'床に押し倒される・押さえつけられる',
 pinned_rock:'押さえつけられたまま揺さぶられる',
 held:'後ろから抱えられる',
 kiss:'口づけ',
 clinger:'小さな生き物に張り付かれる',
 engulf:'柔らかい塊に呑まれる',
 wrap:'胴に巻きつかれる',
 grabbed:'足首・尻尾などをつかまれる、引きずられる',
 trance:'ぼんやりする・催眠・胞子・泡',
 tempt:'誘う姿勢',
 endure:'声を出さずに耐える',
 exposure:'前垂れがめくれかける',
 climax:'こわばり・絶頂の頂点',
 afterglow:'余韻でぐったりする',
 recover:'余韻から起き上がる',
 defeat:'倒れる・敗北',
};
const SIT={
 arms_behind_squirm:'bound',arms_behind_wrench:'bound',elbows_up_strain:'bound',legs_pulled_open:'bound',legs_held_open:'bound',bent_over:'bound',chain_splay:'bound',mage_arms_bound:'bound',
 hip_rock_spread:'bound_rock',hip_rock_closed:'bound_rock',bounce_spread:'bound_rock',bounce_hung:'bound_rock',
 down_fall_back:'pinned',down_pinned_kick:'pinned',down_pinned_spread:'pinned',down_face_down:'pinned',down_hips_up:'pinned',down_pinned_rock:'pinned_rock',
 held_from_behind:'held',kiss_forced:'kiss',kiss_respond:'kiss',clinger_peel:'clinger',clinger_accept:'clinger',
 engulf_sink:'engulf',engulf_struggle:'engulf',engulf_rock:'engulf',wrap_squeeze:'wrap',
 ankle_grabbed:'grabbed',edge_pull:'grabbed',grabbed_flinch:'grabbed',break_free:'grabbed',scout_tail_grabbed:'grabbed',
 walk_unsteady:'trance',gaze_trance:'trance',spore_inhale:'trance',daze_sway:'trance',reach_toward:'trance',bubble_float:'trance',shiver_hug:'trance',
 tempt_pose:'tempt',mage_suppress:'endure',healer_panel_catch:'exposure',
 tension_tiptoe:'climax',tension_arch:'climax',tension_free:'climax',kiss_tension:'climax',clinger_tension:'climax',down_tension:'climax',engulf_tension:'climax',wrap_tension:'climax',
 scout_tension:'climax',mage_suppress_tension:'climax',healer_tension_refuse:'climax',
 afterglow_spread:'afterglow',afterglow_slump:'afterglow',sit_afterglow:'afterglow',down_afterglow:'afterglow',kiss_afterglow:'afterglow',clinger_afterglow:'afterglow',
 recover_spread:'recover',recover_slump:'recover',get_up:'recover',down_recover:'recover',sit_recover:'recover',kiss_recover:'recover',clinger_recover:'recover',
 trip_fall:'defeat',defeat_collapse:'defeat',
};
/* the heroines' own motions that go to NovelAI with the scenes (the rest stay with ChatGPT) */
export const HEROINE_NAI=['scout_tail_grabbed','scout_tension','mage_suppress','mage_suppress_tension','mage_arms_bound','healer_panel_catch','healer_tension_refuse'];

/* the four heroines: plain words for how each looks (Precise Reference carries the rest) */
export const CHARACTERS={
 aria:{label:'アリア（戦士）',tags:'orange hair, high ponytail, heavy bangs, grey-blue eyes, dark brown leather armor bodysuit, blue sleeves, black thighhighs, silver armored boots, silver gauntlets'},
 scout:{label:'斥候（シーフ）',tags:'fennec fox girl, very large fox ears, fox tail with peach-pink tip, short pale blond hair with peach-pink tips, red eyes, large backpack with a rolled bedroll on top'},
 mage:{label:'魔法使い',tags:'witch, very long wavy pale lavender hair, violet eyes, huge black pointed witch hat with magenta band, long coat, mechanical prosthetic forearms, metal hands'},
 healer:{label:'ヒーラー',tags:'elf, long pointy ears, long straight dark grey hair, blunt bangs, braid, white and gold cleric outfit, two narrow hanging cloth panels in front of her chest, long white gloves, white thighhighs'},
};
const COMMON='1girl, solo, adult, mature female, full body, simple background, white background';
export const NEGATIVE='child, loli, young, text, watermark, signature, frame, border, cropped, out of frame, multiple views, extra limbs, extra arms, extra legs, mannequin, doll joints, grid, blood, gore, injury, wound, crying in pain, egg, pregnant, birth, insect, bug, zoophilia';
const VIEW={front:'from front, facing viewer',down_right:'three-quarter view',down_left:'three-quarter view',right:'from side, profile',left:'from side, profile',up_right:'from behind, three-quarter view, looking away',up_left:'from behind, three-quarter view, looking away',back:'from behind'};

const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const FLOOR=240;   // the toes of a standing figure (world y grows downward)
/* plain words for the pose, read from the skeleton */
function poseTags(fr){
 const W=k=>fr.joints[k].world,t=[];
 const up=norm(sub(W('neck'),W('root'))),fwd=norm(cross(sub(W('neck'),W('root')),sub(W('shoulder_left'),W('shoulder_right')))),vert=-up[1];
 const knees=['knee_left','knee_right'].map(k=>FLOOR-W(k)[1]),hip=FLOOR-W('root')[1];
 if(vert>.75){
  if(hip<22)t.push('sitting on the floor');
  else if(Math.min(...knees)<14&&hip<52)t.push(Math.max(...knees)<14?'kneeling':'on one knee');
  else if(hip<46)t.push('squatting');
  else t.push('standing');
 }else if(vert<.35){
  const hipsUp=W('root')[1]<W('thorax')[1]-8;
  if(hip>40&&Math.min(...knees)>20)t.push('bent over, standing');
  else if(fwd[1]<-.5)t.push('lying on back');else if(fwd[1]>.5)t.push(Math.max(...knees)<14&&hip>30?(hipsUp?'all fours, hips up':'all fours'):'lying on stomach');else t.push('lying on side');
 }else t.push(up[1]<0&&hip>40?'bent over, leaning forward':'leaning back, half lying');
 // along the trunk, so it reads the same standing or lying
 const wr=['wrist_left','wrist_right'],reach=dot(sub(W('head'),W('neck')),up);
 const upN=wr.filter(k=>dot(sub(W(k),W('neck')),up)>reach).length;if(upN===2)t.push('arms up');else if(upN===1)t.push('one arm up');
 const behind=wr.filter(k=>dot(sub(W(k),W('thorax')),fwd)<-4).length;if(behind===2&&upN===0&&vert>.35)t.push('arms behind back');
 if(Math.hypot(...sub(W('knee_left'),W('knee_right')))>44)t.push('spread legs');
 const ph=(fr.phase||'').toLowerCase();
 if(/arch/.test(ph))t.push('arched back');if(/tiptoe|on her toes/.test(ph))t.push('on tiptoes');if(/curl/.test(ph))t.push('curled up');if(/look(s)? down/.test(ph))t.push('looking down');
 return t;
}
const EXPR=(e,look)=>{const s=(e||'').split('-'),t=[];if(s.includes('shut'))t.push(s.includes('line')?'eyes squeezed shut':'closed eyes');
 if(s.includes('o'))t.push(look==='mage'?'closed mouth, biting lip':'open mouth');else if(s.includes('line'))t.push('closed mouth, clenched teeth');return t};
const JN={wrist_left:'wrist',wrist_right:'wrist',ankle_left:'ankle',ankle_right:'ankle',knee_left:'knee',knee_right:'knee',root:'waist',thorax:'torso',waist:'waist',neck:'neck',chest_left:'chest',chest_right:'chest',groin:'lower body',crotch:'lower body',belly:'belly',elbow_left:'elbow',elbow_right:'elbow'};
// what holds her is left out of the words (an unnamed "tentacle" or "rope" comes out in any colour and kind):
// only what it does to her pose is said. The user's own words per kind of scene can add it, with its look.
function holdTags(fr,look){
 const t=new Set();
 for(const b of fr.binds||[])if(b.joint&&b.joint2&&JN[b.joint])t.add(`${JN[b.joint]}s together`);
 return[...t];
}
const HOLDER=/restrain|coil|\bmass\b|bound|bind|tentacl|vine|rope|chain|slime|blob|creature|bubble|partner|monster|kiss|the other\b|\bit\b/i;
const noteOf=ph=>ph.replace(/^[^\x00-\x7f]\S*\s*/,'').split(/[,;:]/).map(x=>x.trim()).filter(x=>x&&!HOLDER.test(x)).join(', ');

const sets=[['restraint',R()],['scene',S()],['heroine',H()]];
for(const d of [BASE,GUIDE]){fs.mkdirSync(d,{recursive:true});for(const f of fs.readdirSync(d))fs.unlinkSync(path.join(d,f))}
const frames=[],svgs=[],guides=[];
for(const [kind,lib] of sets)for(const [m,byDir] of Object.entries(lib.poses)){
 if(kind==='heroine'&&!HEROINE_NAI.includes(m))continue;
 const meta=lib.motions[m];
 for(const [v,F] of Object.entries(byDir)){const p=PLAN[m]?.[v];if(!p)continue;
  const figs=run(F.map(fr=>({...fr,binds:[]})));   // the base picture shows her pose only, nothing holding her
  const held=run(F);                               // the guide picture: with what holds her, for the user to read
  p.forEach((e,i)=>{if(e.use!=='draw')return;const fr=F[i],id=`${m}__${v}__${i}`,look=meta.look||null,peak=/^頂点/.test(fr.phase||'');
   const sit=[SIT[m]||'defeat'];if(peak&&sit[0]!=='climax')sit.push('climax');
   frames.push({id,motion:m,view:v,frame:i,label:meta.label,phase:fr.phase||'',look,chars:look?[look]:Object.keys(CHARACTERS),situations:sit,
    prompt:[VIEW[v],...poseTags(fr),...EXPR(fr.expr,look),...holdTags(fr,look)].join(', '),
    note:noteOf(fr.phase||''),base:`base/${id}.png`,guide:`guide/${id}.png`,
    ja:MOTION_JA[m]||null,step:(/^[^\x00-\x7f…]\S*/.exec(fr.phase||'')||[''])[0]});
   // the base picture: the pose only, in skin-like colours so they do not bleed into the picture
   const g=figs[i].replace(/<ellipse [^>]*fill="#0a0f15"\/>/,'').replace(/#5ab6f0|#ee9d5a|#b6c2cc|#d2dbe1|#e1e8ec/gi,'#f2dccd').replace(/#637487|#9fb0bd|#246a9e/gi,'#d8bba8');
   guides.push([id,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="24 18 240 240" width="320" height="320"><rect x="24" y="18" width="240" height="240" fill="#ffffff"/>${held[i]}</svg>`]);
   svgs.push([id,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="24 18 240 240" width="1024" height="1024"><rect x="24" y="18" width="240" height="240" fill="#ffffff"/>${g}</svg>`]);
  });
 }
}
// the pictures (Chromium via Playwright)
const tmp=path.join(OUT,'.svg');fs.mkdirSync(tmp,{recursive:true});for(const [id,s] of svgs)fs.writeFileSync(path.join(tmp,id+'.svg'),s);
const req=createRequire(import.meta.url),pw=req(execSync('npm root -g').toString().trim()+'/playwright');
const b=await pw.chromium.launch(),pg=await b.newPage({viewport:{width:1024,height:1024}});
for(const [id] of svgs){await pg.goto('file://'+path.join(tmp,id+'.svg'));await pg.screenshot({path:path.join(BASE,id+'.png')})}
for(const [id,s] of guides)fs.writeFileSync(path.join(tmp,id+'.g.svg'),s);
await pg.setViewportSize({width:320,height:320});
for(const [id] of guides){await pg.goto('file://'+path.join(tmp,id+'.g.svg'));await pg.screenshot({path:path.join(GUIDE,id+'.png')})}
await b.close();fs.rmSync(tmp,{recursive:true});
const jobs=[];for(const c of Object.keys(CHARACTERS))for(const f of frames)if(f.chars.includes(c))jobs.push({char:c,frame:f.id,file:`${c}__${f.id}.png`});
fs.writeFileSync(path.join(OUT,'jobs.json'),JSON.stringify({version:new Date().toISOString().slice(0,10),size:[1024,1024],common:COMMON,negative:NEGATIVE,
 characters:CHARACTERS,situations:SITUATIONS,hints:SIT_HINT,frames:Object.fromEntries(frames.map(f=>[f.id,f])),jobs},null,1));
const per={};for(const j of jobs)per[j.char]=(per[j.char]||0)+1;
console.log(frames.length,'frames,',jobs.length,'jobs',per);

/* nai/scenes.html: every kind of scene, its motions and frames, in Japanese (for the user who writes the words) */
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const VJ={front:'正面',right:'真横',left:'真横',down_right:'斜め前',down_left:'斜め前',up_right:'斜め後ろ',up_left:'斜め後ろ',back:'後ろ'};
const CL=Object.fromEntries(Object.entries(CHARACTERS).map(([k,c])=>[k,c.label]));
let body='';
for(const [s,label] of Object.entries(SITUATIONS)){
 const fs_=frames.filter(f=>f.situations.includes(s));if(!fs_.length)continue;
 const ms=[...new Set(fs_.map(f=>f.motion))];
 body+=`<section id="${s}"><h2>${esc(label)} <small>${fs_.length}コマ</small></h2><p class="hint">この欄に書くこと：<b>${esc(SIT_HINT[s]||'')}</b></p>`;
 for(const m of ms){const mf=fs_.filter(f=>f.motion===m),f0=mf[0];
  const J=f0.ja||{};
  body+=`<article><h3>${esc(f0.label)}</h3><table>${[['体勢',J.body],['腕',J.arms],['脚',J.legs],['押さえ',J.held],['動き',J.move]].map(([k,v])=>`<tr><th>${k}</th><td>${esc(v||'')}</td></tr>`).join('')}</table><p class="meta">描くキャラクター：${f0.chars.map(c=>CL[c]).join('・')}</p><div class="row">`;
  for(const f of mf)body+=`<figure><img loading="lazy" src="${f.guide}" alt=""><img loading="lazy" src="${f.base}" alt=""><figcaption>${VJ[f.view]||f.view}・${f.frame}コマ目${f.step?'：'+esc(f.step):''}<br><code>${esc(f.prompt)}</code></figcaption></figure>`;
  body+='</div></article>';
 }
 body+='</section>';
}
const toc=Object.entries(SITUATIONS).map(([s,l])=>{const n=frames.filter(f=>f.situations.includes(s)).length;return n?`<a href="#${s}">${esc(l)}（${n}）</a>`:''}).join('');
fs.writeFileSync(path.join(OUT,'scenes.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NovelAI 場面の説明</title><style>
:root{--bg:#f6f7f9;--fg:#1d232b;--sub:#5a6573;--card:#fff;--line:#d9dee5;--acc:#2f6fb3}
@media (prefers-color-scheme:dark){:root{--bg:#141a22;--fg:#e6edf3;--sub:#9fb0c0;--card:#1b2330;--line:#3a4658;--acc:#7fb4ea}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 system-ui,sans-serif}main{max-width:1100px;margin:0 auto;padding:16px}
h1{font-size:22px}h2{margin-top:36px;border-bottom:2px solid var(--acc);padding-bottom:4px}h2 small{color:var(--sub);font-weight:400;font-size:14px}
h3{margin:0 0 4px;font-size:17px}.hint{background:var(--card);border-left:4px solid var(--acc);padding:6px 10px}.meta{color:var(--sub);font-size:14px}
article{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin:12px 0}.row{display:flex;flex-wrap:wrap;gap:10px}
figure{margin:0;width:318px}figure img{width:150px;height:150px;border:1px solid var(--line);border-radius:4px;background:#fff}figure img+img{margin-left:6px}
table{border-collapse:collapse;margin:4px 0 6px}th{text-align:left;color:var(--sub);font-weight:400;padding:2px 14px 2px 0;white-space:nowrap;vertical-align:top}td{padding:2px 0}
figcaption{font-size:13px;color:var(--sub)}code{font-size:12px;word-break:break-word}nav a{display:inline-block;margin:2px 10px 2px 0}
</style></head><body><main><h1>NovelAI 場面の説明</h1>
<p><b>見方</b></p><ul><li>左の絵：<b>どこを押さえられているか</b>（色の線・塊）。読むだけの絵。NovelAI には送らない</li>
<li>右の絵：NovelAI に送る下絵（姿勢だけ）</li><li>英語：こちらで入れてある言葉（向き・姿勢・顔だけ）</li></ul>
<p><b>押さえているものの名前は、どこにも入れていない。</b>「押さえ」の所を何にするかを、あなたが「設定」の欄に書く。</p>
<nav>${toc}</nav>${body}</main></body></html>`);
