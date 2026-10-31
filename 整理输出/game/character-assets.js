import {GLTFLoader} from './vendor/GLTFLoader.js';
let pending;
export function loadCharacters(){return pending??=(async()=>{
 const loader=new GLTFLoader();const results=await Promise.all(['farming','livestock'].map(n=>loader.loadAsync(new URL('./assets/characters/peasants/'+n+'.glb',import.meta.url).href)));
 for(const g of results){for(const name of ['Idle','Walk Forward In Place','Run Forward W Weapons In Place'])if(!g.animations.some(a=>a.name===name))throw Error('角色动作缺失：'+name);}
 return results;
})().catch(e=>{pending=null;throw e;});}
