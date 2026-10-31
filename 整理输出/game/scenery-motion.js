import * as T from './vendor/three.module.js';
import {QINGHE} from './island-layout.js';

// Shared wind travels through tufts, rather than moving each plant independently.
const windGLSL=`
float windNoise(vec2 p){return sin(p.x*.11+sin(p.y*.09))*cos(p.y*.13)*.5+.5;}
float windWave(vec2 root,float time){return sin(dot(root,vec2(.35,.24))+5.8*windNoise(root)-time*1.38);}
`;
export class SceneryMotion {
 constructor(scene){this.time={value:0};this.plantMeshes=0;scene.add(this.makeWater());}
 attach(root){root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry.hasAttribute('_wind_weight'))return;
  if(!mesh.geometry.hasAttribute('_wind_root'))throw new Error('植被缺少风根坐标');
  const wheat=(mesh.userData.sourceName||mesh.parent?.userData.sourceName||mesh.name).startsWith('Wheat');
  const animate=original=>{const material=original.clone();material.onBeforeCompile=shader=>{
   shader.uniforms.sceneryTime=this.time;
   shader.vertexShader='uniform float sceneryTime;\nattribute float _wind_weight;\nattribute vec3 _wind_root;\nvarying float vWindWave;\n'+windGLSL+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float gust=windWave(_wind_root.xy,sceneryTime);
    float bend=gust*${wheat?'.16':'.5'}*_wind_weight;
    transformed.x+=bend*.88;
    transformed.z-=bend*.48;
    transformed.y-=abs(bend)*.12;
    vWindWave=gust;
   `);
   shader.fragmentShader='varying float vWindWave;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    diffuseColor.rgb*=1.0+vWindWave*${wheat?'.10':'.19'};
   `);
  };material.customProgramCacheKey=()=>`rooted-wind-v1-${wheat}`;return material;};
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(animate):animate(mesh.material);
  // GPU bending extends beyond the static glTF bounding sphere.
  mesh.geometry.computeBoundingSphere();mesh.geometry.boundingSphere.radius+=.6;this.plantMeshes++;
 });}
 update(time){this.time.value=time;}
 makeWater(){
  // Distance to the actual shoreline, not a circular approximation of Qinghe.
  const width=512,height=352,step=.25,minX=-10,minZ=-15;
  const distance=new Float32Array(width*height),g=QINGHE.grid;
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){
   const x=minX+i*step,z=minZ+j*step,gi=Math.round((x-g.x)/g.step),gj=Math.round((z-g.y)/g.step);
   const h=gi>=0&&gj>=0&&gi<g.cols&&gj<g.rows?g.heights[gj*g.cols+gi]:null;
   const land=(h!==null&&h>=-.5)||((x-76)/23)**2+((z-28)/17)**2<=1;
   distance[j*width+i]=land?0:1000;
  }
  // Chamfer distance in world units. Two passes run once at load, never per frame.
  const diagonal=step*Math.SQRT2;
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){const k=j*width+i;let d=distance[k];if(i)d=Math.min(d,distance[k-1]+step);if(j){d=Math.min(d,distance[k-width]+step);if(i)d=Math.min(d,distance[k-width-1]+diagonal);if(i+1<width)d=Math.min(d,distance[k-width+1]+diagonal);}distance[k]=d;}
  for(let j=height-1;j>=0;j--)for(let i=width-1;i>=0;i--){const k=j*width+i;let d=distance[k];if(i+1<width)d=Math.min(d,distance[k+1]+step);if(j+1<height){d=Math.min(d,distance[k+width]+step);if(i)d=Math.min(d,distance[k+width-1]+diagonal);if(i+1<width)d=Math.min(d,distance[k+width+1]+diagonal);}distance[k]=d;}
  // Byte texture remains filterable on mobile devices without float extensions.
  const pixels=new Uint8Array(distance.length);for(let i=0;i<pixels.length;i++)pixels[i]=Math.round(Math.min(1,distance[i]/8)*255);
  const shore=new T.DataTexture(pixels,width,height,T.RedFormat);shore.minFilter=shore.magFilter=T.LinearFilter;shore.needsUpdate=true;
  const material=new T.ShaderMaterial({uniforms:{sceneryTime:this.time,shore:{value:shore}},vertexShader:`
   varying vec2 waterPosition;
   void main(){vec4 p=modelMatrix*vec4(position,1.);waterPosition=p.xz;gl_Position=projectionMatrix*viewMatrix*p;}
  `,fragmentShader:`
   uniform float sceneryTime;uniform sampler2D shore;varying vec2 waterPosition;
   void main(){
    vec2 p=waterPosition;
    vec2 uv=(p-vec2(${minX},${minZ})+vec2(${step/2}))/vec2(${width*step},${height*step});
    float d=texture2D(shore,uv).r*8.;
    float t=sceneryTime;
    float ripples=sin(p.x*1.7+p.y*.8-t*1.4+sin(p.y*.7-t*.35))*.5+.5;
    float broad=sin(p.x*.35+p.y*.26-t*.6)*sin(p.y*.41-t*.43);
    vec3 deep=vec3(.014,.155,.205),shallow=vec3(.09,.36,.319);
    vec3 color=mix(deep,shallow,exp(-d/1.35)*.9);
    color+=vec3(.007,.018,.02)*(broad*.5+ripples*.3);
    float edge=d+.065*sin(p.x*2.1+p.y*1.3-t*1.8)+.045*sin(p.y*3.4+t);
    float wash=.24+.12*sin(t*1.38+p.x*.2+p.y*.13);
    float foam=(1.-smoothstep(wash, wash+.20,edge))*.85;
    float crest=pow(max(0.,sin(d*5.2+t*1.5+sin(p.x*.7+p.y*.6)*.3)),12.);
    foam+=crest*.27*exp(-d*1.2)*smoothstep(.12,.4,d);
    color=mix(color,vec3(.92,.95,.84),clamp(foam,0.,.9));
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }
  `});
  const sea=new T.Mesh(new T.PlaneGeometry(500,500),material);sea.name='Animated shared water';sea.rotation.x=-Math.PI/2;sea.position.y=-.5;return sea;
 }
}
