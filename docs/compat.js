/* Small, standards-based shims for the declared legacy browser baseline.
 * Loaded synchronously before framework modules. No browser globals are assumed
 * beyond the ES2019 baseline supported by iOS 13 / Safari 14. */
(function () {
  if (!Object.hasOwn) Object.defineProperty(Object, 'hasOwn', {configurable:true,writable:true,value:function(o,k){return Object.prototype.hasOwnProperty.call(o,k);}});
  if (!Promise.allSettled) Object.defineProperty(Promise, 'allSettled', {configurable:true,writable:true,value:function(values){return Promise.all(Array.from(values,function(v){return Promise.resolve(v).then(function(value){return {status:'fulfilled',value:value};},function(reason){return {status:'rejected',reason:reason};});}));}});
  if (!String.prototype.replaceAll) Object.defineProperty(String.prototype, 'replaceAll', {configurable:true,writable:true,value:function(search,replacement){if(search instanceof RegExp){if(!search.global)throw new TypeError('replaceAll requires a global RegExp');return this.replace(search,replacement);}return this.replace(new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'),replacement);}});
  if (!window.queueMicrotask) window.queueMicrotask=function(fn){Promise.resolve().then(fn).catch(function(e){setTimeout(function(){throw e;});});};
  function checkFlexGap(){var el=document.createElement('div');el.style.cssText='display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';el.appendChild(document.createElement('div'));el.appendChild(document.createElement('div'));document.body.appendChild(el);if(el.scrollHeight!==1)document.documentElement.classList.add('no-flex-gap');el.remove();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',checkFlexGap);else checkFlexGap();
})();
