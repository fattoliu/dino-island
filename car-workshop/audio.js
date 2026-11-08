// Original, entirely procedural score and Foley. No recordings or network assets.
const clamp = n => Math.max(0, Math.min(1, Number(n) || 0));
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
// Each class has its own idle/rev range, harmonic balance and exhaust brightness.
const ENGINES = {
  car: { idle: 38, rev: 100, load: 24, cutoff: 420, volume: .095, waves: ['sawtooth','triangle','triangle'], harmonics: [1,2,3.02], levels: [.6,.3,.12] },
  sport: { idle: 65, rev: 210, load: 42, cutoff: 780, volume: .08, waves: ['sawtooth','sawtooth','triangle'], harmonics: [1,2.01,4], levels: [.5,.26,.16] },
  supercar: { idle: 82, rev: 260, load: 50, cutoff: 1000, volume: .075, waves: ['sawtooth','triangle','sawtooth'], harmonics: [1,3,5.02], levels: [.48,.3,.12] },
  suv: { idle: 29, rev: 85, load: 20, cutoff: 330, volume: .11, waves: ['sawtooth','triangle','square'], harmonics: [1,1.5,3.01], levels: [.6,.3,.08] },
  diesel: { idle: 24, rev: 58, load: 15, cutoff: 250, volume: .12, waves: ['sawtooth','square','triangle'], harmonics: [1,2.03,4], levels: [.6,.17,.2] },
  utility: { idle: 32, rev: 74, load: 21, cutoff: 380, volume: .1, waves: ['triangle','sawtooth','triangle'], harmonics: [1,2,3.04], levels: [.6,.32,.14] },
  tractor: { idle: 19, rev: 40, load: 12, cutoff: 230, volume: .12, waves: ['square','sawtooth','triangle'], harmonics: [1,1.51,3], levels: [.45,.38,.2] },
  compact: { idle: 50, rev: 125, load: 28, cutoff: 600, volume: .075, waves: ['triangle','sawtooth','triangle'], harmonics: [1,2.01,4], levels: [.6,.2,.1] }
};
const VEHICLE_ENGINES = {
  gclass:'suv', landcruiser:'suv', bmw:'sport', ferrari:'supercar', truck:'diesel',
  fire:'diesel', police:'sport', taxi:'car', crane:'diesel', excavator:'tractor',
  ambulance:'utility', bus:'diesel', schoolbus:'diesel', minibus:'utility', pickup:'suv',
  van:'utility', camper:'utility', garbage:'diesel', mixer:'diesel', tractor:'tractor',
  compact:'compact', icecream:'utility'
};
export class WorkshopAudio {
  constructor({ AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext } = {}) {
    this.enabled = true; this.context = null; this.mode = 'garage';
    this._Context = AudioContext; this._hidden = false; this._disposed = false;
    this._voices = new Set(); this._timer = null; this._engine = null;
    this.vehicleId = 'compact'; this._sirenEnabled = false; this._nextSiren = null;
    this._engineWanted = false; this._speed = 0; this._throttle = 0; this._beat = 0;
  }
  unlock() {
    if (this._disposed || !this._Context) return;
    // Both construction and resume happen synchronously in the input handler, including iOS.
    try {
      if (!this.context) {
        this.context = new this._Context();
        this._master = this.context.createGain(); this._master.gain.value = this.enabled ? .72 : 0;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -15; limiter.knee.value = 15; limiter.ratio.value = 5;
        this._master.connect(limiter); limiter.connect(this.context.destination);
        this._limiter = limiter;
        const frames = this.context.sampleRate;
        this._noise = this.context.createBuffer(1, frames, frames);
        const data = this._noise.getChannelData(0);
        for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
      }
      if (!this.enabled || this._hidden) return;
      this._resume();
      this._sync();
    } catch { /* Browsers without audio remain fully playable. */ }
  }
  _resume() {
    try { const p = this.context?.resume(); p?.then(() => { if (!this._disposed && this.enabled && !this._hidden) this._sync(); }).catch(() => {}); } catch {}
  }
  _active() { return !!(this.context && this.enabled && !this._hidden && !this._disposed); }
  setEnabled(value) {
    this.enabled = !!value;
    if (this._master) this._master.gain.setValueAtTime(this.enabled ? .72 : 0, this.context.currentTime);
    if (this.enabled) this.unlock(); else this._silence();
  }
  setMode(mode) {
    if (mode !== 'garage' && mode !== 'drive') return;
    this.mode = mode;
    if (mode === 'garage') this.stopEngine();
    else this._syncSiren();
  }
  get hasSiren() { return ['police', 'ambulance', 'fire'].includes(this.vehicleId); }
  get sirenEnabled() { return this.hasSiren && this._sirenEnabled; }
  setVehicle(id) {
    if (this._disposed || id === this.vehicleId) return;
    this.vehicleId = Object.hasOwn(VEHICLE_ENGINES, id) ? id : 'compact';
    this._sirenEnabled = this.hasSiren;
    this._dropSiren(); this._dropEngine();
    if (this._active() && this._engineWanted) this._makeEngine(false);
    this._syncSiren();
  }
  setSiren(enabled) {
    this._sirenEnabled = this.hasSiren && !!enabled;
    if (!this._sirenEnabled) this._dropSiren();
    else this._syncSiren();
  }
  setHidden(value) {
    this._hidden = !!value;
    if (this._hidden) {
      this._silence();
      try { this.context?.suspend()?.catch(() => {}); } catch {}
    } else if (this.enabled && this.context) { this._resume(); this._sync(); }
  }
  _sync() {
    if (!this._active()) return;
    if (this._timer === null) {
      this._next = this.context.currentTime + .03;
      this._schedule();
      this._timer = setInterval(() => this._schedule(), 90);
      this._timer.unref?.();
    }
    if (this._engineWanted && !this._engine) this._makeEngine(false);
    this._syncSiren();
  }
  _track(source, nodes, tag) {
    const voice = { source, nodes, tag }; this._voices.add(voice);
    source.onended = () => {
      this._voices.delete(voice);
      for (const node of [source, ...nodes]) { try { node.disconnect(); } catch {} }
    };
    return voice;
  }
  _tone(freq, time, duration, volume, type = 'sine', endFreq, tag = 'fx') {
    const c = this.context, source = c.createOscillator(), gain = c.createGain();
    source.type = type; source.frequency.setValueAtTime(freq, time);
    if (endFreq) source.frequency.exponentialRampToValueAtTime(endFreq, time + duration * .88);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), time + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(gain); gain.connect(this._master); this._track(source, [gain], tag);
    source.start(time); source.stop(time + duration + .02);
  }
  _hiss(time, duration, volume, frequency, tag = 'fx') {
    const c = this.context, source = c.createBufferSource(), gain = c.createGain(), filter = c.createBiquadFilter();
    source.buffer = this._noise; source.loop = true; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .8;
    gain.gain.setValueAtTime(volume, time); gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this._master);
    this._track(source, [filter, gain], tag); source.start(time); source.stop(time + duration + .01);
  }
  _schedule() {
    if (!this._active()) return;
    this._syncSiren();
    const c = this.context, step = 60 / (this.mode === 'drive' ? 112 : 96) / 2;
    if (this._next < c.currentTime - .3) this._next = c.currentTime + .02;
    while (this._next < c.currentTime + .28) {
      const b = this._beat++, t = this._next, chord = [[48,52,55,59],[45,48,52,55],[41,45,48,52],[43,47,50,55]][Math.floor(b / 16) % 4];
      // Warm electric-piano arpeggios, soft bass, brushed offbeats: a 32-bar original loop.
      const melody = [0,2,1,3,2,1,3,2,0,1,2,3,1,2,0,3][b % 16];
      this._tone(hz(chord[melody] + 12), t, .48, .038, 'sine', null, 'music');
      this._tone(hz(chord[melody] + 24), t, .19, .008, 'triangle', null, 'music');
      if (b % 4 === 0) this._tone(hz(chord[0] - 12), t, .52, .065, 'triangle', null, 'music');
      if (b % 4 === 0) this._tone(100, t, .15, .055, 'sine', 43, 'music');
      if (b % 4 === 2) this._hiss(t, .095, .022, 1900, 'music');
      this._hiss(t, .035, .012, 6800, 'music');
      this._next += step;
    }
  }
  fit(good = true) {
    if (!this._active()) return;
    const t = this.context.currentTime;
    this._hiss(t, .055, .19, good ? 2600 : 1100);
    this._tone(good ? 760 : 240, t, .09, .11, 'triangle', good ? 420 : 120);
    if (good) [76,83].forEach((n,i) => this._tone(hz(n), t + .04 + i * .07, .18, .07));
  }
  cheer() {
    if (!this._active()) return;
    this._stopTag('cheer'); // Repeated celebrations replace, never stack crowd voices.
    const c = this.context, t = c.currentTime;
    // A small crowd: separately pitched, vowel-filtered rising/falling 'woo!' voices.
    for (let i = 0; i < 9; i++) {
      const at = t + i * .075, duration = 1.05 + (i % 3) * .17;
      const source = c.createOscillator(), gain = c.createGain();
      source.type = 'sawtooth'; const pitch = 175 + i * 24;
      source.frequency.setValueAtTime(pitch, at);
      source.frequency.exponentialRampToValueAtTime(pitch * 1.65, at + .33);
      source.frequency.exponentialRampToValueAtTime(pitch * 1.12, at + duration);
      gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(.042, at + .12);
      gain.gain.setValueAtTime(.035, at + duration * .64); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      const formants = [480 + i * 12, 1050 + i * 25].map(f => {
        const filter = c.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = f; filter.Q.value = 5;
        source.connect(filter); filter.connect(gain); return filter;
      });
      gain.connect(this._master); this._track(source, [...formants, gain], 'cheer'); source.start(at); source.stop(at + duration + .02);
    }
    // Uneven overlapping handclaps distinguish the crowd from a success chime.
    for (let i = 0; i < 26; i++) {
      const at = t + .12 + i * .075 + (i % 3) * .017;
      this._hiss(at, .06, .13, 1400 + (i % 4) * 330, 'cheer');
      this._hiss(at + .014, .035, .065, 2300, 'cheer');
    }
    // Original three-chord miniature fanfare, with a rounded bass and bell crown.
    [[60,64,67],[62,67,71],[60,64,72]].forEach((chord,i)=>chord.forEach((n,j)=>this._tone(hz(n),t+i*.22+j*.014,i===2?.95:.34,.036,'triangle',null,'cheer')));
    this._tone(hz(48),t+.44,.8,.045,'sine',null,'cheer');
    [84,91].forEach((n,i)=>this._tone(hz(n),t+.48+i*.12,.75,.025,'sine',null,'cheer'));
  }
  startEngine() {
    if (this._disposed || this._engineWanted) return;
    this._engineWanted = true;
    if (this._active()) { this._makeEngine(true); this._syncSiren(); }
  }
  _makeEngine(starter) {
    const c = this.context, t = c.currentTime, profile = ENGINES[VEHICLE_ENGINES[this.vehicleId]];
    if (starter) {
      // Starter motor chatter, ignition catch and initial rev.
      for (let i = 0; i < 8; i++) {
        this._hiss(t + i * .075, .045, .14, 700, 'engine');
        this._tone(72 + i * 6, t + i * .075, .065, .11, 'sawtooth', 45, 'engine');
      }
      this._tone(58, t + .53, .75, .18, 'triangle', 125, 'engine');
    }
    const gain = c.createGain(), filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = profile.cutoff;
    gain.gain.setValueAtTime(.0001, t); gain.gain.linearRampToValueAtTime(.11, t + (starter ? .8 : .18));
    filter.connect(gain); gain.connect(this._master);
    const oscillators = profile.harmonics.map((harmonic, i) => {
      const o = c.createOscillator(), level = c.createGain(); o.type = profile.waves[i];
      o.frequency.value = profile.idle * harmonic; level.gain.value = profile.levels[i];
      o.connect(level); level.connect(filter); this._track(o, [level], 'engine'); o.start(t);
      return { o, harmonic };
    });
    this._engine = { gain, filter, oscillators, profile };
    this.updateEngine(this._speed, this._throttle);
  }
  updateEngine(speedRatio, throttle = 0) {
    this._speed = clamp(speedRatio); this._throttle = clamp(throttle);
    if (!this._engine || !this._active()) return;
    const t = this.context.currentTime, e = this._engine;
    // Speed makes pitch rise continuously; throttle adds the characteristic loaded rev.
    const p = e.profile;
    const fundamental = p.idle + this._speed * p.rev + this._throttle * p.load;
    e.oscillators.forEach(({ o, harmonic }) => o.frequency.setTargetAtTime(fundamental * harmonic, t, .13));
    e.filter.frequency.setTargetAtTime(p.cutoff + this._speed * p.cutoff * 2 + this._throttle * 550, t, .12);
    e.gain.gain.setTargetAtTime(p.volume + this._throttle * .045 + this._speed * .02, t + .05, .16);
  }
  _syncSiren() {
    if (!this._active() || this.mode !== 'drive' || !this._engineWanted || !this.sirenEnabled) return;
    const now = this.context.currentTime;
    if (this._nextSiren === null || this._nextSiren < now - .3) this._nextSiren = now + .01;
    while (this._nextSiren < now + .3) {
      const t = this._nextSiren;
      if (this.vehicleId === 'ambulance') {
        // Familiar discrete nee-naw: no pitch glide between the two notes.
        this._tone(960, t, .4, .14, 'square', null, 'siren');
        this._tone(640, t + .42, .4, .14, 'square', null, 'siren');
        this._nextSiren += .84;
      } else {
        const fire = this.vehicleId === 'fire', duration = fire ? 3.2 : .72;
        const low = fire ? 280 : 620, high = fire ? 920 : 1480;
        const c = this.context, source = c.createOscillator(), gain = c.createGain();
        source.type = fire ? 'sawtooth' : 'triangle';
        source.frequency.setValueAtTime(low, t);
        source.frequency.linearRampToValueAtTime(high, t + duration * .48);
        source.frequency.linearRampToValueAtTime(low, t + duration);
        gain.gain.setValueAtTime(.0001, t);
        gain.gain.linearRampToValueAtTime(fire ? .11 : .2, t + .02);
        gain.gain.setValueAtTime(fire ? .11 : .2, t + duration - .025);
        gain.gain.linearRampToValueAtTime(.0001, t + duration);
        source.connect(gain); gain.connect(this._master);
        this._track(source, [gain], 'siren'); source.start(t); source.stop(t + duration + .01);
        this._nextSiren += duration;
      }
    }
  }
  _dropSiren() { this._stopTag('siren'); this._nextSiren = null; }
  _stopTag(tag) {
    for (const v of [...this._voices]) if (!tag || v.tag === tag) {
      try { v.source.stop(); } catch {}
      try { v.source.disconnect(); } catch {}
      for (const n of v.nodes) { try { n.disconnect(); } catch {} }
      this._voices.delete(v);
    }
  }
  _dropEngine() {
    this._stopTag('engine');
    if (this._engine) { this._engine.gain.disconnect(); this._engine.filter.disconnect(); this._engine = null; }
  }
  stopEngine() { this._engineWanted = false; this._dropSiren(); this._dropEngine(); }
  _silence() {
    if (this._timer !== null) clearInterval(this._timer);
    this._timer = null; this._dropSiren(); this._dropEngine(); this._stopTag();
  }
  dispose() {
    if (this._disposed) return;
    this._disposed = true; this._engineWanted = false; this._silence();
    try { this.context?.close()?.catch(() => {}); } catch {}
  }
}
