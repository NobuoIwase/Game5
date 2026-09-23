(()=>{
'use strict';
/* v0.16.0 drop-in monster species.
   Species designed outside the code (for example with ChatGPT, see ASSET_REQUESTS.md §8) are
   read from assets/requested/manifest.json -> "species" (an array, or a path to a JSON file
   holding the array). Each entry becomes a full monster: stats, five skills, Nutera effects,
   AI spacing role, optional picture, and the floors it joins as a support. */
const KEYS=['cleave','charge','bind','fog','bolt'];
function install(sp){
 const M=window.Game5Monsters,S=window.Game5MonsterSkills,AI=window.Game5EnemyAI;
 if(!M||!S||!sp?.type||M.profiles[sp.type]&&!sp.override)return false;
 const look=sp.look||{};
 M.profiles[sp.type]={name:sp.name||sp.type,family:sp.family||sp.type,sprite:look.sprite??0,hue:look.hue??0,hp:+sp.hp||220,r:+sp.r||24,speed:+sp.speed||70,
  weights:(sp.weights||KEYS).filter(k=>KEYS.includes(k)),extra:sp.nutera||{}};
 if(sp.familyName)ENEMY_FAMILY_LABELS[sp.family||sp.type]=sp.familyName;
 // every skill slot must be defined, or the previous monster's numbers would leak in
 const base=S.defs.gel,def={};
 for(const k of KEYS){const s=sp.skills?.[k],[bn,bp]=base[k];def[k]=s?[s.name||bn,{...bp,...s,name:undefined}]:[bn,{...bp}];delete def[k][1].name}
 S.defs[sp.type]=def;
 if(AI?.roles)AI.roles[sp.type]={pref:120,label:'間合いを詰める',...(sp.role||{})};
 if(sp.image){const i=new Image();i.src=`./assets/requested/${sp.image}`;(window.Game5Assets?.requested?.monsters||{})[sp.type]=i}
 if(look.filter)(window.Game5SpeciesLook||={})[sp.type]=look.filter;
 for(const f of sp.floors||[]){const list=window.Game5MultiEnemy?.supports?.[f];if(list&&!list.includes(sp.type))list.push(sp.type)}
 return true;
}
const loaded=[];
fetch('./assets/requested/manifest.json').then(r=>r.ok?r.json():null).then(async m=>{
 let list=m?.species;if(!list)return;
 if(typeof list==='string')list=await fetch(`./assets/requested/${list}`).then(r=>r.json());
 for(const sp of list)if(install(sp)){loaded.push(sp.type);log(`新種「${sp.name||sp.type}」がダンジョンに加わった。`)}
}).catch(e=>console.warn('species load failed',e));
window.Game5Species={version:'0.16.0',install,loaded};
})();
