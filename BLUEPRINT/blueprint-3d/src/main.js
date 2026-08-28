import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import './style.css';

const root = document.querySelector('#app');
document.body.dataset.theme = 'blue';
root.innerHTML = `
  <header class="topbar"><div class="brand"><span>＋</span> STACKCHAN <small>3D BLUEPRINT ARCHIVE</small></div><div class="status"><i></i> SYSTEM READY <b>/</b> <button id="theme">THEME / BLUEPRINT</button></div></header>
  <main class="layout">
    <aside class="left panel"><div class="eyebrow">ARCHIVE / 002</div><h1>StackChan<br><em>Assembly</em></h1><p>Interactive 3D reconstruction using the official M5Stack structure files.</p>
      <div class="rule"></div><label>CAMERA VIEWS</label><div class="view-grid">${['ISO','FRONT','SIDE','REAR','TOP','BOTTOM','BLUEPRINT'].map((x,i)=>`<button class="view ${i===0?'active':''}" data-view="${x}">${String(i).padStart(2,'0')} / ${x}</button>`).join('')}</div>
      <div class="rule"></div><label>MODEL PARTS</label><div id="parts" class="parts"></div>
    </aside>
    <section class="stage"><div class="stage-head"><span><i></i> TECHNICAL VIEW / <b id="viewName">ISOMETRIC</b></span><span id="loadStatus">LOADING STRUCTURE / 00%</span></div><div id="viewport"><img id="blueprintImage" src="/Model_Size.png" alt="StackChan dimensional blueprint" /><div class="loading"><strong id="loadingText">LOADING STRUCTURE / 00%</strong><span><i id="progress"></i></span></div><div class="hint">DRAG TO ORBIT <b>/</b> SCROLL TO ZOOM</div></div><div class="stage-foot"><span>UNIT / MILLIMETRE</span><span>ORBIT CONTROLS / ACTIVE</span><span>REV / 01.0</span></div></section>
    <aside class="right panel"><div class="rule first"></div><label>ACTIVE ASSEMBLY</label><h2>STACKCHAN BODY</h2><p class="muted">M5STACK / K151</p><div class="stats"><span>WIDTH<strong>54.0 mm</strong></span><span>HEIGHT<strong>70.5 mm</strong></span><span>DEPTH<strong>61.5 mm</strong></span></div><div class="rule"></div><label>INSPECTION</label><div class="readout"><span>PARTS LOADED<strong id="partCount">0 / 10</strong></span><span>EXPLODE<strong id="explodeValue">0%</strong></span><span>MODEL SOURCE<strong>OFFICIAL STL</strong></span></div><div class="rule"></div><label>ASSEMBLY CONTROL</label><div class="control"><span>EXPLODE VIEW</span><input id="explode" type="range" min="0" max="100" value="0" /></div><button class="action" id="reset">RESET CAMERA <b>↺</b></button><a class="source" href="/official-model/">OPEN OFFICIAL MODEL ↗</a><a class="source" href="https://github.com/m5stack/M5_Hardware/tree/master/Products/K151_StackChan/Structures" target="_blank" rel="noreferrer">OPEN SOURCE RECORD ↗</a></aside>
  </main>`;

