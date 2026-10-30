// GET /api/host/spaces/:id/automation — 자동 운영 상태 + 7일 미리보기
// PUT  { pattern?, paused_until?, pause_note?, ical_url?, ical_allday? }
import { api, requireHost, HttpError } from '../../../../../lib/auth.js';
import { all, one, run, getSettings } from '../../../../../lib/db.js';
import { json, readBody, todayStr, addDays } from '../../../../../lib/util.js';
import { ownSpace } from '../../../../../lib/host-api.js';
import { getAutomationMap, parsePattern, patternOpenCount } from '../../../../../lib/availability.js';
import { buildPreview, clearScheduleDeals, runSchedules, syncIcal } from '../../../../../lib/automation.js';

async function state(env, s) {
  const settings = await getSettings(env.DB);
  const [autoMap, rule, schedules, slots] = await Promise.all([
    getAutomationMap(env.DB, [s.id]),
    one(env.DB, 'SELECT * FROM auto_rules WHERE space_id = ?', [s.id]),
    all(env.DB, 'SELECT id, name, type, enabled FROM deal_schedules WHERE space_id = ? ORDER BY id', [s.id]),
    all(env.DB, 'SELECT id, name, kind, start_time, end_time FROM slots WHERE space_id = ? AND active = 1 ORDER BY sort, id', [s.id]),
  ]);
  const a = autoMap.get(s.id) || { pattern: {}, paused_until: null, pause_note: '', ical_url: '', ical_allday: 1, ical_last_sync: null, ical_last_result: '' };
  const preview = await buildPreview(env, settings, s, 7);
  return {
    ok: true,
    automation: { pattern: a.pattern, open_cells: patternOpenCount(a.pattern), paused_until: a.paused_until, pause_note: a.pause_note, ical_url: a.ical_url, ical_allday: !!a.ical_allday, ical_last_sync: a.ical_last_sync, ical_last_result: a.ical_last_result },
    rule: rule ? { enabled: !!rule.enabled, tomorrow_rate: rule.tomorrow_rate, today_rate: rule.today_rate } : null,
    schedules: { total: schedules.length, enabled: schedules.filter(x => x.enabled).length },
    slots, preview, live: s.status === 'approved' && ['trial', 'active', 'cancelled'].includes(s.subscription_status),
  };
}

export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  return json(await state(context.env, s));
});

export const onRequestPut = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const b = await readBody(context.request);
  const db = context.env.DB;
  const cur = (await getAutomationMap(db, [s.id])).get(s.id);
  const slots = await all(db, 'SELECT id FROM slots WHERE space_id = ? AND active = 1', [s.id]);
  const own = new Set(slots.map(x => String(x.id)));
  let pattern = cur ? cur.pattern : {};
  if (b.pattern !== undefined) {
    const p = parsePattern(JSON.stringify(b.pattern || {}));
    pattern = {}; for (const [k, v] of Object.entries(p)) if (own.has(k) && v.some(Boolean)) pattern[k] = v;
  }
  let paused = cur ? cur.paused_until : null;
  if (b.paused_until !== undefined) {
    paused = /^\d{4}-\d{2}-\d{2}$/.test(b.paused_until || '') ? b.paused_until : null;
    if (paused && paused < todayStr()) paused = null;
    if (paused && paused > addDays(todayStr(), 180)) throw new HttpError('일시정지는 180일까지 설정할 수 있습니다.');
  }
  const note = b.pause_note !== undefined ? String(b.pause_note || '').slice(0, 100) : (cur ? cur.pause_note : '');
  let ical = cur ? cur.ical_url : '';
  if (b.ical_url !== undefined) {
    ical = String(b.ical_url || '').trim();
    if (ical.startsWith('webcal://')) ical = 'https://' + ical.slice(9);
    if (ical && !/^https:\/\/[^\s]+$/.test(ical)) throw new HttpError('캘린더 주소는 https:// 또는 webcal:// 로 시작해야 합니다.');
    ical = ical.slice(0, 1000);
  }
  const allday = b.ical_allday !== undefined ? (b.ical_allday ? 1 : 0) : (cur ? cur.ical_allday : 1);
  await run(db, `INSERT INTO space_automation (space_id, pattern_json, paused_until, pause_note, ical_url, ical_allday, updated_at) VALUES (?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(space_id) DO UPDATE SET pattern_json = excluded.pattern_json, paused_until = excluded.paused_until, pause_note = excluded.pause_note, ical_url = excluded.ical_url, ical_allday = excluded.ical_allday, updated_at = datetime('now')`,
    [s.id, JSON.stringify(pattern), paused, note, ical, allday]);
  // 연동 주소를 지우면 연동으로 막아 둔 칸을 풀어 줍니다
  if (cur && cur.ical_url && !ical) await run(db, `DELETE FROM vacancies WHERE space_id = ? AND source = 'ical'`, [s.id]);
  // 패턴·일시정지가 바뀌면 아직 열리지 않은 반복 딜을 다시 계산
  const settings = await getSettings(db);
  await clearScheduleDeals(context.env, { spaceId: s.id });
  await runSchedules(context.env, settings, { spaceIds: [s.id] });
  let sync = null;
  if (ical && (!cur || cur.ical_url !== ical)) sync = await syncIcal(context.env, settings, s.id);
  return json({ ...(await state(context.env, s)), sync });
});
