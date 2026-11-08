import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkshopCelebration, createCelebrationParticles, CELEBRATION_LIMIT, CELEBRATION_DURATION } from '../celebration.js';

function environment({ reduced = false, context = true } = {}) {
  let now = 0, frameId = 0; const frames = new Map(), nodes = [], listeners = new Map();
  const gradient = {addColorStop(){}};
  const ctx = new Proxy({createRadialGradient:()=>gradient,createLinearGradient:()=>gradient}, { get:(o,k)=>k in o ? o[k] : ()=>{} });
  const doc = { hidden:false, addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k),
    createElement:()=>({style:{},getContext:()=>context ? ctx : null,setAttribute(){},remove(){const i=nodes.indexOf(this);if(i>=0)nodes.splice(i,1);}}) };
  const container = {ownerDocument:doc,appendChild:node=>nodes.push(node)};
  const win = { innerWidth:1366,innerHeight:1024,devicePixelRatio:3,performance:{now:()=>now},matchMedia:()=>({matches:reduced}),
    addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k),requestAnimationFrame:f=>{frames.set(++frameId,f);return frameId;},cancelAnimationFrame:id=>frames.delete(id) };
  return {doc,win,window:win,nodes,frames,listeners,container,step(time){now=time;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(time));}};
}
test('bounded layered burst includes substantial curled streamers and metallic foil',()=>{
  const p=createCelebrationParticles(()=>.5);
  assert.equal(p.length,CELEBRATION_LIMIT); assert.ok(p.length<=150);
  assert.deepEqual(new Set(p.map(x=>x.kind)),new Set(['streamer','foil','glint']));
  assert.equal(new Set(p.map(x=>x.layer)).size,3); assert.equal(new Set(p.map(x=>x.side)).size,2);
  assert.ok(p.every(x=>x.size>=15 && x.delay<.85));
  assert.deepEqual(createCelebrationParticles(()=>.5,true),[]);
});
test('repeat bursts replace rather than accumulate and release canvas at lifetime',()=>{
  const e=environment(), effect=new WorkshopCelebration(e);
  effect.burst(); assert.equal(e.nodes.length,1); assert.equal(e.frames.size,1);
  assert.ok(effect.canvas.width*effect.canvas.height<2410000);
  e.step(900); assert.ok(effect.sprites.size>4);
  effect.burst(); assert.equal(e.nodes.length,1); assert.equal(e.frames.size,1);
  e.step(900+CELEBRATION_DURATION); assert.equal(e.nodes.length,0);assert.equal(e.frames.size,0);assert.equal(effect.particles.length,0);
  effect.dispose();assert.equal(e.listeners.size,0);assert.equal(effect.sprites.size,0);
  effect.burst(); assert.equal(e.nodes.length,0);
});
test('reduced motion has only static fading glints, no moving particles',()=>{
  const e=environment({reduced:true}), effect=new WorkshopCelebration(e);
  effect.burst();assert.equal(effect.quiet,true);assert.equal(effect.particles.length,0);
  e.step(1500);assert.equal(e.nodes.length,0);assert.equal(e.frames.size,0);effect.dispose();
});
test('backgrounding clears canvas and cancellation is idempotent',()=>{
  const e=environment(),effect=new WorkshopCelebration(e);effect.burst();
  e.doc.hidden=true;e.listeners.get('visibilitychange')();
  assert.equal(e.nodes.length,0);assert.equal(e.frames.size,0);
  effect.clear();effect.clear();effect.burst();assert.equal(e.nodes.length,0);effect.dispose();
});
test('missing canvas support leaves game playable without an animation loop',()=>{
  const e=environment({context:false}),effect=new WorkshopCelebration(e);effect.burst();
  assert.equal(e.nodes.length,0);assert.equal(e.frames.size,0);effect.dispose();
});
