import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraControls,DEFAULT_CAMERA,constrain} from '../game/camera-controls.js';
function setup(){const handlers={},captured=new Set(),camera={...DEFAULT_CAMERA};let taps=0;const canvas={addEventListener:(n,f)=>handlers[n]=f,setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id),clientHeight:540};const controls=new CameraControls(canvas,camera,{enabled:()=>true,project:p=>({x:camera.x+p.x/camera.zoom,y:camera.y+p.y/camera.zoom}),onTap:()=>taps++});const event=(id,x,y,button=0)=>({pointerId:id,clientX:x,clientY:y,button});return{camera,controls,event,taps:()=>taps};}
test('right drag rotates and tilts without tapping; pitch remains above ground',()=>{const s=setup();s.controls.down(s.event(1,100,100,2));s.controls.move(s.event(1,200,1000,2));s.controls.up(s.event(1,200,1000,2));assert.equal(s.taps(),0);assert.equal(s.camera.pitch,80*Math.PI/180);assert.notEqual(s.camera.yaw,0);constrain(Object.assign(s.camera,{pitch:-100}));assert.equal(s.camera.pitch,25*Math.PI/180);});
test('pinch and twist never become a tap after one finger lifts',()=>{const s=setup();s.controls.down(s.event(1,50,50));s.controls.down(s.event(2,100,50));s.controls.move(s.event(2,140,80));assert.ok(s.camera.zoom>1);assert.notEqual(s.camera.yaw,0);s.controls.up(s.event(2,140,80));s.controls.up(s.event(1,50,50));assert.equal(s.taps(),0);s.controls.down(s.event(3,20,20));s.controls.up(s.event(3,20,20));assert.equal(s.taps(),1);});
test('cancelled and dragged gestures do not select targets',()=>{const s=setup();s.controls.down(s.event(1,50,50));s.controls.move(s.event(1,70,50));s.controls.up(s.event(1,70,50));s.controls.down(s.event(2,20,20));s.controls.cancel(s.event(2,20,20));s.controls.up(s.event(2,20,20));assert.equal(s.taps(),0);});
test('zoom keeps pointer anchor and reset restores all view coordinates',()=>{const s=setup();const p={x:5,y:5},before={x:s.camera.x+5,y:s.camera.y+5};s.controls.zoomAt(p,2);assert.equal(s.camera.x+5/s.camera.zoom,before.x);assert.equal(s.camera.y+5/s.camera.zoom,before.y);s.controls.focus(76,28);s.controls.update(.5);assert.equal(s.camera.x,76);s.controls.reset();s.controls.update(.5);assert.deepEqual(s.camera,DEFAULT_CAMERA);});
import * as T from '../game/vendor/three.module.js';
import {WorldView} from '../game/scene.js';
test('rotated low and high views retain projection/pan-plane correspondence',()=>{const view=Object.create(WorldView.prototype);Object.assign(view,{w:960,h:540,camera:new T.OrthographicCamera(-55,55,35,-35,.1,250),ray:new T.Raycaster(),plane:new T.Plane(new T.Vector3(0,1,0),0),renderer:{domElement:{dataset:{}}}});for(const yaw of [0,Math.PI/2,Math.PI,-2])for(const pitch of [25,80]){view.cameraAt({...DEFAULT_CAMERA,yaw,pitch:pitch*Math.PI/180,zoom:3});const world=new T.Vector3(40,0,30),screen=world.clone().project(view.camera),hit=view.panPoint({x:(screen.x+1)*480,y:(1-screen.y)*270});assert.ok(Math.abs(hit.x-world.x)<1e-8);assert.ok(Math.abs(hit.y-world.z)<1e-8);}});
test('horizon preview entered first can return to gameplay projection',()=>{const camera=new T.OrthographicCamera(-55,55,35,-35,.1,4000),view=Object.create(WorldView.prototype);Object.assign(view,{w:960,h:540,camera,previewCamera:new T.PerspectiveCamera(),renderer:{domElement:{dataset:{}}}});view.previewCamera.userData.horizontalFov=Math.PI/3;view.cameraAt(DEFAULT_CAMERA);assert.ok(view.camera.isPerspectiveCamera);view.previewCamera=null;view.cameraAt(DEFAULT_CAMERA);assert.equal(view.camera,camera);assert.ok(view.camera.projectionMatrix.elements.every(Number.isFinite));});
test('sea stays inside clipping planes at every viewport corner in tall and low-angle views',()=>{
 const view=Object.create(WorldView.prototype);
 Object.assign(view,{camera:new T.OrthographicCamera(-55,55,35,-35,.1,250),renderer:{domElement:{dataset:{}}}});
 for(const [w,h] of [[1168,965],[960,1600],[1920,1080]])for(const pitch of [25,35,52,80])for(const zoom of [1,3,7])for(const yaw of [0,1.5,3]){
  Object.assign(view,{w,h,safeRegion:{top:120,bottom:h-280}});
  view.cameraAt({...DEFAULT_CAMERA,pitch:pitch*Math.PI/180,zoom,yaw});
  const direction=new T.Vector3();view.camera.getWorldDirection(direction);
  for(const x of [-1,1])for(const y of [-1,1]){
   const origin=new T.Vector3(x,y,-1).unproject(view.camera),distance=(-.5-origin.y)/direction.y;
   assert.ok(distance>0,`sea clipped near: ${w}x${h}, pitch ${pitch}, zoom ${zoom}, corner ${x},${y}`);
   assert.ok(distance<view.camera.far-view.camera.near,'sea clipped far');
  }
 }
});
