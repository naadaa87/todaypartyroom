// GET /api/admin/spaces?status=&q=
import { api, requireAdmin } from '../../../lib/auth.js';
import { all } from '../../../lib/db.js';
import { json } from '../../../lib/util.js';
export const onRequestGet = api(async (context) => {
  await requireAdmin(context);
  const u = new URL(context.request.url);
  const status = u.searchParams.get('status') || ''; const q = (u.searchParams.get('q') || '').trim();
  const params = []; let where = '1=1';
  if (status) { where += ' AND s.status = ?'; params.push(status); }
  if (q) { where += ' AND (s.name LIKE ? OR h.name LIKE ? OR h.email LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const rows = await all(context.env.DB, `SELECT s.id, s.name, s.slug, s.status, s.subscription_status, s.subscription_until, s.created_at, s.updated_at, s.views, s.review_note, s.photos_json, r.name AS region_name, h.name AS host_name, h.email AS host_email, h.phone AS host_phone, (SELECT COUNT(*) FROM slots sl WHERE sl.space_id = s.id AND sl.active=1) AS slot_n FROM spaces s LEFT JOIN regions r ON r.id = s.region_id JOIN hosts h ON h.id = s.host_id WHERE ${where} ORDER BY CASE s.status WHEN 'pending' THEN 0 ELSE 1 END, s.updated_at DESC LIMIT 300`, params);
  return json({ ok: true, spaces: rows.map(r => ({ ...r, photo_n: JSON.parse(r.photos_json || '[]').length, photos_json: undefined })) });
});
