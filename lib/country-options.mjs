// Keep Annex 1 codes and labels intact; Chinese names are search aliases only.
const aliases={AN:'荷属安的列斯',EU:'欧盟 欧洲共同体',QP:'公海',TP:'东帝汶',XA:'美属大洋洲',XC:'休达',XI:'英国 北爱尔兰',XK:'科索沃',XL:'梅利利亚',XM:'黑山',XO:'澳属大洋洲',XP:'约旦河西岸 加沙地带',XR:'极地地区',XS:'塞尔维亚',XZ:'新西兰大洋洲',YU:'南斯拉夫',ZR:'扎伊尔'};
export function countryOptions(records,lang=0){
 const chinese=new Intl.DisplayNames(['zh-CN'],{type:'region'});
 return [{value:'',label:lang?'Not specified':'未填写'},...records.map(r=>({value:r.code,label:r.code+' · '+r.name,searchText:aliases[r.code]||chinese.of(r.code)||''}))];
}
