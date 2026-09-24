(()=>{
'use strict';
/* v0.27.0 her face.
   The sprite is too small to show what is happening to her, so her face sits in the lower left
   corner of the screen and changes with her state: calm, flustered, the creepy grin when
   something goes her way, startled, and - the point of it - holding out while held, close to
   the edge, Estella, the daze afterwards, the blank look of a trance. While she is held it
   grows into a cut-in with a pink frame that beats with her heart.
   Art: the six faces from the character sheet (assets/portrait/aria_faces_placeholder.png) are
   placeholders. The final faces are NovelAI bust-ups the local Claude makes
   (LOCAL_CLAUDE_GUIDE.md 5-D, final/portraits/aria_<key>.png); each one that is delivered and
   listed in final/index.json replaces its placeholder. Until then the missing faces are built
   from the placeholders plus a blush, sweat, breath and hearts drawn on top. */
const SHEET={normal:[0,0],troubled:[1,0],creepy:[2,0],startled:[0,1],damage:[1,1],glee:[2,1]},FW=204,FH=134;
const atlas=new Image();atlas.src='assets/portrait/aria_faces_placeholder.png';
const LOOK={
 normal:{base:'normal'},troubled:{base:'troubled',sweat:1},creepy:{base:'creepy'},startled:{base:'startled',sweat:1},glee:{base:'glee'},damage:{base:'damage',sweat:1},
 endure:{base:'troubled',blush:.6,sweat:1,breath:1},held:{base:'damage',blush:.6,sweat:1,breath:1},melt:{base:'damage',blush:1,sweat:1,breath:1,hearts:2},
 estella:{base:'damage',blush:1,breath:1,hearts:4,glow:1},dazed:{base:'normal',blush:.55,sweat:1,breath:1},trance:{base:'normal',violet:1}
};
const CAPTION={normal:'',troubled:'動揺',creepy:'……ふひ',startled:'びくっ',glee:'……へへ',damage:'',endure:'上気',held:'拘束',melt:'限界',estella:'エステラ',dazed:'放心',trance:'……',edge:'寸止め'};
const finals={};
for(const k of Object.keys(LOOK))window.Game5PackPng?.final?.('portraits','aria_'+k,im=>{finals[k]=im});

/* which face */
const STARTLE=new Set(['spot','ambush','trip','mimic','grab','grabAgain','grabKnown','fear','edge']),GRIN=new Set(['free','chest','item','dodgeKnown','attack']),GLEE=new Set(['clear']);
let lvl=null,gleeT=0;
function pick(h){
 const t=state.time,n=(h.nutera||0)/100,k=h._voiceKey,fresh=t<(h._voiceHold||0);
 if(lvl!=null&&h.level>lvl)gleeT=t+2.2;lvl=h.level;
 if(h.dead)return'damage';
 if(h._trance?.t>0)return'trance';
 if(h.estella?.active)return'estella';
 if(h.grapple)return n>=.65?'melt':'held';
 if(fresh&&(k==='edgePull'||k==='edgeRegrab'))return'melt';
 if(fresh&&/^charm/.test(k||''))return /3$/.test(k)?'dazed':'endure';
 if(fresh&&(k==='report'||k==='attach'||k==='attachMove'))return'endure';
 if(fresh&&STARTLE.has(k))return n>=.65?'melt':'startled';
 if(t<gleeT||fresh&&GLEE.has(k))return'glee';
 if(fresh&&GRIN.has(k)&&n<.5)return'creepy';
 if(h._edge||h.afterglow>0)return'dazed';
 if(n>=.65)return'endure';
 if(n>=.35||h.sp<h.maxSp*.3||(h.fatigue||0)>.7)return'troubled';
 return'normal';
}

/* drawing */
let cur='normal',prev=null,fadeT=0,size=0,last=performance.now();
function face(key,x,y,w,hh,a){
 const L=LOOK[key]||LOOK.normal,f=finals[key];
 ctx.save();ctx.globalAlpha*=a;
 if(f){const s=Math.max(w/f.naturalWidth,hh/f.naturalHeight);ctx.drawImage(f,x+(w-f.naturalWidth*s)/2,y+(hh-f.naturalHeight*s)*.3,f.naturalWidth*s,f.naturalHeight*s);ctx.restore();return true}
 if(!atlas.complete||!atlas.naturalWidth){ctx.restore();return false}
 const [cx,cy]=SHEET[L.base]||SHEET.normal;
 if(L.violet)ctx.filter='saturate(.45) brightness(.9)';
 ctx.drawImage(atlas,cx*FW+1,cy*FH+1,FW-6,FH-2,x,y,w,hh);ctx.filter='none';
 ctx.restore();return false;
}
function overlays(key,x,y,w,hh,h,t,final){
 const L=LOOK[key]||LOOK.normal,n=(h.nutera||0)/100;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,hh);ctx.clip();
 // blush across the cheeks, deeper with Nutera (drawn on the placeholders; a final face has its own)
 const blush=final?0:Math.max(L.blush||0,n*.75);
 if(blush>.05){ctx.globalCompositeOperation='multiply';
  const g=ctx.createRadialGradient(x+w*.5,y+hh*.62,2,x+w*.5,y+hh*.62,w*.42);g.addColorStop(0,`rgba(255,110,150,${.5*blush})`);g.addColorStop(.6,`rgba(255,140,170,${.3*blush})`);g.addColorStop(1,'rgba(255,160,180,0)');
  ctx.fillStyle=g;ctx.fillRect(x,y,w,hh);ctx.globalCompositeOperation='source-over';
  for(let k=0;k<3;k++){ctx.strokeStyle=`rgba(230,70,110,${.55*blush})`;ctx.lineWidth=1.2;ctx.beginPath();const bx=x+w*(.3+k*.035),by=y+hh*.62;ctx.moveTo(bx,by);ctx.lineTo(bx-3,by+5);ctx.stroke();const bx2=x+w*(.66+k*.035);ctx.beginPath();ctx.moveTo(bx2,by);ctx.lineTo(bx2-3,by+5);ctx.stroke()}}
 if(L.violet){ctx.globalCompositeOperation='multiply';ctx.fillStyle='rgba(170,130,255,.45)';ctx.fillRect(x,y,w,hh);ctx.globalCompositeOperation='source-over';
  ctx.strokeStyle='rgba(215,190,255,.8)';ctx.lineWidth=1.4;ctx.beginPath();for(let a=0;a<Math.PI*5;a+=.25){const r=2+a*1.5;const px=x+w*.84+Math.cos(a+t*4)*r,py=y+hh*.22+Math.sin(a+t*4)*r*.6;a?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}
 if(L.sweat||n>.5){const k=(t*.35)%1;ctx.globalAlpha=1-k;ctx.fillStyle='rgba(200,235,255,.9)';ctx.strokeStyle='rgba(90,140,190,.8)';ctx.lineWidth=1;
  const sx=x+w*.86,sy=y+hh*(.28+k*.18);ctx.beginPath();ctx.moveTo(sx,sy-6);ctx.quadraticCurveTo(sx+5,sy+2,sx,sy+4);ctx.quadraticCurveTo(sx-5,sy+2,sx,sy-6);ctx.fill();ctx.stroke();ctx.globalAlpha=1}
 if(L.breath||n>.6){for(let k=0;k<2;k++){const q=(t*.8+k*.5)%1;ctx.globalAlpha=(1-q)*.55;ctx.fillStyle='#fff4f8';ctx.beginPath();ctx.ellipse(x+w*(.6+q*.25),y+hh*(.86-q*.2),5+q*9,3+q*5,0,0,TAU);ctx.fill()}ctx.globalAlpha=1}
 // v0.31: slime on her face after a slimy hold (see wet-v031.js)
 if((h.wet||0)>.12){const wv=h.wet,c=h.wetCol||'#e28ac0';ctx.globalAlpha=.55*wv;ctx.strokeStyle='#ffffff';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(x+w*.18,y+hh*.2);ctx.quadraticCurveTo(x+w*.22,y+hh*.45,x+w*.2,y+hh*.62);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+w*.74,y+hh*.5);ctx.quadraticCurveTo(x+w*.78,y+hh*.62,x+w*.76,y+hh*.74);ctx.stroke();
  const q=(t*.4)%1;ctx.globalAlpha=.75*wv;ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x+w*.64,y+hh*(.66+q*.3),2.2,3.2,0,0,TAU);ctx.fill();
  ctx.strokeStyle=c;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x+w*.64,y+hh*.6);ctx.lineTo(x+w*.64,y+hh*(.64+q*.3));ctx.stroke();ctx.globalAlpha=1}
 const NF=window.Game5NuteraFX;
 for(let k=0;k<(L.hearts||0);k++){const q=(t*.5+k/(L.hearts||1))%1;NF?.drawHeart?.(x+w*(.12+.8*((k*.37)%1)),y+hh*(1-q),8+4*Math.sin(t*6+k),(1-q)*.85)}
 if(L.glow){ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x+w/2,y+hh/2,4,x+w/2,y+hh/2,w*.6);g.addColorStop(0,`rgba(255,120,200,${.12+.08*Math.sin(t*10)})`);g.addColorStop(1,'rgba(255,120,200,0)');ctx.fillStyle=g;ctx.fillRect(x,y,w,hh)}
 ctx.restore();
}
function draw_(h){
 const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;
 const key=pick(h);if(key!==cur){prev=cur;cur=key;fadeT=.18}
 fadeT=Math.max(0,fadeT-dt);
 // grows into a cut-in while she is held / at the edge / in Estella
 const big=!!(h.grapple||h.estella?.active||h._edge||h._trance?.t>0);size+=((big?1:0)-size)*(1-Math.exp(-dt*7));
 const t=state.time,n=(h.nutera||0)/100,w=Math.round(128+96*size),hh=Math.round(w*FH/FW),x=10,y=SH-10-hh-14;
 const bpm=70+n*110,beat=Math.pow(Math.max(0,Math.sin(t*bpm/60*Math.PI)),8);
 const j=window.Game5Heat?.jitter?.(h),jx=(j?.x||0)*size*.8,jy=(j?.y||0)*size*.8;
 ctx.save();ctx.translate(jx,jy);
 // frame
 const hot=h.grapple||h.estella?.active||h._edge,edgeCol=h._trance?.t>0?'#b99cff':hot?`rgba(255,${120-40*beat|0},${200-30*beat|0},1)`:n>=.65?'#e59ac4':'#6d6152';
 ctx.fillStyle='#0d0a0cdd';ctx.beginPath();ctx.roundRect?ctx.roundRect(x-3,y-3,w+6,hh+6+14,7):ctx.rect(x-3,y-3,w+6,hh+20);ctx.fill();
 if(hot){ctx.shadowColor='#ff5fb4';ctx.shadowBlur=10+10*beat}
 ctx.strokeStyle=edgeCol;ctx.lineWidth=hot?2.5:1.5;ctx.beginPath();ctx.roundRect?ctx.roundRect(x-2,y-2,w+4,hh+4,6):ctx.rect(x-2,y-2,w+4,hh+4);ctx.stroke();ctx.shadowBlur=0;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,hh);ctx.clip();
 const s=1+beat*.03*(hot?1:n);ctx.translate(x+w/2,y+hh/2);ctx.scale(s,s);ctx.translate(-(x+w/2),-(y+hh/2));
 if(prev&&fadeT>0)face(prev,x,y,w,hh,1);
 const fin=face(cur,x,y,w,hh,prev&&fadeT>0?1-fadeT/.18:1);
 ctx.restore();
 overlays(cur,x,y,w,hh,h,t,fin);
 // caption: her name and a word for the state
 const cap=h._edge&&!h.grapple?CAPTION.edge:CAPTION[cur]||'';
 ctx.font='700 11px system-ui,sans-serif';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle='#efe6c8';ctx.fillText('アリア',x+2,y+hh+9);
 if(cap){ctx.textAlign='right';ctx.fillStyle=hot?'#ffb0dc':cur==='trance'?'#d4b8ff':'#d9c9a6';ctx.fillText(cap,x+w-2,y+hh+9)}
 ctx.restore();
}
const bDraw=draw;
draw=function(){
 bDraw();
 const h=state.hero;if(!h||!state.started)return;
 screenSpace(()=>draw_(h));
};
/* a still of one face for the end card (heat-v027 puts it next to her self-evaluation) */
function still(key,blush=0){
 const f=finals[key],c=document.createElement('canvas');c.width=FW;c.height=FH;const g=c.getContext('2d');
 if(f){const k=Math.max(FW/f.naturalWidth,FH/f.naturalHeight);g.drawImage(f,(FW-f.naturalWidth*k)/2,(FH-f.naturalHeight*k)*.3,f.naturalWidth*k,f.naturalHeight*k)}
 else if(atlas.complete&&atlas.naturalWidth){
  const L=LOOK[key]||LOOK.normal,[cx,cy]=SHEET[L.base]||SHEET.normal;g.drawImage(atlas,cx*FW+1,cy*FH+1,FW-6,FH-2,0,0,FW,FH);
  const b=Math.max(L.blush||0,blush);
  if(b>.05){g.globalCompositeOperation='multiply';const gr=g.createRadialGradient(FW*.5,FH*.62,2,FW*.5,FH*.62,FW*.42);gr.addColorStop(0,`rgba(255,110,150,${.5*b})`);gr.addColorStop(1,'rgba(255,160,180,0)');g.fillStyle=gr;g.fillRect(0,0,FW,FH)}
 }else return null;
 try{return c.toDataURL('image/png')}catch(_){return null}
}
window.Game5Portrait={version:'0.31.0',pick,looks:LOOK,finals,still};
})();
