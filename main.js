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

let angle = 0, elevation = .03, zoom = 55, targetZoom = 55, drag = null;
let panX = 0, panY = 0;
const canvas = renderer.domElement;
function updateCamera() {
  // The viewpoint stays inside an infinite environment; no model edges can appear.
  camera.position.set(0, 0, 0);
  camera.lookAt(Math.sin(angle + panX) * Math.cos(elevation + panY), Math.sin(elevation + panY), -Math.cos(angle + panX) * Math.cos(elevation + panY));
  camera.fov = zoom;
  camera.updateProjectionMatrix();
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
    // An infinitely distant panorama has no positional parallax; shift its framing instead.
    const radiansPerPixel = THREE.MathUtils.degToRad(zoom) / canvas.clientHeight;
    panX -= dx * radiansPerPixel;
    panY = THREE.MathUtils.clamp(panY + dy * radiansPerPixel, -.7, .7);
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
  targetZoom = THREE.MathUtils.clamp(targetZoom + delta * .025, 30, 85);
}, { passive: false });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});
let lastTime = performance.now();
renderer.setAnimationLoop(time => {
  const dt = Math.min((time - lastTime) / 1000, .1); lastTime = time;
  zoom += (targetZoom - zoom) * (1 - Math.exp(-12 * dt));
  updateCamera();
  renderer.render(scene, camera);
});
