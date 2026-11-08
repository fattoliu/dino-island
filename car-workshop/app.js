import {createParkingState,stepParking,getParkingInfo,PARKING_SLOTS} from './parking-state.js?v=6';
import * as THREE from './vendor/three.module.min.js';
import {loadArtAssets,textureTown} from './materials.js?v=6';
import {WorkshopCelebration} from './celebration.js?v=6';
import {configureRenderer,addLighting,createEnvironment,setBackdrop} from './visuals.js?v=6';
import {bindSteeringStick} from './touch-controls.js?v=6';
import { VEHICLES, buildVehicle } from './vehicles.js?v=6';
import { WorkshopAudio } from './audio.js?v=6';
import { buildWorld } from './world.js?v=6';
import { createWorldState, stepWorld, restartMission, getMissionTarget, getMissionInfo, BUILDINGS } from './world-state.js?v=6';
import { readFleet, saveFleet, addFinishedCar, changeCarLivery, markCarParked, findCar, STORAGE_KEY } from './fleet-state.js?v=6';
import { buildGarage } from './garage.js?v=6';
import { SoftwareRenderer } from './software-renderer.js?v=6';
import { createGame, selectPart, installPart, removePart, disassembleAll, isComplete, isNearTarget, clamp } from './game-state.js?v=6';
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const container = $('scene');
let renderer, scene, camera, lighting, garage, vehicle, state, currentId, partMap = new Map(), selectedGhost, selectionRing, winTimer, road, driveState, ready = false, disposed = false;
let width = innerWidth, height = innerHeight, theta = .69, phi = .95, distance = 17.5;
let focus = new THREE.Vector3(0,1,0), cameraDirty = true, driveStart = 0, frame = 0, lastTime = 0, lastRender = 0;
let pointers = new Map(), gesture = null, pinch = null, animations = [], thumbnails = new Map(), thumbnailQueue = [], thumbBusy = false;
const sound = new WorkshopAudio();
const celebration = new WorkshopCelebration({reducedMotion});
let parkingState=null,parkingGuidance=false;
let steeringStick=null, analogSteer=0, analogDrive=0, thumbnailRenderer=null, thumbnailEnvironment=null, targetTap=null;
const driveInput = {throttle:0,brake:0,steer:0,action:0,reverse:0};
let storage; try { storage=window.localStorage; } catch { storage=null; }
const fleetRead=readFleet(storage,VEHICLES);
let fleet=fleetRead.fleet, currentLivery='default', currentInstanceId=null, cameraTween=null, catalogFilter='全部', parkedModels=[], storageWritable=fleetRead.canSave, lastSaveOk=fleetRead.ok;
const heldControls = new Map(), driveKeys = new Set();
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), v3 = new THREE.Vector3(), clock = new THREE.Clock();
const targets = new THREE.Group();
const geometryCache = new Map();
const modelWorld = new THREE.Group();
const selectedMaterial = new THREE.MeshBasicMaterial({color:0xffdf80,wireframe:true,transparent:true,opacity:.23,depthWrite:false});
const circleMaterial = new THREE.MeshBasicMaterial({color:0xffd968,transparent:true,opacity:.75,depthWrite:false,side:THREE.DoubleSide});
function init() {
 scene = new THREE.Scene();setBackdrop(scene);
 camera = new THREE.PerspectiveCamera(43,width/height,.08,100);
 try { renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false}); } catch { renderer = new SoftwareRenderer(); const note=document.createElement('span'); note.className='compatibility-note'; note.textContent='兼容画质'; note.title='此浏览器未启用 WebGL。兼容模式保留真实三维拼装，但不支持金属反射和精细阴影。'; document.querySelector('.top-actions').prepend(note); }
 renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.6)); renderer.setSize(width,height);
 configureRenderer(renderer);
 renderer.domElement.setAttribute('aria-label','可触摸操作的三维车库。单指旋转，双指移动和缩放，拖动零件进行拼装。');
 container.prepend(renderer.domElement);
 lighting=addLighting(scene);
 if(!renderer.isSoftwareRenderer)scene.environment=createEnvironment(renderer).texture;
 garage = buildGarage(scene); road = buildWorld(scene);textureTown(road.root); scene.add(modelWorld); scene.add(targets);
 selectionRing = new THREE.Mesh(new THREE.TorusGeometry(.45,.018,8,48),circleMaterial);selectionRing.rotation.x=-Math.PI/2;selectionRing.visible=false;scene.add(selectionRing);
 buildCatalog();setupPointers();setupButtons();loadVehicle(VEHICLES[0].id);updateParking();showStorageStatus(fleetRead.ok);resize();window.addEventListener('resize',resize);$('loading').remove();ready = true;
 requestAnimationFrame(render);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pauseInput();releaseDriving();if(driveState)driveState.speed=0;thumbnailEnvironment?.dispose();thumbnailRenderer?.dispose();celebration.dispose();sound.dispose();disposed=true;ready=false;const div=document.createElement('div');div.id='context-alert';div.className='context-alert';div.textContent='车库休息一下。请刷新页面重新打开。';container.append(div);});
}
function disposeVehicle(v) { if(!v)return; const geos=new Set(),mats=new Set();v.group.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);});geos.forEach(g=>g.dispose());mats.forEach(m=>{if(!m.map?.userData.sharedAsset)m.map?.dispose();m.dispose();}); }
function loadVehicle(id, options={}) {
 clearTimeout(winTimer); pauseInput();stopDrive();clearSelection();cameraTween=null;animations=[];clearConfetti();
 if(vehicle){modelWorld.remove(vehicle.group);disposeVehicle(vehicle);}
 currentId=id;sound.setVehicle(id);updateSirenButton();currentLivery=options.liveryId||'default';currentInstanceId=options.instanceId||null;
 vehicle=buildVehicle(id,currentLivery);modelWorld.add(vehicle.group);partMap=new Map();state=createGame(vehicle.parts);
 vehicle.parts.forEach(p=>{p.target=p.target.clone();p.baseQuaternion=p.group.quaternion.clone();p.group.traverse(o=>{o.userData.partId=p.id;});p.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(p.group);p.size=bounds.getSize(new THREE.Vector3());p.localMinY=bounds.min.y-p.target.y;p.group.userData.partId=p.id;partMap.set(p.id,p);});
 layoutParts();
 if(options.assembled){for(const p of vehicle.parts){state.installed.add(p.id);p.group.position.copy(p.target);}state.won=true;}
 else if(options.installed){for(const id of options.installed){const p=partMap.get(id);if(p){state.installed.add(id);p.group.position.copy(p.target);}}state.won=isComplete(state);}
 $('vehicle-name').textContent=VEHICLES.find(x=>x.id===id).name;buildPartsTray();updateUI();homeView();
 document.querySelectorAll('.vehicle-card').forEach(b=>b.classList.toggle('selected',b.dataset.vehicle===id));cameraDirty=true;
}
function layoutParts() {
 // Real parts remain life-sized. Pack them on both sides of the central work bay.
 const pieces=[...vehicle.parts].sort((a,b)=>b.size.x*b.size.z-a.size.x*a.size.z);
 let lanes=[{x:-6.4,z:-3.5,depth:0},{x:-6.4,z:3.5,depth:0}], side=0;
 for(const p of pieces) {
  let lane=lanes[side]; const w=Math.max(.75,p.size.x)+.45,d=Math.max(.7,p.size.z);
  if(lane.x+w>6.7){lane.x=-6.4;lane.z+=Math.sign(lane.z)*(lane.depth+.7);lane.depth=0;}
  const pos=new THREE.Vector3(lane.x+w/2,-p.localMinY+.07,lane.z);
  lane.x+=w;lane.depth=Math.max(lane.depth,d);p.loose=pos;p.group.position.copy(pos);p.group.quaternion.copy(p.baseQuaternion);p.group.visible=true;
  side=1-side;
 }
 vehicle.group.updateMatrixWorld(true);
}
function partSymbol(p) {const n=p.name;return /轮|履带/.test(n)?'◉':/发动|引擎|动力/.test(n)?'⚙':/灯|警/.test(n)?'✦':/窗|舱|驾驶/.test(n)?'▱':/吊|臂|梯/.test(n)?'↗':/座/.test(n)?'▰':/门/.test(n)?'▯':/桶|铲|斗/.test(n)?'▾':'▱';}
function buildPartsTray(){const tray=$('parts');tray.replaceChildren();vehicle.parts.forEach(p=>{const b=document.createElement('button');b.className='part-button';b.dataset.part=p.id;b.title=p.name;b.setAttribute('aria-label',p.name+'，未装好');b.innerHTML=`<span class="check"></span><span class="part-symbol" aria-hidden="true">${partSymbol(p)}</span><span>${p.name}</span>`;b.onclick=()=>choose(p.id,true);tray.append(b);});}
function updateUI(){if(!state)return;for(const b of $('parts').children){const fitted=state.installed.has(b.dataset.part);b.classList.toggle('installed',fitted);b.classList.toggle('selected',state.selected===b.dataset.part);b.querySelector('.check').textContent=fitted?'✓':'';b.setAttribute('aria-label',partMap.get(b.dataset.part).name+(fitted?'，点一下拆下':'，未装好'));b.setAttribute('aria-pressed',state.selected===b.dataset.part);}
 const p=partMap.get(state.selected);$('target').hidden=!p||state.installed.has(p.id)||!!driveStart;$('drive').hidden=!isComplete(state)||!!driveStart;
 $('assembly-progress').textContent=`${state.installed.size} / ${state.ids.size} 已装好`;
 $('selection-label').textContent=p?`把「${p.name}」放到小手指的位置`:isComplete(state)?'拼好啦！已停进收藏，可以换涂装或出发':'选一个零件，开始拼装';
 $('target').setAttribute('aria-label',p?`把${p.name}装到小手指的位置`:'安装选中零件');cameraDirty=true;
}
function clearSelection(){
 const previous=partMap.get(state?.selected);
 if(previous&&!state.installed.has(previous.id)&&!gesture?.drag&&!animations.some(a=>a.id===previous.id))previous.group.position.copy(previous.loose);
 if(selectedGhost){targets.remove(selectedGhost);selectedGhost=null;}if(selectionRing)selectionRing.visible=false;if(state)state.selected=null;$('target').hidden=true;
}
function aimAtPart(p){
 const old={theta,phi,distance,focus:focus.clone()};
 const z=p.target.z, x=p.target.x;
 theta=Math.abs(z)>.35?(z>0?.58:Math.PI-.58):(x<-.7?-.85:.85);phi=p.target.y>1.8?.72:1.02;
 const body=new THREE.Box3(new THREE.Vector3(-vehicle.dimensions.length/2,0,-vehicle.dimensions.width/2),new THREE.Vector3(vehicle.dimensions.length/2,vehicle.dimensions.height,vehicle.dimensions.width/2));
 const loose=new THREE.Box3().setFromObject(p.group);body.union(loose);const mountingFocus=p.target.clone().multiplyScalar(.65).add(new THREE.Vector3(0,vehicle.dimensions.height*.45,0).multiplyScalar(.35));frameBounds(body,1.03,mountingFocus);
 const destination={theta,phi,distance,focus:focus.clone()};
 if(reducedMotion)return;
 theta=old.theta;phi=old.phi;distance=old.distance;focus.copy(old.focus);updateCamera();
 let delta=destination.theta-old.theta;while(delta>Math.PI)delta-=Math.PI*2;while(delta< -Math.PI)delta+=Math.PI*2;destination.theta=old.theta+delta;
 cameraTween={from:old,to:destination,start:performance.now(),duration:780};
}
function choose(id,fromTray=false){if(!partMap.has(id)||driveStart)return;if(state.installed.has(id)){detachPart(id);return;}clearSelection();selectPart(state,id);const p=partMap.get(id);
 selectedGhost=p.group.clone(true);selectedGhost.position.copy(p.target);selectedGhost.quaternion.copy(p.baseQuaternion);selectedGhost.traverse(o=>{if(o.isMesh){o.material=selectedMaterial;o.castShadow=false;o.receiveShadow=false;}});targets.add(selectedGhost);selectionRing.visible=true;
 // A finger drag keeps a fixed camera plane. A click or tray selection gets the guided view.
 if(fromTray)aimAtPart(p);
 updateUI();projectTarget();
}
function fitPart(id){const p=partMap.get(id);if(!p||!installPart(state,id))return;animations=animations.filter(x=>x.id!==id);animations.push({id,object:p.group,from:p.group.position.clone(),to:p.target.clone(),start:performance.now(),duration:reducedMotion?1:480});clearSelection();sound.fit(true);updateUI();if(isComplete(state)&&!state.won){state.won=true;rememberFinishedCar();celebrate();$('announcement').textContent='拼好啦！可以开进阳光小镇了。';const completedState=state;clearTimeout(winTimer);winTimer=setTimeout(()=>{if(state===completedState&&isComplete(state)&&!driveStart)homeView();},520);}}
function detachPart(id){clearTimeout(winTimer);const p=partMap.get(id);if(!p||!removePart(state,id))return;stopDrive();clearSelection();animations=animations.filter(x=>x.id!==id);animations.push({id,object:p.group,from:p.group.position.clone(),to:p.loose.clone(),start:performance.now(),duration:reducedMotion?1:500});updateUI();sound.fit(false);}
function resetParts(){clearTimeout(winTimer);stopDrive();clearSelection();pauseInput();currentInstanceId=null;disassembleAll(state);animations=[];vehicle.parts.forEach(p=>animations.push({id:p.id,object:p.group,from:p.group.position.clone(),to:p.loose.clone(),start:performance.now(),duration:reducedMotion?1:700}));updateUI();theta=.69;phi=.96;const bounds=new THREE.Box3();for(const p of vehicle.parts){bounds.expandByPoint(p.loose.clone().addScaledVector(p.size,.5));bounds.expandByPoint(p.loose.clone().addScaledVector(p.size,-.5));}frameBounds(bounds);$('announcement').textContent='零件已拆开。';}
function updateCamera(){camera.position.set(focus.x+distance*Math.sin(phi)*Math.sin(theta),focus.y+distance*Math.cos(phi),focus.z+distance*Math.sin(phi)*Math.cos(theta));camera.position.y=Math.max(.35,camera.position.y);camera.lookAt(focus);camera.updateMatrixWorld();cameraDirty=true;}
function frameBounds(bounds,padding=1.04,mountingFocus=null){
 const center=mountingFocus||bounds.getCenter(new THREE.Vector3());focus.copy(center);focus.y=Math.max(.7,focus.y);
 const direction=new THREE.Vector3(Math.sin(phi)*Math.sin(theta),Math.cos(phi),Math.sin(phi)*Math.cos(theta));
 const right=new THREE.Vector3(Math.cos(theta),0,-Math.sin(theta));const up=new THREE.Vector3().crossVectors(direction,right).normalize();
 const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;
 const safeX=Math.max(.55,1-160/width),safeY=Math.max(.4,1-240/height);let needed=9;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const d=new THREE.Vector3(x,y,z).sub(focus);needed=Math.max(needed,d.dot(direction)+Math.max(Math.abs(d.dot(right))/(tanH*safeX),Math.abs(d.dot(up))/(tanV*safeY))*padding);}
 distance=clamp(needed,10,42);updateCamera();
}
function homeView(){cameraTween=null;if(driveStart){updateDriveCamera(true);return;}theta=.69;phi=.96;vehicle.group.updateMatrixWorld(true);frameBounds(new THREE.Box3().setFromObject(vehicle.group));}
function resize(){width=container.clientWidth;height=container.clientHeight;if(!renderer)return;renderer.setSize(width,height);const oldAspect=camera.aspect;camera.aspect=width/height;camera.updateProjectionMatrix();if(driveStart){updateDriveCamera(true);return;}if(vehicle&&Math.abs(Math.log(camera.aspect/oldAspect))>.15)homeView();else updateCamera();}
function rayAt(x,y){const r=renderer.domElement.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);raycaster.setFromCamera(ndc,camera);return raycaster.ray;}
function pick(x,y){rayAt(x,y);const hit=raycaster.intersectObjects(vehicle.parts.map(p=>p.group),true)[0];return hit?{id:hit.object.userData.partId,point:hit.point}:null;}
function projectTarget(){if(!state?.selected||state.installed.has(state.selected))return null;const p=partMap.get(state.selected);const pos=p.target.clone(); // Anchor target at the center of the actual removable assembly.
 pos.project(camera);const x=(pos.x*.5+.5)*width,y=(-pos.y*.5+.5)*height;$('target').style.left=x+'px';$('target').style.top=y+'px';$('target').style.visibility=pos.z>1||x<0||x>width||y<0||y>height?'hidden':'';return{x,y};}
