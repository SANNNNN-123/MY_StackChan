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
  {
    label: 'Pink connector',
    names: [
      '_00_stackchan450_1_2',
      '_00_stackchan450_1_3_pins',
    ],
  },
  { label: 'Side stub', name: '_00_stackchan450_1_4' },
  {
    label: 'Front internals',
    names: [
      '_00_stackchan450_1_5',
      '_00_stackchan450_1_7',
      '_00_stackchan450_1_9',
    ],
  },
  { label: 'Internal frame', names: [
    '_00_stackchan450_1_10',
    '_00_stackchan450_1_11',
    '_00_stackchan450_1_12',
    '_00_stackchan450_1_12_rail',
    '_00_stackchan450_1_13',
  ] },
  {
    label: 'Light guide bars',
    names: [
      '_00_stackchan450_1_14',
      '_00_stackchan450_1_14_round',
    ],
  },
  { label: 'Side bearing', name: '_00_stackchan450_1_15' },
  { label: 'Main body', name: '_00_stackchan450_2' },
  { label: 'Black panel', name: '_00_stackchan450_2_1' },
  { label: 'Panel screws', name: '_00_stackchan450_2_7_panel_screws' },
  { label: 'Side connector', name: '_00_stackchan450_2_11' },
  { label: 'Left screw', name: '_00_stackchan450_2_2_left_screw' },
  {
    label: '7-pin connector',
    names: [
      '_00_stackchan450_2_14',
      '_00_stackchan450_2_1_header',
    ],
  },
  { label: 'Right screw', name: '_00_stackchan450_2_7_screw' },
  { label: 'Servo section', name: '_00_stackchan450_2_3' },
  { label: 'Base', name: '_00_stackchan450_3' },
  { label: 'Base disc', name: '_00_stackchan450_3_3' },
  { label: 'USB-C port', name: '_00_stackchan450_3_5' },
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

function detachFrameRail(source) {
  if (!source?.isMesh || !source.geometry.index) return null;

  const geometry = source.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const center = new THREE.Vector3();
  const railIndices = [];
  const keepIndices = [];

  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    v0.fromBufferAttribute(position, a).applyMatrix4(source.matrixWorld);
    v1.fromBufferAttribute(position, b).applyMatrix4(source.matrixWorld);
    v2.fromBufferAttribute(position, c).applyMatrix4(source.matrixWorld);
    center.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    (center.x > 18 && center.y <= 22 ? railIndices : keepIndices).push(a, b, c);
  }

  if (!railIndices.length || !keepIndices.length) return null;

  const railGeometry = geometry.clone();
  railGeometry.setIndex(railIndices);
  railGeometry.computeVertexNormals();
  const rail = new THREE.Mesh(railGeometry, source.material);
  rail.name = '_00_stackchan450_1_12_rail';
  rail.position.copy(source.position);
  rail.quaternion.copy(source.quaternion);
  rail.scale.copy(source.scale);
  source.parent.add(rail);

  geometry.setIndex(keepIndices);
  geometry.computeVertexNormals();
  return rail;
}

