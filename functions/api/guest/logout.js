import { clearCookie, redirect } from '../../../lib/util.js';
import { COOKIE_GUEST } from '../../../lib/auth.js';
export const onRequestGet = () => new Response(null, { status: 302, headers: { location: '/me', 'set-cookie': clearCookie(COOKIE_GUEST) } });
