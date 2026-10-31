# Executed in exporter context; raycast only walk surfaces, never roofs/bridge railings.
from mathutils.kdtree import KDTree
import hashlib
pasture=next(o for o in selected if o.name.startswith('牧场岛地形'))
def bvh_for(objects):
 verts=[];faces=[]
 for o in objects:
  ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh();offset=len(verts)
  verts.extend(o.matrix_world@v.co for v in m.vertices);faces.extend([offset+i for i in p.vertices] for p in m.polygons);ev.to_mesh_clear()
 return BVHTree.FromPolygons(verts,faces)
bridge_objects=[o for o in selected if o.name.startswith('桥面铺石')]
bvhs=[bvh_for([terrain]),bvh_for([pasture]),bvh_for(bridge_objects)]
grid={'x':0,'y':-4,'step':.25,'cols':441,'rows':249,'heights':[],'ids':[],'slopes':[]}
for j in range(grid['rows']):
 for i in range(grid['cols']):
  x=grid['x']+i*grid['step'];y=grid['y']+j*grid['step'];origin=Vector(((x-transform['position'][0])/scale,(transform['position'][2]-y)/scale,60))
  hits=[]
  for k,bvh in enumerate(bvhs):
   p,n,_,_=bvh.ray_cast(origin,Vector((0,0,-1)))
   if p is not None and p.z>.15:hits.append((p.z,k,n.z))
  if hits:
   z,k,n=max(hits);grid['heights'].append(round(z*scale-.5,3));grid['ids'].append(k);grid['slopes'].append(round(n,3))
  else:grid['heights'].append(None);grid['ids'].append(-1);grid['slopes'].append(0)
# Bridge centerline follows the placed deck, not the former horizontal placeholder.
pts=[o.matrix_world@v.co for o in bridge_objects for v in o.data.vertices];angle=bridge_objects[0].matrix_world.to_euler().z;axis=Vector((math.cos(angle),math.sin(angle),0));side=Vector((-axis.y,axis.x,0));u=[p.dot(axis) for p in pts];v=[p.dot(side) for p in pts];mid=(min(v)+max(v))/2
ends=[world(axis*t+side*mid) for t in [min(u)+.2,max(u)-.2]]
bridge={'a':{'x':ends[0][0],'y':ends[0][1]},'b':{'x':ends[1][0],'y':ends[1][1]},'width':(max(v)-min(v))*scale,'height':2}
report={'transform':transform,'source':'人间牧场_双岛场景_v09_轻量工程.blend','sha256':hashlib.sha256(open(bpy.data.filepath,'rb').read()).hexdigest(),'objects':mapping,'grid':grid,'obstacles':obstacles,'bridge':bridge,'centers':[{'x':27,'y':28},{'x':79.5,'y':29.5}]}
open(os.path.join(out,'layout-data.js'),'w').write('export default '+json.dumps(report,ensure_ascii=False,separators=(',',':'))+';\n')
sea=next(o for o in s.objects if o.name.startswith('海面 |'))
kd=KDTree(len(sea.data.vertices));dist=sea.data.attributes['shore_distance'].data
for i,v in enumerate(sea.data.vertices):kd.insert(sea.matrix_world@v.co,i)
kd.balance();shore=array('f');shoremeta={'width':601,'height':401,'min':[-130,-65],'size':[240,150]}
for j in range(shoremeta['height']):
 for i in range(shoremeta['width']):
  p=Vector((-130+i*.4,-65+j*.375,0));closest=kd.find_n(p,4);weights=[1/max(d,.001)**2 for _,_,d in closest];shore.append(sum(dist[k].value*w for (_,k,_),w in zip(closest,weights))/sum(weights))
with open(os.path.join(out,'shore.bin'),'wb') as f:shore.tofile(f)
sheep=[{'name':o.name,'matrix':[list(row) for row in o.matrix_world],'offset':list(o.instance_collection.instance_offset)} for o in s.objects if o.instance_collection and o.name.startswith('小羊')]
meta={'shore':shoremeta,'plants':plants,'stride':7,'palettes':palettes,'wind':dict(source_wind.items()),'frameRate':s.render.fps,'audit':audit,'sheep':sheep,'cameras':[{'name':o.name,'matrix':[list(row) for row in o.matrix_world],'scale':o.data.ortho_scale} for o in s.objects if o.type=='CAMERA'],'lights':[{'type':o.data.type,'color':list(o.data.color),'energy':o.data.energy,'matrix':[list(row) for row in o.matrix_world]} for o in s.objects if o.type=='LIGHT']}
open(os.path.join(out,'source-scene.json'),'w').write(json.dumps(meta,ensure_ascii=False,separators=(',',':')))
print('EXPORTED V09',len(exported),os.path.getsize(os.path.join(out,'island.glb')),'PLANTS',sum(p['count'] for p in plants),'SHEEP',len(sheep),'BRIDGE',bridge)
