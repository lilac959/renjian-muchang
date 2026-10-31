import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../game/vendor/three.module.js';
import {batchSourceDecorations} from '../game/source-batching.js';
test('static batching preserves world vertices and excludes animation prototypes and terrain',()=>{
 const root=new T.Group();root.position.set(60,-.5,31);root.scale.setScalar(.5);
 const mat=new T.MeshStandardMaterial(),parts=[];
 for(let i=0;i<2;i++){const g=new T.Group();g.position.set(i*4,2,3);g.rotation.y=i*.4;const m=new T.Mesh(new T.BoxGeometry(),mat);g.add(m);root.add(g);parts.push(m);}
 const proto=new T.Group();proto.userData.role='prototype';const blade=new T.Mesh(new T.BoxGeometry(),mat);proto.add(blade);root.add(proto);
 const terrain=new T.Mesh(new T.PlaneGeometry(),mat);terrain.userData.role='terrain';root.add(terrain);root.updateMatrixWorld(true);
 const positions=meshes=>meshes.flatMap(m=>Array.from({length:m.geometry.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(m.geometry.attributes.position,i).applyMatrix4(m.matrixWorld).toArray()));
 const before=positions(parts);assert.equal(batchSourceDecorations(root),1);root.updateMatrixWorld(true);
 const batch=root.children.find(o=>o.name.startsWith('Source batch'));const after=positions([batch]);assert.equal(before.length,after.length);for(let i=0;i<before.length;i++)for(let j=0;j<3;j++)assert.ok(Math.abs(before[i][j]-after[i][j])<1e-5);
 assert.equal(blade.parent,proto);assert.equal(terrain.parent,root);
});
