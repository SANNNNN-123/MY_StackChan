import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './style.css';

const root = document.querySelector('#app');
document.body.dataset.theme = 'blue';

const cameraViewButtons = ['ISO', 'FRONT', 'SIDE', 'REAR', 'TOP', 'BOTTOM', 'BLUEPRINT'];

root.innerHTML = `
  <header class="topbar">
    <div class="brand"><span>＋</span> STACKCHAN <small>3D BLUEPRINT ARCHIVE</small></div>
    <div class="status"><i></i> SYSTEM READY <b>/</b> <button id="theme">THEME / BLUEPRINT</button></div>
  </header>
  <main class="layout">
    <aside class="left panel">
      <div class="eyebrow">ARCHIVE / 002</div>
      <h1>StackChan<br><em>Official Model</em></h1>
      <p>Complete rendered model published with M5Stack's official StackChan application.</p>
      <div class="rule"></div>
      <label>CAMERA VIEWS</label>
      <div class="view-grid" id="cameraViews">${cameraViewButtons.map((view, index) =>
        `<button class="view ${view === 'ISO' ? 'active' : ''}" data-view="${view}">${String(index).padStart(2, '0')} / ${view}</button>`
      ).join('')}</div>
      <div class="rule"></div>
      <label>MODEL PARTS</label>
      <div id="parts" class="parts"></div>
    </aside>
    <section class="stage">
      <div class="stage-head">
        <span><i></i> TECHNICAL VIEW / <b id="viewName">ISOMETRIC</b></span>
        <span id="loadStatus">LOADING OFFICIAL MODEL</span>
      </div>
      <div id="viewport">
        <img id="blueprintImage" src="/Model_Size.png" alt="StackChan dimensional blueprint" />
        <div class="loading">
          <strong id="loadingText">LOADING STACK_CHAN_MODEL.GLB</strong>
          <span><i id="progress"></i></span>
        </div>
        <div class="hint">DRAG TO ORBIT <b>/</b> SCROLL TO ZOOM</div>
      </div>
      <div class="stage-foot">
        <span>ORIGINAL MATERIALS</span>
        <span>ORBIT CONTROLS / ACTIVE</span>
        <span>REV / OFFICIAL</span>
      </div>
    </section>
    <aside class="right panel">
      <div class="rule first"></div>
      <label>ACTIVE ASSEMBLY</label>
      <h2>STACKCHAN</h2>
      <p class="muted" id="assemblyMode">M5STACK APP ASSET / FULL ASSEMBLY</p>
      <div class="stats">
        <span>WIDTH<strong>54.0 mm</strong></span>
        <span>HEIGHT<strong>70.5 mm</strong></span>
        <span>DEPTH<strong>61.5 mm</strong></span>
      </div>
      <div class="rule"></div>
      <label>INSPECTION</label>
      <div class="readout">
        <span>MESHES<strong id="meshCount">—</strong></span>
        <span>TRIANGLES<strong id="triangleCount">—</strong></span>
        <span>MODEL SOURCE<strong>OFFICIAL GLB</strong></span>
        <span>STATUS<strong id="modelStatus">LOADING</strong></span>
      </div>
      <div class="rule"></div>
      <label>VIEW CONTROL</label>
      <div class="view-controls">
        <label class="control-row" for="wireframe"><span>WIREFRAME</span><input type="checkbox" id="wireframe" /></label>
        <label class="control-row" for="explode"><span>EXPLODED VIEW</span><input type="checkbox" id="explode" /></label>
        <button class="control-row" type="button" id="reset">RESET CAMERA</button>
        <a class="control-row github-link" href="https://github.com/m5stack/M5_Hardware/tree/master/Products/K151_StackChan/Structures" target="_blank" rel="noreferrer">
          <svg class="github-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          GITHUB
        </a>
      </div>
    </aside>
  </main>`;

