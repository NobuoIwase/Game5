/** Validate shipped pixels and import metadata independently of the renderer.
 * Run after rendering: node tools/validate_exports.mjs
 * Exit 1 indicates a broken export; detailed evidence is in exports/validation.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
let cv;
try{cv=require('@napi-rs/canvas');}catch{
 const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'C:/Users/migig/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
 cv=require(path.join(runtime,'@napi-rs/canvas'));
}
const {createCanvas,loadImage}=cv;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'exports'),W=384,H=512,N=8;
const DIRS=['front','down_right','right','up_right','back','up_left','left','down_left'];
const PAIRS=[['right','left'],['down_right','down_left'],['up_right','up_left']];
const CHARACTER_IDS=['warrior','scout','witch','sister'];
const report={schema:'game5-export-validation/1.0',validated_at:new Date().toISOString(),pass:false,checks:0,issues:[],characters:{},source_views:{},gear:{},limitations:['Pixel checks establish complete, distinct frames and no exact reflected direction pairs. They do not judge drawing quality, joint seams, foot sliding, or equipment design fidelity. Visual review remains necessary.']};
const check=(ok,code,detail)=>{report.checks++;if(!ok)report.issues.push({code,...detail});return !!ok;};
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
async function pixels(file){
 const im=await loadImage(file),canvas=createCanvas(im.width,im.height),ctx=canvas.getContext('2d');ctx.drawImage(im,0,0);
 return {w:im.width,h:im.height,data:ctx.getImageData(0,0,im.width,im.height).data};
}
// Canonicalize fully transparent RGB: encoders can preserve arbitrary hidden RGB.
function hash(image,flip=false){
 const b=Buffer.allocUnsafe(image.w*image.h*4),a=image.data;
 for(let y=0;y<image.h;y++)for(let x=0;x<image.w;x++){
  const i=(y*image.w+x)*4,j=(y*image.w+(flip?image.w-1-x:x))*4;
  if(a[j+3]===0){b[i]=b[i+1]=b[i+2]=b[i+3]=0;}else{b[i]=a[j];b[i+1]=a[j+1];b[i+2]=a[j+2];b[i+3]=a[j+3];}
 }
 return crypto.createHash('sha256').update(b).digest('hex');
}
function bounds(image){
 let minX=image.w,minY=image.h,maxX=-1,maxY=-1,visible=0,transparent=0,edge=0;
 for(let y=0;y<image.h;y++)for(let x=0;x<image.w;x++){
  const alpha=image.data[(y*image.w+x)*4+3];if(alpha===0)transparent++;
  if(alpha>8){visible++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);if(x===0||x===image.w-1||y===0||y===image.h-1)edge++;}
 }
 return {bounds:[minX,minY,maxX,maxY],visible_pixels:visible,transparent_pixels:transparent,edge_pixels:edge,minimum_margin:visible?Math.min(minX,minY,image.w-1-maxX,image.h-1-maxY):null};
}
function sheetDifference(sheet,frame,col,row){
 let relevant=0,changed=0,maxChannelDifference=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=(y*W+x)*4,j=((row*H+y)*sheet.w+col*W+x)*4;
  if(frame.data[i+3]<=8&&sheet.data[j+3]<=8)continue;
  relevant++;let delta=0;
  for(let k=0;k<4;k++)delta=Math.max(delta,Math.abs(frame.data[i+k]-sheet.data[j+k]));
  maxChannelDifference=Math.max(maxChannelDifference,delta);if(delta>3)changed++;
 }
 return {relevant_pixels:relevant,changed_pixels:changed,changed_fraction:changed/Math.max(1,relevant),max_channel_difference:maxChannelDifference};
}
function crop(image,x,y,w,h){
 const data=new Uint8ClampedArray(w*h*4);
 for(let r=0;r<h;r++)data.set(image.data.subarray(((y+r)*image.w+x)*4,((y+r)*image.w+x+w)*4),r*w*4);
 return {w,h,data};
}
async function character(id){
 const result={frames:0,sheets:{},cycles:{},left_pairs:[],minimum_margin:Infinity};report.characters[id]=result;
 for(const motion of ['walk','run']){
  const file=path.join(OUT,id,motion+'.png');
  if(!check(fs.existsSync(file),'missing_sheet',{file:rel(file)}))continue;
  const sheet=await pixels(file),validSheet=check(sheet.w===W*N&&sheet.h===H*N,'sheet_dimensions',{file:rel(file),actual:[sheet.w,sheet.h],expected:[W*N,H*N]});
  result.sheets[motion]={dimensions:[sheet.w,sheet.h],sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')};
  const rows={};
  for(const [row,direction] of DIRS.entries()){
   const folder=path.join(OUT,id,motion,direction),cycle={frames:[],unique_frames:0};result.cycles[motion+'/'+direction]=cycle;rows[direction]=[];
   if(!check(fs.existsSync(folder),'missing_direction',{folder:rel(folder)}))continue;
   const filenames=fs.readdirSync(folder).filter(f=>/\.png$/i.test(f)).sort(),expected=Array.from({length:N},(_,f)=>String(f).padStart(2,'0')+'.png');
   check(JSON.stringify(filenames)===JSON.stringify(expected),'frame_sequence',{folder:rel(folder),actual:filenames,expected});
   for(let f=0;f<N;f++){
    const frameFile=path.join(folder,expected[f]);if(!check(fs.existsSync(frameFile),'missing_frame',{file:rel(frameFile)}))continue;
    const im=await pixels(frameFile),b=bounds(im);result.frames++;
    const correctSize=check(im.w===W&&im.h===H,'frame_dimensions',{file:rel(frameFile),actual:[im.w,im.h]});
    check(b.visible_pixels>500,'empty_or_degenerate_frame',{file:rel(frameFile),visible_pixels:b.visible_pixels});
    check(b.transparent_pixels>0,'missing_alpha',{file:rel(frameFile)});
    check(b.edge_pixels===0,'canvas_edge_clipping',{file:rel(frameFile),...b});
    result.minimum_margin=Math.min(result.minimum_margin,b.minimum_margin??Infinity);
    const frameHash=hash(im),flippedHash=hash(im,true);rows[direction].push({frame:f,hash:frameHash,flippedHash});
    const evidence={frame:f,sha256_pixels:frameHash,...b};
    if(correctSize&&validSheet){
     evidence.sheet_match=sheetDifference(sheet,im,f,row);
     // Accommodate only premultiplication/PNG round-off, not different artwork.
     check(evidence.sheet_match.changed_fraction<.001,'sheet_tile_mismatch',{file:rel(frameFile),sheet:rel(file),column:f,row,...evidence.sheet_match});
    }
    cycle.frames.push(evidence);
   }
   cycle.unique_frames=new Set(cycle.frames.map(f=>f.sha256_pixels)).size;
   check(cycle.unique_frames===N,'frozen_or_repeated_cycle',{character:id,motion,direction,unique_frames:cycle.unique_frames,expected:N});
  }
  for(const [right,left] of PAIRS)for(let f=0;f<N;f++){
   const a=rows[right]?.find(x=>x.frame===f),b=rows[left]?.find(x=>x.frame===f);if(!a||!b)continue;
   const reflected=a.flippedHash===b.hash;
   check(!reflected,'mirrored_export_direction',{character:id,motion,right,left,frame:f});
   result.left_pairs.push({motion,right,left,frame:f,pixel_exact_reflection:reflected});
  }
 }
 check(result.frames===128,'character_frame_total',{character:id,actual:result.frames,expected:128});
 if(!Number.isFinite(result.minimum_margin))result.minimum_margin=null;
}
async function sourceViews(registryPath){
 const reg=read(registryPath),file=path.join(ROOT,reg.source),im=await pixels(file),cw=im.w/4,ch=im.h/2;
 if(!check(Number.isInteger(cw)&&Number.isInteger(ch),'source_grid',{file:rel(file),dimensions:[im.w,im.h]}))return;
 const views=DIRS.map((direction,i)=>{const cell=crop(im,i%4*cw,Math.floor(i/4)*ch,cw,ch);return {direction,hash:hash(cell),flippedHash:hash(cell,true),...bounds(cell)};});
 const evidence={file:rel(file),cell_dimensions:[cw,ch],views,unique_cells:new Set(views.map(v=>v.hash)).size,compared_pairs:0};
 report.source_views[registryPath]=evidence;
 check(evidence.unique_cells===8,'duplicate_source_directions',{file:rel(file),unique_cells:evidence.unique_cells});
 for(let a=0;a<8;a++)for(let b=a+1;b<8;b++){
  evidence.compared_pairs++;
  check(views[a].flippedHash!==views[b].hash,'mirrored_source_directions',{file:rel(file),direction_a:DIRS[a],direction_b:DIRS[b]});
 }
}
function equipment(){
 const reg=read('rigs/warrior-gear.json'),expected={sword:{side:'right',attach:'wrist_right'},shield:{side:'left',attach:'wrist_left'},scabbard:{side:'left',attach:'hip_left'}};
 for(const d of DIRS){
  const parts=reg.views[d]||[];report.gear[d]=parts.map(p=>({id:p.id,side:p.side,attach:p.attach}));
  for(const [id,want] of Object.entries(expected)){
   const found=parts.filter(p=>p.id===id);
   check(found.length===1,'gear_missing_or_duplicated',{direction:d,id,count:found.length});
   for(const p of found)check(p.side===want.side&&p.attach===want.attach,'anatomical_equipment_side',{direction:d,id,actual:{side:p.side,attach:p.attach},expected:want});
  }
 }
}
function additionalRigs(){
 for(const id of ['witch','sister']){
  const reg=read('rigs/'+id+'.json');
  check(fs.existsSync(path.join(ROOT,reg.source)),'new_character_source',{character:id,source:reg.source});
  for(const direction of DIRS){
   const view=reg.views?.[direction],legs=view?.legs||[];
   check(!!view&&Array.isArray(view.root)&&view.root.length===2,'new_character_view',{character:id,direction});
   check(legs.length===2&&new Set(legs.map(p=>p.side)).size===2&&legs.every(p=>['left','right'].includes(p.side)),'new_character_anatomical_legs',{character:id,direction,sides:legs.map(p=>p.side)});
   for(const leg of legs){
    check(leg.copyFrom||['hip','knee','ankle'].every(j=>Array.isArray(leg[j])&&leg[j].length===2&&leg[j].every(Number.isFinite)),'new_character_leg_joints',{character:id,direction,side:leg.side});
    const donor=leg.copyFrom?legs.find(p=>p.side===leg.copyFrom&&!p.copyFrom):null;
    check(Array.isArray(leg.polygon)&&(leg.polygon.length>=3||(leg.polygon.length===0&&donor?.polygon?.length>=3)),'new_character_leg_mask',{character:id,direction,side:leg.side});
   }
  }
 }
}
try{
 const manifest=read('exports/manifest.json');
 check(JSON.stringify(manifest.directions)===JSON.stringify(DIRS),'manifest_direction_order',{actual:manifest.directions,expected:DIRS});
 check(manifest.frame_width===W&&manifest.frame_height===H&&manifest.frames_per_cycle===N,'manifest_dimensions',{actual:[manifest.frame_width,manifest.frame_height,manifest.frames_per_cycle],expected:[W,H,N]});
 check(manifest.alpha===true,'manifest_alpha',{actual:manifest.alpha});
 for(const [id,ms] of [['walk',120],['run',80]])check(manifest.motions?.find(m=>m.id===id)?.frame_ms===ms,'motion_timing',{motion:id,expected:ms});
 check(CHARACTER_IDS.every(id=>manifest.characters?.filter(c=>c.id===id).length===1),'manifest_characters',{actual:manifest.characters,expected:CHARACTER_IDS});
 check(manifest.revision===6,'manifest_revision',{actual:manifest.revision,expected:6});
 for(const id of CHARACTER_IDS)await character(id);
 equipment();
 additionalRigs();
 await sourceViews('rigs/warrior.json');
 await sourceViews('rigs/warrior-gear.json');
 for(const id of ['witch','sister'])await sourceViews('rigs/'+id+'.json');
}catch(error){report.issues.push({code:'validation_exception',message:error.message,stack:error.stack});}
report.pass=report.issues.length===0;
report.total_frames=Object.values(report.characters).reduce((n,c)=>n+c.frames,0);
fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(`${report.pass?'PASS':'FAIL'}: ${report.total_frames} character frames, ${report.checks} checks, ${report.issues.length} issues. Evidence: exports/validation.json`);
for(const issue of report.issues.slice(0,12))console.error(JSON.stringify(issue));
if(report.issues.length>12)console.error(`... ${report.issues.length-12} more issues in validation.json`);
process.exitCode=report.pass?0:1;
