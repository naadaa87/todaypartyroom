import { api, verifyPassword, sessionCookie, COOKIE_ADMIN } from '../../../lib/auth.js';
import { one } from '../../../lib/db.js';
import { json, err, readBody } from '../../../lib/util.js';
export const onRequestPost = api(async ({ env, request }) => {
  const b = await readBody(request);
  const a = await one(env.DB, 'SELECT * FROM admins WHERE email = ?', [String(b.email || '').trim().toLowerCase()]);
  if (!a || !(await verifyPassword(String(b.password || ''), a.password_hash))) return err('이메일 또는 비밀번호가 맞지 않습니다.', 401);
  return json({ ok: true, name: a.name, role: a.role }, 200, { 'set-cookie': await sessionCookie(env, COOKIE_ADMIN, { t: 'admin', id: a.id }, 7) });
});
