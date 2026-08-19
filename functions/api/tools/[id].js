import { requireAuth, jsonResponse } from '../../_lib/auth.js';

// DELETE /api/tools/:id — protected.
export async function onRequestDelete({ request, env, params }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  const id = params.id;
  const result = await env.DB.prepare('DELETE FROM tools WHERE id = ?').bind(id).run();
  if (!result.meta || result.meta.changes === 0) {
    return jsonResponse({ error: 'not_found' }, { status: 404 });
  }
  return jsonResponse({ ok: true });
}
