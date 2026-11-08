import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import {SoftwareRenderer} from '../software-renderer.js';

// Exercise the production CPU rasterizer, not just its lighting constants.
function sample(color,lightZ){
 const oldDocument=globalThis.document;
 globalThis.document={createElement:()=>({style:{},getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
 try{
  const scene=new THREE.Scene(),sun=new THREE.DirectionalLight('white',2.7);sun.position.set(0,0,lightZ);scene.add(sun,sun.target);
  const geometry=new THREE.PlaneGeometry(2,2),material=new THREE.MeshStandardMaterial({color,roughness:1,metalness:0});scene.add(new THREE.Mesh(geometry,material));
  const camera=new THREE.PerspectiveCamera(50,1,.1,100);camera.position.set(0,0,3);camera.lookAt(0,0,0);
  const renderer=new SoftwareRenderer();renderer.setSize(32,32);renderer.render(scene,camera);
  const pixel=Array.from(renderer.pixels.data.slice((16*32+16)*4,(16*32+16)*4+3));renderer.dispose();geometry.dispose();material.dispose();return pixel;
 }finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
}
test('compatibility rendering lifts unlit faces while retaining strong directional contrast',()=>{
 const shade=sample('#ffffff',-10),lit=sample('#ffffff',10);
 assert.ok(shade[0]>=95&&shade[0]<=105);assert.ok(lit[0]>=235&&lit[0]<250);
 assert.ok(lit[0]/shade[0]>2.3);assert.equal(shade[0],shade[1]);assert.equal(shade[1],shade[2]);
});
test('compatibility paint keeps saturated red and teal without clipped highlights',()=>{
 for(const color of ['#e62e26','#009eaf']){
  const shade=sample(color,-10),lit=sample(color,10);
  for(const pixel of [shade,lit]){assert.ok(Math.max(...pixel)<250);assert.ok((Math.max(...pixel)-Math.min(...pixel))/Math.max(...pixel)>.8);}
 }
 const dark=sample('#1e2630',-10);assert.ok(Math.min(...dark)>=10);assert.ok(Math.max(...dark)<25);
});
