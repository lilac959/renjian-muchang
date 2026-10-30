import {GLTFLoader} from './vendor/GLTFLoader.js';
import {clone} from './vendor/SkeletonUtils.js';
import {AnimationMixer} from './vendor/three.module.js';
// Replace URLs in the manifest; simulation IDs and coordinates remain unchanged.
export class ModelAssets {
 constructor(){this.templates=new Map();this.revision=0;this.ready=this.load();}
 async load(){const manifest=await fetch('./assets/models/manifest.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();});const loader=new GLTFLoader();await Promise.all(Object.entries(manifest.assets).map(async([id,spec])=>{if(!spec.url)return;try{const gltf=await loader.loadAsync(new URL(spec.url,new URL('./assets/models/',location.href)).href);this.templates.set(id,{gltf,spec});this.revision++;}catch(e){console.warn('模型加载失败，使用占位模型',id,e.message);}}));}
 create(id){const asset=this.templates.get(id);if(!asset)return null;const obj=clone(asset.gltf.scene);obj.scale.setScalar(asset.spec.scale||1);obj.rotation.y=asset.spec.rotationY||0;obj.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});if(asset.gltf.animations.length){const mixer=new AnimationMixer(obj);obj.userData.mixer=mixer;obj.userData.clips=asset.gltf.animations;}return obj;}
}
