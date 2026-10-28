import * as THREE from './three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe6e2db);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.querySelector('#world').appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const wall = new THREE.MeshStandardMaterial({color:0xeee9df, roughness:0.9});
const stone = new THREE.MeshStandardMaterial({color:0xbcb6ab, roughness:0.7});
const bronze = new THREE.MeshStandardMaterial({color:0xb48a48,metalness:0.75,roughness:0.28});
const charcoal = new THREE.MeshStandardMaterial({color:0x344244,metalness:0.4,roughness:0.35});
function add(geometry,material,x,y,z){
 const m=new THREE.Mesh(geometry,material); m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;
}
add(new THREE.BoxGeometry(18,0.3,14),stone,0,-0.18,0);
add(new THREE.BoxGeometry(18,0.03,14),wall,0,-0.015,0);
add(new THREE.BoxGeometry(18,6,0.2),wall,0,3,-7);
add(new THREE.BoxGeometry(0.2,6,14),wall,-9,3,0);
// Recessed baseboards and individual gallery spotlights add depth to the room.
add(new THREE.BoxGeometry(17.8,0.12,0.05),stone,0,0.1,-6.87);
add(new THREE.BoxGeometry(0.05,0.12,13.8),stone,-8.87,0.1,0);
const joints=new THREE.LineBasicMaterial({color:0xd3cdc1});
for(let x=-9;x<=9;x+=3)scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,0.004,-7),new THREE.Vector3(x,0.004,7)]),joints));
for(let z=-7;z<=7;z+=2)scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-9,0.004,z),new THREE.Vector3(9,0.004,z)]),joints));
for(const x of [-6,0,6]){
 add(new THREE.BoxGeometry(0.08,0.06,11),new THREE.MeshBasicMaterial({color:0xfff3d5}),x,5.8,-0.5);
 const light=new THREE.PointLight(0xffeed8,30,15,2);light.position.set(x,5,-1);scene.add(light);
}
[0x6c8580,0xb87554,0xc6ad78].forEach((color,i)=>{
 const x=(i-1)*5.2;
 add(new THREE.BoxGeometry(3.4,3.4,0.12),charcoal,x,3.2,-6.8);
 add(new THREE.BoxGeometry(3.15,3.15,0.08),wall,x,3.2,-6.7);
 add(new THREE.CircleGeometry(1.15,64),new THREE.MeshStandardMaterial({color}),x,3.4,-6.64);
 add(new THREE.PlaneGeometry(2.7,0.6),charcoal,x,2.4,-6.62);
 add(new THREE.BoxGeometry(0.6,0.07,0.03),bronze,x,1.2,-6.8);
 const spot = new THREE.SpotLight(0xfff1d6, 45, 12, Math.PI / 7, 0.7, 2);
 spot.position.set(x,5.6,-3.5);
 spot.target.position.set(x,3.2,-6.7);
 scene.add(spot, spot.target);
 const fixture=add(new THREE.CylinderGeometry(0.11,0.11,0.32,16),charcoal,x,5.6,-3.5);
 fixture.rotation.x=Math.PI/4;
});
for(const x of [-4.2,3.5])add(new THREE.CylinderGeometry(1.1,1.15,0.65,64),stone,x,0.325,0.3);
const sculpture=add(new THREE.TorusKnotGeometry(0.75,0.22,160,24),bronze,-4.2,1.9,0.3);sculpture.rotation.set(0.3,0.5,0);
const ring=add(new THREE.TorusGeometry(0.95,0.25,32,96),charcoal,3.5,1.8,0.3);ring.rotation.set(0.2,-0.4,0.2);
add(new THREE.CylinderGeometry(0.08,0.08,0.5,24),bronze,3.5,0.85,0.3);
scene.add(new THREE.HemisphereLight(0xffffff,0xa49b8c,2.5));
const light = new THREE.DirectionalLight(0xfff3df,3);light.position.set(3,12,8);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-14,right:14,top:14,bottom:-14});light.shadow.normalBias=0.03;scene.add(light);

let angle = 0.38, elevation = 0.36, distance = 27, targetDistance = 27;
let drag = null;
const canvas = renderer.domElement;


const target = new THREE.Vector3(0, 2, -1);
const cameraRight = new THREE.Vector3();
const cameraUp = new THREE.Vector3();

function updateCamera() {
  camera.position.set(
    Math.sin(angle) * Math.cos(elevation) * distance,
    Math.sin(elevation) * distance,
    Math.cos(angle) * Math.cos(elevation) * distance
  );
  camera.position.add(target);
  camera.lookAt(target);
  camera.updateMatrixWorld();
}
updateCamera();
canvas.addEventListener('pointerdown', event => {
  if ((event.button !== 0 && event.button !== 2) || drag) return;
  event.preventDefault();
  drag = { id: event.pointerId, mode: event.button === 2 ? 'pan' : 'rotate', x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (drag.mode === 'pan') {
    // Match pointer movement in screen space at the current zoom level.
    const unitsPerPixel = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / canvas.clientHeight;
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
    cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);
    target.addScaledVector(cameraRight, -dx * unitsPerPixel);
    target.addScaledVector(cameraUp, dy * unitsPerPixel);
  } else {
    angle -= dx * 0.006;
    elevation = THREE.MathUtils.clamp(elevation + dy * 0.004, 0.08, 1.25);
  }
  drag.x = event.clientX;
  drag.y = event.clientY;
});
function stopDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  drag = null;
  canvas.classList.remove('dragging');
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}
canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);
canvas.addEventListener('lostpointercapture', stopDrag);
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
  targetDistance = THREE.MathUtils.clamp(targetDistance + delta * 0.006, 12, 40);
}, { passive: false });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});
let lastTime = performance.now();
renderer.setAnimationLoop(time => {
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  distance += (targetDistance - distance) * (1 - Math.exp(-12 * dt));
  updateCamera();
  renderer.render(scene, camera);
});
