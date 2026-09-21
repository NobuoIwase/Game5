const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {createCanvas,Image}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const html=fs.readFileSync('plain-walk-v1/plain-walk-player.html','utf8'),els={};let downloaded=null,lastBlob=null;
function element(id){return {id,textContent:'',value:'',children:[],attrs:{},classList:{toggle(){}},append(x){this.children.push(x);},setAttribute(k,v){this.attrs[k]=v;},click(){if(this.onclick)this.onclick();else if(this.download)downloaded=this.download;}};}
for(const m of html.matchAll(/\bid="([^"]+)"/g))els[m[1]]=element(m[1]);
els['walk-data'].textContent=html.match(/<script id="walk-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
for(const id of ['front','side','partsFront','partsSide']){const c=createCanvas(id.startsWith('parts')?720:384,id.startsWith('parts')?405:512);els[id].canvas=c;els[id].width=c.width;els[id].height=c.height;els[id].getContext=()=>c.getContext('2d');}
const sb={console,Image,Blob,URL:{createObjectURL:b=>{lastBlob=b;return 'blob:test';},revokeObjectURL(){}},setTimeout,performance,matchMedia:()=>({matches:true}),requestAnimationFrame:f=>{sb.tick=f;},document:{getElementById:id=>els[id],createElement:tag=>element(tag)}};
vm.createContext(sb);for(const s of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(s[1],sb);
setTimeout(async()=>{try{
 const png=id=>els[id].canvas.toBuffer('image/png');
 const first=png('side');els.step.click();assert(!first.equals(png('side')));
 const normal=png('side');els.joints.click();assert(!normal.equals(png('side')));
 els.parts.click();assert(els.parts.attrs['aria-pressed']==='true');
 const partStart=png('partsSide');els.frames.children[5].click();assert(!partStart.equals(png('partsSide')));
 fs.writeFileSync('plain-player-side-check.png',png('side'));fs.writeFileSync('plain-player-parts-check.png',png('partsSide'));
 const bent=png('side');els.bend.oninput({target:{value:'0'}});assert(!bent.equals(png('side')));assert(els.sideNear.textContent.includes('26°'));
 els.reset.click();assert(els.sideNear.textContent.includes('44°'));
 const moving=png('side');els.swing.oninput({target:{value:'0'}});assert(!moving.equals(png('side')));els.reset.click();
 els.speed.oninput({target:{value:'6'}});assert.equal(els.speedValue.textContent,'6.0 fps');
 els.save.click();assert.equal(downloaded,'walk-pose-06.json');const saved=JSON.parse(await lastBlob.text());assert.equal(saved.side.frame,5);assert.equal(saved.side.arms.near.elbow_flex,44);
 const phase=els.phase.textContent;els.play.click();sb.tick(performance.now()+400);assert.notEqual(phase,els.phase.textContent);
 console.log('PASS: shared Canvas renderer, frame stepping, play, skeleton, animated parts, elbow/swing controls, reset, FPS and JSON export.');
}catch(e){console.error(e);process.exitCode=1;}},150);
