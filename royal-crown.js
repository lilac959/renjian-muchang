import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
let source,pending;
export function loadCrown(){return pending??=new GLTFLoader().loadAsync(new URL('./assets/characters/royal/crown.glb',import.meta.url).href).then(g=>{source=g.scene;const bounds=new T.Box3().setFromObject(source),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),scale=.68/Math.max(size.x,size.z);source.scale.multiplyScalar(scale);source.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);}).catch(e=>{pending=null;throw e;});}
export function createCrown(){if(!source)throw Error('Crown asset is not loaded');const group=new T.Group();group.name='RoyalCrown';const model=source.clone(true),materials=[];model.traverse(o=>{if(!o.isMesh)return;o.material=o.material.clone();o.material.roughness=.48;o.material.metalness=.2;o.castShadow=true;materials.push(o.material);});group.add(model);group.userData.materials=materials;return group;}
export function updateCrown(crown,commanding,time){for(const m of crown.userData.materials){m.emissive.set(commanding?'#d54e16':'#000000');m.emissiveIntensity=commanding?.2+Math.sin(time*5)*.08:0;}}
