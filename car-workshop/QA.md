# Brighter garage and single-joystick verification · 2026-11-08

- `npm test`: 116 tests passed, zero failures/skips on the combined working tree. The joystick tests dispatch cancelable events through native Node EventTarget and the actual installed pointer handlers (Node has no native DOM PointerEvent).
- Both axes, all diagonal quadrants, proportional input, circular boundaries, deadzone, independent second fingers, release/cancel/lost capture, document release/cancel, blur, hidden tab, resize/re-measurement, capture failure and disposal are covered. Production world-physics tests verify safe stopping and continuous reversal through zero in both directions.
- One visible touch joystick replaces the pedals. Up means forward, down reverse, left/right steering. Neutral longitudinal input applies automatic slowing. Keyboard controls, sirens, missions and persistence IDs are retained. Accessibility exposes the control as a group with separate read-only axis meters, rather than incorrectly calling a two-axis joystick one horizontal slider.
- `node --check` of all authored modules and `git diff --check` passed.
- `tests/browser-joystick.html` is a reproducible real-DOM synthetic PointerEvent fixture. It imports production joystick and world physics; capture is stubbed because untrusted events cannot own hardware pointers. Executed in Chromium: 11/11 pointer fixture checks passed. The updated single-joystick `tests/browser-layout.html` passed 5/5 viewport checks (320×568, 390×844, 768×1024, 844×390 and 1440×900). No physical device certification is claimed.

## Current browser and visual checks

- Real browser mouse holds on the actual game joystick drove forward, drove diagonally while turning, and reversed. After each release, speed returned to 0 km/h and both axis meters returned to 0. Returned to parking successfully.
- Truck assembled to 16/16 and saved as the fourth local test vehicle. One rapid target click needed retry during the assembly run; ordinary retry succeeded. The assembly input logic was not changed in this revision.
- Reviewed a production CPU-rendered contact sheet of all 22 vehicles against the preceding revision. On these fixed-camera model samples, dark pixels (previous luminance below 45/255) rose about 20%, model pixels overall about 5%, and painted midtones about 4%. No new clipped highlights in these samples. These are CPU sample measurements, not a promise about WebGL output.
- WebGL configuration raises hemisphere, reverse fill and environment moderately, with the same exposure (1), key intensity (2.7), sRGB/Neutral transform and shadow-map setup. Garage floor/bay colors are slightly brighter; vehicle paint palettes and geometry are unchanged. Rubber/chassis bases are modestly lifted. Two new tests exercise actual CPU rasterized pixels for directional contrast and saturated, unclipped color.
- Browser console confirms WebGL is disabled here. Actual GPU PBR appearance, reflections, shadow maps and device performance remain unverified. No CSS brightness/saturation overlay was used.

## Historical verification before the single-joystick revision

### Crisp vehicles, directional light and touch driving

### Passed on the previous revision

- `npm test`: 109 tests passed, zero failures/skips. Includes all 22 templates/83 liveries, assembly cycles, persistent collection, every mission chain, world construction, eight engine profiles, three distinct sirens, cleanup/mute and analog gesture behavior.
- Syntax checks of all authored JavaScript modules; `git diff --check`.
- Actual CPU-rendered contact sheets compared with both the previous rounded version and the original detailed version. Original ten detailed sculptures restored; twelve newer templates retained with smaller bevels. All service labels remain geometric.
- Structural lighting tests: Neutral/sRGB output, reduced fill/environment, camera-relative shadow focus at distant town positions, shadow-casting buildings/props and receiving ground, clear garage fog distance. Thumbnail renderer uses its own GPU environment and the same display transform instead of reading an un-tone-mapped render target.
- Eleven deterministic pointer tests cover analog range/deadzone, independent second finger, release, cancellation, lost capture, blur, hidden tab, resize, capture failure and listener disposal.
- Dinosaur root index and dist are unchanged. Storage key and vehicle/livery IDs are unchanged.

## Not yet certified

- Actual WebGL appearance/performance is not certified: this cloud browser disables WebGL; launching an independent Chromium also fails under environment process/socket restrictions. The CPU screenshots do not certify PBR, reflections or real shadow-map quality.
- No physical iPad, Safari, hardware multi-touch or listening assessment is available.
- Sirens are original synthesized game sounds, not authentic emergency-service recordings. Engine variety is eight classes, not 22 independent real recordings.

## Published browser checks

- Pages deployment for `e5bb2bf39ccd88b022a5600892eeb53de451cf7f` succeeded. The public page serves `app.js?v=5.1`.
- Real browser flow: police assembled and saved; drove into town; held analog steering with forward input, observed turning and movement; braked to zero; reversed; switched siren off; returned to the parking lot; reloaded and recovered the saved police; opened its livery picker.
- Repeated rapid part-button/target clicks on the final revision: 14 of 14 G-Class parts installed without missed taps, with collection count increasing from one to two. Entering the town again shows the correct vehicle mission.
- Production Web Audio graph rendered by real Chromium OfflineAudioContext: **20/20 signal checks passed**. The three siren contours, continued scheduling, all eight distinct engine-class pitches and zero output after global mute/siren-off were measured from PCM samples. This is not a subjective listening test. Reproduce at `tests/browser-audio.html`.
- Static browser layout fixtures at 320×568, 390×844, 768×1024, 844×390 and 1440×900 check touch controls against real CSS. Driving controls have at least 44px touch dimensions, remain inside the viewport and do not overlap each other. Reproduce at `tests/browser-layout.html`. These are CSS layout fixtures, not physical-device testing.
