// Original raster artwork, painted once and reused as sprites. No remote assets.
const PALETTE = [ ['#935211','#ffd46b','#fff5cf'], ['#ae365b','#fa8caa','#ffe2e8'], ['#087877','#56d8c4','#d9fff1'], ['#3b57a6','#92b6ff','#f0f5ff'] ];
export const CELEBRATION_LIMIT = 144;
export const CELEBRATION_DURATION = 5200;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Seedable pure data generation also makes the performance/lifetime contract testable.
export function createCelebrationParticles(random = Math.random, reducedMotion = false) {
  if (reducedMotion) return [];
  return Array.from({ length: CELEBRATION_LIMIT }, (_, i) => {
    const layer = i % 3, side = i % 2 ? 1 : -1;
    return { layer, side, kind: i % 9 === 0 ? 'streamer' : i % 4 === 0 ? 'glint' : 'foil',
      color: i % PALETTE.length, delay: Math.floor(i / 48) * .24 + random() * .12,
      speedX: (.15 + random() * .26) * -side, speedY: -.5 - random() * .36,
      gravity: .32 + random() * .15, phase: random() * Math.PI * 2,
      spin: (random() - .5) * 3, size: 15 + random() * 17 + layer * 6 };
  });
}

function paintSprite(doc, kind, color) {
  const canvas = doc.createElement('canvas'); canvas.width = 96; canvas.height = 160;
  const c = canvas.getContext('2d'); if (!c) return canvas;
  const [dark, mid, light] = PALETTE[color];
  if (kind === 'glint' || kind === 'bokeh') {
    const g = c.createRadialGradient(48, 80, 0, 48, 80, 44);
    g.addColorStop(0, '#fffdf0'); g.addColorStop(.08, light); g.addColorStop(.3, mid + '90'); g.addColorStop(1, mid + '00');
    c.fillStyle = g; c.fillRect(0, 32, 96, 96);
    if (kind === 'glint') { c.strokeStyle = '#fff5dc'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(48, 57); c.lineTo(48, 103); c.moveTo(25, 80); c.lineTo(71, 80); c.stroke(); }
    return canvas;
  }
  const g = c.createLinearGradient(18, 0, 78, 0);
  for (const [stop, value] of [[0,dark],[.23,mid],[.43,light],[.52,mid],[.73,dark],[1,light]]) g.addColorStop(stop, value);
  c.fillStyle = g; c.shadowColor = dark + '50'; c.shadowBlur = 5; c.shadowOffsetY = 3;
  c.beginPath();
  if (kind === 'streamer') {
    c.moveTo(28,8); c.bezierCurveTo(102,34,8,61,52,88); c.bezierCurveTo(98,118,25,136,42,153);
    c.lineTo(59,147); c.bezierCurveTo(43,130,114,111,68,81); c.bezierCurveTo(25,55,119,30,46,5);
  } else {
    c.moveTo(25,39); c.bezierCurveTo(38,32,60,41,73,34); c.lineTo(66,110); c.bezierCurveTo(53,122,34,108,20,119);
  }
  c.closePath(); c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
  c.strokeStyle = light + 'bb'; c.lineWidth = 1; c.stroke();
  // Fine imperfect metallic grain, clipped to the folded surface, not a flat fill.
  c.save(); c.clip();
  for (let y = 7; y < 155; y += 3) { c.globalAlpha = y % 2 ? .12 : .22; c.strokeStyle = y % 2 ? light : dark; c.beginPath(); c.moveTo(10,y); c.lineTo(88,y+4); c.stroke(); }
  c.restore();
  return canvas;
}

