const clone=value=>JSON.parse(JSON.stringify(value));
const modelFields=['method','products','boundary','aluminium','technology','production','exportQty','cn','productProfile','fuels','processMaterials','flueGas','flareVolume','flareEF','heat','wasteGas','electricity','pfc','precursors','cems','cemsScope','cemsIncludesPfc'];
export function modelSnapshot(input){
 const snapshot={boundary:input.boundary||'processing'};
 for(const key of modelFields)if(input[key]!==undefined)snapshot[key]=clone(input[key]);
 return snapshot;
}
export function applyModel(input,model){return {...input,...clone(model.input),mode:'professional'};}
export function saveModel(workspace,{id,name,input},newId){
 if(!name?.trim())throw Error('请填写模型名称 / Enter a model name');
 if(id&&!workspace.models.some(row=>row.id===id))throw Error('模型已移除，请重新选择 / Model no longer exists');
 const row={id:id||newId,name:name.trim(),input:modelSnapshot(input)};
 const models=id?workspace.models.map(item=>item.id===id?row:item):[...workspace.models,row];
 return {workspace:{...workspace,models},row};
}
export function deleteModel(workspace,id){
 const row=workspace.models.find(item=>item.id===id);
 if(!row)return workspace;
 return {...workspace,models:workspace.models.filter(item=>item.id!==id),modelTrash:[...(workspace.modelTrash||[]),row]};
}
export function restoreModel(workspace,id){
 const row=(workspace.modelTrash||[]).find(item=>item.id===id);
 if(!row)return workspace;
 if(workspace.models.some(item=>item.id===id))throw Error('同编号模型已存在 / Model ID already exists');
 return {...workspace,models:[...workspace.models,row],modelTrash:workspace.modelTrash.filter(item=>item.id!==id)};
}
