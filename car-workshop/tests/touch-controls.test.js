import test from 'node:test';
import assert from 'node:assert/strict';
import {bindSteeringStick} from '../touch-controls.js';
import {createWorldState,stepWorld} from '../world-state.js';
// Native EventTarget dispatch exercises installed pointer listeners; Node has no DOM PointerEvent.
class PointerEvent extends Event {
 constructor(type,props={}){super(type,{cancelable:true});Object.assign(this,{pointerId:1,pointerType:'touch',button:0,clientX:180,clientY:180},props);}
}
class Target extends EventTarget {
 constructor(){super();this.listeners=new Set();}
 addEventListener(t,f){super.addEventListener(t,f);this.listeners.add(f);}
 removeEventListener(t,f){super.removeEventListener(t,f);this.listeners.delete(f);}
 fire(type,props={}){const e=new PointerEvent(type,props);this.dispatchEvent(e);return e;}
}
function fixture(){
 const win=new Target(),doc=new Target(),el=new Target(),values=[],styles={},attrs={steer:{},drive:{}},classes=new Set();doc.defaultView=win;el.ownerDocument=doc;
 el.style={setProperty(k,v){styles[k]=v;}};el.querySelector=s=>({setAttribute(k,v){attrs[s.includes('steer')?'steer':'drive'][k]=v;}});el.classList={add:k=>classes.add(k),remove:k=>classes.delete(k)};
 el.getBoundingClientRect=()=>({left:100,top:100,width:160,height:160});
 let capture=null;el.setPointerCapture=id=>capture=id;el.hasPointerCapture=id=>capture===id;el.releasePointerCapture=id=>{capture=null;el.fire('lostpointercapture',{pointerId:id});};
 const binding=bindSteeringStick(el,v=>values.push(v));return {win,doc,el,binding,values,styles,attrs,classes,get capture(){return capture;}};
}
const zero=f=>assert.deepEqual(f.binding.value,{steer:0,drive:0});
test('both axes: deadzone, proportional force, cardinal saturation and ARIA values',()=>{
 const f=fixture();assert.equal(f.el.fire('pointerdown').defaultPrevented,true);zero(f);
 f.el.fire('pointermove',{clientX:184,clientY:176});zero(f);
 f.el.fire('pointermove',{clientX:204,clientY:156});for(const v of Object.values(f.binding.value))assert.ok(Math.abs(v-(.5-.12)/.88)<1e-9);
 for(const [clientX,clientY,steer,drive] of [[1000,180,1,0],[-100,180,-1,0],[180,-100,0,1],[180,1000,0,-1]]){
  f.el.fire('pointermove',{clientX,clientY});assert.deepEqual(f.binding.value,{steer,drive});
  assert.equal(f.attrs.steer['aria-valuenow'],String(steer*100));assert.equal(f.attrs.drive['aria-valuenow'],String(drive*100));
 }
 f.el.fire('pointerup');zero(f);assert.equal(f.capture,null);assert.equal(f.styles['--stick-x'],'0px');assert.equal(f.styles['--stick-y'],'0px');assert.equal(f.classes.size,0);
});
test('all diagonal quadrants steer and drive simultaneously within circular boundary',()=>{
 for(const x of [-1,1])for(const y of [-1,1]){const f=fixture();f.el.fire('pointerdown',{clientX:180+x*1000,clientY:180+y*1000});assert.equal(Math.sign(f.binding.value.steer),x);assert.equal(Math.sign(f.binding.value.drive),-y);assert.ok(Math.hypot(parseFloat(f.styles['--stick-x']),parseFloat(f.styles['--stick-y']))<=48.000001);}
});
test('second fingers cannot hijack or release first pointer',()=>{
 const f=fixture();f.el.fire('pointerdown',{clientX:228,clientY:132,isPrimary:false});const v=f.binding.value;
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])f.el.fire(type,{pointerId:2,clientX:132,clientY:228});
 assert.deepEqual(f.binding.value,v);assert.equal(f.capture,1);f.el.fire('pointerup');zero(f);
});
for(const signal of ['pointercancel','lostpointercapture','blur','resize','visibilitychange','document-release','document-cancel','reset'])test(`${signal} clears both axes and permits a fresh gesture`,()=>{
 const f=fixture();f.el.fire('pointerdown',{clientX:228,clientY:132});
 if(signal==='visibilitychange'){f.doc.hidden=true;f.doc.fire(signal);}else if(signal==='blur'||signal==='resize')f.win.fire(signal);else if(signal==='document-release')f.doc.fire('pointerup');else if(signal==='document-cancel')f.doc.fire('pointercancel');else if(signal==='reset')f.binding.reset();else f.el.fire(signal);
 zero(f);assert.equal(f.capture,null);f.el.fire('pointermove',{clientX:132});zero(f);
 f.el.getBoundingClientRect=()=>({left:0,top:0,width:200,height:200});f.el.fire('pointerdown',{pointerId:3,clientX:100,clientY:160});assert.deepEqual(f.binding.value,{steer:0,drive:-1});
});
test('capture failure and right mouse button never leave controls engaged',()=>{
 const f=fixture();f.el.fire('pointerdown',{pointerType:'mouse',button:2,clientX:228});assert.equal(f.capture,null);zero(f);
 f.el.setPointerCapture=()=>{throw new Error('capture unavailable');};f.el.fire('pointerdown',{clientX:228});zero(f);assert.equal(f.classes.size,0);
});
test('destroy resets both axes and removes all listeners; repeated destroy is safe',()=>{
 const f=fixture();f.el.fire('pointerdown',{clientX:228,clientY:132});f.binding.destroy();const n=f.values.length;f.binding.destroy();
 for(const t of [f.el,f.doc,f.win])assert.equal(t.listeners.size,0);
 f.el.fire('pointerdown',{clientX:228});assert.equal(f.values.length,n);zero(f);
});
test('world motion decelerates to rest after release and reverses continuously',()=>{
 for(const sign of [-1,1]){
  const state=createWorldState('sedan');state.x=0;state.z=0;state.speed=sign*3;
  for(let i=0;i<60;i++)stepWorld(state,{brake:.45},1/60);
  assert.equal(state.speed,0);
  state.speed=sign*3;let previous=state.speed,crossed=false;
  for(let i=0;i<90;i++){stepWorld(state,sign>0?{reverse:1}:{throttle:1},1/60);assert.ok(Math.abs(state.speed-previous)<.2);if(Math.sign(state.speed)===-sign)crossed=true;previous=state.speed;}
  assert.equal(crossed,true);
 }
});
