import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('fixed UI references all point to real elements',()=>{const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));for(const m of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(m[1]),`missing #${m[1]}`);});
test('assembly retains the plus and has no confirmation UI or APIs',()=>{assert.match(html,/id="target"/);assert.doesNotMatch(html,/id="(?:win-dialog|part-tag|fit|toast|hint)"/);assert.doesNotMatch(app,/\b(?:alert|confirm|prompt)\s*\(/);assert.match(app,/state\.installed\.has\(id\)\)\{detachPart\(id\);return;/);});
test('driving exposes all actions and supports cancellation',()=>{for(const id of ['return-garage','steer-left','steer-right','accelerate','brake','speed','lap-count'])assert.ok(html.includes(`id="${id}"`));assert.match(app,/pointercancel/);assert.match(app,/lostpointercapture/);assert.match(app,/window\.addEventListener\('keyup'/);assert.match(app,/if\(driveStart\)\{updateDriveCamera\(true\);return;/);});
test('first gestures unlock music, while context loss disposes sound',()=>{assert.match(app,/document\.addEventListener\('pointerdown',\(\)=>sound\.unlock\(\),\{capture:true\}\)/);assert.match(app,/sound\.dispose\(\);disposed=true;ready=false/);assert.match(app,/sound\.setHidden\(document\.hidden\)/);assert.match(app,/function celebrate\(\)\{sound\.cheer\(\)/);});
