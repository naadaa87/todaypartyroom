// GET /api/host/spaces (목록) / POST 새 공간
import { api, requireHost } from '../../../lib/auth.js';
import { all, insertId, run } from '../../../lib/db.js';
import { json, err, readBody } from '../../../lib/util.js';
import { uniqueSlug, pickSpaceFields } from '../../../lib/host-api.js';
export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const rows = await all(context.env.DB, 'SELECT id, name, slug, status, subscription_status, subscription_until FROM spaces WHERE host_id = ? ORDER BY id', [host.id]);
  return json({ ok: true, spaces: rows });
});
export const onRequestPost = api(async (context) => {
  const host = await requireHost(context);
  const b = await readBody(context.request);
  const name = String(b.name || '').trim();
  if (name.length < 2) return err('공간 이름을 입력하세요.');
  const f = pickSpaceFields(b);
  const id = await insertId(context.env.DB, 'INSERT INTO spaces (host_id, slug, name, status) VALUES (?,?,?,?)', [host.id, null, name, 'draft']);
  const slug = `space-${id}`;
  await run(context.env.DB, 'UPDATE spaces SET slug = ? WHERE id = ?', [slug, id]);
  const keys = Object.keys(f).filter(k => k !== 'name');
  if (keys.length) await run(context.env.DB, `UPDATE spaces SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...keys.map(k => f[k]), id]);
  await run(context.env.DB, 'INSERT OR IGNORE INTO auto_rules (space_id, enabled) VALUES (?, 0)', [id]);
  return json({ ok: true, id, slug });
});
