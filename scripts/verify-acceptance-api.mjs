import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {exampleInput} from '../lib/fields.ts';
import {readXlsx} from '../lib/files.mjs';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5173',evidence=[];
async function req(path,data,cookie=''){const start=performance.now();const r=await fetch(origin+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookie},body:data?JSON.stringify(data):undefined,redirect:'manual'});const bytes=Buffer.from(await r.arrayBuffer());return {status:r.status,bytes,headers:r.headers,ms:performance.now()-start,json:()=>JSON.parse(bytes)};}
function check(name,valid){assert.ok(valid,name);evidence.push({name,status:'PASS'});}
const login=await req('/signin-with-chatgpt?return_to=/admin');const auth=login.headers.get('set-cookie')?.split(';')[0];assert.ok(auth);
let c=(await req('/api/admin?kind=config',null,auth)).json();
const stale=await req('/api/admin',{action:'config',config:{...c,version:'outdated'}},auth);check('Stale publication rejected',stale.status===400&&stale.json().error.includes('更新'));
check('English CMS service content retained',c.content.servicesEn.length===3&&c.content.serviceDescriptionsEn.length===3);
check('English report templates retained',c.templates.every(t=>t.headingEn&&t.disclaimerEn));
const v=await req('/api/bootstrap');const visitor=v.headers.get('set-cookie').split(';')[0];
const noConsent=await req('/api/calculate',{input:exampleInput(),consent:'false'},visitor);check('String consent does not save a record',noConsent.status===200&&noConsent.json().id===null);
const badGrid=exampleInput();badGrid.electricity={method:'grid',generated:1000,export:100,factorId:'grid-china'};
check('API rejects country grid as export proxy',(await req('/api/calculate',{input:badGrid,consent:false},visitor)).status===400);
const grid=exampleInput();grid.electricity={method:'grid',generated:1000,export:100};
const gr=await req('/api/calculate',{input:grid,consent:false},visitor);check('API applies official Other-country proxy',gr.status===200&&gr.json().breakdown.electricity===-.0465);
const filtered=await req('/api/export',{action:'table',table:'records',filters:{query:'__NO_MATCH_ACCEPTANCE_20261026__'}},auth);
check('Export respects record search filter',filtered.status===200&&readXlsx(filtered.bytes).length===0);
const list=(await req('/api/admin?kind=records',null,auth)).json();const onlySimple=list.filter(r=>r.mode==='simple');
const modeExport=await req('/api/export',{action:'table',table:'records',filters:{mode:'simple'}},auth);
check('Export respects record mode filter',modeExport.status===200&&readXlsx(modeExport.bytes).length===onlySimple.length);
const en=await req('/api/export',{input:exampleInput(),lang:'en',format:'xlsx'},visitor);check('English spreadsheet has English summary',readXlsx(en.bytes).some(r=>r.Metric==='SEE (tCO2e/t)'&&r['Actual values']===1.6981));
const hist=(await req('/api/admin?kind=history',null,auth)).json();const previous=(await req('/api/admin?kind=history-item&id='+hist[0].id,null,auth)).json();
// Load a historical configuration against the latest edit baseline, as the UI does.
const restoration=await req('/api/admin',{action:'config',config:{...previous,version:c.version}},auth);check('Historical configuration can publish with current baseline',restoration.status===200);
if(restoration.status===200){const restored=restoration.json();const revert=await req('/api/admin',{action:'config',config:{...c,version:restored.version}},auth);assert.equal(revert.status,200,'Restore current configuration after history test');c=revert.json();}
const out=new URL('../../qa/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('acceptance-api.json',out),JSON.stringify({at:new Date().toISOString(),origin,evidence,englishExportMs:en.ms},null,2));
await writeFile(new URL('sample-report-en.xlsx',out),en.bytes);
console.log(JSON.stringify({tests:evidence.length,englishExportMs:en.ms},null,2));