function pan(dx,dy){cameraTween=null;const scale=distance*.00165;const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);const forward=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);focus.addScaledVector(right,-dx*scale);focus.addScaledVector(forward,dy*scale);focus.x=clamp(focus.x,-11,11);focus.y=clamp(focus.y,.35,7);focus.z=clamp(focus.z,-9,10);updateCamera();}
function cancelDrag(){if(gesture?.drag){const p=partMap.get(gesture.part);if(p)p.loose.copy(p.group.position);}gesture=null;$('target').classList.remove('near');}
function pauseInput(){cancelDrag();pointers.clear();pinch=null;targetTap=null;}
function setupPointers(){const c=renderer.domElement;c.addEventListener('contextmenu',e=>e.preventDefault());
 c.addEventListener('pointerdown',e=>{if(!ready||driveStart)return;e.preventDefault();cameraTween=null;c.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size>=2){cancelDrag();const [a,b]=[...pointers.values()];pinch={dist:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};return;}
 const hit=e.button===0?pick(e.clientX,e.clientY):null;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,part:hit?.id,drag:false,pan:e.button===2||e.shiftKey};
 if(hit&&!state.installed.has(hit.id)){choose(hit.id);const p=partMap.get(hit.id);const normal=camera.getWorldDirection(new THREE.Vector3());gesture.plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,p.group.position);gesture.offset=p.group.position.clone().sub(rayAt(e.clientX,e.clientY).intersectPlane(gesture.plane,new THREE.Vector3())||p.group.position);gesture.drag=true;animations=animations.filter(x=>x.id!==hit.id);}
 });
 c.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y),x=(a.x+b.x)/2,y=(a.y+b.y)/2;distance=clamp(distance*pinch.dist/Math.max(d,5),3.3,42);pan(x-pinch.x,y-pinch.y);pinch={dist:d,x,y};return;}
 if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture.x=e.clientX;gesture.y=e.clientY;if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>5)gesture.moved=true;if(!gesture.moved)return;
 if(gesture.drag){const p=partMap.get(gesture.part),pos=rayAt(e.clientX,e.clientY).intersectPlane(gesture.plane,new THREE.Vector3());if(pos){pos.add(gesture.offset);pos.x=clamp(pos.x,-11.5,11.5);pos.z=clamp(pos.z,-9,10);pos.y=clamp(pos.y,-p.localMinY+.04,8);p.group.position.copy(pos);const t=projectTarget();$('target').classList.toggle('near',p.group.position.distanceTo(p.target)<1.25||t&&isNearTarget(e.clientX,e.clientY,t.x,t.y,65));cameraDirty=true;}}
 else if(gesture.pan)pan(dx,dy);else{theta-=dx*.006;phi=clamp(phi+dy*.005,.12,1.52);updateCamera();}
 });
 const end=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;if(gesture?.id===e.pointerId){const g=gesture;gesture=null;if(e.type==='pointerup'){if(g.drag){const p=partMap.get(g.part),t=projectTarget();if(g.moved&&(p.group.position.distanceTo(p.target)<1.25||t&&isNearTarget(e.clientX,e.clientY,t.x,t.y,65)))fitPart(g.part);else {p.loose.copy(p.group.position);if(!g.moved)aimAtPart(p);}}else if(!g.moved&&g.part)choose(g.part);else if(!g.moved)clearSelection();}else if(g.drag){const p=partMap.get(g.part);p.loose.copy(p.group.position);}$('target').classList.remove('near');updateUI();}if(pointers.size===1&&!gesture){const [id,p]=[...pointers.entries()][0];gesture={id,x:p.x,y:p.y,startX:p.x,startY:p.y,moved:true,part:null,drag:false,pan:false};}};
 c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);c.addEventListener('lostpointercapture',end);c.addEventListener('wheel',e=>{e.preventDefault();if(driveStart)return;cameraTween=null;distance=clamp(distance*Math.exp(e.deltaY*.001),3.3,42);updateCamera();},{passive:false});
 window.addEventListener('blur',()=>{pauseInput();releaseDriving();if(driveState)driveState.speed=0;});document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseInput();releaseDriving();if(driveState)driveState.speed=0;}sound.setHidden(document.hidden);lastTime=performance.now();});
 window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(driveStart){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','a','d','w','s','A','D','W','S','e','E','r','R'].includes(e.key)){e.preventDefault();driveKeys.add(e.key.toLowerCase());updateDrivingInput();}if(e.key==='Escape')returnToGarage();return;}if(e.key==='Escape'){clearSelection();updateUI();}const motion={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]}[e.key];if(motion){e.preventDefault();pan(...motion);}});
 window.addEventListener('keyup',e=>{driveKeys.delete(e.key.toLowerCase());updateDrivingInput();});
 document.addEventListener('pointerdown',()=>sound.unlock(),{capture:true});document.addEventListener('keydown',()=>sound.unlock(),{capture:true});
}

