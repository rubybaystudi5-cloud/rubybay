import { requireAuth, jsonResponse } from '../../_lib/auth.js';
import { rowToProject, sanitizeProjectInput } from '../../_lib/projects.js';

// PUT /api/projects/:id — protected. Updates an existing project's fields.
export async function onRequestPut({ request, env, params }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  const id = params.id;
  const existing = await env.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(id).first();
  if (!existing) return jsonResponse({ error: 'not_found' }, { status: 404 });

  let body = {};
  try { body = await request.json(); } catch (e) {
    return jsonResponse({ error: 'bad_request' }, { status: 400 });
  }

  const cols = sanitizeProjectInput(body);
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `UPDATE projects SET
      title = ?, cat_label = ?, description = ?, period = ?, tools = ?,
      planning = ?, design = ?, cost = ?, product_desc = ?, thumb = ?, gallery = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    cols.title, cols.cat_label, cols.description, cols.period, cols.tools,
    cols.planning, cols.design, cols.cost, cols.product_desc, cols.thumb, cols.gallery, now, id
  ).run();

  const row = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  return jsonResponse(rowToProject(row));
}

// DELETE /api/projects/:id — protected.
export async function onRequestDelete({ request, env, params }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  const id = params.id;
  const result = await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  if (!result.meta || result.meta.changes === 0) {
    return jsonResponse({ error: 'not_found' }, { status: 404 });
  }
  return jsonResponse({ ok: true });
}
