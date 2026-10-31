import {CONFIG,SKILLS} from './config.js';
import {distance} from './engine.js';
export function targetPreview(world,id,p,weather='rain'){
 const result={affected:[],secondary:[],corpses:[]};
 if(!id||!p||world.validate(id,p,weather))return result;
 const skill=SKILLS.find(s=>s.id===id);
 if(id==='undead'){result.corpses=world.corpses.filter(b=>b.life>0&&distance(b,p)<=skill.r).slice(0,CONFIG.undeadLimit).map(b=>b.id);return result;}
 if(id==='rage'){const c=world.islandAt(p),actor=world.rageTarget(c,p);result.affected=[actor.id];if(actor.king)result.secondary=world.rageTroops(c,actor).map(e=>e.id);return result;}
 let actors=id==='meteor'?world.targets(p,skill.r):world.legalTargets(id,p,skill.r);
 if(id==='lightning')actors=actors.sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,1);
 if(id==='peace')actors=world.entities.filter(e=>!e.dead&&(e.soldier||e.commanding));
 if(id==='weather')actors=world.humans(world.islandAt(p).id);
 if(id==='bless')actors=actors.filter(e=>world.workers(world.islands[e.country]).includes(e));
 result.affected=actors.map(e=>e.id);return result;
}
export function previewRing(id){return !['rage','lightning','weather','undead'].includes(id);}
