// Zero-dependency API server + PostgreSQL / SQLite support + SPA static server.
import http from 'node:http';
import { existsSync, readFileSync, statSync, createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, q, tx, nextPos } from './db.mjs';
import { registerImport } from './ai-import.mjs';
import { registerFeatures } from './features.mjs';

// minimal .env loader (no dependencies); must run before modules read process.env
const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, '..', '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const PORT = Number(process.env.PORT) || 3000;
const MAX_IMAGE = 25 * 1024 * 1024;

// Initialize Database (PostgreSQL if DATABASE_URL is set, otherwise SQLite)
const dbInfo = await initDb();

async function getData() {
  const statuses = (await q('SELECT id,name,done,cancelled,active FROM statuses ORDER BY pos').all())
    .map((s) => ({ ...s, done: !!s.done, cancelled: !!s.cancelled, active: !!s.active }));
  const imgs = await q('SELECT id,task_id FROM images ORDER BY created_at, id').all();
  const byTask = new Map();
  for (const i of imgs) (byTask.get(i.task_id) ?? byTask.set(i.task_id, []).get(i.task_id)).push(i.id);
  const tasks = (await q(
    'SELECT id,parent_id,title,description,status_id,collapsed,deleted_at,kind,due_at,tags FROM tasks ORDER BY pos',
  ).all()).map((t) => ({
    id: t.id, parentId: t.parent_id, title: t.title, description: t.description,
    statusId: t.status_id, collapsed: !!t.collapsed, deletedAt: t.deleted_at,
    kind: t.kind === 'book' ? 'book' : 'task', dueAt: t.due_at || null,
    tags: t.tags || '',
    imageIds: byTask.get(t.id) ?? [],
  }));
  return { statuses, tasks };
}

async function isInDeletedBranch(id) {
  let cur = (await q('SELECT parent_id FROM tasks WHERE id=?').get(id))?.parent_id;
  while (cur) {
    const r = await q('SELECT parent_id,deleted_at FROM tasks WHERE id=?').get(cur);
    if (!r) return false;
    if (r.deleted_at) return true;
    cur = r.parent_id;
  }
  return false;
}

async function getRootTask(id) {
  let cur = id;
  let last = null;
  while (cur) {
    const t = await q('SELECT id, parent_id, kind FROM tasks WHERE id=?').get(cur);
    if (!t) break;
    last = t;
    cur = t.parent_id;
  }
  return last;
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
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
};

const routes = [];
const route = (method, path, handler) => routes.push({ method, re: new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler });

route('GET', '/api/data', async (_r, res) => send(res, 200, await getData()));

// ---- tasks ----
route('POST', '/api/tasks', async (req, res) => {
  const { parentId = null, title = '', kind = 'task', dueAt = null, tags = '' } = await readJson(req);
  const k = parentId ? 'task' : (kind === 'book' ? 'book' : 'task');
  if (k === 'book') requireAdmin(req);
  if (parentId) {
    const root = await getRootTask(parentId);
    if (root && root.kind === 'book') requireAdmin(req);
  }
  if (!title.trim()) return send(res, 400, { error: 'title required' });
  const st = await q('SELECT id FROM statuses ORDER BY pos LIMIT 1').get();
  const id = randomUUID();
  if (parentId) await q('UPDATE tasks SET collapsed=0 WHERE id=?').run(parentId);
  const pos = parentId
    ? await nextPos('tasks', 'parent_id=?', parentId)
    : await nextPos('tasks', 'parent_id IS NULL AND kind=?', k);
  await q('INSERT INTO tasks (id,parent_id,title,status_id,pos,kind,due_at,tags) VALUES (?,?,?,?,?,?,?,?)').run(
    id, parentId, title.trim(), st.id, pos, k, dueAt || null, String(tags || '').trim(),
  );
  send(res, 201, { id });
});

// ---- status propagation rules ----
const statusKind = (sid) => q('SELECT done,cancelled,active FROM statuses WHERE id=?').get(sid);

