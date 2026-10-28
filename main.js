import * as THREE from './three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.querySelector('#world').appendChild(renderer.domElement);

// Bake an enclosing gallery into a background material, independent of future foreground objects.
const room = new THREE.Scene();
room.background = new THREE.Color(0xe9e5df);
const resources = [];
function surface(w, h, d, color, x, y, z) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshBasicMaterial({ color });
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  room.add(object);
  resources.push(geometry, material);
  return object;
}
surface(48, .2, 56, 0xb6afa4, 0, -.1, 0);
surface(48, .2, 56, 0xe9e7e2, 0, 12, 0);
surface(48, 12, .2, 0xdedbd4, 0, 6, -28);
surface(48, 12, .2, 0xe9e6e0, 0, 6, 28);
surface(.2, 12, 56, 0xd1cec7, -24, 6, 0);
surface(.2, 12, 56, 0xe1ded8, 24, 6, 0);
for (const x of [-16, -8, 0, 8, 16]) {
  surface(.035, .012, 56, 0xa8a298, x, .02, 0);
  surface(2.2, .08, 42, 0xffffff, x, 11.8, 0);
}
for (let z = -24; z <= 24; z += 8) surface(48, .012, .035, 0xa8a298, 0, .02, z);
// Distant wall recesses read as architecture and soft exhibition silhouettes.
for (const x of [-17, -8.5, 0, 8.5, 17]) {
  surface(5.4, 5.8, .12, 0xc6c1b9, x, 5.4, -27.8);
  surface(4.6, 5, .14, [0x9da8a2, 0xb6a591, 0xc8bca5, 0x9da4a5, 0xb0a89a][Math.round((x+17)/8.5)], x, 5.4, -27.7);
}
for (const z of [-16, 0, 16]) {
  surface(.5, 12, 1.2, 0xc9c5bd, -23.7, 6, z);
  surface(.5, 12, 1.2, 0xd5d1c9, 23.7, 6, z);
}
const capture = new THREE.WebGLCubeRenderTarget(512, { type: THREE.HalfFloatType });
const cubeCamera = new THREE.CubeCamera(.1, 100, capture);
cubeCamera.position.set(0, 5, 5);
cubeCamera.update(renderer, room);
const pmrem = new THREE.PMREMGenerator(renderer);
const environment = pmrem.fromCubemap(capture.texture);
scene.background = environment.texture;
scene.environment = environment.texture;
scene.backgroundBlurriness = .07;
scene.backgroundIntensity = 1.1;
capture.dispose();
pmrem.dispose();
resources.forEach(resource => resource.dispose());
room.clear();

