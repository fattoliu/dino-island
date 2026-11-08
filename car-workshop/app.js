import * as THREE from './vendor/three.module.min.js';
import { VEHICLES, buildVehicle } from './vehicles.js?v=3';
import { WorkshopAudio } from './audio.js?v=3';
import { buildRoad } from './road.js?v=3';
import { createDriveState, stepDrive } from './driving-state.js?v=3';
import { buildGarage } from './garage.js?v=3';
import { SoftwareRenderer } from './software-renderer.js?v=3';
import { createGame, selectPart, installPart, removePart, disassembleAll, isComplete, isNearTarget, clamp } from './game-state.js?v=3';
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const container = $('scene');
let renderer, scene, camera, garage, vehicle, state, currentId, partMap = new Map(), selectedGhost, selectionRing, winTimer, road, driveState, ready = false, disposed = false;
let width = innerWidth, height = innerHeight, theta = .69, phi = .95, distance = 17.5;
let focus = new THREE.Vector3(0,1,0), cameraDirty = true, driveStart = 0, confetti = [], frame = 0, lastTime = 0, lastRender = 0;
let pointers = new Map(), gesture = null, pinch = null, animations = [], thumbnails = new Map(), thumbnailQueue = [], thumbBusy = false;
const sound = new WorkshopAudio();
const driveInput = {throttle:0,brake:0,steer:0};
const heldControls = new Map(), driveKeys = new Set();
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), v3 = new THREE.Vector3(), clock = new THREE.Clock();
const targets = new THREE.Group();
const geometryCache = new Map();
const modelWorld = new THREE.Group();
const selectedMaterial = new THREE.MeshBasicMaterial({color:0xffdf80,wireframe:true,transparent:true,opacity:.23,depthWrite:false});
const circleMaterial = new THREE.MeshBasicMaterial({color:0xffd968,transparent:true,opacity:.75,depthWrite:false,side:THREE.DoubleSide});
function init() {
 scene = new THREE.Scene(); scene.background = new THREE.Color('#bfcfc9'); scene.fog = new THREE.Fog('#bfcfc9',29,60);
 camera = new THREE.PerspectiveCamera(43,width/height,.08,100);
 try { renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false}); } catch { renderer = new SoftwareRenderer(); const note=document.createElement('span'); note.className='compatibility-note'; note.textContent='兼容画质'; note.title='此浏览器未启用 WebGL。兼容模式保留真实三维拼装，但不支持金属反射和精细阴影。'; document.querySelector('.top-actions').prepend(note); }
 renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.6)); renderer.setSize(width,height);
 renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
 renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.16;
 renderer.domElement.setAttribute('aria-label','可触摸操作的三维车库。单指旋转，双指移动和缩放，拖动零件进行拼装。');
 container.prepend(renderer.domElement);
 scene.add(new THREE.HemisphereLight('#e6f3ff','#9a8a6e',2.4));
 const sun = new THREE.DirectionalLight('#fff2d5',4.0); sun.position.set(6,14,9); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-12,right:12,top:11,bottom:-11,near:1,far:35}); sun.shadow.normalBias = .028; sun.shadow.bias = -.0001; scene.add(sun);
 const fill = new THREE.DirectionalLight('#c6efff',1.5); fill.position.set(-8,6,-5); scene.add(fill);
 if (!renderer.isSoftwareRenderer) { const env = new THREE.Scene(); env.background = new THREE.Color('#b7c8cc');
 for (const [w,h,d,x,y,z,c,k] of [[14,4,.2,0,7,5,'#fff6e8',3],[.2,6,10,-7,3,0,'#d3f3ff',2],[8,3,.2,0,4,-7,'#e5f2ff',2],[8,.1,8,0,9,0,'#ffffff',3]]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:c})); m.material.color.multiplyScalar(k);m.position.set(x,y,z);env.add(m);
 }
 const pmrem = new THREE.PMREMGenerator(renderer); const envMap=pmrem.fromScene(env,.08);scene.environment=envMap.texture;pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();}); }
 garage = buildGarage(scene); road = buildRoad(scene); scene.add(modelWorld); scene.add(targets);
 selectionRing = new THREE.Mesh(new THREE.TorusGeometry(.45,.018,8,48),circleMaterial);selectionRing.rotation.x=-Math.PI/2;selectionRing.visible=false;scene.add(selectionRing);
 buildCatalog();setupPointers();setupButtons();loadVehicle(VEHICLES[0].id);resize();window.addEventListener('resize',resize);$('loading').remove();ready = true;
 requestAnimationFrame(render);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pauseInput();releaseDriving();if(driveState)driveState.speed=0;sound.dispose();disposed=true;ready=false;const div=document.createElement('div');div.id='context-alert';div.className='context-alert';div.textContent='车库休息一下。请刷新页面重新打开。';container.append(div);});
}
function disposeVehicle(v) { if(!v)return; const geos=new Set(),mats=new Set();v.group.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);});geos.forEach(g=>g.dispose());mats.forEach(m=>{m.map?.dispose();m.dispose();}); }
function loadVehicle(id) {
 clearTimeout(winTimer); pauseInput();stopDrive();clearSelection();animations=[];confetti.forEach(x=>{scene.remove(x);x.geometry.dispose();x.material.dispose();});confetti=[];
 if(vehicle){modelWorld.remove(vehicle.group);disposeVehicle(vehicle);} currentId=id;vehicle=buildVehicle(id);modelWorld.add(vehicle.group);partMap=new Map();state=createGame(vehicle.parts);
 vehicle.parts.forEach(p=>{p.target=p.target.clone();p.baseQuaternion=p.group.quaternion.clone();p.group.traverse(o=>{o.userData.partId=p.id;});p.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(p.group);p.size=bounds.getSize(new THREE.Vector3());p.localMinY=bounds.min.y-p.target.y;p.group.userData.partId=p.id;partMap.set(p.id,p);});
 layoutParts();$('vehicle-name').textContent=VEHICLES.find(x=>x.id===id).name;buildPartsTray();updateUI();homeView();
 document.querySelectorAll('.vehicle-card').forEach(b=>b.classList.toggle('selected',b.dataset.vehicle===id));
 cameraDirty=true;
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
 const p=partMap.get(state.selected);$('target').hidden=!p||state.installed.has(p.id)||!!driveStart;$('drive').hidden=!isComplete(state)||!!driveStart;cameraDirty=true;}