const files = [
  ['Main body','StackChan-MainBody.stl','#e9f0eb'], ['Base','StackChan-Base.stl','#d3ded7'], ['Base cover','StackChan-BaseCover.stl','#b8c9bf'], ['Bearing fixture','StackChan-BearingFixture.stl','#9fafaa'], ['Servo arm','StackChan-ServoArm.stl','#e36d42'], ['Servo body','StackChan-ServoBody.stl','#75847d'], ['Servo cover','StackChan-ServoCover.stl','#c7d3cb'], ['Side cover','StackChan-ServoSideCover.stl','#aabbb0'], ['Light guide A','StackChan-LightGuideBar-A.stl','#dce9e1'], ['Light guide B','StackChan-LightGuideBar-B.stl','#dce9e1']
];
const base = '/models/stackchan/';
// The published STL files use different export origins. These positions create
// a shared assembly coordinate system in millimetres after each mesh is centred.
const assemblyPositions = [
  [0, 43, 0],    // main body
  [0, 7, 0],     // base
  [0, 13, 0],    // base cover
  [0, 25, 0],    // bearing fixture
  [0, 30, 0],    // servo arm
  [0, 30, 0],    // servo body
  [0, 30, 0],    // servo cover
  [0, 30, 0],    // side cover
  [-19, 48, 0],  // light guide A
  [19, 48, 0]    // light guide B
];
const viewport = document.querySelector('#viewport'), scene = new THREE.Scene(), blueprintImage = document.querySelector('#blueprintImage');
const camera = new THREE.PerspectiveCamera(32, 1, .1, 1000); camera.position.set(-105,75,105);
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; viewport.append(renderer.domElement);
const controls = new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.07; controls.target.set(0,35,0);
scene.add(new THREE.HemisphereLight(0xbdd7cf,0x111714,2.1)); const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(80,120,100);scene.add(key);
const model=new THREE.Group(); scene.add(model); const loader=new STLLoader(); const meshes=[]; let loaded=0;
const partsEl=document.querySelector('#parts');
files.forEach(([label,file,color],index)=>{const row=document.createElement('button');row.className='part-row';row.innerHTML=`<span class="part-index">${String(index+1).padStart(2,'0')}</span><b>${label}</b><i>VISIBLE</i>`;partsEl.append(row);loader.load(base+file,geometry=>{geometry.computeVertexNormals();geometry.center();const material=new THREE.MeshStandardMaterial({color,metalness:.18,roughness:.64});const mesh=new THREE.Mesh(geometry,material);mesh.name=label;mesh.rotation.x=-Math.PI/2;mesh.userData={assembly:new THREE.Vector3(...assemblyPositions[index]),explode:new THREE.Vector3((index%3-1)*5,Math.floor(index/3)*4,(index%2?1:-1)*4)};mesh.position.copy(mesh.userData.assembly);model.add(mesh);meshes[index]=mesh;row.onclick=()=>{mesh.visible=!mesh.visible;row.classList.toggle('off',!mesh.visible);row.querySelector('i').textContent=mesh.visible?'VISIBLE':'HIDDEN'};loaded++;const pct=Math.round(loaded/files.length*100);document.querySelector('#progress').style.width=pct+'%';document.querySelector('#loadingText').textContent=`LOADING STRUCTURE / ${String(pct).padStart(2,'0')}%`;document.querySelector('#loadStatus').textContent=pct===100?'STRUCTURE READY / 10 PARTS':`LOADING STRUCTURE / ${String(pct).padStart(2,'0')}%`;document.querySelector('#partCount').textContent=`${loaded} / ${files.length}`;if(loaded===files.length){document.querySelector('.loading').classList.add('done');fitModel();}},undefined,()=>{row.classList.add('off');row.querySelector('i').textContent='UNAVAILABLE';loaded++;});});
const coreRow=document.createElement('button');coreRow.className='part-row';coreRow.innerHTML='<span class="part-index">11</span><b>CoreS3 display</b><i>VISIBLE</i>';partsEl.append(coreRow);
const coreDisplay=new THREE.Group();coreDisplay.name='CoreS3 display module';coreDisplay.userData={assembly:new THREE.Vector3(0,43,24.2),explode:new THREE.Vector3(0,9,10)};
const bezel=new THREE.Mesh(new THREE.BoxGeometry(46,35,1.4),new THREE.MeshStandardMaterial({color:'#17201c',metalness:.3,roughness:.35}));
const screen=new THREE.Mesh(new THREE.BoxGeometry(42.4,31.8,0.8),new THREE.MeshStandardMaterial({color:'#07100d',metalness:.1,roughness:.2,emissive:'#061b16',emissiveIntensity:.45}));screen.position.z=.9;
const lens=new THREE.Mesh(new THREE.CylinderGeometry(2.8,2.8,.9,32),new THREE.MeshStandardMaterial({color:'#172a25',metalness:.4,roughness:.2}));lens.rotation.x=Math.PI/2;lens.position.set(0,-19,.9);
coreDisplay.add(bezel,screen,lens);coreDisplay.position.copy(coreDisplay.userData.assembly);model.add(coreDisplay);coreDisplay.visible=true;
coreRow.innerHTML='<span class="part-index">11</span><b>CoreS3 source (exploded)</b><i>LOADING</i>';
const displayRow=document.createElement('button');displayRow.className='part-row';displayRow.innerHTML='<span class="part-index">12</span><b>CoreS3 display</b><i>VISIBLE</i>';partsEl.append(displayRow);displayRow.onclick=()=>{coreDisplay.visible=!coreDisplay.visible;displayRow.classList.toggle('off',!coreDisplay.visible);displayRow.querySelector('i').textContent=coreDisplay.visible?'VISIBLE':'HIDDEN'};
const coreSource=new THREE.Group();coreSource.name='CoreS3 complete source structure';coreSource.userData={assembly:new THREE.Vector3(0,43,0),explode:new THREE.Vector3(0,9,0)};coreSource.visible=false;model.add(coreSource);
function assembleCoreS3(source){const input=source.attributes.position.array,bins=[[],[],[],[]],bounds=[[-Infinity,55],[55,115],[115,195],[195,Infinity]];for(let i=0;i<input.length;i+=9){const cx=(input[i]+input[i+3]+input[i+6])/3;const b=bounds.findIndex(([min,max])=>cx>=min&&cx<max);if(b>=0)bins[b].push(...input.slice(i,i+9));}const group=new THREE.Group();const colors=['#93aaa0','#718078','#a9b9b0','#c2d0c8'];bins.slice(2).forEach((vertices,i)=>{if(!vertices.length)return;let min=Infinity,max=-Infinity;for(let n=0;n<vertices.length;n+=3){min=Math.min(min,vertices[n]);max=Math.max(max,vertices[n]);}const center=(min+max)/2;const array=new Float32Array(vertices);for(let n=0;n<array.length;n+=3)array[n]-=center;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(array,3));g.computeVertexNormals();group.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:colors[i+2],metalness:.12,roughness:.7,transparent:true,opacity:.86})));});return group;}
loader.load('/models/stackchan/CoreS3.stl',geometry=>{const assembled=assembleCoreS3(geometry);assembled.rotation.x=-Math.PI/2;coreSource.add(assembled);coreSource.position.copy(coreSource.userData.assembly);coreRow.querySelector('i').textContent='HIDDEN';coreRow.classList.add('off');coreRow.onclick=()=>{coreSource.visible=!coreSource.visible;coreRow.classList.toggle('off',!coreSource.visible);coreRow.querySelector('i').textContent=coreSource.visible?'VISIBLE':'HIDDEN'};fitModel();},undefined,()=>{coreRow.querySelector('i').textContent='UNAVAILABLE';});
function fitModel(){const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(size.x*1.8,size.y*1.3,size.z*1.8));camera.near=Math.max(.1,size.length()/100);camera.far=size.length()*20;camera.updateProjectionMatrix();controls.update();}
function resize(){const r=viewport.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}window.addEventListener('resize',resize);resize();
const positions={ISO:[-1, .8, 1],FRONT:[0,.25,1],SIDE:[-1,.25,0],REAR:[0,.25,-1],TOP:[0,1,0],BOTTOM:[0,-1,0]};
document.querySelectorAll('.view').forEach(button=>button.onclick=()=>{document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));button.classList.add('active');const name=button.dataset.view;if(name==='BLUEPRINT'){viewport.classList.add('blueprint-mode');document.querySelector('#viewName').textContent='MODEL SIZE / 2D';document.querySelector('#loadStatus').textContent='REFERENCE DRAWING / PNG';return}viewport.classList.remove('blueprint-mode');document.querySelector('#viewName').textContent=name==='ISO'?'ISOMETRIC':name+' ELEVATION';const p=positions[name],box=new THREE.Box3().setFromObject(model),c=box.getCenter(new THREE.Vector3()),s=Math.max(...box.getSize(new THREE.Vector3()).toArray())*2.2;camera.position.set(c.x+p[0]*s,c.y+p[1]*s,c.z+p[2]*s);controls.target.copy(c);controls.update()});
document.querySelector('#explode').oninput=e=>{const n=e.target.value/100;document.querySelector('#explodeValue').textContent=e.target.value+'%';[...meshes,coreDisplay,coreSource].forEach(m=>{if(m)m.position.copy(m.userData.assembly).addScaledVector(m.userData.explode,n)})};document.querySelector('#reset').onclick=()=>{document.querySelector('#explode').value=0;document.querySelector('#explodeValue').textContent='0%';[...meshes,coreDisplay,coreSource].forEach(m=>{if(m)m.position.copy(m.userData.assembly)});fitModel()};
document.querySelector('#theme').onclick=()=>{const blue=document.body.dataset.theme==='blue';document.body.dataset.theme=blue?'dark':'blue';document.querySelector('#theme').textContent=`THEME / ${blue?'DARK':'BLUEPRINT'}`};
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();
document.querySelectorAll('.view').forEach(button=>button.addEventListener('click',()=>{renderer.domElement.style.display=button.dataset.view==='BLUEPRINT'?'none':'block';}));
