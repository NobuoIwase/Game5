(()=>{
'use strict';
const P={
 gel:{name:'灰冠の粘魔',family:'gray_crown',sprite:0,hue:0,hp:520,r:31,speed:72,weights:['cleave','bind','charge','fog','bolt'],extra:{cleave:{nutera:8},charge:{nutera:12},bind:{nutera:16,lumane:12},fog:{sail:6,lumane:8},bolt:{nutera:8,hypnosis:12}}},
 slug:{name:'艶沼ナメクジ',family:'slug',sprite:0,hue:85,hp:250,r:25,speed:58,weights:['bind','cleave','fog','charge','bolt'],extra:{cleave:{nutera:8,charm:8},charge:{nutera:11,sail:3},bind:{nutera:18,charm:15},fog:{nutera:4,sail:7,lumane:8},bolt:{lumane:14,charm:14}}},
 leech:{name:'吸着羽虫',family:'leech',sprite:2,hue:12,hp:185,r:21,speed:104,weights:['charge','bind','fog','bolt','cleave'],extra:{cleave:{nutera:7},charge:{nutera:7,attach:1},bind:{nutera:10,attach:2},fog:{sail:5,hypnosis:12},bolt:{hypnosis:28,charm:10}}},
 worm:{name:'絹輪ワーム',family:'worm',sprite:1,hue:-36,hp:330,r:29,speed:66,weights:['bind','cleave','charge','fog','bolt'],extra:{cleave:{nutera:10},charge:{nutera:13},bind:{nutera:22,lumane:14},fog:{sail:6,lumane:7},bolt:{nutera:8,lumane:18}}},
 orb:{name:'ルマネ胞子球',family:'gazer',sprite:2,hue:95,hp:170,r:22,speed:78,weights:['fog','bolt','fog','bind','charge'],extra:{cleave:{nutera:4,lumane:10},charge:{sail:4},bind:{nutera:6,lumane:12},fog:{nutera:4,sail:10,lumane:20,hypnosis:7},bolt:{sail:5,lumane:24}}},
 flower:{name:'粘花',family:'demon',sprite:1,hue:110,hp:295,r:30,speed:34,weights:['bind','fog','cleave','bolt','charge'],extra:{cleave:{nutera:9,lumane:9},charge:{nutera:10},bind:{nutera:20,lumane:17},fog:{sail:8,lumane:14,charm:9},bolt:{hypnosis:12,charm:18}}},
 moth:{name:'夢鱗蛾',family:'gazer',sprite:3,hue:0,hp:225,r:24,speed:92,weights:['bolt','fog','bind','charge','cleave'],extra:{cleave:{nutera:6,hypnosis:8},charge:{nutera:6,hypnosis:9},bind:{nutera:11,hypnosis:18},fog:{sail:5,lumane:7,hypnosis:22},bolt:{nutera:5,hypnosis:38,charm:16}}}
};
Object.assign(ENEMY_FAMILY_LABELS,{slug:'ナメクジ種',leech:'吸着羽虫種',worm:'ワーム種',gazer:'夢鱗種',demon:'粘花種'});
function apply(type,level=1){
 const p=P[type]||P.gel,e=state.enemy,s=1+(level-1)*.15;
 Object.assign(e,{type,name:p.name,family:p.family,familyName:ENEMY_FAMILY_LABELS[p.family]||p.family,visualIndex:p.sprite,visualHue:p.hue,r:p.r,moveSpeed:p.speed,maxHp:Math.round(p.hp*s),hp:Math.round(p.hp*s),phase:1,cast:null,actCd:.8,stun:0,root:0,slow:0,guard:0,flash:0,poison:0,decision:'探索者を観察',level});
 state.hero.memory.enemyId=type;
 state.hero.knowledgeBySpecies ||= {};
 state.hero.knowledgeBySpecies[type] ||= {cleave:0,charge:0,bind:0,fog:0,bolt:0};
 state.hero.knowledge=state.hero.knowledgeBySpecies[type];
 return p;
}
function fx(key){
 const e=state.enemy,p=P[e?.type]||P.gel;return p.extra[key]||{};
}
const oldChoose=chooseEnemyAction;
chooseEnemyAction=function(){
 const e=state.enemy,h=chooseTarget(),p=P[e?.type]; if(!e||!h||!p)return oldChoose();
 if(h.estella?.active){startEnemySkill(dist(e,h)<190?'bind':'charge',h);e.decision='漏出MPへ寄る';return}
 const k=p.weights[Math.floor(Math.random()*p.weights.length)]; startEnemySkill(k,h);
};
const oldResolve=resolveEnemy;
resolveEnemy=function(c){
 const h=state.hero,e=state.enemy,k=c?.key,x=fx(k),hp0=h?.hp,sp0=h?.sp;
 oldResolve(c);
 if(!h||!e||!k||h.dead)return;
 const hit=(hp0!==h.hp)||(sp0!==h.sp)||h.dodgeCastId!==c.id;
 if(!hit)return;
 const src=`${e.name}・${ENEMY_LABELS[k]||k}`;
 if(x.nutera)applyNutera(h,x.nutera,{source:src});
 if(x.sail)applySail(h,x.sail);
 if(x.lumane)applyTiered(h,'lumane',x.lumane,{source:src});
 if(x.hypnosis)applyTiered(h,'hypnosis',x.hypnosis,{source:src});
 if(x.charm)applyTiered(h,'charm',x.charm,{family:e.family,source:src});
 if(x.attach){
   h.attachments ||= [];
   h.attachments.push({t:x.attach===2?5.2:4.2,rate:x.attach===2?5.8:4.8,sp:x.attach===2?1.8:1.2,label:e.name});
   log(`${e.name}が吸着し、動くたびにぬめりの摩擦が続く。`);
 }
};
const oldHero=updateHero;
updateHero=function(h,dt){
 oldHero(h,dt);
 h.attachments ||= [];
 for(const a of h.attachments){
   a.t-=dt;applyNutera(h,a.rate*dt*(h.moving?1.3:1),{source:`${a.label}の吸着摩擦`});drainSp(h,a.sp*dt,'');
 }
 h.attachments=h.attachments.filter(a=>a.t>0);
};
window.Game5Monsters={version:'0.11.0',profiles:P,apply};
})();