import {PARKING_CENTER,PARKING_SLOTS} from './parking-state.js?v=6';
import * as THREE from './vendor/three.module.min.js';
import {BUILDINGS,getMissionTarget,getMissionInfo} from './world-state.js?v=6';

// Handcrafted toy town. Static geometry is merged per color, keeping the whole
// explorable world inexpensive on mobile and software WebGL renderers.
export function buildWorld(scene){
 const root=new THREE.Group();root.name='彩虹任务小镇';root.visible=false;scene.add(root);
 const mats=new Map(),buckets=new Map(),dynamic=[];
 const mat=c=>{if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.82,metalness:0}));return mats.get(c);};
 function add(g,c,x=0,y=0,z=0,rot=0,parent=null){if(parent){const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);m.rotation.y=rot;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}const geo=g.index?g.toNonIndexed():g.clone();geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rot),new THREE.Vector3(1,1,1)));g.dispose();geo.computeBoundingBox();const cast=geo.boundingBox.max.y>.5&&geo.boundingBox.max.y-geo.boundingBox.min.y>.24,key=c+'|'+Number(cast);if(!buckets.has(key))buckets.set(key,{color:c,cast,geos:[]});buckets.get(key).geos.push(geo);}
 const box=(x,y,z,w,h,d,c,r=0,p=null)=>add(new THREE.BoxGeometry(w,h,d),c,x,y,z,r,p);
 const ball=(x,y,z,r,c,p=null)=>add(new THREE.IcosahedronGeometry(r,1),c,x,y,z,0,p);
 const cyl=(x,y,z,r,h,c,p=null)=>add(new THREE.CylinderGeometry(r,r,h,12),c,x,y,z,0,p);
 function group(){const g=new THREE.Group();root.add(g);dynamic.push(g);return g;}
 function tree(x,z,s=1){cyl(x,.8*s,z,.18*s,1.6*s,'#b58255');ball(x,2.1*s,z,1.15*s,'#16834b');ball(x-.35*s,2.9*s,z,.86*s,'#42ad4b');}
 function person(x,z,color='#f49e69',p=null){cyl(x,.65,z,.3,.85,color,p);ball(x,1.34,z,.29,'#ffe1b5',p);box(x-.15,.15,z,.16,.3,.23,'#4c6885',0,p);box(x+.15,.15,z,.16,.3,.23,'#4c6885',0,p);}
 function sign(x,z,color,icon='plus'){box(x,1.4,z,.15,2.8,.15,'#76939a');box(x,2.8,z,2.4,1.7,.18,color);if(icon==='plus'){box(x,2.81,z+.12,.3,1.1,.08,'#fff8dc');box(x,2.81,z+.12,1.1,.3,.08,'#fff8dc');}else {box(x,2.81,z+.12,1.5,.2,.08,'#fff8dc');box(x,3.2,z+.12,.8,.2,.08,'#fff8dc');}}
 box(0,-.25,0,120,.4,120,'#65b63a');
 // Crossed streets and smaller perimeter road, all open to explore.
 for(const v of [-22,0,22]){box(v,.005,0,7,.08,108,'#354958');box(0,.006,v,108,.08,7,'#354958');}
 for(let x=-50;x<=50;x+=5)for(const v of [-22,0,22]){if([-22,0,22].every(i=>Math.abs(x-i)>4)){box(x,.06,v,2,.025,.16,'#ffe5a0');box(v,.06,x,.16,.025,2,'#ffe5a0');}}
 // Sidewalk blocks; these and grass remain drivable, unlike building volumes.
 for(const b of BUILDINGS){box(b.x,.1,b.z,b.w+2,.2,b.d+2,'#e9dfc6');box(b.x,2.1,b.z,b.w,4,b.d,b.color);box(b.x,4.25,b.z,b.w+.3,.45,b.d+.3,'#fff1d1');
  for(let n=-1;n<=1;n++){box(b.x+n*3,2.7,b.z+b.d/2+.03,1.6,1.5,.09,'#196b90');box(b.x+n*3,2.7,b.z-b.d/2-.03,1.6,1.5,.09,'#196b90');}
  box(b.x,1,b.z+(b.z<0?-1:1)*(b.d/2+.06),1.9,2,.15,'#487983');
  if(b.kind==='hospital'){box(b.x,5.2,b.z,3,1.8,.4,'#fff8e8');box(b.x,5.2,b.z+.25,.4,1.3,.08,'#ef6c78');box(b.x,5.2,b.z+.25,1.3,.4,.08,'#ef6c78');sign(-17,-18,'#ee7f8a');}
  if(b.kind==='station'){ball(b.x,5.3,b.z,1.1,'#ffe17c');box(b.x,5.2,b.z+.9,.4,1,.1,'#6ba3cf');sign(17,-18,'#628ed1','line');}
  if(b.kind==='school'){for(let n=-2;n<=2;n++)box(b.x+n*2.5,4.7,b.z,1.6,.65,.5,['#ff8e8e','#ffd767','#8acdd1','#a8b0ef','#f5b0d0'][n+2]);sign(-17,18,'#efba43','line');}
  if(b.kind==='shop'){for(let n=-3;n<=3;n++)box(b.x+n*1.5,3,b.z+b.d/2+.6,1.5,.35,1.5,n%2?'#fff8dd':'#fa8f7c');}
  if(b.kind==='warehouse')for(let n=-1;n<=1;n++)box(b.x+n*3,1.5,b.z+b.d/2+.04,2.2,2.8,.12,'#7a98a9');
 }
 // A permanent collection parking court, connected to the west town road.
 // Snapshot models belong to the caller, not to this world's resource pool.
 const parkingCenter=PARKING_CENTER;
 const parkingSlots=PARKING_SLOTS;
 box(-11,.075,-36.5,21,.12,26,'#e5d3ad');box(-11,.15,-36.5,20,.08,25,'#7994a4');
 // Open west entrance and a broad middle aisle for long buses and trucks.
 box(-21,.13,-36.5,6,.09,7,'#7994a4');
 for(const {x,z,width:w,length:l} of parkingSlots){
  box(x,.2,z,w,.025,l,'#88a7b4');
  for(const dx of [-w/2,w/2])box(x+dx,.22,z,.1,.025,l,'#fff4cf');
  box(x,.22,z+(z>-36?l/2:-l/2),w,.025,.1,'#fff4cf');
 }
 const parkingMarker=group();parkingMarker.visible=false;
 for(const x of [-2.7,2.7])box(x,.27,0,.16,.06,8,'#97ff99',0,parkingMarker);
 for(const z of [-4,4])box(0,.27,z,5.4,.06,.16,'#97ff99',0,parkingMarker);
 // A ground chevron points along the bay, independent of text/font support.
 box(-.4,.28,.2,.12,.04,1.2,'#d9ff97',-.7,parkingMarker);box(.4,.28,.2,.12,.04,1.2,'#d9ff97',.7,parkingMarker);
 function setParkingTarget(slotId=null,progress=0){const slot=parkingSlots.find(s=>s.id===slotId);parkingMarker.visible=!!slot;if(slot){parkingMarker.position.set(slot.x,0,slot.z);parkingMarker.scale.y=1+Math.max(0,Math.min(1,progress))*3;}}
 // A mesh-built P is readable without fonts, canvas, or texture downloads.
 box(-3.4,1.5,-25.5,.16,3,.16,'#7295a0');box(-3.4,3.2,-25.5,2.3,2.3,.22,'#588fca');
 box(-3.85,3.2,-25.35,.2,1.45,.08,'#fff8db');box(-3.35,3.83,-25.35,1.1,.2,.08,'#fff8db');
 box(-2.9,3.49,-25.35,.2,.85,.08,'#fff8db');box(-3.35,3.1,-25.35,1.1,.2,.08,'#fff8db');
 const parkedContainer=new THREE.Group();parkedContainer.name='我的汽车停车场';parkedContainer.visible=false;root.add(parkedContainer);
 function clearParkedCars(){for(const wrapper of [...parkedContainer.children]){for(const model of [...wrapper.children])wrapper.remove(model);parkedContainer.remove(wrapper);}parkedContainer.visible=false;}
 function setParkedCars(models=[]){clearParkedCars();const unique=[...new Set(models.map(m=>m?.group).filter(g=>g?.isObject3D))].slice(-5);unique.forEach((model,i)=>{const wrapper=new THREE.Group(),{x,z}=parkingSlots[i];wrapper.position.set(x,.24,z);wrapper.rotation.y=Math.PI/2;wrapper.scale.setScalar(.65);wrapper.add(model);parkedContainer.add(wrapper);});parkedContainer.visible=unique.length>0;return unique.length;}
 // Crosswalks and bus stops.
 for(const [x,z] of [[-12,22],[12,22],[12,-22],[-12,-22]]){for(let n=0;n<5;n++)box(x-1.7+n*.85,.065,z,.5,.02,5,'#f6f4df');sign(x+5,z+4,'#68bba8','line');}
 // Central park with pond, winding pedestrian tiles, benches and visitors.
 cyl(35,.02,10,11,.08,'#50a741');cyl(38,.08,10,5.2,.12,'#f4ddb1');cyl(38,.15,10,4.5,.14,'#16a6cc');
 for(let n=0;n<7;n++){cyl(27+n*.75,.07,4+n*1.4,.9,.1,'#f4e0b7');}
 for(const [x,z] of [[28,12],[34,20],[43,6]]){box(x,.65,z,2.6,.2,.7,'#e3b36d');box(x,1.05,z+.4,2.6,.65,.15,'#e3b36d');box(x-1,.3,z,.15,.6,.5,'#7c9695');box(x+1,.3,z,.15,.6,.5,'#7c9695');}
 person(29,9,'#c59bef');person(31,11,'#f6bf63');person(42,16,'#78b5ec');
 // Construction rescue zone with striped fencing and site equipment.
 box(-35,.03,-39,25,.12,23,'#dfc599');for(let n=0;n<7;n++){box(-47+n*3.5,.8,-49,2.3,1.4,.18,n%2?'#fff0ba':'#ecad55');}
 for(const [x,z] of [[-45,-29],[-25,-29],[-43,-45]]){add(new THREE.ConeGeometry(.45,1.1,8),'#ff9b58',x,.55,z);box(x,.08,z,1,.15,1,'#fff3d7');}
 // Fixed gantry makes the lifting action unmistakable.
 for(const x of [-39,-30])box(x,3.8,-38,.6,7.6,.7,'#edb646');box(-34.5,7.4,-38,10,.6,.7,'#f6cd64');box(-34.5,6,-38,.12,2,.12,'#76868b');
 const beam=group();box(-34, .65,-36,7,.7,1.1,'#b48055',.24,beam);
 const rubble=group();for(let i=0;i<8;i++)ball(-25+(i%3-1)*.9,.55+(i%2)*.3,-39+Math.floor(i/3)*.7,.7,'#9ba7b0',rubble);
 const concrete=group();box(-25,.12,-39,7,.14,5,'#b9c7ca',0,concrete);concrete.visible=false;
 // Race circuit: wide, rounded rectangular loop with bright curbs, flags,
 // checkerboard start line and checkpoint arches.
 box(37,.04,-42,29,.1,23,'#d9dbb7');box(37,.1,-42,26,.1,20,'#354c66');box(37,.17,-42,14,.12,8,'#65b63a');
 for(let i=0;i<14;i++)for(const z of [-52,-32])box(24+i*2,.19,z,1.75,.12,.6,i%2?'#fff3d8':'#ef4b56');
 for(let i=0;i<10;i++)for(const x of [24,50])box(x,.19,-51+i*2,.6,.12,1.75,i%2?'#fff3d8':'#ef4b56');
 for(let i=0;i<6;i++)for(let j=0;j<2;j++)box(33+j*.5,.18,-39.5+i,.5,.025,1,(i+j)%2?'#fff8e0':'#394c6a');
 for(const [x,z,c] of [[46,-37,'#f4b459'],[46,-48,'#bc9ce5'],[29,-48,'#68c7c6']]){box(x-2.4,1.6,z,.25,3.2,.25,c);box(x+2.4,1.6,z,.25,3.2,.25,c);box(x,3.2,z,5.1,.4,.4,c);}
 for(const x of [26,48]){box(x,2,-29,.15,4,.15,'#758d95');box(x+.7,3.4,-29,1.5,1,.1,'#ffb05f');}
 // Farm rows and cheerful harvest produce.
 box(-35,.03,40,26,.1,22,'#d8bd7b');const crops=group();for(let r=0;r<5;r++){box(-35,.13,32+r*4,23,.15,1.4,'#b59467');for(let j=0;j<8;j++){ball(-45+j*3,.4,32+r*4,.48,'#80b95f',crops);ball(-45+j*3,.5,32+r*4,.25,r%2?'#f4b55c':'#e87764',crops);}}
 box(-24,.65,45,3,1.1,2,'#c79861');
 // A lake-side campsite, with tent, logs, picnic table, and mountain trail.
 cyl(43,.01,42,10,.08,'#e4d1a0');cyl(43,.08,42,8.7,.1,'#148fb9');
 add(new THREE.ConeGeometry(3,4,4),'#f4b05f',29,1.8,42,Math.PI/4);box(29,.9,40,1.2,1.8,.1,'#b77f5c');
 const camp=group();box(34,2.6,36,6,.25,4,'#f8c96e',0,camp);for(const x of [31.4,36.6])for(const z of [34.4,37.6])box(x,1.3,z,.12,2.6,.12,'#e7edda',0,camp);box(34,.9,36,2.4,.2,1.3,'#e8b67a',0,camp);camp.visible=false;
 for(let i=0;i<12;i++)cyl(46+Math.sin(i*.6)*2,.06,10+i*2.5,1.6,.1,'#dbbf91');
 // Recycling station, bins, cargo, and patient are interactive props.
 for(let i=0;i<3;i++){box(-49+i*1.4,.8,27,1.1,1.6,1.2,['#72bca4','#89b8e6','#f5c569'][i]);box(-49+i*1.4,1.65,27,1.2,.15,1.3,'#f1e8cd');}
 const bins=group();for(const [x,z] of [[-12,24],[12,24]]){box(x,.6,z,.8,1.2,.8,'#74bba2',0,bins);box(x,1.25,z,1,.15,1,'#569783',0,bins);}
 const cargo=group();for(let i=0;i<3;i++){box(-38+i*1.2,.55,24,1,1,1,'#d9ac74',0,cargo);box(-38+i*1.2,.56,24,.12,1.05,1.04,'#ffdf9e',0,cargo);}
 const patient=group();person(30,6,'#ed9caf',patient);ball(30,2,6,.3,'#f6c45e',patient);
 const flames=group();for(let i=0;i<5;i++){add(new THREE.ConeGeometry(.45,1.4+(i%2)*.6,7),'#ffab55',-37+i*.5,.8,-19.5,0,flames);ball(-37+i*.5,2.1+(i%2)*.5,-19.5,.55,'#b9c0cd',flames);}
 const water=group();for(let i=0;i<7;i++)ball(0,0,0,.16,'#83def0',water);water.visible=false;
 const chase=group();box(0,.55,0,2,.7,1.1,'#bd9ce9',0,chase);box(-.2,1,0,1,.5,.9,'#b1e4ed',0,chase);for(const x of [-.65,.65])for(const z of [-.55,.55])ball(x,.3,z,.25,'#4c5973',chase);ball(0,2,0,.32,'#ffdd63',chase);
 const paceCars=[];for(const color of ['#f5b24b','#7ed5cc']){const car=group();box(0,.5,0,2.2,.65,1.15,color,0,car);box(-.2,.95,0,1.05,.5,.9,'#d5f1f3',0,car);for(const x of [-.7,.7])for(const z of [-.57,.57])ball(x,.3,z,.24,'#4c5973',car);paceCars.push(car);}
 const service=group();person(0,0,'#f4ba69',service);
 // Soft tree clusters and rounded hills beyond the playable town edges.
 for(const [x,z] of [[-50,-12],[-48,4],[-50,42],[-15,36],[-9,44],[5,38],[13,45],[23,30],[51,5],[50,19],[51,30],[3,-51],[3,-39],[12,-45],[-52,-51],[-54,52]])tree(x,z,.85+(Math.abs(x)%3)*.15);
 for(let i=0;i<16;i++){const a=i*Math.PI/8,x=Math.cos(a)*78,z=Math.sin(a)*78;ball(x,-2,z,12+i%3*3,i%2?'#6b9e60':'#528e68');}
 // Map border is a forgiving low hedge rather than a visually endless road.
 for(let i=-54;i<=54;i+=6)for(const s of [-1,1]){ball(i,.2,s*58,1.4,'#358c45');ball(s*58,.2,i,1.4,'#358c45');}
 // Merge static geometry. Dynamic props are intentionally separate.
 for(const {color:c,cast,geos} of buckets.values()){const length=geos.reduce((n,g)=>n+g.attributes.position.array.length,0),pos=new Float32Array(length),norm=new Float32Array(length);let offset=0;for(const g of geos){pos.set(g.attributes.position.array,offset);norm.set(g.attributes.normal.array,offset);offset+=g.attributes.position.array.length;g.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(norm,3));g.computeBoundingSphere();const m=new THREE.Mesh(g,mat(c));m.receiveShadow=true;m.castShadow=cast;root.add(m);}
 const beacon=group();const ring=new THREE.Mesh(new THREE.TorusGeometry(3.5,.12,6,40),mat('#ffe479'));ring.rotation.x=Math.PI/2;ring.position.y=.3;beacon.add(ring);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.65,1.1,6),mat('#ffdc65'));arrow.rotation.z=Math.PI;beacon.add(arrow);
 const sparkles=group();for(let i=0;i<16;i++)ball(0,0,0,.18,['#ffe17b','#fa9da7','#8bdbdc','#c7a8ed'][i%4],sparkles);sparkles.visible=false;
 function update(state,time=0){const t=getMissionTarget(state),info=getMissionInfo(state),id=state.vehicleId,p=state.actionProgress;beacon.position.set(t.x,0,t.z);beacon.visible=!state.complete;arrow.position.y=4.7+Math.sin(time*3)*.35;ring.scale.setScalar(1+Math.sin(time*2)*.06);ring.rotation.z=time*.3;
 paceCars.forEach((car,i)=>{car.visible=['ferrari','bmw'].includes(id);const points=[[27,-37],[46,-37],[46,-48],[27,-48]],lengths=[19,11,19,11];let d=(time*(4.5+i*.8)+i*25)%60,k=0;while(d>lengths[k]&&k<3){d-=lengths[k];k++;}const a=points[k],b=points[(k+1)%4],f=d/lengths[k];car.position.set(a[0]+(b[0]-a[0])*f,0,a[1]+(b[1]-a[1])*f);car.rotation.y=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);});
 patient.visible=id==='ambulance'&&state.step===0&&!state.complete;
 flames.visible=id==='fire'&&!state.complete;flames.scale.y=state.step===1?1-p*.9:1;
 beam.position.y=id==='crane'?(state.complete?6:state.step===1?p*6:0):0;
 rubble.visible=!(id==='excavator'&&state.step>=1);concrete.visible=id==='mixer'&&(state.step>=1||state.complete);concrete.scale.x=state.complete?1:Math.max(.05,p);
 crops.visible=!(id==='tractor'&&state.complete);crops.scale.y=id==='tractor'?Math.max(.15,1-state.step*.3):1;
 bins.visible=!(id==='garbage'&&state.complete);cargo.visible=!(['truck','van'].includes(id)&&state.step>=1);camp.visible=(id==='camper'&&(state.step>=1||state.complete))||(id==='compact'&&state.complete);
 chase.visible=id==='police';if(chase.visible){if(state.step===0&&!state.complete)chase.position.set(t.x,0,t.z);else if(!state.complete)chase.position.set(state.x-Math.cos(state.heading)*4,0,state.z+Math.sin(state.heading)*4);else chase.position.set(17,0,-20);chase.rotation.y=state.step===0?Math.sin(state.missionTime*.15)*.2:state.heading;}
 service.visible=['taxi','bus','schoolbus','minibus','icecream'].includes(id)&&!state.complete;if(service.visible)service.position.set(t.x+2,0,t.z+2);
 water.visible=id==='fire'&&state.step===1&&p>0&&!state.complete;if(water.visible)water.children.forEach((m,i)=>{const f=((i/7+time*.8)%1);m.position.set(state.x+(-36-state.x)*f,.8+Math.sin(f*Math.PI)*2,state.z+(-19.5-state.z)*f);});
 sparkles.visible=state.complete;if(state.complete){sparkles.position.set(state.x,0,state.z);sparkles.children.forEach((m,i)=>{const a=i*Math.PI/8+time,r=2+(Math.sin(time*2+i)+1);m.position.set(Math.cos(a)*r,2+(time*1.7+i*.3)%3,Math.sin(a)*r);});}return info;}
 return {root,update,setParkedCars,setParkingTarget,parkingSlots,parkingCenter,missionTarget:getMissionTarget,dispose(){clearParkedCars();root.removeFromParent();root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const m of mats.values())m.dispose();}};
}
