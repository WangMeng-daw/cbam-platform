const fail = message => { throw Error(message); };
const finite = (value, name, min=0, max=Infinity) => {
  if(value==='' || value==null || !Number.isFinite(Number(value)) || Number(value)<min || Number(value)>max) fail(`${name}：参数超出有效范围`);
};
const date = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export function validateConfig(c){
  if(!c || !c.rules || !c.content || !c.market) fail('配置结构不完整');
  for(const table of ['factors','prices','defaults','precursorDefaults','benchmarks','pfc','templates']){
    if(!Array.isArray(c[table]) || !c[table].length || c[table].length>10000) fail('参数表不能为空或超限: '+table);
    const keys=new Set();
    for(const row of c[table]){
      const key=['defaults','precursorDefaults','benchmarks'].includes(table)?`${row.cn||''}|${row.country||''}|${row.year}`:row.id;
      if(!key || keys.has(key)) fail(table+'：标识缺失或重复'); keys.add(key);
      for(const field of ['ef','ncv','benchmark','value','base','process','K','L','sef','ratio','ovc','ovRatio','volume']) if(row[field]!=='' && row[field]!=null) finite(row[field],table+'.'+field);
      if(!['prices','templates'].includes(table) && (!row.source || !row.version || !date(row.effective))) fail(table+'：必须填写来源、版本及有效生效日期');
    }
  }
  for(const f of c.factors){
    if(!f.name || !['fossil','biomass','carbonate','electricity','heat','precursor'].includes(f.category)) fail('因子名称或分类无效');
    if(f.category==='electricity' && !['tCO2/kWh','tCO2/MWh'].includes(f.unit)) fail('电力因子单位须为tCO2/kWh或tCO2/MWh');
  }
  for(const p of c.prices){
    if(!['EUA','CBAM'].includes(p.kind)||!date(p.date)||!p.source) fail('碳价类别、日期或来源无效');finite(p.value,'碳价',0.000001);
    if(p.kind==='CBAM'){finite(p.quarter,'季度',1,4);finite(p.year,'年份',2026,2100);if(!Number.isInteger(Number(p.quarter))||!Number.isInteger(Number(p.year)))fail('年份和季度必须为整数');}
  }
  if(!c.prices.some(p=>p.kind==='EUA'))fail('请至少保留一条EUA行情');
  const quarterKeys=c.prices.filter(p=>p.kind==='CBAM').map(p=>p.year+'-'+p.quarter);
  if(new Set(quarterKeys).size!==quarterKeys.length)fail('同一年度季度CBAM价格不能重复');
  const r=c.rules;
  if(JSON.stringify(r.priority)!==JSON.stringify(['CEMS','laboratory','typeII','typeI']))fail('数据优先级须为CEMS、laboratory、typeII、typeI');
  if(!['quarterly','latestEUA'].includes(r.priceRule)||!['warn','reject'].includes(r.negativeRule))fail('核算规则无效');
  for(const k of ['combustion','process','heat','wasteGas','electricity','pfc','precursor'])if(typeof r.enabled?.[k]!=='boolean')fail('分项开关必须为布尔值');
  finite(r.yieldRate,'成品率',0.000001,100);
  for(const k of ['corrEta','cscf'])finite(r[k],k,0,1);
  for(const k of ['gwpCF4','gwpC2F6','naturalGasEF','heatEF','flareEF'])finite(r[k],k);
  if(r.defaultAem!==null)finite(r.defaultAem,'AEM');
  if(!r.phaseFactors || !Object.keys(r.phaseFactors).length)fail('缺少年度CBAM系数');
  for(const [y,v] of Object.entries(r.phaseFactors)){if(!/^20\d{2}$/.test(y))fail('年度格式错误');finite(v,'年度系数',0,1);}
  if(!date(c.content.deadline))fail('截止日期不合法');
  for(const key of ['services','serviceDescriptions'])if(!Array.isArray(c.content[key])||c.content[key].length!==3||c.content[key].some(v=>typeof v!=='string'))fail('请保留三个服务及其说明');
  if(!c.templates.some(t=>t.id===c.activeTemplate))fail('默认报告模板不存在');
  for(const t of c.templates)if(!t.heading||!t.name||!t.version||!t.disclaimer||typeof t.includeTrace!=='boolean'||typeof t.includeServices!=='boolean')fail('报告模板不完整');
  for(const [key,value] of Object.entries(c.textOverrides||{}))if(!key||!value||typeof value.zh!=='string'||typeof value.en!=='string')fail('双语文案必须包含zh和en');
}
