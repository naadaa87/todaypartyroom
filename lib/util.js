// 공통 유틸 — 시간(KST), 문자열, 응답 헬퍼
export const KST_OFFSET = 9 * 60 * 60 * 1000;

/** KST 기준 현재 시각을 담은 Date (getUTC* 메서드로 읽는다) */
export function nowKST() { return new Date(Date.now() + KST_OFFSET); }
export function pad2(n) { return String(n).padStart(2, '0'); }
export function fmtDate(d) { return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; }
export function fmtTime(d) { return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`; }
/** 'YYYY-MM-DDTHH:MM' (KST 로컬 문자열) */
export function fmtDT(d) { return `${fmtDate(d)}T${fmtTime(d)}`; }
export function todayStr() { return fmtDate(nowKST()); }
export function nowStr() { return fmtDT(nowKST()); }
export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return fmtDate(d);
}
export function dayOfWeek(dateStr) { return new Date(dateStr + 'T00:00:00Z').getUTCDay(); } // 0=일
export const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
export function dateLabel(dateStr) {
  const t = todayStr();
  const base = `${Number(dateStr.slice(5, 7))}/${Number(dateStr.slice(8, 10))}(${DAY_KO[dayOfWeek(dateStr)]})`;
  if (dateStr === t) return `오늘 ${base}`;
  if (dateStr === addDays(t, 1)) return `내일 ${base}`;
  return base;
}
/** 슬롯 시작 시각(KST 로컬 문자열) */
export function slotStartDT(dateStr, startTime) { return `${dateStr}T${startTime}`; }
/** 두 로컬 문자열 사이 분 차이 (b - a) */
export function minutesBetween(a, b) {
  return Math.round((new Date(b + ':00Z') - new Date(a + ':00Z')) / 60000);
}
export function minusMinutes(dt, m) {
  const d = new Date(dt + ':00Z'); d.setUTCMinutes(d.getUTCMinutes() - m); return fmtDT(d);
}
export function isWeekendOrHoliday(dateStr, holidays) {
  const dow = dayOfWeek(dateStr);
  return dow === 0 || dow === 6 || (holidays || []).includes(dateStr);
}

export function won(n) { return Number(n || 0).toLocaleString('ko-KR') + '원'; }
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
export function randomCode(len = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(arr, b => chars[b % chars.length]).join('');
}
export function parseJSON(s, fallback) { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } }
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
export function err(message, status = 400, extra = {}) { return json({ ok: false, error: message, ...extra }, status); }
export function html(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...headers } });
}
export function redirect(url, status = 302) { return new Response(null, { status, headers: { location: url } }); }
export async function readBody(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) { try { return await request.json(); } catch { return {}; } }
  if (ct.includes('form')) { const f = await request.formData(); const o = {}; for (const [k, v] of f.entries()) o[k] = v; return o; }
  try { return await request.json(); } catch { return {}; }
}
export function cookies(request) {
  const out = {};
  (request.headers.get('cookie') || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
export function setCookie(name, value, { maxAge = 60 * 60 * 24 * 30, path = '/', httpOnly = true } = {}) {
  return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; SameSite=Lax; Secure${httpOnly ? '; HttpOnly' : ''}`;
}
export function clearCookie(name, path = '/') { return `${name}=; Path=${path}; Max-Age=0; SameSite=Lax; Secure`; }
export function normalizePhone(p) { return String(p || '').replace(/[^0-9]/g, ''); }
export function isValidPhone(p) { return /^01[0-9]{8,9}$/.test(normalizePhone(p)); }
export function siteUrl(env, request) {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, '');
  const u = new URL(request.url); return `${u.protocol}//${u.host}`;
}
export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
export function toInt(v, d = 0) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }
