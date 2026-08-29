const image = new Image();
image.src = 'blueprint-3d/public/Model_Size.png';
const canvas = document.querySelector('#blueprintCanvas');
const ctx = canvas.getContext('2d');
const wrap = document.querySelector('#canvasWrap');
const zoomValue = document.querySelector('#zoomValue');
const viewTitle = document.querySelector('#viewTitle');
const inspectionTitle = document.querySelector('#inspectionTitle');
const inspectionCopy = document.querySelector('#inspectionCopy');

const views = {
  overview: {title:'OVERVIEW', crop:{x:0,y:0,w:8268,h:5847}, note:['Full drawing sheet','All available elevations and dimension references.']},
  front: {title:'FRONT ELEVATION', crop:{x:1900,y:1750,w:2600,h:2250}, note:['Front elevation','Display face, lower pivot, and overall width reference.']},
  side: {title:'SIDE ELEVATION', crop:{x:0,y:1800,w:2100,h:2300}, note:['Side elevation','Enclosure depth and rear accessory profile.']},
  top: {title:'TOP PLAN', crop:{x:2150,y:0,w:2100,h:1850}, note:['Top plan','Top plate, mounting holes, and 48 mm width reference.']},
  rear: {title:'REAR / I-O', crop:{x:4100,y:1750,w:2600,h:2250}, note:['Rear / I-O elevation','Power and connector locations on the rear panel.']},
  bottom: {title:'BASE DETAIL', crop:{x:2150,y:3850,w:2200,h:1900}, note:['Base detail','Lower mounting geometry and rotation base footprint.']}
};
const callouts = {screen:['Display module','Front face / active surface'],base:['Rotation base','Lower assembly / mount'],io:['Rear I/O panel','Connectors / power']};
let current = 'overview', scale = 1, pan = {x:0,y:0}, dragging = false, start = null;
const themeToggle = document.querySelector('#themeToggle');
const themeName = document.querySelector('#themeName');
function setTheme(theme){document.body.dataset.theme=theme;themeName.textContent=theme==='blue'?'BLUEPRINT':'DARK';localStorage.setItem('stackchan-theme',theme);}
setTheme(localStorage.getItem('stackchan-theme')||'dark');
themeToggle.onclick=()=>setTheme(document.body.dataset.theme==='blue'?'dark':'blue');

function resize(){const rect=wrap.getBoundingClientRect(), dpr=devicePixelRatio||1; canvas.width=rect.width*dpr; canvas.height=rect.height*dpr; canvas.style.width=rect.width+'px'; canvas.style.height=rect.height+'px'; ctx.setTransform(dpr,0,0,dpr,0,0); draw();}
function draw(){if(!image.naturalWidth)return; const w=wrap.clientWidth,h=wrap.clientHeight,v=views[current], c=v.crop; const fit=Math.min(w/c.w,h/c.h)*scale; const ox=(w-c.w*fit)/2+pan.x, oy=(h-c.h*fit)/2+pan.y; ctx.fillStyle='#e9ebe7';ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.drawImage(image,c.x,c.y,c.w,c.h,ox,oy,c.w*fit,c.h*fit); zoomValue.textContent=Math.round(scale*100)+'%';}
function setView(name){current=name;scale=name==='overview'?.75:1;pan={x:0,y:0};document.querySelectorAll('.view-button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));viewTitle.textContent=views[name].title;inspectionTitle.textContent=views[name].note[0];inspectionCopy.textContent=views[name].note[1];draw();}
image.onload=()=>{resize();}; window.addEventListener('resize',resize);
document.querySelectorAll('.view-button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelector('#zoomIn').onclick=()=>{scale=Math.min(4,scale+.2);draw()}; document.querySelector('#zoomOut').onclick=()=>{scale=Math.max(.35,scale-.2);draw()}; document.querySelector('#resetView').onclick=()=>setView(current);
wrap.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.35,Math.min(4,scale+(e.deltaY<0?.12:-.12)));draw()},{passive:false});
wrap.addEventListener('pointerdown',e=>{dragging=true;start={x:e.clientX-pan.x,y:e.clientY-pan.y};wrap.setPointerCapture(e.pointerId)});wrap.addEventListener('pointermove',e=>{if(dragging){pan={x:e.clientX-start.x,y:e.clientY-start.y};draw()}});wrap.addEventListener('pointerup',()=>dragging=false);wrap.addEventListener('pointercancel',()=>dragging=false);
document.querySelectorAll('.callout').forEach(b=>b.addEventListener('click',()=>{const data=callouts[b.dataset.callout];inspectionTitle.textContent=data[0];inspectionCopy.textContent=data[1];setView(b.dataset.callout==='screen'?'front':b.dataset.callout==='io'?'rear':'bottom')}));
document.querySelector('#downloadButton').onclick=()=>{const a=document.createElement('a');a.href=image.src;a.download='StackChan-Model-Size.png';a.click()};
