import * as THREE from './three.module.js';

const root=document.querySelector('#world');
const scene=new THREE.Scene();scene.background=new THREE.Color('#dcebec');scene.fog=new THREE.Fog('#dcebec',24,65);
const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.1,100);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;root.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xf8fff5,0x668e99,2.6));const sun=new THREE.DirectionalLight(0xffefd4,4);sun.position.set(-5,12,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12});scene.add(sun);
const island=new THREE.Group();scene.add(island);
const mat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:1,flatShading:true});
function mesh(geo,c,x,y,z,parent=island){const m=new THREE.Mesh(geo,mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function box(c,x,y,z,w,h,d,parent){return mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,parent)}
function cylinder(c,x,y,z,rt,rb,h,n=9){return mesh(new THREE.CylinderGeometry(rt,rb,h,n),c,x,y,z)}
cylinder('#778b72',0,-.65,0,4.85,3.7,1.65,11);cylinder('#abc092',0,.12,0,4.86,4.86,.35,11);cylinder('#d5d0ad',0,-1.35,0,3.8,2.9,.5,11);
const sea=mesh(new THREE.CylinderGeometry(9.8,9.8,.15,80),'#accfd0',0,-1.95,0,scene);sea.receiveShadow=true;
const ground=mesh(new THREE.PlaneGeometry(200,200),'#dcebec',0,-2.1,0,scene);ground.rotation.x=-Math.PI/2;
// A small terracotta-roofed home, built from actual 3D geometry.
box('#ece3c9',-.7,.95,.2,1.8,1.4,1.45);const roof=mesh(new THREE.ConeGeometry(1.55,1,4),'#b76e4b',-.7,2.1,.2);roof.rotation.y=Math.PI/4;roof.scale.z=.86;
box('#714f3c',-.7,.65,.94,.35,.85,.06);box('#779e9e',-1.23,1.13,.94,.36,.4,.07);box('#779e9e',-.15,1.13,.94,.36,.4,.07);box('#e4d7bb',-.05,2.23,.02,.24,.9,.26);
for(let i=0;i<8;i++)box('#cbbf9e',-.7+i*.21,.34,1.2+i*.3,.56,.08,.24);
function tree(x,z,s=1){cylinder('#8d7960',x,.6*s,z,.09*s,.14*s,.9*s);for(let i=0;i<3;i++)cylinder(['#65866a','#769976','#88a680'][i],x,(1.05+i*.34)*s,z,0,(.68-i*.12)*s,.95*s,7)}
for(const [x,z,s] of [[-3,-1,1.2],[-2.5,-2.2,1],[-1.1,-2.6,1.35],[.2,-2,1],[2,-2.1,1.3],[3,-1.4,.9],[-3,1,1],[2.6,1, .8]])tree(x,z,s);
// Lighthouse and a timber pier provide landmarks at every angle.
cylinder('#ece9d5',2,.95,-.2,.34,.5,1.65,12);cylinder('#b86b4c',2,1.55,-.2,.37,.4,.28,12);cylinder('#e7d5a0',2,1.98,-.2,.3,.3,.45,8);cylinder('#586e67',2,2.3,-.2,0,.52,.32,8);cylinder('#687e70',2,1.8,-.2,.5,.5,.08,12);
for(let i=0;i<11;i++)box('#a88c6a',1.7,-.15,2.4+i*.22,1,.12,.17);
for(const z of [2.5,3.4,4.4])for(const x of [1.3,2.1])cylinder('#816d53',x,-.6,z,.055,.055,1.2,6);
const boat=box('#ece2c2',3,-1.57,4.8,.55,.22,1.15);boat.rotation.y=-.5;
for(let i=0;i<34;i++){const a=i*2.399,r=3.3+(i%4)*.3;const x=Math.cos(a)*r,z=Math.sin(a)*r;const rock=mesh(new THREE.DodecahedronGeometry(.15+(i%3)*.08),'#8b9b8a',x,.32,z);rock.scale.y=.6}
for(let i=0;i<20;i++){const a=i*1.8;const ripple=mesh(new THREE.BoxGeometry(.3+(i%3)*.15,.012,.025),'#d0e4df',Math.cos(a)*(5.5+i%4),-1.85,Math.sin(a)*(5.6+i%3),scene);ripple.rotation.y=a}
const targets=[new THREE.Vector3(-.7,2.7,.2),new THREE.Vector3(2,2.8,-.2),new THREE.Vector3(1.7,.4,3.8)];
const pins=targets.map((p,i)=>{const m=mesh(new THREE.SphereGeometry(.115,16,12),'#fff6db',p.x,p.y,p.z);m.userData.place=i;return m});
let angle=.65,elevation=.67,distance=19,desiredDistance=19,auto=!matchMedia('(prefers-reduced-motion: reduce)').matches,drag=null,moved=false;
const look=new THREE.Vector3(0,.15,0);const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const stories=[['언덕 위의 집','햇살이 가장 먼저 닿는 작은 집. 테라코타 지붕 아래서 바닷바람을 듣고, 잠시 머물러 보세요.'],['빛을 지키는 곳','섬 끝의 등대는 돌아올 길을 알려줍니다. 나무 사이로 걸어가면 수평선이 한눈에 들어옵니다.'],['바다로 가는 길','나무 부두 끝에서 작은 배가 기다립니다. 물결을 바라보며 다음 여행을 상상해 보세요.']];
function syncMotion(){document.querySelector('#motion').textContent=auto?'자동 회전 끄기 Ⅱ':'자동 회전 켜기 ▷';document.querySelector('#motion').setAttribute('aria-pressed',String(auto))}
function show(i){auto=false;syncMotion();document.querySelector('#story').hidden=false;document.querySelector('#story-number').textContent=`ISLAND NOTES / 0${i+1}`;document.querySelector('#story-title').textContent=stories[i][0];document.querySelector('#story-body').textContent=stories[i][1]}
document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>show(Number(b.dataset.place)));
document.querySelector('#close').onclick=()=>document.querySelector('#story').hidden=true;
document.querySelector('#motion').onclick=()=>{auto=!auto;syncMotion()};syncMotion();
document.querySelector('#reset').onclick=()=>{angle=.65;elevation=.67;desiredDistance=19;document.querySelector('#story').hidden=true};
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};moved=false;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;angle-=dx*.006;elevation=THREE.MathUtils.clamp(elevation+dy*.004,.23,1.2);drag={x:e.clientX,y:e.clientY};auto=false;syncMotion()}pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(pointer,camera);canvas.style.cursor=ray.intersectObjects(pins).length?'pointer':drag?'grabbing':'grab'});
canvas.addEventListener('pointerup',()=>{drag=null;if(!moved){ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pins)[0];if(hit)show(hit.object.userData.place)}});
canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();desiredDistance=THREE.MathUtils.clamp(desiredDistance+e.deltaY*.012,10,29)},{passive:false});
addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('#story').hidden=true;if(e.key==='ArrowLeft')angle-=.1;if(e.key==='ArrowRight')angle+=.1;if(e.key==='+')desiredDistance=Math.max(10,desiredDistance-1);if(e.key==='-')desiredDistance=Math.min(29,desiredDistance+1)});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
document.querySelector('#status').remove();const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(auto)angle+=dt*.045;distance+=(desiredDistance-distance)*.09;camera.position.set(Math.sin(angle)*Math.cos(elevation)*distance,Math.sin(elevation)*distance,Math.cos(angle)*Math.cos(elevation)*distance);camera.lookAt(look);renderer.render(scene,camera)}animate();