function detachRoundLight(source) {
  if (!source?.isMesh || !source.geometry.index) return null;

  const geometry = source.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const center = new THREE.Vector3();
  const triCount = index.count / 3;
  const triCenters = [];

  for (let i = 0; i < triCount; i++) {
    const a = index.getX(i * 3);
    const b = index.getX(i * 3 + 1);
    const c = index.getX(i * 3 + 2);
    v0.fromBufferAttribute(position, a).applyMatrix4(source.matrixWorld);
    v1.fromBufferAttribute(position, b).applyMatrix4(source.matrixWorld);
    v2.fromBufferAttribute(position, c).applyMatrix4(source.matrixWorld);
    center.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    triCenters.push(center.clone());
  }

  const edgeMap = new Map();
  const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (let i = 0; i < triCount; i++) {
    const a = index.getX(i * 3);
    const b = index.getX(i * 3 + 1);
    const c = index.getX(i * 3 + 2);
    for (const [e1, e2] of [[a, b], [b, c], [c, a]]) {
      const k = edgeKey(e1, e2);
      if (!edgeMap.has(k)) edgeMap.set(k, []);
      edgeMap.get(k).push(i);
    }
  }

  const adj = Array.from({ length: triCount }, () => []);
  for (const tris of edgeMap.values()) {
    if (tris.length === 2) {
      adj[tris[0]].push(tris[1]);
      adj[tris[1]].push(tris[0]);
    }
  }

  const visited = new Uint8Array(triCount);
  const roundTriIndices = new Set();
  for (let start = 0; start < triCount; start++) {
    if (visited[start]) continue;
    const stack = [start];
    visited[start] = 1;
    const comp = [];
    while (stack.length) {
      const t = stack.pop();
      comp.push(t);
      for (const n of adj[t]) {
        if (!visited[n]) {
          visited[n] = 1;
          stack.push(n);
        }
      }
    }

    const box = new THREE.Box3();
    for (const t of comp) box.expandByPoint(triCenters[t]);
    const size = box.getSize(new THREE.Vector3());
    const cen = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const isRoundLight =
      maxDim <= 3 &&
      cen.x > 19 && cen.x < 25 &&
      cen.y > 21 && cen.y < 23.5 &&
      cen.z > -7 && cen.z < -3;

    if (isRoundLight) comp.forEach(t => roundTriIndices.add(t));
  }

  if (!roundTriIndices.size || roundTriIndices.size === triCount) return null;

  const roundIndices = [];
  const keepIndices = [];
  for (let i = 0; i < triCount; i++) {
    const a = index.getX(i * 3);
    const b = index.getX(i * 3 + 1);
    const c = index.getX(i * 3 + 2);
    (roundTriIndices.has(i) ? roundIndices : keepIndices).push(a, b, c);
  }

  if (!roundIndices.length || !keepIndices.length) return null;

  const roundGeometry = geometry.clone();
  roundGeometry.setIndex(roundIndices);
  roundGeometry.computeVertexNormals();
  const round = new THREE.Mesh(roundGeometry, source.material);
  round.name = '_00_stackchan450_1_14_round';
  round.position.copy(source.position);
  round.quaternion.copy(source.quaternion);
  round.scale.copy(source.scale);
  source.parent.add(round);

  geometry.setIndex(keepIndices);
  geometry.computeVertexNormals();
  return round;
}

function detachSideConnector(source) {
  if (!source?.parent?.parent) return null;
  source.parent.parent.attach(source);
  return source;
}

function detachBlackPanel(source) {
  // Remaining metal liner after 7-pin header cut — reads black (metalness 1, no env map)
  if (!source?.parent?.parent) return null;
  source.parent.parent.attach(source);
  return source;
}

function detachBaseDisc(source) {
  // White round plate on top of the base (`_00_stackchan450_3_3`)
  if (!source?.parent?.parent) return null;
  source.parent.parent.attach(source);
  return source;
}

function detachUsbPort(source) {
  // Rear USB-C shell on the base (`_00_stackchan450_3_5`) — metal, reads black
  if (!source?.parent?.parent) return null;
  source.parent.parent.attach(source);
  return source;
}

function detachSevenPinPins(source, sideConnector) {
  if (!source?.isMesh || !source.geometry.index || !source.parent?.parent) return null;

  const geometry = source.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const center = new THREE.Vector3();
  const pinIndices = [];
  const postIndices = [];

  // Main 7-pin row sits near z ≈ -8; white H-posts sit by the side connector (x ≈ -15).
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    v0.fromBufferAttribute(position, a).applyMatrix4(source.matrixWorld);
    v1.fromBufferAttribute(position, b).applyMatrix4(source.matrixWorld);
    v2.fromBufferAttribute(position, c).applyMatrix4(source.matrixWorld);
    center.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    const isSidePost = center.x < -10 || center.z <= -12;
    (isSidePost ? postIndices : pinIndices).push(a, b, c);
  }

  if (!pinIndices.length || !postIndices.length) {
    source.parent.parent.attach(source);
    return { pins: source, posts: null };
  }

  const postsGeometry = geometry.clone();
  postsGeometry.setIndex(postIndices);
  postsGeometry.computeVertexNormals();
  const posts = new THREE.Mesh(postsGeometry, source.material);
  posts.name = '_00_stackchan450_2_14_posts';
  posts.position.copy(source.position);
  posts.quaternion.copy(source.quaternion);
  posts.scale.copy(source.scale);
  source.parent.add(posts);

  geometry.setIndex(pinIndices);
  geometry.computeVertexNormals();

  source.parent.parent.attach(source);
  // Keep world pose, but parent under the side connector so they toggle/explode as one part.
  if (sideConnector) sideConnector.attach(posts);
  else source.parent.parent.attach(posts);

  return { pins: source, posts };
}

