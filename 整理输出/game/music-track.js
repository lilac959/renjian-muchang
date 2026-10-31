// Local licensed recording; pause preserves playback position.
export class MusicTrack{
 constructor(){this.enabled=true;this.quiet=false;this.pending=false;this.blocked=false;this.failed=false;}
 unlock(){if(!this.media&&typeof Audio!=='undefined'){this.media=new Audio(new URL('./assets/audio/corncob.mp3',import.meta.url).href);this.media.loop=true;this.media.preload='auto';this.media.volume=.30;this.media.addEventListener('error',()=>{this.failed=true;});}this.blocked=false;this.sync();}
 get active(){return !!this.media&&!this.failed&&this.media.readyState>=3&&!this.media.paused;}
 sync(){const m=this.media;if(!m)return;if(!this.enabled||this.quiet||this.failed){m.pause();return;}if(m.paused&&!this.pending&&!this.blocked){this.pending=true;const promise=m.play();Promise.resolve(promise).catch(e=>{if(e.name!=='AbortError')this.blocked=true;}).finally(()=>{this.pending=false;if(!this.enabled||this.quiet)m.pause();});}}
 update(enabled,quiet){this.enabled=enabled;this.quiet=quiet;this.sync();}
}
