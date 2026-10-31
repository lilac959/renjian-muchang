import bpy,json,os,sys
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=os.path.abspath(args[0] if args else '/tmp/rj-island')
os.makedirs(out,exist_ok=True)
scene=bpy.context.scene
rows=[]
for o in scene.objects:
 bbox=[]
 if o.type in {'MESH','CURVE','SURFACE','FONT','META'}:
  points=[o.matrix_world@Vector(p) for p in o.bound_box]
  bbox=[[round(min(p[i] for p in points),4) for i in range(3)],[round(max(p[i] for p in points),4) for i in range(3)]]
 rows.append(dict(name=o.name,type=o.type,visible=o.visible_get(),render=not o.hide_render,hide_viewport=o.hide_viewport,collections=[c.name for c in o.users_collection],parent=o.parent.name if o.parent else None,instance_type=o.instance_type,instance_collection=o.instance_collection.name if o.instance_collection else None,bbox=bbox,vertices=len(o.data.vertices) if o.type=='MESH' else 0,polygons=len(o.data.polygons) if o.type=='MESH' else 0,materials=[m.name if m else None for m in o.data.materials] if hasattr(o.data,'materials') else [],modifiers=[{'name':m.name,'type':m.type,'render':m.show_render,'viewport':m.show_viewport} for m in o.modifiers]))
report={'version':bpy.app.version_string,'scene':scene.name,'scenes':list(bpy.data.scenes.keys()),'camera':scene.camera.name if scene.camera else None,'objects':rows,'collections':[dict(name=c.name,hide_render=c.hide_render,hide_viewport=c.hide_viewport,objects=len(c.objects)) for c in bpy.data.collections],'images':[dict(name=i.name,size=list(i.size),packed=bool(i.packed_file),path=i.filepath) for i in bpy.data.images],'materials':[dict(name=m.name,nodes=[dict(name=n.name,type=n.type) for n in m.node_tree.nodes] if m.node_tree else []) for m in bpy.data.materials]}
open(out+'/inventory.json','w').write(json.dumps(report,ensure_ascii=False,indent=2))
print('INVENTORY',len(rows),'visible',sum(o['visible'] and o['render'] for o in rows))
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=1000;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.filepath=out+'/source-preview.png'
if scene.camera:bpy.ops.render.render(write_still=True)
