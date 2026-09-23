// Browser smoke test: loads the game, starts it, fast-forwards and saves screenshots.
// Usage: node tools/shot.js <outdir> [seconds=12] ; requires a static server on :8765
const {chromium}=require(process.env.PW||'playwright');
(async()=>{
  const out=process.argv[2]||'.',secs=+(process.argv[3]||12);
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
  const p=await b.newPage({viewport:{width:1200,height:1100}});
  const errs=[];p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
  p.on('requestfailed',r=>errs.push('reqfail: '+r.url()));p.on('response',r=>{if(r.status()>=400)errs.push(r.status()+': '+r.url())});
  await p.goto('http://localhost:8765/game/',{waitUntil:'networkidle'});
  await p.screenshot({path:out+'/0-start.png'});
  await p.click('#startBtn');
  for(let i=1;i<=3;i++){await p.waitForTimeout(secs*1000/3);await p.screenshot({path:`${out}/${i}-play.png`});}
  console.log(JSON.stringify({title:await p.title(),version:await p.evaluate(()=>state.version),room:await p.evaluate(()=>state.dungeon?.room),errs},null,1));
  await b.close();
})();
