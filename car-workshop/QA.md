# Verification · 2026-11-08 · Rounded garage and mission town

## Passed

- `npm test`: **87 tests passed**, no failures or skipped tests. Covers 22 model templates, 83 real-mesh liveries, service-label geometry, assembly cycles, distinct silhouettes, immutable multi-instance collection, reload and malformed/quota storage behavior, all 22 vehicle mission chains twice, replay, free steering/reverse/collisions, automatic racing checkpoints, audio lifecycle and UI references.
- Syntax validation of every authored JavaScript module.
- Actual CPU-renderer contact sheet of all 22 complete models inspected. Supercar, hatchback, SUV, stepped ambulance, buses and specialty vehicles have distinct shapes. 110 / 120 / TAXI remain visible without texture support.
- Cloud Chromium browser, clearly labeled compatibility rendering: all 22 templates opened with 13–19 parts initially loose and departure hidden. Ambulance assembled through all 16 actual part-button and hand interactions. Final hand-down camera pause tested with rapid consecutive selections.
- Completed ambulance repainted to mint and reloaded from saved parking; a second build of the same template created a separate classic ambulance. Both survived browser reload with separate parking entries. Opening a saved car, driving and returning retained the collection.
- Full ambulance mission completed using actual steering, accelerator, brake and action controls, without teleporting app state: drove to park, picked up the passenger, drove to hospital, delivered passenger, saw completion/celebration and replay button. After timing correction, 2.3-second holds completed each two-second interaction in the tested browser. Forward acceleration, stopped turning, braking, reverse, and return-to-parking also checked.
- Viewport frames at **320×568, 390×844, 768×1024, 844×390, 1440×900**: no horizontal document overflow; final tray item fits fully inside its scroll area; driving controls stay inside the viewport. These are browser-layout checks, not physical devices.
- Native Web Audio analyser regression: music + cheer + engine produced nonzero signal (observed RMS 0.02879, later peak 0.05821); mute produced RMS 0 with no voices or engine/music timer; unmuting and stopping engine restored music with RMS 0.03659 and engine absent. No audio harness errors. This verifies signal and lifecycle, not a human listening assessment.
- Independent UI review found and corrected mission step numbering, the hand-target movement during quick taps, and slow real-time interaction progress caused by the old frame-delta cap. Final applicable tests rerun after fixes.
- Dinosaur root index and dist/index.html retain their original blob hashes. Publication contains only `car-workshop/` changes. Local viewport/audio diagnostic pages are excluded.

## Limits and scope

- Cloud Chromium has WebGL disabled, so actual browser visuals were checked with the CPU compatibility renderer. The WebGL PBR/reflection/shadow path is present but its visual appearance and device performance were not certified here.
- No physical iPad, Safari, real multi-touch hardware or device speakers were available.
- Full browser mission completion was checked for the ambulance. The other 21 vehicle mission chains and replay are covered by deterministic state tests and world-construction checks, not 21 additional manually driven browser walkthroughs.
- This is an original stylized toy world with forgiving movement and building collisions, not a full vehicle physics, traffic or medical simulator. The 22 templates and preset mission chains are finite. Some categories intentionally share gameplay.
- Collections live in this browser's localStorage, not a cloud account. Browser data clearing and private/storage-restricted modes can affect persistence. There is no intentional collection count limit, but browser storage capacity is finite. Damaged saves are protected from automatic overwrite; storage failures show a warning.
- Music and sounds are original procedural synthesis. Explicit mute survives further gestures and background/foreground changes in the current page; audio preference is not persisted across a full reload.
