import {World} from '../game/engine.js';
import {CONFIG as C} from '../game/config.js';
const reports=[];
const strategies=process.argv.includes('--cycles-only')?['cycles']:['observe','war','cycles'];
for(const strategy of strategies)for(const seed of [11,22,33,44,55]){
 const w=new World(seed);w.paused=false;let decision=0,peak=C.initialAdults*2,casts={};
 const cast=(id,p,arg)=>{if(w.cast(id,p,arg).ok)casts[id]=(casts[id]||0)+1;};
 for(let i=0;i<6001&&!w.result;i++){
  w.step(.05);peak=Math.max(peak,w.humans().length);if(w.time<decision)continue;decision=w.time+1;
  if(strategy==='observe')continue;
  for(const c of w.islands){
   if(strategy==='war'&&w.mana>20&&c.weather.left<1)cast('weather',c,'rain');
   if(strategy==='cycles'&&c.id===1&&w.time<60&&w.mana>25){const sheep=w.animals.find(a=>a.kind==='sheep'&&!a.dead);if(sheep)cast('joy',sheep);}
   const king=w.get(c.kingId);
   if(strategy==='war'&&king&&w.time>25&&w.adults(c).length>=10&&!c.army&&!w.armyCheck(c,c))cast('rage',king);
  }
  if(strategy==='cycles'&&w.time>50&&w.humans().length>30&&w.mana>=12){
   const candidates=w.humans().filter(e=>w.adults(w.islands[e.country]).length>10);
   const best=candidates.sort((a,b)=>w.targets(b,5).filter(e=>e.kind==='human').length-w.targets(a,5).filter(e=>e.kind==='human').length)[0];
   if(best&&w.targets(best,5).length>=6)cast('meteor',best);
  }
 }
 const r={strategy,seed,result:w.result,time:+w.time.toFixed(2),souls:w.souls,births:w.births,peak,population:w.humans().length,mana:+w.mana.toFixed(1),milestones:w.milestones,casts,islands:w.islands.map(c=>({id:c.id,population:w.humans(c.id).length,food:+c.food.toFixed(1),houses:c.buildings?.filter(b=>b.kind==="house"&&b.state==="complete"&&!b.upgrading).length??null,fields:c.buildings?.filter(b=>b.kind==="field"&&b.state==="complete").length??null,sheep:w.animals.filter(a=>a.kind==="sheep"&&!a.dead&&a.country===c.id).length,research:+(c.research||0).toFixed(2)}))};reports.push(r);console.log(JSON.stringify(r));
}
console.log(JSON.stringify({goal:C.goal,successes:reports.filter(r=>r.result==='success').length,runs:reports.length}));
if(reports.some(r=>r.strategy==='cycles'&&r.result!=='success'))process.exitCode=1;
