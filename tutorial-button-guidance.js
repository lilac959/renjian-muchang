// Only mandatory button choices are guided; growth/harvest retain free choice.
const STEPS={peace:{group:0,skill:'peace'},rain:{group:1,skill:'weather',weather:'rain'},first_soul:{group:1,skill:'lightning'},final_cast:{group:1,skill:'meteor'}};
export const hasButtonGuidance=phase=>Object.hasOwn(STEPS,phase);
export function tutorialButtonSelector({phase,group,skill,weather}){
 const step=STEPS[phase];if(!step)return null;
 if(Number(group)!==step.group)return `#gods [data-group="${step.group}"]`;
 if(skill!==step.skill)return `#skills [data-skill="${step.skill}"]`;
 if(step.weather&&weather!==step.weather)return `#weather [data-weather="${step.weather}"]`;
 return null;
}
export class TutorialButtonGuidance{
 constructor(root=document){this.root=root;this.current=null;}
 clear(){this.current?.classList.remove('prologue-button-hint');this.current=null;}
 update(world){
  if(!world.inPrologue||world.dialogue||world.paused||!hasButtonGuidance(world.phase)){this.clear();return;}
  const root=this.root,group=root.querySelector('#gods .active[data-group]')?.dataset.group;
  const skill=root.querySelector('#skills .active[data-skill]')?.dataset.skill;
  const weather=root.querySelector('#weather .active[data-weather]')?.dataset.weather;
  const selector=tutorialButtonSelector({phase:world.phase,group,skill,weather});
  let next=selector?root.querySelector(selector):null;
  if(next&&(next.disabled||next.closest('[hidden], [aria-hidden="true"]')||next.classList.contains('unaffordable')||(next.dataset.skill&&world.cooldowns?.[next.dataset.skill]>0)))next=null;
  if(next===this.current)return;
  this.clear();
  if(next&&next.getClientRects().length){this.current=next;next.classList.add('prologue-button-hint');}
 }
}
