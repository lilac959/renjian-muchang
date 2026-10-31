# Preserve source rig and actions; consolidate material images without resizing them.
import bpy,sys,os,math,numpy as np
out=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(out,exist_ok=True)
rig=bpy.data.objects['羊骨架 | Sheep_Rig']
meshes=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers)]
materials=list({m for o in meshes for m in o.data.materials});images={}
for m in materials:
 n=next((n for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image),None)
 if n:images[m]=n.image
 else:
  image=bpy.data.images.new(m.name+' solid',width=8,height=8);bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');image.generated_color=bs.inputs['Base Color'].default_value;images[m]=image
width=2048;x=y=row=0;placements={}
for m,i in sorted(images.items(),key=lambda p:p[1].size[1],reverse=True):
 w,h=i.size
 if x+w+4>width:x=0;y+=row;row=0
 placements[m]=(x+2,y+2,w,h);x+=w+4;row=max(row,h+4)
height=2**math.ceil(math.log2(y+row));pixels=np.ones((height,width,4),dtype=np.float32)
for m,i in images.items():
 x,y,w,h=placements[m];buf=np.empty(w*h*4,dtype=np.float32);i.pixels.foreach_get(buf);tile=buf.reshape(h,w,4);pixels[y-2:y+h+2,x-2:x+w+2]=np.pad(tile,((2,2),(2,2),(0,0)),mode='edge')
atlas=bpy.data.images.new('Sheep original color atlas',width=width,height=height);atlas.pixels.foreach_set(pixels.ravel());atlas.pack()
mat=bpy.data.materials.new('Sheep source paper');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.9;tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=atlas;mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
for o in meshes:
 o.hide_set(False);o.hide_viewport=False;o.hide_render=False
 # Link into the root to make hidden collection sources exportable.
 if o.name not in bpy.context.scene.collection.objects:bpy.context.scene.collection.objects.link(o)
 o.data=o.data.copy();uv=o.data.uv_layers.active.data
 for f in o.data.polygons:
  x,y,w,h=placements[o.data.materials[f.material_index]]
  for li in f.loop_indices:
   u,v=uv[li].uv;uv[li].uv=((x+u*w)/width,(y+v*h)/height)
  f.material_index=0
 o.data.materials.clear();o.data.materials.append(mat)
rig.hide_set(False);rig.hide_viewport=False;rig.hide_render=False
if rig.name not in bpy.context.scene.collection.objects:bpy.context.scene.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();body=bpy.context.object;body.name='Sheep body'
if rig.animation_data:
 for t in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(t)
 rig.animation_data.action=bpy.data.actions.get('Sheep_Idle')
rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'sheep.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True)
print('SHEEP ATLAS',width,height,'meshes',len(meshes),'bytes',os.path.getsize(os.path.join(out,'sheep.glb')))
