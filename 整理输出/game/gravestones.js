import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {groundHeight} from './island-layout.js';
export class Gravestones{
 constructor(scene){this.group=new T.Group();this.group.name='CorpseGravestones';scene.add(this.group);this.pool=[];}
 async load(){const gltf=await new GLTFLoader().loadAsync(new URL('./assets/props/gravestone/gravestone.glb',import.meta.url).href);this.source=gltf.scene;const box=new T.Box3().setFromObject(this.source),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=.85/size.y;this.source.scale.multiplyScalar(scale);this.source.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);this.source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});}
 update(corpses,selected=[]){let used=0;for(const b of corpses){if(b.life<=0)continue;let root=this.pool[used++];if(!root){root=new T.Group();const model=this.source.clone(true);model.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});root.add(model);this.pool.push(root);this.group.add(root);}root.visible=true;const lit=selected.includes(b.id);root.traverse(o=>{if(o.isMesh&&o.material.emissive){o.material.emissive.set(lit?'#d4b3f2':'#000000');o.material.emissiveIntensity=lit?.85:0;}});root.position.set(b.x,groundHeight(b)+.015,b.y);root.rotation.y=(b.id%5-2)*.10;}for(let i=used;i<this.pool.length;i++)this.pool[i].visible=false;}
 clear(){for(const root of this.pool)root.visible=false;}
}
