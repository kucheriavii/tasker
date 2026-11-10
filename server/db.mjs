// Database abstraction supporting PostgreSQL (via DATABASE_URL) and SQLite (fallback via node:sqlite).
import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const { Pool } = pg;
const here = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.TASKER_DATA_DIR || join(here, 'data');
const txStorage = new AsyncLocalStorage();

let isPg = false;
let pool = null;
let sqliteDb = null;

export function toPg(sql) {
  let idx = 0;
  return sql
    .replace(/\?/g, () => `$${++idx}`)
    .replace(/,\s*rowid\b/gi, ', id')
    .replace(/\browid\b/gi, 'id')
    .replace(/datetime\('now'\)/gi, "TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')");
}

export const q = (sql) => ({
  all: async (...params) => {
    if (isPg) {
      const client = txStorage.getStore() || pool;
      const res = await client.query(toPg(sql), params);
      return res.rows;
    }
    const stmt = sqliteDb.prepare(sql);
    return stmt.all(...params);
  },
  get: async (...params) => {
    if (isPg) {
      const client = txStorage.getStore() || pool;
      const res = await client.query(toPg(sql), params);
      return res.rows[0];
    }
    const stmt = sqliteDb.prepare(sql);
    return stmt.get(...params);
  },
  run: async (...params) => {
    if (isPg) {
      const client = txStorage.getStore() || pool;
      const res = await client.query(toPg(sql), params);
      return { changes: res.rowCount };
    }
    const stmt = sqliteDb.prepare(sql);
    const r = stmt.run(...params);
    return { changes: r.changes };
  },
});

export async function tx(fn) {
  if (isPg) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await txStorage.run(client, () => fn());
      await client.query('COMMIT');
      return res;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  sqliteDb.exec('BEGIN');
  try {
    const res = await fn();
    sqliteDb.exec('COMMIT');
    return res;
  } catch (e) {
    sqliteDb.exec('ROLLBACK');
    throw e;
  }
}

export async function nextPos(table, where = '1=1', ...args) {
  const row = await q(`SELECT COALESCE(MAX(pos),-1)+1 p FROM ${table} WHERE ${where}`).get(...args);
  return Number(row?.p ?? 0);
}

const DEFAULT_STATUSES = [
  ['todo', 0, 0, 0],
  ['in progress', 0, 0, 1],
  ['blocked', 0, 0, 0],
  ['done', 1, 0, 0],
  ['cancelled', 0, 1, 0],
];

