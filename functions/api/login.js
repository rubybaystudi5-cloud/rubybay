import { createSessionToken, sessionCookieHeader, jsonResponse } from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return jsonResponse({ error: 'server_not_configured' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'bad_request' }, { status: 400 });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (password !== env.ADMIN_PASSWORD) {
    return jsonResponse({ error: 'invalid_password' }, { status: 401 });
  }

  const token = await createSessionToken(env);
  return jsonResponse({ ok: true }, {
    headers: { 'Set-Cookie': sessionCookieHeader(token) },
  });
}
