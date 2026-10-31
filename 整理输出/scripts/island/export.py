"""Blender 5.2: --factory-startup --disable-autoexec -b INPUT --python export.py -- OUTPUT_DIR.
Never saves the source blend. Run inspect.py first; this selection matches v03's verified render.
"""
import bpy,sys,os,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
out=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(out,exist_ok=True)
s=bpy.context.scene;s.frame_set(1)
# Export neutral vegetation plus root/weight attributes; animate in the browser shader.
wind=next(o for o in s.objects if o.name.startswith('Wind_Control'))
wind['grass_bend']=0.0;wind['wheat_bend']=0.0
wind.update_tag();s.frame_set(1)
# The four loose root meshes sit below terrain; hidden sources are dependencies, not placed assets.
selected=[o for o in s.objects if o.visible_get() and not o.hide_render and o.type=='MESH' and any(c.name[:2] in ['01','02','03','04','05','06'] and ' | ' in c.name for c in o.users_collection)]
terrain=next(o for o in selected if o.name.startswith('Island_Ground'))
scale=.5;cx=-2.3057;cy=6.35615
transform={'scale':scale,'position':[27-cx*scale,-.5,28+cy*scale]}
def world(p):return [round(p[0]*scale+transform['position'][0],4),round(-p[1]*scale+transform['position'][2],4),round(p[2]*scale-.5,4)]
dg=bpy.context.evaluated_depsgraph_get();ev=terrain.evaluated_get(dg);mesh=ev.to_mesh();verts=[terrain.matrix_world@v.co for v in mesh.vertices];bvh=BVHTree.FromPolygons(verts,[list(p.vertices) for p in mesh.polygons]);ev.to_mesh_clear()
grid={'x':4,'y':8,'step':.25,'cols':185,'rows':169,'heights':[]}
for j in range(grid['rows']):
 for i in range(grid['cols']):
  x=grid['x']+i*.25;y=grid['y']+j*.25;hit=bvh.ray_cast(Vector(((x-transform['position'][0])/scale,(transform['position'][2]-y)/scale,30)),Vector((0,0,-1)))[0]
  grid['heights'].append(round(hit.z*scale-.5,3) if hit else None)
obstacles=[];mapping=[]
for o in selected:
 pts=[world(o.matrix_world@Vector(p)) for p in o.bound_box];lo=[min(p[i] for p in pts) for i in range(3)];hi=[max(p[i] for p in pts) for i in range(3)]
 block=any(c.name.startswith('03 |') for c in o.users_collection) or o.name.startswith('Meadow Stone')
 if block:obstacles.append({'name':o.name,'min':lo[:2],'max':hi[:2]})
 mapping.append({'name':o.name,'collections':[c.name for c in o.users_collection],'bounds':[lo,hi],'blocking':block,'sourcePolygons':len(o.data.polygons)})
# Reduce grass distribution, not the island layout. Each retained tuft keeps its source transform.
for o in selected:
 if o.name.startswith('Meadow |'):
  modifier=next(m for m in o.modifiers if m.type=='NODES');tree=modifier.node_group.copy();modifier.node_group=tree
  source=next(n for n in tree.nodes if n.type=='GROUP_INPUT').outputs['Geometry'];links=list(source.links)
  delete=tree.nodes.new('GeometryNodeDeleteGeometry');delete.domain='POINT'
  index=tree.nodes.new('GeometryNodeInputIndex');mod=tree.nodes.new('ShaderNodeMath');mod.operation='MODULO';mod.inputs[1].default_value=4
  tree.links.new(index.outputs[0],mod.inputs[0]);tree.links.new(mod.outputs[0],delete.inputs['Selection']);tree.links.new(source,delete.inputs['Geometry'])
  for link in links:target=link.to_socket;tree.links.remove(link);tree.links.new(delete.outputs['Geometry'],target)

bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
exported=[]
for o in selected:
 ev=o.evaluated_get(dg);data=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=dg)
 if o.name.startswith(('Meadow |','Wheat 0')):
  for source,target in [('blade_weight','_WIND_WEIGHT'),('wind_root','_WIND_ROOT')]:
   attr=data.attributes.get(source)
   if attr is None:raise RuntimeError(o.name+' missing '+source)
   attr.name=target
 n=bpy.data.objects.new(o.name+'__web',data);s.collection.objects.link(n);n.matrix_world=o.matrix_world.copy();n['sourceName']=o.name
 n['role']='terrain' if o==terrain else 'building' if any(c.name.startswith('03 |') for c in o.users_collection) else 'decoration';exported.append(n)
# Bake the original terrain's procedural grass/sand into one local image; preserve shoreline.
ground=exported[selected.index(terrain)]
uv=ground.data.uv_layers.new(name='TerrainUV')
for p in ground.data.polygons:
 for li in p.loop_indices:
  v=ground.matrix_world@ground.data.vertices[ground.data.loops[li].vertex_index].co;uv.data[li].uv=((v.x+45)/86,(v.y+30)/73)
img=bpy.data.images.new('Qinghe ground baked color',width=1024,height=1024)
for m in ground.data.materials:
 m.use_nodes=True;n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=img;m.node_tree.nodes.active=n
bpy.ops.object.select_all(action='DESELECT');ground.select_set(True);bpy.context.view_layer.objects.active=ground
s.render.engine='CYCLES';s.cycles.samples=1;s.render.bake.use_pass_direct=False;s.render.bake.use_pass_indirect=False;s.render.bake.use_pass_color=True;s.render.bake.margin=8
bpy.ops.object.bake(type='DIFFUSE')
material=bpy.data.materials.new('Ground baked');material.use_nodes=True;nodes=material.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=img;material.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color']);nodes.get('Principled BSDF').inputs['Roughness'].default_value=1
for p in ground.data.polygons:p.material_index=0
ground.data.materials.clear();ground.data.materials.append(material)
# Procedural vegetation/paths: static palette approximation; root weights are retained for runtime wind.
used={m for o in exported for m in o.data.materials if m}
for m in used:
 if not m.node_tree:continue
 bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if not bs:continue
 if not any(n.type=='TEX_IMAGE' for n in m.node_tree.nodes):
  socket=bs.inputs['Base Color']
  if socket.is_linked:
   ramps=[n for n in m.node_tree.nodes if n.type=='VALTORGB'];mixes=[n for n in m.node_tree.nodes if n.type=='MIX_RGB']
   color=ramps[0].color_ramp.evaluate(.5) if ramps else mixes[-1].inputs[1].default_value[:] if mixes else socket.default_value[:]
   for l in list(socket.links):m.node_tree.links.remove(l)
   socket.default_value=color
 for n in m.node_tree.nodes:
  if n.type=='TEX_IMAGE' and n.image and max(n.image.size)>1024:n.image.scale(1024,1024)
# Simplify only high-cost meshes after baking/evaluating. Keep separate semantic nodes.
for o in exported:
 if 'Windmill' in o.name or o.name.startswith('Wheat 0'):
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  m=o.modifiers.new('Web simplification','DECIMATE');m.ratio=.15 if 'Windmill' in o.name else .4;bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.select_all(action='DESELECT')
for o in exported:o.select_set(True)
bpy.context.view_layer.objects.active=ground
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'island.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_attributes=True,export_yup=True,export_animations=False,export_image_format='AUTO')
report={'transform':transform,'source':'人间牧场_最新建筑替换_v03.blend','sha256':'f4e6c23b7e304199f0ec3728d055f61bdcb2dc815f0f912fb7efa225ec3e719d','objects':mapping,'excluded':['hidden source collection','four loose root meshes beneath ground','cameras/lights','Sea_Surface (shared game sea)'],'grid':grid,'obstacles':obstacles}
open(os.path.join(out,'layout-data.js'),'w').write('export default '+json.dumps(report,ensure_ascii=False,separators=(',',':'))+';\n')
print('EXPORTED',len(exported),os.path.getsize(os.path.join(out,'island.glb')))
