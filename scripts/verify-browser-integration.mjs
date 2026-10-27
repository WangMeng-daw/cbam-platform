import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {readXlsx} from '../lib/files.mjs';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const vite=await createServer({configFile:'vite.pages.config.ts',server:{middlewareMode:true},appType:'custom'});
try{
 const {localApi,reportBlob}=await vite.ssrLoadModule('/browser/client.ts');
 const {exampleInput}=await vite.ssrLoadModule('/lib/fields.ts');
 const input=exampleInput();
 const result=await localApi('/api/calculate',{input,consent:false});assert.equal(result.actual.see,1.6981);assert.equal(memory.size,0);
 const saved=await localApi('/api/calculate',{input,consent:true});assert.ok(saved.id);assert.equal((await localApi('/api/records')).length,1);
 for(const lang of ['zh','en']){
  const x=await reportBlob({input:{...input,production:1},recordId:saved.id,format:'xlsx',lang});
  const rows=readXlsx(Buffer.from(await x.arrayBuffer()));assert.ok(rows.some(r=>Object.values(r).includes(1.6981)),'Saved report uses original snapshot');
  const p=await reportBlob({input,format:'pdf',lang});assert.equal(p.type,'application/pdf');assert.ok((await p.text()).startsWith('%PDF-1.4'));
 }
 await localApi('/api/records',{id:saved.id},'DELETE');assert.equal((await localApi('/api/records')).length,0);assert.equal((await localApi('/api/records?archived=1')).length,1);
 await localApi('/api/records',{id:saved.id},'PATCH');assert.equal((await localApi('/api/records')).length,1);
 console.log('PASS: full browser calculation, no-consent non-persistence, save, historical bilingual PDF/XLSX exports, archive and restore.');
}finally{await vite.close();}
