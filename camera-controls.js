export const DEFAULT_CAMERA={x:51.5,y:28,zoom:1,yaw:0,pitch:Math.atan2(70,55)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function constrain(c){c.x=clamp(c.x,4,98);c.y=clamp(c.y,8,52);c.zoom=clamp(c.zoom,1,7);c.pitch=clamp(c.pitch,25*Math.PI/180,80*Math.PI/180);c.yaw=Math.atan2(Math.sin(c.yaw),Math.cos(c.yaw));return c;}
export function pairGesture(a,b){return{distance:Math.hypot(b.x-a.x,b.y-a.y),angle:Math.atan2(b.y-a.y,b.x-a.x),y:(a.y+b.y)/2};}
export class CameraControls{
 constructor(canvas,camera,{enabled,project,onTap,threshold=6}){Object.assign(this,{canvas,camera,enabled,project,onTap,threshold});this.points=new Map();this.blockTap=false;this.transition=null;
  canvas.addEventListener('pointerdown',e=>this.down(e));canvas.addEventListener('pointermove',e=>this.move(e));canvas.addEventListener('pointerup',e=>this.up(e));
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>this.cancel(e));
  canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{if(!enabled())return;e.preventDefault();this.transition=null;this.zoomAt({x:e.clientX,y:e.clientY},Math.exp(-clamp(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1),-240,240)*.002));},{passive:false});
 }
 down(e){if(!this.enabled()||!(e.button===0||e.button===2))return;this.transition=null;if(!this.points.size)this.blockTap=false;const p={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:e.button};this.points.set(e.pointerId,p);if(this.points.size>1||e.button===2)this.blockTap=true;this.canvas.setPointerCapture(e.pointerId);}
 move(e){const prev=this.points.get(e.pointerId);if(!prev)return;if(!this.enabled()){this.clear();return;}const old=[...this.points.values()].map(p=>({...p}));const p={...prev,x:e.clientX,y:e.clientY};this.points.set(e.pointerId,p);
  if(this.points.size>2){this.blockTap=true;return;}
  if(this.points.size===2){const before=pairGesture(...old),after=pairGesture(...this.points.values());this.blockTap=true;if(before.distance<12||after.distance<12)return;this.camera.zoom*=after.distance/before.distance;this.camera.yaw-=Math.atan2(Math.sin(after.angle-before.angle),Math.cos(after.angle-before.angle));this.camera.pitch+=(after.y-before.y)*.004;constrain(this.camera);return;}
  if(Math.hypot(p.x-p.startX,p.y-p.startY)>this.threshold)this.blockTap=true;if(!this.blockTap)return;
  if(p.button===2){this.camera.yaw-=(p.x-prev.x)*.006;this.camera.pitch+=(p.y-prev.y)*.004;}
  else{const a=this.project(prev),b=this.project(p);if(a&&b){this.camera.x+=a.x-b.x;this.camera.y+=a.y-b.y;}}
  constrain(this.camera);
 }
 up(e){const p=this.points.get(e.pointerId);if(!p)return;const tap=this.enabled()&&!this.blockTap&&this.points.size===1&&p.button===0&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<=this.threshold;this.points.delete(e.pointerId);if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);if(tap)this.onTap({x:e.clientX,y:e.clientY});if(!this.points.size)this.blockTap=false;}
 cancel(e){if(this.points.has(e.pointerId)){this.points.delete(e.pointerId);this.blockTap=true;}}
 clear(){this.points.clear();this.blockTap=true;this.transition=null;}
 zoomAt(p,factor){const a=this.project(p);this.camera.zoom*=factor;constrain(this.camera);const b=this.project(p);if(a&&b){this.camera.x+=a.x-b.x;this.camera.y+=a.y-b.y;constrain(this.camera);}}
 focus(x,y,zoom=2.1){this.transition={from:{...this.camera},to:{...this.camera,x,y,zoom},elapsed:0};}
 reset(animate=true){this.clear();if(animate)this.transition={from:{...this.camera},to:{...DEFAULT_CAMERA},elapsed:0};else Object.assign(this.camera,DEFAULT_CAMERA);}
 update(dt){if(!this.transition)return;const t=this.transition;t.elapsed+=dt;const f=Math.min(1,t.elapsed/.5),ease=f*f*(3-2*f);for(const k of ['x','y','zoom','yaw','pitch'])this.camera[k]=t.from[k]+(t.to[k]-t.from[k])*ease;constrain(this.camera);if(f===1)this.transition=null;}
}