function buildCatalog(){
 for(const category of ['全部',...new Set(VEHICLES.map(v=>v.category))]){const b=document.createElement('button');b.className='catalog-filter';b.setAttribute('role','tab');b.textContent=category;b.setAttribute('aria-selected',category==='全部');b.onclick=()=>{catalogFilter=category;filterCatalog();};$('catalog-filters').append(b);}
 $('catalog-search').addEventListener('input',filterCatalog);
 for(const v of VEHICLES){const b=document.createElement('button');b.className='vehicle-card';b.dataset.vehicle=v.id;b.innerHTML=`<div class="placeholder" data-thumbnail="${v.id}:default" style="color:${v.color}">${v.emoji||'🚗'}</div><strong>${v.name}</strong><small>${v.category} · 可重复拼装</small>`;b.onclick=()=>{loadVehicle(v.id);$('garage-dialog').close();};$('vehicle-grid').append(b);queueThumbnail(v.id);}
}
function filterCatalog(){const query=$('catalog-search').value.trim().toLowerCase();for(const card of $('vehicle-grid').children){const v=VEHICLES.find(v=>v.id===card.dataset.vehicle);card.hidden=!(catalogFilter==='全部'||v.category===catalogFilter)||!`${v.name} ${v.category} ${v.id}`.toLowerCase().includes(query);}for(const tab of $('catalog-filters').children)tab.setAttribute('aria-selected',tab.textContent===catalogFilter);}
function queueThumbnail(id,liveryId='default'){const key=id+':'+liveryId;if(!thumbnails.has(key)&&!thumbnailQueue.includes(key))thumbnailQueue.push(key);return key;}
function applyThumbnails(){for(const el of document.querySelectorAll('[data-thumbnail]')){const url=thumbnails.get(el.dataset.thumbnail);if(url&&el.tagName!=='IMG'){const img=document.createElement('img');img.src=url;img.alt='这辆汽车的三维模型';img.dataset.thumbnail=el.dataset.thumbnail;el.replaceWith(img);}else if(url)el.src=url;}}
async function makeThumbnail(key){if(thumbBusy||!renderer)return;thumbBusy=true;let model;try{const[id,liveryId]=key.split(':');model=buildVehicle(id,liveryId);const thumbScene=new THREE.Scene();thumbScene.background=new THREE.Color('#d0e7ef');thumbScene.environment=scene.environment;addLighting(thumbScene,{shadows:false});thumbScene.add(model.group);const bounds=new THREE.Box3().setFromObject(model.group);const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const cam=new THREE.PerspectiveCamera(35,1.6,.1,60);const max=Math.max(size.x,size.z*1.2,size.y*1.6);cam.position.copy(center).add(new THREE.Vector3(max*.95,max*.66,max*1.15));cam.lookAt(center);let canvas,target;if(renderer.isSoftwareRenderer){const sr=new SoftwareRenderer();sr.setSize(320,200);sr.render(thumbScene,cam);canvas=sr.domElement;}else{if(!thumbnailRenderer){thumbnailRenderer=new THREE.WebGLRenderer({antialias:true,alpha:false});configureRenderer(thumbnailRenderer);thumbnailRenderer.shadowMap.enabled=false;thumbnailRenderer.setPixelRatio(1);thumbnailRenderer.setSize(320,200);thumbnailEnvironment=createEnvironment(thumbnailRenderer);}thumbScene.environment=thumbnailEnvironment.texture;thumbnailRenderer.render(thumbScene,cam);canvas=thumbnailRenderer.domElement;}thumbnails.set(key,canvas.toDataURL('image/webp',.88));applyThumbnails();target?.dispose();}catch(e){console.warn('Thumbnail unavailable',key,e);}finally{renderer.setRenderTarget?.(null);if(model)disposeVehicle(model);thumbBusy=false;cameraDirty=true;}}
function showStorageStatus(ok){$('save-status').textContent=ok?'车辆保存在此浏览器，清除网站数据会移除收藏':'暂时无法保存到此浏览器。车辆本次仍可玩，请勿关闭页面；原存档未覆盖。';$('save-status').classList.toggle('save-warning',!ok);}
function refreshFleet(){if(!lastSaveOk)return;const latest=readFleet(storage,VEHICLES);if(latest.ok){fleet=latest.fleet;if(currentInstanceId&&!findCar(fleet,currentInstanceId))currentInstanceId=null;}else{storageWritable=false;lastSaveOk=false;showStorageStatus(false);}}
function persistFleet(){const result=storageWritable?saveFleet(storage,fleet):{ok:false};lastSaveOk=result.ok;showStorageStatus(result.ok);if(!result.ok)$('announcement').textContent='当前浏览器无法保存收藏，车辆仅在本次打开期间保留。';return result.ok;}
function rememberFinishedCar(){
 refreshFleet();
 if(!currentInstanceId){fleet=addFinishedCar(fleet,currentId,currentLivery,VEHICLES);currentInstanceId=fleet.cars.at(-1).id;}
 else fleet=changeCarLivery(fleet,currentInstanceId,currentLivery,VEHICLES);
 persistFleet();updateParking();
}
function openParkedCar(id,drive=false){const car=findCar(fleet,id);if(!car||!VEHICLES.some(v=>v.id===car.vehicleId))return;loadVehicle(car.vehicleId,{liveryId:car.liveryId,instanceId:car.id,assembled:true});$('parking-dialog').close();if(drive)startDrive();}
function updateParking(){
 $('parking-count').textContent=fleet.cars.length;$('parking-empty').hidden=fleet.cars.length>0;$('parking-grid').replaceChildren();
 for(const [index,car] of [...fleet.cars].reverse().entries()){
 const template=VEHICLES.find(v=>v.id===car.vehicleId);if(!template)continue;
 const livery=template.liveries?.find(l=>l.id===car.liveryId);const card=document.createElement('article');card.className='parked-card';card.dataset.instance=car.id;
 const key=queueThumbnail(car.vehicleId,car.liveryId);card.innerHTML=`<div class="parking-bay"><span class="parking-number">P${fleet.cars.length-index}</span><div class="placeholder" data-thumbnail="${key}">${template.emoji||'🚗'}</div></div><strong>${template.name}</strong><small>${livery?.name||'经典涂装'}${car.lastParkedAt!==undefined?' · 已亲手停妥':''}</small><div class="parked-actions"><button class="parked-open">看看 / 换装</button><button class="parked-drive">出发玩</button></div>`;
 card.querySelector('.parked-open').onclick=()=>openParkedCar(car.id);card.querySelector('.parked-drive').onclick=()=>openParkedCar(car.id,true);$('parking-grid').append(card);
 }applyThumbnails();
}
function openParking(){if(driveStart&&!parkingState?.complete){returnToGarage();return;}refreshFleet();pauseInput();if(driveStart)stopDrive();if(isComplete(state)&&!currentInstanceId)rememberFinishedCar();homeView();updateUI();updateParking();$('parking-dialog').showModal();}
function openLiveries(){if(driveStart){returnToGarage();return;}pauseInput();const template=VEHICLES.find(v=>v.id===currentId);$('livery-options').replaceChildren();for(const livery of template.liveries||[{id:'default',name:'经典涂装',color:template.color}]){const b=document.createElement('button');b.className='livery-option';b.dataset.livery=livery.id;b.setAttribute('aria-pressed',currentLivery===livery.id);const key=queueThumbnail(currentId,livery.id);b.innerHTML=`<div class="placeholder" data-thumbnail="${key}">${template.emoji||'🚗'}</div><span class="livery-swatch" style="background:${livery.color}"></span><strong>${livery.name}</strong>`;b.onclick=()=>{const installed=[...state.installed],instanceId=currentInstanceId;loadVehicle(currentId,{liveryId:livery.id,instanceId,installed});if(instanceId){refreshFleet();if(!currentInstanceId){if(isComplete(state))rememberFinishedCar();}else fleet=changeCarLivery(fleet,currentInstanceId,livery.id,VEHICLES);persistFleet();updateParking();}$('livery-dialog').close();};$('livery-options').append(b);}applyThumbnails();$('livery-dialog').showModal();}
function setupButtons(){for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();$('garage').onclick=()=>{pauseInput();if(driveStart){returnToGarage();return;}$('garage-dialog').showModal();};$('help').onclick=()=>{pauseInput();releaseDriving();if(driveState)driveState.speed=0;$('help-dialog').showModal();};$('target').addEventListener('pointerdown',e=>{cameraTween=null;targetTap={id:e.pointerId,part:state.selected,x:e.clientX,y:e.clientY};$('target').setPointerCapture?.(e.pointerId);});$('target').addEventListener('pointerup',e=>{const tap=targetTap;targetTap=null;if(tap&&tap.id===e.pointerId&&tap.part===state.selected&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<24)fitPart(tap.part);});for(const name of ['pointercancel','lostpointercapture'])$('target').addEventListener(name,()=>{targetTap=null;});$('target').onclick=()=>{if(state.selected)fitPart(state.selected);};$('reset').onclick=resetParts;$('parking').onclick=openParking;$('livery').onclick=openLiveries;$('build-another').onclick=()=>{$('parking-dialog').close();$('garage-dialog').showModal();};$('mission-replay').onclick=()=>{if(driveState){restartMission(driveState);syncMissionUI();}};$('home-view').onclick=homeView;$('zoom-in').onclick=()=>{cameraTween=null;distance=clamp(distance*.84,3.3,42);updateCamera();};$('zoom-out').onclick=()=>{cameraTween=null;distance=clamp(distance/.84,3.3,42);updateCamera();};$('drive').onclick=startDrive;$('return-garage').onclick=returnToGarage;$('sound').onclick=()=>{sound.setEnabled(!sound.enabled);updateSoundButton();};for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
 for(const [id,control] of [['mission-action','action']]){const b=$(id);b.addEventListener('contextmenu',e=>e.preventDefault());b.addEventListener('pointerdown',e=>{if(!driveStart)return;e.preventDefault();b.setPointerCapture(e.pointerId);heldControls.set(e.pointerId,control);updateDrivingInput();});const up=e=>{heldControls.delete(e.pointerId);updateDrivingInput();};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);}
 steeringStick=bindSteeringStick($('steering-stick'),value=>{analogSteer=driveStart?value.steer:0;analogDrive=driveStart?value.drive:0;updateDrivingInput();});
 $('siren').onclick=()=>{sound.setSiren(!sound.sirenEnabled);updateSirenButton();};
 updateSoundButton();updateSirenButton();
}
function updateSirenButton(){const b=$('siren');b.hidden=!sound.hasSiren;b.setAttribute('aria-pressed',String(sound.sirenEnabled));b.setAttribute('aria-label',sound.sirenEnabled?'关闭警笛':'打开警笛');b.innerHTML=`<span aria-hidden="true">◉</span> 警笛${sound.sirenEnabled?'开':'关'}`;}
function updateSoundButton(){const on=sound.enabled;const label=on?'关闭音乐和音效':'开启音乐和音效';$('sound').setAttribute('aria-label',label);$('sound').setAttribute('aria-pressed',on);$('sound').title=label;$('sound').innerHTML=on?'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/></svg>';}
function updateDrivingInput(){
 const values=new Set(heldControls.values());const has=(name,...keys)=>values.has(name)||keys.some(k=>driveKeys.has(k));
 driveInput.throttle=has('throttle','arrowup','w')?1:Math.max(0,analogDrive);
 driveInput.reverse=has('reverse','r')?1:Math.max(0,-analogDrive);
 // Releasing the stick slows safely to rest, even if steering remains held.
 driveInput.brake=has('brake','arrowdown','s',' ')?1:(!driveInput.throttle&&!driveInput.reverse ? .45 : 0);
 driveInput.action=has('action','e')?1:0;
 const left=has('left','arrowleft','a'),right=has('right','arrowright','d');
 driveInput.steer=left||right?Number(right)-Number(left):analogSteer;
 $('mission-action').classList.toggle('pressed',!!driveInput.action);
}
function releaseDriving(){heldControls.clear();driveKeys.clear();analogSteer=0;analogDrive=0;steeringStick?.reset();updateDrivingInput();}
function clearConfetti(){celebration.clear();}
function celebrate(){sound.cheer();celebration.burst();}
function startDrive(){if(!isComplete(state)||driveStart)return;updateParkedModels();clearTimeout(winTimer);clearSelection();pauseInput();releaseDriving();animations=[];vehicle.parts.forEach(p=>{p.group.position.copy(p.target);p.group.quaternion.copy(p.baseQuaternion);});clearConfetti();cameraTween=null;driveState=createWorldState(currentId);parkingState=createParkingState(parkedModels.map((_,i)=>i),vehicle.dimensions);driveState.parkingOccupiedSlots=parkingState.occupiedSlotIds;driveState.dimensions=vehicle.dimensions;parkingGuidance=false;driveStart=performance.now()||1;garage.root.visible=false;road.root.visible=true;setBackdrop(scene,true);camera.far=280;camera.updateProjectionMatrix();document.body.classList.add('driving');$('driving-hud').hidden=false;renderer.domElement.setAttribute('aria-label','三维阳光小镇，摇杆上推前进、下推倒车、左右转向，松手减速，靠近任务地点按住行动按钮。');sound.setMode('drive');sound.startEngine();updateDriveVehicle(0);updateDriveCamera(true);updateUI();}
function stopDrive(){road?.setParkingTarget(null);parkingState=null;parkingGuidance=false;driveStart=0;releaseDriving();driveState=null;sound.stopEngine();sound.setMode('garage');document.body.classList.remove('driving');$('driving-hud').hidden=true;if(garage)garage.root.visible=true;if(road)road.root.visible=false;if(scene){setBackdrop(scene);lighting?.follow();}if(camera){camera.far=100;camera.updateProjectionMatrix();}if(vehicle){vehicle.group.position.set(0,0,0);vehicle.group.rotation.y=0;vehicle.parts.forEach(p=>{if(p.baseQuaternion)p.group.quaternion.copy(p.baseQuaternion);});}if(renderer)renderer.domElement.setAttribute('aria-label','可触摸操作的三维车库。单指旋转，双指移动和缩放，拖动零件进行拼装。');cameraDirty=true;}
function returnToGarage(){if(!driveStart||parkingState?.complete){openParking();return;}parkingGuidance=!parkingGuidance;releaseDriving();$('announcement').textContent=parkingGuidance?'自己开回停车场：跟着地图 P 标记，把车停进绿色空位。':'继续探索小镇，随时可以开回停车场。';syncMissionUI();}
function updateParkedModels(){
 if(!road.setParkedCars)return;
 road.setParkedCars([]);parkedModels.forEach(disposeVehicle);parkedModels=[];
 const recent=fleet.cars.filter(c=>c.id!==currentInstanceId&&VEHICLES.some(v=>v.id===c.vehicleId)).slice(renderer.isSoftwareRenderer?-3:-5);
 for(const c of recent)parkedModels.push(buildVehicle(c.vehicleId,c.liveryId));road.setParkedCars(parkedModels);
}
function drawTownMap(){
 if(!driveState)return;const canvas=$('town-map'),ctx=canvas.getContext('2d'),size=canvas.width,scale=size/120,point=(x,z)=>[(x+60)*scale,(z+60)*scale];
 ctx.fillStyle='#c4eaaa';ctx.fillRect(0,0,size,size);ctx.strokeStyle='#708997';ctx.lineWidth=7*scale;
 for(const n of [-22,0,22]){ctx.beginPath();ctx.moveTo(...point(n,-55));ctx.lineTo(...point(n,55));ctx.stroke();ctx.beginPath();ctx.moveTo(...point(-55,n));ctx.lineTo(...point(55,n));ctx.stroke();}
 for(const b of BUILDINGS){ctx.fillStyle=b.color;const[x,y]=point(b.x-b.w/2,b.z-b.d/2);ctx.fillRect(x,y,b.w*scale,b.d*scale);ctx.strokeStyle='#4c6b80';ctx.lineWidth=.7;ctx.strokeRect(x,y,b.w*scale,b.d*scale);}
 ctx.strokeStyle='#8694bb';ctx.lineWidth=6*scale;ctx.strokeRect(85*scale,9*scale,25*scale,20*scale);ctx.fillStyle='#72c7df';ctx.beginPath();ctx.ellipse(...point(43,42),8*scale,8*scale,0,0,Math.PI*2);ctx.fill();
 const t=getMissionTarget(driveState);if(t&&!driveState.complete){const[x,y]=point(t.x,t.z);ctx.fillStyle='#ffb323';ctx.strokeStyle='#734b00';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.stroke();}
 for(const slot of PARKING_SLOTS){const[x,y]=point(slot.x,slot.z);ctx.fillStyle=parkingState?.occupiedSlotIds.includes(slot.id)?'#687783':'#35d27a';ctx.fillRect(x-2,y-3,4,6);}
 const destination=parkingState?getParkingInfo(parkingState,driveState).slot:null;if(destination){const[x,y]=point(destination.x,destination.z);ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillStyle='#123e2e';ctx.fillText('P',x,y-6);if(parkingGuidance){ctx.strokeStyle='#21a96b';ctx.lineWidth=1.4;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(...point(driveState.x,driveState.z));ctx.lineTo(x,y);ctx.stroke();ctx.setLineDash([]);}}
 const[x,y]=point(driveState.x,driveState.z);ctx.save();ctx.translate(x,y);ctx.rotate(-driveState.heading);ctx.fillStyle='#2053ae';ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-4,-4.5);ctx.lineTo(-2,0);ctx.lineTo(-4,4.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function syncMissionUI(){if(!driveState)return;
 const parking=parkingState?getParkingInfo(parkingState,driveState):null;
 const showParking=parking&&(parkingGuidance||parking.distance<11||parkingState.complete);
 road.setParkingTarget(showParking?parking.slot?.id:null,parkingState?.progress||0);
 $('return-garage').textContent=parkingState?.complete?'✓ 查看停车场':parkingGuidance?'继续探索':'P 开回停车场';
 if(showParking){$('mission-title').textContent=parkingState.complete?'停车成功！':'自己停好小车';$('mission-instruction').textContent=parkingState.complete?(lastSaveOk?'已保存停车记录，可以继续开或查看收藏。':'本次已停好，浏览器暂时无法保存，请勿关闭页面。'):parking.instruction;$('mission-progress').textContent=parkingState.complete?'✓ 安全停妥':parking.progress>0?'停稳中 · '+Math.round(parking.progress*100)+'%':'空位 P'+((parking.slot?.id??0)+1)+' · '+Math.round(parking.distance)+' 米';$('mission-action').hidden=true;$('mission-replay').hidden=true;drawTownMap();return;}
const info=getMissionInfo(driveState);const target=getMissionTarget(driveState);const meters=target?Math.round(Math.hypot(target.x-driveState.x,target.z-driveState.z)):0;
 $('mission-title').textContent=info.title;$('mission-instruction').textContent=info.nearTarget&&Math.abs(driveState.speed)>3&&target?.kind!=='race'?'先刹停小车，再按住行动按钮':info.instruction;
 $('mission-progress').textContent=info.complete?'任务完成！':`${Math.min(info.step,info.total)} / ${info.total} · ${info.nearTarget?'已到达':'距目标 '+meters+' 米'}${info.progress>0?' · '+Math.round(info.progress*100)+'%':''}`;
 $('mission-action').textContent=info.actionLabel||'行动';$('mission-action').disabled=!info.nearTarget||info.complete;$('mission-action').hidden=info.complete||target?.kind==='race';$('mission-replay').hidden=!info.complete;if(info.racing)$('mission-progress').textContent+=` · ${info.seconds.toFixed(1)}秒${info.bestTime!==null?' · 最佳 '+info.bestTime.toFixed(1)+'秒':''}`;drawTownMap();
}
function updateDriveVehicle(dt){if(!driveState)return;const previous=getMissionInfo(driveState);if(parkingState?.complete&&(driveInput.throttle||driveInput.reverse)){parkingState=createParkingState(parkingState.occupiedSlotIds,vehicle.dimensions,parkingState.slotId);parkingGuidance=false;}stepWorld(driveState,driveInput,dt);stepParking(parkingState,driveState,dt);if(parkingState.justParked){releaseDriving();rememberFinishedCar();fleet=markCarParked(fleet,currentInstanceId,parkingState.slotId);persistFleet();updateParking();celebrate();$('announcement').textContent=lastSaveOk?'停好了！停车记录已保存，可以继续开或查看收藏。':'停好了！本次停车已保留，但浏览器暂时无法保存。';}vehicle.group.position.set(driveState.x,.06,driveState.z);vehicle.group.rotation.y=driveState.heading;vehicle.animate?.(driveState.distance*.65,true);sound.updateEngine(Math.min(Math.abs(driveState.speed)/16,1),Math.max(driveInput.throttle,driveInput.reverse));$('speed').textContent=Math.round(Math.abs(driveState.speed)*3.6);$('lap-count').textContent=driveState.laps+1;road.update(driveState,reducedMotion?0:performance.now()/1000);const next=getMissionInfo(driveState);if(!previous.complete&&next.complete){celebrate();$('announcement').textContent='任务完成！可以继续探索，或者回停车场。';}else if(next.step!==previous.step){sound.fit(true);$('announcement').textContent=next.instruction;}syncMissionUI();cameraDirty=true;}
function updateDriveCamera(immediate=false,dt=1/60){if(!driveState)return;const h=driveState.heading;const forward=new THREE.Vector3(Math.cos(h),0,-Math.sin(h));const nearParking=parkingState&&getParkingInfo(parkingState,driveState).distance<14;const behind=nearParking?9:width/height<.9?19:14;const aim=new THREE.Vector3(driveState.x,1.2,driveState.z).addScaledVector(forward,3);const position=new THREE.Vector3(driveState.x,.06,driveState.z).addScaledVector(forward,-behind);position.y=nearParking?16:width/height<.9?11:9;const blend=immediate?1:1-Math.exp(-dt*5);camera.position.lerp(position,blend);focus.lerp(aim,blend);camera.lookAt(focus);camera.updateMatrixWorld();cameraDirty=true;}
function render(now){if(disposed)return;requestAnimationFrame(render);if(document.hidden)return;const dt=Math.min((now-lastTime)/1000,.25);lastTime=now;frame++;
 if(cameraTween&&!driveStart){const t=clamp((now-cameraTween.start)/cameraTween.duration,0,1),e=t*t*(3-2*t),a=cameraTween.from,b=cameraTween.to;theta=THREE.MathUtils.lerp(a.theta,b.theta,e);phi=THREE.MathUtils.lerp(a.phi,b.phi,e);distance=THREE.MathUtils.lerp(a.distance,b.distance,e);focus.lerpVectors(a.focus,b.focus,e);updateCamera();if(t===1)cameraTween=null;}
 animations=animations.filter(a=>{const t=clamp((now-a.start)/a.duration,0,1),e=1-Math.pow(1-t,3);a.object.position.lerpVectors(a.from,a.to,e);if(!reducedMotion)a.object.position.y+=Math.sin(t*Math.PI)*.35;cameraDirty=true;return t<1;});
 if(driveStart&&!document.querySelector('dialog[open]')){updateDriveVehicle(dt);updateDriveCamera(false,dt);}

 if(state?.selected){const p=partMap.get(state.selected);if(p&&!state.installed.has(p.id)){if(!gesture?.drag&&!animations.some(a=>a.id===p.id)){p.group.position.copy(p.loose);if(!reducedMotion)p.group.position.y+=.12+Math.sin(now*.0025)*.1;}selectionRing.position.set(p.group.position.x,.06,p.group.position.z);const s=Math.max(.7,Math.min(2,p.size.x));selectionRing.scale.set(s,s,s);selectionRing.material.opacity=reducedMotion?.65:.5+Math.sin(now*.004)*.22;}projectTarget();}
 if(!driveStart)garage?.update?.(now/1000,camera);
 if(cameraDirty||state?.selected||now-lastRender>200){if(driveState)lighting.follow(driveState.x,driveState.z,true);renderer.render(scene,camera);cameraDirty=false;lastRender=now;}
 // Generate one genuine 3D catalog image at a time, after first interactive frame.
 if(frame>8&&thumbnailQueue.length&&!gesture&&!animations.length&&!driveStart&&!thumbBusy){makeThumbnail(thumbnailQueue.shift());}
}
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY&&lastSaveOk){refreshFleet();updateParking();}});
window.addEventListener('pagehide',()=>{releaseDriving();sound.setHidden(true);});window.addEventListener('pageshow',()=>sound.setHidden(document.hidden));
loadArtAssets().then(results=>{try{init();if(results.some(r=>r.status==='rejected')){const note=document.createElement('span');note.className='compatibility-note';note.textContent='部分贴图未加载';note.title='网络恢复后刷新，可重新加载完整美术素材。';document.querySelector('.top-actions').prepend(note);}}catch(error){console.error(error);const l=$('loading');l.className='error-panel';l.innerHTML='<strong>车库需要浏览器的 3D 功能</strong><span>请用最新版 Safari 或 Chrome 打开。若仍无法启动，请关闭省电模式并刷新。</span>';document.querySelectorAll('.hud button').forEach(b=>b.disabled=true);}});
