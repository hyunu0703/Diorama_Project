import * as THREE from './three.module.js';
import { RGBELoader } from './assets/RGBELoader.js';

const scene=new THREE.Scene();scene.background=new THREE.Color('#aa9180');scene.fog=new THREE.FogExp2('#aa9180',.012);
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,100);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
document.querySelector('#world').appendChild(renderer.domElement);
const canvas=renderer.domElement;canvas.setAttribute('aria-label','3D 체스보드. 드래그 회전, 휠 확대.');canvas.setAttribute('role','img');
let seed=7452;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const ivory=new THREE.MeshPhysicalMaterial({color:'#ffe2a9',metalness:.05,roughness:.12,transmission:.58,thickness:.34,ior:1.46,attenuationColor:'#ffc75b',attenuationDistance:1.7,clearcoat:1,clearcoatRoughness:.07,envMapIntensity:.8});
const obsidian=new THREE.MeshPhysicalMaterial({color:'#030c19',metalness:.7,roughness:.16,clearcoat:1,clearcoatRoughness:.09,envMapIntensity:1.4});
const whiteTrim=new THREE.MeshPhysicalMaterial({color:'#ffe4a1',metalness:.55,roughness:.18,emissive:'#ffad36',emissiveIntensity:.55,clearcoat:1});
const blackTrim=new THREE.MeshPhysicalMaterial({color:'#082949',metalness:.85,roughness:.15,emissive:'#006ed0',emissiveIntensity:.28,clearcoat:1});
const whiteGlow=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffba4b').multiplyScalar(3.5),toneMapped:false});
const blackGlow=new THREE.MeshBasicMaterial({color:new THREE.Color('#168dff').multiplyScalar(2),toneMapped:false});
// Environment reflection cards supply broad photographic highlights.
const pmrem=new THREE.PMREMGenerator(renderer),studio=new THREE.Scene();studio.background=new THREE.Color('#8b7b70');
function card(w,h,x,y,z,color,intensity){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);studio.add(m);}
card(8,5,-4,7,5,'#fff1de',5);card(2,7,6,4,-3,'#91c4ff',3);card(7,2,0,5,-7,'#ffffff',4);
let environment=pmrem.fromScene(studio,.025);scene.environment=environment.texture;scene.environmentIntensity=.65;
new RGBELoader().load('./assets/studio_small_09_1k.hdr',hdr=>{hdr.mapping=THREE.EquirectangularReflectionMapping;studio.background=hdr;const next=pmrem.fromScene(studio,.04);scene.environment=next.texture;environment.dispose();environment=next;hdr.dispose();document.body.dataset.environment='ready';},undefined,()=>{document.body.dataset.environment='fallback';});
// Warm matte plaster.
const plaster=document.createElement('canvas');plaster.width=plaster.height=512;const pc=plaster.getContext('2d'),pixels=pc.createImageData(512,512);
for(let i=0;i<pixels.data.length;i+=4){const n=140+random()*35;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;}pc.putImageData(pixels,0,0);
const bump=new THREE.CanvasTexture(plaster);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(26,26);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:'#bca18b',roughness:.91,bumpMap:bump,bumpScale:.025}));floor.rotation.x=-Math.PI/2;floor.position.y=-.37;floor.receiveShadow=true;scene.add(floor);
scene.add(new THREE.HemisphereLight('#fff4de','#7c6659',.5));
const key=new THREE.DirectionalLight('#ffebce',2.4);key.position.set(-4,9,-3);key.castShadow=true;key.shadow.mapSize.set(4096,4096);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:30});key.shadow.normalBias=.025;key.shadow.bias=-.00012;key.shadow.radius=4;scene.add(key);
const fill=new THREE.DirectionalLight('#a4ccff',.7);fill.position.set(5,6,-6);scene.add(fill);
const rim=new THREE.DirectionalLight('#fff1d5',1.1);rim.position.set(-3,4,8);scene.add(rim);
const board=new THREE.Group();scene.add(board);
function mesh(geo,mat,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const frame=new THREE.MeshPhysicalMaterial({color:'#161719',metalness:.55,roughness:.28,clearcoat:.5});mesh(new THREE.BoxGeometry(8.42,.4,8.42),frame,board,0,-.13,0);
mesh(new THREE.BoxGeometry(8.16,.035,8.16),new THREE.MeshStandardMaterial({color:'#080f18',metalness:.55,roughness:.22}),board,0,.083,0);
const atlas=new THREE.TextureLoader().load('./assets/celestial-board.png',()=>{document.body.dataset.texture='ready';},undefined,()=>{document.body.dataset.texture='error';});atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const tileMaterial=new THREE.MeshPhysicalMaterial({map:atlas,color:'#ffffff',roughness:.2,metalness:.12,clearcoat:1,clearcoatRoughness:.1,emissive:'#ffffff',emissiveMap:atlas,emissiveIntensity:.34});
for(let r=0;r<8;r++)for(let c=0;c<8;c++){const geo=new THREE.PlaneGeometry(.989,.989),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(c+uv.getX(i))/8,1-(r+1-uv.getY(i))/8);const t=mesh(geo,tileMaterial,board,c-3.5,.107,r-3.5);t.rotation.x=-Math.PI/2;t.castShadow=false;}
function radialTexture(inner,outer){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,inner);g.addColorStop(1,outer);ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const shadowMap=radialTexture('rgba(0,0,0,.55)','rgba(0,0,0,0)'),poolMap=radialTexture('rgba(255,255,255,.6)','rgba(255,255,255,0)');
function disk(parent,size,y,map,color,opacity,additive=false){const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map,color,transparent:true,opacity,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending}));m.rotation.x=-Math.PI/2;m.position.y=y;parent.add(m);return m;}
disk(scene,12,-.355,shadowMap,'#241810',.8);
for(let i=0;i<8;i++){const p=disk(scene,2.6,-.345,poolMap,'#ffc481',.28,true);p.position.set(i-3.5,-.345,4.6);p.scale.set(.6,1.35,1);const q=disk(scene,2.1,-.344,poolMap,'#ffddb1',.22,true);q.position.set(4.55,-.344,i-3.5);}
const pieces=[];
function lathe(profile,mat,parent){const curve=new THREE.SplineCurve(profile.map(([r,y])=>new THREE.Vector2(r,y)));return mesh(new THREE.LatheGeometry(curve.getPoints(profile.length*5),64),mat,parent);}
function sphere(r,mat,parent,x,y,z){return mesh(new THREE.SphereGeometry(r,32,24),mat,parent,x,y,z);}
function ring(r,t,y,mat,parent){const m=mesh(new THREE.TorusGeometry(r,t,10,64),mat,parent,0,y,0);m.rotation.x=Math.PI/2;return m;}
function shaft(parent,mat,h){lathe([[0,.17],[.30,.17],[.32,.21],[.30,.26],[.25,.29],[.22,.34],[.17,.43],[.125,h*.68],[.14,h*.79],[.20,h*.84],[.21,h*.89],[.17,h*.93],[.12,h],[0,h]],mat,parent);}
function horse(parent,mat,trim,white){
 const s=new THREE.Shape();s.moveTo(-.25,.42);s.bezierCurveTo(-.28,.65,-.12,.93,-.03,1.12);s.bezierCurveTo(-.18,1.07,-.29,1.03,-.37,1.03);s.lineTo(-.47,1.12);s.quadraticCurveTo(-.46,1.2,-.36,1.27);s.lineTo(-.19,1.42);s.lineTo(-.15,1.62);s.quadraticCurveTo(-.1,1.67,-.04,1.48);s.bezierCurveTo(.16,1.50,.26,1.28,.28,1.05);s.bezierCurveTo(.31,.78,.20,.64,.28,.42);s.closePath();
 const geo=new THREE.ExtrudeGeometry(s,{depth:.22,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.055,bevelThickness:.055,curveSegments:24});geo.translate(0,0,-.11);mesh(geo,mat,parent);
 const mane=new THREE.CatmullRomCurve3([new THREE.Vector3(.03,1.48,0),new THREE.Vector3(.19,1.32,0),new THREE.Vector3(.23,1.04,0),new THREE.Vector3(.20,.7,0)]);mesh(new THREE.TubeGeometry(mane,32,.036,8,false),trim,parent);
 for(const z of [-.17,.17]){sphere(.031,white?blackTrim:whiteTrim,parent,-.18,1.31,z);sphere(.018,trim,parent,-.40,1.15,z*.8);}ring(.22,.03,.46,trim,parent);
}
const baseProfile=[[0,0],[.29,0],[.35,.025],[.365,.07],[.36,.12],[.325,.16],[.29,.185],[.26,.21],[0,.21]];
function piece(type,col,row,white){
 const p=new THREE.Group();p.position.set(col-3.5,.12,row-3.5);board.add(p);const mat=white?ivory:obsidian,trim=white?whiteTrim:blackTrim,glow=white?whiteGlow:blackGlow;
 disk(p,.94,.002,shadowMap,'#000000',.65);disk(p,1.06,.006,poolMap,white?'#ffb733':'#057bff',white?.24:.13,true);lathe(baseProfile,mat,p);ring(.337,.012,.063,glow,p);ring(.31,.014,.16,trim,p);
 const gems=new THREE.BufferGeometry(),positions=[];for(let i=0;i<30;i++){const a=random()*Math.PI*2,r=.22+random()*.1;positions.push(Math.cos(a)*r,.08+random()*.095,Math.sin(a)*r);}gems.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));p.add(new THREE.Points(gems,new THREE.PointsMaterial({color:white?'#ffe4a2':'#309eff',size:.024,sizeAttenuation:true,transparent:true,opacity:.9})));
 if(type==='pawn'){shaft(p,mat,.65);ring(.185,.02,.56,trim,p);sphere(.19,mat,p,0,.8,0);}
 else if(type==='knight'){lathe([[0,.2],[.24,.2],[.245,.26],[.21,.32],[.19,.42],[0,.44]],mat,p);horse(p,mat,trim,white);}
 else if(type==='rook'){lathe([[0,.2],[.27,.2],[.265,.27],[.21,.33],[.17,.55],[.18,.93],[.25,1.02],[.26,1.11],[.20,1.13],[.19,1.04],[0,1.04]],mat,p);ring(.255,.025,1.04,trim,p);for(let i=0;i<6;i++){const a=i*Math.PI/3,b=mesh(new THREE.BoxGeometry(.13,.16,.13),mat,p,Math.cos(a)*.22,1.17,Math.sin(a)*.22);b.rotation.y=-a;}}
 else if(type==='bishop'){shaft(p,mat,.94);ring(.19,.025,.88,trim,p);lathe([[0,.97],[.13,.98],[.19,1.08],[.17,1.22],[.10,1.37],[.035,1.42],[0,1.43]],mat,p);sphere(.055,mat,p,0,1.48,0);const cut=mesh(new THREE.BoxGeometry(.022,.18,.3),trim,p,-.017,1.28,0);cut.rotation.z=-.38;}
 else if(type==='queen'){shaft(p,mat,1.15);ring(.22,.025,1.02,trim,p);lathe([[0,1.12],[.15,1.12],[.25,1.24],[.25,1.29],[.19,1.29],[.13,1.18],[0,1.18]],mat,p);for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh(new THREE.CylinderGeometry(.028,.045,.17,12),mat,p,Math.cos(a)*.22,1.35,Math.sin(a)*.22);sphere(.041,mat,p,Math.cos(a)*.22,1.45,Math.sin(a)*.22);}sphere(.095,mat,p,0,1.39,0);}
 else{shaft(p,mat,1.27);ring(.22,.025,1.13,trim,p);sphere(.13,mat,p,0,1.37,0);mesh(new THREE.BoxGeometry(.09,.35,.09),mat,p,0,1.61,0);mesh(new THREE.BoxGeometry(.27,.09,.09),mat,p,0,1.63,0);}
 if(white)p.rotation.y=Math.PI;pieces.push(p);return p;
}
const order=['rook','knight','bishop','queen','king','bishop','knight','rook'];for(let c=0;c<8;c++){piece(order[c],c,0,false);piece('pawn',c,1,false);piece('pawn',c,6,true);piece(order[c],c,7,true);}
for(const[x,z,color,intensity]of[[-2.7,3.1,'#ffb53e',7],[2.7,3.1,'#ffb53e',7],[-2.7,-3.1,'#168cff',4],[2.7,-3.1,'#168cff',4],[0,0,'#ffc66d',3]]){const light=new THREE.PointLight(color,intensity,4,2);light.position.set(x,.65,z);scene.add(light);}
// Linear HDR scene -> highlight bloom -> filmic display transform.
const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true}),blurA=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false}),blurB=blurA.clone();
const post=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));post.add(quad);
const vertexShader='varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}';
const blurMaterial=new THREE.ShaderMaterial({uniforms:{source:{value:target.texture},stepUV:{value:new THREE.Vector2()},threshold:{value:1}},vertexShader,fragmentShader:`varying vec2 uv0;uniform sampler2D source;uniform vec2 stepUV;uniform float threshold;vec3 tap(vec2 uv){vec3 c=texture2D(source,uv).rgb;return c*max(0.,1.-threshold/max(max(c.r,c.g),max(c.b,.0001)));}void main(){vec3 c=tap(uv0)*.227027;c+=(tap(uv0+stepUV*1.384615)+tap(uv0-stepUV*1.384615))*.316216;c+=(tap(uv0+stepUV*3.230769)+tap(uv0-stepUV*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`,depthTest:false,depthWrite:false});
const finalMaterial=new THREE.ShaderMaterial({uniforms:{source:{value:target.texture},bloom:{value:blurB.texture}},vertexShader,fragmentShader:`varying vec2 uv0;uniform sampler2D source;uniform sampler2D bloom;void main(){vec3 c=texture2D(source,uv0).rgb+texture2D(bloom,uv0).rgb*.2;c*=.95;c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);c=mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));float v=1.-.15*pow(length((uv0-.5)*1.2),2.);gl_FragColor=vec4(c*v,1.);}`,depthTest:false,depthWrite:false});
let azimuth=-.63,elevation=.86,distance=19.4,goalDistance=19.4,drag=null;const lookAt=new THREE.Vector3(0,.1,0),pointers=new Map();let pinch=null;
function fit(){return innerWidth/innerHeight<1?1/(innerWidth/innerHeight)**.62:1;}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);const s=renderer.getDrawingBufferSize(new THREE.Vector2());target.setSize(s.x,s.y);blurA.setSize(Math.max(1,Math.round(s.x/3)),Math.max(1,Math.round(s.y/3)));blurB.setSize(blurA.width,blurA.height);}resize();addEventListener('resize',resize);
function reset(){azimuth=-.63;elevation=.86;goalDistance=19.4;lookAt.set(0,.1,0);}document.querySelector('#reset').addEventListener('click',reset);canvas.addEventListener('dblclick',reset);canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={id:e.pointerId,x:e.clientX,y:e.clientY,pan:e.button===2||e.shiftKey};canvas.classList.add('dragging');if(pointers.size===2){const[a,b]=[...pointers.values()];pinch={length:Math.hypot(a.x-b.x,a.y-b.y),distance:goalDistance};}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()];goalDistance=THREE.MathUtils.clamp(pinch.distance*pinch.length/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),11,30);return;}if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(drag.pan){const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),scale=distance*.0008;lookAt.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);}else{azimuth-=dx*.005;elevation=THREE.MathUtils.clamp(elevation+dy*.004,.25,1.45);}drag.x=e.clientX;drag.y=e.clientY;});
function release(e){pointers.delete(e.pointerId);pinch=null;drag=null;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}for(const name of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,release);
canvas.addEventListener('wheel',e=>{e.preventDefault();goalDistance=THREE.MathUtils.clamp(goalDistance+e.deltaY*(e.deltaMode===1?.12:.012),11,30);},{passive:false});
addEventListener('keydown',e=>{if(e.target.matches('button,input'))return;if(e.key.toLowerCase()==='r')reset();if(e.key==='ArrowLeft')azimuth-=.08;if(e.key==='ArrowRight')azimuth+=.08;if(e.key==='ArrowUp')elevation=Math.min(1.45,elevation+.06);if(e.key==='ArrowDown')elevation=Math.max(.25,elevation-.06);if(e.key==='+'||e.key==='=')goalDistance=Math.max(11,goalDistance-1);if(e.key==='-')goalDistance=Math.min(30,goalDistance+1);});
let last=performance.now(),frames=0;renderer.setAnimationLoop(time=>{const dt=Math.min((time-last)/1000,.1);last=time;distance+=(goalDistance-distance)*(1-Math.exp(-10*dt));const r=distance*fit();camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*r,Math.sin(elevation)*r,Math.cos(azimuth)*Math.cos(elevation)*r).add(lookAt);camera.lookAt(lookAt);renderer.setRenderTarget(target);renderer.render(scene,camera);quad.material=blurMaterial;blurMaterial.uniforms.source.value=target.texture;blurMaterial.uniforms.threshold.value=1.4;blurMaterial.uniforms.stepUV.value.set(1.5/blurA.width,0);renderer.setRenderTarget(blurA);renderer.render(post,postCamera);blurMaterial.uniforms.source.value=blurA.texture;blurMaterial.uniforms.threshold.value=0;blurMaterial.uniforms.stepUV.value.set(0,1.5/blurA.height);renderer.setRenderTarget(blurB);renderer.render(post,postCamera);quad.material=finalMaterial;renderer.setRenderTarget(null);renderer.render(post,postCamera);if(++frames===3){document.body.classList.add('ready');document.body.dataset.pieces=pieces.length;}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#status').textContent='3D 화면 연결이 중단되었습니다. 새로고침해 주세요.';document.body.classList.remove('ready');});

