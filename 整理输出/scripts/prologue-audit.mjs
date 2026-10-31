import {CampaignWorld} from '../game/campaign.js';
import {PROLOGUE as P} from '../game/prologue-data.js';
const reports=[];
for(const seed of [11,22,33]){
 const w=new CampaignWorld(seed);w.paused=false;let real=0,phase='',phases=[],decision=0;
 for(let i=0;i<2400&&w.phase!=='ready';i++){
  if(w.phase!==phase){phase=w.phase;phases.push({phase,real:+real.toFixed(2),simulation:+w.time.toFixed(2),population:w.humans().length,souls:w.score});}
  if(w.dialogue){w.advanceDialogue(true);continue;}
  if(w.phase==='peace')w.cast('peace',w.get(w.islands[0].kingId));
  if(w.phase==='rain')w.cast('weather',w.islands[1],'rain');
  if(w.phase==='first_soul')w.cast('lightning',w.humans(1).find(e=>e.role==='civilian'));
  if(['harvest','final_cast'].includes(w.phase)&&!w.cooldowns.meteor){const candidates=w.humans(1);const target=candidates.sort((a,b)=>w.targets(b,5).length-w.targets(a,5).length)[0];if(target)w.cast('meteor',target);}
  w.step(.25*w.speed);w.advancePresentation(.25);real+=.25;w.visualEvents=[];
 }
 if(w.phase!=='ready')throw Error('Prologue stalled: '+w.phase);
 const teachingReal=real,populationAtStart=w.humans().length,teachingSouls=w.souls;w.startChallenge();
 for(let i=0;i<1201&&!w.result;i++){
  w.step(.25);if(w.elapsed<decision)continue;decision=w.elapsed+1;
  if(!w.cooldowns.meteor&&w.mana>=12&&w.humans().length>35){const candidates=w.humans().filter(e=>w.humans(e.country).length>25);const p=candidates.sort((a,b)=>w.targets(b,5).length-w.targets(a,5).length)[0];if(p)w.cast('meteor',p);}
  w.visualEvents=[];
 }
 reports.push({seed,phases,teachingReal,readingSecondsEstimate:45,populationAtStart,teachingSouls,result:w.result,challengeSeconds:+w.elapsed.toFixed(2),score:w.score,goal:w.goal,remainingPopulation:w.humans().length});
}
console.log(JSON.stringify({passed:reports.every(r=>r.teachingReal+45<180&&r.result==='success'),reports},null,2));
if(reports.some(r=>r.teachingReal+45>=180||r.result!=='success'))process.exitCode=1;
