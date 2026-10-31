"""Split generated GLB into a shared geometry buffer and texture files; no recompression."""
import json,struct,sys
from pathlib import Path
p=Path(sys.argv[1]);raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);start=20+n;length=struct.unpack_from('<I',raw,start)[0];data=raw[start+8:start+8+length]
views=doc['bufferViews'];imageviews=set();texdir=p.parent/'textures';texdir.mkdir(exist_ok=True)
for i,image in enumerate(doc.get('images',[])):
 vi=image.pop('bufferView');v=views[vi];off=v.get('byteOffset',0);ext='jpg' if image.get('mimeType')=='image/jpeg' else 'png';name=f'textures/{i:03d}.{ext}';(p.parent/name).write_bytes(data[off:off+v['byteLength']]);image['uri']=name;imageviews.add(vi)
out=bytearray();new=[];mapping={}
for i,v in enumerate(views):
 if i in imageviews:continue
 while len(out)%4:out.append(0)
 off=v.get('byteOffset',0);mapping[i]=len(new);new.append({**v,'byteOffset':len(out)});out.extend(data[off:off+v['byteLength']])
for a in doc.get('accessors',[]):
 if 'bufferView' in a:a['bufferView']=mapping[a['bufferView']]
 if 'sparse' in a:
  for k in ['indices','values']:a['sparse'][k]['bufferView']=mapping[a['sparse'][k]['bufferView']]
doc['bufferViews']=new;doc['buffers']=[{'uri':'geometry.bin','byteLength':len(out)}];(p.parent/'geometry.bin').write_bytes(out);p.with_suffix('.gltf').write_text(json.dumps(doc,separators=(',',':')));print('Geometry bytes',len(out),'textures',len(imageviews));p.unlink()
