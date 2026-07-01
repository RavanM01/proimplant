/**
 * SQLite-backed store (via better-sqlite3, prebuilt binary — no build tools).
 *
 * Design: the whole dataset is kept as an in-memory object (`db`) that the
 * app reads/mutates exactly like before; on `persist()` the state is written
 * to SQLite inside a single ACID transaction. This gives crash-safe, atomic,
 * corruption-proof storage (WAL journalling) in one portable file, while
 * keeping all application logic unchanged.
 *
 * Entities live in real tables (id + JSON payload); settings/counter live in a
 * key-value table. Still a SINGLE-process store — run one instance only.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'clinic.sqlite');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const LEGACY_JSON = path.join(DATA_DIR, 'db.json');

const TABLES = ['admins', 'doctors', 'services', 'appointments'];

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(DB_FILE);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

for (const t of TABLES) {
  sqlite.exec(`CREATE TABLE IF NOT EXISTS ${t} (id INTEGER PRIMARY KEY, data TEXT NOT NULL)`);
}
sqlite.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)');

// In-memory working set (what the app reads/mutates).
const db = {
  admins: [], doctors: [], services: [], appointments: [],
  settings: {}, meta: { seq: 1 },
};

function loadAll() {
  for (const t of TABLES) {
    db[t] = sqlite.prepare(`SELECT data FROM ${t} ORDER BY id`).all().map((r) => JSON.parse(r.data));
  }
  const s = sqlite.prepare("SELECT v FROM kv WHERE k = 'settings'").get();
  db.settings = s ? JSON.parse(s.v) : {};
  const m = sqlite.prepare("SELECT v FROM kv WHERE k = 'meta'").get();
  db.meta = m ? JSON.parse(m.v) : { seq: 1 };
}

const insertStmts = {};
const deleteAllStmts = {};
for (const t of TABLES) {
  insertStmts[t] = sqlite.prepare(`INSERT INTO ${t} (id, data) VALUES (@id, @data)`);
  deleteAllStmts[t] = sqlite.prepare(`DELETE FROM ${t}`);
}
const kvUpsert = sqlite.prepare(
  'INSERT INTO kv (k, v) VALUES (@k, @v) ON CONFLICT(k) DO UPDATE SET v = @v'
);

// Persist the whole in-memory state atomically (one transaction).
const persistTxn = sqlite.transaction(() => {
  for (const t of TABLES) {
    deleteAllStmts[t].run();
    const ins = insertStmts[t];
    for (const row of db[t]) ins.run({ id: row.id, data: JSON.stringify(row) });
  }
  kvUpsert.run({ k: 'settings', v: JSON.stringify(db.settings) });
  kvUpsert.run({ k: 'meta', v: JSON.stringify(db.meta) });
});

function persist() {
  persistTxn();
}

function nextId() {
  return db.meta.seq++;
}

// One-time migration: import a legacy JSON database if SQLite is still empty.
function maybeImportLegacyJson() {
  const empty =
    TABLES.every((t) => db[t].length === 0) && !db.settings.clinicName;
  if (!empty || !fs.existsSync(LEGACY_JSON)) return;
  try {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON, 'utf8'));
    for (const t of TABLES) if (Array.isArray(legacy[t])) db[t] = legacy[t];
    if (legacy.settings) db.settings = legacy.settings;
    if (legacy.meta) db.meta = legacy.meta;
    persist();
    fs.renameSync(LEGACY_JSON, LEGACY_JSON + '.imported');
    console.log('[store] Imported legacy db.json into SQLite.');
  } catch (err) {
    console.error('[store] Legacy import failed:', err.message);
  }
}

// Safe, self-contained backup copy of the SQLite database (WAL-consistent).
function backup(keep = 30) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const dest = path.join(BACKUP_DIR, `clinic-${new Date().toISOString().slice(0, 10)}.sqlite`);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    sqlite.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => /^clinic-.*\.sqlite$/.test(f)).sort();
    while (files.length > keep) fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
  } catch (err) {
    console.error('[backup:error]', err.message);
  }
}

loadAll();
maybeImportLegacyJson();

module.exports = {
  get data() {
    return db;
  },
  persist,
  nextId,
  backup,
  DATA_DIR,
  DB_FILE,
};
