export const WORKSPACE_KEY='cbam-workspace-v1';
export const emptyWorkspace=()=>({schema:1,companies:[],products:[],models:[],factors:[]});
export function validateWorkspace(value){
 if(!value||value.schema!==1)throw Error('不支持的资料格式 / Unsupported workspace format');
 for(const key of ['companies','products','models','factors']){
  if(!Array.isArray(value[key])||value[key].length>500)throw Error('资料列表格式错误 / Invalid collection');
  const ids=new Set();
  for(const row of value[key]){
   if(!row||typeof row.id!=='string'||typeof row.name!=='string'||!row.name.trim()||ids.has(row.id))throw Error('资料名称或编号无效 / Invalid record');
   ids.add(row.id);
   if(key==='products'&&(!/^760[148]\d{4}$/.test(row.cn)||!['primary','recycled'].includes(row.aluminium)))throw Error('产品编码或路线无效 / Invalid product');
   if(key==='models'&&(!row.input||!['processing','integrated'].includes(row.input.boundary)))throw Error('模型边界无效 / Invalid model');
   if(key==='factors'&&(!row.source||!['t','Nm3'].includes(row.unit)||!row.type||!Number.isFinite(Number(row.ef))||row.ef===''||Number(row.ef)<0||!Number.isFinite(Number(row.ncv))||Number(row.ncv)<=0))throw Error('因子需包含来源、单位及有效的 EF/NCV / Invalid factor');
  }
 }
 return value;
}
export function readWorkspace(storage=localStorage){const raw=storage.getItem(WORKSPACE_KEY);return raw?validateWorkspace(JSON.parse(raw)):emptyWorkspace();}
export function writeWorkspace(value,storage=localStorage){validateWorkspace(value);storage.setItem(WORKSPACE_KEY,JSON.stringify(value));return value;}
