"""Blender 5.2: --factory-startup --disable-autoexec -b INPUT --python export.py -- OUTPUT_DIR.
Never saves the source blend. Run inspect.py first; this selection matches v03's verified render.
"""
import bpy,sys,os,json,math,struct
from array import array
from mathutils import Vector
from mathutils.bvhtree import BVHTree
out=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(out,exist_ok=True)
s=bpy.context.scene;s.frame_set(1)
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
# Evaluate Blender's own Noise fields at every source root/terrain vertex.
# This avoids replacing its Perlin/fBM wind pattern with unrelated sine waves.
def fields(obj,samples=None):
 tree=bpy.data.node_groups.new('Export exact source fields','GeometryNodeTree')
 tree.interface.new_socket(name='Geometry',in_out='INPUT',socket_type='NodeSocketGeometry');tree.interface.new_socket(name='Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry')
 inp=tree.nodes.new('NodeGroupInput');output=tree.nodes.new('NodeGroupOutput');pos=tree.nodes.new('GeometryNodeInputPosition');geometry=inp.outputs['Geometry']
 samples=samples or [('wind_noise',.11,1),('base_noise',.18,2)]
 for label,frequency,detail in samples:
  noise=tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=frequency;noise.inputs['Detail'].default_value=detail;tree.links.new(pos.outputs[0],noise.inputs['Vector'])
  store=tree.nodes.new('GeometryNodeStoreNamedAttribute');store.data_type='FLOAT';store.domain='POINT';store.inputs['Name'].default_value=label
  tree.links.new(geometry,store.inputs['Geometry']);tree.links.new(noise.outputs['Fac'],store.inputs['Value']);geometry=store.outputs['Geometry']
 tree.links.new(geometry,output.inputs['Geometry']);modifier=obj.modifiers.new('Source field sampling','NODES');modifier.node_group=tree
 bpy.context.view_layer.update();ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();values=[[v.value for v in mesh.attributes[label].data] for label,_,_ in samples];ev.to_mesh_clear();obj.modifiers.remove(modifier);bpy.data.node_groups.remove(tree);return values

plants=[];plant_data=array('f');prototypes={};source_wind=next(o for o in s.objects if o.name.startswith('Wind_Control'))
for o in selected:
 if not o.name.startswith(('Meadow |','Wheat 0')):continue
 tree=next(m.node_group for m in o.modifiers if m.type=='NODES');source=next(n.inputs['Object'].default_value for n in tree.nodes if n.type=='OBJECT_INFO')
 # Sampling object contains exactly the unchanged source point positions.
 sample=bpy.data.objects.new('root field sampler',o.data.copy());s.collection.objects.link(sample);noise,base=fields(sample);bpy.data.objects.remove(sample,do_unlink=True)
 key='grass' if o.name.startswith('Meadow |') else 'wheat';prototypes[key]=source
 offset=len(plant_data)
 for i,v in enumerate(o.data.vertices):
  x,y,z=v.co;scale_value=o.data.attributes['plant_scale'].data[i].value;yaw=o.data.attributes['plant_yaw'].data[i].value
  plant_data.extend([x,y,z,scale_value,yaw,x*.35+y*.24+noise[i]*5.8,base[i]])
 plants.append({'name':o.name,'prototype':key,'offset':offset,'count':len(o.data.vertices)})
with open(os.path.join(out,'plants.bin'),'wb') as f:plant_data.tofile(f)

exported=[];audit=[]
for o in selected:
 if o.name.startswith(('Meadow |','Wheat 0')):continue
 ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());data=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=bpy.context.evaluated_depsgraph_get())
 n=bpy.data.objects.new(o.name+'__web',data);s.collection.objects.link(n);n.matrix_world=o.matrix_world.copy();n['sourceName']=o.name
 n['role']='terrain' if o==terrain else 'building' if any(c.name.startswith('03 |') for c in o.users_collection) else 'decoration';exported.append(n)
 data.calc_loop_triangles();audit.append({'name':o.name,'matrix':[list(row) for row in o.matrix_world],'vertices':len(data.vertices),'triangles':len(data.loop_triangles),'bounds':[[min((o.matrix_world@v.co)[i] for v in data.vertices) for i in range(3)],[max((o.matrix_world@v.co)[i] for v in data.vertices) for i in range(3)]]})
for key,o in prototypes.items():
 data=o.data.copy();data.attributes['blade_weight'].name='_WIND_WEIGHT';n=bpy.data.objects.new('Prototype '+key,data);s.collection.objects.link(n);n['role']='prototype';n['prototype']=key;exported.append(n)
# Record original palettes before replacing unsupported procedural graph connections.
palettes={}
for key,o in prototypes.items():
 for material in o.data.materials:
  bs=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED');mix=bs.inputs['Base Color'].links[0].from_node
  palettes[material.name]={'kind':key,'roughness':bs.inputs['Roughness'].default_value,'low':list(mix.inputs[1].default_value),'high':list(mix.inputs[2].default_value)}
  if key=='grass':palettes[material.name]['ramps']=[{'stops':[(e.position,list(e.color)) for e in n.color_ramp.elements],'interpolation':n.color_ramp.interpolation} for n in material.node_tree.nodes if n.type=='VALTORGB']
# Bake full-resolution static ground colors, with grass wave color applied at runtime.
ground=next(o for o in exported if o['role']=='terrain');noise,base=fields(ground)
attribute=ground.data.attributes.new('_MEADOW','FLOAT_VECTOR','POINT');mask=[0.0]*len(ground.data.vertices)
for face in ground.data.polygons:
 if 'Meadow painted' in ground.data.materials[face.material_index].name:
  for vi in face.vertices:mask[vi]=1.0
