(function(g){
'use strict';
const BASE='../character-motion-v1/',DIRS=['front','down_right','right','up_right','back','up_left','left','down_left'];
const S={rig:null,gear:null,err:'',imgs:new Map(),seg:new Map()};
const A=new Set(['melee','heavy']);
const rad=d=>d*Math.PI/180,cl=v=>Math.max(0,Math.min(1,v)),lerp=(a,b,t)=>a+(b-a)*t;
function rot(c,p,a){c.translate(p[0],p[1]);c.rotate(rad(a));c.translate(-p[0],-p[1])}
function path(c,p){if(!p?.length)return false;c.beginPath();c.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)c.lineTo(p[i][0],p[i][1]);c.closePath();return true}
function half(poly,o,n,k,less){const dot=p=>(p[0]-o[0])*n[0]+(p[1]-o[1])*n[1],inside=p=>less?dot(p)<=k:dot(p)>=k,out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly["i"=i+q);
}
}
