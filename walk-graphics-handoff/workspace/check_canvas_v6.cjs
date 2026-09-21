const fs=require('fs'),vm=require('vm');
const {createCanvas,Image}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const html=fs.readFileSync('lumina-walk-v6/lumina-walk-player.html','utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const els={};
function el(id){return {id,textContent:'',children:[],attrs:{},append(x){this.children.push(x);},setAttribute(k,v){this.attrs[k]=v;},click(){this.onclick();}};}
for(const match of html.matchAll(/\bid="([^"]+)"/g))els[match[1]]=el(match[1]);
els['walk-data'].textContent=html.match(/<script id="walk-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
for(const v of ['front','side']){const c=createCanvas(384,512);els[v].canvas=c;els[v].getContext=()=>c.getContext('2d');}
const sandbox={console,Image,performance,matchMedia:()=>({matches:true}),requestAnimationFrame:f=>{sandbox.nextTick=f;},document:{getElementById:id=>{if(!els[id])throw Error('Unknown element '+id);return els[id];},querySelectorAll:s=>s==='#frames button'?els.frames.children:[],createElement:()=>el('button'),addEventListener(){}}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
setTimeout(()=>{
 try{
  const png=()=>els.front.canvas.toBuffer('image/png');
  const initial=png();els.step.click();if(initial.equals(png()))throw Error('Step did not change rendered pixels');
  const next=png();els.parts.click();if(next.equals(png()))throw Error('Parts mode did not change rendered pixels');
  fs.writeFileSync('canvas-parts-v6-check.png',png());els.parts.click();
  els.play.click();const before=els.phase.textContent;sandbox.nextTick(performance.now()+500);if(before===els.phase.textContent)throw Error('Play did not advance');
  els.speed.oninput({target:{value:'6'}});if(els.speedValue.textContent!=='6.0 fps')throw Error('Speed control');
  els.frames.children[7].click();if(els.frames.children[7].attrs['aria-pressed']!=='true')throw Error('Frame selection');
  fs.writeFileSync('canvas-front-v6-check.png',png());fs.writeFileSync('canvas-side-v6-check.png',els.side.canvas.toBuffer('image/png'));
  console.log('Canvas render, step, playback, parts, frame selection and speed controls passed (Node canvas; no browser layout check).');
 }catch(e){console.error(e);process.exitCode=1;}
},100);
