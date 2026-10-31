"""Blender 5.2: --background source.blend --python export.py -- OUTPUT_DIRECTORY.
Exports source meshes/weights/material overrides without modifying the blend file.
"""
import bpy,sys,json,pathlib,re
out=pathlib.Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
rig=next(o for o in bpy.data.objects if 'Peasant_Rig' in o.name)
faction='farming' if rig.name.startswith('Farming') else 'livestock'
ready=next(c for c in bpy.data.collections if 'READY CHARACTER' in c.name)
wardrobe=next(c for c in bpy.data.collections if 'WARDROBE' in c.name)
keep=set(ready.all_objects)|set(wardrobe.all_objects)
props=[o for o in bpy.data.objects if o.type=='MESH' and o.name.split(' / ')[-1] in ['Basket Empty','Sickle','Hammer','Rake','Pickaxe','Log','Urn Clay','Urn Empty']]
keep.update(props)
for c in bpy.data.collections:c.hide_viewport=False;c.hide_render=False
for o in list(bpy.data.objects):
 if o not in keep:bpy.data.objects.remove(o,do_unlink=True)
for o in keep:o.hide_set(False);o.hide_viewport=False;o.hide_render=False
# Hidden collection dimensions were stale until depsgraph refresh. Their inherited
# .01 rig scale is correct: never bake a second .01 scale into these meshes.
for tr in rig.animation_data.nla_tracks:tr.mute=True
rig.animation_data.action=None
rig.data.pose_position='REST';bpy.context.view_layer.update()
records=[]
for o in keep:
 if o.type!='MESH':continue
 n=o.name.split(' / ')[-1]
 if 'Outfit' in n:role='outfit';index=int(n[-2:])-1
 elif 'Hair For Hat' in n:role='hair';index=4
 elif 'Hair' in n:role='hair';index=int(n[-2:])-1
 elif 'Head' in n:role='head';index=int(n[-2:])-1
 elif 'Face' in n:role='face';index=0
 elif 'Hat' in n:role='hat';index=int(n[-2:])-1
 else:role='prop';index=0
 o['role']=role;o['variant']=index;o['sourceName']=n
 o.name=(role+'_'+str(index)) if role!='prop' else 'prop_'+n.replace(' ','_').lower()
 # glTF reads object-level material slots, preserving the two supplied palettes.
 o.data.calc_loop_triangles()
 records.append(dict(name=o.name,role=role,variant=index,source=n,triangles=len(o.data.loop_triangles),dimensions=list(o.dimensions),materials=[s.material.name for s in o.material_slots]))
roots={}
for a in list(bpy.data.actions):
 if a.name.endswith(' / Root'):
  curves=[]
  for layer in a.layers:
   for strip in layer.strips:
    for slot in a.slots:
     bag=strip.channelbag(slot)
     if bag:
      for f in bag.fcurves:curves.append(dict(path=f.data_path,index=f.array_index,keys=[list(k.co) for k in f.keyframe_points]))
  roots[a.name]=curves;bpy.data.actions.remove(a)
rig.name='PeasantRig';rig.data.pose_position='POSE'
rig.animation_data.action=bpy.data.actions['Idle'];rig.animation_data.action_slot=bpy.data.actions['Idle'].slots[0]
bpy.context.scene.render.fps=30;bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for o in keep:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(out/(faction+'.glb')),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_image_format='AUTO')
(out/(faction+'-source.json')).write_text(json.dumps(dict(faction=faction,bones=len(rig.data.bones),assets=sorted(records,key=lambda r:r['name']),rootChannels=roots),ensure_ascii=False,indent=2))
# glTF does not recognize the legacy MixRGB multiply used by the source hair.
# Preserve that exact linear multiplier as baseColorFactor (same shader math).
import struct
path=out/(faction+'.glb');raw=path.read_bytes();size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size]);tail=raw[20+size:]
for material in doc.get('materials',[]):
 source=bpy.data.materials.get(material.get('name',''))
 if source and source.use_nodes:
  for node in source.node_tree.nodes:
   if node.type=='MIX_RGB' and node.blend_type=='MULTIPLY' and node.inputs[0].default_value==1 and not node.inputs[2].is_linked:
    material.setdefault('pbrMetallicRoughness',{})['baseColorFactor']=list(node.inputs[2].default_value)
encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
path.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(tail))+struct.pack('<I4s',len(encoded),b'JSON')+encoded+tail)
