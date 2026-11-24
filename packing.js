(function(root){
'use strict';
const EPS=1e-6;
// Ground is filled first, in descending footprint / weight priority. Only then
// are exposed package tops opened as support surfaces for the next story.
function pack(types,container,options={}){
 const [L,W,H]=container,g=Math.max(0,Number(options.gap)||0);
 const priority=types.map((_,i)=>i).sort((a,b)=>types[b].l*types[b].w-types[a].l*types[a].w||(Number(types[b].weight)||0)-(Number(types[a].weight)||0)||types[b].h-types[a].h);
 const rotations=types.map(t=>{
  const modes=t.orientation==='90'?[true]:t.orientation==='0'||!options.rotation?[false]:t.l===t.w?[false]:[false,true];
  return modes.map(rotated=>({l:rotated?t.w:t.l,w:rotated?t.l:t.w,h:t.h,rotated})).filter(c=>c.l>0&&c.w>0&&c.h>0);
 });
 function rankLess(a,b){for(let i=0;i<a.length;i++){if(a[i]<b[i]-EPS)return true;if(a[i]>b[i]+EPS)return false}return false}
 function intersects(a,b){return a.x<b.x+b.l-EPS&&a.x+a.l>b.x+EPS&&a.y<b.y+b.w-EPS&&a.y+a.w>b.y+EPS}
 function subtract(free,used){
  const next=[];
  for(const f of free){
   if(!intersects(f,used)){next.push(f);continue}
   if(used.x>f.x+EPS)next.push({...f,l:used.x-f.x});
   if(used.x+used.l<f.x+f.l-EPS)next.push({...f,x:used.x+used.l,l:f.x+f.l-used.x-used.l});
   if(used.y>f.y+EPS)next.push({...f,w:used.y-f.y});
   if(used.y+used.w<f.y+f.w-EPS)next.push({...f,y:used.y+used.w,w:f.y+f.w-used.y-used.w});
  }
  // Free rectangles can overlap; remove contained duplicates after every split.
  return next.filter((a,i)=>a.l>EPS&&a.w>EPS&&!next.some((b,j)=>i!==j&&a.x>=b.x-EPS&&a.y>=b.y-EPS&&a.x+a.l<=b.x+b.l+EPS&&a.y+a.w<=b.y+b.w+EPS&&(b.l*b.w>a.l*a.w+EPS||j<i)));
 }
 function run(mode,floorCap=Infinity,rowDepth=null){
  const remaining=types.map(t=>t.qty),placed=[],stories=[];let uid=0;
  let surfaces=[];
  if(rowDepth){for(let x=0;x<L-EPS;x+=rowDepth+g)surfaces.push({x,y:0,l:Math.min(rowDepth,L-x),w:W,z:0,parent:null,weight:Infinity,rowX:x,rowDepth:Math.min(rowDepth,L-x)})}
  else surfaces=[{x:0,y:0,l:L,w:W,z:0,parent:null,weight:Infinity}];
  while(surfaces.length&&remaining.some(n=>n>0)){
   const story=stories.length+1,items=[];
   const bins=surfaces.map(s=>{const gap=options.rows&&s.parent!==null?0:g;return {...s,gap,free:[{x:s.x,y:s.y,l:s.l+gap,w:s.w+gap}]}});
   for(const ti of priority){
    const t=types[ti],weight=Number(t.weight)||0;
    while(remaining[ti]>0){
     if(story===1&&ti===priority[0]&&items.filter(b=>b.ti===ti).length>=floorCap)break;
     let best=null;
     for(let bi=0;bi<bins.length;bi++){
      const bin=bins[bi];if(bin.z+t.h>H+EPS||weight>bin.weight+EPS)continue;
      for(const f of bin.free)for(const c of rotations[ti]){
       const l=c.l+bin.gap,w=c.w+bin.gap;if(l>f.l+EPS||w>f.w+EPS)continue;
       const dl=Math.max(0,f.l-l),dw=Math.max(0,f.w-w),potential=Math.floor((f.l+EPS)/l)*Math.floor((f.w+EPS)/w),waste=f.l*f.w-l*w;
       let rank;
       if(mode===0)rank=[-potential,f.x,f.y,Math.min(dl,dw),Math.max(dl,dw),bin.z];
       else if(mode===1)rank=[Math.min(dl,dw),Math.max(dl,dw),waste,f.x,f.y,bin.z];
       else if(mode===2)rank=[waste,-potential,f.x,f.y,bin.z];
       else rank=[f.x,Math.max(0,f.w-Math.floor((f.w+EPS)/w)*w),f.y,-potential,bin.z];
       if(!best||rankLess(rank,best.rank))best={bi,c,x:f.x,y:f.y,rank};
      }
     }
     if(!best)break;
     const bin=bins[best.bi],b={...t,...best.c,ti,x:best.x,y:best.y,z:bin.z,story,uid:++uid,supportUid:bin.parent,...(rowDepth?{rowX:bin.rowX,rowDepth:bin.rowDepth}:{})};
     bin.free=subtract(bin.free,{x:b.x,y:b.y,l:b.l+bin.gap,w:b.w+bin.gap});
     placed.push(b);items.push(b);remaining[ti]--;
    }
   }
   if(!items.length)break;
   const area=items.reduce((a,b)=>a+b.l*b.w,0),availableArea=surfaces.reduce((a,b)=>a+b.l*b.w,0);
   stories.push({id:story,name:story===1?'Ground floor':'Story '+story,items,area,availableArea,fill:availableArea?area/availableArea:0,minZ:Math.min(...items.map(b=>b.z)),maxZ:Math.max(...items.map(b=>b.z)),count:items.length});
   if(!options.stack)break;
   // One complete supporting footprint per upper package; no bridging, floating,
   // heavier-on-lighter placement, or movement after a support is occupied.
   surfaces=items.filter(b=>b.z+b.h<H-EPS).map(b=>({x:b.x,y:b.y,l:b.l,w:b.w,z:b.z+b.h,parent:b.uid,weight:Number(b.weight)||0,rowX:b.rowX,rowDepth:b.rowDepth}));
  }
  // Playback remains cab-to-rear; same-front supports always precede their load.
  placed.sort((a,b)=>rowDepth?(a.rowX-b.rowX||a.z-b.z||a.x-b.x||a.y-b.y):(a.x-b.x||a.z-b.z||a.y-b.y));
  const rows=[],serial=types.map(()=>0),byUid=new Map();
  for(const b of placed){
   const rowX=rowDepth?b.rowX:b.x;let row=rows[rows.length-1];if(!row||Math.abs(row.x-rowX)>EPS){row={id:rows.length+1,x:rowX,depth:rowDepth?b.rowDepth:0,widthUsed:0,items:[],start:byUid.size};rows.push(row)}
   b.row=row.id;b.number=byUid.size+1;b.index=++serial[b.ti];byUid.set(b.uid,b);row.items.push(b);row.depth=Math.max(row.depth,b.x-row.x+b.l);row.widthUsed=Math.max(row.widthUsed,b.y+b.w);row.end=byUid.size;
  }
  for(const b of placed)b.supportNumber=b.supportUid===null?null:byUid.get(b.supportUid).number;
  for(const row of rows){row.floorFill=row.items.filter(b=>b.z===0).reduce((a,b)=>a+b.l*b.w,0)/(row.depth*W);row.sideVoid=W-row.widthUsed;row.stories=[...new Set(row.items.map(b=>b.story))].sort((a,b)=>a-b)}
  const unplaced=types.flatMap((t,ti)=>Array.from({length:remaining[ti]},(_,i)=>({...t,ti,index:serial[ti]+i+1})));
  const groundCounts=types.map((_,ti)=>placed.filter(b=>b.story===1&&b.ti===ti).length);
  return {placed,unplaced,rows,stories,groundCounts,usedLength:placed.length?Math.max(...placed.map(b=>b.x+b.l)):0,packedVolume:placed.reduce((a,b)=>a+b.l*b.w*b.h,0),gap:g,stackGap:options.rows?0:g,rowDepth,rowMode:options.rows?'bands':'fronts',loadingDirection:'front-to-rear',packingMode:'ground-first-stories'};
 }
 // Try several orientation / free-space heuristics. Ground capacity for larger
 // packages takes priority, followed by cargo fitted and lower-story coverage.
 function better(a,b){
  if(!a.unplaced.length&&b.unplaced.length)return true;
  if(a.unplaced.length&&!b.unplaced.length)return false;
  if(a.unplaced.length&&b.unplaced.length){if(Math.abs(a.packedVolume-b.packedVolume)>EPS)return a.packedVolume>b.packedVolume;if(a.placed.length!==b.placed.length)return a.placed.length>b.placed.length}
  for(const ti of priority){if(a.groundCounts[ti]!==b.groundCounts[ti])return a.groundCounts[ti]>b.groundCounts[ti]}
  if(Math.abs(a.packedVolume-b.packedVolume)>EPS)return a.packedVolume>b.packedVolume;
  if(a.placed.length!==b.placed.length)return a.placed.length>b.placed.length;
  for(let i=0;i<Math.max(a.stories.length,b.stories.length);i++){const aa=a.stories[i]?.area||0,bb=b.stories[i]?.area||0;if(Math.abs(aa-bb)>EPS)return aa>bb}
  return a.usedLength<b.usedLength-EPS;
 }
 const depths=options.rows?[...new Set(rotations.flat().map(c=>c.l).filter(l=>l<=L+EPS))].sort((a,b)=>b-a):[null];
 if(!depths.length)depths.push(L);
 let best;for(const depth of depths)for(const mode of [0,1,2,3]){const candidate=run(mode,Infinity,depth);if(!best||better(candidate,best))best=candidate}
 // A dense floor can require a different mix. If cargo remains, compare nearby
 // ground allocations instead of insisting on a layout that strands upper cargo.
 if(options.stack&&best.unplaced.length&&priority.length){
  const n=best.groundCounts[priority[0]],caps=[...new Set([n-1,n-2,n-3,n-4,Math.floor(n*.5)])].filter(c=>c>0);
  for(const cap of caps)for(const depth of depths)for(const mode of [0,1,2,3]){const candidate=run(mode,cap,depth);if(better(candidate,best))best=candidate}
 }
 return best;
}
root.packCargo=pack;if(typeof module!=='undefined')module.exports=pack;
})(globalThis);
