import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../game/engine.js';
import {targetPreview,previewRing} from '../game/target-preview.js';
function fixture(){const w=new World(42);w.paused=false;w.mana=100;return w;}
test('king preview matches exact recruited IDs and separates primary target',()=>{const w=fixture(),king=w.humans(0).find(e=>e.king),p=targetPreview(w,'rage',king);assert.deepEqual(p.affected,[king.id]);w.cast('rage',king);assert.deepEqual(p.secondary,w.islands[0].army.ids);assert.equal(previewRing('rage'),false);assert.equal(previewRing('lightning'),false);assert.equal(previewRing('meteor'),true);});
test('lightning highlights exactly one target and invalid casts highlight nobody',()=>{const w=fixture(),a=w.humans(0)[1];assert.deepEqual(targetPreview(w,'lightning',a).affected,[a.id]);w.mana=0;assert.deepEqual(targetPreview(w,'lightning',a).affected,[]);});
test('undead highlights only live corpses that will actually be consumed',()=>{const w=fixture(),c=w.islands[0];for(const e of w.humans(0)){e.x=c.x;e.y=c.y;w.kill(e);}const p=targetPreview(w,'undead',c);assert.equal(p.corpses.length,6);assert.ok(w.cast('undead',c).ok);assert.deepEqual(w.corpses.filter(b=>b.life===0).map(b=>b.id),p.corpses);});

test('rage preview supports beasts and repeated orders on angry kings without mutating rage',()=>{const w=fixture(),beast=w.animals.find(e=>e.kind==='beast'),king=w.get(w.islands[0].kingId);assert.deepEqual(targetPreview(w,'rage',beast).affected,[beast.id]);king.rage=20;const p=targetPreview(w,'rage',king);assert.deepEqual(p.affected,[king.id]);assert.equal(king.rage,20);assert.ok(p.secondary.length>0);w.cast('rage',king);assert.deepEqual(p.secondary,w.islands[0].army.ids);});
