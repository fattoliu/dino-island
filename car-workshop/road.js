import * as THREE from './vendor/three.module.min.js';
import { TRACK } from './driving-state.js?v=6';

// An original low-poly park circuit. Static pieces merge by material to keep
// draw calls low in WebGL and the software renderer; no textures or downloads.
export function buildRoad(scene){
  const root=new THREE.Group();root.name='阳光环岛赛道';root.visible=false;scene.add(root);
  const materials=new Map(),buckets=new Map();
  function material(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.88,metalness:0}));return materials.get(color);}
  function add(geometry,color,x=0,y=0,z=0,rotation=0){
    const mat=material(color),m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rotation),new THREE.Vector3(1,1,1));
    const geo=geometry.index?geometry.toNonIndexed():geometry.clone();geo.applyMatrix4(m);geometry.dispose();
    if(!buckets.has(mat))buckets.set(mat,[]);buckets.get(mat).push(geo);
  }
  function box(x,y,z,w,h,d,c,rot=0){add(new THREE.BoxGeometry(w,h,d),c,x,y,z,rot);}
  function ring(inner,outer,y,color,segments=144,start=0,end=Math.PI*2){
    const a=[];
    for(let i=0;i<segments;i++){
      const u=start+(end-start)*i/segments,v=start+(end-start)*(i+1)/segments;
      const p=(r,t)=>[r*Math.sin(t),y,r*Math.cos(t)-TRACK.radius];
      // Counter-clockwise winding as viewed from above.
      a.push(...p(inner,u),...p(outer,u),...p(outer,v),...p(inner,u),...p(outer,v),...p(inner,v));
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));g.computeVertexNormals();add(g,color);
  }
  const R=TRACK.radius,W=TRACK.width;
  box(0,-.2,-R,260,.3,260,'#8ebc78');
  // A warmer shoulder, asphalt ribbon, crisp edge lines and dashed lane marks.
  ring(R-W/2-1.1,R+W/2+1.1,-.015,'#ddd6bb');
  ring(R-W/2,R+W/2,TRACK.surfaceY,'#576b70');
  for(const r of [R-W/2+.38,R+W/2-.38])ring(r-.09,r+.09,.053,'#f9f5d9');
  for(let i=0;i<72;i++){
    const a=i*Math.PI/36,b=a+.047;
    ring(R-.09,R+.09,.058,'#f6df79',2,a,b);
    for(const r of [R-W/2-.37,R+W/2+.37])ring(r-.32,r+.32,.045,i%2?'#fff6e7':'#ed7960',2,a,a+Math.PI/36);
  }
  // Both sides are continuously protected. Lane limits also keep the longest
  // vehicle's corners well inside the rails, including at maximum steering.
  for(const r of [R-W/2-.8,R+W/2+.8]){
    for(let i=0;i<96;i++){
      const a=(i+.5)*Math.PI/48,x=r*Math.sin(a),z=r*Math.cos(a)-R;
      box(x,.88,z,2*r*Math.sin(Math.PI/96)+.08,.31,.16,'#e5eeea',a);
      if(i%2===0)box(x,.47,z,.13,.95,.16,'#6e8b85',a);
      if(i%8===0)box(x,1.08,z,.28,.12,.23,'#f9c852',a);
    }
  }
  // Start/finish stripe and generous overhead gateway.
  for(let row=0;row<2;row++)for(let col=0;col<18;col++)box(-.7+row*.7,.065,-8.5+col,.7,.015,1,(row+col)%2?'#faf7e9':'#283f45');
  for(const z of [-10.1,10.1]){box(1,4,z,.48,8,.48,'#f4ecd6');box(1,.55,z,1.2,1.1,1.2,'#e9aa4b');}
  box(1,8.1,0,.65,.85,20.8,'#3c8e91');
  for(let i=0;i<20;i++)box(.65,8.12,-9.5+i,.07,.42,.8,i%2?'#fff6dc':'#ecc15a');
  // Direction chevrons on the inside of each bend.
  for(let i=0;i<8;i++){
    const a=.55+i*Math.PI/4,r=R-W/2-2.3,x=r*Math.sin(a),z=r*Math.cos(a)-R;
    box(x,1.5,z,1.7,.85,.15,'#f6c85b',a);box(x,.75,z,.1,1.5,.1,'#5a7771');
    box(x,1.5,z+.1,.55,.13,.18,'#425b5b',a+.55);
  }
  function tree(x,z,size=1){
    add(new THREE.CylinderGeometry(.17*size,.23*size,1.7*size,5),'#8a7556',x,.85*size,z);
    add(new THREE.ConeGeometry(1.35*size,2.8*size,7),'#40876b',x,2.6*size,z);
    add(new THREE.ConeGeometry(.95*size,2.2*size,7),'#67a276',x,3.65*size,z);
  }
  for(let i=0;i<34;i++){
    const a=i*2.399963,r=56+(i%5)*4;tree(r*Math.sin(a),r*Math.cos(a)-R,.8+(i%4)*.17);
  }
  for(let i=0;i<11;i++){
    const a=i*2.399963,r=11+(i%3)*3.8;tree(r*Math.sin(a),r*Math.cos(a)-R,.75+(i%3)*.2);
  }
  // Quiet blue pond and sandy bank in the island.
  add(new THREE.CylinderGeometry(9.5,9.5,.03,32),'#d9d4ad',-4,-.01,-R);
  add(new THREE.CylinderGeometry(8.5,8.5,.04,32),'#70bec1',-4,.015,-R);
  for(let i=0;i<5;i++)box(-8+i*2,.044,-R-2+(i%2)*1.6,1.1,.012,.08,'#b5e0d7');
  // Hills and small clouds create a friendly horizon from every turn.
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,r=105;
    add(new THREE.ConeGeometry(18+(i%3)*4,20+(i%4)*5,7),'#86aa87',r*Math.sin(a),8,r*Math.cos(a)-R);
  }
  for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7,x=80*Math.sin(a),z=80*Math.cos(a)-R;
    for(let j=0;j<3;j++)add(new THREE.IcosahedronGeometry(3+j%2,0),'#f2f6e8',x+j*3.4,25+(i%3)*3+j%2,z);
  }
  for(const [mat,geos] of buckets){
    const size=geos.reduce((sum,g)=>sum+g.attributes.position.array.length,0),positions=new Float32Array(size),normals=new Float32Array(size);let offset=0;
    for(const g of geos){positions.set(g.attributes.position.array,offset);normals.set(g.attributes.normal.array,offset);offset+=g.attributes.position.array.length;g.dispose();}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('normal',new THREE.BufferAttribute(normals,3));g.computeBoundingSphere();
    const mesh=new THREE.Mesh(g,mat);mesh.receiveShadow=true;root.add(mesh);
  }
  return {root,dispose(){root.removeFromParent();root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const m of materials.values())m.dispose();}};
}
