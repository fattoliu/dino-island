/** Two-axis driving stick. One owning pointer; other fingers can use mission/siren controls. */
export function bindSteeringStick(element, onChange) {
 const doc=element.ownerDocument, win=doc.defaultView;
 let pointer=null, destroyed=false, value={steer:0,drive:0};
 const listeners=[];
 const listen=(target,type,fn)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));};
 function publish(steer=0,drive=0,x=0,y=0){
  value={steer,drive};
  element.style.setProperty('--stick-x',`${x}px`);
  element.style.setProperty('--stick-y',`${y}px`);
  for(const [axis,next,label] of [['steer',steer,steer===0?'直行':steer<0?'左转':'右转'],['drive',drive,drive===0?'松手减速':drive>0?'前进':'倒车']]){
   const meter=element.querySelector(`[data-axis="${axis}"]`);
   meter?.setAttribute('aria-valuenow',String(Math.round(next*100)));
   meter?.setAttribute('aria-valuetext',`${label} ${Math.round(Math.abs(next)*100)}%`);
  }
  onChange({...value});
 }
 function reset(){
  const id=pointer;pointer=null;
  element.classList.remove('engaged');
  publish(0);
  if(id!==null&&element.hasPointerCapture?.(id)){try{element.releasePointerCapture(id);}catch{/* Pointer may already have ended. */}}
 }
 function move(e){
  if(e.pointerId!==pointer)return;
  e.preventDefault();
  const rect=element.getBoundingClientRect(), radius=Math.max(1,Math.min(rect.width,rect.height)*.3);
  const dx=(e.clientX-rect.left-rect.width/2)/radius,dy=(e.clientY-rect.top-rect.height/2)/radius;
  const scale=Math.max(1,Math.hypot(dx,dy)),x=dx/scale,y=dy/scale;
  const axis=v=>Math.abs(v)<=.12?0:Math.sign(v)*(Math.abs(v)-.12)/.88;
  publish(axis(x),axis(-y),x*radius,y*radius);
 }
 function down(e){
  if(destroyed||pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;
  e.preventDefault();pointer=e.pointerId;
  try{element.setPointerCapture(pointer);}catch{reset();return;}
  element.classList.add('engaged');move(e);
 }
 function up(e){if(e.pointerId===pointer)reset();}
 listen(element,'pointerdown',down);listen(element,'pointermove',move);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(element,type,up);
 // Document release is a fallback for interrupted capture implementations.
 listen(doc,'pointerup',up);listen(doc,'pointercancel',up);
 listen(element,'contextmenu',e=>e.preventDefault());
 listen(win,'blur',reset);listen(win,'resize',reset);
 listen(doc,'visibilitychange',()=>{if(doc.hidden)reset();});
 publish(0);
 return {reset,destroy(){if(destroyed)return;destroyed=true;reset();listeners.splice(0).forEach(remove=>remove());},get value(){return value;}};
}