export class WorkshopCelebration {
  constructor({ container = globalThis.document?.body, reducedMotion = false, window: win = globalThis.window, random = Math.random } = {}) {
    this.container = container; this.win = win; this.doc = container?.ownerDocument;
    this.reducedMotion = reducedMotion; this.random = random; this.canvas = null;
    this.sprites = new Map(); this.particles = []; this.frame = null; this.disposed = false;
    this._tick = now => this.render(now);
    this._onHidden = () => { if (this.doc.hidden) this.clear(); };
    this._onResize = () => { if (this.canvas) this.resize(); };
    this.doc?.addEventListener('visibilitychange', this._onHidden);
    this.win?.addEventListener('resize', this._onResize);
  }
  sprite(kind, color) {
    const key = kind + color;
    if (!this.sprites.has(key)) this.sprites.set(key, paintSprite(this.doc, kind, color));
    return this.sprites.get(key);
  }
  resize() {
    this.width = Math.max(1, this.win.innerWidth); this.height = Math.max(1, this.win.innerHeight);
    // Bound backing-store memory even on large Retina iPads.
    this.dpr = Math.min(this.win.devicePixelRatio || 1, 1.5, Math.sqrt(2400000 / (this.width * this.height)));
    this.canvas.width = Math.ceil(this.width * this.dpr); this.canvas.height = Math.ceil(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  burst() {
    this.clear();
    if (this.disposed || !this.doc || !this.win || this.doc.hidden) return;
    const canvas = this.doc.createElement('canvas'); const ctx = canvas.getContext('2d'); if (!ctx) return;
    this.canvas = canvas; this.ctx = ctx;
    canvas.className = 'workshop-celebration'; canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:45;';
    this.container.appendChild(canvas); this.resize();
    this.quiet = this.reducedMotion || !!this.win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.particles = createCelebrationParticles(this.random, this.quiet).sort((a,b) => a.layer-b.layer);
    this.start = this.win.performance.now(); this.render(this.start);
  }
  render(now) {
    if (!this.canvas) return;
    const elapsed = Math.max(0, now-this.start), duration = this.quiet ? 1500 : CELEBRATION_DURATION;
    if (elapsed >= duration) { this.clear(); return; }
    const c = this.ctx, w = this.width, h = this.height, seconds = elapsed/1000;
    c.clearRect(0,0,w,h);
    // A softly fading halo stays at the vehicle, never a screen-sized flash.
    const fade = this.quiet ? Math.min(1, (duration-elapsed)/650) : Math.max(0,1-seconds/1.8);
    c.globalAlpha = fade * .36;
    c.drawImage(this.sprite('bokeh',0),w*.5-180,h*.45-180,360,360);
    if (this.quiet) {
      for (let i=0;i<6;i++) { c.globalAlpha = fade*.7; c.drawImage(this.sprite('glint',0),w*(.35+i*.06)-16,h*(.3+(i%2)*.04)-26,32,52); }
    } else {
      for (const p of this.particles) {
        const age = seconds-p.delay; if (age<0) continue;
        const depth = .72+p.layer*.22;
        const x = w*(p.side<0 ? .08 : .92) + w*p.speedX*age + Math.sin(age*2.2+p.phase)*22*age;
        const y = h*.87 + h*(p.speedY*age + p.gravity*age*age*.5);
        if (y>h+140 || x < -160 || x>w+160) continue;
        const opacity = clamp((5.1-seconds)/1.2,0,1) * (p.layer===0 ? .54 : .95);
        c.save(); c.translate(x,y); c.rotate(p.phase + age*p.spin);
        // Foil turns edge-on and exposes its light/dark folds. Streamers keep a readable curl.
        c.scale(p.kind==='foil' ? .23+Math.abs(Math.cos(age*3+p.phase))*.77 : 1,1);
        c.globalAlpha = opacity;
        const size = p.size*depth, stretch = p.kind==='streamer' ? 3 : p.kind==='glint' ? 1 : 1.5;
        c.drawImage(this.sprite(p.kind,p.color),-size/2,-size*stretch/2,size,size*stretch);
        c.restore();
      }
    }
    c.globalAlpha = 1;
    this.frame = this.win.requestAnimationFrame(this._tick);
  }
  clear() {
    if (this.frame !== null) this.win?.cancelAnimationFrame(this.frame);
    this.frame = null; this.canvas?.remove(); this.canvas = null; this.ctx = null; this.particles = [];
  }
  dispose() {
    this.clear(); this.disposed = true; this.sprites.clear();
    this.doc?.removeEventListener('visibilitychange', this._onHidden);
    this.win?.removeEventListener('resize', this._onResize);
  }
}
