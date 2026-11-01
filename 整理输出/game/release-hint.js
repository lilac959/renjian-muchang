export function releaseHint(pointerType){
 return pointerType==='touch'||pointerType==='pen'?'点击场景释放':'移动鼠标瞄准 · 左键释放 · 右键取消';
}
// Measure visible UI instead of assuming a fixed tutorial bar height.
export function positionReleaseHint(hint,{header,task,portrait}){
 if(!hint)return;
 if(!portrait){hint.style.removeProperty('--aim-hint-top');return;}
 const bottom=el=>el?.getClientRects().length?el.getBoundingClientRect().bottom:0;
 const top=Math.ceil(Math.max(bottom(header),bottom(task)))+8;
 hint.style.setProperty('--aim-hint-top',top+'px');
}
