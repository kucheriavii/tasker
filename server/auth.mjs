// Authentication module: OAuth 2.0 (Google & GitHub), sessions, and user management.
import { randomUUID } from 'node:crypto';

function parseCookies(req) {
  const list = {};
  const rc = req?.headers?.cookie;
  if (!rc) return list;
  rc.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    if (name) list[name] = decodeURIComponent(parts.join('=') || '');
  });
  return list;
}

export function getAppUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  const host = req?.headers?.host || 'localhost:3000';
  const proto = req?.headers?.['x-forwarded-proto'] || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function isEmailAdmin(email) {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const em = email.toLowerCase().trim();
  return adminEmails.includes(em) || em === 'admin@tasker.local';
}

export async function resolveSessionUser(req, q) {
  const cookies = parseCookies(req);
  const sessionId = cookies['tasker_session'];
  if (sessionId) {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const row = await q(`
      SELECT u.id, u.email, u.name, u.avatar_url, u.role, u.provider
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > ?
    `).get(sessionId, nowStr);
    if (row) {
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        avatarUrl: row.avatar_url,
        role: row.role,
        provider: row.provider,
      };
    }
  }

  // Fallback: check x-user-id header
  const headerUid = req?.headers?.['x-user-id'];
  if (headerUid && typeof headerUid === 'string' && headerUid.trim()) {
    const uid = headerUid.trim();
    const row = await q('SELECT id, email, name, avatar_url, role, provider FROM users WHERE id=?').get(uid);
    if (row) {
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        avatarUrl: row.avatar_url,
        role: row.role,
        provider: row.provider,
      };
    }
  }

  return null;
}

