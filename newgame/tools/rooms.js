// 部屋を表示した実ブラウザの描画時間と入室前後。先にポート8766で配信する。
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
  const out = process.env.OUT || require('node:os').tmpdir(); fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch(process.env.CHROMIUM === '' ? {} : {executablePath:process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
  try {
    const p = await browser.newPage({viewport:{width:390,height:844}}), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
    if(process.env.RENDER) await p.route('**/js/render.js',route=>route.fulfill({path:path.resolve(process.env.RENDER),contentType:'text/javascript'}));
    await p.goto('http://127.0.0.1:8766/newgame/index.html');
    await p.click('#new');
    const talk = async target => { for(let i=0;i<80;i++) { if(await p.locator(target).isVisible()) return; if(await p.locator('#dlg').isVisible()) await p.click('#dlg'); await p.waitForTimeout(100); } throw Error(target); };
    await talk('#req'); await p.click('#req'); await p.click('#go'); await talk('#hv'); await p.click('#go'); await talk('#cv');
    for(let i=0;i<8;i++) { if(!await p.locator('#modal:not(.hidden) #ok').isVisible()) break; await p.click('#modal:not(.hidden) #ok'); await p.waitForTimeout(100); }
    const fixture = await p.evaluate(() => {
      const d=G.debug.dive; cancelAnimationFrame(d.raf); d.paused=true;
      // 以前の階の見出し・メッセージは、固定した検証用の部屋とは無関係。
      for(const id of ['ov','msgwin']) document.getElementById(id).classList.add('hidden');
      G.U.setSeed(91);
      d.run.dungeon='vine'; d.run.floor=7;
      d.w=G.Game.makeFloor(d.run);
      const w=d.w, r=w.map.rooms.find(r=>r.w>=5&&r.h>=4);
      w.trapRooms=[]; w.monsters=[]; w.traps=[];
      G.F.makeTrapRoom(w,r,'tent_pit');
      const room=w.trapRooms[0];
      w.run.h.x=room.x-0.5; w.run.h.y=room.cy; w.run.h.bubble=null; w.scene=null; w.map.seen.fill(1);
      d.cam={x:room.cx,y:room.cy,scale:40};
      window.roomFixture=room;
      return {key:room.key,x:room.x,y:room.y,w:room.w,h:room.h,canvas:[document.querySelector('#cv').width,document.querySelector('#cv').height]};
    });
    await p.waitForTimeout(1000);
    async function draw() { await p.evaluate(()=>{const d=G.debug.dive;G.Render.draw(document.querySelector('#cv').getContext('2d'),d.w,d.cam,d);}); }
    await draw(); await p.waitForTimeout(300); await draw();
    await p.locator('#cv').screenshot({path:path.join(out,'room-before.png')});
    const measure=async()=>p.evaluate(()=>{
      const d=G.debug.dive,ctx=document.querySelector('#cv').getContext('2d'),samples=[];
      for(let i=0;i<80;i++) G.Render.draw(ctx,d.w,d.cam,d);
      for(let b=0;b<15;b++){const start=performance.now();for(let i=0;i<40;i++)G.Render.draw(ctx,d.w,d.cam,d);samples.push((performance.now()-start)/40);}
      samples.sort((a,b)=>a-b);return {medianMs:+samples[7].toFixed(3),p95Ms:+samples[14].toFixed(3),frames:600};
    });
    const inactive=await measure();
    await p.evaluate(()=>{const d=G.debug.dive,r=window.roomFixture;d.w.run.h.x=r.x+0.5;G.F.enterTrapRoom(d.w,r);d.w.t+=1;});
    await draw(); await p.locator('#cv').screenshot({path:path.join(out,'room-after.png')});
    const active=await measure();
    const states=await p.evaluate(()=>({active:roomFixture.active,fill:roomFixture.fill??0,skin:roomFixture.T.skin??null}));
    if(states.skin && !process.env.RENDER) {
      const visual=await p.evaluate(()=>{
        const d=G.debug.dive,ctx=document.querySelector('#cv').getContext('2d'),room=roomFixture;
        const counts=[],original=ctx.drawImage;let count=0;
        ctx.drawImage=function(im,...args){if(im.src&&im.src.includes('room_tentacle_deco'))count++;return original.call(this,im,...args);};
        for(const fill of [0,0.5,1]){room.fill=fill;count=0;G.Render.draw(ctx,d.w,d.cam,d);counts.push(count);if(room.fill!==fill)throw Error('fill mutated');}
        count=0;G.Render.draw(ctx,d.w,{x:-100,y:-100,scale:40},d);const offscreen=count;ctx.drawImage=original;
        delete room.fill;return {counts,offscreen};
      });
      assert.ok(visual.counts[2]>visual.counts[0]); assert.equal(visual.offscreen,0);
      console.log('visual',JSON.stringify(visual));
      await p.goto('http://127.0.0.1:8766/newgame/assets/index.html');
      for(const card of await p.locator('.room-card').all()) {
        await card.scrollIntoViewIfNeeded();await p.waitForTimeout(150);
        await card.locator('input').check();await card.locator('select').selectOption('1');
      }
      await p.locator('#rooms').screenshot({path:path.join(out,'room-gallery.png')});
      assert.equal(await p.locator('.room-card').count(),8);
    }
    assert.equal(states.active,true); assert.deepEqual(errors,[]);
    console.log(JSON.stringify({fixture,states,inactive,active,errors}));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
