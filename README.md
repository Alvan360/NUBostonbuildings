# NU Digital Twin

A 3D interactive digital twin of Northeastern University's campus. Explore building extrusions, toggle map layers, view building details, and capture screenshots — all in the browser.

**Live site:** [www.nu-digital-twin.com](https://www.nu-digital-twin.com)

## Features

- 68 building extrusions with polygon footprints from OpenStreetMap
- Flat roofs with lighter-shade cap on each building
- 3D rendering with Three.js on a MapLibre GL map
- Searchable building list
- Layer toggles (Street Centerlines, Building Footprints, Green Spaces)
- Compass bar showing current bearing
- Click-to-inspect building info panel with images
- Screenshot capture
- Home reset view
- Responsive glassmorphic UI panels

## Tech Stack

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/) | 4.7.1 | Interactive slippy map with vector tile basemap (CartoDB Positron) |
| [Three.js](https://threejs.org/) | r128 (CDN) | 3D rendering of building extrusions and GLB/GLTF models |
| Three.js GLTFLoader | 0.128.0 (CDN) | Loading `.glb` / `.gltf` 3D model files |

### Backend
| Library | Version | Purpose |
|---------|---------|---------|
| [Express](https://expressjs.com/) | 5.2.1 | HTTP server and REST API |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 12.11.1 | SQLite database driver (synchronous, native) |
| [multer](https://github.com/expressjs/multer) | 2.2.0 | Multipart form/file upload handling |
| [cors](https://github.com/expressjs/cors) | 2.8.6 | Cross-origin request middleware |
| [@turf/turf](https://turfjs.org/) | 7.3.5 | Geospatial analysis utilities |

### Platform
| Tool | Purpose |
|------|---------|
| [Node.js](https://nodejs.org/) | Runtime |
| [SQLite](https://www.sqlite.org/) | Embedded database for building data |
| [Render](https://render.com/) | Hosting (free tier) |
| [GitHub](https://github.com/) | Source control |

## Getting Started

### Prerequisites
- Node.js 18+

### Install and Run

```bash
git clone https://github.com/Alvan360/NUBostonbuildings.git
cd NUBostonbuildings
npm install
npm start
```

Server starts at `http://localhost:3000`.

### Development Mode

```bash
npm run dev
```

Uses `--watch` for auto-restart on file changes.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/buildings` | List all buildings (ordered by creation date) |
| `GET` | `/api/buildings/:id` | Get a single building by ID |
| `POST` | `/api/buildings` | Create a building (multipart form with optional model/image files) |
| `PUT` | `/api/buildings/:id` | Update a building |
| `DELETE` | `/api/buildings/:id` | Delete a building and its associated files |

### POST/PUT Body Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Building name |
| `description` | string | No | Description text |
| `lat` | number | Yes | Latitude |
| `lng` | number | Yes | Longitude |
| `height` | number | No | Height in meters (default: 20) |
| `color` | string | No | Hex color (default: `#4a90d9`) |
| `type` | string | No | Building type (default: `BIM`) |
| `model` | file | No | `.glb` or `.gltf` 3D model (max 100 MB) |
| `image` | file | No | `.png`, `.jpg`, `.jpeg`, or `.webp` image |

## Project Structure

```
gis-3d-map/
├── data/
│   └── buildings.db          # SQLite database
├── public/
│   ├── index.html             # Main HTML page
│   ├── app.js                 # Map, Three.js layer, UI logic
│   ├── buildings-data.js      # 68 campus buildings with polygon footprints
│   ├── building-transforms-archive.js  # Archived transform UI code (rotation/mirror/shift)
│   ├── style.css              # Glassmorphic dark-theme styles
│   ├── models/                # Uploaded 3D model files (.glb)
│   └── uploads/               # Uploaded images
├── src/
│   ├── server.js              # Express server and API routes
│   └── db.js                  # SQLite connection and schema setup
├── render.yaml                # Render deployment blueprint
├── package.json
└── package-lock.json
```

## Static Building Data

68 Northeastern University buildings are hardcoded in `buildings-data.js` with real polygon footprints sourced from OpenStreetMap. Each entry includes `rotation`, `mirrorX`, `mirrorY`, `shiftX`, and `shiftY` transform values used to align the extrusion with the basemap.

### Original buildings (IDs 200–247)

| Building | Height |
|----------|--------|
| Snell Engineering Center | 22 m |
| Curry Student Center | 30 m |
| Snell Library | 20 m |
| Egan Engineering/Science | 28 m |
| Mugar Life Sciences | 28 m |
| ...and 43 more |

### Additional campus buildings (IDs 300–319)

| Building | Height |
|----------|--------|
| Building 300 (tall) | 102 m |
| Reynolds Hall | 18 m |
| Light Hall | 18 m |
| Levine Hall | 18 m |
| Burstein Hall | 3.5 m |
| Fenway Center | 18 m |
| Renaissance Park | 31.5 m |
| Renaissance Parking Garage | 35 m |
| Lightview | 73.5 m |
| Church Park Luxury Apartments | 38.5 m |
| Center for Engineering, Innovation and Sciences | 18 m |
| Watson / Dobbs / Wentworth Hall | 18 m each |
| Symphony Plaza East | 44 m |
| 407 Huntington Avenue | 17.5 m |
| Davenport Commons A/B | 18 m each |
| Northampton Street Residences | 18 m |

Additional buildings can be added via the API.

## Deployment

The project includes a `render.yaml` for one-click deployment on Render.

1. Connect your GitHub repo to Render as a **Web Service**
2. Render auto-detects `render.yaml` and configures the build
3. Add custom domain `www.nu-digital-twin.com` in Render dashboard
4. Set DNS: 2 CNAME records (`www` → `nu-digital-twin.onrender.com`), plus an A record for `@` from Render's IP

> **Note:** Render's free tier uses an ephemeral filesystem. The SQLite database resets on each deploy. Static building data from `buildings-data.js` is always available since it's served from the repo.

## License

ISC
