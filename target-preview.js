import {CONFIG,SKILLS} from './config.js';
import {distance} from './engine.js';
export function targetPreview(world,id,p,weather='rain'){
 const result={affected:[],secondary:[],corpses:[]};
 if(!id||!p||world.validate(id,p,weather))return result;
 const skill=SKILLS.find(s=>s.id===id);
 if(id==='undead'){result.corpses=world.corpses.filter(b=>b.life>0&&distance(b,p)<=skill.r).slice(0,CONFIG.undeadLimit).map(b=>b.id);return result;}
 if(id==='rage'){const actor=world.get(world.preview(id,p,weather)[0])||world.animals.find(e=>e.id===world.preview(id,p,weather)[0]&&!e.dead);if(!actor)return result;result.affected=[actor.id];if(actor.king){const c=world.islands[actor.country],rage=actor.rage;actor.rage=0;try{if(!world.armyCheck(c,actor))result.secondary=world.rageTroops(c,actor).map(e=>e.id);}finally{actor.rage=rage;}}return result;}
 let actors=id==='meteor'?world.targets(p,skill.r):world.legalTargets(id,p,skill.r);
 if(id==='lightning')actors=actors.sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,1);
 if(id==='peace')actors=world.entities.filter(e=>!e.dead&&(e.soldier||e.commanding));
 if(id==='weather')actors=world.humans(world.islandAt(p).id);
 if(id==='bless')actors=actors.filter(e=>world.workers(world.islands[e.country]).includes(e));
 result.affected=actors.map(e=>e.id);return result;
}
export function previewRing(id){return !['rage','lightning','weather','undead'].includes(id);}
