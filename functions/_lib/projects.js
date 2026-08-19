// Shared helpers for mapping between the D1 `projects` table and the JSON
// shape used by index.html / work.html / admin.html.

export function rowToProject(row) {
  let tools = [];
  let gallery = [];
  try { tools = JSON.parse(row.tools || '[]'); } catch (e) { tools = []; }
  try { gallery = JSON.parse(row.gallery || '[]'); } catch (e) { gallery = []; }
  return {
    id: row.id,
    title: row.title,
    catLabel: row.cat_label,
    desc: row.description,
    period: row.period,
    tools,
    planning: row.planning,
    design: row.design,
    cost: row.cost,
    thumb: row.thumb || null,
    gallery,
  };
}

function str(v, fallback = '') {
  return typeof v === 'string' ? v : fallback;
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function strArray(v) {
  return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
}

// Normalizes an incoming (possibly partial) project payload from the admin
// UI into the exact set of columns we write to D1. Missing fields fall back
// to sane defaults so a PUT/POST never leaves NULLs in NOT NULL columns.
export function sanitizeProjectInput(body) {
  return {
    title: str(body.title, '프로젝트 제목을 입력하세요'),
    cat_label: str(body.catLabel, ''),
    description: str(body.desc, ''),
    period: str(body.period, ''),
    tools: JSON.stringify(strArray(body.tools)),
    planning: num(body.planning, 0),
    design: num(body.design, 0),
    cost: str(body.cost, ''),
    thumb: typeof body.thumb === 'string' && body.thumb ? body.thumb : null,
    gallery: JSON.stringify(strArray(body.gallery)),
  };
}

export function newProjectId() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
