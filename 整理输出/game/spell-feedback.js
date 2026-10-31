// Bounded, deterministic presentation: all ages come from simulation time.
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
function ellipse(g,x,y,rx,ry,color,alpha=1){if(rx<=0||ry<=0)return;g.globalAlpha=clamp(alpha);g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill();}
function glow(g,x,y,r,color,alpha){if(r<=0)return;const grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,'transparent');ellipse(g,x,y,r,r,grad,alpha);}
function ring(g,v,p,r,color,alpha,width=2){g.globalAlpha=clamp(alpha);g.strokeStyle=color;g.lineWidth=width;g.beginPath();for(let i=0;i<=48;i++){const a=i/48*TAU,q=v.project({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r});i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);}g.stroke();}
function heart(g,x,y,s,alpha){g.save();g.translate(x,y);g.scale(s,s);g.globalAlpha=clamp(alpha);g.fillStyle='#f0aaa9';g.beginPath();g.moveTo(0,.6);g.bezierCurveTo(-1,-.1,-.7,-1,0,-.4);g.bezierCurveTo(.7,-1,1,-.1,0,.6);g.fill();g.restore();}
function flame(g,x,y,s,t,alpha){g.save();g.translate(x,y);const lean=Math.sin(t*7)*s*.22;g.globalAlpha=clamp(alpha);const grad=g.createLinearGradient(0,0,0,-s*2.8);grad.addColorStop(0,'#c14d27');grad.addColorStop(.45,'#ffac43');grad.addColorStop(1,'#ffeab0');g.fillStyle=grad;g.beginPath();g.moveTo(-s*.55,0);g.bezierCurveTo(-s,-s,lean-s*.2,-s*1.7,lean,-s*2.8);g.bezierCurveTo(lean+s*.8,-s*1.3,s*.9,-s*.3,s*.55,0);g.closePath();g.fill();ellipse(g,0,-s*.35,s*.25,s*.55,'#fff0bd',alpha);g.restore();}
// Four bent strokes read as anger at both overview and close-up scales.
function anger(g,x,y,size,alpha){g.save();g.translate(x,y);g.globalAlpha=clamp(alpha);g.strokeStyle='#bd443b';g.lineWidth=Math.max(1.5,size*.21);g.lineJoin='round';for(let i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2);g.beginPath();g.moveTo(-size*.75,-size*.25);g.lineTo(-size*.28,-size*.25);g.lineTo(-size*.28,-size*.75);g.stroke();g.restore();}g.restore();}
export function drawSpellFeedback(g,v,world,events,scale){
 const s=scale,time=world.time;g.save();g.lineCap='round';
 for(const e of events){const t=time-e.time,p=v.project(e);if(t<0)continue;
  if(e.id==='rage'&&t<.65)for(const a of e.targets||[]){const actor=world.get(a.id);if(!actor||actor.dead)continue;const q=v.project(actor);for(let j=0;j<5;j++){const angle=-Math.PI+j*Math.PI/4;g.globalAlpha=1-t/.65;g.strokeStyle='#cf6650';g.lineWidth=Math.max(1,s*.08);g.beginPath();g.moveTo(q.x+Math.cos(angle)*s*(.25+t*.4),q.y+Math.sin(angle)*s*(.25+t*.4));g.lineTo(q.x+Math.cos(angle)*s*(.4+t*.4),q.y+Math.sin(angle)*s*(.4+t*.4));g.stroke();}}
  if(e.id==='royal-command'&&t<2.4){const king=world.get(e.kingId),origin=king||e;ring(g,v,origin,Math.min(8,t*6),'#f4b555',.8*(1-t/2.4),s*.13);for(const a of e.targets||[]){const actor=world.get(a.id);if(!actor||!actor.soldier)continue;const q=v.project(actor);glow(g,q.x,q.y-s,s*1.2,'#e98d49',.45*(1-t/2.4));}}
  if(e.id==='death'&&t<.65){const u=t/.65;if(e.human){g.save();g.translate(p.x,p.y);g.rotate(e.cause==='lightning'?0:u*.8);g.globalAlpha=1-u;g.fillStyle=e.cause==='lightning'?'#edfaff':'#a89c89';g.beginPath();g.arc(0,-s*.9,s*.18,0,TAU);g.fill();g.fillRect(-s*.17,-s*.7,s*.34,s*.6);g.restore();for(let j=0;j<8;j++)ellipse(g,p.x+Math.sin(j*4)*s*u,p.y-s*.5-Math.cos(j*3)*s*u,s*.05,s*.07,'#d2c3aa',1-u);}else{glow(g,p.x,p.y,s*(.5+u),'#9d83ac',.3*(1-u));}if(e.king){g.save();g.translate(p.x+s*u,p.y-s*(1-u));g.rotate(u*1.8);g.globalAlpha=1-u;g.fillStyle='#edbf51';g.beginPath();g.moveTo(-s*.3,0);g.lineTo(-s*.4,-s*.3);g.lineTo(-s*.12,-s*.15);g.lineTo(0,-s*.4);g.lineTo(s*.12,-s*.15);g.lineTo(s*.4,-s*.3);g.lineTo(s*.3,0);g.closePath();g.fill();g.restore();}}
  if(e.id==='infection'&&t<1&&e.from){const from=v.project(e.from);for(let j=0;j<5;j++){const u=clamp(t*1.4-j*.08);ellipse(g,from.x+(p.x-from.x)*u,from.y+(p.y-from.y)*u-s*Math.sin(u*Math.PI),s*.15,s*.12,'#94aa70',Math.sin(u*Math.PI)*.55);}}
  if((e.id==='recovery'||e.id==='birth')&&t<1.5){ring(g,v,e,t*1.2,e.id==='birth'?'#eec4bb':'#c6e0ac',1-t/1.5,2);for(let j=0;j<7;j++)ellipse(g,p.x+Math.sin(j*4)*s*.6,p.y-t*s*(.7+j%3*.3),s*.07,s*.12,e.id==='birth'?'#e8babb':'#cee8b1',1-t/1.5);}
  if(e.id==='meteor'&&t<.7){
   ring(g,v,e,5,'#f2b371',.3+t*.5,1.5);glow(g,p.x,p.y,s*6,'#ff9b40',t*.35);
   // Satellite fragments land with the main strike: no additional damage events.
   for(let j=0;j<9;j++){const start=j===0?0:(j%4)*.045,u=clamp((t-start)/(.7-start)),a=j*2.4,r=j===0?0:1.2+(j%3)*.9,q=v.project({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r});const x=q.x-(1-u)*Math.min(s*(18+j%3*3),v.w*.28),y=q.y-(1-u)*Math.min(s*(27+j%4*3),v.h*.42),size=s*(j===0?.85:.22+j%3*.08);g.globalAlpha=.9;const tail=g.createLinearGradient(x-Math.min(s*5,65),y-Math.min(s*8,100),x,y);tail.addColorStop(0,'transparent');tail.addColorStop(.7,'#e8793d');tail.addColorStop(1,'#fff1b4');g.strokeStyle=tail;g.lineWidth=size*2;g.beginPath();g.moveTo(x-Math.min(s*5,65),y-Math.min(s*8,100));g.lineTo(x,y);g.stroke();glow(g,x,y,size*5,'#ffad54',.6);ellipse(g,x,y,size,size,'#ffebba');if(j===0){g.globalAlpha=1;g.fillStyle='#765047';g.beginPath();for(let k=0;k<7;k++){const a=k/7*TAU,rr=size*(.55+.12*Math.sin(k*7));k?g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):g.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();g.fill();}}
  }
  if(e.id==='impact'){
   ring(g,v,e,Math.min(5,t*13),'#ffd591',Math.max(0,1-t/0.65),Math.max(1,s*.16));
   if(t<.3)glow(g,p.x,p.y,s*(3+t*16),'#fff0c4',(1-t/.3)*.9);
   for(let j=0;j<28&&t<1.15;j++){const a=j*2.4,u=t/1.15,r=u*(2+j%5*.65),q=v.project({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r}),y=q.y-Math.sin(u*Math.PI)*s*(1+j%4*.6);ellipse(g,q.x,y,s*(.08+j%3*.035),s*.1,j%3?'#bd8152':'#ffdb81',1-u);}
   for(let j=0;j<9&&t<2.4;j++){const a=j*2.4,q=v.project({x:e.x+Math.cos(a)*t*1.7,y:e.y+Math.sin(a)*t*1.7});ellipse(g,q.x,q.y-t*s*.7,s*(.55+t*.6),s*(.35+t*.3),'#8c8172',.2*(1-t/2.4));}
   if(t<5){ring(g,v,e,2.1,'#503d32',.45*(1-t/5),s*.22);for(let j=0;j<8;j++){const a=j*2.4,q=v.project({x:e.x+Math.cos(a)*1.8,y:e.y+Math.sin(a)*1.8});ellipse(g,q.x,q.y,s*.18,s*.07,'#f0a05d',.6*(1-t/5));}}
  }
  if(e.id==='lightning'&&t<.65){const a=e.targets?.slice().sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0]||e,q=v.project(a);glow(g,q.x,q.y-s*.5,s*3,'#d9f6ff',(1-t/.65)*.7);ring(g,v,a,t*3,'#d8f7ff',1-t/.65,2);for(let j=0;j<6;j++){const angle=j*TAU/6;g.globalAlpha=1-t/.65;g.strokeStyle='#d7efff';g.lineWidth=1.5;g.beginPath();g.moveTo(q.x,q.y);g.lineTo(q.x+Math.cos(angle)*s*.7,q.y+Math.sin(angle)*s*.4);g.lineTo(q.x+Math.cos(angle+.4)*s*1.6,q.y+Math.sin(angle+.4)*s*.7);g.stroke();}}
  const colors={bless:'#e5d59a',joy:'#edb5c0',peace:'#d5efca',rage:'#d88565',plague:'#a9bd80',undead:'#c4a4ec'};
  if(colors[e.id]&&e.id!=='rage'&&t<1.2)ring(g,v,e,t*(e.id==='rage'?7:5),colors[e.id],.65*(1-t/1.2),s*.1);
  if(e.id==='peace'&&t<1.5)for(const a of e.targets||[]){const actor=world.get(a.id);if(!actor||actor.dead)continue;const q=v.project(actor);glow(g,q.x,q.y-s*.5,s, '#d9edbf',.4*(1-t/1.5));ring(g,v,actor,.4+t*.4,'#e6eac0',1-t/1.5,1.5);}
  if(e.id==='undead'&&t<2)for(const b of e.corpses||[]){const q=v.project(b);ring(g,v,b,.7+t*.3,'#c5a0ed',1-t/2,2);glow(g,q.x,q.y-s*t,s*1.6,'#ab75d9',.4*(1-t/2));for(let j=0;j<6;j++){const a=j+time*4;ellipse(g,q.x+Math.cos(a)*s*.7,q.y-t*s*2+Math.sin(a)*s*.3,s*.08,s*.12,'#e4d2ff',1-t/2);}}
  if(e.id==='weather'&&e.weather==='rain'&&t<1.4)for(const f of e.extinguished||[]){const q=v.project(f);for(let j=0;j<4;j++)ellipse(g,q.x+Math.sin(j*3)*s*.5,q.y-t*s*(1+j*.2),s*(.4+t*.6),s*(.3+t*.5),'#e4e4d6',.35*(1-t/1.4));}
 }
 for(const f of world.fires){const q=v.project(f),fade=clamp(f.left/.8);glow(g,q.x,q.y,s*3.2,'#ed7a35',.28*fade);for(let j=0;j<9;j++){const a=j*2.4,r=.35+j%3*.65,pt=v.project({x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r});flame(g,pt.x,pt.y,s*(.25+j%3*.1),time+j,fade);const u=(time*.7+j*.137)%1;ellipse(g,pt.x+Math.sin(j+time)*s*.3,pt.y-u*s*3,s*.06,s*.09,'#ffd78a',(1-u)*fade);}}
 // State feedback follows living recipients, including infections acquired later.
 for(const a of world.entities){if(a.dead||a.inside)continue;const q=v.project(a),phase=time+a.id*.73;
  const weather=world.islands?.[a.country]?.weather;if(weather?.left>0){const u=(phase*.4)%1;if(weather.kind==='cold')ellipse(g,q.x+s*(.15+u*.5),q.y-s*.9-u*s*.2,s*(.08+u*.2),s*.1,'#e5ece5',.3*(1-u));if(weather.kind==='hot')ellipse(g,q.x+s*.25,q.y-s*(1-u*.5),s*.04,s*.09,'#b5d9de',Math.sin(u*Math.PI)*.7);}
  if(a.king&&a.commanding){anger(g,q.x+s*.42,q.y-s*.15,Math.max(4,Math.min(12,s*.22)),.85);ring(g,v,a,.65,'#c9984d',.25+.12*Math.sin(time*4),1.5);}
  if(a.sick>0){for(let j=0;j<2;j++){const u=(phase*.4+j*.5)%1;ellipse(g,q.x+Math.sin(phase+j)*s*.35,q.y-u*s*1.4,s*(.2+u*.2),s*.2,'#859768',.3*(1-u));}}
  else if(a.soldier&&!a.returning){const pulse=.5+.5*Math.sin(phase*3);anger(g,q.x+s*.25,q.y-s*(.15+pulse*.03),Math.max(4,Math.min(12,s*.24)),.7+pulse*.3);glow(g,q.x,q.y-s*.45,s*.55,'#bf5140',.05+pulse*.08);}
  if(a.bless>0&&a.adult&&!a.sick&&!a.soldier){const u=(phase*.55)%1;glow(g,q.x,q.y-s*.4,s*.8,'#edcf79',.12);ellipse(g,q.x+Math.sin(phase)*s*.35,q.y-u*s*1.6,s*.07,s*.13,'#f6dda0',1-u);}
  if(a.joy>0&&a.adult){const u=(phase*.32)%1;heart(g,q.x+Math.sin(phase)*s*.25,q.y-s*(.9+u),s*.23,Math.sin(u*Math.PI)*.8);}
  if(a.kind==='undead'){ring(g,v,a,.4,'#b694d5',.4,1);glow(g,q.x,q.y-s*.5,s*.7,'#ad82d5',.2);}
 }
 // A recognizable spirit rises first, then curves into the soul bottle.
 for(const e of world.effects){if(!e.soul)continue;const age=1.8-e.life,u=clamp((age-.55)/1.25),ease=u*u,q=v.project(e),target=v.soulTarget||{x:v.w*.8,y:35},x=q.x+(target.x-q.x)*ease+Math.sin(age*6+e.x)*s*.15*(1-u),y=q.y-s*(.6+Math.min(age,.55)*1.8)+(target.y-q.y+s*1.6)*ease-Math.sin(u*Math.PI)*s*3,sz=Math.max(3,s*.32)*(1-u*.6),alpha=clamp(e.life/.2);glow(g,x,y,sz*4,'#bceee7',alpha*.5);g.globalAlpha=alpha*.75;g.strokeStyle='#c7f5e9';g.lineWidth=sz*.7;g.beginPath();g.moveTo(x,y+sz);g.quadraticCurveTo(x-Math.sin(age*7)*sz,y+sz*3,x-sz*.4,y+sz*4);g.stroke();ellipse(g,x,y,sz,sz*1.2,'#e4fff2',alpha);ellipse(g,x-sz*.3,y-sz*.1,sz*.12,sz*.17,'#588f99',alpha);ellipse(g,x+sz*.3,y-sz*.1,sz*.12,sz*.17,'#588f99',alpha);}
 g.restore();
}
