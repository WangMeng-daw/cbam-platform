import {clone} from '../lib/clone.mjs';
const KEY='cbam-local-records-v1';
export function createRecordStore(storageProvider=()=>localStorage){
 function read(){
  let raw;try{raw=storageProvider().getItem(KEY);}catch{throw Error('浏览器无法读取本地记录 / Local storage unavailable');}
  if(!raw)return {schema:1,records:[],configs:{}};
  let state;try{state=JSON.parse(raw);}catch{throw Error('本地记录损坏，请先保留网站数据 / Local records are damaged');}
  if(state.schema!==1||!Array.isArray(state.records)||!state.configs)throw Error('不支持的本地记录格式 / Unsupported storage format');
  return state;
 }
 function write(state){try{storageProvider().setItem(KEY,JSON.stringify(state));}catch{throw Error('保存失败：浏览器存储不可用或空间不足。仍可不保存核算并下载报告。 / Storage unavailable or full; calculate without saving and download the report.');}}
 function save(input,result,config){
  const state=read(),id=globalThis.crypto?.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  const now=new Date().toISOString(),configKey=String(config.version);
  if(!state.configs[configKey])state.configs[configKey]=clone(config);
  state.records.push({id,kind:result?'calculation':'draft',mode:input.mode,cn:input.cn,created:now,updated:now,deleted:0,input:clone(input),result:result?clone(result):null,configKey});
  write(state);return id;
 }
 function get(id){const state=read(),r=state.records.find(r=>r.id===id&&!r.deleted);if(!r)throw Error('此设备中未找到记录 / Record not found on this device');return {id:r.id,record:{input:r.input,result:r.result,configSnapshot:state.configs[r.configKey]}};}
 function list(archived=false){return read().records.filter(r=>!!r.deleted===archived).sort((a,b)=>b.updated.localeCompare(a.updated)).map(({id,kind,mode,cn,created,updated})=>({id,kind,mode,cn,created,updated}));}
 function archive(id,deleted){const state=read(),r=state.records.find(r=>r.id===id);if(!r)throw Error('此设备中未找到记录 / Record not found');r.deleted=deleted?1:0;r.updated=new Date().toISOString();write(state);return {ok:true};}
 return {save,get,list,archive};
}
