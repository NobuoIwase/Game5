(()=>{
'use strict';
const A=window.Game5Assets;if(!A)return;
const load=s=>{const i=new Image();i.src=s;return i};
const atlases={
 mon:load('./assets/requested/generated/monsters_v018.png'),
 floor:load('./assets/requested/generated/floors_v018.png'),
 extras:load('./assets/requested/generated/extras_v018.png'),
 allies:load('./assets/requested/generated/allies_v018.png')
};
function crop(im,cols,rows,i,ow=64,oh=64){
 const c=document.createElement('canvas');c.width=ow;c.height=oh;const g=c.getContext('2d');g.imageSmoothingEnabled=true;
 const sw=im.naturalWidth/cols,sh=im.naturalHeight/rows,sx=(i%cols)*sw,sy=Math.floor(i/cols)*sh;g.drawImage(im,sx,sy,sw,sh,0,0,ow,oh);
 const o=new Image();o.src=c.toDataURL('image/png');return o
}
const types=['gel','slug','leech','worm','orb','flower','moth','mirror_slime','silk_spider','bubble_shell','crown_attendant'];
function ready(im,fn){if(im.complete&&im.naturalWidth)fn();else im.addEventListener('load',fn,{once:true})}
ready(atlases.mon,()=>{for(let i=0;i<types.length;i++)A.requested.monsters[types[i]]=crop(atlases.mon,4,3,i,96,96)});
ready(atlases.floor,()=>{for(let i=0;i<7;i++){A.requested.floor[i]=true;A.requested.floorImg[i]=crop(atlases.floor,4,2,i,64,64)}});
ready(atlases.extras,()=>{
 const p=[];for(let i=0;i<12;i++)p[i]=crop(atlases.extras,4,3,i,64,64);
 window.Game5Props={chest:p[0],mimic:p[1],tower:p[2],stairs:p[3],pool:p[7]};
 if(A.vfx){A.vfx.spore_puff=p[4];A.vfx.silk_wrap=p[5];A.vfx.nectar_drop=p[6];A.vfx.hypno_ring=p[8];A.vfx.ringbeam=p[9];A.vfx.nutera_heart=p[10];A.vfx.estella=p[11]}
 const buttons=[...document.querySelectorAll('[data-tool]')];
 for(let i=0;i<buttons.length;i++){const b=buttons[i],im=p[4+i%8];if(!im)continue;const n=document.createElement('img');n.className='ticon';n.src=im.src;b.classList.add('hasIcon');b.appendChild(n)}
});
ready(atlases.allies,()=>{
 const names=['sister','witch','scout'];const out={};for(let i=0;i<names.length;i++)out[names[i]]=crop(atlases.allies,3,1,i,128,160);window.Game5AllyArt=out;
});
window.Game5GeneratedPNG={version:'0.18.1',atlases,allies:atlases.allies};
})();
