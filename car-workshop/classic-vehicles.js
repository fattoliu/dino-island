import * as THREE from './vendor/three.module.min.js';

// All geometry is original, generated locally. X = forward, Y = up, Z = axle.
export const CLASSIC_IDS = new Set(['gclass','landcruiser','bmw','ferrari','truck','fire','police','taxi','crane','excavator']);
// Restored detailed, crisp-panel sculptures from the original garage (fae1ac4).
// Catalog IDs and saved livery IDs remain owned by vehicles.js.
const PI=Math.PI;
const mat=(color,metalness=0,roughness=.5,extra={})=>new THREE.MeshStandardMaterial({color,metalness,roughness,...extra});
function materials(){return {rubber:mat('#1e2630',.05,.89),tread:mat('#2c3540',.05,.8),dark:mat('#293949',.45,.43),black:mat('#142230',.2,.42),chrome:mat('#b8c7d1',.85,.23),alloy:mat('#dee6e9',.8,.28),brake:mat('#68737c',.8,.5),red:mat('#db302e',.25,.3),seat:mat('#583b2e',0,.86),glass:mat('#103244',.12,.26,{side:THREE.DoubleSide}),lamp:mat('#fff8d6',.2,.14,{emissive:'#fff0b6',emissiveIntensity:.45}),tail:mat('#e92932',.2,.23,{emissive:'#f30c17',emissiveIntensity:.3}),blue:mat('#258dff',.3,.22,{emissive:'#004dff',emissiveIntensity:.45}),amber:mat('#ffad23',.2,.2,{emissive:'#ff7400',emissiveIntensity:.3}),white:mat('#f4f5ee',.2,.4)};}
let M;
const boxGeo=new THREE.BoxGeometry(1,1,1);
function mesh(g,geometry,material,x=0,y=0,z=0,rotation=null){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);if(rotation)o.rotation.set(...rotation);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function box(g,x,y,z,w,h,d,m,r=.035){if(r<=0){const o=mesh(g,boxGeo,m,x,y,z);o.scale.set(w,h,d);return o;}return mesh(g,rounded(w,h,d,r),m,x,y,z);}
function rounded(w,h,d,r){r=Math.min(r,w/3,h/3,d/3);const s=new THREE.Shape(),a=-w/2+r,b=-h/2+r,c=w-2*r,e=h-2*r;s.moveTo(a,b);s.lineTo(a+c,b);s.lineTo(a+c,b+e);s.lineTo(a,b+e);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r,bevelThickness:r,curveSegments:3});g.translate(0,0,-d/2+r);g.computeVertexNormals();return g;}
function cylinder(g,x,y,z,r,h,m,axis='z',r2=r,n=24){return mesh(g,new THREE.CylinderGeometry(r2,r,h,n,1),m,x,y,z,axis==='z'?[PI/2,0,0]:axis==='x'?[0,0,PI/2]:null);}
function torus(g,x,y,z,r,t,m,arc=PI*2){return mesh(g,new THREE.TorusGeometry(r,t,6,32,arc),m,x,y,z);}
function bar(g,a,b,r,m){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const o=mesh(g,new THREE.CylinderGeometry(r,r,delta.length(),8),m,...av.add(bv).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
function profile(g,points,width,m,z=0,bevel=.03){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:width,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1});geo.translate(0,0,z-width/2);return mesh(g,geo,m);}
function pane(g,points,z,m=M.glass){return profile(g,points,.014,m,z,.004);}
function plate(g,x,y,z,w,h,m,axis='x'){return axis==='x'?box(g,x,y,z,.035,h,w,m,.008):box(g,x,y,z,w,h,.035,m,.008);}
// Merge all static meshes with the same material INSIDE each detachable component.
// This preserves component interactions while cutting hundreds of details to ~100 calls.
function batch(group){group.updateMatrixWorld(true);const buckets=new Map();group.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();const transform=group.matrixWorld.clone().invert().multiply(o.matrixWorld);g.applyMatrix4(transform);let a=buckets.get(o.material);if(!a)buckets.set(o.material,a=[]);a.push(g);if(o.geometry!==boxGeo)o.geometry.dispose();});group.clear();for(const [material,geos] of buckets){const count=geos.reduce((n,g)=>n+g.attributes.position.count,0),positions=new Float32Array(count*3),normals=new Float32Array(count*3);let offset=0;for(const g of geos){positions.set(g.attributes.position.array,offset);normals.set(g.attributes.normal.array,offset);offset+=g.attributes.position.array.length;g.dispose();}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(normals,3));geo.computeBoundingSphere();mesh(group,geo,material);}}
function part(ctx,id,name,target,make){const group=new THREE.Group();group.name=name;make(group);batch(group);const center=new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());for(const o of group.children)o.geometry.translate(-center.x,-center.y,-center.z);group.position.set(...target).add(center);ctx.group.add(group);ctx.parts.push({id,name,group,target:group.position.clone()});return group;}
function wheel(g,r=.5,w=.32,style='road'){cylinder(g,0,0,0,r,w,M.rubber);torus(g,0,0,w/2,r*.79,r*.16,M.rubber);torus(g,0,0,-w/2,r*.79,r*.16,M.rubber);for(let i=0;i<36;i++){let a=i*PI/18;for(let z of [-w*.3,w*.3]){const t=box(g,Math.sin(a)*(r+.006),Math.cos(a)*(r+.006),z,r*.115,.024,w*.45,M.tread,0);t.rotation.z=-a+(z>0?.14:-.14);}}for(const side of [-1,1]){const z=side*(w/2+.016);cylinder(g,0,0,z,r*.65,.025,M.chrome);cylinder(g,0,0,z+side*.018,r*.53,.026,M.black);cylinder(g,0,0,z+side*.036,r*.42,.028,M.brake);box(g,r*.32,0,z+side*.06,r*.14,r*.33,.045,M.red);for(let i=0;i<5;i++){const a=i*PI*2/5;const spoke=box(g,Math.sin(a)*r*.28,Math.cos(a)*r*.28,z+side*.07,r*.115,r*.55,.045,M.alloy,.012);spoke.rotation.z=-a;}cylinder(g,0,0,z+side*.1,r*.14,.05,M.chrome);for(let i=0;i<5;i++){const a=i*PI*2/5;cylinder(g,Math.sin(a)*r*.105,Math.cos(a)*r*.105,z+side*.13,.022,.018,M.dark, 'z',.022,8);}}}
function seats(g,x,y,z,scale=1){box(g,x,y,z,.48*scale,.16*scale,.5*scale,M.seat,.06);box(g,x-.2*scale,y+.28*scale,z,.15*scale,.6*scale,.5*scale,M.seat,.055);box(g,x-.2*scale,y+.64*scale,z,.15*scale,.18*scale,.3*scale,M.seat,.055);}
function interior(g,length=1.6,width=1.5){box(g,0,0,0,length,.12,width,M.dark);for(let z of [-width*.26,width*.26])seats(g,.08,.17,z);box(g,length*.4,.52,0,.28,.26,width,M.black,.06);const steering=torus(g,length*.24,.7,-width*.25,.18,.025,M.dark);steering.rotation.y=PI/2;bar(g,[length*.24,.7,-width*.25],[length*.38,.5,-width*.25],.025,M.chrome);box(g,length*.4,.68,.12,.035,.12,.23,M.blue,.01);box(g,0,.2,0,.55,.22,.18,M.black,.03);}
function grille(g,x,y,w,h,type='bars'){plate(g,x,y,0,w,h,M.black);if(type==='kidney'){for(let z of [-w*.23,w*.23]){box(g,x+.025,y,z,.04,h*.95,w*.36,M.chrome,.06);box(g,x+.055,y,z,.04,h*.81,w*.27,M.black,.04);for(let i=-2;i<=2;i++)box(g,x+.08,y,z+i*w*.045,.025,h*.72,.018,M.chrome,.004);}}else for(let i=0;i<7;i++)box(g,x+.025,y-h*.37+i*h*.12,0,.027,.018,w*.9,M.chrome,.002);}
function lights(g,x,y,w,circular=false){for(let s of [-1,1]){if(circular){cylinder(g,x,y,s*w*.37,.19,.07,M.chrome,'x');cylinder(g,x+.04,y,s*w*.37,.145,.025,M.lamp,'x');torus(g,x+.06,y,s*w*.37,.12,.015,M.white).rotation.y=PI/2;}else{box(g,x,y,s*w*.37,.055,.16,w*.2,M.chrome,.03);box(g,x+.04,y,s*w*.37,.025,.09,w*.17,M.lamp,.02);}box(g,x,y-.21,s*w*.39,.04,.07,.13,M.amber,.015);}}
function mirror(g,x,y,z,paint){bar(g,[x,y,z],[x+.08,y+.08,z*1.12],.025,M.dark);box(g,x+.08,y+.12,z*1.16,.23,.14,.16,paint,.04);box(g,x-.045,y+.12,z*1.16,.018,.1,.12,M.chrome,.01);}
function spoiler(g,w,paint){for(let s of [-1,1])box(g,0,-.17,s*w*.32,.1,.34,.06,M.dark,.01);box(g,0,0,0,.4,.08,w,paint,.025);for(let s of [-1,1])box(g,0,.06,s*w/2,.42,.19,.04,M.dark,.015);}


