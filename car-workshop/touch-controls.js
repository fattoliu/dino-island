/** Horizontal analog steering. One owning pointer; other fingers remain free for pedals. */
export function bindSteeringStick(element, onChange) {
 const doc=element.ownerDocument, win=doc.defaultView;
 let pointer=null, destroyed=false, value=0;
 const listeners=[];
 const listen=(target,type,fn)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));};
 function publish(next,x=0,y=0){
  value=next;
  element.style.setProperty('--stick-x',`${x}px`);
  element.style.setProperty('--stick-y',`${y}px`);
  element.setAttribute('aria-valuenow',String(Math.round(next*100)));
  element.setAttribute('aria-valuetext',next===0?'直行':`${next<0?'左转':'右转'} ${Math.round(Math.abs(next)*100)}%`);
  onChange(next);
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
  const raw=Math.max(-1,Math.min(1,(e.clientX-rect.left-rect.width/2)/radius));
  const next=Math.abs(raw)<=.12?0:Math.sign(raw)*(Math.abs(raw)-.12)/.88;
  const y=Math.max(-radius*.35,Math.min(radius*.35,e.clientY-rect.top-rect.height/2));
  publish(next,raw*radius,y);
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
