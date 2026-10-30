// GET /api/host/claims?space_id= — 발급 코드 / PUT {id, action:'use'}
import { api, requireHost } from '../../../lib/auth.js';
import { all, one, run } from '../../../lib/db.js';
import { json, err, readBody } from '../../../lib/util.js';
export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const u = new URL(context.request.url);
  const sid = Number(u.searchParams.get('space_id') || 0);
  const rows = await all(context.env.DB, `SELECT c.*, s.name AS space_name, sl.name AS slot_name, d.type FROM claims c JOIN spaces s ON s.id = c.space_id LEFT JOIN slots sl ON sl.id = c.slot_id LEFT JOIN deals d ON d.id = c.deal_id WHERE s.host_id = ? ${sid ? 'AND c.space_id = ?' : ''} ORDER BY c.issued_at DESC LIMIT 200`, sid ? [host.id, sid] : [host.id]);
  return json({ ok: true, claims: rows.map(r => ({ ...r, phone_masked: r.phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-****'), phone: undefined })) });
});
export const onRequestPut = api(async (context) => {
  const host = await requireHost(context);
  const b = await readBody(context.request);
  const c = await one(context.env.DB, 'SELECT c.* FROM claims c JOIN spaces s ON s.id = c.space_id WHERE c.id = ? AND s.host_id = ?', [Number(b.id), host.id]);
  if (!c) return err('코드를 찾을 수 없습니다.', 404);
  if (b.action === 'use') { await run(context.env.DB, "UPDATE claims SET status = 'used', used_at = datetime('now') WHERE id = ?", [c.id]); return json({ ok: true, slot_id: c.slot_id, date: c.date, space_id: c.space_id }); }
  if (b.action === 'unuse') { await run(context.env.DB, "UPDATE claims SET status = 'issued', used_at = NULL WHERE id = ?", [c.id]); return json({ ok: true }); }
  return err('알 수 없는 요청입니다.');
});
