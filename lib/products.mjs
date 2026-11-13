export const productOptions=(config,lang=0)=>(config.productOptions||config.products||[]).map(p=>({value:p.cn,label:p.cn+' · '+(lang?p.en:p.name)}));
export function actualBenchmark(config,product,year){
 const b=config.benchmarks.find(row=>row.cn===product.cn&&Number(row.year)===Number(year));
 return b?.[product.kind==='recycled'?'actualL':'actualK']??b?.process;
}
export function selectProduct(config,product,cn){
 const info=config.products?.find(p=>p.cn===cn),kind=cn.startsWith('7601')?(product.kind==='recycled'?'recycled':'primary'):'forming';
 return {...product,cn,kind,name:info?.name||product.name,benchmark:''};
}
