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
- Browser smoke testing of the published revision is recorded below after deployment.
- Sirens are original synthesized game sounds, not authentic emergency-service recordings. Engine variety is eight classes, not 22 independent real recordings.
