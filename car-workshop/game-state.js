export const PARTS = [
 {id:'body',name:'车身',kind:'body',hint:'车身就像一件外衣，保护车里的小伙伴。',target:[0,0.98,0]},
 {id:'engine',name:'发动机',kind:'engine',hint:'发动机给汽车提供动力，就像汽车的心脏。',target:[1.05,1.05,0]},
 {id:'cabin',name:'驾驶舱',kind:'cabin',hint:'透过车窗看世界，驾驶员就坐在这里。',target:[-0.38,1.67,0]},
 {id:'hood',name:'引擎盖',kind:'hood',hint:'掀开引擎盖，就能发现下面的发动机。',target:[1.05,1.47,0]},
 {id:'bumper',name:'前保险杠',kind:'bumper',hint:'前保险杠装在汽车前面，像一个小小护盾。',target:[1.92,0.87,0]},
 {id:'wheel-fl',name:'左前轮',kind:'wheel',hint:'前轮帮助汽车转弯。四个车轮一起滚动！',target:[1.12,0.62,1.01]},
 {id:'wheel-fr',name:'右前轮',kind:'wheel',hint:'把另一侧的前轮也装上，让汽车稳稳站好。',target:[1.12,0.62,-1.01]},
 {id:'wheel-rl',name:'左后轮',kind:'wheel',hint:'后轮和前轮一起，让汽车向前跑。',target:[-1.15,0.62,1.01]},
 {id:'wheel-rr',name:'右后轮',kind:'wheel',hint:'最后一侧的后轮也不能少，四轮出发！',target:[-1.15,0.62,-1.01]}
];
export function createGame(){return {installed:new Set(PARTS.map(p=>p.id)),selected:null,mode:'assemble',started:false,won:false};}
export function selectPart(state,id){if(!PARTS.some(p=>p.id===id)||state.installed.has(id))return false;state.selected=id;return true;}
export function installPart(state,id){if(!PARTS.some(p=>p.id===id)||state.installed.has(id))return false;state.installed.add(id);state.selected=null;return true;}
export function removePart(state,id){if(!state.installed.delete(id))return false;state.started=true;state.won=false;state.selected=null;return true;}
export function disassembleAll(state){state.installed.clear();state.selected=null;state.mode='assemble';state.started=true;state.won=false;}
export function isNearTarget(x,y,targetX,targetY,radius=80){return Math.hypot(x-targetX,y-targetY)<=radius;}
