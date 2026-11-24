// Render solid geometry with a hardware depth buffer; face-center sorting
// cannot correctly resolve overlapping truck panels and pallet components.
function createDepthRenderer(){
 const surface=document.createElement('canvas');
 const gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
 if(!gl)return null;
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const program=gl.createProgram();
 gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 position; attribute vec4 color; varying lowp vec4 shade; void main(){gl_Position=vec4(position,1.0);shade=color;}'));
 gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float; varying lowp vec4 shade; void main(){gl_FragColor=shade;}'));
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 const buffer=gl.createBuffer(),position=gl.getAttribLocation(program,'position'),color=gl.getAttribLocation(program,'color');
 function rgba(value,alpha){if(value[0]==='#'){const n=parseInt(value.slice(1),16);return [(n>>16)/255,((n>>8)&255)/255,(n&255)/255,alpha]}return [...value.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255),alpha]}
 function render(faces,project,width,height,dpr,opacity,mask=false){
  const w=Math.round(width*dpr),h=Math.round(height*dpr);if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h}
  gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(color);gl.vertexAttribPointer(position,3,gl.FLOAT,false,28,0);gl.vertexAttribPointer(color,4,gl.FLOAT,false,28,12);
  const opaque=[],transparent=[],lines=[],ghostEdges=new Set();
  // Use one common depth range across all vertices, including long chassis faces.
  const projected=faces.map(f=>({f,points:f.points.map(p=>project(...p))}));
  let range=1;for(const {points} of projected)for(const p of points)range=Math.max(range,Math.abs(p.d)+1);
  const vertex=(p,c,target)=>target.push(p.x/width*2-1,1-p.y/height*2,-p.d/range,...c);
  for(const {f,points} of projected){
   const alpha=opacity(f),shade=rgba(f.color,alpha),target=alpha<1?transparent:opaque;
   for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]])vertex(p,shade,target);
   if(!mask){const edge=rgba(f.wireframe?f.color:f.cargo?'#303b5e':'#16213a',f.wireframe?.62:alpha);for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(f.wireframe){const key=[f.b.number,...[JSON.stringify(f.points[i]),JSON.stringify(f.points[(i+1)%points.length])].sort()].join('|');if(ghostEdges.has(key))continue;ghostEdges.add(key)}vertex(a,edge,lines);vertex(b,edge,lines)}}
  }
  function submit(data,mode){if(!data.length)return;gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.drawArrays(mode,0,data.length/7)}
  gl.disable(gl.BLEND);gl.depthMask(true);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);submit(opaque,gl.TRIANGLES);gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);submit(transparent,gl.TRIANGLES);if(!mask)submit(lines,gl.LINES);gl.depthMask(true);gl.flush();
  return surface;
 }
 return {render};
}
