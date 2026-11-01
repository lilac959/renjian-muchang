import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseHint,positionReleaseHint} from '../game/release-hint.js';
test('release instructions follow input type, independent of screen orientation',()=>{
 assert.match(releaseHint('mouse'),/左键释放.*右键取消/);
 for(const type of ['touch','pen'])assert.equal(releaseHint(type),'点击场景释放');
});
test('portrait hint clears both HUD and wrapped tutorial bar and resets on rotation',()=>{
 const values={},hint={style:{setProperty:(k,v)=>values[k]=v,removeProperty:k=>delete values[k]}};
 const box=(bottom,visible=true)=>({getClientRects:()=>visible?[{}]:[],getBoundingClientRect:()=>({bottom})});
 positionReleaseHint(hint,{header:box(126),task:box(220),portrait:true});assert.equal(values['--aim-hint-top'],'228px');
 positionReleaseHint(hint,{header:box(126),task:box(280.5),portrait:true});assert.equal(values['--aim-hint-top'],'289px');
 positionReleaseHint(hint,{header:box(126),task:box(280,false),portrait:true});assert.equal(values['--aim-hint-top'],'134px');
 positionReleaseHint(hint,{header:box(126),task:box(220),portrait:false});assert.equal(values['--aim-hint-top'],undefined);
});
