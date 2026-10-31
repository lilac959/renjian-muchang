import {CONFIG as C,SOCIETY as R} from './config.js';
import {complete} from './settlement.js';
export function available(e){return !!e&&!e.dead&&e.adult&&!e.soldier&&e.sick<=0&&e.joy<=0&&e.rage<=0&&e.wounded<=0&&e.action!=='守卫岛屿';}
export function initSociety(w){for(const c of w.islands){c.kingId=w.humans(c.id)[0]?.id??null;c.warIntent=0;c.exhaustion=0;c.unrest=0;c.leaderVacancy=0;c.scholarClock=0;const king=w.get(c.kingId);if(king){king.role='king';king.king=true;}}}
export function enrage(w,target){
 target.rage=0;
 if(target.kind!=='human'){target.rage=C.rageSeconds;w.change('animal-enraged',{animalId:target.id,kind:target.kind});return;}
 if(target.role==='king'){
  const c=w.islands[target.country];c.warIntent=R.warIntentSeconds;
  if(c.exhaustion>=R.unrestExhaustion){c.unrest+=R.unrestPerOrder;w.change('forced-war-protest',{country:c.id,leaderId:target.id,pressure:c.unrest});}
  const ok=w.armyStart(c,target);c.lastWarBlocker=ok?'':w.armyCheck(c,target);
  w.change('king-war-order',{country:c.id,leaderId:target.id,mobilized:ok,reason:c.lastWarBlocker});
 }else {if(target.role==='civilian'&&!target.soldier)w.armyStart(w.islands[target.country],target);w.change('resident-enraged',{personId:target.id,role:target.role});}
 target.rage=C.rageSeconds;
}
export function advanceSociety(w,dt){
 for(const c of w.islands){
  const king=w.get(c.kingId);
  if(!king){c.kingId=null;c.warIntent=0;c.leaderVacancy+=dt;if(c.leaderVacancy>=R.successionSeconds){const successor=w.adults(c).find(e=>!e.soldier&&e.sick<=0);if(successor){successor.role='king';successor.king=true;c.kingId=successor.id;c.leaderVacancy=0;w.change('king-succeeded',{country:c.id,personId:successor.id});}}}
  if(!c.army){c.exhaustion=Math.max(0,c.exhaustion-dt*(w.supply(c)>R.recoveryReserveSeconds?R.fedRecovery:R.hungryRecovery));c.unrest=Math.max(0,c.unrest-dt*R.unrestRecovery);}
  if(c.unrest>=R.revoltPressure&&king){w.kill(king,'revolt');c.warIntent=0;c.unrest=0;w.retreat(c);w.change('king-overthrown',{country:c.id,personId:king.id});}
  c.warIntent=Math.max(0,c.warIntent-dt);
  if(c.warIntent>0&&!c.army){const rage=king?.rage;if(king)king.rage=0;const ok=w.armyStart(c,king||c);c.lastWarBlocker=ok?'':w.armyCheck(c,king||c);if(king)king.rage=rage;if(ok)c.warIntent=0;}
  c.scholarClock-=dt;
  if(c.scholarClock<=0){c.scholarClock=1;
   const academy=complete(c,'academy')[0];const scholars=w.adults(c).filter(e=>e.role==='scholar');
   const eligible=academy&&w.humans(c.id).length>=R.scholarPopulation&&w.supply(c)>R.scholarReserveSeconds&&w.production(c)>w.consumption(c)*R.scholarMargin;
   if(eligible&&scholars.length<R.maxScholars){const e=w.workers(c).find(e=>e.role==='civilian'&&!e.workSite);if(e){e.role='scholar';e.schoolId=academy.id;w.change('scholar-appointed',{personId:e.id,schoolId:academy.id,country:c.id});}}
   if(!academy||w.supply(c)<R.scholarKeepReserveSeconds)for(const e of scholars)if(e.rage<=0){e.role='civilian';e.schoolId=null;}
  }
  c.research=(c.research||0)+w.adults(c).filter(e=>e.role==='scholar'&&available(e)).length*R.researchPerScholar*dt;
 }
}
export function residentAction(w,e,c,dt){
 if(e.soldier)return false;
 if(e.sick>0){e.action='感染 · 停产';return true;}
 if(e.joy>0){e.action='享乐 · 停工';return true;}
 if(e.wounded>0){e.action='受伤 · 休养';return true;}
 if(e.rage>0&&e.role!=='king'){
  e.action=e.role==='scholar'?'暴怒学士 · 停研伤人':'暴怒居民 · 停工伤人';
  const school=c.buildings?.find(b=>b.id===e.schoolId),origin=school||e;
  const victims=w.adults(c).filter(v=>v.id!==e.id&&!v.soldier&&Math.hypot(v.x-origin.x,v.y-origin.y)<R.rageSearch);
  victims.sort((a,b)=>(e.role==='scholar'?Number(b.role==='scholar')-Number(a.role==='scholar'):0)||Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y));
  const victim=victims[0];if(victim){w.move(e,victim,dt,R.rageSpeed);if(Math.hypot(e.x-victim.x,e.y-victim.y)<R.rageReach&&e.attack<=0){w.damage(victim,R.rageDamage,'assault');victim.wounded=Math.max(victim.wounded,R.woundSeconds);e.attack=R.rageAttackInterval;}}
  return true;
 }
 if(e.role==='king'){e.action=e.commanding?'国王号令':e.rage>0?'国王 · 怒令征召':'国王 · 治理';return true;}
 if(e.role==='scholar'){e.action='学士 · 研究';return true;}
 if(e.workSite){e.action='建造 · 停产';return true;}
 return false;
}
