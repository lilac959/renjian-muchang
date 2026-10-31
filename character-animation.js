// Presentation only: never use the simulation RNG or modify an entity.
export const CLIPS={idle:'Idle',walk:'Walk Forward In Place',run:'Run Forward W Weapons In Place'};
export function appearance(id,country){let h=(Math.imul(id+1,2654435761)^Math.imul(country+1,2246822519))>>>0;return{outfit:h%10,hair:(h>>>5)%4,hat:(h>>>9)%5===0?(h>>>13)%3:-1,phase:(h%997)/997};}
export function visualState(e,speed,moving,hit=false){
 if(e.dead||e.hp<=0)return 'dead';
 if(hit)return 'run';
 if(e.sick>0)return 'idle';
 if(speed>(moving?.025:.055))return e.soldier||e.action==='守卫岛屿'?'run':'walk';
 return 'idle';
}
export function toolFor(e,look){if(!e.adult||e.sick>0)return null;if(e.soldier||e.action==='守卫岛屿')return 'hammer';if(look.outfit%3)return null;return e.country===0?(look.outfit%2?'sickle':'basket_empty'):'basket_empty';}
export function simulationDelta(time,previous){return previous===undefined||time<previous?0:Math.min(.25,time-previous);}
