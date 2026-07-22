// =====================================================================
// ARCHIVED: Building Transform UI & Export Functionality
// This file contains code removed from app.js / index.html / style.css
// on 2026-07-11 after building positions were finalized.
// Keep for reference if transform editing is needed again.
// =====================================================================

// ---- Transform UI in showBuildingInfo (app.js) ----
// Add these lines at the TOP of showBuildingInfo(b), before the innerHTML:
//
//   const rot = b.rotation || 0;
//   const mx = b.mirrorX || 0;
//   const my = b.mirrorY || 0;
//   const sx = b.shiftX || 0;
//   const sy = b.shiftY || 0;
//
// Replace the innerHTML assignment with:
//
//   document.getElementById('info-content').innerHTML = `
//     ${b.image_file ? `<img class="info-img" src="/uploads/${b.image_file}" />` : ''}
//     <h2>${esc(b.name)}</h2>
//     <p>${esc(b.description || '')}</p>
//     <p>${b.lat.toFixed(6)}, ${b.lng.toFixed(6)} | ${b.height}m</p>
//     <div class="transform-section">
//       <label class="transform-label">
//         Rotation: <span id="rot-val">${rot}</span>&deg;
//       </label>
//       <input type="range" id="rot-slider" min="-180" max="180" step="1" value="${rot}"
//         class="transform-slider" />
//       <div class="transform-range"><span>-180&deg;</span><span>0&deg;</span><span>180&deg;</span></div>
//     </div>
//     <div class="transform-section">
//       <div class="mirror-buttons">
//         <button id="btn-mirror-x" class="mirror-btn ${mx ? 'active' : ''}">Mirror X</button>
//         <button id="btn-mirror-y" class="mirror-btn ${my ? 'active' : ''}">Mirror Y</button>
//       </div>
//     </div>
//     <div class="transform-section">
//       <label class="transform-label">
//         Shift X: <span id="shiftx-val">${sx.toFixed(1)}</span>m
//       </label>
//       <input type="range" id="shiftx-slider" min="-50" max="50" step="0.5" value="${sx}"
//         class="transform-slider" />
//       <div class="transform-range"><span>-50m</span><span>0m</span><span>50m</span></div>
//     </div>
//     <div class="transform-section">
//       <label class="transform-label">
//         Shift Y: <span id="shifty-val">${sy.toFixed(1)}</span>m
//       </label>
//       <input type="range" id="shifty-slider" min="-50" max="50" step="0.5" value="${sy}"
//         class="transform-slider" />
//       <div class="transform-range"><span>-50m</span><span>0m</span><span>50m</span></div>
//     </div>`;
//
// Add these event listeners AFTER the innerHTML assignment:
//
//   document.getElementById('rot-slider').addEventListener('input', (e) => {
//     const deg = parseInt(e.target.value);
//     document.getElementById('rot-val').textContent = deg;
//     b.rotation = deg;
//     rebuildSingleBuilding(b.id);
//   });
//
//   document.getElementById('btn-mirror-x').addEventListener('click', () => {
//     b.mirrorX = b.mirrorX ? 0 : 1;
//     document.getElementById('btn-mirror-x').classList.toggle('active');
//     rebuildSingleBuilding(b.id);
//   });
//
//   document.getElementById('btn-mirror-y').addEventListener('click', () => {
//     b.mirrorY = b.mirrorY ? 0 : 1;
//     document.getElementById('btn-mirror-y').classList.toggle('active');
//     rebuildSingleBuilding(b.id);
//   });
//
//   document.getElementById('shiftx-slider').addEventListener('input', (e) => {
//     const val = parseFloat(e.target.value);
//     document.getElementById('shiftx-val').textContent = val.toFixed(1);
//     b.shiftX = val;
//     rebuildSingleBuilding(b.id);
//   });
//
//   document.getElementById('shifty-slider').addEventListener('input', (e) => {
//     const val = parseFloat(e.target.value);
//     document.getElementById('shifty-val').textContent = val.toFixed(1);
//     b.shiftY = val;
//     rebuildSingleBuilding(b.id);
//   });

// ---- Export function (app.js) ----
// Add this function and its event listener to app.js:
//
// function exportBuildingsData() {
//   const exportData = buildings.map(b => {
//     const entry = {
//       id: b.id, name: b.name,
//       lat: b.lat, lng: b.lng,
//       height: b.height, color: b.color,
//       rotation: b.rotation || 0,
//       mirrorX: b.mirrorX || 0,
//       mirrorY: b.mirrorY || 0,
//       shiftX: b.shiftX || 0,
//       shiftY: b.shiftY || 0,
//       polygon: b.polygon
//     };
//     if (b.description) entry.description = b.description;
//     if (b.model_file) entry.model_file = b.model_file;
//     if (b.image_file) entry.image_file = b.image_file;
//     return entry;
//   });
//   const js = 'const BUILDINGS_DATA = ' + JSON.stringify(exportData, null, 2) + ';\n';
//   const blob = new Blob([js], { type: 'application/javascript' });
//   const a = document.createElement('a');
//   a.href = URL.createObjectURL(blob);
//   a.download = 'buildings-data.js';
//   a.click();
//   URL.revokeObjectURL(a.href);
//   toast('buildings-data.js downloaded');
// }
//
// document.getElementById('btn-export').onclick = exportBuildingsData;

// ---- Export button HTML (index.html) ----
// Add this before the scale indicator div:
//
//   <!-- Bottom-center: Export -->
//   <button id="btn-export" class="float-btn" title="Export buildings-data.js"
//     style="bottom:60px;left:50%;transform:translateX(-50%);width:auto;border-radius:10px;padding:0 14px;font-size:12px;gap:6px;display:flex;align-items:center;">
//     <span>&#128190;</span> Export
//   </button>

// ---- Transform CSS (style.css) ----
// Add these rules to style.css:
//
//   /* ===== Transform controls in info panel ===== */
//   .transform-section {
//     margin-top:12px;
//     border-top:1px solid rgba(255,255,255,0.06);
//     padding-top:12px;
//   }
//   .transform-label {
//     font-size:12px; color:#aaa; display:block; margin-bottom:6px;
//   }
//   .transform-slider {
//     width:100%; accent-color:#4caf50;
//   }
//   .transform-range {
//     display:flex; justify-content:space-between;
//     font-size:10px; color:#666; margin-top:2px;
//   }
//   .mirror-buttons {
//     display:flex; gap:8px;
//   }
//   .mirror-btn {
//     flex:1; padding:6px 10px; border-radius:6px;
//     background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
//     color:#aaa; font-size:12px; cursor:pointer;
//     transition:background 0.15s, color 0.15s, border-color 0.15s;
//   }
//   .mirror-btn:hover { background:rgba(255,255,255,0.1); color:#ddd; }
//   .mirror-btn.active {
//     background:rgba(76,175,80,0.2); border-color:#4caf50; color:#4caf50;
//   }
