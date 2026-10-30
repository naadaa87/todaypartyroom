// GET /api/host/spaces/:id/schedules — 반복 딜 목록(다음 오픈 예정 포함) / POST 새 반복 딜
import { api, requireHost, HttpError } from '../../../../../lib/auth.js';
import { all, one, insertId, getSettings } from '../../../../../lib/db.js';
import { json, readBody, todayStr, addDays, nowStr, parseJSON } from '../../../../../lib/util.js';
import { ownSpace, validateSchedule, SCHEDULE_FIELDS } from '../../../../../lib/host-api.js';
import { getAutomationMap, getVacancyMap } from '../../../../../lib/availability.js';
import { planScheduleDeal, runSchedules } from '../../../../../lib/automation.js';

export async function listSchedules(env, s) {
  const db = env.DB;
  const settings = await getSettings(db);
  const today = todayStr(), until = addDays(today, 27), now = nowStr();
  const [rows, slots, autoMap, vacMap] = await Promise.all([
    all(db, `SELECT * FROM deal_schedules WHERE space_id = ? ORDER BY enabled DESC, id`, [s.id]),
    all(db, 'SELECT * FROM slots WHERE space_id = ? AND active = 1', [s.id]),
    getAutomationMap(db, [s.id]),
    getVacancyMap(db, [s.id], today, until),
  ]);
  const runs = rows.length ? await all(db, `SELECT r.schedule_id, COUNT(*) AS n, SUM(d.claimed) AS claimed FROM schedule_runs r LEFT JOIN deals d ON d.id = r.deal_id WHERE r.schedule_id IN (${rows.map(() => '?').join(',')}) GROUP BY r.schedule_id`, rows.map(r => r.id)) : [];
  const runMap = new Map(runs.map(r => [r.schedule_id, r]));
  const slotById = new Map(slots.map(x => [x.id, x]));
  const ctx = { now, slotById, vacMap, auto: autoMap.get(s.id) || null, settings };
  return rows.map(r => {
    const next = [];
    if (r.enabled) for (let d = today; d <= until && next.length < 4; d = addDays(d, 1)) { const p = planScheduleDeal(r, d, ctx); if (p && !p.skip) next.push({ date: d, startsAt: p.startsAt, endsAt: p.endsAt, prices: p.prices }); }
    const rs = runMap.get(r.id) || { n: 0, claimed: 0 };
    return { ...r, days: parseJSON(r.days_json, []), slot_ids: parseJSON(r.slot_ids_json, []), skip_dates: parseJSON(r.skip_dates_json, []), next, runs: rs.n, claimed: rs.claimed || 0 };
  });
}

export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  return json({ ok: true, schedules: await listSchedules(context.env, s) });
});

export const onRequestPost = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const db = context.env.DB;
  const count = await one(db, 'SELECT COUNT(*) AS n FROM deal_schedules WHERE space_id = ?', [s.id]);
  if (count.n >= 20) throw new HttpError('반복 딜은 공간당 20개까지 만들 수 있습니다.');
  const slots = await all(db, 'SELECT id FROM slots WHERE space_id = ? AND active = 1', [s.id]);
  const v = validateSchedule(await readBody(context.request), slots, todayStr());
  if (v.type === 'FLASH' && v.enabled) {
    const f = await one(db, `SELECT COUNT(*) AS n FROM deal_schedules WHERE space_id = ? AND type = 'FLASH' AND enabled = 1`, [s.id]);
    if (f.n >= 2) throw new HttpError('반짝딜 반복은 공간당 2개까지 켤 수 있습니다.');
  }
  const id = await insertId(db, `INSERT INTO deal_schedules (space_id, ${SCHEDULE_FIELDS.join(', ')}) VALUES (?, ${SCHEDULE_FIELDS.map(() => '?').join(', ')})`, [s.id, ...SCHEDULE_FIELDS.map(k => v[k])]);
  const made = await runSchedules(context.env, await getSettings(db), { scheduleIds: [id] });
  return json({ ok: true, id, made, schedules: await listSchedules(context.env, s) });
});
