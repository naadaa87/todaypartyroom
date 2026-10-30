// GET /api/admin/subs — 알림 구독 목록 (알림 발송 연동 전까지 수동 발송 참고용)
import { api, requireAdmin } from '../../../lib/auth.js';
import { all } from '../../../lib/db.js';
import { json } from '../../../lib/util.js';
export const onRequestGet = api(async (context) => { await requireAdmin(context); return json({ ok: true, subs: await all(context.env.DB, 'SELECT * FROM alert_subs WHERE active = 1 ORDER BY created_at DESC LIMIT 1000') }); });
