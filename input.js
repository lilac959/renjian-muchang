// One owner per gesture: observation delegates to CameraControls; aiming owns one pointer.
export class GameInput {
 constructor(canvas,{controls,aiming,enabled,aim,release,cancel}){
  Object.assign(this,{canvas,controls,aiming,enabled,aim,release,cancel});this.points=new Set();this.owner=null;this.cameraGesture=false;
  for(const name of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>this.handle(name,e),true);
 }
 clear(){this.owner=null;this.cameraGesture=false;this.points.clear();this.controls.clear();this.aim(null);}
 handle(type,e){
  if(type==='pointerdown')this.points.add(e.pointerId);
  if(!this.enabled()){this.clear();return;}
  if(type==='pointerdown'&&this.aiming()&&e.button===2){e.stopImmediatePropagation();this.cancel();this.clear();return;}
  if(type==='pointerdown'&&this.aiming()&&e.pointerType!=='mouse'&&this.points.size>1){
   // Abandon the pending cast before transferring both contacts to the camera.
   this.owner=null;this.cameraGesture=true;this.aim(null);if(this.first)this.controls.down(this.first);return;
  }
  if(this.cameraGesture){if(type==='pointerup'||type==='pointercancel'||type==='lostpointercapture'){this.points.delete(e.pointerId);if(!this.points.size){this.cameraGesture=false;this.first=null;}}return;}
  if(!this.aiming()){if(type==='pointerup'||type==='pointercancel'||type==='lostpointercapture')this.points.delete(e.pointerId);return;}
  e.stopImmediatePropagation();const p={x:e.clientX,y:e.clientY};
  if(type==='pointerdown'&&e.button===0){this.owner=e.pointerId;this.first={pointerId:e.pointerId,clientX:e.clientX,clientY:e.clientY,button:0};this.canvas.setPointerCapture(e.pointerId);this.aim(p);}
  if(type==='pointermove'&&(e.pointerType==='mouse'||this.owner===e.pointerId))this.aim(p);
  if(type==='pointerup'){const valid=this.owner===e.pointerId;this.owner=null;this.points.delete(e.pointerId);if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);if(valid)this.release(p);this.aim(null);}
  if(type==='pointercancel'||type==='lostpointercapture'){this.owner=null;this.points.delete(e.pointerId);this.aim(null);}
 }
}