const FONT={ '0':['01110','11011','11011','11011','11011','11011','01110'],'1':['00110','01110','00110','00110','00110','00110','01111'],'T':['11111','11111','00100','00100','00100','00100','00100'],'A':['01110','11011','11011','11111','11011','11011','11011'],'X':['11011','11011','01110','00100','01110','11011','11011'],'I':['11111','00100','00100','00100','00100','00100','11111'] };
function label(g,text,x,y,z,height,m,side=1){const holder=new THREE.Group(),u=height/7;holder.position.set(x,y,z);holder.rotation.y=side<0?PI:0;const width=(text.length*6-1)*u;[...text].forEach((ch,k)=>FONT[ch]?.forEach((row,ri)=>{let start=-1;for(let c=0;c<=5;c++){if(c<5&&row[c]==='1'){if(start<0)start=c;}else if(start>=0){box(holder,-width/2+(k*6+(start+c)/2)*u,(3-ri)*u,0,(c-start)*u,u,.018,m,0);start=-1;}}}));g.add(holder);}

function passenger(ctx,cfg){if(cfg.id==='ferrari'){supercar(ctx);return;}const {id,color}=cfg;const suv=id==='gclass'||id==='landcruiser',gclass=id==='gclass',sport=id==='bmw'||id==='ferrari',ferrari=id==='ferrari';const paint=ctx.paint;const L=gclass?4.65:suv?5.05:sport?4.65:4.8,W=suv?1.95:sport?2.05:1.9,R=suv?.51:sport?.43:.45,Y=R+.04,ax=suv?1.54:1.5,belt=suv?1.46:ferrari?.99:sport?1.09:1.18,roof=gclass?2.42:suv?2.27:ferrari?1.53:sport?1.76:1.94;ctx.dimensions={length:L+.2,width:W+.38,height:roof+.3};
 const chassis=new THREE.Group();box(chassis,0,Y-.12,0,L*.8,.19,W*.68,M.dark,.05);for(let x of [-ax,ax]){cylinder(chassis,x,Y,0,.065,W,M.brake);for(let z of [-W*.33,W*.33])cylinder(chassis,x,Y+.13,z,.09,.25,M.chrome,'y');}box(chassis,-.55,Y-.21,.38,1.6,.08,.22,M.chrome,.025);batch(chassis);ctx.group.add(chassis);
 for(let x of [-ax,ax])for(let s of [-1,1])part(ctx,`wheel-${x}-${s}`,`${x>0?'前':'后'}${s>0?'右':'左'}车轮`,[x,Y,s*(W/2+.015)],g=>wheel(g,R,suv?.32:.29));
 part(ctx,'body','车身外壳',[0,0,0],g=>{const p=[[-L/2,.7],[-L/2,belt-.1],[-L*.39,belt+.03],[L*.29,belt+.03],[L/2,belt-.12],[L/2,.65]];profile(g,p,W,paint,0,.06);for(let s of [-1,1]){box(g,0,.69,s*(W/2+.02),L*.92,.12,.09,M.dark,.025);for(let x of [-ax,ax]){const arch=torus(g,x,Y,s*(W/2+.045),R+.055,.062,suv?M.dark:paint,PI);arch.rotation.z=0;}box(g,-L*.39,belt-.18,s*(W/2+.055),.25,.15,.035,M.tail,.025);}box(g,L/2-.08,.79,0,.16,.23,W+.03,M.dark,.04);box(g,-L/2+.08,.77,0,.16,.2,W+.03,M.dark,.04);for(let s of [-1,1])cylinder(g,-L/2-.02,.63,s*.59,.067,.2,M.chrome,'x');});
 const hoodStart=gclass?1.1:suv?.6:.55,hoodLen=L/2-hoodStart-.12;
 part(ctx,'hood','发动机盖',[hoodStart+hoodLen/2,belt+.075,0],g=>{box(g,0,0,0,hoodLen,.13,W*.92,paint,.065);for(let s of [-1,1])bar(g,[-hoodLen*.4,.08,s*W*.25],[hoodLen*.4,.04,s*W*.28],.009,paint);if(sport)for(let s of [-1,1])for(let i=0;i<4;i++)box(g,-.15+i*.1,.075,s*.53,.05,.013,.2,M.black,.005);});
 const rear=gclass?-2.15:suv?-1.98:ferrari?-1.05:-1.27,front=gclass?1.05:suv?.69:ferrari?.85:.68,topFront=gclass?.75:suv?.14:.02,topRear=gclass?-2.1:suv?-1.62:ferrari?-.69:-.98;
 part(ctx,'glass','整套车窗',[0,0,0],g=>{for(let s of [-1,1])pane(g,[[rear+.08,belt+.12],[front-.06,belt+.12],[topFront-.05,roof-.1],[topRear+.08,roof-.1]],s*(W*.455));profile(g,[[front,belt+.1],[topFront,roof-.09],[topFront-.035,roof-.09],[front-.035,belt+.1]],W*.9,M.glass,0,.004);profile(g,[[rear,belt+.1],[topRear,roof-.09],[topRear+.035,roof-.09],[rear+.035,belt+.1]],W*.88,M.glass,0,.004);for(let z of [-.42,.42])bar(g,[front+.015,belt+.12,z-.2],[front-.05,belt+.25,z+.13],.016,M.black);});
 part(ctx,'roof','车顶与立柱',[0,0,0],g=>{box(g,(topFront+topRear)/2,roof,0,topFront-topRear+.16,.12,W*.94,paint,.07);for(let s of [-1,1]){const z=s*W*.47;bar(g,[front,belt,z],[topFront,roof,z],suv?.055:.043,paint);bar(g,[rear,belt,z],[topRear,roof,z],.05,paint);bar(g,[gclass?-.25:-.65,belt,z],[gclass?-.25:-.65,roof-.03,z],.04,M.black);if(gclass){bar(g,[-1.35,belt,z],[-1.35,roof-.03,z],.05,paint);bar(g,[-2.12,belt,z],[1.05,belt,z],.025,paint);}}});
 for(let s of [-1,1])part(ctx,`doors-${s}`,s>0?'右侧车门':'左侧车门',[-.37,(belt+.78)/2,s*(W/2+.035)],g=>{box(g,gclass?.2:0,0,0,gclass?2.55:suv?2.5:2.05,belt-.78,.055,paint,.025);if(gclass){box(g,.12,0,s*.035,.018,belt-.8,.016,M.black,.002);box(g,-.98,0,s*.035,.018,belt-.8,.016,M.black,.002);for(let x of [-.85,.23])for(let y of [-.13,.16])box(g,x,y,s*.065,.1,.045,.04,paint,.008);}for(let x of gclass?[-.72,.4]:suv?[-.67,.6]:[-.5,.65])box(g,x,.11,s*.04,.21,.045,.05,M.chrome,.014);bar(g,[-1,-.08,s*.04],[1,-.08,s*.04],.015,M.dark);if(suv){box(g,-.05,-.33,s*.08,2.35,.08,.18,M.dark,.02);box(g,-.05,-.28,s*.13,2.2,.018,.14,M.chrome,.005);}mirror(g,gclass?1.4:.94,roof-belt-.02,s*.04+s*.05,paint);if(id==='police'){box(g,0,.03,s*.045,1.9,.3,.03,ctx.accent,.004);label(g,'110',-.05,.03,s*.065,.22,M.white,s);}if(id==='taxi')for(let i=0;i<12;i++)box(g,-.9+i*.155,.03,s*.04,.075,.065,.018,M.black,0);});
 part(ctx,'interior','座椅与驾驶台',[-.2,.91,0],g=>{interior(g,2,W*.8);if(suv)for(let z of [-.4,.4])seats(g,-1,.17,z);});
 part(ctx,'front','前灯与进气格栅',[L/2+.045,belt-.19,0],g=>{grille(g,0,0,W*.55,.28,id==='bmw'?'kidney':'bars');lights(g,.025,.02,W,gclass);box(g,.02,-.27,0,.07,.1,.44,M.white,.01);if(gclass){cylinder(g,.065,0,0,.12,.025,M.chrome,'x');}});
 part(ctx,'rear','尾门与尾灯',[-L/2-.025,belt-.05,0],g=>{box(g,0,0,0,.08,.35,W*.86,paint,.04);for(let s of [-1,1]){box(g,-.06,.04,s*W*.37,.035,.12,.29,M.tail,.025);box(g,-.085,.02,s*W*.37,.015,.025,.21,M.white,.005);}box(g,-.065,-.08,0,.015,.1,.43,M.white,.008);});
 if(gclass)part(ctx,'spare','外挂备胎',[-L/2-.24,1.52,0],g=>{const w=new THREE.Group();wheel(w,.43,.2);w.rotation.y=PI/2;g.add(w);cylinder(g,-.14,0,0,.36,.14,paint,'x');cylinder(g,-.22,0,0,.22,.02,M.chrome,'x');});
 else if(sport)part(ctx,'spoiler','赛车尾翼',[-1.88,1.61,0],g=>spoiler(g,W*.97,paint));
 else if(id==='police')part(ctx,'lightbar','红蓝警灯',[-.5,roof+.16,0],g=>{box(g,0,-.05,0,.35,.08,1.35,M.dark,.025);box(g,0,.04,-.35,.3,.16,.55,M.blue,.035);box(g,0,.04,.35,.3,.16,.55,M.tail,.035);});
 else if(id==='taxi')part(ctx,'sign','出租车顶灯',[-.5,roof+.2,0],g=>{box(g,0,0,0,.8,.29,.35,ctx.accent,.035);for(let s of [-1,1])label(g,'TAXI',0,0,s*.19,.18,M.black,s);});
 else part(ctx,'roofrack','行李架',[-.68,roof+.15,0],g=>{for(let s of [-1,1])bar(g,[-1,.06,s*.72],[1,.06,s*.72],.035,M.chrome);for(let x of [-.8,0,.8])bar(g,[x,0,-.76],[x,0,.76],.035,M.dark);box(g,-.2,.2,0,1.15,.3,1.1,M.dark,.1);});
 if(sport)part(ctx,'diffuser','空气动力套件',[0,0,0],g=>{box(g,L/2,.59,0,.35,.06,W+.1,M.dark,.02);box(g,-L/2,.62,0,.34,.08,W,M.dark,.02);for(let z=-.7;z<=.71;z+=.28)box(g,-L/2,.54,z,.4,.17,.035,M.dark,.006);for(let s of [-1,1])box(g,0,.55,s*(W/2+.05),2.5,.07,.16,M.dark,.015);if(ferrari)for(let s of [-1,1]){pane(g,[[-1.1,1.07],[-.45,1.07],[-.75,1.32],[-1.1,1.25]],s*(W/2+.05),M.black);}else{for(let s of [-1,1])box(g,.1,belt+.16,s*.48,3.7,.018,.1,M.white,.002);}});
}
function truckVehicle(ctx,cfg){const fire=cfg.id==='fire',crane=cfg.id==='crane',semi=cfg.id==='truck',paint=ctx.paint,W=2.05,L=6.35,cy=fire?2.85:2.95;ctx.dimensions={length:L+.3,width:2.55,height:crane?3.5:3.25};
 const fixed=new THREE.Group();for(let z of [-.62,.62])box(fixed,0,.7,z,L-.35,.25,.15,M.dark,.02);for(let x of [-2.5,-1.5,0,1.7,2.7])box(fixed,x,.7,0,.12,.18,W*.85,M.brake,.02);for(let x of [-2.15,-.95,2.05]){cylinder(fixed,x,.58,0,.085,W+.1,M.brake);for(let z of [-.7,.7]){box(fixed,x,.58,z,.75,.09,.12,M.brake,.02);cylinder(fixed,x,.75,z,.12,.27,M.dark,'y');}}batch(fixed);ctx.group.add(fixed);
 for(let x of [-2.15,-.95,2.05])for(let s of [-1,1])part(ctx,`wheel-${x}-${s}`,`${x>0?'前':x< -1.5?'后':'中'}${s>0?'右':'左'}车轮`,[x,.58,s*1.06],g=>wheel(g,.54,.36,'truck'));
 part(ctx,'cab','驾驶室外壳',[1.92,0,0],g=>{profile(g,[[-.88,.98],[-.88,1.91],[.84,1.91],[1.1,1.4],[1.1,.98]],W,paint,0,.06);box(g,-.84,(cy+1.1)/2,0,.12,cy-1.1,W,paint,.04);for(let z of [-.47,.47])seats(g,-.23,1.55,z,.9);box(g,.72,1.91,0,.3,.16,1.82,M.dark,.04);box(g,.83,1.62,0,.53,.55,W+.04,paint,.06);for(let s of [-1,1]){box(g,.1,.97,s*1.06,1.65,.12,.22,M.chrome,.02);box(g,.03,1.14,s*1.075,1.55,.055,.16,M.dark,.01);box(g,-.8,1.47,s*1.07,.1,.65,.07,M.chrome,.025);}});
 part(ctx,'windshield','前挡风玻璃',[1.92,0,0],g=>{profile(g,[[1.03,1.99],[.72,cy-.3],[.67,cy-.3],[.98,1.99]],1.79,M.glass,0,.015);bar(g,[1.04,2,-.75],[.83,2.18,-.12],.015,M.dark);bar(g,[1.04,2,.16],[.83,2.18,.75],.015,M.dark);box(g,.85,cy-.22,0,.18,.09,1.98,paint,.025);});
 for(let s of [-1,1])part(ctx,`cab-door-${s}`,s>0?'右驾驶室车门':'左驾驶室车门',[1.75,1.75,s*1.06],g=>{box(g,0,-.13,0,1.35,.76,.07,paint,.045);pane(g,[[-.6,.28],[.67,.28],[.4,cy-2.03],[-.6,cy-1.93]],s*.046);bar(g,[-.6,.27,s*.04],[-.6,cy-1.94,s*.04],.035,paint);bar(g,[-.61,cy-1.94,s*.04],[.4,cy-2.03,s*.04],.035,paint);box(g,-.38,.05,s*.06,.22,.05,.05,M.chrome,.015);bar(g,[.66,.6,s*.06],[.68,.63,s*.36],.026,M.chrome);box(g,.68,.55,s*.37,.16,.32,.2,M.dark,.04);box(g,.59,.55,s*.37,.014,.25,.15,M.chrome,.015);});
 part(ctx,'bumper','保险杠与大灯',[3.07,1.17,0],g=>{box(g,0,-.1,0,.2,.25,2.2,M.chrome,.035);grille(g,.08,.38,1.3,.5);for(let s of [-1,1]){box(g,.12,.05,s*.82,.1,.22,.35,M.black,.025);for(let z of [-.08,.08])cylinder(g,.19,.06,s*.82+z,.062,.025,M.lamp,'x');}box(g,.12,-.09,0,.02,.11,.43,M.white,.005);});
 part(ctx,'cab-roof','驾驶室顶棚',[1.8,cy+.03,0],g=>{box(g,0,0,0,1.8,.12,2.1,paint,.07);for(let z of [-.8,-.4,0,.4,.8])box(g,.78,.09,z,.12,.07,.14,M.amber,.018);if(fire){for(let s of [-1,1])box(g,.25,.18,s*.68,.36,.24,.4,M.blue,.05);}else{for(let s of [-1,1])cylinder(g,-.3,.14,s*.65,.1,.37,M.chrome,'x',.14);}});
 part(ctx,'fuel','油箱与工具箱',[-.1,.93,0],g=>{for(let s of [-1,1]){cylinder(g,-.12,.05,s*.83,.25,.85,M.chrome,'x');for(let x of [-.42,.19])box(g,x,.05,s*1.055,.07,.32,.025,M.dark,.007);}box(g,0,.15,0,.8,.35,.6,M.dark,.04);});
 if(semi){part(ctx,'sleeper','长途休息舱',[.33,1.88,0],g=>{box(g,0,0,0,1.2,1.75,2.02,paint,.12);for(let s of [-1,1]){box(g,0,.22,s*1.02,.65,.34,.028,M.glass,.06);for(let y of [-.2,-.33,-.46])box(g,-.1,y,s*1.03,.55,.035,.03,M.chrome,.01);}box(g,0,.91,0,1.16,.15,1.95,ctx.accent,.07);});
 part(ctx,'exhaust','双排气烟囱',[-.38,1.93,0],g=>{for(let s of [-1,1]){cylinder(g,0,0,s*.99,.085,2.15,M.chrome,'y');cylinder(g,0,1.08,s*.99,.057,.025,M.black,'y');for(let y of [-.65,-.4,-.15])cylinder(g,0,y,s*.99,.105,.04,M.brake,'y');}});
 part(ctx,'coupling','牵引鞍座',[-1.75,1,0],g=>{box(g,0,-.06,0,2.3,.12,1.6,M.chrome,.045);cylinder(g,0,.08,0,.6,.12,M.dark,'y');box(g,.35,.15,0,.75,.06,.17,M.black,.015);for(let s of [-1,1])box(g,0,-.08,s*.99,2.7,.14,.43,paint,.05);});
 }else if(fire){part(ctx,'equipment-body','消防器材舱',[-1.29,1.77,0],g=>{box(g,0,0,0,3.35,1.55,2.08,paint,.075);for(let s of [-1,1]){for(let x of [-1.08,0,1.08]){box(g,x,0,s*1.06,.98,1.13,.045,M.chrome,.025);for(let y=-.48;y<.5;y+=.11)box(g,x,y,s*1.09,.9,.02,.015,M.brake,.003);box(g,x,-.3,s*1.12,.3,.05,.04,M.dark,.01);}box(g,0,-.62,s*1.09,3.2,.14,.025,M.white,.01);}for(let s of [-1,1])box(g,-1.71,-.3,s*.82,.04,.24,.22,M.tail,.02);});
 part(ctx,'ladder','云梯',[-1.05,2.72,0],g=>{for(let z of [-.43,.43]){box(g,0,0,z,4,.11,.08,M.chrome,.018);box(g,-.2,.16,z*.8,3.5,.08,.065,M.alloy,.014);}for(let x=-1.85;x<1.91;x+=.28){bar(g,[x,0,-.43],[x,0,.43],.026,M.chrome);bar(g,[x-.15,.16,-.34],[x-.15,.16,.34],.021,M.alloy);}for(let x of [-1.4,1.3])box(g,x,-.13,0,.16,.2,1.18,M.dark,.02);});
 part(ctx,'hose','水管与水泵',[-2.99,1.7,0],g=>{cylinder(g,0,0,0,.38,.9,M.red,'x');for(let x=-.3;x<=.31;x+=.075){const t=torus(g,x,0,0,.3,.047,M.rubber);t.rotation.y=PI/2;}for(let s of [-1,1]){cylinder(g,-.09,-.48,s*.61,.09,.22,M.chrome,'x');cylinder(g,-.22,-.48,s*.61,.13,.03,M.red,'x');}bar(g,[-.2,-.1,.4],[-.3,-.4,.7],.06,M.dark);});
 }else{part(ctx,'deck','吊车作业平台',[-1.15,1.06,0],g=>{box(g,0,0,0,3.85,.25,2.24,paint,.055);for(let s of [-1,1]){box(g,0,.17,s*.97,3.5,.045,.2,M.dark,.01);for(let i=0;i<10;i++)box(g,-1.6+i*.35,-.05,s*1.13,.18,.12,.02,M.black,.005);}cylinder(g,-.15,.25,0,.69,.27,M.dark,'y');});
 part(ctx,'outriggers','稳定支腿',[-1.2,.79,0],g=>{for(let x of [-1.1,1.1]){box(g,x,0,0,.28,.19,2.7,M.dark,.03);for(let s of [-1,1]){box(g,x,0,s*1.2,.3,.25,.6,paint,.02);cylinder(g,x,-.25,s*1.4,.075,.5,M.chrome,'y');box(g,x,-.5,s*1.4,.38,.06,.4,M.dark,.018);}}});
 part(ctx,'boom','伸缩吊臂',[-1.4,1.48,0],g=>{box(g,0,.12,0,1.1,.5,1.3,paint,.06);const boom=new THREE.Group();boom.rotation.z=.18;box(boom,1.28,.5,0,3.55,.42,.48,paint,.05);box(boom,2.55,.5,0,1.5,.29,.34,M.dark,.025);box(boom,3.23,.5,0,.65,.2,.23,M.chrome,.02);for(let z of [-.31,.31]){bar(boom,[-.35,.12,z],[1.55,.35,z],.08,M.chrome);bar(boom,[-.35,.12,z],[.55,.22,z],.12,paint);}cylinder(boom,-.24,.48,0,.18,.68,M.brake);g.add(boom);box(g,-.72,.25,0,.44,.72,1.45,M.dark,.045);});
 part(ctx,'hook','吊钩与钢索',[2.05,2.6,0],g=>{bar(g,[0,.08,0],[0,-.75,0],.015,M.dark);box(g,0,-.8,0,.2,.22,.23,paint,.03);const hook=torus(g,.02,-1,0,.12,.035,M.chrome,PI*1.6);hook.rotation.z=.6;});
 }
}
function excavator(ctx){const paint=ctx.paint;ctx.dimensions={length:6.2,width:2.6,height:3.25};const base=new THREE.Group();box(base,-.65,.48,0,2.8,.3,1.8,M.dark,.055);cylinder(base,-.65,.8,0,.65,.38,M.brake,'y');batch(base);ctx.group.add(base);
 for(let s of [-1,1])part(ctx,`track-${s}`,s>0?'右履带':'左履带',[-.65,.47,s*1.01],g=>{profile(g,[[-1.55,-.23],[-1.7,0],[-1.55,.3],[1.2,.3],[1.42,0],[1.2,-.23]],.5,M.rubber,0,.04);for(let x=-1.25;x<1.3;x+=.5){cylinder(g,x,0,s*.27,.25,.09,M.brake);cylinder(g,x,0,s*.33,.11,.03,M.chrome);}for(let i=0;i<19;i++){const x=-1.5+i*.15;for(let y of [-.29,.35]){box(g,x,y,0,.13,.08,.58,M.tread,.009);box(g,x,y+(y>0?.047:-.047),0,.07,.025,.61,M.brake,.005);}}for(let x of [-1.57,1.32])for(let i=0;i<7;i++){const a=-PI/2+i*PI/6;const o=box(g,x+(x<0?-1:1)*Math.cos(a)*.18,Math.sin(a)*.29+.03,0,.12,.08,.58,M.tread,.008);o.rotation.z=(x<0?1:-1)*a;}});
 part(ctx,'engine','发动机配重舱',[-1.45,1.28,.15],g=>{box(g,0,0,0,1.65,.82,1.85,paint,.15);for(let s of [-1,1])for(let i=0;i<8;i++)box(g,-.4+i*.12,.1,s*.94,.055,.32,.018,M.black,.006);box(g,-.86,-.04,0,.04,.25,1.35,M.dark,.03);for(let s of [-1,1])box(g,-.89,.15,s*.6,.025,.12,.2,M.tail,.02);});
 part(ctx,'cab-base','驾驶室底座',[-.35,1.15,-.65],g=>{box(g,0,0,0,1.25,.37,1.04,paint,.05);box(g,.3,-.23,-.64,.7,.09,.35,M.dark,.02);box(g,.3,-.09,-.65,.7,.025,.34,M.chrome,.008);});
 part(ctx,'cab-windows','全景驾驶舱',[-.4,1.5,-.65],g=>{for(let s of [-1,1])pane(g,[[-.59,0],[.61,0],[.47,1.25],[-.59,1.25]],s*.49);profile(g,[[.61,0],[.47,1.25],[.44,1.25],[.58,0]],.96,M.glass,0,.004);box(g,-.61,.62,0,.025,1.2,.96,M.glass,.01);for(let z of [-.5,.5]){bar(g,[-.61,0,z],[-.61,1.3,z],.045,M.dark);bar(g,[.61,0,z],[.47,1.3,z],.045,M.dark);bar(g,[-.61,.12,z],[.6,.12,z],.035,paint);}box(g,-.05,1.31,0,1.23,.12,1.12,paint,.06);});
 part(ctx,'seat','座椅与操纵杆',[-.45,1.46,-.65],g=>{seats(g,0,0,0,1.1);for(let s of [-1,1]){box(g,0,.12,s*.33,.4,.15,.12,M.dark,.025);bar(g,[.1,.2,s*.33],[.16,.5,s*.33],.025,M.chrome);cylinder(g,.16,.51,s*.33,.05,.1,M.black,'y');}});
 part(ctx,'platform','回转平台',[-.5,1,.1],g=>{box(g,0,0,0,3.05,.18,2.2,paint,.055);cylinder(g,.48,.22,.5,.22,.6,M.brake);for(let z of [-.2,1])box(g,.45,.28,z,.6,.55,.11,paint,.04);});
 part(ctx,'boom','挖掘机主臂',[.2,1.3,.55],g=>{profile(g,[[-.25,-.08],[.1,-.15],[1.28,1.54],[1.9,1.63],[1.86,1.94],[1.1,1.95]],.35,paint,0,.045);for(let p of [[0,0],[1.18,1.76],[1.86,1.78]]){cylinder(g,p[0],p[1],0,.12,.43,M.chrome);cylinder(g,p[0],p[1],.23,.07,.025,M.dark);}bar(g,[.25,.03,-.28],[1.35,1.64,-.28],.075,M.chrome);bar(g,[.25,.03,-.28],[.8,.84,-.28],.12,paint);bar(g,[-.18,.15,.24],[.95,1.9,.24],.03,M.dark);});
 part(ctx,'dipper','挖掘机小臂',[2.06,3.08,.55],g=>{profile(g,[[-.15,.12],[.18,.11],[.87,-1.35],[.6,-1.48]],.3,paint,0,.035);cylinder(g,0,0,0,.12,.4,M.chrome);cylinder(g,.73,-1.37,0,.11,.4,M.chrome);bar(g,[.2,-.12,-.23],[.7,-1.1,-.23],.055,M.chrome);bar(g,[.2,-.12,-.23],[.48,-.65,-.23],.085,M.dark);});
 part(ctx,'bucket','挖斗',[2.78,1.66,.55],g=>{for(let z of [-.43,.43])profile(g,[[-.12,.06],[.21,.04],[.53,-.7],[-.14,-.66],[-.45,-.35]],.055,paint,z,.025);profile(g,[[-.43,-.35],[-.15,-.65],[.53,-.7],[.52,-.6],[-.1,-.55],[-.34,-.29]],.86,M.dark,0,.015);for(let z of [-.35,-.12,.12,.35]){const t=box(g,.53,-.66,z,.29,.1,.13,M.chrome,.015);t.rotation.z=.17;}cylinder(g,0,0,0,.1,1.03,M.brake);});
 part(ctx,'hydraulics','液压管路',[.1,1.45,.55],g=>{for(let z of [-.32,.32]){bar(g,[0,0,z],[.4,.9,z],.03,M.rubber);bar(g,[.4,.9,z],[1.08,1.8,z],.03,M.rubber);bar(g,[1.08,1.8,z],[1.9,1.68,z],.03,M.rubber);}box(g,-.2,-.02,0,.42,.25,.55,M.dark,.035);});
 part(ctx,'exhaust','排气管与护栏',[-1.72,1.9,.6],g=>{cylinder(g,0,0,0,.07,.8,M.dark,'y');cylinder(g,0,.4,0,.09,.08,M.chrome,'y');for(let z of [-.3,.3])bar(g,[-.5,-.22,z],[.45,-.22,z],.025,M.chrome);});
 part(ctx,'worklights','作业灯与警示灯',[-.5,2.93,-.65],g=>{for(let z of [-.42,.42]){box(g,.51,-.06,z,.16,.14,.2,M.dark,.03);box(g,.6,-.06,z,.025,.09,.14,M.lamp,.015);}cylinder(g,-.38,.09,.28,.1,.18,M.amber,'y');});
}

