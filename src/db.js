const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'buildings.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    model_file TEXT,
    image_file TEXT,
    height REAL DEFAULT 20,
    color TEXT DEFAULT '#4a90d9',
    type TEXT DEFAULT 'BIM',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
