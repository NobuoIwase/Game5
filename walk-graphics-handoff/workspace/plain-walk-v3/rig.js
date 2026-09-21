/* Shared by the offline player and the exported sprite renderer. */
(function(root){
'use strict';
const rad=x=>x*Math.PI/180, deg=x=>x*180/Math.PI;
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
const down=(a,l)=>[-Math.sin(rad(a))*l,Math.cos(rad(a))*l];
const angle=(a,b)=>deg(Math.atan2(-(b[0]-a[0]),b[1]-a[1]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const labels={head:'頭部',neck:'首',upper_body:'上半身・胸郭',lower_body:'下半身・骨盤',upper_arm:'上腕',elbow:'肘関節',forearm:'前腕',hand:'手',thigh:'上腿',knee:'膝関節',shin:'下腿',foot:'足',shoulder:'肩関節',hip:'股関節',wrist:'手首',ankle:'足首',waist:'腰関節'};
Object.assign(labels,{foot_heel:'足・踵の接地',foot_swing:'足・着地前',foot_toe:'足・蹴り出し'});
function ik(hip,target,l1,l2){
 let dx=target[0]-hip[0],dy=target[1]-hip[1],d=Math.hypot(dx,dy);
 if(d>l1+l2-.05){const q=(l1+l2-.05)/d;dx*=q;dy*=q;d=l1+l2-.05;}
 const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
 return {hip:hip.slice(),knee:[hip[0]+a*dx/d+h*dy/d,hip[1]+a*dy/d-h*dx/d],ankle:[hip[0]+dx,hip[1]+dy]};
}
function soleOffset(asset,a){
 const c=Math.cos(rad(a)),s=Math.sin(rad(a)),[px,py]=asset.pivot;
 return Math.max(...asset.opaque_corners.map(([x,y])=>s*(x-px)+c*(y-py)));
}
function makePose(view,frame,config,assets,params={}){
 const f=((frame%8)+8)%8,C=config,V=C[view],A=assets[view],P={...C.parameters,...params};
 const bob=V.bob[f%4],sway=view==='front'?V.sway[f]:0,rootX=V.root_x+sway;
 const lean=view==='side'?V.lean_degrees:sway*.45,waist=[rootX,C.body.waist_y+bob],hipY=C.body.hip_y+bob;
 const around=(x,y)=>[waist[0]+x*Math.cos(rad(lean))-y*Math.sin(rad(lean)),waist[1]+x*Math.sin(rad(lean))+y*Math.cos(rad(lean))];
 const spine={};
 for(const [name,offset] of Object.entries(C.body.spine_side))spine[name]=[rootX+(view==='side'?offset[0]:0),hipY+offset[1]];
 if(view==='side'){
  // Register the neck to the visible torso opening rather than to a detached
  // world-space peg. Both the sprite and cervical bone share this socket.
  const s=A.upper_body.neck_socket,p=A.upper_body.pivot;
  spine.cervical=around(s[0]-p[0],s[1]-p[1]);
  spine.neck=add(spine.cervical,C.side.neck_tip_offset);
 }
 const neck=spine.neck,head=add(neck,view==='side'?C.side.head_offset:[0,0]);
 const nodes={root:{parent:null,position:[rootX,hipY]},sacrum:{parent:'root',position:spine.sacrum},lumbar:{parent:'sacrum',position:spine.lumbar},thorax:{parent:'lumbar',position:spine.thorax},cervical:{parent:'thorax',position:spine.cervical},waist:{parent:'lumbar',position:waist},neck:{parent:'cervical',position:neck},head:{parent:'neck',position:head}};
 const ops=[],chains=[],armInfo={};
 const node=(id,parent,p,meta={})=>{nodes[id]={parent,position:p,...meta};return p;};
 function part(asset,id,p,rotation=0,sx=1,sy=1,parent=null){
  return {id,asset,parent,position:p.slice(),angle:rotation,scale:[sx,sy],pivot:A[asset].pivot.slice()};
 }
 function segment(asset,id,a,b,parent){
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const mirror=view==='front'&&id.endsWith('_near')&&['upper_arm','forearm'].includes(asset)?-1:1;
  return part(asset,id,a,angle(a,b),mirror,length/A[asset].length,parent);
 }
 function connector(asset,id,p,parent){return part(asset,id,p,0,1,1,parent);}
 function leg(side,k){
  const lateral=side==='far'?-1:1;
  const footAngle=C.gait.foot_angle[k];
  const footBottom=soleOffset(assets.side.foot,footAngle);
  const targetY=k<=4?C.ground_y-footBottom:C.gait.swing_ankle_y[k];
  const sagittal=ik([C.side.root_x,C.body.hip_y+C.side.bob[f%4]],[C.side.root_x+C.gait.foot_forward[k],targetY],C.lengths.thigh,C.lengths.shin);
  let h,knee,ankle,fa,footScale=1,footAsset='foot';
  if(view==='side'){
   h=sagittal.hip;knee=sagittal.knee;ankle=sagittal.ankle;fa=footAngle;
  }else{
   h=[rootX+lateral*C.front.hip_half_width,hipY];
   footAsset=C.front.foot_assets[k];
   footScale=C.front.foot_scale[k];
   const bottom=C.front.foot_bottom[k];
   const ay=bottom-soleOffset(A[footAsset],0)*footScale;
   const t=(sagittal.knee[1]-sagittal.hip[1])/(sagittal.ankle[1]-sagittal.hip[1]);
   knee=[h[0]+lateral*.35,hipY+(ay-hipY)*t];
   ankle=[h[0]+sway*.15,ay];fa=sway*.5;
  }
  const thighDepth=sagittal.knee[0]-sagittal.hip[0],shinDepth=sagittal.ankle[0]-sagittal.hip[0];
  const tv=[sagittal.knee[0]-sagittal.hip[0],sagittal.knee[1]-sagittal.hip[1]],sv=[sagittal.ankle[0]-sagittal.knee[0],sagittal.ankle[1]-sagittal.knee[1]];
  const kneeFlex=deg(Math.acos(clamp((tv[0]*sv[0]+tv[1]*sv[1])/Math.hypot(...tv)/Math.hypot(...sv),-1,1)));
  node('hip_'+side,'root',h,{phase:k,inside_pelvis:true,thigh_depth:thighDepth});node('knee_'+side,'hip_'+side,knee,{sagittal_position:sagittal.knee,flex:kneeFlex,occluded_by:shinDepth>0?'shin':'thigh'});
  node('ankle_'+side,'knee_'+side,ankle,{foot_angle:fa,foot_pitch:footAngle,foot_asset:footAsset,contact:k<=4,sagittal_position:sagittal.ankle});
  const fo=part(footAsset,'foot_'+side,ankle,fa,footScale,footScale,'ankle_'+side);
  const thigh=segment('thigh','thigh_'+side,h,knee,'hip_'+side),shin=segment('shin','shin_'+side,knee,ankle,'knee_'+side);
  const cap=connector('knee','knee_joint_'+side,knee,'hip_'+side);
  const group=[connector('hip','hip_joint_'+side,h,'root')];
  if(view==='front'){
   // The kneecap is between the nearer and farther segment surfaces. Its
   // visibility changes through real pixel occlusion, not a fixed top layer.
   const nearSegment=shinDepth>0?shin:thigh,farSegment=shinDepth>0?thigh:shin;
   cap.scale[1]=clamp(1-kneeFlex/180,.62,1);
   group.push(farSegment,cap,nearSegment,connector('ankle','ankle_joint_'+side,ankle,'knee_'+side),fo);
  }else group.push(thigh,cap,shin,connector('ankle','ankle_joint_'+side,ankle,'knee_'+side),fo);
  chains.push(['hip_'+side,'knee_'+side,'ankle_'+side]);
  return {ops:group,foreground:view==='side'?side==='near':thighDepth>1.5,depth:thighDepth};
 }
 function arm(side,k){
  const lateral=side==='far'?-1:1;
  const shoulder=view==='side'?[rootX+C.body.side_shoulder_x[side],waist[1]+C.body.shoulder_y]:around(lateral*C.front.shoulder_half_width,C.body.shoulder_y);
  const upper=C.arms.upper_angle[k]*P.arm_swing;
  const flex=clamp(26+(C.arms.elbow_flex[k]-26)*P.elbow_variation,6,58);
  const lower=upper-flex,wristFlex=C.arms.wrist_flex[k],handAngle=lower+wristFlex;
  const elbowSag=down(upper,C.lengths.upper_arm),wristSag=add(elbowSag,down(lower,C.lengths.forearm));
  let elbow,wrist,drawHandAngle,handSy=1;
  if(view==='side'){
   elbow=add(shoulder,elbowSag);wrist=add(shoulder,wristSag);drawHandAngle=handAngle;
  }else{
   // Resting abduction gives the armpit and waist breathing room without
   // broadening the shoulder roots. Sagittal motion still controls depth.
   const clearance=C.front.arm_clearance;
   elbow=[shoulder[0]+lateral*(clearance.elbow+.04*Math.max(0,elbowSag[0])),shoulder[1]+elbowSag[1]-.08*elbowSag[0]];
   wrist=[shoulder[0]+lateral*(clearance.wrist+.035*wristSag[0]),shoulder[1]+wristSag[1]-.08*wristSag[0]];
   drawHandAngle=lateral*(4-.18*wristFlex);handSy=clamp(Math.cos(rad(handAngle)),.64,1);
  }
  node('shoulder_'+side,'thorax',shoulder,{upper_angle:upper});
  node('elbow_'+side,'shoulder_'+side,elbow,{flex,local_rotation:-flex,depth:elbowSag[0]});
  node('wrist_'+side,'elbow_'+side,wrist,{local_rotation:wristFlex,depth:wristSag[0]});
  node('hand_'+side,'wrist_'+side,add(wrist,down(drawHandAngle,7*handSy)),{angle:handAngle});
  armInfo[side]={upper_angle:upper,elbow_flex:flex,wrist_flex:wristFlex,depth:wristSag[0]};
  const group=[connector('shoulder','shoulder_joint_'+side,shoulder,'thorax'),segment('upper_arm','upper_arm_'+side,shoulder,elbow,'shoulder_'+side),
   connector('elbow','elbow_joint_'+side,elbow,'shoulder_'+side),segment('forearm','forearm_'+side,elbow,wrist,'elbow_'+side),
   connector('wrist','wrist_joint_'+side,wrist,'elbow_'+side),part('hand','hand_'+side,wrist,drawHandAngle,view==='front'&&side==='near'?-1:1,handSy,'wrist_'+side)];
  chains.push(['shoulder_'+side,'elbow_'+side,'wrist_'+side,'hand_'+side]);
  return group;
 }
 const legs={far:leg('far',view==='side'?(f+4)%8:f),near:leg('near',view==='side'?f:(f+4)%8)};
 const arms={far:arm('far',view==='side'?(f+4)%8:f),near:arm('near',view==='side'?f:(f+4)%8)};
 const sortedLegs=Object.values(legs).sort((a,b)=>a.depth-b.depth);
 for(const leg of sortedLegs)if(!leg.foreground)ops.push(...leg.ops);
 if(view==='side')ops.push(...arms.far);
 else for(const side of ['far','near'])if(armInfo[side].depth<0)ops.push(...arms[side]);
 ops.push(connector('waist','waist_joint',waist,'root'),part('lower_body','lower_body',waist,C.body.pelvis_roll[f],1,1,'root'));
 for(const leg of sortedLegs)if(leg.foreground)ops.push(...leg.ops);
 // Bury both ends of the neck under the torso and skull, avoiding a rim or
 // a visible rectangular corner where the three pieces meet.
 if(view==='side'){
  const base=add(spine.cervical,[0,3.5]),mid=[(base[0]+neck[0])/2,(base[1]+neck[1])/2];
  ops.push(part('neck','neck',mid,angle(neck,base),.875,(Math.hypot(base[0]-neck[0],base[1]-neck[1])+4)/A.neck.size[1],'cervical'));
 }else ops.push(part('neck','neck',add(neck,[0,4]),lean,1,1,'cervical'));
 ops.push(part('upper_body','upper_body',waist,lean,1,1,'waist'));
 if(view==='side')ops.push(...arms.near);
 else for(const side of ['far','near'])if(armInfo[side].depth>=0)ops.push(...arms[side]);
 ops.push(part('head','head',head,0,1,1,'neck'));
 chains.push(['sacrum','lumbar','thorax','cervical','neck'],['root','sacrum'],['shoulder_far','thorax','shoulder_near'],['hip_far','hip_near']);
 return {view,frame:f,ops,joints:nodes,chains,arms:armInfo,body_bob:bob};
}
function draw(ctx,pose,images,assets,opts={}){
 ctx.imageSmoothingEnabled=false;
 for(const t of pose.ops){
  ctx.save();ctx.translate(t.position[0],t.position[1]);ctx.rotate(rad(t.angle));ctx.scale(t.scale[0],t.scale[1]);
  ctx.drawImage(images[pose.view][t.asset],-t.pivot[0],-t.pivot[1]);ctx.restore();
 }
 if(opts.joints){
  ctx.save();ctx.lineWidth=.7;ctx.strokeStyle='#58dcca';
  for(const chain of pose.chains){ctx.beginPath();chain.forEach((id,i)=>{const p=pose.joints[id].position;i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.stroke();}
  for(const [id,n] of Object.entries(pose.joints)){
   if(id.startsWith('hand_')||id==='head')continue;
   ctx.beginPath();ctx.arc(...n.position,1.65,0,Math.PI*2);ctx.fillStyle=id.startsWith('elbow')?'#ffc581':'#58dcca';ctx.fill();
  }
  ctx.restore();
 }
}
function drawStage(ctx,pose,images,assets,opts={}){
 const w=ctx.canvas.width,h=ctx.canvas.height,s=w/192;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#20232d';ctx.fillRect(0,0,w,h);ctx.save();ctx.scale(s,s);
 ctx.strokeStyle='#2b2f3c';ctx.lineWidth=.5;
 for(let x=0;x<=192;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}
 for(let y=2;y<=256;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(192,y);ctx.stroke();}
 ctx.fillStyle='#151821';ctx.beginPath();ctx.ellipse(pose.view==='side'?104:96,243,30,4,0,0,Math.PI*2);ctx.fill();
 draw(ctx,pose,images,assets,opts);ctx.restore();
}
const api={makePose,draw,drawStage,labels,soleOffset};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PlainWalkRig=api;
})(typeof globalThis!=='undefined'?globalThis:this);
