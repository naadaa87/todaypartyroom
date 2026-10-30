// GET /api/host/spaces/:id/vacancies?from=&to= — 캘린더 칸 + 매주 반복 패턴
// PUT {items:[{slot_id,date,status}]} — status: vacant | booked | closed | clear(반복 기본값으로)
import { api, requireHost } from '../../../../../lib/auth.js';
import { all, getSettings } from '../../../../../lib/db.js';
import { json, readBody, todayStr, addDays } from '../../../../../lib/util.js';
import { ownSpace } from '../../../../../lib/host-api.js';
import { endDealsForSlots } from '../../../../../lib/deals.js';
import { getAutomationMap } from '../../../../../lib/availability.js';
import { runSchedules } from '../../../../../lib/automation.js';
const D = /^\d{4}-\d{2}-\d{2}$/;
export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const u = new URL(context.request.url);
  const from = D.test(u.searchParams.get('from') || '') ? u.searchParams.get('from') : todayStr();
  const to = D.test(u.searchParams.get('to') || '') ? u.searchParams.get('to') : addDays(from, 13);
  const [rows, autoMap] = await Promise.all([
    all(context.env.DB, 'SELECT slot_id, date, status, source FROM vacancies WHERE space_id = ? AND date BETWEEN ? AND ?', [s.id, from, to]),
    getAutomationMap(context.env.DB, [s.id]),
  ]);
  const a = autoMap.get(s.id);
  return json({ ok: true, vacancies: rows, from, to, pattern: a ? a.pattern : {}, paused_until: a ? a.paused_until : null });
});
export const onRequestPut = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const db = context.env.DB;
  const b = await readBody(context.request);
  const items = Array.isArray(b.items) ? b.items.slice(0, 600) : [];
  const slots = new Set((await all(db, 'SELECT id FROM slots WHERE space_id = ? AND active = 1', [s.id])).map(r => r.id));
  const today = todayStr();
  const stmts = []; const closing = [];
  for (const it of items) {
    const slotId = Number(it.slot_id); const date = String(it.date || '');
    if (!slots.has(slotId) || !D.test(date) || date < today) continue;
    const st = ['vacant', 'booked', 'closed', 'clear'].includes(it.status) ? it.status : null; if (!st) continue;
    if (st === 'clear') stmts.push(db.prepare('DELETE FROM vacancies WHERE space_id = ? AND slot_id = ? AND date = ?').bind(s.id, slotId, date));
    else stmts.push(db.prepare(`INSERT INTO vacancies (space_id, slot_id, date, status, source, updated_at) VALUES (?,?,?,?,'manual',datetime('now')) ON CONFLICT(space_id, slot_id, date) DO UPDATE SET status = excluded.status, source = 'manual', updated_at = datetime('now')`).bind(s.id, slotId, date, st));
    if (st === 'booked' || st === 'closed') closing.push({ slot_id: slotId, date });
  }
  for (let i = 0; i < stmts.length; i += 100) await db.batch(stmts.slice(i, i + 100));
  if (closing.length) await endDealsForSlots(context.env, s.id, closing);
  // 새로 비어 있게 된 칸이 있으면 반복 딜이 바로 열리도록
  if (stmts.length > closing.length) await runSchedules(context.env, await getSettings(db), { spaceIds: [s.id] });
  return json({ ok: true, updated: stmts.length });
});
