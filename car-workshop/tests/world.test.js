import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldState,stepWorld,restartMission,getMissionTarget,getMissionInfo,VEHICLE_MISSIONS,collides} from '../world-state.js';
import {buildWorld} from '../world.js';
import * as THREE from '../vendor/three.module.min.js';

test('every vehicle has a reachable interactive mission and replay',()=>{
 assert.equal(Object.keys(VEHICLE_MISSIONS).length,22);
 for(const id of Object.keys(VEHICLE_MISSIONS)){
  const state=createWorldState(id);
  for(let run=0;run<2;run++){
   let guard=0;
   while(!state.complete&&guard++<300){const target=getMissionTarget(state);assert.equal(collides(target.x,target.z),false,`${id} destination blocked`);state.x=target.x;state.z=target.z;state.speed=0;stepWorld(state,{action:1},.25);}
   assert.ok(state.complete,id);assert.equal(getMissionInfo(state).complete,true);assert.equal(state.progress,1);assert.ok(state.completedAt!==null);restartMission(state);assert.equal(state.step,0);assert.equal(state.complete,false);
  }
 }
});
test('missions require proximity, a slow speed and held action',()=>{const s=createWorldState('ambulance');for(let i=0;i<50;i++)stepWorld(s,{action:1},.25);assert.equal(s.step,0);const t=getMissionTarget(s);s.x=t.x;s.z=t.z;for(let i=0;i<50;i++)stepWorld(s,{},.25);assert.equal(s.step,0);stepWorld(s,{action:1},.25);assert.ok(s.actionProgress>0);});
test('free driving and reverse are not constrained to a track',()=>{const s=createWorldState();for(let i=0;i<40;i++)stepWorld(s,{throttle:1},.1);assert.ok(s.x>20);assert.equal(s.z,0);const h=s.heading;stepWorld(s,{steer:1},.2);assert.notEqual(s.heading,h);const rev=createWorldState();for(let i=0;i<20;i++)stepWorld(rev,{reverse:1},.1);assert.ok(rev.x<0);assert.ok(rev.speed<0);});
test('building and map limits prevent driving through solid walls',()=>{const s=createWorldState();s.x=-12;s.z=-22;s.heading=-Math.PI/2;for(let i=0;i<50;i++)stepWorld(s,{throttle:1},.1);assert.equal(collides(s.x,s.z),false);assert.ok(s.z<-18);s.x=54;s.z=0;s.heading=0;for(let i=0;i<50;i++)stepWorld(s,{throttle:1},.1);assert.ok(s.x<=55);});
test('updates are deterministic and cap suspended frames',()=>{const a=createWorldState('ferrari'),b=createWorldState('ferrari');for(let i=0;i<30;i++){stepWorld(a,{throttle:1,steer:.1},1/60);stepWorld(b,{throttle:1,steer:.1},1/60);}assert.deepEqual(a,b);const c=createWorldState();stepWorld(c,{throttle:1},100);assert.ok(c.distance<1);stepWorld(c,{throttle:NaN},NaN);assert.ok(Number.isFinite(c.x));});
test('world constructs without DOM and all missions update and dispose',()=>{const scene=new THREE.Scene(),w=buildWorld(scene);assert.ok(w.root.children.length>20);for(const id of Object.keys(VEHICLE_MISSIONS)){const s=createWorldState(id);w.update(s,0);s.complete=true;w.update(s,1);}w.dispose();assert.equal(scene.children.length,0);});
test('race gates trigger at racing speed without an action button and record best time',()=>{const s=createWorldState('ferrari');let t=getMissionTarget(s);s.x=t.x;s.z=t.z;for(let i=0;i<5;i++)stepWorld(s,{action:1},.25);assert.equal(s.step,1);assert.equal(s.raceStarted,true);while(!s.complete){t=getMissionTarget(s);s.x=t.x;s.z=t.z;s.speed=10;stepWorld(s,{throttle:1},.016);}assert.equal(s.laps,1);assert.ok(s.bestTime>0);const best=s.bestTime;restartMission(s);assert.equal(s.progress,0);assert.equal(s.bestTime,best);});
test('parking shows five snapshots with one driving bay reserved and never disposes caller-owned cars',()=>{const scene=new THREE.Scene(),w=buildWorld(scene),models=Array.from({length:8},()=>({group:new THREE.Group()}));let disposed=0;for(const m of models){const geometry=new THREE.BoxGeometry(1,1,1);geometry.addEventListener('dispose',()=>disposed++);m.group.add(new THREE.Mesh(geometry));}assert.deepEqual(w.parkingCenter,{x:-11,z:-36.5});assert.equal(w.setParkedCars(models),5);assert.equal(models[0].group.parent,null);assert.ok(models[7].group.parent);const container=models[7].group.parent.parent;assert.equal(container.visible,true);assert.equal(w.setParkedCars([]),0);assert.equal(container.visible,false);assert.equal(models[7].group.parent,null);assert.equal(disposed,0);w.setParkedCars(models);w.dispose();assert.equal(disposed,0);assert.equal(models[7].group.parent,null);});
