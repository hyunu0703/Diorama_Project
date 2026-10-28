import * as THREE from './three.module.js';
import { buildChessPieces } from './chess-models.js';
import { createGemMaterials } from './celestial-gems.js';

const scene=new THREE.Scene();scene.background=new THREE.Color('#050609');scene.fog=new THREE.FogExp2('#050609',.025);
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,100);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
document.querySelector('#world').appendChild(renderer.domElement);
const canvas=renderer.domElement;canvas.setAttribute('aria-label','3D 체스보드. 드래그 회전, 휠 확대.');canvas.setAttribute('role','img');
let seed=7452;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const {ivory,ivoryTop,amberBase,obsidian,whiteTrim,blackTrim}=createGemMaterials();
const whiteGlow=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffd28b').multiplyScalar(1.65),toneMapped:false});
const blackGlow=new THREE.MeshBasicMaterial({color:new THREE.Color('#168dff').multiplyScalar(2),toneMapped:false});
// Environment reflection cards supply broad photographic highlights.
const pmrem=new THREE.PMREMGenerator(renderer),studio=new THREE.Scene();studio.background=new THREE.Color('#010102');
const softbox=document.createElement('canvas');softbox.width=softbox.height=256;
const sc=softbox.getContext('2d'),sg=sc.createRadialGradient(128,128,0,128,128,128);
sg.addColorStop(0,'#ffffff');sg.addColorStop(.35,'#c4c4c4');sg.addColorStop(.7,'#353535');sg.addColorStop(1,'#000000');sc.fillStyle=sg;sc.fillRect(0,0,256,256);
const softMap=new THREE.CanvasTexture(softbox);softMap.colorSpace=THREE.SRGBColorSpace;
function card(w,h,x,y,z,color,intensity){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:softMap,color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);studio.add(m);}
// Soft reflected light belongs to the pieces; stage lighting and board materials are untouched.
card(7,7,-3,7,5,'#fff1dc',3);card(5,6,4,4,4,'#fff5e5',2);
card(6,7,-4,5,-5,'#268cff',8);card(3,6,4,4,-4,'#78bdff',6);
card(5,6,-5,4,4,'#79bfff',4);
card(6,4,0,8,0,'#fff7e8',2.5);
let environment=pmrem.fromScene(studio,.025);scene.environment=environment.texture;scene.environmentIntensity=.12;document.body.dataset.environment='ready';
// Dark matte stage; the light stays attached to the board's day side.
const plaster=document.createElement('canvas');plaster.width=plaster.height=512;const pc=plaster.getContext('2d'),pixels=pc.createImageData(512,512);
for(let i=0;i<pixels.data.length;i+=4){const n=140+random()*35;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;}pc.putImageData(pixels,0,0);
const bump=new THREE.CanvasTexture(plaster);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(26,26);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:'#08090c',roughness:.91,bumpMap:bump,bumpScale:.025}));floor.rotation.x=-Math.PI/2;floor.position.y=-.37;floor.receiveShadow=true;scene.add(floor);
scene.add(new THREE.HemisphereLight('#c6cedc','#020204',.018));
// A broad, feathered pool covers white's ranks and fades before black's back rank.
const key=new THREE.SpotLight('#fff0dc',210,14,.76,.72,2);key.position.set(-3,7,5);key.target.position.set(0,0,2);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{near:.5,far:20});key.shadow.normalBias=.008;key.shadow.bias=-.0001;key.shadow.radius=3;key.shadow.blurSamples=8;scene.add(key,key.target);
// Restrained grazing light reveals occasional glass edges, not the whole night army.
const rim=new THREE.SpotLight('#b8c7df',12,15,.52,.85,2);rim.position.set(5,3,-1);rim.target.position.set(0,.8,-2.7);scene.add(rim,rim.target);
const board=new THREE.Group();scene.add(board);
function mesh(geo,mat,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const frame=new THREE.MeshPhysicalMaterial({color:'#171719',metalness:0,roughness:1,clearcoat:0,specularIntensity:0,envMapIntensity:0});mesh(new THREE.BoxGeometry(8.42,.4,8.42),frame,board,0,-.13,0);
mesh(new THREE.BoxGeometry(8.16,.035,8.16),new THREE.MeshPhysicalMaterial({color:'#080f18',metalness:0,roughness:1,specularIntensity:0,envMapIntensity:0}),board,0,.083,0);
const atlas=new THREE.TextureLoader().load('./assets/celestial-board.png',()=>{document.body.dataset.texture='ready';},undefined,()=>{document.body.dataset.texture='error';});atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const tileMaterial=new THREE.MeshPhysicalMaterial({map:atlas,color:'#ffffff',roughness:1,metalness:0,clearcoat:0,specularIntensity:0,envMapIntensity:0,emissiveIntensity:0});
// Abutting tiles have no dark physical gap. Crop the atlas's printed black borders out of each UV cell.
const tileInset=.03;
for(let r=0;r<8;r++)for(let c=0;c<8;c++){const geo=new THREE.PlaneGeometry(1,1),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(c+tileInset+uv.getX(i)*(1-2*tileInset))/8,1-(r+1-tileInset-uv.getY(i)*(1-2*tileInset))/8);const t=mesh(geo,tileMaterial,board,c-3.5,.107,r-3.5);t.rotation.x=-Math.PI/2;t.castShadow=false;}
function radialTexture(inner,outer){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,inner);g.addColorStop(1,outer);ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const shadowMap=radialTexture('rgba(0,0,0,.55)','rgba(0,0,0,0)'),poolMap=radialTexture('rgba(255,255,255,.6)','rgba(255,255,255,0)');
function disk(parent,size,y,map,color,opacity,additive=false){const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map,color,transparent:true,opacity,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending}));m.rotation.x=-Math.PI/2;m.position.y=y;parent.add(m);return m;}
disk(scene,12,-.355,shadowMap,'#241810',.8);
const {pieces,shapes}=buildChessPieces({board,ivory,ivoryTop,amberBase,obsidian,whiteTrim,blackTrim,whiteGlow,blackGlow,shadowMap,poolMap,disk,random});
// Controlled studio reflections prevent the sky artwork from striping the sculptures.
for(const material of[ivory,ivoryTop,amberBase,obsidian,whiteTrim,blackTrim]){material.envMap=environment.texture;material.needsUpdate=true;}
document.body.dataset.reflections='ready';
// Linear HDR scene -> highlight bloom -> filmic display transform.
const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true}),blurA=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false}),blurB=blurA.clone();
// Depth-aware atmospheric post effect: no fog meshes, sprites, or particles.
target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
const post=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));post.add(quad);
const vertexShader='varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}';
const blurMaterial=new THREE.ShaderMaterial({uniforms:{source:{value:target.texture},stepUV:{value:new THREE.Vector2()},threshold:{value:1}},vertexShader,fragmentShader:`varying vec2 uv0;uniform sampler2D source;uniform vec2 stepUV;uniform float threshold;vec3 tap(vec2 uv){vec3 c=texture2D(source,uv).rgb;return c*max(0.,1.-threshold/max(max(c.r,c.g),max(c.b,.0001)));}void main(){vec3 c=tap(uv0)*.227027;c+=(tap(uv0+stepUV*1.384615)+tap(uv0-stepUV*1.384615))*.316216;c+=(tap(uv0+stepUV*3.230769)+tap(uv0-stepUV*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`,depthTest:false,depthWrite:false});
const finalMaterial=new THREE.ShaderMaterial({uniforms:{source:{value:target.texture},bloom:{value:blurB.texture}},vertexShader,fragmentShader:`varying vec2 uv0;uniform sampler2D source;uniform sampler2D bloom;void main(){vec3 c=texture2D(source,uv0).rgb+texture2D(bloom,uv0).rgb*.055;c*=.96;c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);c=mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));float v=1.-.15*pow(length((uv0-.5)*1.2),2.);gl_FragColor=vec4(c*v,1.);}`,depthTest:false,depthWrite:false});
Object.assign(finalMaterial.uniforms,{
  sceneDepth:{value:target.depthTexture},inverseProjection:{value:camera.projectionMatrixInverse},
  cameraWorld:{value:camera.matrixWorld},eye:{value:camera.position},
  pixel:{value:new THREE.Vector2()},fogTime:{value:0}
});
finalMaterial.fragmentShader=`
varying vec2 uv0;
uniform sampler2D source,bloom,sceneDepth;
uniform mat4 inverseProjection,cameraWorld;
uniform vec3 eye;
uniform vec2 pixel;
uniform float fogTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
  float depth=texture2D(sceneDepth,uv0).x;
  vec4 view=inverseProjection*vec4(uv0*2.-1.,depth*2.-1.,1.);
  vec3 endpoint=(cameraWorld*vec4(view.xyz/view.w,1.)).xyz;
  vec3 ray=normalize(endpoint-eye);
  float lengthToSurface=min(length(endpoint-eye),55.);
  // Integrate only the shallow atmosphere around the board, up to visible geometry.
  float enter=max(0.,(2.4-eye.y)/ray.y);
  float leave=min(lengthToSurface,(-.36-eye.y)/ray.y);
  float stepLength=max(0.,leave-enter)/20.;
  vec3 mist=vec3(0.);float transmittance=1.;
  for(int i=0;i<20;i++){
    vec3 p=eye+ray*(enter+(float(i)+.5)*stepLength);
    float edge=pow(pow(abs(p.x),4.)+pow(abs(p.z),4.),.25);
    float surround=mix(.22,1.,smoothstep(2.3,4.7,edge))*(1.-smoothstep(4.8,8.5,edge+noise(p.xz*.55)*1.2));
    float height=exp(-pow((p.y-.5)/1.05,2.));
    vec2 drift=vec2(fogTime*.035,-fogTime*.022);
    float cloud=.42+.4*noise(p.xz*.72+drift)+.18*noise(p.xz*1.8-drift);
    float day=smoothstep(-1.15,1.15,p.z);
    // Day mist stays thin over the playing area and disperses beyond the rim.
    float daySurround=mix(.018,.48,smoothstep(3.5,5.8,edge))
      *exp(-pow(max(edge-5.,0.)/3.,2.));
    surround=mix(surround,daySurround,day);
    float density=surround*height*cloud*mix(1.2,.2,day);
    float alpha=1.-exp(-density*stepLength);
    mist+=transmittance*alpha*mix(vec3(.0003,.0004,.0007),vec3(.34,.36,.39),day);
    transmittance*=1.-alpha;
  }
  float haze=1.-transmittance;
  vec3 sharp=texture2D(source,uv0).rgb;
  vec3 soft=(texture2D(source,uv0+pixel*vec2(3,0)).rgb+texture2D(source,uv0-pixel*vec2(3,0)).rgb+texture2D(source,uv0+pixel*vec2(0,3)).rgb+texture2D(source,uv0-pixel*vec2(0,3)).rgb)*.25;
  vec3 c=(mix(sharp,soft,haze*.72)+texture2D(bloom,uv0).rgb*.055)*transmittance+mist;
  c*=.96;c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);
  c=mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));
  float v=1.-.15*pow(length((uv0-.5)*1.2),2.);
  gl_FragColor=vec4(c*v,1.);
}`;
let azimuth=-.63,elevation=.86,distance=19.4,goalDistance=19.4,drag=null;const lookAt=new THREE.Vector3(0,-.55,0),pointers=new Map();let pinch=null;
function fit(){return innerWidth/innerHeight<1?1/(innerWidth/innerHeight)**1.05:1;}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);const s=renderer.getDrawingBufferSize(new THREE.Vector2());target.setSize(s.x,s.y);finalMaterial.uniforms.pixel.value.set(1/s.x,1/s.y);blurA.setSize(Math.max(1,Math.round(s.x/3)),Math.max(1,Math.round(s.y/3)));blurB.setSize(blurA.width,blurA.height);}resize();addEventListener('resize',resize);
function reset(){azimuth=-.63;elevation=.86;goalDistance=19.4;lookAt.set(0,-.55,0);}document.querySelector('#reset').addEventListener('click',reset);canvas.addEventListener('dblclick',reset);canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={id:e.pointerId,x:e.clientX,y:e.clientY,pan:e.button===2||e.shiftKey};canvas.classList.add('dragging');if(pointers.size===2){const[a,b]=[...pointers.values()];pinch={length:Math.hypot(a.x-b.x,a.y-b.y),distance:goalDistance};}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()];goalDistance=THREE.MathUtils.clamp(pinch.distance*pinch.length/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),11,30);return;}if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(drag.pan){const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),scale=distance*.0008;lookAt.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);}else{azimuth-=dx*.005;elevation=THREE.MathUtils.clamp(elevation+dy*.004,.25,1.45);}drag.x=e.clientX;drag.y=e.clientY;});
function release(e){pointers.delete(e.pointerId);pinch=null;drag=null;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}for(const name of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,release);
canvas.addEventListener('wheel',e=>{e.preventDefault();goalDistance=THREE.MathUtils.clamp(goalDistance+e.deltaY*(e.deltaMode===1?.12:.012),11,30);},{passive:false});
addEventListener('keydown',e=>{if(e.target.matches('button,input'))return;if(e.key.toLowerCase()==='r')reset();if(e.key==='ArrowLeft')azimuth-=.08;if(e.key==='ArrowRight')azimuth+=.08;if(e.key==='ArrowUp')elevation=Math.min(1.45,elevation+.06);if(e.key==='ArrowDown')elevation=Math.max(.25,elevation-.06);if(e.key==='+'||e.key==='=')goalDistance=Math.max(11,goalDistance-1);if(e.key==='-')goalDistance=Math.min(30,goalDistance+1);});
let last=performance.now(),frames=0;renderer.setAnimationLoop(time=>{const dt=Math.min((time-last)/1000,.1);last=time;distance+=(goalDistance-distance)*(1-Math.exp(-10*dt));const r=distance*fit();camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*r,Math.sin(elevation)*r,Math.cos(azimuth)*Math.cos(elevation)*r).add(lookAt);camera.lookAt(lookAt);finalMaterial.uniforms.fogTime.value=time*.001;renderer.setRenderTarget(target);renderer.render(scene,camera);quad.material=blurMaterial;blurMaterial.uniforms.source.value=target.texture;blurMaterial.uniforms.threshold.value=1.4;blurMaterial.uniforms.stepUV.value.set(1.5/blurA.width,0);renderer.setRenderTarget(blurA);renderer.render(post,postCamera);blurMaterial.uniforms.source.value=blurA.texture;blurMaterial.uniforms.threshold.value=0;blurMaterial.uniforms.stepUV.value.set(0,1.5/blurA.height);renderer.setRenderTarget(blurB);renderer.render(post,postCamera);quad.material=finalMaterial;renderer.setRenderTarget(null);renderer.render(post,postCamera);if(++frames>=3&&document.body.dataset.texture==='ready'&&document.body.dataset.reflections==='ready'){document.body.classList.add('ready');document.body.dataset.pieces=pieces.length;}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#status').textContent='3D 화면 연결이 중단되었습니다. 새로고침해 주세요.';document.body.classList.remove('ready');});






