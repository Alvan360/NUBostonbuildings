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

map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
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

    for (const obj of rhinoObjects) {
      const c = obj.mercCoord;
      const s = obj.meterScale;
      obj.transMat.identity().makeTranslation(c.x, c.y, 0);
      obj.transMat.scale(new THREE.Vector3(s, -s, s));
      obj.transMat.multiply(obj.localMat);
      obj.group.matrix.copy(obj.transMat);
      obj.group.matrixAutoUpdate = false;
      obj.group.matrixWorldNeedsUpdate = false;
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
function lightenColor(hex, amount) {
  hex = hex.replace('#', '');
  const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + Math.round(255 * amount));
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

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

  const roofGeo = new THREE.ShapeGeometry(shape);
  roofGeo.translate(0, 0, heightMeters);
  const roofMat = new THREE.MeshStandardMaterial({
    color: lightenColor(color || '#cccccc', 0.2),
    metalness: 0.05,
    roughness: 0.8,
    side: THREE.DoubleSide
  });
  mesh.add(new THREE.Mesh(roofGeo, roofMat));

  return mesh;
}

function rotatePoint(px, py, angleDeg) {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [px * cos - py * sin, px * sin + py * cos];
}

function mirrorPoint(px, py, mx, my) {
  return [mx ? -px : px, my ? -py : py];
}

function shiftPoint(px, py, sx, sy) {
  return [px + sx, py + sy];
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

    let polyMeters = b.polygon.map(pt => {
      const c = maplibregl.MercatorCoordinate.fromLngLat([pt[0], pt[1]], 0);
      return [(c.x - coord.x) / meterScale, (c.y - coord.y) / meterScale];
    });

    if (b.mirrorX || b.mirrorY) {
      polyMeters = polyMeters.map(p => mirrorPoint(p[0], p[1], b.mirrorX, b.mirrorY));
    }
    if (b.shiftX || b.shiftY) {
      polyMeters = polyMeters.map(p => shiftPoint(p[0], p[1], b.shiftX || 0, b.shiftY || 0));
    }
    if (b.rotation) {
      polyMeters = polyMeters.map(p => rotatePoint(p[0], p[1], b.rotation));
    }

    const mesh = buildExtrusion(polyMeters, b.height, b.color, b.id);
    scene.add(mesh);
    sceneObjects.push({ id: b.id, mesh, mercCoord: coord, meterScale, transMat: new THREE.Matrix4(), polyMeters });
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

// ---- Rhino (GLB) models ----
const rhinoObjects = [];
const gltfLoader = new THREE.GLTFLoader();

async function loadRhinoModels(scene) {
  if (rhinoObjects.length) return;
  const withModels = buildings.filter(b => b.model_file);
  for (const b of withModels) {
    try {
      const gltf = await new Promise((resolve, reject) => {
        gltfLoader.load(`/models/${b.model_file}`, resolve, undefined, reject);
      });
      const group = gltf.scene;

      // Fix black materials
      group.traverse(child => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            metalness: 0.1,
            roughness: 0.7,
            side: THREE.DoubleSide
          });
        }
      });

      // Fix Z orientation: compute bounding box
      const box = new THREE.Box3().setFromObject(group);

      // Compute local matrix: Z offset + rotation + mirror
      const localMat = new THREE.Matrix4();
      const zLift = new THREE.Matrix4().makeTranslation(0, 0, -box.min.z);
      const rotMat = new THREE.Matrix4().makeRotationZ((b.rotation || 0) * Math.PI / 180);
      const mirrorMat = new THREE.Matrix4().makeScale(b.mirrorX ? -1 : 1, b.mirrorY ? -1 : 1, 1);
      localMat.multiply(zLift).multiply(rotMat).multiply(mirrorMat);

      console.log('Rhino model loaded:', b.name, 'bbox:', box.min.toArray(), box.max.toArray());

      const coord = maplibregl.MercatorCoordinate.fromLngLat([b.lng, b.lat], 0);
      const meterScale = coord.meterInMercatorCoordinateUnits();
      rhinoObjects.push({ id: b.id, group, localMat, mercCoord: coord, meterScale, transMat: new THREE.Matrix4() });
      scene.add(group);
    } catch (err) {
      console.warn('Failed to load GLB:', b.model_file, err);
    }
  }
}

function setRhinoVisibility(visible) {
  for (const obj of rhinoObjects) {
    obj.group.visible = visible;
  }
}

// ---- Compass overlay markers ----
let compassMarkers = [];

