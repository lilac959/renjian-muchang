import {CONFIG as C,HUSBANDRY as H,WILDLIFE as B} from './config.js';
import {nearestWalkable} from './island-layout.js';
export function spawnAnimal(w,kind,c,p,adult=true){
 const at=nearestWalkable(p,c.id,w.blockers());const a={id:++w.serial,kind,country:c.id,...at,home:{...at},adult,age:adult?H.matureSeconds:0,hp:kind==='sheep'?H.hp:B.hp,dead:false,joy:0,rage:0,attack:0,life:0,destination:{...at}};w.animals.push(a);return a;
}
export function initAnimals(w){
 const c=w.islands[1];c.pens=structuredClone(H.pens);c.sheepBirthCredit=0;c.harvestCredit=0;c.harvested=0;c.meatCollected=0;
 for(let i=0;i<H.initialSheep;i++){const pen=c.pens[i%c.pens.length],a=(i*2.399),r=.6+(i%4)*.25;spawnAnimal(w,'sheep',c,{x:pen.x+Math.cos(a)*r,y:pen.y+Math.sin(a)*r},i<H.initialAdultSheep);}
 w.wildlifeClock=0;w.beastBirthCredit=[0,0];
 for(const c of w.islands)for(const p of B.homes[c.id])spawnAnimal(w,'beast',c,p);
}
export const sheep=(w,c)=>w.animals.filter(a=>!a.dead&&a.kind==='sheep'&&a.country===c.id);
export function pastureForecast(w,c){
 const flock=sheep(w,c),adults=flock.filter(a=>a.adult&&a.rage<=0).length,workers=w.workers(c);
 const care=Math.min(1,workers.length*H.sheepPerWorker/Math.max(1,flock.length));
 const rain=c.weather.left>0&&c.weather.kind==='rain'?H.rainBreeding:1;
 const joy=flock.filter(a=>a.adult&&a.rage<=0&&a.joy>0).length;
 const temperature=c.weather.kind==='rain'?1:w.climate(c).field;
 const born=(adults+joy*(H.joyBreeding-1))*H.birthRate*care*rain*temperature;
 return Math.min(born,workers.reduce((n,e)=>n+H.slaughterPerWorker*(e.bless>0?C.blessFactor:1),0))*H.meatFood;
}
export function advanceHusbandry(w,c,dt){
 if(c.id!==1)return;
 let flock=sheep(w,c);const workers=w.workers(c),adults=flock.filter(a=>a.adult&&a.rage<=0),capacity=c.pens.reduce((n,p)=>n+p.capacity,0);
 const care=Math.min(1,workers.length*H.sheepPerWorker/Math.max(1,flock.length));
 const rain=c.weather.left>0&&c.weather.kind==='rain'?H.rainBreeding:1;
 const temperature=c.weather.kind==='rain'?1:w.climate(c).field;
 c.sheepBirthCredit+=dt*adults.reduce((n,a)=>n+H.birthRate*(a.joy>0?H.joyBreeding:1),0)*care*rain*temperature;
 while(c.sheepBirthCredit>=1&&flock.length<capacity&&adults.length>=2){
  c.sheepBirthCredit--;const pen=c.pens[flock.length%c.pens.length],angle=w.random()*Math.PI*2,r=.4+w.random()*1.7;
  const a=spawnAnimal(w,'sheep',c,{x:pen.x+Math.cos(angle)*r,y:pen.y+Math.sin(angle)*r},false);flock.push(a);w.change('animal-born',{animalId:a.id,country:1,kind:'sheep'});
 }
 // No stored baby burst after reaching pen capacity or losing all breeders.
 if(flock.length>=capacity||adults.length<2)c.sheepBirthCredit=Math.min(c.sheepBirthCredit,.99);
 c.harvestCredit=Math.min(2,c.harvestCredit+dt*workers.reduce((n,e)=>n+H.slaughterPerWorker*(e.bless>0?C.blessFactor:1),0));
 const reserve=w.consumption(c)*H.reserveSeconds;
 while(c.harvestCredit>=1&&c.food<reserve&&flock.length){
  const mature=flock.filter(a=>a.adult),sustainable=Math.min(Math.floor(capacity/(1+H.birthRate*rain*temperature*H.matureSeconds)),Math.ceil(w.consumption(c)*H.breederMargin/(H.birthRate*H.meatFood*rain*temperature)));
  const floor=c.food<w.consumption(c)*H.emergencySeconds?H.emergencyBreeders:Math.max(H.keepBreeders,sustainable);
  if(mature.length<=floor)break;
  const animal=mature[0];c.harvestCredit--;w.kill(animal,'slaughter');flock=flock.filter(a=>!a.dead);
 }
}
export function advanceAnimals(w,dt){
 for(const a of w.animals){
  if(a.dead)continue;for(const key of ['joy','rage','attack'])a[key]=Math.max(0,a[key]-dt);
  a.age+=dt;if(a.kind==='sheep'){if(a.age>=H.matureSeconds)a.adult=true;if(a.rage<=0)continue;}
  const victims=w.humans().filter(e=>Math.hypot(e.x-a.x,e.y-a.y)<(a.rage>0?B.rageSearch:B.search));
  const victim=victims.sort((x,y)=>Math.hypot(x.x-a.x,x.y-a.y)-Math.hypot(y.x-a.x,y.y-a.y))[0];
  if(victim){w.move(a,victim,dt,a.rage>0?B.rageSpeed:B.speed);if(Math.hypot(a.x-victim.x,a.y-victim.y)<B.reach&&a.attack<=0){w.damage(victim,B.damage,'beast');a.attack=B.attackInterval;}}
  else if(Math.hypot(a.x-a.home.x,a.y-a.home.y)>.3)w.move(a,a.home,dt,B.speed);
 }
 for(const c of w.islands){
  const beasts=w.animals.filter(a=>!a.dead&&a.kind==='beast'&&a.country===c.id),happy=beasts.filter(a=>a.joy>0);
  if(happy.length&&beasts.length<B.maxPerIsland){w.beastBirthCredit[c.id]+=dt*happy.length/B.joyBirthSeconds;
   while(w.beastBirthCredit[c.id]>=1&&beasts.length<B.maxPerIsland){w.beastBirthCredit[c.id]--;const parent=happy[0],a=spawnAnimal(w,'beast',c,{x:parent.home.x+1,y:parent.home.y+.7});a.home={...parent.home};beasts.push(a);w.change('animal-born',{animalId:a.id,country:c.id,kind:'beast',source:'joy'});}
  }else w.beastBirthCredit[c.id]=Math.min(w.beastBirthCredit[c.id],.99);
 }
 w.wildlifeClock+=dt;
 if(w.wildlifeClock>=B.respawnSeconds){w.wildlifeClock%=B.respawnSeconds;
  for(const c of w.islands)for(const p of B.homes[c.id]){
   const settled=(c.buildings||[]).some(b=>b.state!=='planned'&&Math.hypot(b.x-p.x,b.y-p.y)<B.settlementRadius);
   if(settled||w.animals.filter(a=>!a.dead&&a.kind==='beast'&&a.country===c.id).length>=B.maxPerIsland||w.humans(c.id).some(e=>Math.hypot(e.x-p.x,e.y-p.y)<B.settlementRadius)||w.animals.some(a=>!a.dead&&a.kind==='beast'&&a.country===c.id&&Math.hypot(a.home.x-p.x,a.home.y-p.y)<1))continue;
   spawnAnimal(w,'beast',c,p);w.change('wildlife-respawned',{country:c.id,x:p.x,y:p.y});
  }
 }
 w.animals=w.animals.filter(a=>!a.dead);
}
