// Checks the pictures ChatGPT (Astra) put in chatgpt/out/<char>/ before they are committed.
//   node tools/check_chatgpt_out.mjs [char]
// Each file must: have a name from chatgpt/jobs.json, be a real PNG, be square and at least 1024 px, have 8-bit RGB or
// RGBA colour (not a palette, i.e. not reduced to a few colours). It also lists the frames still missing.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'chatgpt','out');
const J=JSON.parse(fs.readFileSync(path.join(ROOT,'chatgpt','jobs.json'),'utf8'));
const only=process.argv[2];
const want=J.frames.filter(f=>!only||f.char===only),names=new Set(J.frames.map(f=>f.file));
const bad=[],ok=[];
for(const c of fs.existsSync(OUT)?fs.readdirSync(OUT):[]){
 if(only&&c!==only)continue;
 const dir=path.join(OUT,c);if(!fs.statSync(dir).isDirectory())continue;
 for(const n of fs.readdirSync(dir)){
  const p=path.join(dir,n),why=[];
  if(!names.has(n))why.push('名前が一覧にない');
  else if(!n.startsWith(c+'__'))why.push('フォルダとキャラクターが違う');
  const b=fs.readFileSync(p);
  if(b.length<33||b.readUInt32BE(0)!==0x89504e47||b.toString('latin1',12,16)!=='IHDR')why.push('PNG ではない');
  else{const w=b.readUInt32BE(16),h=b.readUInt32BE(20),depth=b[24],type=b[25];
   if(w!==h)why.push(`正方形でない ${w}x${h}`);
   if(Math.min(w,h)<1024)why.push(`小さい ${w}x${h}（縮小しない）`);
   if(type===3)why.push('パレット色（減色しない）');
   else if(type!==2&&type!==6)why.push('色の形式が RGB/RGBA でない');
   if(depth!==8)why.push(`ビット深度 ${depth}`);
   if(!b.includes(Buffer.from('IEND')))why.push('ファイルが途中で切れている');}
  (why.length?bad:ok).push(why.length?`${c}/${n}: ${why.join('、')}`:`${c}/${n}`);
 }
}
const have=new Set(ok.map(x=>x.split('/')[1]));
const missing=want.filter(f=>!have.has(f.file));
console.log(`OK ${ok.length}枚 / NG ${bad.length}枚 / まだ ${missing.length}枚（全${want.length}枚）`);
for(const x of bad)console.log('NG',x);
const per={};for(const f of missing)per[f.batch]=(per[f.batch]||0)+1;
if(missing.length)console.log('まだの回:',Object.entries(per).map(([b,n])=>`${b}(${n})`).join(' '));
process.exit(bad.length?1:0);
