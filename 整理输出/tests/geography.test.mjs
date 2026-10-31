import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../game/engine.js';
import {CONFIG as C} from '../game/config.js';
import {QINGHE,BRIDGE,walkable,islandId,castable,groundHeight,route,segmentClear,obstacles} from '../game/island-layout.js';

test('births and random destinations remain on the correct walkable island',()=>{for(const seed of [1,42,99]){const w=new World(seed);for(const c of w.islands)for(let i=0;i<500;i++){const p=w.point(c);assert.ok(walkable(p));assert.equal(islandId(p),c.id);}w.paused=false;w.step(80);for(const e of w.entities){assert.ok(walkable(e));assert.ok(walkable(e.destination));}}});
test('buildings block walking but remain valid spell ground; roofs are not sampled',()=>{const o=QINGHE.obstacles.find(o=>o.name.startsWith('Village Hall | MH_Church_01')&&!o.name.includes('Repair'));const p={x:(o.min[0]+o.max[0])/2,y:(o.min[1]+o.max[1])/2};assert.ok(castable(p));assert.equal(walkable(p),false);assert.ok(groundHeight(p)<1);assert.equal(castable({x:51,y:18}),false);});
test('both bridge ends and complete routes connect continuously around obstacles',()=>{assert.ok(walkable(BRIDGE.a));assert.ok(walkable(BRIDGE.b));for(const [a,b] of [[{x:27,y:28},{x:79.5,y:29.5}],[{x:79.5,y:29.5},{x:27,y:28}]]){const nodes=route(a,b);assert.ok(nodes.length>0);let prev=a;for(const node of nodes){assert.ok(segmentClear(prev,node));prev=node;}assert.deepEqual(nodes.at(-1),b);}});
test('war, defenders, retreat and undead never leave legal terrain',()=>{const w=new World(42);w.paused=false;w.mana=100;for(const c of w.islands)for(const e of w.humans(c.id)){e.x=c.x;e.y=c.y;}assert.ok(w.cast('rage',w.islands[0]).ok);for(let i=0;i<1000;i++){w.step(.05);if(i===300){const e=w.humans(1)[0];w.kill(e);assert.ok(w.cast('undead',e).ok);}if(i===400)w.peace();for(const e of w.entities)assert.ok(walkable(e),`${e.kind}: ${e.x}, ${e.y}`);}assert.equal(w.humans().filter(e=>e.soldier).length,0);});
test('previous coordinate saves are explicitly incompatible',()=>{assert.equal(C.version,7);assert.throws(()=>World.restore(JSON.stringify({version:6,state:{}})),/旧版/);});