const partCatalog = [
  { label: 'Screen bezel', name: '_00_stackchan450_1_8' },
  { label: 'Screen panel', name: '_00_stackchan450_1_6' },
  { label: 'CoreS3 module', name: '_00_stackchan450_1_3' },
  { label: 'M5 shell body', name: '_00_stackchan450_1_1' },
  { label: 'M5 shell front', name: '_00_stackchan450_1_1_groupD' },
  { label: 'Pink connector', name: '_00_stackchan450_1_2' },
  { label: 'Side stub', name: '_00_stackchan450_1_4' },
  { label: 'Connector pins', name: '_00_stackchan450_1_3_pins' },
  { label: 'Main body', name: '_00_stackchan450_2' },
  { label: 'Servo section', name: '_00_stackchan450_2_3' },
  { label: 'Base', name: '_00_stackchan450_3' },
];

const viewport = document.querySelector('#viewport');
const partsEl = document.querySelector('#parts');
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
const partRows = new Map();

const cameraViews = {
  ISO: [1, 0.7, -1],
  FRONT: [0, 0.06, 1],
  SIDE: [-1, 0.06, 0],
  REAR: [0, 0.06, -1],
  TOP: [0, 1, 0],
  BOTTOM: [0, -1, 0],
};

let activeView = 'ISO';
const fitSphere = new THREE.Sphere();
// Match ~2 OrbitControls wheel zoom-in steps (default zoomSpeed, pow(0.95, n)).
const ISO_ZOOM_IN = Math.pow(0.95, 8);

function fitDistance(box, name) {
  const rect = viewport.getBoundingClientRect();
  const aspect = Math.max(0.35, rect.width / Math.max(rect.height, 1));

  box.getBoundingSphere(fitSphere);
  const radius = fitSphere.radius;

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  // sin() keeps the full sphere inside the frustum; tan() was pulling the camera too close.
  const distV = radius / Math.sin(vFov / 2);
  const distH = radius / Math.sin(hFov / 2);

  const basePadding = name === 'ISO' ? 1.45 : 1.3;

  // Short laptop viewports need extra pull-back so the model is not clipped.
  const heightFactor = THREE.MathUtils.clamp(950 / Math.max(rect.height, 380), 1, 1.45);

  // The 3-column layout often leaves a narrow central stage on smaller screens.
  const aspectFactor = aspect < 1.35 ? 1 + (1.35 - aspect) * 0.3 : 1;

  return Math.max(distV, distH) * basePadding * heightFactor * aspectFactor;
}

function setCameraView(name = 'ISO') {
  activeView = name;

  if (name === 'BLUEPRINT') {
    viewport.classList.add('blueprint-mode');
    renderer.domElement.style.display = 'none';
    document.querySelector('#viewName').textContent = 'MODEL SIZE / 2D';
    document.querySelector('#loadStatus').textContent = 'REFERENCE DRAWING / PNG';
    document.querySelectorAll('#cameraViews .view').forEach(button =>
      button.classList.toggle('active', button.dataset.view === name)
    );
    return;
  }

  viewport.classList.remove('blueprint-mode');
  renderer.domElement.style.display = 'block';
  if (!model) return;

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const distance = fitDistance(box, name) * (name === 'ISO' ? ISO_ZOOM_IN : 1);
  const direction = new THREE.Vector3(...cameraViews[name]).normalize();

  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.near = Math.max(0.001, size.length() / 100);
  camera.far = size.length() * 20;
  camera.updateProjectionMatrix();
  controls.update();

  document.querySelector('#viewName').textContent = name === 'ISO' ? 'ISOMETRIC' : `${name} ELEVATION`;
  document.querySelector('#loadStatus').textContent = 'OFFICIAL MODEL READY / GLB';
  document.querySelectorAll('#cameraViews .view').forEach(button =>
    button.classList.toggle('active', button.dataset.view === name)
  );
}

function resize() {
  const rect = viewport.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / Math.max(rect.height, 1);
  camera.updateProjectionMatrix();
  if (model && activeView !== 'BLUEPRINT') setCameraView(activeView);
}

new ResizeObserver(() => resize()).observe(viewport);

