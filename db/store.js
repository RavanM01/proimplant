/**
 * Tiny zero-dependency JSON file database.
 * Keeps everything in one JSON file under /data. Perfect for a single
 * clinic's traffic and makes deployment trivial (no native modules, no
 * external DB server). All writes are flushed to disk synchronously.
 *
 * NOTE: this store assumes a SINGLE server process. Do not run more than one
 * instance against the same data file (see README — keep instances = 1).
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

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

const db = load();

function persist() {
  ensureDir();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE); // atomic-ish write
}

function nextId() {
  return db.meta.seq++;
}

// Daily rotating backup of the database file (keeps the last `keep` days).
function backup(keep = 30) {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    fs.copyFileSync(DB_FILE, path.join(BACKUP_DIR, `db-${stamp}.json`));
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => /^db-.*\.json$/.test(f)).sort();
    while (files.length > keep) fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
  } catch (err) {
    console.error('[backup:error]', err.message);
  }
}

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
