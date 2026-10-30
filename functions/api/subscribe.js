// POST /api/subscribe — 딜 알림 구독 / DELETE 해지
import { api, sessionCookie, COOKIE_GUEST, currentGuest } from '../../lib/auth.js';
import { run, insertId, one } from '../../lib/db.js';
import { json, err, readBody, normalizePhone, isValidPhone } from '../../lib/util.js';
import { logEvent } from '../../lib/deals.js';

export const onRequestPost = api(async (context) => {
  const { env, request } = context;
  const b = await readBody(request);
  const channel = ['kakao', 'email', 'push'].includes(b.channel) ? b.channel : 'kakao';
  let contact = String(b.contact || '').trim();
  if (channel === 'email') { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact)) return err('이메일을 확인해 주세요.'); }
  else { contact = normalizePhone(contact); if (!isValidPhone(contact)) return err('휴대폰 번호를 확인해 주세요.'); }
  const regions = Array.isArray(b.regions) ? b.regions.map(Number).filter(Boolean).slice(0, 20) : [];
  const days = Array.isArray(b.days) ? b.days.map(Number).filter(n => n >= 0 && n <= 6) : [];
  const types = Array.isArray(b.types) ? b.types.filter(t => typeof t === 'string').slice(0, 6) : [];
  const id = await insertId(env.DB, `INSERT INTO alert_subs (contact, channel, regions_json, days_json, timeband, size, types_json) VALUES (?,?,?,?,?,?,?)`, [contact, channel, JSON.stringify(regions), JSON.stringify(days), String(b.timeband || ''), b.size ? Number(b.size) : null, JSON.stringify(types)]);
  await logEvent(env, 'subscribe', { region_id: regions[0] || null, channel });
  const headers = channel === 'email' ? {} : { 'set-cookie': await sessionCookie(env, COOKIE_GUEST, { t: 'guest', phone: contact }, 180) };
  return json({ ok: true, id }, 200, headers);
});
export const onRequestDelete = api(async (context) => {
  const g = await currentGuest(context);
  const id = Number(new URL(context.request.url).searchParams.get('id'));
  if (!g || !id) return err('권한이 없습니다.', 401);
  await run(context.env.DB, 'UPDATE alert_subs SET active = 0 WHERE id = ? AND contact = ?', [id, g.phone]);
  return json({ ok: true });
});
