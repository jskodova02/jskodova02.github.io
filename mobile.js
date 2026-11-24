// Both layouts operate on the same planner and workspace state.
document.body.dataset.mobileView='load';
$$('[data-mobile]').forEach(button=>button.onclick=()=>{
 document.body.dataset.mobileView=button.dataset.mobile;
 $$('[data-mobile]').forEach(b=>b.setAttribute('aria-pressed',b===button));
 window.scrollTo({top:0,behavior:'smooth'});
});
const touchPoints=new Map();let pinchDistance=0,pinchZoom=1,pinchCenter=null,pinchTarget=null;
const pointerDown=canvas.onpointerdown,pointerMove=canvas.onpointermove,pointerUp=canvas.onpointerup;
canvas.onpointerdown=e=>{
 touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(touchPoints.size===2){stopOrbit();drag=null;const [a,b]=[...touchPoints.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);pinchZoom=zoom;pinchCenter={x:(a.x+b.x)/2,y:(a.y+b.y)/2};pinchTarget={...cameraTarget};canvas.setPointerCapture(e.pointerId);return}
 pointerDown(e);
};
canvas.onpointermove=e=>{
 if(touchPoints.has(e.pointerId))touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(touchPoints.size>=2){const [a,b]=[...touchPoints.values()];setZoom(pinchZoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinchDistance));panCamera((a.x+b.x)/2-pinchCenter.x,(a.y+b.y)/2-pinchCenter.y,pinchTarget);draw();return}
 pointerMove(e);
};
canvas.onpointerup=e=>{if(touchPoints.size>1)drag=null;touchPoints.delete(e.pointerId);pointerUp(e)};
canvas.onpointercancel=e=>{touchPoints.delete(e.pointerId);drag=null};

// A public plan link works in a fresh browser, independently of saved sessions.
if(typeof location!=='undefined'&&new URLSearchParams(location.search).get('plan')==='industrial-76'){
 Promise.resolve(window.voltraSyncReady).then(()=>$('#loadFreightExample').onclick());
}
