import {loadModel,environmentTexture} from './mobile-runtime.js';
import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
// Source v16's world-space cloud field. Static cloud shadows intentionally remain static.
export const cloudGLSL=`
float envHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float envNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(envHash(i),envHash(i+vec3(1,0,0)),f.x),mix(envHash(i+vec3(0,1,0)),envHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(envHash(i+vec3(0,0,1)),envHash(i+vec3(1,0,1)),f.x),mix(envHash(i+vec3(0,1,1)),envHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float envCloud(vec2 p){float n=(envNoise(vec3(p*.028,0.))+.42*envNoise(vec3(p*.056,0.)))/1.42;return smoothstep(.36,.64,n);}
`;
export async function installEnvironment(view,root,meta){
 const base=new URL('./assets/islands/v16/',import.meta.url),loader=new T.TextureLoader();
 const [config,farm,pasture,roughness,bridge]=await Promise.all([
  fetch(new URL('environment.json',base)).then(r=>{if(!r.ok)throw Error('新版环境资料加载失败');return r.json();}),
  ...['farm-color.png','pasture-color.png','pasture-roughness.png'].map(p=>loader.loadAsync(environmentTexture(p,base))),loadModel(new URL('bridge.glb',base).href,'bridge')
 ]);
 for(const tex of [farm,pasture,roughness]){tex.flipY=false;tex.anisotropy=Math.min(8,view.renderer.capabilities.getMaxAnisotropy());}farm.colorSpace=pasture.colorSpace=T.SRGBColorSpace;
 const oldBridge=[];
 root.traverse(o=>{if(o.userData.role==='bridge')oldBridge.push(o);if(!o.isMesh)return;
  if(o.geometry.hasAttribute('_meadow')){o.material=o.material.clone();o.material.map=farm;o.material.needsUpdate=true;}
  if(o.userData.sourceName?.startsWith('牧场岛地形')){o.material=new T.MeshStandardMaterial({map:pasture,roughnessMap:roughness,roughness:1,metalness:0});}
 });
 for(const o of oldBridge)o.removeFromParent();root.add(bridge.scene);
 meta.environment=16;meta.environmentConfig=config;
 for(const [name,ramps] of Object.entries(config.grass))if(meta.palettes[name])meta.palettes[name].ramps=ramps.map(stops=>({stops}));
 // Replace the former two-light setup, retaining the main shadow map.
 const remove=[];view.scene.traverse(o=>{if(o.isLight&&o!==view.sun)remove.push(o);});for(const o of remove)o.removeFromParent();
 view.scene.add(new T.AmbientLight(new T.Color(.55,.72,1),.45*Math.PI));
 for(const setting of config.lights){
  const main=setting.name.includes('主光'),light=main?view.sun:new T.DirectionalLight();light.color.setRGB(...setting.color);light.intensity=setting.type==='AREA'?.22:setting.energy;
  const m=setting.matrix,d=new T.Vector3(m[0][2],m[2][2],-m[1][2]).normalize();light.target.position.set(52,0,28);light.position.copy(light.target.position).addScaledVector(d,100);if(!main){view.scene.add(light,light.target);}
 }
 view.camera.far=4000;view.camera.updateProjectionMatrix();
 const time=view.scenery.time;
 const sky=new T.Mesh(new T.SphereGeometry(1500,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:{time},vertexShader:'varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 skyDirection;uniform float time;${cloudGLSL}
 void main(){vec3 d=normalize(skyDirection);float h=max(d.y,0.);vec3 color=mix(vec3(.73,.85,.91),vec3(.14,.35,.57),smoothstep(0.,.85,h));vec3 p=d*vec3(3.2,5.5,3.2)+vec3(time*.0025,0.,time*.0013);float n=(envNoise(p)+.45*envNoise(p*2.1)+.2*envNoise(p*4.))/1.65;float clouds=smoothstep(.45,.64,n)*smoothstep(-.04,.16,d.y);color=mix(color,vec3(.81,.86,.84),clouds*.72);gl_FragColor=vec4(color,1.);}` }));
 sky.position.set(52,0,28);sky.name='V16 procedural sky';sky.renderOrder=-10;view.scene.add(sky);
 return config;
}
