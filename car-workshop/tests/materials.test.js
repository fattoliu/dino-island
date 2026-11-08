import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';
import {ART_ASSETS,artTexture,projectMaterialUV,applySurface} from '../materials.js?v=6';
import {VEHICLES,buildVehicle} from '../vehicles.js';
test('all original raster assets are local, real WebP files below mobile transfer budget',()=>{
 let bytes=0;for(const url of Object.values(ART_ASSETS)){const data=readFileSync(new URL(url));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');bytes+=data.length;}assert.ok(bytes<1.5e6);
});
test('shared materials reuse one texture and map/bump are real texture references',()=>{const a=artTexture('paint'),b=artTexture('paint');assert.equal(a,b);assert.equal(a.userData.sharedAsset,true);const m=applySurface(new THREE.MeshStandardMaterial(),'metal');assert.equal(m.map,artTexture('metal'));assert.equal(m.bumpMap,m.map);assert.ok(m.bumpScale>0);});
test('every vehicle carries finite UVs and actual raster surface assignments',()=>{
 for(const v of VEHICLES){const m=buildVehicle(v.id);let paints=0,tires=0;m.group.traverse(o=>{if(!o.isMesh)return;const uv=o.geometry.attributes.uv;assert.equal(uv.count,o.geometry.attributes.position.count);assert.ok([...uv.array].every(Number.isFinite));if(o.material.userData.surface==='paint')paints++;if(o.material.userData.surface==='rubber')tires++;});assert.ok(paints>0,v.id);assert.ok(tires>0,v.id);}
});
test('UV projection does not change shape, normals, component IDs or material colors',()=>{const g=new THREE.BoxGeometry(2,3,4),p=[...g.attributes.position.array],n=[...g.attributes.normal.array];projectMaterialUV(g,.5);assert.deepEqual([...g.attributes.position.array],p);assert.deepEqual([...g.attributes.normal.array],n);});
test('production modules share the same versioned texture cache',()=>{for(const path of ['app.js','garage.js','vehicles.js','classic-vehicles.js']){const s=readFileSync(new URL('../'+path,import.meta.url),'utf8');assert.match(s, /from '\.\/materials\.js\?v=6'/);}});