function clearSelection(){if(selectedGhost){targets.remove(selectedGhost);selectedGhost=null;}if(selectionRing)selectionRing.visible=false;if(state)state.selected=null;$('target').hidden=true;}
function choose(id,fromTray=false){if(!partMap.has(id)||driveStart)return;if(state.installed.has(id)){detachPart(id);return;}clearSelection();selectPart(state,id);const p=partMap.get(id);if(!state.installed.has(id)){selectedGhost=p.group.clone(true);selectedGhost.position.copy(p.target);selectedGhost.quaternion.copy(p.baseQuaternion);selectedGhost.traverse(o=>{if(o.isMesh){o.material=selectedMaterial;o.castShadow=false;o.receiveShadow=false;}});targets.add(selectedGhost);selectionRing.visible=true;}
 if(fromTray){const bounds=new THREE.Box3().setFromObject(p.group);const assembled=new THREE.Box3(new THREE.Vector3(-vehicle.dimensions.length/2,0,-1.6),new THREE.Vector3(vehicle.dimensions.length/2,vehicle.dimensions.height,1.6));bounds.union(assembled);frameBounds(bounds,1.12);}
 updateUI();}
function fitPart(id){const p=partMap.get(id);if(!p||!installPart(state,id))return;animations=animations.filter(x=>x.id!==id);animations.push({id,object:p.group,from:p.group.position.clone(),to:p.target.clone(),start:performance.now(),duration:reducedMotion?1:480});clearSelection();sound.fit(true);updateUI();if(isComplete(state)&&!state.won){state.won=true;celebrate();$('announcement').textContent='拼好啦！可以开上公路了。';const completedState=state;clearTimeout(winTimer);winTimer=setTimeout(()=>{if(state===completedState&&isComplete(state)&&!driveStart)homeView();},520);}}
function detachPart(id){clearTimeout(winTimer);const p=partMap.get(id);if(!p||!removePart(state,id))return;stopDrive();clearSelection();animations=animations.filter(x=>x.id!==id);animations.push({id,object:p.group,from:p.group.position.clone(),to:p.loose.clone(),start:performance.now(),duration:reducedMotion?1:500});updateUI();sound.fit(false);}
function resetParts(){clearTimeout(winTimer);stopDrive();clearSelection();pauseInput();disassembleAll(state);animations=[];vehicle.parts.forEach(p=>animations.push({id:p.id,object:p.group,from:p.group.position.clone(),to:p.loose.clone(),start:performance.now(),duration:reducedMotion?1:700}));updateUI();theta=.69;phi=.96;const bounds=new THREE.Box3();for(const p of vehicle.parts){bounds.expandByPoint(p.loose.clone().addScaledVector(p.size,.5));bounds.expandByPoint(p.loose.clone().addScaledVector(p.size,-.5));}frameBounds(bounds);$('announcement').textContent='零件已拆开。';}
function updateCamera(){camera.position.set(focus.x+distance*Math.sin(phi)*Math.sin(theta),focus.y+distance*Math.cos(phi),focus.z+distance*Math.sin(phi)*Math.cos(theta));camera.position.y=Math.max(.35,camera.position.y);camera.lookAt(focus);camera.updateMatrixWorld();cameraDirty=true;}
function frameBounds(bounds,padding=1.04){
 const center=bounds.getCenter(new THREE.Vector3());focus.copy(center);focus.y=Math.max(.7,focus.y);
 const direction=new THREE.Vector3(Math.sin(phi)*Math.sin(theta),Math.cos(phi),Math.sin(phi)*Math.cos(theta));
 const right=new THREE.Vector3(Math.cos(theta),0,-Math.sin(theta));const up=new THREE.Vector3().crossVectors(direction,right).normalize();
 const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;
 const safeX=Math.max(.55,1-160/width),safeY=Math.max(.4,1-240/height);let needed=9;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const d=new THREE.Vector3(x,y,z).sub(focus);needed=Math.max(needed,d.dot(direction)+Math.max(Math.abs(d.dot(right))/(tanH*safeX),Math.abs(d.dot(up))/(tanV*safeY))*padding);}
 distance=clamp(needed,10,42);updateCamera();
}
function homeView(){if(driveStart){updateDriveCamera(true);return;}theta=.69;phi=.96;vehicle.group.updateMatrixWorld(true);frameBounds(new THREE.Box3().setFromObject(vehicle.group));}
function resize(){width=container.clientWidth;height=container.clientHeight;if(!renderer)return;renderer.setSize(width,height);const oldAspect=camera.aspect;camera.aspect=width/height;camera.updateProjectionMatrix();if(driveStart){updateDriveCamera(true);return;}if(vehicle&&Math.abs(Math.log(camera.aspect/oldAspect))>.15)homeView();else updateCamera();}
function rayAt(x,y){const r=renderer.domElement.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);raycaster.setFromCamera(ndc,camera);return raycaster.ray;}
function pick(x,y){rayAt(x,y);const hit=raycaster.intersectObjects(vehicle.parts.map(p=>p.group),true)[0];return hit?{id:hit.object.userData.partId,point:hit.point}:null;}
function projectTarget(){if(!state?.selected||state.installed.has(state.selected))return null;const p=partMap.get(state.selected);const pos=p.target.clone(); // Anchor target at the center of the actual removable assembly.
 pos.project(camera);const x=(pos.x*.5+.5)*width,y=(-pos.y*.5+.5)*height;$('target').style.left=x+'px';$('target').style.top=y+'px';$('target').style.visibility=pos.z>1||x<0||x>width||y<0||y>height?'hidden':'';return{x,y};}
