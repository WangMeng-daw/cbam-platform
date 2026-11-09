import assert from 'node:assert/strict';
import {emptyWorkspace,readWorkspace,writeWorkspace,validateWorkspace} from '../browser/workspace.mjs';
const memory=new Map();const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const data=emptyWorkspace();data.companies.push({id:'company-1',name:'Test company'});
data.products.push({id:'product-1',name:'Bars',cn:'76041010',country:'China',aluminium:'primary'});
data.factors.push({id:'factor-1',name:'Measured gas',source:'Test report',unit:'t',type:'fuel-33',ef:.0561,ncv:48});
writeWorkspace(data,storage);assert.deepEqual(readWorkspace(storage),data);
const duplicate=structuredClone(data);duplicate.companies.push({...duplicate.companies[0]});assert.throws(()=>validateWorkspace(duplicate));
for(const patch of [{ef:-1},{source:''},{ncv:0},{unit:'kg'}]){const invalid=structuredClone(data);Object.assign(invalid.factors[0],patch);assert.throws(()=>validateWorkspace(invalid));}
assert.throws(()=>writeWorkspace(data,{setItem:()=>{throw Error('Storage full')}}));
assert.throws(()=>readWorkspace({getItem:()=>'{broken'}));
console.log('PASS: workspace backup round-trip, duplicate IDs, invalid factors, corrupt storage and quota failures.');
