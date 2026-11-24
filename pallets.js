(function(root){
'use strict';
const formats=[
 {key:'epal1',name:'Euro · EPAL 1',l:120,w:80,base:14.4,material:'wood'},
 {key:'epal2',name:'Industrial · EPAL 2',l:120,w:100,base:16.2,material:'wood'},
 {key:'epal6',name:'Half · EPAL 6',l:80,w:60,base:14.4,material:'wood'},
 {key:'quarter',name:'Quarter display',l:60,w:40,base:14.5,material:'plastic'}
];
function get(type){return formats.find(f=>f.key===type.pallet)||null}
function apply(type,key){const f=formats.find(f=>f.key===key);return f?{...type,pallet:key,l:f.l,w:f.w,h:Math.max(type.h,f.base+1)}:{...type,pallet:key}}
function fit(type){const choices=formats.filter(f=>type.l<=f.l&&type.w<=f.w||type.w<=f.l&&type.l<=f.w).sort((a,b)=>a.l*a.w-b.l*b.w||a.base-b.base);return choices.length?apply(type,choices[0].key):{...type,pallet:'custom'}}
function infer(type){return formats.find(f=>type.l===f.l&&type.w===f.w||type.w===f.l&&type.l===f.w)?.key||'custom'}
function normalize(type){if(type.pallet)return get(type)?apply(type,type.pallet):{...type};return type.key==='custom'?{...type,pallet:'custom'}:fit(type)}
const api={formats,get,apply,fit,infer,normalize};root.PalletStandards=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
