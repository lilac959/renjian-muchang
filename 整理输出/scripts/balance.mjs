import {World} from '../game/engine.js';
import {CONFIG} from '../game/config.js';
import {writeFile,mkdir} from 'node:fs/promises';
const reports=[];
for(const strategy of ['observe','rain','growth-and-harvest'])for(const seed of [11,22,33]){
 const w=new World(seed);w.paused=false;let decision=0,peak=4,firstMeat=null;
 for(let i=0;i<6001&&!w.result;i++){
  w.step(.05);peak=Math.max(peak,w.humans().length);
  if(!firstMeat&&w.entities.some(e=>e.cargo===CONFIG.meat))firstMeat=w.time;
  if(w.time<decision)continue;decision=w.time+1;
  if(strategy!=='observe'&&w.time<230){for(const c of w.islands){if(c.weather.left<1)w.cast('weather',c,{temp:'normal',cloud:true});
    if(strategy==='growth-and-harvest'&&w.supply(c)>30){const people=w.humans(c.id).filter(e=>e.adult&&e.partnerId&&e.joy<=0);const best=people.sort((a,b)=>w.legalTargets('joy',b,5).length-w.legalTargets('joy',a,5).length)[0];if(best)w.cast('joy',best);}
  }}
  if(strategy==='growth-and-harvest'&&w.time>235){const people=w.humans();const cluster=people.sort((a,b)=>w.targets(b,5).filter(e=>e.kind==='human'&&!e.inside).length-w.targets(a,5).filter(e=>e.kind==='human'&&!e.inside).length)[0];if(cluster)w.cast('meteor',cluster);const victim=w.humans().find(e=>!e.inside);if(victim)w.cast('lightning',victim);}
 }
 const report={strategy,seed,result:w.result,time:Math.round(w.time*100)/100,souls:w.souls,births:w.births,peak,population:w.humans().length,islands:w.islands.length,conflict:w.conflict,firstMeat:firstMeat&&Number(firstMeat.toFixed(2)),milestones:w.milestones};reports.push(report);console.log(JSON.stringify(report));
}
await mkdir(new URL('../reports/',import.meta.url),{recursive:true});
await writeFile(new URL('../reports/core-balance.json',import.meta.url),JSON.stringify({note:'真实模拟、合法施法，无强制补人。候选参数未证明300魂可达。',reports},null,2));
