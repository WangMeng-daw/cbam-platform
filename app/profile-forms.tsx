'use client';
import {useState} from 'react';
import {Save,Plus} from 'lucide-react';
import {Field} from './controls';
import countries from '../lib/country-codes.json';
import {INSTALLATION_FIELDS,PRODUCT_CATEGORIES,PRODUCTION_ROUTES,emptyCompany,editCompany,emptyProduct,editProduct} from '../lib/profile-data.mjs';
import {productOptions} from '../lib/products.mjs';

export function CompanyProfiles({records,onSave,onApply,lang=0}:any){
 const [company,setCompany]=useState<any>(emptyCompany);
 const T=(zh:string,en:string)=>lang?en:zh;
 const change=(key:string,value:string)=>setCompany({...company,[key]:value,...(key==='countryCode'?{country:countries.records.find(r=>r.code===value)?.name||company.country}:{})});
 return <section className="ws-card"><h3>{T('企业设施资料','Installation profile')}</h3><p className="muted">{T('设施名称和城市为必填项，其他信息均为选填。','Installation name and city are required; all other fields are optional.')}</p>
  <div className="form-grid">{INSTALLATION_FIELDS.map(([key,zh,en])=><Field key={key} label={T(zh,en)} required={key==='name'||key==='city'} value={company[key]} onChange={(v:string)=>change(key,v)}
   type={key==='latitude'||key==='longitude'?'number':key==='email'?'email':key==='telephone'?'tel':'text'} min={key==='latitude'?-90:key==='longitude'?-180:undefined} max={key==='latitude'?90:key==='longitude'?180:undefined}
   options={key==='countryCode'?[{value:'',label:T('未填写','Not specified')},...countries.records.map(r=>({value:r.code,label:r.code+' · '+r.name}))]:undefined}
   hint={key==='countryCode'?T('按附表1列出266项；此处选择两位国家代码，例如CN。','266 entries from Annex 1; select the two-letter country code, e.g. CN.'):''}/>)}</div>
  <div className="ws-actions"><button className="button primary" onClick={()=>{const saved=onSave(company);if(saved)setCompany(saved);}}><Save size={16}/>{T('保存企业','Save enterprise')}</button><button className="button secondary" onClick={()=>setCompany(emptyCompany())}><Plus size={16}/>{T('新增','New')}</button></div>
  <div className="ws-table"><table><thead><tr>{[T('设施名称','Installation'),T('城市','City'),T('国家代码','Country code'),T('操作','Actions')].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{records.length?records.map((r:any)=><tr key={r.id}><td>{editCompany(r).name}</td><td>{r.city||'—'}</td><td>{r.countryCode||'—'}</td><td><div className="ws-table-actions"><button onClick={()=>setCompany(editCompany(r))}>{T('编辑','Edit')}</button><button onClick={()=>onApply(editCompany(r))}>{T('用于核算','Use')}</button></div></td></tr>):<tr><td colSpan={4} className="ws-empty">{T('暂无设施资料','No installations saved')}</td></tr>}</tbody></table></div>
 </section>;
}

export function ProductProfiles({records,onSave,onApply,config,lang=0}:any){
 const T=(zh:string,en:string)=>lang?en:zh;
 const blankPage=()=>Array.from({length:5},()=>emptyProduct());
 const pageRows=(n:number)=>Array.from({length:5},(_,k)=>records[n*5+k]?editProduct(records[n*5+k]):emptyProduct());
 const [page,setPage]=useState(0),[rows,setRows]=useState<any[]>(()=>pageRows(0));
 const change=(index:number,key:string,value:string)=>setRows(rows.map((r,k)=>k===index?{...r,[key]:value}:r));
 const pages=Math.max(1,Math.ceil(records.length/5));
 return <section className="ws-card"><h3>{T('产品信息','Product information')}</h3><p className="muted">{T('每页显示5行；至少填写1行，可填写多行。已填写的每行都需选择产品大类和生产工艺路线。','Five rows per page. Complete at least one row; each filled row needs both a category and production route.')}</p>
  <div className="product-profile-table"><table><thead><tr><th>{T('序号','No.')}</th><th>{T('产品大类','Product category')}</th><th>{T('生产工艺路线','Production route')}</th></tr></thead><tbody>{rows.map((r,k)=><tr key={k}><td>{k+1}</td><td><Field label={T(`第${k+1}行 产品大类`,`Row ${k+1} product category`)} value={r.category} options={[{value:'',label:T('请选择','Select')},...PRODUCT_CATEGORIES.map(value=>({value,label:value}))]} onChange={(v:string)=>change(k,'category',v)}/></td><td><Field label={T(`第${k+1}行 生产工艺路线`,`Row ${k+1} production route`)} value={r.route} options={[{value:'',label:T('请选择','Select')},...PRODUCTION_ROUTES.map(value=>({value,label:value}))]} onChange={(v:string)=>change(k,'route',v)}/></td></tr>)}</tbody></table></div>
  <div className="ws-actions"><button className="button primary" onClick={()=>{const saved=onSave(rows);if(saved)setRows([...saved,...blankPage()].slice(0,5));}}><Save size={16}/>{T('保存产品','Save products')}</button><button className="button secondary" onClick={()=>{setPage(-1);setRows(blankPage());}}><Plus size={16}/>{T('新增产品组','New product group')}</button></div>
  {records.length>0&&<div className="ws-actions profile-pagination">{Array.from({length:pages},(_,n)=><button key={n} className={'small-button '+(page===n?'active':'')} aria-current={page===n?'page':undefined} onClick={()=>{setPage(n);setRows(pageRows(n));}}>{T(`第${n+1}页`,`Page ${n+1}`)}</button>)}</div>}
  <details className="section-details"><summary>{T('核算资料（选填）：产品名称、CN编码、生产国','Optional assessment details: name, CN code and country')}</summary><p className="muted">{T('产品信息可仅保存大类和路线；用于核算时仍需选择具体CN编码。','Save categories and routes first; select a specific CN code before calculating.')}</p>
   {rows.map((r,k)=><div className="repeat-card" key={k}><div className="row-head"><strong>{T('产品','Product')} {k+1}</strong><button className="text-button" onClick={()=>onApply(r)}>{T('用于核算','Use for assessment')}</button></div><div className="form-grid">
    <Field label={T(`第${k+1}行 产品名称`,`Row ${k+1} product name`)} type="text" value={r.name} onChange={(v:string)=>change(k,'name',v)}/>
    <Field label={T(`第${k+1}行 CN编码`,`Row ${k+1} CN code`)} searchable lang={lang} value={r.cn} options={productOptions(config,lang)} onChange={(v:string)=>change(k,'cn',v)}/>
    <Field label={T(`第${k+1}行 生产国`,`Row ${k+1} production country`)} value={r.country} options={[{value:'',label:T('未填写','Not specified')},...Array.from(new Set(config.defaults.map((d:any)=>d.country))).map((c:any)=>({value:c,label:c==='China'?T('中国大陆','China'):c}))]} onChange={(v:string)=>change(k,'country',v)}/>
   </div></div>)}
  </details>
 </section>;
}
