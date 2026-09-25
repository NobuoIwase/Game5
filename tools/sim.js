// Headless balance simulator for game/. Loads the same scripts as index.html
// into a stubbed DOM/canvas and runs full dungeon attempts at fixed dt.
// Usage: node tools/sim.js [runs=40] [--no-auto] [--intensity=easy|normal|hard] [--seed=N] [--jobs=N] [--set=<json balance override>]
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const GAME=path.join(__dirname,'..','game');
const args=process.argv.slice(2),RUNS=+(args.find(a=>/^\d+$/.test(a))||40),AUTO=!args.includes('--no-auto');
const seedArg=args.find(a=>a.startsWith('--seed='));
const setArg=args.find(a=>a.startsWith('--set='));
const OVERRIDE=setArg?JSON.parse(setArg.slice(6)):null;
function scripts(){
  const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
  return [...html.matchAll(/<script src="\.\/([^"]+)"/g)].map(m=>m[1]);
}
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function makeContext(seed){
  const noop=()=>{};
  const ctx2d=new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='measureText'?()=>({width:10}):k.startsWith('create')?()=>({addColorStop:noop}):k==='getImageData'?()=>({data:new Uint8ClampedArray(4)}):noop),set:(t,k,v)=>(t[k]=v,true)});
  const el=()=>{const e={style:{setProperty:noop},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},dataset:{},textContent:'',innerHTML:'',title:'',appendChild:noop,addEventListener:noop,setAttribute:noop,querySelector:()=>el(),querySelectorAll:()=>[],getContext:()=>ctx2d,getBoundingClientRect:()=>({left:0,top:0,width:960,height:540}),width:960,height:540,insertAdjacentHTML:noop,remove:noop,after:noop,insertBefore:noop,closest:()=>null,children:[]};return e};
  const els=new Map();
  const document={getElementById:id=>{if(!els.has(id))els.set(id,el());return els.get(id)},querySelector:()=>el(),querySelectorAll:()=>[],createElement:()=>el(),body:el(),head:el(),title:'',write:noop,addEventListener:noop,documentElement:el()};
  class Img{constructor(){this.complete=false;this.naturalWidth=0}set src(v){this._s=v}get src(){return this._s}}
  const Math2=Object.create(Math);
  if(seed!=null){const r=mulberry(seed);Math2.random=r}
  const g={console,document,Image:Img,Math:Math2,performance:{now:()=>g.__t*1000},requestAnimationFrame:noop,setTimeout:(f)=>{f();return 0},clearTimeout:noop,setInterval:()=>0,
    fetch:u=>{const f=path.join(GAME,String(u).replace(/^\.\//,'').split('?')[0]);const ok=fs.existsSync(f);return Promise.resolve({ok,json:()=>Promise.resolve(JSON.parse(fs.readFileSync(f,'utf8')))})},addEventListener:noop,removeEventListener:noop,CanvasRenderingContext2D:function(){},localStorage:{getItem:()=>null,setItem:noop},
    navigator:{},location:{search:''},__balanceOverride:OVERRIDE,innerWidth:1200,innerHeight:800,matchMedia:()=>({matches:false,addEventListener:noop}),__t:0};
  g.window=g;g.globalThis=g;g.self=g;
  return vm.createContext(g);
}
function load(ctx){
  // Top-level `function`/`const` in classic scripts share one global scope; emulate by concatenating.
  const list=scripts();
  let src='';
  const skip=(process.env.SIM_SKIP||'').split(',').filter(Boolean);   // SIM_SKIP=a.js,b.js: leave scripts out (bisecting)
  for(const f of list){
    if(skip.includes(f))continue;
    if(!fs.existsSync(path.join(GAME,f))){if(!globalThis.__warned){console.error('missing script (skipped like a 404):',f);globalThis.__warned=1}continue}
    let code=fs.readFileSync(path.join(GAME,f),'utf8');
    if(f==='battle-utera.js')code=fs.readFileSync(path.join(GAME,'battle-nutera.js'),'utf8');
    src+=`\n;// ---- ${f}\n`+code.replace(/'use strict';?/,'');
  }
  // attribute every SP loss to its caller so balance work has evidence
  src+=`\n;{const __d=drainSp;globalThis.__spLog={};drainSp=function(h,n,label=''){const before=h.sp;__d(h,n,label);const lost=before-h.sp;if(lost>0){const fr=(new Error().stack.split('\\n')[2]||'').trim().split(' ')[1]||'?';const k=label||fr;__spLog[k]=(__spLog[k]||0)+lost}}}`;
  src+=`\n;{const __r=resolveEnemy;globalThis.__hits={cast:0,hit:0,byKey:{}};resolveEnemy=function(c){const h=state.hero,e=state.enemy;const hit=!h.dead&&e.cast===c&&nuteraCastHitsHero(c,h);if(e.cast===c){__hits.cast++;if(hit)__hits.hit++;const k=(e.type||'?')+':'+c.key;const o=__hits.byKey[k]||={n:0,h:0};o.n++;if(hit){o.h++;const why=h.estella?.active?'estella':h.cast?'casting:'+h.cast.sk.kind:h.status.stun>0?'stun':h.status.bind>0?'bound':h.intent?.label==='回避'?'dodgeFail':'noReact';__hits.why=__hits.why||{};__hits.why[why]=(__hits.why[why]||0)+1}}return __r(c)}}`;
  src+=`\n;{const __h=hurtHero;globalThis.__hpLog={};hurtHero=function(h,d,st,m={}){const b=h.hp;const r=__h(h,d,st,m);const l=b-h.hp;if(l>0){const k=m.label||(m.sourceKey?'hit:'+m.sourceKey:(new Error().stack.split('\\n')[2]||'').trim().split(' ')[1]);__hpLog[k]=(__hpLog[k]||0)+l}return r}}`;
  src+=`\n;{const __l=log;globalThis.__ev={};const K={spin:/旋風斬/,cleanse:/清めの構え/,chest:/宝箱から/,mimicHit:/偽りの宝箱だった/,mimicSeen:/見破り/,tower:/催眠の塔を叩き壊した/,summon:/増援召喚/,elite:/普通の個体より/,autoPool:/AUTO指揮：粘沼/,autoTower:/AUTO指揮：催眠の塔/,autoMimic:/AUTO指揮：偽りの宝箱/};log=function(s){for(const k in K)if(K[k].test(s))__ev[k]=(__ev[k]||0)+1;return __l(s)}}`;
  src+=`\n;globalThis.__api={state,update,reset,get draw(){return draw},get finish(){return finish}};`;
  vm.runInContext(src,ctx,{filename:'game-bundle.js'});
  return ctx.__api;
}
async function runOnce(seed){
  const ctx=makeContext(seed),api=load(ctx),s=api.state;
  for(let k=0;k<6;k++)await new Promise(r=>setImmediate(r));   // let manifest/species fetches settle
  s.director.auto=AUTO;s.started=true;
  const ia=args.find(a=>a.startsWith('--intensity='));if(ia)s.director.intensity=ia.slice(12);
  const dt=1/60,maxT=+(process.env.SIM_MAXT||900);let t=0,roomT=[],lastRoom=0,roomStart=0,drawErr=null;
  const hpAtRoom=[],spAtRoom=[],estAtRoom=[];
  while(t<maxT&&!s.over){
    ctx.__t=t;if(process.env.SIM_DEBUG&&Math.round(t*60)%300===0)console.error('t',t.toFixed(0),'room',s.dungeon?.room,'pending',s.dungeon?.pending,'hero',Math.round(s.hero.x),Math.round(s.hero.y),s.hero.thought);api.update(dt);
    if(!drawErr&&Math.round(t*60)%30===0){try{api.draw()}catch(e){drawErr=e.message}}
    t+=dt;
    const r=s.dungeon?.room||0;
    if(r!==lastRoom){roomT.push(+(t-roomStart).toFixed(1));hpAtRoom.push(Math.round(s.hero.hp));spAtRoom.push(Math.round(s.hero.sp));roomStart=t;lastRoom=r}
  }
  const h=s.hero;
  return{win:s.over&&!h.dead&&!!s.dungeon?.complete,timeout:!s.over,room:(s.dungeon?.room||0)+1,time:+t.toFixed(1),
    reason:h.dead?h.defeatReason:s.over?'clear':'timeout',level:h.level,estella:h.estella?.count||0,roomT,hpAtRoom,spAtRoom,drawErr,
    pending:!!s.dungeon?.pending,ev:ctx.__ev,hp:ctx.__hpLog,hits:ctx.__hits,sp:ctx.__spLog,hero:{x:Math.round(h.x),y:Math.round(h.y),thought:h.thought}};
}
const base=seedArg?+seedArg.split('=')[1]:1;
const jobsArg=args.find(a=>a.startsWith('--jobs=')),JOBS=jobsArg?+jobsArg.slice(7):Math.min(8,require('os').cpus().length);
if(args.includes('--child')){
  (async()=>{const res=[];for(let i=0;i<RUNS;i++)res.push(await runOnce(base+i));process.stdout.write(JSON.stringify(res))})();return;
}
const {execFileSync,spawn}=require('child_process');
(async()=>{
const per=Math.ceil(RUNS/JOBS),parts=[];
for(let j=0;j<JOBS&&j*per<RUNS;j++){
  const n=Math.min(per,RUNS-j*per),a=args.filter(x=>!/^\d+$/.test(x)&&!x.startsWith('--seed=')&&!x.startsWith('--jobs='));
  parts.push(new Promise(ok=>{const c=spawn(process.execPath,[__filename,String(n),`--seed=${base+j*per}`,'--child',...a]);let out='';c.stdout.on('data',d=>out+=d);c.stderr.on('data',()=>{});c.on('close',()=>ok(JSON.parse(out||'[]')))}));
}
const res=(await Promise.all(parts)).flat();
if(process.env.SIM_DUMP)require('fs').writeFileSync(process.env.SIM_DUMP,JSON.stringify(res.map((r,i)=>({i,room:r.room,reason:r.reason,pending:r.pending,hero:r.hero,time:r.time}))));
summarize(res);
})();
function summarize(res){
const n=res.length,c=f=>res.filter(f).length;
const roomDist={};for(const r of res)roomDist[r.room]=(roomDist[r.room]||0)+1;
const reasons={};for(const r of res)reasons[r.reason]=(reasons[r.reason]||0)+1;
const avg=a=>a.length?+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):0;
const rt=[];for(const r of res)r.roomT.forEach((v,i)=>(rt[i]||=[]).push(v));
console.log(JSON.stringify({runs:n,auto:AUTO,winRate:+(c(r=>r.win)/n).toFixed(2),reasons,finalRoomDist:roomDist,
  avgTime:avg(res.map(r=>r.time)),avgEstella:avg(res.map(r=>r.estella)),avgLevel:avg(res.map(r=>r.level)),
  avgRoomClearSec:rt.map(avg),hpLossPerRun:(()=>{const o={};for(const r of res)for(const[k,v]of Object.entries(r.hp||{}))o[k]=(o[k]||0)+v/n;return Object.fromEntries(Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>[k,Math.round(v)]))})(),eventsPerRun:(()=>{const o={};for(const r of res)for(const[k,v]of Object.entries(r.ev||{}))o[k]=+((o[k]||0)+v/n).toFixed(2);return o})(),hitRate:+(res.reduce((a,r)=>a+r.hits.hit,0)/Math.max(1,res.reduce((a,r)=>a+r.hits.cast,0))).toFixed(2),castsPerMin:+(res.reduce((a,r)=>a+r.hits.cast,0)/res.reduce((a,r)=>a+r.time,0)*60).toFixed(1),hitByKey:(()=>{const o={};for(const r of res)for(const[k,v]of Object.entries(r.hits.byKey)){o[k]||={n:0,h:0};o[k].n+=v.n;o[k].h+=v.h}return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v.n+'/'+(v.h/v.n).toFixed(2)]))})(),hitWhy:(()=>{const o={};for(const r of res)for(const[k,v]of Object.entries(r.hits.why||{}))o[k]=(o[k]||0)+v;return o})(),drawErrors:[...new Set(res.map(r=>r.drawErr).filter(Boolean))],
  stuckPending:c(r=>r.timeout&&r.pending),spLossPerRun:(()=>{const o={};for(const r of res)for(const[k,v]of Object.entries(r.sp||{}))o[k]=(o[k]||0)+v/n;return Object.fromEntries(Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[k,Math.round(v)]))})(),sample:res.slice(0,3)},null,1));
}
