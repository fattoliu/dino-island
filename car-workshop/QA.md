# Verification · 2026-11-08 · Music and road update

## Passed

- `npm test`: all 40 tests passed. Covers ten original vehicle models and complete assembly cycles; road throttle, coasting, braking, steering bounds, large-vehicle guardrail clearance, laps and timestep stability; audio gesture unlock, mute persistence, engine singleton, visibility suspension and disposal; fixed UI IDs and removal of confirmation prompts.
- Syntax validation for every authored JavaScript module.
- Cloud Chromium, compatibility rendering: real wheel drag and snap; plus-target installation; full G-class and crane assembly; visible nonmodal confetti; direct installed-piece removal; reassembly; immediate departure; repeated departure/return; reset; vehicle switching.
- Actual road interaction: held accelerator reaches 57 km/h; simultaneous accelerator and right input changes lane position; lap counter advances; brake stops at 0 km/h. The car is stationary before input and driving continues beyond the previous eight-second limit.
- Desktop landscape, 768 × 1024 portrait frame and 390 × 844 phone-sized frame checked visually. Narrow-frame driving buttons are 56–68 CSS px wide and 68–92 px tall, all inside the viewport, with no horizontal overflow. These are layout checks, not physical-device tests.
- A separate local-only diagnostic used native browser Web Audio and an analyser: music, crowd/applause and engine produced nonzero samples (combined observed peak RMS 0.05873); mute yielded RMS 0 and no active voices; explicit mute survived unlock and hidden/visible changes; stopEngine removed the engine while music continued. No application errors were reported. The diagnostic and viewport helper pages are not published.
- Independent review caught and fixed small-resize chase-camera jumps and continued engine/input after a WebGL context loss.

## Limits

- Cloud Chromium has WebGL disabled here, so screenshots and gameplay were inspected with the clearly labeled CPU compatibility renderer. WebGL materials, reflections, shadows and performance were not visually tested here.
- No physical iPad, Safari or real multi-touch hardware was available. Pointer capture, pointer cancellation, keyboard handling, CSS-sized layouts and synchronous gesture audio unlock were checked, but this is not a real iOS test.
- Audio synthesis was verified by real browser signal measurement and lifecycle tests, not a human listening review or a device loudspeaker check. Music, crowd whoops/applause and engine effects are original procedural audio, not recordings.
- Driving uses an explicitly labeled curve/road assist: throttle and brake control travel, left/right change road position, and guardrails bound the vehicle. It is a playful road-driving mode, not a full automotive physics simulator.

Only `car-workshop/` changes. The original dinosaur game's root index and dist files are unchanged.