function getEdgeMidpoints(polyPoints) {
  const midpoints = [];
  for (let i = 0; i < polyPoints.length - 1; i++) {
    const a = polyPoints[i];
    const b = polyPoints[i + 1];
    midpoints.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return midpoints;
}

function edgeBearing(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let deg = Math.atan2(dx, dy) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function bearingLabel(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function showCompassOverlay(b) {
  clearCompassOverlay();
  const obj = sceneObjects.find(o => o.id === b.id);
  if (!obj || !obj.polyMeters) return;

  const midpoints = getEdgeMidpoints(obj.polyMeters);
  const directions = ['N','E','S','W','NE','SE','SW','NW'];

  midpoints.forEach((mp, i) => {
    const nextPt = obj.polyMeters[(i + 1) % (obj.polyMeters.length - 1)];
    const bearing = edgeBearing(mp, nextPt);
    const label = bearingLabel(bearing);

    const lngLat = meterToLngLat(mp, obj);

    const el = document.createElement('div');
    el.style.cssText = 'background:rgba(255,255,255,0.9);color:#222;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;pointer-events:none;text-align:center;min-width:20px;';
    el.textContent = label;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(lngLat)
      .addTo(map);
    marker.getElement().style.pointerEvents = 'none';
    compassMarkers.push(marker);
  });
}

function meterToLngLat(meterPt, obj) {
  const mercX = obj.mercCoord.x + meterPt[0] * obj.meterScale;
  const mercY = obj.mercCoord.y + meterPt[1] * obj.meterScale;
  const coord = new maplibregl.MercatorCoordinate(mercX, mercY, 0);
  const ll = coord.toLngLat();
  return [ll.lng, ll.lat];
}

function clearCompassOverlay() {
  compassMarkers.forEach(m => m.remove());
  compassMarkers = [];
}

// ---- Rebuild a single building ----
function rebuildSingleBuilding(buildingId) {
  const b = buildings.find(x => x.id === buildingId);
  if (!b) return;
  const obj = sceneObjects.find(o => o.id === buildingId);
  if (!obj) return;

  const coord = maplibregl.MercatorCoordinate.fromLngLat([b.lng, b.lat], 0);
  const meterScale = coord.meterInMercatorCoordinateUnits();

  let polyMeters = b.polygon.map(pt => {
    const c = maplibregl.MercatorCoordinate.fromLngLat([pt[0], pt[1]], 0);
    return [(c.x - coord.x) / meterScale, (c.y - coord.y) / meterScale];
  });

  if (b.mirrorX || b.mirrorY) {
    polyMeters = polyMeters.map(p => mirrorPoint(p[0], p[1], b.mirrorX, b.mirrorY));
  }
  if (b.shiftX || b.shiftY) {
    polyMeters = polyMeters.map(p => shiftPoint(p[0], p[1], b.shiftX || 0, b.shiftY || 0));
  }
  if (b.rotation) {
    polyMeters = polyMeters.map(p => rotatePoint(p[0], p[1], b.rotation));
  }

  const scene = customLayer.scene;
  scene.remove(obj.mesh);
  obj.mesh.geometry.dispose();
  obj.mesh.material.dispose();

  const mesh = buildExtrusion(polyMeters, b.height, b.color, b.id);
  scene.add(mesh);
  obj.mesh = mesh;
  obj.polyMeters = polyMeters;
}

// ---- Point-in-polygon (ray-casting) ----
function pointInPolygon(point, polygon) {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ---- Click ----
let popup = null;
let selectedBuildingId = null;
map.on('click', (e) => {
  if (popup) { popup.remove(); popup = null; }
  selectedBuildingId = null;

  const ll = map.unproject(e.point);
  let hit = null;
  for (const b of buildings) {
    if (!b.polygon) continue;
    if (pointInPolygon([ll.lng, ll.lat], b.polygon)) { hit = b; break; }
  }

  if (hit) {
    selectedBuildingId = hit.id;
    showBuildingInfo(hit);
    popup = new maplibregl.Popup({ offset: 25 })
      .setLngLat([hit.lng, hit.lat])
      .setHTML(`<b>${esc(hit.name)}</b><br>${hit.height}m tall`)
      .addTo(map);
  } else {
    document.getElementById('info-panel').classList.add('hidden');
  }
});

// ---- UI ----
function showBuildingInfo(b) {
  document.getElementById('info-content').innerHTML = `
    ${b.image_file ? `<img class="info-img" src="/uploads/${b.image_file}" />` : ''}
    <h2>${esc(b.name)}</h2>
    <p>${esc(b.description || '')}</p>
    <p>${b.lat.toFixed(6)}, ${b.lng.toFixed(6)} | ${b.height}m</p>`;
  document.getElementById('info-panel').classList.remove('hidden');
}

document.getElementById('close-panel').onclick = () => {
  document.getElementById('info-panel').classList.add('hidden');
  selectedBuildingId = null;
};

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
document.getElementById('btn-home').onclick = () =>
  map.flyTo({ center: [-71.0875, 42.3403], zoom: 16, pitch: 55, bearing: -30, duration: 1200 });
document.getElementById('btn-camera').onclick = () =>
  map.getCanvas().toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'twin.png'; a.click(); });
// ---- Layer switching ----
let activeLayer = 'OSM Buildings';

function setOSMVisibility(visible) {
  map.setLayoutProperty('three-buildings', 'visibility', visible ? 'visible' : 'none');
}

document.querySelectorAll('.layer-item').forEach(item => {
  item.onclick = () => {
    const label = item.querySelector('.layer-label').textContent.trim();

    // Deselect all items across both groups
    document.querySelectorAll('.layer-item').forEach(i => {
      i.classList.remove('active-item');
      const dot = i.querySelector('.active-dot');
      if (dot) dot.remove();
    });

    // Activate clicked item
    item.classList.add('active-item');
    const dot = document.createElement('span');
    dot.className = 'active-dot';
    item.appendChild(dot);

    activeLayer = label;
    setOSMVisibility(label === 'OSM Buildings');

    if (label === 'Rhino (Building)') {
      loadRhinoModels(customLayer.scene).then(() => setRhinoVisibility(true));
    } else {
      setRhinoVisibility(false);
    }
  };
});

// ---- Search ----
const searchPopup = document.createElement('div');
searchPopup.id = 'search-popup';
document.getElementById('search-wrapper').appendChild(searchPopup);

const searchInput = document.getElementById('search-input');
let searchBlurTimeout = null;

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchPopup.style.display = 'none'; return; }

  const results = buildings.filter(b => b.name.toLowerCase().includes(q)).slice(0, 10);

  searchPopup.innerHTML = '';
  if (!results.length) {
    searchPopup.innerHTML = '<div class="search-no-results">No results</div>';
  } else {
    results.forEach(b => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.textContent = `${b.name}  (${b.height}m)`;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        searchPopup.style.display = 'none';
        searchInput.value = '';
        map.flyTo({ center: [b.lng, b.lat], zoom: 17, duration: 1200 });
        showBuildingInfo(b);
        if (popup) popup.remove();
        popup = new maplibregl.Popup({ offset: 25 })
          .setLngLat([b.lng, b.lat])
          .setHTML(`<b>${esc(b.name)}</b><br>${b.height}m tall`)
          .addTo(map);
      });
      searchPopup.appendChild(item);
    });
  }
  searchPopup.style.display = 'block';
});

