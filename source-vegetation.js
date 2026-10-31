import {cloudGLSL} from './environment-v16.js?v=16.3';
import * as T from './vendor/three.module.js';
// Exact source color ramps (linear RGB), sampled with the source's Blender noise fields.
export const sourceColorGLSL=`
vec3 meadowBase(float n){return mix(vec3(.24,.33,.075),vec3(.49,.54,.18),clamp((n-.2)/.6,0.,1.));}
vec3 meadowWind(float w){return w<.52?mix(vec3(.11,.24,.045),vec3(.30,.45,.09),clamp((w-.12)/.4,0.,1.)):mix(vec3(.30,.45,.09),vec3(.60,.70,.23),clamp((w-.52)/.36,0.,1.));}
`;
function colors(meta){return meta.environment===16?`
vec3 meadowBase(float n){return mix(vec3(.20,.39,.07),vec3(.48,.65,.18),clamp((n-.2)/.6,0.,1.));}
vec3 meadowWind(float w){return w<.52?mix(vec3(.12,.31,.07),vec3(.30,.52,.10),clamp((w-.12)/.4,0.,1.)):mix(vec3(.30,.52,.10),vec3(.56,.72,.24),clamp((w-.52)/.36,0.,1.));}
`:sourceColorGLSL;}
export function installSourceVegetation(root,meta,buffer,time){
 const values=new Float32Array(buffer),prototypes=new Map(),nodes=[];
 root.traverse(o=>{if(o.userData.role==='prototype')nodes.push(o);});
 for(const node of nodes){const parts=[];node.traverse(o=>{if(o.isMesh)parts.push(o);});prototypes.set(node.userData.prototype,parts);node.removeFromParent();}
 let total=0,meshes=0;const diagnostics=[];
 for(const placement of meta.plants){
  const prototype=prototypes.get(placement.prototype);if(!prototype)throw new Error('缺少原始植被模型 '+placement.prototype);
  const chunks=new Map();for(let i=0;i<placement.count;i++){const offset=placement.offset+i*meta.stride,p=values.subarray(offset,offset+meta.stride),key=`${Math.floor(p[0]/20)},${Math.floor(p[1]/20)}`;if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(p);}
  for(const points of chunks.values())for(const part of prototype){
   const geometry=part.geometry.clone(),data=new Float32Array(points.length*4),matrix=new T.Matrix4(),rotation=new T.Quaternion(),axis=new T.Vector3(0,1,0);
   const palette=meta.palettes[part.material.name];if(!palette)throw new Error('缺少原始植被材质 '+part.material.name);
   const material=part.material.clone();material.color.setRGB(1,1,1);material.side=T.DoubleSide;
   const wheat=placement.prototype==='wheat';const diagnostic={material:part.material.name,kind:placement.prototype,compiled:false};diagnostics.push(diagnostic);
   const configure=shader=>{
    shader.uniforms.sourceTime=time;
    shader.vertexShader=`varying vec2 sourceWorld;uniform float sourceTime;attribute float _wind_weight;attribute vec4 sourcePlant;varying vec2 vSourceField;\n`+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     sourceWorld=(modelMatrix*instanceMatrix*vec4(position,1.)).xz;
     float wave=sin(sourcePlant.x-(sourceTime+1./24.)*${meta.wind.wind_speed});
     float bend=wave*${(wheat?meta.wind.wheat_bend:meta.wind.grass_bend)*(placement.amplitude??1)}*_wind_weight/sourcePlant.z;
     float cs=cos(sourcePlant.w),sn=sin(sourcePlant.w);
     transformed.x+=bend*(.88*cs+.48*sn);
     transformed.z+=bend*(.88*sn-.48*cs);
     transformed.y-=(wave*.5+.5)*_wind_weight*${.13*(placement.amplitude??1)}/sourcePlant.z;
     vSourceField=vec2(wave*.5+.5,sourcePlant.y);
    `);
   };
   material.onBeforeCompile=shader=>{diagnostic.compiled=true;diagnostic.colorChunk=shader.fragmentShader.includes('#include <color_fragment>');configure(shader);shader.fragmentShader='varying vec2 sourceWorld;varying vec2 vSourceField;\n'+cloudGLSL+colors(meta)+shader.fragmentShader;
    if(!wheat)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal *= faceDirection; nonPerturbedNormal=normal;');
    const rgb=a=>`vec3(${a.slice(0,3).map(v=>Number(v).toFixed(9)).join(',')})`;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     diffuseColor.rgb=${wheat?`mix(${rgb(palette.low)},${rgb(palette.high)},vSourceField.x)`:`mix(meadowBase(vSourceField.y),meadowWind(vSourceField.x),${meta.wind.wave_contrast})`};
     ${meta.environment===16&&!wheat?'diffuseColor.rgb*=mix(vec3(.32,.40,.44),vec3(1.),envCloud(vec2((sourceWorld.x-60.65285)*2.,(31.178075-sourceWorld.y)*2.)));':''}
    `);
   };
   material.customProgramCacheKey=()=>`source-plants-v4-${meta.environment||9}-${part.material.name}`;
   geometry.setAttribute('sourcePlant',new T.InstancedBufferAttribute(data,4));
   const mesh=new T.InstancedMesh(geometry,material,points.length);mesh.name=placement.name;mesh.userData.sourceName=placement.name;
   for(let i=0;i<points.length;i++){const [x,y,z,scale,yaw,phase,base]=points[i];rotation.setFromAxisAngle(axis,yaw);matrix.compose(new T.Vector3(x,z,-y),rotation,new T.Vector3(scale,scale,scale));mesh.setMatrixAt(i,matrix);data.set([phase,base,scale,yaw],i*4);}
   mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;
   const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});depth.onBeforeCompile=configure;depth.customProgramCacheKey=()=>`source-plant-depth-${wheat}-${placement.amplitude??1}`;mesh.customDepthMaterial=depth;
   if(placement.matrix){const b=new T.Matrix4().makeRotationX(-Math.PI/2),m=new T.Matrix4().set(...placement.matrix.flat());mesh.applyMatrix4(b.clone().multiply(m).multiply(b.clone().invert()));}
   mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.6;root.add(mesh);meshes++;
  }
  total+=placement.count;
 }
 return{total,meshes,diagnostics};
}
export function installGroundWind(mesh,meta,time){
 const material=mesh.material.clone();material.onBeforeCompile=shader=>{
  shader.uniforms.sourceTime=time;
  shader.vertexShader='attribute vec3 _meadow;varying vec3 vMeadow;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMeadow=_meadow;');
  shader.fragmentShader='uniform float sourceTime;varying vec3 vMeadow;\n'+colors(meta)+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float wave=sin(vMeadow.y-(sourceTime+1./24.)*${meta.wind.wind_speed})*.5+.5;
   diffuseColor.rgb=mix(diffuseColor.rgb,meadowWind(wave),vMeadow.x*${meta.wind.wave_contrast});
  `);
 };material.customProgramCacheKey=()=> 'source-ground-wind-v2';mesh.material=material;
}
