import test from 'node:test';
import assert from 'node:assert/strict';
import {tutorialButtonSelector as step,TutorialButtonGuidance,hasButtonGuidance} from '../game/tutorial-button-guidance.js';
test('mandatory tutorial choices guide god then skill then rain, then leave the world target free',()=>{
 assert.equal(step({phase:'peace',group:1}), '#gods [data-group="0"]');
 assert.equal(step({phase:'peace',group:0}), '#skills [data-skill="peace"]');
 assert.equal(step({phase:'peace',group:0,skill:'peace'}),null);
 assert.equal(step({phase:'rain',group:0}), '#gods [data-group="1"]');
 assert.equal(step({phase:'rain',group:1}), '#skills [data-skill="weather"]');
 assert.equal(step({phase:'rain',group:1,skill:'weather',weather:'normal'}),'#weather [data-weather="rain"]');
 assert.equal(step({phase:'rain',group:1,skill:'weather',weather:'rain'}),null);
 assert.equal(step({phase:'first_soul',group:1}), '#skills [data-skill="lightning"]');
 assert.equal(step({phase:'final_cast',group:1}), '#skills [data-skill="meteor"]');
 for(const phase of ['grow','harvest','finale','ready','challenge']){assert.equal(step({phase}),null);assert.equal(hasButtonGuidance(phase),false);}
});
function button(dataset={}){const classes=new Set();return {dataset,disabled:false,hiddenAncestor:false,visible:true,closest(){return this.hiddenAncestor?{}:null},getClientRects(){return this.visible?[{}]:[]},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)}};}
test('glow clears on dialogue, pause, hidden or disabled controls, phase exit and DOM replacement',()=>{
 const god=button({group:'0'}),skill=button({skill:'peace'}),selectors={'#gods .active[data-group]':god,'#skills [data-skill="peace"]':skill};
 const guidance=new TutorialButtonGuidance({querySelector:s=>selectors[s]||null});
 const world={phase:'peace',inPrologue:true,dialogue:null,paused:false,cooldowns:{}};
 guidance.update(world);assert.equal(skill.classList.contains('prologue-button-hint'),true);
 for(const blocked of [{dialogue:{}},{paused:true},{phase:'grow'},{inPrologue:false}]){guidance.update({...world,...blocked});assert.equal(skill.classList.contains('prologue-button-hint'),false);guidance.update(world);}
 skill.disabled=true;guidance.update(world);assert.equal(guidance.current,null);skill.disabled=false;
 skill.hiddenAncestor=true;guidance.update(world);assert.equal(guidance.current,null);skill.hiddenAncestor=false;
 skill.visible=false;guidance.update(world);assert.equal(guidance.current,null);skill.visible=true;
 world.cooldowns.peace=2;guidance.update(world);assert.equal(guidance.current,null);world.cooldowns.peace=0;
 guidance.update(world);const replacement=button({skill:'peace'});selectors['#skills [data-skill="peace"]']=replacement;
 guidance.update(world);assert.equal(skill.classList.contains('prologue-button-hint'),false);assert.equal(replacement.classList.contains('prologue-button-hint'),true);
 selectors['#skills .active[data-skill]']=replacement;guidance.update(world);assert.equal(guidance.current,null);
});
