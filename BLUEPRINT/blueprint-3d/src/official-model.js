import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './style.css';

document.body.dataset.theme = 'blue';
const root = document.querySelector('#app');
root.innerHTML = `
  <header class="topbar"><div class="brand"><span>＋</span> STACKCHAN <small>OFFICIAL MODEL VIEWER</small></div><div class="status"><i></i> M5STACK ASSET / <b>GLB</b></div></header>
  <main class="layout">
    <aside class="left panel"><div class="eyebrow">ARCHIVE / 004</div><h1>StackChan<br><em>Official Model</em></h1><p>Complete rendered model published with M5Stack’s official StackChan application.</p><div class="rule"></div><label>SOURCE FILE</label><div class="readout"><span>ASSET<strong>stack_chan_model.glb</strong></span><span>FORMAT<strong>GLB / glTF 2.0</strong></span><span>MODE<strong>ASSEMBLED</strong></span></div><a class="source" href="/">OPEN STL ASSEMBLY ↗</a></aside>
    <section class="stage"><div class="stage-head"><span><i></i> TECHNICAL VIEW / <b>OFFICIAL STACKCHAN MODEL</b></span><span id="loadStatus">LOADING OFFICIAL MODEL</span></div><div id="viewport"><div class="loading"><strong id="loadingText">LOADING STACK_CHAN_MODEL.GLB</strong><span><i id="progress"></i></span></div><div class="hint">DRAG TO ORBIT <b>/</b> SCROLL TO ZOOM</div></div><div class="stage-foot"><span>ORIGINAL MATERIALS</span><span>ORBIT CONTROLS / ACTIVE</span><span>REV / OFFICIAL</span></div></section>
    <aside class="right panel"><div class="rule first"></div><label>MODEL INSPECTION</label><h2>STACKCHAN</h2><p class="muted" id="assemblyMode">M5STACK APP ASSET / FULL ASSEMBLY</p><div class="stats"><span>MESHES<strong id="meshCount">—</strong></span><span>TRIANGLES<strong id="triangleCount">—</strong></span><span>STATUS<strong id="modelStatus">LOADING</strong></span></div><div class="rule"></div><label>CAMERA VIEW</label><div class="view-grid" id="cameraViews">${['FRONT','REAR','LEFT','RIGHT','TOP','ISO'].map((view,index) => `<button class="view ${view === 'ISO' ? 'active' : ''}" data-view="${view}">${String(index + 1).padStart(2, '0')} / ${view}</button>`).join('')}</div><div class="rule"></div><label>VIEW CONTROL</label><div class="control"><span>DISPLAY MODE</span><button class="action" id="wireframe">WIREFRAME / OFF</button></div><button class="action" id="explode">EXPLODED VIEW / OFF</button><button class="action secondary" id="reset">RESET REAR ISO VIEW <b>↺</b></button></aside>
  </main>`;

const viewport = document.querySelector('#viewport');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.001, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
scene.add(new THREE.HemisphereLight(0xbdd7cf, 0x111714, 2.1));
const key = new THREE.DirectionalLight(0xffffff, 3);
key.position.set(180, 220, 160);
scene.add(key);

let model;
let exploded = false;
let explosionProgress = 0;
const explodedParts = [];
const cameraViews = { FRONT: [0, 0.06, -1], REAR: [0, 0.06, 1], LEFT: [-1, 0.06, 0], RIGHT: [1, 0.06, 0], TOP: [0, 1, 0], ISO: [1, 0.7, 1] };

function setCameraView(name = 'ISO') {
  if (!model) return;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const distance = size.length() * (name === 'ISO' ? 1.35 : 1.15);
  const direction = new THREE.Vector3(...cameraViews[name]).normalize();
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.near = Math.max(0.001, size.length() / 100);
  camera.far = size.length() * 20;
  camera.updateProjectionMatrix();
  controls.update();
  document.querySelectorAll('#cameraViews .view').forEach(button => button.classList.toggle('active', button.dataset.view === name));
}

function resize() {
  const rect = viewport.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}

