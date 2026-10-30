// 전역 미들웨어: 오류 처리, 보안 헤더, DB 바인딩 확인, 배포 후 DB 자동 업데이트, 자동 운영 주기 실행
import { ensureSchema } from '../lib/migrate.js';
import { maybeRunAutomation } from '../lib/automation.js';
export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  if (!env.DB) {
    const msg = 'D1 바인딩(DB)이 설정되지 않았습니다. Cloudflare Pages → Settings → Bindings 에서 D1 database 바인딩 변수명을 DB 로 추가한 뒤 다시 배포하세요.';
    return url.pathname.startsWith('/api/')
      ? new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
      : new Response(`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:40px;max-width:640px"><h2>설정이 필요합니다</h2><p>${msg}</p><p>바인딩을 추가한 뒤에는 Deployments 탭에서 Retry deployment로 다시 배포해야 적용됩니다.</p></body>`, { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  try {
    await ensureSchema(env.DB);
    const res = await context.next();
    if (context.waitUntil && !url.pathname.startsWith('/assets/')) context.waitUntil(maybeRunAutomation(env));
    const h = new Headers(res.headers);
    h.set('x-content-type-options', 'nosniff');
    h.set('referrer-policy', 'strict-origin-when-cross-origin');
    if (!h.has('cache-control')) h.set('cache-control', 'private, max-age=0, must-revalidate');
    return new Response(res.body, { status: res.status, headers: h });
  } catch (e) {
    console.error(e);
    const isApi = url.pathname.startsWith('/api/');
    const missing = /no such table/i.test(String(e.message || e));
    const msg = missing ? 'DB가 아직 준비되지 않았습니다. 관리자 화면(/admin)에서 "DB 준비하기" 버튼을 눌러 주세요.' : ('오류: ' + (e.message || e));
    return isApi
      ? new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
      : new Response(`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:40px;max-width:640px"><h2>일시적인 오류</h2><p>${msg}</p><p>${missing ? '<a href="/admin">관리자 화면으로 이동</a>' : '<a href="/">홈으로</a>'}</p></body>`, { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
}