export function registerAuth({ route, send, readJson, q, tx }) {
  // Check current session & available auth providers
  route('GET', '/api/auth/me', async (req, res) => {
    const user = req._resolvedUser || await resolveSessionUser(req, q);
    const google = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const github = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    send(res, 200, {
      user: user || null,
      providers: { google, github },
    });
  });

  // ---- Google OAuth ----
  route('GET', '/api/auth/google', async (req, res, _, url) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      res.writeHead(302, { Location: '/?auth_error=google_not_configured' });
      return res.end();
    }
    const state = randomUUID();
    const redirectUri = `${getAppUrl(req)}/api/auth/google/callback`;
    const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleUrl.searchParams.set('client_id', clientId);
    googleUrl.searchParams.set('redirect_uri', redirectUri);
    googleUrl.searchParams.set('response_type', 'code');
    googleUrl.searchParams.set('scope', 'openid email profile');
    googleUrl.searchParams.set('state', state);
    googleUrl.searchParams.set('prompt', 'select_account');

    res.writeHead(302, {
      Location: googleUrl.toString(),
      'Set-Cookie': `tasker_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    });
    res.end();
  });

  route('GET', '/api/auth/google/callback', async (req, res, _, url) => {
    const cookies = parseCookies(req);
    const stateParam = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(302, { Location: `/?auth_error=${encodeURIComponent(error)}` });
      return res.end();
    }
    if (!stateParam || stateParam !== cookies['tasker_oauth_state'] || !code) {
      res.writeHead(302, { Location: '/?auth_error=invalid_state' });
      return res.end();
    }

    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${getAppUrl(req)}/api/auth/google/callback`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        console.error('[Google OAuth] Token exchange error:', errBody);
        res.writeHead(302, { Location: '/?auth_error=token_exchange_failed' });
        return res.end();
      }

      const tokens = await tokenRes.json();
      const userinfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userinfoRes.ok) {
        res.writeHead(302, { Location: '/?auth_error=userinfo_failed' });
        return res.end();
      }

      const info = await userinfoRes.json();
      const sub = String(info.sub);
      const email = info.email ? String(info.email).toLowerCase().trim() : null;
      const name = (info.name || email?.split('@')[0] || 'Google User').trim();
      const avatarUrl = info.picture || '';

      const user = await tx(async () => {
        let existing = null;
        if (email) {
          existing = await q('SELECT id, email, name, avatar_url, role FROM users WHERE (provider=\x27google\x27 AND provider_id=?) OR email=?').get(sub, email);
        } else {
          existing = await q('SELECT id, email, name, avatar_url, role FROM users WHERE provider=\x27google\x27 AND provider_id=?').get(sub);
        }

        if (existing) {
          const newRole = isEmailAdmin(email) ? 'admin' : existing.role;
          const finalAvatar = avatarUrl || existing.avatar_url || '';
          await q('UPDATE users SET name=?, avatar_url=?, provider=\x27google\x27, provider_id=?, role=? WHERE id=?').run(
            name, finalAvatar, sub, newRole, existing.id,
          );
          return { id: existing.id, role: newRole };
        }

        const newId = randomUUID();
        const role = isEmailAdmin(email) ? 'admin' : 'user';
        await q('INSERT INTO users (id, email, name, avatar_url, provider, provider_id, role) VALUES (?,?,?,?,?,?,?)').run(
          newId, email, name, avatarUrl, 'google', sub, role,
        );
        return { id: newId, role };
      });

      // Create 30-day session
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await q('INSERT INTO sessions (id, user_id, expires_at) VALUES (?,?,?)').run(sessionId, user.id, expiresAt);

      res.writeHead(302, {
        Location: '/',
        'Set-Cookie': [
          `tasker_session=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
          `tasker_uid=${encodeURIComponent(user.id)}; Path=/; Max-Age=2592000; SameSite=Lax`,
          'tasker_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
        ],
      });
      res.end();
    } catch (err) {
      console.error('[Google OAuth] Error:', err);
      res.writeHead(302, { Location: `/?auth_error=${encodeURIComponent(err.message || 'unknown')}` });
      res.end();
    }
  });

  // ---- GitHub OAuth ----
  route('GET', '/api/auth/github', async (req, res, _, url) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      res.writeHead(302, { Location: '/?auth_error=github_not_configured' });
      return res.end();
    }
    const state = randomUUID();
    const redirectUri = `${getAppUrl(req)}/api/auth/github/callback`;
    const ghUrl = new URL('https://github.com/login/oauth/authorize');
    ghUrl.searchParams.set('client_id', clientId);
    ghUrl.searchParams.set('redirect_uri', redirectUri);
    ghUrl.searchParams.set('scope', 'read:user user:email');
    ghUrl.searchParams.set('state', state);

    res.writeHead(302, {
      Location: ghUrl.toString(),
      'Set-Cookie': `tasker_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    });
    res.end();
  });

  route('GET', '/api/auth/github/callback', async (req, res, _, url) => {
    const cookies = parseCookies(req);
    const stateParam = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(302, { Location: `/?auth_error=${encodeURIComponent(error)}` });
      return res.end();
    }
    if (!stateParam || stateParam !== cookies['tasker_oauth_state'] || !code) {
      res.writeHead(302, { Location: '/?auth_error=invalid_state' });
      return res.end();
    }

    try {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      const redirectUri = `${getAppUrl(req)}/api/auth/github/callback`;

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        res.writeHead(302, { Location: '/?auth_error=token_exchange_failed' });
        return res.end();
      }

      const tokenJson = await tokenRes.json();
      if (!tokenJson.access_token) {
        console.error('[GitHub OAuth] Error response:', tokenJson);
        res.writeHead(302, { Location: `/?auth_error=${encodeURIComponent(tokenJson.error_description || tokenJson.error || 'token_missing')}` });
        return res.end();
      }

      const ghUserRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          'User-Agent': 'Tasker-App',
        },
      });

      if (!ghUserRes.ok) {
        res.writeHead(302, { Location: '/?auth_error=userinfo_failed' });
        return res.end();
      }

      const ghUser = await ghUserRes.json();
      const ghId = String(ghUser.id);
      let email = ghUser.email ? String(ghUser.email).toLowerCase().trim() : null;

      // If email is private, fetch primary verified email from emails API
      if (!email) {
        try {
          const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `Bearer ${tokenJson.access_token}`,
              'User-Agent': 'Tasker-App',
            },
          });
          if (emailsRes.ok) {
            const emails = await emailsRes.json();
            const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
            if (primary?.email) email = String(primary.email).toLowerCase().trim();
          }
        } catch (e) {
          console.warn('[GitHub OAuth] Could not fetch user emails:', e);
        }
      }

      const name = (ghUser.name || ghUser.login || 'GitHub User').trim();
      const avatarUrl = ghUser.avatar_url || '';

      const user = await tx(async () => {
        let existing = null;
        if (email) {
          existing = await q('SELECT id, email, name, avatar_url, role FROM users WHERE (provider=\x27github\x27 AND provider_id=?) OR email=?').get(ghId, email);
        } else {
          existing = await q('SELECT id, email, name, avatar_url, role FROM users WHERE provider=\x27github\x27 AND provider_id=?').get(ghId);
        }

        if (existing) {
          const newRole = isEmailAdmin(email) ? 'admin' : existing.role;
          const finalAvatar = avatarUrl || existing.avatar_url || '';
          await q('UPDATE users SET name=?, avatar_url=?, provider=\x27github\x27, provider_id=?, role=? WHERE id=?').run(
            name, finalAvatar, ghId, newRole, existing.id,
          );
          return { id: existing.id, role: newRole };
        }

        const newId = randomUUID();
        const role = isEmailAdmin(email) ? 'admin' : 'user';
        await q('INSERT INTO users (id, email, name, avatar_url, provider, provider_id, role) VALUES (?,?,?,?,?,?,?)').run(
          newId, email, name, avatarUrl, 'github', ghId, role,
        );
        return { id: newId, role };
      });

      // Create session
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await q('INSERT INTO sessions (id, user_id, expires_at) VALUES (?,?,?)').run(sessionId, user.id, expiresAt);

      res.writeHead(302, {
        Location: '/',
        'Set-Cookie': [
          `tasker_session=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
          `tasker_uid=${encodeURIComponent(user.id)}; Path=/; Max-Age=2592000; SameSite=Lax`,
          'tasker_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
        ],
      });
      res.end();
    } catch (err) {
      console.error('[GitHub OAuth] Error:', err);
      res.writeHead(302, { Location: `/?auth_error=${encodeURIComponent(err.message || 'unknown')}` });
      res.end();
    }
  });

  // ---- Logout ----
  route('POST', '/api/auth/logout', async (req, res) => {
    const cookies = parseCookies(req);
    const sessionId = cookies['tasker_session'];
    if (sessionId) {
      try {
        await q('DELETE FROM sessions WHERE id=?').run(sessionId);
      } catch {}
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': [
        'tasker_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
        'tasker_uid=; Path=/; SameSite=Lax; Max-Age=0',
      ],
    });
    res.end(JSON.stringify({ ok: true }));
  });

  // ---- Quick Dev / Debug Login (switch between Admin and User without external OAuth) ----
  route('POST', '/api/auth/dev-login', async (req, res) => {
    const { profileId } = await readJson(req);
    const valid = ['admin', 'user'];
    if (!valid.includes(profileId)) return send(res, 400, { error: 'invalid profile' });

    const u = await q('SELECT id, email, name, avatar_url, role, provider FROM users WHERE id=?').get(profileId);
    if (!u) return send(res, 404, { error: 'user not found' });

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    await q('INSERT INTO sessions (id, user_id, expires_at) VALUES (?,?,?)').run(sessionId, u.id, expiresAt);

    const userObj = {
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatar_url,
      role: u.role,
      provider: u.provider,
    };

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': [
        `tasker_session=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
        `tasker_uid=${encodeURIComponent(u.id)}; Path=/; Max-Age=2592000; SameSite=Lax`,
      ],
    });
    res.end(JSON.stringify({ ok: true, user: userObj }));
  });
}
