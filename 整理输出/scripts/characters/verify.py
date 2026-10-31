"""Blender --background --python verify.py -- asset.glb output.json"""
import bpy,sys,json,math
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=args[0])
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');meshes=[o for o in bpy.data.objects if o.type=='MESH' and o.get('role')!='prop'];out={'bones':len(rig.data.bones),'outfits':len([o for o in meshes if o.get('role')=='outfit']),'actions':[]}
assert out['bones']==40 and out['outfits']==10
for t in rig.animation_data.nla_tracks:t.mute=True
for a in bpy.data.actions:
 if not a.slots:continue
 rig.animation_data.action=a;rig.animation_data.action_slot=a.slots[0]
 samples=[]
 for frame in [a.frame_range[0],sum(a.frame_range)/2,a.frame_range[1]]:
  bpy.context.scene.frame_set(int(frame),subframe=frame%1);dg=bpy.context.evaluated_depsgraph_get();bounds={}
  for o in meshes:
   e=o.evaluated_get(dg);pts=[e.matrix_world@Vector(v) for v in e.bound_box];lo=[min(v[i] for v in pts) for i in range(3)];hi=[max(v[i] for v in pts) for i in range(3)]
   assert all(math.isfinite(x) for x in lo+hi)
   assert max(hi[i]-lo[i] for i in range(3))<4,(o.name,lo,hi)
   bounds[o.name]={'min':lo,'max':hi}
  samples.append({'frame':frame,'bounds':bounds})
 out['actions'].append({'name':a.name,'samples':samples})
assert len(out['actions'])==5
open(args[1],'w').write(json.dumps(out,indent=2));print('PASS: 40 bones, 10 outfits, five clips, all first/mid/last frame bounds finite and under 4m')
