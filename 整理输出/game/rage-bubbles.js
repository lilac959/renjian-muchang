const clamp=x=>Math.max(0,Math.min(1,x));
export function drawRageBubbles(g,v,world,scale){
 const states=v.rageBubbles??=new Map(),active=new Set(),time=world.time,placed=[];
 for(const a of world.entities){if(a.dead||a.inside||!(a.commanding||a.soldier&&!a.returning))continue;active.add(a.id);let state=states.get(a.id);if(!state||time<state.born){state={born:time};states.set(a.id,state);}Object.assign(state,{x:a.x,y:a.y,king:!!a.commanding,exit:null});}
 for(const [id,state]of states){if(!active.has(id)){state.exit??=time;if(time-state.exit>.22){states.delete(id);continue;}}const age=time-state.born,fade=state.exit===null?1:1-clamp((time-state.exit)/.22),pop=age<.3?.6+.4*clamp(age/.16)+.12*Math.sin(clamp(age/.3)*Math.PI):1;
 const anchor=v.project(state),r=Math.max(12,Math.min(20,scale*.25))*(state.king?1.13:1)*pop*fade;
 let x=anchor.x,y=anchor.y-r-9-Math.sin(time*2+id)*1.5;
 if(age<.45)x+=Math.sin(age*36)*3*(1-age/.45);
 for(let pass=0;pass<4;pass++)for(const p of placed)if(Math.abs(x-p.x)<r+p.r+3&&Math.abs(y-p.y)<r+p.r+3){x+=(id%2?1:-1)*(r*.8);y-=r*.6;}
 placed.push({x,y,r});g.save();g.globalAlpha=fade;g.fillStyle='#b83c3d';g.strokeStyle=state.king?'#f6ce72':'#fff0d8';g.lineWidth=2.3;
 g.beginPath();g.moveTo(x-r*.3,y+r*.65);g.lineTo(anchor.x,anchor.y-2);g.lineTo(x+r*.3,y+r*.65);g.closePath();g.fill();g.stroke();g.beginPath();g.ellipse(x,y,r,r*.85,0,0,Math.PI*2);g.fill();g.stroke();
 const sy=state.king?y+r*.19:y;g.strokeStyle='#fff1df';g.lineWidth=Math.max(2,r*.15);g.lineCap='round';g.lineJoin='round';for(let j=0;j<4;j++){g.save();g.translate(x,sy);g.rotate(j*Math.PI/2);g.beginPath();g.moveTo(-r*.49,-r*.15);g.lineTo(-r*.17,-r*.15);g.lineTo(-r*.17,-r*.47);g.stroke();g.restore();}
 if(state.king){g.fillStyle='#ffdb82';g.beginPath();g.moveTo(x-r*.4,y-r*.22);g.lineTo(x-r*.45,y-r*.6);g.lineTo(x-r*.15,y-r*.43);g.lineTo(x,y-r*.72);g.lineTo(x+r*.15,y-r*.43);g.lineTo(x+r*.45,y-r*.6);g.lineTo(x+r*.4,y-r*.22);g.closePath();g.fill();}g.restore();
 }
}
