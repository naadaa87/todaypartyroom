import { api, requireAdmin } from '../../../lib/auth.js';
import { all } from '../../../lib/db.js';
import { json } from '../../../lib/util.js';
export const onRequestGet = api(async (context) => {
  await requireAdmin(context);
  const u = new URL(context.request.url); const status = u.searchParams.get('status') || 'open';
  const rows = await all(context.env.DB, `SELECT * FROM reports ${status === 'all' ? '' : 'WHERE status = ?'} ORDER BY created_at DESC LIMIT 300`, status === 'all' ? [] : [status]);
  return json({ ok: true, reports: rows });
});
