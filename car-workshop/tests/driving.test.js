import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import {createDriveState,stepDrive,trackPose,TRACK} from '../driving-state.js';
import {buildRoad} from '../road.js';
const close=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
function run(state,input,seconds){for(let t=0;t<Math.round(seconds*60);t++)stepDrive(state,input,1/60);return state;}
test('starts stopped at finish line with +X forward and guided steering',()=>{
 const s=createDriveState();assert.equal(s.guided,true);close(s.x,0);close(s.z,0);close(s.heading,0);close(s.speed,0);
 run(s,{},5);close(s.distance,0);close(s.laps,0);
});
test('throttle advances along the asphalt; brakes stop without reversing',()=>{
 const s=run(createDriveState(),{throttle:1},5);assert.ok(s.distance>40);assert.equal(s.speed,TRACK.maxSpeed);
 run(s,{brake:1},2);assert.equal(s.speed,0);const d=s.distance;run(s,{brake:1},10);assert.equal(s.distance,d);
});
test('right and left steering work while rails safely bound all four vehicle corners',()=>{
 const s=createDriveState();run(s,{throttle:1,steer:1},15);assert.equal(s.lane,TRACK.laneLimit);
 // Conservative 8 x 3.4 truck envelope, wider and longer than each assembled model.
 for(const steer of [1,-1])for(let t=0;t<1200;t++){
   stepDrive(s,{throttle:1,steer},1/60);
   for(const longitudinal of [-4,4])for(const lateral of [-1.7,1.7]){
     const x=s.x+longitudinal*Math.cos(s.heading)+lateral*Math.sin(s.heading);
     const z=s.z-longitudinal*Math.sin(s.heading)+lateral*Math.cos(s.heading);
     const radius=Math.hypot(x,z+TRACK.radius);
     assert.ok(radius>TRACK.radius-TRACK.width/2&&radius<TRACK.radius+TRACK.width/2);
   }
 }
 assert.equal(s.lane,-TRACK.laneLimit);
});
test('complete laps are counted exactly and pose loops continuously',()=>{
 const s=createDriveState();s.distance=TRACK.length-.01;s.speed=10;stepDrive(s,{},1/60);assert.equal(s.laps,1);
 const p=trackPose(0,2),q=trackPose(TRACK.length,2);close(p.x,q.x);close(p.z,q.z);
 const a=trackPose(TRACK.length/4);close(a.x,TRACK.radius);close(a.z,-TRACK.radius);close(a.heading,Math.PI/2);
});
test('steering does not slide a parked car and finite safeguards reject invalid input',()=>{
 const s=createDriveState();run(s,{steer:1},2);close(s.lane,0);
 for(const dt of [NaN,Infinity,-3,0,100])stepDrive(s,{throttle:NaN,brake:Infinity,steer:-Infinity},dt);
 for(const key of ['x','z','heading','speed','distance','laps','lane','progress'])assert.ok(Number.isFinite(s[key]));
 assert.equal(s.speed,0);assert.equal(s.distance,0);
});
test('small and large frames produce equivalent acceleration',()=>{
 const a=createDriveState(),b=createDriveState();stepDrive(a,{throttle:1,steer:1},.25);
 run(b,{throttle:1,steer:1},.25);close(a.distance,b.distance);close(a.speed,b.speed);close(a.lane,b.lane);
});
test('outdoor scene is hidden on creation, batched, finite and disposable',()=>{
 const scene=new THREE.Scene(),road=buildRoad(scene);assert.equal(road.root.visible,false);assert.equal(road.root.parent,scene);
 assert.ok(road.root.children.length<40);let triangles=0;
 road.root.traverse(o=>{if(!o.isMesh)return;triangles+=o.geometry.attributes.position.count/3;for(const key of ['position','normal'])for(const n of o.geometry.attributes[key].array)assert.ok(Number.isFinite(n));assert.ok(o.geometry.boundingSphere.radius>0);});
 assert.ok(triangles<12000);road.dispose();assert.equal(scene.children.length,0);
});
