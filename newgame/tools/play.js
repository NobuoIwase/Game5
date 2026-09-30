// 実際のブラウザで 監査官室→依頼書→手渡し→潜行→報告→監査→翌日 を通しでクリックし、画面写真とエラーを出す
// 先に リポジトリ直下で npx http-server -p 8766 を起動しておく。 OUT=保存先 W=幅 H=高さ node newgame/tools/play.js
const {chromium}=require(process.env.PW||'/opt/node22/lib/node_modules/playwright');
const SP=(process.env.OUT||require('os').tmpdir())+'/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:+process.env.W||390,height:+process.env.H||844}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const talk=async(until)=>{for(let i=0;i<30;i++){ if(await p.$(until+':not(.hidden)')) return; const d=await p.$('#dlg:not(.hidden)'); if(d) await d.click(); await p.waitForTimeout(250);} };
await p.goto('http://localhost:8766/newgame/index.html');await p.waitForTimeout(500);
await p.click('#new');await p.waitForTimeout(400);await p.click('#dlg');await p.waitForTimeout(900);
await p.screenshot({path:SP+'v1_office.png',fullPage:true});
await talk('#menu');await p.screenshot({path:SP+'v2_menu.png',fullPage:true});
await p.click('#req');await p.waitForTimeout(200);
await p.click('.sc[data-v="1"]');await p.click('.lv[data-v="1"]');await p.click('.bs[data-v="0"]');await p.waitForTimeout(100);
await p.screenshot({path:SP+'v3_paper.png',fullPage:true});
await p.click('#go');await p.waitForTimeout(800);await talk('#hv');
await p.screenshot({path:SP+'v4_hand.png',fullPage:true});
await p.click('#go');await p.waitForTimeout(300);
for(let i=0;i<10;i++){ if(await p.$('#cv')) break; const d=await p.$('#dlg:not(.hidden)'); if(d) await d.click(); await p.waitForTimeout(500);}
await p.waitForTimeout(1500);
for(let i=0;i<5;i++){ const m=await p.$('#modal:not(.hidden) #ok'); if(!m) break; await m.click(); await p.waitForTimeout(300);}   // 入口の場面（法則・変生）を閉じる
await p.click('#auto');await p.click('#spd');await p.click('#spd');
await p.waitForTimeout(9000);await p.screenshot({path:SP+'v5_dive.png'});
for(let i=0;i<500;i++){
  const st=await p.evaluate(()=>{const d=G.debug.dive; if(!d) return 'done';
    for(let k=0;k<600;k++){ if(d.w.scene){return 'scene'} if(d.w.outcome||d.night) break; G.Field.step(d.w,1/30);} return d.night?'night':'run';});
  if(st==='scene'){ await p.click('#modal #ok'); }
  if(st==='night'){ await p.waitForTimeout(300); await p.click('#nx'); await p.click('#skip'); }
  if(st==='done') break;
  await p.waitForTimeout(40);
}
await p.waitForTimeout(800);
// 口頭報告：窓を押して進める。選択肢が出たら、最初の一回だけ「追及する」
let probed=false;
for(let i=0;i<400;i++){
  if(await p.$('#todoc')&&await p.$('#rdone:not(.hidden)')) break;
  const ch=await p.$$('#dlgc:not(.hidden) button');
  if(ch.length){ await ch[probed?ch.length-1:0].click(); if(!probed){probed=true;await p.screenshot({path:SP+'v6_report.png',fullPage:true});} }
  else { const d=await p.$('#dlg:not(.hidden)'); if(d) await d.click(); }
  await p.waitForTimeout(120);
}
await p.click('#todoc');await p.waitForTimeout(300);
const lines=await p.$$('.ds-line:not(.fixed)'); if(lines.length) await lines[lines.length-1].click();
await p.waitForTimeout(200);await p.screenshot({path:SP+'v6b_doc.png',fullPage:true});
await p.click('#ok');await p.waitForTimeout(200);await p.click('#ok2');await p.waitForTimeout(400);
for(let i=0;i<60;i++){ if(await p.$('#rechoice:not(.hidden)')||await p.$('h1')) { if(await p.$('#rechoice:not(.hidden)')){await p.click('#rec');await p.waitForTimeout(300);} break; } const d=await p.$('#dlg:not(.hidden)'); if(d) await d.click(); await p.waitForTimeout(150); }
await p.waitForTimeout(200);await p.click('#ok');await p.waitForTimeout(1500);await p.screenshot({path:SP+'v7_day2.png',fullPage:true});
console.log('errors',errs,'scrollW',await p.evaluate(()=>document.documentElement.scrollWidth));
await b.close();})();
