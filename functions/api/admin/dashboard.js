// GET /api/admin/dashboard — KPI
import { api, requireAdmin } from '../../../lib/auth.js';
import { all, one } from '../../../lib/db.js';
import { json, todayStr } from '../../../lib/util.js';
export const onRequestGet = api(async (context) => {
  await requireAdmin(context);
  const db = context.env.DB; const today = todayStr();
  const [spaces, hosts, deals, claims, subs, reports, events, pending, recent] = await Promise.all([
    all(db, `SELECT status, subscription_status, COUNT(*) AS n FROM spaces GROUP BY status, subscription_status`),
    one(db, `SELECT COUNT(*) AS n, SUM(CASE WHEN created_at >= datetime('now','-30 day') THEN 1 ELSE 0 END) AS new30 FROM hosts`),
    all(db, `SELECT type, origin, status, COUNT(*) AS n FROM deals WHERE created_at >= datetime('now','-30 day') GROUP BY type, origin, status`),
    one(db, `SELECT COUNT(*) AS n, SUM(CASE WHEN status='used' THEN 1 ELSE 0 END) AS used FROM claims WHERE issued_at >= datetime('now','-30 day')`),
    one(db, `SELECT COUNT(*) AS n FROM alert_subs WHERE active = 1`),
    one(db, `SELECT COUNT(*) AS n FROM reports WHERE status = 'open'`),
    all(db, `SELECT type, COUNT(*) AS n FROM event_log WHERE created_at >= datetime('now','-30 day') GROUP BY type`),
    one(db, `SELECT COUNT(*) AS n FROM spaces WHERE status = 'pending'`),
    all(db, `SELECT substr(created_at,1,10) AS day, COUNT(*) AS n FROM event_log WHERE type='click_channel' AND created_at >= datetime('now','-14 day') GROUP BY day ORDER BY day`),
  ]);
  const paying = await one(db, `SELECT COUNT(*) AS n FROM spaces WHERE status='approved' AND subscription_status='active' AND (subscription_until IS NULL OR subscription_until >= ?)`, [today]);
  const trial = await one(db, `SELECT COUNT(*) AS n FROM spaces WHERE status='approved' AND subscription_status='trial' AND (subscription_until IS NULL OR subscription_until >= ?)`, [today]);
  const expiring = await all(db, `SELECT id, name, subscription_status, subscription_until FROM spaces WHERE status='approved' AND subscription_until BETWEEN ? AND date(?, '+7 day') ORDER BY subscription_until`, [today, today]);
  return json({ ok: true, spaces, hosts, deals, claims, subs: subs.n, reports_open: reports.n, events: Object.fromEntries(events.map(e => [e.type, e.n])), pending: pending.n, paying: paying.n, trial: trial.n, expiring, recent });
});
