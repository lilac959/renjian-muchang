"""Read-only numerical comparison: Blender source world transforms vs exported glTF."""
import json,struct,sys
from pathlib import Path
from mathutils import Matrix,Quaternion,Vector
asset=Path(sys.argv[sys.argv.index('--')+1]);meta=json.loads((asset/'source-scene.json').read_text());blob=(asset/'island.glb').read_bytes();size=struct.unpack_from('<I',blob,12)[0];g=json.loads(blob[20:20+size]);binary_start=28+size;nodes=g['nodes'];parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
def local(n):
 if 'matrix' in n:return Matrix([n['matrix'][i::4] for i in range(4)])
 q=n.get('rotation',[0,0,0,1]);return Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(n.get('scale',[1,1,1])))
def world(i):return world(parents[i])@local(nodes[i]) if i in parents else local(nodes[i])
C=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)));rows=[]
for source in meta['audit']:
 found=[i for i,n in enumerate(nodes) if n.get('extras',{}).get('sourceName')==source['name']];assert len(found)==1,source['name'];i=found[0];expected=C@Matrix(source['matrix'])@C.inverted();actual=world(i);err=max(abs(actual[r][c]-expected[r][c]) for r in range(4) for c in range(4));assert err<.0001,(source['name'],err)
 descendants=[]
 def visit(k):
  if 'mesh' in nodes[k]:descendants.append(k)
  for child in nodes[k].get('children',[]):visit(child)
 visit(i);lo=[float('inf')]*3;hi=[-float('inf')]*3;triangles=0
 for k in descendants:
  m=C.inverted()@world(k)
  for p in g['meshes'][nodes[k]['mesh']]['primitives']:
   accessor=g['accessors'][p['attributes']['POSITION']];view=g['bufferViews'][accessor['bufferView']];offset=binary_start+view.get('byteOffset',0)+accessor.get('byteOffset',0);stride=view.get('byteStride',12)
   for v in range(accessor['count']):
    pos=m@Vector(struct.unpack_from('<3f',blob,offset+v*stride))
    for axis in range(3):lo[axis]=min(lo[axis],pos[axis]);hi[axis]=max(hi[axis],pos[axis])
   triangles+=g['accessors'][p['indices']]['count']//3
 bounds_error=max(abs(a-b) for a,b in zip(lo+hi,source['bounds'][0]+source['bounds'][1]));assert bounds_error<.001,(source['name'],bounds_error);assert triangles==source['triangles'],(source['name'],triangles,source['triangles'])
 rows.append({'name':source['name'],'matrixError':err,'boundsError':bounds_error,'sourceTriangles':source['triangles'],'exportTriangles':triangles})
print(json.dumps({'objects':len(rows),'maxMatrixError':max(r['matrixError'] for r in rows),'maxBoundsError':max(r['boundsError'] for r in rows),'results':rows},ensure_ascii=False,indent=2))
