import * as T from './vendor/three.module.js';
import {QINGHE,groundHeight,islandId} from './island-layout.js';
const clamp=x=>Math.max(0,Math.min(1,x));
// Presentation-only accumulation, driven by simulation time so pause freezes it.
export class WeatherState {
 constructor(){this.reset();}
 reset(){this.time=null;this.levels=[[0,0,0],[0,0,0]];this.strikes=[];this.seen=new WeakSet();}
 update(world,events=world.visualEvents||[]){if(this.time!==null&&world.time<this.time)this.reset();const dt=this.time===null?0:Math.max(0,world.time-this.time);this.time=world.time;
  world.islands.forEach((island,i)=>{const active=island.weather.left>0?island.weather.kind:'normal';this.levels[i]??=[0,0,0];for(const [j,kind]of ['cold','rain','hot'].entries()){const target=active===kind?1:0,rate=target?1/(kind==='cold'?4:1.4):1/(kind==='cold'?7:3);this.levels[i][j]=clamp(this.levels[i][j]+Math.sign(target-this.levels[i][j])*Math.min(Math.abs(target-this.levels[i][j]),dt*rate));}});
  for(const e of events)if(e.id==='lightning'&&!this.seen.has(e)){this.seen.add(e);const p=e.targets?.slice().sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0]||e;this.strikes.push({x:p.x,y:p.y,time:e.time});}
  this.strikes=this.strikes.filter(e=>world.time-e.time<10).slice(-4);
 }
}
export class WeatherPresentation {
 constructor(){this.state=new WeatherState();this.patched=new WeakSet();const grid=QINGHE.grid,data=new Uint8Array(grid.ids.length*4);grid.ids.forEach((id,i)=>{if(id===0||id===1)data[i*4+id]=255;data[i*4+3]=255;});const mask=new T.DataTexture(data,grid.cols,grid.rows);mask.needsUpdate=true;mask.minFilter=mask.magFilter=T.NearestFilter;
  this.uniforms={climateMask:{value:mask},climateGrid:{value:new T.Vector4(grid.x-grid.step/2,grid.y-grid.step/2,grid.cols*grid.step,grid.rows*grid.step)},climateLevels:{value:[new T.Vector3(),new T.Vector3()]},climateStrikes:{value:Array.from({length:4},()=>new T.Vector4(0,0,99,0))}};
 }
 clear(){this.particles?.forEach(p=>{p.snow.visible=p.rain.visible=false;});this.state.reset();this.uniforms.climateLevels.value.forEach(v=>v.set(0,0,0));this.uniforms.climateStrikes.value.forEach(v=>v.set(0,0,99,0));}
 update(world,scene,events){this.state.update(world,events);this.precipitation(world,scene);this.state.levels.forEach((v,i)=>this.uniforms.climateLevels.value[i]?.fromArray(v));this.uniforms.climateStrikes.value.forEach((v,i)=>{const e=this.state.strikes[i];v.set(e?.x||0,e?.y||0,e?world.time-e.time:99,e?1:0);});scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material])this.patch(m);});}
 precipitation(world,scene){
  if(!this.particles){const pixels=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(clamp(1-Math.hypot(x-7.5,y-7.5)/7)*255);}const texture=new T.DataTexture(pixels,16,16);texture.needsUpdate=true;
   this.particles=[0,1].map(id=>{const points=[];for(let j=0;j<4000&&points.length<240;j++){const p={x:((j*.61803398875)%1)*110,y:-4+((j*.41421356237)%1)*62};if(islandId(p)===id)points.push({...p,height:groundHeight(p)});}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(points.length*3),3));const snow=new T.Points(geometry,new T.PointsMaterial({color:0xe5f2fa,size:.18,map:texture,transparent:true,opacity:.8,depthWrite:false}));const lines=new T.BufferGeometry();lines.setAttribute('position',new T.BufferAttribute(new Float32Array(points.length*6),3));const rain=new T.LineSegments(lines,new T.LineBasicMaterial({color:0xb7d5df,transparent:true,opacity:.4,depthWrite:false}));snow.frustumCulled=rain.frustumCulled=false;scene.add(snow,rain);return{points,snow,rain};});
  }
  this.particles.forEach(({points,snow,rain},id)=>{const weather=world.islands[id]?.weather,kind=weather?.left>0?weather.kind:'normal';snow.visible=kind==='cold';rain.visible=kind==='rain';if(!snow.visible&&!rain.visible)return;const positions=(snow.visible?snow:rain).geometry.attributes.position;points.forEach((p,j)=>{const fall=(world.time*(snow.visible?.18:1.4)+j*.371)%1,x=p.x+(snow.visible?Math.sin(world.time*.7+j)*.5:0),y=p.height+.12+(1-fall)*7,z=p.y; if(snow.visible)positions.setXYZ(j,x,y,z);else{positions.setXYZ(j*2,x,y,z);positions.setXYZ(j*2+1,x+.12,y+.8,z);}});positions.needsUpdate=true;});
 }

 patch(m){if(this.patched.has(m)||m.userData.skipClimate||!(m.isMeshStandardMaterial||m.isMeshPhongMaterial||m.isMeshLambertMaterial))return;this.patched.add(m);const before=m.onBeforeCompile,key=m.customProgramCacheKey();m.onBeforeCompile=(s,r)=>{before.call(m,s,r);if(s.vertexShader.includes("varying vec3 climatePosition;"))return;Object.assign(s.uniforms,this.uniforms);
  s.vertexShader='varying vec3 climatePosition;\n'+s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 climateLocal=vec4(transformed,1.);
   #ifdef USE_BATCHING
   climateLocal=batchingMatrix*climateLocal;
   #endif
   #ifdef USE_INSTANCING
   climateLocal=instanceMatrix*climateLocal;
   #endif
   climatePosition=(modelMatrix*climateLocal).xyz;`);
  s.fragmentShader=`varying vec3 climatePosition;uniform sampler2D climateMask;uniform vec4 climateGrid;uniform vec3 climateLevels[2];uniform vec4 climateStrikes[4];
float climateHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float climateNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(climateHash(i),climateHash(i+vec2(1.,0.)),f.x),mix(climateHash(i+vec2(0.,1.)),climateHash(i+vec2(1.)),f.x),f.y);}
`+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec2 climateUv=(climatePosition.xz-climateGrid.xy)/climateGrid.zw;
   vec2 climateIslands=texture2D(climateMask,climateUv).rg;
   climateIslands*=step(0.,climateUv.x)*step(0.,climateUv.y)*step(climateUv.x,1.)*step(climateUv.y,1.);
   vec3 climate=climateLevels[0]*climateIslands.r+climateLevels[1]*climateIslands.g;
   vec3 climateNormal=inverseTransformDirection(normal,viewMatrix);
   float upward=smoothstep(.1,.7,climateNormal.y);
   float grain=climateNoise(climatePosition.xz*2.2);
   float snow=climate.x*upward*mix(.72,1.,grain);
   diffuseColor.rgb*=mix(vec3(1.),vec3(.65,.76,.82),climate.y);
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.12,.96,.78),climate.z*.55);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.82,.90,.94),snow*.86);
   #if defined(STANDARD)
   roughnessFactor=mix(roughnessFactor,max(.16,roughnessFactor*.45),climate.y);
   roughnessFactor=mix(roughnessFactor,.92,snow);
   #endif
   for(int i=0;i<4;i++){vec4 strike=climateStrikes[i];float d=length(climatePosition.xz-strike.xy);float flash=(exp(-strike.z*18.)+.5*exp(-abs(strike.z-.3)*35.))*strike.w;
    diffuseColor.rgb+=vec3(.65,.83,1.)*flash*(1.-smoothstep(0.,9.,d));
    float scorch=(1.-smoothstep(.3,2.2,d))*upward*strike.w*smoothstep(.15,.7,strike.z)*(1.-smoothstep(5.,10.,strike.z));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.075,.06,.05),scorch*.65*(1.-snow));
   }`);
 };m.customProgramCacheKey=()=>key+'-island-climate-v1';m.needsUpdate=true;}
}
