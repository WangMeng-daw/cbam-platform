export function filterRecords(records,{mode='all',query='',from='',to=''}={}){
  const q=String(query).toLowerCase();
  return records.filter(r=>(mode==='all'||r.mode===mode||r.kind===mode)&&(!q||JSON.stringify(r.payload||{}).toLowerCase().includes(q)||String(r.cn||'').toLowerCase().includes(q))&&(!from||r.created.slice(0,10)>=from)&&(!to||r.created.slice(0,10)<=to));
}
