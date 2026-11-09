// AI import: screenshot / text / link -> draft plan (Gemini) -> tasks.
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchYoutubePlaylist, youtubePlaylistId } from './youtube.mjs';

const hereDir = dirname(fileURLToPath(import.meta.url));
function loadEnvIfNeeded() {
  const envFile = join(hereDir, '..', '.env');
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && m[2]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const fail = (msg, status = 400) => Object.assign(new Error(msg), { status });

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
  try { u = new URL(rawUrl); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  try {
    const r = await fetch(u, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept-Language': 'en,uk;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const html = await r.text();
    const text = htmlToText(html);
    return text.length >= 200 ? text.slice(0, 60000) : null;
  } catch {
    return null;
  }
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

const MAX_IMAGES = 10;

async function generatePlan({ text, images = [] }) {
  loadEnvIfNeeded();
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw fail('GEMINI_API_KEY is not set. Put it into .env (see .env.example) and restart the server.', 400);
  const multi = images.length > 1;
  const parts = [{
    text: 'You turn a table of contents / course curriculum or course URL into a structured study plan with sections and lessons. ' +
      'Return JSON: "title" = name of the book or course; "items" = top-level chapters or sections in original order, ' +
      'each with optional "children" = its lessons/subchapters (only if available). ' +
      'Keep the original language of the course / title. Do not invent unrelated items; skip durations and prices; ' +
      'no numbering prefix unless it is part of the title.' +
      (multi
        ? `\n\nYou get ${images.length} screenshots of ONE table of contents / curriculum. They may be uploaded in RANDOM order. ` +
          'Determine the correct reading order from the content itself: chapter/section/lesson numbers, page numbers, ' +
          'alphabetical/logical continuity, a section that continues from the previous screenshot, headings vs. continuation. ' +
          'Merge them into one continuous plan in that correct order. Screenshots may overlap: remove duplicated items. ' +
          'If a section starts on one screenshot and its lessons continue on another, keep them under the same section.'
        : ''),
  }];
  if (text) parts.push({ text: 'SOURCE:\n' + text });
  images.forEach((img, i) => {
    if (multi) parts.push({ text: `Screenshot #${i + 1} (upload order, not necessarily reading order):` });
    parts.push({ inline_data: { mime_type: img.mime || 'image/png', data: img.base64 } });
  });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: PLAN_SCHEMA,
        temperature: 0.2,
        // ordering several screenshots needs a bit of reasoning; single image stays fast
        thinkingConfig: { thinkingBudget: multi ? 2048 : 0 },
      },
    }),
    signal: AbortSignal.timeout(multi ? 180000 : 90000),
  });
  if (!r.ok) throw fail(`Gemini error ${r.status}: ${(await r.text()).slice(0, 300)}`, 502);
  const j = await r.json();
  const raw = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  try { return JSON.parse(raw); } catch { throw fail('Model returned an unreadable answer, try again.', 502); }
}

export function registerImport({ route, send, readBody, readJson, q, tx, nextPos, maxBody, requireAdmin }) {
  const adminPass = () => process.env.ADMIN_PASSWORD || 'admin';
  const requireAdminFn = requireAdmin || ((req) => {
    if ((req.headers['x-admin-key'] || '') !== adminPass()) {
      throw Object.assign(new Error('Admin role required for import.'), { status: 403 });
    }
  });

  route('POST', '/api/import/plan', async (req, res) => {
    requireAdminFn(req);
    const b = JSON.parse((await readBody(req, maxBody)).toString('utf8') || '{}');
    let text = (b.text || '').trim();
    let url = (b.url || '').trim();

    // If user pasted a URL into the textarea, recognize it as a URL
    if (!url && /^https?:\/\//i.test(text) && !text.includes('\n')) {
      url = text;
      text = '';
    }

    const listId = url && !text ? youtubePlaylistId(url) : null;
    if (listId) return send(res, 200, await fetchYoutubePlaylist(listId)); // no AI needed

    if (url && !text) {
      const pageText = await fetchPageText(url);
      if (pageText) {
        text = `URL: ${url}\n\nPAGE CONTENT:\n${pageText}`;
      } else {
        // Fallback: popular courses (Udemy, Coursera, etc.) block scrapers, so let Gemini generate from the URL directly
        text = `Course URL: ${url}\nPlease analyze this course URL and generate the full curriculum with all sections and lessons.`;
      }
    }

    if (!text && !b.imageBase64 && !(Array.isArray(b.images) && b.images.length)) {
      return send(res, 400, { error: 'Provide a link, text or a screenshot.' });
    }
    const images = (Array.isArray(b.images) ? b.images : [])
      .filter((im) => im && typeof im.base64 === 'string' && im.base64)
      .map((im) => ({ base64: im.base64, mime: String(im.mime || 'image/png') }));
    if (b.imageBase64) images.unshift({ base64: b.imageBase64, mime: b.imageMime || 'image/png' }); // legacy single image
    if (images.length > MAX_IMAGES) return send(res, 400, { error: `Max ${MAX_IMAGES} screenshots at once.` });
    send(res, 200, await generatePlan({ text, images }));
  });

  route('POST', '/api/import/create', async (req, res) => {
    requireAdminFn(req);
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
