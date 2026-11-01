from pathlib import Path
from PIL import Image
import json,struct,gzip,io,hashlib
G=Path(__file__).resolve().parents[1]/'game';out=G/'assets/mobile';out.mkdir(exist_ok=True)
items={'island':'assets/islands/v09/island.gltf','sheep':'assets/islands/v09/sheep.glb','farming':'assets/characters/peasants/farming.glb','livestock':'assets/characters/peasants/livestock.glb','bridge':'assets/islands/v16/bridge.glb'}
report={}
for name,rel in items.items():
 p=G/rel
 if p.suffix=='.gltf':
  d=json.loads(p.read_text());binary=(p.parent/d['buffers'][0]['uri']).read_bytes();original=len(binary)+p.stat().st_size+sum((p.parent/i['uri']).stat().st_size for i in d.get('images',[]))
 else:
  raw=p.read_bytes();jl=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+jl]);binary=raw[28+jl:];original=len(raw)
 replacements={}
 for im in d.get('images',[]):
  raw=(p.parent/im['uri']).read_bytes() if 'uri' in im else binary[d['bufferViews'][im['bufferView']].get('byteOffset',0):d['bufferViews'][im['bufferView']].get('byteOffset',0)+d['bufferViews'][im['bufferView']]['byteLength']]
  img=Image.open(io.BytesIO(raw));img.thumbnail((1024,1024));bio=io.BytesIO();img.save(bio,format='WEBP',quality=86,method=6);encoded=bio.getvalue()
  if 'uri' in im:im.pop('uri');im['bufferView']=len(d['bufferViews']);d['bufferViews'].append({'buffer':0,'byteLength':0})
  replacements[im['bufferView']]=encoded;im['mimeType']='image/webp'
 new=bytearray();seen={}
 for idx,v in enumerate(d['bufferViews']):
  data=replacements.get(idx,binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]);key=hashlib.sha256(data).digest()
  if key not in seen:
   new.extend(b'\0'*((-len(new))%4));seen[key]=len(new);new.extend(data)
  v['byteOffset']=seen[key];v['byteLength']=len(data);v['buffer']=0
 for t in d.get('textures',[]):
  if 'source' in t:t.setdefault('extensions',{})['EXT_texture_webp']={'source':t.pop('source')}
 for key in ['extensionsUsed','extensionsRequired']:
  d[key]=list(dict.fromkeys(d.get(key,[])+['EXT_texture_webp']))
 new.extend(b'\0'*((-len(new))%4));d['buffers']=[{'byteLength':len(new)}];js=json.dumps(d,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*((-len(js))%4)
 glb=struct.pack('<III',0x46546c67,2,28+len(js)+len(new))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(new),0x004e4942)+new
 packed=gzip.compress(glb,compresslevel=9,mtime=0);(out/f'{name}.glb.gz').write_bytes(packed);report[name]={'original':original,'download':len(packed),'decoded':len(glb),'nodes':len(d.get('nodes',[]))};print(name,report[name],flush=True)
for n in ['farm-color','pasture-color','pasture-roughness']:
 p=G/f'assets/islands/v16/{n}.png';im=Image.open(p);im.thumbnail((1024,1024));im.save(out/f'{n}.webp',quality=88,method=6)
(out/'manifest.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
