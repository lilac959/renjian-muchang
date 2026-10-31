import test from 'node:test';
import assert from 'node:assert/strict';
import {PauseState} from '../game/pause-state.js';
test('closing menus preserves the user pause state',()=>{for(const manual of [false,true]){const p=new PauseState();p.reset(manual);p.open('dialog');assert.equal(p.paused,true);p.open('dialog');p.close('dialog');assert.equal(p.paused,manual);}});
test('inspection and menu layers cannot unpause one another',()=>{const p=new PauseState();p.open('preview');p.open('dialog');p.close('preview');p.toggle();assert.equal(p.paused,true);p.close('dialog');assert.equal(p.paused,false);});
test('background suspension during inspection or a menu survives closing it',()=>{for(const layer of ['preview','dialog']){const p=new PauseState();p.open(layer);p.suspend();p.close(layer);assert.equal(p.paused,true);p.toggle();assert.equal(p.paused,false);}});
test('load starts paused and a new game clears old overlay state',()=>{const p=new PauseState();p.open('dialog');p.reset(true);assert.equal(p.paused,true);p.reset(false);assert.equal(p.paused,false);assert.equal(p.layers.size,0);});
