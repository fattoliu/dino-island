import * as THREE from './vendor/three.module.min.js';
import {CLASSIC_IDS,buildClassicVehicle} from './classic-vehicles.js?v=5.2';

// Original detailed miniature vehicles with crisp panels and small edge bevels.
// No emoji artwork, brand logos, fonts, textures or external models are copied.
// +X is the nose; +Y is up. Labels are real geometry in BOTH renderers.
const catalog = [
 ['gclass','方盒子大G','大G','🚙','越野车','#15934e','#fff2b0'],
 ['landcruiser','探险越野车','兰德酷路泽','🚙','越野车','#f3a416','#fff5da'],
 ['bmw','蓝色运动赛车','宝马赛车','🏎️','赛车','#0874d9','#fff5da'],
 ['ferrari','流线超级跑车','法拉利','🏎️','赛车','#e52b2f','#fff0ae'],
 ['truck','长途大卡车','大卡车','🚛','大卡车','#009eaf','#ffd356'],
 ['fire','云梯消防车','消防车','🚒','救援车','#e62e26','#fff5db'],
 ['police','110巡逻警车','警车','🚓','救援车','#faf9ed','#155cc4'],
 ['taxi','城市出租车','出租车','🚕','城市车','#ffc400','#ffffff'],
 ['crane','伸臂大吊车','大吊车','🏗️','工程车','#f4ab08','#5567bc'],
 ['excavator','履带挖掘机','挖掘机','🚜','工程车','#f2ae0b','#5068bd'],
 ['ambulance','120救护车','救护车','🚑','救援车','#fff9ec','#ed303f'],
 ['bus','彩虹城市巴士','城市巴士','🚌','巴士','#009fc9','#ffe783'],
 ['schoolbus','快乐小校车','校车','🚍','巴士','#ffc400','#f28b37'],
 ['minibus','小小接驳巴士','小巴','🚐','巴士','#8144d6','#ffe7a0'],
 ['pickup','探险皮卡','皮卡','🛻','城市车','#069777','#ffdf74'],
 ['van','快递小货车','小货车','🚐','城市车','#f17919','#fff3d0'],
 ['camper','森林露营车','房车','🚐','旅行车','#19a77c','#fff3cf'],
 ['garbage','城市清洁车','清洁车','🚛','工程车','#33a541','#ffdc62'],
 ['mixer','水泥搅拌车','搅拌车','🚚','工程车','#237bdb','#ffcd4c'],
 ['tractor','农场拖拉机','拖拉机','🚜','农场车','#519f26','#ffe565'],
 ['compact','糖果小轿车','小轿车','🚗','城市车','#e83978','#ffefc0'],
 ['icecream','甜筒冰淇淋车','冰淇淋车','🍦','旅行车','#ea68ad','#19b995']
];
const rescueLiveries = {
 police:[['sky','天空巡逻','#eef7ff','#3987d9'],['night','深蓝巡逻','#3c61b4','#fff4cb']],
 ambulance:[['mint','薄荷急救','#f2fff7','#21b9a8'],['blue','蓝色急救','#f1f8ff','#3984e8']],
 fire:[['orange','橙色救援','#f46c15','#fff0b5'],['cherry','樱桃消防','#d94062','#ffecc7']],
 taxi:[['mint','薄荷出租','#0ebc8c','#fff0ab'],['orange','橘子出租','#f57923','#fff0ab']],
 schoolbus:[['sunny','向日葵校车','#ffdf58','#ee9b36'],['orange','橘子校车','#ffa549','#fff0a0']]
};
export const VEHICLES = catalog.map(([id,name,shortName,emoji,category,color,accent])=>({
 id,name,shortName,emoji,category,color,accent,
 liveries:[{id:'default',name:'经典原色',color,accent},...(rescueLiveries[id]||[
  ['ocean','海洋蓝','#078ed9','#fff1b8'],['berry','莓果紫','#8c4ed4','#ffd88a'],['peach','蜜桃橙','#f37530','#fff0bd']
 ]).map(([id,name,color,accent])=>({id,name,color,accent}))]
}));
const PI=Math.PI;
const material=(color,roughness=.38,metalness=.12,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
let M;
function materials(){return {
 rubber:material('#1c2936',.88,.02),dark:material('#2a3e53',.6,.08),chrome:material('#d9e7ee',.28,.5),
 white:material('#f6f7f2',.52,0),glass:material('#123f58',.26,.12),shine:material('#65c7e4',.3),
 lamp:material('#fff3b9',.25,.1,{emissive:'#ffe8a0',emissiveIntensity:.25}),
 red:material('#f14b62'),blue:material('#3998ef'),amber:material('#ffbc39'),seat:material('#ebaf6a'),
};}
function mesh(g,geo,mat,x=0,y=0,z=0,rotation){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);if(rotation)o.rotation.set(...rotation);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
// Preserve the broad flat faces. Only a small bevel catches the key light.
function rounded(w,h,d,r){r=Math.min(r*.24,.055,w*.15,h*.15,d*.15);const shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2+r);shape.lineTo(w/2-r,-h/2+r);shape.lineTo(w/2-r,h/2-r);shape.lineTo(-w/2+r,h/2-r);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,steps:1,curveSegments:1});geo.translate(0,0,-d/2+r);return geo;}
function box(g,x,y,z,w,h,d,m,r=.08){return mesh(g,r?rounded(w,h,d,r):new THREE.BoxGeometry(w,h,d),m,x,y,z);}
function cyl(g,x,y,z,r,h,m,axis='z',r2=r,n=16){return mesh(g,new THREE.CylinderGeometry(r2,r,h,n),m,x,y,z,axis==='z'?[PI/2,0,0]:axis==='x'?[0,0,PI/2]:null);}
function ball(g,x,y,z,w,h,d,m){const o=mesh(g,new THREE.SphereGeometry(1,16,10),m,x,y,z);o.scale.set(w,h,d);return o;}
function ring(g,x,y,z,r,t,m,arc=PI*2){return mesh(g,new THREE.TorusGeometry(r,t,6,20,arc),m,x,y,z);}
function bar(g,a,b,r,m){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const o=mesh(g,new THREE.CylinderGeometry(r,r,delta.length(),8),m,...start.add(end).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
function profile(g,points,width,m,z=0,r=.06){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:width,bevelEnabled:true,bevelSize:r*.3,bevelThickness:r*.3,bevelSegments:1,steps:1});geo.translate(0,0,z-width/2);return mesh(g,geo,m);}
function batch(group){group.updateMatrixWorld(true);const inv=group.matrixWorld.clone().invert(),buckets=new Map();group.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inv.clone().multiply(o.matrixWorld));if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);o.geometry.dispose();});group.clear();for(const [m,geos] of buckets){const count=geos.reduce((n,g)=>n+g.attributes.position.count,0),positions=new Float32Array(count*3),normals=new Float32Array(count*3);let at=0;for(const g of geos){positions.set(g.attributes.position.array,at);normals.set(g.attributes.normal.array,at);at+=g.attributes.position.array.length;g.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('normal',new THREE.BufferAttribute(normals,3));g.computeBoundingSphere();mesh(group,g,m);}}
function part(ctx,id,name,make){const g=new THREE.Group();g.name=name;make(g);batch(g);const center=new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());g.children.forEach(o=>o.geometry.translate(-center.x,-center.y,-center.z));g.position.copy(center);ctx.group.add(g);ctx.parts.push({id,name,group:g,target:center.clone()});return g;}
function fixed(ctx,make){const g=new THREE.Group();make(g);batch(g);ctx.group.add(g);}
// Compact 5 x 7 vector glyphs. Every stroke is a mesh, never a canvas texture.
const FONT={
 '0':['01110','11011','11011','11011','11011','11011','01110'],
 '1':['00110','01110','00110','00110','00110','00110','01111'],
 '2':['01110','11011','00011','00110','01100','11000','11111'],
 'T':['11111','11111','00100','00100','00100','00100','00100'],
 'A':['01110','11011','11011','11111','11011','11011','11011'],
 'X':['11011','11011','01110','00100','01110','11011','11011'],
 'I':['11111','00100','00100','00100','00100','00100','11111']
};
function textLabel(g,text,x,y,z,height,m,side=1){const holder=new THREE.Group(),u=height/7;holder.position.set(x,y,z);holder.rotation.y=side<0?PI:0;const width=(text.length*6-1)*u;[...text].forEach((ch,k)=>{const rows=FONT[ch];if(!rows)return;rows.forEach((row,ri)=>{let start=-1;for(let c=0;c<=5;c++){if(c<5&&row[c]==='1'){if(start<0)start=c;}else if(start>=0){box(holder,-width/2+(k*6+(start+c)/2)*u,(3-ri)*u,0,(c-start)*u,u,.018,m,0);start=-1;}}});});g.add(holder);}
function badge(g,x,y,z,m,side=1){box(g,x,y,z,.15,.44,.028,m,.02);box(g,x,y,z,.44,.15,.03,m,.02);}
function wheel(g,x,y,z,r=.5,w=.34,accent=M.white){cyl(g,x,y,z,r*.85,w,M.rubber);ring(g,x,y,z+w*.31,r*.73,r*.25,M.rubber);ring(g,x,y,z-w*.31,r*.73,r*.25,M.rubber);for(const side of [-1,1]){cyl(g,x,y,z+side*(w*.51),r*.58,.045,M.chrome);cyl(g,x,y,z+side*(w*.59),r*.42,.045,accent);cyl(g,x,y,z+side*(w*.67),r*.18,.045,M.white);for(let j=0;j<5;j++){const a=j*2*PI/5;cyl(g,x+Math.sin(a)*r*.31,y+Math.cos(a)*r*.31,z+side*w*.67,r*.047,.018,M.dark,'z',r*.047,6);}}}
function wheels(ctx,axles,W=1.8,R=.49){for(const [i,x] of axles.entries())for(const s of [-1,1])part(ctx,`wheel-${i}-${s}`,`${i===axles.length-1?'前':i===0?'后':'中'}${s>0?'右':'左'}车轮`,g=>wheel(g,x,R+.025,s*(W/2+.03),R,.34,ctx.accent));}
function chassis(ctx,L,W,R=.49){fixed(ctx,g=>{box(g,0,R+.04,0,L*.85,.23,W*.7,M.dark,.1);for(const z of [-W*.3,W*.3])box(g,0,R-.03,z,L*.64,.16,.12,M.chrome,.04);});}
function face(ctx,L,W,y,round=false){part(ctx,'front','笑脸车头与大灯',g=>{box(g,L/2+.04,y-.18,0,.17,.2,W*.95,ctx.accent,.08);box(g,L/2+.135,y-.12,0,.03,.11,.6,M.dark,.04);for(const s of [-1,1]){if(round){cyl(g,L/2+.06,y+.1,s*W*.34,.19,.1,M.chrome,'x');cyl(g,L/2+.125,y+.1,s*W*.34,.145,.03,M.lamp,'x');}else{box(g,L/2+.06,y+.1,s*W*.33,.1,.2,.38,M.chrome,.08);box(g,L/2+.12,y+.11,s*W*.33,.035,.135,.3,M.lamp,.055);}box(g,L/2+.12,y-.24,s*W*.37,.04,.055,.13,M.amber,.02);}});part(ctx,'rear','尾灯与后保险杠',g=>{box(g,-L/2-.02,y-.18,0,.15,.2,W*.94,ctx.accent,.07);for(const s of [-1,1])box(g,-L/2-.11,y+.05,s*W*.35,.055,.22,.22,M.red,.07);box(g,-L/2-.11,y-.16,0,.025,.09,.42,M.white,.02);});}
function mirrors(g,x,y,W,paint){for(const s of [-1,1]){bar(g,[x,y,s*W*.48],[x+.04,y+.04,s*(W*.5+.18)],.04,M.dark);box(g,x+.03,y+.09,s*(W*.5+.19),.25,.19,.17,paint,.07);box(g,x-.1,y+.09,s*(W*.5+.19),.018,.12,.12,M.shine,.03);}}
function beacon(g,x,y,W=1){box(g,x,y,0,.36,.12,W,M.white,.05);box(g,x,y+.13,-W*.26,.31,.24,W*.43,M.blue,.1);box(g,x,y+.13,W*.26,.31,.24,W*.43,M.red,.1);}
function seat(g,x,y,z){box(g,x,y,z,.55,.18,.47,M.seat,.07);box(g,x-.2,y+.23,z,.17,.5,.47,M.seat,.07);}