export function buildClassicVehicle(cfg,livery){
 M=materials();
 const ctx={group:new THREE.Group(),parts:[],paint:mat(livery.color,.2,.34),accent:mat(livery.accent,.05,.42),dimensions:{length:5,width:2,height:2.5}};
 ctx.group.name=cfg.name;
 if(cfg.id==='excavator')excavator(ctx);else if(['truck','fire','crane'].includes(cfg.id))truckVehicle(ctx,cfg);else passenger(ctx,cfg);
 ctx.group.userData={vehicleId:cfg.id,liveryId:livery.id,style:'classic',labels:cfg.id==='police'?['110']:cfg.id==='taxi'?['TAXI']:[]};
 const size=new THREE.Box3().setFromObject(ctx.group).getSize(new THREE.Vector3());ctx.dimensions={length:size.x,width:size.z,height:size.y};
 return {group:ctx.group,parts:ctx.parts,dimensions:ctx.dimensions,animate(time,drive=false){if(!drive)return;for(const p of ctx.parts)if(p.id.startsWith('wheel-'))p.group.rotation.z=-time*3;}};
}

// Smooth longitudinal stations, not a stretched box: shoulders, waist and nose
// each have their own width and height. Smooth normals preserve painted curves.
function coachwork(g,stations,m){
 const ring=[[0,1],[.55,.99],[.88,.91],[1,.68],[.98,.16],[.72,0],[0,0],[-.72,0],[-.98,.16],[-1,.68],[-.88,.91],[-.55,.99]],p=[],idx=[];
 for(const [x,w,lo,hi] of stations)for(const [z,y] of ring)p.push(x,lo+(hi-lo)*y,z*w);
 const n=ring.length;for(let k=0;k<stations.length-1;k++)for(let i=0;i<n;i++){const a=k*n+i,b=k*n+(i+1)%n,c=(k+1)*n+i,d=(k+1)*n+(i+1)%n;idx.push(a,b,c,b,d,c);}
 for(let i=1;i<n-1;i++){idx.push(0,i+1,i);let o=(stations.length-1)*n;idx.push(o,o+i,o+i+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(g,geo,m);
}
function quad(g,points,m){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();return mesh(g,geo,m);}
function supercar(ctx){
 const paint=ctx.paint;const fixed=new THREE.Group();box(fixed,0,.36,0,3.8,.15,1.45,M.dark,.04);for(let x of [-1.5,1.5])cylinder(fixed,x,.47,0,.06,2.06,M.brake);batch(fixed);ctx.group.add(fixed);
 for(let x of [-1.5,1.5])for(let side of [-1,1])part(ctx,`wheel-${x}-${side}`,`${x>0?'前':'后'}${side>0?'右':'左'}车轮`,[x,.47,side*1.04],g=>wheel(g,.43,.3));
 part(ctx,'body','流线型车身',[0,0,0],g=>{
  coachwork(g,[[-2.32,.83,.53,.94],[-2.12,.99,.49,1.08],[-1.55,1.09,.48,1.13],[-1.1,1.05,.45,1.04],[-.6,.96,.44,.98],[.2,.94,.44,.97],[.8,1.02,.45,1.02],[1.45,1.04,.46,.99],[1.9,.97,.48,.87],[2.3,.83,.51,.69],[2.4,.69,.54,.64]],paint);
  for(let side of [-1,1]){for(let x of [-1.5,1.5])torus(g,x,.47,side*1.065,.474,.028,paint,PI);bar(g,[-.92,.54,side*1.015],[.9,.54,side*.99],.035,M.dark);}
 });
 part(ctx,'hood','楔形前机盖',[0,0,0],g=>{
  coachwork(g,[[.68,.7,.97,1.025],[1,.75,.96,1.015],[1.45,.76,.87,.955],[1.9,.72,.74,.81],[2.25,.59,.64,.7]],paint);
  for(let side of [-1,1])bar(g,[.78,1.035,side*.47],[1.91,.8,side*.53],.009,M.dark);
 });
 part(ctx,'glass','弧形全景车窗',[0,0,0],g=>{
  quad(g,[[.9,1.04,-.82],[.9,1.04,.82],[.03,1.46,.61],[.03,1.46,-.61]],M.glass);
  for(let side of [-1,1])quad(g,[[-1.05,1.04,side*.86],[.82,1.04,side*.82],[.03,1.46,side*.62],[-.72,1.46,side*.66]],M.glass);
  quad(g,[[-1.15,1.06,.85],[-1.15,1.06,-.85],[-.72,1.46,-.66],[-.72,1.46,.66]],M.glass);
  bar(g,[.85,1.07,-.6],[.65,1.15,.13],.013,M.black);
 });
 part(ctx,'roof','跑车车顶',[0,0,0],g=>{
  coachwork(g,[[-.8,.65,1.42,1.49],[-.6,.69,1.45,1.53],[-.15,.68,1.45,1.52],[.09,.62,1.42,1.48]],paint);
  for(let side of [-1,1]){bar(g,[.91,1.03,side*.83],[.03,1.48,side*.63],.03,paint);bar(g,[-1.15,1.06,side*.86],[-.74,1.48,side*.67],.04,paint);}
 });
 for(let side of [-1,1])part(ctx,`doors-${side}`,side>0?'右跑车门与进气口':'左跑车门与进气口',[0,0,0],g=>{
  profile(g,[[-.72,.58],[.85,.59],[.88,.97],[-.66,1.01],[-.99,.86]],.035,paint,side*.99,.025);
  // Recess-shaped intake and raised sculpted surround ahead of the rear wheel.
  pane(g,[[-1.12,.69],[-.9,1.06],[-.35,.97],[-.7,.72]],side*1.09,M.black);
  bar(g,[-1.1,.7,side*1.1],[-.88,1.065,side*1.1],.025,paint);
  bar(g,[-.88,1.065,side*1.1],[-.35,.975,side*1.1],.022,paint);
  for(let k=0;k<3;k++)bar(g,[-1+.08*k,.77,side*1.1],[-.85+.09*k,.98,side*1.1],.012,M.dark);
  box(g,-.51,.97,side*1.06,.18,.028,.025,M.dark,.008);
  bar(g,[.64,1.07,side*.86],[.61,1.16,side*1.11],.022,M.dark);box(g,.63,1.18,side*1.15,.24,.1,.15,paint,.04);box(g,.5,1.18,side*1.15,.013,.065,.11,M.chrome,.01);
 });
 part(ctx,'interior','赛车座椅与方向盘',[-.12,.66,0],g=>{interior(g,1.55,1.34);for(let side of [-1,1]){bar(g,[-.4,.24,side*.35],[-.4,.64,side*.35],.03,M.red);}});
 part(ctx,'front','刀锋大灯与前进气口',[0,0,0],g=>{
  box(g,2.35,.585,0,.07,.1,1.12,M.black,.04);
  for(let side of [-1,1]){
   const housing=box(g,1.83,.895,side*.79,.59,.055,.18,M.black,.055);housing.rotation.z=-.31;housing.rotation.y=side*.2;
   const blade=box(g,1.83,.929,side*.79,.52,.018,.045,M.lamp,.014);blade.rotation.z=-.31;blade.rotation.y=side*.2;
   for(let k=0;k<3;k++){const led=box(g,1.63+k*.1,.98-k*.03,side*(.79-k*.015),.045,.02,.1,M.lamp,.01);led.rotation.z=-.3;}
   box(g,2.23,.61,side*.63,.08,.13,.3,M.black,.035);
  }
 });
 part(ctx,'rear','圆形尾灯与双排气',[0,0,0],g=>{box(g,-2.34,.79,0,.04,.2,1.48,M.black,.025);for(let side of [-1,1]){for(let z of [.5,.73]){cylinder(g,-2.38,.89,side*z,.09,.04,M.tail,'x');cylinder(g,-2.405,.89,side*z,.044,.014,M.black,'x');}cylinder(g,-2.39,.59,side*.48,.09,.17,M.chrome,'x');cylinder(g,-2.48,.59,side*.48,.064,.01,M.black,'x');}});
 part(ctx,'engine-deck','中置发动机与散热盖',[0,0,0],g=>{
  coachwork(g,[[-2.21,.74,.96,1.02],[-1.8,.81,1.01,1.08],[-1.19,.81,1.03,1.09]],paint);
  box(g,-1.68,1.1,0,.72,.018,.93,M.black,.045);
  for(let x=-1.98;x< -1.2;x+=.12)box(g,x,1.125,0,.055,.035,.89,M.dark,.012);
  for(let side of [-1,1])profile(g,[[-1.95,1.08],[-1.15,1.08],[-.74,1.44],[-.96,1.42]],.13,paint,side*.72,.03);
 });
 part(ctx,'spoiler','低位空气动力尾翼',[-2.17,1.18,0],g=>{for(let side of [-1,1])box(g,0,-.06,side*.59,.08,.15,.045,M.dark,.01);box(g,0,.04,0,.29,.065,1.88,paint,.03);});
 part(ctx,'diffuser','赛车底部扩散器',[0,0,0],g=>{box(g,2.19,.505,0,.43,.045,1.84,M.dark,.025);box(g,-2.2,.48,0,.4,.06,1.77,M.dark,.025);for(let z=-.72;z<=.72;z+=.24)box(g,-2.2,.45,z,.47,.15,.025,M.dark,.006);for(let side of [-1,1])box(g,0,.47,side*1.03,2.1,.06,.16,M.dark,.02);});
}
