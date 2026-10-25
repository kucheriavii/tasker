// Drag & drop move, shared Library (books/playlists/courses repository), and AI Roadmaps.
import { randomUUID } from 'node:crypto';

const fail = (msg, status = 400) => Object.assign(new Error(msg), { status });

const ROADMAP_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    stages: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          branches: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                description: { type: 'STRING' },
                skills: {
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
              required: ['title', 'skills'],
            },
          },
        },
        required: ['title', 'branches'],
      },
    },
  },
  required: ['title', 'description', 'stages'],
};

async function generateRoadmap({ topic, details }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw fail('GEMINI_API_KEY is not set in .env', 400);
  const prompt =
    'You are an expert curriculum architect. Build a practical, strictly ordered skill tree (roadmap) for mastering the given subject or profession.\n' +
    'CRITICAL: The order of stages and branches is the exact learning path the student must follow step by step (prerequisites first).\n' +
    'Structure:\n' +
    '- "title": concise roadmap title in the same language as the user request\n' +
    '- "description": 1-2 sentences explaining the learning strategy and branch order\n' +
    '- "stages": 3 to 6 sequential stages (from foundations to advanced/practice). Do NOT prefix titles with numbers (the UI numbers them).\n' +
    '- Inside each stage, "branches": 2 to 4 ordered branches of skills that must be studied in that order.\n' +
    '- Inside each branch, "skills": 3 to 6 concrete topics, theorems, techniques, or practical tasks, each with a short helpful "description" (what to focus on).\n' +
    `TOPIC: ${topic}\n` +
    (details ? `EXTRA DETAILS / LEVEL: ${details}\n` : '');

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: ROADMAP_SCHEMA, temperature: 0.25 },
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

