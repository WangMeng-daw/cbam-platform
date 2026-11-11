import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
import {calculate} from '../lib/engine.mjs';
import {readXlsx} from '../lib/files.mjs';
const config=JSON.parse(fs.readFileSync(new URL('../lib/config.json',import.meta.url),'utf8'));
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/document-validation.json',import.meta.url),'utf8'));
const failures=[],summaries=[];let checks=0;
function compare(name,field,actual,expected){
 checks++;
 // Only unrounded fractions permit floating-point serialization tolerance.
 const approximate=['embeddedProduction','sefa'].includes(field);
 if(approximate?Math.abs(actual-expected)>1e-9*Math.max(1,Math.abs(expected)):actual!==expected)failures.push({name,field,actual,expected});
}
for(const test of fixture.cases){
 const original=JSON.stringify(test.input),result=calculate(test.input,config);
 assert.equal(JSON.stringify(test.input),original,'Engine mutated input');
 for(const p of result.products)for(const [field,expected] of Object.entries(test.expected.products[p.id]))compare(test.name+'/'+p.id,field,p[field],expected);
 compare(test.name,'totalCost',result.totalCost,test.expected.totalCost);
 compare(test.name,'totalExportEmissions',result.totalExportEmissions,test.expected.totalExportEmissions);
 // Row ordering is presentation-only, and changing export/price must not change production emissions.
 const reverse=calculate({...test.input,products:[...test.input.products].reverse()},config);
 for(const p of result.products)assert.deepEqual(reverse.products.find(x=>x.id===p.id),p,'Product order changed result');
 const zero=calculate({...test.input,priceOverride:150,products:test.input.products.map(p=>({...p,exportQty:0}))},config);
 for(const p of zero.products){const baseline=result.products.find(x=>x.id===p.id);assert.equal(p.see,baseline.see);assert.equal(p.embeddedProduction,baseline.embeddedProduction);assert.equal(p.cost,0);}
 if(!test.name.startsWith('seeded-'))summaries.push({name:test.name,products:result.products.map(({id,direct,see,netEmissions,cost})=>({id,direct,see,netEmissions,cost}))});
}
let reportChecks=0;
if(!failures.length){
 const vite=await createServer({configFile:'vite.pages.config.ts',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'});
 try{
  const {localApi,reportBlob}=await vite.ssrLoadModule('/browser/client.ts');
  const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  for(const test of fixture.cases.filter(t=>['two-process-40-60','three-process-chain','cost-half-cent','C2F6-half-up','fractional-output-export'].includes(t.name))){
   const saved=await localApi('/api/calculate',{input:test.input,consent:true});
   for(const lang of ['zh','en']){
    const request={recordId:saved.id,input:{...test.input,products:[]},lang};
    const xlsx=await reportBlob({...request,format:'xlsx'}),rows=readXlsx(Buffer.from(await xlsx.arrayBuffer()));
    const pdf=await reportBlob({...request,format:'pdf'}),raw=await pdf.text();
    const text=[...raw.matchAll(/<([0-9a-f]+)> Tj/g)].map(m=>m[1].match(/.{4}/g).map(h=>String.fromCharCode(parseInt(h,16))).join('')).join('\n');
    for(const p of test.input.products){
     const values=Object.values(rows.find(r=>Object.values(r)[0]===p.name)),e=test.expected.products[p.id];
     assert.deepEqual(values.slice(2),[Number(p.production),Number(p.exportQty),e.direct,e.se,e.see,p.benchmark,e.sefa,e.netEmissions,e.certificates,test.input.priceOverride,e.cost,e.costWan]);
     assert.ok(text.includes(`${lang==='en'?'Cost EUR':'成本 EUR'}: ${e.cost}`),`PDF cost mismatch: ${test.name}`);
     assert.ok(text.includes(`SEE tCO2e/t: ${e.see}`),`PDF SEE mismatch: ${test.name}`);
     reportChecks+=3;
    }
   }
  }
 }finally{await vite.close();}
}
console.log(JSON.stringify({cases:fixture.cases.length,checks,reportChecks,failures:failures.length,firstFailures:failures.slice(0,20),summaries},null,2));
if(failures.length)process.exitCode=1;
