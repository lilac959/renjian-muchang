import json,gzip,struct
from pathlib import Path
G=Path(__file__).resolve().parents[1]/'game'
def glb(raw):
 assert raw[:4]==b'glTF'
 size=struct.unpack_from('<I',raw,12)[0]
 return json.loads(raw[20:20+size]),raw[28+size:]
items={'island':'assets/islands/v09/island.gltf','sheep':'assets/islands/v09/sheep.glb','farming':'assets/characters/peasants/farming.glb','livestock':'assets/characters/peasants/livestock.glb','bridge':'assets/islands/v16/bridge.glb'}
for name,rel in items.items():
 p=G/rel
 if p.suffix=='.gltf':
  old=json.loads(p.read_text());ob=(p.parent/old['buffers'][0]['uri']).read_bytes()
 else:old,ob=glb(p.read_bytes())
 new,nb=glb(gzip.decompress((G/f'assets/mobile/{name}.glb.gz').read_bytes()))
 for key in ['nodes','meshes','skins','animations','accessors','scenes']:
  assert old.get(key)==new.get(key),(name,key)
 image_views={i['bufferView'] for i in old.get('images',[]) if 'bufferView' in i}
 for i,v in enumerate(old['bufferViews']):
  if i in image_views:continue
  w=new['bufferViews'][i]
  assert ob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]==nb[w.get('byteOffset',0):w.get('byteOffset',0)+w['byteLength']],(name,i)
 assert all(i['mimeType']=='image/webp' for i in new.get('images',[]))
 print(name+': geometry, skeleton, animations, nodes preserved')
