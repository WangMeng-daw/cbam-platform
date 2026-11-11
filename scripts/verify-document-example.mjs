import assert from 'node:assert/strict';
import {createServer} from 'vite';
import fs from 'node:fs';
import {calculate} from '../lib/engine.mjs';
import {readXlsx} from '../lib/files.mjs';
const config=JSON.parse(fs.readFileSync(new URL('../lib/config.json',import.meta.url),'utf8'));
const vite=await createServer({configFile:'vite.pages.config.ts',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'});
try{
 const {documentExampleInput,defaultExampleInput}=await vite.ssrLoadModule('/lib/fields.ts');
 const {reportBlob,localApi}=await vite.ssrLoadModule('/browser/client.ts');
 const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 const input=documentExampleInput(),r=calculate(input,config),[a,b]=r.products;
 assert.deepEqual([a.combustion,a.anode,a.cf4,a.c2f6,a.pfc,a.direct,a.see],[32903.3,252540,4.32,.52,35116,320559,1.603]);
 assert.deepEqual([b.direct,b.sources[0].allocation,b.precursor,b.se,b.see],[5283,.6,192335.4,.047,1.749]);
 assert.equal(a.cost,1299658.56);assert.equal(a.costWan,129.97);assert.equal(b.cost,14395757.04);assert.equal(b.costWan,1439.58);
 assert.equal(a.sefa,1.423*.975);assert.equal(b.sefa,.06*.975);assert.notEqual(b.cost,b.certificates*b.price);
 assert.equal(r.totalCost,15695415.6);assert.equal(memory.size,0);
 const invalid=(mutator,pattern)=>{const v=structuredClone(input);mutator(v);assert.throws(()=>calculate(v,config),pattern);};
 invalid(v=>v.products[1].precursors[0].quantity=120001,/超过/);
 invalid(v=>v.products[0].pfc.collection=0,/收集/);
 invalid(v=>v.products[0].anode.lossRate=101,/损失/);
 invalid(v=>v.products[0].fuels[0].quantity=-1,/非负/);
 invalid(v=>v.products[1].precursors[0].productId='missing',/不存在/);
 invalid(v=>v.products[0].id=v.products[1].id,/重复/);
 invalid(v=>{v.products[0].kind='forming';v.products[0].exportQty=0;v.products[1].exportQty=0;v.products[0].precursors=[{productId:'forming',quantity:1}];},/循环/);
 const loss=structuredClone(input);loss.products[0].anode.lossRate=15.18;assert.equal(calculate(loss,config).products[0].anode,214204.428);
 const coal=structuredClone(input);coal.products[0].fuels.push({type:'fuel-19',quantity:1000,ncv:26.7,ef:98.3,oxidation:100});assert.ok(calculate(coal,config).products[0].direct>a.direct);
 const missingPrice=structuredClone(input);missingPrice.quarter=4;missingPrice.priceOverride='';assert.equal(calculate(missingPrice,config).totalCost,null);
 const def=calculate(defaultExampleInput(),config);assert.equal(def.default.cost,287992.46);
 const saved=await localApi('/api/calculate',{input,consent:true});assert.ok(saved.id);
 for(const lang of ['zh','en']){
  const x=await reportBlob({input:{...input,products:[]},recordId:saved.id,format:'xlsx',lang});const rows=readXlsx(Buffer.from(await x.arrayBuffer()));
  for(const value of [1.603,1.749,1299658.56,14395757.04,129.97,1439.58])assert.ok(rows.some(row=>Object.values(row).includes(value)),`Missing report value ${value}`);
  const p=await reportBlob({input,recordId:saved.id,format:'pdf',lang});assert.ok((await p.text()).startsWith('%PDF-1.4'));
 }
 console.log('PASS: document example emissions, staged rounding, 60% allocation, both costs, graph validation, loss rate, extra fuel, price gaps, default regression and saved bilingual PDF/XLSX.');
 console.log(JSON.stringify(r.products.map(({name,see,cost,costWan,netEmissions,certificates})=>({name,see,cost,costWan,netEmissions,certificates})),null,2));
}finally{await vite.close();}
