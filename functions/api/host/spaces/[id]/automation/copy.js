// POST /api/host/spaces/:id/automation/copy — { to: [spaceId], parts: ['rule','pattern','schedules'] }
// 다점포 호스트용: 한 공간의 자동 운영 설정을 다른 공간에 복사 (슬롯은 이름이 같으면 이름으로, 아니면 순서로 맞춤)
import { api, requireHost, HttpError } from '../../../../../../lib/auth.js';
import { all, one, run, getSettings } from '../../../../../../lib/db.js';
import { json, readBody, parseJSON } from '../../../../../../lib/util.js';
import { ownSpace } from '../../../../../../lib/host-api.js';
import { getAutomationMap } from '../../../../../../lib/availability.js';
import { clearScheduleDeals, runSchedules } from '../../../../../../lib/automation.js';

function slotMapper(fromSlots, toSlots) {
  const byName = new Map(toSlots.map(s => [s.name.trim(), s.id]));
  const m = new Map();
  fromSlots.forEach((s, i) => { const id = byName.get(s.name.trim()) ?? (toSlots[i] ? toSlots[i].id : null); if (id) m.set(s.id, id); });
  return m;
}

export const onRequestPost = api(async (context) => {
  const host = await requireHost(context);
  const src = await ownSpace(context.env, host, context.params.id);
  const b = await readBody(context.request);
  const parts = new Set(Array.isArray(b.parts) ? b.parts : ['rule', 'pattern']);
  const toIds = [...new Set((Array.isArray(b.to) ? b.to : []).map(Number).filter(id => id && id !== src.id))];
  if (!toIds.length) throw new HttpError('복사할 공간을 고르세요.');
  const db = context.env.DB;
  const fromSlots = await all(db, 'SELECT id, name FROM slots WHERE space_id = ? AND active = 1 ORDER BY sort, id', [src.id]);
  const rule = await one(db, 'SELECT * FROM auto_rules WHERE space_id = ?', [src.id]);
  const auto = (await getAutomationMap(db, [src.id])).get(src.id);
  const schedules = parts.has('schedules') ? await all(db, 'SELECT * FROM deal_schedules WHERE space_id = ?', [src.id]) : [];
  const settings = await getSettings(db);
  const result = [];
  for (const tid of toIds) {
    const t = await ownSpace(context.env, host, tid);
    const toSlots = await all(db, 'SELECT id, name FROM slots WHERE space_id = ? AND active = 1 ORDER BY sort, id', [t.id]);
    const map = slotMapper(fromSlots, toSlots);
    const done = [];
    if (parts.has('rule') && rule) {
      await run(db, `INSERT INTO auto_rules (space_id, enabled, tomorrow_rate, today_rate, steps_json, floor_json, exclude_days_json, exclude_slots_json, exclude_from, exclude_to, monthly_cap, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
        ON CONFLICT(space_id) DO UPDATE SET enabled=excluded.enabled, tomorrow_rate=excluded.tomorrow_rate, today_rate=excluded.today_rate, steps_json=excluded.steps_json, exclude_days_json=excluded.exclude_days_json, exclude_slots_json=excluded.exclude_slots_json, exclude_from=excluded.exclude_from, exclude_to=excluded.exclude_to, monthly_cap=excluded.monthly_cap, updated_at=datetime('now')`,
        [t.id, rule.enabled, rule.tomorrow_rate, rule.today_rate, rule.steps_json, '{}', rule.exclude_days_json, JSON.stringify(parseJSON(rule.exclude_slots_json, []).map(id => map.get(Number(id))).filter(Boolean)), rule.exclude_from, rule.exclude_to, rule.monthly_cap]);
      done.push('자동 할인');
    }
    if (parts.has('pattern') && auto) {
      const p = {}; for (const [k, v] of Object.entries(auto.pattern)) { const id = map.get(Number(k)); if (id) p[id] = v; }
      await run(db, `INSERT INTO space_automation (space_id, pattern_json, updated_at) VALUES (?,?,datetime('now')) ON CONFLICT(space_id) DO UPDATE SET pattern_json = excluded.pattern_json, updated_at = datetime('now')`, [t.id, JSON.stringify(p)]);
      done.push('반복 공실');
    }
    if (schedules.length) {
      let n = 0;
      for (const sc of schedules) {
        const ids = parseJSON(sc.slot_ids_json, []).map(id => map.get(Number(id))).filter(Boolean);
        if (!ids.length) continue;
        await run(db, `INSERT INTO deal_schedules (space_id, enabled, name, type, days_json, slot_ids_json, lead_days, open_time, duration_min, discount_mode, discount_value, floor_price, quantity, only_vacant, benefit_text, deal_link, start_date, end_date, skip_dates_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [t.id, sc.enabled, sc.name, sc.type, sc.days_json, JSON.stringify(ids), sc.lead_days, sc.open_time, sc.duration_min, sc.discount_mode, sc.discount_value, 0, sc.quantity, sc.only_vacant, sc.benefit_text, '', sc.start_date, sc.end_date, sc.skip_dates_json]);
        n++;
      }
      if (n) done.push(`반복 딜 ${n}개`);
    }
    await clearScheduleDeals(context.env, { spaceId: t.id });
    await runSchedules(context.env, settings, { spaceIds: [t.id] });
    result.push({ id: t.id, name: t.name, copied: done });
  }
  return json({ ok: true, result });
});
