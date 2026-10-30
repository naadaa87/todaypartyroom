// POST /api/claim { deal_id, phone } → 딜 코드 발급
import { api, sessionCookie, COOKIE_GUEST } from '../../lib/auth.js';
import { loadDealById, materializeAuto, logEvent, TYPE_ABBR } from '../../lib/deals.js';
import { getSettings, one, run, insertId } from '../../lib/db.js';
import { json, err, readBody, normalizePhone, isValidPhone, randomCode, nowStr } from '../../lib/util.js';

export const onRequestPost = api(async (context) => {
  const { env, request } = context;
  const b = await readBody(request);
  const phone = normalizePhone(b.phone);
  if (!isValidPhone(phone)) return err('휴대폰 번호를 확인해 주세요.');
  const settings = await getSettings(env.DB);
  const card = await loadDealById(env, settings, String(b.deal_id || ''));
  if (!card) return err('종료되었거나 찾을 수 없는 딜입니다.', 404);
  if (card.scheduled) return err('아직 오픈 전인 딜입니다.');
  let dealId = card.virtual ? await materializeAuto(env, settings, card.id) : Number(card.id);
  if (!dealId) return err('딜을 준비하지 못했습니다. 다시 시도해 주세요.');
  const d = await one(env.DB, 'SELECT * FROM deals WHERE id = ?', [dealId]);
  if (d.quantity != null && d.claimed >= d.quantity) return err('마감된 딜입니다.');
  const existing = await one(env.DB, `SELECT * FROM claims WHERE deal_id = ? AND phone = ? AND status = 'issued'`, [dealId, phone]);
  const t = card.next;
  const space = card.space;
  const payload = { ok: true, deal_id: dealId, space: { name: space.name, slug: space.slug, tel: space.booking_tel, kakao: space.booking_kakao, url: space.booking_url, type: space.booking_type }, deal_link: card.dealLink || '', price: t.price, base: t.base, slot: t.slot.name, date: t.date, expires_at: card.endsAt };
  const cookie = await sessionCookie(env, COOKIE_GUEST, { t: 'guest', phone }, 180);
  if (existing) return json({ ...payload, code: existing.code, reused: true }, 200, { 'set-cookie': cookie });
  let code; for (let i = 0; i < 5; i++) { code = `${TYPE_ABBR[card.type]}-${t.date.slice(5, 7)}${t.date.slice(8, 10)}-${randomCode(4)}`; if (!(await one(env.DB, 'SELECT id FROM claims WHERE code = ?', [code]))) break; }
  await insertId(env.DB, `INSERT INTO claims (deal_id, space_id, phone, code, slot_id, date, price, base_price, expires_at) VALUES (?,?,?,?,?,?,?,?,?)`, [dealId, space.id, phone, code, t.slot.id, t.date, t.price, t.base, card.endsAt]);
  await run(env.DB, 'UPDATE deals SET claimed = claimed + 1 WHERE id = ?', [dealId]);
  await logEvent(env, 'claim', { space_id: space.id, deal_id: dealId, region_id: space.region_id });
  return json({ ...payload, code }, 200, { 'set-cookie': cookie });
});
