// GET /api/host/me — 호스트 + 공간 요약 / PUT 프로필·비밀번호
import { api, requireHost, hashPassword, verifyPassword } from '../../../lib/auth.js';
import { all, one, run, getSettings } from '../../../lib/db.js';
import { json, err, readBody, todayStr, normalizePhone, isValidPhone } from '../../../lib/util.js';
export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const { env } = context;
  const today = todayStr();
  const spaces = await all(env.DB, `SELECT s.id, s.name, s.slug, s.status, s.review_note, s.subscription_status, s.subscription_until, s.region_id, s.photos_json, s.views, r.name AS region_name,
    (SELECT COUNT(*) FROM vacancies v WHERE v.space_id = s.id AND v.status = 'vacant' AND v.date >= ?) AS vacant_n,
    (SELECT COUNT(*) FROM deals d WHERE d.space_id = s.id AND d.status != 'ENDED') AS deal_n,
    (SELECT COUNT(*) FROM claims c WHERE c.space_id = s.id AND c.status = 'issued') AS claim_n,
    (SELECT enabled FROM auto_rules a WHERE a.space_id = s.id) AS auto_enabled
    FROM spaces s LEFT JOIN regions r ON r.id = s.region_id WHERE s.host_id = ? ORDER BY s.id`, [today, host.id]);
  const settings = await getSettings(env.DB);
  return json({ ok: true, host, spaces: spaces.map(s => ({ ...s, photo: (JSON.parse(s.photos_json || '[]')[0]) || null })), today, settings: { fee_text: settings.host_fee_text, trial_days: settings.trial_days, bank_account: settings.bank_account, amenities: settings.amenities, contact_kakao: settings.contact_kakao, contact_email: settings.contact_email } });
});
export const onRequestPut = api(async (context) => {
  const host = await requireHost(context);
  const b = await readBody(context.request);
  const { env } = context;
  if (b.new_password) {
    const h = await one(env.DB, 'SELECT password_hash FROM hosts WHERE id = ?', [host.id]);
    if (!(await verifyPassword(String(b.password || ''), h.password_hash))) return err('현재 비밀번호가 맞지 않습니다.');
    if (String(b.new_password).length < 8) return err('새 비밀번호는 8자 이상이어야 합니다.');
    await run(env.DB, 'UPDATE hosts SET password_hash = ? WHERE id = ?', [await hashPassword(String(b.new_password)), host.id]);
  }
  const name = b.name !== undefined ? String(b.name).trim().slice(0, 60) : host.name;
  const phone = b.phone !== undefined ? normalizePhone(b.phone) : host.phone;
  if (name.length < 2) return err('상호를 입력하세요.'); if (!isValidPhone(phone)) return err('휴대폰 번호를 확인해 주세요.');
  await run(env.DB, 'UPDATE hosts SET name = ?, phone = ?, biz_no = ?, representative = ? WHERE id = ?', [name, phone, String(b.biz_no ?? host.biz_no ?? '').replace(/[^0-9]/g, '').slice(0, 10), String(b.representative ?? host.representative ?? '').slice(0, 30), host.id]);
  return json({ ok: true });
});
