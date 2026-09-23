(()=>{
'use strict';
/* v0.13.0 assets.
   - VFX sprites and floor atlases carried over from Game4 (assets/ext/, see README credits)
   - floor theme per dungeon floor: original mossy stone, wet slate, blue slate, moonstone
   - drop-in slot for commissioned art: list files in assets/requested/manifest.json and they
     replace the built-in sprites without code changes (see ASSET_REQUESTS.md) */
const load=src=>{const i=new Image();i.src=src;return i},ok=i=>i&&i.complete&&i.naturalWidth;
const VFX={};
for(const n of ['slime_splash','impact_flash','holy_slash','purification_pulse','curse_cloud','mire_ripple','moon_burst'])VFX[n]=load(`./assets/ext/${n}.webp`);
const FLOOR={normal:load('./assets/ext/floor_normal.webp'),wet:load('./assets/ext/floor_wet.webp'),moon:load('./assets/ext/floor_moon.webp')};
const TILE={mire:load('./assets/ext/mire.webp')};
const THEME=[null,'wet','normal',null,'wet','moon','moon'];

/* floor atlases are 4x2 cells of 64px; the last column carries the rune variants */
function floorTile(room,v,x,y,size=64){
 const key=requested.floor?.[room]?'req':THEME[room],im=key==='req'?requested.floorImg[room]:FLOOR[key];
 if(!key||!ok(im))return false;
 const cols=Math.max(1,Math.round(im.naturalWidth/64)),rows=Math.max(1,Math.round(im.naturalHeight/64)),rune=cols>1;
 let cx,cy;
 if(rune&&v<.04){cx=cols-1;cy=v<.02?0:rows-1}
 else{const w=rune?cols-1:cols,n=Math.floor(v*997)%(w*rows);cx=n%w;cy=Math.floor(n/w)}
 ctx.save();ctx.globalAlpha=.94;ctx.drawImage(im,cx*64,cy*64,64,64,x,y,size,size);ctx.restore();
 return true;
}

/* one-shot sprite effects, drawn additively on top of the actors */
const live=[];
function spawn(name,x,y,size,life=.45,o={}){
 if(!ok(VFX[name])||live.length>60)return;
 live.push({im:VFX[name],x,y,size,t:life,max:life,rot:o.rot??Math.random()*TAU,grow:o.grow??.35,alpha:o.alpha??1,add:o.add!==false,spin:o.spin||0});
}
function draw(dt){
 for(const v of live){
  v.t-=dt;const p=1-Math.max(0,v.t)/v.max,s=v.size*(1+v.grow*p);
  ctx.save();if(v.add)ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha=v.alpha*Math.min(1,(1-p)*2.2)*Math.min(1,p*8+.2);
  ctx.translate(v.x,v.y);ctx.rotate(v.rot+v.spin*p);ctx.drawImage(v.im,-s/2,-s/2,s,s);ctx.restore();
 }
 for(let i=live.length-1;i>=0;i--)if(live[i].t<=0)live.splice(i,1);
}
let last=performance.now();
const fx=window.Game5FX;
if(fx){const base=fx.effects;fx.effects=function(){base();const n=performance.now(),dt=Math.min(.1,(n-last)/1000);last=n;draw(dt)}}

/* hits: slime splash on monsters, a flash on heavy blows and kills */
const bHurt=hurtEnemy;
hurtEnemy=function(dmg,opts={}){
 const e=state.enemy,b=e?.hp;bHurt(dmg,opts);
 if(e&&b>e.hp){
  spawn('slime_splash',e.x,e.y-8,60+Math.min(40,dmg),.4);
  if(dmg>=40||e.hp<=0)spawn('impact_flash',e.x,e.y-10,e.hp<=0?150:110,.3);
 }
};
const bLevel=gainHeroXp;
gainHeroXp=function(n){const h=state.hero,lv=h?.level;bLevel(n);if(h&&h.level>lv)spawn('moon_burst',h.x,h.y-20,170,.9,{grow:.6})};

/* ---------- commissioned art (assets/requested/manifest.json) ---------- */
const requested={monsters:{},floor:{},floorImg:{},hero:null};
fetch('./assets/requested/manifest.json').then(r=>r.ok?r.json():null).then(m=>{
 if(!m)return;
 for(const [type,src] of Object.entries(m.monsters||{}))requested.monsters[type]=load(`./assets/requested/${src}`);
 for(const [room,src] of Object.entries(m.floors||{})){requested.floor[room]=true;requested.floorImg[room]=load(`./assets/requested/${src}`)}
}).catch(()=>{});
function monster(e){const im=requested.monsters[e.type];return ok(im)?im:null}

window.Game5Assets={version:'0.13.0',floorTile,spawn,monster,vfx:VFX,tile:TILE,requested};
})();
