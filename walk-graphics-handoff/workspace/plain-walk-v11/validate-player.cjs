const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;let canvas;try{canvas=require('@napi-rs/canvas');}catch(e){canvas=require(runtime+'/@napi-rs/canvas');}
const {createCanvas,Image}=canvas,html=fs.readFileSync(path.join(__dirname,'plain-walk-player.html'),'utf8'),els={};let downloaded=null,lastBlob=null;
function element(id){const classes=new Set();return {id,textContent:'',value:'',children:[],attrs:{},classList:{toggle(k,v){if(v)classes.add(k);else classes.delete(k);},contains:k=>classes.has(k)},append(x){this.children.push(x);},setAttribute(k,v){this.attrs[k]=v;},click(){if(this.onclick)this.onclick();else if(this.download)downloaded=this.download;}};}
for(const m of html.matchAll(/\bid="([^"]+)"/g))els[m[1]]=element(m[1]);
els['walk-data'].textContent=html.match(/<script id="walk-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
const data=JSON.parse(els['walk-data'].textContent),views=data.config.views;
for(const id of [...views,'partsCanvas']){const c=createCanvas(id==='partsCanvas'?720:384,id==='partsCanvas'?540:512);els[id].canvas=c;els[id].width=c.width;els[id].height=c.height;els[id].getContext=()=>c.getContext('2d');}
els.direction.value='all';els.partDirection.value='down_right';
const sb={console,Image,Blob,URL:{createObjectURL:b=>{lastBlob=b;return 'blob:test';},revokeObjectURL(){}},setTimeout,performance,matchMedia:()=>({matches:true}),requestAnimationFrame:f=>{sb.tick=f;},document:{getElementById:id=>els[id],createElement:tag=>element(tag)}};
vm.createContext(sb);for(const s of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(s[1],sb);
setTimeout(async()=>{try{
 const png=id=>els[id].canvas.toBuffer('image/png'),first=Object.fromEntries(views.map(v=>[v,png(v)]));
 els.step.click();for(const v of views)assert(!first[v].equals(png(v)),'Frame stepping: '+v);
 const normal=png('up_right');els.joints.click();assert(!normal.equals(png('up_right')));
 els.direction.value='new';els.direction.onchange();assert(els.card_front.classList.contains('hidden'));assert(!els.card_back.classList.contains('hidden'));
 els.direction.value='back';els.direction.onchange();assert(els.views.classList.contains('single'));assert(els.card_up_right.classList.contains('hidden'));
 els.direction.value='all';els.direction.onchange();for(const v of views)assert(!els['card_'+v].classList.contains('hidden'));
 els.parts.click();let before=png('partsCanvas');els.partDirection.value='back';els.partDirection.onchange();assert(!before.equals(png('partsCanvas')));
 els.frames.children[5].click();const bent=png('back');els.bend.oninput({target:{value:'0'}});assert(!bent.equals(png('back')));assert(els.angles_back.textContent.includes('26° / 26°'));
 els.reset.click();assert(els.angles_back.textContent.includes('42°'));
 const moving=png('down_right');els.swing.oninput({target:{value:'0'}});assert(!moving.equals(png('down_right')));els.reset.click();
 els.speed.oninput({target:{value:'6'}});assert.equal(els.speedValue.textContent,'6.0 fps');
 els.save.click();assert.equal(downloaded,'walk-pose-06.json');const saved=JSON.parse(await lastBlob.text());for(const v of views){assert.equal(saved[v].frame,5);assert.equal(saved[v].ops.length,29);}
 const phase=els.phase.textContent;els.play.click();sb.tick(performance.now()+400);assert.notEqual(phase,els.phase.textContent);
 console.log('PASS: five canvases, play/step, view filter, skeleton, parts selection, arm controls, reset, speed and five-view JSON export.');
}catch(e){console.error(e);process.exitCode=1;}},250);
