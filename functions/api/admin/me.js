import { api, requireAdmin } from '../../../lib/auth.js';
import { json } from '../../../lib/util.js';
export const onRequestGet = api(async (context) => json({ ok: true, admin: await requireAdmin(context) }));
