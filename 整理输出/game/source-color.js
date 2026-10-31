import * as T from './vendor/three.module.js';
// Blender's OCIO-generated AgX / Medium High Contrast / +0.35 EV / sRGB LUT.
// Apply after lighting in scene-linear space, exactly once (including water).
export class SourceColorPipeline{
 constructor(renderer,buffer){this.renderer=renderer;renderer.toneMapping=T.NoToneMapping;renderer.info.autoReset=false;
  const lut=new T.Data3DTexture(new Uint8Array(buffer),65,65,65);lut.format=T.RGBAFormat;lut.type=T.UnsignedByteType;lut.minFilter=lut.magFilter=T.LinearFilter;lut.unpackAlignment=1;lut.needsUpdate=true;
  this.target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:Math.min(4,renderer.capabilities.maxSamples)});
  this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);this.scene=new T.Scene();this.size=new T.Vector2();
  this.scene.add(new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{frame:{value:this.target.texture},displayLut:{value:lut}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`precision highp sampler3D;uniform sampler2D frame;uniform sampler3D displayLut;varying vec2 vUv;void main(){vec3 linear=max(texture2D(frame,vUv).rgb,vec3(0.));vec3 index=clamp(log2(linear+1.)/log2(65.),0.,1.);gl_FragColor=vec4(texture(displayLut,(index*64.+.5)/65.).rgb,1.);}`})));
 }
 render(scene,camera){const r=this.renderer;r.getDrawingBufferSize(this.size);if(this.target.width!==this.size.x||this.target.height!==this.size.y)this.target.setSize(this.size.x,this.size.y);r.info.reset();r.setRenderTarget(this.target);r.render(scene,camera);r.setRenderTarget(null);r.render(this.scene,this.camera);}
}