async function descendants(id) {
  return (await q(`WITH RECURSIVE d(id) AS (
      SELECT id FROM tasks WHERE parent_id=? AND deleted_at IS NULL
      UNION ALL SELECT t.id FROM tasks t JOIN d ON t.parent_id=d.id WHERE t.deleted_at IS NULL)
    SELECT id FROM d`).all(id)).map((r) => r.id);
}

async function activateAncestors(id, childIsDone) {
  const act = await q('SELECT id FROM statuses WHERE active=1 ORDER BY pos LIMIT 1').get();
  if (!act) return;
  let cur = (await q('SELECT parent_id FROM tasks WHERE id=?').get(id))?.parent_id;
  while (cur) {
    const t = await q('SELECT parent_id,status_id FROM tasks WHERE id=?').get(cur);
    if (!t) break;
    const k = await statusKind(t.status_id);
    const keep = k?.active || k?.cancelled || (k?.done && childIsDone);
    if (!keep) await q('UPDATE tasks SET status_id=? WHERE id=?').run(act.id, cur);
    cur = t.parent_id;
  }
}

async function applyStatusRules(id, statusId) {
  const k = await statusKind(statusId);
  if (!k) return;
  if (k.done) {
    const skip = new Set((await q('SELECT id FROM statuses WHERE cancelled=1').all()).map((s) => s.id));
    for (const d of await descendants(id)) {
      const cur = (await q('SELECT status_id FROM tasks WHERE id=?').get(d)).status_id;
      if (!skip.has(cur)) await q('UPDATE tasks SET status_id=? WHERE id=?').run(statusId, d);
    }
  }
  if (k.done || k.active) await activateAncestors(id, !!k.done);
}

route('POST', '/api/tasks/:id/set-subtasks', async (req, res, { id }) => {
  const root = await getRootTask(id);
  if (root && root.kind === 'book') requireAdmin(req);
  const { statusId } = await readJson(req);
  const k = await statusKind(statusId);
  if (!k) return send(res, 400, { error: 'unknown status' });
  await tx(async () => {
    for (const d of await descendants(id)) {
      await q('UPDATE tasks SET status_id=? WHERE id=?').run(statusId, d);
    }
    if (k.done || k.active) {
      const cur = (await q('SELECT status_id FROM tasks WHERE id=?').get(id))?.status_id;
      const ck = await statusKind(cur);
      const act = await q('SELECT id FROM statuses WHERE active=1 ORDER BY pos LIMIT 1').get();
      if (act && !(ck?.active || ck?.cancelled || (ck?.done && k.done))) {
        await q('UPDATE tasks SET status_id=? WHERE id=?').run(act.id, id);
      }
      await activateAncestors(id, !!k.done);
    }
  });
  send(res, 204);
});

route('PATCH', '/api/tasks/:id', async (req, res, { id }) => {
  const b = await readJson(req);
  const root = await getRootTask(id);
  if (root && root.kind === 'book') {
    const keys = Object.keys(b);
    const onlyCollapsed = keys.length === 1 && keys[0] === 'collapsed';
    if (!onlyCollapsed) requireAdmin(req);
  } else if (b.kind === 'book') {
    requireAdmin(req);
  }
  const map = { title: 'title', description: 'description', statusId: 'status_id', collapsed: 'collapsed', kind: 'kind', dueAt: 'due_at', tags: 'tags' };
  const sets = []; const vals = [];
  for (const [k, col] of Object.entries(map)) if (k in b) {
    sets.push(`${col}=?`); vals.push(k === 'collapsed' ? (b[k] ? 1 : 0) : b[k]);
  }
  await tx(async () => {
    if (sets.length) await q(`UPDATE tasks SET ${sets.join(',')} WHERE id=?`).run(...vals, id);
    if ('statusId' in b) await applyStatusRules(id, b.statusId);
  });
  send(res, 204);
});

