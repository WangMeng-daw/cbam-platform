import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
import {unzipSync,strFromU8} from 'fflate';
import {prepareCompany,prepareProducts,companyReport,applyProductProfile,assessmentProductInfo,INSTALLATION_REPORT_FIELDS,PRODUCT_REPORT_FIELDS} from '../lib/profile-data.mjs';
import {selectProduct} from '../lib/products.mjs';
import {emptyWorkspace,writeWorkspace,readWorkspace} from '../browser/workspace.mjs';
const output=new URL('../../../outputs/profile-flow-audit/',import.meta.url);fs.mkdirSync(output,{recursive:true});
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};globalThis.localStorage=storage;
const company=prepareCompany({id:'qa-installation',name:'流程验证设施',englishName:'QA Aluminium Facility',address:'Test Street 2026',economicActivity:'Aluminium manufacturing',postCode:'510000',poBox:'QA-BOX-11',city:'广州',country:'China',countryCode:'CN',latitude:0,longitude:113.2644,representative:'测试代表',email:'qa@example.invalid',telephone:'000-12345678'});
const profiles=prepareProducts([
 {id:'qa-forming',name:'流程验证铝型材',category:'Aluminium products',route:'Aluminium products',cn:'76041090',country:'China'},
 {id:'qa-primary',name:'流程验证原铝',category:'Unwrought aluminium',route:'Primary (electrolytic) smelting',cn:'76011010',country:'China'},
 {id:'qa-recycled',name:'流程验证再生铝',category:'Unwrought aluminium',route:'Secondary aluminium',cn:'76012080',country:'China'}
]);
writeWorkspace({...emptyWorkspace(),companies:[company],products:profiles},storage);
const restored=readWorkspace(storage);assert.deepEqual(restored.companies[0],company);assert.deepEqual(restored.products,profiles);
const vite=await createServer({configFile:'vite.pages.config.ts',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'});
let checks=0;
const pdfText=bytes=>[...Buffer.from(bytes).toString('utf8').matchAll(/<([0-9a-f]+)> Tj/g)].map(m=>m[1].match(/.{4}/g).map(h=>String.fromCharCode(parseInt(h,16))).join('')).join('\n');
function sheet(bytes,name){const files=unzipSync(new Uint8Array(bytes)),workbook=strFromU8(files['xl/workbook.xml']);const id=[...workbook.matchAll(/<sheet name="([^"]+)" sheetId="(\d+)"/g)].find(m=>m[1]===name)?.[2];assert.ok(id,`Missing sheet ${name}`);return strFromU8(files[`xl/worksheets/sheet${id}.xml`]);}
try{
 const {newInput,documentProduct,reportGroups}=await vite.ssrLoadModule('/lib/fields.ts');
 const {localApi,reportBlob}=await vite.ssrLoadModule('/browser/client.ts');
 const config=(await localApi('/api/bootstrap')).config;
 let input={...newInput(),report:companyReport(restored.companies[0]),year:2026,quarter:2,priceOverride:75.36};
 input=applyProductProfile(input,restored.products[0],documentProduct('forming','qa-process'));
 input.products[0]={...input.products[0],production:1000,exportQty:400,fuels:[{type:'fuel-33',quantity:500,ncv:48,ef:56.1,oxidation:100}]};
 const repeat=applyProductProfile(input,{...profiles[0],name:'更新后的测试产品'},documentProduct('forming','must-not-duplicate'));
 assert.equal(repeat.products.length,1);assert.equal(repeat.products[0].id,'qa-process');assert.equal(repeat.products[0].production,1000);assert.equal(repeat.products[0].fuels[0].quantity,500);assert.equal(repeat.products[0].name,'更新后的测试产品');checks+=5;
 const selected=selectProduct(config,input.products[0],'76042100');assert.equal(selected.name,'流程验证铝型材');assert.equal(selected.category,'Aluminium products');checks+=2;
 for(const [index,profile] of profiles.entries()){
  const applied=applyProductProfile({...newInput(),report:companyReport(company)},profile,documentProduct('forming','route-'+index));
  assert.equal(applied.products[0].route,profile.route);assert.equal(assessmentProductInfo(applied,config)[0].route,profile.route);assert.equal(assessmentProductInfo(applied,config)[0].country,'China');checks+=3;
 }
 const switched={...input,mode:'simple',cn:'76011010',aluminium:'recycled'};
 assert.equal(assessmentProductInfo(switched,config)[0].category,'Unwrought aluminium');assert.equal(assessmentProductInfo(switched,config)[0].route,'Secondary aluminium');assert.notEqual(assessmentProductInfo(switched,config)[0].name,profiles[0].name);checks+=3;
 for(const mode of ['professional','simple']){
  const data={...input,mode,exportQty:400};
  const saved=await localApi('/api/calculate',{input:data,consent:true});assert.ok(saved.id);checks++;
  const record=(await localApi('/api/records?id='+saved.id)).record;
  assert.deepEqual(record.input.report,companyReport(company));assert.deepEqual(record.input.productProfile,profiles[0]);checks+=2;
  const productInfo=assessmentProductInfo(saved.input,config)[0];
  for(const lang of ['zh','en']){
   const wrong={...data,report:{operatorName:'WRONG CURRENT COMPANY'},productProfile:{cn:'76041090',name:'WRONG CURRENT PRODUCT'}};
   const xlsx=await reportBlob({input:wrong,recordId:saved.id,format:'xlsx',lang}),pdf=await reportBlob({input:wrong,recordId:saved.id,format:'pdf',lang});
   const xb=new Uint8Array(await xlsx.arrayBuffer()),pb=new Uint8Array(await pdf.arrayBuffer()),text=pdfText(pb);
   const installation=sheet(xb,mode==='simple'?'IV_operator':lang==='zh'?'设施信息':'Installation'),product=sheet(xb,lang==='zh'?'产品档案':'Product_Profile');
   for(const [key,zh,en] of INSTALLATION_REPORT_FIELDS){
    const expected=companyReport(company)[key];assert.ok(installation.includes(String(expected)),`${mode}/${lang}: missing installation ${key} in XLSX`);
    const labels=mode==='simple'?reportGroups.find(g=>g.id==='operator').fields.find(f=>f[0]===key):[key,zh,en];
    assert.ok(text.includes(`${labels[lang==='zh'?1:2]}: ${expected}`),`${mode}/${lang}: missing installation ${key} in PDF`);checks+=2;
   }
   for(const [key,zh,en] of PRODUCT_REPORT_FIELDS){assert.ok(product.includes(String(productInfo[key])),`Missing product ${key} in XLSX`);assert.ok(text.includes(`${lang==='zh'?zh:en}: ${productInfo[key]}`),`Missing product ${key} in PDF`);checks+=2;}
   assert.ok(!text.includes('WRONG CURRENT'));checks++;
   fs.writeFileSync(new URL(`${mode}-${lang}.xlsx`,output),xb);fs.writeFileSync(new URL(`${mode}-${lang}.pdf`,output),pb);
  }
 }
 fs.writeFileSync(new URL('verification.json',output),JSON.stringify({checks,companyFields:14,productFields:5,modes:['actual','default'],languages:['zh','en'],source:'synthetic QA data only',status:'PASS'},null,2));
 console.log(`PASS: ${checks} assertions; saved/restored profiles -> applied assessment -> saved snapshot -> bilingual actual/default PDF/XLSX; repeat-use preserves process inputs and avoids duplicates.`);
}finally{await vite.close();}
