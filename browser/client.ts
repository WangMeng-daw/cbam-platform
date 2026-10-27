import seed from '../lib/config.json';
import {calculate} from '../lib/engine.mjs';
import {createRecordStore} from './storage.mjs';
import {exportReport} from './report';
const store=createRecordStore();
export function readLanguage(){try{return localStorage.getItem('cbam-language')}catch{return 'zh'}}
export function saveLanguage(value:string){try{localStorage.setItem('cbam-language',value)}catch{/* Calculations remain usable when storage is blocked. */}}
// Internal operations only: no HTTP calls, identity provider or backend.
export async function localApi(path:string,data?:any,method='POST'):Promise<any>{
 const url=new URL(path,'https://local.invalid');
 if(url.pathname==='/api/bootstrap')return {config:seed};
 if(url.pathname==='/api/calculate'){
  const result=calculate(data.input,seed);
  const id=data.consent?store.save(data.input,result,seed):null;
  return {...result,id,calculatedAt:new Date().toISOString()};
 }
 if(url.pathname==='/api/records'){
  if(data===undefined)return url.searchParams.has('id')?store.get(url.searchParams.get('id')):store.list(url.searchParams.get('archived')==='1');
  if(method==='DELETE'||method==='PATCH')return store.archive(data.id,method==='DELETE');
  if(!data.consent)throw Error('请先同意在当前浏览器保存记录 / Consent is required to save locally');
  return {id:store.save(data.input,null,seed)};
 }
 throw Error('不支持的本地操作 / Unsupported operation');
}
export async function reportBlob(data:any){
 const stored=data.recordId?store.get(data.recordId).record:null;
 return exportReport(stored?{...data,input:stored.input}:data,stored?.configSnapshot||seed,stored);
}