function detachSevenPinHousing(source) {
  if (!source?.isMesh || !source.geometry.index) return null;

  const geometry = source.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const center = new THREE.Vector3();
  const headerIndices = [];
  const keepIndices = [];

  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    v0.fromBufferAttribute(position, a).applyMatrix4(source.matrixWorld);
    v1.fromBufferAttribute(position, b).applyMatrix4(source.matrixWorld);
    v2.fromBufferAttribute(position, c).applyMatrix4(source.matrixWorld);
    center.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    // Dark metal shroud around the 7-pin row on the cavity shelf
    const isHeader =
      center.x > -6 && center.x < 6 &&
      center.y > -32 && center.y < -22 &&
      center.z > -12 && center.z < -4;
    (isHeader ? headerIndices : keepIndices).push(a, b, c);
  }

  if (!headerIndices.length || !keepIndices.length) return null;

  const headerGeometry = geometry.clone();
  headerGeometry.setIndex(headerIndices);
  headerGeometry.computeVertexNormals();
  const header = new THREE.Mesh(headerGeometry, source.material);
  header.name = '_00_stackchan450_2_1_header';
  header.position.copy(source.position);
  header.quaternion.copy(source.quaternion);
  header.scale.copy(source.scale);
  source.parent.add(header);
  if (source.parent.parent) source.parent.parent.attach(header);

  geometry.setIndex(keepIndices);
  geometry.computeVertexNormals();
  return header;
}

function detachRightScrew(source) {
  if (!source?.isMesh || !source.geometry.index) return null;

  const geometry = source.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const center = new THREE.Vector3();
  const screwIndices = [];
  const keepIndices = [];

  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    v0.fromBufferAttribute(position, a).applyMatrix4(source.matrixWorld);
    v1.fromBufferAttribute(position, b).applyMatrix4(source.matrixWorld);
    v2.fromBufferAttribute(position, c).applyMatrix4(source.matrixWorld);
    center.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    // Hex-socket screw on the right/rear inner wall (meshed into 2_7 accents)
    const isScrew =
      center.x > 8 && center.x < 16 &&
      Math.abs(center.y) < 3 &&
      center.z > -41 && center.z < -34;
    (isScrew ? screwIndices : keepIndices).push(a, b, c);
  }

  if (!screwIndices.length || !keepIndices.length) return null;

  const screwGeometry = geometry.clone();
  screwGeometry.setIndex(screwIndices);
  screwGeometry.computeVertexNormals();
  const screw = new THREE.Mesh(screwGeometry, source.material);
  screw.name = '_00_stackchan450_2_7_screw';
  screw.position.copy(source.position);
  screw.quaternion.copy(source.quaternion);
  screw.scale.copy(source.scale);
  source.parent.add(screw);
  if (source.parent.parent) source.parent.parent.attach(screw);

  geometry.setIndex(keepIndices);
  geometry.computeVertexNormals();
  return screw;
}

function detachPanelScrews(source) {
  if (!source?.isMesh || !source.geometry.index) return null;

  const geometry = source.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const center = new THREE.Vector3();
  const screwIndices = [];
  const keepIndices = [];

  // Pair of hex screws in the black-panel mounting tabs (x ≈ ±11, bottom rear)
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    v0.fromBufferAttribute(position, a).applyMatrix4(source.matrixWorld);
    v1.fromBufferAttribute(position, b).applyMatrix4(source.matrixWorld);
    v2.fromBufferAttribute(position, c).applyMatrix4(source.matrixWorld);
    center.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    const isPanelScrew =
      Math.abs(Math.abs(center.x) - 11) < 2.5 &&
      center.y > -31 && center.y < -25 &&
      center.z > -41 && center.z < -35;
    (isPanelScrew ? screwIndices : keepIndices).push(a, b, c);
  }

  if (!screwIndices.length || !keepIndices.length) return null;

  const screwGeometry = geometry.clone();
  screwGeometry.setIndex(screwIndices);
  screwGeometry.computeVertexNormals();
  const screws = new THREE.Mesh(screwGeometry, source.material);
  screws.name = '_00_stackchan450_2_7_panel_screws';
  screws.position.copy(source.position);
  screws.quaternion.copy(source.quaternion);
  screws.scale.copy(source.scale);
  source.parent.add(screws);
  if (source.parent.parent) source.parent.parent.attach(screws);

  geometry.setIndex(keepIndices);
  geometry.computeVertexNormals();
  return screws;
}