function pan(dx,dy){const scale=distance*.00165;const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);const forward=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);focus.addScaledVector(right,-dx*scale);focus.addScaledVector(forward,dy*scale);focus.x=clamp(focus.x,-11,11);focus.y=clamp(focus.y,.35,7);focus.z=clamp(focus.z,-9,10);updateCamera();}
function cancelDrag(){if(gesture?.drag){const p=partMap.get(gesture.part);if(p)p.loose.copy(p.group.position);}gesture=null;$('target').classList.remove('near');}
function pauseInput(){cancelDrag();pointers.clear();pinch=null;}
function setupPointers(){const c=renderer.domElement;c.addEventListener('contextmenu',e=>e.preventDefault());
 c.addEventListener('pointerdown',e=>{if(!ready||driveStart)return;e.preventDefault();c.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
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
 const end=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;if(gesture?.id===e.pointerId){const g=gesture;gesture=null;if(e.type==='pointerup'){if(g.drag){const p=partMap.get(g.part),t=projectTarget();if(g.moved&&(p.group.position.distanceTo(p.target)<1.25||t&&isNearTarget(e.clientX,e.clientY,t.x,t.y,65)))fitPart(g.part);else p.loose.copy(p.group.position);}else if(!g.moved&&g.part)choose(g.part);else if(!g.moved)clearSelection();}else if(g.drag){const p=partMap.get(g.part);p.loose.copy(p.group.position);}$('target').classList.remove('near');updateUI();}if(pointers.size===1&&!gesture){const [id,p]=[...pointers.entries()][0];gesture={id,x:p.x,y:p.y,startX:p.x,startY:p.y,moved:true,part:null,drag:false,pan:false};}};
 c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);c.addEventListener('lostpointercapture',end);c.addEventListener('wheel',e=>{e.preventDefault();if(driveStart)return;distance=clamp(distance*Math.exp(e.deltaY*.001),3.3,42);updateCamera();},{passive:false});
 window.addEventListener('blur',()=>{pauseInput();releaseDriving();if(driveState)driveState.speed=0;});document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseInput();releaseDriving();if(driveState)driveState.speed=0;}sound.setHidden(document.hidden);lastTime=performance.now();});
 window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(driveStart){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','a','d','w','s','A','D','W','S'].includes(e.key)){e.preventDefault();driveKeys.add(e.key.toLowerCase());updateDrivingInput();}if(e.key==='Escape')returnToGarage();return;}if(e.key==='Escape'){clearSelection();updateUI();}const motion={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]}[e.key];if(motion){e.preventDefault();pan(...motion);}});
 window.addEventListener('keyup',e=>{driveKeys.delete(e.key.toLowerCase());updateDrivingInput();});
 document.addEventListener('pointerdown',()=>sound.unlock(),{capture:true});document.addEventListener('keydown',()=>sound.unlock(),{capture:true});
}

