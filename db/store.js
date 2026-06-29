/**
 * Tiny zero-dependency JSON file database.
 * Keeps everything in one JSON file under /data. Perfect for a single
 * clinic's traffic and makes deployment trivial (no native modules, no
 * external DB server). All writes are flushed to disk synchronously.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULTS = {
  admins: [],
  doctors: [],
  services: [],
  appointments: [],
  settings: {},
  meta: { seq: 1 },
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULTS, null, 2));
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(raw);
    // backfill any missing collections so older db files keep working
    return { ...JSON.parse(JSON.stringify(DEFAULTS)), ...data };
  } catch (err) {
    console.error('Could not read db file, starting fresh:', err.message);
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

let db = load();

function persist() {
  ensureDir();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE); // atomic-ish write
}

function nextId() {
  const id = db.meta.seq++;
  persist();
  return id;
}

module.exports = {
  get data() {
    return db;
  },
  persist,
  nextId,
  reload() {
    db = load();
  },
};
