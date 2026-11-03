// Dependency-free, deterministic ZIP of the corresponding source.
import {readdirSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative,join} from 'node:path';
import {deflateRawSync} from 'node:zlib';
const root=resolve('.');
const ignored=new Set(['node_modules','.sites-runtime','dist','.git','.agents','.codex','.openai']);
const table=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc32=data=>{let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
function files(dir){return readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>{if(ignored.has(entry.name)||entry.name.startsWith('.env')||/\.(pem|key|tsbuildinfo)$/.test(entry.name)||entry.isSymbolicLink())return [];const path=join(dir,entry.name);if(relative(root,path).replaceAll('\\','/')==='public/source.zip')return [];return entry.isDirectory()?files(path):entry.isFile()?[path]:[];});}
const local=[],central=[];let offset=0;
for(const file of files(root)){
 const name=Buffer.from('zi-typing/'+relative(root,file).replaceAll('\\','/'),'utf8');
 const raw=readFileSync(file),compressed=deflateRawSync(raw),crc=crc32(raw);
 const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(raw.length,22);header.writeUInt16LE(name.length,26);
 local.push(header,name,compressed);
 const record=Buffer.alloc(46);record.writeUInt32LE(0x02014b50,0);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(0x800,8);record.writeUInt16LE(8,10);record.writeUInt16LE(0x21,14);record.writeUInt32LE(crc,16);record.writeUInt32LE(compressed.length,20);record.writeUInt32LE(raw.length,24);record.writeUInt16LE(name.length,28);record.writeUInt32LE(offset,42);central.push(record,name);offset+=header.length+name.length+compressed.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(central.length/2,8);end.writeUInt16LE(central.length/2,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);mkdirSync('public',{recursive:true});writeFileSync('public/source.zip',Buffer.concat([...local,directory,end]));
console.log(`Source packaged: ${central.length/2} files`);
