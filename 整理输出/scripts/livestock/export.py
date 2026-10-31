import bpy,json,sys
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=sys.argv[sys.argv.index('--')+1])
o=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
for o in bpy.context.scene.objects:
 if o.type=='MESH':print('PART',o.name,len(o.data.polygons),[round(sum(v.co[i] for v in o.data.vertices)/len(o.data.vertices),3) for i in range(3)])
from mathutils import Vector
from pathlib import Path
out=Path(__file__).resolve().parents[2]/'game/assets/props/livestock'
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
groups={name:[o for o in objects if predicate(sum(v.co.x for v in o.data.vertices)/len(o.data.vertices))] for name,predicate in [('meat',lambda x:x<-.15),('wool',lambda x:-.15<=x<=.15),('bone',lambda x:x>.15)]}
for name,group in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 pts=[v.co for v in o.data.vertices];lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)));origin=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));scale=1/max(hi.x-lo.x,hi.y-lo.y)
 for v in o.data.vertices:v.co=(v.co-origin)*scale
 o.location=(0,0,0)
for m in bpy.data.materials:
 if m.use_nodes:
  for n in m.node_tree.nodes:
   if n.type=='BSDF_PRINCIPLED':n.inputs['Roughness'].default_value=.9;n.inputs['Metallic'].default_value=0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out/'harvest.glb'),export_format='GLB',use_selection=True,export_animations=False)