function prepareExplodedView() {
  const parts = [
    { name: '_00_stackchan450_1_8', direction: new THREE.Vector3(0, 0, 1), distance: 0.36 },
    { name: '_00_stackchan450_1_3', direction: new THREE.Vector3(0, 0, 1), distance: 0.20 },
    { name: '_00_stackchan450_2', direction: new THREE.Vector3(0, -1, 0), distance: 0.24 },
    { name: '_00_stackchan450_2_3', direction: new THREE.Vector3(0, -1, 0), distance: 0.40 },
    { name: '_00_stackchan450_3', direction: new THREE.Vector3(0, -1, 0), distance: 0.72 }
  ];
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).length();

  parts.forEach(({ name, direction, distance }) => {
    const part = model.getObjectByName(name);
    if (!part?.parent) return;
    const worldStart = part.getWorldPosition(new THREE.Vector3());
    const worldEnd = worldStart.clone().addScaledVector(direction, size * distance);
    const localStart = part.parent.worldToLocal(worldStart.clone());
    const localEnd = part.parent.worldToLocal(worldEnd);
    explodedParts.push({ part, position: part.position.clone(), offset: localEnd.sub(localStart) });
  });
}

function toggleExplodedView() {
  if (!explodedParts.length) return;
  exploded = !exploded;
  document.querySelector('#explode').textContent = `EXPLODED VIEW / ${exploded ? 'ON' : 'OFF'}`;
  document.querySelector('#assemblyMode').textContent = exploded ? 'M5STACK APP ASSET / EXPLODED VIEW' : 'M5STACK APP ASSET / FULL ASSEMBLY';
}

function updateExplodedView() {
  explosionProgress = THREE.MathUtils.damp(explosionProgress, exploded ? 1 : 0, 5.5, 1 / 60);
  explodedParts.forEach(({ part, position, offset }) => part.position.copy(position).addScaledVector(offset, explosionProgress));
}

window.addEventListener('resize', resize);
resize();

new GLTFLoader().load('/models/stackchan/stack_chan_model.glb', gltf => {
  model = gltf.scene;
  model.rotation.x = -Math.PI / 2;
  scene.add(model);

  let meshes = 0;
  let triangles = 0;
  model.traverse(child => {
    if (!child.isMesh) return;
    meshes++;
    triangles += child.geometry.index ? child.geometry.index.count / 3 : child.geometry.attributes.position.count / 3;
  });
  document.querySelector('#meshCount').textContent = meshes;
  document.querySelector('#triangleCount').textContent = Math.round(triangles).toLocaleString();
  document.querySelector('#modelStatus').textContent = 'READY';
  document.querySelector('#progress').style.width = '100%';
  document.querySelector('#loadingText').textContent = 'OFFICIAL MODEL READY';
  document.querySelector('#loadStatus').textContent = 'OFFICIAL MODEL READY / GLB';
  document.querySelector('.loading').classList.add('done');
  prepareExplodedView();
  setCameraView('ISO');
}, event => {
  if (event.total) document.querySelector('#progress').style.width = `${Math.round(event.loaded / event.total * 100)}%`;
}, () => {
  document.querySelector('#loadingText').textContent = 'OFFICIAL MODEL UNAVAILABLE';
  document.querySelector('#loadStatus').textContent = 'LOAD FAILED';
  document.querySelector('#modelStatus').textContent = 'FAILED';
});

document.querySelector('#wireframe').onclick = event => {
  if (!model) return;
  const enabled = event.currentTarget.dataset.enabled !== 'true';
  model.traverse(child => {
    if (!child.isMesh) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.wireframe = enabled;
  });
  event.currentTarget.dataset.enabled = enabled;
  event.currentTarget.textContent = `WIREFRAME / ${enabled ? 'ON' : 'OFF'}`;
};
document.querySelectorAll('#cameraViews .view').forEach(button => button.onclick = () => setCameraView(button.dataset.view));
document.querySelector('#explode').onclick = toggleExplodedView;
document.querySelector('#reset').onclick = () => setCameraView('ISO');

function animate() {
  requestAnimationFrame(animate);
  updateExplodedView();
  controls.update();
  renderer.render(scene, camera);
}
animate();
