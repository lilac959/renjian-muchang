import {World} from '../game/engine.js';
// A repeatable, legal-input smoke strategy, not an assertion of finished balance.
for(const seed of [11,22,33]){
 const w=new World(seed);w.paused=false;let decision=0;
 for(let i=0;i<6001&&!w.result;i++){
  w.step(.05);if(w.time<decision)continue;decision=w.time+1;
  if(w.time<190){for(const c of w.islands){w.cast('weather',c,{temp:'normal',cloud:true});const candidates=w.humans(c.id);const best=candidates.sort((a,b)=>w.targets(b,5).length-w.targets(a,5).length)[0];if(best)w.cast('joy',best);}}
  if(w.time>170){if(!w.unlocked.includes('plague'))w.unlock('plague');const people=w.humans();const cluster=people.sort((a,b)=>w.targets(b,5).filter(e=>e.kind==='human').length-w.targets(a,5).filter(e=>e.kind==='human').length)[0];if(cluster){w.cast('meteor',cluster);w.cast('plague',cluster);}const oldest=w.humans().sort((a,b)=>b.age-a.age)[0];if(oldest)w.cast('lightning',oldest);}
 }
 console.log(JSON.stringify({seed,result:w.result,time:Math.round(w.time),souls:w.souls,births:w.births,population:w.humans().length}));
}
