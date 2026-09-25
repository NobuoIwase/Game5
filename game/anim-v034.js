(()=>{
'use strict';
/* v0.34.0 life in the monsters. Each species has one still picture; this moves it through the
   per-monster transform hook (graphics-multi-v011.js), each on its own phase:
   - slimes (slug, gel, mirror slime, attendant, water wraith, shell): breathe - squash and
     stretch from the base, faster and wobblier while crawling
   - flyers (leech, moth, spore ball, wisp, gazer): bob up and down, tilt; leech and moth beat
     their wings, the spore ball pulses
   - worm: ripples along its body; plants (flower, lure cap): sway from the root
   - crawlers (spider, creeping hand): skitter while moving, twitch while still
   - stone sentinel: slow breath, heavy stomping steps
   And for all of them: a wind-up while a skill is being cast (drawing back, trembling at the
   end) and a snap forward when it goes off. */
const KIND={slug:'slime',gel:'slime',mirror_slime:'slime',crown_attendant:'slime',water_wraith:'slime',bubble_shell:'slime',
 leech:'fly',moth:'fly',orb:'fly',wisp:'fly',gazer:'fly',worm:'worm',flower:'plant',lure_cap:'plant',
 silk_spider:'crawl',creeping_hand:'crawl',stone_sentinel:'heavy'};
const WINGS={leech:1,moth:1};
function anim(e){
 const t=state.time,r=e.r||24,k=KIND[e.type]||'slime',mv=!!e.moving;
 e._ph??=Math.random()*6.28;const ph=e._ph;
 const ax=e.x,ay=k==='fly'?e.y:e.y+r*.85;          // anchor: the base for things on the ground
 let sx=1,sy=1,rot=0,dx=0,dy=0,skew=0;
 if(k==='slime'){const f=mv?7.5:2.2,a=mv?.07:.045,s=Math.sin(t*f+ph);sx=1+a*s;sy=1-a*s}
 else if(k==='fly'){dy=Math.sin(t*2.6+ph)*4.5;rot=Math.sin(t*1.7+ph)*.06;
  if(WINGS[e.type]){const w=Math.sin(t*(mv?26:18)+ph);sx=1+.06*w;sy=1-.03*w}
  if(e.type==='orb'){const s=Math.sin(t*3+ph);sx=sy=1+.04*s}
  if(e.type==='wisp')dx=Math.sin(t*1.3+ph)*3}
 else if(k==='worm'){skew=Math.sin(t*(mv?6:2.4)+ph)*(mv?.12:.06);const s=Math.sin(t*(mv?6:2.4)+ph+1.2);sx=1+.04*s;sy=1-.03*s}
 else if(k==='plant'){rot=Math.sin(t*1.4+ph)*.055+Math.sin(t*3.7+ph)*.015;const s=Math.sin(t*2+ph);sy=1+.03*s}
 else if(k==='crawl'){if(mv){dy=-Math.abs(Math.sin(t*16+ph))*3;rot=Math.sin(t*16+ph)*.04}else{const tw=Math.pow(Math.max(0,Math.sin(t*1.9+ph)),16);rot=tw*.12;dy=-tw*2}}
 else if(k==='heavy'){if(mv){dy=-Math.abs(Math.sin(t*5+ph))*3.5;rot=Math.sin(t*5+ph)*.03}else{const s=Math.sin(t*1.2+ph);sy=1+.02*s}}
 // wind-up while casting, snap when it goes off
 const c=e.cast;
 if(c&&c.total>0){const u=Math.max(0,Math.min(1,1-Math.max(0,c.t)/c.total));sx*=1+.1*u;sy*=1-.12*u;if(u>.7){dx+=Math.sin(t*70)*1.6*(u-.7)/.3}e._wasCasting=true}
 else if(e._wasCasting){e._wasCasting=false;e._pop=1}
 if(e._pop>0){const p=e._pop;sx*=1-.1*p;sy*=1+.16*p;e._pop=Math.max(0,p-1/60/.2)}
 const z=e._sz||1;sx*=z;sy*=z;
 if(e.grappling&&state.hero?.grapple?.pinned)ctx.globalAlpha*=.6;   // v0.37: she shows through the one pinning her   // v0.35: species size (swarm-v035.js)
 if(e._hitT>0){e._hitT-=1/60;ctx.filter='brightness(2.6) saturate(.25)'}   // v0.35: the frame she lands a hit, it flashes white
 if(sx===1&&sy===1&&!rot&&!dx&&!dy&&!skew)return;
 ctx.translate(ax+dx,ay+dy);if(rot)ctx.rotate(rot);if(skew)ctx.transform(1,0,skew,1,0,0);ctx.scale(sx,sy);ctx.translate(-ax,-ay);
}
const G=window.Game5Graphics;
if(G){const prev=G.enemyTransform;G.enemyTransform=function(e){prev?.(e);if(e&&e.hp>0)anim(e)}}
window.Game5Anim={version:'0.34.0',kinds:KIND};
})();
