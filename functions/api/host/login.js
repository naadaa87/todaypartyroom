// POST /api/host/login
import { api, verifyPassword, sessionCookie, COOKIE_HOST } from '../../../lib/auth.js';
import { one, run } from '../../../lib/db.js';
import { json, err, readBody } from '../../../lib/util.js';
export const onRequestPost = api(async ({ env, request }) => {
  const b = await readBody(request);
  const email = String(b.email || '').trim().toLowerCase();
  const h = await one(env.DB, 'SELECT * FROM hosts WHERE email = ?', [email]);
  if (!h || !(await verifyPassword(String(b.password || ''), h.password_hash))) return err('이메일 또는 비밀번호가 맞지 않습니다.', 401);
  if (h.status !== 'active') return err('이용이 제한된 계정입니다. 고객센터로 문의해 주세요.', 403);
  await run(env.DB, "UPDATE hosts SET last_login_at = datetime('now') WHERE id = ?", [h.id]);
  return json({ ok: true, id: h.id, name: h.name }, 200, { 'set-cookie': await sessionCookie(env, COOKIE_HOST, { t: 'host', id: h.id }) });
});
