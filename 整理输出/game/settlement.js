import {QINGHE,islandId,groundHeight,nearestWalkable} from './island-layout.js';
import {CONFIG as C,SETTLEMENT as S} from './config.js';

const center = bounds => ({x:(bounds[0][0]+bounds[1][0])/2,y:(bounds[0][1]+bounds[1][1])/2});
const rect = (p,w,h) => ({min:[p.x-w/2,p.y-h/2],max:[p.x+w/2,p.y+h/2]});
const overlaps=(a,b,gap=0)=>a.min[0]<b.max[0]+gap&&a.max[0]>b.min[0]-gap&&a.min[1]<b.max[1]+gap&&a.max[1]>b.min[1]-gap;
const sourceName=o=>o.name.replace(/\.\d{3}$/, '');
export const authoredRoad=o=>/^Path(?: Edge| \|)/.test(o.name)||(o.collections||[]).some(c=>c.startsWith('02 |'));
function fixedLots(){
 const homes=QINGHE.objects.filter(o=>o.name.startsWith('Cottage '));
 const specials=[['Village Hall | MH_Church_01','hall'],['Academy | MH_School_01','academy'],['Granary | MH_Granary_01','granary'],['Windmill | MH_Windmill_02','windmill']];
 const definitions=[...homes.map(o=>[o,'house']),...specials.map(([name,kind])=>[QINGHE.objects.find(o=>sourceName(o)===name),kind]),...QINGHE.objects.filter(o=>/^Wheat Plot \d+$/.test(sourceName(o))).map(o=>[o,'field'])];
 return definitions.filter(([o])=>o).map(([o,kind],i)=>({id:'farm-fixed-'+i,zone:kind==='field'?'field':'house',special:kind==='house'||kind==='field'?null:kind,
  kind:kind==='field'?'field':'house',source:'authored',sourceNames:QINGHE.objects.filter(p=>p.name===o.name||sourceName(p).startsWith(sourceName(o)+'_')||(kind==='field'&&p.name.startsWith('Wheat '+String(Number(sourceName(o).slice(-2))+1).padStart(2,'0')+' |'))).map(p=>p.name),
  ...center(o.bounds),footprint:{min:o.bounds[0].slice(0,2),max:o.bounds[1].slice(0,2)},state:'planned',progress:0,clearProgress:0,workers:[],upgradeProgress:0}));
}
// Source scene coordinates are read-only. Houses extend north; fields extend south.
// All authored footprints and roads stay reserved even before their buildings exist.
function extensionLots(authored){
 const reserved=[...QINGHE.obstacles,...QINGHE.objects.filter(authoredRoad).map(o=>({min:o.bounds[0].slice(0,2),max:o.bounds[1].slice(0,2)})),...authored.map(l=>l.footprint)];
 const lots=[];
 for(const [zone,area] of Object.entries(S.expansion)){
  let serial=0;
  for(let y=area.minY;y<=area.maxY+.001;y+=area.spacing)for(let x=area.minX;x<=area.maxX+.001;x+=area.spacing){
   const p={x,y},r=rect(p,area.size,area.size);
   const probes=[p];
   for(const xx of [r.min[0],r.max[0]])for(const yy of [r.min[1],r.max[1]])probes.push({x:xx,y:yy});
   if(probes.some(q=>islandId(q)!==0||groundHeight(q)<-.12)||reserved.some(o=>overlaps(r,o,.35)))continue;
   if(!nearestWalkable(p,0))continue;
   lots.push({id:`farm-${zone}-extension-${++serial}`,zone,kind:zone,source:'extension',sourceNames:[],...p,footprint:r,state:'planned',progress:0,clearProgress:0,workers:[],upgradeProgress:0,special:null});
   reserved.push(r);
  }
 }
 return lots;
}
const authored=fixedLots();
export const FARM_LOTS=Object.freeze([...authored,...extensionLots(authored)].map(l=>Object.freeze(l)));
export function initSettlement(w,c){
 if(c.id!==0)return;
 c.buildings=structuredClone(FARM_LOTS);c.buildCheck=0;c.research=0;
 for(const zone of ['house','field'])for(const lot of c.buildings.filter(l=>l.zone===zone&&l.source==='authored').slice(0,zone==='house'?S.initialHouses:S.initialFields))lot.state='complete';
}
export const complete=(c,kind)=>c.buildings?.filter(b=>b.state==='complete'&&b.kind===kind)||[];
export const housing=c=>c.id===0?complete(c,'house').filter(b=>!b.upgrading).length*S.houseCapacity:Infinity;
export function nextLot(c,zone){
 const authored=c.buildings.filter(b=>b.zone===zone&&b.source==='authored');
 return authored.find(b=>b.state==='planned')||(!authored.some(b=>b.state!=='complete')?c.buildings.find(b=>b.zone===zone&&b.source==='extension'&&b.state==='planned'):undefined);
}
export function builders(w,c){const active=c.buildings?.find(b=>b.state==='clearing'||b.state==='building');return active?active.workers.filter(id=>w.get(id)&&w.available(w.get(id))):[];}
export function advanceSettlement(w,c,dt){
 if(c.id!==0)return;
 let job=c.buildings.find(b=>b.state==='clearing'||b.state==='building'||b.upgrading);
 if(job){
  const eligible=w.adults(c).filter(e=>w.available(e)&&e.role==='civilian');
  job.workers=eligible.slice(0,S.builders).map(e=>e.id);
  for(const id of job.workers)w.get(id).workSite=job.id;
  const threat=w.animals.find(a=>!a.dead&&a.kind==='beast'&&Math.hypot(a.x-job.x,a.y-job.y)<S.beastBlockRadius);
  if(threat)for(const id of job.workers){const worker=w.get(id);w.move(worker,threat,dt,2);if(Math.hypot(worker.x-threat.x,worker.y-threat.y)<1.4&&worker.attack<=0){w.damage(threat,S.huntDamage,'hunting');worker.attack=S.huntInterval;}}
  if(job.upgrading){
   if(job.workers.length&&w.housing(c)>=w.humans(c.id).length)job.upgradeProgress+=dt;
   if(job.upgradeProgress>=S.upgradeSeconds){job.kind=job.special;job.upgrading=false;job.workers=[];w.change('building-promoted',{country:0,buildingId:job.id,kind:job.kind,placeholder:'house'});job=null;}
  }else if(job.workers.length&&!threat){
   const key=job.state==='clearing'?'clearProgress':'progress';job[key]+=dt*job.workers.length/S.builders;
   for(const id of job.workers){const e=w.get(id);e.workSite=job.id;}
   if(job.state==='clearing'&&job.clearProgress>=S.clearSeconds){job.state='building';w.change('construction-started',{country:c.id,buildingId:job.id});}
   if(job.state==='building'&&job.progress>=S.buildSeconds){job.state='complete';job.workers=[];w.change('construction-completed',{country:c.id,buildingId:job.id,kind:job.kind});job=null;}
  }
 }
 for(const e of w.humans(c.id))if(e.workSite&&!job?.workers.includes(e.id))e.workSite=null;
 c.buildCheck-=dt;if(c.buildCheck>0||job||!w.humans(c.id).length)return;c.buildCheck=S.planInterval;
 const pop=w.humans(c.id).length,capacity=w.housing(c),workers=w.workers(c).length;
 const spareForSpecial=c.buildings.some(b=>b.state==='complete'&&b.kind==='house'&&b.special&&pop>=S.specials[b.special].population&&w.production(c)>=w.consumption(c)*S.specials[b.special].productionMargin&&w.supply(c)>=S.specials[b.special].reserveSeconds&&capacity-S.houseCapacity<pop);
 const needsHomes=pop>=capacity*S.houseBuildOccupancy&&(capacity<w.populationLimit||spareForSpecial&&capacity<pop+S.houseCapacity);
 const fieldCapacity=complete(c,'field').length*S.workersPerField;
 const needsFields=fieldCapacity<workers&&(fieldCapacity*C.foodRate*w.climate(c).field<w.consumption(c)*S.foodMargin||w.supply(c)<S.foodReserveSeconds);
 // Replace a reserved placeholder in place only when its beds can be spared.
 for(const b of c.buildings.filter(b=>b.state==='complete'&&b.kind==='house'&&b.special)){
  const threshold=S.specials[b.special];
  if(pop<threshold.population||capacity-S.houseCapacity<pop||w.production(c)<w.consumption(c)*threshold.productionMargin||w.supply(c)<threshold.reserveSeconds)continue;
  if(c.food<threshold.cost+w.consumption(c)*S.buildReserveSeconds||workers<=S.builders)continue;
  c.food-=threshold.cost;b.upgrading=true;b.workers=[];w.change('building-upgrade-started',{country:0,buildingId:b.id,kind:b.special});return;
 }
 const lot=nextLot(c,needsHomes?'house':needsFields?'field':'');
 if(lot&&workers>S.builders&&c.food>=S.buildFood+w.consumption(c)*S.buildReserveSeconds){
  c.food-=S.buildFood;lot.state=lot.source==='extension'?'clearing':'building';lot.progress=0;lot.clearProgress=0;
  w.change('construction-planned',{country:0,buildingId:lot.id,source:lot.source,x:lot.x,y:lot.y});
 }
}
export function settlementSnapshot(c){return(c.buildings||[]).map(b=>({id:b.id,country:0,kind:b.kind,zone:b.zone,source:b.source,sourceNames:[...b.sourceNames],promotionTarget:b.special,x:b.x,y:b.y,state:b.state,progress:Math.min(1,b.progress/S.buildSeconds),clearProgress:Math.min(1,b.clearProgress/S.clearSeconds),upgrading:!!b.upgrading,upgradeProgress:Math.min(1,b.upgradeProgress/S.upgradeSeconds),footprint:structuredClone(b.footprint)}));}