// soft delete -> trash (tasks) or purgatory (books)
route('DELETE', '/api/tasks/:id', async (req, res, { id }) => {
  const root = await getRootTask(id);
  if (root && root.kind === 'book') requireAdmin(req);
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  await tx(async () => {
    const desc = await descendants(id);
    for (const d of [id, ...desc]) {
      await q('UPDATE tasks SET deleted_at=? WHERE id=? AND deleted_at IS NULL').run(nowStr, d);
    }
  });
  send(res, 204);
});

route('POST', '/api/tasks/:id/restore', async (req, res, { id }) => {
  const root = await getRootTask(id);
  if (root && root.kind === 'book') requireAdmin(req);
  await tx(async () => {
    if (await isInDeletedBranch(id)) {
      const pos = await nextPos('tasks', 'parent_id IS NULL');
      await q('UPDATE tasks SET parent_id=NULL, pos=? WHERE id=?').run(pos, id);
    }
    const desc = await descendants(id);
    for (const d of [id, ...desc]) {
      await q('UPDATE tasks SET deleted_at=NULL WHERE id=?').run(d);
    }
  });
  send(res, 204);
});

route('DELETE', '/api/trash/:id', async (req, res, { id }) => {
  const root = await getRootTask(id);
  if (root && root.kind === 'book') requireAdmin(req);
  await tx(async () => {
    const desc = await descendants(id);
    for (const d of [id, ...desc]) {
      await q('DELETE FROM images WHERE task_id=?').run(d);
      await q('DELETE FROM tasks WHERE id=?').run(d);
    }
  });
  send(res, 204);
});

route('DELETE', '/api/trash', async (_r, res) => {
  await tx(async () => {
    const rows = await q(`
      WITH RECURSIVE d(id) AS (
        SELECT id FROM tasks WHERE deleted_at IS NOT NULL AND kind<>'book'
        UNION ALL
        SELECT t.id FROM tasks t JOIN d ON t.parent_id=d.id
      )
      SELECT DISTINCT id FROM d
    `).all();
    for (const r of rows) {
      await q('DELETE FROM images WHERE task_id=?').run(r.id);
      await q('DELETE FROM tasks WHERE id=?').run(r.id);
    }
  });
  send(res, 204);
});

route('DELETE', '/api/purgatory', async (req, res) => {
  requireAdmin(req);
  await tx(async () => {
    const rows = await q(`
      WITH RECURSIVE d(id) AS (
        SELECT id FROM tasks WHERE deleted_at IS NOT NULL AND kind='book'
        UNION ALL
        SELECT t.id FROM tasks t JOIN d ON t.parent_id=d.id
      )
      SELECT DISTINCT id FROM d
    `).all();
    for (const r of rows) {
      await q('DELETE FROM images WHERE task_id=?').run(r.id);
      await q('DELETE FROM tasks WHERE id=?').run(r.id);
    }
  });
  send(res, 204);
});

// ---- images ----
route('POST', '/api/tasks/:id/images', async (req, res, { id }, url) => {
  const root = await getRootTask(id);
  if (root && root.kind === 'book') requireAdmin(req);
  const mime = (req.headers['content-type'] || '').split(';')[0];
  if (!mime.startsWith('image/')) return send(res, 415, { error: 'image/* required' });
  if (!(await q('SELECT 1 FROM tasks WHERE id=?').get(id))) return send(res, 404, { error: 'no task' });
  const data = await readBody(req, MAX_IMAGE);
  const name = url.searchParams.get('name') || 'image';
  await q('INSERT INTO images (id,task_id,name,mime,data) VALUES (?,?,?,?,?)').run(
    randomUUID(), id, name, mime, data,
  );
  send(res, 201);
});

