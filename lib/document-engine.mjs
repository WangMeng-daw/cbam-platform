// User-provided actual-value development example, version 2026-11-11.
// This deliberately models its process-only allocation and staged rounding.
import {clone} from './clone.mjs';
export const DOCUMENT_METHOD='actual-example-2026-11-11';
const rnd=(x,n=0)=>Number(x.toFixed(n));
const val=(x,name,positive=false)=>{if(x===''||x===null||x===undefined||!Number.isFinite(Number(x))||Number(x)<0||(positive&&Number(x)===0))throw Error(name+'：请填写有效'+(positive?'正数':'非负数'));return Number(x);};
export function calculateDocument(input,config){
 const i=clone(input),warnings=[],trace=[],started=performance.now();
 const year=val(i.year,'年份',true),quarter=val(i.quarter,'季度',true);
 if(!Number.isInteger(year)||!Number.isInteger(quarter)||quarter>4)throw Error('年份或季度无效');
 if(!i.country)throw Error('请填写生产国');
 const factor=val(config.rules.phaseFactors[year],'年度CBAM因子');
 const priceOverride=i.priceOverride!==''&&i.priceOverride!==null&&i.priceOverride!==undefined;
 const official=config.prices.find(p=>p.kind==='CBAM'&&Number(p.year)===year&&Number(p.quarter)===quarter);
 const price=priceOverride?val(i.priceOverride,'情景碳价',true):official?val(official.value,'季度碳价',true):null;
 const priceSource=priceOverride?'用户情景价格 / User scenario':official?.source||'该季度价格尚未公布';
 if(price===null)warnings.push('该季度碳价未发布；可输入情景碳价计算成本。');
 const rows=i.products;
 if(!Array.isArray(rows)||!rows.length||rows.length>100)throw Error('请添加1–100项产品 / Add products');
 const byId=new Map(),completed=new Map(),visiting=new Set(),use=new Map();
 for(const p of rows){
  if(!p.id||byId.has(p.id))throw Error('产品编号缺失或重复');
  if(!p.name?.trim())throw Error('请填写产品名称');
  if(!/^760[148]\d{4}$/.test(p.cn||''))throw Error('支持7601、7604、7608的8位CN编码');
  if(!['primary','recycled','forming'].includes(p.kind))throw Error('请选择产品生产工序');
  const production=val(p.production,p.name+'产量',true),exports=val(p.exportQty,p.name+'输欧量');
  if(exports>production)throw Error(p.name+'输欧量不得超过产量');
  if(!Array.isArray(p.fuels)||p.fuels.length>100||!Array.isArray(p.precursors)||p.precursors.length>100)throw Error('源流格式或数量无效');
  if(p.kind==='primary'&&p.precursors.length)throw Error('初级冶炼按无前体简单商品计算，请将后续成型单列为产品');
  byId.set(p.id,p);use.set(p.id,exports);
 }
 for(const p of rows)for(const m of p.precursors){if(!byId.has(m.productId))throw Error(p.name+'引用的前体产品不存在');use.set(m.productId,use.get(m.productId)+val(m.quantity,'前体投入量',true));}
 for(const p of rows)if(use.get(p.id)>Number(p.production)+1e-8)throw Error(p.name+'的输欧量与下游投入量合计超过其产量');
 const add=(p,name,formula,value,source='实际值计算示例（平台开发用）')=>trace.push({name:p.name+' · '+name,formula,value,source});
 function compute(p){
  if(completed.has(p.id))return completed.get(p.id);
  if(visiting.has(p.id))throw Error('产品前体引用存在循环');
  visiting.add(p.id);
  const production=val(p.production,'产量',true),exportQty=val(p.exportQty,'输欧量');
  let combustion=0;
  for(const f of p.fuels){
   const base=config.factors.find(x=>x.id===f.type&&['fossil','biomass'].includes(x.category));
   if(!base)throw Error('请选择有效燃料类型');
   const q=val(f.quantity,'燃料消耗量'),ncv=val(f.ncv===''||f.ncv==null?base.ncv:f.ncv,'净热值',true),ef=val(f.ef===''||f.ef==null?base.ef*1000:f.ef,'燃料排放因子');
   const oxidation=val(f.oxidation??100,'氧化率');if(oxidation>100)throw Error('氧化率不得超过100%');
   const emission=rnd(q*ncv*ef*(oxidation/100)/1000,1);combustion+=emission;
   add(p,'燃料 '+base.name,`${q} × ${ncv} × ${ef} × ${oxidation}% ÷ 1000`,emission,base.source);
  }
  let anode=0,pfc=0,cf4=0,c2f6=0;
  if(p.kind==='primary'){
   const a=p.anode||{},amount=val(a.quantity,'阳极炭消耗量'),ef=val(a.ef??3.66,'阳极炭排放因子'),loss=val(a.lossRate??0,'阳极损失率');
   if(loss>100)throw Error('阳极损失率不得超过100%');
   anode=rnd(amount*ef*(1-loss/100),4);add(p,'阳极炭排放',`${amount} × ${ef} × (1 − ${loss}/100)`,anode);
   const f=p.pfc||{},tech=config.pfc.find(t=>t.id===(f.technology||'CWPB'));
   if(!tech)throw Error('请选择PFC槽型');
   const molten=val(f.production,'铝液产量',true),frequency=val(f.frequency,'阳极效应频率'),duration=val(f.duration,'阳极效应持续时间'),collection=val(f.collection,'管道气收集效率',true);
   if(collection>100)throw Error('收集效率不得超过100%');
   const sef=val(f.sef===''||f.sef==null?tech.sef:f.sef,'斜率因子'),ratio=val(f.ratio===''||f.ratio==null?tech.ratio:f.ratio,'C₂F₆质量比');
   cf4=rnd(molten*frequency*duration*sef/1000,2);c2f6=rnd(cf4*ratio,2);
   pfc=rnd((cf4*config.rules.gwpCF4+c2f6*config.rules.gwpC2F6)/(collection/100));
   add(p,'CF₄',`round(${molten} × ${frequency} × ${duration} × ${sef} ÷ 1000, 2)`,cf4);
   add(p,'C₂F₆',`round(${cf4} × ${ratio}, 2)`,c2f6);
   add(p,'PFC CO₂当量',`round((${cf4} × ${config.rules.gwpCF4} + ${c2f6} × ${config.rules.gwpC2F6}) ÷ (${collection}/100), 0)`,pfc);
  }
  const direct=rnd(combustion+anode+pfc),se=rnd(direct/production,3);
  add(p,'工序直接排放',`round(${combustion} + ${anode} + ${pfc}, 0)`,direct);
  let precursor=0;const sources=[];
  for(const m of p.precursors){const parent=compute(byId.get(m.productId)),q=Number(m.quantity),share=q/parent.production,allocated=parent.embeddedProduction*share;precursor+=allocated;sources.push({productId:m.productId,name:parent.name,quantity:q,allocation:share,emissions:allocated});add(p,'上游分摊 '+parent.name,`${parent.embeddedProduction} × (${q} / ${parent.production})`,rnd(allocated,6));}
  const embeddedProduction=direct+precursor,see=rnd(embeddedProduction/production,3);
  const autoBenchmark=p.kind==='primary'?1.423:p.kind==='recycled'?0.091:config.benchmarks.find(b=>b.cn===p.cn&&Number(b.year)===year)?.process;
  const benchmark=val(p.benchmark===''||p.benchmark==null?autoBenchmark:p.benchmark,'本工序基准值');
  const sefa=benchmark*factor,netEmissions=rnd(Math.max(0,(see-sefa)*exportQty),8),certificates=Math.ceil(netEmissions);
  const cost=price===null?null:rnd(netEmissions*price,2);
  add(p,'单位隐含排放 SEE',`round((${direct} + ${precursor}) / ${production}, 3)`,see);
  add(p,'本工序免费分配',`${benchmark} × ${factor}`,sefa);
  add(p,'排放负担（未取整）',`max(0, (${see} − ${sefa}) × ${exportQty})`,netEmissions);
  add(p,'文档口径成本',`${netEmissions} × ${price??'待填碳价'}`,cost);
  const result={id:p.id,name:p.name,cn:p.cn,kind:p.kind,production,exportQty,combustion:rnd(combustion,1),anode,pfc,cf4,c2f6,direct,se,precursor:rnd(precursor,6),sources,embeddedProduction,see,benchmark,sefa,total:rnd(see*exportQty),netEmissions,certificates,price,cost,costWan:cost===null?null:rnd(cost/10000,2)};
  visiting.delete(p.id);completed.set(p.id,result);return result;
 }
 const products=rows.map(compute),main=products[products.length-1];
 i.cn=main.cn;i.production=main.production;i.exportQty=main.exportQty;
 return {version:'2.0.0',mode:'professional',method:DOCUMENT_METHOD,input:i,products,actual:main,default:null,comparison:null,breakdown:{combustion:main.combustion,anode:main.anode,pfc:main.pfc,precursor:main.precursor},trace,warnings,priceSource,priceEstimate:priceOverride,configVersion:config.version,totalCost:price===null?null:rnd(products.reduce((s,p)=>s+p.cost,0),2),totalExportEmissions:products.reduce((s,p)=>s+p.total,0),durationMs:rnd(performance.now()-started,2)};
}
