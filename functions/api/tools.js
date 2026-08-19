import { requireAuth, jsonResponse } from '../_lib/auth.js';
import { rowToTool, newToolId } from '../_lib/tools.js';

// GET /api/tools — public. Returns the whole tool library sorted by position.
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM tools ORDER BY position ASC'
  ).all();
  return jsonResponse(results.map(rowToTool));
}

// POST /api/tools — protected. Adds a new image-only tool.
// Body: { value: '/api/images/<key>' } — value must come from a prior
// POST /api/upload call.
export async function onRequestPost({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  let body = {};
  try { body = await request.json(); } catch (e) { /* allow empty */ }

  const value = typeof body.value === 'string' ? body.value : '';
  if (!value) return jsonResponse({ error: 'missing_image' }, { status: 400 });

  const id = newToolId();
  const now = Math.floor(Date.now() / 1000);

  const { results } = await env.DB.prepare(
    'SELECT COALESCE(MAX(position), 0) AS maxPos FROM tools'
  ).all();
  const nextPosition = (results[0]?.maxPos || 0) + 1;

  await env.DB.prepare(
    `INSERT INTO tools (id, position, name, icon_type, icon_value, created_at)
     VALUES (?, ?, '', 'image', ?, ?)`
  ).bind(id, nextPosition, value, now).run();

  const row = await env.DB.prepare('SELECT * FROM tools WHERE id = ?').bind(id).first();
  return jsonResponse(rowToTool(row), { status: 201 });
}
