// POST /api/host/signup
import { api, hashPassword, sessionCookie, COOKIE_HOST } from '../../../lib/auth.js';
import { one, insertId } from '../../../lib/db.js';
import { json, err, readBody, normalizePhone, isValidPhone } from '../../../lib/util.js';
export const onRequestPost = api(async ({ env, request }) => {
  const b = await readBody(request);
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('이메일을 확인해 주세요.');
  if (!b.password || String(b.password).length < 8) return err('비밀번호는 8자 이상이어야 합니다.');
  const name = String(b.name || '').trim(); if (name.length < 2) return err('상호(호스트명)를 입력하세요.');
  const phone = normalizePhone(b.phone); if (!isValidPhone(phone)) return err('휴대폰 번호를 확인해 주세요.');
  if (!b.agree) return err('이용약관과 개인정보처리방침에 동의해 주세요.');
  if (await one(env.DB, 'SELECT id FROM hosts WHERE email = ?', [email])) return err('이미 가입된 이메일입니다. 로그인해 주세요.');
  const id = await insertId(env.DB, 'INSERT INTO hosts (email, password_hash, name, phone, biz_no, representative) VALUES (?,?,?,?,?,?)', [email, await hashPassword(String(b.password)), name, phone, String(b.biz_no || '').replace(/[^0-9]/g, '').slice(0, 10), String(b.representative || '').slice(0, 30)]);
  return json({ ok: true, id }, 200, { 'set-cookie': await sessionCookie(env, COOKIE_HOST, { t: 'host', id }) });
});
