import { requireAuth, jsonResponse } from '../../_lib/auth.js';

// POST /api/projects/reorder — protected. Body: { order: ['p3','p1','p2', ...] }
// Rewrites each project's `position` to match the given array index.
export async function onRequestPost({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  let body;
  try { body = await request.json(); } catch (e) {
    return jsonResponse({ error: 'bad_request' }, { status: 400 });
  }

  const order = Array.isArray(body.order) ? body.order.filter(x => typeof x === 'string') : null;
  if (!order || order.length === 0) {
    return jsonResponse({ error: 'bad_request' }, { status: 400 });
  }

  const statements = order.map((id, index) =>
    env.DB.prepare('UPDATE projects SET position = ? WHERE id = ?').bind(index + 1, id)
  );
  await env.DB.batch(statements);

  return jsonResponse({ ok: true });
}
