import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
// Combine only identical-material static decorations. Positions, UVs, normals and
// vertex colors are copied unchanged; terrain stays separate for pointer picking.
export function batchSourceDecorations(root){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),groups=new Map();
 root.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||Array.isArray(o.material)||['terrain','bridge','prototype'].includes(o.userData.role)||o.geometry.hasAttribute('_meadow'))return;
  for(let parent=o.parent;parent&&parent!==root;parent=parent.parent)if(['terrain','bridge','prototype'].includes(parent.userData.role))return;
  const key=o.material.uuid+'|'+Object.keys(o.geometry.attributes).sort().join(',')+'|'+!!o.geometry.index;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 });
 let saved=0;
 for(const meshes of groups.values()){
  if(meshes.length<2)continue;
  const parts=meshes.map(o=>o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));
  const geometry=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!geometry)continue;
  const batch=new T.Mesh(geometry,meshes[0].material);batch.name='Source batch '+meshes[0].material.name;batch.castShadow=true;batch.receiveShadow=true;root.add(batch);
  for(const o of meshes)o.removeFromParent();saved+=meshes.length-1;
 }
 return saved;
}
