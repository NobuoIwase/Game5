(()=>{
'use strict';
/* v0.40.0 small things that make the world feel lived in.
   - footfalls: each time a foot comes down (the step phase from motion-v039.js) a little dust
     rises from the stone - a splash instead where the floor is under water, a wet print where
     she is dripping; heavy monsters raise dust with every stomp
   - sweat: when her SP runs low, drops fly from her brow now and then
   - breath: with her Nutera high, a warm pink breath puffs from her lips
   - the last blow: when the last monster that knows she is there falls, the world slows for a
     moment and a pale ring spreads from it */
const C={dust:'rgba(170,150,120,',splash:'rgba(150,200,240,',sweatAt:.35,breathAt:60,finale:{t:.55,k:.25}};
const P=[],alive=()=>window.Game5MultiEnemy?.alive?.()||[];
function rgbaOf(hex){const m=/^#([0-9a-f]{6})$/i.exec(hex||'');if(!m)return'rgba(255,190,230,';const n=parseInt(m[1],16);return`rgba(${n>>16},${(n>>8)&255},${n&255},`}
function add(p){if(P.length<220)P.push(p)}
function water(x,y){const T=window.Game5Terrain,f=T?.current?.();if(!f?.water)return false;const cx=Math.floor(x/T.CS),cy=Math.floor(y/T.CS);return!!f.water[cy*T.GW+cx]}
function puff(x,y,col,n,spread,up,life,size){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2;add({x:x+Math.cos(a)*spread*.3,y:y+Math.sin(a)*spread*.12,vx:Math.cos(a)*spread*(.6+Math.random()*.6),vy:Math.sin(a)*spread*.25-up*Math.random(),g:up*.6,t:life,T:life,s:size*(.7+Math.random()*.6),col,layer:'under',grow:1.8})}}
/* ---- footfalls ---- */
let ph0=null;
const baseHero=updateHero;
updateHero=function(h,dt){
 baseHero(h,dt);
 if(!h||!state.started||h.dead)return;
 const ph=h._stepPh;
 if(h.moving&&ph!=null&&ph0!=null){const a=Math.floor(ph0/4),b=Math.floor(ph/4);if(a!==b||Math.abs(ph-ph0)>4){const fx=h.x+(b%2?5:-5),fy=h.y+17;
  if(water(h.x,h.y+14))puff(fx,fy,C.splash,5,26,40,.45,2.2);
  else{puff(fx,fy,C.dust,h.motion==='run'?4:2,h.motion==='run'?22:14,10,.55,3.4);if(h.wet>.25)add({x:fx,y:fy+1,vx:0,vy:0,g:0,t:3,T:3,s:3.2,col:rgbaOf(h.wetCol),layer:'under',print:true})}}}
 ph0=ph;
 // sweat
 const spR=(h.sp??100)/(h.maxSp||100);
 if(spR<C.sweatAt&&!h.estella?.active){h._sweatT=(h._sweatT||0)-dt;if(h._sweatT<=0){h._sweatT=.5+spR*3+Math.random()*.6;const s=Math.random()<.5?-1:1;add({x:h.x+s*9,y:h.y-78,vx:s*(30+Math.random()*30),vy:-60-Math.random()*30,g:420,t:.6,T:.6,s:2.4,col:'rgba(200,230,255,',layer:'over',drop:true})}}
 // breath
 if((h.nutera||0)>=C.breathAt&&!h.grapple){h._breathT=(h._breathT||0)-dt;if(h._breathT<=0){h._breathT=1.1+Math.random()*.6-((h.nutera||0)-60)/100;const fl=['front','down_right','down_left'].includes(h.dir)?0:(['right','up_right'].includes(h.dir)?1:-1);
  for(let i=0;i<3;i++)add({x:h.x+fl*8+(Math.random()-.5)*4,y:h.y-70,vx:fl*18+(Math.random()-.5)*14,vy:-14-Math.random()*10,g:-6,t:1,T:1,s:2.6+i,col:'rgba(255,170,215,',layer:'over',grow:2.4})}}
};
/* ---- heavy stomps ---- */
const HEAVY={stone_sentinel:1,gel:.6,worm:.5,crown_attendant:.6};
const baseEnemy=updateEnemy;
updateEnemy=function(dt){
 const r=baseEnemy(dt);
 for(const e of alive()){const k=HEAVY[e.type];if(!k)continue;
  if(e.moving){e._stompT=(e._stompT??.3)-dt;if(e._stompT<=0){e._stompT=e.type==='stone_sentinel'?.38:.55;puff(e.x,e.y+(e.r||24)*.8,C.dust,Math.round(3*k)+1,26*k+10,12,.6,4*k);if(e.type==='stone_sentinel'&&state.hero&&Math.hypot(e.x-state.hero.x,e.y-state.hero.y)<260)window.Game5FX?.shake?.(1.2)}}}
 finaleCheck();
 return r;
};
/* ---- the last blow ---- */
let aware0=0,slowT=0,ring=null;
function finaleCheck(){
 const n=alive().filter(e=>e.aware).length,dead=(state.enemies||[]).filter(e=>e.hp<=0&&!e._finaleSeen);
 for(const e of dead)e._finaleSeen=true;
 if(aware0>0&&n===0&&dead.length&&state.hero&&!state.hero.dead){const e=dead[dead.length-1];slowT=C.finale.t;ring={x:e.x,y:e.y,t:.7,T:.7};window.Game5FX?.shake?.(4)}
 aware0=n;
}
const baseUpdate=update;
update=function(dt){if(slowT>0){slowT-=dt;dt*=C.finale.k}return baseUpdate(dt)};
/* ---- drawing ---- */
let last=performance.now();
function step(){const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;
 for(const p of P){p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;p.vx*=.96}
 for(let i=P.length-1;i>=0;i--)if(P[i].t<=0)P.splice(i,1);
 if(ring){ring.t-=dt;if(ring.t<=0)ring=null}}
function paint(layer){
 ctx.save();
 for(const p of P){if(p.layer!==layer)continue;const u=1-p.t/p.T,a=p.print?Math.min(.35,p.t/p.T*.5):Math.sin(Math.min(1,u*1.3)*Math.PI)*.5+(p.drop?.35:0);
  ctx.fillStyle=p.col+Math.max(0,Math.min(1,a)).toFixed(3)+')';ctx.beginPath();
  if(p.print)ctx.ellipse(p.x,p.y,p.s,p.s*.5,0,0,Math.PI*2);
  else if(p.drop){ctx.ellipse(p.x,p.y,p.s*.7,p.s,Math.atan2(p.vy,p.vx)+Math.PI/2,0,Math.PI*2)}
  else ctx.arc(p.x,p.y,p.s*(1+(p.grow||0)*u),0,Math.PI*2);
  ctx.fill()}
 if(layer==='over'&&ring){const u=1-ring.t/ring.T;ctx.globalAlpha=(1-u)*.8;ctx.strokeStyle='#fff4e0';ctx.lineWidth=3*(1-u)+1;ctx.beginPath();ctx.ellipse(ring.x,ring.y,20+u*180,(20+u*180)*.5,0,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}
const G=window.Game5Graphics;
if(G){const u=G.drawHazardsUnder;G.drawHazardsUnder=function(){u?.();if(state.started){step();paint('under')}};
 const o=G.drawHazardsOver;G.drawHazardsOver=function(){o?.();if(state.started)paint('over')}}
const baseReset=reset;reset=function(){const r=baseReset();P.length=0;ph0=null;aware0=0;slowT=0;ring=null;return r};
window.Game5FX40={version:'0.40.0',cfg:C,particles:P};
})();
