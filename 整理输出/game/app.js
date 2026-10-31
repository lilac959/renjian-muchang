import {CameraControls,DEFAULT_CAMERA} from './camera-controls.js';
import {WorldView} from './scene.js';
import {World,distance} from './engine.js';
import {CONFIG as C,SKILLS,CLIMATE} from './config.js';
const $=id=>document.getElementById(id),canvas=$('world'),view=new WorldView(canvas);
let world=new World(),running=false,group=0,selected=null,target=null,lastFrame=0,lastSave=0,resultShown=false,lastSoul=0;
let camera={...DEFAULT_CAMERA},settings={sound:true,vibration:true},saved=null,toastEnd=0,audio=null;
const saveKey='rjmc-save-v5';
try{settings={...settings,...JSON.parse(localStorage.getItem('rjmc-settings')||'{}')};saved=localStorage.getItem(saveKey);if(saved)World.restore(saved);else if((localStorage.getItem('rjmc-save-v4')||localStorage.getItem('rjmc-save-v2')))setTimeout(()=>toast('旧版存档不兼容，请开始新局'),0);}catch{saved=null;}
$('continue').hidden=!saved;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;toastEnd=performance.now()+C.toastMs;}
function sound(f=500){if(!settings.sound)return;try{audio||=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.2);}catch{}}
function resize(){view.renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));view.resize(innerWidth,innerHeight);if(innerWidth<innerHeight&&running){world.paused=true;save();}}
window.addEventListener('resize',resize);resize();
function save(){if(!running||world.result)return;try{saved=world.serialize();localStorage.setItem(saveKey,saved);lastSave=world.time;world.saveRequested=false;$('saveStatus').textContent='已保存';setTimeout(()=>$('saveStatus').textContent='',1200);}catch{if(!world.pending.length)toast('保存失败，请检查浏览器存储');}}
function modal(html,actions){$('dialogBody').innerHTML=html;$('dialogActions').replaceChildren();for(const a of actions){const b=document.createElement('button');b.textContent=a.label;if(a.primary)b.className='primary';b.onclick=a.action;$('dialogActions').append(b);}$('dialog').hidden=false;}
function close(){ $('dialog').hidden=true; }
function resume(){close();world.paused=innerWidth<innerHeight;}
function help(){world.paused=true;modal(`<h2>养育 · 出征 · 收魂</h2><p>双岛居民自动产粮和繁衍。孩子长大后加入生产，不需要建房或分配工人。</p><p>选择技能 → 点击落点预览 → 点击施放。暴怒让少量成年人跨桥出征，和解使双方停战返乡。</p><p>实际死亡1人，获得1魂和${C.soulMana}灵力。羊是牧场装饰，亡灵不会重复计魂。${C.duration/60}分钟内收集${C.goal}魂。</p><p>保留成年人口与粮食，才能持续恢复。左键或单指拖动平移；右键拖动旋转与俯仰；滚轮缩放。双指捏合缩放、扭转旋转、同向上下滑动调整俯仰。点击“复位视角”回到全景；菜单中可暂停观察，切后台自动暂停。</p>`,[{label:'开始／继续',primary:true,action:resume}]);}
function menu(){if(!running||world.result)return;world.paused=true;modal('<h2>人间暂歇</h2><p>时间、生产与战争已暂停。</p>',[{label:'继续游戏',primary:true,action:resume},{label:'暂停观察',action:()=>{close();toast('已暂停，可旋转、缩放和拖动镜头');}},{label:'玩法说明',action:help},{label:'音效：'+(settings.sound?'开':'关'),action:()=>{settings.sound=!settings.sound;try{localStorage.setItem('rjmc-settings',JSON.stringify(settings));}catch{}menu();}},{label:'重新开始',action:()=>modal('<h2>重新开始？</h2><p>当前对局将被替换。</p>',[{label:'取消',action:menu},{label:'开始新局',action:()=>begin(false)}])},{label:'保存并返回',action:home}]);}
function home(){if(world.pending.length){toast('请继续游戏，陨石落地后再保存返回');return;}save();running=false;world.paused=true;close();$('home').hidden=false;$('hud').hidden=true;$('continue').hidden=!saved;}
function begin(load=false){if(!view.ready){toast('岛屿尚未加载完成');return;}try{world=load?World.restore(saved):new World();}catch(e){toast(e.message);return;}running=true;resultShown=false;selected=null;target=null;group=0;controls.reset(false);lastSoul=world.souls;lastSave=world.time;$('home').hidden=true;$('hud').hidden=false;$('detail').hidden=true;close();buildSkills();if(load)menu();else help();}
function buildSkills(){document.querySelectorAll('[data-group]').forEach(b=>b.classList.toggle('active',+b.dataset.group===group));$('skills').replaceChildren();for(const s of SKILLS.filter(s=>s.group===group)){const b=document.createElement('button');b.className='skill';b.id='skill-'+s.id;b.title=s.desc;b.setAttribute('aria-label',`${s.name}，${s.cost}灵力`);b.innerHTML=`<span class="icon"><img src="./assets/ui/skill-${s.id}.svg" alt=""></span><span class="label">${s.name}</span><span class="cost">${s.cost}✦</span><span class="cooldown"></span>`;let held=false,timer;b.onpointerdown=()=>{held=false;timer=setTimeout(()=>{held=true;detail(`<h3>${s.name}</h3><p>${s.desc}</p><p>${s.cost}灵力 · 冷却${s.cd}秒</p>`);},C.longPress);};b.onpointerup=b.onpointercancel=b.onpointerleave=()=>clearTimeout(timer);b.onclick=()=>{if(held)return;selected=selected===s.id?null:s.id;target=null;$('detail').hidden=true;sound(380);updateUI();};$('skills').append(b);}updateUI();}
function detail(html){$('detail').innerHTML='<button aria-label="关闭详情">×</button>'+html;$('detail').firstChild.onclick=()=>$('detail').hidden=true;$('detail').hidden=false;}
const weather=()=>$('weatherKind').value;
function preview(){const s=SKILLS.find(s=>s.id===selected);if(!s||!target)return '';const error=world.validate(selected,target,weather());if(error)return error;const n=world.legalTargets(selected,target,s.r).length,c=world.islandAt(target);let summary=`影响${n}名居民`;
 if(selected==='rage')summary=`出征${Math.min(C.warSize,world.workers(c).filter(e=>distance(e,target)<=s.r).length,world.workers(c).length-C.keepAdults)}人，保留至少${C.keepAdults}名劳动力`;
 if(selected==='peace')summary=`双方停战返乡，保护${C.truceSeconds}秒`;
 if(selected==='weather')summary=`${c.name}：产粮×${CLIMATE[weather()].field}，繁衍×${CLIMATE[weather()].human}`;
 if(selected==='undead')summary=`消耗${Math.min(C.undeadLimit,world.corpses.filter(b=>b.life>0&&distance(b,target)<=s.r).length)}具尸体，不重复计魂`;
 if(selected==='lightning')summary='击杀最近1名居民';
 if(['meteor','lightning','plague','undead'].includes(selected)&&world.islands.some(c=>world.adults(c).length<=C.keepAdults&&world.targets(target,s.r).some(e=>e.country===c.id&&e.adult)))summary+=' · 可能中断人口恢复';
 return summary+` · 消耗${s.cost}灵力`;
}
function cast(){if(!selected||!target)return;const r=world.cast(selected,target,weather());toast(r.message);sound(r.ok?600:150);if(r.ok&&settings.vibration)navigator.vibrate?.(15);updateUI();}
function countryDetail(c){detail(`<h3>${c.name}</h3>人口 ${world.humans(c.id).length} · 成年 ${world.adults(c).length}<br>生产劳动力 ${world.workers(c).length}<br>粮食 ${Math.floor(c.food)} · 每秒净变化 ${world.netFood(c).toFixed(1)}<br>${world.birthReason(c)}<br>战争：${armyText(c)}<p>劳动力自动生产；没有住房、军粮或岗位前置。</p>`);}
function armyText(c){if(!c.army)return world.truce>0?`停战保护${Math.ceil(world.truce)}秒`:'和平';const n=c.army.ids.filter(id=>world.get(id)?.soldier).length;return `${n}人${c.army.returning?'返乡中':`出征 · ${Math.ceil(c.army.left)}秒`}`;}
function updateUI(){if(!running)return;$('goal').textContent=C.goal;$('souls').textContent=world.souls;$('mana').textContent=Math.floor(world.mana);const left=Math.ceil(C.duration-world.time);$('timer').textContent=`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;$('progress').style.width=Math.min(100,world.souls/C.goal*100)+'%';$('paused').hidden=!world.paused||!$('dialog').hidden;
 if(!$('countries').children.length)for(const c of world.islands){const b=document.createElement('button');b.className='country';b.onclick=()=>{const island=world.islands[c.id];controls.focus(island.x,island.y);countryDetail(island);};$('countries').append(b);}
 [...$('countries').children].forEach((b,i)=>{const c=world.islands[i],supply=world.supply(c),rate=world.netFood(c);b.innerHTML=`<strong>${c.name}</strong><div class="stats"><span>人口 ${world.humans(i).length}</span><span>口粮 ${Number.isFinite(supply)?Math.floor(supply)+'秒':'—'}</span><span>${rate>=0?'↑':'↓'}${Math.abs(rate).toFixed(1)}/秒</span></div><div class="climate">${world.birthReason(c)} · ${armyText(c)}${c.weather.left>0?' · '+$('weatherKind').querySelector(`[value="${c.weather.kind}"]`).textContent+' '+Math.ceil(c.weather.left)+'秒':''}</div>`;});
 for(const s of SKILLS.filter(s=>s.group===group)){const b=$('skill-'+s.id);if(!b)continue;b.classList.toggle('active',selected===s.id);b.classList.toggle('unaffordable',world.mana<s.cost);b.querySelector('.cooldown').textContent=world.cooldowns[s.id]>0?Math.ceil(world.cooldowns[s.id])+'s':'';}
 $('weather').hidden=selected!=='weather';$('targetPanel').hidden=!selected||!target||!$('detail').hidden;$('hint').textContent=selected?SKILLS.find(s=>s.id===selected).name+'：点位置预览，再施放':'选择神力，维持人口或收魂';
 if(selected&&target){$('targetInfo').textContent=preview();$('cast').disabled=!!world.validate(selected,target,weather());}
 const danger=world.islands.find(c=>world.humans(c.id).length&&world.supply(c)<8);$('warning').hidden=!danger;if(danger){$('warning').textContent=`${danger.name}口粮不足：用增产技能或减少消耗`;$('warning').onclick=()=>countryDetail(danger);}
 if(world.result&&!resultShown){resultShown=true;saved=null;try{localStorage.removeItem(saveKey);}catch{}const success=world.result==='success';modal(`<h2>${success?'挑战成功':world.result==='extinct'?'人类灭绝':'期限届满'}</h2><div class="result-number">${world.souls}<small> / ${C.goal} 魂</small></div><p>出生${world.births}人 · 存活${world.humans().length}人 · 用时${Math.floor(world.time)}秒</p><p>${success?'养育与收魂完成了一轮循环。':'保留生产人口，尝试分批收魂，并用和解及时结束战争。'}</p>`,[{label:'再来一局',primary:true,action:()=>begin()},{label:'返回主界面',action:home}]);}
}
const controls=new CameraControls(canvas,camera,{
 enabled:()=>running&&$('dialog').hidden&&!world.result,
 project:p=>{view.cameraAt(camera);return view.panPoint(p);},
 threshold:C.dragPixels,
 onTap:p=>{if(world.paused&&selected)return;view.cameraAt(camera);const hit=view.pick(p),loc=hit?.kind?{x:hit.x,y:hit.y}:view.unproject(p);if(!loc)return;if(selected){target=loc;$('detail').hidden=true;}else if(hit?.kind){detail(`<h3>${hit.kind==='human'?'居民':'亡灵'}</h3>生命 ${Math.ceil(hit.hp)}<br>${hit.action}<br>${hit.adult?'成年':'成长还需'+Math.ceil(C.growthSeconds-hit.growth)+'秒'}${hit.sick>0?'<br>病程剩余'+Math.ceil(hit.sick)+'秒':''}`);}else{const c=world.islandAt(loc);if(c)countryDetail(c);else $('detail').hidden=true;}updateUI();}
});
$('resetView').onclick=()=>controls.reset();
$('start').onclick=()=>begin();$('continue').onclick=()=>begin(true);$('menu').onclick=menu;$('pause').onclick=menu;$('cast').onclick=cast;$('cancel').onclick=()=>{selected=null;target=null;updateUI();};$('weatherKind').onchange=updateUI;
document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{group=+b.dataset.group;selected=null;target=null;buildSkills();});
document.addEventListener('keydown',e=>{if(e.target.matches('select,input'))return;if(e.key==='Escape'){if(selected){selected=null;target=null;updateUI();}else menu();}if(e.code==='Space'&&running&&!world.result){e.preventDefault();if(world.paused&& !$('dialog').hidden)resume();else menu();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){world.paused=true;controls.clear();save();}else if(running)toast('已暂停，点菜单继续');});window.addEventListener('pagehide',save);
let uiTime=0;
function frame(now){const dt=lastFrame?Math.min(.25,(now-lastFrame)/1000):0;lastFrame=now;if(running&&!world.paused){world.step(dt);if(world.time-lastSave>=C.saveInterval||world.saveRequested&&!world.pending.length)save();}
 if(world.souls>lastSoul){sound(830);for(const id of ['souls','mana'])$(id).animate([{transform:'scale(1.2)'},{transform:'scale(1)'}],{duration:350});lastSoul=world.souls;}
 if(now>toastEnd){$('toast').hidden=true;if(world.events.length)toast(world.events.shift().text);}
 controls.update(dt);view.render(world,camera,SKILLS.find(s=>s.id===selected),target);uiTime+=dt;if(uiTime>.12){updateUI();uiTime=0;}requestAnimationFrame(frame);}
requestAnimationFrame(frame);

async function loadIsland(){const panel=$('assetLoading');panel.hidden=false;$('assetRetry').hidden=true;$('assetStatus').textContent='正在载入青禾岛…';$('start').disabled=true;$('continue').disabled=true;try{await view.load();panel.hidden=true;$('start').disabled=false;$('continue').disabled=false;}catch(error){console.error('Island load failed',error);$('assetStatus').textContent='岛屿加载失败，请重试。游戏尚未开始。';$('assetRetry').hidden=false;}}
$('assetRetry').onclick=loadIsland;loadIsland();
