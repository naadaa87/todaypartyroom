// PUT /api/host/schedules/:sid — 수정·켜기/끄기 ({enabled} 만 보내도 됨) / DELETE 삭제
import { api, requireHost, HttpError } from '../../../../lib/auth.js';
import { all, one, run, getSettings } from '../../../../lib/db.js';
import { json, readBody, todayStr, parseJSON } from '../../../../lib/util.js';
import { validateSchedule, SCHEDULE_FIELDS } from '../../../../lib/host-api.js';
import { clearScheduleDeals, runSchedules } from '../../../../lib/automation.js';
import { listSchedules } from '../spaces/[id]/schedules.js';

async function own(context) {
  const host = await requireHost(context);
  const sc = await one(context.env.DB, 'SELECT ds.*, s.host_id FROM deal_schedules ds JOIN spaces s ON s.id = ds.space_id WHERE ds.id = ?', [Number(context.params.sid)]);
  if (!sc || sc.host_id !== host.id) throw new HttpError('반복 딜을 찾을 수 없습니다.', 404);
  const space = await one(context.env.DB, 'SELECT * FROM spaces WHERE id = ?', [sc.space_id]);
  return { host, sc, space };
}

export const onRequestPut = api(async (context) => {
  const { sc, space } = await own(context);
  const db = context.env.DB;
  const b = await readBody(context.request);
  let v;
  if (Object.keys(b).length === 1 && 'enabled' in b) v = { enabled: b.enabled ? 1 : 0 };
  else {
    const slots = await all(db, 'SELECT id FROM slots WHERE space_id = ? AND active = 1', [sc.space_id]);
    const merged = { ...sc, days: parseJSON(sc.days_json, []), slot_ids: parseJSON(sc.slot_ids_json, []), skip_dates: parseJSON(sc.skip_dates_json, []), only_vacant: sc.only_vacant, enabled: sc.enabled, ...b };
    v = validateSchedule(merged, slots, todayStr());
  }
  if (v.enabled && (v.type || sc.type) === 'FLASH') {
    const f = await one(db, `SELECT COUNT(*) AS n FROM deal_schedules WHERE space_id = ? AND type = 'FLASH' AND enabled = 1 AND id != ?`, [sc.space_id, sc.id]);
    if (f.n >= 2) throw new HttpError('반짝딜 반복은 공간당 2개까지 켤 수 있습니다.');
  }
  const keys = Object.keys(v).filter(k => SCHEDULE_FIELDS.includes(k));
  await run(db, `UPDATE deal_schedules SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...keys.map(k => v[k]), sc.id]);
  // 끄면 진행 중(코드 미발급) 딜도 닫고, 바꾸면 아직 안 열린 딜만 다시 계산
  await clearScheduleDeals(context.env, { scheduleIds: [sc.id], includeActive: v.enabled === 0 });
  const made = v.enabled === 0 ? 0 : await runSchedules(context.env, await getSettings(db), { scheduleIds: [sc.id] });
  return json({ ok: true, made, schedules: await listSchedules(context.env, space) });
});

export const onRequestDelete = api(async (context) => {
  const { sc, space } = await own(context);
  await clearScheduleDeals(context.env, { scheduleIds: [sc.id], includeActive: true });
  await context.env.DB.batch([
    context.env.DB.prepare('DELETE FROM schedule_runs WHERE schedule_id = ?').bind(sc.id),
    context.env.DB.prepare('DELETE FROM deal_schedules WHERE id = ?').bind(sc.id),
  ]);
  return json({ ok: true, schedules: await listSchedules(context.env, space) });
});
