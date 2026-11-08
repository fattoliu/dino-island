import {collidesWithParkedCars,footprintOverlaps} from './parking-state.js?v=6';
// Deterministic town driving and approachable, vehicle-specific missions.
export const WORLD={limit:55,maxSpeed:13,surfaceY:.04};
export const BUILDINGS=[
 {x:-12,z:-12,w:12,d:11,kind:'hospital',color:'#fff2d3'},
 {x:12,z:-12,w:11,d:11,kind:'station',color:'#8fc5f6'},
 {x:-12,z:12,w:12,d:10,kind:'school',color:'#ffd06c'},
 {x:12,z:12,w:11,d:10,kind:'shop',color:'#ffb7a0'},
 {x:-36,z:12,w:11,d:10,kind:'warehouse',color:'#b1c6d4'},
 {x:-36,z:-12,w:10,d:10,kind:'house',color:'#f2a9be'}
];
const S=(label,x,z,action='开始行动',duration=1.4,kind='stop')=>({label,x,z,action,duration,kind,radius:4.5});
const missions={
 ambulance:['爱心救护',S('到公园接需要帮助的小伙伴',30,6,'接上小伙伴',2,'patient'),S('送到医院门口',-12,-22,'送进医院',2,'hospital')],
 fire:['消防小英雄',S('到小屋旁连接水管',-36,-22,'连接水管',1.5,'fire'),S('按住喷水，让火苗熄灭',-36,-22,'喷水灭火',4,'fire')],
 police:['友善巡逻',S('追上带黄色标记的淘气小车',25,-22,'请小车停下',2,'chase'),S('陪同小车回警察站',12,-22,'完成安全教育',2,'station')],
 ferrari:['彩虹赛道',S('驶到赛场起跑线',33,-37,'准备出发',1,'raceStart'),S('通过第一检查点',46,-37,'确认检查点',.3,'race'),S('通过弯道检查点',46,-48,'确认检查点',.3,'race'),S('通过最后一个弯道',27,-48,'通过检查点',.3,'race'),S('绕过发车弯道',27,-37,'通过检查点',.3,'race'),S('冲过终点，完成比赛',36,-37,'冲线庆祝',.3,'race')],
 crane:['起重救援',S('到施工区找到倒下的横梁',-34,-36,'挂好吊钩',2,'beam'),S('慢慢吊起横梁，清通道路',-34,-36,'吊起横梁',3,'beam')],
 excavator:['道路抢险',S('开到施工区碎石堆旁',-25,-39,'挖开碎石',3,'rubble'),S('把碎石装入回收区',-43,-37,'卸下碎石',2,'rubble')],
 mixer:['建造新道路',S('到材料站装入混凝土',-43,-37,'装入材料',2,'concrete'),S('到施工区浇筑平整路面',-25,-39,'浇筑路面',3,'concrete')],
 taxi:['小镇出租车',S('到商店接乘客',12,22,'请乘客上车',1.6,'passenger'),S('送乘客到公园',30,6,'请乘客下车',1.6,'passenger')],
 bus:['快乐公交',S('到学校站接乘客',-12,22,'打开车门',2,'passenger'),S('送乘客到公园站',30,6,'到站下车',2,'passenger')],
 schoolbus:['放学接送',S('到学校接小朋友',-12,22,'安全上车',2,'passenger'),S('送小朋友到小区',-36,-22,'安全下车',2,'passenger')],
 minibus:['小镇接驳',S('到小区接乘客',-36,-22,'接上乘客',1.8,'passenger'),S('送乘客到商店',12,22,'到站下车',1.8,'passenger')],
 truck:['大件运输',S('到仓库装货',-36,22,'装上货箱',2,'cargo'),S('把货物送到施工区',-34,-36,'卸下货物',2,'cargo')],
 van:['快递送达',S('到仓库领取包裹',-36,22,'领取包裹',1.8,'cargo'),S('把包裹送到商店',12,22,'送达包裹',1.8,'cargo')],
 pickup:['农场好帮手',S('到农场装上蔬菜',-33,37,'装上蔬菜',2,'crop'),S('把蔬菜送到商店',12,22,'卸下蔬菜',2,'cargo')],
 garbage:['干净小镇',S('收集学校旁的垃圾桶',-12,22,'清空垃圾桶',2,'bin'),S('收集商店旁的垃圾桶',12,22,'清空垃圾桶',2,'bin'),S('送到回收站分类',-47,22,'分类回收',2,'bin')],
 tractor:['丰收农场',S('到农田收获第一排蔬菜',-33,37,'收获蔬菜',2.5,'crop'),S('收获第二排蔬菜',-43,45,'收获蔬菜',2.5,'crop'),S('把收成放到农场货台',-24,45,'放好收成',2,'crop')],
 camper:['露营小旅行',S('开到湖畔营地',34,36,'展开遮阳棚',2,'camp'),S('在营地摆好桌椅',34,36,'布置营地',2,'camp')],
 icecream:['甜甜冰淇淋',S('到公园为小伙伴服务',30,6,'制作冰淇淋',2,'icecream'),S('到营地分享冰淇淋',34,36,'分享冰淇淋',2,'icecream')],
 compact:['小镇生活',S('去商店领取野餐篮',12,22,'拿好野餐篮',1.5,'cargo'),S('带野餐篮去公园',30,6,'摆好野餐',2,'camp')],
 bmw:['城市驾驶挑战',S('到赛场准备驾驶挑战',33,-37,'准备挑战',1,'raceStart'),S('通过直道检查点',46,-37,'通过检查点',.4,'race'),S('平稳通过弯道',46,-48,'通过检查点',.4,'race'),S('通过最后一个弯道',27,-48,'通过检查点',.4,'race'),S('绕过发车弯道',27,-37,'通过检查点',.4,'race'),S('冲过终点完成挑战',36,-37,'完成挑战',.4,'race')],
 gclass:['越野补给',S('沿小径去山脚领取补给',46,15,'装上补给',2,'trail'),S('把补给送到湖畔营地',34,36,'送达补给',2,'trail')],
 landcruiser:['山野探索',S('到山脚寻找旅行装备',46,15,'领取装备',2,'trail'),S('经过林间检查点',47,28,'确认路线',.7,'trail'),S('抵达营地帮助旅行者',34,36,'交付装备',2,'trail')]
};
export const VEHICLE_MISSIONS=Object.freeze(missions);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,d=0)=>Number.isFinite(n)?n:d;
export function createWorldState(vehicleId='compact'){return {vehicleId:missions[vehicleId]?vehicleId:'compact',x:0,z:0,heading:0,speed:0,distance:0,laps:0,progress:0,guided:false,step:0,actionProgress:0,complete:false,elapsed:0,missionTime:0,completedAt:null,raceStarted:false,bestTime:null,runs:0,collision:false};}
export function getMissionTarget(state){const list=missions[state.vehicleId]||missions.compact; const t=list[Math.min(state.step+1,list.length-1)];if(t.kind==='chase'&&state.step===0&&!state.complete){const a=state.missionTime*.15;return {...t,x:25+10*Math.sin(a),z:-22+2*Math.sin(a*2)};}return t;}
export function getMissionInfo(state){const list=missions[state.vehicleId]||missions.compact,t=getMissionTarget(state),nearTarget=Math.hypot(state.x-t.x,state.z-t.z)<=t.radius;return {title:list[0],instruction:state.complete?'任务完成！可以自由探索，或再玩一次。':t.label,actionLabel:state.complete?'再玩一次':t.action,step:Math.min(state.step+1,list.length-1),total:list.length-1,progress:state.actionProgress,complete:state.complete,nearTarget,targetDistance:Math.hypot(state.x-t.x,state.z-t.z),seconds:state.missionTime,bestTime:state.bestTime,racing:['ferrari','bmw'].includes(state.vehicleId)};}
export function restartMission(state){state.step=0;state.progress=0;state.actionProgress=0;state.complete=false;state.completedAt=null;state.missionTime=0;state.raceStarted=false;state.runs++;return state;}
export function missionAction(state,dt){if(state.complete)return state;const target=getMissionTarget(state);if(Math.hypot(state.x-target.x,state.z-target.z)>target.radius||(target.kind!=='race'&&Math.abs(state.speed)>3)){state.actionProgress=Math.max(0,state.actionProgress-dt*.5);return state;}state.actionProgress=target.kind==='race'?1:Math.min(1,state.actionProgress+dt/target.duration);if(state.actionProgress>=1-1e-8){state.step++;state.actionProgress=0;if(target.kind==='raceStart'){state.raceStarted=true;state.missionTime=0;}if(state.step>=missions[state.vehicleId].length-1){state.complete=true;state.completedAt=state.elapsed;if(target.kind==='race'){state.laps++;state.bestTime=state.bestTime===null?state.missionTime:Math.min(state.bestTime,state.missionTime);}}}state.progress=state.complete?1:state.step/(missions[state.vehicleId].length-1);return state;}
export function collides(x,z,heading=0,dimensions=null){return BUILDINGS.some(b=>dimensions?footprintOverlaps(x,z,heading,dimensions,b):Math.abs(x-b.x)<b.w/2+1.55&&Math.abs(z-b.z)<b.d/2+1.55);}
export function stepWorld(state,input={},dt=0){const duration=clamp(finite(dt),0,.25),count=Math.max(1,Math.ceil(duration*60)),h=duration/count;state.x=clamp(finite(state.x),-55,55);state.z=clamp(finite(state.z),-55,55);state.speed=clamp(finite(state.speed),-5,WORLD.maxSpeed);state.heading=finite(state.heading);state.collision=false;const throttle=clamp(finite(input.throttle),0,1),brake=clamp(finite(input.brake),0,1),steer=clamp(finite(input.steer),-1,1),reverse=clamp(finite(input.reverse),0,1);
for(let i=0;i<count;i++){state.elapsed+=h;if(!state.complete&&(!['ferrari','bmw'].includes(state.vehicleId)||state.raceStarted))state.missionTime+=h;const force=throttle>0?7*throttle:reverse>0?-5*reverse:0; const friction=(brake*19+1.4)*h;state.speed=clamp(state.speed+force*(1-brake)*h,-5,WORLD.maxSpeed);state.speed=Math.sign(state.speed)*Math.max(0,Math.abs(state.speed)-friction); // Steering while stopped lets children recover easily.
const previousHeading=state.heading;state.heading-=steer*(.9+Math.min(Math.abs(state.speed),8)*.075)*(state.speed<-.1?-1:1)*h;if(state.dimensions&&(collides(state.x,state.z,state.heading,state.dimensions)||collidesWithParkedCars(state.x,state.z,state.parkingOccupiedSlots,state.heading,state.dimensions))){state.heading=previousHeading;state.collision=true;}const dx=Math.cos(state.heading)*state.speed*h,dz=-Math.sin(state.heading)*state.speed*h,nx=clamp(state.x+dx,-55,55),nz=clamp(state.z+dz,-55,55);if(collides(nx,nz,state.heading,state.dimensions)||collidesWithParkedCars(nx,nz,state.parkingOccupiedSlots,state.heading,state.dimensions)){state.speed=0;state.collision=true;}else{state.distance+=Math.hypot(nx-state.x,nz-state.z);state.x=nx;state.z=nz;}if(!state.complete&&(input.action||getMissionTarget(state).kind==='race'))missionAction(state,h);else state.actionProgress=Math.max(0,state.actionProgress-h*.35);}
return state;}
