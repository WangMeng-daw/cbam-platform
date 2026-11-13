import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
import {prepareCompany,editCompany,companyReport,prepareProducts,editProduct,productAssessment,emptyProduct,INSTALLATION_FIELDS} from '../lib/profile-data.mjs';
import {emptyWorkspace,writeWorkspace,readWorkspace} from '../browser/workspace.mjs';
import {calculate} from '../lib/engine.mjs';
import {unzipSync,strFromU8} from 'fflate';
const minimal=prepareCompany({name:'  Factory  ',city:'  City  '});
assert.equal(minimal.name,'Factory');assert.equal(minimal.city,'City');assert.equal(INSTALLATION_FIELDS.length,14);
for(const input of [{name:'Factory',city:''},{name:'',city:'City'},{name:'Factory',city:'  '},{name:'Factory',city:'City',latitude:91},{name:'Factory',city:'City',longitude:-181}])assert.throws(()=>prepareCompany(input));
const company=prepareCompany({id:'test-facility',name:'Fixture installation',city:'Fixture city',englishName:'Example Aluminium Producer',address:'Aluminium street 2023',economicActivity:'Aluminium production',postCode:'123456',poBox:'XYZ',country:'China',countryCode:'CN',latitude:0,longitude:147.8037464,representative:'Synthetic representative',email:'test@example.invalid',telephone:'000-0000',registration:'legacy-id'});
assert.equal(companyReport(company).latitude,0);assert.equal(companyReport(company).locodeCountry,'CN');assert.equal(companyReport(company).registration,'legacy-id');
assert.equal(editCompany({name:'Legacy enterprise',installation:'Legacy installation',registration:'keep'}).name,'Legacy installation');
assert.equal(editCompany({name:'Legacy enterprise'}).name,'Legacy enterprise');
const blank=()=>Array.from({length:5},emptyProduct);
assert.throws(()=>prepareProducts(blank()));
assert.throws(()=>prepareProducts([{category:'Unwrought aluminium',route:''}]));
assert.throws(()=>prepareProducts([{category:'Aluminium products',route:'unknown'}]));
const rows=blank();rows[0]={category:'Unwrought aluminium',route:'Primary (electrolytic) smelting'};
rows[2]={category:'Unwrought aluminium',route:'Secondary aluminium'};
rows[4]={category:'Aluminium products',route:'Aluminium products'};
const products=prepareProducts(rows).map((r,k)=>({...r,id:`profile-${k}`}));
assert.equal(products.length,3);assert.equal(products[1].aluminium,'recycled');
assert.deepEqual(products.map(p=>productAssessment(p).kind),['primary','recycled','forming']);
assert.equal(productAssessment(products[0]).cn,'');
assert.equal(editProduct({id:'old',name:'Old bar',cn:'76041090',aluminium:'primary'}).route,'Aluminium products');
const data={...emptyWorkspace(),companies:[company],products:[...products,{id:'legacy',name:'Legacy bar',cn:'76041090',aluminium:'primary',country:'China'}]};
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
writeWorkspace(data,storage);assert.deepEqual(readWorkspace(storage),data);
const countries=JSON.parse(fs.readFileSync('lib/country-codes.json','utf8'));
assert.equal(countries.records.length,266);assert.equal(new Set(countries.records.map(r=>r.code)).size,266);
assert.equal(countries.records.find(r=>r.code==='CN').name,'China');
for(const code of ['AN','EU','QP','TP','XA','XI','XK','YU','ZR'])assert.ok(countries.records.some(r=>r.code===code));
const vite=await createServer({configFile:'vite.pages.config.ts',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'});
try{
 const {documentExampleInput,defaultExampleInput}=await vite.ssrLoadModule('/lib/fields.ts');
 const {exportReport}=await vite.ssrLoadModule('/browser/report.ts');
 const config=JSON.parse(fs.readFileSync('lib/config.json','utf8'));
 for(const input of [documentExampleInput(),defaultExampleInput()]){
  input.report={...input.report,...companyReport(company)};
  const result=calculate(input,config);
  for(const lang of ['zh','en']){
   const xlsx=exportReport({input,format:'xlsx',lang},config,{result});
   const files=unzipSync(new Uint8Array(await xlsx.arrayBuffer()));
   const sheets=Object.entries(files).filter(([name])=>name.startsWith('xl/worksheets/')).map(([,bytes])=>strFromU8(bytes));
   const values=sheets.filter(xml=>xml.includes(lang==='zh'?'设施英文名称':'Installation English name')).join('\n');
   for(const value of ['Example Aluminium Producer','Aluminium street 2023','Fixture city','123456','XYZ','CN','test@example.invalid',147.8037464])assert.ok(values.includes(String(value)),`Missing ${value} in ${input.mode}/${lang}`);
   const pdf=exportReport({input,format:'pdf',lang},config,{result});assert.ok((await pdf.text()).startsWith('%PDF-1.4'));
  }
 }
 console.log('PASS: installation required/optional fields and coordinates, legacy compatibility, five-row blank/partial/multiple products, route mapping, backup round-trip, 266 annex codes, and actual/default bilingual report fields.');
}finally{await vite.close();}
