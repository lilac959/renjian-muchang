import {createCrown,updateCrown} from './royal-crown.js';
import {attachPalette} from './character-palette.js';
import {batchOpaque} from './character-batch.js';
import * as T from './vendor/three.module.js';
import {clone} from './vendor/SkeletonUtils.js';
import {appearance,CLIPS,visualState,toolFor,simulationDelta} from './character-animation.js';
export class CharacterView {
 constructor(source,e){
  this.look=appearance(e.id,e.country);if(e.king)this.look.hat=-1;this.root=new T.Group();this.root.userData.assetId='actor.human';this.root.userData.character=this;
  this.model=clone(source.scene);this.root.add(this.model);this.materials=[];this.tools={};this.meshes=[];this.bones=new Set();
  const remove=[];
  this.model.traverse(o=>{if(o.isBone)this.bones.add(o);if(!o.isMesh)return;const r=o.userData.role,v=o.userData.variant;
   if(r==='prop'){this.tools[o.name.replace('prop_','')]=o;remove.push(o);return;}
   const enabled=r==='outfit'?v===this.look.outfit:r==='head'?v===0:r==='face'?true:r==='hair'?v===(this.look.hat>=0?4:this.look.hair):r==='hat'?v===this.look.hat:false;
   if(!enabled){remove.push(o);return;}o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;this.meshes.push(o);
   if(r==='outfit'){o.material=o.material.clone();this.materials.push(o.material);} // Skin, face and hair retain the original palette.
  });for(const o of remove)o.removeFromParent();
  // All exported parts use one skin. Reuse its palette within this resident,
  // while keeping every resident's bones and skeleton independent.
  let skeleton;for(const mesh of this.meshes)if(mesh.isSkinnedMesh){if(!skeleton)skeleton=mesh.skeleton;else if(mesh.skeleton.bones.every((b,i)=>b===skeleton.bones[i]))mesh.skeleton=skeleton;}
  const batch=batchOpaque(source,this.meshes);for(const m of this.materials)m.dispose();this.materials=[batch.material];this.meshes=this.meshes.filter(m=>m.material.transparent);this.meshes.push(batch.mesh);for(const m of this.meshes){m.boundingSphere=new T.Sphere(new T.Vector3(),300);m.frustumCulled=true;}
  for(const mesh of this.meshes)if(mesh.material.transparent){mesh.material=mesh.material.clone();this.faceMaterials??=[];this.faceMaterials.push(mesh.material);}
  this.releasePalette=attachPalette(this.meshes);
  this.hand=this.model.getObjectByName('RigRPalm');
  this.head=this.model.getObjectByName('RigHead');this.commandArm=this.model.getObjectByName('RigRUpperarm');this.crown=createCrown();this.root.add(this.crown);this.crown.visible=!!e.king;this.headPoint=new T.Vector3();
  this.mixer=new T.AnimationMixer(this.model);this.actions={};for(const [key,name]of Object.entries(CLIPS)){this.actions[key]=this.mixer.clipAction(source.animations.find(a=>a.name===name));}
  this.state='idle';this.actions.idle.play();this.actions.idle.time=this.look.phase*this.actions.idle.getClip().duration;this.mixer.update(0);
  // Source forward is +Z after glTF axis conversion. Feet are at source y=0.
  this.root.scale.setScalar(e.adult?.65:.4);
 }
 hit(event){this.hitUntil=event.time+.3;this.attackPoint={x:event.x,y:event.y};}
 update(e,time){const dt=simulationDelta(time,this.time),reset=this.time!==undefined&&time<this.time;const distance=this.previous?Math.hypot(e.x-this.previous.x,e.y-this.previous.y):0,speed=dt?distance/dt:0;
  if(dt>0&&this.commandPose)this.commandArm.quaternion.copy(this.commandPose);
  if(reset){this.mixer.stopAllAction();this.state='idle';this.actions.idle.reset().play();this.actions.idle.time=this.look.phase*this.actions.idle.getClip().duration;this.hitUntil=0;}
  if(this.hp!==undefined&&e.hp<this.hp)this.hurtUntil=time+.18;
  if(dt>0){const state=visualState(e,speed,this.state!=='idle',time<(this.hitUntil||0));if(state!==this.state&&state!=='dead'){const next=this.actions[state];next.reset().play();next.time=this.look.phase*next.getClip().duration;this.actions[this.state].crossFadeTo(next,.16,false);this.state=state;}
   const action=this.actions[this.state];action.timeScale=this.state==='idle'?1:Math.max(.45,Math.min(1.5,speed/(this.state==='walk'?.6:1.8)||1));
   this.mixer.update(dt);
   let angle;if(time<(this.hitUntil||0)&&this.attackPoint)angle=Math.atan2(this.attackPoint.x-e.x,this.attackPoint.y-e.y);else if(distance>.001)angle=Math.atan2(e.x-this.previous.x,e.y-this.previous.y);
   if(angle!==undefined)this.root.rotation.y+=Math.atan2(Math.sin(angle-this.root.rotation.y),Math.cos(angle-this.root.rotation.y))*Math.min(1,dt*14);
  }
  if(this.commandArm&&dt>0){this.commandPose=this.commandArm.quaternion.clone();if(e.commanding)this.commandArm.rotation.z-=.9;}
  const tool=e.commanding?null:toolFor(e,this.look);if(tool!==this.tool){this.attached?.removeFromParent();this.tool=tool;this.attached=this.tools[tool];if(this.attached&&this.hand){this.hand.add(this.attached);this.attached.position.set(0,0,0);this.attached.rotation.set(0,0,0);this.attached.scale.setScalar(.7);this.attached.castShadow=true;}}
  // Subtle body responses use game time, so pausing freezes every pose.
  const phase=time*3+e.id;
  this.model.rotation.z=e.sick>0?Math.sin(phase)*.055:0;
  this.model.rotation.x=e.sick>0?.10:0;
  this.model.position.y=e.joy>0&&!e.sick&&!e.soldier?Math.max(0,Math.sin(phase))*.045:0;
  this.crown.visible=!!e.king;if(e.king&&this.head){this.root.updateMatrixWorld(true);this.head.getWorldPosition(this.headPoint);this.root.worldToLocal(this.headPoint);this.crown.position.copy(this.headPoint);this.crown.position.y+=.32;this.crown.rotation.z=this.model.rotation.z;updateCrown(this.crown,e.commanding,time);}
  this.root.scale.setScalar(e.adult?.65:.4);this.previous={x:e.x,y:e.y};this.hp=e.hp;this.time=time;
 }
 highlight(color,intensity,time){if(time<(this.hurtUntil||0)){color='#e5b29b';intensity=.65;}if(color===this.tint&&intensity===this.intensity)return;this.tint=color;this.intensity=intensity;for(const m of this.materials){m.emissive.set(color);m.emissiveIntensity=intensity;}}
 dispose(){for(const m of this.crown.userData.materials)m.dispose();this.releasePalette();for(const m of this.faceMaterials||[])m.dispose();this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);const skeletons=new Set();this.model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const s of skeletons)s.dispose();for(const m of this.materials)m.dispose();}
}
