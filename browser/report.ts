import {calculate} from '../lib/engine.mjs';
import {xlsx,pdf,flatten} from './files.mjs';
import {reportGroups} from '../lib/fields';
export function exportReport(d:any,c:any,stored:any=null):Blob{
 const r:any=stored?.result||calculate(d.input,c),i=r.input||d.input,eng=d.lang==='en',t=c.templates.find((x:any)=>x.id===(d.template||c.activeTemplate))||c.templates[0];const label=(zh:string,en:string)=>eng?en:zh;
 if(r.products)return exportDocumentReport(r,c,d.format,eng);
 const disclaimer=eng?(t.disclaimerEn||'For reference only. Final determination rests with the EU authorities; independent verification is required before submission.'):t.disclaimer;
 const simple=r.mode==='simple';
 const formatted=(v:any,n:number)=>v===null||v===undefined?'':Number(Number(v).toFixed(n));
 const core=[[label('指标','Metric'),label('企业实际值','Actual values'),label('官方默认值','Official defaults')],['SEE (tCO2e/t)',formatted(r.actual?.see,3),formatted(r.default?.see,3)],[label('输欧总排放 tCO2e','Export emissions tCO2e'),formatted(r.actual?.total,0),formatted(r.default?.total,0)],['SEFA (tCO2e/t)',formatted(r.actual?.sefa,3),formatted(r.default?.sefa,3)],[label('需交证书数','Certificates before carbon-price credit'),r.actual?.certificates??'',r.default?.certificates??''],[label('碳价 EUR/tCO2','Price EUR/tCO2'),r.actual?.price??'',r.default?.price??''],[label('估算成本 EUR','Estimated cost EUR'),r.actual?.cost??'',r.default?.cost??''],['Configuration',r.configVersion,''],['Engine',r.version,''],['Price source',r.priceSource,''],['Scenario price',r.priceEstimate?'Yes':'No','']];
 const sheets:any[]=[{name:label('核算摘要','Summary'),rows:core},{name:label('产品与边界','Product_Boundary'),rows:[['Field','Value'],...Object.entries(i).filter(([_,v])=>typeof v!=='object')]},{name:label('排放分项','Emissions'),rows:[['Category','tCO2e'],...Object.entries(r.breakdown)]},{name:label('计算过程','Calculation_Trace'),rows:[['Source','Formula','Value','Data origin'],...r.trace.map((v:any)=>[v.name,v.formula,v.value,v.source])]},{name:label('全量输入数据','Full_Input'),rows:[['Field path','Value'],...flatten(i)]},{name:label('前体溯源','Precursors'),rows:[['Source','Country','Quantity t','SEE','mi t/t','SEFA','Installation','Period start','Period end','Evidence'],...(r.intermediate?.precursors||[]).map((p:any)=>[p.name,p.country,p.quantity,p.see,p.unitConsumption,p.sefa,p.installation,p.periodStart,p.periodEnd,p.evidence])]},{name:label('数据缺口与警告','Quality_Notes'),rows:[['Notes'],...r.warnings.map((w:string)=>[w]),[disclaimer],[label('模板按ANNEX IV框架组织，缺失字段需补充，非欧盟官方受理模板。','ANNEX IV framework; missing fields require completion. Not an official EU submission file.')]]}];
 if(simple){for(let j=sheets.length-1;j>=0;j--)if([label('前体溯源','Precursors'),label('排放分项','Emissions')].includes(sheets[j].name))sheets.splice(j,1);}
 for(const g of (simple?reportGroups.filter(g=>g.id==='operator'):reportGroups))sheets.push({name:'IV_'+g.id,rows:[['ANNEX IV field',label('填报值','Reported value'),label('状态','Status')],...g.fields.map(([k,zh,en])=>[eng?en:zh,i.report?.[k]||'',i.report?.[k]?label('已填','Provided'):label('待补充 / 适用性确认','Complete or confirm N/A')])]});
 if(!simple)sheets.push({name:'Factor_Snapshot',rows:[['id','name','EF','NCV','Source','Version','Effective'],...c.factors.map((f:any)=>[f.id,f.name,f.ef,f.ncv,f.source,f.version,f.effective])]});
 const dv=c.defaults.find((d:any)=>d.cn===i.cn&&d.country===i.country&&d.year===Number(i.year));const bm=c.benchmarks.find((b:any)=>b.cn===i.cn&&b.year===Number(i.year));
 sheets.push({name:'Default_Data',rows:[['Field','Value','Source'],['Product default tCO2e/t',formatted(dv?.value,3),dv?.source||''],['Route',i.aluminium==='recycled'?'L':'K',''],['Benchmark tCO2e/t',bm?.[i.aluminium==='recycled'?'L':'K']??'',bm?.source||''],['CBAM factor',c.rules.phaseFactors[i.year],'Annual CBAM factor'],['Certificate rounding','Ceiling after multiplying by export quantity',''],['Display precision','Emissions 0 decimals; specific emissions 3; factors 2 (full precision retained)','']]});
 if(!t.includeTrace){const index=sheets.findIndex((s:any)=>s.name===label('计算过程','Calculation_Trace'));if(index>=0)sheets.splice(index,1);}
 sheets.push({name:'Report_Metadata',rows:[['Field','Value'],['Template',t.id],['Version',t.version],['Heading',eng?(t.headingEn||t.heading):t.heading],['Disclaimer',disclaimer],...(t.includeServices?(eng?(c.content.servicesEn||c.content.services):c.content.services).map((s:string,k:number)=>['Service '+(k+1),s]):[])]});
 if(d.format==='xlsx')return response(xlsx(sheets),'xlsx');
 if(d.format!=='pdf')throw Error('导出格式不支持');
 const lines:any[]=[{heading:true,text:eng?(t.headingEn||'Aluminium emissions inventory and accounting report'):t.heading},label('核算依据：EU 2023/956、EU 2025/2547、EU 2025/2620','Basis: EU 2023/956, EU 2025/2547, EU 2025/2620'),`CN ${i.cn} | ${i.country} | ${i.year} Q${i.quarter} | ${i.exportQty} t`,`Generated: ${new Date().toISOString()} | Configuration: ${r.configVersion}`,'',...core.map(row=>row.join(' | ')),{heading:true,text:label('生产边界与排放分项','Production boundary and emission breakdown')},`Boundary: ${i.boundary} | Production: ${i.production||'N/A'} t`,...Object.entries(r.breakdown).map(([k,v])=>`${k}: ${v} tCO2e`),{heading:true,text:label('数据质量与缺口','Data quality and gaps')},...r.warnings];
 if(simple){const start=lines.findIndex((v:any)=>v?.text===label('生产边界与排放分项','Production boundary and emission breakdown'));if(start>=0)lines.splice(start,2);}
 for(const g of (simple?reportGroups.filter(g=>g.id==='operator'):reportGroups)){lines.push({heading:true,text:g.title[eng?1:0]});for(const[k,zh,en]of g.fields)lines.push(`${eng?en:zh}: ${i.report?.[k]||label('待补充 / 适用性确认','Complete or confirm N/A')}`);}
 if(t.includeTrace){lines.push({heading:true,text:label('计算明细与来源','Calculation trace and sources')});for(const tr of r.trace)lines.push(tr.name,`${tr.formula} = ${tr.value}`,`Source: ${tr.source}`);}
 lines.push({heading:true,text:label('声明与后续核查','Disclaimer and verification')},disclaimer,label('本报告为数据准备与测算文件，不代表已完成独立核查。','This report supports data preparation and estimation; it is not independent verification.'));
 if(t.includeServices)lines.push({heading:true,text:label('平台功能','CBAM services')},...(eng?(c.content.servicesEn||c.content.services):c.content.services),`${c.content.phone} | ${c.content.email}`);
 return response(pdf(lines,'CBAM '+i.cn),'pdf');
}
function response(bytes:any,ext:string){return new Blob([bytes],{type:ext==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}

function exportDocumentReport(r:any,c:any,format:string,eng:boolean):Blob{
 const L=(zh:string,en:string)=>eng?en:zh;
 const basis=L('项目文档口径：实际值计算示例（平台开发用）。仅扣本工序免费分配；成本按未取整排放负担计算。此口径不等同于欧盟正式清缴口径。','Project document method: process-only allocation; costs use unrounded liability. This method differs from official EU settlement methodology.');
 const headers=[L('产品','Product'),'CN',L('产量 t','Production t'),L('输欧量 t','Exports t'),L('直接排放 t','Direct t'),'SE tCO2e/t','SEE tCO2e/t',L('本工序基准','Process benchmark'),'SEFA',L('未取整排放负担 t','Unrounded liability t'),L('整张证书参考数','Whole-certificate estimate'),L('碳价 EUR','Price EUR'),L('成本 EUR','Cost EUR'),L('成本 万欧元','Cost EUR x 10000')];
 const summary=r.products.map((p:any)=>[p.name,p.cn,p.production,p.exportQty,p.direct,p.se,p.see,p.benchmark,p.sefa,p.netEmissions,p.certificates,p.price??'',p.cost??'',p.costWan??'']);
 const notes=[basis,L('燃料排放保留1位小数；CF4、C2F6先保留2位，PFC当量与工序总排放取整；SEE保留3位后用于成本计算。','Fuel: 1 decimal; CF4/C2F6: 2 decimals before CO2e; PFC CO2e and process emissions: integers; SEE: 3 decimals before cost calculation.'),r.input.report?.dataGaps||'',...r.warnings];
 const meta=[['Method',r.method],['Engine',r.version],['Configuration',r.configVersion],['Year',r.input.year],['Quarter',r.input.quarter],['Price source',r.priceSource],['Scenario',r.priceEstimate?'Yes':'No'],['Enterprise',r.input.report?.operatorName||''],['Generated',new Date().toISOString()]];
 if(format==='xlsx')return response(xlsx([
 {name:L('各产品核算','Products'),rows:[headers,...summary]},
 {name:L('排放分项','Emissions'),rows:[['Product','Fuel t','Anode t','CF4 t','C2F6 t','PFC CO2e t','Direct t','Allocated upstream t','Embedded production t'],...r.products.map((p:any)=>[p.name,p.combustion,p.anode,p.cf4,p.c2f6,p.pfc,p.direct,p.precursor,p.embeddedProduction])]},
 {name:L('工序关联与分摊','Allocation'),rows:[['Product','Upstream','Input t','Allocation share','Allocated emissions t'],...r.products.flatMap((p:any)=>p.sources.map((s:any)=>[p.name,s.name,s.quantity,s.allocation,s.emissions]))]},
 {name:L('计算过程','Trace'),rows:[['Item','Formula','Value','Source'],...r.trace.map((t:any)=>[t.name,t.formula,t.value??'',t.source])]},
 {name:L('全量输入','Input'),rows:[['Field','Value'],...flatten(r.input)]},
 {name:L('核算说明','Notes'),rows:[['Notes'],...notes.map(t=>[t])]},
 {name:'Metadata',rows:[['Field','Value'],...meta,['Total cost EUR',r.totalCost??''],['Total export emissions t',r.totalExportEmissions]]}
 ]),'xlsx');
 if(format!=='pdf')throw Error('不支持的导出格式');
 const lines:any[]=[{heading:true,text:L('产品实际值核算报告（文档口径）','Actual-value report (document method)')},basis,...meta.map(row=>row.join(': '))];
 for(const [index,p] of r.products.entries()){lines.push({heading:true,text:p.name+' · '+p.cn});for(let k=2;k<headers.length;k++)lines.push(headers[k]+': '+summary[index][k]);lines.push(L('燃料 / 阳极 / PFC 排放 t','Fuel / Anode / PFC emissions t')+`: ${p.combustion} / ${p.anode} / ${p.pfc}`,`CF4: ${p.cf4} t; C2F6: ${p.c2f6} t`);for(const s of p.sources)lines.push(L('上游分摊','Upstream allocation')+`: ${s.name}; ${s.quantity} t; ${(s.allocation*100).toFixed(2)}%; ${s.emissions} tCO2e`);}
 lines.push({heading:true,text:L('合计','Totals')},`EUR: ${r.totalCost??'—'}; tCO2e: ${r.totalExportEmissions}`,{heading:true,text:L('计算明细','Calculation trace')});for(const t of r.trace)lines.push(t.name,t.formula+' = '+(t.value??'—'));
 lines.push({heading:true,text:L('核算说明','Notes')},...notes);return response(pdf(lines,'CBAM actual document method'),'pdf');
}
