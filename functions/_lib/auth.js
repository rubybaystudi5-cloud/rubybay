// Shared auth helpers for RubyBay Studio admin API.
//
// How it works:
//  - The admin password itself is set as a Cloudflare secret (env.ADMIN_PASSWORD)
//    and is NEVER stored in this codebase.
//  - On successful login we issue a signed, expiring session token
//    ("<expiryTimestamp>.<hmacSignature>") using a second secret
//    (env.SESSION_SECRET), and store it in an HttpOnly cookie.
//  - Every protected request re-verifies the signature + expiry — nobody can
//    forge a token without knowing SESSION_SECRET, and nobody can read the
//    cookie from JS (HttpOnly) even via XSS.

const COOKIE_NAME = 'rb_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function toBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4 || 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toBase64Url(new Uint8Array(sig));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(env) {
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = String(expiry);
  const sig = await hmacSign(env.SESSION_SECRET, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token, env) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const expiry = Number(payload);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  const expectedSig = await hmacSign(env.SESSION_SECRET, payload);
  return timingSafeEqual(sig, expectedSig);
}

function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const out = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

export async function isAuthenticated(request, env) {
  const cookies = parseCookies(request);
  const token = cookies[COOKIE_NAME];
  return verifySessionToken(token, env);
}

export function sessionCookieHeader(token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function jsonResponse(data, init) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init && init.headers) },
  });
}

export function unauthorizedResponse() {
  return jsonResponse({ error: 'unauthorized' }, { status: 401 });
}

export async function requireAuth(request, env) {
  const ok = await isAuthenticated(request, env);
  return ok ? null : unauthorizedResponse();
}
