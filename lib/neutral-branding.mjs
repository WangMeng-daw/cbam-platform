// Apply the current presentation to legacy CMS and stored report snapshots.
// Calculation inputs, factors and historical versions are preserved.
const legacy = /\u8d5b\u5b9d|c[e]prei|4008301909|020-87236606|511370|\u6731\u6751|05096650/i;
const organization = /\u5e7f\u5dde\u8d5b\u5b9d\u8ba4\u8bc1\u4e2d\u5fc3\u670d\u52a1\u6709\u9650\u516c\u53f8|\u8d5b\u5b9d\u8ba4\u8bc1\u4e2d\u5fc3|\u8d5b\u5b9d|c[e]prei/gi;
export function neutralBranding(value) {
 const c=structuredClone(value);
 if(c.content){
  for(const key of ['phone','email','address','switchboard','postcode'])if(legacy.test(c.content[key]||''))c.content[key]='';
  if(legacy.test(c.content.footer||''))c.content.footer='CBAM 碳核算平台';
 }
 for(const t of c.templates||[]){
  for(const key of ['heading','headingEn'])if(typeof t[key]==='string')t[key]=t[key].replace(organization,'CBAM').replace(/CBAM\s+CBAM/g,'CBAM');
  t.includeServices=false;
 }
 for(const key of Object.keys(c.textOverrides||{}))if(legacy.test(key+JSON.stringify(c.textOverrides[key])))delete c.textOverrides[key];
 return c;
}
