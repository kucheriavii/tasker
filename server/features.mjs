// Drag & drop move, Admin auth, shared Library (books/playlists/courses), and AI Task Generator.
import { randomUUID } from 'node:crypto';

const fail = (msg, status = 400) => Object.assign(new Error(msg), { status });
const adminPass = () => process.env.ADMIN_PASSWORD || 'admin';

const AI_TASK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          children: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                description: { type: 'STRING' },
              },
              required: ['title'],
            },
          },
        },
        required: ['title', 'children'],
      },
    },
  },
  required: ['title', 'description', 'items'],
};

async function generateAiTask({ topic, details }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw fail('GEMINI_API_KEY is not set in .env', 400);
  const prompt =
    'You are an expert mentor. The user wants to learn or accomplish a topic from scratch and needs a clear, step-by-step task breakdown.\n' +
    'Build a structured task tree in the exact order it must be studied/completed (prerequisites first):\n' +
    '- "title": concise root task title (in the same language as the user request)\n' +
    '- "description": short overview of how to approach this goal\n' +
    '- "items": 4 to 7 sequential sections/stages in strict learning order (e.g. "1. ...", "2. ..."), each with a short "description" and 3 to 6 concrete "children" subtasks (topics, exercises, or steps to complete) with brief helpful descriptions.\n' +
    `TOPIC / GOAL: ${topic}\n` +
    (details ? `EXTRA CONTEXT / LEVEL: ${details}\n` : '');

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: AI_TASK_SCHEMA, temperature: 0.25 },
      }),
      signal: AbortSignal.timeout(90000),
    },
  );
  if (!r.ok) throw fail(`Gemini error ${r.status}: ${(await r.text()).slice(0, 300)}`, 502);
  const j = await r.json();
  const raw = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  try {
    return JSON.parse(raw);
  } catch {
    throw fail('Model returned an unreadable answer, try again.', 502);
  }
}

export function migrateFeatures() {}

