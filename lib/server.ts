import {neutralBranding} from './neutral-branding.mjs';
import {env} from 'cloudflare:workers';
import seed from './config.json';
import {getChatGPTUser} from '../app/chatgpt-auth';
export function db(){if(!env.DB)throw Error('数据库未配置 / Database unavailable');return env.DB;}
export async function identity(){const u=await getChatGPTUser();return u?{id:u.userId,email:u.email?.toLowerCase()||'',name:u.displayName||u.email||''}:null;}
export async function member(){const u=await identity();if(!u)return null;const m=await db().prepare('SELECT email, role, name FROM members WHERE email=?').bind(u.email).first();return m?{...u,role:String(m.role)}:null;}
export async function requireRole(roles:string[]=['owner','admin','analyst']){const m=await member();if(!m||!roles.includes(m.role))throw Error('FORBIDDEN');return m;}
export async function ownerKey(req:Request){const u=await identity();if(u)return u.id;const cookie=req.headers.get('cookie')||'';const v=cookie.match(/(?:^|; )cbam_visitor=([a-f0-9-]{36})/);return v?.[1]||null;}
let configCache:any=null,configUntil=0,configLoading:Promise<any>|null=null;
export function invalidateConfiguration(){configCache=null;configUntil=0;}
export async function configuration(){if(configCache&&Date.now()<configUntil)return configCache;if(configLoading)return configLoading;configLoading=(async()=>{const row=await db().prepare('SELECT payload FROM configurations WHERE id=1').first();configCache=neutralBranding(row?JSON.parse(String(row.payload)):seed);configUntil=Date.now()+2000;return configCache;})();try{return await configLoading;}finally{configLoading=null;}}
export async function log(actor:string,action:string,target:string,detail=''){await db().prepare('INSERT INTO audit(id,actor,action,target,created,detail) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,target,new Date().toISOString(),detail).run();}
function b64(a:Uint8Array){let text='';for(let k=0;k<a.length;k+=16384)text+=String.fromCharCode(...a.subarray(k,k+16384));return btoa(text);}function un64(s:string){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
async function encryptionKey(){const secret=(env as any).DATA_ENCRYPTION_KEY;if(!secret)throw Error('数据加密密钥未配置 / Storage encryption unavailable');return crypto.subtle.importKey('raw',un64(secret),'AES-GCM',false,['encrypt','decrypt']);}
export async function encrypt(data:any){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(),new TextEncoder().encode(JSON.stringify(data)));return b64(iv)+'.'+b64(new Uint8Array(encrypted));}
export async function decrypt(payload:string){const [iv,data]=payload.split('.');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(iv)},await encryptionKey(),un64(data))));}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw Error('FORBIDDEN');}
export async function body(req:Request){if(Number(req.headers.get('content-length')||0)>1000000)throw Error('请求过大 / Request too large');const data=await req.text();if(data.length>1000000)throw Error('请求过大');return JSON.parse(data);}
export function failure(e:any){const message=e?.message||'服务异常';return Response.json({error:message},{status:message==='FORBIDDEN'?403:400});}
export {validateConfig} from './validate-config.mjs';
export function aggregateMarket(prices:any[],previous:any){const weeks=prices.filter(p=>p.kind==='EUA').sort((a,b)=>a.date.localeCompare(b.date));if(!weeks.length)return{...previous,monthly:[],currentWeek:{price:null},lastFullWeek:{price:null}};const groups=new Map<string,{sum:number,weight:number,count:number}>();for(const p of weeks){const month=p.date.slice(0,7),w=Number(p.volume)||1;const g=groups.get(month)||{sum:0,weight:0,count:0};g.sum+=Number(p.value)*w;g.weight+=w;g.count++;groups.set(month,g);}const last=weeks[weeks.length-1],prior=weeks[weeks.length-2]||last;return{...previous,asOf:last.date,method:'Weekly auction prices, volume weighted; allocated to month of week start.',monthly:[...groups.entries()].slice(-12).map(([month,g])=>({month,price:Math.round(g.sum/g.weight*100)/100,volume:g.weight,count:g.count,partial:month===last.date.slice(0,7)})),lastFullWeek:{weekStart:prior.date,price:prior.value},currentWeek:{weekStart:last.date,price:last.value}};}
