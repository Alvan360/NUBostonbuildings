# NU Digital Twin

A 3D interactive digital twin of Northeastern University's campus. Explore building extrusions, toggle map layers, view building details, and capture screenshots — all in the browser.

**Live site:** [www.nu-digital-twin.com](https://www.nu-digital-twin.com)

## Features

- 3D building extrusions rendered with Three.js on a MapLibre GL map
- Searchable building list
- Layer toggles (Street Centerlines, Building Footprints, Green Spaces)
- Collapsible model sections (Building Scale, Urban Scale)
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
│   ├── buildings-data.js      # Static building polygon data (5 NU buildings)
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

Five Northeastern University buildings are hardcoded in `buildings-data.js` with polygon footprints for 3D extrusion:

| Building | Height |
|----------|--------|
| Snell Engineering Center | 22 m |
| Curry Student Center | 30 m |
| Snell Library | 20 m |
| Egan Engineering/Science | 28 m |
| Mugar Life Sciences | 28 m |

These are always loaded on page load. Additional buildings can be added via the API.

## Deployment

The project includes a `render.yaml` for one-click deployment on Render.

1. Connect your GitHub repo to Render as a **Web Service**
2. Render auto-detects `render.yaml` and configures the build
3. The service is available at `nubostonbuildings.onrender.com`

> **Note:** Render's free tier uses an ephemeral filesystem. The SQLite database resets on each deploy. Static building data from `buildings-data.js` is always available since it's served from the repo.

## License

ISC
