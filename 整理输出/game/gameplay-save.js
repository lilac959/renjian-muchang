import {HUSBANDRY as H} from './config.js';
import {FARM_LOTS} from './settlement.js';
const finite=(v,min=0)=>Number.isFinite(v)&&v>=min;
export function validGameplayState(s){
 if(!Array.isArray(s.animals)||!Array.isArray(s.islands?.[0]?.buildings)||!Array.isArray(s.islands?.[1]?.pens)||!Number.isInteger(s.navRevision)||s.navRevision<0||!Array.isArray(s.beastBirthCredit)||s.beastBirthCredit.length!==2||!s.beastBirthCredit.every(v=>finite(v)))return false;
 if(!Number.isSafeInteger(s.serial)||s.serial<Math.max(0,...s.entities.map(e=>e.id),...s.animals.map(a=>a.id)))return false;
 for(const e of s.entities)if(!['civilian','king','scholar'].includes(e.role)||!['joy','rage','wounded','appetite'].every(key=>finite(e[key])))return false;
 const lots=s.islands[0].buildings;
 if(lots.length!==FARM_LOTS.length||new Set(lots.map(b=>b.id)).size!==lots.length)return false;
 for(const b of lots){const expected=FARM_LOTS.find(l=>l.id===b.id);
  if(!expected||b.x!==expected.x||b.y!==expected.y||b.zone!==expected.zone||b.source!==expected.source||!['planned','clearing','building','complete'].includes(b.state)||!(b.zone==='field'?['field']:expected.special?['house',expected.special]:['house']).includes(b.kind)||!finite(b.progress)||!finite(b.clearProgress)||!finite(b.upgradeProgress)||!Array.isArray(b.workers))return false;
  for(const key of ['min','max'])if(!Array.isArray(b.footprint?.[key])||b.footprint[key].some((v,i)=>v!==expected.footprint[key][i])||b.footprint[key].length!==2)return false;
 }
 if(JSON.stringify(s.islands[1].pens)!==JSON.stringify(H.pens))return false;
 for(const c of s.islands)if(!['warIntent','exhaustion','unrest','leaderVacancy','scholarClock'].every(k=>finite(c[k],k==='scholarClock'?-1:0))||c.exhaustion>100||c.kingId!==null&&!Number.isSafeInteger(c.kingId))return false;
 return true;
}