route('GET', '/api/images/:id', async (_r, res, { id }) => {
  const i = await q('SELECT mime,data FROM images WHERE id=?').get(id);
  if (!i) return send(res, 404, { error: 'not found' });
  send(res, 200, Buffer.from(i.data), { 'Content-Type': i.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
});

route('DELETE', '/api/images/:id', async (req, res, { id }) => {
  const img = await q('SELECT task_id FROM images WHERE id=?').get(id);
  if (img) {
    const root = await getRootTask(img.task_id);
    if (root && root.kind === 'book') requireAdmin(req);
  }
  await q('DELETE FROM images WHERE id=?').run(id);
  send(res, 204);
});

const adminPass = () => process.env.ADMIN_PASSWORD || 'admin';
function requireAdmin(req) {
  if ((req.headers['x-admin-key'] || '') !== adminPass()) {
    const err = new Error('Admin role required');
    err.status = 403;
    throw err;
  }
}

// ---- statuses ----
route('POST', '/api/statuses', async (req, res) => {
  requireAdmin(req);
  const { name = '' } = await readJson(req);
  if (!name.trim()) return send(res, 400, { error: 'name required' });
  const pos = await nextPos('statuses');
  await q('INSERT INTO statuses (id,name,done,pos) VALUES (?,?,0,?)').run(randomUUID(), name.trim(), pos);
  send(res, 201);
});

route('PATCH', '/api/statuses/:id', async (req, res, { id }) => {
  requireAdmin(req);
  const b = await readJson(req);
  if ('name' in b) await q('UPDATE statuses SET name=? WHERE id=?').run(String(b.name), id);
  for (const flag of ['done', 'cancelled', 'active']) {
    if (flag in b && b[flag]) await q('UPDATE statuses SET done=0, cancelled=0, active=0 WHERE id=?').run(id);
    if (flag in b) await q(`UPDATE statuses SET ${flag}=? WHERE id=?`).run(b[flag] ? 1 : 0, id);
  }
  send(res, 204);
});

route('POST', '/api/statuses/:id/move', async (req, res, { id }) => {
  requireAdmin(req);
  const { dir } = await readJson(req);
  await tx(async () => {
    const list = (await q('SELECT id FROM statuses ORDER BY pos').all()).map((s) => s.id);
    const i = list.indexOf(id), j = i + (dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    for (let p = 0; p < list.length; p++) {
      await q('UPDATE statuses SET pos=? WHERE id=?').run(p, list[p]);
    }
  });
  send(res, 204);
});

route('DELETE', '/api/statuses/:id', async (req, res, { id }) => {
  requireAdmin(req);
  await tx(async () => {
    const rest = await q('SELECT id FROM statuses WHERE id<>? ORDER BY pos').all(id);
    if (!rest.length) return;
    await q('UPDATE tasks SET status_id=? WHERE status_id=?').run(rest[0].id, id);
    await q('DELETE FROM statuses WHERE id=?').run(id);
  });
  send(res, 204);
});

registerImport({ route, send, readBody, readJson, q, tx, nextPos, maxBody: MAX_IMAGE * 4, requireAdmin });
registerFeatures({ route, send, readJson, q, tx, nextPos, descendants, requireAdmin, getRootTask });

// Static file serving for production (Single Page Application fallback to index.html)
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function tryServeStatic(req, res, url) {
  const distDir = existsSync(join(here, '..', 'dist', 'tasker', 'browser'))
    ? join(here, '..', 'dist', 'tasker', 'browser')
    : existsSync(join(here, '..', 'dist', 'tasker'))
    ? join(here, '..', 'dist', 'tasker')
    : null;

  if (!distDir || req.method !== 'GET') return false;

  const safePath = join(distDir, decodeURIComponent(url.pathname));
  if (!safePath.startsWith(distDir)) return false; // Prevent path traversal

  if (existsSync(safePath) && statSync(safePath).isFile()) {
    const ext = extname(safePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    createReadStream(safePath).pipe(res);
    return true;
  }

  // SPA fallback
  const indexPath = join(distDir, 'index.html');
  if (existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    createReadStream(indexPath).pipe(res);
    return true;
  }

  return false;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = r.re.exec(url.pathname);
      if (m) return await r.handler(req, res, m.groups ?? {}, url);
    }
    if (tryServeStatic(req, res, url)) return;
    send(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: String(e.message) });
  }
}).listen(PORT, () => console.log(`tasker running on http://localhost:${PORT} [${dbInfo.isPg ? 'PostgreSQL' : 'SQLite'}: ${dbInfo.target}]`));