function buildCatalog(){for(const [index,v] of VEHICLES.entries()){const b=document.createElement('button');b.className='vehicle-card';b.dataset.vehicle=v.id;b.innerHTML=`<div class="placeholder" style="color:${v.color||'#32685d'}">${['🚙','🚙','🏎','🏎','🚛','🚒','🚓','🚕','🏗','🚜'][index]}</div><strong>${v.name}</strong><small>${v.category||'我的拼装车'}</small>`;b.onclick=()=>{loadVehicle(v.id);$('garage-dialog').close();};$('vehicle-grid').append(b);thumbnailQueue.push(v.id);}}
async function makeThumbnail(id){if(thumbBusy||!renderer)return;thumbBusy=true;let model;try{model=buildVehicle(id);const thumbScene=new THREE.Scene();thumbScene.background=new THREE.Color('#edf0e9');thumbScene.environment=scene.environment;thumbScene.add(new THREE.HemisphereLight('#ffffff','#6a776e',3));const sun=new THREE.DirectionalLight('#fff4dc',3.5);sun.position.set(4,7,5);thumbScene.add(sun);thumbScene.add(model.group);const bounds=new THREE.Box3().setFromObject(model.group);const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const cam=new THREE.PerspectiveCamera(35,1.6,.1,60);const max=Math.max(size.x,size.z*1.2,size.y*1.6);cam.position.copy(center).add(new THREE.Vector3(max*.95,max*.66,max*1.15));cam.lookAt(center);let canvas, target;if(renderer.isSoftwareRenderer){const sr=new SoftwareRenderer();sr.setSize(320,200);sr.render(thumbScene,cam);canvas=sr.domElement;}else{target=new THREE.WebGLRenderTarget(320,200,{samples:2});target.texture.colorSpace=THREE.SRGBColorSpace;const pixels=new Uint8Array(320*200*4);renderer.setRenderTarget(target);renderer.render(thumbScene,cam);renderer.readRenderTargetPixels(target,0,0,320,200,pixels);renderer.setRenderTarget(null);canvas=document.createElement('canvas');canvas.width=320;canvas.height=200;const ctx=canvas.getContext('2d'),im=ctx.createImageData(320,200);for(let y=0;y<200;y++)im.data.set(pixels.subarray((199-y)*320*4,(200-y)*320*4),y*320*4);ctx.putImageData(im,0,0);}const url=canvas.toDataURL('image/webp',.88);thumbnails.set(id,url);const placeholder=document.querySelector(`[data-vehicle="${id}"] .placeholder`);if(placeholder){const img=document.createElement('img');img.src=url;img.alt=VEHICLES.find(x=>x.id===id).name+'的三维模型';placeholder.replaceWith(img);}target?.dispose();}catch(e){console.warn('Thumbnail unavailable',id,e);}finally{renderer.setRenderTarget?.(null);if(model)disposeVehicle(model);thumbBusy=false;cameraDirty=true;}}
function setupButtons(){for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();$('garage').onclick=()=>{pauseInput();if(driveStart)returnToGarage();$('garage-dialog').showModal();};$('help').onclick=()=>{pauseInput();releaseDriving();if(driveState)driveState.speed=0;$('help-dialog').showModal();};$('target').onclick=()=>{if(state.selected)fitPart(state.selected);};$('reset').onclick=resetParts;$('home-view').onclick=homeView;$('zoom-in').onclick=()=>{distance=clamp(distance*.84,3.3,42);updateCamera();};$('zoom-out').onclick=()=>{distance=clamp(distance/.84,3.3,42);updateCamera();};$('drive').onclick=startDrive;$('return-garage').onclick=returnToGarage;$('sound').onclick=()=>{sound.setEnabled(!sound.enabled);updateSoundButton();};for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
 for(const [id,control] of [['accelerate','throttle'],['brake','brake'],['steer-left','left'],['steer-right','right']]){const b=$(id);b.addEventListener('contextmenu',e=>e.preventDefault());b.addEventListener('pointerdown',e=>{if(!driveStart)return;e.preventDefault();b.setPointerCapture(e.pointerId);heldControls.set(e.pointerId,control);updateDrivingInput();});const up=e=>{heldControls.delete(e.pointerId);updateDrivingInput();};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);}
 updateSoundButton();
}
function updateSoundButton(){const on=sound.enabled;const label=on?'关闭音乐和音效':'开启音乐和音效';$('sound').setAttribute('aria-label',label);$('sound').setAttribute('aria-pressed',on);$('sound').title=label;$('sound').innerHTML=on?'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/></svg>';}
function updateDrivingInput(){const values=new Set(heldControls.values());const has=(name,...keys)=>values.has(name)||keys.some(k=>driveKeys.has(k));driveInput.throttle=has('throttle','arrowup','w')?1:0;driveInput.brake=has('brake','arrowdown','s',' ')?1:0;const left=has('left','arrowleft','a'),right=has('right','arrowright','d');driveInput.steer=Number(right)-Number(left);for(const [id,on] of [['accelerate',driveInput.throttle],['brake',driveInput.brake],['steer-left',left],['steer-right',right]])$(id).classList.toggle('pressed',!!on);}
function releaseDriving(){heldControls.clear();driveKeys.clear();updateDrivingInput();}
function clearConfetti(){for(const m of confetti){scene.remove(m);m.geometry.dispose();m.material.dispose();}confetti=[];}
function celebrate(){sound.cheer();clearConfetti();const count=reducedMotion?12:76;for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.12,.23),new THREE.MeshBasicMaterial({color:[0xffd65d,0x63bdad,0xff8d6a,0xffffff,0x89baff][i%5],side:THREE.DoubleSide}));m.position.set((Math.random()-.5)*5,2+Math.random()*2,(Math.random()-.5)*4);m.userData.velocity=new THREE.Vector3((Math.random()-.5)*4,3+Math.random()*3,(Math.random()-.5)*4);m.userData.start=performance.now();scene.add(m);confetti.push(m);}}
function startDrive(){if(!isComplete(state)||driveStart)return;clearTimeout(winTimer);clearSelection();pauseInput();releaseDriving();animations=[];vehicle.parts.forEach(p=>{p.group.position.copy(p.target);p.group.quaternion.copy(p.baseQuaternion);});clearConfetti();driveState=createDriveState();driveStart=performance.now()||1;garage.root.visible=false;road.root.visible=true;scene.background.set('#b9dfed');scene.fog=new THREE.Fog('#c9e6e8',100,235);camera.far=280;camera.updateProjectionMatrix();document.body.classList.add('driving');$('driving-hud').hidden=false;renderer.domElement.setAttribute('aria-label','公路赛道，按住油门前进，左右按钮转向，刹车减速。');sound.setMode('drive');sound.startEngine();updateDriveVehicle(0);updateDriveCamera(true);updateUI();}
function stopDrive(){driveStart=0;releaseDriving();driveState=null;sound.stopEngine();sound.setMode('garage');document.body.classList.remove('driving');$('driving-hud').hidden=true;if(garage)garage.root.visible=true;if(road)road.root.visible=false;if(scene){scene.background.set('#bfcfc9');scene.fog=new THREE.Fog('#bfcfc9',29,60);}if(camera){camera.far=100;camera.updateProjectionMatrix();}if(vehicle){vehicle.group.position.set(0,0,0);vehicle.group.rotation.y=0;vehicle.parts.forEach(p=>{if(p.baseQuaternion)p.group.quaternion.copy(p.baseQuaternion);});}if(renderer)renderer.domElement.setAttribute('aria-label','可触摸操作的三维车库。单指旋转，双指移动和缩放，拖动零件进行拼装。');cameraDirty=true;}
function returnToGarage(){stopDrive();homeView();updateUI();}
function updateDriveVehicle(dt){if(!driveState)return;const previousLap=driveState.laps;stepDrive(driveState,driveInput,dt);vehicle.group.position.set(driveState.x,.06,driveState.z);vehicle.group.rotation.y=driveState.heading;vehicle.animate?.(driveState.distance*.65,true);sound.updateEngine(Math.min(driveState.speed/16,1),driveInput.throttle);$('speed').textContent=Math.round(driveState.speed*3.6);$('lap-count').textContent=driveState.laps+1;if(driveState.laps>previousLap){sound.fit(true);$('announcement').textContent='完成第 '+driveState.laps+' 圈！';}cameraDirty=true;}
function updateDriveCamera(immediate=false,dt=1/60){if(!driveState)return;const h=driveState.heading;const forward=new THREE.Vector3(Math.cos(h),0,-Math.sin(h));const behind=width/height<.9?19:14;const aim=new THREE.Vector3(driveState.x,1.2,driveState.z).addScaledVector(forward,3);const position=new THREE.Vector3(driveState.x,.06,driveState.z).addScaledVector(forward,-behind);position.y=width/height<.9?11:9;const blend=immediate?1:1-Math.exp(-dt*5);camera.position.lerp(position,blend);focus.lerp(aim,blend);camera.lookAt(focus);camera.updateMatrixWorld();cameraDirty=true;}
function render(now){if(disposed)return;requestAnimationFrame(render);if(document.hidden)return;const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;frame++;
 animations=animations.filter(a=>{const t=clamp((now-a.start)/a.duration,0,1),e=1-Math.pow(1-t,3);a.object.position.lerpVectors(a.from,a.to,e);if(!reducedMotion)a.object.position.y+=Math.sin(t*Math.PI)*.35;cameraDirty=true;return t<1;});
 if(driveStart){updateDriveVehicle(dt);updateDriveCamera(false,dt);}
 if(confetti.length){confetti=confetti.filter(m=>{if(!reducedMotion){m.userData.velocity.y-=dt*3.2;m.position.addScaledVector(m.userData.velocity,dt);m.rotation.x+=dt*2;m.rotation.z+=dt;}if(now-m.userData.start>(reducedMotion?1700:4200)){scene.remove(m);m.geometry.dispose();m.material.dispose();return false;}return true;});cameraDirty=true;}

 if(state?.selected){const p=partMap.get(state.selected);if(p&&!state.installed.has(p.id)){selectionRing.position.set(p.group.position.x,.06,p.group.position.z);const s=Math.max(.7,Math.min(2,p.size.x));selectionRing.scale.set(s,s,s);selectionRing.material.opacity=.5+Math.sin(now*.004)*.22;}projectTarget();}
 if(!driveStart)garage?.update?.(now/1000,camera);
 if(cameraDirty||state?.selected||now-lastRender>200){renderer.render(scene,camera);cameraDirty=false;lastRender=now;}
 // Generate one genuine 3D catalog image at a time, after first interactive frame.
 if(frame>8&&thumbnailQueue.length&&!gesture&&!animations.length&&!driveStart&&!thumbBusy){makeThumbnail(thumbnailQueue.shift());}
}
window.addEventListener('pagehide',()=>{releaseDriving();sound.setHidden(true);});window.addEventListener('pageshow',()=>sound.setHidden(document.hidden));
try{init();}catch(error){console.error(error);const l=$('loading');l.className='error-panel';l.innerHTML='<strong>车库需要浏览器的 3D 功能</strong><span>请用最新版 Safari 或 Chrome 打开。若仍无法启动，请关闭省电模式并刷新。</span>';document.querySelectorAll('.hud button').forEach(b=>b.disabled=true);}
