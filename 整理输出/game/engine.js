import {CONFIG,SKILLS} from './config.js';
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class World {
 constructor(seed=Date.now()) {
  this.seed=seed>>>0; this.time=0; this.mana=CONFIG.mana; this.souls=0; this.paused=true; this.result=null; this.serial=0;
  this.cooldowns={}; this.unlocked=SKILLS.filter(s=>!s.unlock).map(s=>s.id); this.entities=[]; this.corpses=[]; this.effects=[]; this.events=[]; this.relation=0; this.truce=0; this.nextRelation=15; this.births=0;
  this.islands=[{id:0,name:'青禾国',x:27,y:28,color:'#d1b45e'},{id:1,name:'白鹿国',x:76,y:28,color:'#86c6cc'}].map(c=>({...c,food:480,fields:c.id?0:16,birth:0,sheepBirth:0,beastBirth:0,build:0,fieldBuild:0,offering:20,weather:{temp:'normal',cloud:true,left:0},heat:0,volcano:0,eruption:0,volcanoReady:0,army:null,lastArmy:-40,kingRage:0,kingTry:0,slaughter:0,houses:Array.from({length:16},(_,i)=>({x:c.x+(i%4-1.5)*3.4,y:c.y+2+Math.floor(i/4)*2.5,hp:100,fire:0}))}));
  for(const c of this.islands){for(let i=0;i<60;i++)this.spawn('human',c,20+i/3);for(let i=0;i<6;i++)this.spawn('beast',c);if(c.id)for(let i=0;i<60;i++)this.spawn('sheep',c);}
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 point(c){const a=this.random()*Math.PI*2,r=Math.sqrt(this.random());return {x:c.x+Math.cos(a)*r*17,y:c.y+Math.sin(a)*r*12};}
 spawn(kind,c,age=0,point=null){const p=point||this.point(c);const e={id:++this.serial,kind,country:c.id,x:p.x,y:p.y,age,hp:kind==='human'?100:kind==='beast'?120:kind==='undead'?80:40,dead:false,bless:0,joy:0,rage:0,sick:0,immune:0,starve:0,hungerTick:0,attack:0,life:20,soldier:false,destination:this.point(c)};this.entities.push(e);return e;}
 humans(id){return this.entities.filter(e=>!e.dead&&e.kind==='human'&&(id===undefined||e.country===id));}
 animals(id,kind){return this.entities.filter(e=>!e.dead&&e.kind===kind&&e.country===id);}
 capacity(c){return c.houses.reduce((n,h)=>n+(h.hp>50?5:h.hp>0?2:0),0);}
 workers(c){return this.humans(c.id).filter(e=>e.age>=16&&!e.soldier&&e.sick<=0&&e.rage<=0&&!(e.joy>18));}
 consumption(c){return this.humans(c.id).filter(e=>!e.soldier).reduce((n,e)=>n+(e.joy>0&&e.joy<=18?4:2),0);}
 islandAt(p){return this.islands.find(c=>((p.x-c.x)/22)**2+((p.y-c.y)/17)**2<=1);}
 message(text){this.events.push(text);if(this.events.length>12)this.events.shift();}
 fx(x,y,text,color='#f4d58a'){this.effects.push({x,y,text,color,life:1.8});}
 kill(e){if(e.dead)return;e.dead=true;if(e.kind==='human'){this.souls++;this.mana++;this.corpses.push({id:e.id,x:e.x,y:e.y,country:e.country,life:30});this.fx(e.x,e.y,'+1魂','#e2b7ff');}else if(e.kind==='beast')this.islands[e.country].food+=12;}
 damage(e,amount){if(e.dead)return;e.hp-=amount;if(e.hp<=0)this.kill(e);}
 unlock(id){const s=SKILLS.find(s=>s.id===id);if(!s||this.unlocked.includes(id))return '已经解锁';if(this.paused)return '请先继续游戏';if(this.mana<s.unlock)return '灵力不足';this.mana-=s.unlock;this.unlocked.push(id);return null;}
 targets(p,r){return this.entities.filter(e=>!e.dead&&distance(e,p)<=r);}
 validate(id,p){const s=SKILLS.find(s=>s.id===id);if(!s)return '未知技能';if(this.result)return '本局已结束';if(this.paused)return '游戏已暂停，请先继续';if(!this.unlocked.includes(id))return '请先解锁技能';if((this.cooldowns[id]||0)>0)return `冷却中：${Math.ceil(this.cooldowns[id])}秒`;if(this.mana<s.cost)return `灵力不足：需要${s.cost}`;const c=this.islandAt(p);if(!c)return '请在岛屿上施放';if(id==='undead'&&!this.corpses.some(e=>e.life>0&&distance(e,p)<=s.r))return '范围内没有可用尸体';if(id==='lightning'&&!this.targets(p,s.r).length)return '附近没有可命中的生物';if(id==='peace'){const king=distance(p,{x:c.x,y:c.y-4})<3;const soldiers=this.targets(p,2).filter(e=>e.soldier);if(!king&&!soldiers.length)return '请选择王宫或士兵';if(king&&this.truce>0)return '双方已在停火中';}return null;}
 cast(id,p,weather={temp:'normal',cloud:true}){
  const error=this.validate(id,p);if(error)return {ok:false,message:error};const s=SKILLS.find(s=>s.id===id),c=this.islandAt(p),targets=this.targets(p,s.r),before=this.souls;this.mana-=s.cost;this.cooldowns[id]=s.cd;let count=0;
  if(id==='peace'){if(distance(p,{x:c.x,y:c.y-4})<3){this.truce=15;for(const n of this.islands)if(n.army)n.army.returning=true;}else for(const e of targets.filter(e=>e.soldier))e.returning=true;count=1;}
  if(id==='weather'){c.weather={...weather,left:30};if(weather.temp!=='hot')c.heat=0;count=1;}
  if(id==='lightning'){const e=targets.sort((a,b)=>distance(a,p)-distance(b,p))[0];this.kill(e);count=1;}
  if(id==='bless')for(const e of targets.filter(e=>e.kind==='human')){e.bless=20;count++;}
  if(id==='joy')for(const e of targets.filter(e=>e.kind!=='undead'&&e.joy<=0)){e.joy=e.kind==='human'?22:18;count++;}
  if(id==='meteor'){for(const e of targets){this.damage(e,100);count++;}for(const h of c.houses)if(distance(h,p)<=5){h.hp=Math.max(0,h.hp-60);if(!this.wet(c))h.fire=10;}this.effects.push({x:p.x,y:p.y,r:5,life:1.2,color:'#ed9655'});}
  if(id==='rage'){for(const e of targets.filter(e=>e.kind!=='undead')){e.rage=15;count++;}if(distance(p,{x:c.x,y:c.y-4})<4){c.kingRage=15;c.kingTry=0;count++;}}
  if(id==='plague')for(const e of targets.filter(e=>e.kind==='human'&&e.sick<=0&&e.immune<=0)){e.sick=12;e.spread=3;count++;}
  if(id==='undead'){for(const body of this.corpses.filter(e=>e.life>0&&distance(e,p)<=6).slice(0,8)){this.spawn('undead',this.islands[body.country],0,body);body.life=0;count++;}}
  this.fx(p.x,p.y,s.icon+' '+s.name);this.judge();return {ok:true,message:id==='meteor'?`陨石命中${count}个生物，收集${this.souls-before}魂`:count?`${s.name}已施放 · ${count}${id==='weather'?'座岛屿':'个目标'}`:'已施放，但范围内没有新增效果'};
 }
 wet(c){return c.weather.left>0&&c.weather.temp!=='hot'&&c.weather.cloud;}
 move(e,p,dt,speed=2){const d=distance(e,p);if(d>0.1){const f=Math.min(1,speed*dt/d);e.x+=(p.x-e.x)*f;e.y+=(p.y-e.y)*f;}}
 armyStart(c,raid=false){const people=this.workers(c),n=raid?5:10;if(c.army||this.time-c.lastArmy<40||people.length<(raid?20:30)||c.food<n*10)return false;const soldiers=people.slice(-n);for(const e of soldiers){e.soldier=true;e.returning=false;}c.food-=n*10;c.army={ids:soldiers.map(e=>e.id),food:n*10,loot:0,returning:false,fight:0,start:n,raid};c.lastArmy=this.time;this.relation=Math.max(-100,this.relation-20);this.message(`${c.name}${raid?'派出劫掠小队':'向邻国宣战'}`);return true;}
 step(dt){
  if(this.paused||this.result)return;dt=Math.min(dt,CONFIG.duration-this.time);this.time+=dt;this.truce=Math.max(0,this.truce-dt);for(const k in this.cooldowns)this.cooldowns[k]=Math.max(0,this.cooldowns[k]-dt);
  for(const effect of this.effects)effect.life-=dt;this.effects=this.effects.filter(e=>e.life>0);for(const body of this.corpses)body.life-=dt;this.corpses=this.corpses.filter(e=>e.life>0);
  for(const c of this.islands)this.economy(c,dt);
  const living=this.entities.filter(e=>!e.dead);
  for(const e of living){
   if(e.dead)continue;const c=this.islands[e.country];e.attack=Math.max(0,e.attack-dt);e.bless=Math.max(0,e.bless-dt);e.joy=Math.max(0,e.joy-dt);e.rage=Math.max(0,e.rage-dt);e.immune=Math.max(0,e.immune-dt);
   if(e.kind==='human'){e.age+=dt/CONFIG.year;if(e.age>=60){this.kill(e);continue;}
    if(!e.soldier&&c.food<=0){e.starve+=dt;if(e.starve>=8){e.hungerTick+=dt;if(e.hungerTick>=2){e.hungerTick-=2;this.damage(e,20);}}}else{e.starve=0;e.hungerTick=0;}
    if(e.sick>0){e.sick-=dt;e.spread-=dt;if(e.spread<=0){e.spread+=3;for(const other of living)if(!other.dead&&other.kind==='human'&&other.sick<=0&&other.immune<=0&&distance(e,other)<=2&&this.random()<.15){other.sick=12;other.spread=3;}}if(e.sick<=0){if(this.random()<.3)this.kill(e);else e.immune=30;}}
   }
   if(e.kind==='undead'){e.life-=dt;if(e.life<=0){this.kill(e);continue;}}
   let victim=null;if(e.kind==='undead'||e.rage>0||e.soldier&&!e.returning&&c.army&&!c.army.returning&&this.truce<=0){const range=e.kind==='undead'?8:e.soldier?6:5;victim=living.filter(v=>!v.dead&&v.kind==='human'&&v.id!==e.id&&(!e.soldier||v.country!==e.country)&&distance(v,e)<=range).sort((a,b)=>distance(a,e)-distance(b,e))[0];}
   if(victim){this.move(e,victim,dt,e.soldier||e.kind==='undead'?3:2);if(distance(e,victim)<=1&&e.attack<=0){this.damage(victim,e.soldier?20:e.kind==='human'?10:15);e.attack=2;}}
   else if(e.soldier){const a=c.army;const returning=e.returning||!a||a.returning;const enemy=this.islands[1-c.id];const goal=returning?{x:c.x,y:c.y}:distance(e,{x:51.5,y:28})>3&&((c.id===0&&e.x<51.5)||(c.id===1&&e.x>51.5))?{x:51.5,y:28}:{x:enemy.x,y:enemy.y};this.move(e,goal,dt,3);if(returning&&distance(e,c)<3){e.soldier=false;e.returning=false;}}
   else if(e.joy<=18&&e.sick<=0){if(distance(e,e.destination)<.5)e.destination=this.point(c);this.move(e,e.destination,dt,e.kind==='undead'?3:2);}
   if(!victim&&e.starve<=0&&e.sick<=0)e.hp=Math.min(e.kind==='human'?100:e.kind==='beast'?120:e.kind==='undead'?80:40,e.hp+2*dt);
  }
  for(const c of this.islands)this.war(c,dt);
  if(this.time>=this.nextRelation){this.nextRelation+=15;const scarce=this.islands.some(c=>c.food<this.humans(c.id).length);if(scarce)this.relation-=10;else if(!this.islands.some(c=>c.army))this.relation+=5;this.relation=Math.max(-100,Math.min(100,this.relation));}
  this.entities=this.entities.filter(e=>!e.dead);this.judge();
 }
 economy(c,dt){
  const humans=this.humans(c.id),n=humans.length,base=n*2,workers=this.workers(c),sheep=this.animals(c.id,'sheep');
  const weather=c.weather.left>0?c.weather:{temp:'normal',cloud:false};const climate=weather.temp==='normal'?(weather.cloud?1.25:1):.65;
  const work=workers.reduce((sum,e)=>sum+(e.bless>0?1.4:1),0)*(c.food>0?1:.5);
  if(c.id===0)c.food+=Math.min(c.fields*2,work)*5/CONFIG.year*climate*dt;
  c.food=Math.max(0,c.food-this.consumption(c)/CONFIG.year*dt);
  if(sheep.length){const carers=Math.min(1,workers.length/Math.ceil(sheep.length/20));c.sheepBirth+=sheep.reduce((s,e)=>s+(e.joy>0?2:1),0)*.2/CONFIG.year*dt*carers*(weather.temp==='hot'?.6:weather.temp==='cold'?.8:weather.cloud?1.5:1);while(c.sheepBirth>=1&&sheep.length<120){sheep.push(this.spawn('sheep',c));c.sheepBirth--;}
   const reserve=c.food<base*.5?15:40;if(c.food<base*2&&sheep.length>reserve&&workers.length>Math.ceil(sheep.length/20)){c.slaughter+=dt;if(c.slaughter>=1){c.slaughter-=1;const animal=sheep.pop();animal.dead=true;c.food+=16;}}else c.slaughter=0;
  }
  const beasts=this.animals(c.id,'beast');c.beastBirth+=beasts.reduce((s,e)=>s+(e.joy>0?2:1),0)*.1/CONFIG.year*dt;while(c.beastBirth>=1&&beasts.length<16){beasts.push(this.spawn('beast',c));c.beastBirth--;}
  if(n&&c.food>=base&&this.capacity(c)>n){c.birth+=humans.reduce((s,e)=>s+(e.joy>0&&e.joy<=18?2:1),0)*.08/CONFIG.year*dt*(weather.temp==='hot'?.6:1);while(c.birth>=1&&this.humans(c.id).length<this.capacity(c)){const baby=this.spawn('human',c);this.fx(baby.x,baby.y,'♡','#c4f2a9');this.births++;c.birth--;}}
  if(this.capacity(c)-n<5&&workers.length>=2){c.build+=dt;if(c.build>=6){c.build=0;const ruin=c.houses.find(h=>h.hp<=0);if(ruin)ruin.hp=100;else if(c.houses.length<30)c.houses.push({...this.point(c),hp:100,fire:0});}}else c.build=0;
  if(c.id===0&&c.food<base*2&&workers.length>=c.fields*2+2&&c.fields<30){c.fieldBuild+=dt;if(c.fieldBuild>=5){c.fields++;c.fieldBuild=0;}}else c.fieldBuild=0;
  c.repair=(c.repair||0)+dt;if(c.repair>=5){c.repair=0;const damaged=c.houses.find(h=>h.hp>0&&h.hp<100&&h.fire<=0);if(damaged&&workers.length>=2)damaged.hp=100;}
  if(this.time>=c.offering){c.offering+=20;if(n&&c.food-20>=base*2){c.food-=20;this.mana+=5;this.fx(c.x,c.y-4,'供奉 +5');}}
  c.weather.left=Math.max(0,c.weather.left-dt);if(c.weather.left>0&&c.weather.temp==='hot'){c.heat+=dt;if(c.heat>=25&&this.time>=c.volcanoReady&&!c.volcano){c.volcano=6;c.eruption=0;c.volcanoReady=this.time+66;this.message(`${c.name}火山喷发`);}}else c.heat=0;
  if(c.volcano>0){c.volcano-=dt;c.eruption+=dt;if(c.eruption>=1){c.eruption-=1;const p={x:c.x+(this.random()-.5)*18,y:c.y-9+(this.random()-.5)*12};for(const e of this.targets(p,2))this.damage(e,50);for(const h of c.houses)if(distance(p,h)<=2){h.hp=Math.max(0,h.hp-30);h.fire=10;}this.effects.push({...p,r:2,color:'#ff7f50',life:1});}}
  for(const h of c.houses){if(h.fire>0){h.fire=Math.max(0,h.fire-dt*(this.wet(c)?6:1));h.hp=Math.max(0,h.hp-5*dt);for(const e of this.targets(h,2))this.damage(e,10*dt);}}
 }
 war(c,dt){
  if(c.kingRage>0){c.kingRage-=dt;c.kingTry-=dt;if(c.kingTry<=0){c.kingTry=3;if(this.truce<=0&&this.random()<.25&&this.armyStart(c))c.kingRage=0;}}
  if(this.truce<=0&&!c.army){const n=this.humans(c.id).length;if(this.relation<=-30&&c.food<n)this.armyStart(c,true);else if(this.relation<=-60&&c.food>=n)this.armyStart(c);}
  const a=c.army;if(!a)return;const soldiers=this.entities.filter(e=>!e.dead&&e.soldier&&a.ids.includes(e.id));a.food=Math.max(0,a.food-soldiers.length*2/CONFIG.year*dt);
  const enemy=this.islands[1-c.id];if(soldiers.some(e=>distance(e,enemy)<8)){a.fight+=dt;if(a.raid&&!a.returning){const loot=Math.min(soldiers.length*4,enemy.food);enemy.food-=loot;a.loot=loot;a.returning=true;}}
  if(a.fight>=15||soldiers.length<=a.start/2||a.food<=0||this.truce>0)a.returning=true;
  if(!soldiers.length){const survivors=this.entities.filter(e=>!e.dead&&a.ids.includes(e.id));if(survivors.length)c.food+=a.food+a.loot;c.army=null;}
 }
 judge(){if(this.result)return;if(this.souls>=CONFIG.goal)this.result='success';else if(!this.humans().length)this.result='extinct';else if(this.time>=CONFIG.duration)this.result='timeout';if(this.result)this.paused=true;}
 serialize(){return JSON.stringify({version:1,state:{...this,effects:[],events:[]}});}
 static restore(json){const data=JSON.parse(json);if(data.version!==1||!data.state||!Array.isArray(data.state.entities)||!Array.isArray(data.state.islands)||data.state.islands.length!==2||!Number.isFinite(data.state.time)||data.state.time<0||data.state.time>=300||data.state.result)throw Error('存档不可用');const world=Object.assign(Object.create(World.prototype),data.state);world.paused=true;return world;}
}
