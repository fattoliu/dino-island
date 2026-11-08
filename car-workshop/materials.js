import * as THREE from './vendor/three.module.min.js';

// Original, locally shipped raster art. A single decoded atlas feeds four 512px
// textures. There are no runtime third-party requests or per-vehicle copies.
export const ART_ASSETS=Object.freeze({
 workshop:new URL('./assets/workshop-materials.webp',import.meta.url).href,
 vehicle:new URL('./assets/vehicle-materials.webp',import.meta.url).href,
 mural:new URL('./assets/alpine-mural.webp',import.meta.url).href,
});
const cache=new Map();let pending=null;
const TILE={concrete:['workshop',0,0],asphalt:['workshop',1,0],wood:['workshop',0,1],plaster:['workshop',1,1],paint:['vehicle',0,0],metal:['vehicle',1,0],rubber:['vehicle',0,1],leather:['vehicle',1,1]};
export function artTexture(name){
 if(cache.has(name))return cache.get(name);
 const placeholder=typeof document!=='undefined'?document.createElement('canvas'):null;if(placeholder){placeholder.width=placeholder.height=1;const c=placeholder.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,1,1);}
 const texture=new THREE.Texture(placeholder);if(placeholder)texture.needsUpdate=true;texture.name=name;texture.userData.sharedAsset=true;
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;
 if(name==='mural'){texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;}
 cache.set(name,texture);return texture;
}
function image(url){return new Promise((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>reject(new Error('Art timed out: '+url)),15000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(new Error('Art unavailable: '+url));};img.src=url;});}
export function loadArtAssets(){
 if(pending)return pending;
 if(typeof Image==='undefined'||typeof document==='undefined')return Promise.resolve([]);
 pending=Promise.allSettled(Object.entries(ART_ASSETS).map(async([key,url])=>{
  const source=await image(url);
  if(key==='mural'){const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=Math.round(1536*source.height/source.width);canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);const texture=artTexture('mural');texture.image=canvas;texture.needsUpdate=true;return key;}
  for(const [name,[atlas,x,y]] of Object.entries(TILE))if(atlas===key){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
   canvas.getContext('2d').drawImage(source,x*source.width/2,y*source.height/2,source.width/2,source.height/2,0,0,512,512);
   const texture=artTexture(name);texture.image=canvas;texture.needsUpdate=true;
  }return key;
 }));return pending;
}
// Project in local metres rather than stretching a tiny texture across a wall.
// Normals choose the dominant plane, preserving material scale after batching.
export function projectMaterialUV(geometry,scale=1){
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=Math.abs(n?.getX(i)||0),ny=Math.abs(n?.getY(i)||0),nz=Math.abs(n?.getZ(i)||0);
  if(ny>=nx&&ny>=nz){uv[i*2]=x*scale;uv[i*2+1]=z*scale;}
  else if(nx>nz){uv[i*2]=z*scale;uv[i*2+1]=y*scale;}
  else {uv[i*2]=x*scale;uv[i*2+1]=y*scale;}
 }geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
}
export function applySurface(material,name,{bump=.012,roughness=material.roughness}={}){
 material.map=artTexture(name);material.roughness=roughness;material.userData.surface=name;
 // Real height detail in WebGL; CPU fallback uses the same base-color texture.
 material.bumpMap=material.map;material.bumpScale=bump;material.needsUpdate=true;return material;
}
export function finishVehicleMaterials(model){
 const seen=new Set();model.group.traverse(o=>{
  if(!o.isMesh)return;projectMaterialUV(o.geometry,1.65);
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(seen.has(m))continue;seen.add(m);const color=m.color?.getHexString();
   if(m===model.paint||m===model.accent){applySurface(m,'paint',{bump:.0025});m.roughness=.29;}
   else if(['1e2630','2c3540','1c2936'].includes(color))applySurface(m,'rubber',{bump:.022});
   else if(['583b2e','ebaf6a'].includes(color))applySurface(m,'leather',{bump:.014});
   else if(['b8c7d1','dee6e9','68737c','d9e7ee'].includes(color))applySurface(m,'metal',{bump:.004});
  }
 });model.group.userData.artVersion='raster-materials-1';return model;
}
export function textureTown(root){
 const seen=new Set();root.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(Array.isArray(m))return;const c=m.color?.getHexString();
  if(!seen.has(m)){
   if(['354958','7994a4','88a7b4'].includes(c)){applySurface(m,'asphalt',{bump:.045});m.color.set(c==='354958'?'#b3c0cb':'#e7f6ec');}
   else if(['e9dfc6','e5d3ad','fff1d1'].includes(c))applySurface(m,'concrete',{bump:.025});
   else if(['b58255','b67d48','b28755'].includes(c))applySurface(m,'wood',{bump:.015});
   else if(m.roughness>.6&&m.color&&o.geometry?.attributes.position.count>36)applySurface(m,'plaster',{bump:.012});
   seen.add(m);
  }
  if(m.map)projectMaterialUV(o.geometry,.35);
 });
}
