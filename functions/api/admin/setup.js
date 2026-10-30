// POST /api/admin/setup — 최초 관리자 생성(관리자가 없을 때만)
import { api, hashPassword, sessionCookie, COOKIE_ADMIN } from '../../../lib/auth.js';
import { one, insertId } from '../../../lib/db.js';
import { json, err, readBody } from '../../../lib/util.js';
export const onRequestGet = api(async ({ env }) => { const c = await one(env.DB, 'SELECT COUNT(*) AS n FROM admins'); return json({ ok: true, needs_setup: c.n === 0 }); });
export const onRequestPost = api(async ({ env, request }) => {
  const c = await one(env.DB, 'SELECT COUNT(*) AS n FROM admins');
  if (c.n > 0) return err('이미 관리자가 있습니다. 로그인해 주세요.', 403);
  const b = await readBody(request);
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('이메일을 확인해 주세요.');
  if (!b.password || String(b.password).length < 10) return err('관리자 비밀번호는 10자 이상이어야 합니다.');
  const id = await insertId(env.DB, 'INSERT INTO admins (email, password_hash, name, role) VALUES (?,?,?,?)', [email, await hashPassword(String(b.password)), String(b.name || '관리자').slice(0, 30), 'owner']);
  return json({ ok: true, id }, 200, { 'set-cookie': await sessionCookie(env, COOKIE_ADMIN, { t: 'admin', id }, 7) });
});
