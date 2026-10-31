import {GOD_LABELS,PROLOGUE as P} from './prologue-data.js';
export class PrologueView {
 constructor({changed,focus,continueGame,project}){
  Object.assign(this,{changed,focus,continueGame,project,key:'',typed:0,guardUntil:0,world:null});
  this.root=document.createElement('section');this.root.id='prologue';this.root.hidden=true;
  this.root.innerHTML=`<div class="prologue-task" hidden><span role="status"></span><button class="locate">定位目标</button><button class="skip-prologue">直接开始挑战</button></div><div class="prologue-beacon" hidden>国王 ↓</div><div class="prologue-dialogue" role="dialog" aria-modal="true" aria-label="神明对话" hidden><div class="prologue-portraits"><img class="portrait-left" alt=""><img class="portrait-right" alt=""></div><section class="prologue-panel"><strong class="speaker"></strong><p class="line" aria-live="off"></p><div class="prologue-actions"><button class="skip-dialogue">略过这段对话</button><button class="next-line">继续</button></div></section></div><div class="prologue-finale" hidden><h1>神明也疯狂</h1><button class="continue-challenge" hidden>继续游戏 · 开始限时收魂</button></div>`;
  document.body.append(this.root);this.task=this.root.querySelector('.prologue-task');this.dialog=this.root.querySelector('.prologue-dialogue');this.finale=this.root.querySelector('.prologue-finale');this.beacon=this.root.querySelector('.prologue-beacon');
  this.root.querySelector('.next-line').onclick=e=>{e.stopPropagation();this.advance();};
  this.root.querySelector('.skip-dialogue').onclick=e=>{e.stopPropagation();this.advance(true);};
  this.root.querySelector('.locate').onclick=()=>this.focus(this.world.focusPoint());
  this.root.querySelector('.skip-prologue').onclick=()=>{if(this.world?.inPrologue){this.guardUntil=performance.now()+200;this.continueGame();}};
  this.root.querySelector('.continue-challenge').onclick=()=>{this.guardUntil=performance.now()+200;this.continueGame();};
 }
 get blocksInput(){return !!this.world?.inPrologue&&(!!this.world.dialogue||['finale','ready'].includes(this.world.phase))||performance.now()<this.guardUntil;}
 advance(skip=false){
  if(!this.world?.dialogue||performance.now()<this.guardUntil)return;
  const text=this.world.dialogue.text;
  if(!skip&&this.typed<text.length){this.typed=text.length;this.paintText();return;}
  this.guardUntil=performance.now()+160;this.world.advanceDialogue(skip);this.changed();
 }
 keydown(e){if(!this.world?.inPrologue)return false;if(this.world.dialogue&&['Space','Enter','NumpadEnter'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)this.advance();return true;}if(this.world.dialogue||['finale','ready'].includes(this.world.phase)){if(e.code==='Space'||e.key==='Escape'){e.preventDefault();return true;}}return false;}
 paintText(){const text=this.world?.dialogue?.text||'';this.root.querySelector('.line').textContent=text.slice(0,Math.floor(this.typed));this.root.querySelector('.next-line').textContent=this.typed>=text.length?'继续 ▸':'显示全文';}
 update(world,dt,camera){
  this.world=world;this.root.hidden=!world.inPrologue;if(!world.inPrologue){this.key='';return;}
  const key=world.phase+':'+world.campaign.line;
  if(key!==this.key){this.key=key;this.typed=0;
   if(world.dialogue){const d=world.dialogue;this.root.querySelector('.speaker').textContent=GOD_LABELS[d.speaker];for(const side of ['left','right']){const img=this.root.querySelector('.portrait-'+side),god=d[side];img.hidden=!god;if(god){img.src=`assets/gods/portraits/${god}.png`;img.alt=GOD_LABELS[god];img.classList.toggle('listener',god!==d.speaker);}}this.root.querySelector('.next-line').focus({preventScroll:true});}
   if(world.phase==='finale'){this.zoomFrom={...camera};}
   this.changed();
  }
  const dialogue=world.dialogue,cinematic=['finale','ready'].includes(world.phase);
  this.dialog.hidden=!dialogue;this.finale.hidden=!cinematic;this.task.hidden=!!dialogue||cinematic;
  if(dialogue){this.typed=Math.min(dialogue.text.length,this.typed+dt*P.charactersPerSecond);this.paintText();}
  if(!this.task.hidden){this.task.querySelector('span').textContent=world.objective();this.root.querySelector('.locate').hidden=world.phase==='grow';}
  this.beacon.hidden=world.phase!=='peace';if(!this.beacon.hidden){const p=this.project(world.focusPoint());this.beacon.style.left=p.x+'px';this.beacon.style.top=(p.y-25)+'px';}
  if(cinematic){const t=world.campaign.finaleElapsed;this.finale.style.backgroundColor=`rgba(0,0,0,${world.phase==='ready'?1:Math.max(0,Math.min(1,(t-2.2)/1.1))})`;this.finale.querySelector('h1').style.opacity=world.phase==='ready'?1:Math.max(0,Math.min(1,(t-3.3)/1.4));this.root.querySelector('.continue-challenge').hidden=world.phase!=='ready';
   if(world.phase==='finale'&&world.campaign.finalePoint&&this.zoomFrom){const f=Math.min(1,t/2.2),e=f*f*(3-2*f);for(const k of ['x','y'])camera[k]=this.zoomFrom[k]+(world.campaign.finalePoint[k]-this.zoomFrom[k])*e;camera.zoom=this.zoomFrom.zoom+(4-this.zoomFrom.zoom)*e;}
  }
 }
}
