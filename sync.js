// One shared workspace document, protected by a random link capability.
(()=>{
 const storageKey='voltra-active-workspace',tokenKey='voltra-sync-token';
 let token='',etag='',dirty=false,busy=false,applying=false,timer,lastState='',connected=false;
 const read=key=>{try{return localStorage.getItem(key)}catch{return null}};
 const write=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
 function state(){return {types,container,preset:$('#preset').value,rotation:$('#rotation').checked,stack:$('#stack').checked,gap:+$('#gap').value,shown,sequenceStarted,showUpcoming:$('#showUpcoming').checked,saved:getPlans().map(({version,name,date,types,container,preset,rotation,stack,gap})=>({version,name,date,types,container,preset,rotation,stack,gap}))}}
 function persistPending(){write('voltra-sync-pending',dirty?JSON.stringify({token,etag}):'')}
 function status(text){$('#syncStatus').textContent=text}
 function apply(value){
  applying=true;
  try{
   types=value.types;container=value.container;nextId=Math.max(0,...types.map(t=>t.id))+1;
   $('#preset').value=value.preset||'custom';$('#rotation').checked=!!value.rotation;$('#stack').checked=!!value.stack;$('#gap').value=value.gap??.2;
   ['cl','cw','ch'].forEach((id,i)=>$('#'+id).value=container[i]);updateContainerTitle();renderTypes();repack();
   shown=Math.max(0,Math.min(result.placed.length,value.shown||0));sequenceStarted=!!value.sequenceStarted;$('#showUpcoming').checked=value.showUpcoming!==false;
   write('voltra-plans',JSON.stringify(value.saved||[]));updateSaved();renderRows();draw();
   lastState=JSON.stringify(state());write(storageKey,lastState);
  }finally{applying=false}
 }
 function valid(value){return value&&Array.isArray(value.types)&&value.types.length<=20&&Array.isArray(value.container)&&value.container.length===3&&value.container.every(Number.isFinite)}
 function changed(){
  if(applying)return;const serialized=JSON.stringify(state());if(serialized===lastState)return;
  lastState=serialized;write(storageKey,serialized);
  if(token){dirty=true;persistPending();status('Syncing…');clearTimeout(timer);timer=setTimeout(flush,400)}
 }
 function headers(extra={}){return {Authorization:'Bearer '+token,...extra}}
 async function pull(){
  if(!token||busy||dirty||document.hidden)return;busy=true;const activeToken=token;
  try{
   const response=await fetch(window.VOLTRA_SYNC_URL||'/api/workspace',{headers:headers(etag?{'If-None-Match':etag}:{}),cache:'no-store'});
   if(activeToken!==token)return;
   if(response.status===304){connected=true;status('Synced');return}
   if(!response.ok)throw Error(response.status===404?'Workspace not found':'Sync unavailable');
   const value=await response.json();if(!valid(value))throw Error('Invalid workspace');
   etag=response.headers.get('etag');connected=true;persistPending();
   // Preserve edits made while the network request was in flight.
   if(dirty){status('Syncing…');return}
   apply(value);status('Synced');
  }catch(error){status(navigator.onLine?'Sync unavailable':'Offline');$('#syncMessage').textContent=error.message}
  finally{busy=false;if(dirty&&token)timer=setTimeout(flush,200)}
 }
 async function flush(){
  if(!token||!dirty)return;if(busy){timer=setTimeout(flush,400);return}busy=true;const activeToken=token,body=JSON.stringify(state());
  try{
   const response=await fetch(window.VOLTRA_SYNC_URL||'/api/workspace',{method:'PUT',headers:headers({'content-type':'application/json',...(etag?{'If-Match':etag}:{'If-None-Match':'*'})}),body});
   if(activeToken!==token)return;
   if(response.status===409){write('voltra-unsynced-backup',body);dirty=false;etag='';persistPending();toast('Workspace changed on another device. Your edits are backed up on this device.');return}
   if(!response.ok)throw Error('Sync unavailable');etag=response.headers.get('etag');connected=true;persistPending();
   dirty=body!==JSON.stringify(state());persistPending();status(dirty?'Syncing…':'Synced');
  }catch{status(navigator.onLine?'Sync unavailable':'Offline')}
  finally{busy=false;if(dirty&&connected)timer=setTimeout(flush,3000);else if(!dirty)pull()}
 }
 function link(){return location.origin+location.pathname+'#workspace='+token}
 function dialog(){
  $('#syncLinkArea').hidden=!connected;$('#connectSync').hidden=!!token;$('#disconnectSync').hidden=!token;
  $('#syncLink').value=connected?link():'';
  $('#syncMessage').textContent=connected?'Configuration, saved plans, and loading progress sync between devices.':token?'Connecting to workspace…':'Open the same workspace on your phone or computer.';
 }
 function join(value){
  const match=value.match(/(?:#workspace=|^)([a-f0-9]{64})$/);if(!match)return toast('Paste a valid workspace link.');
  if(!confirm('Replace this device’s active plan with the linked workspace? A local backup will be kept.'))return;
  write('voltra-unsynced-backup',JSON.stringify(state()));token=match[1];etag='';dirty=false;connected=false;write(tokenKey,token);persistPending();history.replaceState(null,'',location.pathname+location.search);status('Connecting…');pull().then(dialog);
 }
 $('#syncDevices').onclick=()=>{dialog();$('#syncDialog').showModal()};$('#closeSync').onclick=()=>$('#syncDialog').close();
 $('#connectSync').onclick=async()=>{
  $('#connectSync').disabled=true;
  try{const bytes=crypto.getRandomValues(new Uint8Array(32));token=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');etag='';dirty=true;write(tokenKey,token);await flush();dialog();if(!connected){token='';write(tokenKey,'');dialog();$('#syncMessage').textContent='Could not create a workspace. Try again when connected.'}}
  finally{$('#connectSync').disabled=false}
 };
 $('#joinSync').onclick=()=>join($('#joinLink').value.trim());
 $('#copySync').onclick=async()=>{try{await navigator.clipboard.writeText(link());toast('Workspace link copied')}catch{$('#syncLink').select();toast('Select and copy the workspace link.')}};
 $('#shareSync').hidden=!navigator.share;$('#shareSync').onclick=async()=>{try{await navigator.share({title:'VOLTRA workspace',url:link()})}catch{}};
 $('#disconnectSync').onclick=()=>{token='';etag='';dirty=false;connected=false;clearTimeout(timer);write(tokenKey,'');persistPending();history.replaceState(null,'',location.pathname+location.search);status('This device');dialog()};
 // Wrap mutation boundaries instead of polling local state or camera movements.
 const repackOriginal=repack;repack=function(...args){const value=repackOriginal(...args);changed();return value};
 const advanceOriginal=advancePackage;advancePackage=function(...args){const value=advanceOriginal(...args);changed();return value};
 for(const id of ['timeline','showUpcoming','play','resetSequence','resetViewport','fit','save','plansList']){
  const el=$('#'+id),event=id==='timeline'?'oninput':id==='showUpcoming'?'onchange':'onclick',original=el[event];
  el[event]=function(...args){const value=original?.apply(this,args);changed();return value};
 }
 const saved=read(storageKey);if(saved)try{const value=JSON.parse(saved);if(valid(value))apply(value)}catch{}
 lastState=JSON.stringify(state());
 token=read(tokenKey)||'';if(!/^[a-f0-9]{64}$/.test(token))token='';
 const fromLink=location.hash.match(/^#workspace=([a-f0-9]{64})$/);
 if(!fromLink&&token)try{const pending=JSON.parse(read('voltra-sync-pending'));if(pending?.token===token){etag=pending.etag||'';dirty=true;connected=!!etag}}catch{}
 if(fromLink){dirty=false;etag='';write('voltra-unsynced-backup',lastState);token=fromLink[1];write(tokenKey,token);persistPending();history.replaceState(null,'',location.pathname+location.search)}
 window.voltraSyncReady=Promise.resolve();
 if(token){status('Connecting…');window.voltraSyncReady=dirty?flush():pull()}
 setInterval(()=>dirty?flush():pull(),3000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(dirty)flush();else pull()}});
 window.addEventListener('online',()=>{if(dirty)flush();else pull()});
 window.addEventListener('storage',event=>{if(event.key===storageKey&&!token&&event.newValue)try{const value=JSON.parse(event.newValue);if(valid(value))apply(value)}catch{}});
})();
