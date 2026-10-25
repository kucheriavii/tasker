// YouTube playlist -> draft plan (no API key, parses the public playlist page).
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Accept-Language': 'en', Cookie: 'SOCS=CAI; CONSENT=YES+1' };
const MAX_PAGES = 30; // ~100 videos per page

export function youtubePlaylistId(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!/(^|\.)(youtube\.com|youtu\.be)$/.test(u.hostname)) return null;
    return u.searchParams.get('list');
  } catch { return null; }
}

/** Collects video titles (new lockupViewModel layout + legacy playlistVideoRenderer) and the next continuation token. */
function collect(root) {
  const items = []; let token = null;
  (function walk(o) {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    if (o.lockupViewModel) {
      const lv = o.lockupViewModel;
      const t = lv.metadata?.lockupMetadataViewModel?.title?.content;
      if (t && (!lv.contentType || /VIDEO/.test(lv.contentType))) items.push(t);
    } else if (o.playlistVideoRenderer) {
      const t = o.playlistVideoRenderer.title?.runs?.[0]?.text ?? o.playlistVideoRenderer.title?.simpleText;
      if (t) items.push(t);
    }
    if (o.continuationItemRenderer) {
      token = o.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token ?? token;
    }
    for (const v of Object.values(o)) walk(v);
  })(root);
  return { items, token };
}

export async function fetchYoutubePlaylist(listId) {
  const fail = (m) => Object.assign(new Error(m), { status: 422 });
  let html;
  try {
    const r = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(String(r.status));
    html = await r.text();
  } catch { throw fail('Could not load the YouTube playlist (is it public / unlisted?).'); }

  const m = /ytInitialData\s*=\s*(\{.*?\});<\/script>/s.exec(html);
  if (!m) throw fail('YouTube page layout not recognized.');
  const data = JSON.parse(m[1]);
  const title = data.metadata?.playlistMetadataRenderer?.title || 'YouTube playlist';
  let { items, token } = collect(data);

  const apiKey = /"INNERTUBE_API_KEY":"([^"]+)"/.exec(html)?.[1];
  const version = /"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/.exec(html)?.[1] || '2.20240101.00.00';
  for (let page = 0; token && apiKey && page < MAX_PAGES; page++) {
    const r = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: version, hl: 'en' } }, continuation: token }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) break;
    const next = collect(await r.json());
    items = items.concat(next.items);
    token = next.token;
  }
  if (!items.length) throw fail('No videos found in this playlist (private or empty).');
  return { title, items: items.map((t) => ({ title: t, children: [] })) };
}
