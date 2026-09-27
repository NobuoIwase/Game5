// Checks the pictures ChatGPT (Astra) put in chatgpt/out/<char>/ before they are committed.
//   node tools/check_chatgpt_out.mjs [char]
// Two lists: chatgpt/jobs.json (attacks, skills, gestures) and chatgpt/scenes/jobs.json (scenes; frames Astra leaves out
// are listed in chatgpt/out/skipped.txt, one "<file name><tab><reason>" per line, and go to NovelAI).
// Each file must: have a name from a list, be a real PNG, be square and at least 1024 px, have 8-bit RGB or RGBA colour
// (not a palette, i.e. not reduced to a few colours), and not be cut off. It also lists what is still to do.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..'),CG=path.join(ROOT,'chatgpt'),OUT=path.join(CG,'out');
const only=process.argv[2];
const sets=[['1枚絵（攻撃・技・仕草）',path.join(CG,'jobs.json')],['場面',path.join(CG,'scenes','jobs.json')]]
 .filter(([,p])=>fs.existsSync(p)).map(([n,p])=>[n,JSON.parse(fs.readFileSync(p,'utf8')).frames]);
const names=new Set(sets.flatMap(([,fr])=>fr.map(f=>f.file)));
const skipped=new Map();
if(fs.existsSync(path.join(OUT,'skipped.txt')))for(const line of fs.readFileSync(path.join(OUT,'skipped.txt'),'utf8').split(/\r?\n/)){
 const [n,...r]=line.split('\t');if(n&&n.trim())skipped.set(n.trim(),r.join(' ').trim())}
const bad=[],ok=new Set();
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
  if(why.length)bad.push(`${c}/${n}: ${why.join('、')}`);else ok.add(n);
 }
}
for(const n of skipped.keys())if(!names.has(n))bad.push(`skipped.txt: ${n}: 名前が一覧にない`);
for(const [label,fr] of sets){
 const want=fr.filter(f=>!only||f.char===only);
 const done=want.filter(f=>ok.has(f.file)).length,skip=want.filter(f=>!ok.has(f.file)&&skipped.has(f.file)).length;
 const missing=want.filter(f=>!ok.has(f.file)&&!skipped.has(f.file));
 console.log(`${label}：OK ${done}枚 / 飛ばした ${skip}枚 / まだ ${missing.length}枚（全${want.length}枚）`);
 const per={};for(const f of missing)per[f.batch]=(per[f.batch]||0)+1;
 if(missing.length)console.log('  まだの回:',Object.entries(per).map(([b,n])=>`${b}(${n})`).join(' '));
}
for(const x of bad)console.log('NG',x);
process.exit(bad.length?1:0);
