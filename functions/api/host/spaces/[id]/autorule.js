// GET/PUT /api/host/spaces/:id/autorule — 오토딜 규칙
import { api, requireHost } from '../../../../../lib/auth.js';
import { run, one, all, getSettings } from '../../../../../lib/db.js';
import { json, err, readBody, toInt, clamp, todayStr, addDays, nowStr } from '../../../../../lib/util.js';
import { ownSpace } from '../../../../../lib/host-api.js';
import { computeAuto } from '../../../../../lib/deals.js';
export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const r = await one(context.env.DB, 'SELECT * FROM auto_rules WHERE space_id = ?', [s.id]);
  return json({ ok: true, rule: r });
});
export const onRequestPut = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const b = await readBody(context.request);
  const tomorrow_rate = clamp(toInt(b.tomorrow_rate, 15), 0, 90), today_rate = clamp(toInt(b.today_rate, 25), 0, 90);
  const steps = (Array.isArray(b.steps) ? b.steps : []).filter(x => x && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.from) && toInt(x.rate) > 0).map(x => ({ from: x.from, rate: clamp(toInt(x.rate), 1, 90) })).slice(0, 3);
  const floors = {}; if (b.floors && typeof b.floors === 'object') for (const [k, v] of Object.entries(b.floors)) if (toInt(v) > 0) floors[k] = toInt(v);
  const exDays = (Array.isArray(b.exclude_days) ? b.exclude_days : []).map(Number).filter(n => n >= 0 && n <= 6);
  const exSlots = (Array.isArray(b.exclude_slots) ? b.exclude_slots : []).map(Number).filter(Boolean);
  const D = /^\d{4}-\d{2}-\d{2}$/;
  const exFrom = D.test(b.exclude_from || '') ? b.exclude_from : null, exTo = D.test(b.exclude_to || '') ? b.exclude_to : null;
  const cap = clamp(toInt(b.monthly_cap, 20), 0, 200);
  const enabled = b.enabled ? 1 : 0;
  await run(context.env.DB, `INSERT INTO auto_rules (space_id, enabled, tomorrow_rate, today_rate, steps_json, floor_json, exclude_days_json, exclude_slots_json, exclude_from, exclude_to, monthly_cap, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(space_id) DO UPDATE SET enabled=excluded.enabled, tomorrow_rate=excluded.tomorrow_rate, today_rate=excluded.today_rate, steps_json=excluded.steps_json, floor_json=excluded.floor_json, exclude_days_json=excluded.exclude_days_json, exclude_slots_json=excluded.exclude_slots_json, exclude_from=excluded.exclude_from, exclude_to=excluded.exclude_to, monthly_cap=excluded.monthly_cap, updated_at=datetime('now')`,
    [s.id, enabled, tomorrow_rate, today_rate, JSON.stringify(steps), JSON.stringify(floors), JSON.stringify(exDays), JSON.stringify(exSlots), exFrom, exTo, cap]);
  const rule = await one(context.env.DB, 'SELECT * FROM auto_rules WHERE space_id = ?', [s.id]);
  const slots = await all(context.env.DB, 'SELECT * FROM slots WHERE space_id = ? AND active = 1 ORDER BY sort', [s.id]);
  const settings = await getSettings(context.env.DB);
  const today = todayStr();
  const base = { ...rule, enabled: 1, exclude_days_json: '[]', exclude_from: null, exclude_to: null };
  const examples = slots.map(sl => ({ slot: sl.name, today: computeAuto(base, sl, today, nowStr(), settings), tomorrow: computeAuto(base, sl, addDays(today, 1), nowStr(), settings) }));
  return json({ ok: true, rule, examples });
});
