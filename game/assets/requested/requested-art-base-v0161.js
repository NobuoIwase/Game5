
(() => {
'use strict';
/* Game5 requested art pack v0.16.1
   Generated/cut-out art translated into a single low-commit runtime asset pack.
   No blades, fangs or pain motifs: Nutera visuals use slime, soft wrapping, bubbles,
   spores, glow, hypnosis and friction/suction motifs. */
const VERSION='0.16.1';
const mk=(w,h,body)=>{
  const im=new Image();
  im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <filter id="g"><feGaussianBlur stdDeviation="4"/></filter>
      <radialGradient id="gl"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#eeb9ff"/><stop offset="1" stop-color="#684789"/></radialGradient>
      <linearGradient id="sl" x2="0" y2="1"><stop stop-color="#e9e6ff"/><stop offset=".55" stop-color="#9a82bd"/><stop offset="1" stop-color="#493f68"/></linearGradient>
    </defs>${body}</svg>`);
  return im;
};
const ell=(x,y,rx,ry,f,op=1,st='none',sw=0)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" opacity="${op}" stroke="${st}" stroke-width="${sw}"/>`;
const cir=(x,y,r,f,op=1,st='none',sw=0)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" opacity="${op}" stroke="${st}" stroke-width="${sw}"/>`;
const path=(d,f,op=1,st='none',sw=0)=>`<path d="${d}" fill="${f}" opacity="${op}" stroke="${st}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
const line=(x1,y1,x2,y2,st,sw=2,op=1)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${st}" stroke-width="${sw}" opacity="${op}" stroke-linecap="round"/>`;

function floorSheet(p,kind){
  let b=`<rect width="256" height="128" fill="${p.bg}"/>`;
  for(let r=0;r<2;r++)for(let c=0;c<4;c++){
    const x=c*64,y=r*64,k=r*4+c;
    b+=`<rect x="${x+1}" y="${y+1}" width="62" height="62" rx="7" fill="${k%2?p.a:p.b}" stroke="${p.edge}" stroke-width="2"/>`;
    b+=ell(x+31,y+33,22+(k%3)*3,18+(k%2)*4,'#ffffff',.035);
    if(kind==='moss') b+=cir(x+12+k%9,y+48-k%7,5,p.fx,.65)+cir(x+50-k%6,y+12+k%8,3,p.fx,.55);
    if(kind==='wet') b+=path(`M${x+5} ${y+44} Q${x+28} ${y+34} ${x+59} ${y+43}`,'none',1,p.fx,3);
    if(kind==='silk') b+=line(x+7,y+8,x+56,y+55,p.fx,2,.65)+line(x+53,y+8,x+10,y+54,p.fx,1.5,.55);
    if(kind==='spore') b+=cir(x+16,y+17,4,p.fx,.5)+cir(x+47,y+42,6,p.fx,.4)+cir(x+39,y+14,2,p.fx,.65);
    if(kind==='nectar') b+=path(`M${x+9} ${y+48} Q${x+26} ${y+21} ${x+56} ${y+45}`,'none',1,p.fx,5)+cir(x+48,y+18,4,p.fx,.7);
    if(kind==='dream') b+=line(x+5,y+55,x+58,y+9,p.fx,2,.55)+cir(x+43,y+19,4,'#fff',.4);
    if(kind==='rune') b+=`<path d="M${x+32} ${y+10} L${x+48} ${y+32} L${x+32} ${y+54} L${x+16} ${y+32} Z" fill="none" stroke="${p.fx}" stroke-width="2" opacity=".55"/>`;
  }
  return mk(256,128,b);
}
const floors=[
 floorSheet({bg:'#222a27',a:'#46514d',b:'#59615d',edge:'#7a837e',fx:'#6ea16f'},'moss'),
 floorSheet({bg:'#202c3b',a:'#36495e',b:'#415b70',edge:'#6d8298',fx:'#70b8d8'},'wet'),
 floorSheet({bg:'#302a3b',a:'#554b63',b:'#60556f',edge:'#8b7b97',fx:'#dbc4ea'},'silk'),
 floorSheet({bg:'#243526',a:'#435441',b:'#586954',edge:'#77866d',fx:'#a4bd65'},'spore'),
 floorSheet({bg:'#3b2835',a:'#654454',b:'#765160',edge:'#9a6e78',fx:'#e58aa7'},'nectar'),
 floorSheet({bg:'#24243c',a:'#454462',b:'#504a70',edge:'#77739b',fx:'#b580ff'},'dream'),
 floorSheet({bg:'#292b31',a:'#44474f',b:'#51545d',edge:'#7d818a',fx:'#c39cff'},'rune')
];

function blob(c1,c2,extra=''){
 return mk(256,256,
  ell(128,202,74,18,'#06060c',.28)+
  ell(128,145,68,70,c2,.96,'#e9ddff',3)+
  ell(106,115,25,30,c1,.68)+ell(153,135,30,38,c1,.46)+
  cir(111,148,8,'#fff',.8)+cir(145,154,7,'#fff',.6)+extra);
}

window.Game5RequestedArtData={VERSION,mk,ell,cir,path,line,floors,blob};
})();
