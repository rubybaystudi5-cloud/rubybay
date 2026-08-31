import { requireAuth, jsonResponse } from '../_lib/auth.js';
import { rowToProject, sanitizeProjectInput, newProjectId } from '../_lib/projects.js';

// GET /api/projects — public. Returns all projects sorted by display position.
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM projects ORDER BY position ASC'
  ).all();
  return jsonResponse(results.map(rowToProject));
}

// POST /api/projects — protected. Creates a new (mostly blank) project and
// appends it to the end of the display order.
export async function onRequestPost({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  let body = {};
  try { body = await request.json(); } catch (e) { /* allow empty body */ }

  const id = newProjectId();
  const cols = sanitizeProjectInput(body);
  const now = Math.floor(Date.now() / 1000);

  const { results } = await env.DB.prepare(
    'SELECT COALESCE(MAX(position), 0) AS maxPos FROM projects'
  ).all();
  const nextPosition = (results[0]?.maxPos || 0) + 1;

  await env.DB.prepare(
    `INSERT INTO projects
      (id, position, title, cat_label, description, period, tools, planning, design, cost, product_desc, thumb, gallery, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, nextPosition, cols.title, cols.cat_label, cols.description, cols.period,
    cols.tools, cols.planning, cols.design, cols.cost, cols.product_desc, cols.thumb, cols.gallery, now, now
  ).run();

  const row = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  return jsonResponse(rowToProject(row), { status: 201 });
}
