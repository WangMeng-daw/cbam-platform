export const PRODUCT_CATEGORIES=['Unwrought aluminium','Aluminium products'];
export const PRODUCTION_ROUTES=['Primary (electrolytic) smelting','Secondary aluminium','Aluminium products'];
export const INSTALLATION_FIELDS=[
 ['name','设施名称','Name of the installation'],['englishName','设施名称（英文名称）','Name of the installation (English name)'],
 ['address','街道、门牌号','Street, Number'],['economicActivity','经济活动类型','Economic activity'],
 ['postCode','邮政编码','Post code'],['poBox','邮政信箱','P.O. Box'],['city','城市','City'],['country','国家','Country'],
 ['countryCode','联合国地点代码（UNLOCODE）国家代码','UN/LOCODE country code'],
 ['latitude','主要排放源坐标（纬度）','Main emission source (latitude)'],['longitude','主要排放源坐标（经度）','Main emission source (longitude)'],
 ['representative','授权代表姓名','Authorized representative'],['email','电子邮箱','Email'],['telephone','联系电话','Telephone']
];
export const emptyCompany=()=>Object.fromEntries(INSTALLATION_FIELDS.map(([key])=>[key,'']));
export function editCompany(row){return {...emptyCompany(),...row,name:row.profileVersion===2?row.name:row.installation||row.name};}
export function prepareCompany(row){
 const next={...row,name:String(row.name||'').trim(),city:String(row.city||'').trim(),profileVersion:2};
 if(!next.name||!next.city)throw Error('设施名称和城市为必填项 / Installation name and city are required');
 for(const [key,max] of [['latitude',90],['longitude',180]])if(next[key]!==''&&next[key]!=null&&(!Number.isFinite(Number(next[key]))||Math.abs(Number(next[key]))>max))throw Error(key==='latitude'?'纬度须在−90至90之间 / Invalid latitude':'经度须在−180至180之间 / Invalid longitude');
 next.installation=next.name;
 return next;
}
export function companyReport(row){return {
 operatorName:row.name,registration:row.registration||'',operatorAddress:row.address||'',installationName:row.name,
 installationEnglishName:row.englishName||'',installationAddress:row.address||'',economicActivity:row.economicActivity||'',
 postCode:row.postCode||'',poBox:row.poBox||'',city:row.city||'',installationCountry:row.country||'',
 locode:row.locode||'',locodeCountry:row.countryCode||'',latitude:row.latitude??'',longitude:row.longitude??'',representative:row.representative||'',email:row.email||'',telephone:row.telephone||'',
 ...(row.latitude!==''&&row.latitude!=null&&row.longitude!==''&&row.longitude!=null?{coordinates:`${row.latitude}, ${row.longitude}`}:{coordinates:''})
};}
export const INSTALLATION_REPORT_FIELDS=[
 ['installationName','设施名称','Installation name'],['installationEnglishName','设施英文名称','Installation English name'],
 ['installationAddress','街道、门牌号','Street, Number'],['economicActivity','经济活动类型','Economic activity'],['postCode','邮政编码','Post code'],
 ['poBox','邮政信箱','P.O. Box'],['city','城市','City'],['installationCountry','国家','Country'],['locodeCountry','UNLOCODE国家代码','UN/LOCODE country code'],
 ['latitude','纬度','Latitude'],['longitude','经度','Longitude'],['representative','授权代表姓名','Authorized representative'],['email','电子邮箱','Email'],['telephone','联系电话','Telephone']
];
export const emptyProduct=()=>({category:'',route:'',name:'',cn:'',country:''});
export function editProduct(row){return {...emptyProduct(),...row,
 category:row.category||(row.cn?.startsWith('7601')?PRODUCT_CATEGORIES[0]:PRODUCT_CATEGORIES[1]),
 route:row.route||(row.cn?.startsWith('7601')?(row.aluminium==='recycled'?PRODUCTION_ROUTES[1]:PRODUCTION_ROUTES[0]):PRODUCTION_ROUTES[2])};}
export function prepareProducts(rows){
 const filled=rows.filter(r=>r.id||r.category||r.route||r.name||r.cn||r.country);
 if(!filled.length)throw Error('请至少填写1行产品大类和生产工艺路线 / Complete at least one product row');
 return filled.map((r,index)=>{
  if(!PRODUCT_CATEGORIES.includes(r.category)||!PRODUCTION_ROUTES.includes(r.route))throw Error(`第${rows.indexOf(r)+1}行请完整选择产品大类和生产工艺路线 / Complete category and route`);
  if(r.cn&&!/^76\d{6}$/.test(r.cn))throw Error('请选择有效CN编码 / Select a valid CN code');
  return {...r,profileVersion:2,name:r.name?.trim()||r.category,aluminium:r.route===PRODUCTION_ROUTES[1]?'recycled':'primary'};
 });
}
export function productAssessment(row){
 const p=editProduct(row);
 return {name:p.name||p.category,cn:p.cn||'',kind:p.route===PRODUCTION_ROUTES[0]?'primary':p.route===PRODUCTION_ROUTES[1]?'recycled':'forming',category:p.category,route:p.route,country:p.country||'',sourceProductId:p.id||''};
}
export function applyProductProfile(input,row,newProduct){
 const profile=prepareProducts([row])[0],details=productAssessment(profile),products=[...(input.products||[])];
 const index=profile.id?products.findIndex(p=>p.sourceProductId===profile.id):-1;
 if(index<0)products.push({...newProduct,...details});
 else {const previous=products[index];products[index]={...previous,...details,...(previous.cn!==details.cn||previous.kind!==details.kind?{benchmark:''}:{})};}
 return {...input,mode:'professional',method:'document',cn:details.cn,country:profile.country||input.country,aluminium:profile.aluminium,productName:details.name,productProfile:profile,products};
}
export const PRODUCT_REPORT_FIELDS=[['name','产品名称','Product name'],['cn','CN编码','CN code'],['category','产品大类','Product category'],['route','生产工艺路线','Production route'],['country','生产国','Country of production']];
export function assessmentProductInfo(input,config){
 if(input.method==='document'&&input.mode==='professional')return (input.products||[]).map(p=>({id:p.id,name:p.name,cn:p.cn,category:p.category||(p.cn?.startsWith('7601')?PRODUCT_CATEGORIES[0]:PRODUCT_CATEGORIES[1]),route:PRODUCTION_ROUTES[p.kind==='primary'?0:p.kind==='recycled'?1:2],country:p.country||input.country||''}));
 const profile=input.productProfile?.cn===input.cn?input.productProfile:null,info=config.products?.find(p=>p.cn===input.cn);
 return [{name:profile?.name||info?.name||input.cn,cn:input.cn,category:profile?.category||(input.cn?.startsWith('7601')?PRODUCT_CATEGORIES[0]:PRODUCT_CATEGORIES[1]),route:input.cn?.startsWith('7601')?PRODUCTION_ROUTES[input.aluminium==='recycled'?1:0]:profile?.route||PRODUCTION_ROUTES[2],country:input.country||''}];
}