export async function initDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && /^(postgres|postgresql):\/\//i.test(databaseUrl)) {
    isPg = true;
    pool = new Pool({ connectionString: databaseUrl });
    // Test connection
    const client = await pool.connect();
    client.release();

    // Postgres schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS statuses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        pos INTEGER NOT NULL,
        cancelled INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status_id TEXT NOT NULL,
        collapsed INTEGER NOT NULL DEFAULT 0,
        pos INTEGER NOT NULL,
        deleted_at TEXT,
        created_at TEXT NOT NULL DEFAULT (TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')),
        kind TEXT NOT NULL DEFAULT 'task',
        due_at TEXT,
        tags TEXT NOT NULL DEFAULT '',
        user_id TEXT
      );
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id TEXT;
      CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        mime TEXT NOT NULL,
        data BYTEA NOT NULL,
        created_at TEXT NOT NULL DEFAULT (TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
      );
      CREATE INDEX IF NOT EXISTS idx_images_task ON images(task_id);
      CREATE TABLE IF NOT EXISTS library_items (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL DEFAULT 'book',
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL DEFAULT '',
        tree_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
      );
    `);

    // Auto-seed or auto-migrate from SQLite
    const countRes = await pool.query('SELECT COUNT(*) c FROM statuses');
    if (Number(countRes.rows[0]?.c ?? 0) === 0) {
      const sqlitePath = join(dataDir, 'tasker.db');
      if (existsSync(sqlitePath)) {
        await migrateFromSqlite(sqlitePath);
      } else {
        for (let i = 0; i < DEFAULT_STATUSES.length; i++) {
          const [n, d, c, a] = DEFAULT_STATUSES[i];
          await pool.query(
            'INSERT INTO statuses (id, name, done, pos, cancelled, active) VALUES ($1,$2,$3,$4,$5,$6)',
            [randomUUID(), n, d, i, c, a],
          );
        }
      }
    }
    return { isPg: true, target: databaseUrl.replace(/:[^:@]+@/, ':***@') };
  }

  // SQLite fallback
  mkdirSync(dataDir, { recursive: true });
  sqliteDb = new DatabaseSync(join(dataDir, 'tasker.db'));
  sqliteDb.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS statuses (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, pos INTEGER NOT NULL,
      cancelled INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status_id TEXT NOT NULL,
      collapsed INTEGER NOT NULL DEFAULT 0,
      pos INTEGER NOT NULL,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      kind TEXT NOT NULL DEFAULT 'task',
      due_at TEXT,
      tags TEXT NOT NULL DEFAULT '',
      user_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      mime TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_images_task ON images(task_id);
    CREATE TABLE IF NOT EXISTS library_items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'book',
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      tree_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  try { sqliteDb.exec("ALTER TABLE tasks ADD COLUMN tags TEXT NOT NULL DEFAULT ''"); } catch {}
  try { sqliteDb.exec("ALTER TABLE tasks ADD COLUMN user_id TEXT"); } catch {}
  try { sqliteDb.exec("CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id)"); } catch {}

  const stCount = sqliteDb.prepare('SELECT COUNT(*) c FROM statuses').get().c;
  if (stCount === 0) {
    const ins = sqliteDb.prepare('INSERT INTO statuses (id,name,done,pos,cancelled,active) VALUES (?,?,?,?,?,?)');
    DEFAULT_STATUSES.forEach(([n, d, c, a], i) => ins.run(randomUUID(), n, d, i, c, a));
  }

  return { isPg: false, target: join(dataDir, 'tasker.db') };
}

async function migrateFromSqlite(sqlitePath) {
  try {
    console.log(`[migration] Found SQLite database at ${sqlitePath}, importing into PostgreSQL...`);
    const sdb = new DatabaseSync(sqlitePath);
    const statuses = sdb.prepare('SELECT * FROM statuses').all();
    for (const s of statuses) {
      await pool.query(
        'INSERT INTO statuses (id, name, done, pos, cancelled, active) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING',
        [s.id, s.name, s.done ?? 0, s.pos ?? 0, s.cancelled ?? 0, s.active ?? 0],
      );
    }
    const tasks = sdb.prepare('SELECT * FROM tasks').all();
    for (const t of tasks) {
      await pool.query(
        `INSERT INTO tasks (id, parent_id, title, description, status_id, collapsed, pos, deleted_at, created_at, kind, due_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [t.id, t.parent_id, t.title, t.description ?? '', t.status_id, t.collapsed ?? 0, t.pos ?? 0, t.deleted_at, t.created_at, t.kind ?? 'task', t.due_at],
      );
    }
    const images = sdb.prepare('SELECT * FROM images').all();
    for (const img of images) {
      await pool.query(
        `INSERT INTO images (id, task_id, name, mime, data, created_at)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [img.id, img.task_id, img.name, img.mime, Buffer.from(img.data), img.created_at],
      );
    }
    const libs = sdb.prepare('SELECT * FROM library_items').all();
    for (const l of libs) {
      await pool.query(
        `INSERT INTO library_items (id, kind, title, description, source_url, tree_json, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [l.id, l.kind ?? 'book', l.title, l.description ?? '', l.source_url ?? '', l.tree_json, l.created_at],
      );
    }
    console.log(`[migration] Successfully migrated ${statuses.length} statuses, ${tasks.length} tasks, ${images.length} images, ${libs.length} library items into PostgreSQL.`);
  } catch (err) {
    console.error('[migration] Error importing SQLite data into PostgreSQL:', err);
  }
}
