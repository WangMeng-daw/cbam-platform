import {writeFile,mkdir} from 'node:fs/promises';
import {exampleInput} from '../lib/fields.ts';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5174';
const startHome=performance.now();const home=await fetch(origin);await home.text();const homepageHTTPMs=performance.now()-startHome;
async function one(k){const input={...exampleInput(),exportQty:1000+k};const start=performance.now();try{const r=await fetch(origin+'/api/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input,consent:false})});const d=await r.json();return {ms:performance.now()-start,ok:r.status===200&&d.actual?.see===1.6981&&d.input.exportQty===1000+k};}catch(e){return {ms:performance.now()-start,ok:false,error:e.message};}}
function summarize(results){const ms=results.map(r=>r.ms).sort((a,b)=>a-b);return {requests:results.length,p50Ms:ms[Math.ceil(ms.length*.5)-1],p95Ms:ms[Math.ceil(ms.length*.95)-1],maxMs:ms.at(-1),errors:results.filter(r=>!r.ok).length,within2Seconds:results.every(r=>r.ok&&r.ms<=2000)};}
const single=summarize([await one(0)]);
const coldConcurrent=summarize(await Promise.all(Array.from({length:500},(_,k)=>one(k))));
const warmConcurrent=summarize(await Promise.all(Array.from({length:500},(_,k)=>one(k+500))));
const sequential=[];for(let k=0;k<20;k++)sequential.push(await one(k+1000));
const reports={};for(const format of ['pdf','xlsx']){const t=performance.now();const r=await fetch(origin+'/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:exampleInput(),format})});const b=await r.arrayBuffer();reports[format]={ms:performance.now()-t,status:r.status,bytes:b.byteLength};}
const result={origin,at:new Date().toISOString(),homepageHTTPMs,homepageStatus:home.status,single,coldConcurrent,warmConcurrent,sequential:summarize(sequential),reports,scope:'Local compiled Worker; concurrent API requests with distinct export quantities. HTTP completion includes body. Not browser first paint, 500 full browser sessions, or public-network SLA.'};
await mkdir(new URL('../../qa/',import.meta.url),{recursive:true});await writeFile(new URL('../../qa/performance.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
if([single,coldConcurrent,warmConcurrent,result.sequential].some(s=>s.errors))process.exitCode=1;
