// PUT /api/host/spaces/:id/slots — 슬롯 전체 저장(정가 변경 이력 기록)
import { api, requireHost } from '../../../../../lib/auth.js';
import { run, all, insertId } from '../../../../../lib/db.js';
import { json, err, readBody, toInt } from '../../../../../lib/util.js';
import { ownSpace } from '../../../../../lib/host-api.js';
const T = /^([01]\d|2[0-3]):[0-5]\d$/;
export const onRequestPut = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const b = await readBody(context.request);
  const list = Array.isArray(b.slots) ? b.slots.slice(0, 12) : [];
  if (!list.length) return err('슬롯을 1개 이상 입력하세요.');
  for (const sl of list) {
    if (!sl.name || String(sl.name).trim().length < 1) return err('슬롯 이름을 입력하세요.');
    if (!T.test(sl.start_time) || !T.test(sl.end_time)) return err('시간은 HH:MM 형식으로 입력하세요.');
    if (toInt(sl.price_weekday) < 1000 || toInt(sl.price_weekend) < 1000) return err('요금은 1,000원 이상 입력하세요.');
  }
  const existing = await all(context.env.DB, 'SELECT * FROM slots WHERE space_id = ?', [s.id]);
  const keep = new Set();
  let sort = 0;
  for (const sl of list) {
    sort += 1;
    const vals = [String(sl.name).slice(0, 30), sl.kind === 'hourly' ? 'hourly' : 'package', sl.start_time, sl.end_time, toInt(sl.price_weekday), toInt(sl.price_weekend), Math.max(1, toInt(sl.base_people, 4)), Math.max(0, toInt(sl.extra_fee, 0)), sort];
    const ex = sl.id ? existing.find(e => e.id === Number(sl.id)) : null;
    if (ex) {
      if (ex.price_weekday !== vals[4] || ex.price_weekend !== vals[5]) await run(context.env.DB, 'INSERT INTO price_history (slot_id, old_weekday, old_weekend, new_weekday, new_weekend) VALUES (?,?,?,?,?)', [ex.id, ex.price_weekday, ex.price_weekend, vals[4], vals[5]]);
      await run(context.env.DB, 'UPDATE slots SET name=?, kind=?, start_time=?, end_time=?, price_weekday=?, price_weekend=?, base_people=?, extra_fee=?, sort=?, active=1 WHERE id = ?', [...vals, ex.id]);
      keep.add(ex.id);
    } else {
      const id = await insertId(context.env.DB, 'INSERT INTO slots (space_id, name, kind, start_time, end_time, price_weekday, price_weekend, base_people, extra_fee, sort) VALUES (?,?,?,?,?,?,?,?,?,?)', [s.id, ...vals]);
      keep.add(id);
    }
  }
  for (const e of existing) if (!keep.has(e.id)) await run(context.env.DB, 'UPDATE slots SET active = 0 WHERE id = ?', [e.id]);
  await run(context.env.DB, "UPDATE spaces SET updated_at = datetime('now') WHERE id = ?", [s.id]);
  const slots = await all(context.env.DB, 'SELECT * FROM slots WHERE space_id = ? AND active = 1 ORDER BY sort, id', [s.id]);
  return json({ ok: true, slots });
});