export function migrateFeatures(db) {
  if (!db.prepare('PRAGMA table_info(tasks)').all().some((c) => c.name === 'kind')) {
    db.exec("ALTER TABLE tasks ADD COLUMN kind TEXT NOT NULL DEFAULT 'task'");
  }
  db.exec(`
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
}

export function registerFeatures({ route, send, readJson, q, tx, nextPos, descendants }) {
  // ---- Drag & Drop move / reparent / reorder ----
  route('POST', '/api/tasks/:id/move', async (req, res, { id }) => {
    const { targetId = null, mode = 'after' } = await readJson(req);
    const task = q('SELECT id,parent_id,kind FROM tasks WHERE id=? AND deleted_at IS NULL').get(id);
    if (!task) return send(res, 404, { error: 'task not found' });
    if (targetId === id) return send(res, 204);

    tx(() => {
      if (targetId) {
        const desc = new Set(descendants(id));
        if (desc.has(targetId)) throw fail('Cannot move a task into its own subtask', 400);
      }

      if (mode === 'inside') {
        if (!targetId) throw fail('targetId required for inside mode', 400);
        const target = q('SELECT id FROM tasks WHERE id=? AND deleted_at IS NULL').get(targetId);
        if (!target) throw fail('target not found', 404);
        q('UPDATE tasks SET collapsed=0 WHERE id=?').run(targetId);
        const pos = nextPos('tasks', 'parent_id=?', targetId);
        q("UPDATE tasks SET parent_id=?, pos=?, kind='task' WHERE id=?").run(targetId, pos, id);
        return;
      }

      let newParentId = null;
      let newKind = task.kind;
      if (targetId) {
        const target = q('SELECT id,parent_id,kind FROM tasks WHERE id=? AND deleted_at IS NULL').get(targetId);
        if (!target) throw fail('target not found', 404);
        newParentId = target.parent_id;
        newKind = newParentId ? 'task' : target.kind;
      }

      const siblings = (
        newParentId
          ? q('SELECT id FROM tasks WHERE parent_id=? AND deleted_at IS NULL AND id<>? ORDER BY pos').all(newParentId, id)
          : q('SELECT id FROM tasks WHERE parent_id IS NULL AND kind=? AND deleted_at IS NULL AND id<>? ORDER BY pos').all(newKind, id)
      ).map((r) => r.id);

      const idx = targetId ? siblings.indexOf(targetId) : -1;
      if (idx === -1) {
        siblings.push(id);
      } else {
        siblings.splice(mode === 'before' ? idx : idx + 1, 0, id);
      }

      q('UPDATE tasks SET parent_id=?, kind=? WHERE id=?').run(newParentId, newKind, id);
      const upd = q('UPDATE tasks SET pos=? WHERE id=?');
      siblings.forEach((sid, i) => upd.run(i, sid));
    });

    send(res, 204);
  });

  // ---- Shared Library (books, playlists, courses) ----
  const countNodes = (items) =>
    (items || []).reduce((n, it) => n + 1 + countNodes(it.children), 0);

  route('GET', '/api/library', (_req, res) => {
    const rows = q('SELECT id,kind,title,description,source_url,tree_json,created_at FROM library_items ORDER BY created_at DESC, rowid DESC').all();
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
    if (!title.trim()) return send(res, 400, { error: 'title required' });
    const id = randomUUID();
    q('INSERT INTO library_items (id,kind,title,description,source_url,tree_json) VALUES (?,?,?,?,?,?)').run(
      id, kind, title.trim(), description.trim(), sourceUrl.trim(), JSON.stringify(items || []),
    );
    send(res, 201, { id });
  });

  route('POST', '/api/library/from-task/:id', async (req, res, { id }) => {
    const { kind = 'book', sourceUrl = '' } = await readJson(req);
    const root = q('SELECT id,title,description FROM tasks WHERE id=? AND deleted_at IS NULL').get(id);
    if (!root) return send(res, 404, { error: 'task not found' });
    const buildChildren = (pid) =>
      q('SELECT id,title,description FROM tasks WHERE parent_id=? AND deleted_at IS NULL ORDER BY pos')
        .all(pid)
        .map((c) => ({ title: c.title, description: c.description || '', children: buildChildren(c.id) }));
    const items = buildChildren(root.id);
    const libId = randomUUID();
    q('INSERT INTO library_items (id,kind,title,description,source_url,tree_json) VALUES (?,?,?,?,?,?)').run(
      libId, kind, root.title, root.description || '', sourceUrl.trim(), JSON.stringify(items),
    );
    send(res, 201, { id: libId });
  });

  route('POST', '/api/library/:id/clone', (_req, res, { id }) => {
    const lib = q('SELECT title,description,source_url,tree_json FROM library_items WHERE id=?').get(id);
    if (!lib) return send(res, 404, { error: 'library item not found' });
    const items = JSON.parse(lib.tree_json || '[]');
    const st = q('SELECT id FROM statuses ORDER BY pos LIMIT 1').get();
    const ins = q('INSERT INTO tasks (id,parent_id,title,description,status_id,pos,kind) VALUES (?,?,?,?,?,?,?)');
    const rootId = tx(() => {
      const rid = randomUUID();
      const desc = [lib.description, lib.source_url ? `Source: ${lib.source_url}` : ''].filter(Boolean).join('\n');
      ins.run(rid, null, lib.title, desc, st.id, nextPos('tasks', "parent_id IS NULL AND kind='task'"), 'task');
      const add = (list, parent) =>
        (list || []).forEach((it, i) => {
          const t = String(it?.title ?? '').trim();
          if (!t) return;
          const cid = randomUUID();
          ins.run(cid, parent, t, String(it?.description ?? '').trim(), st.id, i, 'task');
          if (Array.isArray(it.children)) add(it.children, cid);
        });
      add(items, rid);
      return rid;
    });
    send(res, 201, { id: rootId });
  });

  route('DELETE', '/api/library/:id', (_req, res, { id }) => {
    q('DELETE FROM library_items WHERE id=?').run(id);
    send(res, 204);
  });

  // ---- Roadmaps (ordered skill tree) ----
  route('POST', '/api/roadmaps/generate', async (req, res) => {
    const { topic = '', details = '' } = await readJson(req);
    if (!topic.trim()) return send(res, 400, { error: 'Enter a topic or profession' });
    send(res, 200, await generateRoadmap({ topic: topic.trim(), details: details.trim() }));
  });

  route('POST', '/api/roadmaps', async (req, res) => {
    const { title = '', description = '', stages = [] } = await readJson(req);
    if (!title.trim()) return send(res, 400, { error: 'title required' });
    const st = q('SELECT id FROM statuses ORDER BY pos LIMIT 1').get();
    const ins = q('INSERT INTO tasks (id,parent_id,title,description,status_id,pos,kind) VALUES (?,?,?,?,?,?,?)');
    const id = tx(() => {
      const rootId = randomUUID();
      ins.run(rootId, null, title.trim(), description.trim(), st.id, nextPos('tasks', "parent_id IS NULL AND kind='roadmap'"), 'roadmap');
      (stages || []).forEach((stage, si) => {
        const stTitle = String(stage?.title ?? '').trim();
        if (!stTitle) return;
        const stageId = randomUUID();
        ins.run(stageId, rootId, stTitle, String(stage?.description ?? '').trim(), st.id, si, 'task');
        (stage.branches || []).forEach((branch, bi) => {
          const brTitle = String(branch?.title ?? '').trim();
          if (!brTitle) return;
          const branchId = randomUUID();
          ins.run(branchId, stageId, brTitle, String(branch?.description ?? '').trim(), st.id, bi, 'task');
          (branch.skills || []).forEach((sk, ki) => {
            const skTitle = String(sk?.title ?? '').trim();
            if (!skTitle) return;
            ins.run(randomUUID(), branchId, skTitle, String(sk?.description ?? '').trim(), st.id, ki, 'task');
          });
        });
      });
      return rootId;
    });
    send(res, 201, { id });
  });
}