function detachLeftScrew(source) {
  if (!source?.isMesh || !source.geometry.index) return null;

  const geometry = source.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const triCount = index.count / 3;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();

  // Tight tip region — middle clean cut that looked good on the screw itself
  const inTipRegion = c =>
    c.x < -18.5 && c.x > -24 &&
    Math.abs(c.y) < 3.2 &&
    Math.abs(c.z + 17.7) < 3.2;

  const parent = new Int32Array(triCount).fill(-1);
  const find = i => (parent[i] < 0 ? i : (parent[i] = find(parent[i])));
  const unite = (a, b) => {
    a = find(a);
    b = find(b);
    if (a !== b) parent[b] = a;
  };
  const vertexToTris = new Map();
  const add = (v, t) => {
    if (!vertexToTris.has(v)) vertexToTris.set(v, []);
    vertexToTris.get(v).push(t);
  };
  for (let t = 0; t < triCount; t++) {
    const i = t * 3;
    add(index.getX(i), t);
    add(index.getX(i + 1), t);
    add(index.getX(i + 2), t);
  }
  for (const tris of vertexToTris.values()) {
    for (let i = 1; i < tris.length; i++) unite(tris[0], tris[i]);
  }

  const centers = new Array(triCount);
  for (let t = 0; t < triCount; t++) {
    const i = t * 3;
    v0.fromBufferAttribute(position, index.getX(i)).applyMatrix4(source.matrixWorld);
    v1.fromBufferAttribute(position, index.getX(i + 1)).applyMatrix4(source.matrixWorld);
    v2.fromBufferAttribute(position, index.getX(i + 2)).applyMatrix4(source.matrixWorld);
    centers[t] = v0.clone().add(v1).add(v2).multiplyScalar(1 / 3);
  }

  const groups = new Map();
  for (let t = 0; t < triCount; t++) {
    const root = find(t);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(t);
  }

  const screwTri = new Uint8Array(triCount);
  const discardTri = new Uint8Array(triCount);

  for (const tris of groups.values()) {
    const inRegion = tris.filter(t => inTipRegion(centers[t]));
    if (inRegion.length < 8) continue;

    const box = new THREE.Box3();
    for (const t of tris) {
      const i = t * 3;
      box.expandByPoint(new THREE.Vector3().fromBufferAttribute(position, index.getX(i)).applyMatrix4(source.matrixWorld));
      box.expandByPoint(new THREE.Vector3().fromBufferAttribute(position, index.getX(i + 1)).applyMatrix4(source.matrixWorld));
      box.expandByPoint(new THREE.Vector3().fromBufferAttribute(position, index.getX(i + 2)).applyMatrix4(source.matrixWorld));
    }
    const size = box.getSize(new THREE.Vector3());
    const cen = box.getCenter(new THREE.Vector3());
    const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
    const maxDim = dims[2];
    if (cen.x > -18 || Math.abs(cen.y) > 4 || Math.abs(cen.z + 17.7) > 4) continue;
    if (maxDim > 8) continue;

    const isRoundFace = dims[0] < 0.2 && dims[1] > 1.5 && dims[2] > 1.5 && (dims[1] / dims[2]) > 0.7;
    const isOuterCap = dims[0] < 0.2 && cen.x < -23 && dims[2] < 5 && dims[1] > 1.5;
    const isSolid = dims[0] >= 0.15;
    if (!isRoundFace && !isOuterCap && !isSolid) continue;

    for (const t of tris) screwTri[t] = 1;
  }

  // Hole scraps that aren't part of the clean knurl: delete from shell (don't attach to screw)
  for (let t = 0; t < triCount; t++) {
    if (screwTri[t]) continue;
    if (!inTipRegion(centers[t])) continue;
    discardTri[t] = 1;
  }

  const screwIndices = [];
  const keepIndices = [];
  for (let t = 0; t < triCount; t++) {
    const i = t * 3;
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    if (screwTri[t]) screwIndices.push(a, b, c);
    else if (!discardTri[t]) keepIndices.push(a, b, c);
  }

  if (!screwIndices.length || !keepIndices.length) return null;

  const screwGeometry = geometry.clone();
  screwGeometry.setIndex(screwIndices);
  screwGeometry.computeVertexNormals();
  const screw = new THREE.Mesh(screwGeometry, source.material);
  screw.name = '_00_stackchan450_2_2_left_screw';
  screw.position.copy(source.position);
  screw.quaternion.copy(source.quaternion);
  screw.scale.copy(source.scale);
  source.parent.add(screw);
  if (source.parent.parent) source.parent.parent.attach(screw);

  geometry.setIndex(keepIndices);
  geometry.computeVertexNormals();
  return screw;
}

