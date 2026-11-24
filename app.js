const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const PACKAGE_PRESETS=[
 {key:'industrial',name:'Industrial crates',l:120,w:80,h:70,weight:85,color:'#ad91ee'},
 {key:'equipment',name:'Equipment boxes',l:80,w:60,h:60,weight:32,color:'#78aef3'},
 {key:'parcels',name:'Small parcels',l:60,w:40,h:40,weight:12,color:'#d0a3e4'},
 {key:'electronics',name:'Electronics cases',l:60,w:40,h:45,weight:18,color:'#edb477'},
 {key:'insulated',name:'Insulated totes',l:40,w:30,h:30,weight:8,color:'#67cbbd'},
 {key:'machinery',name:'Machinery crates',l:120,w:100,h:90,weight:140,color:'#ef908d'},
 {key:'tall',name:'Tall cartons',l:60,w:40,h:100,weight:15,color:'#ee91c0'},
 {key:'custom',name:'Custom pallet',l:80,w:60,h:60,weight:20,color:'#91c6e8'}
];
function packageFromPreset(key,id,qty=4){const p=PACKAGE_PRESETS.find(p=>p.key===key)||PACKAGE_PRESETS[0];return key==='insulated'?{...p,id,qty,pallet:'none'}:PalletStandards.normalize({...p,id,qty})}
let types=[packageFromPreset('industrial',1,18),packageFromPreset('equipment',2,16),packageFromPreset('parcels',3,12),packageFromPreset('electronics',4,4),packageFromPreset('insulated',5,4)],nextId=6,container=[590,235,239],result={placed:[],unplaced:[]},shown=0,yaw=-.65,pitch=.46,zoom=1,view='3d',xray=false,playing=false,playTimer,toastTimer,selectedRow=null,pausedSequence=false,selectedStory=null,selectedPackage=null,inspectorMode='row',sequenceStarted=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500)}
function renderTypes(){
 types=types.map(PalletStandards.normalize);
$('#packages').innerHTML=types.map(t=>`<article class="package" data-id="${t.id}" style="border-left:2px solid ${t.color}"><div class="package-top"><input class="swatch" type="color" aria-label="${esc(t.name)} color" value="${t.color}" data-field="color"><input class="package-name" aria-label="Package name" maxlength="40" value="${esc(t.name)}" data-field="name"><button class="delete-package" aria-label="Remove ${esc(t.name)}">×</button></div><label class="pallet-format">Pallet size<select data-field="pallet" aria-label="${esc(t.name)} pallet size">${PalletStandards.formats.map(f=>`<option value="${f.key}" ${t.pallet===f.key?'selected':''}>${f.name} · ${f.l} × ${f.w} cm</option>`).join('')}<option value="none" ${t.pallet==='none'?'selected':''}>Loose cargo · no pallet</option><option value="custom" ${t.pallet==='custom'?'selected':''}>Custom footprint</option></select></label><div class="dimensions">${[['l','Length'],['w','Width'],['h','Loaded height']].map(([k,n])=>`<label>${n}<div><input aria-label="${esc(t.name)} ${n.toLowerCase()}" type="number" step="0.1" min="${k==='h'?(PalletStandards.get(t)?.base||0)+1:1}" max="2000" title="${k==='h'?'Overall height including pallet':'Pallet footprint'}" value="${t[k]}" ${k!=='h'&&PalletStandards.get(t)?'readonly':''} data-field="${k}"><span>cm</span></div></label>`).join('')}</div><label class="orientation-field">Upright orientation<select data-field="orientation" aria-label="${esc(t.name)} orientation"><option value="auto" ${!t.orientation||t.orientation==='auto'?'selected':''}>Auto · fit to row</option><option value="0" ${t.orientation==='0'?'selected':''}>0° · original footprint</option><option value="90" ${t.orientation==='90'?'selected':''}>90° · rotated footprint</option></select></label><div class="package-bottom"><label><input class="pkg-weight" type="number" aria-label="${esc(t.name)} weight" min="0" max="10000" value="${t.weight}" data-field="weight"> kg / item</label><div class="qty"><button data-delta="-1" aria-label="Decrease ${esc(t.name)} quantity">−</button><input type="number" aria-label="${esc(t.name)} quantity" min="1" max="200" value="${t.qty}" data-field="qty"><button data-delta="1" aria-label="Increase ${esc(t.name)} quantity">+</button></div></div></article>`).join('');
$('#typeCount').textContent=types.length+' types';
}
$('#packages').addEventListener('change',e=>{let card=e.target.closest('.package');if(!card||!e.target.dataset.field)return;let t=types.find(t=>t.id===+card.dataset.id),f=e.target.dataset.field;if(f==='pallet'){Object.assign(t,PalletStandards.apply(t,e.target.value));renderTypes();repack();return}if(f==='name'||f==='color'||f==='orientation')t[f]=e.target.value||'Package';else{t[f]=Math.min(f==='qty'?200:f==='weight'?10000:2000,Math.max(f==='weight'?0:1,Number(e.target.value)||1));e.target.value=t[f]}repack()});
$('#packages').addEventListener('click',e=>{let card=e.target.closest('.package');if(!card)return;let id=+card.dataset.id,t=types.find(t=>t.id===id);if(e.target.closest('.delete-package')){types=types.filter(t=>t.id!==id);renderTypes();repack()}else if(e.target.dataset.delta){t.qty=Math.max(1,Math.min(200,t.qty+ +e.target.dataset.delta));renderTypes();repack()}});
$('#add').onclick=()=>{
 if(types.length>=20)return toast('Up to 20 package types per plan.');
 const t=packageFromPreset($('#packagePreset').value,nextId++),usedColors=new Set(types.map(t=>t.color));
 if(usedColors.has(t.color))t.color=PACKAGE_PRESETS.map(p=>p.color).find(color=>!usedColors.has(color))||t.color;
 const sameName=types.filter(p=>p.key===t.key).length;if(sameName)t.name+=' '+(sameName+1);
 types.push(t);renderTypes();repack();toast(t.name+' added');
};
const presets={'20':[590,235,239],'40':[1203,235,239],hc:[1203,235,269]};
$('#preset').onchange=()=>{if(presets[$('#preset').value]){container=[...presets[$('#preset').value]];['cl','cw','ch'].forEach((id,i)=>$('#'+id).value=container[i])}updateContainerTitle();repack()};
function updateContainerTitle(){$('.viewer-sub').textContent=({'20':'RIGID TRUCK','40':'BOX TRUCK',hc:'HIGH-VOLUME TRUCK',custom:'CUSTOM TRUCK'})[$('#preset').value]}
['cl','cw','ch'].forEach((id,i)=>$('#'+id).onchange=()=>{container[i]=Math.max(50,Math.min(i===0?2000:600,+$('#'+id).value||50));$('#'+id).value=container[i];$('#preset').value='custom';updateContainerTitle();repack()});
['rotation','stack','gap'].forEach(id=>$('#'+id).onchange=()=>{if(id==='gap')$('#gap').value=Math.max(0,Math.min(1,+$('#gap').value||0));repack()});
function repack(){stopPlay();types=types.map(PalletStandards.normalize);renderTypes();result=packCargo(types,container,{rows:true,rotation:$('#rotation').checked,stack:$('#stack').checked,gap:+$('#gap').value});shown=0;selectedRow=null;selectedStory=null;selectedPackage=null;sequenceStarted=false;resetCamera();$('#timeline').max=result.placed.length;$('#timeline').value=0;updateStats();renderStories();renderRows();draw();}
function updateStats(){let total=types.reduce((a,t)=>a+t.qty,0),vol=result.placed.reduce((a,t)=>a+t.l*t.w*t.h/1e6,0),capacity=container.reduce((a,b)=>a*b,1)/1e6,weight=result.placed.reduce((a,t)=>a+t.weight,0),util=vol/capacity*100;$('#available').textContent=capacity.toFixed(2)+' m³';$('#util').innerHTML=util.toFixed(1)+'<small>%</small>';$('#utilBar').style.width=util+'%';$('#count').innerHTML=result.placed.length+' <small>/ '+total+'</small>';$('#fitStatus').textContent=result.unplaced.length?result.unplaced.length+' packages do not fit':'All packages fit';$('#fitStatus').style.color=result.unplaced.length?'#ddbd82':'';$('#volume').innerHTML=vol.toFixed(2)+'<small> m³</small>';$('#freeSpace').textContent=(capacity-vol).toFixed(2)+' m³ remaining';$('#weight').innerHTML=weight.toLocaleString()+'<small> kg</small>';$('#legend').innerHTML=types.map(t=>`<span role="listitem"><i style="background:${t.color}"></i><span>${esc(t.name)}</span></span>`).join('');$('#viewerMessage').textContent=result.unplaced.length?result.unplaced.length+' pallets do not fit.':'';updateStep()}
const pad=n=>String(n).padStart(2,'0');
function updateStep(){
 $('#loadedCount').textContent=shown+' / '+result.placed.length+' pallets';
 const current=result.placed[Math.max(0,shown-1)];
 $('#stepLabel').textContent=!sequenceStarted?'Ready':shown===result.placed.length?'Complete load · '+shown+' pallets':shown===0?'Ready':`Pallet ${pad(shown)} loaded · Row ${current.row}`;
 $('#timeline').value=shown;
 $('#prevStep').disabled=shown===0;
 $('#nextStep').disabled=sequenceStarted&&shown>=result.placed.length||!result.placed.length;
 $('#nextStep').textContent=!sequenceStarted?'Start loading':shown>=result.placed.length?'Load complete':'Load pallet '+pad(shown+1);
 $$('#rowList button').forEach(b=>{const r=result.rows[+b.dataset.row-1];if(!r)return;b.classList.toggle('loaded',r.end<=shown);b.classList.toggle('partial',shown>r.start&&shown<r.end)});
}
function matchingPackages(query){
 const clean=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const text=clean(query),number=text.match(/^(?:(?:pallet|package)[\s#-]*)?#?0*(\d+)$/);
 if(number)return result.placed.filter(b=>b.number===Number(number[1]));
 const words=text.split(/\s+/).filter(Boolean);
 return result.placed.filter(b=>{const label=clean(`${b.name} pallet ${b.number} ${pad(b.number)}`);return words.every(word=>label.includes(word))});
}
function renderRows(){
 const palletListScroll=$('#rowItems').scrollTop;
 $('#rowCount').textContent=result.rows.length;
 $('#rowList').innerHTML=result.rows.map(r=>{const loaded=Math.max(0,Math.min(r.items.length,shown-r.start));return `<button class="row-card ${selectedRow===r.id?'active':''} ${loaded===r.items.length?'loaded':loaded?'partial':''}" data-row="${r.id}" aria-pressed="${selectedRow===r.id}"><span class="row-number">${pad(r.id)}</span><span><strong>Row ${r.id}${r.id===1?' · Front':''}</strong><small>${r.items.length} ${r.items.length===1?'pallet':'pallets'} · ${loaded} loaded</small></span><i></i></button>`}).join('');
 $('#allRows').classList.toggle('active',selectedRow===null);
 const row=result.rows.find(r=>r.id===selectedRow),item=result.placed.find(b=>b.number===selectedPackage),query=$('#packageSearch').value.trim(),searching=!!query,mode=searching?'item':inspectorMode;
 $('#clearPackageSearch').hidden=!searching;
 const matches=searching?matchingPackages(query):[];
 $('#packageSearchStatus').textContent=searching?`${matches.length} ${matches.length===1?'package':'packages'} found`:'';
 const list=searching?matches:row?row.items:result.placed;
  $('#rowItems').innerHTML=list.map(b=>`<button class="pallet-chip ${b.number===selectedPackage?'active':''} ${b.number<=shown?'loaded':''}" data-package="${b.number}" aria-pressed="${b.number===selectedPackage}" aria-label="Select pallet ${pad(b.number)}, ${esc(b.name)}, row ${b.row}"><span style="background:${b.color}">${pad(b.number)}</span><strong>${esc(b.name)}</strong><small>R${b.row} · S${b.story} ${b.number<=shown?'· ✓':''}</small></button>`).join('');
 if(searching&&!matches.length)$('#rowItems').innerHTML='<p class="search-empty">No matching packages.</p>';
 $('#packageDetails').innerHTML=item?`<div class="pallet-detail-title"><span style="background:${item.color}">${pad(item.number)}</span><div><strong>${esc(item.name)}</strong><small>${item.number<=shown?'Loaded':'Upcoming'} · Step ${item.number} of ${result.placed.length}</small></div></div><dl><div><dt>Overall size</dt><dd>${item.l} × ${item.w} × ${item.h} cm</dd></div><div><dt>Weight / orientation</dt><dd>${item.weight} kg · ${item.rotated?'90°':'0°'} upright</dd></div><div><dt>Position</dt><dd>Row ${item.row} · ${item.story===1?'Ground floor':'Story '+item.story}</dd></div><div><dt>Supported by</dt><dd>${item.supportNumber?'Pallet '+pad(item.supportNumber):'Truck bed'}</dd></div></dl>`:'';
 $('#rowItems').scrollTop=palletListScroll;
 updateStep();
}
function clearSelection(){
 if(selectedRow===null&&selectedPackage===null)return;
 if(playing)stopPlay(true);
 selectedRow=null;selectedPackage=null;renderRows();draw();
}
function resetViewport(){
 if(playing)stopPlay(true);
 selectedRow=null;selectedPackage=null;selectedStory=null;inspectorMode='row';
 $('#packageSearch').value='';$('#showUpcoming').checked=true;setLegendHidden(false);xray=false;$('#wire').classList.remove('on');
 resetCamera();setView('3d');renderStories();renderRows();draw();
}
function renderStories(){
 $('#stories').innerHTML=`<button class="story-button ${selectedStory===null?'active':''}" data-story="all" aria-pressed="${selectedStory===null}"><strong>All stories</strong><small>${result.stories.length} ${result.stories.length===1?'story':'stories'} · ${result.placed.length} packages</small></button>`+result.stories.map(story=>`<button class="story-button ${selectedStory===story.id?'active':''}" data-story="${story.id}" aria-pressed="${selectedStory===story.id}"><strong>${story.name} <b>${Math.round(story.fill*100)}%</b></strong><small>${story.count} packages · ${story.id===1?'floor':'support'} coverage</small><i style="width:${Math.min(100,story.fill*100)}%"></i></button>`).join('');
}
$('#stories').onclick=e=>{const b=e.target.closest('[data-story]');if(!b)return;selectedStory=b.dataset.story==='all'?null:+b.dataset.story;renderStories();draw()};
function selectRow(id){if(playing)stopPlay(true);selectedRow=id;selectedPackage=null;inspectorMode='row';const row=result.rows.find(r=>r.id===id);if(row){selectedStory=null;renderStories();focusPackages(row.items,'row')}else resetCamera();renderRows();draw()}
function selectPackage(number,fromScene=false){const item=result.placed.find(b=>b.number===number);if(!item)return;if(playing)stopPlay(true);selectedPackage=item.number;selectedRow=item.row;focusPackages([item]);if(fromScene)inspectorMode='item';if(selectedStory!==null&&item.story>selectedStory){selectedStory=item.story;renderStories()}renderRows();draw()}
$('#rowList').onclick=e=>{const b=e.target.closest('[data-row]');if(b)selectRow(+b.dataset.row)};
$('#allRows').onclick=()=>{selectedStory=null;renderStories();selectRow(null)};
$('#rowItems').onclick=e=>{const row=e.target.closest('[data-inspect-row]');if(row)return selectRow(+row.dataset.inspectRow);const item=e.target.closest('[data-package]');if(item)selectPackage(+item.dataset.package,!!$('#packageSearch').value.trim())};
$('#packageSearch').oninput=()=>renderRows();
$('#clearPackageSearch').onclick=()=>{$('#packageSearch').value='';renderRows();$('#packageSearch').focus()};
$('#packageSearch').onkeydown=e=>{
 if(e.key==='Escape'){e.preventDefault();$('#clearPackageSearch').onclick()}
 if(e.key==='Enter'){e.preventDefault();const first=matchingPackages($('#packageSearch').value)[0];if(first&&$('#packageSearch').value.trim())selectPackage(first.number,true)}
};
$('#loadFreightExample').onclick=async()=>{
 const button=$('#loadFreightExample');button.disabled=true;
 try{
  const response=await fetch('industrial-76-plan.json');if(!response.ok)throw Error('Example unavailable');const example=await response.json();
  types=example.types.map(t=>({...t}));container=[...example.container];nextId=Math.max(...types.map(t=>t.id))+1;
  $('#preset').value=example.preset;$('#rotation').checked=example.rotation;$('#stack').checked=example.stack;$('#gap').value=example.gap;$('#packageSearch').value='';
  ['cl','cw','ch'].forEach((id,i)=>$('#'+id).value=container[i]);updateContainerTitle();renderTypes();repack();$('#save').onclick(example.name);toast('Industrial freight plan loaded · 76%');
 }catch{toast('Could not load the freight plan. Please try again.')}
 finally{button.disabled=false}
};
$('#optimize').onclick=()=>{repack();toast(result.rows.length+' rows built · '+result.placed.length+' pallets fitted')};
function stopPlay(keepPosition=false){clearInterval(playTimer);pausedSequence=keepPosition;playing=false;$('#play').innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5 13 8l-9 5.5Z"/></svg>';$('#play').setAttribute('aria-label','Play loading sequence')}
function advancePackage(delta){
 if(!result.placed.length)return;
 if(!sequenceStarted){shown=0;sequenceStarted=true}
 shown=Math.max(0,Math.min(result.placed.length,shown+delta));
 const item=result.placed[delta>0?Math.max(0,shown-1):Math.min(result.placed.length-1,shown)];
 selectedPackage=item.number;selectedRow=item.row;inspectorMode='row';selectedStory=null;if(cameraFocus)focusLoading(item);renderStories();renderRows();draw();
}
$('#nextStep').onclick=()=>{stopPlay();advancePackage(1)};
$('#prevStep').onclick=()=>{stopPlay();advancePackage(-1)};
$('#play').onclick=()=>{
 if(playing)return stopPlay(true);
 if(!result.placed.length)return toast('Add pallets that fit the truck bed.');
 if(!pausedSequence||shown>=result.placed.length){shown=0;selectedRow=1;selectedPackage=1;resetCamera()}
 sequenceStarted=true;pausedSequence=false;selectedStory=null;renderStories();playing=true;$('#play').innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h3v12H3Zm7 0h3v12h-3Z"/></svg>';$('#play').setAttribute('aria-label','Pause loading sequence');renderRows();draw();
 playTimer=setInterval(()=>{advancePackage(1);if(shown===result.placed.length)stopPlay()},850);
};
$('#timeline').oninput=()=>{stopPlay();sequenceStarted=true;selectedStory=null;renderStories();shown=Math.max(0,Math.min(result.placed.length,+$('#timeline').value));const item=result.placed[Math.max(0,shown-1)];selectedPackage=item?.number||null;selectedRow=item?.row||null;if(cameraFocus&&item)focusLoading(item);renderRows();draw()};
$('#resetSequence').onclick=()=>{stopPlay();sequenceStarted=true;selectedStory=null;renderStories();shown=0;selectedRow=null;selectedPackage=null;resetCamera();renderRows();draw()};
function setLegendHidden(hidden){
 $('#legendPanel').hidden=hidden;$('#hideLegend').checked=hidden;
 try{localStorage.setItem('voltra-hide-legend',hidden?'1':'0')}catch{}
}
$('#hideLegend').onchange=()=>setLegendHidden($('#hideLegend').checked);
try{const hidden=localStorage.getItem('voltra-hide-legend')==='1';$('#hideLegend').checked=hidden;$('#legendPanel').hidden=hidden}catch{}
$('#showUpcoming').onchange=()=>draw();
// Orthographic 3D renderer. All scene coordinates use physical centimeters.
const canvas=$('#scene'),ctx=canvas.getContext('2d');
const depthRenderer=typeof createDepthRenderer==='function'?createDepthRenderer():null;
const selectionMask=document.createElement('canvas'),selectionHalo=document.createElement('canvas'),maskCtx=selectionMask.getContext('2d'),haloCtx=selectionHalo.getContext('2d');
let width=0,height=0,scale=1,drag=null,hitFaces=[],cameraFocus=null,cameraTarget={x:(container[0]-165)/2,y:container[1]/2,z:Math.max(container[2],185)*.30};
const ZOOM_MIN=.02,ZOOM_MAX=12;
function setZoom(value){zoom=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,value))}
function panCamera(dx,dy,start){
 const c=Math.cos(yaw),s=Math.sin(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch),u=dx/scale,v=dy/scale;
 cameraTarget={x:start.x-u*c-v*s*sp,y:start.y+u*s-v*c*sp,z:start.z+v*cp};
}
function resetCamera(){stopOrbit();cameraFocus=null;cameraTarget={x:(container[0]-165)/2,y:container[1]/2,z:Math.max(container[2],185)*.30};zoom=1}
function overviewBounds(){const [L,W,H]=container;return {minX:-195,maxX:L+50,minY:-45,maxY:W+45,minZ:-85,maxZ:Math.max(H+15,190)}}
function focusPackages(items,mode='item'){
 stopOrbit();
 if(!items.length)return resetCamera();
 cameraFocus={minX:Math.min(...items.map(b=>b.x)),maxX:Math.max(...items.map(b=>b.x+b.l)),minY:Math.min(...items.map(b=>b.y)),maxY:Math.max(...items.map(b=>b.y+b.w)),minZ:Math.min(...items.map(b=>b.z)),maxZ:Math.max(...items.map(b=>b.z+b.h))};
 cameraFocus.mode=mode;
 if(mode==='row'){const center=(cameraFocus.minX+cameraFocus.maxX)/2;cameraFocus={...cameraFocus,minX:center-container[0]*.35,maxX:center+container[0]*.35,minY:-30,maxY:container[1]+30,minZ:-75,maxZ:Math.max(container[2]+15,190)}}
 if(mode==='loading')cameraFocus={...overviewBounds(),mode};
 cameraTarget={x:(cameraFocus.minX+cameraFocus.maxX)/2,y:(cameraFocus.minY+cameraFocus.maxY)/2,z:(cameraFocus.minZ+cameraFocus.maxZ)/2};zoom=1;
}
function focusLoading(item){
 if(cameraFocus?.mode==='loading')return;
 focusPackages([item],'loading');
 cameraTarget={x:(container[0]-165)/2,y:container[1]/2,z:Math.max(container[2],185)*.30};
}
function selectionNumbers(){
 if(selectedPackage!==null)return [selectedPackage];
 if(selectedRow!==null)return result.rows.find(r=>r.id===selectedRow)?.items.map(b=>b.number)||[];
 return [];
}
function meshOutline(faces,numbers){
 if(!numbers.length)return;
 const chosen=new Set(numbers),dpr=Math.min(devicePixelRatio,2);
 for(const layer of [selectionMask,selectionHalo])if(layer.width!==canvas.width||layer.height!==canvas.height){layer.width=canvas.width;layer.height=canvas.height}
 maskCtx.setTransform(1,0,0,1,0,0);maskCtx.clearRect(0,0,selectionMask.width,selectionMask.height);maskCtx.setTransform(dpr,0,0,dpr,0,0);
 if(depthRenderer){
  const visible=faces.filter(f=>!f.wireframe&&!(f.cargo&&selectedStory!==null&&f.b.story>selectedStory));
  const maskFaces=visible.map(f=>({...f,color:f.cargo&&chosen.has(f.b.number)?'#ffffff':'#000000'}));
  maskCtx.drawImage(depthRenderer.render(maskFaces,project,width,height,dpr,()=>1,true),0,0,width,height);
  const pixels=maskCtx.getImageData(0,0,selectionMask.width,selectionMask.height);
  for(let i=0;i<pixels.data.length;i+=4){pixels.data[i+3]=pixels.data[i];pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255}
  maskCtx.putImageData(pixels,0,0);
 }else{
  for(const f of faces){
   if(f.wireframe||f.cargo&&selectedStory!==null&&f.b.story>selectedStory)continue;
   maskCtx.globalCompositeOperation=f.cargo&&chosen.has(f.b.number)?'source-over':'destination-out';maskCtx.fillStyle='#fff';maskCtx.beginPath();
   f.points.forEach((point,i)=>{const p=project(...point);i?maskCtx.lineTo(p.x,p.y):maskCtx.moveTo(p.x,p.y)});maskCtx.closePath();maskCtx.fill();
  }
 }

 haloCtx.setTransform(1,0,0,1,0,0);haloCtx.clearRect(0,0,selectionHalo.width,selectionHalo.height);haloCtx.globalCompositeOperation='source-over';
 const edge=1.6*dpr;
 for(const [x,y] of [[-edge,0],[edge,0],[0,-edge],[0,edge],[-edge*.7,-edge*.7],[edge*.7,-edge*.7],[-edge*.7,edge*.7],[edge*.7,edge*.7]])haloCtx.drawImage(selectionMask,x,y);
 haloCtx.globalCompositeOperation='source-in';haloCtx.fillStyle=selectedPackage!==null?'#81d4ff':'#bdaaff';haloCtx.fillRect(0,0,selectionHalo.width,selectionHalo.height);
 haloCtx.globalCompositeOperation='destination-out';haloCtx.drawImage(selectionMask,0,0);haloCtx.globalCompositeOperation='source-over';
 ctx.drawImage(selectionHalo,0,0,width,height);
}

function project(x,y,z){x-=cameraTarget.x;y-=cameraTarget.y;z-=cameraTarget.z;let c=Math.cos(yaw),s=Math.sin(yaw),a=x*c-y*s,b=x*s+y*c;return {x:width*.5+a*scale,y:height*.5+(b*Math.sin(pitch)-z*Math.cos(pitch))*scale,d:b*Math.cos(pitch)+z*Math.sin(pitch)}}
function path(points,fill,stroke,lineWidth=1,dash=[]){ctx.beginPath();points.forEach((p,i)=>{p=project(...p);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([])}}
function tint(hex,f){let v=parseInt(hex.slice(1),16);return `rgb(${Math.min(255,Math.round((v>>16)*f))},${Math.min(255,Math.round(((v>>8)&255)*f))},${Math.min(255,Math.round((v&255)*f))})`}
function face(points,color,extra={}){return {points,color,depth:points.reduce((a,p)=>a+project(...p).d,0)/points.length,...extra}}
function boxFaces(b,extra={}){let {x,y,z,l,w,h}=b;const v=[[x,y,z],[x+l,y,z],[x+l,y+w,z],[x,y+w,z],[x,y,z+h],[x+l,y,z+h],[x+l,y+w,z+h],[x,y+w,z+h]];return [{ids:[0,3,2,1],f:.52},{ids:[4,5,6,7],f:1.03,top:true},{ids:[0,1,5,4],f:.67},{ids:[1,2,6,5],f:.80},{ids:[2,3,7,6],f:.60},{ids:[3,0,4,7],f:.85}].map(f=>face(f.ids.map(i=>v[i]),tint(b.color,f.f),{...extra,top:f.top,b:extra.package||b}))}
function palletFaces(b){
 if(b.pallet==='none')return boxFaces(b,{cargo:true,package:b,palletPart:'load'});
 const format=PalletStandards.get(b);
 const faces=[],pH=format?format.base:Math.min(14.4,b.h*.25),ul=b.rotated?b.w:b.l,vw=b.rotated?b.l:b.w;
 const point=(u,v,z)=>b.rotated?[b.x+v,b.y+ul-u,z]:[b.x+u,b.y+v,z];
 const part=(u,v,z,l,w,h,color,kind='wood')=>{
  const shape=b.rotated?{x:b.x+v,y:b.y+ul-u-l,z,l:w,w:l,h,color}:{x:b.x+u,y:b.y+v,z,l,w,h,color};
  faces.push(...boxFaces(shape,{cargo:true,package:b,palletPart:kind}));
 };
 
 if(format?.material==='plastic'){
  part(0,0,b.z+pH*.76,ul,vw,pH*.24,'#315c99','plastic');
  for(const u of [0,ul*.44,ul*.88])for(const v of [0,vw*.82])part(u,v,b.z,ul*.12,vw*.18,pH*.76,'#244678','plastic');
 }else{
  const runner=vw*.16,blockL=ul*.13,blockW=vw*.18;
  for(const v of [0,(vw-runner)/2,vw-runner])part(0,v,b.z,ul,runner,pH*.14,'#a98250');
  for(const u of [0,(ul-blockL)/2,ul-blockL])for(const v of [0,(vw-blockW)/2,vw-blockW])part(u,v,b.z+pH*.14,blockL,blockW,pH*.54,'#b28b56');
  for(const u of [0,(ul-blockL)/2,ul-blockL])part(u,0,b.z+pH*.68,blockL,vw,pH*.16,'#d0af77');
  const boards=format?.key==='epal6'?7:5,plank=vw*(boards===7?.11:.155);for(let i=0;i<boards;i++)part(0,i*(vw-plank)/(boards-1),b.z+pH*.84,ul,plank,pH*.16,i%2?'#d7b881':'#c9a66f');
 }
 const inset=Math.min(1.2,Math.min(ul,vw)*.015),bodyH=b.h-pH;
 part(inset,inset,b.z+pH,ul-2*inset,vw-2*inset,bodyH,b.color,'load');
 // Two restraint bands wrap the load. Wooden feet and fork openings remain open.
 const strap=Math.max(.35,Math.min(2,ul*.025)),top=b.z+b.h;
 for(const center of [ul*.28,ul*.72]){
  const u=center-strap/2;
  faces.push(face([point(u,inset,top),point(u+strap,inset,top),point(u+strap,vw-inset,top),point(u,vw-inset,top)],'#46506d',{cargo:true,package:b,b,palletPart:'strap'}));
  for(const v of [inset,vw-inset])faces.push(face([point(u,v,b.z+pH),point(u+strap,v,b.z+pH),point(u+strap,v,top),point(u,v,top)],'#334361',{cargo:true,package:b,b,palletPart:'strap'}));
 }
 return faces;
}
function insidePolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside}
function faceDepthAt(points,x,y){
 for(let i=1;i<points.length-1;i++){
  const [a,b,c]=[points[0],points[i],points[i+1]],den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-9)continue;
  const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/den,v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/den,w=1-u-v;
  if(u>=-1e-7&&v>=-1e-7&&w>=-1e-7)return u*a.d+v*b.d+w*c.d;
 }return -Infinity;
}
function pickPackage(x,y){let nearest=-Infinity,number=null,ghostDepth=-Infinity,ghostNumber=null;for(const f of hitFaces){const d=faceDepthAt(f.points,x,y);if(f.wireframe){if(d>ghostDepth){ghostDepth=d;ghostNumber=f.number}}else if(d>nearest){nearest=d;number=f.number}}return nearest>-Infinity?number:ghostNumber}

function truckFaces(){
 const [L,W,H]=container,faces=[],C=Math.max(155,Math.min(190,H*.8)),belt=C*.36,bv=Math.min(16,W*.075);
 const add=(points,color,part)=>faces.push(face(points,color,{truck:true,truckPart:part}));
 const glazing=(points,color,anchor,bias)=>{const f=face(points,color,{truck:true,truckPart:'glass'});f.depth=anchor.reduce((sum,p)=>sum+project(...p).d,0)/anchor.length+bias;faces.push(f)};
 const box=(x,y,z,l,w,h,color,part)=>faces.push(...boxFaces({x,y,z,l,w,h,color},{truck:true,truckPart:part}));
 const outline=(front,rear,inset,bevel)=>[[front,inset+bevel],[front+bevel,inset],[rear-bevel,inset],[rear,inset+bevel],[rear,W-inset-bevel],[rear-bevel,W-inset],[front+bevel,W-inset],[front,W-inset-bevel]];
 const prism=(bottom,top,z0,z1,color,part)=>{
  for(let i=0;i<bottom.length;i++){const j=(i+1)%bottom.length;add([[...bottom[i],z0],[...bottom[j],z0],[...top[j],z1],[...top[i],z1]],tint(color,[.69,.91,.75,.64,.77,.95,.82,.72][i]),part)}
  add(top.map(p=>[...p,z1]),tint(color,1.13),part);
 };
 // Chamfered cab with a backward-sloping windshield and an aero roof cap.
 const lower=outline(-182,-26,6,bv),roof=outline(-153,-29,13,Math.max(3,bv*.7));
 prism(lower,lower,-22,belt,'#7486c6','cab');prism(lower,roof,belt,C-8,'#5c70b1','cab');
 prism(roof,outline(-148,-32,15,Math.max(3,bv*.6)),C-8,C,'#8a9bd7','cab');
 // A raised aerodynamic fairing keeps the cab silhouette distinct from the load.
 const fy=22,ry=30;
 add([[-136,fy,C],[-136,W-fy,C],[-45,W-ry,C+18],[-45,ry,C+18]],'#8598d4','fairing');
 add([[-136,fy,C],[-45,ry,C+18],[-32,ry,C],[-136,fy,C-2]],'#51659d','fairing');
 add([[-136,W-fy,C],[-136,W-fy,C-2],[-32,W-ry,C],[-45,W-ry,C+18]],'#677eb9','fairing');
 add([[-45,ry,C+18],[-45,W-ry,C+18],[-32,W-ry,C],[-32,ry,C]],'#3d507f','fairing');
 for(let i=0;i<5;i++)box(-151,32+i*(W-70)/4,C,4,6,2,'#f3c48b','marker');
 const glassY=Math.max(8,W*.115),glassTopY=Math.max(16,W*.14),zLow=belt+3,zHigh=C-25;
 const frontPanel=[[...lower[7],belt],[...lower[0],belt],[...roof[0],C-8],[...roof[7],C-8]];
 {
  glazing([[-183,glassY,zLow],[-183,W-glassY,zLow],[-158,W-glassTopY,zHigh],[-158,glassTopY,zHigh]],'#14283f',frontPanel,.02);
  glazing([[-183.2,glassY+4,zLow+4],[-183.2,W*.48,zLow+4],[-158.2,W*.68,zHigh-3],[-158.2,glassTopY+4,zHigh-3]],'#2a4c6b',frontPanel,.04);
  glazing([[-183.3,W*.18,zLow+5],[-183.3,W*.22,zLow+5],[-158.3,W*.43,zHigh-4],[-158.3,W*.39,zHigh-4]],'#628eb1',frontPanel,.06);
 }
 // Two windshield wipers follow the sloping glass rather than floating in front.
 for(const t of [.25,.65]){
  const y=W*t;
  add([[-183.7,y,zLow+5],[-183.7,y+2,zLow+5],[-178.7,y+W*.14+2,zLow+25],[-178.7,y+W*.14,zLow+25]],'#101b2d','wiper');
  add([[-180,y+W*.04,zLow+20],[-180,y+W*.04+1.5,zLow+20],[-174,y+W*.21,zLow+43],[-174,y+W*.21-1.5,zLow+43]],'#152039','wiper');
 }
 for(const side of [0,1]){
  const y=side?W-5:5,yr=side?W-11:11;
  {
   const index=side?5:1,sidePanel=[[...lower[index],belt],[...lower[index+1],belt],[...roof[index+1],C-8],[...roof[index],C-8]];
   glazing([[-164,y,zLow],[-43,y,zLow],[-43,yr,zHigh],[-145,yr,zHigh]],side?'#1d3350':'#244766',sidePanel,.02);
   glazing([[-156,y,zLow+5],[-118,y,zLow+5],[-97,yr,zHigh-4],[-141,yr,zHigh-4]],'#497196',sidePanel,.04);
  }
  // Sculpted lower door panels, handles and nonslip entry steps.
  box(-137,side?W-1:0,4,86,2,5,'#859adb','trim');
  for(let x=-88;x<-58;x+=7)box(x,side?W: -1,13,2,2,17,'#33466d','vent');
  box(-48,side?W-5:3,7,2,3,belt-10,'#304268','cab');
  box(-77,side?W-3:-1,belt-16,23,5,4,'#b0bedc','trim');
  box(-98,side?W-3:-11,-29,56,14,5,'#607797','trim');
  box(-92,side?W-4:-10,-34,44,13,3,'#243452','trim');
  box(-162,side?W-5:-15,belt+8,8,20,5,'#526992','mirror');
  box(-165,side?W+8:-22,belt-3,13,9,32,'#1b2944','mirror');
  box(-165,side?W+17:-23,belt+1,10,1,24,'#5883a7','glass');
  box(-153,side?W-3:-1,28,105,4,3,'#6c91e6','light');
 }
 // Integrated black fascia, layered grille and cool white LED signature.
 prism(outline(-187,-27,8,bv),outline(-187,-27,8,bv),-23,18,'#283a64','bumper');
 box(-188,W*.32,-7,3,W*.36,23,'#0b152c','grille');
 for(let z=-3;z<15;z+=6)box(-190,W*.34,z,2,W*.32,1.7,'#6e81a5','grille');
 for(const y of [W*.11,W*.67]){
  box(-188.5,y-3,17,3,W*.22+6,15,'#121e35','headlamp');
  box(-189,y,20,3,W*.22,7,'#99dcff','light');
  box(-190,y+W*.025,27,2,W*.17,1.8,'#e3f3ff','light');
 }
 box(-190,W*.13,14,2,W*.74,1.7,'#a69afb','light');
 // Geometric VOLTRA emblem above the grille.
 add([[-183,W*.46,40],[-183,W*.5,30],[-183,W*.54,40],[-183,W*.527,40],[-183,W*.5,34],[-183,W*.473,40]],'#b4caff','trim');
 // Graphite chassis, metallic load deck and restrained blue/violet side lighting.
 box(-146,20,-48,L+162,Math.max(10,W-40),21,'#25324b','chassis');
 box(-7,-7,-13,L+15,W+14,13,'#5c7195','deck');
 box(0,0,-1,L,W,1,'#62718e','deck');
 for(const y of [-9,W+2]){
  box(0,y,-27,L,7,13,'#314568','deck');
  box(5,y-1,-16,Math.max(1,L-10),9,2.3,y<0?'#8e83e9':'#72b8ee','light');
  for(let x=32;x<L;x+=85)box(x,y-1,-23,18,9,4,'#d8c398','reflector');
 }
 if(L>270)for(const y of [-10,W+3]){
  box(70,y,-47,L-195,7,12,'#314464','chassis');
  box(74,y-1,-43,L-203,9,2,'#6c7ea9','trim');
  for(const x of [90,L-145])box(x,y,-44,5,7,22,'#435b7c','chassis');
 }
 box(L+1,-7,-30,9,W+14,17,'#3d5076','bumper');
 for(const y of [W*.07,W*.78])box(L+11,y,-26,2,W*.15,7,'#ec7597','light');
 // Practical equipment, reflective rear bumper, and open cargo-frame corners.
 if(L>350){
  const x=104,y=W-11,z=-47,r=17,n=16,len=96;
  const ring=x=>Array.from({length:n},(_,i)=>[x,y+Math.cos(i/n*Math.PI*2)*r,z+Math.sin(i/n*Math.PI*2)*r]);
  const a=ring(x),b=ring(x+len);
  for(let i=0;i<n;i++)add([a[i],b[i],b[(i+1)%n],a[(i+1)%n]],tint('#8293af',.70+.20*Math.sin(i/n*Math.PI*2)),'tank');
  add(a,'#586b89','tank');add(b,'#657b98','tank');
  for(const tx of [x+20,x+len-24])box(tx,W+4,-61,4,3,29,'#273954','tank');
  box(x+44,W+6,-42,12,3,5,'#b0bfce','tank');
  box(110,-6,-60,98,27,27,'#3d5277','storage');box(115,-8,-56,88,2,19,'#536c92','storage');box(150,-10,-49,17,3,4,'#a3b3cd','storage');
 }
 for(const x of [-4,L+1])for(const y of [-4,W+1])box(x,y,-4,3,3,H+7,'#556a91','frame');
 for(const y of [-4,W+1])box(-4,y,H+1,L+8,3,3,'#7485aa','frame');
 box(L+12,W*.39,-28,1,W*.22,8,'#19283e','plate');box(L+13,W*.41,-26,1,W*.18,4,'#b7c7dc','plate');
 for(const y of [W*.025,W*.91])box(L+11,y,-12,2,W*.065,3,'#f5c687','marker');
 // Faceted rubber tires, metal rim rings and six-spoke alloy hubs.
 const axles=L>850?[-112,L*.34,L-112,L-48]:L>380?[-112,L-112,L-48]:[-112,L*.68];
 for(const x of axles)for(const side of [-1,1]){
  const y1=side<0?-20:W-2,y2=y1+22,z=-45,r=31,n=24;
  const ring=(y,radius)=>Array.from({length:n},(_,i)=>[x+Math.cos(i/n*Math.PI*2)*radius,y,z+Math.sin(i/n*Math.PI*2)*radius]);
  const a=ring(y1,r),b=ring(y2,r);
  for(let i=0;i<n;i++)add([a[i],a[(i+1)%n],b[(i+1)%n],b[i]],i%2?'#111a2b':'#1b273b','tire');
  for(const y of [y1-.2,y2+.2]){
   add(ring(y,r),'#0a1222','tire');add(ring(y+side*.3,20),'#8397b7','rim');add(ring(y+side*.5,16),'#23314d','rim');
   for(let i=0;i<6;i++){
    const angle=i*Math.PI/3,point=(radius,delta)=>[x+Math.cos(angle+delta)*radius,y+side*.7,z+Math.sin(angle+delta)*radius];
    add([point(7,-.14),point(18,-.10),point(18,.10),point(7,.14)],'#b0c0da','rim');
   }
   add(ring(y+side*.9,7),'#6679bb','rim');add(ring(y+side*1.1,3),'#9abaff','rim');
  }
  // Separate convex arch panels keep the fenders correct at every orbit angle.
  const yf=side<0?-22:W+22;
  for(let i=0;i<12;i++){
   const a=Math.PI*i/12,b=Math.PI*(i+1)/12,p=(t,r)=>[x+Math.cos(t)*r,yf,z+Math.sin(t)*r];
   add([p(a,38),p(b,38),p(b,33),p(a,33)],i<6?'#50638b':'#354969','fender');
  }
  box(x+31,side<0?-21:W+5,-70,3,17,21,'#162439','mudflap');

 }
 return faces;
}
function dimension(a,b,label,offset){let pa=project(...a),pb=project(...b);ctx.strokeStyle='#5c6d9b';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();for(let p of [pa,pb]){ctx.beginPath();ctx.moveTo(p.x-3,p.y-4);ctx.lineTo(p.x+3,p.y+4);ctx.stroke()}ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle='#a0b8e4';ctx.textAlign='center';ctx.fillText(label,(pa.x+pb.x)/2,(pa.y+pb.y)/2+(offset||-9))}
function sceneWireframe(f){
 if(!f.cargo)return false;
 return selectedPackage!==null?f.b.number!==selectedPackage:selectedRow!==null&&f.b.row!==selectedRow;
}
function sceneOpacity(f,selected=false){
 if(!f.cargo)return 1;
 if(selectedPackage!==null||selectedRow!==null)return sceneWireframe(f)?.24:1;
 if(xray)return .2;
 return sequenceStarted&&f.b.number>shown&&!selected?.14:1;
}
function draw(){
 if(!width)return;ctx.clearRect(0,0,width,height);hitFaces=[];
 const [L,W,H]=container;scale=1;
 const fitFrame=(frame,focused)=>{
  const bounds=[];for(const x of [frame.minX,frame.maxX])for(const y of [frame.minY,frame.maxY])for(const z of [frame.minZ,frame.maxZ])bounds.push(project(x,y,z));
  const bx=Math.max(1,Math.max(...bounds.map(p=>p.x))-Math.min(...bounds.map(p=>p.x))),by=Math.max(1,Math.max(...bounds.map(p=>p.y))-Math.min(...bounds.map(p=>p.y)));
  return Math.min(Math.max(80,width-(focused?64:95))/bx,Math.max(80,height-(focused?70:115))/by)*(focused?.88:.94);
 };
 const fullScale=fitFrame(overviewBounds(),false),focusedScale=cameraFocus?fitFrame(cameraFocus,true):fullScale;
 scale=(cameraFocus?.mode==='loading'?fullScale:cameraFocus?.mode==='row'?Math.min(focusedScale,fullScale*1.2):focusedScale)*zoom;
 ctx.globalAlpha=cameraFocus?.1:.27;for(let x=-250;x<L+150;x+=60)path([[x,-130,-79],[x,W+130,-79]],null,'#405584',.6);for(let y=-130;y<W+130;y+=60)path([[-250,y,-79],[L+150,y,-79]],null,'#405584',.6);ctx.globalAlpha=1;
 if(!cameraFocus){const shadow=[];for(let i=0;i<=12;i++){const t=-Math.PI/2+i*Math.PI/12;shadow.push([L-25+Math.cos(t)*(W*.52),W/2+Math.sin(t)*(W*.62),-78])}for(let i=0;i<=12;i++){const t=Math.PI/2+i*Math.PI/12;shadow.push([-125+Math.cos(t)*(W*.52),W/2+Math.sin(t)*(W*.62),-78])}path(shadow,'#04091b66',null)}
 // An open cargo body leaves row placement visible from every angle.
 let edges=[[[0,0,0],[0,0,H]],[[L,0,0],[L,0,H]],[[L,W,0],[L,W,H]],[[0,W,0],[0,W,H]],[[0,0,H],[L,0,H],[L,W,H],[0,W,H],[0,0,H]]];
 if(!cameraFocus)for(const e of edges)path(e,null,'#7184b8',.8,[4,4]);
 let visible=$('#showUpcoming').checked?result.placed:result.placed.slice(0,shown);
 if(cameraFocus&&visible.length<result.placed.length){
  // Inspection may reveal an upcoming pallet without marking it loaded. Include
  // its supporting chain as context, with the outline still limited to selection.
  const reveal=new Set(visible.map(b=>b.number)),pending=selectionNumbers().slice();
  while(pending.length){const number=pending.pop();if(reveal.has(number))continue;const b=result.placed[number-1];if(!b)continue;reveal.add(number);if(b.supportNumber)pending.push(b.supportNumber)}
  visible=result.placed.filter(b=>reveal.has(b.number));
 }
 const faces=truckFaces().concat(visible.flatMap(b=>sceneWireframe({cargo:true,b})?boxFaces(b,{cargo:true,package:b,palletPart:'ghost',wireframe:true}):palletFaces(b)));
 faces.sort((a,b)=>a.depth-b.depth);
 const highlighted=new Set(selectionNumbers());
 const rendered=faces.filter(f=>!(f.cargo&&selectedStory!==null&&f.b.story>selectedStory));
 hitFaces=rendered.map(f=>({points:f.points.map(p=>project(...p)),number:f.cargo?f.b.number:null,wireframe:!!f.wireframe}));
 if(depthRenderer)ctx.drawImage(depthRenderer.render(rendered,project,width,height,Math.min(devicePixelRatio,2),f=>sceneOpacity(f,f.cargo&&highlighted.has(f.b.number))),0,0,width,height);
 for(const f of faces){
  if(f.cargo&&selectedStory!==null&&f.b.story>selectedStory)continue;
  const selected=f.cargo&&highlighted.has(f.b.number)&&(selectedPackage!==null||selectedRow!==null),dimmed=f.cargo&&(selectedPackage!==null?f.b.number!==selectedPackage:selectedRow!==null&&f.b.row!==selectedRow),storyMuted=f.cargo&&selectedStory!==null&&f.b.story<selectedStory,upcoming=f.cargo&&sequenceStarted&&f.b.number>shown;
  if(!depthRenderer){ctx.globalAlpha=sceneOpacity(f,selected);path(f.points,f.color,f.wireframe?null:f.cargo?'#303b5e':'#16213a',f.cargo?Math.min(.5,Math.max(.15,scale*.18)):.7);if(f.wireframe){ctx.globalAlpha=.62;path(f.points,null,f.color,.8)}ctx.globalAlpha=1;}

  if(f.top&&f.palletPart==='load'&&scale*f.b.l>22&&scale*f.b.w>12&&!xray&&!dimmed&&!storyMuted&&(!upcoming||selected)){
   const p=project(f.b.x+f.b.l/2,f.b.y+f.b.w/2,f.b.z+f.b.h);if(pickPackage(p.x,p.y)!==f.b.number)continue;ctx.fillStyle=selected?(selectedPackage!==null?'#edf4ff':'#bdaaff'):'#19213f';ctx.font='bold 10px "Space Grotesk",sans-serif';ctx.textAlign='center';ctx.fillText(pad(f.b.number),p.x,p.y+3);
  }
 }
 // Row guides are neutral annotations, never part of a selection highlight.
 if(!cameraFocus)for(const r of result.rows){
  path([[r.x,0,.4],[r.x,W,.4]],null,'#8b9bc044',.7,[5,4]);
  const p=project(r.x+r.depth/2,W+20,-8);ctx.fillStyle='#8ba1cd';ctx.font='10px "Space Grotesk",sans-serif';ctx.textAlign='center';ctx.fillText('R'+r.id,p.x,p.y);
 }
 meshOutline(faces,[...highlighted]);
 if(!cameraFocus){
 for(const e of edges)path(e,null,'#8d9ed355',.8,[3,6]);
 dimension([0,W+52,-25],[L,W+52,-25],(L/100).toFixed(2)+' m cargo bed',19);
 const front=project(-95,W+25,-12),rear=project(L+25,W/2,0);ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle='#a5bce7';ctx.textAlign='center';ctx.fillText('CAB / FRONT',front.x,front.y);ctx.fillText('REAR DOORS',rear.x,rear.y+17);
 }
}
new ResizeObserver(()=>{let r=canvas.getBoundingClientRect();width=r.width;height=r.height;let d=Math.min(devicePixelRatio,2);canvas.width=width*d;canvas.height=height*d;ctx.setTransform(d,0,0,d,0,0);draw()}).observe(canvas.parentElement);
// Damped, frame-timed orbiting keeps pointer events from snapping the camera.
let orbitYaw=yaw,orbitPitch=pitch,orbitFrame=null,orbitLastTime=null,orbitActive=false;
function stopOrbit(){if(orbitFrame!==null)cancelAnimationFrame(orbitFrame);orbitFrame=null;orbitLastTime=null;orbitActive=false;orbitYaw=yaw;orbitPitch=pitch}
function animateOrbit(time){
 orbitFrame=null;
 const elapsed=orbitLastTime===null?16:Math.min(50,Math.max(1,time-orbitLastTime));orbitLastTime=time;
 const blend=1-Math.exp(-elapsed/105);
 yaw+=(orbitYaw-yaw)*blend;pitch+=(orbitPitch-pitch)*blend;
 const settled=Math.abs(orbitYaw-yaw)+Math.abs(orbitPitch-pitch)<.00015;
 if(settled){yaw=orbitYaw;pitch=orbitPitch;orbitActive=false;orbitLastTime=null}
 draw();
 if(!settled)orbitFrame=requestAnimationFrame(animateOrbit);
}
function orbitTo(nextYaw,nextPitch){orbitYaw=nextYaw;orbitPitch=Math.max(.02,Math.min(1.55,nextPitch));orbitActive=true;if(orbitFrame===null)orbitFrame=requestAnimationFrame(animateOrbit)}
function setView(v){stopOrbit();view=v;if(v==='top'){yaw=0;pitch=Math.PI/2-.001}else if(v==='rear'){yaw=Math.PI/2;pitch=.02}else{yaw=-.65;pitch=.46}orbitYaw=yaw;orbitPitch=pitch;$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));draw()}
$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
canvas.onpointerdown=e=>{stopOrbit();drag={x:e.clientX,y:e.clientY,yaw,pitch,moved:false,pan:!!e.shiftKey,target:{...cameraTarget}};canvas.setPointerCapture(e.pointerId)};
canvas.onpointermove=e=>{
 if(!drag){const r=canvas.getBoundingClientRect();canvas.style.cursor=pickPackage(e.clientX-r.left,e.clientY-r.top)?'pointer':'grab';return}
 if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;
 if(!drag.moved)return;
 if(drag.pan){panCamera(e.clientX-drag.x,e.clientY-drag.y,drag.target);draw();return}
 view='3d';$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 orbitTo(drag.yaw+(e.clientX-drag.x)*.003,drag.pitch+(e.clientY-drag.y)*.0025);
};
canvas.onpointerup=e=>{const click=drag&&!drag.moved;drag=null;if(click){const r=canvas.getBoundingClientRect(),number=pickPackage(e.clientX-r.left,e.clientY-r.top);if(number)selectPackage(number,true);else clearSelection()}};
canvas.onpointercancel=()=>drag=null;
canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*Math.exp(-e.deltaY*.001));draw()},{passive:false});canvas.onkeydown=e=>{if(e.key==='Escape'){selectRow(null);return}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')orbitTo(orbitYaw-.06,orbitPitch);if(e.key==='ArrowRight')orbitTo(orbitYaw+.06,orbitPitch);if(e.key==='ArrowUp')orbitTo(orbitYaw,orbitPitch+.06);if(e.key==='ArrowDown')orbitTo(orbitYaw,orbitPitch-.06);if(e.key==='+'||e.key==='=')setZoom(zoom*1.1);if(e.key==='-')setZoom(zoom/1.1);draw()}};$('#zoomIn').onclick=()=>{setZoom(zoom*1.15);draw()};$('#zoomOut').onclick=()=>{setZoom(zoom/1.15);draw()};$('#fit').onclick=resetViewport;$('#resetViewport').onclick=resetViewport;$('#wire').onclick=()=>{xray=!xray;$('#wire').classList.toggle('on',xray);draw()};
function download(name,data,type){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('#snapshot').onclick=()=>{canvas.toBlob(blob=>{if(blob)download('voltra-load-preview.png',blob,'image/png')});toast('3D preview exported')};
function plan(){return {version:7,loadingStep:'package',appearance:'wooden-pallet',loadingDirection:'front-to-rear',packingMode:'ground-first-stories',rowMode:'bands',stories:result.stories,rows:result.rows,name:'Load plan '+new Date().toLocaleDateString(),date:new Date().toISOString(),types,container,preset:$('#preset').value,rotation:$('#rotation').checked,stack:$('#stack').checked,gap:+$('#gap').value,placements:result.placed,unpacked:result.unplaced.length}}
$('#export').onclick=()=>{download('voltra-load-plan.json',JSON.stringify(plan(),null,2),'application/json');toast('Plan exported with dimensions and package positions')};
function getPlans(){try{return JSON.parse(localStorage.getItem('voltra-plans')||'[]')}catch{return []}}
function updateSaved(){const plans=getPlans();$('#savedCount').textContent=plans.length+(plans.some(p=>p.name==='Industrial replenishment · 76%')?0:1)}
$('#save').onclick=name=>{let plans=getPlans(),snapshot=plan();if(typeof name==='string'){snapshot.name=name;plans=plans.filter(p=>p.name!==name)}plans.unshift(snapshot);try{localStorage.setItem('voltra-plans',JSON.stringify(plans.slice(0,20)));updateSaved();toast('Plan saved')}catch{toast('Browser storage is full. Export your plan to keep it.')}};
$('#plansNav').onclick=()=>{let plans=getPlans();$('#plansList').innerHTML=`<div class="saved-plan featured-plan"><span>Industrial replenishment · 76%<small>15 types · 73 packages · 25.18 m³</small></span><button data-example="industrial-76">Open</button></div>`+(plans.length?plans.map((p,i)=>p.name==='Industrial replenishment · 76%'?'':`<div class="saved-plan"><span>${esc(p.name)}<small>${p.types.reduce((a,t)=>a+t.qty,0)} packages · ${(p.container.reduce((a,b)=>a*b,1)/1e6).toFixed(1)} m³ · ${new Date(p.date).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></span><button data-load="${i}">Open</button><button data-remove="${i}" aria-label="Delete saved plan">×</button></div>`).join(''):'');$('#plansDialog').showModal()};$('#plansList').onclick=e=>{if(e.target.dataset.example==='industrial-76'){$('#plansDialog').close();return $('#loadFreightExample').onclick()}if(e.target.dataset.load!==undefined){const p=getPlans()[+e.target.dataset.load];if(!p)return;types=p.types;container=p.container;nextId=Math.max(0,...types.map(t=>t.id))+1;$('#preset').value=p.preset;$('#rotation').checked=p.rotation;$('#stack').checked=p.stack;$('#gap').value=p.version>=3?Math.min(1,Math.max(0,p.gap||0)):0.2;['cl','cw','ch'].forEach((id,i)=>$('#'+id).value=container[i]);updateContainerTitle();renderTypes();repack();$('#plansDialog').close();toast('Saved plan restored')}if(e.target.dataset.remove!==undefined){let plans=getPlans();plans.splice(+e.target.dataset.remove,1);localStorage.setItem('voltra-plans',JSON.stringify(plans));updateSaved();$('#plansDialog').close();$('#plansNav').click()}};$('#closePlans').onclick=()=>$('#plansDialog').close();$('#workspaceNav').onclick=()=>{if($('#plansDialog').open)$('#plansDialog').close();window.scrollTo({top:0,behavior:'smooth'})};$('#info').onclick=()=>toast('Use Sync devices to connect your phone or computer.');renderTypes();updateSaved();repack();

// Blank page margins and viewport background both dismiss an inspection.
document.addEventListener('click',e=>{if(e.target===document.body||e.target===document.documentElement||e.target.matches?.('main,.workspace,.page-heading,.visual-panel,header'))clearSelection()});
