import {Plus} from 'lucide-react';
import {Field} from './controls';
import {productOptions} from '../lib/products.mjs';
import {precursorDefault} from '../lib/document-engine.mjs';

export function PurchasedPrecursors({rows,onChange,config,country,year,lang}:any){
 const t=(zh:string,en:string)=>lang?en:zh;
 const countries=Array.from(new Set<string>(config.defaults.map((row:any)=>row.country)));
 function update(index:number,patch:any){
  onChange(rows.map((row:any,k:number)=>k===index?{...row,...patch}:row));
 }
 return <div>
  <h5>{t('外购前体','Purchased precursors')}</h5>
  {rows.map((row:any,index:number)=>{
   const origin=row.country||country;
   const matched=precursorDefault(config,row.cn,origin,year);
   return <div className="repeat-card" key={index}>
    <div className="form-grid">
     <Field label={t('前体 CN 编码','Precursor CN code')} required searchable lang={lang}
      options={productOptions(config,lang)} value={row.cn} onChange={(cn:string)=>update(index,{cn})}/>
     <Field label={t('前体排放取值','Precursor emissions basis')} value={row.basis}
      options={[{value:'default',label:t('默认值','Default value')},{value:'actual',label:t('实际值','Actual value')}]}
      onChange={(basis:string)=>update(index,{basis})}/>
     <Field label={t('实际投入量（含损耗）','Purchased input including losses')} required unit="t"
      value={row.quantity} onChange={(quantity:string)=>update(index,{quantity})}/>
     {row.basis==='actual'
      ? <Field label={t('前体实际 SEE','Measured precursor SEE')} required unit="tCO₂e/t"
         value={row.see} onChange={(see:string)=>update(index,{see})}/>
      : <Field label={t('前体生产国','Precursor country of production')} value={origin}
         options={countries.map(value=>({value,label:value==='China'?t('中国大陆','China'):value}))}
         onChange={(country:string)=>update(index,{country})}/>}
    </div>
    {row.basis==='default'&&row.cn&&<p className="muted" role="status">
     {row.cn} · {origin} · {year} · {matched?t('默认 SEE','Default SEE')+' '+Number(matched.value).toFixed(5)+' tCO₂e/t':t('没有匹配的默认值，请核对产地或选择实际值。','No matching default. Check the origin or select actual value.')}
    </p>}
    <button className="text-button" onClick={()=>onChange(rows.filter((_:any,k:number)=>k!==index))}>{t('移除外购前体','Remove purchased precursor')}</button>
   </div>;
  })}
  <button className="add-row" onClick={()=>onChange([...rows,{cn:'',basis:'default',quantity:'',see:'',country}])}>
   <Plus size={16}/>{t('添加外购前体','Add purchased precursor')}
  </button>
 </div>;
}
