import {World} from './engine.js';
import {CONFIG as C, SKILLS} from './config.js';
import {housing} from './settlement.js';
import {spawnAnimal} from './husbandry.js';
import {nearestWalkable} from './island-layout.js';
import {PROLOGUE as P,DIALOGUES,PHASES} from './prologue-data.js';
const harvestCauses=new Set(['lightning','meteor','plague','fire','undead']);
const peaceful=new Set(['intro','peace','weather_intro','rain','stewardship','grow']);

export class CampaignWorld extends World {
 constructor(seed=Date.now()){
  super(seed);
  this.campaign={version:2,phase:'intro',line:0,harvest:0,firstSoul:false,finaleElapsed:0,finalePoint:null,showerId:null,showerSerial:0,challengeStart:null,challengeSoulBase:null};
  this.mana=P.initialMana;
  for(const c of this.islands){
   while(this.humans(c.id).length<P.initialPopulation)this.spawn('human',c,true);
   c.food=P.initialFood;c.era=0;
   if(c.buildings){
    for(const b of c.buildings)b.state='planned';
    for(const b of c.buildings.filter(b=>b.source==='authored'&&b.kind==='house'&&!b.special).slice(0,P.initialHouses))b.state='complete';
    for(const b of c.buildings.filter(b=>b.source==='authored'&&b.kind==='field').slice(0,P.initialFields))b.state='complete';
   }
   const king=this.get(c.kingId);Object.assign(king,nearestWalkable({x:c.x+(c.id?-7:7),y:c.y},c.id));king.destination={x:king.x,y:king.y};
   this.armyStart(c,king);c.warIntent=30;
  }
  const c=this.islands[1];for(let i=this.animals.filter(a=>a.kind==='sheep').length;i<P.initialSheep;i++){const pen=c.pens[i%c.pens.length],angle=i*2.399;spawnAnimal(this,'sheep',c,{x:pen.x+Math.cos(angle),y:pen.y+Math.sin(angle)},true);}
 }
 get inPrologue(){return !!this.campaign&&this.campaign.phase!=='challenge';}
 get phase(){return this.campaign?.phase;}
 get dialogue(){const d=DIALOGUES[this.phase];return d?.lines[this.campaign.line]||null;}
 get populationLimit(){return this.campaign?P.populationLimit:super.populationLimit;}
 housing(c){return housing(c)*(this.campaign?P.houseCapacityFactor:1);}
 consumption(c){return super.consumption(c)*(this.campaign?P.foodUseFactor:1);}
 get goal(){return this.inPrologue?P.harvestTarget:this.campaign?P.challengeSouls:super.goal;}
 get score(){return this.inPrologue?this.campaign.harvest:this.campaign?this.souls-this.campaign.challengeSoulBase:super.score;}
 get elapsed(){return this.campaign?.challengeStart!==null&&this.campaign?this.time-this.campaign.challengeStart:0;}
 get remaining(){return this.inPrologue?P.challengeSeconds:Math.max(0,P.challengeSeconds-this.elapsed);}
 get timeLimit(){return !this.campaign||this.inPrologue?Infinity:this.campaign.challengeStart+P.challengeSeconds;}
 get speed(){return this.inPrologue&&['grow','harvest'].includes(this.phase)?P.speed:1;}
 birthRate(c){if(this.inPrologue&&peaceful.has(this.phase)&&this.phase!=='grow')return 0;const rate=super.birthRate(c);return rate*(this.phase==='grow'?P.birthFactor:1);}
 setPhase(phase){this.campaign.phase=phase;this.campaign.line=0;if(phase==='final_cast')this.cooldowns.meteor=0;this.saveRequested=true;}
 advanceDialogue(skip=false){const d=DIALOGUES[this.phase];if(!d)return false;if(skip||++this.campaign.line>=d.lines.length)this.setPhase(d.next);return true;}
 allowedSkill(id){if(!this.inPrologue)return true;if(this.dialogue||['finale','ready'].includes(this.phase))return false;if(['peace'].includes(this.phase))return ['peace','bless','joy'].includes(id);if(['rain','grow'].includes(this.phase))return ['peace','bless','joy','weather'].includes(id);return SKILLS.some(s=>s.id===id);}
 visibleGod(group){if(!this.inPrologue)return true;if(['intro','peace'].includes(this.phase))return group===0;if(['weather_intro','rain','stewardship','grow'].includes(this.phase))return group!==2;return true;}
 validate(id,p,weather='rain'){
  if(this.campaign&&!this.allowedSkill(id))return '请先完成当前教学步骤';
  if(this.inPrologue&&['rain','grow'].includes(this.phase)&&id==='weather'&&weather!=='rain')return '教学期间先选择降雨';
  if(this.inPrologue&&this.phase==='first_soul'&&id!=='lightning'&&!['peace','bless','joy','weather'].includes(id))return '先用闪电收集第一缕灵魂';
  return super.validate(id,p,weather);
 }
 cast(id,p,weather='rain'){
  const phase=this.phase,r=super.cast(id,p,weather);if(!r.ok||!this.inPrologue)return r;
  if(phase==='peace'&&id==='peace'){this.setPhase('weather_intro');this.truce=30;}
  else if(phase==='rain'&&id==='weather'&&weather==='rain')this.setPhase('stewardship');
  else if(phase==='first_soul'&&this.campaign.firstSoul)this.setPhase('first_soul_done');
  else if(phase==='harvest'&&this.campaign.harvest>=P.harvestTarget)this.setPhase('final_instruction');
  else if(phase==='final_cast'&&id==='meteor'){
   const eventId=++this.campaign.showerSerial;this.campaign.showerId=eventId;
   // A single successful paid cast owns every delayed impact. Never re-charge it.
   const first=this.pending.at(-1);first.showerId=eventId;
   for(let i=1;i<P.showerStrikes;i++){const angle=this.random()*Math.PI*2,r=1+this.random()*5;const q=nearestWalkable({x:p.x+Math.cos(angle)*r,y:p.y+Math.sin(angle)*r},this.islandAt(p)?.id??0,this.blockers());this.pending.push({...q,left:.7+i*P.showerInterval,showerId:eventId});}
  }
  return r;
 }
 impact(p){
  if(this.inPrologue&&p.showerId===this.campaign.showerId&&this.phase==='final_cast'){
   this.campaign.finalePoint={x:p.x,y:p.y};this.campaign.finaleElapsed=0;this.setPhase('finale');
  }
  super.impact(p);
 }
 kill(e,cause='divine'){
  if(e&&!e.dead&&e.kind==='human'&&this.inPrologue){
   // No pre-lesson deaths or soft lock; finale leaves real survivors for the continuing world.
   if(peaceful.has(this.phase)||this.phase==='finale'&&this.humans(e.country).length<=P.finaleSurvivorsPerIsland){e.hp=Math.max(1,e.hp);return;}
  }
  const credited=e&&!e.dead&&e.kind==='human'&&this.inPrologue&&['first_soul','harvest'].includes(this.phase)&&harvestCauses.has(cause);
  super.kill(e,cause);
  if(credited&&e.dead){this.campaign.harvest++;if(cause==='lightning')this.campaign.firstSoul=true;}
 }
 tick(dt){
  if(this.dialogue||this.phase==='ready')return;
  if(this.phase==='peace')for(const c of this.islands){c.warIntent=30;if(c.army)c.army.left=Math.max(c.army.left,dt+2);}
  if(this.inPrologue&&['weather_intro','rain','stewardship','grow'].includes(this.phase))this.truce=Math.max(this.truce,dt+1);
  super.tick(dt);
  if(!this.campaign)return;
  if(this.phase==='grow'&&this.humans().length>=P.populationTarget)this.setPhase('reveal');
  if(this.phase==='harvest'&&this.campaign.harvest>=P.harvestTarget)this.setPhase('final_instruction');
 }
 step(dt){if(this.dialogue||this.phase==='ready')return;super.step(dt);}
 advancePresentation(dt){if(this.phase==='finale'&&!this.paused&&Number.isFinite(dt)&&dt>0){this.campaign.finaleElapsed+=Math.min(dt,.25);if(this.campaign.finaleElapsed>=P.finaleSeconds&&!this.pending.length)this.setPhase('ready');}}
 judge(){if(this.inPrologue)return;super.judge();}
 startChallenge(){
  if(!this.campaign||this.phase==='challenge')return false;
  // Preserve living residents, their jobs, housing, food and tech. Only the assessment starts anew.
  this.campaign.challengeStart=this.time;this.campaign.challengeSoulBase=this.souls;this.setPhase('challenge');
  this.campaign.showerId=null;this.pending=[];this.fires=[];this.effects=[];this.cooldowns={};this.mana=P.challengeMana;this.result=null;this.peace();this.paused=false;
  this.change('challenge-started',{population:this.humans().length,duration:P.challengeSeconds,goal:P.challengeSouls});return true;
 }
 objective(){switch(this.phase){
  case 'peace':return '选择和解，点击标记国王，让双方停火';
  case 'rain':return '天气之神 → 气候控制 → 降雨 → 点击岛屿';
  case 'grow':return `养育子民 ${this.humans().length}/${P.populationTarget} · 留足口粮与住房 · 3倍速`;
  case 'first_soul':return '天气之神 → 闪电 → 点击居民，收集第一魂';
  case 'harvest':return `用灾难技能收集灵魂 ${this.campaign.harvest}/${P.harvestTarget}`;
  case 'final_cast':return '天气之神 → 陨石 → 点击城镇，降下流星雨';
  default:return '';
 }}
 focusPoint(){if(this.phase==='peace')return this.get(this.islands[0].kingId)||this.islands[0];if(['first_soul','harvest','final_cast'].includes(this.phase))return this.humans(1).find(e=>e.role==='civilian')||this.humans()[0];return this.islands[0];}
 static restore(json){
  const raw=JSON.parse(json),c=raw.state?.campaign;
  if(!c)return World.restore(json);
  if(c.version!==2)throw Error('序章人口规则已更新，请开始新局');
  const finite=v=>Number.isFinite(v)&&v>=0;
  if(c.version!==2||!PHASES.includes(c.phase)||!Number.isInteger(c.line)||c.line<0||DIALOGUES[c.phase]&&c.line>=DIALOGUES[c.phase].lines.length||!Number.isInteger(c.harvest)||c.harvest<0||typeof c.firstSoul!=='boolean'||!finite(c.finaleElapsed)||!Number.isSafeInteger(c.showerSerial)||c.showerSerial<0||c.phase==='finale'||c.phase==='final_cast'&&c.showerId!==null)throw Error('序章存档损坏，请开始新局');
  if(c.phase==='challenge'&&(!finite(c.challengeStart)||c.challengeStart>raw.state.time||!Number.isInteger(c.challengeSoulBase)||c.challengeSoulBase<0||c.challengeSoulBase>raw.state.souls))throw Error('挑战存档损坏');
  if(raw.state.islands.some(i=>![0,1].includes(i.era)||!finite(i.research||0)))throw Error('文明存档损坏');
  const w=World.restore(json,c.phase==='challenge'?c.challengeStart+P.challengeSeconds:Infinity);Object.setPrototypeOf(w,CampaignWorld.prototype);return w;
 }
 serialize(){if(this.phase==='finale'||this.phase==='final_cast'&&this.pending.length)throw Error('谢幕结束后保存');return super.serialize();}
}
