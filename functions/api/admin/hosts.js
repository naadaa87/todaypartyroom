import { api, requireAdmin } from '../../../lib/auth.js';
import { all } from '../../../lib/db.js';
import { json } from '../../../lib/util.js';
export const onRequestGet = api(async (context) => {
  await requireAdmin(context);
  const rows = await all(context.env.DB, `SELECT h.*, (SELECT COUNT(*) FROM spaces s WHERE s.host_id = h.id) AS space_n, (SELECT COUNT(*) FROM spaces s WHERE s.host_id = h.id AND s.status = 'approved') AS live_n, (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'host' AND r.target_id = h.id) AS report_n FROM hosts h ORDER BY h.created_at DESC LIMIT 500`);
  return json({ ok: true, hosts: rows.map(r => ({ ...r, password_hash: undefined })) });
});
