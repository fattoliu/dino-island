import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkshopAudio } from '../audio.js';
class Param {
  constructor(value = 0) { this.value = value; this.events = []; }
  setValueAtTime(v,t) { this.value=v; this.events.push(['set',v,t]); }
  linearRampToValueAtTime(v,t) { this.value=v; this.events.push(['linear',v,t]); }
  exponentialRampToValueAtTime(v,t) { this.value=v; this.events.push(['exponential',v,t]); }
  setTargetAtTime(v,t,c) { this.value=v; this.events.push(['target',v,t,c]); }
}
class Node {
  constructor() { for (const p of ['gain','frequency','Q','threshold','knee','ratio']) this[p]=new Param(); }
  connect() {} disconnect() { this.disconnected=true; }
  start(t) { this.started=t; }
  stop(t) { if (t === undefined) { this.stopped=true; this.onended?.(); } else this.stopTime=t; }
}
class FakeContext {
  constructor() { this.currentTime=0; this.sampleRate=8000; this.destination=new Node(); this.nodes=[]; this.resumes=0; this.state='suspended'; }
  createGain() { return this.node(); } createDynamicsCompressor() { return this.node(); }
  createBiquadFilter() { return this.node(); } createOscillator() { return this.node(); } createBufferSource() { return this.node(); }
  node() { const n=new Node(); this.nodes.push(n); return n; }
  createBuffer(channels, frames) { return { getChannelData: () => new Float32Array(frames) }; }
  resume() { this.resumes++; this.state='running'; return Promise.resolve(); }
  suspend() { this.state='suspended'; return Promise.resolve(); }
  close() { this.state='closed'; return Promise.resolve(); }
}
const make = () => new WorkshopAudio({ AudioContext:FakeContext });
test('silent and safe before first gesture, including unavailable AudioContext', () => {
  const a=make(); a.fit(); a.cheer(); a.updateEngine(.5,1); assert.equal(a.context,null); a.dispose();
  const b=new WorkshopAudio({AudioContext:null}); b.unlock(); b.startEngine(); b.setEnabled(false); b.setHidden(true); b.dispose();
  assert.equal(b.context,null);
});
test('first gesture creates/resumes context synchronously; repeated unlock does not stack music', async () => {
  const a=make(); a.unlock(); assert.equal(a.context.resumes,1); assert.ok(a._voices.size>0);
  const timer=a._timer, count=a._voices.size;
  a.unlock(); await Promise.resolve(); assert.equal(a._timer,timer); assert.equal(a._voices.size,count); a.dispose();
});
test('explicit mute survives further gestures and background/foreground changes', () => {
  const a=make(); a.unlock(); a.startEngine(); a.setEnabled(false);
  const resumes=a.context.resumes; assert.equal(a._voices.size,0); assert.equal(a._timer,null);
  a.unlock(); a.setHidden(true); a.setHidden(false);
  assert.equal(a.enabled,false); assert.equal(a.context.resumes,resumes); assert.equal(a._voices.size,0);
  a.setEnabled(true); assert.ok(a._engine); assert.ok(a._timer); a.dispose();
});
test('starter and sustained engine are singleton; RPM follows speed and throttle', () => {
  const a=make(); a.unlock(); a.startEngine(); const engine=a._engine;
  const count=a._voices.size; a.startEngine(); assert.equal(a._engine,engine); assert.equal(a._voices.size,count);
  a.updateEngine(0,0); const idle=engine.oscillators[0].o.frequency.value;
  a.updateEngine(.5,0); const cruise=engine.oscillators[0].o.frequency.value;
  a.updateEngine(1,1); assert.ok(cruise>idle); assert.ok(engine.oscillators[0].o.frequency.value>cruise);
  a.updateEngine(NaN,Infinity); assert.ok(Number.isFinite(engine.oscillators[0].o.frequency.value));
  a.stopEngine(); assert.equal(a._engine,null); assert.equal([...a._voices].filter(v=>v.tag==='engine').length,0); a.dispose();
});
test('hiding suspends, cancels queued sound, then restores one music loop and engine', async () => {
  const a=make(); a.unlock(); a.startEngine(); a.cheer(); a.setHidden(true);
  assert.equal(a.context.state,'suspended'); assert.equal(a._voices.size,0); assert.equal(a._timer,null);
  a.setHidden(false); await Promise.resolve(); assert.ok(a._engine); assert.equal(a.context.state,'running');
  assert.equal([...a._voices].filter(v=>v.tag==='engine').length,3);
  a.setMode('garage'); assert.equal(a._engine,null); a.dispose();
});
test('completion creates filtered crowd voices and handclaps, and disposal is final', () => {
  const a=make(); a.unlock(); a.cheer();
  const crowd=[...a._voices].filter(v=>v.tag==='cheer'); assert.equal(crowd.length,65);
  assert.equal(crowd.filter(v=>v.nodes.filter(n=>n.type==='bandpass').length===2).length,9);
  a.dispose(); a.dispose(); a.unlock(); a.cheer(); a.startEngine();
  assert.equal(a._voices.size,0); assert.equal(a._timer,null); assert.equal(a.context.state,'closed');
});
