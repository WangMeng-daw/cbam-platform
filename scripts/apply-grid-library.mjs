import {readFile} from 'node:fs/promises';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5173';
const login=await fetch(origin+'/signin-with-chatgpt?return_to=/admin',{redirect:'manual'});
const cookie=login.headers.get('set-cookie')?.split(';')[0];if(!cookie)throw Error('Use an authorized local admin session to apply this library');
const headers={'Content-Type':'application/json',Cookie:cookie};
const response=await fetch(origin+'/api/admin?kind=config',{headers});if(!response.ok)throw Error('Administrator authorization required');
const c=await response.json();
const rows=JSON.parse(await readFile(new URL('../lib/grid-factors.json',import.meta.url),'utf8'));
const ids=new Set(c.factors.map(f=>f.id));const added=rows.filter(f=>!ids.has(f.id));
c.factors.push(...added);
const seed=JSON.parse(await readFile(new URL('../lib/config.json',import.meta.url),'utf8'));
for(const table of ['defaults','precursorDefaults','benchmarks','pfc'])for(const row of c[table]){
  const known=seed[table].find(s=>s.id===row.id&&s.cn===row.cn&&s.country===row.country&&Number(s.year||0)===Number(row.year||0));
  if(known&&['value','sef','process'].every(k=>row[k]===known[k]))for(const k of ['version','effective'])if(!row[k])row[k]=known[k];
}
for(const key of ['announcementEn','servicesEn','serviceDescriptionsEn','switchboard','postcode'])if(c.content[key]===undefined)c.content[key]=seed.content[key];
for(const p of c.prices)if(p.kind==='EUA'&&p.date.startsWith('2025'))p.source='https://www.eex.com/fileadmin/EEX/Downloads/Markets/Environmentals/EUA_Emission_Spot_Primary_Market_Auction_Report/Archive_Reports/emission-spot-primary-market-auction-report-2012-2025-data.zip';
for(const t of c.templates){const known=seed.templates.find(s=>s.id===t.id);if(known)for(const k of ['headingEn','disclaimerEn'])if(!t[k])t[k]=known[k];}
c.textOverrides={...seed.textOverrides,...c.textOverrides};
const published=await fetch(origin+'/api/admin',{method:'POST',headers,body:JSON.stringify({action:'config',config:c})});
const data=await published.json();if(!published.ok)throw Error(data.error);
console.log(JSON.stringify({added:added.length,total:data.factors.length,version:data.version}));
