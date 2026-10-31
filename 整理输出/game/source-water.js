import * as T from './vendor/three.module.js';
import {QINGHE} from './island-layout.js';
// Reconstruct the source shoreline material: lace foam, two narrow retreat lines,
// linear shallow-water fade and a five-second phase. The source distance field is retained.
export function sourceWater(time,buffer,meta){
 const values=new Float32Array(buffer),data=new Uint16Array(values.length);
 for(let i=0;i<data.length;i++)data[i]=T.DataUtils.toHalfFloat(values[i]);
 const map=new T.DataTexture(data,meta.width,meta.height,T.RedFormat,T.HalfFloatType);map.minFilter=map.magFilter=T.LinearFilter;map.needsUpdate=true;
 const material=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.62,metalness:0,specularIntensity:.24});
 material.onBeforeCompile=shader=>{
  shader.uniforms.sourceTime=time;shader.uniforms.sourceShore={value:map};
  shader.vertexShader='varying vec3 vWaterWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWaterWorld=(modelMatrix*vec4(position,1.)).xyz;');
  shader.fragmentShader=`uniform float sourceTime;uniform sampler2D sourceShore;varying vec3 vWaterWorld;
   float waterHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float waterNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(mix(waterHash(i),waterHash(i+vec3(1,0,0)),f.x),mix(waterHash(i+vec3(0,1,0)),waterHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(waterHash(i+vec3(0,0,1)),waterHash(i+vec3(1,0,1)),f.x),mix(waterHash(i+vec3(0,1,1)),waterHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   float waterFbm(vec3 p){return (waterNoise(p)+.5*waterNoise(p*2.)+.25*waterNoise(p*4.))/1.75;}
   float fineLine(float x,float width){float aa=max(fwidth(x),.004);return 1.-smoothstep(width-aa,width+aa,abs(x));}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance=diffuseColor.rgb*.35;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=vec2((vWaterWorld.x-${QINGHE.transform.position[0]})/.5,(${QINGHE.transform.position[2]}-vWaterWorld.z)/.5);
   vec2 uv=(p-vec2(${meta.min.join(',')}))/vec2(${meta.size.join(',')});
   float sourceDistance=texture2D(sourceShore,uv).r;
   float d=max(0.,sourceDistance);
   float phase=sourceTime*6.28318530718/5.;float movement=sin(phase)*.07;float w=sin(phase)*.25;
   float edgeNoise=waterFbm(vec3(p*2.5,w*2.5));float holes=waterFbm(vec3(p*9.,w*9.));
   float ratio=d/(.63+movement);float aa=max(fwidth(ratio),.025);
   float foam=(1.-smoothstep(.62+edgeNoise*.85-aa,.62+edgeNoise*.85+aa,ratio))*smoothstep(.24+ratio*.3-.035,.24+ratio*.3+.035,holes);
   float shift=movement+edgeNoise*.1;
   float lines=max(fineLine(d-(.66+shift),.016),fineLine(d-(1.04+shift),.009))*smoothstep(.37,.41,edgeNoise);
   float broad=waterFbm(vec3(p*.48,w*.48));
   vec3 water=mix(vec3(.09,.36,.319),vec3(.014,.155,.205),clamp(d/2.7,0.,1.));
   water=mix(water,2.*broad*water+water*water*(1.-2.*broad),.09);
   diffuseColor.rgb=mix(water,vec3(.92,.95,.84),max(foam,lines));
  `);
 };material.customProgramCacheKey=()=> 'source-shore-v2';
 const sea=new T.Mesh(new T.PlaneGeometry(500,500),material);sea.name='Source shoreline water';sea.rotation.x=-Math.PI/2;sea.position.y=-.5;sea.receiveShadow=true;return sea;
}
