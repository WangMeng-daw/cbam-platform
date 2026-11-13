import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculate} from '../lib/engine.mjs';
import {actualBenchmark,productOptions,selectProduct} from '../lib/products.mjs';
import {decimal as d} from '../lib/decimal.mjs';
import {createServer} from 'vite';
import {unzipSync,strFromU8} from 'fflate';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const c=read('../lib/config.json'),fixture=read('./fixtures/aluminium-library-validation.json');
assert.equal(productOptions(c).length,59);assert.equal(new Set(productOptions(c).map(p=>p.value)).size,58);
let compared=0;
for(const test of fixture.cases){
 const result=calculate(test.input,c);
 for(const [key,expected] of Object.entries(test.expected)){assert.equal(result.default[key],expected,`${test.cn}/${test.year}/${test.route}/${key}`);compared++;}
 const p={id:'p',name:test.cn,cn:test.cn,kind:test.cn.startsWith('7601')?test.route==='primary'?'primary':'recycled':'forming',production:1000,exportQty:123.456,benchmark:'',fuels:[{type:'fuel-33',quantity:500,ncv:48,ef:56.1,oxidation:100}],precursors:[],anode:{quantity:0,ef:3.66,lossRate:0},pfc:{production:1000,frequency:0,duration:0,collection:100,technology:'CWPB'}};
 const actual=calculate({...test.input,mode:'professional',method:'document',products:[p]},c).actual;
 assert.equal(actual.benchmark,test.actualBenchmark,`A column ${test.cn}/${test.route}`);
 assert.equal(actual.see,1.3464);assert.equal(actual.direct,1346.4);
 assert.equal(actualBenchmark(c,p,test.year),test.actualBenchmark);
 const changed=selectProduct(c,{...p,benchmark:999},test.cn);assert.equal(changed.benchmark,'');
}
const sample=fixture.cases.find(t=>t.cn==='76169990'&&t.year===2029&&t.route==='primary');
assert.equal(calculate({...sample.input,country:'Unknown'},c).default,null);
assert.throws(()=>calculate({...sample.input,cn:'76999999'},c),/CN/);
// Explicit half-up and ceiling boundaries under the requested precision policy.
assert.equal(d('0.123455').round(5).number(),.12346);assert.equal(d('0.1234549').round(5).number(),.12345);
assert.equal(d('56.1005').round(3).number(),56.101);assert.equal(d('200.2').ceil(),201);
const vite=await createServer({configFile:'vite.pages.config.ts',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'});
try{
 const {exportReport}=await vite.ssrLoadModule('/browser/report.ts');
 const {documentExampleInput}=await vite.ssrLoadModule('/lib/fields.ts');
 for(const input of [sample.input,documentExampleInput()]){
  const report=exportReport({input,format:'xlsx',lang:'zh'},c),files=unzipSync(new Uint8Array(await report.arrayBuffer()));
  const styles=strFromU8(files['xl/styles.xml']),sheet=strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.match(styles,/formatCode="#,##0.00000"/);assert.match(styles,/formatCode="#,##0.000"/);
  assert.match(sheet,/s="2"><v>/,'5-place numeric cell style');
  const pdf=await exportReport({input,format:'pdf',lang:'zh'},c).text();
  const text=[...pdf.matchAll(/<([0-9a-f]+)> Tj/g)].map(m=>m[1].match(/.{4}/g).map(h=>String.fromCharCode(parseInt(h,16))).join('')).join('\n');
  assert.ok(text.includes(input.mode==='simple'?'7.22700':'1.60286'), 'PDF displays 5 places');
 }
}finally{await vite.close();}
console.log(JSON.stringify({records:59,uniqueCN:58,sourceCells:fixture.sourceCellsChecked,defaultCases:fixture.cases.length,defaultMetricChecks:compared,actualBenchmarkCases:fixture.cases.length,reportPrecision:'PASS'}));
