// Shared world-space bay geometry and deterministic, input-independent parking.
// Vehicle forward is +X at heading 0; heading PI/2 points toward -Z.
export const PARKING_CENTER=Object.freeze({x:-11,z:-36.5});
export const PARKING_SLOTS=Object.freeze([[-17,-29],[-11,-29],[-5,-29],[-17,-44],[-11,-44],[-5,-44]].map(([x,z],id)=>Object.freeze({id,x,z,width:5.4,length:8,heading:Math.PI/2})));
export const PARKING_DWELL=1.25;
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
export function createParkingState(occupiedSlotIds=[],dimensions={length:6.8,width:3.3},departedSlotId=null){
 const occupied=[...new Set(occupiedSlotIds)].filter(id=>PARKING_SLOTS.some(s=>s.id===id));
 return {departedSlotId,occupiedSlotIds:occupied,dimensions:{length:Math.max(1,finite(dimensions.length,6.8)),width:Math.max(1,finite(dimensions.width,3.3)),offsetX:finite(dimensions.offsetX),offsetZ:finite(dimensions.offsetZ)},slotId:null,dwell:0,progress:0,complete:false,justParked:false};
}
export function footprintCenter(x,z,heading,dimensions){const h=finite(heading),c=Math.cos(h),s=Math.sin(h),ox=finite(dimensions?.offsetX),oz=finite(dimensions?.offsetZ);return {x:x+c*ox+s*oz,z:z-s*ox+c*oz};}
export function getParkingInfo(parking,drive){
 const center=footprintCenter(drive.x,drive.z,drive.heading,parking.dimensions);
 const available=PARKING_SLOTS.filter(s=>!parking.occupiedSlotIds.includes(s.id));
 const slot=available.find(s=>s.id===parking.slotId)||available.reduce((best,s)=>!best||Math.hypot(center.x-s.x,center.z-s.z)<Math.hypot(center.x-best.x,center.z-best.z)?s:best,null);
 if(!slot)return {slot:null,ready:false,distance:Infinity,instruction:'车位已满，请稍后再来',progress:0};
 const valid=[drive.x,drive.z,drive.heading,drive.speed].every(Number.isFinite);
 const h=finite(drive.heading),s=Math.abs(Math.sin(h)),c=Math.abs(Math.cos(h));
 const halfX=(c*parking.dimensions.length+s*parking.dimensions.width)/2,halfZ=(s*parking.dimensions.length+c*parking.dimensions.width)/2;
 const distance=Math.hypot(center.x-slot.x,center.z-slot.z),inside=valid&&Math.abs(center.x-slot.x)+halfX<=slot.width/2-.12&&Math.abs(center.z-slot.z)+halfZ<=slot.length/2-.12;
 const aligned=valid&&Math.abs(Math.cos(h))<=Math.sin(Math.PI/12),slow=valid&&Math.abs(drive.speed)<=.22;
 const ready=inside&&aligned&&slow&&!drive.collision&&parking.departedSlotId===null;
 const instruction=parking.complete?'停好了！小车已回到停车场':parking.departedSlotId!==null?'先开出当前车位，再去探索或重新停车':distance>11?'沿地图的 P 标记，开到停车场':!inside?'慢慢驶入绿色空车位，让整辆车停在线内':!aligned?'轻转方向，把车身与车位线对齐':!slow?'松开摇杆，让小车慢慢停稳':drive.collision?'调整位置，让小车离开障碍物':'停稳了，保持一下就好';
 return {slot,distance,inside,aligned,slow,ready,instruction,progress:parking.progress,complete:parking.complete};
}
export function stepParking(parking,drive,dt){
 parking.justParked=false;if(parking.complete)return parking;
 if(parking.departedSlotId!==null){const old=PARKING_SLOTS[parking.departedSlotId];if(!old||!footprintOverlaps(drive.x,drive.z,drive.heading,parking.dimensions,{x:old.x,z:old.z,w:old.width,d:old.length}))parking.departedSlotId=null;}

 // Pick the closest empty bay each frame, so a child can choose any empty bay.
 parking.slotId=null;const info=getParkingInfo(parking,drive);const nextId=info.slot?.id??null;
 if(parking.dwellSlotId!==nextId){parking.dwell=0;parking.dwellSlotId=nextId;}parking.slotId=nextId;
 parking.dwell=info.ready?parking.dwell+Math.min(.1,Math.max(0,finite(dt))):0;
 parking.progress=Math.min(1,parking.dwell/PARKING_DWELL);
 if(parking.dwell+1e-9>=PARKING_DWELL){parking.complete=true;parking.justParked=true;drive.speed=0;}
 return parking;
}
// Separating-axis check between an oriented full-size car and an axis-aligned obstacle.
// Exact transformed bounds center plus a small forgiving collision safety margin.
export function footprintOverlaps(x,z,heading,dimensions,obstacle){
 const h=finite(heading),c=Math.cos(h),s=-Math.sin(h),a=Math.max(1,finite(dimensions?.length,4))/2+.2,b=Math.max(1,finite(dimensions?.width,2))/2+.2;
 const center=footprintCenter(x,z,heading,dimensions),dx=center.x-obstacle.x,dz=center.z-obstacle.z,ox=obstacle.w/2,oz=obstacle.d/2;
 return Math.abs(dx)<Math.abs(c)*a+Math.abs(s)*b+ox&&Math.abs(dz)<Math.abs(s)*a+Math.abs(c)*b+oz&&Math.abs(dx*c+dz*s)<a+ox*Math.abs(c)+oz*Math.abs(s)&&Math.abs(-dx*s+dz*c)<b+ox*Math.abs(s)+oz*Math.abs(c);
}
export function collidesWithParkedCars(x,z,occupiedSlotIds=[],heading=0,dimensions){return occupiedSlotIds.some(id=>{const s=PARKING_SLOTS[id];return s&&footprintOverlaps(x,z,heading,dimensions,{x:s.x,z:s.z,w:2.3,d:4.8});});}
