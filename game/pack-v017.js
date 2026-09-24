(()=>{
'use strict';
/* v0.17.0 integration of the ChatGPT asset pack (assets/requested/, v0.16.1).
   Replaces the pack's own runtime script, which drew props and Estella art a second time on
   top of the existing layers. What is taken from the pack, and how:
   - monster art (SVG): softened (lower contrast/saturation), trimmed to the creature and drawn
     feet-down in place of the recoloured atlas sprites, for all 7 species and the 4 new ones
   - floor palettes and motifs (silk, spores, petals, scales, runes): fed into the baked
     flagstone floors instead of tiling the outlined tiles, so the floor stays calm
   - chest / tower art for props, director tool icons, the silk wrap on binds, spore puffs
   - dialogue: situations in the brain are mapped to the pack's scene lines (5 per scene) and
     each floor greets with its own flavour line */
const D=window.Game5RequestedArtData;if(!D)return;
const ok=i=>i&&i.complete&&i.naturalWidth;
function whenLoaded(im,fn){if(!im)return;if(ok(im))fn();else im.addEventListener?.('load',fn,{once:true})}

/* ---------- monsters ---------- */
function soften(im,done){
 const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext('2d');
 g.filter='saturate(.86) contrast(.9) brightness(.96)';g.drawImage(im,0,0);g.filter='none';
 let x0=0,y0=0,x1=c.width,y1=c.height;
 try{
  const d=g.getImageData(0,0,c.width,c.height).data;x0=c.width;y0=c.height;x1=0;y1=0;
  for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2)if(d[(y*c.width+x)*4+3]>24){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y}
  if(x1<=x0){x0=0;y0=0;x1=c.width;y1=c.height}
 }catch(_){}
 const pad=4,t=document.createElement('canvas');t.width=x1-x0+pad*2;t.height=y1-y0+pad*2;t.getContext('2d').drawImage(c,x0-pad,y0-pad,t.width,t.height,0,0,t.width,t.height);
 const out=new Image();out.onload=()=>done(out);out.src=t.toDataURL();
}
const req=window.Game5Assets?.requested;
for(const [type,im] of Object.entries(D.monsters||{}))whenLoaded(im,()=>soften(im,out=>{if(req&&!window.Game5PixelArt?.has(req.monsters[type]))req.monsters[type]=out}));

/* ---------- floors: the pack's palettes and motifs, baked calmly ---------- */
window.Game5RoomLook=[
 {base:'#4f5752',grout:'#2a312e',fx:'#6ea16f',decal:'moss'},
 {base:'#3c5266',grout:'#1f2a38',fx:'#70b8d8',decal:'puddle'},
 {base:'#56506a',grout:'#2d2838',fx:'#dbc4ea',decal:'silk',rock:'#2f2a3a'},
 {base:'#4c5a48',grout:'#263226',fx:'#a4bd65',decal:'spore',rock:'#2c3326'},
 {base:'#654a57',grout:'#3a2632',fx:'#e58aa7',decal:'nectar',rock:'#3a2833'},
 {base:'#4a4768',grout:'#23233a',fx:'#b580ff',decal:'dream',rock:'#2b2946'},
 {base:'#4a4d55',grout:'#282a30',fx:'#c39cff',decal:'rune',rock:'#2b2d33'}
];
window.Game5Floor?.clear?.();

/* ---------- props, icons, vfx ---------- */
window.Game5Props={chest:D.props?.chest,mimic:D.props?.mimic,tower:D.props?.tower};
for(const b of document.querySelectorAll('[data-tool]')){
 const im=D.icons?.[b.dataset.tool];if(!im?.src)continue;
 const i=document.createElement('img');i.className='ticon';i.src=im.src;i.alt='';b.classList.add('hasIcon');b.appendChild(i);
}
const VX=window.Game5Assets?.vfx;
if(VX)for(const k of ['spore_puff','silk_wrap','nectar_drop'])if(D.vfx?.[k])VX[k]=D.vfx[k];

/* ---------- dialogue ---------- */
const pack={dialog:null,rooms:null};
Promise.all([
 fetch('./assets/requested/dialogues.json').then(r=>r.ok?r.json():null).catch(()=>null),
 fetch('./assets/requested/room_ideas.json').then(r=>r.ok?r.json():null).catch(()=>null)
]).then(([d,r])=>{pack.dialog=d;pack.rooms=r});
const MAP=[[/何が来る|何か来る/,'first_telegraph'],[/前と同じなら/,'known_telegraph'],[/動けない|ほどけない/,'restrained'],
 [/宝箱を|宝箱。開けて/,'chest_found'],[/偽物じゃないか|宝箱じゃない/,'mimic_notice'],[/区画を制圧/,'room_clear'],
 [/静かすぎる/,'lost_enemy'],[/囲まれてる/,'surrounded'],[/ヌテラが危険域/,'nutera_high'],[/^エステラ/,'estella_start'],[/動ける。けれど/,'estella_recover']];
function voice(h){
 const s=h.thought,scenes=pack.dialog?.scenes;if(!s||!scenes||s===h._voiced)return;
 const m=MAP.find(([r])=>r.test(s));if(!m||!scenes[m[1]]?.length)return;
 // keep one line per situation for a few seconds so the bubble does not flicker
 if(h._voiceScene!==m[1]||state.time-h._voiceT>5){const a=scenes[m[1]];h._voiceLine=a[(Math.random()*a.length)|0];h._voiceScene=m[1];h._voiceT=state.time}
 h.thought=h._voiced=h._voiceLine;
}
const bHero=updateHero;
updateHero=function(h,dt){
 bHero(h,dt);
 const i=state.dungeon?.room;
 if(i!=null&&h._flavorRoom!==i&&state.started){h._flavorRoom=i;const f=pack.rooms?.[i]?.thought;if(f)h.thought=h._voiced=f}
 else voice(h);
};

/* ---------- silk wrap while bound ---------- */
const bDraw=draw;
draw=function(){
 bDraw();
 const h=state.hero,im=D.vfx?.silk_wrap;
 if(h&&!h.dead&&(h.status?.bind||0)>0&&ok(im)){ctx.save();ctx.globalAlpha=.3+.08*Math.sin(state.time*6);ctx.translate(h.x,h.y-22);ctx.rotate(state.time*.8);ctx.drawImage(im,-54,-54,108,108);ctx.restore()}
};
window.Game5Pack={version:'0.17.0',data:D,pack};
})();
