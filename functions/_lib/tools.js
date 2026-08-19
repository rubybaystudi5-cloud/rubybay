// Shared helpers for mapping between the D1 `tools` table and the JSON shape
// used by admin.html / work.html (icon-only tool chips).

export function rowToTool(row) {
  return {
    id: row.id,
    name: row.name || '',
    icon: { type: row.icon_type, value: row.icon_value },
  };
}

export function newToolId() {
  return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
