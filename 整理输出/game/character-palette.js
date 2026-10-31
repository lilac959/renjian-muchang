import {renderCharacterInstances} from './character-instances.js';
import * as T from './vendor/three.module.js';
// One upload for all independent skeletons, without reducing pose frequency.
const capacity=256,bones=40,width=256,height=256,data=new Float32Array(width*height*4);
const texture=new T.DataTexture(data,width,height,T.RGBAFormat,T.FloatType);texture.needsUpdate=true;
const free=Array.from({length:capacity},(_,i)=>capacity-1-i),active=new Set();
function patch(material,offset){const original=material.onBeforeCompile,key=material.customProgramCacheKey();material.onBeforeCompile=function(shader,renderer){original.call(this,shader,renderer);shader.uniforms.paletteOffset={value:offset};shader.vertexShader='uniform float paletteOffset;\n'+shader.vertexShader.replace('#include <skinning_pars_vertex>',T.ShaderChunk.skinning_pars_vertex.replace('int( i )','int( i + paletteOffset )'));};material.customProgramCacheKey=()=>key+'-shared-palette';}
export function attachPalette(meshes){const slot=free.pop();if(slot===undefined)throw Error('角色骨骼容量已满');const skeleton=meshes[0].skeleton;if(skeleton.bones.length!==bones)throw Error('角色骨架不匹配');const nativeUpdate=skeleton.update;skeleton.boneMatrices=data.subarray(slot*bones*16,(slot+1)*bones*16);skeleton.boneTexture=texture;skeleton.update=()=>{};const materials=[];
 for(const mesh of meshes){mesh.skeleton=skeleton;patch(mesh.material,slot*bones);const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:mesh.material.side});patch(depth,slot*bones);mesh.customDepthMaterial=depth;materials.push(depth);}
 const record={slot,skeleton,nativeUpdate,meshes};active.add(record);return()=>{active.delete(record);free.push(slot);skeleton.boneTexture=null;for(const m of materials)m.dispose();};}
export function updateCharacterPalettes(scene){scene.updateMatrixWorld(true);scene.matrixWorldAutoUpdate=false;for(const {skeleton,nativeUpdate}of active)nativeUpdate.call(skeleton);renderCharacterInstances(scene,active,texture);}