function detachPinkPins(source) {
  if (!source?.isMesh || !source.geometry.index) return null;

  const geometry = source.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const center = new THREE.Vector3();
  const pinIndices = [];
  const keepIndices = [];

  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    v0.fromBufferAttribute(position, a).applyMatrix4(source.matrixWorld);
    v1.fromBufferAttribute(position, b).applyMatrix4(source.matrixWorld);
    v2.fromBufferAttribute(position, c).applyMatrix4(source.matrixWorld);
    center.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    (center.x < -15 ? pinIndices : keepIndices).push(a, b, c);
  }

  if (!pinIndices.length || !keepIndices.length) return null;

  const pinGeometry = geometry.clone();
  pinGeometry.setIndex(pinIndices);
  pinGeometry.computeVertexNormals();
  const pins = new THREE.Mesh(pinGeometry, source.material);
  pins.name = '_00_stackchan450_1_3_pins';
  pins.position.copy(source.position);
  pins.quaternion.copy(source.quaternion);
  pins.scale.copy(source.scale);
  source.parent.add(pins);

  geometry.setIndex(keepIndices);
  geometry.computeVertexNormals();
  return pins;
}

function detachGroupDSlice(source) {
  if (!source?.isMesh || !source.geometry.index) return null;

  const box = new THREE.Box3().setFromObject(source);
  const depth = 15.5;
  const zCut = box.max.z - depth;
  const geometry = source.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const center = new THREE.Vector3();
  const sliceIndices = [];
  const keepIndices = [];

  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    v0.fromBufferAttribute(position, a).applyMatrix4(source.matrixWorld);
    v1.fromBufferAttribute(position, b).applyMatrix4(source.matrixWorld);
    v2.fromBufferAttribute(position, c).applyMatrix4(source.matrixWorld);
    center.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    (center.z >= zCut ? sliceIndices : keepIndices).push(a, b, c);
  }

  if (!sliceIndices.length || !keepIndices.length) return null;

  const sliceGeometry = geometry.clone();
  sliceGeometry.setIndex(sliceIndices);
  sliceGeometry.computeVertexNormals();
  const slice = new THREE.Mesh(sliceGeometry, source.material);
  slice.name = '_00_stackchan450_1_1_groupD';
  slice.position.copy(source.position);
  slice.quaternion.copy(source.quaternion);
  slice.scale.copy(source.scale);
  source.parent.add(slice);

  geometry.setIndex(keepIndices);
  geometry.computeVertexNormals();
  return slice;
}

function prepareExplodedView() {
  model.updateMatrixWorld(true);
  const pinPart = detachPinkPins(model.getObjectByName('_00_stackchan450_1_3'));
  const groupD = detachGroupDSlice(model.getObjectByName('_00_stackchan450_1_1'));

  const parts = [
    { name: '_00_stackchan450_1_8', direction: new THREE.Vector3(0, 0, 1), distance: 0.48 },
    { name: '_00_stackchan450_1_6', direction: new THREE.Vector3(0, 0, 1), distance: 0.40 },
    { name: '_00_stackchan450_1_3', direction: new THREE.Vector3(0, 0, 1), distance: 0.36 },
    { part: groupD, direction: new THREE.Vector3(0, 0, 1), distance: 0.18 },
    { name: '_00_stackchan450_1_2', direction: new THREE.Vector3(-1, 0, 0), distance: 0.32 },
    { name: '_00_stackchan450_1_4', direction: new THREE.Vector3(-1, 0, 0), distance: 0.32 },
    { part: pinPart, direction: new THREE.Vector3(-1, 0, 0), distance: 0.32 },
    { name: '_00_stackchan450_2', direction: new THREE.Vector3(0, -1, 0), distance: 0.24 },
    { name: '_00_stackchan450_2_3', direction: new THREE.Vector3(0, -1, 0), distance: 0.40 },
    { name: '_00_stackchan450_3', direction: new THREE.Vector3(0, -1, 0), distance: 0.72 },
  ];

  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).length();

  parts.forEach(({ name, part: givenPart, direction, distance }) => {
    const part = givenPart || model.getObjectByName(name);
    if (!part?.parent) return;
    const worldStart = part.getWorldPosition(new THREE.Vector3());
    const worldEnd = worldStart.clone().addScaledVector(direction, size * distance);
    const localStart = part.parent.worldToLocal(worldStart.clone());
    const localEnd = part.parent.worldToLocal(worldEnd);
    explodedParts.push({ part, position: part.position.clone(), offset: localEnd.sub(localStart) });
  });
}

