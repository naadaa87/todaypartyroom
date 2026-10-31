// GET /api/host/board — 내 공간 전체의 오늘·내일 공실과 손님에게 보이는 딜 (홈 '오늘·내일 한눈에')
import { api, requireHost } from '../../../lib/auth.js';
import { all, getSettings } from '../../../lib/db.js';
import { json } from '../../../lib/util.js';
import { buildPreview } from '../../../lib/automation.js';
import { getAutomationMap } from '../../../lib/availability.js';

export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const db = context.env.DB;
  const settings = await getSettings(db);
  const spaces = await all(db, `SELECT * FROM spaces WHERE host_id = ? AND status IN ('approved','hidden','pending','revision','draft') ORDER BY CASE status WHEN 'approved' THEN 0 ELSE 1 END, id`, [host.id]);
  const withSlots = (await all(db, `SELECT DISTINCT space_id FROM slots WHERE active = 1 AND space_id IN (SELECT id FROM spaces WHERE host_id = ?)`, [host.id])).map(r => r.space_id);
  const list = spaces.filter(s => withSlots.includes(s.id)).slice(0, 30);
  const autoMap = await getAutomationMap(db, list.map(s => s.id));
  const out = [];
  for (const s of list) {
    const pv = await buildPreview(context.env, settings, s, 2);
    out.push({ id: s.id, name: s.name, status: s.status, live: pv.live, pattern: (autoMap.get(s.id) || {}).pattern || {}, paused_until: pv.paused_until, rule: pv.rule, dates: pv.dates, grid: pv.grid });
  }
  return json({ ok: true, spaces: out });
});
