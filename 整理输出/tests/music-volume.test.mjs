import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicTrack} from '../game/music-track.js';

function mockAudio(){return class {constructor(){this.paused=true;this.currentTime=12;this.readyState=4;this.volume=1;}addEventListener(){}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};}
test('BGM routes once through a quiet gain without double attenuation or losing position',async()=>{
 const original=globalThis.Audio;globalThis.Audio=mockAudio();
 try{
  const track=new MusicTrack();track.unlock();let routes=0;const connections=[];
  const gain={gain:{value:1},connect:n=>connections.push(n)},destination={};
  const source={connect:n=>connections.push(n)};
  const ctx={destination,createGain:()=>gain,createMediaElementSource:media=>{routes++;assert.equal(media,track.media);return source;}};
  track.attachContext(ctx);track.attachContext(ctx);track.unlock();
  assert.equal(routes,1);assert.equal(track.media.volume,1);assert.equal(gain.gain.value,.22);
  assert.ok(connections.includes(gain));assert.ok(connections.includes(destination));
  await new Promise(resolve=>setImmediate(resolve));track.update(false,false);assert.equal(track.media.paused,true);
  track.update(true,false);assert.equal(track.media.paused,false);assert.equal(track.media.currentTime,12);
 }finally{globalThis.Audio=original;}
});
test('unsupported Web Audio media routing preserves playable reduced-volume fallback',()=>{
 const original=globalThis.Audio;globalThis.Audio=mockAudio();
 try{
  const track=new MusicTrack();track.unlock();track.attachContext({});
  assert.equal(track.media.volume,.22);assert.equal(track.media.paused,false);
  track.attachContext({createGain:()=>({gain:{},connect(){}}),createMediaElementSource(){throw Error('unavailable');}});
  assert.equal(track.media.volume,.22);assert.equal(track.media.paused,false);
 }finally{globalThis.Audio=original;}
});