function buildPartsList() {
  partCatalog.forEach(({ label, name }, index) => {
    const part = model.getObjectByName(name);
    const row = document.createElement('button');
    row.className = 'part-row';
    if (!part) {
      row.classList.add('off');
      row.innerHTML = `<span class="part-index">${String(index + 1).padStart(2, '0')}</span><b>${label}</b><i>UNAVAILABLE</i>`;
      partsEl.append(row);
      return;
    }

    row.innerHTML = `<span class="part-index">${String(index + 1).padStart(2, '0')}</span><b>${label}</b><i>VISIBLE</i>`;
    row.onclick = () => {
      part.visible = !part.visible;
      row.classList.toggle('off', !part.visible);
      row.querySelector('i').textContent = part.visible ? 'VISIBLE' : 'HIDDEN';
    };
    partRows.set(name, row);
    partsEl.append(row);
  });
}

function applyExplodedState(on, { immediate = false } = {}) {
  exploded = on;
  if (immediate) {
    explosionProgress = on ? 1 : 0;
    explodedParts.forEach(({ part, position, offset }) =>
      part.position.copy(position).addScaledVector(offset, explosionProgress)
    );
  }
  document.querySelector('#explode').checked = exploded;
  document.querySelector('#assemblyMode').textContent = exploded
    ? 'M5STACK APP ASSET / EXPLODED VIEW'
    : 'M5STACK APP ASSET / FULL ASSEMBLY';
}

function applyDefaultView() {
  applyExplodedState(true, { immediate: true });
  setCameraView('ISO');
}

document.querySelector('#wireframe').onchange = event => {
  if (!model) {
    event.currentTarget.checked = false;
    return;
  }
  const enabled = event.currentTarget.checked;
  model.traverse(child => {
    if (!child.isMesh) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      material.wireframe = enabled;
    }
  });
};

document.querySelector('#explode').onchange = event => {
  if (!explodedParts.length) {
    event.currentTarget.checked = exploded;
    return;
  }
  applyExplodedState(event.currentTarget.checked);
};

document.querySelector('#reset').onclick = () => applyDefaultView();

function updateExplodedView() {
  explosionProgress = THREE.MathUtils.damp(explosionProgress, exploded ? 1 : 0, 5.5, 1 / 60);
  explodedParts.forEach(({ part, position, offset }) =>
    part.position.copy(position).addScaledVector(offset, explosionProgress)
  );
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
    triangles += child.geometry.index
      ? child.geometry.index.count / 3
      : child.geometry.attributes.position.count / 3;
  });

  document.querySelector('#meshCount').textContent = meshes;
  document.querySelector('#triangleCount').textContent = Math.round(triangles).toLocaleString();
  document.querySelector('#modelStatus').textContent = 'READY';
  document.querySelector('#progress').style.width = '100%';
  document.querySelector('#loadingText').textContent = 'OFFICIAL MODEL READY';
  document.querySelector('#loadStatus').textContent = 'OFFICIAL MODEL READY / GLB';
  document.querySelector('.loading').classList.add('done');

  prepareExplodedView();
  buildPartsList();
  requestAnimationFrame(() => requestAnimationFrame(() => applyDefaultView()));
}, event => {
  if (event.total) {
    const pct = Math.round(event.loaded / event.total * 100);
    document.querySelector('#progress').style.width = `${pct}%`;
    document.querySelector('#loadingText').textContent = `LOADING STACK_CHAN_MODEL.GLB / ${String(pct).padStart(2, '0')}%`;
    document.querySelector('#loadStatus').textContent = `LOADING OFFICIAL MODEL / ${String(pct).padStart(2, '0')}%`;
  }
}, () => {
  document.querySelector('#loadingText').textContent = 'OFFICIAL MODEL UNAVAILABLE';
  document.querySelector('#loadStatus').textContent = 'LOAD FAILED';
  document.querySelector('#modelStatus').textContent = 'FAILED';
});

document.querySelectorAll('#cameraViews .view').forEach(button =>
  button.onclick = () => setCameraView(button.dataset.view)
);

document.querySelector('#theme').onclick = () => {
  const blue = document.body.dataset.theme === 'blue';
  document.body.dataset.theme = blue ? 'dark' : 'blue';
  document.querySelector('#theme').textContent = `THEME / ${blue ? 'DARK' : 'BLUEPRINT'}`;
};

function animate() {
  requestAnimationFrame(animate);
  updateExplodedView();
  controls.update();
  renderer.render(scene, camera);
}

animate();
