(()=>{
'use strict';
const D={
 gel:{cleave:['ぬめり包み',{cast:.76,range:142,step:34}],charge:['滑走抱擁',{cast:.94,range:330,width:78,travel:185}],bind:['粘膜拘束',{cast:1.02,range:310,r:82,status:{bind:1.85}}],fog:['濃密な粘霧',{cast:1.18,range:400,r:108}],bolt:['共鳴波',{cast:1.24,range:430,width:84}]},
 slug:{cleave:['粘尾なで',{cast:.64,range:116,step:26}],charge:['ぬめり滑走',{cast:.80,range:282,width:72,travel:168}],bind:['吸着巻き',{cast:.92,range:248,r:74,status:{bind:1.55}}],fog:['粘液膜',{cast:1.02,range:330,r:96}],bolt:['誘引しずく',{cast:1.06,range:355,width:76}]},
 leech:{cleave:['羽擦り',{cast:.54,range:108,step:30}],charge:['吸着急降下',{cast:.72,range:340,width:56,travel:205}],bind:['まとわり吸着',{cast:.84,range:270,r:64,status:{bind:.7}}],fog:['湿った鱗粉',{cast:1.0,range:380,r:110}],bolt:['誘眠瞬き',{cast:1.1,range:420,width:64}]},
 worm:{cleave:['体擦り',{cast:.68,range:132,step:36}],charge:['柔輪すべり',{cast:.84,range:315,width:86,travel:174}],bind:['全身巻きつき',{cast:.96,range:275,r:78,status:{bind:2.35}}],fog:['湿り気の膜',{cast:1.08,range:330,r:92}],bolt:['輪動共鳴',{cast:1.12,range:380,width:80}]},
 orb:{cleave:['胞子吐息',{cast:.70,range:150,step:0}],charge:['ふわり接近',{cast:.66,range:245,width:70,travel:112}],bind:['浮遊膜',{cast:.90,range:310,r:86,status:{slow:1.4}}],fog:['甘い胞子霧',{cast:.94,range:420,r:118}],bolt:['ルマネ波',{cast:1.0,range:445,width:92}]},
 flower:{cleave:['花弁なで',{cast:.66,range:146,step:22}],charge:['蔓のすべり寄せ',{cast:.86,range:300,width:66,travel:118}],bind:['柔蔓絡み',{cast:.90,range:330,r:88,status:{bind:2.0}}],fog:['花蜜霧',{cast:1.02,range:390,r:108}],bolt:['誘引花粉',{cast:1.06,range:410,width:82}]},
 moth:{cleave:['鱗粉の羽撫で',{cast:.56,range:122,step:24}],charge:['漂い接近',{cast:.72,range:315,width:60,travel:160}],bind:['羽膜包み',{cast:.88,range:285,r:74,status:{bind:1.15}}],fog:['夢鱗粉',{cast:.96,range:430,r:116}],bolt:['催眠眼紋',{cast:1.16,range:460,width:78}]}
};
const base=Game5Monsters.apply;
Game5Monsters.apply=function(type,level=1){
 const r=base(type,level),p=D[type]||D.gel;
 for(const k of Object.keys(p)){
   const [name,patch]=p[k];ENEMY_LABELS[k]=name;
   Object.assign(ENEMY_SKILLS[k],patch,{name});
 }
 return r;
};
window.Game5MonsterSkills={version:'0.11.0',defs:D};
})();