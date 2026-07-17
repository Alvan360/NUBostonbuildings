const API = '/api/buildings';

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  center: [-71.0875, 42.3403],
  zoom: 16,
  pitch: 55,
  bearing: -30,
  canvasContextAttributes: { antialias: true }
});

map.addControl(new maplibregl.NavigationControl());
map.addControl(new maplibregl.ScaleControl());

// ---- Three.js custom layer (official MapLibre pattern) ----
const THREE = window.THREE;
let buildings = [];
let sceneObjects = [];

const customLayer = {
  id: 'three-buildings',
  type: 'custom',
  renderingMode: '3d',

  onAdd(map_, gl) {
    this.camera = new THREE.Camera();
    this.camera.matrixAutoUpdate = false;
    this.camera.matrix.identity();
    this.camera.projectionMatrix.identity();

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(0, -70, 100).normalize();
    this.scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dl2.position.set(0, 70, 100).normalize();
    this.scene.add(dl2);

    this.map = map_;
    this.renderer = new THREE.WebGLRenderer({
      canvas: map_.getCanvas(),
      context: gl,
      antialias: true
    });
    this.renderer.autoClear = false;

    loadBuildings(this.scene);
  },

  render(gl, matrix) {
    this.camera.projectionMatrix.fromArray(matrix);

    for (const obj of sceneObjects) {
      const c = obj.mercCoord;
      const s = obj.meterScale;
      obj.transMat.identity().makeTranslation(c.x, c.y, 0);
      obj.transMat.scale(new THREE.Vector3(s, -s, s));
      obj.mesh.matrix.copy(obj.transMat);
      obj.mesh.matrixAutoUpdate = false;
      obj.mesh.matrixWorldNeedsUpdate = false;
    }

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint();
  }
};

map.on('load', () => {
  map.addLayer(customLayer);
});

// ---- Extrusion builder ----
function buildExtrusion(polyMeters, heightMeters, color, id) {
  const shape = new THREE.Shape();
  polyMeters.forEach((p, i) => {
    if (i === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  });
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: heightMeters,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.05,
    bevelSegments: 1
  });
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: color || '#cccccc',
    metalness: 0.05,
    roughness: 0.8,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.buildingId = id;
  return mesh;
}

function buildAll(scene) {
  for (const obj of sceneObjects) {
    scene.remove(obj.mesh);
    obj.mesh.geometry.dispose();
    obj.mesh.material.dispose();
  }
  sceneObjects = [];

  for (const b of buildings) {
    const coord = maplibregl.MercatorCoordinate.fromLngLat([b.lng, b.lat], 0);
    const meterScale = coord.meterInMercatorCoordinateUnits();

    const polyMeters = b.polygon.map(pt => {
      const c = maplibregl.MercatorCoordinate.fromLngLat([pt[0], pt[1]], 0);
      return [(c.x - coord.x) / meterScale, (c.y - coord.y) / meterScale];
    });

    const mesh = buildExtrusion(polyMeters, b.height, b.color, b.id);
    scene.add(mesh);
    sceneObjects.push({ id: b.id, mesh, mercCoord: coord, meterScale, transMat: new THREE.Matrix4() });
  }
}

async function loadBuildings(scene) {
  buildings = [...BUILDINGS_DATA];
  let api = [];
  try { api = await fetch(API).then(r => r.json()); } catch {}
  for (const a of api) {
    if (!buildings.find(x => x.id === a.id)) buildings.push(a);
  }
  buildAll(scene);
}

// ---- Click ----
let popup = null;
map.on('click', (e) => {
  if (popup) { popup.remove(); popup = null; }
  if (!sceneObjects.length) return;
  const rect = map.getCanvas().getBoundingClientRect();
  const ndcX = (e.point.x / rect.width) * 2 - 1;
  const ndcY = -(e.point.y / rect.height) * 2 + 1;

  const cam = customLayer.camera;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);

  const meshes = sceneObjects.map(o => o.mesh);
  const hits = raycaster.intersectObjects(meshes, true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && o.userData.buildingId === undefined) o = o.parent;
    if (o && o.userData.buildingId !== undefined) {
      const b = buildings.find(x => x.id === o.userData.buildingId);
      if (b) {
        showBuildingInfo(b);
        popup = new maplibregl.Popup({ offset: 25 })
          .setLngLat([b.lng, b.lat])
          .setHTML(`<b>${esc(b.name)}</b><br>${b.height}m tall`)
          .addTo(map);
      }
    }
  }
});

// ---- UI ----
function showBuildingInfo(b) {
  document.getElementById('info-content').innerHTML = `
    ${b.image_file ? `<img class="info-img" src="/uploads/${b.image_file}" />` : ''}
    <h2>${esc(b.name)}</h2>
    <p>${esc(b.description || '')}</p>
    <p>${b.lat}, ${b.lng} | ${b.height}m</p>`;
  document.getElementById('info-panel').classList.remove('hidden');
}

document.getElementById('close-panel').onclick = () =>
  document.getElementById('info-panel').classList.add('hidden');

function toast(msg, err) {
  let t = document.getElementById('t');
  if (!t) { t = Object.assign(document.createElement('div'), { id: 't' });
    t.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);z-index:99;background:rgba(40,40,70,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 20px;font-size:13px;color:#fff;opacity:0;transition:opacity 0.3s;pointer-events:none;';
    document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity = 1; setTimeout(() => t.style.opacity = 0, 2500);
}

document.querySelectorAll('.collapsible-header').forEach(h =>
  h.onclick = () => { const b = h.parentElement.querySelector('.collapsible-body');
    b.style.display = b.style.display === 'none' ? 'flex' : 'none';
    h.parentElement.classList.toggle('expanded'); }
);
document.querySelectorAll('.control-item').forEach(c =>
  c.onclick = () => {
    document.querySelectorAll('.control-item').forEach(x => x.classList.remove('active-control'));
    c.classList.add('active-control'); }
);
document.getElementById('btn-home').onclick = () =>
  map.flyTo({ center: [-71.0875, 42.3403], zoom: 16, pitch: 55, bearing: -30, duration: 1200 });
document.getElementById('btn-camera').onclick = () =>
  map.getCanvas().toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'twin.png'; a.click(); });
document.querySelectorAll('.toggle-track').forEach(t =>
  t.onclick = e => { e.stopPropagation(); t.classList.toggle('active'); }
);
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
