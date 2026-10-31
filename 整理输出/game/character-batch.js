import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
// Source parts have the same skin, bind matrix and local transform. Merge only
// opaque parts; keep the original transparent face as a separate sorted draw.
const cache=new WeakMap();
export function batchOpaque(source,meshes){
 const opaque=meshes.filter(m=>!m.material.transparent),reference=opaque[0];
 const key=opaque.map(m=>m.name).sort().join('|');let variants=cache.get(source);if(!variants)cache.set(source,variants=new Map());let shared=variants.get(key);
 if(!shared){const parts=[],textures=[],colors=[];for(const mesh of opaque){const g=mesh.geometry.clone(),slot=parts.length;g.setAttribute('surface',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(slot),1));parts.push(g);textures.push(mesh.material.map);colors.push(mesh.material.color.clone());}const geometry=mergeGeometries(parts);for(const p of parts)p.dispose();shared={geometry,textures,colors,clothing:opaque.findIndex(m=>m.userData.role==='outfit')};variants.set(key,shared);}
 const material=reference.material.clone();material.color.setRGB(1,1,1);material.map=shared.textures[0];
 material.onBeforeCompile=shader=>{for(let i=0;i<shared.textures.length;i++){shader.uniforms['surfaceMap'+i]={value:shared.textures[i]};shader.uniforms['surfaceColor'+i]={value:shared.colors[i]};}
  shader.vertexShader='attribute float surface;varying float vSurface;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurface=surface;');
  shader.fragmentShader='varying float vSurface;\n'+shared.textures.map((_,i)=>`uniform sampler2D surfaceMap${i};uniform vec3 surfaceColor${i};`).join('\n')+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',shared.textures.map((_,i)=>`${i?'else ':''}if(vSurface<${i+.5}){diffuseColor*=texture2D(surfaceMap${i},vMapUv)*vec4(surfaceColor${i},1.0);}`).join('\n'));
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>\nif(abs(vSurface-${shared.clothing.toFixed(1)})>.1)totalEmissiveRadiance=vec3(0.);`);
 };
 material.customProgramCacheKey=()=>`peasant-surfaces-${shared.textures.length}-${shared.clothing}`;
 const mesh=new T.SkinnedMesh(shared.geometry,material);mesh.name='resident_opaque';mesh.position.copy(reference.position);mesh.quaternion.copy(reference.quaternion);mesh.scale.copy(reference.scale);mesh.bind(reference.skeleton,reference.bindMatrix);mesh.castShadow=true;mesh.receiveShadow=true;
 // Conservative bounds enclose all sampled in-place poses; no animation LOD.
 mesh.boundingSphere=new T.Sphere(new T.Vector3(),300);mesh.frustumCulled=true;
 reference.parent.add(mesh);for(const m of opaque)m.removeFromParent();return{mesh,material};
}
