'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ChevronDown,Search,Check} from 'lucide-react';

type Option={value:string;label:string;searchText?:string};
export function SearchSelect({label,value,onChange,options,required=false,hint='',wide=false,lang=0,searchKind='product'}:any){
 const country=searchKind==='country';
 const placeholder=country?(lang?'Search country code or name':'输入国家代码或国家名称搜索'):(lang?'Search CN code or product name':'输入CN编码或产品名称搜索');
 const id=useId(),input=useRef<HTMLInputElement>(null),list=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0),[chosen,setChosen]=useState(-1);
 const entries:Option[]=options.map((o:any)=>typeof o==='string'?{value:o,label:o}:o);
 const selected=entries[chosen]?.value===value?entries[chosen]:entries.find(o=>o.value===value);
 const normalize=(text:string)=>text.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');
 const terms=query.trim().normalize('NFKC').toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const compact=normalize(query);
 const matches=entries.map((option,index)=>({...option,index})).filter(o=>!compact||normalize(o.value).includes(compact)||(!/^\d+$/.test(compact)&&terms.every(t=>normalize(o.label+' '+(o.searchText||'')).includes(t))));
 const close=()=>{setOpen(false);setQuery('');setActive(0);};
 const choose=(o:Option&{index:number})=>{setChosen(o.index);onChange(o.value);input.current?.focus();close();};
 useEffect(()=>{
  if(!open)return;
  const parent=list.current,child=parent?.children[active] as HTMLElement|undefined;
  if(parent&&child){if(child.offsetTop<parent.scrollTop)parent.scrollTop=child.offsetTop;else if(child.offsetTop+child.offsetHeight>parent.scrollTop+parent.clientHeight)parent.scrollTop=child.offsetTop+child.offsetHeight-parent.clientHeight;}
 },[active,open,query]);
 return <div className={`field search-select ${wide?'wide':''}`} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))close();}}>
  <label htmlFor={id}><span>{label}{required&&<b className="req"> *</b>}</span></label>
  <div className="input-wrap search-select-input"><Search size={16} aria-hidden="true"/>
   <input ref={input} id={id} role="combobox" type="text" autoComplete="off" value={open?query:selected?.label||''}
    placeholder={placeholder} title={selected?.label}
    aria-required={required} aria-expanded={open} aria-autocomplete="list" aria-controls={open?id+'-list':undefined}
    aria-describedby={id+'-hint'} aria-activedescendant={open&&matches[active]?id+'-option-'+matches[active].index:undefined}
    onFocus={()=>{setOpen(true);setQuery('');setActive(0);}}
    onClick={()=>{if(!open){setOpen(true);setQuery('');setActive(0);}}}
    onChange={e=>{setQuery(e.target.value);setActive(0);setOpen(true);}}
    onKeyDown={e=>{
     if(e.nativeEvent.isComposing)return;
     if(e.key==='Escape'){e.preventDefault();close();}
     else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!open){setOpen(true);setQuery('');setActive(e.key==='ArrowDown'?0:entries.length-1);}else setActive(n=>Math.max(0,Math.min(matches.length-1,n+(e.key==='ArrowDown'?1:-1))));}
     else if(e.key==='Enter'&&open){e.preventDefault();if(matches[active])choose(matches[active]);}
    }}/>
   <button type="button" className="search-select-toggle" tabIndex={-1} aria-label={country?(lang?'Toggle countries':'展开或收起国家列表'):(lang?'Toggle products':'展开或收起产品列表')} onMouseDown={e=>e.preventDefault()} onClick={()=>{if(open)close();else{input.current?.focus();setOpen(true);setQuery('');setActive(0);}}}><ChevronDown size={16}/></button>
  </div>
  <small className="field-hint" id={id+'-hint'}>{hint||placeholder}</small>
  {open&&<div className="search-select-popup">
   <div className="search-select-count" role="status">{lang?`${matches.filter(o=>o.value).length} of ${entries.filter(o=>o.value).length} records`:`匹配 ${matches.filter(o=>o.value).length} / ${entries.filter(o=>o.value).length} 条${country?'国家代码':'产品'}记录`}</div>
   <div ref={list} id={id+'-list'} role="listbox" aria-label={label} className="search-select-options">
    {matches.map((o,index)=><button key={o.index} id={id+'-option-'+o.index} type="button" role="option" tabIndex={-1}
     aria-selected={o===selected||o.index===(chosen>=0&&entries[chosen]?.value===value?chosen:entries.findIndex(v=>v.value===value))}
     className={index===active?'active':''} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(o)}>
     <strong>{o.value}</strong><span>{o.label.replace(o.value+' · ','')}</span>{o.value===value&&<Check size={14} aria-hidden="true"/>}
    </button>)}
   </div>
   {!matches.length&&<p className="search-select-empty">{country?(lang?'No matches. Try another country code or name.':'没有匹配国家，请更换代码或国家名称。'):(lang?'No matches. Try another CN code or product name.':'没有匹配产品，请更换CN编码或产品名称。')}</p>}
  </div>}
 </div>;
}
