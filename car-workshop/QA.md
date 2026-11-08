# Verification · 2026-11-08

## Passed

- `npm test`: 23 tests covering ten unique requested model categories, valid finite geometry and assembled bounds, 13–17 detachable parts per vehicle, default zero installed pieces, complete assembly/disassembly/reset cycles, invalid and duplicate operations, and forgiving snap thresholds.
- Syntax validation for every JavaScript module.
- Browser interaction in compatibility rendering: direct 3D wheel dragging and snapping; tap-select and assisted installation; full G-class and Ferrari assembly; completion dialog; start driving; individual removal; reset; all ten vehicle switches with zero installed pieces after each switch.
- Browser visual checks of garage, all ten actual model thumbnails, Ferrari assembled close view and freely rotated view.
- 768 × 1024 sized-frame portrait layout inspection, plus desktop landscape layout. This tests CSS/camera layout, not physical-device touch behavior.
- Read-only review found and fixed stale completion timers, drive/completion race, offscreen pieces in portrait, resize framing, and one-pointer continuation after a pinch.
- CPU fallback tests: initial background, near-plane clipping, wireframe, CanvasTexture sampling, and all ten actual vehicles with garage. Warm CPU rendering was approximately 70–104ms per 800 × 500 frame in the test environment; hardware/browser performance varies.

## Not verified here

- The cloud browser reports disabled WebGL graphics, so its visual review used the explicitly labeled compatibility renderer. The production WebGL 2 path uses Three.js PBR materials, environment reflections, ACES tone mapping and shadows, but those GPU effects were not visually verified on this machine.
- A physical iPad/Safari and real multi-touch gestures were not available. The implementation uses standard pointer events, pointer capture, two-pointer pinch/pan and iPad-oriented layouts. Do not interpret sized-frame testing as a real iPad test.
- These are original medium-detail, brand-inspired assembly models, not licensed manufacturer scans or photorealistic replicas.

The original dinosaur game's root index and dist files are unchanged.
