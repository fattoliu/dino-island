import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,selectPart,installPart,removePart,disassembleAll,isComplete,isNearTarget,clamp} from '../game-state.js';
import {VEHICLES,buildVehicle} from '../vehicles.js';
import * as THREE from '../vendor/three.module.min.js';
test('22 distinct original vehicle templates with contextual livery options',()=>{
 assert.equal(VEHICLES.length,22);assert.equal(new Set(VEHICLES.map(v=>v.id)).size,22);
 for(const id of ['gclass','landcruiser','bmw','ferrari','truck','fire','police','taxi','crane','excavator','ambulance','bus','schoolbus','minibus','pickup','van','camper','garbage','mixer','tractor','compact','icecream'])assert.ok(VEHICLES.some(v=>v.id===id));
 for(const v of VEHICLES){assert.ok(v.emoji);assert.ok(v.category);assert.equal(v.liveries[0].id,'default');assert.equal(v.liveries[0].color,v.color);assert.ok(v.liveries.length>=3);assert.equal(new Set(v.liveries.map(l=>l.id)).size,v.liveries.length);}
});
test('important service labels use geometry and livery fallbacks stay deterministic',()=>{
 for(const [id,label] of [['police','110'],['ambulance','120'],['taxi','TAXI']]){const m=buildVehicle(id);assert.deepEqual(m.group.userData.labels,[label]);let maps=0;m.group.traverse(o=>{if(o.isMesh&&o.material.map)maps++;});assert.equal(maps,0);}
 for(const v of VEHICLES){const m=buildVehicle(v.id,v.liveries[1].id);assert.equal(m.group.userData.liveryId,v.liveries[1].id);assert.equal(buildVehicle(v.id,'missing').group.userData.liveryId,'default');}
 assert.equal(buildVehicle('unknown').group.userData.vehicleId,'gclass');
});
for (const v of VEHICLES) {
 test(`${v.id}: valid original 3D geometry, meaningful detachable components`,()=>{const model=buildVehicle(v.id);assert.ok(model.group.isGroup);assert.ok(model.parts.length>=12);assert.equal(new Set(model.parts.map(p=>p.id)).size,model.parts.length);let meshes=0,triangles=0;model.group.updateMatrixWorld(true);model.group.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.count>0);for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value));triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});assert.ok(meshes<130,`${meshes} excessive meshes`);assert.ok(triangles>5000);assert.ok(triangles<40000);for(const p of model.parts){assert.ok(p.group.isGroup);assert.ok(p.target.isVector3);assert.ok(p.group.position.distanceTo(p.target)<.001);assert.ok(p.name.length>1);} const box=new THREE.Box3().setFromObject(model.group);assert.ok(box.max.y<5.5);assert.ok(box.min.y>-.1);});
 test(`${v.id}: starts detached, assembles, disassembles, and restarts`,()=>{const model=buildVehicle(v.id),s=createGame(model.parts);assert.equal(s.installed.size,0);assert.equal(isComplete(s),false);for(const p of model.parts){assert.equal(selectPart(s,p.id),true);assert.equal(installPart(s,p.id),true);assert.equal(installPart(s,p.id),false);}assert.ok(isComplete(s));s.won=true;assert.ok(removePart(s,model.parts[0].id));assert.equal(s.won,false);assert.equal(removePart(s,'invalid'),false);assert.equal(installPart(s,'invalid'),false);disassembleAll(s);assert.equal(s.installed.size,0);assert.equal(s.selected,null);});
}
test('snap radius and camera bounds',()=>{assert.ok(isNearTarget(60,60,100,100,65));assert.equal(isNearTarget(0,0,100,100,65),false);assert.equal(clamp(-1,.1,1.5),.1);assert.equal(clamp(99,3.3,32),32);});
test('empty catalog state never completes',()=>assert.equal(isComplete(createGame()),false));

test('alternate liveries paint the actual meshes, not just catalog chips',()=>{
 for(const v of VEHICLES){for(const l of v.liveries){const m=buildVehicle(v.id,l.id),colors=new Set();m.group.traverse(o=>{if(o.isMesh)colors.add('#'+o.material.color.getHexString());});assert.ok(colors.has(l.color.toLowerCase()),`${v.id}/${l.id} paint missing`);assert.equal(m.group.userData.liveryId,l.id);}}
});
test('coupe, supercar, SUV and compact retain distinct silhouettes',()=>{
 const bounds=id=>{const m=buildVehicle(id);return m.dimensions;};
 assert.ok(bounds('ferrari').height<bounds('bmw').height);
 assert.ok(bounds('compact').length<bounds('gclass').length);
 assert.ok(bounds('bus').length>bounds('minibus').length);
});
