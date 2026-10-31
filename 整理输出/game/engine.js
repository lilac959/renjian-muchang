import {QINGHE,reachable,islandId,castable,walkable,nearestWalkable,moveAlong} from './island-layout.js';
import {CONFIG as C, SKILLS, CLIMATE,SETTLEMENT as S,HUSBANDRY as H,SOCIETY as R,WILDLIFE as B} from './config.js';
import {initSettlement,advanceSettlement,complete,housing,settlementSnapshot} from './settlement.js';
import {initAnimals,advanceAnimals,advanceHusbandry,pastureForecast} from './husbandry.js';
import {available,initSociety,enrage,advanceSociety,residentAction} from './society.js';
import {validGameplayState} from './gameplay-save.js';
export const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);

export class World {
 constructor(seed=Date.now()) {
  Object.assign(this,{seed:seed>>>0,time:0,mana:C.mana,souls:0,paused:true,result:null,serial:0,
   visualEvents:[],cooldowns:{},entities:[],corpses:[],effects:[],events:[],islands:[],pending:[],fires:[],
   truce:0,births:0,milestones:{},saveRequested:false,animals:[],changes:[],changeSerial:0,navRevision:0});
  for(let id=0;id<2;id++) this.createIsland(id);
  initSociety(this);initAnimals(this);
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 point(c){for(let i=0;i<64;i++){const a=this.random()*Math.PI*2,r=Math.sqrt(this.random()),p={x:c.x+Math.cos(a)*r*11,y:c.y+Math.sin(a)*r*8};if(reachable(p,this.blockers())&&islandId(p)===c.id)return p;}return nearestWalkable(c,c.id,this.blockers());}
 createIsland(id){
  const c={id,name:id?'白鹿岛':'青禾岛',...QINGHE.centers[id],food:C.initialFood,birthProgress:0,
   offering:0,weather:{kind:'normal',left:0},army:null,lastArmy:-C.armyInterval};
  this.islands.push(c);
  for(let i=0;i<C.initialAdults;i++)this.spawn('human',c,true);
  initSettlement(this,c);c.joyBirthProgress=0;
 }
 spawn(kind,c,adult=false,p=this.point(c)){
  p=nearestWalkable(p,c.id,this.blockers());
  const e={id:++this.serial,kind,country:c.id,x:p.x,y:p.y,adult,growth:0,hp:kind==='undead'?C.undeadHP:C.humanHP,
   dead:false,bless:0,joy:0,sick:0,immune:0,spread:0,starve:0,attack:0,soldier:false,returning:false,
   life:C.undeadSeconds,role:'civilian',rage:0,wounded:0,appetite:0,workSite:null,schoolId:null,action:adult?'自动生产':'成长中',destination:this.point(c)};
  this.entities.push(e);return e;
 }
 humans(id){return this.entities.filter(e=>!e.dead&&e.kind==='human'&&(id===undefined||e.country===id));}
 adults(c){return this.humans(c.id).filter(e=>e.adult);}
 available(e){return available(e);}
 workers(c){if(!c)return [];return this.adults(c).filter(e=>available(e)&&e.role==='civilian'&&!e.workSite);}
 get(id){return this.entities.find(e=>e.id===id&&!e.dead)||this.animals.find(e=>e.id===id&&!e.dead);}
 targets(p,r){return [...this.entities,...this.animals].filter(e=>!e.dead&&distance(e,p)<=r);}
 blockers(){if(this._navCacheRevision!==this.navRevision){this._navCache=this.islands.flatMap(c=>(c.buildings||[]).filter(b=>b.source==='extension'&&b.zone==='house'&&b.state==='complete').map(b=>b.footprint));this._navCacheRevision=this.navRevision;}return this._navCache;}
 preview(id,p,weather='rain'){const s=SKILLS.find(s=>s.id===id);if(!s||this.validate(id,p,weather))return [];if(id==='undead')return [];if(id==='weather')return this.humans(this.islandAt(p)?.id).map(e=>e.id);if(id==='peace')return this.humans().filter(e=>e.soldier||e.role==='king'&&(e.rage>0||this.islands[e.country].warIntent>0)).map(e=>e.id);const targets=id==='meteor'?this.targets(p,s.r):this.legalTargets(id,p,s.r);return (id==='rage'||id==='lightning'?targets.slice(0,1):targets).map(e=>e.id);}
 change(type,data={}){if(type==='construction-completed'&&this.islands[0].buildings.some(b=>b.id===data.buildingId&&b.source==='extension'&&b.zone==='house')){this.navRevision++;const extra=this.blockers();for(const e of [...this.entities,...this.animals])if(!e.dead){if(!walkable(e,extra))Object.assign(e,nearestWalkable(e,e.country,extra));if(e.destination&&!walkable(e.destination,extra))e.destination=nearestWalkable(e.destination,e.country,extra);}}this.changes.push({sequence:++this.changeSerial,time:this.time,type,...data});if(this.changes.length>128)this.changes.shift();}
 gameplaySnapshot(){return {version:C.version,time:this.time,islands:this.islands.map(c=>({id:c.id,food:c.food,housing:Number.isFinite(housing(c))?housing(c):null,buildings:settlementSnapshot(c),pens:structuredClone(c.pens||[]),kingId:c.kingId,research:c.research||0,warIntent:c.warIntent,exhaustion:c.exhaustion,unrest:c.unrest,lastWarBlocker:c.lastWarBlocker||"",production:this.production(c),consumption:this.consumption(c)})),animals:structuredClone(this.animals),people:this.humans().map(e=>({id:e.id,country:e.country,x:e.x,y:e.y,hp:e.hp,adult:e.adult,soldier:e.soldier,role:e.role,joy:e.joy,appetite:e.appetite,rage:e.rage,wounded:e.wounded,workSite:e.workSite,schoolId:e.schoolId})),sequence:this.changeSerial};}
 islandAt(p){const id=islandId(p);return id===null?undefined:this.islands[id];}
 inWorld(p){return castable(p);}
 climate(c){return CLIMATE[c.weather.left>0?c.weather.kind:'normal'];}
 consumption(c){return this.humans(c.id).reduce((n,e)=>n+C.foodUse*(e.appetite>0&&e.joy<=0?C.joyFoodFactor:1),0);}
 production(c){if(c.id===1)return pastureForecast(this,c);const workers=this.workers(c).slice(0,complete(c,'field').length*S.workersPerField);return workers.reduce((n,e)=>n+C.foodRate*(e.bless>0?C.blessFactor:1)*(e.starve>0?.5:1),0)*this.climate(c).field*(complete(c,"windmill").length?S.windmillProduction:1);}
 netFood(c){return this.production(c)-this.consumption(c);}
 supply(c){const use=this.consumption(c);return use?c.food/use:Infinity;}
 birthRate(c){const adults=this.adults(c).filter(e=>!e.soldier&&e.sick<=0&&e.joy<=0&&e.rage<=0&&e.wounded<=0);if(adults.length<C.keepAdults||this.production(c)<this.consumption(c)*C.birthProductionMargin||c.food<this.consumption(c)*C.birthFoodSeconds||this.humans(c.id).length>=Math.min(C.populationLimit,housing(c)))return 0;return adults.length/C.keepAdults*this.climate(c).human;}
 joyBirthRate(c){const adults=this.adults(c).filter(e=>e.joy>0&&!e.soldier&&e.sick<=0);return adults.length>=2&&this.humans(c.id).length<C.populationLimit?adults.length/C.keepAdults*C.joyFactor*this.climate(c).human:0;}
 birthReason(c){if(this.joyBirthRate(c)>0)return '欢愉催生：暂时无视住房与粮食';if(this.humans(c.id).length>=C.populationLimit)return '聚落人口已满';if(this.humans(c.id).length>=housing(c))return '繁衍暂停：等待住房建成';if(!this.birthRate(c))return '繁衍暂停：需健康成年人及口粮';return `下次出生 ${Math.ceil((C.birthSeconds-c.birthProgress)/this.birthRate(c))}秒`;}
 message(text){this.events.push({text});if(this.events.length>8)this.events.shift();}
 fx(x,y,text,color='#f4d58a'){this.effects.push({x,y,text,color,life:1.8});}
 kill(e,cause='divine'){
  if(!e||e.dead)return;e.dead=true;
   if(e.kind==='beast'||e.kind==='sheep'){const c=this.islands[e.country],food=e.kind==='beast'?B.meatFood:H.meatFood;c.food=Math.min(C.foodLimit*(complete(c,'granary').length?S.granaryStorage:1),c.food+food);if(e.kind==='sheep'){c.harvested++;c.meatCollected+=food;}this.change('animal-killed',{animalId:e.id,country:e.country,kind:e.kind,cause,food});return;}
  if(e.kind==='human'){
   this.souls++;this.mana+=C.soulMana;
   const nation=this.islands[e.country];if(e.soldier||e.action==='守卫岛屿')nation.exhaustion=Math.min(100,nation.exhaustion+R.casualtyExhaustion);
   this.change('human-died',{personId:e.id,country:e.country,role:e.role,cause});
   this.corpses.push({id:e.id,country:e.country,x:e.x,y:e.y,life:C.corpseSeconds});
   this.effects.push({x:e.x,y:e.y,soul:true,life:1.8});this.fx(e.x,e.y,`＋1魂 · ＋${C.soulMana}灵力`,'#e2b7ff');
   this.milestones.soul??=Number(this.time.toFixed(2));
  }
 }
 damage(e,n,cause='damage'){if(!e||e.dead||!Number.isFinite(n)||n<=0)return;e.hurt=true;e.hp-=n;if(e.hp<=0)this.kill(e,cause);}
 move(e,p,dt,speed=C.walkSpeed){return moveAlong(e,p,dt,speed,this.blockers(),this.navRevision);}
 attackTarget(e,v,dt,damage){this.move(e,v,dt,C.soldierSpeed);if(distance(e,v)<=1.2&&e.attack<=0){const hp=v.hp;this.damage(v,damage);if(v.hp<hp)this.visualEvents.push({id:'actor-hit',attackerId:e.id,targetId:v.id,x:v.x,y:v.y,time:this.time});e.attack=C.attackInterval*(e.soldier&&e.rage>0?.6:1);this.fx(v.x,v.y,'－'+damage,'#ffb39d');}}
 armyCheck(c,p=c){
  if(this.truce>0)return '双方停战保护中';
  if(c.army)return '本岛队伍尚未返乡';
  if(this.time-c.lastArmy<C.armyInterval)return '本岛正在休整';
  const available=this.workers(c);
  if(available.length<C.keepAdults+C.minArmy)return `成年劳动力不足，需留${C.keepAdults}人生产与繁衍`;
  const nearby=available.filter(e=>distance(e,p)<=SKILLS.find(s=>s.id==='rage').r);
  if(nearby.length<C.minArmy)return `范围内至少需要${C.minArmy}名健康成年人`;
  return '';
 }
 armyStart(c,p){
  const error=this.armyCheck(c,p);if(error)return false;
  const workers=this.workers(c),troops=workers.filter(e=>distance(e,p)<=SKILLS.find(s=>s.id==='rage').r).sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,Math.min(C.warSize,workers.length-C.keepAdults));
  for(const e of troops){e.soldier=true;e.returning=false;}
  c.army={ids:troops.map(e=>e.id),left:C.warSeconds,start:troops.length,returning:false};c.lastArmy=this.time;
  this.milestones.army??=Number(this.time.toFixed(2));this.message(`${c.name}${troops.length}人跨桥出征，后方暂时减产`);return true;
 }
 retreat(c){if(!c.army)return;c.army.returning=true;for(const id of c.army.ids){const e=this.get(id);if(e)e.returning=true;}}
 peace(){this.truce=C.truceSeconds;for(const c of this.islands){c.warIntent=0;this.retreat(c);}for(const e of this.humans())if(e.soldier||e.role==='king')e.rage=0;}
 soldier(e,c,dt){
  const enemy=this.islands[1-c.id],a=c.army;
  if(!a||a.returning||this.truce>0)e.returning=true;
  if(e.returning){e.action='停战返乡';this.cross(e,c,dt);if(distance(e,c)<1){e.soldier=false;e.returning=false;e.action='自动生产';}return;}
  const enemyAdults=this.adults(enemy).filter(v=>!v.returning);
  // Defenders intercept at the bridge; invaders do not chase children.
  const victim=enemyAdults.filter(v=>distance(v,e)<8).sort((a,b)=>distance(a,e)-distance(b,e))[0];
  if(victim){e.action='交战中';this.attackTarget(e,victim,dt,C.soldierDamage);}else{e.action='跨桥出征';this.cross(e,enemy,dt);if(!enemyAdults.length)this.retreat(c);}
 }
 cross(e,dest,dt){this.move(e,nearestWalkable(dest,dest.id),dt,C.soldierSpeed);}
 legalTargets(id,p,r){return this.targets(p,r).filter(e=>['rage','lightning','joy'].includes(id)?(e.kind==='human'?(id!=='joy'||e.adult):e.kind==='beast'||e.kind==='sheep'):e.kind==='human'&&(id!=='plague'||e.sick<=0&&e.immune<=0)).sort((a,b)=>distance(a,p)-distance(b,p)||a.id-b.id);}
 validate(id,p,weather='rain'){
  const s=SKILLS.find(s=>s.id===id);if(!s)return '未知技能';if(this.result)return '本局已结束';if(this.paused)return '请先继续游戏';
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!this.inWorld(p))return '请在岛屿或桥上施放';
  if(this.cooldowns[id]>0)return `冷却中：${Math.ceil(this.cooldowns[id])}秒`;if(this.mana<s.cost)return `灵力不足：需要${s.cost}`;
  const c=this.islandAt(p),targets=this.legalTargets(id,p,s.r);
  if(id==='weather'&&(!c||!Object.hasOwn(CLIMATE,weather)))return '请选择天气并点击岛屿';
  if(id==='rage'&&!targets.length)return '范围内没有可暴怒的生物';
  if(id==='peace'&&!this.entities.some(e=>!e.dead&&(e.soldier&&!e.returning||e.role==='king'&&(e.rage>0||this.islands[e.country].warIntent>0||this.islands[e.country].army))&&distance(e,p)<=s.r))return '范围内没有出征居民或正在下令的国王';
  if(id==='undead'&&!this.corpses.some(b=>b.life>0&&distance(b,p)<=s.r))return '范围内没有可用尸体';
  if(['bless','joy','lightning','plague','rage'].includes(id)&&!targets.length)return '范围内没有有效居民';
  if(id==='meteor'&&!this.targets(p,s.r).length&&!this.islands.some(c=>c.buildings?.some(b=>b.state==='clearing'&&distance(b,p)<=s.r)))return '范围内没有生物或正在清理的扩张地块';return '';
 }
 cast(id,p,weather='rain'){
  const error=this.validate(id,p,weather);if(error)return {ok:false,message:error};
  const s=SKILLS.find(s=>s.id===id),c=this.islandAt(p),all=this.legalTargets(id,p,s.r),targets=id==='rage'||id==='lightning'?all.slice(0,1):all;
  this.visualEvents??=[];this.visualEvents.push({id,x:p.x,y:p.y,time:this.time,weather,targets:targets.map(e=>({id:e.id,x:e.x,y:e.y})),corpses:id==='undead'?this.corpses.filter(b=>b.life>0&&distance(b,p)<=s.r).slice(0,C.undeadLimit).map(b=>({x:b.x,y:b.y})):[]});
  this.mana-=s.cost;this.cooldowns[id]=s.cd;
  if(id==='peace')this.peace();
  if(id==='bless')for(const e of targets)e.bless=C.blessSeconds;
  if(id==='joy'){for(const e of targets)e.joy=C.joySeconds;this.change('joy-applied',{ids:targets.map(e=>e.id)});}
  if(id==='weather'){c.weather={kind:weather,left:C.weatherSeconds};if(weather==='rain')this.fires=this.fires.filter(f=>this.islandAt(f)?.id!==c.id);}
  if(id==='lightning')this.kill(targets.sort((a,b)=>distance(a,p)-distance(b,p))[0]);
  if(id==='rage')enrage(this,targets[0]);
  if(id==='plague')for(const e of targets){e.sick=C.plagueSeconds;e.spread=C.plagueSpreadSeconds;}
  if(id==='undead')for(const b of this.corpses.filter(b=>b.life>0&&distance(b,p)<=s.r).slice(0,C.undeadLimit)){this.spawn('undead',this.islands[b.country],true,b);b.life=0;}
  if(id==='meteor')this.pending.push({x:p.x,y:p.y,left:.7});
  this.fx(p.x,p.y,`－${s.cost}灵力`);this.judge();return {ok:true,message:id==='peace'?'双方停止交战，正在返乡':`${s.name}已施放`};
 }
 impact(p){this.visualEvents??=[];this.visualEvents.push({id:'impact',x:p.x,y:p.y,time:this.time});const before=this.souls;for(const b of this.islands[0].buildings)if(b.state==='clearing'&&distance(b,p)<=SKILLS.find(s=>s.id==='meteor').r){b.clearProgress=S.clearSeconds;b.state='building';this.change('land-cleared',{buildingId:b.id,source:'meteor'});}for(const e of this.targets(p,SKILLS.find(s=>s.id==='meteor').r))this.damage(e,C.meteorDamage);const c=this.islandAt(p);if(!c||c.weather.kind!=='rain'||c.weather.left<=0)this.fires.push({...p,left:C.fireSeconds});this.message(`陨石：实际死亡${this.souls-before}人，＋${this.souls-before}魂，＋${(this.souls-before)*C.soulMana}灵力`);}
 economy(c,dt){
  advanceHusbandry(this,c,dt);const harvest=c.id===0?this.production(c)*dt:0;
  const needed=this.consumption(c)*dt,availableFood=c.food+harvest;c.foodCoverage=needed>0?Math.min(1,availableFood/needed):1;
  c.food=Math.max(0,Math.min(C.foodLimit*(complete(c,"granary").length?S.granaryStorage:1),availableFood-needed));
  c.birthProgress+=dt*this.birthRate(c);
  while(c.birthProgress>=C.birthSeconds&&this.birthRate(c)>0){c.birthProgress-=C.birthSeconds;const e=this.spawn('human',c);this.births++;this.fx(e.x,e.y,'新生儿','#bde9a5');this.milestones.birth??=Number(this.time.toFixed(2));}
  c.joyBirthProgress+=dt*this.joyBirthRate(c);
  while(c.joyBirthProgress>=C.birthSeconds&&this.joyBirthRate(c)>0){c.joyBirthProgress-=C.birthSeconds;const e=this.spawn('human',c);this.births++;this.change('joy-birth',{country:c.id,personId:e.id});}
  if(this.humans(c.id).length>=C.populationLimit)c.joyBirthProgress=Math.min(c.joyBirthProgress,C.birthSeconds-.001);
  c.offering+=dt;if(c.offering>=C.offerInterval){c.offering-=C.offerInterval;if(this.humans(c.id).length&&c.food>=this.consumption(c)*C.offerReserveSeconds+C.offerFood){c.food-=C.offerFood;this.mana+=C.offerMana;this.fx(c.x,c.y,`供奉 ＋${C.offerMana}灵力`);}}
 }
 step(dt){if(this.paused||this.result||!Number.isFinite(dt)||dt<=0)return;let left=Math.min(dt,C.duration-this.time);while(left>1e-8&&!this.result){const d=Math.min(.05,left);this.tick(d);left-=d;}}
 tick(dt){
  for(const e of this.entities){e.hurt=false;const joyBefore=e.joy;for(const key of ['bless','joy','immune','rage','wounded'])e[key]=Math.max(0,(e[key]||0)-dt);if(joyBefore>0&&e.joy<=0&&e.kind==='human'){e.appetite=C.appetiteSeconds;this.change('joy-afterglow',{personId:e.id});}else if(e.joy<=0)e.appetite=Math.max(0,e.appetite-dt);}
  this.time=Math.min(C.duration,this.time+dt);this.truce=Math.max(0,this.truce-dt);
  for(const id in this.cooldowns)this.cooldowns[id]=Math.max(0,this.cooldowns[id]-dt);
  for(const list of [this.effects,this.corpses])for(const e of list)e.life-=dt;
  this.effects=this.effects.filter(e=>e.life>0);this.corpses=this.corpses.filter(e=>e.life>0);
  for(const p of this.pending){p.left-=dt;if(p.left<=0)this.impact(p);}this.pending=this.pending.filter(p=>p.left>0);
  if(this.souls>=C.goal||!this.humans().length){this.judge();if(this.result)return;}
  advanceSociety(this,dt);
  for(const c of this.islands){advanceSettlement(this,c,dt);this.economy(c,dt);c.weather.left=Math.max(0,c.weather.left-dt);if(c.army){c.army.left-=dt;const troops=c.army.ids.map(id=>this.get(id)).filter(e=>e?.soldier);if(c.army.left<=0||troops.length<=c.army.start/2)this.retreat(c);if(!troops.length)c.army=null;}}
  for(const e of [...this.entities]){
   if(e.dead)continue;e.attack=Math.max(0,e.attack-dt);
   const c=this.islands[e.country];
   if(e.kind==='undead'){e.life-=dt;if(e.life<=0){this.kill(e);continue;}const v=this.humans().filter(v=>distance(v,e)<=10).sort((a,b)=>distance(a,e)-distance(b,e))[0];e.action='亡灵追击';if(v)this.attackTarget(e,v,dt,C.undeadDamage);continue;}
   if(!e.adult){e.growth+=dt;if(e.growth>=C.growthSeconds){e.adult=true;this.fx(e.x,e.y,'成年 · 开始生产');}}
   if(e.sick>0){e.sick-=dt;e.spread-=dt;if(e.spread<=0){e.spread=C.plagueSpreadSeconds;for(const v of this.legalTargets('plague',e,C.plagueRadius))if(v.id!==e.id&&this.random()<C.plagueSpreadChance){v.sick=C.plagueSeconds;v.spread=C.plagueSpreadSeconds;}}
    if(e.sick<=0){if(this.random()<C.plagueDeathChance)this.kill(e);else{e.immune=C.immunitySeconds;this.fx(e.x,e.y,'康复');}}}
   if(e.dead)continue;
   if(c.foodCoverage<1){e.starve+=dt*(1-c.foodCoverage);if(e.starve>C.starveDelay)this.damage(e,C.starveDamage*(1-c.foodCoverage)*dt,"starvation");}else e.starve=Math.max(0,e.starve-dt);
   if(e.dead)continue;
   if(e.soldier)this.soldier(e,c,dt);
   else if(residentAction(this,e,c,dt)){}
   else if(e.adult){const invader=this.entities.find(v=>!v.dead&&v.soldier&&!v.returning&&v.country!==c.id&&distance(v,c)<24&&distance(v,e)<10);if(invader&&this.truce<=0){e.action='守卫岛屿';this.attackTarget(e,invader,dt,C.defenderDamage);}else{e.action=e.bless>0?'祝福增产':e.joy>0?'繁衍加速':'自动生产';if(distance(e,e.destination)<.3)e.destination=this.point(c);this.move(e,e.destination,dt,.6);}}
   else e.action='成长中';
  }
  advanceAnimals(this,dt);
  const burning=new Set();for(const f of this.fires){f.left-=dt;for(const e of this.targets(f,C.fireRadius))burning.add(e);}for(const e of burning)this.damage(e,C.fireDamage*dt);this.fires=this.fires.filter(f=>f.left>0);
  for(const e of this.entities)if(!e.dead&&e.kind==='human'&&!e.hurt&&e.starve<=0&&e.sick<=0&&e.rage<=0&&e.wounded<=0&&e.action!=='交战中'&&e.action!=='守卫岛屿')e.hp=Math.min(C.humanHP,e.hp+C.healRate*dt);
  this.entities=this.entities.filter(e=>!e.dead);this.judge();
 }
 judge(){if(this.result)return;if(this.souls>=C.goal)this.result='success';else if(!this.humans().length)this.result='extinct';else if(this.time+1e-8>=C.duration)this.result='timeout';if(this.result)this.paused=true;}
 serialize(){if(this.result)throw Error('本局已结束');if(this.pending.length){this.saveRequested=true;throw Error('陨石落地后补存');}return JSON.stringify({version:C.version,state:{...this,_navCache:undefined,_navCacheRevision:undefined,effects:[],events:[],visualEvents:[],changes:[],saveRequested:false}});}
 static restore(json){const d=JSON.parse(json);if(d.version!==C.version)throw Error('旧版存档不兼容，请开始新局');const s=d.state;
  if(!s||s.result||!Number.isFinite(s.time)||s.time<0||s.time>=C.duration||!Number.isFinite(s.mana)||s.mana<0||!Number.isInteger(s.souls)||s.souls<0||!Array.isArray(s.islands)||s.islands.length!==2||!Array.isArray(s.entities)||!Array.isArray(s.corpses)||!Array.isArray(s.fires)||!Array.isArray(s.pending)||s.pending.length||new Set(s.entities.map(e=>e.id)).size!==s.entities.length||s.entities.some(e=>!s.islands[e.country]||!Number.isFinite(e.hp)||!Number.isFinite(e.x)||!Number.isFinite(e.y)||!walkable(e)||!e.destination||!walkable(e.destination))||s.islands.some(c=>!Number.isFinite(c.food)||c.food<0))throw Error('存档损坏，无法恢复');
  if(!Array.isArray(s.animals)||!Array.isArray(s.islands[0].buildings)||!Array.isArray(s.islands[1].pens)||!Number.isInteger(s.changeSerial)||s.animals.some(a=>!s.islands[a.country]||!['sheep','beast'].includes(a.kind)||!Number.isFinite(a.hp)||!walkable(a)||!a.home||!walkable(a.home))||new Set([...s.entities,...s.animals].map(e=>e.id)).size!==s.entities.length+s.animals.length)throw Error('存档损坏，无法恢复');
  if(!validGameplayState(s))throw Error('存档损坏，无法恢复');
  return Object.assign(Object.create(World.prototype),s,{paused:true,visualEvents:[],changes:[]});
 }
}
