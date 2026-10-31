import {installSourceVegetation,installGroundWind} from './source-vegetation.js?v=16.3';
import {sourceWater} from './source-water.js?v=16.3';
export class SceneryMotion {
 constructor(scene){this.scene=scene;this.time={value:0};this.plantMeshes=0;}
 attach(root,meta,buffer,shore){const result=installSourceVegetation(root,meta,buffer,this.time);this.diagnostics=result.diagnostics;this.plantMeshes=result.meshes;this.plantCount=result.total;root.traverse(o=>{if(o.isMesh&&o.geometry.hasAttribute('_meadow'))installGroundWind(o,meta,this.time);});this.water=sourceWater(this.time,shore,meta.shore,meta.environment);this.scene.add(this.water);}
 update(time){this.time.value=time;}
}
