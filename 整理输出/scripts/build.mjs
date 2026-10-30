import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'dist'),{recursive:true});
await cp(path.join(root,'game'),path.join(root,'dist'),{recursive:true});
// Stored ZIP with CRC-32: no external archiver, deterministic single-folder layout.
const files=['index.html','style.css','app.js','engine.js','config.js','icon.svg','manifest.webmanifest'];
let offset=0;const local=[],central=[];
function crc32(buffer){let c=0xffffffff;for(const b of buffer){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
for(const file of files){const data=await readFile(path.join(root,'dist',file)),name=Buffer.from('renjianmuchang/'+file),crc=crc32(data),header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);local.push(header,name,data);const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(0x21,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(data.length,20);entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(name.length,28);entry.writeUInt32LE(offset,42);central.push(entry,name);offset+=header.length+name.length+data.length;}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
await mkdir(path.join(root,'release'),{recursive:true});const zip=path.join(root,'release','renjianmuchang-h5-v0.1.0.zip');await writeFile(zip,Buffer.concat([...local,directory,end]));console.log('Built dist/ and '+zip);