// Longitudinal hand-sculpted cross sections give cars a real shoulder, waist,
// curved fender volume and tapered nose, rather than a recolored rectangular box.
function coachwork(g,stations,m){
 const ring=[[0,1],[.52,.99],[.83,.91],[.98,.7],[1,.4],[.94,.1],[.72,0],[0,0],[-.72,0],[-.94,.1],[-1,.4],[-.98,.7],[-.83,.91],[-.52,.99]],p=[],idx=[],n=ring.length;
 for(const [x,w,lo,hi] of stations)for(const [z,y] of ring)p.push(x,lo+(hi-lo)*y,z*w);
 for(let k=0;k<stations.length-1;k++)for(let i=0;i<n;i++){let a=k*n+i,b=k*n+(i+1)%n,c=(k+1)*n+i,d=(k+1)*n+(i+1)%n;idx.push(a,b,c,b,d,c);}
 for(let i=1;i<n-1;i++){idx.push(0,i+1,i);let o=(stations.length-1)*n;idx.push(o,o+i,o+i+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(g,geo,m);
}

function car(ctx,cfg){const id=cfg.id,suv=['gclass','landcruiser'].includes(id),sport=['bmw','ferrari'].includes(id),compact=id==='compact',pickup=id==='pickup',ferrari=id==='ferrari',G=id==='gclass';const W=ferrari?2.14:sport?1.95:1.8,L=compact?3.35:ferrari?4.65:pickup?4.75:suv?4.5:4.3,R=suv||pickup?.53:ferrari?.43:.48,belt=suv?1.4:ferrari?.94:sport?1.12:1.18,roof=suv?2.34:ferrari?1.43:sport?1.8:compact?2.08:1.92,ax=compact?1.01:L*.32,curvy=!suv&&!pickup;
 chassis(ctx,L,W,R);wheels(ctx,[-ax,ax],W,R);
 part(ctx,'body','立体车身外壳',g=>{
  if(ferrari)coachwork(g,[[-L/2,.79,.52,.86],[-1.96,1.02,.5,1.02],[-1.5,1.1,.47,1.1],[-.7,.99,.46,.97],[.3,.96,.46,.94],[1.15,1.07,.48,1.02],[1.65,1.04,.49,.92],[2.08,.89,.51,.72],[L/2,.7,.53,.62]],ctx.paint);
  else if(curvy)coachwork(g,[[-L/2,.62,.64,.97],[-L*.42,.83,.58,1.16],[-L*.3,.94,.55,1.29],[-.4,.92,.55,1.27],[.5,.91,.55,1.27],[L*.32,.94,.57,1.2],[L*.44,.82,.61,1.1],[L/2,.65,.65,.96]],ctx.paint);
  else box(g,0,.94,0,L,.66,W,ctx.paint,.23);
  if(sport)box(g,0,.53,0,L*.86,.1,W,ctx.accent,.05);
  for(const side of [-1,1])for(const x of [-ax,ax])ring(g,x,R+.025,side*(W*.5+.025),R+.04,.065,suv?M.dark:ctx.paint,PI);
 });
 const front=G?.9:pickup?.8:compact?1.01:ferrari?.92:.84,rear=pickup?-.83:G?-1.8:suv?-1.7:compact?-1.4:ferrari?-1.28:-1.48,topFront=G?.72:compact?.38:ferrari?-.13:.1,topRear=G?-1.72:ferrari?-.76:compact?-.82:curvy?-.92:rear+.2;
 part(ctx,'hood','发动机盖',g=>{
  if(ferrari){coachwork(g,[[.88,.66,.93,.98],[1.3,.77,.87,.96],[1.7,.77,.75,.86],[2.07,.66,.61,.73],[2.24,.54,.58,.66]],ctx.paint);for(const side of [-1,1])bar(g,[1.03,.99,side*.32],[1.96,.76,side*.38],.018,ctx.accent);}
  else if(curvy){coachwork(g,[[front,.72,1.15,1.28],[front+.23,.82,1.15,1.31],[L*.42,.8,1.03,1.2],[L*.49,.65,.95,1.07]],ctx.paint);}
  else box(g,(front+L/2)/2,belt,0,L/2-front+.12,.24,W*.94,ctx.paint,.12);
 });
 part(ctx,'glass','蓝色全景车窗',g=>{
  if(curvy)coachwork(g,[[rear,W*.42,belt,belt+.06],[rear+.15,W*.46,belt,roof-.27],[topRear,W*.44,belt,roof-.03],[(topFront+topRear)/2,W*.44,belt,roof+.03],[topFront,W*.43,belt,roof-.04],[front-.16,W*.46,belt,belt+.25],[front,W*.41,belt,belt+.04]],M.glass);
  else profile(g,[[rear,belt+.03],[front,belt+.03],[topFront,roof-.08],[topRear,roof-.08]],W*.88,M.glass,0,.09);
 });
 part(ctx,'roof','车顶与窗框',g=>{
  if(curvy)coachwork(g,[[topRear-.08,W*.32,roof-.05,roof+.01],[topRear+.15,W*.38,roof-.02,roof+.13],[topFront-.17,W*.38,roof-.02,roof+.13],[topFront+.06,W*.31,roof-.07,roof+.01]],ctx.paint);
  else box(g,(topFront+topRear)/2,roof,0,topFront-topRear+.25,.17,W*.96,ctx.paint,.08);
  for(const side of [-1,1]){const z=side*W*(curvy?.38:.47),lower=side*W*(curvy?.43:.47);bar(g,[front,belt,lower],[topFront,roof-.03,z],.048,ctx.paint);bar(g,[rear,belt,lower],[topRear,roof-.03,z],.052,ctx.paint);if(!sport)bar(g,[(front+rear)*.5,belt,side*W*.46],[(topFront+topRear)*.5,roof-.03,z],.04,ctx.paint);}
 });
 for(const s of [-1,1])part(ctx,`doors-${s}`,s>0?'右侧小车门':'左侧小车门',g=>{const doorL=pickup?1.55:compact?1.65:2.2;box(g,(front+rear)*.5,ferrari?.77:1.03,s*(W/2+.005),doorL,ferrari?.22:.32,.055,ctx.paint,.08);box(g,-.3,ferrari?.91:1.17,s*(W/2+.08),.23,.065,.045,ctx.accent,.025);if(id==='police'){box(g,-.3,1.03,s*(W/2+.08),1.75,.42,.03,ctx.accent,.05);textLabel(g,'110',-.3,1.04,s*(W/2+.108),.29,M.white,s);}if(id==='taxi'){for(let i=0;i<9;i++)box(g,-.85+i*.19,1.02,s*(W/2+.08),.09,.085,.025,M.dark,0);}if(ferrari){profile(g,[[-1.08,.7],[-.83,.99],[-.36,.92],[-.67,.7]],.035,M.dark,s*(W/2+.04),.025);}if(suv)box(g,-.3,.67,s*(W/2+.1),2.5,.14,.22,ctx.accent,.06);});
 part(ctx,'mirrors','圆圆后视镜',g=>mirrors(g,front-.02,belt+.25,W,ctx.paint));
 part(ctx,'interior','座椅与方向盘',g=>{for(const z of [-.4,.4])seat(g,-.15,ferrari?.65:.93,z);const steering=ring(g,.5,ferrari?1.05:1.25,-.4,.17,.035,M.dark);steering.rotation.y=PI/2;box(g,.65,1.1,0,.25,.16,1.3,M.dark,.06);});
 face(ctx,L,ferrari?1.72:W,ferrari?.64:1.04,G||compact);
 if(G)part(ctx,'spare','背上的小备胎',g=>{const p=new THREE.Group();wheel(p,0,0,0,.43,.25,ctx.paint);p.rotation.y=PI/2;p.position.set(-L/2-.22,1.45,0);g.add(p);});
 else if(sport)part(ctx,'spoiler','飞翼赛车尾翼',g=>{for(const s of [-1,1])box(g,-1.72,ferrari?1.1:1.32,s*.6,.13,ferrari?.23:.4,.1,M.dark,.045);box(g,-1.72,ferrari?1.25:1.55,0,.42,.13,2.02,ctx.accent,.065);});
 else if(id==='police')part(ctx,'lightbar','红蓝巡逻警灯',g=>beacon(g,-.55,roof+.16,1.2));
 else if(id==='taxi')part(ctx,'sign','TAXI出租车顶灯',g=>{box(g,-.5,roof+.28,0,1,.35,.42,M.lamp,.12);for(const s of [-1,1])textLabel(g,'TAXI',-.5,roof+.28,s*.225,.22,M.dark,s);});
 else if(pickup)part(ctx,'bed','开放式皮卡货斗',g=>{box(g,-1.58,1.27,0,1.32,.12,1.73,M.dark,.05);for(const s of [-1,1])box(g,-1.6,1.5,s*.8,1.35,.43,.16,ctx.paint,.08);box(g,-2.19,1.5,0,.14,.43,1.65,ctx.paint,.07);box(g,-1.65,1.39,0,.67,.23,.7,ctx.accent,.08);});
 else if(suv)part(ctx,'roofrack','探险行李与车顶架',g=>{for(const x of [-1.2,-.3])box(g,x,roof+.15,0,.1,.1,1.62,M.dark,.03);box(g,-.8,roof+.4,0,1.25,.42,1.1,ctx.accent,.16);for(const z of [-.3,.3])box(g,-.8,roof+.62,z,1.03,.035,.07,M.white,.012);});
 else part(ctx,'tailgate','小尾门',g=>{if(compact){box(g,-1.51,1.32,0,.14,.3,1.32,ctx.paint,.07);box(g,-1.6,1.37,0,.035,.07,.3,ctx.accent,.025);}else box(g,-1.65,1.18,0,.61,.17,1.4,ctx.paint,.08);});
}

function van(ctx,cfg){const id=cfg.id,ambulance=id==='ambulance',bus=['bus','schoolbus','minibus'].includes(id),school=id==='schoolbus',camper=id==='camper',ice=id==='icecream',long=id==='bus'||school,L=long?5.6:4.65,W=1.94,H=long?2.65:2.5,front=L/2,R=.51;
 chassis(ctx,L,W,R);wheels(ctx,[-L*.32,L*.32],W,R);
 part(ctx,'body','车厢与车身',g=>{box(g,0,1.07,0,L,.85,W,ctx.paint,.25);if(ambulance){box(g,-.75,1.78,0,3.05,1.15,W*.98,ctx.paint,.3);profile(g,[[.65,1.26],[2.2,1.26],[1.94,2.21],[1.56,2.34],[.65,2.34]],W*.93,ctx.paint,0,.12);box(g,2.05,1.46,0,.65,.32,W*.95,ctx.paint,.15);}else box(g,-.15,1.72,0,L-.32,.95,W*.98,ctx.paint,.22);for(const s of [-1,1])box(g,0,1.1,s*(W/2+.025),L*.9,.25,.04,ctx.accent,.025);});
 part(ctx,'roof','高车顶',g=>{if(ambulance){box(g,-.73,H+.01,0,3.22,.43,W+.035,ctx.paint,.2);box(g,1.18,2.37,0,1.37,.2,W*.96,ctx.paint,.09);}else box(g,-.12,H-.03,0,L-.22,.35,W+.035,camper||ice?ctx.accent:ctx.paint,.16);});
 part(ctx,'windshield','宽宽前挡风玻璃',g=>{if(ambulance){const windshield=box(g,2.15,1.97,0,.075,.67,1.52,M.glass,.13);windshield.rotation.z=.36;}else box(g,front-.05,2.03,0,.075,.7,1.56,M.glass,.15);for(const s of [-1,1]){const glint=box(g,ambulance?2.1:front,ambulance?2.16:2.2,s*.43,.018,.04,.35,M.shine,.012);glint.rotation.x=s*.4;}box(g,ambulance?2.25:front+.01,1.78,0,.025,.04,1.05,M.dark,.015);});
 for(const s of [-1,1])part(ctx,`doors-${s}`,s>0?'右驾驶室门':'左驾驶室门',g=>{box(g,front-.65,1.37,s*(W/2+.025),1.05,.55,.08,ctx.paint,.08);if(ambulance)profile(g,[[1,1.72],[1.97,1.72],[1.79,2.21],[1,2.25]],.035,M.glass,s*(W/2+.025),.045);else box(g,front-.65,2.05,s*(W/2+.025),.94,.66,.045,M.glass,.12);box(g,front-.92,1.52,s*(W/2+.08),.21,.065,.035,M.white,.025);});
 part(ctx,'windows','车厢窗户',g=>{for(const s of [-1,1]){if(bus){const count=long?4:3;for(let i=0;i<count;i++)box(g,-L/2+.58+i*.83,2.05,s*(W/2+.02),.66,.68,.05,M.glass,.13);}else if(ambulance){box(g,-1.3,2.04,s*(W/2+.02),.72,.57,.05,M.glass,.1);}else if(camper||ice){box(g,-.55,2.03,s*(W/2+.02),1.55,.64,.05,M.glass,.12);box(g,-.55,2.03,s*(W/2+.07),.045,.57,.025,M.white,.012);}else box(g,-1.14,2.02,s*(W/2+.02),1.2,.53,.04,ctx.accent,.12);}});
 part(ctx,'livery','车厢彩色装饰',g=>{for(const s of [-1,1]){if(ambulance){textLabel(g,'120',-.1,1.65,s*(W/2+.065),.39,ctx.accent,s);badge(g,-1.3,1.6,s*(W/2+.07),ctx.accent,s);}else if(school){box(g,-.6,1.48,s*(W/2+.065),2.9,.09,.025,M.dark,.03);box(g,-.6,1.32,s*(W/2+.065),2.9,.09,.025,M.dark,.03);}else if(camper){bar(g,[-1.7,1.38,s*(W/2+.06)],[-.4,1.7,s*(W/2+.06)],.07,ctx.accent);bar(g,[-.4,1.7,s*(W/2+.06)],[.3,1.38,s*(W/2+.06)],.07,ctx.accent);}else if(ice){for(let i=0;i<5;i++)cyl(g,-1.35+i*.35,1.42,s*(W/2+.065),.09,.03,i%2?ctx.accent:M.white);}else{box(g,-.8,1.5,s*(W/2+.06),1.65,.13,.025,ctx.accent,.04);}}});
 part(ctx,'mirrors','大耳朵后视镜',g=>mirrors(g,front-.3,1.9,W,ctx.paint));
 part(ctx,'rear-door','后车门',g=>{box(g,-front-.055,1.8,0,.05,1.38,1.65,ctx.paint,.12);for(const s of [-1,1]){box(g,-front-.09,2.03,s*.43,.028,.56,.65,M.glass,.08);box(g,-front-.1,1.58,s*.1,.03,.18,.06,M.chrome,.02);}if(ambulance){const h=new THREE.Group();textLabel(h,'120',0,0,0,.26,ctx.accent);h.rotation.y=-PI/2;h.position.set(-front-.1,1.23,0);g.add(h);}});
 face(ctx,L,W,1.12,false);
 if(ambulance)part(ctx,'lightbar','急救红蓝警灯',g=>beacon(g,.17,H+.28,1.3));
 else if(bus)part(ctx,'destination','巴士车顶标牌',g=>{box(g,front-.02,H-.18,0,.08,.22,1.26,M.dark,.07);box(g,front+.03,H-.18,0,.025,.09,.74,ctx.accent,.025);if(school)for(const s of [-1,1])cyl(g,front+.03,H-.17,s*.77,.07,.035,M.red,'x');});
 else if(camper)part(ctx,'luggage','露营行李与天窗',g=>{box(g,-1.15,H+.24,0,1.2,.4,1.24,ctx.accent,.15);box(g,.57,H+.15,0,.9,.12,1.1,M.glass,.06);for(const z of [-.3,.3])box(g,-1.15,H+.45,z,.9,.03,.07,M.white,.01);});
 else if(ice)part(ctx,'icecream','车顶大甜筒',g=>{cyl(g,-.45,H+.32,0,.08,.58,M.seat,'y',.28);ball(g,-.45,H+.74,0,.38,.36,.38,M.white);ball(g,-.47,H+.94,0,.28,.25,.28,ctx.paint);});
 else part(ctx,'cargo','车顶快递礼物',g=>{box(g,-.5,H+.25,0,.95,.43,1.02,ctx.accent,.1);box(g,-.5,H+.48,0,.12,.03,.86,M.white,.01);box(g,-.5,H+.48,0,.8,.03,.12,M.white,.01);});
 if(ice)part(ctx,'awning','条纹售卖小遮阳棚',g=>{for(let i=0;i<6;i++){const aw=box(g,-1.18+i*.25,2.35,1.14,.25,.1,.55,i%2?M.white:ctx.accent,.035);aw.rotation.x=.15;}});
}

function commercial(ctx,cfg){const id=cfg.id,L=5.7,W=2.02,R=.54,fire=id==='fire',crane=id==='crane',mixer=id==='mixer',garbage=id==='garbage';chassis(ctx,L,W,R);wheels(ctx,[-1.95,-.86,1.85],W,R);
 part(ctx,'cab','驾驶室',g=>{box(g,1.83,1.46,0,1.95,1.65,W,ctx.paint,.25);box(g,2.15,1.16,0,1.45,.67,W+.04,ctx.paint,.2);});
 part(ctx,'windshield','大卡车前窗',g=>{box(g,2.81,2.06,0,.075,.71,1.6,M.glass,.13);box(g,2.86,2.18,-.36,.025,.06,.51,M.shine,.02);});
 for(const s of [-1,1])part(ctx,`doors-${s}`,s>0?'右驾驶室门':'左驾驶室门',g=>{box(g,1.81,1.49,s*1.035,1.46,.63,.08,ctx.paint,.1);box(g,1.8,2.08,s*1.035,1.4,.62,.05,M.glass,.1);box(g,1.35,1.59,s*1.09,.23,.075,.035,M.white,.02);box(g,1.78,.8,s*1.07,1.46,.15,.23,ctx.accent,.06);});
 part(ctx,'cab-roof','驾驶室顶棚',g=>{box(g,1.8,2.6,0,2.12,.32,2.1,ctx.paint,.15);if(fire)beacon(g,1.8,2.84,1.35);else for(const s of [-1,1])box(g,2.64,2.75,s*.72,.14,.12,.19,M.amber,.045);});
 part(ctx,'mirrors','大卡车后视镜',g=>mirrors(g,2.45,1.96,W,ctx.paint));face(ctx,L,W,1.28);
 part(ctx,'deck','后部载货底座',g=>{box(g,-1.03,.94,0,3.6,.25,2.07,ctx.accent,.12);for(const s of [-1,1])box(g,-1.25,.78,s*.99,3.1,.23,.3,ctx.paint,.1);});
 if(fire){part(ctx,'equipment','消防器材舱',g=>{box(g,-1.07,1.74,0,3.25,1.34,2.04,ctx.paint,.2);for(const s of [-1,1])for(const x of [-2.07,-1.05,-.03]){box(g,x,1.73,s*1.04,.85,.97,.055,M.chrome,.075);for(let j=0;j<4;j++)box(g,x,1.48+j*.14,s*1.075,.7,.035,.025,M.white,.01);box(g,x,1.42,s*1.1,.27,.065,.04,M.dark,.02);}});part(ctx,'ladder','长长消防云梯',g=>{for(const s of [-1,1])box(g,-.85,2.61,s*.43,4.03,.13,.12,M.chrome,.045);for(let x=-2.68;x<1.2;x+=.34)box(g,x,2.62,0,.1,.11,.85,M.white,.035);for(const x of [-1.7,.2])box(g,x,2.49,0,.25,.23,1.14,ctx.accent,.07);});part(ctx,'hose','消防水管卷盘',g=>{cyl(g,-2.83,1.88,0,.43,.18,M.dark,'x');for(const r of [.17,.28,.39]){const t=ring(g,-2.96,1.88,0,r,.04,ctx.accent);t.rotation.y=PI/2;}});
 }else if(crane){part(ctx,'turret','吊车回转底盘',g=>{cyl(g,-1.1,1.25,0,.7,.35,M.dark,'y');box(g,-1.4,1.61,0,1.5,.55,1.6,ctx.paint,.16);});part(ctx,'boom','可伸缩大吊臂',g=>{const a=box(g,-.15,2.28,0,3.4,.43,.49,ctx.paint,.12);a.rotation.z=.32;const b=box(g,1.55,2.85,0,1.25,.26,.3,ctx.accent,.09);b.rotation.z=.32;bar(g,[-1.1,1.7,.4],[.8,2.47,.4],.08,M.chrome);});part(ctx,'hook','圆圆吊钩和钢索',g=>{bar(g,[2.1,3.03,0],[2.1,1.9,0],.024,M.dark);box(g,2.1,1.9,0,.25,.24,.25,ctx.accent,.08);ring(g,2.14,1.66,0,.15,.055,M.dark,PI*1.65).rotation.z=.5;});part(ctx,'outriggers','伸展稳定支腿',g=>{for(const x of [-2.1,.15])for(const s of [-1,1]){box(g,x,.7,s*1.06,.25,.23,1.05,ctx.accent,.07);cyl(g,x,.42,s*1.46,.08,.48,M.chrome,'y');box(g,x,.16,s*1.46,.45,.13,.4,M.dark,.06);}});
 }else if(mixer){part(ctx,'cradle','搅拌罐支架',g=>{for(const x of [-2.1,.05]){box(g,x,1.44,0,.25,.75,1.36,M.dark,.08);bar(g,[x,1.4,-.6],[x,2.08,0],.1,ctx.accent);bar(g,[x,1.4,.6],[x,2.08,0],.1,ctx.accent);}});part(ctx,'drum','圆滚滚搅拌罐',g=>{const h=new THREE.Group();cyl(h,0,0,0,.92,1.85,ctx.accent,'x',.61,20);ball(h,-.88,0,0,.45,.9,.9,ctx.accent);for(const x of [-.55,.14,.64]){const t=ring(h,x,0,0,.87-(x+.55)*.15,.075,ctx.paint);t.rotation.y=PI/2;}h.position.set(-1.08,2.1,0);h.rotation.z=.13;g.add(h);});part(ctx,'chute','水泥倾倒滑槽',g=>{box(g,-2.73,1.74,0,.3,.65,.84,ctx.paint,.1);const chute=box(g,-3.04,1.32,0,.95,.14,.62,ctx.accent,.06);chute.rotation.z=.28;for(const s of [-1,1]){const edge=box(g,-3.04,1.44,s*.31,.97,.16,.09,ctx.paint,.04);edge.rotation.z=.28;}});
 }else if(garbage){part(ctx,'container','大肚子清洁车厢',g=>{box(g,-.98,1.99,0,3.18,1.84,2.03,ctx.paint,.3);for(const s of [-1,1]){box(g,-1,2.05,s*1.03,2.65,.2,.04,ctx.accent,.04);for(const x of [-1.75,-.97,-.2])bar(g,[x,1.49,s*1.05],[x,2.48,s*1.05],.04,ctx.accent);}});part(ctx,'hopper','垃圾装载翻斗',g=>{box(g,-2.83,1.55,0,.4,1.1,1.74,ctx.accent,.14);box(g,-3.03,1.64,0,.08,.58,1.25,M.dark,.1);box(g,-3.15,1.15,0,.6,.14,1.7,ctx.paint,.08);});part(ctx,'bin','迷你分类垃圾桶',g=>{box(g,-2.97,1.02,0,.56,.76,.55,ctx.paint,.1);box(g,-2.97,1.43,0,.65,.1,.63,ctx.accent,.04);});
 }else{part(ctx,'sleeper','长途休息舱',g=>{box(g,.1,1.91,0,1.2,1.87,1.97,ctx.paint,.23);for(const s of [-1,1])box(g,.1,2.23,s*.99,.65,.48,.04,M.glass,.1);box(g,.1,2.86,0,1.19,.18,1.85,ctx.accent,.08);});part(ctx,'coupling','牵引连接转盘',g=>{cyl(g,-1.65,1.18,0,.65,.18,M.dark,'y');box(g,-1.65,1.29,0,1.1,.08,.16,M.chrome,.03);});part(ctx,'exhaust','双排气管',g=>{for(const s of [-1,1]){cyl(g,-.55,1.93,s*.92,.085,1.72,M.chrome,'y');cyl(g,-.55,2.81,s*.92,.11,.07,M.dark,'y');}});}
}

function tractor(ctx){const W=1.75;chassis(ctx,3.6,W,.48);for(const s of [-1,1]){part(ctx,`wheel-rear-${s}`,`${s>0?'右':'左'}大后轮`,g=>wheel(g,-.98,.75,s*.96,.72,.42,ctx.accent));part(ctx,`wheel-front-${s}`,`${s>0?'右':'左'}小前轮`,g=>wheel(g,1.2,.46,s*.79,.43,.3,ctx.accent));}
 part(ctx,'engine','拖拉机发动机舱',g=>{box(g,.77,1.08,0,2.03,.85,1.15,ctx.paint,.24);box(g,1.79,1.08,0,.08,.58,.85,M.dark,.1);for(const z of [-.27,0,.27])box(g,1.84,1.08,z,.025,.43,.055,M.chrome,.015);});
 part(ctx,'seat','农场小座椅',g=>seat(g,-.73,1.2,0));part(ctx,'controls','大方向盘',g=>{bar(g,[-.12,.99,0],[-.3,1.68,0],.045,M.dark);const t=ring(g,-.3,1.68,0,.22,.04,M.dark);t.rotation.y=PI/2;});
 part(ctx,'roof','农场遮阳车顶',g=>{for(const s of [-1,1])bar(g,[-1.32,1.12,s*.48],[-1.32,2.35,s*.48],.05,M.dark);box(g,-.86,2.39,0,1.85,.21,1.7,ctx.accent,.1);});
 for(const s of [-1,1])part(ctx,`fender-${s}`,`${s>0?'右':'左'}弧形挡泥板`,g=>{box(g,-1.02,1.53,s*.82,1.65,.19,.54,ctx.paint,.09);box(g,-.27,.85,s*.72,.55,.16,.4,ctx.accent,.06);});
 part(ctx,'exhaust','农场烟囱',g=>{cyl(g,.57,1.98,.35,.07,1.1,M.dark,'y');cyl(g,.57,2.55,.35,.11,.09,M.chrome,'y');});
 part(ctx,'lights','圆圆拖拉机灯',g=>{for(const s of [-1,1])cyl(g,1.79,1.51,s*.43,.14,.12,M.lamp,'x');box(g,1.87,.72,0,.28,.18,1.4,ctx.accent,.08);});
 part(ctx,'hitch','农场拖钩',g=>{box(g,-1.77,.64,0,.65,.16,.35,M.dark,.06);ring(g,-2.07,.65,0,.15,.04,M.chrome).rotation.x=PI/2;});
}
function excavator(ctx){fixed(ctx,g=>{box(g,-.55,.47,0,2.7,.38,1.5,M.dark,.13);cyl(g,-.55,.84,0,.63,.35,M.chrome,'y');});
 for(const s of [-1,1])part(ctx,`track-${s}`,`${s>0?'右':'左'}软胶履带`,g=>{box(g,-.6,.43,s*.99,3.35,.77,.52,M.rubber,.19);for(let x=-1.78;x<.85;x+=.51)cyl(g,x,.43,s*1.28,.25,.065,M.chrome);for(let i=0;i<14;i++)for(const y of [.08,.79])box(g,-2.03+i*.22,y,s*.99,.13,.075,.57,M.dark,.018);});
 part(ctx,'platform','回转大平台',g=>{box(g,-.55,1.07,0,2.93,.26,2.06,ctx.paint,.12);cyl(g,.46,1.24,.48,.2,.64,M.chrome);});
 part(ctx,'engine','配重尾部',g=>{box(g,-1.37,1.62,.12,1.62,1.03,1.86,ctx.paint,.28);for(const s of [-1,1])for(let i=0;i<4;i++)box(g,-1.7+i*.23,1.7,s*1.07,.09,.31,.03,M.dark,.025);});
 part(ctx,'cab','全景驾驶舱',g=>{box(g,-.22,1.99,-.52,1.3,1.6,1.1,M.glass,.2);for(const z of [-1.07,.03])bar(g,[.38,1.34,z],[.29,2.68,z],.05,ctx.paint);});
 part(ctx,'roof','圆圆驾驶舱车顶',g=>box(g,-.25,2.82,-.52,1.5,.23,1.3,ctx.paint,.11));
 part(ctx,'door','驾驶舱小门',g=>{box(g,-.27,1.4,-1.1,1.1,.3,.07,ctx.paint,.08);box(g,-.65,1.75,-1.12,.18,.065,.04,M.white,.025);bar(g,[-.87,1.4,-1.12],[-.87,2.69,-1.12],.04,ctx.paint);});
 part(ctx,'seat','驾驶员小座椅',g=>{seat(g,-.27,1.4,-.5);for(const s of [-1,1])bar(g,[0,1.4,-.5+s*.35],[.05,1.86,-.5+s*.35],.035,M.dark);});
 part(ctx,'boom','弯弯挖掘主臂',g=>{profile(g,[[.27,1.22],[.62,1.22],[1.51,2.84],[2,2.94],[1.99,3.25],[1.28,3.24]],.4,ctx.paint,.5,.1);for(const [x,y] of [[.42,1.44],[1.43,3.02],[1.98,3.09]])cyl(g,x,y,.5,.14,.65,ctx.accent);});
 part(ctx,'dipper','向下挖掘小臂',g=>{profile(g,[[1.85,3.14],[2.15,3.16],[2.9,1.5],[2.59,1.36]],.34,ctx.paint,.5,.08);cyl(g,2.74,1.48,.5,.14,.58,ctx.accent);});
 part(ctx,'bucket','大大的挖斗',g=>{profile(g,[[2.57,1.47],[2.91,1.43],[3.34,.73],[2.64,.71],[2.32,1.02]],.9,ctx.accent,.5,.1);for(const z of [.17,.5,.83])box(g,3.34,.76,z,.32,.12,.17,M.chrome,.04);});
 part(ctx,'hydraulics','闪亮液压杆',g=>{bar(g,[.52,1.47,.12],[1.4,2.96,.12],.07,M.chrome);bar(g,[.52,1.47,.12],[.96,2.22,.12],.12,ctx.accent);bar(g,[2.1,2.94,.16],[2.67,1.64,.16],.065,M.chrome);});
 part(ctx,'lights','作业灯与警示灯',g=>{box(g,.38,2.79,-.5,.13,.16,.63,M.lamp,.06);cyl(g,-.72,3.04,-.48,.12,.23,M.amber,'y');});
 part(ctx,'exhaust','小烟囱',g=>{cyl(g,-1.44,2.32,.63,.07,.58,M.dark,'y');cyl(g,-1.44,2.64,.63,.1,.1,M.chrome,'y');});
}

export function buildVehicle(id='gclass',liveryId='default'){
 M=materials();const cfg=VEHICLES.find(v=>v.id===id)||VEHICLES[0],livery=cfg.liveries.find(l=>l.id===liveryId)||cfg.liveries[0];
 if(CLASSIC_IDS.has(cfg.id))return buildClassicVehicle(cfg,livery);
 const ctx={group:new THREE.Group(),parts:[],paint:material(livery.color,.34,.12),accent:material(livery.accent||'#fff3bd',.36)};
 ctx.group.name=cfg.name;ctx.group.userData={vehicleId:cfg.id,liveryId:livery.id,style:'crisp',labels:cfg.id==='police'?['110']:cfg.id==='ambulance'?['120']:cfg.id==='taxi'?['TAXI']:[]};
 if(cfg.id==='excavator')excavator(ctx);else if(cfg.id==='tractor')tractor(ctx);else if(['truck','fire','crane','garbage','mixer'].includes(cfg.id))commercial(ctx,cfg);else if(['ambulance','bus','schoolbus','minibus','van','camper','icecream'].includes(cfg.id))van(ctx,cfg);else car(ctx,cfg);
 ctx.group.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(ctx.group).getSize(new THREE.Vector3());
 return {group:ctx.group,parts:ctx.parts,dimensions:{length:size.x,width:size.z,height:size.y},animate(time,drive=false){if(!drive)return;for(const p of ctx.parts)if(p.id.startsWith('wheel-'))p.group.rotation.z=-time*3;}};
}
