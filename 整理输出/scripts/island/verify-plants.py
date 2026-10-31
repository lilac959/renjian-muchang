"""Blender --disable-autoexec -b ORIGINAL --python verify-plants.py -- ASSET_DIR"""
import bpy,json,math,sys
from pathlib import Path
from array import array
from mathutils import Vector,Matrix
base=Path(sys.argv[sys.argv.index('--')+1]);meta=json.loads((base/'source-scene.json').read_text());data=array('f');data.frombytes((base/'plants.bin').read_bytes());results=[]
for frame in [1,48,92]:
 bpy.context.scene.frame_set(frame);dg=bpy.context.evaluated_depsgraph_get()
 for row in meta['plants']:
  o=bpy.data.objects[row['name']];tree=next(m.node_group for m in o.modifiers if m.type=='NODES');proto=next(n.inputs['Object'].default_value for n in tree.nodes if n.type=='OBJECT_INFO');ev=o.evaluated_get(dg).data;n=len(proto.data.vertices);assert len(ev.vertices)==row['count']*n
  error=0.0
  for instance in sorted({0,1,row['count']//3,row['count']//2,row['count']-1}):
   off=row['offset']+instance*7;x,y,z,scale,yaw,phase,base_noise=data[off:off+7];wave=math.sin(phase-frame/24*meta['wind']['wind_speed']);amplitude=meta['wind']['grass_bend' if row['prototype']=='grass' else 'wheat_bend'];rotation=Matrix.Rotation(yaw,3,'Z')
   for i,v in enumerate(proto.data.vertices):
    weight=proto.data.attributes['blade_weight'].data[i].value;p=Vector((x,y,z))+rotation@(v.co*scale)+Vector((wave*amplitude*weight*.88,wave*amplitude*weight*.48,-(wave*.5+.5)*weight*.13));error=max(error,(p-ev.vertices[instance*n+i].co).length)
  assert error<.0001,(frame,row['name'],error)
  results.append({'frame':frame,'name':row['name'],'instances':row['count'],'maxPositionError':error})
print('PLANT_VERIFICATION '+json.dumps({'maxPositionError':max(r['maxPositionError'] for r in results),'results':results},ensure_ascii=False))
