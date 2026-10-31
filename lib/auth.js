// 비밀번호 해시(PBKDF2) + 서명 쿠키 세션
import { cookies, setCookie, err } from './util.js';
import { one } from './db.js';

const enc = new TextEncoder();
function b64u(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return `pbkdf2$100000$${b64u(salt)}$${b64u(bits)}`;
}
export async function verifyPassword(password, stored) {
  try {
    const [, iter, saltB, hashB] = stored.split('$');
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64u(saltB), iterations: parseInt(iter, 10) }, key, 256);
    return b64u(bits) === hashB;
  } catch { return false; }
}

function secret(env) { return env.SESSION_SECRET || 'change-me-in-cloudflare-env-SESSION_SECRET'; }
async function hmac(env, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
export async function signSession(env, payload, days = 30) {
  const body = b64u(enc.encode(JSON.stringify({ ...payload, exp: Date.now() + days * 86400000 })));
  return `${body}.${await hmac(env, body)}`;
}
export async function readSession(env, token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if ((await hmac(env, body)) !== sig) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch { return null; }
}

export const COOKIE_HOST = 'tpr_host', COOKIE_ADMIN = 'tpr_admin', COOKIE_GUEST = 'tpr_guest';

export async function currentHost(context) {
  const c = cookies(context.request);
  const s = await readSession(context.env, c[COOKIE_HOST]);
  if (!s || s.t !== 'host') return null;
  const host = await one(context.env.DB, 'SELECT id, email, name, phone, biz_no, representative, status, created_at FROM hosts WHERE id = ?', [s.id]);
  if (!host || host.status !== 'active') return null;
  if (s.via) host.via = s.via; // 관리자가 '호스트센터 열기'로 들어온 경우
  return host;
}
export async function currentAdmin(context) {
  const c = cookies(context.request);
  const s = await readSession(context.env, c[COOKIE_ADMIN]);
  if (!s || s.t !== 'admin') return null;
  return await one(context.env.DB, 'SELECT id, email, name, role FROM admins WHERE id = ?', [s.id]);
}
export async function currentGuest(context) {
  const c = cookies(context.request);
  const s = await readSession(context.env, c[COOKIE_GUEST]);
  if (!s || s.t !== 'guest') return null;
  return s; // {t:'guest', phone}
}
export async function sessionCookie(env, name, payload, days = 30) {
  return setCookie(name, await signSession(env, payload, days), { maxAge: days * 86400 });
}
/** API 가드: 호스트 */
export async function requireHost(context) {
  const host = await currentHost(context);
  if (!host) throw new HttpError('로그인이 필요합니다', 401);
  return host;
}
export async function requireAdmin(context) {
  const admin = await currentAdmin(context);
  if (!admin) throw new HttpError('관리자 로그인이 필요합니다', 401);
  return admin;
}
export class HttpError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
/** API 핸들러 래퍼: HttpError → JSON 응답 */
export function api(handler) {
  return async (context) => {
    try { return await handler(context); }
    catch (e) {
      if (e instanceof HttpError) return err(e.message, e.status);
      console.error(e);
      return err('서버 오류: ' + (e.message || e), 500);
    }
  };
}