searchInput.addEventListener('blur', () => {
  searchBlurTimeout = setTimeout(() => { searchPopup.style.display = 'none'; }, 200);
});
searchInput.addEventListener('focus', () => {
  if (searchBlurTimeout) clearTimeout(searchBlurTimeout);
  if (searchInput.value.trim()) searchInput.dispatchEvent(new Event('input'));
});



// ---- Compass bar ----
const compassTrack = document.getElementById('compass-track');
const directions = [
  { deg: 0, label: 'N', cardinal: true },
  { deg: 45, label: 'NE', cardinal: false },
  { deg: 90, label: 'E', cardinal: true },
  { deg: 135, label: 'SE', cardinal: false },
  { deg: 180, label: 'S', cardinal: true },
  { deg: 225, label: 'SW', cardinal: false },
  { deg: 270, label: 'W', cardinal: true },
  { deg: 315, label: 'NW', cardinal: false },
];
const pxPerDeg = 2400 / 360;
const copyWidth = 2400;
const totalCopies = 3;
const totalWidth = copyWidth * totalCopies;

// Build 3 copies of the track so it wraps smoothly
for (let copy = 0; copy < totalCopies; copy++) {
  const offsetX = copy * copyWidth;
  for (let deg = 0; deg < 360; deg += 5) {
    const tick = document.createElement('div');
    tick.className = 'compass-tick ' + (deg % 45 === 0 ? 'major' : 'minor');
    tick.style.left = (offsetX + deg * pxPerDeg) + 'px';
    compassTrack.appendChild(tick);
  }
  directions.forEach(d => {
    const label = document.createElement('div');
    label.className = 'compass-label' + (d.cardinal ? ' cardinal' : '');
    label.style.left = (offsetX + d.deg * pxPerDeg) + 'px';
    label.textContent = d.label;
    compassTrack.appendChild(label);
  });
}

compassTrack.style.width = totalWidth + 'px';

let lastBearing = null;
let continuousOffset = 0;

function updateCompass() {
  const bearing = map.getBearing();
  if (lastBearing !== null) {
    let delta = bearing - lastBearing;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    continuousOffset += delta;
  }
  lastBearing = bearing;

  const pos = continuousOffset * pxPerDeg;
  const offset = 300 - copyWidth - pos;
  compassTrack.style.transform = `translateX(${offset}px)`;
}
map.on('rotate', updateCompass);
updateCompass();
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