for i,v in enumerate(ground.data.vertices):attribute.data[i].vector=(mask[i],v.co.x*.35+v.co.y*.24+noise[i]*5.8,base[i])
uv=ground.data.uv_layers.new(name='TerrainUV')
for p in ground.data.polygons:
 for li in p.loop_indices:
  v=ground.matrix_world@ground.data.vertices[ground.data.loops[li].vertex_index].co;uv.data[li].uv=((v.x+45)/86,(v.y+30)/73)
for slot in ground.material_slots:slot.material=slot.material.copy()
img=bpy.data.images.new('Qinghe source ground colors',width=2048,height=2048)
for m in ground.data.materials:
 m.use_nodes=True
 bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 if 'Meadow painted' in m.name:
  ramp=next(n for n in m.node_tree.nodes if n.type=='VALTORGB');m.node_tree.links.new(ramp.outputs['Color'],bs.inputs['Base Color'])
 n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=img;m.node_tree.nodes.active=n
bpy.ops.object.select_all(action='DESELECT');ground.select_set(True);bpy.context.view_layer.objects.active=ground
s.render.engine='CYCLES';s.cycles.samples=4;s.render.bake.use_pass_direct=False;s.render.bake.use_pass_indirect=False;s.render.bake.use_pass_color=True;s.render.bake.margin=8
bpy.ops.object.bake(type='DIFFUSE')
material=bpy.data.materials.new('Ground baked source colors');material.use_nodes=True;nodes=material.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=img;bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');material.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=1
for p in ground.data.polygons:p.material_index=0
ground.data.materials.clear();ground.data.materials.append(material)
# Keep original building textures and all geometry; no decimation or texture resizing.
used={m for o in exported for m in o.data.materials if m}
for m in used:
 if not m.node_tree:continue
 bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if not bs:continue
 if m.name in palettes:
  for link in list(bs.inputs['Base Color'].links):m.node_tree.links.remove(link)
  bs.inputs['Base Color'].default_value=(1,1,1,1)
 elif not any(n.type=='TEX_IMAGE' for n in m.node_tree.nodes) and bs.inputs['Base Color'].is_linked:
  # Evaluate the original noise/color ramp in Blender at the object's world vertices.
  ramp=next(n for n in m.node_tree.nodes if n.type=='VALTORGB');noise_node=next(n for n in m.node_tree.nodes if n.type=='TEX_NOISE')
  for obj in [o for o in exported if m in list(o.data.materials)]:
   sample=bpy.data.objects.new('surface sampler',obj.data.copy());sample.data.transform(obj.matrix_world);s.collection.objects.link(sample)
   noise_values=fields(sample,[('surface_noise',noise_node.inputs['Scale'].default_value,noise_node.inputs['Detail'].default_value)])[0];bpy.data.objects.remove(sample,do_unlink=True)
   color=obj.data.color_attributes.get('SourceColor') or obj.data.color_attributes.new(name='SourceColor',type='FLOAT_COLOR',domain='CORNER')
   for face in obj.data.polygons:
    for li in face.loop_indices:color.data[li].color=ramp.color_ramp.evaluate(noise_values[obj.data.loops[li].vertex_index])
   obj.data.color_attributes.active_color=color
  for link in list(bs.inputs['Base Color'].links):m.node_tree.links.remove(link)
  bs.inputs['Base Color'].default_value=(1,1,1,1)
bpy.ops.object.select_all(action='DESELECT')
for o in exported:o.select_set(True)
bpy.context.view_layer.objects.active=ground
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'island.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_attributes=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False,export_yup=True,export_animations=False,export_image_format='AUTO')
report={'transform':transform,'source':'人间牧场_最新建筑替换_v03.blend','sha256':'f4e6c23b7e304199f0ec3728d055f61bdcb2dc815f0f912fb7efa225ec3e719d','objects':mapping,'excluded':['hidden source collection (plant prototypes used as instances)','four loose root meshes beneath ground','cameras/lights (calibrated separately)','Sea_Surface (shared game sea)'],'grid':grid,'obstacles':obstacles}
open(os.path.join(out,'layout-data.js'),'w').write('export default '+json.dumps(report,ensure_ascii=False,separators=(',',':'))+';\n')
sea=next(o for o in s.objects if o.name.startswith('Sea_Surface'))
shore=array('f',[v.value for v in sea.data.attributes['shore_distance'].data])
with open(os.path.join(out,'shore.bin'),'wb') as f:shore.tofile(f)
meta={'shore':{'width':341,'height':341,'min':[-80,-66],'size':[160,132]},'plants':plants,'stride':7,'palettes':palettes,'wind':dict(source_wind.items()),'frameRate':s.render.fps,'audit':audit,'cameras':[{'name':o.name,'matrix':[list(row) for row in o.matrix_world],'scale':o.data.ortho_scale} for o in s.objects if o.type=='CAMERA'],'lights':[{'type':o.data.type,'color':list(o.data.color),'energy':o.data.energy,'matrix':[list(row) for row in o.matrix_world]} for o in s.objects if o.type=='LIGHT']}
open(os.path.join(out,'source-scene.json'),'w').write(json.dumps(meta,ensure_ascii=False,separators=(',',':')))
print('EXPORTED',len(exported),os.path.getsize(os.path.join(out,'island.glb')),'PLANTS',sum(p['count'] for p in plants))
