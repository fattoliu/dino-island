import * as THREE from './vendor/three.module.min.js';

// A color-preserving, directional studio setup. Do not compensate with a
// saturation filter: over-bright fill + a white environment erased the planes.
export const VISUALS = Object.freeze({
  exposure:1, ambient:.78, key:2.7, fill:.32, environment:.28,
  garageSky:'#62b8dc', townSky:'#55b2e1', shadowSize:2048,
});
export function configureRenderer(renderer){
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NeutralToneMapping;
  renderer.toneMappingExposure=VISUALS.exposure;
  renderer.shadowMap.enabled=!renderer.isSoftwareRenderer;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
}
export function addLighting(scene,{shadows=true}={}){
  const hemisphere=new THREE.HemisphereLight('#e5f2ff','#354158',VISUALS.ambient);
  const key=new THREE.DirectionalLight('#fff7e8',VISUALS.key);
  const fill=new THREE.DirectionalLight('#a3d5ff',VISUALS.fill);
  key.castShadow=shadows;key.shadow.mapSize.set(VISUALS.shadowSize,VISUALS.shadowSize);
  Object.assign(key.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:1,far:70});
  key.shadow.normalBias=.018;key.shadow.bias=-.00008;
  fill.position.set(-10,7,-7);scene.add(hemisphere,key,key.target,fill);
  scene.environmentIntensity=VISUALS.environment;
  let lastX=Infinity,lastZ=Infinity,lastTown=null;
  function follow(x=0,z=0,town=false){
    const extent=town?24:17,texel=extent*2/VISUALS.shadowSize;
    // Quantize the moving light in the shadow camera's right/up plane, not
    // world X/Z, so its shadow texels remain stable while driving.
    const forward=new THREE.Vector3(10,18,12).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),forward).normalize(),up=new THREE.Vector3().crossVectors(forward,right);
    const center=new THREE.Vector3(x,0,z),r=Math.round(center.dot(right)/texel)*texel,u=Math.round(center.dot(up)/texel)*texel,d=center.dot(forward);
    center.copy(right).multiplyScalar(r).addScaledVector(up,u).addScaledVector(forward,d);
    if(x===lastX&&z===lastZ&&town===lastTown)return;
    lastX=x;lastZ=z;lastTown=town;
    key.target.position.copy(center);key.position.copy(center).add(new THREE.Vector3(10,18,12));
    Object.assign(key.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent});key.shadow.camera.updateProjectionMatrix();
    key.target.updateMatrixWorld();key.updateMatrixWorld();
  }
  follow();return {key,hemisphere,fill,follow};
}
export function createEnvironment(renderer){
  const room=new THREE.Scene();room.background=new THREE.Color('#29384d');
  for(const [w,h,d,x,y,z,color,strength] of [[12,3,.2,0,7,6,'#fff7e8',2],[.2,4,9,-8,4,0,'#b9ddff',1.2],[7,2,.2,0,5,-7,'#f4f7ff',1.5]]){
    const material=new THREE.MeshBasicMaterial({color});material.color.multiplyScalar(strength);
    const panel=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);panel.position.set(x,y,z);room.add(panel);
  }
  const generator=new THREE.PMREMGenerator(renderer),target=generator.fromScene(room,.12);
  generator.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return target;
}
export function setBackdrop(scene,town=false){
  const color=town?VISUALS.townSky:VISUALS.garageSky;
  if(scene.background?.isColor)scene.background.set(color);else scene.background=new THREE.Color(color);
  // Keep the whole assembly bay clear; haze belongs beyond the workshop/town.
  scene.fog=new THREE.Fog(color,town?140:55,town?270:110);
}
