// AI import: screenshot / text / link -> draft plan (Gemini) -> tasks.
import { randomUUID } from 'node:crypto';
import { fetchYoutubePlaylist, youtubePlaylistId } from './youtube.mjs';

const fail = (msg, status) => Object.assign(new Error(msg), { status });

function htmlToText(html) {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h\d|tr|section)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

async function fetchPageText(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw fail('Invalid URL', 400); }
  if (!/^https?:$/.test(u.protocol)) throw fail('Only http(s) links are supported', 400);
  const hint = 'Paste the course outline text or a screenshot instead.';
  let r;
  try {
    r = await fetch(u, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept-Language': 'en,uk;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch { throw fail(`Could not load the page. ${hint}`, 422); }
  if (!r.ok) throw fail(`The site answered ${r.status} (it blocks automatic loading). ${hint}`, 422);
  const text = htmlToText(await r.text());
  if (text.length < 300) throw fail(`The page has no readable content (probably rendered by JavaScript). ${hint}`, 422);
  return text.slice(0, 60000);
}

const PLAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          children: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' } }, required: ['title'] } },
        },
        required: ['title'],
      },
    },
  },
  required: ['title', 'items'],
};

async function generatePlan({ text, imageBase64, imageMime }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw fail('GEMINI_API_KEY is not set. Put it into .env (see .env.example) and restart the server.', 400);
  const parts = [{
    text: 'You turn a table of contents / course curriculum into a study plan. ' +
      'Return JSON: "title" = name of the book or course; "items" = top-level chapters or sections in original order, ' +
      'each with optional "children" = its lessons/subchapters (only if the source lists them). ' +
      'Keep the original language of the source. Do not invent items; skip page numbers and durations; ' +
      'no numbering prefix unless it is part of the title.',
  }];
  if (text) parts.push({ text: 'SOURCE TEXT:\n' + text });
  if (imageBase64) parts.push({ inline_data: { mime_type: imageMime || 'image/png', data: imageBase64 } });
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: PLAN_SCHEMA, temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!r.ok) throw fail(`Gemini error ${r.status}: ${(await r.text()).slice(0, 300)}`, 502);
  const j = await r.json();
  const raw = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  try { return JSON.parse(raw); } catch { throw fail('Model returned an unreadable answer, try again.', 502); }
}

export function registerImport({ route, send, readBody, readJson, q, tx, nextPos, maxBody }) {
  route('POST', '/api/import/plan', async (req, res) => {
    const b = JSON.parse((await readBody(req, maxBody)).toString('utf8') || '{}');
    let text = (b.text || '').trim();
    const url = (b.url || '').trim();
    const listId = url && !text ? youtubePlaylistId(url) : null;
    if (listId) return send(res, 200, await fetchYoutubePlaylist(listId)); // no AI needed
    if (url && !text) text = await fetchPageText(url);
    if (!text && !b.imageBase64) return send(res, 400, { error: 'Provide a link, text or a screenshot.' });
    send(res, 200, await generatePlan({ text, imageBase64: b.imageBase64, imageMime: b.imageMime }));
  });

  route('POST', '/api/import/create', async (req, res) => {
    const { title = '', description = '', items = [], targetKind = 'book' } = await readJson(req);
    if (!title.trim()) return send(res, 400, { error: 'title required' });
    const k = targetKind === 'task' ? 'task' : 'book';
    const st = await q('SELECT id FROM statuses ORDER BY pos LIMIT 1').get();
    const id = await tx(async () => {
      const rootId = randomUUID();
      const pos = await nextPos('tasks', 'parent_id IS NULL AND kind=?', k);
      await q('INSERT INTO tasks (id,parent_id,title,description,status_id,pos,kind) VALUES (?,?,?,?,?,?,?)').run(
        rootId, null, title.trim(), String(description ?? '').trim(), st.id, pos, k,
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
      await add(items, rootId);
      return rootId;
    });
    send(res, 201, { id });
  });
}
