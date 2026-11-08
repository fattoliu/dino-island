# Verification · 2026-11-08 · Crisp vehicles, directional light and touch driving

## Passed on this revision

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
