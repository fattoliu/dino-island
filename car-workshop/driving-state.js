// Guided driving: throttle controls progress; steering changes lanes while the
// course assists the turn. Positive lane/steer is RIGHT. Cars face local +X,
// so heading is a Three.js rotation.y (forward = [cos(heading), -sin(heading)]).
export const TRACK = Object.freeze({radius:38, width:18, laneLimit:5, length:2*Math.PI*38, maxSpeed:16, acceleration:6.2, braking:15, drag:1.25, surfaceY:.04});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
export function trackPose(distance=0,lane=0){
  const angle=((finite(distance)%TRACK.length)+TRACK.length)%TRACK.length/TRACK.radius;
  const r=TRACK.radius+clamp(finite(lane),-TRACK.laneLimit,TRACK.laneLimit);
  return {x:r*Math.sin(angle),z:r*Math.cos(angle)-TRACK.radius,heading:angle};
}
export function createDriveState(){return {distance:0,speed:0,lane:0,laps:0,progress:0,...trackPose(0),guided:true};}
export function stepDrive(state,input={},dt=0){
  // Cap a suspended-tab frame rather than teleporting across the course.
  const duration=clamp(finite(dt),0,.25),steps=Math.max(1,Math.ceil(duration*60)),h=duration/steps;
  const throttle=clamp(finite(input.throttle),0,1),brake=clamp(finite(input.brake),0,1),steer=clamp(finite(input.steer),-1,1);
  state.speed=clamp(finite(state.speed),0,TRACK.maxSpeed);
  state.distance=Math.max(0,finite(state.distance));state.lane=clamp(finite(state.lane),-TRACK.laneLimit,TRACK.laneLimit);
  for(let i=0;i<steps;i++){
    const previous=state.speed;
    state.speed=clamp(previous+(throttle*TRACK.acceleration*(1-brake)-brake*TRACK.braking-TRACK.drag)*h,0,TRACK.maxSpeed);
    state.distance+=(previous+state.speed)*.5*h;
    state.lane=clamp(state.lane+steer*Math.min(4,state.speed*.34)*h,-TRACK.laneLimit,TRACK.laneLimit);
  }
  state.laps=Math.floor(state.distance/TRACK.length);state.progress=(state.distance%TRACK.length)/TRACK.length;
  Object.assign(state,trackPose(state.distance,state.lane));
  return state;
}
