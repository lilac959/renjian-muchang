import {CONFIG as C, SKILLS, CLIMATE, TEXT} from './config.js';
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class World {
 constructor(seed=Date.now()) {
  Object.assign(this,{seed:seed>>>0,time:0,mana:C.mana,souls:0,paused:true,result:null,serial:0,cooldowns:{},unlocked:SKILLS.filter(s=>!s.unlock).map(s=>s.id),entities:[],corpses:[],effects:[],events:[],islands:[],pairs:[],drops:[],pending:[],relation:0,truce:0,relationClock:0,births:0,secondIsland:false,conflict:false,guides:{},milestones:{},saveRequested:false});
  this.createIsland(0);this.createIsland(1);this.secondIsland=true;
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 point(c){const a=this.random()*Math.PI*2,r=Math.sqrt(this.random());return {x:c.x+Math.cos(a)*r*14,y:c.y+Math.sin(a)*r*10};}
 building(kind,p){return {id:++this.serial,kind,x:p.x,y:p.y,hp:C.buildingHP,fire:0,spread:0};}
 createIsland(id){
  if(this.islands[id]||this.result)return;
  const c={id,name:id?'白鹿国':'青禾国',x:id?76:27,y:28,color:id?'#86c6cc':'#d1b45e',food:C.initialFood,fields:id?0:1,farms:[],houses:[],palace:null,pen:null,penSlots:id?C.penInitial:0,construction:null,backlog:[],buildReason:'',offering:0,weather:{temp:'normal',cloud:false,left:0},army:null,lastArmy:-C.armyInterval,kingId:null,sexTurn:{human:0,sheep:0},trees:[]};
  c.store={x:c.x,y:c.y+1};c.altar={x:c.x+4,y:c.y+1};
  c.houses.push(this.building('house',{x:c.x+3,y:c.y+4}));
  if(id)c.pen=this.building('pen',{x:c.x-8,y:c.y-2});else c.farms.push({id:++this.serial,x:c.x-8,y:c.y-2,progress:0});
  for(let i=0;i<14;i++){const a=i*2.399;c.trees.push(this.building('tree',{x:c.x+Math.cos(a)*19,y:c.y+Math.sin(a)*13}));}
  this.islands.push(c);
  for(const sex of ['male','female'])this.spawn('human',c,true,{x:c.x+(sex==='male'?-1:1),y:c.y},sex);
  if(id)for(const sex of ['male','female'])this.spawn('sheep',c,true,{x:c.x-8+(sex==='male'?-1:1),y:c.y-2},sex);
  this.pairUp(c);
 }
 spawn(kind,c,adult=false,point=null,sex=null){
  if(this.result)return null;
  const members=this.animals(c.id,kind),male=members.filter(e=>e.sex==='male').length,female=members.length-male;
  sex ||= male===female?((c.sexTurn[kind]=(c.sexTurn[kind]||0)+1)%2?'male':'female'):male<female?'male':'female';
  const position=point||this.point(c);
  const e={id:++this.serial,kind,country:c.id,x:position.x,y:position.y,sex,adult,bornAt:this.time,growth:0,hp:kind==='human'?C.humanHP:kind==='undead'?80:C.sheepHP,sick:0,immune:0,spread:0,life:20,dead:false,settled:false,partnerId:null,bless:0,joy:0,rage:0,starve:0,hungerTick:0,attack:0,soldier:false,returning:false,king:false,kingTry:0,rageWar:false,task:null,cargo:0,rations:0,loot:0,inside:null,action:adult?'寻找工作':'成长中',destination:this.point(c)};
  this.entities.push(e);return e;
 }
 humans(id){return this.entities.filter(e=>!e.dead&&e.kind==='human'&&(id===undefined||e.country===id));}
 animals(id,kind){return this.entities.filter(e=>!e.dead&&e.kind===kind&&e.country===id);}
 adults(c){return this.humans(c.id).filter(e=>e.adult);}
 workers(c){return this.adults(c).filter(e=>!e.soldier&&e.rage<=0&&!(e.sick>0)&&e.joy<=C.joySeconds);}
 capacity(c){return c.houses.reduce((n,h)=>n+(h.hp>50?C.beds:h.hp>0?Math.floor(C.beds/2):0),0);}
 penCapacity(c){return !c.pen?0:c.pen.hp>50?c.penSlots:c.pen.hp>0?Math.floor(c.penSlots/2):0;}
 consumption(c){return this.humans(c.id).filter(e=>!e.soldier).reduce((n,e)=>n+C.foodPerYear*(e.joy>0&&e.joy<=C.joySeconds?C.joyFactor:1),0);}
 supply(c){const rate=this.consumption(c)/C.year;return rate?c.food/rate:Infinity;}
 islandAt(p){return this.islands.find(c=>((p.x-c.x)/22)**2+((p.y-c.y)/17)**2<=1);}
 get(id){return this.entities.find(e=>e.id===id&&!e.dead);}
 buildings(c){return [...c.houses,c.pen,c.palace,...c.trees].filter(Boolean);}
 targets(p,r){return this.entities.filter(e=>!e.dead&&distance(e,p)<=r);}
 message(text,p=null){this.events.push({text,p});if(this.events.length>20)this.events.shift();}
 first(key,text,p=null){if(this.guides[key])return;this.guides[key]=true;this.milestones[key]=Number(this.time.toFixed(2));this.message(text,p);}
 fx(x,y,text,color='#f4d58a'){this.effects.push({x,y,text,color,life:1.8});}
 kill(e){
  if(!e||e.dead)return;e.dead=true;
  const partner=this.get(e.partnerId);if(partner)partner.partnerId=null;
  this.pairs=this.pairs.filter(p=>p.a!==e.id&&p.b!==e.id);e.partnerId=null;
  if(e.cargo+e.rations+e.loot>0)this.drops.push({id:++this.serial,x:e.x,y:e.y,food:e.cargo+e.rations+e.loot});e.cargo=e.rations=e.loot=0;
  if(e.kind==='human'&&!e.settled){e.settled=true;this.souls++;this.mana++;this.corpses.push({id:e.id,x:e.x,y:e.y,country:e.country,life:30});this.effects.push({x:e.x,y:e.y,soul:true,life:1.8});this.fx(e.x,e.y,'＋1魂 · ＋1灵力','#e2b7ff');this.first('soul','人死后留下灵魂，自动收取；每人同时恢复1灵力。',e);}
 }
 damage(e,n){if(!e||e.dead)return;e.hurt=true;e.hp-=n;if(e.hp<=0)this.kill(e);}
 pairUp(c){for(const kind of ['human','sheep']){const singles=this.animals(c.id,kind).filter(e=>e.adult&&!e.partnerId),m=singles.filter(e=>e.sex==='male'),f=singles.filter(e=>e.sex==='female');for(let i=0;i<Math.min(m.length,f.length);i++){m[i].partnerId=f[i].id;f[i].partnerId=m[i].id;this.pairs.push({a:m[i].id,b:f[i].id,country:c.id,kind,progress:0});this.fx(m[i].x,m[i].y,'♡ 配对','#f4b7ac');}}}
 climate(c){return CLIMATE[c.weather.left<=0?'normal':c.weather.temp==='normal'&&c.weather.cloud?'rain':c.weather.temp];}
 wet(c){return c.weather.left>0&&c.weather.temp!=='hot'&&c.weather.cloud;}
 birthBlock(p){const c=this.islands[p.country],a=this.get(p.a),b=this.get(p.b);if(!a||!b)return (TEXT.noPartner||'没有成年伴侣');if(p.kind==='human'){if(a.soldier||b.soldier)return '伴侣正在出征';if(c.food<this.humans(c.id).length*C.foodPerYear)return (TEXT.noFood||'粮食不足');if(this.capacity(c)<=this.humans(c.id).length)return (TEXT.noBeds||'住房已满');}else if(this.animals(c.id,'sheep').length>=Math.min(C.sheepLimit,this.penCapacity(c)))return (TEXT.noPen||'羊圈已满');return '';}
 birthRate(p){const c=this.islands[p.country],a=this.get(p.a),b=this.get(p.b);if(!a||!b)return 0;const joy=[a,b].some(e=>e.joy>0&&e.joy<=C.joySeconds)?C.joyFactor:1;let care=1;if(p.kind==='sheep')care=Math.min(1,this.workers(c).filter(e=>e.task?.kind==='herd'&&distance(e,c.pen)<.2).length/Math.ceil(this.animals(c.id,'sheep').length/C.sheepPerHerder));return this.climate(c)[p.kind]*joy*care;}
 breed(c,dt){this.pairUp(c);for(const p of [...this.pairs].filter(p=>p.country===c.id)){if(this.birthBlock(p))continue;p.progress+=dt*this.birthRate(p);if(p.progress+1e-8>=C.birthSeconds&&!this.birthBlock(p)){const a=this.get(p.a);const baby=this.spawn(p.kind,c,false,{x:a.x+.4,y:a.y+.4});p.progress=0;if(p.kind==='human'){this.births++;this.first('birth','孩子出生了：20秒后成年，才能劳动与配对。',baby);}this.fx(baby.x,baby.y,p.kind==='human'?'孩子出生了':'小羊出生了','#bde9a5');}}}
 efficiency(e){return (e.bless>0?C.blessFactor:1)*(e.starve>0?.5:1);}
 move(e,p,dt,speed=C.walkSpeed){const d=distance(e,p);if(d>.05){const f=Math.min(1,speed*dt/d);e.x+=(p.x-e.x)*f;e.y+=(p.y-e.y)*f;}return distance(e,p)<.15;}
 plot(c,index,kind){return kind==='field'?{x:c.x-9+(index%5)*2,y:c.y-2-Math.floor(index/5)*2}:{x:c.x+3+(index%5)*2.5,y:c.y+4+Math.floor(index/5)*1.5};}
 productionRate(c){return c.farms.reduce((n,f)=>{const e=this.workers(c).find(e=>e.task?.farmId===f.id);return n+(e?C.fieldYield/(C.year/(this.efficiency(e)*this.climate(c).field)+2*distance(f,c.store)/C.walkSpeed):0);},0);}
 plan(c){
  const urgency=[...c.houses,c.pen].some(h=>h&&h.hp<C.buildingHP&&h.fire<=0);const housing=this.capacity(c)-this.humans(c.id).length<=1&&c.houses.length<C.houseLimit;
  if(c.construction){if((urgency&&c.construction.kind!=='repair')||(housing&&['field','pen','palace'].includes(c.construction.kind))){c.backlog.push(c.construction);c.construction=null;for(const e of this.humans(c.id))if(e.task?.kind==='build')e.task=null;}else return;}
  let job=null;const damaged=[...c.houses,c.pen].find(h=>h&&h.hp<C.buildingHP&&h.fire<=0);
  if(damaged)job={kind:'repair',targetId:damaged.id,...damaged,reason:'修复／原址重建'+(damaged.kind==='house'?'住房':'羊圈')};
  else if(this.capacity(c)-this.humans(c.id).length<=1){if(c.houses.length<C.houseLimit)job={kind:'house',...this.plot(c,c.houses.length,'house'),reason:'住房不足，准备建房'};else c.buildReason='建设用地已满';}
  if(!job&&c.id===0&&c.fields<C.fieldLimit&&c.food<this.humans(c.id).length*C.foodPerYear*2&&this.workers(c).length>c.fields&&c.farms.every(f=>this.workers(c).some(e=>e.task?.farmId===f.id))&&this.productionRate(c)<this.consumption(c)/C.year)job={kind:'field',...this.plot(c,c.fields,'field'),reason:'食物产量不足，准备开田'};
  if(!job&&c.pen&&this.penCapacity(c)-this.animals(c.id,'sheep').length<=1&&c.penSlots<C.penLimit&&c.pen.hp===C.buildingHP)job={kind:'pen',x:c.pen.x,y:c.pen.y,reason:'羊圈快满了，正在扩建'};
  if(!job&&this.adults(c).length>=C.palaceAdults&&this.supply(c)>=C.palaceSupply&&!c.palace)job={kind:'palace',x:c.x,y:c.y-4,reason:'人口与口粮充足，准备建设王宫'};
  if(!job&&c.palace&&c.palace.hp<C.buildingHP&&c.palace.fire<=0)job={kind:'repair',targetId:c.palace.id,x:c.palace.x,y:c.palace.y,reason:'修复王宫'};
  if(job){job.kind=job.targetId?'repair':job.kind;const saved=c.backlog.findIndex(j=>j.kind===job.kind&&j.targetId===job.targetId);c.construction=saved>=0?c.backlog.splice(saved,1)[0]:{...job,progress:0};c.buildReason=job.reason;}else if(c.backlog.length){c.construction=c.backlog.shift();c.buildReason=c.construction.reason;}
 }
 assign(c){
  const available=this.workers(c),free=()=>available.filter(e=>!e.task&&!e.cargo);
  for(const e of this.humans(c.id)){if(e.task?.kind==='build'&&!c.construction)e.task=null;if(e.task&&!available.includes(e))e.task=null;}
  // Keep existing food workers; release idle jobs only when their source disappeared.
  for(const e of available)if(e.task?.kind==='herd'&&!this.animals(c.id,'sheep').length)e.task=null;
  for(const f of c.farms)if(!available.some(e=>e.task?.farmId===f.id)&&free().length)free()[0].task={kind:'farm',farmId:f.id};
  if(c.pen){const needed=Math.ceil(this.animals(c.id,'sheep').length/C.sheepPerHerder);let n=available.filter(e=>e.task?.kind==='herd').length;while(n<needed&&free().length){free()[0].task={kind:'herd'};n++;}}
  this.plan(c);
  if(c.construction&&!available.some(e=>e.task?.kind==='build')&&free().length){free()[0].task={kind:'build'};this.first('build','住房与生产不足时，居民会自动施工；食物岗位优先保留。',c.construction);}
  if(c.construction)c.buildReason=c.construction.reason+(available.some(e=>e.task?.kind==='build')?'':' · 等待工人：需保留食物岗位或居民停工');
  for(const e of free()){const drop=this.drops.find(d=>d.food>0&&this.islandAt(d)?.id===c.id);if(drop)e.task={kind:'pickup',dropId:drop.id};else if(c.id===1&&c.food<this.humans(c.id).length*C.foodPerYear*2&&this.slaughterable(c))e.task={kind:'slaughter',progress:0};}
 }
 slaughterable(c){const adults=this.animals(c.id,'sheep').filter(e=>e.adult),m=adults.filter(e=>e.sex==='male'),f=adults.filter(e=>e.sex==='female');if(!m.length||!f.length)return null;return m.length>1?m[m.length-1]:f.length>1?f[f.length-1]:null;}
 work(e,c,dt){
  if(e.cargo>0){e.inside=null;e.action='搬粮入库';if(this.move(e,c.store,dt)){c.food+=e.cargo;this.fx(c.store.x,c.store.y,'粮食＋'+Math.round(e.cargo));e.cargo=0;if(['slaughter','pickup'].includes(e.task?.kind))e.task=null;}return;}
  const t=e.task;if(t||e.cargo||e.soldier||e.rage>0)e.inside=null;if(!t){const home=c.houses.find(h=>h.hp>0&&h.fire<=0);if(home&&Math.floor(this.time/8+e.id)%3===0){e.action='回屋休息';if(this.move(e,home,dt)){e.inside=home.id;e.action='屋内休息';}return;}e.inside=null;e.action='等待工作';if(distance(e,e.destination)<.3)e.destination=this.point(c);this.move(e,e.destination,dt);return;}
  if(t.kind==='farm'){const f=c.farms.find(f=>f.id===t.farmId);e.action='前往农田';if(this.move(e,f,dt)){e.action='正在耕作';f.progress+=dt*this.efficiency(e)*this.climate(c).field;if(f.progress>=C.year){f.progress-=C.year;e.cargo=C.fieldYield;e.action='作物成熟，收获搬粮';}}}
  if(t.kind==='herd'){e.action='正在牧养';this.move(e,c.pen,dt);}
  if(t.kind==='build'){const j=c.construction;if(!j){e.task=null;return;}const h=j.targetId&&this.buildings(c).find(h=>h.id===j.targetId);if(h?.fire>0){e.action='暂不能修复：仍在燃烧';c.buildReason=e.action;return;}e.action='前往施工';if(!this.move(e,j,dt))return;e.action=j.reason;j.progress+=dt*this.efficiency(e);if(j.progress+1e-8>=C.buildSeconds){if(j.kind==='house')c.houses.push(this.building('house',j));if(j.kind==='field'){c.farms.push({id:++this.serial,x:j.x,y:j.y,progress:0});c.fields=c.farms.length;}if(j.kind==='pen')c.penSlots=Math.min(C.penLimit,c.penSlots+C.penExpansion);if(j.kind==='palace'){c.palace=this.building('palace',j);this.first('palace'+c.id,c.name+'王宫落成，从现有成年人选举国王。',j);}if(j.kind==='repair'&&h)h.hp=C.buildingHP;this.fx(j.x,j.y,'完工');if(j.kind==='house')this.first('houseComplete','新住房完工，增加4个床位。',j);c.construction=null;c.buildReason='';e.task=null;}}
  if(t.kind==='slaughter'){const sheep=this.slaughterable(c);if(!sheep||c.food>=this.humans(c.id).length*C.foodPerYear*2){e.task=null;return;}e.action='宰杀多余成年羊';if(this.move(e,sheep,dt)){t.progress+=dt*this.efficiency(e);if(t.progress>=C.slaughterSeconds){this.kill(sheep);e.cargo=C.meat;}}}
  if(t.kind==='pickup'){const d=this.drops.find(d=>d.id===t.dropId&&d.food>0);if(!d){e.task=null;return;}e.action='拾取掉落粮食';if(this.move(e,d,dt)){e.cargo=d.food;d.food=0;}}
 }
 economy(c,dt){
  c.food=Math.max(0,c.food-this.consumption(c)/C.year*dt);this.assign(c);this.breed(c,dt);
  c.offering+=dt;if(c.offering+1e-8>=C.offerInterval){c.offering-=C.offerInterval;if(this.humans(c.id).length&&c.food-C.offerFood>=this.humans(c.id).length*C.foodPerYear*2){c.food-=C.offerFood;this.mana+=C.offerMana;this.fx(c.store.x,c.store.y,'粮食－'+C.offerFood);this.fx(c.altar.x,c.altar.y,'供奉 灵力＋'+C.offerMana);this.first('offering','富余粮食供奉：20粮换5灵力，仍保留两年基础口粮。',c.altar);}}
 }
 ignite(h,c){if(h.hp>0&&!this.wet(c)){h.fire=C.fireSeconds;h.spread=0;}}
 fire(c,dt){
  const burning=this.buildings(c).filter(h=>h.fire>0),hit=new Set();
  for(const h of burning){h.fire=Math.max(0,h.fire-dt*(this.wet(c)?C.fireSeconds/C.extinguishSeconds:1));h.hp=Math.max(0,h.hp-C.fireBuildingDamage*dt);h.spread+=dt;for(const e of this.targets(h,C.fireRadius))hit.add(e);if(h.spread>=C.fireInterval){h.spread-=C.fireInterval;for(const other of this.buildings(c))if(other!==h&&other.fire<=0&&distance(h,other)<=C.fireRadius&&this.random()<C.fireSpread)this.ignite(other,c);}}
  for(const e of hit)this.damage(e,C.fireDamage*dt);
 }
 elect(c){for(const e of this.humans(c.id))e.king=false;if(!c.palace){c.kingId=null;return;}let king=this.get(c.kingId);if(!king?.adult)king=this.adults(c)[0];c.kingId=king?.id??null;if(king)king.king=true;}
 stages(){
  if(this.result)return;

  for(const c of this.islands)this.elect(c);
  if(!this.conflict&&this.secondIsland&&this.islands.every(c=>c.palace?.hp>0&&this.adults(c).length>=C.conflictAdults)){this.conflict=true;this.relationClock=0;this.first('conflict','两个国家已具备组织军队的能力；出兵仍需兵员、军粮和关系条件。');}
 }
 armyCheck(c,raid=false,forced=false){
  const errors=[],people=this.workers(c),n=raid?C.raidSize:C.warSize,base=this.humans(c.id).length*C.foodPerYear;
  if(!this.conflict)errors.push((TEXT.noConflict||'国家冲突尚未开放'));if(this.truce>0)errors.push('双方停火中');if(c.army)errors.push('已有队伍在外');if(this.time-c.lastArmy<C.armyInterval)errors.push('出兵间隔未到');if(people.length<(raid?C.raidAdults:C.warAdults))errors.push('兵员不足');if(c.food<n*C.ration||(!raid&&c.food<base*.5))errors.push('军粮不足');if(raid&&c.food>=base*.5)errors.push('不满足缺粮劫掠条件');if(!forced&&this.relation>(raid?C.raidRelation:C.warRelation))errors.push('关系未达出兵门槛');
  const reserved=new Set(people.filter(e=>['farm','herd'].includes(e.task?.kind)).map(e=>e.id));const foodSlots=c.id===0?c.fields:Math.ceil(this.animals(c.id,'sheep').length/C.sheepPerHerder);for(const e of people){if(reserved.size>=foodSlots)break;reserved.add(e.id);}const pair=this.pairs.find(p=>p.country===c.id&&p.kind==='human'&&this.get(p.a)&&this.get(p.b));if(pair){reserved.add(pair.a);reserved.add(pair.b);}const candidates=people.filter(e=>!reserved.has(e.id)&&!e.cargo);if(candidates.length<n)errors.push('需保留生产与繁衍人口');return {errors,soldiers:candidates.slice(-n)};
 }
 armyStart(c,raid=false,forced=false){const check=this.armyCheck(c,raid,forced);c.warReason=check.errors.join('／');if(check.errors.length)return false;const soldiers=check.soldiers;for(const e of soldiers){e.soldier=true;e.returning=false;e.task=null;e.rations=C.ration;e.loot=0;e.raided=false;}c.food-=soldiers.length*C.ration;c.army={ids:soldiers.map(e=>e.id),food:soldiers.length*C.ration,loot:0,returning:false,fight:0,start:soldiers.length,raid,raided:false};c.lastArmy=this.time;this.relation=Math.max(-100,this.relation-C.warRelationCost);this.message(c.name+(raid?'小队正在劫掠邻国':'向邻国宣战'),soldiers[0]);this.first('army','现有成年人动员出兵，携带军粮沿浅滩行军。',soldiers[0]);return true;}
 soldier(e,c,dt){const a=c.army,enemy=this.islands[1-c.id];e.rations=Math.max(0,e.rations-C.foodPerYear/C.year*dt);if(!a||a.returning||this.truce>0||e.rations<=0)e.returning=true;const returning=e.returning;e.action=returning?'脱战返乡':'沿浅滩行军';if(!returning&&!a.raid){const victim=this.humans(enemy.id).filter(v=>distance(v,e)<=6).sort((v,b)=>distance(v,e)-distance(b,e))[0];if(victim){if(distance(e,victim)<=1)a.engaged=true;e.action='正在交战';this.attackTarget(e,victim,dt,C.soldierDamage,C.soldierSpeed);return;}}
  const end=returning?c.store:enemy.store;
  // Approach the shore before crossing; never cut diagonally over open sea.
  const shore=c.id?60:43,far=c.id?43:60;let goal=end;
  if(returning){if((c.id===0&&e.x>60)||(c.id===1&&e.x<43))goal={x:far,y:28};else if((c.id===0&&e.x>43)||(c.id===1&&e.x<60))goal={x:shore,y:28};}
  else{if((c.id===0&&e.x<43)||(c.id===1&&e.x>60))goal={x:shore,y:28};else if((c.id===0&&e.x<60)||(c.id===1&&e.x>43))goal={x:far,y:28};}
  this.move(e,goal,dt,C.soldierSpeed);
  if(returning&&distance(e,c.store)<.3){c.food+=e.rations+e.loot;e.rations=e.loot=0;e.soldier=false;e.returning=false;}
  else if(!returning&&a.raid&&distance(e,enemy.store)<2&&!e.raided){e.raided=true;const loot=Math.min(C.loot,enemy.food);enemy.food-=loot;e.loot+=loot;if(!a.raided){a.raided=true;const house=enemy.houses.find(h=>h.hp>0);if(house)this.ignite(house,enemy);}const troops=a.ids.map(id=>this.get(id)).filter(e=>e?.soldier);if(enemy.food<=0||troops.every(e=>e.raided))a.returning=true;}
 }
 attackTarget(e,v,dt,damage,speed=C.walkSpeed){this.move(e,v,dt,speed);if(distance(e,v)<=1&&e.attack<=0){this.damage(v,damage);e.attack=C.attackInterval;}}
 war(c,dt){const king=this.get(c.kingId);if(king?.rage>0&&!king.rageWar){king.kingTry-=dt;if(king.kingTry<=0){king.kingTry=C.rageTrySeconds;c.warReason=this.armyCheck(c,false,true).errors.join('／');if(this.random()<C.rageChance&&this.armyStart(c,false,true))king.rageWar=true;}}
  if(this.conflict&&!c.army&&this.truce<=0){if(this.relation<=C.raidRelation&&c.food<this.humans(c.id).length*C.foodPerYear*.5)this.armyStart(c,true);else if(this.relation<=C.warRelation)this.armyStart(c);}
  const a=c.army;if(!a)return;const troops=a.ids.map(id=>this.get(id)).filter(e=>e?.soldier);a.food=troops.reduce((n,e)=>n+e.rations,0);a.loot=troops.reduce((n,e)=>n+e.loot,0);if(a.engaged)a.fight+=dt;a.engaged=false;if(a.fight>=C.fightSeconds||troops.length<=a.start/2||a.food<=0||this.truce>0)a.returning=true;if(!troops.length)c.army=null;
 }
 unlock(id){const s=SKILLS.find(s=>s.id===id);if(!s||this.unlocked.includes(id))return '已经解锁';if(this.result)return '本局已结束';if(this.paused)return '请先继续游戏';if(this.mana<s.unlock)return `灵力不足：还差${s.unlock-this.mana}`;this.mana-=s.unlock;this.unlocked.push(id);this.message(s.name+'已解锁');return null;}
 legalTargets(id,p,r){return this.targets(p,r).filter(e=>id==='peace'?e.kind==='human'&&(e.king||e.soldier):id==='lightning'?e.kind==='human'&&!e.inside:id==='joy'?e.adult&&e.partnerId&&e.joy<=0:id==='bless'||id==='rage'?e.kind==='human':id==='plague'?e.kind==='human'&&!(e.sick>0)&&!(e.immune>0):true);}
 validate(id,p,weather={temp:'normal',cloud:true}){const s=SKILLS.find(s=>s.id===id);if(!s)return '未知技能';if(this.result)return '本局已结束';if(this.paused)return '游戏已暂停，请先继续';if(!this.unlocked.includes(id))return '请先解锁技能';if((this.cooldowns[id]||0)>0)return `冷却中：剩余${Math.ceil(this.cooldowns[id])}秒`;if(this.mana<s.cost)return `灵力不足：需要${s.cost}，当前${Math.floor(this.mana)}`;const c=this.islandAt(p);if(!c)return id==='weather'?'请点击岛屿':'请在岛屿上施放';if(id==='weather'&&(!['normal','hot','cold'].includes(weather.temp)||typeof weather.cloud!=='boolean'))return '请先选择温度和云量';const ts=this.legalTargets(id,p,s.r);if(id==='peace'){const t=ts.sort((a,b)=>distance(a,p)-distance(b,p))[0];if(!t)return '请选择国王或士兵';if(t.king&&this.truce>0)return '双方已在停火中';}if(id==='undead'&&!this.corpses.some(b=>b.life>0&&distance(b,p)<=s.r))return '范围内没有可用尸体';if(id==='joy'&&!ts.length)return '没有可受影响的配对成年个体';if(id==='bless'&&!ts.length)return '范围内没有居民';if(id==='lightning'&&!ts.length&&!c.trees.some(h=>h.hp>0&&distance(h,p)<=s.r)){return this.targets(p,s.r).some(e=>e.inside)||c.houses.some(h=>h.hp>0&&distance(h,p)<=s.r)?'屋内居民无法被闪电命中':'附近没有可命中的目标';}return null;}
 cast(id,p,weather={temp:'normal',cloud:true},mode='area'){
  const error=id==='rage'&&mode==='king'&&!this.legalTargets(id,p,5).some(e=>e.king)?'请选择国王':this.validate(id,p,weather);if(error)return {ok:false,message:error};const s=SKILLS.find(s=>s.id===id),c=this.islandAt(p);let targets=this.legalTargets(id,p,s.r);this.mana-=s.cost;this.cooldowns[id]=s.cd;let message=s.name+'已施放';
  if(id==='peace'){const e=targets.sort((a,b)=>distance(a,p)-distance(b,p))[0];if(e.king){this.truce=C.truceSeconds;for(const n of this.islands)if(n.army)n.army.returning=true;}else e.returning=true;this.fx(e.x,e.y,'白旗 · 返乡');}
  if(id==='bless'){for(const e of targets)e.bless=C.blessSeconds;message=targets.some(e=>this.workers(this.islands[e.country]).includes(e))?'效率＋40%，持续20秒':'当前只能改善心情，不能恢复劳动';}
  if(id==='joy'){for(const e of targets)e.joy=C.joySeconds+(e.kind==='human'?C.joyStop:0);message=`祝福${targets.length}名配对成年个体；人类先停工4秒，随后食欲×2`;}
  if(id==='weather'){c.weather={...weather,left:C.weatherSeconds};message='气候已改变，持续30秒';}
  if(id==='lightning'){const e=targets.sort((a,b)=>distance(a,p)-distance(b,p))[0];if(e){this.kill(e);this.fx(e.x,e.y,'ϟ');}else{const h=c.trees.filter(h=>h.hp>0&&distance(h,p)<=s.r).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(this.wet(c))message='已施放，但降水阻止了起火';else this.ignite(h,c);} }
  if(id==='plague'){for(const e of targets.filter(e=>e.kind==='human'&&!(e.sick>0)&&!(e.immune>0))){e.sick=12;e.spread=3;}}
  if(id==='undead'){for(const body of this.corpses.filter(b=>b.life>0&&distance(b,p)<=s.r).slice(0,8)){const e=this.spawn('undead',this.islands[body.country],true,body);e.hp=80;body.life=0;}}
  if(id==='meteor'){this.pending.push({id:'meteor',x:p.x,y:p.y,left:.7});message='陨石正在落下';}
  if(id==='rage'){if(mode==='king')targets=targets.filter(e=>e.king).slice(0,1);for(const e of targets){e.rage=C.rageSeconds;e.kingTry=0;e.rageWar=false;}message=targets.some(e=>e.king)?'国王已暴怒，正在尝试发动战争'+(!this.conflict?'；国家冲突尚未开放':''):targets.length?`暴怒影响${targets.length}名居民`:'已施放，但范围内没有居民';}
  this.fx(p.x,p.y,'－'+s.cost+'灵力');this.judge();return {ok:true,message,quiet:id==='lightning'};
 }
 impact(p){const before=this.souls;let buildings=0,hit=0;const destroyed=new Set();for(const c of this.islands)for(const h of this.buildings(c))if(h.hp>0&&distance(h,p)<=5){buildings++;h.hp=h.kind==='tree'?0:Math.max(0,h.hp-C.meteorBuildingDamage);if(h.hp<=0)destroyed.add(h.id);this.ignite(h,c);}for(const e of this.targets(p,5)){if(e.inside&&!destroyed.has(e.inside))continue;if(e.inside)e.inside=null;this.damage(e,C.meteorDamage);hit++;}this.effects.push({...p,r:5,life:1.2,color:'#ed9655'});this.message(buildings||hit?`陨石：受损建筑／燃料${buildings}，实际死亡${this.souls-before}（＋${this.souls-before}魂、灵力）`:'陨石只造成了地形破坏',p);}
 step(dt){
  if(this.paused||this.result||!Number.isFinite(dt)||dt<=0)return;
  // A fixed simulation quantum makes large caller steps obey the same ordering.
  let remaining=Math.min(dt,C.duration-this.time);while(remaining>1e-8&&!this.result){const slice=Math.min(.05,remaining);this.tick(slice);remaining-=slice;}
 }
 tick(dt){
  for(const e of this.entities)e.hurt=false;this.time=Math.min(C.duration,this.time+dt);this.truce=Math.max(0,this.truce-dt);for(const k in this.cooldowns)this.cooldowns[k]=Math.max(0,this.cooldowns[k]-dt);
  for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);for(const e of this.corpses)e.life-=dt;this.corpses=this.corpses.filter(e=>e.life>0);
  for(const p of this.pending){p.left-=dt;if(p.left<=0)this.impact(p);}this.pending=this.pending.filter(p=>p.left>0);
  if(this.souls>=C.goal||!this.humans().length){this.judge();if(this.result)return;}
  for(const c of this.islands)this.economy(c,dt);
  for(const e of [...this.entities]){
   if(e.dead)continue;const c=this.islands[e.country];e.attack=Math.max(0,e.attack-dt);for(const key of ['bless','joy','rage'])e[key]=Math.max(0,e[key]-dt);
   if(!e.adult){if(e.bornAt<this.time-1e-8)e.growth+=dt;e.action='成长中';if(e.growth+1e-8>=C.growthSeconds){e.adult=true;this.fx(e.x,e.y,'长大了');if(e.kind==='human')this.first('adult','孩子长大了，开始劳动并寻找成年伴侣。',e);}}
   if(e.kind==='undead'){e.life-=dt;if(e.life<=0){this.kill(e);continue;}const victim=this.humans().filter(v=>distance(v,e)<=8).sort((a,b)=>distance(a,e)-distance(b,e))[0];e.action='追逐活人';if(victim)this.attackTarget(e,victim,dt,20,3);continue;}
   if(e.kind==='human'){
    e.immune=Math.max(0,(e.immune||0)-dt);if(e.sick>0){e.sick-=dt;e.spread-=dt;if(e.spread<=0){e.spread=3;for(const other of this.targets(e,2))if(other.kind==='human'&&!(other.sick>0)&&!(other.immune>0)&&this.random()<.15){other.sick=12;other.spread=3;}}if(e.sick<=0){if(this.random()<.3)this.kill(e);else e.immune=30;}}
    if(!e.soldier&&c.food<=0){e.starve+=dt;if(e.starve>=C.starveDelay){e.hungerTick+=dt;if(e.hungerTick>=C.starveInterval){e.hungerTick-=C.starveInterval;this.damage(e,C.starveDamage);}}}else{e.starve=0;e.hungerTick=0;}
    if(e.dead)continue;
    if(e.soldier){e.inside=null;this.soldier(e,c,dt);}
    else if(e.rage>0){e.inside=null;e.action='暴怒停工';const victim=this.humans().filter(v=>v.id!==e.id&&distance(v,e)<=5).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(victim)this.attackTarget(e,victim,dt,C.civilianDamage);}
    else if(e.joy>C.joySeconds)e.action='欢愉停工 '+Math.ceil(e.joy-C.joySeconds)+'秒';
    else if(e.sick>0)e.action='患病停工';else if(e.adult)this.work(e,c,dt);
   }else {e.action=e.adult?'牧场活动':'成长中';if(distance(e,e.destination)<.3||distance(e.destination,c.pen)>4)e.destination={x:c.pen.x+(this.random()-.5)*6,y:c.pen.y+(this.random()-.5)*6};this.move(e,e.destination,dt,.6);}
  }
  for(const c of this.islands){this.fire(c,dt);this.war(c,dt);c.weather.left=Math.max(0,c.weather.left-dt);}
  for(const e of this.entities)if(!e.dead&&e.kind!=='undead'&&!e.hurt&&e.starve<=0&&e.action!=='正在交战')e.hp=Math.min(e.kind==='human'?C.humanHP:C.sheepHP,e.hp+C.healRate*dt);
  if(this.conflict){this.relationClock+=dt;if(this.relationClock>=C.relationInterval){this.relationClock-=C.relationInterval;if(this.islands.some(c=>c.food<this.humans(c.id).length*C.foodPerYear*.5))this.relation-=C.relationLoss;else if(!this.islands.some(c=>c.army)&&this.islands.every(c=>c.food>=this.humans(c.id).length*C.foodPerYear))this.relation+=C.relationGain;this.relation=clamp(this.relation,-100,100);}}
  this.entities=this.entities.filter(e=>!e.dead);this.drops=this.drops.filter(d=>d.food>0);this.judge();if(!this.result)this.stages();
 }
 judge(){if(this.result)return;if(this.souls>=C.goal)this.result='success';else if(!this.humans().length)this.result='extinct';else if(this.time+1e-8>=C.duration){this.time=C.duration;this.result='timeout';}if(this.result)this.paused=true;}
 serialize(){if(this.result)throw Error('本局已结束');if(this.pending.length){this.saveRequested=true;throw Error('神罚尚未落地，稍后补存');}return JSON.stringify({version:C.version,state:{...this,effects:[],events:[],saveRequested:false}});}
 static restore(json){const d=JSON.parse(json);if(d.version!==C.version)throw Error((TEXT.oldSave||'旧版存档不兼容，请开始新局'));const s=d.state;if(!s||!Array.isArray(s.entities)||!Array.isArray(s.islands)||s.islands.length!==2||!Array.isArray(s.pairs)||!Number.isFinite(s.time)||s.time<0||s.time>=C.duration||s.result||s.pending?.length||s.secondIsland!==(s.islands.length===2)||!Number.isFinite(s.mana)||!Number.isFinite(s.souls)||new Set(s.entities.map(e=>e.id)).size!==s.entities.length||s.entities.some(e=>!Number.isFinite(e.hp)||!Number.isFinite(e.x)||!Number.isFinite(e.y)||!s.islands[e.country]))throw Error('存档损坏，无法恢复');for(const e of s.entities){e.sick??=0;e.immune??=0;e.spread??=0;e.life??=20;}const w=Object.assign(Object.create(World.prototype),s);w.paused=true;return w;}
}
