// Zero-dependency API server: node:http + built-in node:sqlite (Node >= 22.5).
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerImport } from './ai-import.mjs';
import { migrateFeatures, registerFeatures } from './features.mjs';

// minimal .env loader (no dependencies); must run before ai-import reads process.env
const envFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const here = dirname(fileURLToPath(import.meta.url));

const dataDir = process.env.TASKER_DATA_DIR || join(here, 'data');
mkdirSync(dataDir, { recursive: true });
const PORT = Number(process.env.PORT) || 3000;
const MAX_IMAGE = 25 * 1024 * 1024;

const db = new DatabaseSync(join(dataDir, 'tasker.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS statuses (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, pos INTEGER NOT NULL
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_images_task ON images(task_id);
`);

// migration: statuses.cancelled (excluded from progress)
if (!db.prepare('PRAGMA table_info(statuses)').all().some((c) => c.name === 'cancelled')) {
  db.exec('ALTER TABLE statuses ADD COLUMN cancelled INTEGER NOT NULL DEFAULT 0');
  if (db.prepare('SELECT COUNT(*) c FROM statuses').get().c > 0) {
    db.prepare('INSERT INTO statuses (id,name,done,pos,cancelled) VALUES (?,?,0,(SELECT COALESCE(MAX(pos),-1)+1 FROM statuses),1)').run(randomUUID(), 'cancelled');
  }
}

// migration: statuses.active ("in progress" semantics: propagates up to parent tasks)
if (!db.prepare('PRAGMA table_info(statuses)').all().some((c) => c.name === 'active')) {
  db.exec('ALTER TABLE statuses ADD COLUMN active INTEGER NOT NULL DEFAULT 0');
  db.exec("UPDATE statuses SET active=1 WHERE lower(name) IN ('in progress','in-progress','doing')");
}
if (db.prepare('SELECT COUNT(*) c FROM statuses').get().c === 0) {
  const ins = db.prepare('INSERT INTO statuses (id,name,done,pos,cancelled,active) VALUES (?,?,?,?,?,?)');
  [['todo', 0, 0, 0], ['in progress', 0, 0, 1], ['blocked', 0, 0, 0], ['done', 1, 0, 0], ['cancelled', 0, 1, 0]].forEach(([n, d, c, a], i) =>
    ins.run(randomUUID(), n, d, i, c, a));
}
migrateFeatures(db);

const q = (sql) => db.prepare(sql);
const tx = (fn) => {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
};
const nextPos = (table, where = '1=1', ...args) =>
  (q(`SELECT COALESCE(MAX(pos),-1)+1 p FROM ${table} WHERE ${where}`).get(...args).p);

function getData() {
  const statuses = q('SELECT id,name,done,cancelled,active FROM statuses ORDER BY pos').all()
    .map((s) => ({ ...s, done: !!s.done, cancelled: !!s.cancelled, active: !!s.active }));
  const imgs = q('SELECT id,task_id FROM images ORDER BY created_at, rowid').all();
  const byTask = new Map();
  for (const i of imgs) (byTask.get(i.task_id) ?? byTask.set(i.task_id, []).get(i.task_id)).push(i.id);
  const tasks = q(
    'SELECT id,parent_id,title,description,status_id,collapsed,deleted_at FROM tasks ORDER BY pos',
  ).all().map((t) => ({
    id: t.id, parentId: t.parent_id, title: t.title, description: t.description,
    statusId: t.status_id, collapsed: !!t.collapsed, deletedAt: t.deleted_at,
    imageIds: byTask.get(t.id) ?? [],
  }));
  return { statuses, tasks };
}

function isInDeletedBranch(id) {
  let cur = q('SELECT parent_id FROM tasks WHERE id=?').get(id)?.parent_id;
  while (cur) {
    const r = q('SELECT parent_id,deleted_at FROM tasks WHERE id=?').get(cur);
    if (!r) return false;
    if (r.deleted_at) return true;
    cur = r.parent_id;
  }
  return false;
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const readJson = async (req) => { const b = await readBody(req); return b.length ? JSON.parse(b.toString('utf8')) : {}; };

const send = (res, code, body, headers = {}) => {
  if (body === undefined) { res.writeHead(code, headers); return res.end(); }
  if (Buffer.isBuffer(body)) { res.writeHead(code, headers); return res.end(body); }
  res.writeHead(code, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};

const routes = [];
const route = (method, path, handler) => routes.push({ method, re: new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler });

route('GET', '/api/data', (_r, res) => send(res, 200, getData()));

// ---- tasks ----
route('POST', '/api/tasks', async (req, res) => {
  const { parentId = null, title = '' } = await readJson(req);
  if (!title.trim()) return send(res, 400, { error: 'title required' });
  const st = q('SELECT id FROM statuses ORDER BY pos LIMIT 1').get();
  const id = randomUUID();
  if (parentId) q('UPDATE tasks SET collapsed=0 WHERE id=?').run(parentId);
  q('INSERT INTO tasks (id,parent_id,title,status_id,pos) VALUES (?,?,?,?,?)').run(
    id, parentId, title.trim(), st.id,
    parentId ? nextPos('tasks', 'parent_id=?', parentId) : nextPos('tasks', 'parent_id IS NULL'));
  send(res, 201, { id });
});

// ---- status propagation rules ----
// 1) task becomes "done"  -> all its subtasks become that done status (cancelled ones are left alone)
// 2) a task becomes "done" or "active" -> every ancestor becomes the first "active" status
const statusKind = (sid) => q('SELECT done,cancelled,active FROM statuses WHERE id=?').get(sid);

function descendants(id) {
  return q(`WITH RECURSIVE d(id) AS (
      SELECT id FROM tasks WHERE parent_id=? AND deleted_at IS NULL
      UNION ALL SELECT t.id FROM tasks t JOIN d ON t.parent_id=d.id WHERE t.deleted_at IS NULL)
    SELECT id FROM d`).all(id).map((r) => r.id);
}

function activateAncestors(id, childIsDone) {
  const act = q('SELECT id FROM statuses WHERE active=1 ORDER BY pos LIMIT 1').get();
  if (!act) return;
  let cur = q('SELECT parent_id FROM tasks WHERE id=?').get(id)?.parent_id;
  while (cur) {
    const t = q('SELECT parent_id,status_id FROM tasks WHERE id=?').get(cur);
    if (!t) break;
    const k = statusKind(t.status_id);
    const keep = k?.active || k?.cancelled || (k?.done && childIsDone);
    if (!keep) q('UPDATE tasks SET status_id=? WHERE id=?').run(act.id, cur);
    cur = t.parent_id;
  }
}

function applyStatusRules(id, statusId) {
  const k = statusKind(statusId);
  if (!k) return;
  if (k.done) {
    const skip = new Set(q('SELECT id FROM statuses WHERE cancelled=1').all().map((s) => s.id));
    for (const d of descendants(id)) {
      const cur = q('SELECT status_id FROM tasks WHERE id=?').get(d).status_id;
      if (!skip.has(cur)) q('UPDATE tasks SET status_id=? WHERE id=?').run(statusId, d);
    }
  }
  if (k.done || k.active) activateAncestors(id, !!k.done);
}

route('POST', '/api/tasks/:id/set-subtasks', async (req, res, { id }) => {
  const { statusId } = await readJson(req);
  const k = statusKind(statusId);
  if (!k) return send(res, 400, { error: 'unknown status' });
  tx(() => {
    for (const d of descendants(id)) q('UPDATE tasks SET status_id=? WHERE id=?').run(statusId, d);
    if (k.done || k.active) {
      // the task itself is part of the chain that becomes "in progress"
      const cur = q('SELECT status_id FROM tasks WHERE id=?').get(id)?.status_id;
      const ck = statusKind(cur);
      const act = q('SELECT id FROM statuses WHERE active=1 ORDER BY pos LIMIT 1').get();
      if (act && !(ck?.active || ck?.cancelled || (ck?.done && k.done))) q('UPDATE tasks SET status_id=? WHERE id=?').run(act.id, id);
      activateAncestors(id, !!k.done);
    }
  });
  send(res, 204);
});
route('PATCH', '/api/tasks/:id', async (req, res, { id }) => {
  const b = await readJson(req);
  const map = { title: 'title', description: 'description', statusId: 'status_id', collapsed: 'collapsed' };
  const sets = []; const vals = [];
  for (const [k, col] of Object.entries(map)) if (k in b) {
    sets.push(`${col}=?`); vals.push(k === 'collapsed' ? (b[k] ? 1 : 0) : b[k]);
  }
  tx(() => {
    if (sets.length) q(`UPDATE tasks SET ${sets.join(',')} WHERE id=?`).run(...vals, id);
    if ('statusId' in b) applyStatusRules(id, b.statusId);
  });
  send(res, 204);
});

// soft delete -> trash
route('DELETE', '/api/tasks/:id', (_r, res, { id }) => {
  q("UPDATE tasks SET deleted_at=datetime('now') WHERE id=? AND deleted_at IS NULL").run(id);
  send(res, 204);
});

route('POST', '/api/tasks/:id/restore', (_r, res, { id }) => {
  tx(() => {
    // if an ancestor is still in trash, move to root so the task is visible
    if (isInDeletedBranch(id)) q('UPDATE tasks SET parent_id=NULL, pos=? WHERE id=?').run(nextPos('tasks', 'parent_id IS NULL'), id);
    q('UPDATE tasks SET deleted_at=NULL WHERE id=?').run(id);
  });
  send(res, 204);
});

route('DELETE', '/api/trash/:id', (_r, res, { id }) => {
  q('DELETE FROM tasks WHERE id=? AND deleted_at IS NOT NULL').run(id); // cascades to children + images
  send(res, 204);
});
route('DELETE', '/api/trash', (_r, res) => {
  q('DELETE FROM tasks WHERE deleted_at IS NOT NULL').run();
  send(res, 204);
});

// ---- images ----
route('POST', '/api/tasks/:id/images', async (req, res, { id }, url) => {
  const mime = (req.headers['content-type'] || '').split(';')[0];
  if (!mime.startsWith('image/')) return send(res, 415, { error: 'image/* required' });
  if (!q('SELECT 1 FROM tasks WHERE id=?').get(id)) return send(res, 404, { error: 'no task' });
  const data = await readBody(req, MAX_IMAGE);
  const imgId = randomUUID();
  q('INSERT INTO images (id,task_id,name,mime,data) VALUES (?,?,?,?,?)').run(
    imgId, id, url.searchParams.get('name') || 'image', mime, data);
  send(res, 201, { id: imgId });
});
route('GET', '/api/images/:id', (_r, res, { id }) => {
  const i = q('SELECT mime,data FROM images WHERE id=?').get(id);
  if (!i) return send(res, 404, { error: 'not found' });
  send(res, 200, Buffer.from(i.data), { 'Content-Type': i.mime, 'Cache-Control': 'private, max-age=31536000, immutable' });
});
route('DELETE', '/api/images/:id', (_r, res, { id }) => {
  q('DELETE FROM images WHERE id=?').run(id);
  send(res, 204);
});

// ---- statuses ----
route('POST', '/api/statuses', async (req, res) => {
  const { name = '' } = await readJson(req);
  if (!name.trim()) return send(res, 400, { error: 'name required' });
  q('INSERT INTO statuses (id,name,done,pos) VALUES (?,?,0,?)').run(randomUUID(), name.trim(), nextPos('statuses'));
  send(res, 201);
});
route('PATCH', '/api/statuses/:id', async (req, res, { id }) => {
  const b = await readJson(req);
  if ('name' in b) q('UPDATE statuses SET name=? WHERE id=?').run(String(b.name), id);
  // done / cancelled / active are mutually exclusive
  for (const flag of ['done', 'cancelled', 'active']) {
    if (flag in b && b[flag]) q("UPDATE statuses SET done=0, cancelled=0, active=0 WHERE id=?").run(id);
    if (flag in b) q(`UPDATE statuses SET ${flag}=? WHERE id=?`).run(b[flag] ? 1 : 0, id);
  }
  send(res, 204);
});
route('POST', '/api/statuses/:id/move', async (req, res, { id }) => {
  const { dir } = await readJson(req);
  tx(() => {
    const list = q('SELECT id FROM statuses ORDER BY pos').all().map((s) => s.id);
    const i = list.indexOf(id), j = i + (dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((sid, p) => q('UPDATE statuses SET pos=? WHERE id=?').run(p, sid));
  });
  send(res, 204);
});
route('DELETE', '/api/statuses/:id', (_r, res, { id }) => {
  tx(() => {
    const rest = q('SELECT id FROM statuses WHERE id<>? ORDER BY pos').all(id);
    if (!rest.length) return;
    q('UPDATE tasks SET status_id=? WHERE status_id=?').run(rest[0].id, id);
    q('DELETE FROM statuses WHERE id=?').run(id);
  });
  send(res, 204);
});

registerImport({ route, send, readBody, readJson, q, tx, nextPos, maxBody: MAX_IMAGE * 2 });
registerFeatures({ route, send, readJson, q, tx, nextPos, descendants });

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = r.re.exec(url.pathname);
      if (m) return await r.handler(req, res, m.groups ?? {}, url);
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: String(e.message) });
  }
}).listen(PORT, () => console.log(`tasker api on http://localhost:${PORT}  db: ${join(dataDir, 'tasker.db')}`));
