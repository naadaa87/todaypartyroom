import { clearCookie, json } from '../../../lib/util.js';
import { COOKIE_ADMIN } from '../../../lib/auth.js';
export const onRequestPost = () => json({ ok: true }, 200, { 'set-cookie': clearCookie(COOKIE_ADMIN) });
