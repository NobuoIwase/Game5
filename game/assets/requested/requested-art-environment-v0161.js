(()=>{
'use strict';
const D=window.Game5RequestedArtData;if(!D)return;
const {mk,ell,cir,path,line}=D;
const props={
 chest:mk(256,128,
  `<g transform="translate(8,7)"><rect x="9" y="42" width="95" height="55" rx="9" fill="#604226" stroke="#c59c59" stroke-width="5"/><path d="M13 42 Q55 10 100 42" fill="#76522e" stroke="#c59c59" stroke-width="5"/><circle cx="56" cy="57" r="8" fill="#c685e8"/></g>`+
  `<g transform="translate(136,7)"><rect x="9" y="42" width="95" height="55" rx="9" fill="#604226" stroke="#c59c59" stroke-width="5"/><path d="M15 38 Q57 3 100 28" fill="#76522e" stroke="#c59c59" stroke-width="5"/><ellipse cx="56" cy="52" rx="34" ry="20" fill="#ffe19a" opacity=".5"/><circle cx="56" cy="60" r="8" fill="#c685e8"/></g>`),
 mimic:mk(256,128,
  `<g transform="translate(8,7)"><rect x="9" y="42" width="95" height="55" rx="9" fill="#604226" stroke="#c59c59" stroke-width="5"/><path d="M13 42 Q55 10 100 42" fill="#76522e" stroke="#c59c59" stroke-width="5"/><path d="M11 48 Q35 35 53 50 Q73 34 102 50 L102 95 Q55 112 11 95Z" fill="#9c79b4" opacity=".78"/></g>`+
  `<g transform="translate(136,7)"><rect x="9" y="42" width="95" height="55" rx="9" fill="#604226" stroke="#c59c59" stroke-width="5"/><path d="M13 42 Q55 10 100 42" fill="#76522e" stroke="#c59c59" stroke-width="5"/><path d="M11 45 Q34 24 54 48 Q77 28 102 47 L102 96 Q54 117 11 95Z" fill="#b485c8" opacity=".9"/><circle cx="52" cy="67" r="9" fill="#e5c0ff" opacity=".75"/></g>`),
 stairs:mk(256,128,
  `<g transform="translate(5,8)"><path d="M10 104 L10 30 L112 30 L112 104 Z" fill="#3e444a" stroke="#77808a" stroke-width="4"/>${[0,1,2,3].map(i=>`<rect x="${24+i*9}" y="${74-i*12}" width="${72-i*18}" height="10" fill="#59616a"/>`).join('')}<circle cx="60" cy="56" r="18" fill="none" stroke="#9a78c4" stroke-width="3"/></g>`+
  `<g transform="translate(133,8)"><path d="M10 104 L10 30 L112 30 L112 104 Z" fill="#454a50" stroke="#8b939c" stroke-width="4"/>${[0,1,2,3].map(i=>`<rect x="${24+i*9}" y="${74-i*12}" width="${72-i*18}" height="10" fill="#6b737c"/>`).join('')}<circle cx="60" cy="56" r="18" fill="none" stroke="#d7b4ff" stroke-width="4"/></g>`),
 tower:mk(384,192,[0,1,2].map((i)=>`<g transform="translate(${i*128},0)"><ellipse cx="64" cy="166" rx="38" ry="10" fill="#05050b" opacity=".2"/><path d="M42 156 L50 54 L78 54 L86 156 Z" fill="#41364d" stroke="#9b82b7" stroke-width="4"/><circle cx="64" cy="76" r="${12+i*3}" fill="url(#gl)" opacity="${.6+i*.15}"/></g>`).join('')),
 pool:mk(256,256,ell(128,142,94,67,'#6c5b99',.58,'#c9b6ef',4)+ell(128,142,71,48,'#a47fc0',.35)+cir(128,142,28,'url(#gl)',.65))
};
const icons={
 snare:mk(64,64,`<circle cx="32" cy="32" r="23" fill="none" stroke="#d0a8e8" stroke-width="4"/><path d="M13 39 Q32 15 51 39" fill="none" stroke="#efe0ff" stroke-width="4"/>`),
 fog:mk(64,64,ell(32,34,24,16,'#7d62a4',.75)+cir(23,28,8,'#d4b8ef',.35)+cir(39,32,10,'#b48bd4',.35)),
 lure:mk(64,64,`<path d="M24 13 Q32 8 40 13 L43 42 Q32 51 21 42Z" fill="#b98a46" stroke="#f1d28c" stroke-width="3"/><circle cx="32" cy="50" r="4" fill="#e6b560"/>`),
 ringbeam:mk(64,64,`<circle cx="32" cy="32" r="23" fill="none" stroke="#c48aff" stroke-width="3"/><circle cx="32" cy="32" r="12" fill="none" stroke="#f3d7ff" stroke-width="3"/><circle cx="32" cy="32" r="4" fill="#fff"/>`),
 pool:mk(64,64,ell(32,36,24,15,'#78916e',.8,'#c6e6b5',3)+ell(32,36,13,8,'#a997c9',.55)),
 tower:mk(64,64,`<path d="M20 56 L24 15 L40 15 L44 56Z" fill="#493b57" stroke="#b69bcf" stroke-width="3"/><circle cx="32" cy="26" r="7" fill="#d3a7ff"/>`),
 mimic:mk(64,64,`<rect x="10" y="27" width="44" height="27" rx="6" fill="#6c492a" stroke="#d0a45a" stroke-width="3"/><path d="M12 30 Q32 12 52 30" fill="#7a5630" stroke="#d0a45a" stroke-width="3"/><path d="M12 34 Q32 25 52 34 L52 52 Q32 60 12 52Z" fill="#9f7bb8" opacity=".75"/>`),
 summon:mk(64,64,`<circle cx="32" cy="32" r="24" fill="none" stroke="#d0a4ff" stroke-width="3"/><path d="M32 10 L39 26 L55 32 L39 38 L32 54 L25 38 L9 32 L25 26Z" fill="#9d69c4" opacity=".8"/>`)
};
const vfx={
 spore_puff:mk(256,256,[ [128,128,58],[82,116,28],[174,105,31],[105,72,20],[157,169,25] ].map(v=>cir(v[0],v[1],v[2],'#b8d77d',.28,'#eaffb8',2)).join('')),
 silk_wrap:mk(256,256,[0,1,2,3].map((ii)=>`<ellipse cx="128" cy="128" rx="${42+ii*16}" ry="${70-ii*8}" fill="none" stroke="#eadfff" stroke-width="5" opacity="${.75-ii*.1}" transform="rotate(${ii*42} 128 128)"/>`).join('')),
 hypno_ring:mk(256,256,[84,62,40].map((r,i)=>`<circle cx="128" cy="128" r="${r}" fill="none" stroke="${i%2?'#d39cff':'#8f66c9'}" stroke-width="8" opacity="${.65+i*.12}"/>`).join('')),
 nectar_drop:mk(256,256,`<path d="M128 43 C166 89 182 124 128 203 C74 124 90 89 128 43Z" fill="#ef9bc8" opacity=".72" stroke="#ffd6ea" stroke-width="4"/>`+cir(128,150,32,'#ffd1ea',.3))
};
const nutera={
 hearts:mk(256,64,[32,88,144,200].map((x,i)=>`<path d="M${x} 50 C${x-34} 28 ${x-22} 9 ${x} 22 C${x+22} 9 ${x+34} 28 ${x} 50Z" fill="${['#f291c1','#e875b6','#f7b8d9','#d39cff'][i]}" stroke="#ffe4f3" stroke-width="2"/>`).join('')),
 heart_burst:mk(256,256,`<circle cx="128" cy="128" r="76" fill="#f08bbd" opacity=".18"/><path d="M128 180 C53 129 83 72 128 108 C173 72 203 129 128 180Z" fill="#ff9dcc" stroke="#ffe1f0" stroke-width="5"/>`+[0,1,2,3,4,5].map((i)=>`<circle cx="${128+Math.cos(ii*Math.PI/3)*94}" cy="${128+Math.sin"ii*Math.PI/3)*94}" r="9" fill="#ffc1e0"/>`).join('')),
 estella_logo:mk(512,128,`<rect width="512" height="128" fill="none"/><text x="256" y="79" text-anchor="middle" font-family="serif" font-size="64" font-weight="700" fill="#f29ac7" stroke="#fff0f7" stroke-width="2">ESTELLA</text><path d="M95 72 C70 55 80 35 95 47 C110 35 120 55 95 72Z" fill="#ffb0d6"/><path d="M418 72 C393 55 403 35 418 47 C433 35 443 55 418 72Z" fill="#ffb0d6"/>`),
 sigil:mk(256,256,`<circle cx="128" cy="128" r="93" fill="none" stroke="#d68cff" stroke-width="5"/><circle cx="128" cy="128" r="67" fill="none" stroke="#f3b3dd" stroke-width="3"/><path d="M128 180 C63 136 88 86 128 116 C168 86 193 136 128 180Z" fill="none" stroke="#ffd5eb" stroke-width="5"/>`),
 gauge_heart:mk(128,64,`<path d="M31 51 C-3 26 11 6 31 22 C51 6 65 26 31 51Z" fill="none" stroke="#f2a0c9" stroke-width="4"/><path d="M96 51 C62 26 76 6 96 22 C116 6 130 26 96 51Z" fill="#f08fbe" stroke="#ffe0ee" stroke-width="4"/>`)
};

Object.assign(D,{props,icons,vfx,nutera});
})();
