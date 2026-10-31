import {MusicTrack} from './music-track.js';
// Original skill effects; procedural score is a fallback for the local licensed BGM.
const midi=n=>440*2**((n-69)/12);
export const MUSIC={bpm:76,beats:64,melody:[74,0,77,81,79,77,74,0,72,0,74,77,76,72,69,0,70,0,74,77,79,77,74,0,72,76,79,81,79,76,72,0]};
export class GameAudio{
 constructor(){this.track=new MusicTrack();this.ctx=null;this.voices=new Set();this.seen=new WeakSet();this.beat=0;this.nextBeat=0;this.paused=false;this.sound=true;this.music=true;this.lastSoul=-10;}
 unlock(){this.track.update(this.music,this.paused);this.track.unlock();try{if(!this.ctx){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;this.ctx=new C();const c=this.ctx;this.master=c.createGain();this.master.gain.value=.62;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=8;this.master.connect(limiter);limiter.connect(c.destination);this.sfx=c.createGain();this.bgm=c.createGain();this.sfx.connect(this.master);this.bgm.connect(this.master);this.bgm.gain.value=.32;
 // A quiet echo gives the music space without external impulse responses.
 const delay=c.createDelay(1),echo=c.createGain();delay.delayTime.value=.29;echo.gain.value=.18;this.bgm.connect(delay);delay.connect(echo);echo.connect(this.master);
 this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=this.noise.getChannelData(0);let seed=7341;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}this.nextBeat=c.currentTime+.04;}
 if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
 }catch{/* Audio is optional; game input must still work. */}}
 voice(source,gain,start,duration,bus,filter){if(this.voices.size>=96)return;const c=this.ctx,envelope=c.createGain();envelope.gain.setValueAtTime(.0001,start);envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),start+.025);envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);if(filter){source.connect(filter);filter.connect(envelope);}else source.connect(envelope);envelope.connect(bus);const item={source,envelope,filter,bus};this.voices.add(item);source.onended=()=>{source.disconnect();envelope.disconnect();filter?.disconnect();this.voices.delete(item);};source.start(start);source.stop(start+duration+.02);}
 tone(freq,duration=.3,gain=.1,type='sine',delay=0,end=freq,music=false){if(!this.ctx||this.paused||!(music?this.music:this.sound))return;const o=this.ctx.createOscillator(),t=this.ctx.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);this.voice(o,gain,t,duration,music?this.bgm:this.sfx);}
 hiss(duration,gain,frequency=1000,delay=0,end=frequency){if(!this.ctx||this.paused||!this.sound)return;const c=this.ctx,o=c.createBufferSource(),f=c.createBiquadFilter(),t=c.currentTime+delay;o.buffer=this.noise;f.type='lowpass';f.frequency.setValueAtTime(frequency,t);f.frequency.exponentialRampToValueAtTime(Math.max(40,end),t+duration);this.voice(o,gain,t,duration,this.sfx,f);}
 chime(notes,spacing=.09,gain=.10){notes.forEach((n,i)=>this.tone(midi(n),.55,gain,'sine',i*spacing));}
 stop(bus){for(const v of this.voices)if(!bus||v.bus===bus){try{v.source.stop();}catch{}}}
 setSettings({sound=true,music=true}){if(this.sound!==sound&&!sound)this.stop(this.sfx);if(this.music!==music){if(!music)this.stop(this.bgm);this.nextBeat=(this.ctx?.currentTime||0)+.04;}this.sound=sound;this.music=music;this.track.update(music,this.paused);}
 click(){this.tone(540,.07,.025,'sine',0,680);}
 event(e){if(!this.ctx||!this.sound||this.paused)return;
 switch(e.id){
 case 'peace':this.chime([72,76,79,84],.12,.08);this.hiss(.65,.025,900);break;
 case 'bless':this.chime([62,69,74,78,81],.08,.07);break;
 case 'joy':this.chime([74,78,81,86,81],.11,.065);break;
 case 'weather':if(e.weather==='rain'){this.hiss(1.8,.10,3800,0,1500);this.chime([81,78,74],.16,.035);}else if(e.weather==='cold'){this.chime([90,86,81],.17,.05);this.hiss(1.2,.05,2800,0,500);}else if(e.weather==='hot'){this.hiss(.9,.07,350,0,1300);this.tone(130,.8,.04,'sine',0,180);}else this.chime([69,74,78,81],.16,.06);break;
 case 'lightning':this.hiss(.16,.28,9000,0,900);this.tone(180,.28,.22,'sawtooth',0,40);this.hiss(.65,.16,250,.08,65);break;
 case 'meteor':this.hiss(.68,.20,300,0,4200);this.tone(220,.65,.08,'triangle',0,65);break;
 case 'impact':this.tone(95,.8,.34,'sine',0,28);this.hiss(.7,.34,1600,0,120);this.hiss(1.3,.09,450,.1,70);break;
 case 'rage':if(e.targets?.some(a=>a.king))break;this.tone(150,.18,.12,'triangle',0,70);this.tone(180,.2,.10,'triangle',.15,80);this.hiss(.3,.07,600);break;
 case 'royal-command':for(const n of [50,57,62]){this.tone(midi(n),.75,.065,'triangle');this.tone(midi(n)*1.003,.75,.025,'sawtooth');}this.tone(90,.3,.15,'sine',0,45);break;
 case 'plague':this.hiss(1.1,.09,1000,0,160);this.tone(110,.9,.05,'triangle',0,75);this.tone(116,.9,.035,'sine',0,79);break;
 case 'undead':this.hiss(.9,.10,300,0,1600);this.tone(90,1.2,.08,'triangle',0,220);this.chime([57,60,66],.18,.06);break;
 case 'death':if(e.human&&this.ctx.currentTime-this.lastSoul>.16){this.lastSoul=this.ctx.currentTime;this.chime([86,93],.12,.035);}break;
 }
 }
 update(events,{paused=false,hidden=false}={}){const royal=events.some(e=>e.id==='royal-command');for(const e of events){if(this.seen.has(e))continue;this.seen.add(e);if(!paused&&!hidden&&!(royal&&e.id==='rage'))this.event(e);}if(!this.ctx)return;const c=this.ctx,quiet=paused||hidden;this.track.update(this.music,quiet);if(quiet!==this.paused){this.paused=quiet;this.stop();this.master.gain.setTargetAtTime(quiet?0:.62,c.currentTime,.025);this.nextBeat=c.currentTime+.05;}if(hidden){if(c.state==='running')c.suspend().catch(()=>{});return;}if(c.state==='suspended'&&!quiet){c.resume().catch(()=>{});this.nextBeat=c.currentTime+.05;}if(quiet||!this.music||c.state!=='running')return;
 if(this.track.active){this.stop(this.bgm);return;}
 if(this.nextBeat<c.currentTime-.2)this.nextBeat=c.currentTime+.03;
 while(this.nextBeat<c.currentTime+.12){const delay=Math.max(0,this.nextBeat-c.currentTime),beat=this.beat%MUSIC.beats,root=[50,46,53,48][Math.floor(beat/16)];if(beat%4===0){for(const n of [root,root+7,root+12])this.tone(midi(n),3,.035,'sine',delay,midi(n),true);this.tone(midi(root+12),.9,.06,'triangle',delay,midi(root+12),true);}const note=MUSIC.melody[Math.floor(beat/2)];if(beat%2===0&&note){this.tone(midi(note),1.3,.09,'sine',delay,midi(note),true);this.tone(midi(note+12),.7,.014,'sine',delay,midi(note+12),true);}this.beat++;this.nextBeat+=60/MUSIC.bpm;}
 }
}
