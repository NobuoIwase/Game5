// Game4 の魔物を、Game4 自身の描画コード（js/render.js の drawBody）で PNG に描き出す。
// 使い方: Game4 のリポジトリの親フォルダで npx http-server -p 8767 -s -c-1 .  （別の窓で）
//         K=0.28 node export_game4_monsters.js <出力フォルダ> slime,slug,goblin,...
//         （光や範囲の輪が大きい種は K を小さく：pot は K=0.2、fluff・lurecap・peeper・gazer は K=0.14）
//         そのあと python3 trim_game4.py <出力フォルダ> で 256px に整えて assets/monsters へ置く。
const {chromium}=require(process.env.PW||'playwright');const fs=require('fs');
const IDS=process.argv[3].split(',');const OUT=process.argv[2];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(process.env.GAME4_URL||'http://localhost:8767/game4/index.html');await p.waitForTimeout(1500);
const K=+process.env.K||0.28;const res=await p.evaluate(async([IDS,K])=>{const out={};
 for(const id of IDS){const M=MONSTERS[id];const r=M.r||10;
  // 絵の広がりを測るため大きめのキャンバスに描き、あとで透明部分を切り詰める
  const S=512,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
  const k=S*K/r; g.translate(S/2,S*0.62); g.scale(k,k);
  const e={id,r,t:0.6,x:0,y:0,vx:0,vy:0,hp:M.hp||10,maxhp:M.hp||10,mhp:M.hp||10,vari:0,dir:1,face:1,orbitA:0,state:'idle',anim:0,seed:1,phase:0.3};
  try{drawBody(g,e);}catch(err){out[id]='ERR '+err.message;continue}
  out[id]=c.toDataURL('image/png');}
 return out;},[IDS,K]);
fs.mkdirSync(OUT,{recursive:true});
for(const [k,v] of Object.entries(res)){if(v.startsWith('ERR')){console.log(k,v);continue}fs.writeFileSync(`${OUT}/${k}.png`,Buffer.from(v.split(',')[1],'base64'))}
console.log('pageerrors',errs.slice(0,3));await b.close();})();
