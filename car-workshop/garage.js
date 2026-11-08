import * as THREE from './vendor/three.module.min.js';

/** An original, batched miniature workshop. World units are metres; Y is up. */
export function buildGarage(scene) {
  const root = new THREE.Group(); root.name = 'Little Garage'; scene.add(root);
  const batches = new Map(); const resources = [];
  const mat = (color, roughness=.65, metalness=0) => {
    const m = new THREE.MeshStandardMaterial({color, roughness, metalness}); resources.push(m); return m;
  };
  const concrete=mat('#6b9eae', .94), seam=mat('#527e90'), navy=mat('#173e60',.46,.3), teal=mat('#008daf',.42,.25);
  const cream=mat('#e5dbc1'), yellow=mat('#ffbf13',.46), black=mat('#273239'), metal=mat('#aebcc0',.32,.7);
  const rubber=mat('#253033',.92), red=mat('#ed4d30',.42), wood=mat('#f2bd68'), white=mat('#fffdf0'), blue=mat('#168ed5');
  const glow=new THREE.MeshStandardMaterial({color:'#fff5d6',emissive:'#fff1bf',emissiveIntensity:1.3,roughness:.3}); resources.push(glow);
  const backWall=cream.clone(), backTrim=teal.clone(); resources.push(backWall,backTrim);
  const glass=new THREE.MeshStandardMaterial({color:'#9fced3',roughness:.25,metalness:.08,transparent:true,opacity:.45}); resources.push(glass);
  function put(g,m,x,y,z,rx=0,ry=0,rz=0) {
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1));
    g.applyMatrix4(matrix); if(!batches.has(m))batches.set(m,[]); batches.get(m).push(g); return g;
  }
  const box=(m,x,y,z,w,h,d,ry=0)=>put(new THREE.BoxGeometry(w,h,d),m,x,y,z,0,ry);
  // Small bevels keep broad, crisp cabinet faces and catch the key light.
  function roundBox(m,x,y,z,w,h,d,r=.12) {
    r=Math.min(r*.22,.035,w/3,h/3,d/3);const shape=new THREE.Shape();
    shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    const g=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:r*.5,bevelThickness:r,curveSegments:3});g.translate(0,0,-d/2+r);return put(g,m,x,y,z);
  }
  const cyl=(m,x,y,z,r,h,rx=0,rz=0)=>put(new THREE.CylinderGeometry(r,r,h,16),m,x,y,z,rx,0,rz);
  const torus=(m,x,y,z,r,t,rx=0,ry=0)=>put(new THREE.TorusGeometry(r,t,8,24),m,x,y,z,rx,ry);
  function beam(m,a,b,r=.045) {
    const A=new THREE.Vector3(...a), B=new THREE.Vector3(...b), delta=B.clone().sub(A);
    const g=new THREE.CylinderGeometry(r,r,delta.length(),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());
    if(!batches.has(m))batches.set(m,[]);batches.get(m).push(g);
  }
  function sign(text,x,y,z,w,h,bg='#238fc9',fg='#fff8df',ry=0) {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*h/w);
    const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.floor(canvas.height*.56)}px "Arial", "PingFang SC", sans-serif`;ctx.fillText(text,512,canvas.height*.53,950);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
    const m=new THREE.MeshStandardMaterial({map:tex,roughness:.7});const g=new THREE.PlaneGeometry(w,h);const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.rotation.y=ry;root.add(mesh);resources.push(tex,m,g);return mesh;
  }
  // A broad, uninterrupted assembly floor, not a display plinth.
  box(concrete,0,-.13,0,27,.25,25);
  for(let x=-12;x<=12;x+=3)box(seam,x,.001,0,.018,.007,24);
  for(let z=-12;z<=12;z+=3)box(seam,0,.002,z,26,.007,.018);
  const bay=mat('#387e96',.9);roundBox(bay,0,.004,0,9.4,.009,6.5);
  // Paint corner marks and short, alternating hazard bars.
  for(const s of [-1,1]) {
    box(yellow,0,.015,s*3.35,9.8,.014,.09);
    box(yellow,s*4.85,.015,0,.09,.014,6.8);
    for(let i=0;i<17;i++)box(i%2?yellow:white,-4.64+i*.58,.023,s*3.62,.34,.015,.27,-.35);
    for(const t of [-1,1]) {box(white,s*4.25,.018,t*2.83,.65,.01,.06);box(white,s*4.55,.018,t*2.55,.06,.01,.6);}
  }
  for(const x of [-10.5,10.5])for(let z=-6;z<10;z+=1)box(yellow,x,.017,z,.065,.012,.55);
  // Open-front architecture: low side walls preserve sightlines during orbit.
  box(backWall,0,2.5,-11.3,27,5,.3);box(backTrim,0,.65,-11.09,27,1.3,.06);
  box(navy,0,1.32,-11.02,27,.06,.06);
  for(const x of [-13.35,13.35]) {
    box(cream,x,.62,0,.3,1.24,22.5);box(teal,x,.38,0,.32,.76,22.5);
    for(const z of [-11, -4, 4, 11]) {
      box(navy,x,3.75,z,.23,7.5,.25);box(yellow,x,.65,z,.3,1.3,.31);
      for(let y=.2;y<1.25;y+=.32)box(navy,x,y,z,.315,.12,.32);
    }
    box(navy,x,7.4,0,.3,.3,22.6);
  }
  // Clerestory windows, individual panes, mullions, and a sill.
  for(const x of [-8.5,8.5]) {
    box(navy,x,3.25,-11.04,6.7,2.25,.15);box(glass,x,3.25,-10.94,6.4,2.03,.025);
    box(cream,x,3.25,-10.89,6.4,.065,.05);
    for(let dx=-2.4;dx<=2.4;dx+=1.6)box(cream,x+dx,3.25,-10.88,.07,2.03,.06);
    box(white,x,2.12,-10.84,6.9,.12,.38);
  }
  sign('小小车库',0,3.8,-11.11,5,1.05);sign('拼一拼 · 开一开 · 再来一辆',0,2.92,-11.1,5,.35,'#e5dbc1','#008daf');
  // High steel roof trusses fade above the player so they never obscure assembly.
  const roofMats = [navy.clone(),teal.clone(),metal.clone(),glow.clone()];resources.push(...roofMats);
  const [roofNavy,roofTeal,roofMetal,roofGlow]=roofMats;
  // High steel roof trusses, deliberately no opaque ceiling.
  for(const z of [-10.8,-3.8,3.8]) {
    box(roofNavy,0,7.45,z,26.8,.16,.15);
    beam(roofNavy,[-13.3,7.5,z],[0,9,z],.085);beam(roofNavy,[0,9,z],[13.3,7.5,z],.085);
    for(let x=-12;x<12;x+=3) {
      const y=9-Math.abs(x)*1.5/13.3,yn=9-Math.abs(x+3)*1.5/13.3;
      beam(roofTeal,[x,7.45,z],[x,y,z],.045);beam(roofTeal,[x,7.45,z],[x+3,yn,z],.045);
    }
    for(const x of [-7,7]) {
      beam(roofMetal,[x,7.4,z],[x,6.85,z],.02);box(roofNavy,x,6.8,z,3.4,.13,.46);box(roofGlow,x,6.72,z,3.18,.035,.33);
    }
  }
  // Tool cabinets with recessed drawers, small handles and castors.
  function cabinet(x,z,w=2.1) {
    roundBox(teal,x,.77,z,w,1.32,.9);roundBox(blue,x,.82,z+.46,w-.12,1.13,.035);roundBox(yellow,x,1.48,z,w+.1,.13,1.03);
    for(let y=.37;y<1.4;y+=.25) {box(navy,x,y,z+.489,w-.2,.022,.02);box(metal,x,y+.1,z+.52,.55,.035,.06);}
    for(const dx of [-w*.38,w*.38])for(const dz of [-.29,.29])cyl(rubber,x+dx,.12,z+dz,.115,.09,0,Math.PI/2);
  }
  cabinet(-7.5,-9.2,2.6);cabinet(-4.7,-9.2,2.6);cabinet(6.8,-9.2,2.1);
  // Back pegboard with actual tools rather than a flat texture.
  roundBox(yellow,-6.1,2.5,-10.75,5.4,1.75,.12);
  for(let x=-8.55;x<-3.5;x+=.27)for(let y=1.82;y<3.25;y+=.27)cyl(navy,x,y,-10.67,.016,.012,Math.PI/2);
  for(let i=0;i<7;i++) {
    const x=-8.05+i*.59,y=2.48+(i%2)*.1;
    box(metal,x,y,-10.59,.08,.58,.045, i%2?.12:-.1);
    torus(metal,x,y+.34,-10.59,.1,.035);box(i%2?red:teal,x,y-.24,-10.55,.12,.23,.08);
  }
  // A trolley, spare wheel rack, oil bottles, bins, and folded floor jack.
  roundBox(red,-10, .6,-5.5,1.2,.78,.7);roundBox(yellow,-10,1.04,-5.5,1.36,.08,.8);
  for(const dx of [-.45,.45])for(const dz of [-.24,.24])cyl(rubber,-10+dx,.15,-5.5+dz,.12,.08,0,Math.PI/2);
  for(const x of [9.3,12])box(navy,x,1.65,-9.4,.1,3.3,1.25);
  for(const y of [.15,1.5,2.9])box(metal,10.65,y,-9.4,2.8,.09,1.25);
  for(const y of [.81,2.17])for(const x of [9.75,10.65,11.55]) {
    torus(rubber,x,y,-9.35,.44,.19,0,Math.PI/2);
    torus(navy,x,y,-9.35,.27,.025,0,Math.PI/2);
    for(let j=0;j<20;j++){const a=j*Math.PI/10;box(black,x,y+Math.cos(a)*.6,-9.35+Math.sin(a)*.6,.28,.045,.04);}
  }
  for(let i=0;i<4;i++){box(i%2?yellow:red,6.2+i*.35,1.73,-9.2,.21,.37,.21);cyl(navy,6.2+i*.35,1.95,-9.2,.045,.08);}
  cyl(teal,11.6,.56,-5.9,.46,1.1);cyl(navy,11.6,1.13,-5.9,.49,.08);
  box(red,8.6,.14,6.8,1.8,.18,.5);beam(navy,[8.1,.24,6.8],[7.9,1.4,6.8],.05);
  for(const x of [8,9.2])for(const z of [6.53,7.07])cyl(rubber,x,.14,z,.13,.09,Math.PI/2);
  // Fire extinguisher and safety station.
  cyl(red,-11.7,1.12,-10.7,.16,.68);cyl(metal,-11.7,1.5,-10.7,.06,.1);box(black,-11.7,1.59,-10.7,.29,.04,.07);
  sign('+',-11.7,2,-10.74,.48,.48,'#008daf');sign('01',-10.4,1.6,-10.79,.7,.45,'#ffbf13','#173e60');
  // Traffic cones sit well outside the play area.
  for(const [x,z] of [[-10,7],[10,8],[-11,8.2]]) {
    box(black,x,.045,z,.49,.09,.49);put(new THREE.ConeGeometry(.19,.65,16),red,x,.4,z);
    put(new THREE.CylinderGeometry(.095,.125,.12,16),white,x,.43,z);
  }
  // Merge static geometry by material. Recompute attributes to keep all inputs compatible.
  for(const [material,geometries] of batches) {
    const positions=[],normals=[],uvs=[];
    for(let g of geometries) {
      const original=g;if(g.index)g=g.toNonIndexed();
      positions.push(g.getAttribute('position').array);normals.push(g.getAttribute('normal').array);uvs.push(g.getAttribute('uv').array);
      if(g!==original)resources.push(g); resources.push(original);
    }
    const concat=arrays=>{const arr=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of arrays){arr.set(a,offset);offset+=a.length;}return arr;};
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(concat(positions),3));g.setAttribute('normal',new THREE.BufferAttribute(concat(normals),3));g.setAttribute('uv',new THREE.BufferAttribute(concat(uvs),2));g.computeBoundingSphere();
    const mesh=new THREE.Mesh(g,material);if(material===backWall||material===backTrim){mesh.userData.fadeWall=true;mesh.userData.wallNormal=new THREE.Vector3(0,0,1);}
    mesh.castShadow=material!==glass&&material!==glow;mesh.receiveShadow=true;root.add(mesh);resources.push(g);
  }
  return {root, update(time,camera){
    if(!camera)return;
    const roofOpacity=camera.position.y>7?0:1;for(const mesh of root.children)if(roofMats.includes(mesh.material))mesh.visible=roofOpacity>0;
    const opacity=camera.position.z < -10.4 ? .08 : 1;
    for(const m of [backWall,backTrim]) {const transparent=opacity<1;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.opacity=opacity;m.depthWrite=!transparent;}
  }, dispose(){scene.remove(root);for(const resource of new Set(resources))resource.dispose();}};
}
