import * as T from './vendor/three.module.js';
// Blender's OCIO-generated AgX / Medium High Contrast / +0.35 EV / sRGB LUT.
// Apply after lighting in scene-linear space, exactly once (including water).
export class SourceColorPipeline{
 constructor(renderer,buffer,{environment=false}={}){this.renderer=renderer;renderer.toneMapping=T.NoToneMapping;renderer.info.autoReset=false;
  const lut=new T.Data3DTexture(new Uint8Array(buffer),65,65,65);lut.format=T.RGBAFormat;lut.type=T.UnsignedByteType;lut.minFilter=lut.magFilter=T.LinearFilter;lut.unpackAlignment=1;lut.needsUpdate=true;
  this.target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:Math.min(4,renderer.capabilities.maxSamples)});
  if(environment)this.target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  this.uniforms={debugDepth:{value:false},frame:{value:this.target.texture},displayLut:{value:lut},depthMap:{value:this.target.depthTexture},inverseProjection:{value:new T.Matrix4()},cameraWorld:{value:new T.Matrix4()},texel:{value:new T.Vector2()}};
  this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);this.scene=new T.Scene();this.size=new T.Vector2();
  this.scene.add(new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:this.uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`precision highp sampler3D;uniform sampler2D frame;uniform sampler3D displayLut;uniform highp sampler2D depthMap;uniform mat4 inverseProjection;uniform mat4 cameraWorld;uniform vec2 texel;uniform bool debugDepth;varying vec2 vUv;
vec3 worldPoint(float depth){vec4 p=inverseProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);return (cameraWorld*vec4(p.xyz/p.w,1.)).xyz;}
void main(){vec3 linear=max(texture2D(frame,vUv).rgb,vec3(0.));
${environment?`
 float depth=texture2D(depthMap,vUv).r;if(debugDepth){gl_FragColor=vec4(vec3((1.-depth)*300.),1.);return;}
 if(depth<.999999){vec3 end=worldPoint(depth),start=worldPoint(0.),ray=end-start;float lengthRay=length(ray),density=0.;
  for(int i=0;i<8;i++){vec3 p=start+ray*(float(i)+.5)/8.;float radial=length((p.xz-vec2(52.65285,31.178075))/vec2(80.,60.));float field=smoothstep(1.,4.,radial)*clamp((42.-p.y)/40.5,0.,1.);density+=field*.008;}
  float fog=1.-exp(-density*lengthRay/8.);linear=mix(linear,vec3(.73,.85,.91),clamp(fog,0.,.94));
 }
 vec3 glow=vec3(0.);for(int i=0;i<4;i++){float a=float(i)*1.57079633;vec2 d=vec2(cos(a),sin(a))*texel;glow+=max(texture2D(frame,vUv+d*6.).rgb-1.6,0.)+max(texture2D(frame,vUv+d*14.).rgb-1.6,0.);}
 linear+=glow*.01*vec3(1.,.93,.82);
 vec3 graded=pow(max(linear*vec3(1.04,1.015,.98)+vec3(-.003,0.,.003),0.),vec3(1./1.01,1.,1./.985));linear=mix(linear,graded,.12);float luminance=dot(linear,vec3(.2126,.7152,.0722));linear=mix(vec3(luminance),linear,1.04)*exp2(-.03);
`:''}
 vec3 index=clamp(log2(max(linear,0.)+1.)/log2(65.),0.,1.);gl_FragColor=vec4(texture(displayLut,(index*64.+.5)/65.).rgb,1.);}
`})));
 }
 render(scene,camera){const r=this.renderer;r.getDrawingBufferSize(this.size);if(this.target.width!==this.size.x||this.target.height!==this.size.y)this.target.setSize(this.size.x,this.size.y);this.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);this.uniforms.cameraWorld.value.copy(camera.matrixWorld);this.uniforms.texel.value.set(1/this.size.x,1/this.size.y);r.info.reset();r.setRenderTarget(this.target);r.render(scene,camera);r.setRenderTarget(null);r.render(this.scene,this.camera);}
}
