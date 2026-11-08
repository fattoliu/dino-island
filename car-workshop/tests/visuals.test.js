import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import {VISUALS,configureRenderer,addLighting,setBackdrop} from '../visuals.js';
import {VEHICLES,buildVehicle} from '../vehicles.js';
import {CLASSIC_IDS} from '../classic-vehicles.js';
import {buildWorld} from '../world.js';

test('color preserving display transform and moderate fill apply consistently',()=>{
 const renderer={shadowMap:{}};configureRenderer(renderer);
 assert.equal(renderer.outputColorSpace,THREE.SRGBColorSpace);
 assert.equal(renderer.toneMapping,THREE.NeutralToneMapping);assert.equal(renderer.toneMappingExposure,1);
 assert.equal(renderer.shadowMap.enabled,true);assert.ok(VISUALS.ambient<VISUALS.key*.35);assert.ok(VISUALS.fill<VISUALS.key*.15);
 const cpu={shadowMap:{},isSoftwareRenderer:true};configureRenderer(cpu);assert.equal(cpu.shadowMap.enabled,false);
});
test('sun and target follow distant vehicles without changing light direction',()=>{
 const scene=new THREE.Scene(),rig=addLighting(scene);const offset=rig.key.position.clone().sub(rig.key.target.position);
 rig.follow(46,-47,true);scene.updateMatrixWorld(true);
 assert.ok(rig.key.target.position.distanceTo(new THREE.Vector3(46,0,-47))<.05);
 assert.ok(rig.key.position.clone().sub(rig.key.target.position).distanceTo(offset)<1e-6);
 assert.equal(rig.key.shadow.camera.right,24);assert.ok(scene.children.includes(rig.key.target));
 rig.follow();assert.ok(rig.key.target.position.length()<.01);assert.equal(rig.key.shadow.camera.right,17);
 assert.equal(rig.key.castShadow,true);assert.equal(rig.key.shadow.mapSize.x,2048);
});
test('nearby vehicles are never faded by the garage fog',()=>{
 const scene=new THREE.Scene();setBackdrop(scene);assert.ok(scene.fog.near>42);assert.equal(scene.background.getHexString(),'62b8dc');setBackdrop(scene,true);assert.ok(scene.fog.near>=140);
});
test('all original ten detailed sculptures are restored without removing new templates',()=>{
 assert.equal(CLASSIC_IDS.size,10);assert.equal(VEHICLES.length,22);
 for(const id of CLASSIC_IDS)assert.equal(buildVehicle(id).group.userData.style,'classic');
 for(const v of VEHICLES){const m=buildVehicle(v.id);m.group.traverse(o=>{if(o.isMesh){assert.equal(o.castShadow,true);assert.equal(o.receiveShadow,true);for(const n of o.geometry.attributes.normal.array)assert.ok(Number.isFinite(n));}});}
});
test('town buildings and props cast shadows; flat ground remains a receiver',()=>{
 const scene=new THREE.Scene(),world=buildWorld(scene);let casts=0,receives=0,flatReceivers=0;
 world.root.traverse(o=>{if(!o.isMesh)return;if(o.castShadow)casts++;if(o.receiveShadow)receives++;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;if(b.max.y<=.5&&b.max.y-b.min.y<.25&&!o.castShadow&&o.receiveShadow)flatReceivers++;});
 assert.ok(casts>25,`${casts} casters`);assert.ok(receives>casts);assert.ok(flatReceivers>0);world.dispose();
});
