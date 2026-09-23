
(()=>{
'use strict';
const D=window.Game5RequestedArtData;if(!D)return;
const {mk,ell,cir,path,line}=D;
const chestFrame=(x,open=false,slime=false)=>`<g transform="translate(${x},5)"><rect x="8" y="43" width="104" height="57" rx="9" fill="#68482a" stroke="#d0a45a" stroke-width="5"/><path d="${open?'M14 39 Q60 2 106 28':'M13 43 Q60 8 107 43'}" fill="#7a5630" stroke="#d0a45a" stroke-width="5"/>${slime?'<path d="M10 49 Q36 34 58 50 Q82 32 110 50 L110 99 Q60 116 10 97Z" fill="#a77bc2" opacity=".86"/>':'<circle cx="60" cy="65" r="8" fill="#d28df3"/>'}</g>`;
const props={
 chest:mk(256,128,chestFrame(4,false,false)+chestFrame(132,true,false)),
 mimic:mk(256,128,chestFrame(4,false,true)+chestFrame(132,false,true)),
 stairs:mk(256,128,`<g transform="translate(3,6)"><path d="M10 106V28H114V106Z" fill="#41474e" stroke="#87909a" stroke-width="4"/>${[0,1,2,3].map(i=>`<rect x="${23+i*10}" y="${77-i*13}" width="${76-i*20}" height="10" fill="#626b75"/>`).join('')}<circle cx="62" cy="55" r="18" fill="none" stroke="#b48be6" stroke-width="3"/></g><g transform="translate(131,6)"><path d="M10 106V28H114V106Z" fill="#4d535b" stroke="#9ea7b0" stroke-width="4"/>${[0,1,2,3].map(i=>`<rect x="${23+i*10}" y="${77-i*13}" width="${76-i*20}" height="10" fill="#727b86"/>`).join('')}<circle cx="62" cy="55" r="18" fill="none" stroke="#e0c4ff" stroke-width="4"/></g>`),
 tower:mk(384,192,[0,1,2].map(i=>`<g transform="translate(${i*128},0)"><ellipse cx="64" cy="166" rx="38" ry="10" fill="#05050b" opacity=".22"/><path d="M42 157 L50 54 H78 L86 157Z" fill="#453951" stroke="#a68bbf" stroke-width="4"/><circle cx="64" cy="77" r="${12+i*3}" fill="url(#gl)" opacity="${.58+i*.15}"/></g>`).join('')),
 pool:mk(256,256,ell(128,142,94,67,'#6f5e9b',.6,'#cbb8ef',4)+ell(128,142,69,46,'#b080c9',.34)+cir(128,142,29,'url(#gl)',.62))
};
const icons={
 snare:mk(64,64,`<circle cx="32" cy="32" r="23" fill="none" stroke="#d0a8e8" stroke-width="4"/><path d="M13 39 Q32 15 51 39" fill="none" stroke="#efe0ff" stroke-width="4"/>`),
 fog:mk(64,64,ell(32,34,24,16,'#7d62a4',.75)+cir(23,28,8,'#d4b8ef',.35)+cir(39,32,10,'#b48bd4',.35)),
 lure:mk(64,64,`<path d="M24 13 Q32 8 40 13 L43 42 Q32 51 21 42Z" fill="#b98a46" stroke="#f1d28c" stroke-width="3"/><circle cx="32" cy="50" r="4" fill="#e6b560"/>`),
 ringbeam:mk(64,64,`<circle cx="32" cy="32" r="23" fill="none" stroke="#c48aff" stroke-width="3"/><circle cx="32" cy="32" r="12" fill="none" stroke="#f3d7ff" stroke-width="3"/><circle cx="32" cy="32" r="4" fill="#fff"/>`),
 pool:mk(64,64,ell(32,36,24,15,'#78916e',.8,'#c6e6b5',3)+ell(32,36,13,8,'#a997c9',.55)),
 tower:mk(64,64,`<path d="M20 56 L24 15 H40 L44 56Z" fill="#493b57" stroke="#b69bcf" stroke-width="3"/><circle cx="32" cy="26" r="7" fill="#d3a7ff"/>`),
 mimic:mk(64,64,`<rect x="10" y="27" width="44" height="27" rx="6" fill="#6c492a" stroke="#d0a45a" stroke-width="3"/><path d="M12 30 Q32 12 52 30" fill="#7a5630" stroke="#d0a45a" stroke-width="3"/><path d="M12 34 Q32 25 52 34 L52 52 Q32 60 12 52Z" fill="#9f7bb8" opacity=".75"/>`),
 summon:mk(64,64,`<circle cx="32" cy="32" r="24" fill="none" stroke="#d0a4ff" stroke-width="3"/><path d="M32 10 L39 26 L55 32 L39 38 L32 54 L25 38 L9 32 L25 26Z" fill="#9d69c4" opacity=".8"/>`)
};
const vfx={
 spore_puff:mk(256,256,[[128,128,58],[82,116,28],[174,105,31],[105,72,20],[157,169,25]].map(v=>cir(v[0],v[1],v[2],'#b8d77d',.28,'#eaffb8',2)).join('')),
 silk_wrap:mk(256,256,[0,1,2,3].map(j=>`<ellipse cx="128" cy="128" rx="${42+j*16}" ry="${70-j*8}" fill="none" stroke="#eadfff" stroke-width="5" opacity="${.75-j*.1}" transform="rotate(${j*42} 128 128)"/>`).join('')),
 hypno_ring:mk(256,256,[84,62,40].map((r,j)=>`<circle cx="128" cy="128" r="${r}" fill="none" stroke="${j%2?'#d39cff':'#8f66c9'}" stroke-width="8" opacity="${.65+j*.12}"/>`).join('')),
 nectar_drop:mk(256,256,`<path d="M128 43 C166 89 182 124 128 203 C74 124 90 89 128 43Z" fill="#ef9bc8" opacity=".72" stroke="#ffd6ea" stroke-width="4"/>`)
};
const nutera={
 hearts:mk(256,64,[32,88,144,200].map((x,j)=>`<path d="M${x} 50 C${x-34} 28 ${x-22} 9 ${x} 22 C${x+22} 9 ${x+34} 28 ${x} 50Z" fill="${['#f291c1','#e875b6','#f7b8d9','#d39cff'][j]}" stroke="#ffe4f3" stroke-width="2"/>`).join('')),
 heart_burst:mk(256,256,`<circle cx="128" cy="128" r="76" fill="#f08bbd" opacity=".18"/><path d="M128 180 C53 129 83 72 128 108 C173 72 203 129 128 180Z" fill="#ff9dcc" stroke="#ffe1f0" stroke-width="5"/>`),
 estella_logo:mk(512,128,`<text x="256" y="79" text-anchor="middle" font-family="serif" font-size="64" font-weight="700" fill="#f29ac7" stroke="#fff0f7" stroke-width="2">ESTELLA</text>`),
 sigil:mk(256,256,`<circle cx="128" cy="128" r="93" fill="none" stroke="#d68cff" stroke-width="5"/><circle cx="128" cy="128" r="67" fill="none" stroke="#f3b3dd" stroke-width="3"/><path d="M128 180 C63 136 88 86 128 116 C168 86 193 136 128 180Z" fill="none" stroke="#ffd5eb" stroke-width="5"/>`),
 gauge_heart:mk(128,64,`<path d="M31 51 C-3 26 11 6 31 22 C51 6 65 26 31 51Z" fill="none" stroke="#f2a0c9" stroke-width="4"/><path d="M96 51 C62 26 76 6 96 22 C116 6 130 26 96 51Z" fill="#f08fbe" stroke="#ffe0ee" stroke-width="4"/>`)
};
Object.assign(D,{props,icons,vfx,nutera});
})();
