import data from './assets/islands/v09/layout-data.js';
export const QINGHE=data;
export const BRIDGE=data.bridge;
const grid=data.grid;
function cell(x,y){const i=Math.round((x-grid.x)/grid.step),j=Math.round((y-grid.y)/grid.step);return i<0||j<0||i>=grid.cols||j>=grid.rows?-1:j*grid.cols+i;}
function sample(x,y){return grid.heights[cell(x,y)]??null;}
export function islandId(p){if(!p)return null;const id=grid.ids[cell(p.x,p.y)];return id===0||id===1?id:null;}
export function onBridge(p,margin=0){const a=BRIDGE.a,b=BRIDGE.b,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),u=((p.x-a.x)*dx+(p.y-a.y)*dy)/(len*len),d=Math.abs((p.x-a.x)*dy-(p.y-a.y)*dx)/len;return u>=-.025&&u<=1.025&&d<=BRIDGE.width/2-margin&&sample(p.x,p.y)!==null;}
export function castable(p){return islandId(p)!==null||onBridge(p);}
export function groundHeight(p){const x=(p.x-grid.x)/grid.step,y=(p.y-grid.y)/grid.step,i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j;const values=[sample(grid.x+i*grid.step,grid.y+j*grid.step),sample(grid.x+(i+1)*grid.step,grid.y+j*grid.step),sample(grid.x+i*grid.step,grid.y+(j+1)*grid.step),sample(grid.x+(i+1)*grid.step,grid.y+(j+1)*grid.step)];if(values.some(v=>v===null))return sample(p.x,p.y)??-.5;return values[0]*(1-a)*(1-b)+values[1]*a*(1-b)+values[2]*(1-a)*b+values[3]*a*b;}
export const obstacles=data.obstacles;
export function walkable(p){const k=cell(p.x,p.y),h=grid.heights[k];if(h==null||h<-.18||grid.slopes[k]<.55)return false;if(onBridge(p,.2))return true;const id=islandId(p);if(id===null)return false;const r=.22;if(obstacles.some(o=>p.x>o.min[0]-r&&p.x<o.max[0]+r&&p.y>o.min[1]-r&&p.y<o.max[1]+r))return false;return [[r,0],[-r,0],[0,r],[0,-r]].every(([x,y])=>{const q={x:p.x+x,y:p.y+y};return (islandId(q)===id||onBridge(q))&&Math.abs((sample(q.x,q.y)??-99)-h)<.5;});}
export function segmentClear(a,b){for(const o of obstacles){let low=0,high=1;for(const [k,axis] of [['x',0],['y',1]]){const delta=b[k]-a[k],min=o.min[axis]-.225,max=o.max[axis]+.225;if(Math.abs(delta)<1e-10){if(a[k]<min||a[k]>max){low=2;break;}}else{const u=(min-a[k])/delta,v=(max-a[k])/delta;low=Math.max(low,Math.min(u,v));high=Math.min(high,Math.max(u,v));}}if(low<=high)return false;}const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.035));let last=groundHeight(a);for(let i=0;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};if(!walkable(p))return false;const h=groundHeight(p);if(Math.abs(h-last)>.22)return false;last=h;}return true;}
const step=.5,cols=221,rows=125;
const point=i=>({x:(i%cols)*step,y:Math.floor(i/cols)*step-4});
const index=p=>Math.round((p.y+4)/step)*cols+Math.round(p.x/step);
const mask=new Uint8Array(cols*rows);for(let i=0;i<mask.length;i++)mask[i]=walkable(point(i))?1:0;
const neighbors=Array.from({length:mask.length},()=>[]);
for(let i=0;i<mask.length;i++)if(mask[i]){const p=point(i);for(const dx of [-1,0,1])for(const dy of [-1,0,1]){if(!dx&&!dy)continue;const n=i+dy*cols+dx;if(n<0||n>=mask.length||!mask[n])continue;const q=point(n);if(Math.abs(q.x-p.x)<=.6&&segmentClear(p,q))neighbors[i].push([n,Math.hypot(dx,dy)*step]);}}
// Keep spawning on the connected land/bridge network, excluding isolated cliff ledges.
const visited=new Uint8Array(mask.length);let main=[];
for(let i=0;i<mask.length;i++)if(mask[i]&&!visited[i]){const group=[i];visited[i]=1;for(let k=0;k<group.length;k++)for(const [n] of neighbors[group[k]])if(!visited[n]){visited[n]=1;group.push(n);}if(group.length>main.length)main=group;}
mask.fill(0);for(const i of main)mask[i]=1;
export function reachable(p){return walkable(p)&&gridPoint(p)!==null;}
export function nearestWalkable(p,id=null){if(reachable(p)&&(id===null||islandId(p)===id))return{x:p.x,y:p.y};let best=null,d=Infinity;for(let i=0;i<mask.length;i++)if(mask[i]){const q=point(i),v=(q.x-p.x)**2+(q.y-p.y)**2;if(v<d&&(id===null||islandId(q)===id)){best=q;d=v;}}return best;}
function gridPoint(p){let best=null,d=Infinity;const x=Math.round(p.x/step),y=Math.round((p.y+4)/step);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const i=(y+dy)*cols+x+dx;if(!mask[i])continue;const q=point(i),v=(q.x-p.x)**2+(q.y-p.y)**2;if(v<d&&segmentClear(p,q)){best=i;d=v;}}return best;}
const paths=new WeakMap();
export function route(a,b){const dest=nearestWalkable(b);if(!dest)return[];if(segmentClear(a,dest))return[dest];const start=gridPoint(a),end=gridPoint(dest);if(start===null||end===null)return[];
 const heap=[],cost=new Float64Array(mask.length).fill(Infinity),parent=new Int32Array(mask.length).fill(-1),closed=new Uint8Array(mask.length);
 const h=i=>Math.hypot(point(i).x-dest.x,point(i).y-dest.y);
 const push=(i,f)=>{let k=heap.length;heap.push({i,f});while(k){const p=(k-1)>>1;if(heap[p].f<=f)break;heap[k]=heap[p];k=p;}heap[k]={i,f};};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let k=0;while(k*2+1<heap.length){let c=k*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[k]=heap[c];k=c;}heap[k]=last;}return top.i;};
 cost[start]=0;push(start,h(start));
 while(heap.length){const i=pop();if(closed[i])continue;if(i===end){const raw=[dest];for(let n=end;n!==-1;n=parent[n])raw.push(point(n));raw.reverse();const smooth=[];let from=a;for(let k=0;k<raw.length;){let j=k;while(j+1<raw.length&&segmentClear(from,raw[j+1]))j++;smooth.push(raw[j]);from=raw[j];k=j+1;}return smooth;}
 closed[i]=1;for(const [ni,edge] of neighbors[i]){if(closed[ni])continue;const g=cost[i]+edge;if(g<cost[ni]){cost[ni]=g;parent[ni]=i;push(ni,g+h(ni));}}}return[];
}
export function moveAlong(e,p,dt,speed){let path=paths.get(e);const key=index(p);if(!path||path.key!==key||(!path.nodes.length&&path.at!==index(e))){path={key,at:index(e),nodes:route(e,p)};paths.set(e,path);}let budget=dt*speed;while(budget>0&&path.nodes.length){const q=path.nodes[0],d=Math.hypot(q.x-e.x,q.y-e.y);if(d<=budget){e.x=q.x;e.y=q.y;budget-=d;path.nodes.shift();}else{const next={x:e.x+(q.x-e.x)*budget/d,y:e.y+(q.y-e.y)*budget/d};if(walkable(next)){e.x=next.x;e.y=next.y;}else paths.delete(e);budget=0;}}if(!path.nodes.length)path.at=index(e);return Math.hypot(e.x-p.x,e.y-p.y)<.2;}
