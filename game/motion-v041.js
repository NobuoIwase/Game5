(()=>{
'use strict';
/* v0.41.0 no pop between walking and standing.
   Walking is drawn from the sprite sheet, standing and fighting from the jointed rig; when she
   stops or sets off, one picture used to replace the other in a single frame. Now, for a short
   moment, the two are cross-faded: the rig fades in over the last walking frame when she stops,
   and the last rig pose fades out over the walking frames when she sets off. */
const C={t:.14};
const W=window.WarriorMotion,X=window.WarriorMotionExtra;
if(!W?.drawGame)return;
const base=W.drawGame;
function sprite(c,h,a){
 if(typeof heroSpriteSample!=='function'||typeof drawWalkFrame!=='function')return;
 const q=heroSpriteSample(h),im=q.image;if(!im?.complete||!im.naturalWidth)return;
 const g=c.globalAlpha;c.globalAlpha=g*a;drawWalkFrame(im,q.frame,DIR_ROWS[h.dir]||0,h.x-42,h.y-90,h.dir);c.globalAlpha=g;
}
W.drawGame=function(c,h){
 if(!h||h.dead||h.grapple?.pinned||h.estella?.active)return base(c,h);
 const now=performance.now()/1000,F=h._xf||(h._xf={mode:null,t:-9});
 const g=c.globalAlpha;
 // the new picture is drawn solid underneath and the old one fades out on top of it, so she is
 // never see-through halfway
 const rig=base(c,h)===true;
 const mode=rig?'rig':'sprite';
 if(mode!==F.mode){if(F.mode&&now-F.seen<.2)F.t=now;F.mode=mode}
 F.seen=now;
 const v=Math.min(1,(now-F.t)/C.t);
 if(rig){if(v<1)sprite(c,h,1-v);return true}
 // walking: fade the last rig pose out over the first walking frames, then let the sheet draw
 sprite(c,h,1);
 // v0.43: the rig is drawn through the same size/position calibration as everywhere else
 // (motion-v026.js); without it this fading pose was a third larger than she is
 const T=W.calibration?.[h.dir];
 if(v<1&&X?.draw&&T){c.save();c.globalAlpha=g*(1-v);c.translate(h.x+T.ax,h.y+T.ay);c.scale(T.k,T.k);c.translate(-(h.x+T.bx),-(h.y+T.by));try{X.draw(c,h,{n:'idle'})}finally{c.restore()}}
 return true;   // the walking sheet is drawn here too, inside the same soft halo as the rig (it used to lack it, so she brightened each time she stopped)
};
window.Game5Motion41={version:'0.41.0',cfg:C};
})();
