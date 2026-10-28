import * as THREE from './three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.querySelector('#world').appendChild(renderer.domElement);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
);
scene.add(cube);
scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(-3, 6, 4);
scene.add(light);

let angle = 0.65, elevation = 0.5, distance = 8, targetDistance = 8;
let drag = null;
const canvas = renderer.domElement;
const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function updateCamera() {
  camera.position.set(
    Math.sin(angle) * Math.cos(elevation) * distance,
    Math.sin(elevation) * distance,
    Math.cos(angle) * Math.cos(elevation) * distance
  );
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
}
updateCamera();
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || drag) return;
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  ray.setFromCamera(pointer, camera);
  if (ray.intersectObject(cube).length) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  angle -= (event.clientX - drag.x) * 0.006;
  elevation = THREE.MathUtils.clamp(elevation + (event.clientY - drag.y) * 0.004, -1.3, 1.3);
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
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
  targetDistance = THREE.MathUtils.clamp(targetDistance + delta * 0.006, 4.5, 18);
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
