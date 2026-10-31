import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../game/engine.js';
import {CONFIG as C,SETTLEMENT as S,HUSBANDRY as H,SOCIETY as R,WILDLIFE as B} from '../game/config.js';
import {QINGHE,walkable,islandId,groundHeight,nearestWalkable,route,segmentClear} from '../game/island-layout.js';
import {FARM_LOTS,authoredRoad,nextLot,housing,advanceSettlement} from '../game/settlement.js';
import {advanceHusbandry,advanceAnimals,spawnAnimal} from '../game/husbandry.js';
import {advanceSociety,residentAction} from '../game/society.js';
const active=seed=>{const w=new World(seed??42);w.paused=false;return w;};
const gather=(w,c,p=c)=>{const q=nearestWalkable(p,c.id,w.blockers());for(const e of w.humans(c.id)){Object.assign(e,q);e.destination={...q};}};
const aliveSheep=w=>w.animals.filter(a=>a.kind==='sheep'&&!a.dead);
const allComplete=c=>{for(const b of c.buildings)b.state='complete';};

test('authored homes, special placeholders and wheat plots keep exact source transforms',()=>{
 const w=active(),c=w.islands[0],fixed=c.buildings.filter(b=>b.source==='authored');
 assert.equal(fixed.filter(b=>b.zone==='house').length,9);assert.equal(fixed.filter(b=>b.zone==='field').length,4);
 for(const b of fixed){const o=QINGHE.objects.find(o=>o.name===b.sourceNames[0]);assert.ok(o);assert.equal(b.x,(o.bounds[0][0]+o.bounds[1][0])/2);assert.equal(b.y,(o.bounds[0][1]+o.bounds[1][1])/2);assert.deepEqual(b.footprint.min,o.bounds[0].slice(0,2));}
 assert.equal(housing(c),10);assert.equal(c.buildings.filter(b=>b.state==='complete'&&b.kind==='field').length,2);
 for(const b of fixed.filter(b=>b.special))assert.equal(b.kind,'house');
 assert.equal(fixed.find(b=>b.zone==='field').sourceNames.length,2);
});
test('a zone consumes every authored slot before any extension',()=>{
 const w=active(),c=w.islands[0];for(const zone of ['house','field']){
  const authored=c.buildings.filter(b=>b.zone===zone&&b.source==='authored');
  for(const b of authored){if(b.state==='complete')continue;assert.equal(nextLot(c,zone).id,b.id);b.state='complete';}
  assert.equal(nextLot(c,zone).source,'extension');
 }
});
test('extension capacity fits max population, separates directions and avoids authored roads and footprints',()=>{
 const homes=FARM_LOTS.filter(b=>b.zone==='house'&&b.source==='extension'),fields=FARM_LOTS.filter(b=>b.zone==='field'&&b.source==='extension');
 assert.ok(homes.length>=10);assert.ok(fields.length>=6);
 assert.ok(homes.every(b=>b.y<=S.expansion.house.maxY));assert.ok(fields.every(b=>b.y>=S.expansion.field.minY));
 for(const b of [...homes,...fields])for(const x of [b.footprint.min[0],b.footprint.max[0]])for(const y of [b.footprint.min[1],b.footprint.max[1]]){assert.equal(islandId({x,y}),0);assert.ok(groundHeight({x,y})>=-.12);}
 const intersects=(a,b)=>a.min[0]<b.max[0]&&a.max[0]>b.min[0]&&a.min[1]<b.max[1]&&a.max[1]>b.min[1];
 const roads=QINGHE.objects.filter(authoredRoad).map(o=>({min:o.bounds[0],max:o.bounds[1]}));
 for(const b of [...homes,...fields])for(const r of [...QINGHE.obstacles,...roads])assert.equal(intersects(b.footprint,r),false,b.id);
});
test('construction spends real food once and occupied builders stop producing',()=>{
 const w=active(),c=w.islands[0],food=c.food,p=w.production(c);advanceSettlement(w,c,.05);
 const b=c.buildings.find(b=>b.state==='building');assert.ok(b);assert.equal(c.food,food-S.buildFood);
 advanceSettlement(w,c,.05);assert.equal(c.food,food-S.buildFood);assert.equal(b.workers.length,S.builders);assert.ok(w.production(c)<p);
 for(let i=0;i<110;i++)advanceSettlement(w,c,.05);assert.equal(b.state,'complete');assert.ok(housing(c)>10);
});
test('without a healthy worker neither clearing nor building progresses',()=>{
 const w=active(),c=w.islands[0];advanceSettlement(w,c,.05);const b=c.buildings.find(b=>b.state==='building');for(const e of w.humans(0))e.joy=30;
 advanceSettlement(w,c,3);assert.equal(b.progress,0);assert.deepEqual(b.workers,[]);
});
test('special conversion reserves beds, consumes worker time and promotes in place',()=>{
 const w=active(),c=w.islands[0];allComplete(c);while(w.humans(0).length<50)w.spawn('human',c,true);c.food=600;
 const academy=c.buildings.find(b=>b.special==='academy');const previous=[academy.id,academy.x,academy.y,...academy.sourceNames];academy.upgrading=true;
 const before=housing(c);assert.equal(before,(c.buildings.filter(b=>b.kind==='house').length-1)*S.houseCapacity);
 for(let i=0;i<170;i++)advanceSettlement(w,c,.05);
 assert.equal(academy.kind,'academy');assert.equal(academy.upgrading,false);assert.deepEqual([academy.id,academy.x,academy.y,...academy.sourceNames],previous);
 assert.ok(housing(c)>=w.humans(0).length);
});
test('unfinished homes do not allow normal births, joy can exceed housing with real children',()=>{
 const w=active(),c=w.islands[0];while(w.humans(0).length<housing(c))w.spawn('human',c,true);assert.equal(w.birthRate(c),0);
 c.food=0;for(const e of w.adults(c))e.joy=C.joySeconds;c.joyBirthProgress=C.birthSeconds;
 const before=w.humans(0).length;w.economy(c,.01);assert.equal(w.humans(0).length,before+1);assert.ok(w.humans(0).length>housing(c));assert.equal(w.humans(0).filter(e=>!e.adult).length,1);
});
test('joy stops human production then restores work with a separate appetite phase',()=>{
 const w=active(),c=w.islands[0];gather(w,c);c.food=500;const before=w.production(c);
 assert.ok(w.cast('joy',c).ok);assert.equal(w.production(c),0);assert.equal(w.workers(c).length,0);assert.equal(w.humans(0)[0].appetite,0);
 w.step(C.joySeconds+.05);assert.ok(w.humans(0).some(e=>e.appetite>0));assert.ok(w.production(c)>0);assert.ok(before>0);
 const affected=w.humans(0).filter(e=>e.appetite>0);assert.ok(affected.every(e=>e.joy<=0));assert.ok(w.consumption(c)>w.humans(0).length*C.foodUse);
});
test('pastoral food comes from slaughtered records, never an automatic herd income',()=>{
 const w=active(),c=w.islands[1];for(const e of w.humans(1))e.joy=50;c.food=100;const before=aliveSheep(w).length;w.economy(c,1);
 assert.equal(c.food,100-w.consumption(c));assert.equal(aliveSheep(w).length,before);
 for(const e of w.humans(1))e.joy=0;c.food=0;c.harvestCredit=1;
 const souls=w.souls,mana=w.mana;advanceHusbandry(w,c,.01);assert.equal(aliveSheep(w).length,before-1);assert.equal(c.food,H.meatFood);assert.equal(w.souls,souls);assert.equal(w.mana,mana);
});
test('sheep births have real pen capacity, rain and animal joy stack without human idling',()=>{
 const count=(rain,joy)=>{const w=active(),c=w.islands[1];c.food=600;if(rain)c.weather={kind:'rain',left:30};for(const a of aliveSheep(w))if(joy)a.joy=20;for(let i=0;i<80;i++)advanceHusbandry(w,c,.1);return {w,n:aliveSheep(w).length};};
 const base=count(false,false),rain=count(true,false),both=count(true,true);assert.ok(rain.n>base.n);assert.ok(both.n>rain.n);assert.ok(both.w.workers(both.w.islands[1]).length>0);
 for(let i=0;i<200;i++)advanceHusbandry(both.w,both.w.islands[1],1);
 assert.ok(aliveSheep(both.w).length<=both.w.islands[1].pens.reduce((n,p)=>n+p.capacity,0));
});
test('killing beasts provides meat once and no human souls',()=>{
 const w=active(),beast=w.animals.find(a=>a.kind==='beast'),c=w.islands[beast.country],before=c.food;w.kill(beast);w.kill(beast);assert.equal(c.food,before+B.meatFood);assert.equal(w.souls,0);assert.equal(w.mana,C.mana);
});
test('remote single-target civilian rage recruits one resident; king commands a group',()=>{
 const w=active(),c=w.islands[0];gather(w,c);const king=w.get(c.kingId),person=w.humans(0).find(e=>e.role==='civilian');
 Object.assign(person,nearestWalkable({x:36,y:21},0));assert.ok(w.cast('rage',person).ok);assert.equal(person.rage,C.rageSeconds);assert.deepEqual(c.army.ids,[person.id]);assert.equal(w.workers(c).includes(person),false);w.retreat(c);person.soldier=false;c.army=null;c.lastArmy=-C.armyInterval;
 w.cooldowns.rage=0;assert.ok(w.cast('rage',king).ok);assert.ok(c.army);assert.ok(c.army.ids.length<=C.kingWarSize);assert.ok(c.army.ids.every(id=>w.get(id).role==='civilian'));
});
test('an enraged king with too few workers keeps a blocked intention without conjuring soldiers',()=>{
 const w=active(),c=w.islands[0];gather(w,c);for(const e of w.humans(0).slice(2))w.kill(e);const king=w.get(c.kingId),count=w.humans().length;
 assert.ok(w.cast('rage',king).ok);assert.equal(c.army,null);assert.ok(c.warIntent>0);assert.ok(c.lastWarBlocker);assert.equal(w.humans().length,count);
});
test('repeated forced war against exhausted citizens can depose the actual king',()=>{
 const w=active(),c=w.islands[0];gather(w,c);const king=w.get(c.kingId);w.mana=100;c.exhaustion=90;w.truce=100;
 for(let i=0;i<3;i++){w.cooldowns.rage=0;assert.ok(w.cast('rage',king).ok);}
 const before=w.souls;advanceSociety(w,.05);assert.equal(king.dead,true);assert.equal(w.souls,before+1);assert.ok(w.changes.some(e=>e.type==='king-overthrown'));
});
test('raging scholars stop research and hurt nearby academy colleagues',()=>{
 const w=active(),c=w.islands[0],b=c.buildings.find(b=>b.special==='academy');b.state='complete';b.kind='academy';
 const [one,two]=w.humans(0).filter(e=>e.role==='civilian');for(const e of [one,two]){e.role='scholar';e.schoolId=b.id;Object.assign(e,nearestWalkable(b,0));}
 assert.ok(w.cast('rage',one).ok);const hp=two.hp;residentAction(w,one,c,.1);assert.ok(two.hp<hp);assert.ok(two.wounded>0);assert.equal(w.workers(c).includes(one),false);
});
test('beast joy births are bounded, rage changes its attack target behavior',()=>{
 const w=active(),beast=w.animals.find(a=>a.kind==='beast'&&a.country===0);beast.joy=20;
 const before=w.animals.filter(a=>a.kind==='beast'&&a.country===0).length;for(let i=0;i<120;i++)advanceAnimals(w,.1);
 assert.ok(w.animals.filter(a=>a.kind==='beast'&&a.country===0).length>before);
 const target=w.humans(0)[1];Object.assign(target,nearestWalkable({x:beast.x+6,y:beast.y},0));beast.rage=30;const p={x:beast.x,y:beast.y};advanceAnimals(w,.2);assert.ok(Math.hypot(beast.x-p.x,beast.y-p.y)>0);
});
test('completed expansion homes invalidate routes and reserve real collision footprints per world',()=>{
 const w=active(),c=w.islands[0],b=c.buildings.find(b=>b.zone==='house'&&b.source==='extension');b.state='complete';
 const e=w.humans(0)[1];Object.assign(e,{x:b.x,y:b.y}); // worker standing on the footprint as it completes
 w.change('construction-completed',{buildingId:b.id,kind:'house'});assert.equal(walkable(e,w.blockers()),true);assert.equal(walkable(b,w.blockers()),false);
 const other=active();assert.equal(other.blockers().length,0);
 const dest=nearestWalkable({x:b.x+3,y:b.y},0,w.blockers()),nodes=route(e,dest,w.blockers());let prev=e;assert.ok(nodes.length);for(const p of nodes){assert.ok(segmentClear(prev,p,w.blockers()));prev=p;}
});
test('snapshot is detached data, source scene state is never edited',()=>{
 const w=active(),before=JSON.stringify(QINGHE),snapshot=w.gameplaySnapshot();snapshot.islands[0].buildings[0].x=999;snapshot.animals[0].hp=0;assert.notEqual(w.islands[0].buildings[0].x,999);assert.ok(w.animals[0].hp>0);assert.equal(JSON.stringify(QINGHE),before);
});
test('new save restores herds, jobs, buffs, leadership and deterministic continuation',()=>{
 const w=active();w.step(20);gather(w,w.islands[0]);w.cast('joy',w.islands[0]);const saved=w.serialize(),v=World.restore(saved);assert.equal(v.paused,true);assert.deepEqual(v.islands,w.islands);assert.deepEqual(v.animals,w.animals);v.paused=false;
 w.step(12);v.step(12);assert.equal(v.souls,w.souls);assert.deepEqual(v.islands,w.islands);assert.deepEqual(v.animals,w.animals);assert.deepEqual(v.entities,w.entities);
 const broken=JSON.parse(saved);broken.state.animals[0].hp=null;assert.throws(()=>World.restore(JSON.stringify(broken)),/损坏/);
});
test('ordinary growth never starves the whole world into an unattended KPI win',()=>{
 const w=active(11);w.step(C.duration);assert.equal(w.result,'timeout');assert.ok(w.souls<C.goal);assert.ok(w.humans(0).length>=50);assert.ok(w.humans(1).length>=35);assert.equal(w.humans().length+w.souls,C.initialAdults*2+w.births);
});
test('a trickle of food cannot reset hunger for an entire unfed population',()=>{
 const w=active(),c=w.islands[0];for(const b of c.buildings)if(b.kind==='field')b.state='planned';
 for(let i=0;i<200;i++){c.food=.01;w.step(.05);}
 assert.ok(w.humans(0).every(e=>e.starve>C.starveDelay));assert.ok(w.humans(0).every(e=>e.hp<C.humanHP));
});
test('animal meat respects upgraded granary capacity instead of deleting existing stock',()=>{
 const w=active(),c=w.islands[0],granary=c.buildings.find(b=>b.special==='granary');granary.state='complete';granary.kind='granary';c.food=850;
 const beast=w.animals.find(a=>a.kind==='beast'&&a.country===0);w.kill(beast);assert.equal(c.food,850+B.meatFood);
});
test('rage preview and committed payload identify exactly the same real target',()=>{
 const w=active(),c=w.islands[0];gather(w,c);const king=w.get(c.kingId),preview=w.preview('rage',king);assert.deepEqual(preview,[king.id]);assert.ok(w.cast('rage',king).ok);assert.deepEqual(w.visualEvents.find(e=>e.id==='rage').targets.map(e=>e.id),preview);
});
test('new saves reject moved authored buildings and duplicate animal identities',()=>{
 const w=active(),saved=w.serialize(),moved=JSON.parse(saved);moved.state.islands[0].buildings[0].x+=1;assert.throws(()=>World.restore(JSON.stringify(moved)),/损坏/);
 const duplicated=JSON.parse(saved);duplicated.state.animals[1].id=duplicated.state.animals[0].id;assert.throws(()=>World.restore(JSON.stringify(duplicated)),/损坏/);
});
test('pastoral layout stays fixed while only the farming country creates construction lots',()=>{
 const w=active(),c=w.islands[1],pens=structuredClone(c.pens);w.step(100);assert.equal(c.buildings,undefined);assert.deepEqual(c.pens,pens);assert.deepEqual(w.gameplaySnapshot().islands[1].buildings,[]);
});
test('scholars require an actual academy, fifty people and spare productivity',()=>{
 const w=active(),c=w.islands[0];allComplete(c);while(w.humans(0).length<49)w.spawn('human',c,true);c.food=600;
 const academy=c.buildings.find(b=>b.special==='academy');academy.kind='academy';advanceSociety(w,1);assert.equal(w.humans(0).filter(e=>e.role==='scholar').length,0);
 w.spawn('human',c,true);advanceSociety(w,1);assert.equal(w.humans(0).filter(e=>e.role==='scholar').length,1);assert.ok(c.research>0);
 const scholar=w.humans(0).find(e=>e.role==='scholar');scholar.rage=30;const before=c.research;advanceSociety(w,.1);assert.equal(c.research,before);
});
test('raging soldiers keep their existing roster and attack faster',()=>{
 const w=active(),c=w.islands[0];gather(w,c);w.armyStart(c,c);const soldier=w.get(c.army.ids[0]),victim=w.humans(1)[0];Object.assign(victim,{x:soldier.x,y:soldier.y});soldier.rage=20;
 const roster=[...c.army.ids];w.attackTarget(soldier,victim,.01,1);assert.ok(soldier.attack<C.attackInterval);assert.deepEqual(c.army.ids,roster);
});
test('peace cancels a blocked royal order and does not leave a delayed surprise war',()=>{
 const w=active(),c=w.islands[0];for(const e of w.humans(0).slice(3))w.kill(e);gather(w,c);const king=w.get(c.kingId);
 assert.ok(w.cast('rage',king).ok);assert.ok(c.warIntent>0);assert.ok(w.cast('peace',king).ok);assert.equal(c.warIntent,0);assert.equal(king.rage,0);
 w.step(C.truceSeconds+2);assert.equal(c.army,null);assert.equal(c.warIntent,0);
});

test('a blocked royal order recruits the army once rest ends even while the king is angry',()=>{
 const w=active(),c=w.islands[0];gather(w,c);const king=w.get(c.kingId);c.lastArmy=w.time;
 assert.ok(w.cast('rage',king).ok);assert.equal(c.army,null);assert.ok(c.warIntent>0);assert.ok(king.rage>0);
 c.lastArmy=-1000;advanceSociety(w,.1);
 assert.equal(c.army.kingId,king.id);assert.equal(c.army.ids.length,C.kingWarSize);assert.equal(king.commanding,true);assert.ok(king.rage>0);assert.equal(c.warIntent,0);
});
