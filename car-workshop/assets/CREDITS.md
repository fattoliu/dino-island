# Original art and material provenance

Created for Little Garage on 2026-11-08. No third-party vehicle meshes, brands, logos, stock images or downloaded texture libraries were incorporated in this revision.

## Raster images

The following original images were generated with OpenAI's built-in image-generation tool for this project, then format-encoded to WebP (quality 88) without changing their contents. They are AI-generated artwork, not photographs, commissioned human paintings, material scans or third-party CC0 assets. No third-party attribution license is being claimed or invented. Use is subject to the applicable OpenAI terms; these files are not separately declared public domain. See https://openai.com/policies/terms-of-use/ .

- `alpine-mural.webp`: 2172 × 724 panoramic gouache-style alpine road, tiny unbranded orange off-road car and cream workshop. Mounted as an actual image on the garage back wall. Brief: warm ochre/cream/teal, painterly brush marks, no text, logo or watermark.
- `workshop-materials.webp`: 1254 × 1254 atlas with four quadrants: poured concrete, fine aggregate asphalt, honey oak and warm plaster. Brief: evenly lit flat diffuse material textures, no objects, labels or shadows.
- `vehicle-materials.webp`: automotive material atlas with pearl-white microflake paint, pale brushed aluminum, grey patterned tire rubber and pale leather. Brief: four equal texture quadrants, uniform lighting, no branded components or logos.

`materials.js` extracts eight 512 × 512 shared textures and one 1536 × 512 mural at runtime. Vehicle components get real UV coordinates, base-color maps and subtle height/bump relief; paint gets a WebGL clear-coat material. Geometry and detachable components remain project-authored toy models. This is a material/artwork improvement, not a replacement with professionally sculpted production vehicle assets.

## Celebration and sound

`celebration.js` draws original metallic ribbon, streamer, highlight and bokeh sprites once into small canvases, then reuses them. It is procedurally painted raster art, not photographed confetti or licensed particle footage. Original synthesized applause/voice-like cheering is joined by a three-chord fanfare. These sounds are synthesis, not human or real-vehicle recordings.

## Existing dependencies

Three.js 0.171.0 is MIT-licensed; its full license is retained at `../vendor/THREE-LICENSE.txt`. Existing original geometry, geometric emergency-service labels and keyboard/touch controls remain in place. Vehicle IDs are retained for save compatibility; their ID strings are not claims of manufacturer licensing or affiliation.
