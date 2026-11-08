import test from 'node:test';
import assert from 'node:assert/strict';
import {bindSteeringStick} from '../touch-controls.js';
class Target {
 constructor(){this.events=new Map();}
 addEventListener(t,f){if(!this.events.has(t))this.events.set(t,new Set());this.events.get(t).add(f);}
 removeEventListener(t,f){this.events.get(t)?.delete(f);}
 fire(type,props={}){const e={pointerId:1,pointerType:'touch',button:0,clientX:180,clientY:180,preventDefault(){this.prevented=true;},...props};for(const f of this.events.get(type)||[])f(e);return e;}
}
function fixture(){
 const win=new Target(),doc=new Target(),el=new Target(),values=[],styles={},attrs={},classes=new Set();doc.defaultView=win;el.ownerDocument=doc;
 el.style={setProperty(k,v){styles[k]=v;}};el.setAttribute=(k,v)=>attrs[k]=v;el.classList={add:k=>classes.add(k),remove:k=>classes.delete(k)};
 el.getBoundingClientRect=()=>({left:100,top:100,width:160,height:160});
 let capture=null;el.setPointerCapture=id=>capture=id;el.hasPointerCapture=id=>capture===id;el.releasePointerCapture=id=>{capture=null;el.fire('lostpointercapture',{pointerId:id});};
 const binding=bindSteeringStick(el,v=>values.push(v));return {win,doc,el,binding,values,styles,attrs,classes,get capture(){return capture;}};
}
test('center deadzone, proportional steering, saturation and release',()=>{
 const f=fixture();f.el.fire('pointerdown');assert.equal(f.capture,1);assert.equal(f.binding.value,0);
 f.el.fire('pointermove',{clientX:184});assert.equal(f.binding.value,0);
 f.el.fire('pointermove',{clientX:204});assert.ok(Math.abs(f.binding.value-(.5-.12)/.88)<1e-9);
 f.el.fire('pointermove',{clientX:1000});assert.equal(f.binding.value,1);assert.equal(f.attrs['aria-valuenow'],'100');
 f.el.fire('pointermove',{clientX:-100});assert.equal(f.binding.value,-1);
 f.el.fire('pointerup');assert.equal(f.binding.value,0);assert.equal(f.capture,null);assert.equal(f.styles['--stick-x'],'0px');assert.equal(f.classes.size,0);
});
test('second fingers cannot hijack or release first steering pointer',()=>{
 const f=fixture();f.el.fire('pointerdown',{clientX:228,isPrimary:false});assert.equal(f.binding.value,1);
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])f.el.fire(type,{pointerId:2,clientX:132});
 assert.equal(f.binding.value,1);assert.equal(f.capture,1);f.el.fire('pointerup');assert.equal(f.binding.value,0);
});
for(const signal of ['pointercancel','lostpointercapture','blur','resize','visibilitychange','document-release','reset'])test(`${signal} clears and permits a fresh gesture`,()=>{
 const f=fixture();f.el.fire('pointerdown',{clientX:228});
 if(signal==='visibilitychange'){f.doc.hidden=true;f.doc.fire(signal);}else if(signal==='blur'||signal==='resize')f.win.fire(signal);else if(signal==='document-release')f.doc.fire('pointerup');else if(signal==='reset')f.binding.reset();else f.el.fire(signal);
 assert.equal(f.binding.value,0);assert.equal(f.capture,null);f.el.fire('pointermove',{clientX:132});assert.equal(f.binding.value,0);
 f.el.fire('pointerdown',{pointerId:3,clientX:132});assert.equal(f.binding.value,-1);
});
test('capture failure and right mouse button never leave steering engaged',()=>{
 const f=fixture();f.el.fire('pointerdown',{pointerType:'mouse',button:2,clientX:228});assert.equal(f.capture,null);assert.equal(f.binding.value,0);
 f.el.setPointerCapture=()=>{throw new Error('capture unavailable');};f.el.fire('pointerdown',{clientX:228});assert.equal(f.binding.value,0);assert.equal(f.classes.size,0);
});
test('destroy resets and removes every event listener, repeated destroy is safe',()=>{
 const f=fixture();f.el.fire('pointerdown',{clientX:228});f.binding.destroy();const n=f.values.length;f.binding.destroy();
 for(const t of [f.el,f.doc,f.win])for(const set of t.events.values())assert.equal(set.size,0);
 f.el.fire('pointerdown',{clientX:228});assert.equal(f.values.length,n);assert.equal(f.binding.value,0);
});
