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
  const crowd=[...a._voices].filter(v=>v.tag==='cheer'); assert.equal(crowd.length,73);
  assert.equal(crowd.filter(v=>v.nodes.filter(n=>n.type==='bandpass').length===2).length,9);
  a.dispose(); a.dispose(); a.unlock(); a.cheer(); a.startEngine();
  assert.equal(a._voices.size,0); assert.equal(a._timer,null); assert.equal(a.context.state,'closed');
});

test('vehicle classes have different idle, rev and timbre; switching releases old voices', () => {
  const a=make(); a.unlock(); a.startEngine();
  const signatures=new Set();
  for (const id of ['taxi','compact','bmw','ferrari','gclass','truck','van','tractor']) {
    const old=a._engine; a.setVehicle(id); a.updateEngine(.6,1);
    const e=a._engine;
    signatures.add(JSON.stringify(e.oscillators.map(({o})=>[o.type,o.frequency.value])));
    if (old!==e) assert.ok(old.oscillators.every(({o})=>o.stopped&&o.disconnected));
    assert.equal([...a._voices].filter(v=>v.tag==='engine').length,3);
  }
  assert.equal(signatures.size,8); a.dispose();
});
const sirens = a => [...a._voices].filter(v=>v.tag==='siren');
test('emergency sirens differ by waveform, cadence and pitch contour', () => {
  const a=make(); a.unlock(); a.setMode('drive'); a.startEngine();
  a.setVehicle('police'); const police=sirens(a);
  assert.equal(police.length,1); assert.equal(police[0].source.type,'triangle');
  assert.deepEqual(police[0].source.frequency.events.map(e=>e.slice(0,2)),[['set',620],['linear',1480],['linear',620]]);
  a.setVehicle('ambulance'); assert.ok(police[0].source.stopped);
  const ambulance=sirens(a); assert.equal(ambulance.length,2);
  assert.deepEqual(ambulance.map(v=>v.source.frequency.value),[960,640]);
  assert.ok(ambulance.every(v=>v.source.type==='square'));
  a.setVehicle('fire'); const fire=sirens(a); assert.equal(fire.length,1);
  assert.equal(fire[0].source.type,'sawtooth'); assert.ok(fire[0].source.stopTime>3);
  a.setVehicle('taxi'); assert.equal(a.hasSiren,false); a.setSiren(true);
  assert.equal(a.sirenEnabled,false); assert.equal(sirens(a).length,0); a.dispose();
});
test('siren is independent of engine, never runs in garage, and survives mute/visibility safely', async () => {
  const a=make(); a.setVehicle('police'); a.unlock(); a.startEngine();
  assert.equal(a.sirenEnabled,true); assert.equal(sirens(a).length,0);
  a.setMode('drive'); a._sync(); assert.equal(sirens(a).length,1);
  const engine=a._engine; a.setSiren(false); assert.equal(a._engine,engine); assert.equal(sirens(a).length,0);
  a.setHidden(true); a.setHidden(false); await Promise.resolve(); assert.equal(sirens(a).length,0);
  a.setSiren(true); assert.equal(sirens(a).length,1);
  a.setSiren(true); a.unlock(); assert.equal(sirens(a).length,1);
  a.setEnabled(false); assert.equal(a._voices.size,0);
  a.setHidden(true); a.setHidden(false); assert.equal(a._voices.size,0);
  a.setEnabled(true); await Promise.resolve(); assert.equal(sirens(a).length,1);
  a.setHidden(true); assert.equal(a._voices.size,0);
  a.setHidden(false); await Promise.resolve(); assert.equal(sirens(a).length,1);
  a.stopEngine(); assert.equal(sirens(a).length,0);
  a.startEngine(); assert.equal(sirens(a).length,1);
  a.setMode('garage'); assert.equal(sirens(a).length,0);
  a.dispose(); a.setSiren(true); a.startEngine(); a.unlock(); assert.equal(a._voices.size,0);
});

test('repeat celebrations replace previous fanfare and crowd without stacking voices',()=>{const a=make();a.unlock();a.cheer();const old=[...a._voices].filter(v=>v.tag==='cheer');a.cheer();assert.equal([...a._voices].filter(v=>v.tag==='cheer').length,73);assert.ok(old.every(v=>v.source.stopped));a.setEnabled(false);assert.equal(a._voices.size,0);a.dispose();});
