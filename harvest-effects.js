import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {groundHeight} from './island-layout.js';
// Cosmetic production cues only. No inventory, food or simulation state is changed.
export class HarvestEffects {
 constructor(scene){this.scene=scene;this.items=[];this.lastTime=null;this.elapsed=0;this.cycle=0;}
 async load(){
  const gltf=await new GLTFLoader().loadAsync(new URL('./assets/props/livestock/harvest.glb',import.meta.url).href);
  this.templates={};
  for(const name of ['meat','wool','bone']){
   const source=gltf.scene.getObjectByName(name);
   if(!source)throw new Error('牧业素材缺失：'+name);
   // Retain the exporter axis conversion as well as the mesh transform.
   const root=gltf.scene.clone(true);
   root.traverse(o=>{if(o.isMesh){o.visible=o.name===name;o.castShadow=false;o.receiveShadow=true;}});
   this.templates[name]=root;
  }
 }
 spawn(name,x,y,time,phase=0){
  if(!this.templates||this.items.length>=6)return;
  const root=this.templates[name].clone(true);
  root.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.depthWrite=false;}});
  root.scale.setScalar(name==='wool'?1.8:1.5);this.scene.add(root);
  this.items.push({root,x,y,time,phase});
 }
 clear(){for(const e of this.items){this.scene.remove(e.root);e.root.traverse(o=>{if(o.isMesh)o.material.dispose();});}this.items=[];this.lastTime=null;this.elapsed=0;this.cycle=0;}
 update(world){
  const dt=this.lastTime===null?0:Math.max(0,world.time-this.lastTime);this.lastTime=world.time;
  const c=world.islands[1];
  const working=c&&world.production(c)>0;
  if(working&&!world.result)this.elapsed+=dt;
  if(this.elapsed>=12){
   this.elapsed%=12;this.cycle++;
   if(this.cycle%2)this.spawn('wool',c.x-7,c.y-2,world.time);
   else {this.spawn('meat',c.x+1.5,c.y+6,world.time);this.spawn('bone',c.x+3.1,c.y+6.4,world.time,.8);}
  }
  this.items=this.items.filter(e=>{
   const age=world.time-e.time;
   if(age>=4){this.scene.remove(e.root);e.root.traverse(o=>{if(o.isMesh)o.material.dispose();});return false;}
   const jump=Math.min(1,age/.65),fade=Math.min(1,(4-age)/1.2);
   e.root.position.set(e.x+Math.sin(e.phase)*jump*.35,groundHeight(e)+.08+Math.sin(jump*Math.PI)*.85,e.y);
   e.root.rotation.y=e.phase+jump*.35;
   e.root.traverse(o=>{if(o.isMesh)o.material.opacity=Math.max(0,fade);});return true;
  });
 }
}