function prepareExplodedView() {
  model.updateMatrixWorld(true);
  const pinPart = detachPinkPins(model.getObjectByName('_00_stackchan450_1_3'));
  const groupD = detachGroupDSlice(model.getObjectByName('_00_stackchan450_1_1'));
  const frameRail = detachFrameRail(model.getObjectByName('_00_stackchan450_1_12'));
  const roundLight = detachRoundLight(model.getObjectByName('_00_stackchan450_1_14'));
  const sideConnector = detachSideConnector(model.getObjectByName('_00_stackchan450_2_11'));
  detachSevenPinPins(model.getObjectByName('_00_stackchan450_2_14'), sideConnector);
  const sevenPinHousing = detachSevenPinHousing(model.getObjectByName('_00_stackchan450_2_1'));
  const blackPanel = detachBlackPanel(model.getObjectByName('_00_stackchan450_2_1'));
  const baseDisc = detachBaseDisc(model.getObjectByName('_00_stackchan450_3_3'));
  const usbPort = detachUsbPort(model.getObjectByName('_00_stackchan450_3_5'));
  const leftScrew = detachLeftScrew(model.getObjectByName('_00_stackchan450_2_2'));
  const mesh27 = model.getObjectByName('_00_stackchan450_2_7');
  const rightScrew = detachRightScrew(mesh27);
  const panelScrews = detachPanelScrews(mesh27);

  const parts = [
    { name: '_00_stackchan450_1_8', direction: new THREE.Vector3(0, 0, 1), distance: 0.48 },
    { name: '_00_stackchan450_1_6', direction: new THREE.Vector3(0, 0, 1), distance: 0.40 },
    { name: '_00_stackchan450_1_3', direction: new THREE.Vector3(0, 0, 1), distance: 0.36 },
    { part: groupD, direction: new THREE.Vector3(0, 0, 1), distance: 0.18 },
    { part: frameRail, direction: new THREE.Vector3(0, 0, -1), distance: 0.48 },
    { name: '_00_stackchan450_1_11', direction: new THREE.Vector3(0, 0, -1), distance: 0.48 },
    { name: '_00_stackchan450_1_10', direction: new THREE.Vector3(0, 0, -1), distance: 0.48 },
    { name: '_00_stackchan450_1_12', direction: new THREE.Vector3(0, 0, -1), distance: 0.48 },
    { name: '_00_stackchan450_1_13', direction: new THREE.Vector3(0, 0, -1), distance: 0.48 },
    { name: '_00_stackchan450_1_14', direction: new THREE.Vector3(0, 0, -1), distance: 0.92 },
    { part: roundLight, direction: new THREE.Vector3(0, 0, -1), distance: 0.92 },
    { name: '_00_stackchan450_1_15', direction: new THREE.Vector3(0, 0, -1), distance: 0.48 },
    { name: '_00_stackchan450_1_2', direction: new THREE.Vector3(-1, 0, 0), distance: 0.32 },
    { name: '_00_stackchan450_1_4', direction: new THREE.Vector3(-1, 0, 0), distance: 0.32 },
    { part: pinPart, direction: new THREE.Vector3(-1, 0, 0), distance: 0.32 },
    { name: '_00_stackchan450_2', direction: new THREE.Vector3(0, -1, 0), distance: 0.24 },
    // −Z out of the shell; same Y as Main body so it stays level when the body drops
    {
      part: blackPanel,
      directions: [
        { direction: new THREE.Vector3(0, 0, -1), distance: 0.52 },
        { direction: new THREE.Vector3(0, -1, 0), distance: 0.24 },
      ],
    },
    // Further −Z than the panel so they pull out of the tabs; same Y as Main body
    {
      part: panelScrews,
      directions: [
        { direction: new THREE.Vector3(0, 0, -1), distance: 0.72 },
        { direction: new THREE.Vector3(0, -1, 0), distance: 0.24 },
      ],
    },
    { part: sideConnector, direction: new THREE.Vector3(0, -1, 0), distance: 0.40 },
    // −X out from left wall; same Y as Main body so it stays level with the seat
    {
      part: leftScrew,
      directions: [
        { direction: new THREE.Vector3(-1, 0, 0), distance: 0.40 },
        { direction: new THREE.Vector3(0, -1, 0), distance: 0.24 },
      ],
    },
    { name: '_00_stackchan450_2_14', direction: new THREE.Vector3(0, -1, 0), distance: 0.40 },
    { part: sevenPinHousing, direction: new THREE.Vector3(0, -1, 0), distance: 0.40 },
    // +X separate from hole; same Y as Main body so it doesn't float when body drops
    {
      part: rightScrew,
      directions: [
        { direction: new THREE.Vector3(1, 0, 0), distance: 0.40 },
        { direction: new THREE.Vector3(0, -1, 0), distance: 0.24 },
      ],
    },
    { name: '_00_stackchan450_2_3', direction: new THREE.Vector3(0, -1, 0), distance: 0.40 },
    // Between servo (−Y 0.40) and base (−Y 0.92)
    { part: baseDisc, direction: new THREE.Vector3(0, -1, 0), distance: 0.75 },
    { name: '_00_stackchan450_3', direction: new THREE.Vector3(0, -1, 0), distance: 0.92 },
    // USB-C out −Z from the base rear; same Y as Base so it stays level
    {
      part: usbPort,
      directions: [
        { direction: new THREE.Vector3(0, 0, -1), distance: 0.40 },
        { direction: new THREE.Vector3(0, -1, 0), distance: 0.92 },
      ],
    },
  ];

  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).length();

  parts.forEach(({ name, part: givenPart, direction, distance, directions }) => {
    const part = givenPart || model.getObjectByName(name);
    if (!part?.parent) return;
    const worldStart = part.getWorldPosition(new THREE.Vector3());
    const worldEnd = worldStart.clone();
    const steps = directions ?? [{ direction, distance }];
    steps.forEach(({ direction: dir, distance: dist }) => {
      worldEnd.addScaledVector(dir, size * dist);
    });
    const localStart = part.parent.worldToLocal(worldStart.clone());
    const localEnd = part.parent.worldToLocal(worldEnd);
    explodedParts.push({ part, position: part.position.clone(), offset: localEnd.sub(localStart) });
  });
}

function buildPartsList() {
  partCatalog.forEach(({ label, name, names }, index) => {
    const partNames = names ?? (name ? [name] : []);
    const parts = partNames.map(partName => model.getObjectByName(partName)).filter(Boolean);
    const row = document.createElement('button');
    row.className = 'part-row';
    if (!parts.length) {
      row.classList.add('off');
      row.innerHTML = `<span class="part-index">${String(index + 1).padStart(2, '0')}</span><b>${label}</b><i>UNAVAILABLE</i>`;
      partsEl.append(row);
      return;
    }

    const setVisible = visible => {
      parts.forEach(part => { part.visible = visible; });
      row.classList.toggle('off', !visible);
      row.querySelector('i').textContent = visible ? 'VISIBLE' : 'HIDDEN';
    };

    row.innerHTML = `<span class="part-index">${String(index + 1).padStart(2, '0')}</span><b>${label}</b><i>VISIBLE</i>`;
    row.onclick = () => setVisible(!parts.every(part => part.visible));
    partRows.set(partNames.join('+'), row);
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
