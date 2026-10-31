// PUT /api/admin/hosts/:id — { action: 'suspend' | 'activate' | 'impersonate' | 'credentials', email?, password? }
import { api, requireAdmin, hashPassword, sessionCookie, COOKIE_HOST } from '../../../../lib/auth.js';
import { run, one } from '../../../../lib/db.js';
import { json, err, readBody } from '../../../../lib/util.js';
export const onRequestPut = api(async (context) => {
  await requireAdmin(context);
  const db = context.env.DB;
  const h = await one(db, 'SELECT id, email, status FROM hosts WHERE id = ?', [Number(context.params.id)]);
  if (!h) return err('호스트를 찾을 수 없습니다.', 404);
  const b = await readBody(context.request);
  if (b.action === 'suspend') { await run(db, "UPDATE hosts SET status = 'suspended' WHERE id = ?", [h.id]); await run(db, "UPDATE spaces SET status = 'hidden' WHERE host_id = ? AND status = 'approved'", [h.id]); }
  else if (b.action === 'activate') await run(db, "UPDATE hosts SET status = 'active' WHERE id = ?", [h.id]);
  else if (b.action === 'impersonate') {
    // 관리자가 이 호스트의 호스트센터를 대신 엽니다(하루 동안 유효)
    if (h.status !== 'active') return err('정지된 호스트는 열 수 없습니다. 먼저 해제하세요.');
    return json({ ok: true, url: '/host/app#home' }, 200, { 'set-cookie': await sessionCookie(context.env, COOKIE_HOST, { t: 'host', id: h.id, via: 'admin' }, 1) });
  }
  else if (b.action === 'credentials') {
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('이메일 형식을 확인하세요.');
    const dup = await one(db, 'SELECT id FROM hosts WHERE email = ? AND id != ?', [email, h.id]);
    if (dup) return err('이미 다른 호스트가 쓰는 이메일입니다.');
    const pw = String(b.password || '');
    if (pw && pw.length < 8) return err('비밀번호는 8자 이상이어야 합니다.');
    if (pw) await run(db, 'UPDATE hosts SET email = ?, password_hash = ? WHERE id = ?', [email, await hashPassword(pw), h.id]);
    else await run(db, 'UPDATE hosts SET email = ? WHERE id = ?', [email, h.id]);
    return json({ ok: true, message: pw ? '로그인 이메일과 비밀번호를 저장했어요.' : '로그인 이메일을 저장했어요.' });
  }
  else return err('알 수 없는 요청입니다.');
  return json({ ok: true });
});
