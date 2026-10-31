"""Read-only source conversion: bake v16 environment materials; reuse v09 geometry/animation."""
import bpy,sys,os,json,math
out=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(out,exist_ok=True)
s=bpy.context.scene;s.frame_set(1);s.render.engine='CYCLES';s.cycles.samples=4;s.render.bake.margin=12
s.render.bake.use_pass_direct=False;s.render.bake.use_pass_indirect=False;s.render.bake.use_pass_color=True
farm=bpy.data.objects['Island_Ground | 草坡_沙滩_浅滩.001'];pasture=bpy.data.objects['牧场岛地形 | Meshy_等比适配']
bridge=[o for o in s.objects if o.type=='MESH' and any('重建三孔石拱桥' in c.name for c in o.users_collection)]
for o in s.objects:o.hide_render=o not in [farm,pasture]+bridge
# Export source settings before any bake rewiring.
meta={'version':16,'exposure':s.view_settings.exposure,'lights':[],'cameras':[],'grass':{}}
for o in s.objects:
 if o.name.startswith('CODEX |') and o.type=='LIGHT':meta['lights'].append({'name':o.name,'type':o.data.type,'color':list(o.data.color),'energy':o.data.energy,'matrix':[list(r) for r in o.matrix_world]})
 if o.type=='CAMERA':meta['cameras'].append({'name':o.name,'type':o.data.type,'lens':o.data.lens,'sensor':o.data.sensor_width,'matrix':[list(r) for r in o.matrix_world],'scale':o.data.ortho_scale})
for key in ['Island | Grass painted green.002','牧场 | 短草柔和绿']:
 meta['grass'][key]=[[(e.position,list(e.color)) for e in n.color_ramp.elements] for n in bpy.data.materials[key].node_tree.nodes if n.type=='VALTORGB']
# Match the already-exported farm UVs exactly.
uv=farm.data.uv_layers.get('TerrainUV') or farm.data.uv_layers.new(name='TerrainUV');farm.data.uv_layers.active=uv;uv.active_render=True
for p in farm.data.polygons:
 for li in p.loop_indices:
  v=farm.matrix_world@farm.data.vertices[farm.data.loops[li].vertex_index].co;uv.data[li].uv=((v.x+110)/86,(v.y+30)/73)
for m in farm.data.materials:
 if 'Meadow painted' in m.name:
  bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');r=next(n for n in m.node_tree.nodes if n.type=='VALTORGB');m.node_tree.links.new(r.outputs['Color'],bs.inputs['Base Color'])
def bake(obj,name,channel='Base Color',size=2048):
 img=bpy.data.images.new(name,width=size,height=size,alpha=False);img.colorspace_settings.name='sRGB' if channel=='Base Color' else 'Non-Color'
 edits=[]
 for m in obj.data.materials:
  tree=m.node_tree;bs=next(n for n in tree.nodes if n.type=='BSDF_PRINCIPLED');output=next(n for n in tree.nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output)
  old=[(l.from_socket,l.to_socket) for l in output.inputs['Surface'].links];emit=tree.nodes.new('ShaderNodeEmission');socket=bs.inputs[channel]
  if socket.is_linked:tree.links.new(socket.links[0].from_socket,emit.inputs['Color'])
  else:
   v=socket.default_value;emit.inputs['Color'].default_value=tuple(v) if hasattr(v,'__len__') else (v,v,v,1)
  tree.links.new(emit.outputs[0],output.inputs['Surface']);target=tree.nodes.new('ShaderNodeTexImage');target.image=img;tree.nodes.active=target;edits.append((tree,emit,target,old))
 bpy.ops.object.select_all(action='DESELECT');obj.hide_set(False);obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.object.bake(type='EMIT');img.filepath_raw=os.path.join(out,name+'.png');img.file_format='PNG';img.save()
 for tree,emit,target,old in edits:
  tree.nodes.remove(emit);tree.nodes.remove(target)
  for a,b in old:tree.links.new(a,b)
 return img
bake(farm,'farm-color');bake(pasture,'pasture-color');bake(pasture,'pasture-roughness','Roughness',1024)
# Source bridge material depends on world coordinates. Bake joined geometry without changing its shape.
bpy.ops.object.select_all(action='DESELECT')
for o in bridge:o.hide_set(False);o.select_set(True)
bpy.context.view_layer.objects.active=bridge[0];bpy.ops.object.join();obj=bpy.context.object
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.005);bpy.ops.object.mode_set(mode='OBJECT')
img=bake(obj,'bridge-color',size=2048);material=bpy.data.materials.new('V16 baked warm stone');material.use_nodes=True
bs=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED');tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img;material.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.85
for p in obj.data.polygons:p.material_index=0
obj.data.materials.clear();obj.data.materials.append(material);obj['role']='bridge';obj.name='V16 source stone bridge'
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'bridge.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_animations=False)
open(os.path.join(out,'environment.json'),'w').write(json.dumps(meta,ensure_ascii=False,separators=(',',':')))
print('V16 MATERIALS COMPLETE')
