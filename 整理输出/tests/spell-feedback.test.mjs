import test from 'node:test';
import assert from 'node:assert/strict';
import {drawSpellFeedback} from '../game/spell-feedback.js';
test('feedback is deterministic at paused time and never mutates gameplay',()=>{
 const calls=[],gradient={addColorStop(){}};
 const g=new Proxy({}, {set(o,k,v){o[k]=v;return true;},get(o,k){if(k in o)return o[k];if(k.startsWith('create'))return()=>gradient;return(...a)=>{for(const n of a)if(typeof n==='number')assert.ok(Number.isFinite(n));if(k==='ellipse')assert.ok(a[2]>=0&&a[3]>=0);calls.push([k,...a]);};}});
 const actor={id:1,x:2,y:3,adult:true,bless:2,joy:2,sick:0,soldier:false};
 const world={time:1,entities:[actor],fires:[{x:2,y:3,left:2}],effects:[{x:2,y:3,soul:true,life:1.5}],get:id=>id===1?actor:null};
 const view={w:800,h:600,soulTarget:{x:700,y:30},project:p=>({x:p.x*10,y:p.y*10})};
 const ids=['meteor','impact','lightning','bless','joy','peace','rage','plague','undead','weather'];
 const events=ids.map(id=>({id,time:.8,x:2,y:3,targets:[actor],corpses:[actor],weather:'rain',extinguished:[actor]}));
 const before=JSON.stringify(world);drawSpellFeedback(g,view,world,events,8);const first=JSON.stringify(calls);calls.length=0;drawSpellFeedback(g,view,world,events,8);assert.equal(JSON.stringify(calls),first);assert.equal(JSON.stringify(world),before);
 for(const time of [0,1.4,3,6]){world.time=time;drawSpellFeedback(g,view,world,events,56);}
});
import {drawSoulFlights} from '../game/spell-feedback.js';
test('soul reaches the HUD bottle before its arrival pulse and does not alter simulation',()=>{const ellipses=[],g=new Proxy({}, {set(o,k,v){o[k]=v;return true;},get(o,k){if(k in o)return o[k];if(k.startsWith('create'))return()=>({addColorStop(){}});return(...args)=>{if(k==='ellipse')ellipses.push(args);};}}),world={effects:[{soul:true,life:.18,x:3,y:4}]},view={soulTarget:{x:600,y:40},project:()=>({x:100,y:400})};drawSoulFlights(g,view,world,10);assert.ok(ellipses.some(([x,y])=>Math.abs(x-600)<.01&&Math.abs(y-40)<.01));assert.equal(world.effects[0].life,.18);});