export function registerFeatures({ route, send, readJson, q, tx, nextPos, descendants }) {
  const requireAdmin = (req) => {
    if ((req.headers['x-admin-key'] || '') !== adminPass()) {
      throw fail('Admin role required to add or edit library content.', 403);
    }
  };

  // ---- Admin role check ----
  route('POST', '/api/auth/admin', async (req, res) => {
    const { password = '' } = await readJson(req);
    if (password !== adminPass()) return send(res, 403, { error: 'Invalid admin password' });
    send(res, 200, { ok: true });
  });

  // ---- Drag & Drop move / reparent / reorder ----
  route('POST', '/api/tasks/:id/move', async (req, res, { id }) => {
    const { targetId = null, mode = 'after', rootKind = null } = await readJson(req);
    const task = await q('SELECT id,parent_id,kind FROM tasks WHERE id=? AND deleted_at IS NULL').get(id);
    if (!task) return send(res, 404, { error: 'task not found' });
    if (targetId === id) return send(res, 204);

    await tx(async () => {
      if (targetId) {
        const desc = new Set(await descendants(id));
        if (desc.has(targetId)) throw fail('Cannot move a task into its own subtask', 400);
      }

      if (mode === 'inside') {
        if (!targetId) throw fail('targetId required for inside mode', 400);
        const target = await q('SELECT id FROM tasks WHERE id=? AND deleted_at IS NULL').get(targetId);
        if (!target) throw fail('target not found', 404);
        await q('UPDATE tasks SET collapsed=0 WHERE id=?').run(targetId);
        const pos = await nextPos('tasks', 'parent_id=?', targetId);
        await q("UPDATE tasks SET parent_id=?, pos=?, kind='task' WHERE id=?").run(targetId, pos, id);
        return;
      }

      let newParentId = null;
      let newKind = rootKind || task.kind || 'task';
      if (targetId) {
        const target = await q('SELECT id,parent_id,kind FROM tasks WHERE id=? AND deleted_at IS NULL').get(targetId);
        if (!target) throw fail('target not found', 404);
        newParentId = target.parent_id;
        newKind = newParentId ? 'task' : (target.kind || 'task');
      }

      const siblings = (
        newParentId
          ? await q('SELECT id FROM tasks WHERE parent_id=? AND deleted_at IS NULL AND id<>? ORDER BY pos').all(newParentId, id)
          : await q('SELECT id FROM tasks WHERE parent_id IS NULL AND kind=? AND deleted_at IS NULL AND id<>? ORDER BY pos').all(newKind, id)
      ).map((r) => r.id);

      const idx = targetId ? siblings.indexOf(targetId) : -1;
      if (idx === -1) {
        siblings.push(id);
      } else {
        siblings.splice(mode === 'before' ? idx : idx + 1, 0, id);
      }

      await q('UPDATE tasks SET parent_id=?, kind=? WHERE id=?').run(newParentId, newKind, id);
      for (let i = 0; i < siblings.length; i++) {
        await q('UPDATE tasks SET pos=? WHERE id=?').run(i, siblings[i]);
      }
    });

    send(res, 204);
  });

  // ---- Shared Library (books, playlists, courses) — unique by title ----
  const countNodes = (items) =>
    (items || []).reduce((n, it) => n + 1 + countNodes(it.children), 0);

  const hasDuplicateName = async (title, excludeId = null) => {
    const row = excludeId
      ? await q('SELECT id FROM library_items WHERE lower(trim(title)) = lower(trim(?)) AND id <> ?').get(title, excludeId)
      : await q('SELECT id FROM library_items WHERE lower(trim(title)) = lower(trim(?))').get(title);
    return !!row;
  };

  route('GET', '/api/library', async (_req, res) => {
    const rows = await q('SELECT id,kind,title,description,source_url,tree_json,created_at FROM library_items ORDER BY created_at DESC, id DESC').all();
    const list = rows.map((r) => {
      let items = [];
      try { items = JSON.parse(r.tree_json); } catch {}
      return {
        id: r.id,
        kind: r.kind,
        title: r.title,
        description: r.description,
        sourceUrl: r.source_url,
        createdAt: r.created_at,
        totalItems: countNodes(items),
        items,
      };
    });
    send(res, 200, list);
  });

  route('POST', '/api/library', async (req, res) => {
    const { kind = 'book', title = '', description = '', sourceUrl = '', items = [] } = await readJson(req);
    const cleanTitle = title.trim();
    if (!cleanTitle) return send(res, 400, { error: 'title required' });
    if (await hasDuplicateName(cleanTitle)) {
      return send(res, 409, { error: `"${cleanTitle}" is already in the library (duplicate names are not allowed).` });
    }
    const id = randomUUID();
    await q('INSERT INTO library_items (id,kind,title,description,source_url,tree_json) VALUES (?,?,?,?,?,?)').run(
      id, kind, cleanTitle, description.trim(), sourceUrl.trim(), JSON.stringify(items || []),
    );
    send(res, 201, { id });
  });

  route('PATCH', '/api/library/:id', async (req, res, { id }) => {
    requireAdmin(req);
    const existing = await q('SELECT id,kind,title,description,source_url,tree_json FROM library_items WHERE id=?').get(id);
    if (!existing) return send(res, 404, { error: 'library item not found' });
    const b = await readJson(req);
    const title = ('title' in b ? String(b.title).trim() : existing.title) || existing.title;
    if (await hasDuplicateName(title, id)) {
      return send(res, 409, { error: `"${title}" is already in the library (duplicate names are not allowed).` });
    }
    const kind = 'kind' in b ? String(b.kind) : existing.kind;
    const description = 'description' in b ? String(b.description).trim() : existing.description;
    const sourceUrl = 'sourceUrl' in b ? String(b.sourceUrl).trim() : existing.source_url;
    const treeJson = 'items' in b ? JSON.stringify(b.items || []) : existing.tree_json;
    await q('UPDATE library_items SET kind=?, title=?, description=?, source_url=?, tree_json=? WHERE id=?').run(
      kind, title, description, sourceUrl, treeJson, id,
    );
    send(res, 204);
  });

  route('POST', '/api/library/from-task/:id', async (req, res, { id }) => {
    const { kind = 'book', sourceUrl = '' } = await readJson(req);
    const root = await q('SELECT id,title,description FROM tasks WHERE id=? AND deleted_at IS NULL').get(id);
    if (!root) return send(res, 404, { error: 'task not found' });
    if (await hasDuplicateName(root.title)) {
      return send(res, 409, { error: `"${root.title}" is already in the library (duplicate names are not allowed).` });
    }
    const buildChildren = async (pid) => {
      const children = await q('SELECT id,title,description FROM tasks WHERE parent_id=? AND deleted_at IS NULL ORDER BY pos').all(pid);
      const res = [];
      for (const c of children) {
        res.push({ title: c.title, description: c.description || '', children: await buildChildren(c.id) });
      }
      return res;
    };
    const items = await buildChildren(root.id);
    const libId = randomUUID();
    await q('INSERT INTO library_items (id,kind,title,description,source_url,tree_json) VALUES (?,?,?,?,?,?)').run(
      libId, kind, root.title.trim(), root.description || '', sourceUrl.trim(), JSON.stringify(items),
    );
    send(res, 201, { id: libId });
  });

  route('POST', '/api/library/:id/clone', async (_req, res, { id }) => {
    const lib = await q('SELECT title,description,source_url,tree_json FROM library_items WHERE id=?').get(id);
    if (!lib) return send(res, 404, { error: 'library item not found' });
    const items = JSON.parse(lib.tree_json || '[]');
    const st = await q('SELECT id FROM statuses ORDER BY pos LIMIT 1').get();
    const rootId = await tx(async () => {
      const rid = randomUUID();
      const desc = [lib.description, lib.source_url ? `Source: ${lib.source_url}` : ''].filter(Boolean).join('\n');
      const pos = await nextPos('tasks', "parent_id IS NULL AND kind='book'");
      await q('INSERT INTO tasks (id,parent_id,title,description,status_id,pos,kind) VALUES (?,?,?,?,?,?,?)').run(
        rid, null, lib.title, desc, st.id, pos, 'book',
      );
      const add = async (list, parent) => {
        for (let i = 0; i < (list || []).length; i++) {
          const it = list[i];
          const t = String(it?.title ?? '').trim();
          if (!t) continue;
          const cid = randomUUID();
          await q('INSERT INTO tasks (id,parent_id,title,description,status_id,pos,kind) VALUES (?,?,?,?,?,?,?)').run(
            cid, parent, t, String(it?.description ?? '').trim(), st.id, i, 'task',
          );
          if (Array.isArray(it.children)) await add(it.children, cid);
        }
      };
      await add(items, rid);
      return rid;
    });
    send(res, 201, { id: rootId });
  });

  route('DELETE', '/api/library/:id', async (req, res, { id }) => {
    requireAdmin(req);
    await q('DELETE FROM library_items WHERE id=?').run(id);
    send(res, 204);
  });

  // ---- AI Task Generator ("не знаю як це вчити -> згенеруй мені таску") ----
  route('POST', '/api/ai-task/generate', async (req, res) => {
    const { topic = '', details = '' } = await readJson(req);
    if (!topic.trim()) return send(res, 400, { error: 'Enter what you want to learn or do' });
    send(res, 200, await generateAiTask({ topic: topic.trim(), details: details.trim() }));
  });
}
