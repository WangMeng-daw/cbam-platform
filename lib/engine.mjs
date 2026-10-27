// All internal energy quantities are GJ; emissions tCO2e; mass t; electricity kWh.
// Published legal values are versioned in config; unprovided parameters are never invented.
import {clone} from './clone.mjs';
export const ENGINE_VERSION='1.1.0';
export const round=(x,n=4)=>Number(Number(x).toFixed(n));
const blank=x=>x===''||x===null||x===undefined;
const number=(x,name,{positive=false,max=Infinity}={})=>{if(blank(x))throw Error(`${name}：请填写 / required`);let n=Number(x);if(!Number.isFinite(n)||n<0||(positive&&n===0)||n>max)throw Error(`${name}：数值不合法 / invalid value`);return n;};
const opt=(x,name,def=0)=>blank(x)?def:number(x,name);
export function batchQuantity(x,product=false){let {inbound=0,outbound=0,opening=0,closing=0,returned=0}=x;[inbound,outbound,opening,closing,returned].forEach(v=>number(v,'库存'));return product?+outbound-inbound-opening+(+closing)-returned:+inbound-outbound+(+opening)-closing;}
export function resolveFactor(row,field,fallback,priority=['laboratory','typeII','typeI']){for(const level of priority){const explicit=level===row.quality?row[field]:undefined;const v=!blank(row[`${field}_${level}`])?row[`${field}_${level}`]:explicit;if(!blank(v))return {value:number(v,field),source:level};} if(!row.quality&&!blank(row[field]))return{value:number(row[field],field),source:'laboratory'}; if(blank(fallback))throw Error(`${row.name||row.type} ${field}：缺少适用因子 / factor required`);return{value:number(fallback,field),source:'typeI'};}
export function calculate(input,config){
 const started=performance.now(), warnings=[],trace=[];if(!['simple','professional'].includes(input?.mode))throw Error('请选择有效核算模式'); const i=clone(input), r=config.rules;
 if(!i||typeof i!=='object')throw Error('输入无效');
 const numericKeys=new Set(['exportQty','yieldRate','production','quantity','ncv','ef','oxidation','biomass','conversion','purity','flueGas','flareVolume','flareEF','import','export','importEF','exportEF','importNCV','exportNCV','generated','aem','aeo','ce','collection','sef','ovc','ratio','uncertainty','events','cells','days','minutes','see','sefa','benchmark','processBenchmark','cems','carbonPaid','priceOverride','inbound','outbound','opening','closing','returned','direct']);
 function inspect(x,depth=0){if(depth>15)throw Error('输入层级过深');if(Array.isArray(x)){if(x.length>500)throw Error('源流数量超限');x.forEach(v=>inspect(v,depth+1));}else if(x&&typeof x==='object'){for(const[k,v]of Object.entries(x)){if(numericKeys.has(k)&&!blank(v))number(v,k);else if(v&&typeof v==='object')inspect(v,depth+1);}}}
 inspect(i);for(const[k,v]of Object.entries(r.enabled))if(v===false)warnings.push(`核算分项 ${k} 已在后台关闭，结果不代表完整盘查。 / Category disabled.`);
 const val=(v,n,o)=>number(v,n,o); const positive=(v,n)=>val(v,n,{positive:true});
 const add=(name,formula,value,source,extra={})=>{trace.push({name,formula,value:round(value,8),source,...extra});return value;};
 const factors=config.factors; const factor=id=>factors.find(f=>f.id===id); const unit=positive(i.exportQty,'出口量');
 if(!/^760[48]\d{4}$/.test(i.cn||''))throw Error('请输入适用的8位铝型材CN编码 / supported CN required');
 const year=positive(i.year,'输欧年份'),quarter=positive(i.quarter,'季度');if(!Number.isInteger(year)||!Number.isInteger(quarter)||quarter>4)throw Error('季度应为1–4');
 const yieldRate=positive(i.yieldRate,'成品率');if(yieldRate>100)throw Error('成品率不能超过100%');
 if(!['primary','recycled'].includes(i.aluminium))throw Error('请选择原铝类型');
 if(!['processing','integrated'].includes(i.boundary))throw Error('请选择有效生产边界 / Invalid boundary');
 if(!i.country)throw Error('请填写生产国 / Country required');
 if(i.report?.periodStart&&i.report?.periodEnd&&i.report.periodStart>i.report.periodEnd)throw Error('报告期开始日期不得晚于结束日期');
 const defaultRow=config.defaults.find(d=>d.cn===i.cn&&d.country===i.country&&Number(d.year)===year);
 const benchmark=config.benchmarks.find(b=>b.cn===i.cn&&Number(b.year)===year);
 const officialPrice=config.prices.find(p=>p.kind==='CBAM'&&Number(p.year)===year&&Number(p.quarter)===quarter);
 const weekly=config.prices.filter(p=>p.kind==='EUA').sort((a,b)=>b.date.localeCompare(a.date));
 let price=null,priceSource='暂无该期官方价格 / not yet published',priceEstimate=false;
 if(!blank(i.priceOverride)){price=positive(i.priceOverride,'参考碳价');priceSource='用户情景价格 / user scenario';priceEstimate=true;}
 else if(r.priceRule==='latestEUA'&&weekly.length){price=positive(weekly[0].value,'EUA');priceSource=weekly[0].source;priceEstimate=true;}
 else if(officialPrice){price=positive(officialPrice.value,'CBAM价格');priceSource=officialPrice.source;}
 else warnings.push('该进口季度官方证书价格尚未公布；排放可核算，成本需提供情景价格。 / Quarterly price unavailable.');
 let defaultSee=defaultRow?positive(defaultRow.value,'官方默认值'):null;
 if(defaultSee===null)warnings.push('该产品/地区/年份尚无已核实默认值，请由管理员维护。 / Default unavailable.');
 const route=i.aluminium==='recycled'?'L':'K'; const cbamFactor=number(r.phaseFactors[year],'年度CBAM系数'),cscf=number(r.cscf,'CSCF');
 const paid=opt(i.carbonPaid,'已付碳价 EUR/tCO2');
 const cost=(see,sefa)=>{if(see===null)return null;const total=see*unit;const certificates=Math.max(0,(see-sefa)*unit);return{see:round(see),total:round(total),sefa:round(sefa),certificates:round(certificates),price,cost:price===null?null:round(Math.max(0,certificates*price-total*paid),2),grossCost:price===null?null:round(total*price,2)};};
 const defaultRoute=defaultRow?.route||route;
 const defaultSefa=benchmark?number(benchmark[defaultRoute],'默认值基准')*cbamFactor*cscf:0;
 if(!benchmark)warnings.push('缺少适用免费分配基准；当前免费分配扣减取0，需合规复核。 / Benchmark missing.');
 const defaultResult=cost(defaultSee,defaultSefa);
 if(i.mode==='simple')return{version:ENGINE_VERSION,mode:i.mode,input:i,default:defaultResult,actual:null,comparison:null,breakdown:{},trace:[{name:'默认值 / Default',formula:'官方产品完整生产链默认值，已包含适用年度加成；不重复叠加前体或PFC',value:defaultSee,source:defaultRow?.source||''},{name:'免费分配 / Free allocation',formula:`BM(${defaultRoute}) × ${cbamFactor} × ${cscf}`,value:round(defaultSefa),source:benchmark?.source||''}],warnings,priceSource,priceEstimate,configVersion:config.version,durationMs:round(performance.now()-started,2)};
 const production=positive(i.productBatch?batchQuantity(i.productBatch,true):i.production,'合格产品总产量');i.production=production;const enabled=k=>r.enabled[k]!==false;const priority=r.priority.filter(x=>x!=='CEMS');
 function fuelTotal(rows=[],electric=false){return rows.reduce((sum,f,j)=>{
  const base=factor(f.type);if(!base)throw Error(`燃料${j+1}：未找到因子`);
  const q=!f.batch?number(f.quantity,'燃料消耗量'):number(batchQuantity(f.batch),'库存核算燃料消耗量');
  let ncv=resolveFactor(f,'ncv',base.ncv,priority),ef=resolveFactor(f,'ef',base.ef,priority);
  if(!['t','Nm3'].includes(f.unit||'t'))throw Error('不支持的燃料计量单位');
  if(f.unit==='Nm3'&&blank(f.ncv)&&!priority.some(level=>!blank(f['ncv_'+level])))throw Error('体积燃料必须填写GJ/Nm³净热值，不能直接使用GJ/t质量热值');
  let bf=opt(f.biomass,'生物质比例',base.category==='biomass'?100:0);if(bf>100)throw Error('生物质比例应为0–100%');
  if(bf>0&&!f.zeroRated)throw Error('生物质零评级需确认合规证明，否则生物质占比应设为0');
  if(electric&&f.wasteGas)ef.value=Math.min(ef.value,r.naturalGasEF);
  const oxidation=opt(f.oxidation,'氧化系数',1);if(oxidation>1)throw Error('氧化系数不能超过1');
  if(ncv.source==='typeI'||ef.source==='typeI')warnings.push(`${base.name}：部分参数采用默认值 / default factor used`);
  return sum+add(`${electric?'发电燃料':'燃料'} ${base.name}`,`${q} × ${ncv.value} × ${ef.value} × ${oxidation} × (1 − ${bf}/100)`,q*ncv.value*ef.value*oxidation*(1-bf/100),`${base.source} / ${ef.source}`);
 },0);}
 // CEMS replaces calculated combustion, so missing fallback fuel values must not
 // prevent the measured method from running. Retain the other component detail.
 let combustion=0;if(enabled('combustion')){if(blank(i.cems))combustion=fuelTotal(i.fuels);else if(i.cemsScope==='attributed'){try{combustion=fuelTotal(i.fuels)}catch{warnings.push('CEMS已覆盖燃烧排放，未完整提供的备用燃料数据未参与核算。 / CEMS replaces incomplete fallback fuel data.');}}}
 let process=enabled('process')?(i.processMaterials||[]).reduce((sum,m)=>{const b=factor(m.type);const ef=resolveFactor(m,'ef',b?.ef,priority);const q=number(m.batch?batchQuantity(m.batch):m.quantity,'工艺物料量'),conv=opt(m.conversion,'转换因子',1),purity=opt(m.purity,'纯度',100);if(conv>1||purity>100)throw Error('转换因子或纯度超范围');return sum+add(m.name||b?.name||'工艺物料',`${q} × ${ef.value} × ${conv} × ${purity}/100`,q*ef.value*conv*purity/100,ef.source);},0)+opt(i.flueGas,'烟气处理CO2'):0;
 process+=enabled('process')?opt(i.flareVolume,'火炬气体积')*opt(i.flareEF,'火炬因子',r.flareEF):0;
 const h=i.heat||{},g=i.wasteGas||{},e=i.electricity||{},p=i.pfc||{};
 const heat=enabled('heat')?add('热量净排放 / Net heat','Qimp × EFimp − Qexp × EFexp',opt(h.import,'输入热量')*opt(h.importEF,'输入热因子',r.heatEF)-opt(h.export,'输出热量')*opt(h.exportEF,'输出热因子',r.heatEF),'2025/2547 Annex III A.2/A.3'):0;
 if((opt(h.import,'热量')>0&&blank(h.importEF))||(opt(h.export,'热量')>0&&blank(h.exportEF)))warnings.push('热量因子采用天然气标准值/0.9，需确认与所在国常用燃料一致。');
 const waste=enabled('wasteGas')?add('废气净校正 / Waste gas','Vimp × NCVimp × EFNG − Vexp × NCVexp × EFNG × Corrη',opt(g.import,'输入废气')*opt(g.importNCV,'输入废气NCV')*r.naturalGasEF-opt(g.export,'输出废气')*opt(g.exportNCV,'输出废气NCV')*r.naturalGasEF*r.corrEta,'2025/2547 formulas 53–54'):0;
 if(opt(g.import,'输入废气')>0&&blank(g.importNCV)||opt(g.export,'输出废气')>0&&blank(g.exportNCV))throw Error('使用废气时必须填写对应净热值');
 let electricEF=0,electricOut=0;
 if(enabled('electricity')){const generated=opt(e.generated,'自发电量'),exported=opt(e.export,'外供电量');if(exported>generated)throw Error('外供电量不得超过自发电总净电量');
  if(generated===0){if(exported>0)throw Error('无自发电不能扣减外供电');warnings.push('自发电净电量为0，输出电力扣减按0计算。');}
  else {if(e.method==='actual'){if(e.chp&&blank(e.ef))throw Error('热电联产需填写按附件III A.2.2核定的分配因子');electricEF=blank(e.ef)?(fuelTotal(e.fuels,true)+opt(e.flueGas,'发电烟气CO2'))/generated:number(e.ef,'实际电力因子');if(!e.verified)warnings.push('实际电力因子尚未确认技术条件和核查证据。');}
  else {if(!['grid','approved'].includes(e.method))throw Error('电力因子方法无效');const grid=e.factorId?factor(e.factorId):factors.find(f=>f.category==='electricity'&&f.method==='export-proxy'&&Number(f.year)===year);if(blank(e.ef)){if(!grid||grid.category!=='electricity')throw Error('请选择电力因子');if(e.method==='grid'&&grid.method!=='export-proxy')throw Error('外供电默认扣减应使用Other countries and territories代理因子；国家电网值仅作间接排放披露');if(e.method==='approved'&&grid.country&&grid.country!==i.country)throw Error('电力因子国家与生产国不一致');if(grid.year&&Number(grid.year)!==year)throw Error('电力因子不适用于所选年份');if(grid.effective&&grid.effective>`${year}-12-31`)throw Error('电力因子尚未生效');if(e.method==='approved'&&grid.method!=='approved')throw Error('该因子不是欧盟认可替代值');electricEF=number(grid.ef,'适用电力因子');if(grid.unit==='tCO2/MWh')electricEF/=1000;else if(grid.unit!=='tCO2/kWh')throw Error('电力因子单位须为tCO2/kWh或tCO2/MWh');}else{if(e.method==='grid')throw Error('默认代理法请从已核实因子库选择，不接受任意手填电力扣减');electricEF=number(e.ef,'电力因子');warnings.push('手填电力因子需保留来源、适用范围和单位证据。 / Manual power factor needs evidence.');}if(e.method==='approved'&&!e.verified)throw Error('替代电力默认值需确认欧盟认可证据');}
  electricOut=add('输出电力扣减 / Exported electricity',`${exported} × ${electricEF}`,exported*electricEF,'2025/2547 formulas 35/38');}}
 let pfc=0,cf4=0,c2f6=0;
 if(enabled('pfc')&&i.aluminium==='primary'&&i.boundary==='integrated'){
  if(!['slope','overvoltage'].includes(p.method))throw Error('PFC核算方法无效');
  const technology=config.pfc.find(t=>t.id===i.technology);if(!technology)throw Error('请选择电解槽技术');
  const primal=positive(p.production,'本厂原铝产量'); const custom=p.custom===true;
  if(custom&&(!p.verified||blank(p.collection)||blank(p.measuredAt)))throw Error('专属PFC因子需同时填写实测收集效率、测定日期与合规证明');
  if(custom){if(number(p.uncertainty,'不确定度')>15)throw Error('PFC实测不确定度不得超过15%');const measuredDate=new Date(p.measuredAt).getTime();if(!Number.isFinite(measuredDate)||measuredDate>Date.now())throw Error('PFC测定日期不合法');if(Date.now()-measuredDate>3*365.25*86400000)throw Error('PFC实测因子超过3年，请重新测定');}
  let fraction=number(p.method==='overvoltage'?technology.ovRatio:technology.ratio,'PFC比例');
  if(custom)fraction=number(p.ratio,'实测C2F6比例');
  if(p.method==='overvoltage'){const ovc=custom?number(p.ovc,'OVC'):number(technology.ovc,'该槽型无适用OVC，改用斜率法或提供合规实测因子');const ce=positive(p.ce,'电流效率');if(ce>100)throw Error('电流效率不得超过100%');cf4=ovc*number(p.aeo,'AEO')/ce*primal/1000;}
  else{let aem;if(!blank(p.aem))aem=number(p.aem,'AEM');else if(!blank(p.events))aem=number(p.events,'阳极效应次数')/positive(p.cells,'槽数')/positive(p.days,'天数')*number(p.minutes,'平均分钟');else aem=number(r.defaultAem,'缺少AEM；请填写实测或配置适用默认值');cf4=aem*(custom?number(p.sef,'SEF'):number(technology.sef,'SEF'))*primal/1000;}
  const collection=custom?positive(p.collection,'收集效率')/100:opt(p.collection,'收集效率',100)/100;if(collection<=0||collection>1)throw Error('收集效率不能超过100%');c2f6=cf4*fraction;pfc=add('PFC排放 / PFC emissions',`(CF4 × ${r.gwpCF4} + C2F6 × ${r.gwpC2F6}) / ${collection}`,(cf4*r.gwpCF4+c2f6*r.gwpC2F6)/collection,'2025/2547 Annex II B.7, formulas 20–26');
 }
 let direct=combustion+process+heat+waste-electricOut+pfc,cemsCorrection=0;
 if(!blank(i.cems)){let measured=number(i.cems,'CEMS');if(i.cemsScope==='attributed'){cemsCorrection=measured+(i.cemsIncludesPfc?0:pfc)-direct;direct+=cemsCorrection;warnings.push('采用CEMS已归因直接排放，燃烧、工艺、热/废气、电力不再重复叠加。');}else{combustion=measured;direct=measured+process+heat+waste-electricOut+pfc;}add('CEMS优先 / CEMS priority',i.cemsScope==='attributed'?'Measured attributed direct + PFC (if not included)':'Measured combustion replaces calculated combustion',direct,'CEMS');}
 if(direct<0){if(r.negativeRule==='reject')throw Error('直接隐含排放为负，请核查热量、电力边界');warnings.push('直接隐含排放为负，请核查生产边界；结果不可直接用于申报。');}
 let precursor=0,precursorSefa=0,defaultEmission=0;const precursors=[];
 function precursorValue(m,depth=0){if(depth>10)throw Error('前体递归层级超过10');if(m.sameBoundary||m.scrap)return{see:0,sefa:0,origin:'same-boundary/scrap'};
  if(['EU','IS','LI','NO','CH'].includes(m.country))return{see:0,sefa:0,origin:'exempt'};
  if(m.complex){const amount=positive(m.production,'复杂前体产量');const children=(m.children||[]).map(x=>({q:number(x.batch?batchQuantity(x.batch):x.quantity,'子前体用量'),v:precursorValue(x,depth+1)}));return{see:(number(m.direct,'复杂前体直接排放')+children.reduce((s,x)=>s+x.q*x.v.see,0))/amount,sefa:(opt(m.processBenchmark,'复杂前体过程基准')*cbamFactor*cscf+children.reduce((s,x)=>s+x.q*x.v.sefa,0)/amount),defaultSee:children.reduce((s,x)=>s+x.q*(x.v.defaultSee||0),0)/amount,origin:'recursive'};}
  const b=factor(m.type),originDefault=config.precursorDefaults?.find(d=>d.country===m.country&&d.year===year);const isDefault=blank(m.see);const fallback=m.type?.startsWith('precursor-')?originDefault?.value:b?.ef;const see=isDefault?number(fallback,'前体来源及年份适用默认隐含碳'):number(m.see,'前体隐含碳');if(isDefault)warnings.push(`${m.name||b?.name}：采用前体默认值 / precursor default used`);
  const bm=originDefault?.route==='L'?.091:b?.benchmark||0;
  return{see,defaultSee:isDefault?see:0,sefa:blank(m.sefa)?opt(m.benchmark,'前体基准',bm)*cbamFactor*cscf:number(m.sefa,'前体SEFA'),origin:isDefault?'default':'actual'};
 }
 if(enabled('precursor')){if(!(i.precursors||[]).length&&i.boundary!=='integrated')throw Error('请添加前体用量；无前体须说明完整生产边界');for(const m of i.precursors||[]){const q=number(m.batch?batchQuantity(m.batch):m.quantity,'前体消耗量'),v=precursorValue(m);precursor+=q*v.see;precursorSefa+=q/production*v.sefa;defaultEmission+=q*(v.defaultSee||0);precursors.push({...m,quantity:q,see:v.see,sefa:v.sefa,unitConsumption:round(q/production,8),origin:v.origin});add(m.name||factor(m.type)?.name||'前体',`${q} × ${v.see}`,q*v.see,v.origin);}}
 const see=(direct+precursor)/production;const actualSefa=opt(i.processBenchmark,'本工序基准',benchmark?.process||0)*cbamFactor*cscf+precursorSefa;
 const actual=cost(see,actualSefa);actual.production=production;actual.direct=round(direct);actual.precursor=round(precursor);actual.defaultShare=direct+precursor>0?round(defaultEmission/(direct+precursor)*100,2):0;
 const diff=defaultResult?.cost!==null&&defaultResult?.cost!==undefined&&actual.cost!==null?round(defaultResult.cost-actual.cost,2):null;
 return{version:ENGINE_VERSION,mode:i.mode,input:i,default:defaultResult,actual,comparison:{difference:diff,percent:diff!==null&&defaultResult.cost>0?round(diff/defaultResult.cost*100,2):null},breakdown:{combustion:round(combustion),process:round(process),heat:round(heat),wasteGas:round(waste),electricity:round(-electricOut),pfc:round(pfc),precursor:round(precursor),...(cemsCorrection?{cemsCorrection:round(cemsCorrection)}:{})},intermediate:{electricEF:round(electricEF,8),cf4:round(cf4,8),c2f6:round(c2f6,8),direct:round(direct),actualSefa:round(actualSefa),precursors},trace,warnings:[...new Set(warnings)],priceSource,priceEstimate,configVersion:config.version,durationMs:round(performance.now()-started,2)};
}
