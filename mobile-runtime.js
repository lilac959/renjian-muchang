import {GLTFLoader} from './vendor/GLTFLoader.js';
export const mobileMode=typeof window!=='undefined'&&(matchMedia('(pointer:coarse)').matches||Math.min(screen.width,screen.height)<=820||innerWidth<=600);
export const pixelRatio=()=>Math.min(devicePixelRatio||1,mobileMode?1.25:2);
export async function loadModel(original,name){
 const loader=new GLTFLoader();
 if(!mobileMode||typeof DecompressionStream==='undefined')return loader.loadAsync(original);
 const url=new URL('./assets/mobile/'+name+'.glb.gz',import.meta.url);
 const response=await fetch(url);if(!response.ok)throw Error('手机资源加载失败，请重试：'+name);
 const payload=await response.arrayBuffer();
 const header=new Uint8Array(payload,0,Math.min(2,payload.byteLength));
 const bytes=header[0]===31&&header[1]===139?await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():payload;
 return loader.parseAsync(bytes,new URL('.',original).href);
}
export function environmentTexture(name,base){return mobileMode?new URL('./assets/mobile/'+name.replace('.png','.webp'),import.meta.url).href:new URL(name,base).href;}
