// GET /api/host/spaces/:id/vacancies?from=&to= / PUT {items:[{slot_id,date,status}]}
import { api, requireHost } from '../../../../../lib/auth.js';
import { run, all } from '../../../../../lib/db.js';
import { json, err, readBody, todayStr, addDays } from '../../../../../lib/util.js';
import { ownSpace } from '../../../../../lib/host-api.js';
import { endDealsForSlot } from '../../../../../lib/deals.js';
const D = /^\d{4}-\d{2}-\d{2}$/;
export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const u = new URL(context.request.url);
  const from = D.test(u.searchParams.get('from') || '') ? u.searchParams.get('from') : todayStr();
  const to = D.test(u.searchParams.get('to') || '') ? u.searchParams.get('to') : addDays(from, 13);
  const rows = await all(context.env.DB, 'SELECT slot_id, date, status FROM vacancies WHERE space_id = ? AND date BETWEEN ? AND ?', [s.id, from, to]);
  return json({ ok: true, vacancies: rows, from, to });
});
export const onRequestPut = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const b = await readBody(context.request);
  const items = Array.isArray(b.items) ? b.items.slice(0, 400) : [];
  const slots = new Set((await all(context.env.DB, 'SELECT id FROM slots WHERE space_id = ? AND active = 1', [s.id])).map(r => r.id));
  const today = todayStr();
  let n = 0;
  for (const it of items) {
    const slotId = Number(it.slot_id); const date = String(it.date || '');
    if (!slots.has(slotId) || !D.test(date) || date < today) continue;
    const st = ['vacant', 'booked', 'closed', 'clear'].includes(it.status) ? it.status : null; if (!st) continue;
    if (st === 'clear') await run(context.env.DB, 'DELETE FROM vacancies WHERE space_id = ? AND slot_id = ? AND date = ?', [s.id, slotId, date]);
    else await run(context.env.DB, `INSERT INTO vacancies (space_id, slot_id, date, status, source, updated_at) VALUES (?,?,?,?,'manual',datetime('now')) ON CONFLICT(space_id, slot_id, date) DO UPDATE SET status = excluded.status, updated_at = datetime('now')`, [s.id, slotId, date, st]);
    if (st === 'booked' || st === 'closed') await endDealsForSlot(context.env, s.id, slotId, date);
    n += 1;
  }
  return json({ ok: true, updated: n });
});
