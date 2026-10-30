// GET /api/admin/spaces/:id — 상세(검수용) / PUT {action}
import { api, requireAdmin } from '../../../../lib/auth.js';
import { all, one, run, getSettings } from '../../../../lib/db.js';
import { json, err, readBody, todayStr, addDays } from '../../../../lib/util.js';
import { serializeSpace, checkReady } from '../../../../lib/host-api.js';
export const onRequestGet = api(async (context) => {
  await requireAdmin(context);
  const s = await one(context.env.DB, 'SELECT s.*, h.name AS host_name, h.email AS host_email, h.phone AS host_phone, h.biz_no, h.representative FROM spaces s JOIN hosts h ON h.id = s.host_id WHERE s.id = ?', [Number(context.params.id)]);
  if (!s) return err('공간을 찾을 수 없습니다.', 404);
  const slots = await all(context.env.DB, 'SELECT * FROM slots WHERE space_id = ? AND active = 1', [s.id]);
  const history = await all(context.env.DB, 'SELECT p.*, sl.name AS slot_name FROM price_history p JOIN slots sl ON sl.id = p.slot_id WHERE sl.space_id = ? ORDER BY p.changed_at DESC LIMIT 30', [s.id]);
  const dup = await all(context.env.DB, 'SELECT id, name, status FROM spaces WHERE address = ? AND id != ? AND address != ""', [s.address, s.id]);
  return json({ ok: true, space: await serializeSpace(context.env, s), issues: checkReady(s, slots), price_history: history, duplicates: dup });
});
export const onRequestPut = api(async (context) => {
  const admin = await requireAdmin(context);
  const s = await one(context.env.DB, 'SELECT * FROM spaces WHERE id = ?', [Number(context.params.id)]);
  if (!s) return err('공간을 찾을 수 없습니다.', 404);
  const b = await readBody(context.request);
  const note = String(b.note || '').slice(0, 1000);
  const db = context.env.DB; const today = todayStr();
  switch (b.action) {
    case 'approve': {
      const settings = await getSettings(db);
      let sub = s.subscription_status, until = s.subscription_until;
      if (sub === 'none' || !sub) { if (settings.trial_days > 0) { sub = 'trial'; until = addDays(today, settings.trial_days); } else { sub = 'none'; } }
      await run(db, "UPDATE spaces SET status = 'approved', review_note = ?, subscription_status = ?, subscription_until = ?, updated_at = datetime('now') WHERE id = ?", [note, sub, until, s.id]);
      break; }
    case 'revision': await run(db, "UPDATE spaces SET status = 'revision', review_note = ?, updated_at = datetime('now') WHERE id = ?", [note || '보완이 필요합니다.', s.id]); break;
    case 'reject': await run(db, "UPDATE spaces SET status = 'rejected', review_note = ?, updated_at = datetime('now') WHERE id = ?", [note || '등록 기준에 맞지 않습니다.', s.id]); break;
    case 'hide': await run(db, "UPDATE spaces SET status = 'hidden', review_note = ?, updated_at = datetime('now') WHERE id = ?", [note, s.id]); break;
    case 'unhide': await run(db, "UPDATE spaces SET status = 'approved', updated_at = datetime('now') WHERE id = ?", [s.id]); break;
    case 'subscription': {
      const st = ['none', 'trial', 'active', 'past_due', 'cancelled'].includes(b.status) ? b.status : s.subscription_status;
      const until = /^\d{4}-\d{2}-\d{2}$/.test(b.until || '') ? b.until : (b.until === '' ? null : s.subscription_until);
      await run(db, "UPDATE spaces SET subscription_status = ?, subscription_until = ?, updated_at = datetime('now') WHERE id = ?", [st, until, s.id]);
      break; }
    case 'extend': { // 개월 수만큼 연장(결제 확인 시)
      const months = Math.max(1, Math.min(12, Number(b.months || 1)));
      const base = s.subscription_until && s.subscription_until > today ? s.subscription_until : today;
      const d = new Date(base + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + months);
      const until = d.toISOString().slice(0, 10);
      await run(db, "UPDATE spaces SET subscription_status = 'active', subscription_until = ?, updated_at = datetime('now') WHERE id = ?", [until, s.id]);
      break; }
    default: return err('알 수 없는 요청입니다.');
  }
  const s2 = await one(db, 'SELECT * FROM spaces WHERE id = ?', [s.id]);
  return json({ ok: true, space: s2, by: admin.email });
});