// Empty panoramic chassis: only shell, glass, fasteners and feet. No components.
const chassis = new THREE.Group();
scene.add(chassis);
const metal = new THREE.MeshStandardMaterial({color:0x68727e,metalness:.85,roughness:.23});
const panel = new THREE.MeshStandardMaterial({color:0xd4d7d9,metalness:.55,roughness:.38,side:THREE.DoubleSide});
const dark = new THREE.MeshStandardMaterial({color:0x262a2e,metalness:.45,roughness:.45});
const glass = new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.015,transmission:1,thickness:.012,ior:1.45,transparent:true,opacity:.16,side:THREE.DoubleSide,envMapIntensity:.2,depthWrite:false});
function caseBox(w,h,d,x,y,z,material=metal){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);chassis.add(mesh);return mesh;
}
const W=2.6,H=4.2,D=3.6;
caseBox(W,.14,D,0,-H/2,0,panel);
caseBox(.08,H,D,-W/2,0,0,panel);
caseBox(W,H,.08,0,0,D/2,panel);
// The narrow glass face is opposite its original position; match the open corner.
for(const y of [-H/2+.08,H/2]){
  for(const z of [-D/2,D/2])caseBox(W,.085,.075,0,y,z);
  for(const x of [-W/2,W/2])caseBox(.075,.085,D,x,y,0);
}
for(const [x,z] of [[-W/2,-D/2],[-W/2,D/2],[W/2,D/2]])caseBox(.075,H,.075,x,0,z);
caseBox(.025,H-.16,D-.12,W/2,0,0,glass);
caseBox(W-.1,H-.16,.025,0,0,-D/2,glass);
caseBox(W-.1,.025,D-.12,0,H/2,0,glass);
// Soft blue-gray glass edges make all three transparent panes legible.
const edgeMaterial=new THREE.LineBasicMaterial({color:0x9caeb3,transparent:true,opacity:.38});
for(const [w,h,d,x,y,z] of [[.025,H-.16,D-.12,W/2,0,0],[W-.1,H-.16,.025,0,0,-D/2],[W-.1,.025,D-.12,0,H/2,0]]){
 const geometry=new THREE.BoxGeometry(w,h,d);
 const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),edgeMaterial);
 edge.position.set(x,y,z);chassis.add(edge);geometry.dispose();
}
for(const x of [-1.03,1.03])for(const z of [-1.46,1.46]){
 caseBox(.32,.18,.44,x,-H/2-.16,z,dark);
 caseBox(.32,.035,.44,x,-H/2-.065,z,metal);
}
// Exterior panel screws, not interior hardware.
for(const y of [-1.91,1.91])for(const x of [-1.15,1.15]){
 const screw=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.018,16),dark);
 screw.rotation.x=Math.PI/2;screw.position.set(x,y,D/2+.045);chassis.add(screw);
}
const power=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.012,24),dark);
power.rotation.x=Math.PI/2;power.position.set(-.96,-1.94,D/2+.045);chassis.add(power);
scene.add(new THREE.HemisphereLight(0xffffff,0x858a91,2));
const keyLight=new THREE.DirectionalLight(0xffffff,3.5);keyLight.position.set(4,7,5);scene.add(keyLight);
const rimLight=new THREE.DirectionalLight(0xdbeaff,2);rimLight.position.set(-4,3,-3);scene.add(rimLight);

let angle = Math.PI-.82, elevation = .26, distance = 10.5, targetDistance = 10.5, drag = null;
const target=new THREE.Vector3();
const cameraRight=new THREE.Vector3(),cameraUp=new THREE.Vector3();
const canvas = renderer.domElement;
function updateCamera() {
  camera.position.set(Math.sin(angle)*Math.cos(elevation)*distance,Math.sin(elevation)*distance,Math.cos(angle)*Math.cos(elevation)*distance).add(target);
  camera.lookAt(target);
  camera.fov = innerWidth<600 ? 52 : 42;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
canvas.addEventListener('pointerdown', event => {
  if (drag || (event.button !== 0 && event.button !== 2)) return;
  event.preventDefault();
  drag = { id: event.pointerId, mode: event.button === 2 ? 'pan' : 'rotate', x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (drag.mode === 'pan') {
    const unitsPerPixel=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/canvas.clientHeight;
    cameraRight.setFromMatrixColumn(camera.matrixWorld,0);
    cameraUp.setFromMatrixColumn(camera.matrixWorld,1);
    target.addScaledVector(cameraRight,-dx*unitsPerPixel).addScaledVector(cameraUp,dy*unitsPerPixel);
  } else {
    angle -= dx * .004;
    elevation = THREE.MathUtils.clamp(elevation + dy * .003, -.7, .7);
  }
  drag.x = event.clientX; drag.y = event.clientY;
});
function stopDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  drag = null;
  canvas.classList.remove('dragging');
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, stopDrag);
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
  targetDistance = THREE.MathUtils.clamp(targetDistance + delta * .008, 6.5, 19);
}, { passive: false });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});
let lastTime = performance.now();
renderer.setAnimationLoop(time => {
  const dt = Math.min((time - lastTime) / 1000, .1); lastTime = time;
  distance += (targetDistance - distance) * (1 - Math.exp(-12 * dt));
  updateCamera();
  renderer.render(scene, camera);
});
