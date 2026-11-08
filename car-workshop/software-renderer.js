// Compatibility renderer for browsers without WebGL. This is deliberately a
// simpler CPU lighting model, not a replacement for Three.js PBR or shadows.
// Geometry, camera, world transforms and raycasting remain the real 3D scene.
import * as THREE from './vendor/three.module.min.js';
const STRIDE = 8; // homogeneous xyzw, diffuse, specular, uv
const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
const planes = [v=>v[3]+v[0],v=>v[3]-v[0],v=>v[3]+v[1],v=>v[3]-v[1],v=>v[3]+v[2],v=>v[3]-v[2]];
function clipTriangle(a,b,c) {
  let poly=[a,b,c];
  for(const distance of planes) {
    let outside=0;for(const v of poly)if(distance(v)<0)outside++;
    if(!outside)continue;if(outside===poly.length)return [];
    const next=[];let prev=poly[poly.length-1],dp=distance(prev);
    for(const curr of poly) {
      const dc=distance(curr);
      if((dp<0)!==(dc<0)) {const t=dp/(dp-dc),v=new Float64Array(STRIDE);for(let j=0;j<STRIDE;j++)v[j]=prev[j]+t*(curr[j]-prev[j]);next.push(v);}
      if(dc>=0)next.push(curr);prev=curr;dp=dc;
    }
    poly=next;
  }
  return poly;
}
function outcode(v) {return (v[0]<-v[3]?1:0)|(v[0]>v[3]?2:0)|(v[1]<-v[3]?4:0)|(v[1]>v[3]?8:0)|(v[2]<-v[3]?16:0)|(v[2]>v[3]?32:0);}
function wrap(v,mode) {
  if(mode===THREE.RepeatWrapping)return v-Math.floor(v);
  if(mode===THREE.MirroredRepeatWrapping){const k=Math.floor(v),f=v-k;return Math.abs(k%2)?1-f:f;}
  return clamp(v);
}
export class SoftwareRenderer {
  constructor() {
    this.isSoftwareRenderer=true;
    this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d');
    if(!this.ctx)throw Error('Canvas unavailable');
    this.shadowMap={enabled:false};this.lastTime=-Infinity;this.pixelRatio=1;
    this.vertexCache=new WeakMap();this.textureCache=new WeakMap();
    this.vp=new THREE.Matrix4();this.mvp=new THREE.Matrix4();this.normalMatrix=new THREE.Matrix3();
    this.light=new THREE.Vector3();this.half=new THREE.Vector3();this.eye=new THREE.Vector3();this.center=new THREE.Vector3();
    this.background=new THREE.Color('#e3ebe1');this.setSize(300,150);
  }
  setPixelRatio(ratio){this.pixelRatio=clamp(Number(ratio)||1,.5,2);if(this.logicalWidth)this.setSize(this.logicalWidth,this.logicalHeight,false);}
  getPixelRatio(){return this.pixelRatio;}
  setSize(w,h,updateStyle=true) {
    this.logicalWidth=Math.max(1,w);this.logicalHeight=Math.max(1,h);
    const scale=Math.min(this.pixelRatio,800/this.logicalWidth,640/this.logicalHeight);
    this.width=Math.max(1,Math.round(this.logicalWidth*scale));this.height=Math.max(1,Math.round(this.logicalHeight*scale));
    this.domElement.width=this.width;this.domElement.height=this.height;
    if(updateStyle){this.domElement.style.width=`${w}px`;this.domElement.style.height=`${h}px`;}
    this.pixels=this.ctx.createImageData(this.width,this.height);this.depth=new Float32Array(this.width*this.height);this.lastTime=-Infinity;
  }
  setClearColor(color){this.background.set(color);}
  getSize(target){return target.set(this.logicalWidth,this.logicalHeight);}
  getDrawingBufferSize(target){return target.set(this.width,this.height);}
  dispose(){this.pixels=null;this.depth=null;this.vertexCache=new WeakMap();this.textureCache=new WeakMap();}
  texture(map) {
    if(!map?.image)return null;
    let cached=this.textureCache.get(map);if(cached?.version===map.version)return cached;
    try {
      const img=map.image,w=img.width||img.videoWidth,h=img.height||img.videoHeight;if(!w||!h)return null;
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(img,0,0);cached={version:map.version,width:w,height:h,data:ctx.getImageData(0,0,w,h).data};this.textureCache.set(map,cached);return cached;
    }catch {this.textureCache.set(map,{version:map.version});return null;} // Tainted/unsupported image: keep the material color.
  }
  render(scene,camera) {
    if(!this.pixels)return;
    const now=performance.now();if(now-this.lastTime<80)return;this.lastTime=now;
    const bg=(scene.background?.isColor?scene.background:this.background).clone().convertLinearToSRGB(),data=this.pixels.data;
    const r=Math.round(bg.r*255),g=Math.round(bg.g*255),b=Math.round(bg.b*255);
    for(let i=0;i<data.length;i+=4){data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;}this.depth.fill(Infinity);
    scene.updateMatrixWorld();camera.updateMatrixWorld();this.vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    this.eye.setFromMatrixPosition(camera.matrixWorld);this.light.set(-.4,1,.7).normalize();
    const opaque=[],transparent=[],wire=[];let sun=null;
    scene.traverseVisible(obj=>{
      if(obj.isDirectionalLight&&(!sun||obj.intensity>sun.intensity))sun=obj;
      if(!obj.isMesh||!obj.geometry?.attributes.position||!obj.layers.test(camera.layers))return;
      const mats=Array.isArray(obj.material)?obj.material:[obj.material];
      const groups=Array.isArray(obj.material)?obj.geometry.groups:[{start:0,count:Infinity,materialIndex:0}];
      for(const group of groups){const mat=mats[group.materialIndex];if(!mat||mat.visible===false||mat.opacity<=0)continue;
        const item={obj,mat,group};(mat.wireframe?wire:mat.transparent?transparent:opaque).push(item);}
    });
    if(sun){this.light.setFromMatrixPosition(sun.matrixWorld);this.center.setFromMatrixPosition(sun.target.matrixWorld);this.light.sub(this.center).normalize();}
    // Sorting whole objects is a pragmatic transparency approximation, as in
    // many real-time renderers. Opaque fragments always use the depth buffer.
    transparent.sort((a,b)=>this.eye.distanceToSquared(this.center.setFromMatrixPosition(b.obj.matrixWorld))-this.eye.distanceToSquared(this.center.setFromMatrixPosition(a.obj.matrixWorld)));
    for(const item of [...opaque,...transparent,...wire])this.drawMesh(item,camera);
    this.ctx.putImageData(this.pixels,0,0);
  }
  drawMesh({obj,mat,group},camera) {
    const geo=obj.geometry,pos=geo.attributes.position,norm=geo.attributes.normal,uv=geo.attributes.uv;
    let cache=this.vertexCache.get(obj);
    if(!cache||cache.points.length!==pos.count){cache={points:Array.from({length:pos.count},()=>new Float64Array(STRIDE)),codes:new Uint8Array(pos.count)};this.vertexCache.set(obj,cache);}
    const points=cache.points,codes=cache.codes;
    this.mvp.multiplyMatrices(this.vp,obj.matrixWorld);this.normalMatrix.getNormalMatrix(obj.matrixWorld);
    const m=this.mvp.elements,n=this.normalMatrix.elements,L=this.light;
    this.center.setFromMatrixPosition(obj.matrixWorld);this.half.copy(this.eye).sub(this.center).normalize().add(L).normalize();const H=this.half;
    const rough=mat.roughness??.55,shininess=8+(1-rough)*38;
    for(let i=0;i<pos.count;i++) {
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),v=points[i];
      v[0]=m[0]*x+m[4]*y+m[8]*z+m[12];v[1]=m[1]*x+m[5]*y+m[9]*z+m[13];v[2]=m[2]*x+m[6]*y+m[10]*z+m[14];v[3]=m[3]*x+m[7]*y+m[11]*z+m[15];
      if(norm&&!mat.isMeshBasicMaterial){const nx=norm.getX(i),ny=norm.getY(i),nz=norm.getZ(i);let ax=n[0]*nx+n[3]*ny+n[6]*nz,ay=n[1]*nx+n[4]*ny+n[7]*nz,az=n[2]*nx+n[5]*ny+n[8]*nz;const inv=1/(Math.hypot(ax,ay,az)||1);ax*=inv;ay*=inv;az*=inv;
        const dot=ax*L.x+ay*L.y+az*L.z;
        v[4]=.47+.12*(ay*.5+.5)+.42*Math.max(0,mat.side===THREE.DoubleSide?Math.abs(dot):dot);
        v[5]=Math.pow(Math.max(0,ax*H.x+ay*H.y+az*H.z),shininess)*(.055+(mat.metalness||0)*.2)*(1-rough*.65);
      }else{v[4]=1;v[5]=0;}
      v[6]=uv?uv.getX(i):0;v[7]=uv?uv.getY(i):0;codes[i]=outcode(v);
    }
    const color=(mat.color||new THREE.Color('#aaa')).clone().convertLinearToSRGB(),em=mat.emissive?.clone().convertLinearToSRGB(),ei=mat.emissiveIntensity??1;
    const state={mat,color:[color.r*255,color.g*255,color.b*255],em:[(em?.r||0)*ei*100,(em?.g||0)*ei*100,(em?.b||0)*ei*100],tex:this.texture(mat.map),flip:obj.matrixWorld.determinant()<0};
    if(mat.map?.matrixAutoUpdate)mat.map.updateMatrix();
    const index=geo.index,total=index?index.count:pos.count,start=Math.max(group.start,geo.drawRange.start),end=Math.min(total,group.start+group.count,geo.drawRange.start+geo.drawRange.count);
    for(let i=start;i+2<end;i+=3){const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2;if(codes[ia]&codes[ib]&codes[ic])continue;
      const a=points[ia],b=points[ib],c=points[ic];
      if(!(codes[ia]|codes[ib]|codes[ic]))this.triangle(a,b,c,state);
      else {const polygon=clipTriangle(a,b,c);for(let j=1;j+1<polygon.length;j++)this.triangle(polygon[0],polygon[j],polygon[j+1],state);}
    }
  }
  triangle(a,b,c,state) {
    const w=this.width,h=this.height,qa=1/a[3],qb=1/b[3],qc=1/c[3];
    const ax=(a[0]*qa*.5+.5)*w,ay=(.5-a[1]*qa*.5)*h,bx=(b[0]*qb*.5+.5)*w,by=(.5-b[1]*qb*.5)*h,cx=(c[0]*qc*.5+.5)*w,cy=(.5-c[1]*qc*.5)*h;
    const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax),mat=state.mat;
    if(!Number.isFinite(area)||Math.abs(area)<.015)return;
    const front=state.flip?area>0:area<0;
    if(mat.side===THREE.FrontSide&&!front||mat.side===THREE.BackSide&&front)return;
    const za=a[2]*qa,zb=b[2]*qb,zc=c[2]*qc;
    if(mat.wireframe){this.line(ax,ay,za,bx,by,zb,state);this.line(bx,by,zb,cx,cy,zc,state);this.line(cx,cy,zc,ax,ay,za,state);return;}
    const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx))),maxX=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx))),minY=Math.max(0,Math.floor(Math.min(ay,by,cy))),maxY=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));
    if(minX>maxX||minY>maxY)return;
    const d=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy),dx1=(by-cy)/d,dy1=(cx-bx)/d,dx2=(cy-ay)/d,dy2=(ax-cx)/d;
    let row1=((by-cy)*(minX+.5-cx)+(cx-bx)*(minY+.5-cy))/d,row2=((cy-ay)*(minX+.5-cx)+(ax-cx)*(minY+.5-cy))/d;
    const depth=this.depth,data=this.pixels.data,tex=state.tex?.data?state.tex:null,map=mat.map,tm=map?.matrix.elements,col=state.color,em=state.em,opacity=mat.opacity??1;
    for(let y=minY;y<=maxY;y++,row1+=dy1,row2+=dy2){let l1=row1,l2=row2;
      for(let x=minX;x<=maxX;x++,l1+=dx1,l2+=dx2){const l3=1-l1-l2;if(l1<-.00001||l2<-.00001||l3<-.00001)continue;
        const z=l1*za+l2*zb+l3*zc,idx=y*w+x;if(mat.depthTest!==false&&z>=depth[idx])continue;
        let alpha=opacity,tr=1,tg=1,tb=1;const inv=1/(l1*qa+l2*qb+l3*qc),pa=l1*qa*inv,pb=l2*qb*inv,pc=l3*qc*inv;
        if(tex){let u=pa*a[6]+pb*b[6]+pc*c[6],v=pa*a[7]+pb*b[7]+pc*c[7];const tu=tm[0]*u+tm[3]*v+tm[6];v=tm[1]*u+tm[4]*v+tm[7];u=wrap(tu,map.wrapS);v=wrap(v,map.wrapT);if(map.flipY)v=1-v;
          const ti=(Math.min(tex.height-1,Math.floor(v*tex.height))*tex.width+Math.min(tex.width-1,Math.floor(u*tex.width)))*4;tr=tex.data[ti]/255;tg=tex.data[ti+1]/255;tb=tex.data[ti+2]/255;alpha*=tex.data[ti+3]/255;}
        if(alpha<Math.max(mat.alphaTest||0,.001))continue;
        const shade=pa*a[4]+pb*b[4]+pc*c[4],spec=(pa*a[5]+pb*b[5]+pc*c[5])*255,j=idx*4;
        const rr=clamp(col[0]*tr*shade+spec+em[0],0,255),gg=clamp(col[1]*tg*shade+spec+em[1],0,255),bb=clamp(col[2]*tb*shade+spec+em[2],0,255);
        data[j]=rr*alpha+data[j]*(1-alpha);data[j+1]=gg*alpha+data[j+1]*(1-alpha);data[j+2]=bb*alpha+data[j+2]*(1-alpha);
        if(mat.depthWrite!==false)depth[idx]=z;
      }
    }
  }
  line(ax,ay,az,bx,by,bz,state) {
    const steps=Math.ceil(Math.max(Math.abs(bx-ax),Math.abs(by-ay)));if(!steps)return;
    const alpha=Math.max(.35,state.mat.opacity??1),col=state.color;
    for(let i=0;i<=steps;i++){const t=i/steps,x=Math.floor(ax+(bx-ax)*t),y=Math.floor(ay+(by-ay)*t);if(x<0||y<0||x>=this.width||y>=this.height)continue;
      const idx=y*this.width+x,z=az+(bz-az)*t;if(state.mat.depthTest!==false&&z>this.depth[idx]+.0015)continue;
      const j=idx*4;for(let k=0;k<3;k++)this.pixels.data[j+k]=col[k]*alpha+this.pixels.data[j+k]*(1-alpha);
    }
  }
}
