// GET /api/host/spaces/:id/stats — 최근 30일 통계
import { api, requireHost } from '../../../../../lib/auth.js';
import { all, one } from '../../../../../lib/db.js';
import { json } from '../../../../../lib/util.js';
import { ownSpace } from '../../../../../lib/host-api.js';
export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const db = context.env.DB;
  const totals = await all(db, `SELECT type, COUNT(*) AS n FROM event_log WHERE space_id = ? AND created_at >= datetime('now', '-30 day') GROUP BY type`, [s.id]);
  const daily = await all(db, `SELECT substr(created_at, 1, 10) AS day, type, COUNT(*) AS n FROM event_log WHERE space_id = ? AND created_at >= datetime('now', '-14 day') GROUP BY day, type ORDER BY day`, [s.id]);
  const byType = await all(db, `SELECT d.type, d.origin, COUNT(DISTINCT d.id) AS deals, COUNT(c.id) AS claims, SUM(CASE WHEN c.status = 'used' THEN 1 ELSE 0 END) AS used FROM deals d LEFT JOIN claims c ON c.deal_id = d.id WHERE d.space_id = ? AND d.created_at >= datetime('now', '-30 day') GROUP BY d.type, d.origin`, [s.id]);
  const claims = await one(db, `SELECT COUNT(*) AS n, SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS used FROM claims WHERE space_id = ? AND issued_at >= datetime('now', '-30 day')`, [s.id]);
  return json({ ok: true, views: s.views, totals: Object.fromEntries(totals.map(t => [t.type, t.n])), daily, byType, claims });
});
