import test from 'node:test';
import assert from 'node:assert/strict';
import {PrologueView} from '../game/prologue-view.js';
test('dialogue background reveals text, advances once, and buttons do not bubble',()=>{
 const nodes=new Map(),node=key=>{if(!nodes.has(key))nodes.set(key,{querySelector:node});return nodes.get(key);};
 const old=globalThis.document;globalThis.document={createElement:()=>node('root'),body:{append(){}}};
 try{
  let advances=0,changed=0,stops=0;
  const v=new PrologueView({changed:()=>changed++,focus(){},continueGame(){},project(){}});
  v.world={inPrologue:true,dialogue:{text:'Hello world'},advanceDialogue(){advances++}};
  const click={stopPropagation(){stops++}};
  v.dialog.onclick(click);assert.equal(v.typed,11);assert.equal(advances,0);
  v.dialog.onclick(click);assert.equal(advances,1);assert.equal(changed,1);
  v.dialog.onclick(click);assert.equal(advances,1,'rapid extra click blocked');
  v.guardUntil=0;node('.next-line').onclick(click);assert.equal(advances,2);
  assert.equal(stops,4,'background and button stop propagation');
 }finally{globalThis.document=old;}
});
