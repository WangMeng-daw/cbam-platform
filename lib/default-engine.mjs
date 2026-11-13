import {decimal as d} from './decimal.mjs';
import {clone} from './clone.mjs';
const blank=x=>x===''||x==null;
const num=(x,label,positive=false)=>{if(blank(x)||!Number.isFinite(Number(x))||Number(x)<0||(positive&&Number(x)===0))throw Error(label+'：数值不合法');return Number(x);};
export function calculateDefault(input,config){
 const started=performance.now(),i=Object.fromEntries(Object.entries(clone(input)).filter(([k])=>['mode','cn','country','year','quarter','exportQty','aluminium','priceOverride','report','productProfile'].includes(k))),warnings=[];
 i.cn=String(i.cn||'').replace(/\s/g,'');
 if(!(config.products||config.benchmarks).some(p=>p.cn===i.cn))throw Error('请选择产品库中的CN编码');
 const year=num(i.year,'年份',true),quarter=num(i.quarter,'季度',true),quantity=num(i.exportQty,'输欧总量',true);
 if(!Number.isInteger(year)||!Number.isInteger(quarter)||quarter>4)throw Error('年份或季度无效');
 if(!i.country)throw Error('请选择生产国');
 if(!['primary','recycled'].includes(i.aluminium))throw Error('请选择生产路线');
 const row=config.defaults.find(r=>r.cn===i.cn&&r.country===i.country&&Number(r.year)===year),bm=config.benchmarks.find(r=>r.cn===i.cn&&Number(r.year)===year);
 const route=i.aluminium==='recycled'?'L':'K',phase=num(config.rules.phaseFactors[year],'年度CBAM因子');
 if(!bm)throw Error('缺少该产品/年份的B列基准值');
 const benchmark=d(num(bm[route],'B列基准值')).round(3),free=benchmark.mul(phase);
 let price=null,priceSource='该季度证书价格尚未公布',priceEstimate=false;
 const official=config.prices.find(p=>p.kind==='CBAM'&&Number(p.year)===year&&Number(p.quarter)===quarter);
 if(!blank(i.priceOverride)){price=num(i.priceOverride,'情景碳价',true);priceSource='用户情景价格 / User scenario';priceEstimate=true;}
 else if(config.rules.priceRule==='latestEUA'){const latest=config.prices.filter(p=>p.kind==='EUA').sort((a,b)=>b.date.localeCompare(a.date))[0];if(latest){price=num(latest.value,'EUA碳价',true);priceSource=latest.source;priceEstimate=true;}}
 else if(official){price=num(official.value,'季度碳价',true);priceSource=official.source;}
 if(price===null)warnings.push('该季度价格尚未公布；请填写情景碳价计算成本。');
 let result=null;
 if(row){
  const see=d(num(row.value,'整品默认值')).round(5),total=see.mul(quantity).round(5),raw=see.sub(free).mul(quantity),net=(raw.isNegative()?d(0):raw).round(5),certificates=net.ceil();
  result={see:see.number(),total:total.number(),sefa:free.number(),benchmark:benchmark.number(),netEmissions:net.number(),certificates,price,cost:price===null?null:d(certificates).mul(price).round(2).number(),grossCost:price===null?null:total.mul(price).round(2).number()};
 }else warnings.push('该CN/国家/年份没有默认值数据；上传表仅提供中国地区，不能借用其他产品或地区的数据。');
 const trace=[
  {name:'单位产品隐含排放 / Specific emissions',formula:'按CN、国家和年份取含加价默认值，保留5位小数，不再加价',value:result?.see??null,source:row?.source||''},
  {name:'免费分配 / Free allocation',formula:`B列 ${route} ${benchmark.number()} × ${phase}`,value:free.number(),source:bm.source},
  {name:'输欧排放总量 / Export emissions',formula:`round(${result?.see??'—'} × ${quantity}, 5)`,value:result?.total??null,source:row?.source||''},
  {name:'应购买证书 / Certificates',formula:`ceil(max(0, round((${result?.see??'—'} − ${free.number()}) × ${quantity}, 5)))`,value:result?.certificates??null,source:'排放量5位小数，证书向上取整'},
  {name:'碳关税成本 / Cost',formula:`${result?.certificates??'—'} × ${price??'—'}`,value:result?.cost??null,source:priceSource}
 ];
 return {version:'3.0.0',mode:'simple',input:i,default:result,actual:null,comparison:null,breakdown:{},trace,warnings,priceSource,priceEstimate,configVersion:config.version,durationMs:performance.now()-started};
}
